import { handleApiRequest, handleOptions } from "./handler";
import { getHtml } from "./html/template";
import { parseDomain } from "./psl";

// ─── Shared handler (platform-agnostic) ───────────────────────────────

function handleRootRequest(): Response {
  return new Response(getHtml(), {
    headers: {
      "content-type": "text/html;charset=UTF-8",
      "cache-control": "no-cache",
    },
  });
}

function handleNotFound(): Response {
  return new Response("Not Found", { status: 404 });
}

// ─── Route resolution helper ──────────────────────────────────────────

/**
 * Resolves a request into either an API call or the HTML page.
 *
 * Supported patterns:
 *   /                          → HTML page
 *   /?domain=google.com        → HTML page (JS deep-links and renders the result)
 *   /google.com                → HTML page (path form, JS deep-links)
 *   /api/                      → JSON API
 *   /api/?domain=google.com    → JSON API
 *   /api/google.com            → JSON API (path param)
 *
 * Anything else that looks like a static asset (e.g. /favicon.ico) is a 404
 * instead of a bogus lookup; any other unknown path still serves the app.
 */
function resolveRoute(
  pathname: string,
  searchParams: URLSearchParams,
): { mode: "api" | "page" | "notfound"; domain?: string } {
  // Strip leading/trailing slashes for comparison
  const path = pathname.replace(/^\/+|\/+$/g, "");

  // /api or /api/lookup → JSON API (?domain=)
  if (path === "api" || path === "api/lookup") {
    return { mode: "api", domain: searchParams.get("domain") || "" };
  }

  // /api/something → JSON API with the path as the domain
  if (path.startsWith("api/")) {
    const domainFromPath = path.slice(4); // remove "api/"
    if (domainFromPath && !isDomainLike(domainFromPath)) {
      return { mode: "notfound" };
    }
    const domain = domainFromPath || searchParams.get("domain") || "";
    return { mode: "api", domain };
  }

  // Everything else is the HTML page (root, /?domain=, /google.com, ...).
  // The browser reads the domain from ?domain= or the pathname and renders the
  // result itself, so both forms show the same UI when opened directly.
  if (hasAssetExtension(path)) {
    return { mode: "notfound" };
  }
  return { mode: "page" };
}

/** Keeps static assets such as /favicon.ico from being treated as domains. */
function isDomainLike(value: string): boolean {
  if (value.includes("/") || value.includes("%")) return false;
  return parseDomain(value) !== null;
}

const ASSET_EXTENSION_RE =
  /\.(ico|png|jpe?g|gif|svg|webp|avif|css|js|mjs|map|json|txt|xml|woff2?|ttf|otf|mp4|pdf|webmanifest)$/i;

function hasAssetExtension(value: string): boolean {
  const lastSegment = value.split("/").pop() || value;
  return ASSET_EXTENSION_RE.test(lastSegment);
}

function respond(route: { mode: "api" | "page" | "notfound"; domain?: string }, url: URL): Promise<Response> | Response {
  if (route.mode === "notfound") {
    return handleNotFound();
  }

  if (route.mode === "api") {
    // Override domain in URL for handleApiRequest
    if (route.domain) {
      url.searchParams.set("domain", route.domain);
    }
    return handleApiRequest(url);
  }

  return handleRootRequest();
}

// ─── Cloudflare Workers adapter ───────────────────────────────────────

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === "OPTIONS") {
      return handleOptions();
    }

    const url = new URL(request.url);
    const route = resolveRoute(url.pathname, url.searchParams);

    return respond(route, url);
  },
};

// ── Tencent Cloud SCF adapter ────────────────────────────────────────
// Deploy as Web Function (HTTP trigger)
// Entry: src/adapters/tencent.handler

export async function tencentHandler(event: any, _context: any): Promise<any> {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: {}, body: "" };
  }

  const qs = event.queryString || {};
  const params = new URLSearchParams(qs);
  const route = resolveRoute(event.path || "/", params);

  // Build a URL object for handleApiRequest
  const url = new URL("http://localhost" + (event.path || "/"));
  for (const [k, v] of params.entries()) {
    url.searchParams.set(k, v);
  }

  const resp = await respond(route, url);
  return {
    statusCode: resp.status,
    headers: Object.fromEntries(resp.headers.entries()),
    body: await resp.text(),
  };
}

// ─── Alibaba Cloud FC adapter ────────────────────────────────────────
// Deploy as HTTP Function
// Entry: src/adapters/aliyun.handler

export async function aliyunHandler(request: any, context: any): Promise<any> {
  if (request.method === "OPTIONS") {
    return handleOptions();
  }

  const url = new URL(request.url);

  return respond(resolveRoute(url.pathname, url.searchParams), url);
}
