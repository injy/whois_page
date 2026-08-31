import { parseDomain } from "./psl";
import { findRdapServer, fetchRdap } from "./rdap";
import { parseRdap, type WhoisResult } from "./parser";
import { fetchWhoisViaProxy } from "./whois";
import { parseWhoisText } from "./whois-parser";
import { fetchViaWebScraper, hasScraper } from "./scraper";

export interface LookupOptions {
  proxyPoolUrl?: string;
}

interface ApiResponse {
  code: number;
  msg: string;
  data: WhoisResult | null;
  rawWhois?: string;
  rawRdap?: string;
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

  let rdapResult: WhoisResult | null = null;
  let whoisResult: WhoisResult | null = null;
  let scraperRaw: string | null = null;
  let rawRdap = "";
  let rawWhois = "";

  // Source 1: RDAP
  const rdapServer = findRdapServer(suffix);
  if (rdapServer) {
    try {
      const rdapResponse = await fetchRdap(rdapServer, registrableDomain);
      rawRdap = rdapResponse.data;
      rdapResult = parseRdap(suffix, rdapResponse.code, rdapResponse.data);
    } catch {
      // RDAP failed, continue to other sources
    }
  }

  // Source 2: WHOIS via proxy pool
  const proxyPoolUrl = options?.proxyPoolUrl;
  if (proxyPoolUrl) {
    try {
      const whoisResponse = await fetchWhoisViaProxy(proxyPoolUrl, registrableDomain, suffix);
      if (whoisResponse) {
        rawWhois = whoisResponse.rawText;
        whoisResult = parseWhoisText(whoisResponse.rawText);
      }
    } catch {
      // WHOIS failed, continue
    }
  }

  // Source 3: Web scraper (only if no good result yet)
  if (!hasGoodResult(rdapResult) && !hasGoodResult(whoisResult) && hasScraper(suffix)) {
    try {
      const scraperResult = await fetchViaWebScraper(registrableDomain, suffix);
      if (scraperResult) {
        scraperRaw = scraperResult.rawText;
        whoisResult = parseWhoisText(scraperResult.rawText);
      }
    } catch {
      // scraper failed
    }
  }

  // Merge results
  const merged = mergeResults(rdapResult, whoisResult);

  if (!merged && !rawRdap && !rawWhois && !scraperRaw) {
    if (!rdapServer && !proxyPoolUrl && !hasScraper(suffix)) {
      return {
        code: 1,
        msg: `No lookup source available for '${registrableDomain}'.`,
        data: null,
      };
    }
    return {
      code: 1,
      msg: `Lookup failed for '${registrableDomain}'.`,
      data: null,
    };
  }

  const response: ApiResponse = {
    code: 0,
    msg: "Query successful",
    data: merged,
  };

  if (rawWhois || scraperRaw) response.rawWhois = rawWhois || scraperRaw || "";
  if (rawRdap) response.rawRdap = rawRdap;

  return response;
}

function hasGoodResult(r: WhoisResult | null): boolean {
  if (!r) return false;
  if (r.reserved) return true;
  if (r.registered && !r.unknown) return true;
  if (!r.registered && !r.unknown) return true;
  return false;
}

function mergeResults(rdap: WhoisResult | null, whois: WhoisResult | null): WhoisResult | null {
  if (!rdap && !whois) return null;
  if (!rdap) return whois;
  if (!whois) return rdap;

  const merged = { ...rdap };

  if (!merged.registered && whois.registered) {
    merged.registered = true;
    merged.unknown = false;
  }

  if (whois.reserved && !merged.reserved) {
    merged.reserved = true;
  }

  if (!merged.registrar && whois.registrar) merged.registrar = whois.registrar;
  if (!merged.registrarURL && whois.registrarURL) merged.registrarURL = whois.registrarURL;
  if (!merged.registrarIANAId && whois.registrarIANAId) merged.registrarIANAId = whois.registrarIANAId;
  if (!merged.registrarWHOISServer && whois.registrarWHOISServer) merged.registrarWHOISServer = whois.registrarWHOISServer;

  if (!merged.creationDate && whois.creationDate) {
    merged.creationDate = whois.creationDate;
    merged.creationDateISO8601 = whois.creationDateISO8601;
    merged.createdAgo = whois.createdAgo;
    merged.createdAgoSeconds = whois.createdAgoSeconds;
  }
  if (!merged.expirationDate && whois.expirationDate) {
    merged.expirationDate = whois.expirationDate;
    merged.expirationDateISO8601 = whois.expirationDateISO8601;
    merged.expiresIn = whois.expiresIn;
    merged.expiresInSeconds = whois.expiresInSeconds;
  }
  if (!merged.updatedDate && whois.updatedDate) {
    merged.updatedDate = whois.updatedDate;
    merged.updatedDateISO8601 = whois.updatedDateISO8601;
    merged.updatedAgo = whois.updatedAgo;
    merged.updatedAgoSeconds = whois.updatedAgoSeconds;
  }

  if (merged.status.length === 0 && whois.status.length > 0) merged.status = whois.status;
  if (merged.nameServers.length === 0 && whois.nameServers.length > 0) merged.nameServers = whois.nameServers;
  if (merged.dnssecSigned === null && whois.dnssecSigned !== null) merged.dnssecSigned = whois.dnssecSigned;

  if (!merged.registryWHOISServer && whois.registryWHOISServer) merged.registryWHOISServer = whois.registryWHOISServer;

  const GRACE = ["Auto Renew Period"];
  const REDEMPTION = ["Redemption Period"];
  const PENDING_DEL = ["Pending Delete"];
  const HOLD = ["Client Hold", "Server Hold"];
  const INACTIVE_T = ["Inactive"];

  merged.gracePeriod = merged.status.some((s) => GRACE.includes(s.text));
  merged.redemptionPeriod = merged.status.some((s) => REDEMPTION.includes(s.text));
  merged.pendingDelete = merged.status.some((s) => PENDING_DEL.includes(s.text));
  merged.hold = merged.status.some((s) => HOLD.includes(s.text));
  merged.inactive = merged.status.some((s) => INACTIVE_T.includes(s.text));

  return merged;
}
