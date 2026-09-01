import type { WhoisResult } from "./parser";
import { parseRegistryDate } from "./tld-date";
import {
  getTldParseConfig,
  BASE_PATTERNS,
  type TldField,
  type TldParseConfig,
} from "./data/tld-parse-config";

/**
 * Per-extension WHOIS/web text parser.
 *
 * Every rule (the regex used for a field, and how the matched text becomes a
 * value) comes from the original PHP project and lives in tld-parse-config.ts,
 * which is generated from the 81 Parser subclasses. This module only implements
 * the extraction mechanics; a field with no override here falls back to the
 * base behaviour that the PHP base Parser defines.
 */

function pat(field: TldField, cfg?: TldParseConfig): RegExp {
  const p = cfg?.patterns?.[field] ?? BASE_PATTERNS[field];
  return new RegExp(p.source, p.flags);
}

function firstGroup(data: string, re: RegExp): string {
  const m = data.match(re);
  return m ? m[1].trim() : "";
}

function allGroups(data: string, re: RegExp): string[] {
  const out: string[] = [];
  const g = new RegExp(re.source, "gim");
  let m: RegExpExecArray | null;
  while ((m = g.exec(data)) !== null) {
    const v = m[1].trim();
    if (v && !out.includes(v)) out.push(v);
  }
  return out;
}

const STATUS_URL_RE = /^(.+)\s+(?:(https?:\/\/\S+)|\((https?:\/\/[^\s)]+)\))/i;

/** Base getStatus(): every status line, splitting a trailing link. */
function baseStatus(data: string, cfg?: TldParseConfig): Array<{ text: string; url: string }> {
  return allGroups(data, pat("status", cfg)).map((text) => {
    const urlMatch = text.match(STATUS_URL_RE);
    if (urlMatch) return { text: urlMatch[1].trim(), url: urlMatch[2] || urlMatch[3] };
    return { text, url: "" };
  });
}

function extractNameServers(data: string, cfg?: TldParseConfig): string[] {
  const re = pat("nameServers", cfg);
  const ns = cfg?.ns;

  if (!ns) {
    return allGroups(data, re).map((v) => v.split(/[\t ]+/)[0].toLowerCase());
  }

  if (ns.mode === "tn") {
    const block = data.match(/dns servers(.+?)(?=\n\n)/is);
    if (!block) return [];
    return allGroups(block[1], re).map((v) => v.split(/[\t ]+/)[0].toLowerCase());
  }

  // getNameServersFromExplode($sep, $subSep): take the FIRST "Name Server:" line,
  // split its value by $sep, then by $subSep for the host name.
  const val = firstGroup(data, re);
  if (!val) return [];
  const lines = val.split(ns.sep).map((s) => s.trim()).filter(Boolean);
  const unique = [...new Set(lines)];
  return unique.map((p) => p.split(ns.subSep ?? " ")[0].toLowerCase());
}

function extractStatus(data: string, cfg?: TldParseConfig): Array<{ text: string; url: string }> {
  const re = pat("status", cfg);
  const st = cfg?.status;

  if (!st) return baseStatus(data, cfg);

  if (st.mode === "explode") {
    const val = firstGroup(data, re);
    if (!val) return [];
    const lines = val.split(st.sep).map((s) => s.trim()).filter(Boolean);
    const unique = [...new Set(lines)];
    return unique.map((p) => ({
      text: st.subSep ? p.split(st.subSep)[0].trim() : p,
      url: "",
    }));
  }

  if (st.mode === "bo" || st.mode === "fr" || st.mode === "ua") {
    let sub = "";
    if (st.mode === "bo") {
      const m = data.match(/other data(.+)/is);
      sub = m ? m[1] : "";
    } else if (st.mode === "fr") {
      const m = data.match(/^(.+?)source:/is);
      sub = m ? m[1] : "";
    } else {
      const m = data.match(/^(.+)% registrar:/is);
      sub = m ? m[1] : "";
    }
    return baseStatus(sub, cfg);
  }

  if (st.mode === "jp") {
    // SLD statuses carry a "(yyyy-mm-dd)" suffix that must be dropped.
    return allGroups(data, re).map((p) => ({ text: p.split("(")[0].trim(), url: "" }));
  }

  if (st.mode === "qa") {
    return allGroups(data, re).map((p) => ({ text: p.split(/[ \t]+/)[0], url: "" }));
  }

  if (st.mode === "lu") {
    const val = firstGroup(data, re);
    if (!val) return [];
    const out: Array<{ text: string; url: string }> = [];
    const m = val.match(/^(.+?)(?: \(.+\))?$/);
    if (m) {
      out.push({ text: m[1].trim(), url: "" });
      if (m[2]) out.push({ text: m[2].trim(), url: "" });
    }
    return out;
  }

  return [];
}

function extractUpdatedDate(data: string, cfg?: TldParseConfig): string {
  const mode = cfg?.updatedDate;
  if (mode === "none") return "";
  if (mode === "last") {
    const all = allGroups(data, pat("updatedDate", cfg));
    return all.length ? all[all.length - 1] : "";
  }
  if (mode === "beforeContact") {
    const m = data.match(/^(.+?)contact:/is);
    const sub = m ? m[1] : data;
    return firstGroup(sub, pat("updatedDate", cfg));
  }
  return firstGroup(data, pat("updatedDate", cfg));
}

function extractAvailableDate(data: string, cfg?: TldParseConfig): string {
  if (cfg?.availableDate === "none") return "";
  return firstGroup(data, pat("availableDate", cfg));
}

function isUnregistered(data: string, cfg?: TldParseConfig): boolean {
  if (cfg?.unregistered === "bb") {
    return data.includes('ERROR: Can\'t open file "/home/whois/static/update.txt');
  }
  if (cfg?.unregistered === "cu") {
    return data.startsWith("Existe(n) 0 dominio(s)");
  }
  return pat("unregistered", cfg).test(data);
}

function isReserved(data: string, cfg?: TldParseConfig): boolean {
  return pat("reserved", cfg).test(data);
}

function extractDnssec(data: string, cfg?: TldParseConfig): boolean | null {
  if (cfg?.dnssec === "zoneSignedDs") {
    return /dns servers \(zone signed, \d ds records?\)/i.test(data);
  }
  // Mirrors PHP getDNSSECSigned: a matched "DNSSEC:" line with a non-empty
  // value returns true/false by membership, empty value falls through.
  const m = data.match(pat("dnssec", cfg));
  if (m) {
    const value = m[1].trim();
    if (value) return DNSSEC_SIGNED_VALUES.includes(value.toLowerCase());
  }
  const extra = firstGroup(data, pat("dnssecExtra", cfg));
  if (extra) return !!extra.trim();
  return null;
}

const DNSSEC_SIGNED_VALUES = [
  "signeddelegation", "signed", "yes", "active", "signed delegation", "true",
];

const STATUS_MAP: Record<string, { aliases: string[]; fragment: string }> = {
  Active: { aliases: ["active", "actif", "activo"], fragment: "ok" },
  "Add Period": { aliases: ["addperiod"], fragment: "addPeriod" },
  "Auto Renew Period": { aliases: ["autorenewperiod"], fragment: "autoRenewPeriod" },
  "Client Delete Prohibited": { aliases: ["clientdeleteprohibited"], fragment: "clientDeleteProhibited" },
  "Client Hold": { aliases: ["clienthold"], fragment: "clientHold" },
  "Client Renew Prohibited": { aliases: ["clientrenewprohibited"], fragment: "clientRenewProhibited" },
  "Client Transfer Prohibited": { aliases: ["clienttransferprohibited"], fragment: "clientTransferProhibited" },
  "Client Update Prohibited": { aliases: ["clientupdateprohibited"], fragment: "clientUpdateProhibited" },
  Inactive: { aliases: ["inactive", "deactivated"], fragment: "inactive" },
  OK: { aliases: ["ok"], fragment: "ok" },
  "Pending Create": { aliases: ["pendingcreate"], fragment: "pendingCreate" },
  "Pending Delete": { aliases: ["pendingdelete", "tobedeleted"], fragment: "pendingDelete" },
  "Pending Renew": { aliases: ["pendingrenew"], fragment: "pendingRenew" },
  "Pending Restore": { aliases: ["pendingrestore"], fragment: "pendingRestore" },
  "Pending Transfer": { aliases: ["pendingtransfer"], fragment: "pendingTransfer" },
  "Pending Update": { aliases: ["pendingupdate"], fragment: "pendingUpdate" },
  "Redemption Period": { aliases: ["redemptionperiod"], fragment: "redemptionPeriod" },
  "Renew Period": { aliases: ["renewperiod"], fragment: "renewPeriod" },
  "Server Delete Prohibited": { aliases: ["serverdeleteprohibited"], fragment: "serverDeleteProhibited" },
  "Server Hold": { aliases: ["serverhold", "onhold", "suspended", "dnshold", "hold"], fragment: "serverHold" },
  "Server Renew Prohibited": { aliases: ["serverrenewprohibited"], fragment: "serverRenewProhibited" },
  "Server Transfer Prohibited": { aliases: ["servertransferprohibited", "transferlocked", "transferprohibited"], fragment: "serverTransferProhibited" },
  "Server Update Prohibited": { aliases: ["serverupdateprohibited", "updateprohibited"], fragment: "serverUpdateProhibited" },
  "Transfer Period": { aliases: ["transferperiod"], fragment: "transferPeriod" },
};

const aliasToCanonical: Record<string, string> = {};
for (const [canonical, { aliases }] of Object.entries(STATUS_MAP)) {
  for (const alias of aliases) aliasToCanonical[alias] = canonical;
}

/**
 * Parse a WHOIS response (or the "Key: Value" text a web scraper produced).
 *
 * `extension` selects the registry's rules: many registries print local time
 * and/or a non-ISO date format, and a few refine how the text is split into
 * values. Omitting it keeps the neutral base behaviour.
 */
export function parseWhoisText(data: string, extension?: string): WhoisResult {
  const result = createEmpty();
  if (!data) { result.unknown = true; return result; }

  const cfg = extension ? getTldParseConfig(extension) : undefined;

  if (isReserved(data, cfg)) { result.reserved = true; return result; }

  if (isUnregistered(data, cfg)) { return result; }

  result.registered = true;
  result.domain = firstGroup(data, pat("domain", cfg)).toLowerCase().split(" ")[0] || "";

  result.registryWebsite = firstGroup(data, pat("registryWebsite", cfg));
  result.registryWHOISServer = firstGroup(data, pat("registryWHOISServer", cfg));

  const registrar = firstGroup(data, pat("registrar", cfg));
  const registrarUrlMatch = registrar.match(/(.+)\(( *https?:\/\/.+)\)/i);
  if (registrarUrlMatch) {
    result.registrar = registrarUrlMatch[1].trim();
    result.registrarURL = registrarUrlMatch[2].trim();
  } else {
    result.registrar = registrar;
  }

  result.registrarURL = result.registrarURL || formatURL(firstGroup(data, pat("registrarURL", cfg)));
  const ianaId = firstGroup(data, pat("registrarIANAId", cfg));
  if (/^\d+$/.test(ianaId)) result.registrarIANAId = ianaId;
  result.registrarWHOISServer = firstGroup(data, pat("registrarWHOISServer", cfg));

  result.creationDate = firstGroup(data, pat("creationDate", cfg));
  result.creationDateISO8601 = parseRegistryDate(result.creationDate, extension);
  result.expirationDate = firstGroup(data, pat("expirationDate", cfg));
  result.expirationDateISO8601 = parseRegistryDate(result.expirationDate, extension);
  result.updatedDate = extractUpdatedDate(data, cfg);
  result.updatedDateISO8601 = parseRegistryDate(result.updatedDate, extension);
  result.availableDate = extractAvailableDate(data, cfg);
  result.availableDateISO8601 = parseRegistryDate(result.availableDate, extension);

  result.status = extractStatus(data, cfg);
  formatStatus(result.status);

  result.nameServers = extractNameServers(data, cfg);

  result.dnssecSigned = extractDnssec(data, cfg);

  result.createdAgo = dateDiffText(result.creationDateISO8601, "now");
  result.createdAgoSeconds = dateDiffSeconds(result.creationDateISO8601, "now");
  result.expiresIn = dateDiffText("now", result.expirationDateISO8601);
  result.expiresInSeconds = dateDiffSeconds("now", result.expirationDateISO8601);
  result.updatedAgo = dateDiffText(result.updatedDateISO8601, "now");
  result.updatedAgoSeconds = dateDiffSeconds(result.updatedDateISO8601, "now");

  const GRACE = ["Auto Renew Period"];
  const REDEMPTION = ["Redemption Period"];
  const PENDING_DEL = ["Pending Delete"];
  const HOLD = ["Client Hold", "Server Hold"];
  const INACTIVE_T = ["Inactive"];

  result.gracePeriod = hasAnyStatusText(result.status, GRACE);
  result.redemptionPeriod = hasAnyStatusText(result.status, REDEMPTION);
  result.pendingDelete = hasAnyStatusText(result.status, PENDING_DEL);
  result.hold = hasAnyStatusText(result.status, HOLD);
  result.inactive = hasAnyStatusText(result.status, INACTIVE_T);

  result.unknown = isUnknown(result);
  if (result.unknown) result.registered = false;

  return result;
}

function createEmpty(): WhoisResult {
  return {
    unknown: false, reserved: false, registered: false, domain: "",
    registryWebsite: "", registryWHOISServer: "", registryRDAPServer: "",
    registrar: "", registrarURL: "", registrarIANAId: "",
    registrarWHOISServer: "", registrarRDAPServer: "",
    creationDate: "", creationDateISO8601: null,
    expirationDate: "", expirationDateISO8601: null,
    updatedDate: "", updatedDateISO8601: null,
    availableDate: "", availableDateISO8601: null,
    status: [], nameServers: [], dnssecSigned: null,
    createdAgo: "", createdAgoSeconds: null,
    expiresIn: "", expiresInSeconds: null,
    updatedAgo: "", updatedAgoSeconds: null,
    availableIn: "", availableInSeconds: null,
    gracePeriod: false, redemptionPeriod: false, pendingDelete: false,
    hold: false, inactive: false,
  };
}

function formatURL(url: string): string {
  if (url && !/^https?:\/\//i.test(url)) return `http://${url}`;
  return url || "";
}

function formatStatus(status: Array<{ text: string; url: string }>): void {
  for (const item of status) {
    const key = item.text.replace(/[\s_]/g, "").toLowerCase();
    const canonical = aliasToCanonical[key];
    if (canonical) {
      item.text = canonical;
      if (!item.url || item.url === "https://icann.org/epp#active") {
        item.url = `https://icann.org/epp#${STATUS_MAP[canonical].fragment}`;
      }
    }
  }
}

function dateDiffText(start: string | null, end: string | null): string {
  if (!start || !end) return "";
  try {
    const s = start === "now" ? new Date() : new Date(start);
    const e = end === "now" ? new Date() : new Date(end);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return "";
    const diffMs = e.getTime() - s.getTime();
    const invert = diffMs < 0;
    const absDiff = Math.abs(diffMs);
    const days = Math.floor(absDiff / 86400000);
    const years = Math.floor(days / 365);
    const months = Math.floor((days % 365) / 30);
    const remainDays = days % 30;
    const parts: string[] = [];
    if (years) parts.push(`${years}Y`);
    if (months) parts.push(`${months}Mo`);
    if (remainDays || !parts.length) parts.push(`${remainDays}D`);
    return (invert ? "-" : "") + parts.join(" ");
  } catch { return ""; }
}

function dateDiffSeconds(start: string | null, end: string | null): number | null {
  if (!start || !end) return null;
  try {
    const s = start === "now" ? new Date() : new Date(start);
    const e = end === "now" ? new Date() : new Date(end);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return null;
    return Math.floor((e.getTime() - s.getTime()) / 1000);
  } catch { return null; }
}

function hasAnyStatusText(status: Array<{ text: string; url: string }>, texts: string[]): boolean {
  return status.some((s) => texts.includes(s.text));
}

function isUnknown(r: WhoisResult): boolean {
  return !r.registrar && !r.creationDate && !r.expirationDate &&
    !r.updatedDate && !r.availableDate && r.status.length === 0 && r.nameServers.length === 0;
}
