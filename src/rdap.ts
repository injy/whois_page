import { RDAP_SERVERS } from "./data/rdap-servers";
import { toAscii } from "./idna";

export interface RdapResponse {
  code: number;
  data: string;
}

export function findRdapServer(tld: string): string | null {
  const asciiTld = toAscii(tld);
  return RDAP_SERVERS[asciiTld] ?? RDAP_SERVERS[tld] ?? null;
}

export async function fetchRdap(
  server: string,
  domain: string,
): Promise<RdapResponse> {
  const asciiDomain = toAscii(domain);
  const url = `${server.replace(/\/$/, "")}/domain/${asciiDomain}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/rdap+json" },
      redirect: "follow",
    });

    const contentType = response.headers.get("content-type") || "";
    const isJson = contentType.match(/application\/(rdap\+)?json/i);

    if (!isJson) {
      return { code: response.status, data: "" };
    }

    const text = await response.text();
    return { code: response.status, data: text };
  } finally {
    clearTimeout(timeout);
  }
}
