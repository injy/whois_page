import { lookup, type LookupOptions } from "./api";

/**
 * Platform-agnostic JSON API handler.
 *
 * Shared by the Cloudflare Worker entry (src/index.ts) and the EdgeOne Pages
 * cloud functions (src/edgeone/*).
 */
export async function handleApiRequest(url: URL): Promise<Response> {
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

export function handleOptions(): Response {
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
