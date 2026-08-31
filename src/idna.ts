/**
 * Minimal IDN helper.
 *
 * The RDAP / WHOIS / scraper maps are keyed by ASCII (punycode) suffixes,
 * so unicode input has to be converted before it can be looked up.
 */
export function toAscii(input: string): string {
  if (!input) return input;
  try {
    const url = new URL(`http://${input}`);
    return url.hostname || input;
  } catch {
    return input;
  }
}
