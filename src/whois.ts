import { WHOIS_SERVERS, WHOIS_CUSTOM_QUERIES } from "./data/whois-servers";
import { toAscii } from "./idna";

export interface WhoisResponse {
  server: string;
  rawText: string;
  proxyUsed: string;
}

export interface ProxyEntry {
  url: string;
  weight?: number;
  label?: string;
}

export function findWhoisServer(tld: string): { host: string; query: string } | null {
  const asciiTld = toAscii(tld);
  const custom = WHOIS_CUSTOM_QUERIES[asciiTld] ?? WHOIS_CUSTOM_QUERIES[tld];
  if (custom) return custom;

  const host = WHOIS_SERVERS[asciiTld] ?? WHOIS_SERVERS[tld];
  if (host) return { host, query: "%s\r\n" };

  return null;
}

/** True when a WHOIS server is known for the given public suffix. */
export function hasWhoisServer(tld: string): boolean {
  return findWhoisServer(tld) !== null;
}

async function loadProxyPool(poolUrl: string): Promise<ProxyEntry[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const resp = await fetch(poolUrl, { signal: controller.signal });
    if (!resp.ok) return [];
    const json: unknown = await resp.json();
    if (Array.isArray(json)) return json as ProxyEntry[];
    if (json && typeof json === "object") {
      const obj = json as Record<string, unknown>;
      if (Array.isArray(obj.servers)) return obj.servers as ProxyEntry[];
      if (Array.isArray(obj.proxies)) return obj.proxies as ProxyEntry[];
    }
    return [];
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchWhoisViaProxy(
  proxyConfig: string | ProxyEntry[],
  domain: string,
  tld: string,
): Promise<WhoisResponse | null> {
  const serverInfo = findWhoisServer(tld);
  if (!serverInfo) return null;

  let proxies: ProxyEntry[] = [];

  if (typeof proxyConfig === "string") {
    // Single URL — treat as pool endpoint or direct proxy
    if (proxyConfig.startsWith("http")) {
      // Try loading as pool first
      const pool = await loadProxyPool(proxyConfig);
      if (pool.length > 0) {
        proxies = pool;
      } else {
        // Fallback: single direct proxy
        proxies = [{ url: proxyConfig }];
      }
    } else {
      return null;
    }
  } else {
    proxies = proxyConfig;
  }

  if (proxies.length === 0) return null;

  // Shuffle with weighted selection for load balancing
  const shuffled = shuffleWithWeight(proxies);

  for (const proxy of shuffled) {
    const result = await trySingleProxy(proxy, domain, serverInfo);
    if (result) return result;
  }

  return null;
}

async function trySingleProxy(
  proxy: ProxyEntry,
  domain: string,
  serverInfo: { host: string; query: string },
): Promise<WhoisResponse | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const url = new URL(proxy.url);
    url.searchParams.set("domain", domain);
    url.searchParams.set("server", serverInfo.host);
    url.searchParams.set("query", serverInfo.query);

    const response = await fetch(url.toString(), {
      signal: controller.signal,
      headers: { Accept: "text/plain" },
    });

    if (!response.ok) return null;

    const rawText = await response.text();
    if (!rawText.trim()) return null;

    return {
      server: serverInfo.host,
      rawText,
      proxyUsed: proxy.label || proxy.url,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function shuffleWithWeight(entries: ProxyEntry[]): ProxyEntry[] {
  // Weighted random shuffle: higher weight = more likely to appear earlier
  const scored = entries.map((e) => ({
    entry: e,
    score: Math.random() * (e.weight ?? 1),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.entry);
}
