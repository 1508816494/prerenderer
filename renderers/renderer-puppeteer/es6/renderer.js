const promiseLimit = require('promise-limit')
const puppeteer = require('puppeteer')

const waitForRender = function (options) {
  options = options || {}

  return new Promise((resolve, reject) => {
    // Render when an event fires on the document.
    if (options.renderAfterDocumentEvent) {
      document.addEventListener(options.renderAfterDocumentEvent, () => resolve())

    // Render once a specific element exists.
    } else if (options.renderAfterElementExists) {
      // TODO: Try and get something MutationObserver-based working.
      setInterval(() => {
        if (document.querySelector(options.renderAfterElementExists)) resolve()
      }, 100)

    // Render after a certain number of milliseconds.
    } else if (options.renderAfterTime) {
      setTimeout(() => resolve(), options.renderAfterTime)

    // Default: Render immediately after page content loads.
    } else {
      resolve()
    }
  })
}

class PuppeteerRenderer {
  constructor (rendererOptions) {
    this._puppeteer = null
    this._rendererOptions = rendererOptions || {}

    if (this._rendererOptions.maxConcurrentRoutes == null) this._rendererOptions.maxConcurrentRoutes = 0

    if (this._rendererOptions.inject && !this._rendererOptions.injectProperty) {
      this._rendererOptions.injectProperty = '__PRERENDER_INJECTED'
    }
  }

  async initialize () {
    try {
      // Workaround for Linux SUID Sandbox issues.
      if (process.platform === 'linux') {
        if (!this._rendererOptions.args) this._rendererOptions.args = []

        if (this._rendererOptions.args.indexOf('--no-sandbox') === -1) {
          this._rendererOptions.args.push('--no-sandbox')
          this._rendererOptions.args.push('--disable-setuid-sandbox')
        }
      }

      this._puppeteer = await puppeteer.launch(this._rendererOptions)
    } catch (e) {
      console.error(e)
      console.error('[Prerenderer - PuppeteerRenderer] Unable to start Puppeteer')
      // Re-throw the error so it can be handled further up the chain. Good idea or not?
      throw e
    }

    return this._puppeteer
  }

  async handleRequestInterception (page, baseURL) {
    await page.setRequestInterception(true)

    page.on('request', req => {
      // Skip third party requests if needed.
      if (!this._rendererOptions.skipThirdPartyRequests) {
        if (!req.url().startsWith(baseURL)) {
          req.abort()
          return
        }
      }

      req.continue()
    })
  }

  async renderRoutes (routes, Prerenderer) {
    const rootOptions = Prerenderer.getOptions()
    const options = this._rendererOptions
    options.inlineUsedCSS = true

    const limiter = promiseLimit(this._rendererOptions.maxConcurrentRoutes)

    const pagePromises = Promise.all(
      routes.map(
        (route, index) => limiter(
          async () => {
            const page = await this._puppeteer.newPage()

            if (options.inject) {
              await page.evaluateOnNewDocument(`(function () { window['${options.injectProperty}'] = ${JSON.stringify(options.inject)}; })();`)
            }

            const baseURL = `http://localhost:${rootOptions.server.port}`

            // Start tracking CSS coverage
            if (options.inlineUsedCSS) await page.coverage.startCSSCoverage()

            // Allow setting viewport widths and such.
            if (options.viewport) await page.setViewport(options.viewport)

            await this.handleRequestInterception(page, baseURL)
            await page.goto(`${baseURL}${route}`)

            // Once this completes, it's safe to capture the page contents.
            await page.evaluate(waitForRender, this._rendererOptions)

            // Experimental: Inline CSS that was used during rendering.
            // NOTES: Does not currently support @media queries, which is likely a dealbreaker.
            if (options.inlineUsedCSS) {
              const coverage = await page.coverage.stopCSSCoverage()

              let cssToInclude = ''

              coverage.map(result => {
                result.ranges.map(range => {
                  cssToInclude += result.text.substring(range.start, range.end)
                })
              })

              await page.evaluate(css => {
                // Remove all included inline styles. TODO: Maybe a bad idea.
                [...document.querySelectorAll('style')].map(child => child.parentElement.removeChild(child))
                // Insert only the used styles.
                document.head.innerHTML += `<style type="text/css">${cssToInclude}</style>`
              }, cssToInclude)
            }

            const result = {
              originalRoute: route,
              route: await page.evaluate('window.location.pathname'),
              html: await page.content()
            }

            await page.close()
            return Promise.resolve(result)
          }
        )
      )
    )

    return pagePromises
  }

  destroy () {
    this._puppeteer.close()
  }
}

module.exports = PuppeteerRenderer
