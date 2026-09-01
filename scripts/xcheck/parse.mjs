import { build } from "esbuild";
import { readFileSync } from "fs";

// Bundle the TypeScript parser so we can call it from Node.
await build({
  entryPoints: ["src/whois-parser.ts"],
  bundle: true,
  format: "esm",
  outfile: "scripts/xcheck/_parser.mjs",
  logLevel: "silent",
});
const { parseWhoisText } = await import("./_parser.mjs");

const fixtures = JSON.parse(readFileSync("scripts/xcheck/fixtures-parse.json", "utf8"));
const php = JSON.parse(readFileSync("scripts/xcheck/_php_parse.json", "utf8"));

const FIELDS = [
  "domain", "reserved", "registered", "unknown", "registrar", "registrarURL",
  "registrarIANAId", "registrarWHOISServer", "creationDate", "creationDateISO8601",
  "expirationDate", "expirationDateISO8601", "updatedDate", "updatedDateISO8601",
  "availableDate", "availableDateISO8601", "nameServers", "dnssecSigned",
];

function eq(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

let mismatches = 0;
let total = 0;

for (const fx of fixtures) {
  const ts = parseWhoisText(fx.text, fx.ext);
  const ph = php.find((p) => p.ext === fx.ext);
  if (!ph) {
    console.log(`NO PHP ROW for ${fx.ext}`);
    continue;
  }
  for (const f of FIELDS) {
    total++;
    if (!eq(ts[f], ph[f])) {
      mismatches++;
      console.log(`MISMATCH [${fx.ext}] ${f}`);
      console.log("  php:", JSON.stringify(ph[f]));
      console.log("  ts :", JSON.stringify(ts[f]));
    }
  }
}

console.log(`\ncases: ${fixtures.length}  fields: ${total}  mismatch: ${mismatches}`);
if (mismatches === 0) {
  console.log("All fields match the PHP reference implementation.");
} else {
  process.exit(1);
}
