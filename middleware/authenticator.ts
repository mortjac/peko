import { RequestContext, Middleware } from "../server.ts"
import { Crypto } from "../utils/Crypto.ts"

/**
 * Auth middleware, uses Crypto utility class to verify JWTs
 * @param crypto: Crypto instance to be used
 * @returns MiddlewareResponse
 */
export const authenticator = (crypto: Crypto): Middleware => async (ctx: RequestContext): Promise<Response | void>=> {
  const authHeader = ctx.request.headers.get("Authorization")

  // check JWT from cookies
  if (authHeader && authHeader.slice(0,7) === "Bearer ") {
    const jwt = authHeader.slice(7)
    const payload = await crypto.verify(jwt)
    if (payload && payload.exp > Date.now()) {
      ctx.state.auth = payload
      return
    }
  }  
  
  return await ctx.server.handleError(ctx, 401)
}