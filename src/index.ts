import { lookup, type LookupOptions } from "./api";
import { getHtml } from "./html/template";
import { parseDomain } from "./psl";

// ─── Shared handler (platform-agnostic) ───────────────────────────────

async function handleApiRequest(url: URL): Promise<Response> {
  const domain = url.searchParams.get("domain") || "";
  const proxyPoolUrl = url.searchParams.get("proxy_pool") || undefined;

  const options: LookupOptions = {};
  if (proxyPoolUrl) {
    options.proxyPoolUrl = proxyPoolUrl;
  }

  try {
    const result = await lookup(domain, options);
    return new Response(JSON.stringify(result), {
      headers: {
        "content-type": "application/json;charset=UTF-8",
        "access-control-allow-origin": "*",
        "cache-control": "public, max-age=300",
      },
    });
  } catch (e: any) {
    const errorResponse = {
      code: 1,
      msg: e?.message || "Internal error",
      data: null,
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: {
        "content-type": "application/json;charset=UTF-8",
        "access-control-allow-origin": "*",
      },
    });
  }
}

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

function handleOptions(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, OPTIONS",
      "access-control-allow-headers": "content-type",
      "access-control-max-age": "86400",
    },
  });
}

// ─── Route resolution helper ──────────────────────────────────────────

/**
 * Resolves a request into either an API call or the HTML page.
 *
 * Supported patterns:
 *   /                          → HTML page
 *   /?domain=google.com        → JSON API
 *   /google.com                → JSON API (path param)
 *   /api/                      → JSON API
 *   /api/?domain=google.com    → JSON API
 *   /api/google.com            → JSON API (path param)
 *
 * Anything else (e.g. /favicon.ico) is a 404 instead of a bogus lookup.
 */
function resolveRoute(
  pathname: string,
  searchParams: URLSearchParams,
): { mode: "api" | "page" | "notfound"; domain?: string } {
  // Strip leading/trailing slashes for comparison
  const path = pathname.replace(/^\/+|\/+$/g, "");

  // Exact root with no domain query → HTML page
  if (!path && !searchParams.has("domain")) {
    return { mode: "page" };
  }

  // Root with ?domain= → API
  if (!path && searchParams.has("domain")) {
    return { mode: "api", domain: searchParams.get("domain") || "" };
  }

  // /api or /api/lookup → API
  if (path === "api" || path === "api/lookup") {
    return { mode: "api", domain: searchParams.get("domain") || "" };
  }

  // /api/something → API with path as domain
  if (path.startsWith("api/")) {
    const domainFromPath = path.slice(4); // remove "api/"
    if (domainFromPath && !isDomainLike(domainFromPath)) {
      return { mode: "notfound" };
    }
    const domain = domainFromPath || searchParams.get("domain") || "";
    return { mode: "api", domain };
  }

  // /something → API with path as domain (e.g. /google.com)
  if (path) {
    if (!isDomainLike(path)) {
      return { mode: "notfound" };
    }
    return { mode: "api", domain: path };
  }

  // Fallback: HTML page
  return { mode: "page" };
}

/** Keeps static assets such as /favicon.ico from being treated as domains. */
function isDomainLike(value: string): boolean {
  if (value.includes("/") || value.includes("%")) return false;
  return parseDomain(value) !== null;
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
