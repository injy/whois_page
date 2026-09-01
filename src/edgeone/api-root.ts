import { handleApiRequest, handleOptions } from "../handler";
import type { PagesContext } from "./lookup";

/**
 * EdgeOne Pages cloud function for the bare /api and /api/ directory roots,
 * i.e. GET /api/?domain=example.com (and GET /api with a path domain).
 *
 * The optional catch-all cloud-functions/api/[[default]].js only matches
 * /api/<segment> (one or more path segments), so the directory root itself is
 * not covered by it. Without an index.js here, a request to /api/ has no
 * matching function route and falls back to the static site, returning the
 * HTML page instead of JSON - which is exactly what made /api/?domain=...
 * appear "unusable". This file closes that gap.
 */
export async function onRequest(context: PagesContext): Promise<Response> {
  if (context.request.method === "OPTIONS") {
    return handleOptions();
  }

  return handleApiRequest(new URL(context.request.url));
}
