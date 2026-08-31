import WEB_TLDS from "./data/tld-web.json";

export interface WebScraperResult {
  rawText: string;
}

type ScraperFn = (domain: string, labels: string[]) => Promise<WebScraperResult | null>;

const scrapers: Record<string, ScraperFn> = {};
const webTlds = new Set(WEB_TLDS as string[]);

export function registerScraper(tld: string, fn: ScraperFn): void {
  scrapers[tld] = fn;
}

export async function fetchViaWebScraper(
  domain: string,
  tld: string,
): Promise<WebScraperResult | null> {
  const scraper = scrapers[tld];
  if (!scraper) return null;

  const labels = domain.split(".");
  try {
    return await scraper(domain, labels);
  } catch {
    return null;
  }
}

export function hasScraper(tld: string): boolean {
  return webTlds.has(tld);
}

export function listWebTlds(): string[] {
  return Array.from(webTlds).sort();
}
