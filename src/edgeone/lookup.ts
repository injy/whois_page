import { handleApiRequest, handleOptions } from "../handler";

/**
 * EdgeOne Pages cloud function for GET /api/lookup?domain=example.com
 *
 * The Node.js runtime is used instead of Edge Functions because a lookup may
 * chain RDAP → WHOIS proxy → web scraper, which does not fit into the 200 ms
 * CPU budget of the edge runtime.
 */
export interface PagesContext {
  request: Request;
  params?: Record<string, string>;
  env?: Record<string, string>;
}

export async function onRequest(context: PagesContext): Promise<Response> {
  if (context.request.method === "OPTIONS") {
    return handleOptions();
  }

  return handleApiRequest(new URL(context.request.url));
}
