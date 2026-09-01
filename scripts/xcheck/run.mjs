/**
 * Cross-checks src/tld-date.ts against the original PHP implementation.
 *
 * The same case list is fed to both sides:
 *   - PHP    : scripts/xcheck/php_oracle.php  (real Parser::getISO8601)
 *   - TS     : parseRegistryDate() from src/tld-date.ts
 *
 * Run: node scripts/xcheck/run.mjs
 */
import { build } from "esbuild";
import { execFileSync } from "child_process";
import { readFileSync, unlinkSync } from "fs";
import { pathToFileURL } from "url";

const OUT = "scripts/xcheck/_bundle.mjs";

await build({
  entryPoints: ["src/tld-date.ts"],
  bundle: true,
  format: "esm",
  platform: "node",
  outfile: OUT,
  logLevel: "silent",
});

const { parseRegistryDate } = await import(
  pathToFileURL(process.cwd() + "/" + OUT).href
);
unlinkSync(OUT);

const cases = JSON.parse(readFileSync("scripts/xcheck/cases.json", "utf8"));

let phpRows;
try {
  const stdout = execFileSync("php", ["scripts/xcheck/php_oracle.php"], {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  phpRows = JSON.parse(stdout);
} catch (err) {
  console.error("Could not run the PHP oracle:", err.message);
  process.exit(1);
}

let pass = 0;
const failures = [];

for (const row of phpRows) {
  const actual = parseRegistryDate(row.input, row.ext);
  const expected = row.iso ?? null;

  if (actual === expected) {
    pass++;
  } else {
    failures.push({ ext: row.ext, input: row.input, expected, actual });
  }
}

console.log(`cases: ${phpRows.length}   match: ${pass}   mismatch: ${failures.length}`);

if (failures.length) {
  console.log("\nMismatches (expected = PHP, actual = TypeScript):");
  for (const f of failures) {
    console.log(
      `  [${f.ext}] "${f.input}"\n      php: ${f.expected}\n      ts : ${f.actual}`
    );
  }
  process.exitCode = 1;
} else {
  console.log("\nAll cases match the PHP reference implementation.");
}
