export interface WebScraperResult {
  rawText: string;
}

type ScraperFn = (domain: string, labels: string[]) => Promise<WebScraperResult | null>;

const scrapers: Record<string, ScraperFn> = {};

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
  return tld in scrapers;
}
