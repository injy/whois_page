/**
 * EdgeOne Pages middleware (V8, project root).
 *
 * On the Cloudflare Worker the root path doubles as the JSON API
 * (`/?domain=example.com`). A static site cannot do that, so the request is
 * transparently rewritten to the lookup cloud function.
 */
export interface MiddlewareContext {
  request: Request;
  next: (options?: { headers?: Record<string, string> }) => Promise<Response> | Response;
  rewrite: (url: string) => Promise<Response> | Response;
  redirect: (url: string, status?: number) => Response;
}

export const config = { matcher: "/" };

/**
 * The static page already handles /?domain=… (and /<domain>) on the client by
 * deep-linking and rendering the result, so the root request is served as-is.
 * JSON is only returned under /api/*.
 */
export function middleware(context: MiddlewareContext): Promise<Response> | Response {
  return context.next();
}
