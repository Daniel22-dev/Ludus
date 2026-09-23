const DEFAULT_TIMEOUT_MS = 4000;
const REPORTER_MODULE = "./error-reporter-adapter.js";

export function startReporterBestEffort(moduleUrl = REPORTER_MODULE, options = {}) {
  if (moduleUrl !== REPORTER_MODULE) {
    console.warn("GHRAB reportér odmítl neznámý modul; aplikace pokračuje bez diagnostického panelu.");
    return Promise.resolve(null);
  }
  const timeoutMs = Math.max(250, Number(options.timeoutMs || DEFAULT_TIMEOUT_MS));
  const context = options.context || "application";
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const error = new Error("Časový limit načtení diagnostického reportéru.");
      error.name = "ReporterTimeoutError";
      reject(error);
    }, timeoutMs);
  });
  return Promise.race([import("./error-reporter-adapter.js"), timeout])
    .catch((error) => {
      console.warn("GHRAB reportér (" + context + ") nebyl načten; aplikace pokračuje bez diagnostického panelu.", error);
      return null;
    })
    .finally(() => clearTimeout(timer));
}
