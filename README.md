<h1 style="text-align: center;">Prerenderer</h1>
<p style="text-align: center;">
  <em>Fast, flexible, framework-agnostic prerendering for sites and SPAs.</em>
</p>

<p align="center"><img width="300" src="/assets/logo.png?raw=true"></p>

---

<div style="text-align: center;">
[![npm version](https://img.shields.io/npm/v/prerenderer.svg)]()

[![npm downloads](https://img.shields.io/npm/dt/prerenderer.svg)]()

[![Dependency Status](https://img.shields.io/david/tribex/prerenderer.svg)](https://david-dm.org/tribex/prerenderer)

[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](https://standardjs.com/)

[![license](https://img.shields.io/github/license/tribex/prerenderer.svg)]()
</div>

---

<div style="text-align: center;">
[![NPM](https://nodei.co/npm/prerenderer.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/prerenderer/)
</div>

## About prerenderer
The goal of this package is to provide a simple, framework-agnostic prerendering solution that is easily extensible and usable for any site or single-page-app.

If you're looking for the webpack plugin that wraps this package, check out [prerenderer-webpack-plugin](https://github.com/tribex/prerenderer-webpack-plugin).

Now, if you're not familiar with the concept of *prerendering*, you might predictably ask...

## What is Prerendering?

Recently, SSR (Server Side Rendering) has taken the JavaScript front-end world by storm. The fact that you can now render your sites and apps on the server before sending them to your clients is an absolutely *revolutionary* idea (and totally not what everyone was doing before JS client-side apps got popular in the first place...)

However, the same criticisms that were valid for the PHP, ASP, JSP, and the likes sites of yore are valid for server-side rendering today. It's slow, breaks fairly easily, and is difficult to implement properly.

Thing is, despite what everyone might be telling you, you probably don't *need* SSR. You can get almost all the advantages of it (without the disadvantages) by using **prerendering.** Prerendering is basically firing up a headless browser, loading your app's routes, and saving the results to a static HTML file. You can then serve it with whatever static-file-serving solution you were using previously. It *just works* with HTML5 navigation and the likes. No need to change your code or add server-side rendering workarounds.

In the interest of transparency, there are some use-cases where prerendering might not be a great idea.

- **Tons of routes** - If your site has hundreds or thousands of routes, prerendering will be really slow. Sure you only have to do it once per update, but it could take ages. Most people don't end up with thousands of static routes, but just in-case...
- **Dynamic Content** - If your render routes that have content that's specific to the user viewing it or other dynamic sources, you should make sure you have placeholder components that can display until the dynamic content loads on the client-side. Otherwise it might be a tad weird.

## Example `prerenderer` Usage

(It's much simpler if you use `prerenderer` with [webpack](https://github.com/tribex/prerenderer-webpack-plugin) or another build system.)

**Input**
```
app/
├── index.html
└── index.js // Whatever JS controls the SPA, loaded by index.html
```

**Output**
```
app/
├── about
│   └── index.html // Static rendered /about route.
├── index.html // Static rendered / route.
├── index.js // Whatever JS controls the SPA, loaded by index.html
└── some
    └── deep
        └── nested
            └── route
                └── index.html // Static rendered nested route.
```

```js
const fs = require('fs')
const path = require('path')
const mkdirp = require('mkdirp')
const Prerenderer = require('prerenderer')
const ChromeRenderer = Prerenderer.ChromeRenderer

const prerenderer = new Prerenderer({
  // Required - The path to the app to prerender. Should have an index.html and any other needed assets.
  staticDir: path.join(__dirname, 'app'),

  // Optional - This is the default.
  renderer: new ChromeRenderer({
    // If this is omitted, ChromeRenderer will *attempt* to find a valid installed version based on your platform. No promises.
    command: 'start chrome' // Windows
    // More optional renderer arguments.
  })
})

// Initialize is separate from the constructor for flexibility of integration with build systems.
prerenderer.initialize()
.then(() => {
  // List of routes to render.
  return prerenderer.renderRoutes([ '/', '/about', '/some/deep/nested/route' ])
})
.then(renderedRoutes => {
  // renderedRoutes is an array of objects in the format:
  // {
  //   route: String (The route rendered)
  //   html: String (The resulting HTML)
  // }
  renderedRoutes.forEach(renderedRoute => {
    try {
      // A smarter implementation would be required, but this does okay for an example.
      // Don't copy this directly!!!
      const outputDir = path.join(__dirname, 'app', renderedRoute.route
      const outputFile = `${outputDir}/index.html`

      mkdirp.sync(outputDir)
      fs.writeFileSync(outputFile, processedRoute.html.trim())
    } catch (e) {
      // Handle errors.
    }
  })

  // Shut down the file server and renderer.
  prerenderer.destroy()
})
.catch(err => {
  // Shut down the server and renderer.
  prerenderer.destroy()
  // Handle errors.
})
```

## Available Renderers
- Chromium / Google Chrome Headless over RDP (builtin) - `prerenderer.ChromeRenderer`

## Documentation

### Prerenderer Options

| Option    | Type                        | Required? | Default                | Description                                                                                                                                      |
|-----------|-----------------------------|-----------|------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------|
| staticDir | String                      | Yes       | None                   | The root path to serve your app from.                                                                                                            |
| server    | Object                      | No        | None                   | App server configuration options (See below)                                                                                                     |
| renderer  | Renderer Instance or Object | No        | `new ChromeRenderer()` | The renderer you'd like to use to prerender the app. It's recommended that you specify this, but if not it will attempt to start ChromeRenderer. |

### Server Options

| Option | Type    | Required? | Default                    | Description                            |
|--------|---------|-----------|----------------------------|----------------------------------------|
| port   | Integer | No        | First free port after 8000 | The port for the app server to run on. |

### Prerenderer Methods

- `constructor(options: Object)` - Creates a Prerenderer instance and sets up the renderer and server objects.
- `initialize(): Promise<>` - Starts the static file server and renderer instance (where appropriate).
- `destroy()` - Destroys the static file server and renderer, freeing the resources.
- `renderRoutes(routes: Array<String>): Promise<Array<RenderedRoute>>` - Renders set of routes. Returns a promise resolving to an array of rendered routes in the form of:

```js
[
  {
    path: '/route/path', // The route path.
    html: '<!DOCTYPE html><html>...</html>' // The prerendered HTML for the route
  },
  ...
]
```

---

### ChromeRenderer Options

| Option                   | Type                   | Required?        | Default                    | Description                                                                                                                                                                                         |
|--------------------------|------------------------|------------------|----------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| inject                   | Object                 | No               | None                       | An object to inject into the global scope of the rendered page before it finishes loading. Must be `JSON.stringifiy`-able. The property injected to is `window['__PRERENDER_INJECTED']` by default. |
| injectProperty           | String                 | No               | `'__PRERENDER_INJECTED'`   | The property to mount `inject` to during rendering.                                                                                                                                                 |
| renderAfterDocumentEvent | String                 | No               | None                       | Wait to render until the specified event is fired on the document. (You can fire an event like so: `document.dispatchEvent(new Event('custom-render-trigger'))`                                     |
| renderAfterElementExists | String (Selector)      | No               | None                       | Wait to render until the specified element is detected using `document.querySelector`                                                                                                               |
| renderAfterTime          | Integer (Milliseconds) | No               | None                       | Wait to render until a certain amount of time has passed.                                                                                                                                           |
| maxLaunchRetries         | Integer                | No               | 5                          | Max amount of times to try and start the render program before erroring out.                                                                                                                        |
| port                     | Integer                | No               | Auto-detect available port | The port to run Chrome's RDP on.                                                                                                                                                                    |
| command                  | String                 | No (Recommended) | Auto-detect                | The command to use to start Chrome or Chromium. Auto-detection is unreliable, so I'd recommend setting it.                                                                                          |
| arguments                | Array:String          | No               | None                       | Additional arguments to pass to Chrome.                                                                                                                                                             |

### ChromeRenderer Methods

These are handled by `prerenderer`. The only thing you need to worry about is the constructor unless you're planning on writing your own renderer.

- `constructor(options: Object)` - Loads and validates options.
- `initialize(): Promise<Process Handle>` - Starts Chrome in headless mode with an RDP session.
- `destroy()` - Kills the Chrome process.
- `renderRoutes(routes: Array<String>, serverPort: Integer (fileserver port), rootOptions: Object (Prerenderer global options))): Promise<Array<RenderedRoute>>` - Renders set of routes. Returns a promise resolving to an array of rendered routes in the form of:

```js
[
  {
    path: '/route/path', // The route path.
    html: '<!DOCTYPE html><html>...</html>' // The prerendered HTML for the route
  },
  ...
]
```

## Caveats

- For obvious reasons, `prerenderer` only works for SPAs that route using the HTML5 history API. `index.html#/hash/route` URLs will unfortunately not work.
- Whatever client-side rendering library you're using should be able to at least replace any server-rendered content or diff with it.
  - For **Vue.js 1** use [`replace: false`](http://vuejs.org/api/#replace) on root components.
  - For **Vue.js 2**  Ensure your root component has the same id as the prerendered element it's replacing. Otherwise you'll end up with duplicated content.

## License (MIT)

```
Copyright (c) 2017 Joshua Michael Bemenderfer

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Credits
- Originally ported from [prerender-spa-plugin](https://github.com/chrisvfritz/prerender-spa-plugin) by [Chris Fritz](https://github.com/chrisvfritz). Thanks Chris!

## Maintainers

<table>
  <tbody>
    <tr>
      <td style="text-align: center;">
        <a href="https://github.com/tribex">
          <img width="150" height="150" src="https://github.com/tribex.png?v=3&s=150">
          </br>
          Joshua Bemenderfer
        </a>
      </td>
    </tr>
  <tbody>
</table>
