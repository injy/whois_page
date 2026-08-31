import { lookup, type LookupEnv } from "./api";
import { getHtml } from "./html/template";

export default {
  async fetch(request: Request, env: Record<string, string>): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/lookup") {
      return handleApi(url, env);
    }

    if (url.pathname === "/" || url.pathname === "") {
      return new Response(getHtml(), {
        headers: {
          "content-type": "text/html;charset=UTF-8",
          "cache-control": "no-cache",
        },
      });
    }

    return new Response("Not Found", { status: 404 });
  },
};

async function handleApi(url: URL, env: Record<string, string>): Promise<Response> {
  const domain = url.searchParams.get("domain") || "";

  const lookupEnv: LookupEnv = {};
  // WHOIS_PROXY_POOL_URL takes priority; falls back to WHOIS_PROXY_URL for backward compatibility
  if (env.WHOIS_PROXY_POOL_URL) {
    lookupEnv.WHOIS_PROXY_URL = env.WHOIS_PROXY_POOL_URL;
  } else if (env.WHOIS_PROXY_URL) {
    lookupEnv.WHOIS_PROXY_URL = env.WHOIS_PROXY_URL;
  }

  try {
    const result = await lookup(domain, lookupEnv);
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
