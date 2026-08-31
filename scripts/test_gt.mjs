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
  const out = parseGtHtml(html);
  console.log("================ " + f + " ================");
  console.log(out);
  console.log();
}

unlinkSync(OUT);
