import { build } from "esbuild";
import { readFileSync, unlinkSync } from "fs";
import { pathToFileURL } from "url";

// Bundle the TS parser to a temp ESM module we can import under Node.
const OUT = "scripts/_gt_bundle.mjs";
await build({
  entryPoints: ["src/scrapers/gt.ts"],
  bundle: true,
  format: "esm",
  platform: "node",
  outfile: OUT,
  logLevel: "silent",
});

const { parseGtHtml } = await import(pathToFileURL(process.cwd() + "/" + OUT).href);

for (const f of ["y_gt.html", "g_gt.html", "www_gt.html", "w_gt.html"]) {
  const html = readFileSync(f, "utf8");
  const parsed = parseGtHtml(html);
  console.log("================ " + f + " ================");
  if (!parsed) {
    console.log("(null)");
    continue;
  }
  const d = parsed.data;
  if (d) {
    console.log("domain       :", d.domain);
    console.log("registered   :", d.registered);
    console.log("status       :", JSON.stringify(d.status));
    console.log("expiration   :", d.expirationDate, "->", d.expirationDateISO8601);
    console.log("registrar    :", d.registrar);
    console.log("nameServers  :", JSON.stringify(d.nameServers));
  } else {
    console.log("(no structured data — raw only)");
  }
  console.log("--- rawText ---");
  console.log(parsed.rawText);
  console.log();
}

unlinkSync(OUT);
