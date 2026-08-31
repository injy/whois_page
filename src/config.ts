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
  WHOIS_PROXY_POOL_URL: "https://yangkexi.cn/json/pages_whois_server.json",

  /**
   * Allow the caller to override the pool through the `proxy_pool` query
   * parameter. Set to false to always use WHOIS_PROXY_POOL_URL.
   */
  ALLOW_CUSTOM_PROXY_POOL: true,
} as const;
