import { handleApiRequest, handleOptions } from "../handler";
import type { PagesContext } from "./lookup";

/**
 * EdgeOne Pages cloud function catching every /api/* route that has no
 * dedicated file, so GET /api/example.com keeps working as a path style query.
 */
export async function onRequest(context: PagesContext): Promise<Response> {
  if (context.request.method === "OPTIONS") {
    return handleOptions();
  }

  const url = new URL(context.request.url);
  const path = url.pathname.replace(/^\/+|\/+$/g, "");
  const domainFromPath = path.startsWith("api/") ? path.slice(4) : path;

  // A ?domain= query always wins over the path segment.
  if (domainFromPath && !url.searchParams.has("domain")) {
    url.searchParams.set("domain", domainFromPath);
  }

  return handleApiRequest(url);
}
