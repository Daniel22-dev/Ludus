import { setupErrorReporter } from './error-reporter.js';

const deployment = globalThis.__GHRAB_DEPLOYMENT_CONFIG__;
const reporterStudioUrl = deployment?.studioBaseUrl || '/AI-Studio-GHRAB/';
const reporterStudioBase = new URL(reporterStudioUrl, document.baseURI);
const reporterGuideUrl = deployment?.access?.guideUrl || new URL('manualy/error-report.html', reporterStudioBase).href;

function detectLudusTheme() {
  const explicit = document.documentElement.dataset.theme || document.body?.dataset?.theme;
  if (explicit === 'light' || explicit === 'dark') return explicit;
  if (document.documentElement.classList.contains('light') || document.body?.classList.contains('light')) return 'light';
  if (document.documentElement.classList.contains('dark') || document.body?.classList.contains('dark')) return 'dark';
  const match = getComputedStyle(document.body).backgroundColor.match(/[\d.]+/g)?.slice(0, 3).map(Number);
  if (match?.length === 3) {
    const luminance = (0.2126 * match[0]) + (0.7152 * match[1]) + (0.0722 * match[2]);
    return luminance >= 150 ? 'light' : 'dark';
  }
  return 'dark';
}

const reporter = setupErrorReporter({
  appId: 'ludus',
  appName: 'LUDUS',
  appVersion: '1.16.12',
  studioUrl: reporterStudioUrl,
  supportEmail: 'balaz@ghrabuvka.cz',
  guideUrl: reporterGuideUrl,
  themeResolver: () => detectLudusTheme(),
  launcherBottom: '82px',
  captureBottom: '104px',
});

export default reporter;
