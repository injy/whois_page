import type { WhoisResult } from "./parser";

const BASE_RE = /^[\t ]*(?:PATTERN)[\.\t ]*:(.+)$/im;

function buildRe(patterns: string[]): RegExp {
  return new RegExp(`^[\\t ]*(?:${patterns.join("|")})[\\.\\t ]*:(.+)$`, "im");
}

function matchFirst(data: string, re: RegExp): string {
  const m = data.match(re);
  return m ? m[1].trim() : "";
}

function matchAll(data: string, re: RegExp): string[] {
  const results: string[] = [];
  let m: RegExpExecArray | null;
  const globalRe = new RegExp(re.source, "gim");
  while ((m = globalRe.exec(data)) !== null) {
    const val = m[1].trim();
    if (val && !results.includes(val)) results.push(val);
  }
  return results;
}

const RESERVED_KEYWORDS = [
  "reserved by (?:the )?registry", "has been reserved", "prohibited string",
  "reserved word", "status:\\tnot allowed", "status: forbidden",
  "on a restricted list", "illegal characters", "object is blocked",
  "has usage restrictions", "can ?not be registered", "is not available",
  "domain(?: name)? is not allowed", "status: not available",
  "not available for registration", "reserved domain name",
  "name is restricted", "status: unavailable",
  "domain (?:name )?(?:is )?reserved", "is a reserved name",
  "status: prohibited", "forbiden name", "domain blocked",
  "restricted from registration",
];

const UNREGISTERED_KEYWORDS = [
  "no match", "not? found", "not exist", "no data", "nothing found",
  "status: available", "status:\\tavailable", "no object found",
  "unregistered domain name", "could not be found", "no entries found",
  "status: free", "is available for registration", "not registered",
  "has not been registered", "domain (?:name )?is available",
  "no record found", "no such domain", "object_not_found",
  "domain unknown", "no information", "no records found",
  "is available for purchase",
];

const DOMAIN_KEYWORDS = [
  "domain name", "domain", "domainname", "domain  name",
  "domain name \\(utf8\\)",
];

const REGISTRAR_KEYWORDS = [
  "registrar", "registrar name", "sponsoring registrar",
  "registrar-name", "registration service provider",
];

const REGISTRAR_URL_KEYWORDS = [
  "registrar url", "registrar website", "registrar-url",
  "sponsoring registrar url", "registration service url",
];

const REGISTRAR_IANA_ID_KEYWORDS = [
  "registrar iana id", "sponsoring registrar iana id",
];

const REGISTRAR_WHOIS_SERVER_KEYWORDS = [
  "registrar whois server", "whois server", "whois tcp uri",
];

const CREATION_DATE_KEYWORDS = [
  "creation date", "registered", "created", "activation date",
  "registration date", "registration time", "submission date",
  "domain name commencement date", "domain creation date", "assigned",
  "created on", "record created", "registered date", "domain created",
  "registered on", "first registered date", "activation", "created date",
];

const EXPIRATION_DATE_KEYWORDS = [
  "registry expiry date", "expires", "expire",
  "registrar registration expiration date", "expiry date",
  "expiration date", "cutoff date", "expiration time", "expiration",
  "domain expiration date", "validity", "expire date", "expires on",
  "record expires on", "paid-till", "valid until", "exp date", "expiry",
];

const UPDATED_DATE_KEYWORDS = [
  "updated date", "last modified", "changed", "modified",
  "modified date", "update date", "last-update", "last updated date",
  "last update", "last updated", "record last updated on",
  "last updated on", "modification date", "updated",
];

const STATUS_KEYWORDS = [
  "domain status", "status", "registration status",
  "domain state", "registry status",
];

const NAME_SERVER_KEYWORDS = [
  "name server", "nserver", "host ?name", "nameserver",
];

const DNSSEC_KEYWORDS = ["dnssec", "delegation signed", "signed", "dnssec signed"];
const DNSSEC_EXTRA_KEYWORDS = ["dsrecord", "dnskey", "key1-tag", "signing key", "ds-rdata", "ds", "ds record"];
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

export function parseWhoisText(data: string): WhoisResult {
  const result = createEmpty();
  if (!data) { result.unknown = true; return result; }

  const reservedRe = new RegExp(RESERVED_KEYWORDS.join("|"), "i");
  if (reservedRe.test(data)) { result.reserved = true; return result; }

  const unregisteredRe = new RegExp(UNREGISTERED_KEYWORDS.join("|"), "i");
  if (unregisteredRe.test(data)) { return result; }

  result.registered = true;
  result.domain = matchFirst(data, buildRe(DOMAIN_KEYWORDS)).toLowerCase().split(" ")[0] || "";

  const registrar = matchFirst(data, buildRe(REGISTRAR_KEYWORDS));
  const registrarUrlMatch = registrar.match(/(.+)\(( *https?:\/\/.+)\)/i);
  if (registrarUrlMatch) {
    result.registrar = registrarUrlMatch[1].trim();
    result.registrarURL = registrarUrlMatch[2].trim();
  } else {
    result.registrar = registrar;
  }

  result.registrarURL = result.registrarURL || formatURL(matchFirst(data, buildRe(REGISTRAR_URL_KEYWORDS)));
  const ianaId = matchFirst(data, buildRe(REGISTRAR_IANA_ID_KEYWORDS));
  if (/^\d+$/.test(ianaId)) result.registrarIANAId = ianaId;
  result.registrarWHOISServer = matchFirst(data, buildRe(REGISTRAR_WHOIS_SERVER_KEYWORDS));

  result.creationDate = matchFirst(data, buildRe(CREATION_DATE_KEYWORDS));
  result.creationDateISO8601 = toISO8601(result.creationDate);
  result.expirationDate = matchFirst(data, buildRe(EXPIRATION_DATE_KEYWORDS));
  result.expirationDateISO8601 = toISO8601(result.expirationDate);
  result.updatedDate = matchFirst(data, buildRe(UPDATED_DATE_KEYWORDS));
  result.updatedDateISO8601 = toISO8601(result.updatedDate);

  const statusValues = matchAll(data, buildRe(STATUS_KEYWORDS));
  result.status = statusValues.map((text) => {
    const urlMatch = text.match(/^(.+)\s+(?:(https?:\/\/\S+)|\((https?:\/\/[^\s)]+)\))/i);
    if (urlMatch) return { text: urlMatch[1].trim(), url: urlMatch[2] || urlMatch[3] };
    return { text, url: "" };
  });
  formatStatus(result.status);

  result.nameServers = matchAll(data, buildRe(NAME_SERVER_KEYWORDS))
    .map((ns) => ns.split(/[\t ]+/)[0].toLowerCase());

  const dnssecVal = matchFirst(data, buildRe(DNSSEC_KEYWORDS));
  if (dnssecVal) {
    result.dnssecSigned = DNSSEC_SIGNED_VALUES.includes(dnssecVal.toLowerCase());
  } else {
    const dnssecExtra = matchFirst(data, buildRe(DNSSEC_EXTRA_KEYWORDS));
    if (dnssecExtra) result.dnssecSigned = !!dnssecExtra.trim();
  }

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

function toISO8601(dateStr: string): string | null {
  if (!dateStr || dateStr === "Z") return null;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    const hasTime = /\d{2}:\d{2}/.test(dateStr);
    if (hasTime) return d.toISOString().replace(/\.\d{3}Z$/, "Z");
    return d.toISOString().split("T")[0];
  } catch { return null; }
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
