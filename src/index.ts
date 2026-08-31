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

// ─── Cloudflare Workers adapter ───────────────────────────────────────

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/lookup" || url.pathname === "/api/") {
      return handleApiRequest(url);
    }

    if (url.pathname === "/" || url.pathname === "") {
      return handleRootRequest();
    }

    return handleNotFound();
  },
};

// ── Tencent Cloud SCF adapter ────────────────────────────────────────
// Deploy as Web Function (HTTP trigger)
// Entry: src/adapters/tencent.handler

export async function tencentHandler(event: any, _context: any): Promise<any> {
  const url = new URL(
    event.path + (event.queryString ? "?" + new URLSearchParams(event.queryString).toString() : ""),
    "http://localhost",
  );

  if (url.pathname === "/api/lookup" || url.pathname === "/api/") {
    const resp = await handleApiRequest(url);
    return {
      statusCode: resp.status,
      headers: Object.fromEntries(resp.headers.entries()),
      body: await resp.text(),
    };
  }

  if (url.pathname === "/" || url.pathname === "") {
    const resp = handleRootRequest();
    return {
      statusCode: resp.status,
      headers: Object.fromEntries(resp.headers.entries()),
      body: await resp.text(),
    };
  }

  const resp = handleNotFound();
  return {
    statusCode: resp.status,
    headers: Object.fromEntries(resp.headers.entries()),
    body: await resp.text(),
  };
}

// ─── Alibaba Cloud FC adapter ─────────────────────────────────────────
// Deploy as HTTP Function
// Entry: src/adapters/aliyun.handler

export async function aliyunHandler(request: any, context: any): Promise<any> {
  const url = new URL(request.url);

  if (url.pathname === "/api/lookup" || url.pathname === "/api/") {
    return handleApiRequest(url);
  }

  if (url.pathname === "/" || url.pathname === "") {
    return handleRootRequest();
  }

  return handleNotFound();
}
