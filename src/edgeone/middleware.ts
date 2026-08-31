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

export function middleware(context: MiddlewareContext): Promise<Response> | Response {
  const url = new URL(context.request.url);

  if (url.pathname === "/" && url.searchParams.has("domain")) {
    return context.rewrite("/api/lookup?" + url.searchParams.toString());
  }

  return context.next();
}
