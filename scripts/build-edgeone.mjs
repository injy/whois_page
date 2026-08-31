/**
 * Builds an EdgeOne Pages deployment directory.
 *
 * EdgeOne Pages serves a static site plus function directories, so the root
 * document has to be a real index.html (the page is generated at runtime on
 * the Cloudflare Worker, which is why a plain `wrangler deploy --dry-run`
 * output 404s at the root) and the API has to live under cloud-functions/.
 *
 * Output (default: dist/):
 *   index.html                          static page
 *   middleware.js                       rewrites /?domain= to /api/lookup
 *   cloud-functions/api/lookup.js       GET /api/lookup?domain=
 *   cloud-functions/api/[[default]].js  GET /api/<domain>
 *   package.json                        marks .js as ESM
 *
 * Usage: node scripts/build-edgeone.mjs   (override dir with EO_OUT_DIR)
 */
import { build } from "esbuild";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = process.env.EO_OUT_DIR ? resolve(process.env.EO_OUT_DIR) : join(root, "dist");

const functions = [
  { entry: "src/edgeone/middleware.ts", out: "middleware.js" },
  { entry: "src/edgeone/lookup.ts", out: "cloud-functions/api/lookup.js" },
  { entry: "src/edgeone/catch-all.ts", out: "cloud-functions/api/[[default]].js" },
];

async function renderIndexHtml() {
  const result = await build({
    entryPoints: [join(root, "src/html/template.ts")],
    bundle: true,
    format: "cjs",
    platform: "node",
    write: false,
    logLevel: "silent",
  });

  const module = { exports: {} };
  new Function("module", "exports", result.outputFiles[0].text)(module, module.exports);
  return module.exports.getHtml();
}

async function main() {
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  const html = await renderIndexHtml();
  await writeFile(join(outDir, "index.html"), html, "utf8");
  console.log(`index.html            ${(Buffer.byteLength(html) / 1024).toFixed(1)} KiB`);

  for (const fn of functions) {
    const target = join(outDir, fn.out);
    const result = await build({
      entryPoints: [join(root, fn.entry)],
      bundle: true,
      format: "esm",
      platform: "node",
      target: "node18",
      outfile: target,
      write: false,
      logLevel: "warning",
    });

    const output = result.outputFiles[0];
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, output.text, "utf8");
    console.log(`${fn.out.padEnd(36)} ${(Buffer.byteLength(output.text) / 1024).toFixed(1)} KiB`);
  }

  await writeFile(
    join(outDir, "package.json"),
    `${JSON.stringify({ name: "whois-pages", private: true, type: "module" }, null, 2)}\n`,
    "utf8",
  );

  console.log(`\nEdgeOne Pages build ready → ${outDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
