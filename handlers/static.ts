import { RequestContext } from "../server.ts"
import { Crypto } from "../utils/Crypto.ts"

const crypto = new Crypto("SUPER_SECRET_KEY_123") // <-- should come from env

export type StaticData = { 
  fileURL: URL
  contentType: string | undefined
  cacheControl?: string
}

/**
 * Generates Response with body from file URL, sets modifiable
 * "Cache-Control" header and hashes file contents for "ETAG" header.
 * @param staticData: StaticData
 * @returns Promise<Response>
 */
export const staticHandler = async (ctx: RequestContext, staticData: StaticData) => {
  let filePath = decodeURI(staticData.fileURL.pathname)
  
  // fix annoying windows paths
  if (Deno.build.os === "windows") filePath = filePath.substring(1)

  // Is it more efficient to stream file into response body?
  const body = await Deno.readFile(filePath)
  const hashString = await crypto.hash(body.toString())

  return new Response(body, {
    headers: new Headers({
      'Content-Type': staticData.contentType ? staticData.contentType : 'text/plain',
      // tell browser not to cache if in devMode
      'Cache-Control': ctx.server.config.devMode
        ? 'no-store'
        : staticData.cacheControl ? staticData.cacheControl : 'max-age=604800, stale-while-revalidate=86400',
      // create ETag hash so 304 (not modified) response can be given from cacher
      'ETag': hashString
    })
  })
}