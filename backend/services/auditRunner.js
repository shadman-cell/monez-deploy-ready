import { chromium } from "playwright";
import { runMcpSeoAudit } from "./mcpSeoService.js";
import { scanAeo } from "./aeoScanner.js";
import { scanGeo } from "./geoScanner.js";
import { installPerformanceObservers } from "./basicPerformanceScanner.js";
import { scanPerformance } from "./performanceService.js";
import { runResponsiveAudit } from "./responsiveTester.js";
import { scanWebsiteQa } from "./websiteQaScanner.js";
import { buildAudit } from "./auditSummary.js";
import { createCheck, summarizeChecks } from "../utils/auditCheck.js";
import { safeGoto } from "../utils/navigation.js";

const SCAN_TIMEOUT_MS = Number(process.env.SCAN_TIMEOUT_MS || 60000);
const LINK_CHECK_LIMIT = Number(process.env.LINK_CHECK_LIMIT || 25);

function unavailableCategory(name, key, url, message) {
  const check = createCheck({
    id: `${key}-module-unavailable`, category: key, label: `${name} module completed with a warning`, status: "warning", url,
    expected: `${name} module completes`, actual: message || "Module did not complete", evidence: "The main audit continued instead of failing the full job.",
    recommendation: "Review the module error log and retry this audit if the website was temporarily slow or unavailable.", severity: "medium",
  });
  return { name, score: null, summary: summarizeChecks([check]), checks: [check], note: "This module did not complete, but Monez continued the remaining audit." };
}

async function safeModule(name, key, url, fn, onProgress) {
  try { return await fn(); }
  catch (error) {
    onProgress?.({ message: `${name} warning: ${error.message}`, level: "warning" });
    return unavailableCategory(name, key, url, error.message);
  }
}

export async function runFullAudit({ id, url, expectedSchemaTypes = [], onProgress = () => {} }) {
  const normalizedUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  const started = Date.now();
  const progress = (stage, value, message, level = "info") => onProgress({ stage, progress: value, message, level });

  progress("Starting", 5, "Starting resilient website audit");

  const seoPromise = safeModule("SEO", "seo", normalizedUrl, () => runMcpSeoAudit(normalizedUrl, { expectedSchemaTypes }), onProgress);
  let browser = null;
  let context = null;
  let page = null;
  let navigation = null;
  let aeo, geo, performance, websiteQA, responsive;

  try {
    progress("Opening website", 12, "Launching browser and opening the website");
    browser = await chromium.launch({ headless: true });
    context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    page = await context.newPage();
    await installPerformanceObservers(page);
    navigation = await safeGoto(page, normalizedUrl, { timeout: SCAN_TIMEOUT_MS, domReadyTimeout: 15000, renderWaitMs: 1100 });
    if (navigation.recoveredFromTimeout) progress("Opening website", 18, "Website was slow, but Monez recovered and continued", "warning");

    progress("SEO · AEO · GEO", 28, "Running SEO MCP, AEO and GEO analysis");
    const [seo, aeoResult, geoResult, qaResult] = await Promise.all([
      seoPromise,
      safeModule("AEO", "aeo", normalizedUrl, () => scanAeo(page, normalizedUrl), onProgress),
      safeModule("GEO", "geo", normalizedUrl, () => scanGeo(page, normalizedUrl), onProgress),
      safeModule("Website QA", "websiteQA", normalizedUrl, () => scanWebsiteQa(page, normalizedUrl, LINK_CHECK_LIMIT), onProgress),
    ]);
    aeo = aeoResult; geo = geoResult; websiteQA = qaResult;

    progress("Performance", 50, "Measuring performance and Core Web Vitals signals");
    performance = await safeModule("Performance", "performance", normalizedUrl, () => scanPerformance(page, normalizedUrl, seo), onProgress);

    await context.close(); context = null; page = null;

    progress("Responsive", 67, "Capturing desktop, tablet and mobile previews in parallel");
    responsive = await safeModule("Responsive", "responsive", normalizedUrl, () => runResponsiveAudit(browser, normalizedUrl, SCAN_TIMEOUT_MS), onProgress);

    progress("Building report", 88, "Combining SEO, AEO, GEO, performance, responsive and QA results");
    const audit = buildAudit({
      id,
      url: normalizedUrl,
      seo,
      aeo,
      geo,
      performance,
      responsive,
      websiteQA,
      metadata: {
        mode: "deploy-ready",
        navigation,
        durationMs: Date.now() - started,
        seoSource: "supplied SEO Audit MCP",
        expectedSchemaTypes,
      },
    });
    progress("Complete", 100, "Audit complete. Reports are ready.");
    return audit;
  } catch (error) {
    // If browser navigation fails completely, still preserve SEO MCP output in a useful report.
    progress("Recovery", 70, `Browser audit warning: ${error.message}`, "warning");
    const seo = await seoPromise;
    aeo ||= unavailableCategory("AEO", "aeo", normalizedUrl, error.message);
    geo ||= unavailableCategory("GEO", "geo", normalizedUrl, error.message);
    performance ||= unavailableCategory("Performance", "performance", normalizedUrl, error.message);
    responsive ||= unavailableCategory("Responsive", "responsive", normalizedUrl, error.message);
    websiteQA ||= unavailableCategory("Website QA", "websiteQA", normalizedUrl, error.message);
    const audit = buildAudit({ id, url: normalizedUrl, seo, aeo, geo, performance, responsive, websiteQA, metadata: { mode: "deploy-ready-recovered", browserError: error.message, durationMs: Date.now() - started } });
    progress("Complete with warnings", 100, "Audit completed with recoverable module warnings", "warning");
    return audit;
  } finally {
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
  }
}
