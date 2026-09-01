import { readFileSync } from "fs";

const data = JSON.parse(readFileSync("scripts/xcheck/_inspect.json", "utf8"));

const only = process.argv.slice(2);

if (only.length === 0) {
  const fieldCount = {};
  const logicCount = {};
  let withAny = 0;

  for (const info of Object.values(data.classes)) {
    const fields = Object.keys(info.regex ?? {});
    const logic = info.logic ?? [];
    if (fields.length || logic.length) withAny++;
    for (const f of fields) fieldCount[f] = (fieldCount[f] ?? 0) + 1;
    for (const m of logic) logicCount[m] = (logicCount[m] ?? 0) + 1;
  }

  console.log(`classes: ${Object.keys(data.classes).length}, with overrides: ${withAny}`);
  console.log("\nfield regex overrides (count of classes):");
  for (const [f, n] of Object.entries(fieldCount).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${f.padEnd(22)} ${n}`);
  }
  console.log("\nlogic method overrides (count of classes):");
  for (const [m, n] of Object.entries(logicCount).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${m.padEnd(24)} ${n}`);
  }
} else {
  for (const f of only) {
    const p = data.base[f];
    console.log(`--- ${f} ---\n/${p.source}/${p.flags}\n`);
  }
}
