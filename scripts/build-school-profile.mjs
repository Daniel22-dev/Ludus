import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const sourceDist = path.join(root, "dist");
const targetDist = path.join(root, "dist-school-server");
const requestedBuildTime = String(process.env.GHRAB_BUILD_TIME || '').trim();
const parsedBuildTime = requestedBuildTime ? Date.parse(requestedBuildTime) : NaN;
if (requestedBuildTime && Number.isNaN(parsedBuildTime)) throw new Error('GHRAB_BUILD_TIME musí být platný ISO-8601 čas.');
const buildTime = requestedBuildTime ? new Date(parsedBuildTime).toISOString() : new Date().toISOString();
if (!fs.existsSync(sourceDist)) throw new Error("Chybí dist/. Nejprve spusťte standardní build.");
fs.rmSync(targetDist, { recursive: true, force: true });
fs.cpSync(sourceDist, targetDist, { recursive: true });

function walk(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else files.push(full);
  }
  return files;
}
function readJson(file) { return JSON.parse(fs.readFileSync(file, "utf8")); }
function writeJson(file, value) { fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`); }
function trailingSlash(value) { return String(value || "/").replace(/\/+$/, "") + "/"; }

let files = walk(targetDist);
const schoolProfiles = files.filter((file) => file.endsWith(`${path.sep}config${path.sep}deployment.school-server.json`));
if (!schoolProfiles.length) throw new Error("Build neobsahuje config/deployment.school-server.json.");
for (const profile of schoolProfiles) fs.copyFileSync(profile, path.join(path.dirname(profile), "deployment.json"));

files = walk(targetDist);
for (const runtimeProfile of files.filter((file) => file.endsWith(`${path.sep}runtime-config.school-server.js`))) {
  fs.copyFileSync(runtimeProfile, path.join(path.dirname(runtimeProfile), "runtime-config.js"));
}
for (const deploymentModule of files.filter((file) => file.endsWith(`${path.sep}access${path.sep}deployment-config.js`))) {
  const source = fs.readFileSync(deploymentModule, "utf8");
  const from = 'const CONFIG_FAILURE_MODE = "github-fallback";';
  const to = 'const CONFIG_FAILURE_MODE = "fail-closed";';
  if (!source.includes(from)) throw new Error("School-server build neumí aktivovat fail-closed deployment režim.");
  fs.writeFileSync(deploymentModule, source.replace(from, to), "utf8");
}
for (const manifestPath of files.filter((file) => file.endsWith(`${path.sep}manifest.webmanifest`))) {
  const manifest = readJson(manifestPath);
  manifest.id = "./";
  manifest.start_url = "./";
  manifest.scope = "./";
  writeJson(manifestPath, manifest);
}


const securityHeaders = readJson(path.join(root, 'public', 'config', 'security-headers.json'));
const schoolCsp = String(securityHeaders.schoolServerProfile?.headers?.['Content-Security-Policy'] || '');
for (const htmlFile of files.filter((file) => file.toLowerCase().endsWith('.html'))) {
  let html = fs.readFileSync(htmlFile, 'utf8');
  const escaped = schoolCsp.replaceAll('&', '&amp;').replaceAll('"', '&quot;');
  if (/http-equiv=["']Content-Security-Policy["']/i.test(html)) {
    html = html.replace(/<meta[^>]+http-equiv=["']Content-Security-Policy["'][^>]*>/i, `<meta http-equiv="Content-Security-Policy" content="${escaped}" data-ghrab-csp-profile="school-server">`);
  } else {
    html = html.replace(/<head\b([^>]*)>/i, `<head$1>\n<meta http-equiv="Content-Security-Policy" content="${escaped}" data-ghrab-csp-profile="school-server">`);
  }
  fs.writeFileSync(htmlFile, html, 'utf8');
}

const deployment = readJson(path.join(path.dirname(schoolProfiles[0]), "deployment.json"));
if (!deployment.appId || deployment.profile !== "school-server" || deployment.authMode !== "server-session" || deployment.aiTransport !== "school-gateway" || deployment.features?.allowLocalProviderKeys === true) {
  throw new Error("Aktivní school-server deployment kontrakt není úplný nebo porušuje AI transport policy.");
}
const appBaseUrl = trailingSlash(deployment.appBaseUrl || deployment.appBaseUrls?.[deployment.appId]);
if (!appBaseUrl.startsWith("/")) throw new Error("School-server appBaseUrl musí být same-origin absolutní cesta.");

for (const manifestPath of files.filter((file) => file.endsWith(`${path.sep}studio-manifest.json`))) {
  const manifest = readJson(manifestPath);
  manifest.deploymentProfile = "school-server";
  manifest.serverReadyPhase = "P3";
  manifest.launchUrl = appBaseUrl;
  manifest.manualUrl = `${appBaseUrl}manual/`;
  if (manifest.aiCore?.status === "integrated-p1" || manifest.aiCore?.coreVersion) {
    manifest.aiCore.operationsManifestUrl = `${appBaseUrl}ai-operations.json`;
  } else if (manifest.aiCore && typeof manifest.aiCore === "object") {
    delete manifest.aiCore.operationsManifestUrl;
  }
  writeJson(manifestPath, manifest);
}

for (const stale of files.filter((file) => file.endsWith(`${path.sep}deployment.school-server-p0.json`))) {
  fs.rmSync(stale, { force: true });
}

const pkg = readJson(path.join(root, "package.json"));
writeJson(path.join(targetDist, "server-ready-build-info.json"), {
  schema: "ghrab-server-ready-build-v1",
  app: pkg.name,
  appId: deployment.appId,
  version: pkg.version,
  phase: "P3",
  profile: "school-server",
  builtAt: buildTime,
  activeAuthMode: deployment.authMode,
  activeAiTransport: deployment.aiTransport,
  telemetryMode: deployment.telemetryMode,
  appBaseUrl,
  apiBaseUrl: deployment.apiBaseUrl,
  containsSecrets: false,
  localProviderKeysAllowed: false,
  deploymentConfigFailureMode: "fail-closed",
  serverSessionReady: deployment.features?.serverSessionReady === true,
  schoolGatewayReady: deployment.aiTransport === "school-gateway" ? deployment.features?.schoolGatewayReady === true : null,
  aiCoreVersion: deployment.aiTransport === "school-gateway" ? "1.0.0" : null,
  contractVersion: deployment.aiTransport === "school-gateway" ? "1" : null,
});
console.log(`${pkg.name} ${pkg.version}: dist-school-server/ sestaven jako same-origin P3 school-server profil.`);
