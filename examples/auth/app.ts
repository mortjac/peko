import * as Peko from "../../mod.ts" // <- https://deno.land/x/peko/mod.ts
import config from "../config.ts"

const server = new Peko.Server()
const crypto = new Peko.Crypto("SUPER_SECRET_KEY_123") // <-- should come from env

const user = {
  username: "test-user",
  password: await crypto.hash("test-password")
}

// Configure Peko
server.setConfig(config)

// generate JWT
server.addRoute({
  route: "/login",
  method: "POST",
  handler: async (ctx) => {
    const { username, password } = await ctx.request.json()

    if (
      !username || !password 
      || username !== user.username 
      || await crypto.hash(password) !== user.password
    ) {
      return await server.handleError(ctx, 400)
    }

    const exp = new Date()
    exp.setMonth(exp.getMonth() + 1)

    const jwt = await crypto.sign({
      iat: Date.now(),
      exp: exp.valueOf(),
      data: { user: user.username }
    })

    return new Response(jwt, {
      headers: new Headers({
        "Content-Type": "application/json"
      })
    })
  }
})

// verify JWT in auth middleware
server.addRoute({
  route: "/authTest",
  middleware: Peko.authenticator(crypto),
  handler: () => new Response("You are authenticated!")
})

// basic HTML page with buttons to call auth routes
server.addRoute({
  route: "/",
  handler: () => new Response(`<!doctype html>
    <html lang="en">
    <head>
      <title>Peko auth example</title>
    </head>
    <body style="width: 100vw; height: 100vh; margin: 0; background-color: steelblue">
      <div style="border: 1px solid black; margin: auto; padding: 1rem;">
        <button id="login">Login</button>
        <button onclick="testAuth()">Test Auth</button>
      </div>

      <script>
        const loginBtn = document.querySelector("#login")
        let jwt

        async function login() {
          const response = await fetch("/login", {
            method: "POST",
            body: JSON.stringify({ username: "test-user", password: "test-password" })
          })

          jwt = await response.text()
          console.log("jwt: " + jwt)

          loginBtn.textContent = "Logout"
          loginBtn.removeEventListener("click", login)
          loginBtn.addEventListener("click", logout)
        }

        function logout() { 
          jwt = undefined 
          console.log("jwt: " + jwt)

          loginBtn.textContent = "Login"
          loginBtn.removeEventListener("click", logout)
          loginBtn.addEventListener("click", login)
        }

        async function testAuth() {
          const response = await fetch("/authTest", {
            headers: new Headers({
              "Authorization": "Bearer " + jwt
            })
          })
          console.log(response)
        }

        document.querySelector("#login").addEventListener("click", login)
      </script>
    </body>
    </html>
  `, { headers: new Headers({ "Content-Type": "text/html; charset=UTF-8" }) })
})

// Start your Peko server :)
server.listen()