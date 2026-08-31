export interface WhoisResult {
  unknown: boolean;
  reserved: boolean;
  registered: boolean;
  domain: string;
  registryWebsite: string;
  registryWHOISServer: string;
  registryRDAPServer: string;
  registrar: string;
  registrarURL: string;
  registrarIANAId: string;
  registrarWHOISServer: string;
  registrarRDAPServer: string;
  creationDate: string;
  creationDateISO8601: string | null;
  expirationDate: string;
  expirationDateISO8601: string | null;
  updatedDate: string;
  updatedDateISO8601: string | null;
  availableDate: string;
  availableDateISO8601: string | null;
  status: Array<{ text: string; url: string }>;
  nameServers: string[];
  dnssecSigned: boolean | null;
  createdAgo: string;
  createdAgoSeconds: number | null;
  expiresIn: string;
  expiresInSeconds: number | null;
  updatedAgo: string;
  updatedAgoSeconds: number | null;
  availableIn: string;
  availableInSeconds: number | null;
  gracePeriod: boolean;
  redemptionPeriod: boolean;
  pendingDelete: boolean;
  hold: boolean;
  inactive: boolean;
}

const GRACE_PERIOD_TEXTS = ["Auto Renew Period"];
const REDEMPTION_PERIOD_TEXTS = ["Redemption Period"];
const PENDING_DELETE_TEXTS = ["Pending Delete"];
const HOLD_TEXTS = ["Client Hold", "Server Hold"];
const INACTIVE_TEXTS = ["Inactive"];

const EXPIRATION_ACTIONS = [
  "expiration",
  "registrar expiration",
  "soft expiration",
  "record expires",
];

export function parseRdap(
  _extension: string,
  code: number,
  rawData: string,
): WhoisResult {
  const empty = createEmpty();

  let json: Record<string, any>;
  try {
    const parsed: unknown = JSON.parse(rawData);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return unparsable(empty, code);
    }
    json = parsed as Record<string, any>;
  } catch {
    return unparsable(empty, code);
  }

  if (isReserved(json)) {
    empty.reserved = true;
    return empty;
  }

  empty.registered = code !== 404;
  if (!empty.registered) return empty;

  empty.domain = getDomain(json);
  setLinks(json, _extension, empty);
  empty.registryWHOISServer = json.port43 || "";
  setRegistrarInfo(json, empty);
  setDates(json, empty);

  empty.status = getStatus(json);
  empty.nameServers = getNameServers(json);
  empty.dnssecSigned = getDNSSECSigned(json);

  return finalizeWhoisResult(empty);
}

/**
 * The RDAP response could not be read as an object: it may be empty, or the
 * server may have answered with an HTML error / rate-limit page. Reporting
 * such a response as "unregistered" would be a false negative, so it is
 * flagged as unknown instead and the caller falls back to WHOIS / scraping.
 * A 404 stays authoritative: the object really does not exist.
 */
function unparsable(result: WhoisResult, code: number): WhoisResult {
  if (code === 404) {
    result.registered = false;
    return result;
  }
  result.unknown = true;
  result.registered = false;
  return result;
}

export function finalizeWhoisResult(result: WhoisResult): WhoisResult {
  formatStatus(result.status);

  result.createdAgo = dateDiffText(result.creationDateISO8601, "now");
  result.createdAgoSeconds = dateDiffSeconds(result.creationDateISO8601, "now");
  result.expiresIn = dateDiffText("now", result.expirationDateISO8601);
  result.expiresInSeconds = dateDiffSeconds("now", result.expirationDateISO8601);
  result.updatedAgo = dateDiffText(result.updatedDateISO8601, "now");
  result.updatedAgoSeconds = dateDiffSeconds(result.updatedDateISO8601, "now");

  result.gracePeriod = hasAnyStatusText(result.status, GRACE_PERIOD_TEXTS);
  result.redemptionPeriod = hasAnyStatusText(result.status, REDEMPTION_PERIOD_TEXTS);
  result.pendingDelete = hasAnyStatusText(result.status, PENDING_DELETE_TEXTS);
  result.hold = hasAnyStatusText(result.status, HOLD_TEXTS);
  result.inactive = hasAnyStatusText(result.status, INACTIVE_TEXTS);

  result.unknown = isUnknown(result);
  if (result.unknown) result.registered = false;

  return result;
}

export function createEmpty(): WhoisResult {
  return {
    unknown: false,
    reserved: false,
    registered: false,
    domain: "",
    registryWebsite: "",
    registryWHOISServer: "",
    registryRDAPServer: "",
    registrar: "",
    registrarURL: "",
    registrarIANAId: "",
    registrarWHOISServer: "",
    registrarRDAPServer: "",
    creationDate: "",
    creationDateISO8601: null,
    expirationDate: "",
    expirationDateISO8601: null,
    updatedDate: "",
    updatedDateISO8601: null,
    availableDate: "",
    availableDateISO8601: null,
    status: [],
    nameServers: [],
    dnssecSigned: null,
    createdAgo: "",
    createdAgoSeconds: null,
    expiresIn: "",
    expiresInSeconds: null,
    updatedAgo: "",
    updatedAgoSeconds: null,
    availableIn: "",
    availableInSeconds: null,
    gracePeriod: false,
    redemptionPeriod: false,
    pendingDelete: false,
    hold: false,
    inactive: false,
  };
}

function isReserved(json: Record<string, any>): boolean {
  if (json.variants) {
    for (const variant of json.variants) {
      if (variant.relations?.includes("RESTRICTED_REGISTRATION")) return true;
    }
  }

  if (Array.isArray(json.description)) {
    const keywords = ["has usage restrictions", "is not available"];
    for (const desc of json.description) {
      if (keywords.some((kw) => new RegExp(kw, "i").test(desc))) return true;
    }
  }

  if (json.error === "Domain name is reserved or restricted") return true;

  return false;
}

function getDomain(json: Record<string, any>): string {
  if (!json.ldhName) return "";
  return json.ldhName.replace(/\.$/, "").toLowerCase();
}

function setLinks(
  json: Record<string, any>,
  extension: string,
  result: WhoisResult,
): void {
  if (!json.links) return;

  for (const link of json.links) {
    const href = link.href || "";
    const rel = link.rel || "";
    const title = link.title || "";

    if (href && rel) {
      if (extension === "iana") {
        if (rel === "related" && title === "Registration URL") {
          result.registryWebsite = href;
        } else if (rel === "alternate" && title === "RDAP Server") {
          result.registryRDAPServer = href;
        }
      } else if (rel === "related") {
        result.registrarRDAPServer = href.split("/domain/")[0];
      }
    }
  }
}

function setRegistrarInfo(json: Record<string, any>, result: WhoisResult): void {
  if (!json.entities) return;

  for (const entity of json.entities) {
    const roles = entity.roles || [];
    const isRegistrar =
      (Array.isArray(roles) && roles.includes("registrar")) ||
      roles === "registrar";

    if (!isRegistrar) continue;

    if (entity.vcardArray?.[1]) {
      for (const vcard of entity.vcardArray[1]) {
        if ((vcard[0] === "fn" || vcard[0] === "org") && !result.registrar) {
          result.registrar = vcard[3];
        }
        if (vcard[0] === "url") {
          result.registrarURL = formatURL(vcard[3]);
        }
      }
    } else if (entity.entities) {
      for (const sub of entity.entities) {
        if (sub.roles?.includes("abuse") && sub.vcardArray?.[1]) {
          for (const vcard of sub.vcardArray[1]) {
            if (vcard[0] === "fn") result.registrar = vcard[3];
          }
          break;
        }
      }
    } else if (entity.handle) {
      result.registrar = entity.handle;
    }

    if (entity.publicIds) {
      for (const pid of entity.publicIds) {
        if (pid.type === "IANA Registrar ID" && pid.identifier) {
          result.registrarIANAId = pid.identifier;
          break;
        }
      }
    }

    if (!result.registrarURL) {
      if (entity.links) {
        for (const link of entity.links) {
          if (link.title === "Registrar's Website" && link.href) {
            result.registrarURL = formatURL(link.href);
            break;
          }
        }
      } else if (entity.url) {
        result.registrarURL = formatURL(entity.url);
      }
    }

    break;
  }
}

function formatURL(url: string): string {
  if (url && !/^https?:\/\//i.test(url)) return `http://${url}`;
  return url || "";
}

function setDates(json: Record<string, any>, result: WhoisResult): void {
  if (!json.events) return;

  for (const event of json.events) {
    const action = (event.eventAction || "").toLowerCase();
    const date = event.eventDate;
    if (!date) continue;

    if (action === "registration") {
      result.creationDate = date;
      result.creationDateISO8601 = toISO8601(date);
    } else if (EXPIRATION_ACTIONS.includes(action)) {
      result.expirationDate = date;
      result.expirationDateISO8601 = toISO8601(date);
    } else if (action === "last changed") {
      result.updatedDate = date;
      result.updatedDateISO8601 = toISO8601(date);
    }
  }
}

export function toISO8601(dateStr: string): string | null {
  if (!dateStr || dateStr === "Z") return null;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    const hasTime = /\d{2}:\d{2}/.test(dateStr);
    if (hasTime) return d.toISOString().replace(/\.\d{3}Z$/, "Z");
    return d.toISOString().split("T")[0];
  } catch {
    return null;
  }
}

function getStatus(json: Record<string, any>): Array<{ text: string; url: string }> {
  if (!json.status) return [];
  const seen = new Set<string>();
  const result: Array<{ text: string; url: string }> = [];
  for (const s of json.status) {
    if (!seen.has(s)) {
      seen.add(s);
      result.push({ text: s, url: "" });
    }
  }
  return result;
}

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
  for (const alias of aliases) {
    aliasToCanonical[alias] = canonical;
  }
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

function getNameServers(json: Record<string, any>): string[] {
  if (!json.nameservers) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const ns of json.nameservers) {
    const name = (ns.ldhName || "").split(" ")[0].toLowerCase();
    if (name && !seen.has(name)) {
      seen.add(name);
      result.push(name);
    }
  }
  return result;
}

function getDNSSECSigned(json: Record<string, any>): boolean | null {
  if (json.secureDNS?.delegationSigned !== undefined) {
    const val = json.secureDNS.delegationSigned;
    if (typeof val === "boolean") return val;
    if (typeof val === "string") return val.toLowerCase() === "true";
  }
  return null;
}

function dateDiffText(start: string | null, end: string | null): string {
  if (!start || !end) return "";
  try {
    const startDate = start === "now" ? new Date() : new Date(start);
    const endDate = end === "now" ? new Date() : new Date(end);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return "";

    const diffMs = endDate.getTime() - startDate.getTime();
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
  } catch {
    return "";
  }
}

function dateDiffSeconds(start: string | null, end: string | null): number | null {
  if (!start || !end) return null;
  try {
    const startDate = start === "now" ? new Date() : new Date(start);
    const endDate = end === "now" ? new Date() : new Date(end);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return null;
    return Math.floor((endDate.getTime() - startDate.getTime()) / 1000);
  } catch {
    return null;
  }
}

function hasAnyStatusText(
  status: Array<{ text: string; url: string }>,
  texts: string[],
): boolean {
  return status.some((s) => texts.includes(s.text));
}

function isUnknown(result: WhoisResult): boolean {
  return (
    !result.registrar &&
    !result.creationDate &&
    !result.expirationDate &&
    !result.updatedDate &&
    !result.availableDate &&
    result.status.length === 0 &&
    result.nameServers.length === 0
  );
}
