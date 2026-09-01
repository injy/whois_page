import { getTldDateConfig } from "./data/tld-date-config";

/**
 * Date parsing for registry stamps, mirroring the original PHP project.
 *
 * The PHP reference does this in `Parser::getISO8601()`:
 *
 *   $hasTime  = preg_match("/\d{2}:\d{2}/", $dateString);
 *   $timezone = new DateTimeZone($hasTime ? $this->timezone : "UTC");
 *   $date     = empty($this->dateFormat)
 *     ? new DateTime($dateString, $timezone)
 *     : DateTime::createFromFormat($this->dateFormat, $dateString, $timezone);
 *   $date->setTimezone(new DateTimeZone("UTC"));
 *   return $date->format($hasTime ? "Y-m-d\TH:i:s\Z" : "Y-m-d");
 *
 * Three behaviours matter and are easy to get wrong:
 *
 *  1. The configured timezone only applies when the stamp carries a time.
 *     Date-only stamps are read as UTC, whatever the timezone says.
 *  2. A stamp that already states its own zone ("...Z", "...+02:00") wins:
 *     PHP's DateTime honours the offset in the string and ignores the
 *     constructor's timezone, so no conversion is applied here either.
 *  3. Registries using a non-ISO format declare it via $dateFormat; parsing
 *     "05/06/2027" with a bare `new Date()` would silently yield June 5th
 *     instead of May 6th (JavaScript's loose parser is US-centric).
 *
 * Anything not covered falls back to the previous `new Date()` behaviour, so
 * this can only ever improve on what was there before.
 */

interface Wall {
  y: number;
  mo: number;
  d: number;
  h: number;
  mi: number;
  s: number;
}

const MONTH_NAMES: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

function pad(n: number, len: number): string {
  let out = String(n);
  while (out.length < len) out = "0" + out;
  return out;
}

function escapeRe(ch: string): string {
  return ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Offset in minutes that `timeZone` is ahead of UTC at the given instant. */
function getOffsetMinutes(timeZone: string, at: Date): number | null {
  try {
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const parts = dtf.formatToParts(at);
    const map: Record<string, number> = {};
    for (const part of parts) {
      if (part.type !== "literal") map[part.type] = Number(part.value);
    }
    if (!map.year || !map.month || !map.day) return null;
    const asUtc = Date.UTC(
      map.year,
      map.month - 1,
      map.day,
      (map.hour ?? 0) % 24,
      map.minute ?? 0,
      map.second ?? 0,
    );
    return (asUtc - at.getTime()) / 60000;
  } catch {
    // Unknown timezone, or an environment without full ICU data.
    return null;
  }
}

/**
 * Resolve a wall-clock reading in `timeZone` to a real UTC instant.
 * The offset depends on the instant (DST), so it is refined once.
 */
function zonedWallToUtcMs(wall: Wall, timeZone: string): number | null {
  const wallAsUtc = Date.UTC(wall.y, wall.mo - 1, wall.d, wall.h, wall.mi, wall.s);
  if (isNaN(wallAsUtc)) return null;
  if (timeZone === "UTC") return wallAsUtc;

  const first = getOffsetMinutes(timeZone, new Date(wallAsUtc));
  if (first === null) return wallAsUtc;

  let utc = wallAsUtc - first * 60000;
  const second = getOffsetMinutes(timeZone, new Date(utc));
  if (second !== null && second !== first) {
    utc = wallAsUtc - second * 60000;
  }
  return utc;
}

function wallToIso(wall: Wall, timeZone: string, hasTime: boolean): string | null {
  const utcMs = zonedWallToUtcMs(wall, hasTime ? timeZone : "UTC");
  if (utcMs === null) return null;

  const dt = new Date(utcMs);
  const date = `${pad(dt.getUTCFullYear(), 4)}-${pad(dt.getUTCMonth() + 1, 2)}-${pad(dt.getUTCDate(), 2)}`;
  if (!hasTime) return date;
  return `${date}T${pad(dt.getUTCHours(), 2)}:${pad(dt.getUTCMinutes(), 2)}:${pad(dt.getUTCSeconds(), 2)}Z`;
}

/**
 * Minimal PHP `DateTime::createFromFormat()` for the tokens the registry
 * parsers actually declare: Y m d j S F l M a A g h H i s u, plus `\x`
 * escapes and literal separators.
 */
function parseWithFormat(input: string, format: string): Wall | null {
  let pattern = "^\\s*";
  type Slot = "y" | "mo" | "d" | "h" | "mi" | "s" | "monName";
  const slots: Slot[] = [];

  const push = (re: string, slot?: Slot) => {
    pattern += re;
    if (slot) slots.push(slot);
  };

  let i = 0;
  while (i < format.length) {
    const ch = format[i];

    if (ch === "\\") {
      pattern += escapeRe(format[i + 1] ?? "");
      i += 2;
      continue;
    }

    switch (ch) {
      case "Y": push("(\\d{4})", "y"); break;
      case "y": push("(\\d{2})", "y"); break;
      case "m": push("(\\d{1,2})", "mo"); break;
      case "n": push("(\\d{1,2})", "mo"); break;
      case "d": push("(\\d{1,2})", "d"); break;
      case "j": push("(\\d{1,2})", "d"); break;
      case "F": push("([A-Za-z]+)", "monName"); break;
      case "M": push("([A-Za-z]{3,9})", "monName"); break;
      case "H": push("(\\d{1,2})", "h"); break;
      case "h": push("(\\d{1,2})", "h"); break;
      case "g": push("(\\d{1,2})", "h"); break;
      case "i": push("(\\d{1,2})", "mi"); break;
      case "s": push("(\\d{1,2})", "s"); break;
      case "u": push("(\\d{1,6})"); break;
      case "S": push("(?:st|nd|rd|th)"); break;
      case "l": push("(?:[A-Za-z]+)"); break;
      case "D": push("(?:[A-Za-z]{3})"); break;
      case "a": push("(?:[AaPp][Mm])"); break;
      case "A": push("(?:[AaPp][Mm])"); break;
      case "t": push("\\d{1,2}"); break;
      default: push(escapeRe(ch)); break;
    }
    i++;
  }

  let match: RegExpExecArray | null;
  try {
    match = new RegExp(pattern, "i").exec(input);
  } catch {
    return null;
  }
  if (!match) return null;

  const wall: Wall = { y: 0, mo: 1, d: 1, h: 0, mi: 0, s: 0 };
  let group = 1;

  for (const slot of slots) {
    const raw = match[group++];
    if (raw === undefined) return null;

    if (slot === "monName") {
      const month = MONTH_NAMES[raw.toLowerCase()];
      if (!month) return null;
      wall.mo = month;
    } else {
      const value = Number(raw);
      if (!Number.isFinite(value)) return null;
      wall[slot] = value;
    }
  }

  if (!wall.y || !wall.mo || !wall.d) return null;
  return wall;
}

/** Unambiguous, non-US-centric shapes accepted when no $dateFormat is declared. */
const LOOSE_PATTERNS: Array<{
  re: RegExp;
  order: Array<"y" | "mo" | "d" | "h" | "mi" | "s">;
}> = [
  // 2027-06-05 / 2027-06-05 00:22:40 / 2027-06-05T00:22:40
  {
    re: /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2}))?)?/,
    order: ["y", "mo", "d", "h", "mi", "s"],
  },
  // 2027-Jun-05 00:22:40 (the .gt registry style)
  {
    re: /^(\d{4})-([A-Za-z]{3,9})-(\d{1,2})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2}))?)?/,
    order: ["y", "mo", "d", "h", "mi", "s"],
  },
  // 05.06.2027 00:22:40 (dotted form is day-first everywhere)
  {
    re: /^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2}))?)?/,
    order: ["d", "mo", "y", "h", "mi", "s"],
  },
];

function parseLooseWall(input: string): Wall | null {
  for (const { re, order } of LOOSE_PATTERNS) {
    const m = re.exec(input);
    if (!m) continue;

    const wall: Wall = { y: 0, mo: 1, d: 1, h: 0, mi: 0, s: 0 };
    let ok = true;

    for (let i = 0; i < order.length; i++) {
      const raw = m[i + 1];
      if (raw === undefined) continue;
      const value = order[i] === "mo" && /[A-Za-z]/.test(raw)
        ? MONTH_NAMES[raw.toLowerCase()]
        : Number(raw);
      if (!Number.isFinite(value) || !value) {
        if (order[i] === "h" || order[i] === "mi" || order[i] === "s") continue;
        ok = false;
        break;
      }
      wall[order[i]] = value;
    }

    if (ok && wall.y && wall.mo && wall.d) return wall;
  }
  return null;
}

/** True when the stamp states its own UTC offset, e.g. "...Z" or "...+02:00". */
function hasExplicitZone(input: string): boolean {
  return /(?:Z|[+-]\d{2}:?\d{2})$/i.test(input) || /\b(?:UTC|GMT)\b/i.test(input);
}

/** Previous behaviour, kept as the fallback: whatever `new Date()` makes of it. */
function legacyToIso(dateStr: string): string | null {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    if (/\d{2}:\d{2}/.test(dateStr)) return d.toISOString().replace(/\.\d{3}Z$/, "Z");
    return d.toISOString().split("T")[0];
  } catch {
    return null;
  }
}

/**
 * Convert a registry date stamp to ISO-8601, honouring the extension's
 * timezone and date format. Returns null when nothing can be made of it.
 */
export function parseRegistryDate(raw: string, extension?: string): string | null {
  const input = (raw ?? "").trim();
  if (!input || input === "Z") return null;

  const hasTime = /\d{2}:\d{2}/.test(input);
  const config = extension ? getTldDateConfig(extension) : undefined;
  const timezone = config?.timezone ?? "UTC";

  // An explicit offset in the text overrides the configured timezone.
  if (hasTime && hasExplicitZone(input)) return legacyToIso(input);

  if (config?.dateFormat) {
    const wall = parseWithFormat(input, config.dateFormat);
    if (wall) {
      const iso = wallToIso(wall, timezone, hasTime);
      if (iso) return iso;
    }
  }

  // Reading the parts out explicitly and recombining them keeps the result
  // independent of the runtime's own timezone: `new Date("2027-06-05 12:00:00")`
  // means 12:00 local time, so it silently shifts on any host that is not UTC.
  const wall = parseLooseWall(input);
  if (wall) {
    const iso = wallToIso(wall, hasTime ? timezone : "UTC", hasTime);
    if (iso) return iso;
  }

  return legacyToIso(input);
}
