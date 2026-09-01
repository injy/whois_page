import WEB_TLDS from "./data/tld-web.json";
import * as scrapers from "./scrapers";
import type { WhoisResult } from "./parser";

export interface WebScraperResult {
  rawText: string;
  /**
   * Optional structured result. When a scraper can extract the needed fields
   * (domain, status, dates, name servers, registrar, ...) it should populate
   * this so the unified frontend renderer shows the same rich cards as RDAP /
   * WHOIS. When absent, the caller falls back to parsing `rawText`.
   */
  data?: WhoisResult;
}

export interface TldWebConfig {
  tld: string;
  /** Static Cookie header value sent on every request (e.g. "app_language=en"). */
  cookie?: string;
  /** When true, fire a pre-flight request to grab the registry's Set-Cookie and replay it. */
  captureCookie?: boolean;
}

type ScraperFn = (
  domain: string,
  labels: string[],
  opts?: TldWebConfig,
) => Promise<WebScraperResult | null>;

const scraperMap: Record<string, ScraperFn> = {};

// tld-web.json entries may be a plain TLD string or an object carrying cookie config.
const tldEntries: TldWebConfig[] = (WEB_TLDS as Array<string | TldWebConfig>).map((e) =>
  typeof e === "string" ? { tld: e } : e,
);
const webTlds = new Set(tldEntries.map((e) => e.tld));
const tldConfig = new Map<string, TldWebConfig>(tldEntries.map((e) => [e.tld, e]));

// Register specific scrapers for known TLDs
const specificScrapers: Record<string, (domain: string) => Promise<WebScraperResult | null>> = {
  "jp": scrapers.jpScraper,
  "uk": scrapers.ukScraper,
  "de": scrapers.deScraper,
  "fr": scrapers.frScraper,
  "it": scrapers.itScraper,
  "br": scrapers.brScraper,
  "ru": scrapers.ruScraper,
  "kr": scrapers.krScraper,
  "tw": scrapers.twScraper,
  "hk": scrapers.hkScraper,
  "gt": scrapers.gtScraper,
  "bb": scrapers.bbScraper,
  "bo": scrapers.boScraper,
  "bt": scrapers.btScraper,
  "cu": scrapers.cuScraper,
  "dz": scrapers.dzScraper,
  "gf": scrapers.gfScraper,
  "gr": scrapers.grScraper,
  "gw": scrapers.gwScraper,
  "hm": scrapers.hmScraper,
  "hu": scrapers.huScraper,
  "jo": scrapers.joScraper,
  "mt": scrapers.mtScraper,
  "ni": scrapers.niScraper,
  "np": scrapers.npScraper,
  "pa": scrapers.paScraper,
  "ph": scrapers.phScraper,
  "sv": scrapers.svScraper,
  "tj": scrapers.tjScraper,
  "tt": scrapers.ttScraper,
  "vn": scrapers.vnScraper,
  "ao": scrapers.aoScraper,
  "az": scrapers.azScraper,
  "ba": scrapers.baScraper,
  "cy": scrapers.cyScraper,
  "dj": scrapers.djScraper,
  "gm": scrapers.gmScraper,
  "gq": scrapers.gqScraper,
  "lk": scrapers.lkScraper,
  "mq": scrapers.gfScraper,
  "nr": scrapers.nrScraper,
  "py": scrapers.pyScraper,
};

// Initialize scraper map
for (const tld of webTlds) {
  if (specificScrapers[tld]) {
    // Specific scrapers manage their own requests (and their own cookies).
    scraperMap[tld] = (domain: string, _labels: string[], _opts?: TldWebConfig) =>
      specificScrapers[tld](domain);
  } else {
    // Generic scrapers carry the per-TLD cookie config from tld-web.json.
    scraperMap[tld] = (domain: string, _labels: string[], opts?: TldWebConfig) =>
      scrapers.genericScraper(tld, domain, opts);
  }
}

export function registerScraper(tld: string, fn: ScraperFn): void {
  scraperMap[tld] = fn;
}

export async function fetchViaWebScraper(
  domain: string,
  tld: string,
): Promise<WebScraperResult | null> {
  const scraper = scraperMap[tld];
  if (!scraper) return null;

  const labels = domain.split(".");
  const opts = tldConfig.get(tld);
  try {
    return await scraper(domain, labels, opts);
  } catch {
    return null;
  }
}

export function listWebTlds(): string[] {
  return Array.from(webTlds).sort();
}
