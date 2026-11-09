/**
 * Runs a Lighthouse audit if the optional `lighthouse` + `chrome-launcher`
 * packages and a local Chrome/Chromium binary are available. If not
 * (e.g. a minimal server environment), falls back to a lightweight
 * heuristic check based on page weight, so the audit never hard-fails.
 */
export async function checkPerformance(url, page) {
  try {
    const { default: lighthouse } = await import("lighthouse");
    const chromeLauncher = await import("chrome-launcher");

    const chrome = await chromeLauncher.launch({ chromeFlags: ["--headless", "--no-sandbox"] });
    try {
      const runnerResult = await lighthouse(url, {
        port: chrome.port,
        onlyCategories: ["performance", "seo", "accessibility", "best-practices"],
        output: "json",
      });
      const cats = runnerResult.lhr.categories;
      return {
        engine: "lighthouse",
        performance: Math.round(cats.performance.score * 100),
        seo: Math.round(cats.seo.score * 100),
        accessibility: Math.round(cats.accessibility.score * 100),
        bestPractices: Math.round(cats["best-practices"].score * 100),
        issues: extractLighthouseIssues(runnerResult.lhr),
      };
    } finally {
      await chrome.kill();
    }
  } catch (err) {
    return heuristicPerformance(page, err.message);
  }
}

function extractLighthouseIssues(lhr) {
  const issues = [];
  for (const audit of Object.values(lhr.audits)) {
    if (audit.score !== null && audit.score < 0.9 && audit.scoreDisplayMode === "binary") {
      issues.push({ title: audit.title, severity: audit.score < 0.5 ? "High" : "Medium", recommendation: audit.description?.split(".")[0] || audit.title });
    }
  }
  return issues.slice(0, 10);
}

/**
 * Fallback used when Lighthouse/Chrome isn't available in this environment.
 * It's a rough proxy, not a real Core Web Vitals measurement — labelled as
 * such in the report so it's never confused for a Lighthouse score.
 */
function heuristicPerformance(page, reason) {
  const issues = [];
  let score = 90;

  if (page?.htmlSizeBytes > 500_000) {
    score -= 25;
    issues.push({ title: "HTML document is very large (>500KB)", severity: "Medium", recommendation: "Reduce inline scripts/styles and unused markup." });
  }
  const imgCount = page?.images?.length || 0;
  if (imgCount > 40) {
    score -= 15;
    issues.push({ title: `Page loads ${imgCount} images`, severity: "Medium", recommendation: "Lazy-load below-the-fold images and serve modern formats (WebP/AVIF)." });
  }

  return {
    engine: "heuristic",
    note: `Lighthouse unavailable in this environment (${reason}). Showing a heuristic estimate instead of real Core Web Vitals — run with Chrome installed for accurate scores.`,
    performance: Math.max(0, score),
    seo: null,
    accessibility: null,
    bestPractices: null,
    issues,
  };
}
