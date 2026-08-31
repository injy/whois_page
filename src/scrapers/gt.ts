import { parseHTML } from "linkedom";

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
 * box, whose text is returned verbatim.
 *
 * Returns the formatted whois text, or null when nothing meaningful is found.
 */
export function parseGtHtml(html: string): string | null {
  const doc = parseHTML(html).document;

  // Not-found / error message box: //div[@class="caja caja-message"]
  const message = doc.querySelector("div.caja.caja-message");
  if (message) {
    const msg = clean(message.textContent ?? "").replace(/ {2,}/g, " ");
    return msg || null;
  }

  // whois boxes: //div[@class="caja caja-whois"]
  const boxes = Array.from(doc.querySelectorAll("div.caja.caja-whois")) as any[];
  if (boxes.length !== 2) return null;

  const lines: string[] = [];

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
          lines.push("Domain Name: " + clean(nameNode.textContent ?? "").replace(/[ .\n]+$/, ""));
        }
        const statusNode = kids[1];
        if (statusNode) {
          lines.push("Domain Status: " + clean(statusNode.textContent ?? ""));
        }
      }
    } else if (cls === "alert alert-info") {
      lines.push("");
      lines.push(clean(child.textContent ?? "") + ":");
    } else if (cls === "form-stack") {
      const strong = child.querySelector("strong");
      if (strong) {
        lines.push(clean(strong.textContent ?? ""));
      } else {
        for (const field of Array.from(child.querySelectorAll("div.form-field")) as any[]) {
          lines.push("  " + clean(field.textContent ?? ""));
        }
      }
    } else if (cls === "form-field") {
      for (const li of Array.from(child.querySelectorAll("li")) as any[]) {
        lines.push("  " + clean(li.textContent ?? ""));
      }
    }
  }

  // Box 1 — administrative / technical contacts
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

  const whois = lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  return whois || null;
}
