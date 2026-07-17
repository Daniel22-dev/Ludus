import { readFile } from "node:fs/promises";
import path from "node:path";

const versionCache = new Map();

async function getPackageVersion(root) {
  if (!versionCache.has(root)) {
    versionCache.set(
      root,
      readFile(path.join(root, "package.json"), "utf8").then((text) => {
        const version = JSON.parse(text).version;
        if (!version) throw new Error("package.json neobsahuje verzi");
        return version;
      }),
    );
  }
  return versionCache.get(root);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function validateScenario(scenario, { root }) {
  const file = path.join(root, "engines", `${scenario.engine}.html`);
  const text = await readFile(file, "utf8").catch(() => "");
  if (!text) {
    return {
      pass: false,
      message: `Nenalezen engine ${scenario.engine}`,
    };
  }

  const expectedVersion = await getPackageVersion(root);
  const versionPattern = escapeRegExp(expectedVersion);
  const hasBoot = /(DOMContentLoaded|readyState|init|start)/i.test(text);
  const tokenSafe =
    scenario.engine !== "indiana-jones" ||
    /(replaceMappedToken|tokenBoundary|\[A-Za-zÀ-ž0-9_\])/i.test(text);
  const sharedVersion =
    new RegExp(`LUDUS STANDARD BLOCK START v${versionPattern}`).test(text) &&
    new RegExp(`var VERSION=["']${versionPattern}["']`).test(text);

  return {
    pass: hasBoot && tokenSafe && sharedVersion,
    evidence: [
      `engine=${scenario.engine}`,
      `boot=${hasBoot}`,
      `tokenSafe=${tokenSafe}`,
      `standard=${sharedVersion}`,
      `expectedVersion=${expectedVersion}`,
      `stage=${scenario.stage}`,
      `content=${scenario.content}`,
      `device=${scenario.device}`,
    ].join("; "),
  };
}
