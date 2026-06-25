import fs   from "node:fs";
import path from "node:path";

const ROOT        = path.resolve(".");
const SRC_INDEX   = path.join(ROOT, "src", "index.html");
const ENGINES_DIR = path.join(ROOT, "engines");
const DIST        = path.join(ROOT, "dist");
const DIST_ENG    = path.join(DIST, "engines");
const PUBLIC_DIR  = path.join(ROOT, "public");

// čistý dist
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST_ENG, { recursive: true });

if (!fs.existsSync(SRC_INDEX)) {
  console.error("❌  src/index.html neexistuje.");
  process.exit(1);
}

// 1) dílna -> dist/index.html (+ razítko buildu)
const buildTime = new Date().toISOString();
let html = fs.readFileSync(SRC_INDEX, "utf8");
html = html.replace(/(<html[^>]*>)/i, `$1\n<!-- BUILD: ${buildTime} -->`);
fs.writeFileSync(path.join(DIST, "index.html"), html, "utf8");

// 2) PWA / public assets -> dist/
if (fs.existsSync(PUBLIC_DIR)) {
  fs.cpSync(PUBLIC_DIR, DIST, { recursive: true });
}

// 2) enginy + manifest -> dist/engines/
let engineCount = 0;
if (fs.existsSync(ENGINES_DIR)) {
  for (const f of fs.readdirSync(ENGINES_DIR)) {
    if (f.endsWith(".html") || f === "manifest.json") {
      fs.copyFileSync(path.join(ENGINES_DIR, f), path.join(DIST_ENG, f));
      if (f.endsWith(".html")) engineCount++;
    }
  }
}

// 3) přehled
const kb = p => (fs.statSync(p).size / 1024).toFixed(1) + " kB";
console.log("✅  Build dokončen");
console.log(`   dílna:  dist/index.html  →  ${kb(path.join(DIST, "index.html"))}`);
console.log(`   enginy: ${engineCount}  →  dist/engines/`);
for (const f of fs.readdirSync(DIST_ENG)) {
  console.log(`            • ${f}  (${kb(path.join(DIST_ENG, f))})`);
}
console.log(`   Čas:    ${buildTime}`);
