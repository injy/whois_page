/**
 * Application configuration.
 * Edit these values before deploying to any platform.
 */

export const CONFIG = {
  /**
   * WHOIS proxy pool JSON URL.
   * The file should return an array of proxy entries:
   *   [{ url: "https://...", label: "...", weight: 1 }, ...]
   *
   * Leave empty ("") to disable WHOIS lookups entirely.
   */
  WHOIS_PROXY_POOL_URL: "https://v.nz/pages_whois_server.json",
} as const;
