import { parseHTML } from "linkedom";
import { WebScraperResult } from "../scraper";
import { parseGtHtml } from "./gt";

const FETCH_TIMEOUT_MS = 12000;

// Shared browser-like User-Agent used by every scraper request.
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

/**
 * Every registry is a third party site, so all scraper requests are bounded.
 */
async function fetchTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

const NBSP = " ";
const SKIP_TAGS = new Set([
  "script", "style", "noscript", "svg", "head", "nav", "footer", "header",
]);
const BLOCK_TAGS = new Set([
  "p", "div", "li", "h1", "h2", "h3", "h4", "h5", "h6", "table", "pre", "section",
]);

/**
 * Parse a registry HTML page into a queryable DOM document (linkedom).
 * linkedom is pure JS (no Node built-ins) so it runs on edge runtimes such as
 * Cloudflare Workers and EdgeOne Pages.
 */
export function parseHtml(html: string) {
  return parseHTML(html).document;
}

function normalizeWs(s: string): string {
  return s.replace(new RegExp(NBSP, "g"), " ").replace(/\s+/g, " ").trim();
}

function nodeToText(node: any, out: string[]): void {
  if (node.nodeType === 3) {
    out.push(String(node.textContent ?? "").replace(new RegExp(NBSP, "g"), " "));
    return;
  }
  if (node.nodeType !== 1) return; // skip comments / doctype / etc.
  const tag = String(node.tagName || "").toLowerCase();
  if (SKIP_TAGS.has(tag)) return;

  if (tag === "table") {
    for (const tr of Array.from(node.querySelectorAll("tr")) as any[]) {
      const cells = (Array.from(tr.querySelectorAll("td, th")) as any[])
        .map((c) => normalizeWs(String(c.textContent ?? "")))
        .filter(Boolean);
      if (cells.length >= 2) {
        out.push(`${cells[0]}: ${cells.slice(1).join(", ")}`);
      } else if (cells.length === 1) {
        out.push(cells[0]);
      }
    }
    return;
  }

  if (tag === "br" || tag === "hr") {
    out.push("\n");
    return;
  }

  for (const child of Array.from(node.childNodes)) {
    nodeToText(child, out);
  }

  if (BLOCK_TAGS.has(tag)) out.push("\n");
}

/**
 * Turns a registry HTML page into "Key: Value" text so that parseWhoisText()
 * can read it. Handing raw HTML to the text parser produced garbage fields
 * and false "unregistered" matches on words such as "not found".
 *
 * Implemented with a real DOM (linkedom) instead of tag-stripping regex, so
 * HTML entity decoding and block structure are handled correctly.
 */
export function htmlToWhoisText(html: string): string {
  const doc = parseHtml(html);
  const root = doc.body || doc.documentElement;
  const parts: string[] = [];
  if (root) nodeToText(root, parts);
  return parts
    .join("")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter((line) => line.length > 0)
    .join("\n")
    .trim();
}

// CN - China NIC
export const cnScraper = async (domain: string): Promise<WebScraperResult | null> => {
  try {
    const url = `https://whois.cnnic.cn/whois?domain=${encodeURIComponent(domain)}&lang=en`;
    const response = await fetchTimeout(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    if (!response.ok) return null;
    const html = await response.text();
    const match = html.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
    if (match) {
      return { rawText: match[1] };
    }
    return { rawText: htmlToWhoisText(html) };
  } catch {
    return null;
  }
};

// JP - Japan Registry Services
export const jpScraper = async (domain: string): Promise<WebScraperResult | null> => {
  try {
    const url = `https://whois.jprs.jp/cgi-bin/whois_gw?lang=e&key=${encodeURIComponent(domain)}`;
    const response = await fetchTimeout(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    if (!response.ok) return null;
    const html = await response.text();
    const match = html.match(/<textarea[^>]*>([\s\S]*?)<\/textarea>/i);
    if (match) {
      return { rawText: match[1] };
    }
    return { rawText: htmlToWhoisText(html) };
  } catch {
    return null;
  }
};

// UK - Nominet
export const ukScraper = async (domain: string): Promise<WebScraperResult | null> => {
  try {
    const url = `https://whois.nominet.uk/${encodeURIComponent(domain)}`;
    const response = await fetchTimeout(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    if (!response.ok) return null;
    const html = await response.text();
    const match = html.match(/<div[^>]*class="[^"]*whois[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    if (match) {
      return { rawText: match[1].replace(/<[^>]+>/g, "") };
    }
    return { rawText: htmlToWhoisText(html) };
  } catch {
    return null;
  }
};

// DE - DENIC
export const deScraper = async (domain: string): Promise<WebScraperResult | null> => {
  try {
    const url = `https://www.denic.de/en/whois/?domain=${encodeURIComponent(domain)}`;
    const response = await fetchTimeout(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    if (!response.ok) return null;
    const html = await response.text();
    return { rawText: htmlToWhoisText(html) };
  } catch {
    return null;
  }
};

// FR - AFNIC
export const frScraper = async (domain: string): Promise<WebScraperResult | null> => {
  try {
    const url = `https://www.afnic.fr/outils/whois/recherche.html?query=${encodeURIComponent(domain)}`;
    const response = await fetchTimeout(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    if (!response.ok) return null;
    const html = await response.text();
    return { rawText: htmlToWhoisText(html) };
  } catch {
    return null;
  }
};

// IT - IIT
export const itScraper = async (domain: string): Promise<WebScraperResult | null> => {
  try {
    const url = `https://www.nic.it/en/whois-search?search=${encodeURIComponent(domain)}`;
    const response = await fetchTimeout(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    if (!response.ok) return null;
    const html = await response.text();
    return { rawText: htmlToWhoisText(html) };
  } catch {
    return null;
  }
};

// BR - Registro.br
export const brScraper = async (domain: string): Promise<WebScraperResult | null> => {
  try {
    const url = `https://registro.br/whois/?domain=${encodeURIComponent(domain)}`;
    const response = await fetchTimeout(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    if (!response.ok) return null;
    const html = await response.text();
    return { rawText: htmlToWhoisText(html) };
  } catch {
    return null;
  }
};

// RU - Coordination Center for TLD RU
export const ruScraper = async (domain: string): Promise<WebScraperResult | null> => {
  try {
    const url = `https://www.tcinet.ru/query/whois?domain=${encodeURIComponent(domain)}`;
    const response = await fetchTimeout(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    if (!response.ok) return null;
    const html = await response.text();
    return { rawText: htmlToWhoisText(html) };
  } catch {
    return null;
  }
};

// KR - KISA
export const krScraper = async (domain: string): Promise<WebScraperResult | null> => {
  try {
    const url = `https://whois.kisa.or.kr/eng/whoisView.jsp?isDomain=${encodeURIComponent(domain)}`;
    const response = await fetchTimeout(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    if (!response.ok) return null;
    const html = await response.text();
    return { rawText: htmlToWhoisText(html) };
  } catch {
    return null;
  }
};

// TW - TWNIC
export const twScraper = async (domain: string): Promise<WebScraperResult | null> => {
  try {
    const url = `https://www.twnic.net/whois/whois.php?domain=${encodeURIComponent(domain)}`;
    const response = await fetchTimeout(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    if (!response.ok) return null;
    const html = await response.text();
    return { rawText: htmlToWhoisText(html) };
  } catch {
    return null;
  }
};

// HK - HKIRC
export const hkScraper = async (domain: string): Promise<WebScraperResult | null> => {
  try {
    const url = `https://www.hkirc.hk/en/domain-services/whois?domain=${encodeURIComponent(domain)}`;
    const response = await fetchTimeout(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    if (!response.ok) return null;
    const html = await response.text();
    return { rawText: htmlToWhoisText(html) };
  } catch {
    return null;
  }
};

// GT - Guatemala registry. The HTML layout is parsed 1:1 from the original
// PHP project WHOISWeb.php::getGT() inside src/scrapers/gt.ts.
// The upstream registry is flaky, so retry the fetch a few times before
// giving up (a single timeout/connection reset would otherwise fail the lookup).
export const gtScraper = async (domain: string): Promise<WebScraperResult | null> => {
  try {
    const url = `https://www.gt/sitio/whois.php?dn=${encodeURIComponent(domain)}&lang=en`;
    const init: RequestInit = {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    };

    let html: string | null = null;
    for (let attempt = 0; attempt < 3 && html === null; attempt++) {
      try {
        const response = await fetchTimeout(url, init);
        if (response.ok) html = await response.text();
      } catch {
        // network error / timeout — try again
      }
    }
    if (!html) return null;

    const parsed = parseGtHtml(html);
    return parsed ? { rawText: parsed.rawText, data: parsed.data } : null;
  } catch {
    return null;
  }
};

// BB - Barbados (from original project getBB())
export const bbScraper = async (domain: string): Promise<WebScraperResult | null> => {
  try {
    const url = `https://whois.telecoms.gov.bb/status/${encodeURIComponent(domain)}`;
    const response = await fetchTimeout(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    if (!response.ok) return null;
    const html = await response.text();
    
    // Mirror the original project's getBB(): walk the sibling nodes that
    // follow the first <table> and collect their text until a <p> element is
    // reached. The registry prints the WHOIS record (and, for unregistered
    // domains, an "ERROR: Can't open file ..." notice) as plain text there.
    const document = parseHtml(html);
    const table = document.querySelector("table");
    if (table) {
      const parts: string[] = [];
      let next = table.nextSibling as any;
      while (next) {
        if ((next.nodeName || "").toLowerCase() === "p") break;
        const text = (next.textContent || "").trim();
        if (text) parts.push(text);
        next = next.nextSibling as any;
      }
      if (parts.length) return { rawText: parts.join("\n\n") };
    }
    return { rawText: htmlToWhoisText(html) };
  } catch {
    return null;
  }
};

// BO - Bolivia (from original project getBO())
// The search endpoint answers with a JS redirect only; the actual record lives
// on the page it points at, so a query needs two requests. Both must carry the
// app_language cookie, otherwise the site replies in Spanish.
const BO_COOKIE = "app_language=en";
const BO_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

export const boScraper = async (domain: string): Promise<WebScraperResult | null> => {
  try {
    // Split once, like the original project's domainParts (explode(".", $domain, 2)),
    // so third level names (foo.com.bo) keep ".com.bo" as the subdominio.
    const dot = domain.indexOf(".");
    const formData = new URLSearchParams({
      dominio: dot === -1 ? domain : domain.slice(0, dot),
      subdominio: dot === -1 ? "" : "." + domain.slice(dot + 1),
      enviar: "",
    });

    const response = await fetchTimeout("https://nic.bo/whois.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: BO_COOKIE,
        "User-Agent": BO_UA,
      },
      body: formData.toString(),
    });
    if (!response.ok) return null;
    const html = await response.text();

    // A failed lookup is reported inside div.texto_error.
    const error = (
      parseHtml(html).querySelector("div.texto_error")?.textContent || ""
    ).trim();
    if (error) return { rawText: error };

    // Follow the window.self.location="..." redirect to the record page.
    const redirect = html.match(/window\.self\.location\s*=\s*"([^"]+)"/i);
    if (!redirect || !redirect[1]) return null;

    const recordResponse = await fetchTimeout("https://nic.bo/" + redirect[1], {
      headers: { Cookie: BO_COOKIE, "User-Agent": BO_UA },
    });
    if (!recordResponse.ok) return null;
    const recordHtml = (await recordResponse.text())
      .split(" :&nbsp;&nbsp;")
      .join("");

    // Turn the record tables into "Key: Value" text, mirroring getBO():
    // the section heading, then one line per table row (single cells become
    // uppercase section titles, two cells become "Key: Value").
    const doc = parseHtml(recordHtml);
    const lines: string[] = [];
    const heading = doc.querySelector("#whois h4");
    if (heading) {
      const text = (heading.textContent || "").trim();
      if (text) lines.push(text);
    }
    for (const tr of Array.from(doc.querySelectorAll("tr"))) {
      const tds = Array.from(tr.querySelectorAll("td"));
      if (tds.length === 1) {
        const text = (tds[0].textContent || "").trim();
        if (text) lines.push(text.toUpperCase());
      } else if (tds.length === 2) {
        const key = (tds[0].textContent || "").trim();
        const value = (tds[1].textContent || "").trim();
        if (key) lines.push(`${key}: ${value}`);
      }
    }
    if (lines.length) return { rawText: lines.join("\n") };
    return { rawText: htmlToWhoisText(recordHtml) };
  } catch {
    return null;
  }
};

// BT - Bhutan (from original project getBT())
// The registry answers either with a result <table> (not-found notices are
// returned that way) or, for registered domains, with nested card bodies of
// h5/p rows. Those rows are written as "Key : Value", so the spacing has to be
// normalised to "Key: Value" for the parser patterns to match.
export const btScraper = async (domain: string): Promise<WebScraperResult | null> => {
  try {
    // Split once, like the original project's domainParts (explode(".", $domain, 2)):
    // .bt registrations are usually third level (drukair.com.bt), so ext has to
    // keep everything after the first dot (".com.bt"), not just the next label.
    const dot = domain.indexOf(".");
    const params = new URLSearchParams({
      query: dot === -1 ? domain : domain.slice(0, dot),
      ext: dot === -1 ? "" : "." + domain.slice(dot + 1),
    });

    const response = await fetchTimeout(
      `https://www.nic.bt/search?${params.toString()}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      },
    );
    if (!response.ok) return null;
    const html = await response.text();

    const doc = parseHtml(html);

    // Not-found notices (and a few other replies) come back inside a <table>.
    const table = doc.querySelector("table");
    if (table) {
      const text = (table.textContent || "").trim();
      if (text) return { rawText: text };
    }

    // Registered domains are rendered as nested card bodies: h5 is the section
    // title ("Domain Details :"), p is a "Key : Value" row.
    const lines: string[] = [];
    for (const cardBody of Array.from(doc.querySelectorAll("div.card-body > div.card-body"))) {
      for (const child of Array.from(cardBody.children)) {
        const nodeName = (child.nodeName || "").toLowerCase();
        if (nodeName !== "h5" && nodeName !== "p") continue;
        const text = (child.textContent || "").trim();
        if (!text) continue;
        lines.push(
          nodeName === "h5" ? text.split(" :").join("") : text.split(" :").join(":"),
        );
      }
      lines.push("");
    }
    if (lines.length) return { rawText: lines.join("\n").trim() };
    return { rawText: htmlToWhoisText(html) };
  } catch {
    return null;
  }
};

// CU - Cuba (from original project getCU())
export const cuScraper = async (domain: string): Promise<WebScraperResult | null> => {
  try {
    const url = "https://www.nic.cu/dom_search.php";
    const formData = new URLSearchParams({ domsrch: domain });
    
    const response = await fetchTimeout(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      body: formData.toString(),
    });
    if (!response.ok) return null;
    const html = await response.text();
    return { rawText: htmlToWhoisText(html) };
  } catch {
    return null;
  }
};

// DZ - Algeria (from original project getDZ())
export const dzScraper = async (domain: string): Promise<WebScraperResult | null> => {
  try {
    const url = `https://api.nic.dz/v1/domains/${encodeURIComponent(domain)}`;
    const response = await fetchTimeout(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    if (!response.ok) return null;
    const jsonText = await response.text();
    const json = JSON.parse(jsonText);
    
    let whois = `Domain Name: ${json.domainName || ""}\n`;
    whois += `Registrar: ${json.registrar || ""}\n`;
    whois += `Creation Date: ${json.creationDate || ""}\n`;
    whois += `Registrant Organization: ${json.orgName || ""}\n`;
    whois += `Registrant Address: ${json.addressOrg || ""}\n`;
    whois += `Admin Name: ${json.contactAdm || ""}\n`;
    whois += `Admin Organization: ${json.orgNameAdm || ""}\n`;
    whois += `Admin Address: ${json.addressAdm || ""}\n`;
    whois += `Admin Phone: ${json.phoneAdm || ""}\n`;
    whois += `Admin Fax: ${json.faxAdm || ""}\n`;
    whois += `Admin Email: ${json.emailAdm || ""}\n`;
    whois += `Tech Name: ${json.contactTech || ""}\n`;
    whois += `Tech Organization: ${json.orgNameTech || ""}\n`;
    whois += `Tech Address: ${json.addressTech || ""}\n`;
    whois += `Tech Phone: ${json.phoneTech || ""}\n`;
    whois += `Tech Fax: ${json.faxTech || ""}\n`;
    whois += `Tech Email: ${json.emailTech || ""}\n`;
    
    return { rawText: whois };
  } catch {
    return null;
  }
};

// GF - French Guiana (from original project getGF())
export const gfScraper = async (domain: string): Promise<WebScraperResult | null> => {
  try {
    const parts = domain.split(".");
    const url = "https://www.dom-enic.com/whois.html";
    const formData = new URLSearchParams({
      SMq5BXJw: parts[0],
      UQWhRrMF: "." + parts[1],
    });
    
    const response = await fetchTimeout(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      body: formData.toString(),
    });
    if (!response.ok) return null;
    const html = await response.text();
    return { rawText: htmlToWhoisText(html) };
  } catch {
    return null;
  }
};

// GR - Greece (from original project getGR())
export const grScraper = async (domain: string): Promise<WebScraperResult | null> => {
  try {
    // First get CSRF token
    const getUrl = "https://grweb.ics.forth.gr/public/whois?lang=en";
    const getResponse = await fetchTimeout(getUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    if (!getResponse.ok) return null;
    const getHtml = await getResponse.text();
    
    // Extract CSRF token
    const csrfMatch = getHtml.match(/name="_csrf"[^>]*value="([^"]+)"/i);
    if (!csrfMatch) return null;
    const csrf = csrfMatch[1];
    
    // Get cookies
    const cookies = getResponse.headers.get("set-cookie") || "";
    
    // Submit query
    const postUrl = "https://grweb.ics.forth.gr/public/whois/query";
    const formData = new URLSearchParams({
      _csrf: csrf,
      domain: domain,
      Submit: "",
    });
    
    const postResponse = await fetchTimeout(postUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Cookie": cookies,
      },
      body: formData.toString(),
    });
    if (!postResponse.ok) return null;
    const postHtml = await postResponse.text();
    return { rawText: postHtml };
  } catch {
    return null;
  }
};

// GW - Guinea-Bissau (from original project getGW())
export const gwScraper = async (domain: string): Promise<WebScraperResult | null> => {
  try {
    const url = `https://registar.nic.gw/en/whois/${encodeURIComponent(domain.replace(/\./g, "-"))}/`;
    const response = await fetchTimeout(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    
    if (!response.ok) {
      // Try without the trailing slash
      const url2 = `https://registar.nic.gw/en/whois/${encodeURIComponent(domain.replace(/\./g, "-"))}`;
      const response2 = await fetchTimeout(url2, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });
      if (!response2.ok) return null;
      const html = await response2.text();
      
      // Check for 404
      if (html.includes("Domain not found") || response2.status === 404) {
        return { rawText: "Domain not found" };
      }
      
      // Parse fieldsets
      let whoisText = "";
      
      // Extract domain name from h2
      const domainMatch = html.match(/<h2>([^<]+)<\/h2>/i);
      if (domainMatch) {
        whoisText += `Domain Name: ${domainMatch[1].trim()}\n`;
      }
      
      // Extract all fieldsets
      const fieldsetRegex = /<fieldset>\s*<span>([^<]+)<\/span>([\s\S]*?)<\/fieldset>/gi;
      let fieldsetMatch;
      
      while ((fieldsetMatch = fieldsetRegex.exec(html)) !== null) {
        const section = fieldsetMatch[1].trim();
        const content = fieldsetMatch[2];
        
        whoisText += `\n${section}:\n`;
        
        // Extract label-value pairs
        const labelRegex = /<label>([^<]+):<\/label>\s*([^<]+)/gi;
        let labelMatch;
        
        while ((labelMatch = labelRegex.exec(content)) !== null) {
          const label = labelMatch[1].trim();
          let value = labelMatch[2].trim();
          
          // Handle email links
          const emailMatch = value.match(/href="mailto:([^"]+)"/i) || value.match(/<a[^>]*>([^<]+)<\/a>/i);
          if (emailMatch) {
            value = emailMatch[1] || value;
          }
          
          whoisText += `${label}: ${value}\n`;
        }
      }
      
      return whoisText.trim() ? { rawText: whoisText } : null;
    }
    
    const html = await response.text();
    
    // Check for 404
    if (html.includes("Domain not found") || response.status === 404) {
      return { rawText: "Domain not found" };
    }
    
    // Parse fieldsets
    let whoisText = "";
    
    // Extract domain name from h2
    const domainMatch = html.match(/<h2>([^<]+)<\/h2>/i);
    if (domainMatch) {
      whoisText += `Domain Name: ${domainMatch[1].trim()}\n`;
    }
    
    // Extract all fieldsets
    const fieldsetRegex = /<fieldset>\s*<span>([^<]+)<\/span>([\s\S]*?)<\/fieldset>/gi;
    let fieldsetMatch;
    
    while ((fieldsetMatch = fieldsetRegex.exec(html)) !== null) {
      const section = fieldsetMatch[1].trim();
      const content = fieldsetMatch[2];
      
      whoisText += `\n${section}:\n`;
      
      // Extract all text content from fieldset, then parse label-value pairs
      const textContent = content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      
      // Split by "Label:" pattern
      const parts = textContent.split(/([A-Za-z\s-]+):/);
      
      for (let i = 1; i < parts.length; i += 2) {
        const label = parts[i].trim();
        const value = parts[i + 1] ? parts[i + 1].trim() : "";
        if (label && value) {
          whoisText += `${label}: ${value}\n`;
        }
      }
    }
    
    return whoisText.trim() ? { rawText: whoisText } : null;
  } catch {
    return null;
  }
};

// HM - Heard Island and McDonald Islands
// .hm has no port-43 WHOIS; lookup is only available via the registry web form,
// which requires a session cookie (PHPSESSID) obtained from the homepage first
// and a Referer header on the POST (the site sits behind Cloudflare).
//
// The raw <pre> block is returned as plain text and parsed by the shared
// parseWhoisText("hm") logic — mirroring the original PHP project's getHM(),
// which only extracts the <pre> text (decoding Cloudflare-protected emails) and
// leaves field extraction to the common Parser.
export const hmScraper = async (domain: string): Promise<WebScraperResult | null> => {
  const ua =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
  try {
    // 1) GET the homepage to obtain the session cookie.
    const homeResponse = await fetchTimeout("https://www.registry.hm/", {
      method: "GET",
      headers: {
        "User-Agent": ua,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    // Collect every Set-Cookie (Node 18 exposes getSetCookie; fall back to the
    // single-value header when it is unavailable).
    const setCookies: string[] = [];
    const rawSet = (homeResponse as unknown as { headers?: { getSetCookie?: () => string[] } }).headers?.getSetCookie?.();
    if (Array.isArray(rawSet) && rawSet.length) setCookies.push(...rawSet);
    else {
      const single = homeResponse.headers.get("set-cookie");
      if (single) setCookies.push(single);
    }
    const cookies = setCookies.map((c) => c.split(";")[0]).join("; ");
    console.log(`[whois:hm] GET home ${homeResponse.status} cookies=${setCookies.length} domain=${domain}`);

    // 2) POST the query with the session cookie + Referer.
    const url = "https://www.registry.hm/HR_whois2.php";
    const body = new URLSearchParams({
      domain_name: domain,
      submit: "Check WHOIS record",
    }).toString();
    const response = await fetchTimeout(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": ua,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        Referer: "https://www.registry.hm/",
        Origin: "https://www.registry.hm",
        Cookie: cookies,
      },
      body,
    });
    console.log(`[whois:hm] POST ${response.status} type=${response.headers.get("content-type")} domain=${domain}`);
    if (!response.ok) {
      return {
        rawText: "",
        error: `registry.hm POST ${url} -> HTTP ${response.status} ${response.statusText || ""}`,
      };
    }
    const html = await response.text();

    // 3) Extract the <pre> block and normalise it to the "Key: Value" text the
    //    shared parser expects.
    const match = html.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
    console.log(`[whois:hm] pre=${!!match} htmlLen=${html.length} domain=${domain}`);
    if (!match) {
      return {
        rawText: htmlToWhoisText(html),
        error: `registry.hm returned no <pre> block (htmlLen=${html.length})`,
      };
    }

    return { rawText: cleanHmPre(match[1]) };
  } catch (e) {
    console.error(`[whois:hm] error domain=${domain}: ${e instanceof Error ? (e.stack || e.message) : String(e)}`);
    return {
      rawText: "",
      error: `hmScraper exception: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
};

/**
 * Normalise the registry.hm <pre> payload to plain "Key: Value" text: decode
 * Cloudflare-protected emails and turn <br> into newlines (the .hm WHOIS is
 * preformatted, fields separated by <br>), then strip any remaining markup.
 * Mirrors the original PHP getHM() text extraction.
 */
function cleanHmPre(html: string): string {
  const decoded = html.replace(
    /<a\b[^>]*\bdata-cfemail="([0-9a-f]+)"[^>]*>.*?<\/a>/gi,
    (_m: string, hex: string) => decodeCFEmail(hex),
  );
  return decoded.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "");
}

/** Reverse Cloudflare's data-cfemail obfuscation (XOR with the first byte). */
function decodeCFEmail(hex: string): string {
  const key = parseInt(hex.substring(0, 2), 16);
  let out = "";
  for (let i = 2; i < hex.length; i += 2) {
    out += String.fromCharCode(parseInt(hex.substring(i, i + 2), 16) ^ key);
  }
  return out;
}

// HU - Hungary (from original project getHU())
export const huScraper = async (domain: string): Promise<WebScraperResult | null> => {
  try {
    const url = `https://info.domain.hu/webwhois/en/domain/${encodeURIComponent(domain)}`;
    const response = await fetchTimeout(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    if (!response.ok) return null;
    const html = await response.text();
    return { rawText: htmlToWhoisText(html) };
  } catch {
    return null;
  }
};

// JO - Jordan (from original project getJO())
export const joScraper = async (domain: string): Promise<WebScraperResult | null> => {
  try {
    const url = "https://dns.jo/FirstPageen.aspx";
    const getResponse = await fetchTimeout(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    if (!getResponse.ok) return null;
    const cookies = getResponse.headers.get("set-cookie") || "";
    
    // This is a complex ASP.NET form, simplified version
    const html = await getResponse.text();
    return { rawText: htmlToWhoisText(html) };
  } catch {
    return null;
  }
};

// MT - Malta (from original project getMT())
export const mtScraper = async (domain: string): Promise<WebScraperResult | null> => {
  try {
    const url = `https://www.nic.org.mt/dotmt/whois/?${encodeURIComponent(domain)}`;
    const response = await fetchTimeout(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    if (!response.ok) return null;
    const html = await response.text();
    
    // Extract from <pre> tag
    const match = html.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
    if (match) {
      return { rawText: match[1] };
    }
    return { rawText: htmlToWhoisText(html) };
  } catch {
    return null;
  }
};

// NI - Nicaragua (from original project getNI())
export const niScraper = async (domain: string): Promise<WebScraperResult | null> => {
  try {
    const url = `https://apiecommercenic.uni.edu.ni/api/v1/dominios/whois?dominio=${encodeURIComponent(domain)}`;
    const response = await fetchTimeout(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    if (!response.ok) return null;
    const jsonText = await response.text();
    const json = JSON.parse(jsonText);
    
    let whois = `Domain Name: ${domain}\n`;
    if (json.datos) {
      whois += `Registry Expiry Date: ${json.datos.fechaExpiracion || ""}\n`;
      whois += `Registrant Name: ${json.datos.cliente || ""}\n`;
      whois += `Registrant Address: ${json.datos.direccion || ""}\n`;
    }
    if (json.contactos) {
      whois += `Contact Type: ${json.contactos.tipoContacto || ""}\n`;
      whois += `Contact Name: ${json.contactos.nombre || ""}\n`;
      whois += `Contact Phone: ${json.contactos.telefono || ""}\n`;
    }
    
    return { rawText: whois };
  } catch {
    return null;
  }
};

// NP - Nepal (from original project getNP())
export const npScraper = async (domain: string): Promise<WebScraperResult | null> => {
  try {
    const parts = domain.split(".");
    // First get token
    const getUrl = "https://register.com.np/whois-lookup";
    const getResponse = await fetchTimeout(getUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    if (!getResponse.ok) return null;
    const getHtml = await getResponse.text();
    
    // Extract token
    const tokenMatch = getHtml.match(/name="_token"[^>]*value="([^"]+)"/i);
    if (!tokenMatch) return null;
    const token = tokenMatch[1];
    const cookies = getResponse.headers.get("set-cookie") || "";
    
    // Submit query
    const postUrl = "https://register.com.np/checkdomain_whois";
    const formData = new URLSearchParams({
      _token: token,
      domainName: parts[0],
      domainExtension: "." + parts[1],
    });
    
    const postResponse = await fetchTimeout(postUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Cookie": cookies,
      },
      body: formData.toString(),
    });
    if (!postResponse.ok) return null;
    const postHtml = await postResponse.text();
    return { rawText: postHtml };
  } catch {
    return null;
  }
};

// PA - Panama (from original project getPA())
export const paScraper = async (domain: string): Promise<WebScraperResult | null> => {
  try {
    const url = `https://nic.pa:8080/whois/${encodeURIComponent(domain)}`;
    const response = await fetchTimeout(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    if (!response.ok) return null;
    const jsonText = await response.text();
    const json = JSON.parse(jsonText);
    
    let whois = "";
    if (json.payload) {
      whois += `Domain Name: ${json.payload.Dominio || ""}\n`;
      whois += `Updated Date: ${json.payload.fecha_actualizacion || ""}\n`;
      whois += `Creation Date: ${json.payload.fecha_creacion || ""}\n`;
      whois += `Registry Expiry Date: ${json.payload.fecha_expiracion || ""}\n`;
      whois += `Domain Status: ${json.payload.Estatus || ""}\n`;
      
      if (json.payload.NS) {
        for (const ns of json.payload.NS) {
          whois += `Name Server: ${ns}\n`;
        }
      }
    }
    
    return { rawText: whois };
  } catch {
    return null;
  }
};

// PH - Philippines (from original project getPH())
export const phScraper = async (domain: string): Promise<WebScraperResult | null> => {
  try {
    const url = `https://whois.dot.ph/?search=${encodeURIComponent(domain)}`;
    const response = await fetchTimeout(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    if (!response.ok) return null;
    const html = await response.text();
    
    // Extract from <pre> tag
    const match = html.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
    if (match) {
      return { rawText: match[1] };
    }
    return { rawText: htmlToWhoisText(html) };
  } catch {
    return null;
  }
};

// SV - El Salvador (from original project getSV())
export const svScraper = async (domain: string): Promise<WebScraperResult | null> => {
  try {
    const parts = domain.split(".");
    const url = "https://svnet.sv/accion/procesos.php";
    const formData = new URLSearchParams({
      key: "Buscar",
      nombre: parts[0],
    });
    
    const response = await fetchTimeout(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      body: formData.toString(),
    });
    if (!response.ok) return null;
    const html = await response.text();
    return { rawText: htmlToWhoisText(html) };
  } catch {
    return null;
  }
};

// TJ - Tajikistan (from original project getTJ())
export const tjScraper = async (domain: string): Promise<WebScraperResult | null> => {
  try {
    const shortDomain = domain.replace(/\.[^.]+$/, "");
    const url = `http://www.nic.tj/cgi/whois2?domain=${encodeURIComponent(shortDomain)}`;
    const response = await fetchTimeout(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    if (!response.ok) return null;
    const html = await response.text();
    return { rawText: htmlToWhoisText(html) };
  } catch {
    return null;
  }
};

// TT - Trinidad and Tobago (from original project getTT())
// The result is rendered as an HTML table; mirror the original getTT() which
// reads each 2-cell <tr> and emits "Key: Value" lines so the shared
// parseWhoisText("tt") rules (which expect a colon after the label) can apply.
export const ttScraper = async (domain: string): Promise<WebScraperResult | null> => {
  const ua =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
  try {
    const url = "https://nic.tt/cgi-bin/search.pl";
    const body = new URLSearchParams({ name: domain, Search: "Search" }).toString();
    const response = await fetchTimeout(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": ua,
      },
      body,
    });
    console.log(`[whois:tt] POST ${response.status} domain=${domain}`);
    if (!response.ok) {
      return { rawText: "", error: `nic.tt POST ${url} -> HTTP ${response.status}` };
    }
    const html = await response.text();

    // Mirror getTT(): strip &nbsp then read each 2-cell <tr> as "Key: Value".
    const { document } = parseHTML(html.replace(/&nbsp/g, " "));

    const trs = Array.from(document.querySelectorAll("tr"));
    const rows = trs.filter((tr) => tr.querySelectorAll("td").length === 2);

    if (rows.length === 0) {
      // No result table -> the page shows a plain message
      // (e.g. "This Domain Name is available.") inside div.main.
      const main = document.querySelector("div.main");
      const text = (main?.textContent || document.body?.textContent || "").trim();
      return { rawText: text };
    }

    let whois = "";
    for (const tr of rows) {
      const tds = tr.querySelectorAll("td");
      const key = (tds[0].textContent || "").trim();
      const value = (tds[1].textContent || "").trim();
      if (key) whois += `${key}: ${value}\n`;
    }
    whois = whois.replace(/ \(owner can view under Retrieve->Domain Details\)/g, "");

    return { rawText: whois };
  } catch (e) {
    console.error(`[whois:tt] error domain=${domain}: ${e instanceof Error ? (e.stack || e.message) : String(e)}`);
    return { rawText: "", error: `ttScraper exception: ${e instanceof Error ? e.message : String(e)}` };
  }
};

// VN - Vietnam (from original project getVN())
export const vnScraper = async (domain: string): Promise<WebScraperResult | null> => {
  try {
    const url = `https://whois.inet.vn/whois?domain=${encodeURIComponent(domain)}`;
    const headResponse = await fetchTimeout(url, {
      method: "HEAD",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    const cookies = headResponse.headers.get("set-cookie") || "";
    
    const apiUrl = `https://whois.inet.vn/api/whois/domainspecify/${encodeURIComponent(domain)}`;
    const response = await fetchTimeout(apiUrl, {
      headers: {
        "X-Requested-With": "XMLHttpRequest",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Cookie": cookies,
      },
    });
    if (!response.ok) return null;
    const jsonText = await response.text();
    const json = JSON.parse(jsonText);
    
    let whois = "";
    if (json.availability === "available") {
      whois += "The domain name has not been registered\n";
    } else if (json.availability === "notavailable") {
      whois += `The domain ${domain} cannot be registered\n`;
      if (json.message) {
        whois += `${json.message}\n`;
      }
    }
    
    if (json.code === "0") {
      whois += `Domain Name: ${json.domainName || ""}\n`;
      whois += `Registrar: ${json.registrar || ""}\n`;
      whois += `Creation Date: ${json.creationDate || ""}\n`;
      whois += `Registry Expiry Date: ${json.expirationDate || ""}\n`;
      
      if (json.status) {
        for (const status of json.status) {
          whois += `Domain Status: ${status}\n`;
        }
      }
      
      if (json.nameServer) {
        for (const ns of json.nameServer) {
          whois += `Name Server: ${ns}\n`;
        }
      }
      
      whois += `Registrant Name: ${json.registrantName || ""}\n`;
      whois += `DNSSEC: ${json.DNSSEC || ""}\n`;
    }
    
    return { rawText: whois };
  } catch {
    return null;
  }
};

// AO - Angola (from original project WHOISWeb.php getAO())
export const aoScraper = async (_domain: string): Promise<WebScraperResult | null> => {
  try {
    return { rawText: "Please visit https://www.dns.ao/ao/whois/" };
  } catch {
    return null;
  }
};

// AZ - Azerbaijan (from original project getAZ())
export const azScraper = async (_domain: string): Promise<WebScraperResult | null> => {
  try {
    return { rawText: "Please visit https://whois.az" };
  } catch {
    return null;
  }
};

// BA - Bosnia and Herzegovina (from original project getBA())
export const baScraper = async (_domain: string): Promise<WebScraperResult | null> => {
  try {
    return { rawText: "Please visit https://nic.ba/?culture=en" };
  } catch {
    return null;
  }
};

// CY - Cyprus (from original project getCY())
export const cyScraper = async (_domain: string): Promise<WebScraperResult | null> => {
  try {
    return { rawText: "Please visit https://registry.nic.cy/cy-ui/home" };
  } catch {
    return null;
  }
};

// DJ - Djibouti (from original project getDJ())
export const djScraper = async (_domain: string): Promise<WebScraperResult | null> => {
  try {
    return { rawText: "Please visit https://dot.dj" };
  } catch {
    return null;
  }
};

// GQ - Equatorial Guinea (from original project getGQ())
export const gqScraper = async (_domain: string): Promise<WebScraperResult | null> => {
  try {
    return { rawText: "Please visit http://www.dominio.gq/en/whois.html" };
  } catch {
    return null;
  }
};

// PY - Paraguay (from original project getPY())
export const pyScraper = async (_domain: string): Promise<WebScraperResult | null> => {
  try {
    return { rawText: "Please visit https://www.nic.py/consultdompy.php" };
  } catch {
    return null;
  }
};

// GM - Gambia (from original project getGM())
export const gmScraper = async (domain: string): Promise<WebScraperResult | null> => {
  try {
    const parts = domain.split(".");
    const headUrl = `https://www.nic.gm/NIC2/scripts/checkdom.aspx?dname=${encodeURIComponent(parts[0])}`;
    const headResponse = await fetchTimeout(headUrl, { method: "HEAD", redirect: "manual" });
    const location = headResponse.headers.get("location") || "";

    let whois = "";
    if (location.includes("/NIC2/whois-available.html")) {
      whois += `No match for "${domain}".\n`;
    } else if (
      location.includes("/NIC2/whois-reserved.html") ||
      location.includes("/NIC2/whois-numbers.html")
    ) {
      whois += "This name is reserved by the registry.\n";
    } else if (location.includes("/NIC2/whois-details.html")) {
      const detailUrl = `https://www.nic.gm/NIC2/REG/login.aspx?whois=${encodeURIComponent(parts[0])}`;
      const detailResponse = await fetchTimeout(detailUrl);
      const body = await detailResponse.text();
      const array = body.split(";");

      whois += `Domain Name: ${domain}\n`;
      whois += `Registrar: ${array[2] || ""}\n`;
      whois += `Creation Date: ${array[11] || ""}\n`;
      whois += `Registrant Name: ${array[1] || ""}\n`;
      whois += `Admin Name: ${array[3] || ""}\n`;
      whois += `Admin Organization: ${array[4] || ""}\n`;
      whois += `Tech Name: ${array[5] || ""}\n`;
      whois += `Tech Organization: ${array[6] || ""}\n`;
      whois += `Name Server: ${array[7] || ""}\n`;
      whois += `Name Server: ${array[8] || ""}\n`;
      whois += `Name Server: ${array[9] || ""}\n`;
      whois += `Name Server: ${array[10] || ""}\n`;
    }

    if (whois) {
      const motdResponse = await fetchTimeout("https://www.nic.gm/NIC2/motd.txt");
      const motd = await motdResponse.text();
      if (motd) {
        whois += `>>> Last update of whois database: ${motd.trim()} <<<`;
      }
    }

    return whois.trim() ? { rawText: whois } : null;
  } catch {
    return null;
  }
};

// LK - Sri Lanka (from original project getLK())
export const lkScraper = async (domain: string): Promise<WebScraperResult | null> => {
  try {
    const url = `https://register.domains.lk/proxy/domains/single-search?keyword=${encodeURIComponent(domain)}`;
    const response = await fetchTimeout(url);
    if (!response.ok) return null;
    const json: any = await response.json();

    const availability = json?.result?.domainAvailability;
    if (!availability) return null;

    let message = availability.message || "";
    if (message === "Domain name you searched is restricted") {
      message = "Domain name is restricted";
    }

    let whois = `Message: ${message}\n`;
    whois += `Domain Name: ${availability.domainName || ""}\n`;

    const domainInfo = availability.domainInfo;
    if (domainInfo) {
      const expireDate = parseLKDate(domainInfo.expireDate || "");
      whois += `Registry Expiry Date: ${expireDate}\n`;
      whois += `Registrant Name: ${domainInfo.registeredTo || ""}\n`;
    }

    return { rawText: whois };
  } catch {
    return null;
  }
};

// NR - Nauru (from original project getNR())
export const nrScraper = async (domain: string): Promise<WebScraperResult | null> => {
  try {
    const parts = domain.split(".");
    const params = new URLSearchParams({
      subdomain: parts[0],
      tld: parts[1] || "",
      whois: "Submit",
    });
    const url = `https://www.cenpac.net.nr/dns/whois.html?${params.toString()}`;
    const response = await fetchTimeout(url);
    if (!response.ok) return null;
    const html = await response.text();

    // The WHOIS body sits after the query <form>; strip HTML to text.
    const formEnd = html.toLowerCase().lastIndexOf("</form>");
    const body = formEnd >= 0 ? html.slice(formEnd + 6) : html;
    const text = htmlToWhoisText(body);
    return text ? { rawText: text } : null;
  } catch {
    return null;
  }
};

function parseLKDate(input: string): string {
  const match = input.match(/(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\s*,?\s*(\d{4})/);
  if (!match) return "";
  const months: Record<string, string> = {
    january: "01", february: "02", march: "03", april: "04", may: "05", june: "06",
    july: "07", august: "08", september: "09", october: "10", november: "11", december: "12",
  };
  const month = months[match[2].toLowerCase()];
  if (!month) return "";
  return `${match[3]}-${month}-${match[1].padStart(2, "0")}`;
}

// Generic web scraper for other TLDs. Honors per-TLD cookie config from
// tld-web.json: a static `cookie` string, or `captureCookie` to grab the
// registry's Set-Cookie on a pre-flight request and replay it (same idea as
// the hand-written gr/hm/jo/np/vn scrapers).
export const genericScraper = async (
  tld: string,
  domain: string,
  opts?: { cookie?: string; captureCookie?: boolean },
): Promise<WebScraperResult | null> => {
  // "com.hk" is a public suffix, but its registry lives under "hk".
  const base = tld.split(".").pop() || tld;
  const urls = [
    `https://whois.${base}/${encodeURIComponent(domain)}`,
    `https://www.nic.${base}/whois?domain=${encodeURIComponent(domain)}`,
    `https://whois.nic.${base}/lookup?domain=${encodeURIComponent(domain)}`,
  ];

  for (const url of urls) {
    try {
      let cookieHeader: string | undefined = opts?.cookie;

      // Dynamic replay: fire a pre-flight GET to capture the registry cookie,
      // then send it back on the real request.
      if (opts?.captureCookie && !cookieHeader) {
        const pre = await fetchTimeout(url, {
          headers: {
            "User-Agent": UA,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          },
        });
        const setCookie = pre.headers.get("set-cookie");
        if (setCookie) cookieHeader = setCookie;
        console.log(`[whois:generic] preflight ${pre.status} setCookie=${setCookie ? "yes" : "no"} tld=${tld} url=${url}`);
      }

      const headers: Record<string, string> = {
        "User-Agent": UA,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      };
      if (cookieHeader) headers["Cookie"] = cookieHeader;

      const response = await fetchTimeout(url, { headers });
      console.log(`[whois:generic] ${response.status} tld=${tld} url=${url}`);
      if (response.ok) {
        const html = await response.text();
        console.log(`[whois:generic] got htmlLen=${html.length} tld=${tld}`);
        return { rawText: htmlToWhoisText(html) };
      }
    } catch (e) {
      console.error(`[whois:generic] error tld=${tld} url=${url}: ${e instanceof Error ? (e.stack || e.message) : String(e)}`);
      continue;
    }
  }
  console.log(`[whois:generic] no source ok tld=${tld} domain=${domain}`);
  return null;
};
