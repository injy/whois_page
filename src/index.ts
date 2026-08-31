import { lookup, type LookupOptions } from "./api";
import { getHtml } from "./html/template";

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
 */
function resolveRoute(
  pathname: string,
  searchParams: URLSearchParams,
): { mode: "api" | "page"; domain?: string } {
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
    const domain = domainFromPath || searchParams.get("domain") || "";
    return { mode: "api", domain };
  }

  // /something → API with path as domain (e.g. /google.com)
  if (path) {
    const domainFromPath = path;
    const domain = domainFromPath || searchParams.get("domain") || "";
    return { mode: "api", domain };
  }

  // Fallback: HTML page
  return { mode: "page" };
}

// ─── Cloudflare Workers adapter ───────────────────────────────────────

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const route = resolveRoute(url.pathname, url.searchParams);

    if (route.mode === "api") {
      // Override domain in URL for handleApiRequest
      if (route.domain) {
        url.searchParams.set("domain", route.domain);
      }
      return handleApiRequest(url);
    }

    return handleRootRequest();
  },
};

// ── Tencent Cloud SCF adapter ────────────────────────────────────────
// Deploy as Web Function (HTTP trigger)
// Entry: src/adapters/tencent.handler

export async function tencentHandler(event: any, _context: any): Promise<any> {
  const qs = event.queryString || {};
  const params = new URLSearchParams(qs);
  const route = resolveRoute(event.path || "/", params);

  // Build a URL object for handleApiRequest
  const url = new URL("http://localhost" + (event.path || "/"));
  for (const [k, v] of params.entries()) {
    url.searchParams.set(k, v);
  }

  if (route.mode === "api") {
    if (route.domain) {
      url.searchParams.set("domain", route.domain);
    }
    const resp = await handleApiRequest(url);
    return {
      statusCode: resp.status,
      headers: Object.fromEntries(resp.headers.entries()),
      body: await resp.text(),
    };
  }

  const resp = handleRootRequest();
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
  const url = new URL(request.url);
  const route = resolveRoute(url.pathname, url.searchParams);

  if (route.mode === "api") {
    if (route.domain) {
      url.searchParams.set("domain", route.domain);
    }
    return handleApiRequest(url);
  }

  return handleRootRequest();
}
