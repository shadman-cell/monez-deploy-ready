import { scanBasicPerformance } from "./basicPerformanceScanner.js";

export async function scanPerformance(page, url, mcpSeo = null) {
  const result = await scanBasicPerformance(page, url);
  const mcpPerf = mcpSeo?.raw?.details?.performance || mcpSeo?.details?.performance || null;
  if (mcpPerf?.engine === "lighthouse" && Number.isFinite(Number(mcpPerf.performance))) {
    result.score = Math.round(Number(mcpPerf.performance));
    result.engine = "lighthouse+browser";
    result.lighthouse = {
      performance: mcpPerf.performance,
      seo: mcpPerf.seo,
      accessibility: mcpPerf.accessibility,
      bestPractices: mcpPerf.bestPractices,
    };
    result.note = "Score uses Lighthouse from the supplied SEO MCP when available; visual metrics come from the Monez browser session.";
  } else {
    result.engine = "browser";
    result.note = "Performance uses Monez browser metrics. Lighthouse is used automatically when available through the SEO MCP dependencies.";
  }
  return result;
}
