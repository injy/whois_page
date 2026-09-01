/**
 * Builds an EdgeOne Pages deployment.
 *
 * EdgeOne Pages scans the *repository root* for two kinds of server-side code:
 *   - cloud-functions/   → API routes (each file is a function, export onRequest)
 *   - middleware.js      → request rewriting (export middleware + config.matcher)
 * The static site is emitted to dist/ (the configured build output directory).
 *
 * IMPORTANT: the cloud functions and middleware must live at the repo root,
 * NOT inside dist/. EdgeOne builds them itself during Git deployment, so they
 * are generated here (and committed) so the platform can find them.
 *
 * Output:
 *   dist/index.html                      static page
 *   cloud-functions/api/lookup.js       GET /api/lookup?domain=
 *   cloud-functions/api/index.js        GET /api and /api/ (bare directory)
 *   cloud-functions/api/[[default]].js  GET /api/<domain>
 *   cloud-functions/package.json        marks the functions as ESM
 *   middleware.js                       rewrites /?domain= to /api/lookup
 *
 * Usage: node scripts/build-edgeone.mjs   (override output dir with EO_OUT_DIR)
 */
import { build } from "esbuild";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = process.env.EO_OUT_DIR ? resolve(process.env.EO_OUT_DIR) : join(root, "dist");

// Functions + middleware are emitted at the REPO ROOT, where EdgeOne Pages
// looks for them.
const functions = [
  { entry: "src/edgeone/middleware.ts", out: "middleware.js" },
  { entry: "src/edgeone/lookup.ts", out: "cloud-functions/api/lookup.js" },
  { entry: "src/edgeone/api-root.ts", out: "cloud-functions/api/index.js" },
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
  // Static site
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
  const html = await renderIndexHtml();
  await writeFile(join(outDir, "index.html"), html, "utf8");
  console.log(`dist/index.html        ${(Buffer.byteLength(html) / 1024).toFixed(1)} KiB`);

  // EdgeOne Pages serves static files from the project root for "pure"
  // projects (the whole repo is staged to .edgeone/assets), so also emit
  // index.html at the repo root so that "/" resolves. Harmless if the
  // platform instead uses `dist/` as the static root.
  if (resolve(outDir) !== root) {
    await writeFile(join(root, "index.html"), html, "utf8");
    console.log(`index.html (root)      ${(Buffer.byteLength(html) / 1024).toFixed(1)} KiB`);
  }

  // Server-side artifacts at the repo root (regenerated every build)
  await rm(join(root, "cloud-functions"), { recursive: true, force: true });
  await rm(join(root, "middleware.js"), { force: true });

  for (const fn of functions) {
    const target = join(root, fn.out);
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

  // Mark the cloud-functions directory as ESM so Node/EdgeOne treat the .js
  // function files as ES modules.
  await writeFile(
    join(root, "cloud-functions", "package.json"),
    `${JSON.stringify({ name: "whois-cloud-functions", private: true, type: "module" }, null, 2)}\n`,
    "utf8",
  );

  console.log(`\nEdgeOne Pages build ready → static: ${outDir}, functions + middleware at repo root`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
