import { parseHTML } from "linkedom";
import {
  type WhoisResult,
  createEmpty,
  finalizeWhoisResult,
} from "../parser";
import { parseRegistryDate } from "../tld-date";

const NBSP = " ";

// Collapse newlines + runs of spaces, mirroring PHP's
//   preg_replace(["/\n/", "/ +/"], ["", " "], $text)
// &nbsp; is normalised up front because linkedom keeps U+00A0 in textContent,
// whereas the PHP version pre-replaces "&nbsp;" with " " before parsing.
function clean(s: string): string {
  return s
    .replace(new RegExp(NBSP, "g"), " ")
    .replace(/\n/g, "")
    .replace(/ +/g, " ")
    .trim();
}

// Convert the registry's "YYYY-Mon-DD HH:MM:SS" stamp to ISO-8601.
//
// The registry writes local Guatemala time, which is exactly what the shared
// per-extension rules say (tld-date.ts, generated from PHP's
// `ParserGT::$timezone`), so the conversion is delegated to them rather than
// being duplicated here.
function gtDateToISO(s: string): string | null {
  return parseRegistryDate(s, "gt");
}

export interface GtParseResult {
  rawText: string;
  /** Structured fields when the domain is registered; absent for not-found / error. */
  data?: WhoisResult;
}

/**
 * Parse the Guatemala (.gt) registry whois HTML page.
 *
 * Ported 1:1 from the original PHP project WHOISWeb.php::getGT().
 *
 * The page is built from two `div.caja.caja-whois` boxes:
 *  - Box 0: domain name + status (alert-success > h3), expiration
 *    (form-stack > strong), entitled organisation / servers
 *    (alert-info > h4, form-stack / form-field / li).
 *  - Box 1: administrative / technical contacts (form-stack > h4, form-field).
 *
 * An unregistered / error domain instead shows a single `div.caja.caja-message`
 * box, whose text is returned verbatim (the caller decides registered vs unknown).
 *
 * Besides the human-readable `rawText`, a structured `WhoisResult` is produced so
 * the unified frontend renderer shows the same rich cards as RDAP / WHOIS.
 */
export function parseGtHtml(html: string): GtParseResult | null {
  const doc = parseHTML(html).document;

  // Not-found / error message box: //div[@class="caja caja-message"]
  const message = doc.querySelector("div.caja.caja-message");
  if (message) {
    const msg = clean(message.textContent ?? "").replace(/ {2,}/g, " ");
    return msg ? { rawText: msg } : null;
  }

  // whois boxes: //div[@class="caja caja-whois"]
  const boxes = Array.from(doc.querySelectorAll("div.caja.caja-whois")) as any[];
  if (boxes.length !== 2) return null;

  const lines: string[] = [];
  const data = createEmpty();
  data.registered = true;

  let orgName = "";
  let captureOrg = false;
  const nameServers: string[] = [];

  // Box 0 — domain + status, expiration, entitled organisation, servers
  // (linkedom reports uppercase nodeName for elements, so match on nodeType===1)
  for (const child of Array.from(boxes[0].childNodes) as any[]) {
    if (child.nodeType !== 1) continue;
    const cls = (child.getAttribute?.("class") ?? "").trim();

    if (cls === "alert alert-success") {
      const h3 = child.querySelector("h3");
      if (h3) {
        const kids = Array.from(h3.childNodes) as any[];
        const nameNode = kids[0];
        if (nameNode) {
          const dn = clean(nameNode.textContent ?? "").replace(/[ .\n]+$/, "");
          data.domain = dn.toLowerCase();
          lines.push("Domain Name: " + dn);
        }
        const statusNode = kids[1];
        if (statusNode) {
          const st = clean(statusNode.textContent ?? "");
          data.status = [{ text: st, url: "" }];
          lines.push("Domain Status: " + st);
        }
      }
    } else if (cls === "alert alert-info") {
      const title = clean(child.textContent ?? "");
      lines.push("");
      lines.push(title + ":");
      if (title === "Entitled Organization") captureOrg = true;
    } else if (cls === "form-stack") {
      const strong = child.querySelector("strong");
      if (strong) {
        const exp = clean(strong.textContent ?? "");
        lines.push(exp);
        const expVal = exp.replace(/^Expiration:?/i, "").trim();
        data.expirationDate = expVal;
        data.expirationDateISO8601 = gtDateToISO(expVal);
      } else {
        for (const field of Array.from(child.querySelectorAll("div.form-field")) as any[]) {
          lines.push("  " + clean(field.textContent ?? ""));
          if (captureOrg && !orgName) orgName = clean(field.textContent ?? "");
        }
        captureOrg = false;
      }
    } else if (cls === "form-field") {
      for (const li of Array.from(child.querySelectorAll("li")) as any[]) {
        const v = clean(li.textContent ?? "");
        lines.push("  " + v);
        if (v) nameServers.push(v);
      }
    }
  }

  // Box 1 — administrative / technical contacts (raw text only)
  for (const child of Array.from(boxes[1].childNodes) as any[]) {
    if (child.nodeType !== 1) continue;
    const h4 = child.querySelector("h4");
    if (h4) {
      lines.push("");
      lines.push(clean(h4.textContent ?? "") + ":");
    }
    for (const field of Array.from(child.querySelectorAll("div.form-field")) as any[]) {
      lines.push("  " + clean(field.textContent ?? ""));
    }
  }

  if (orgName) data.registrar = orgName;
  if (nameServers.length) data.nameServers = nameServers;

  const rawText = lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  return { rawText, data: finalizeWhoisResult(data) };
}
