import * as Peko from "../../mod.ts"
import { Route, SSRRoute } from "../../lib/types.ts"

import { lookup } from "https://deno.land/x/media_types@v3.0.3/mod.ts"
import { recursiveReaddir } from "https://deno.land/x/recursive_readdir@v2.0.0/mod.ts"
import { renderToString } from "https://npm.reversehttp.com/preact,preact/hooks,htm/preact,preact-render-to-string"

// Preact page component imports
// These are necessary for Deno Deploy support
import Home from "./src/pages/Home.js"
import About from "./src/pages/About.js"

import htmlTemplate from "../template.ts"
import config from "../config.ts"

// Configure Peko
Peko.setConfig(config)

// SSR'ed app page routes
const ssrRoutes: SSRRoute[] = [
    // must be SSRRoute type (see types.ts)
    {
        route: "/",
        // Note: srcURL used for emitting file change events in devMode
        module: {
            srcURL: new URL("./src/pages/Home.js", import.meta.url),
            app: Home
        },
        middleware: (_request) => ({ "server_time": `${Date.now()}` }),
        render: (app, _request, params) => {
          const appHTML = renderToString(app(params), null, null)
          return htmlTemplate({
            appHTML,
            title: `<title>Peko</title>`,
            modulepreload: `<script modulepreload="true" type="module" src="/pages/Home.js"></script>`,
            hydrationScript: `<script type="module">
                import { hydrate } from "https://npm.reversehttp.com/preact,preact/hooks,htm/preact,preact-render-to-string";
                import Home from "/pages/Home.js";
                hydrate(Home({ server_time: ${params && params.server_time} }), document.getElementById("root"))
            </script>`
          })
        },
        cacheLifetime: 6000 // <- even with a specified cacheLifetime this page will never change because it's params are different in each request
    },
    {
        route: "/about",
        module: {
            srcURL: new URL("./src/pages/About.js", import.meta.url),
            app: About
        },
        render: (app) => {
          const appHTML = renderToString(app(), null, null)
          return  htmlTemplate({
            appHTML,
            title: `<title>Peko | About</title>`,
            modulepreload: `<script modulepreload="true" type="module" src="/pages/About.js"></script>`,
            hydrationScript: `<script type="module">
                import { hydrate } from "https://npm.reversehttp.com/preact,preact/hooks,htm/preact,preact-render-to-string";
                import About from "/pages/About.js";
                hydrate(About(), document.getElementById("root"))
            </script>`
          })
        }
        // cacheLifetime: 6000 <- this can be omitted as page content doesn't change and cacher will default to a lifetime of Infinity
    }
]
ssrRoutes.forEach(ssrRoute => Peko.addSSRRoute(ssrRoute))

// Static src routes for loading into client
const files: string[] = await recursiveReaddir(new URL(`./src`, import.meta.url).pathname)
files.forEach(file => {
    const rootPath = `${Deno.cwd()}/examples/preact/src/`
    const fileRoute: `/${string}` = `/${file.slice(rootPath.length)}`

    // must be StaticRoute type (see types.ts)
    Peko.addStaticRoute({
        route: fileRoute,
        fileURL: new URL(`./src/${fileRoute}`, import.meta.url),
        contentType: lookup(file)
    })
})

// Custom routes (e.g. any server-side API functions)
const customRoutes: Route[] = [
    // must be Route type (see types.ts)
    {
        route: "/api/parrot",
        method: "POST",
        handler: async (request: Request) => {
            // emit event with body as data
            const body = await request.json()
            return new Response(`Parrot sqwarks: ${JSON.stringify(body)}`)
        }
    }
]
customRoutes.forEach(route => Peko.addRoute(route))

// Start Peko server :)
Peko.start()