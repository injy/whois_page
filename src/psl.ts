import { PSL_RULES } from "./data/psl-data";

interface PslResult {
  registrableDomain: string;
  suffix: string;
}

const NON_ASCII_RE = /[^\x00-\x7F]/;

const exactSet = new Set<string>();
const wildcardParents = new Set<string>();
const exceptionSet = new Set<string>();

for (const rule of PSL_RULES) {
  if (rule.startsWith("!")) {
    exceptionSet.add(rule.slice(1));
  } else if (rule.startsWith("*.")) {
    wildcardParents.add(rule.slice(2));
  } else {
    exactSet.add(rule);
  }
}

export function parseDomain(input: string): PslResult | null {
  const domain = input.toLowerCase().replace(/\.$/, "");
  const labels = domain.split(".");

  if (labels.length < 2) return null;

  for (let i = 0; i < labels.length - 1; i++) {
    const candidateSuffix = labels.slice(i).join(".");
    const parentOfCandidate = labels.slice(i + 1).join(".");

    if (exceptionSet.has(candidateSuffix)) {
      const suffix = parentOfCandidate;
      if (i === 0) return null;
      const registrableDomain = labels.slice(i - 1).join(".");
      return { registrableDomain, suffix };
    }

    if (exactSet.has(candidateSuffix)) {
      if (i === 0) return null;
      const registrableDomain = labels.slice(i - 1).join(".");
      return { registrableDomain, suffix: candidateSuffix };
    }

    if (wildcardParents.has(parentOfCandidate)) {
      if (i === 0) return null;
      const registrableDomain = labels.slice(i - 1).join(".");
      return { registrableDomain, suffix: candidateSuffix };
    }
  }

  const suffix = labels[labels.length - 1];
  if (exactSet.has(suffix) && labels.length >= 2) {
    return {
      registrableDomain: domain,
      suffix,
    };
  }

  // The bundled PSL snapshot contains no IDN rules, so unicode TLDs (e.g.
  // "рф") and their punycode form (e.g. "xn--p1ai") never match a rule.
  // Fall back to "the last label is the public suffix" for those.
  if (labels.length >= 2 && (NON_ASCII_RE.test(suffix) || suffix.startsWith("xn--"))) {
    return {
      registrableDomain: domain,
      suffix,
    };
  }

  return null;
}
