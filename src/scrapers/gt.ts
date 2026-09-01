import { parseHTML } from "linkedom";
import {
  type WhoisResult,
  createEmpty,
  toISO8601,
  finalizeWhoisResult,
} from "../parser";

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

const MONTHS: Record<string, string> = {
  Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
  Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
};

// The registry prints local Guatemala time. Mirrors PHP's
// `ParserGT::$timezone = "America/Guatemala"` (UTC-6, no DST), which
// Parser.php applies to the stamp before converting it to UTC.
const GT_UTC_OFFSET_HOURS = -6;

// Parse the registry's "YYYY-Mon-DD HH:MM:SS" (or date-only) stamp into ISO-8601.
function gtDateToISO(s: string): string | null {
  const m = s.trim().match(/^(\d{4})-([A-Za-z]{3})-(\d{2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (!m) return toISO8601(s);
  const [, y, mon, d, hh, mm, ss] = m;
  const mo = MONTHS[mon.charAt(0).toUpperCase() + mon.slice(1).toLowerCase()] ?? "01";
  const date = `${y}-${mo}-${d}`;
  if (hh && mm) {
    const time = ss ? `${hh.padStart(2, "0")}:${mm}:${ss}` : `${hh.padStart(2, "0")}:${mm}:00`;
    // Read as if UTC first, then shift into real UTC: utc = local - offset.
    const local = new Date(`${date}T${time}Z`);
    if (isNaN(local.getTime())) return toISO8601(s);
    const utc = new Date(local.getTime() - GT_UTC_OFFSET_HOURS * 3600000);
    return utc.toISOString().replace(/\.\d{3}Z$/, "Z");
  }
  return date;
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
