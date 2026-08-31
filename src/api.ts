import { parseDomain } from "./psl";
import { toAscii } from "./idna";
import { findRdapServer, fetchRdap } from "./rdap";
import { parseRdap, type WhoisResult } from "./parser";
import { fetchWhoisViaProxy, hasWhoisServer } from "./whois";
import { parseWhoisText } from "./whois-parser";
import { fetchViaWebScraper } from "./scraper";
import { CONFIG } from "./config";
import WEB_TLDS from "./data/tld-web.json";

export interface LookupOptions {
  proxyPoolUrl?: string;
}

interface ApiResponse {
  code: number;
  msg: string;
  data: WhoisResult | null;
  rawWhois?: string;
  rawRdap?: string;
  sourceUsed?: "rdap" | "whois" | "web";
}

export function cleanDomain(input: string): string {
  let domain = input.trim();
  if (!domain) return "";

  domain = domain.replace(/\s+/g, "").replace(/\.{2,}/g, ".").replace(/^\.+|\.+$/g, "");

  try {
    const url = new URL(domain);
    if (url.hostname) domain = url.hostname;
  } catch {
    // not a URL
  }

  return domain;
}

/**
 * Guards the user supplied `proxy_pool` parameter against SSRF: only http(s)
 * URLs are accepted and hosts pointing at private / loopback / link-local
 * ranges are rejected.
 */
function isAllowedProxyPoolUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return false;

  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!host) return false;
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".internal") ||
    host === "::1" ||
    host === "0.0.0.0"
  ) {
    return false;
  }
  if (/^127\./.test(host)) return false;
  if (/^10\./.test(host)) return false;
  if (/^192\.168\./.test(host)) return false;
  if (/^169\.254\./.test(host)) return false;

  const private172 = host.match(/^172\.(\d+)\./);
  if (private172) {
    const second = Number(private172[1]);
    if (second >= 16 && second <= 31) return false;
  }

  return true;
}

export async function lookup(
  rawDomain: string,
  options?: LookupOptions,
): Promise<ApiResponse> {
  const domain = cleanDomain(rawDomain);
  if (!domain) {
    return { code: 1, msg: "The 'domain' parameter is required.", data: null };
  }

  const parsed = parseDomain(domain);
  if (!parsed) {
    return { code: 1, msg: `'${domain}' is not a valid domain.`, data: null };
  }

  const { registrableDomain, suffix } = parsed;
  // Every lookup table is keyed by ASCII (punycode) suffixes.
  const asciiSuffix = toAscii(suffix);

  const requestedPool = options?.proxyPoolUrl;
  if (requestedPool) {
    if (!CONFIG.ALLOW_CUSTOM_PROXY_POOL) {
      return { code: 1, msg: "Custom proxy pools are disabled.", data: null };
    }
    if (!isAllowedProxyPoolUrl(requestedPool)) {
      return {
        code: 1,
        msg: "The 'proxy_pool' parameter must be a public http(s) URL.",
        data: null,
      };
    }
  }
  const proxyPoolUrl = requestedPool || CONFIG.WHOIS_PROXY_POOL_URL || undefined;

  // Priority 1: RDAP
  const rdapServer = findRdapServer(suffix);
  if (rdapServer) {
    try {
      const rdapResponse = await fetchRdap(rdapServer, registrableDomain);
      const result = parseRdap(suffix, rdapResponse.code, rdapResponse.data);
      if (hasGoodResult(result)) {
        return {
          code: 0,
          msg: "Query successful",
          data: result,
          rawRdap: rdapResponse.data,
          sourceUsed: "rdap",
        };
      }
    } catch {
      // RDAP failed, fall through to WHOIS
    }
  }

  // Priority 2: WHOIS via proxy pool
  if (hasWhoisServer(suffix) && proxyPoolUrl) {
    try {
      const whoisResponse = await fetchWhoisViaProxy(proxyPoolUrl, registrableDomain, suffix);
      if (whoisResponse) {
        const result = parseWhoisText(whoisResponse.rawText);
        if (hasGoodResult(result)) {
          return {
            code: 0,
            msg: "Query successful",
            data: result,
            rawWhois: whoisResponse.rawText,
            sourceUsed: "whois",
          };
        }
      }
    } catch {
      // WHOIS failed, fall through to web scraper
    }
  }

  // Priority 3: Web scraper
  const webTlds = WEB_TLDS as string[];
  if (webTlds.includes(suffix) || webTlds.includes(asciiSuffix)) {
    try {
      const scraperResult = await fetchViaWebScraper(registrableDomain, asciiSuffix);
      if (scraperResult) {
        const result = parseWhoisText(scraperResult.rawText);
        if (hasGoodResult(result)) {
          return {
            code: 0,
            msg: "Query successful",
            data: result,
            rawWhois: scraperResult.rawText,
            sourceUsed: "web",
          };
        }
      }
    } catch {
      // Web scraper failed
    }
  }

  // All sources exhausted
  const availableSources: string[] = [];
  if (rdapServer) availableSources.push("RDAP");
  if (hasWhoisServer(suffix) && proxyPoolUrl) availableSources.push("WHOIS");
  if (webTlds.includes(suffix) || webTlds.includes(asciiSuffix)) availableSources.push("Web");

  if (availableSources.length === 0) {
    return {
      code: 1,
      msg: `No lookup source available for '${registrableDomain}'.`,
      data: null,
    };
  }

  return {
    code: 1,
    msg: `All lookup sources failed for '${registrableDomain}'. Tried: ${availableSources.join(", ")}.`,
    data: null,
  };
}

function hasGoodResult(r: WhoisResult | null): boolean {
  if (!r) return false;
  if (r.reserved) return true;
  if (r.registered && !r.unknown) return true;
  if (!r.registered && !r.unknown) return true;
  return false;
}
