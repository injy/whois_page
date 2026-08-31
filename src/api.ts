import { parseDomain } from "./psl";
import { findRdapServer, fetchRdap } from "./rdap";
import { parseRdap, type WhoisResult } from "./parser";
import { fetchWhoisViaProxy } from "./whois";
import { parseWhoisText } from "./whois-parser";
import { fetchViaWebScraper, hasScraper } from "./scraper";
import RDAP_MAP from "./data/tld-rdap.json";
import WHOIS_MAP from "./data/tld-whois.json";
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

  // Priority 1: RDAP
  const rdapServer = (RDAP_MAP as Record<string, string>)[suffix];
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
  const whoisHost = (WHOIS_MAP as Record<string, string>)[suffix];
  const proxyPoolUrl = options?.proxyPoolUrl;
  if (whoisHost && proxyPoolUrl) {
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
  if (webTlds.includes(suffix)) {
    try {
      const scraperResult = await fetchViaWebScraper(registrableDomain, suffix);
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
  if (whoisHost && proxyPoolUrl) availableSources.push("WHOIS");
  if (webTlds.includes(suffix)) availableSources.push("Web");

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
