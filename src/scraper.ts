import WEB_TLDS from "./data/tld-web.json";
import * as scrapers from "./scrapers";

export interface WebScraperResult {
  rawText: string;
}

type ScraperFn = (domain: string, labels: string[]) => Promise<WebScraperResult | null>;

const scraperMap: Record<string, ScraperFn> = {};
const webTlds = new Set(WEB_TLDS as string[]);

// Register specific scrapers for known TLDs
const specificScrapers: Record<string, (domain: string) => Promise<WebScraperResult | null>> = {
  "cn": scrapers.cnScraper,
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
};

// Initialize scraper map
for (const tld of webTlds) {
  if (specificScrapers[tld]) {
    scraperMap[tld] = async (domain: string) => {
      const result = await specificScrapers[tld](domain);
      return result;
    };
  } else {
    // Use generic scraper for other TLDs
    scraperMap[tld] = async (domain: string) => {
      return await scrapers.genericScraper(tld, domain);
    };
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
  try {
    return await scraper(domain, labels);
  } catch {
    return null;
  }
}

export function hasScraper(tld: string): boolean {
  return tld in scraperMap || webTlds.has(tld);
}

export function listWebTlds(): string[] {
  return Array.from(webTlds).sort();
}
