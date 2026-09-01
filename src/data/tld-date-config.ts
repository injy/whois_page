/**
 * Per-extension date parsing rules, generated from the original PHP project.
 *
 * Source: 20260818/src/Parsers/Parser*.php (properties $timezone / $dateFormat)
 * Generator: scripts/gen-tld-date-config.php
 *
 * Generated on 2026-09-01 - do not edit by hand, re-run the generator instead.
 *
 * A registry prints its timestamps in its own local timezone and often in a
 * non-ISO format. Parsing those with a bare `new Date()` silently produces
 * wrong values: it assumes UTC, and for formats such as d/m/Y it even swaps
 * day and month. These rules reproduce what the PHP project does.
 */

export interface TldDateConfig {
  /** IANA timezone the registry stamps are written in. Defaults to UTC. */
  timezone?: string;
  /** PHP date() format of the stamps, absent when they are already parseable. */
  dateFormat?: string;
}

type Rules = Record<string, TldDateConfig>;

const RULES: Rules = {
  "ar": { timezone: "America/Argentina/Buenos_Aires" },
  "at": { timezone: "Europe/Vienna" },
  "bb": { timezone: "America/Barbados" },
  "bd": { dateFormat: "d/m/Y" },
  "bn": { timezone: "Asia/Brunei" },
  "bt": { timezone: "Asia/Thimphu" },
  "cl": { timezone: "America/Santiago" },
  "cn": { timezone: "Asia/Shanghai" },
  "中国": { timezone: "Asia/Shanghai" },
  "中國": { timezone: "Asia/Shanghai" },
  "co.pl": { dateFormat: "Y.m.d H:i:s" },
  "cr": { timezone: "America/Costa_Rica" },
  "cz": { timezone: "Europe/Prague" },
  "fi": { timezone: "Europe/Helsinki" },
  "gg": { timezone: "Europe/Guernsey", dateFormat: "jS F Y \\a\\t H:i:s.u" },
  "gt": { timezone: "America/Guatemala" },
  "gw": { dateFormat: "d/m/Y" },
  "hm": { dateFormat: "d/m/Y" },
  "hu": { timezone: "Europe/Budapest" },
  "im": { timezone: "Europe/Isle_of_Man", dateFormat: "d/m/Y H:i:s" },
  "it": { timezone: "Europe/Rome" },
  "je": { timezone: "Europe/Jersey", dateFormat: "jS F Y \\a\\t H:i:s.u" },
  "kg": { timezone: "Asia/Bishkek" },
  "kr": { dateFormat: "Y. m. d." },
  "한국": { dateFormat: "Y. m. d." },
  "ls": { timezone: "Africa/Maseru" },
  "mk": { timezone: "Europe/Skopje" },
  "мкд": { timezone: "Europe/Skopje" },
  "mo": { timezone: "Asia/Macau" },
  "澳門": { timezone: "Asia/Macau" },
  "mw": { timezone: "Africa/Blantyre" },
  "np": { timezone: "Asia/Kathmandu" },
  "pf": { dateFormat: "d/m/Y" },
  "pl": { timezone: "Europe/Warsaw", dateFormat: "Y.m.d H:i:s" },
  "pt": { timezone: "Europe/Lisbon", dateFormat: "d/m/Y H:i:s" },
  "rs": { timezone: "Europe/Belgrade" },
  "срб": { timezone: "Europe/Belgrade" },
  "sm": { dateFormat: "d/m/Y" },
  "st": { timezone: "Africa/Sao_Tome" },
  "tw": { timezone: "Asia/Taipei" },
  "台湾": { timezone: "Asia/Taipei" },
  "台灣": { timezone: "Asia/Taipei" },
  "tz": { timezone: "Africa/Dar_es_Salaam" },
  "uz": { timezone: "Asia/Tashkent" },
  "co.uz": { timezone: "Asia/Tashkent" },
  "com.uz": { timezone: "Asia/Tashkent" },
  "net.uz": { timezone: "Asia/Tashkent" },
  "org.uz": { timezone: "Asia/Tashkent" },
  "ve": { timezone: "America/Caracas" },
};

/** Rules for one extension, or undefined when it uses the UTC / ISO default. */
export function getTldDateConfig(extension: string): TldDateConfig | undefined {
  return RULES[extension.toLowerCase()];
}
