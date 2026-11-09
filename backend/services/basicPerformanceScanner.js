import { normalizePerformanceResult } from "./performanceNormalizer.js";

export async function installPerformanceObservers(page) {
  await page.addInitScript(() => {
    window.__monezVitals = { cls: 0, lcp: 0, tbt: 0 };
    try {
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last = entries[entries.length - 1];
        if (last) window.__monezVitals.lcp = last.startTime || 0;
      }).observe({ type: "largest-contentful-paint", buffered: true });
    } catch {}
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) window.__monezVitals.cls += entry.value || 0;
        }
      }).observe({ type: "layout-shift", buffered: true });
    } catch {}
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const blocking = Math.max(0, (entry.duration || 0) - 50);
          window.__monezVitals.tbt += blocking;
        }
      }).observe({ type: "longtask", buffered: true });
    } catch {}
  });
}

export async function scanBasicPerformance(page, url) {
  const data = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0];
    const paints = performance.getEntriesByType("paint");
    const fcp = paints.find((p) => p.name === "first-contentful-paint")?.startTime ?? null;
    const resources = performance.getEntriesByType("resource");
    const totalTransfer = resources.reduce((s, r) => s + (r.transferSize || 0), 0);
    const large = resources.filter((r) => (r.transferSize || 0) > 500_000).sort((a,b) => (b.transferSize || 0) - (a.transferSize || 0)).slice(0, 6);
    const vitals = window.__monezVitals || {};
    return {
      metrics: {
        fcp,
        lcp: Number(vitals.lcp || 0) || null,
        cls: Number.isFinite(Number(vitals.cls)) ? Number(vitals.cls) : null,
        tbt: Number.isFinite(Number(vitals.tbt)) ? Number(vitals.tbt) : null,
        loadTime: nav ? nav.loadEventEnd || nav.duration : null,
        domContentLoaded: nav ? nav.domContentLoadedEventEnd : null,
        ttfb: nav ? nav.responseStart : null,
        resourceCount: resources.length,
        totalTransfer,
      },
      largeResources: large.map((r) => ({ name: r.name, size: r.transferSize })),
    };
  });

  const issues = [];
  if (data.metrics.resourceCount > 120) issues.push({ label: "High resource count", evidence: `${data.metrics.resourceCount} resources loaded.`, recommendation: "Reduce unnecessary scripts, styles and third-party resources.", status: "warning" });
  if (data.metrics.totalTransfer > 5_000_000) issues.push({ label: "Large transfer size", evidence: `${(data.metrics.totalTransfer / 1_000_000).toFixed(2)} MB transferred.`, recommendation: "Compress images and reduce JavaScript/CSS payloads.", status: "fail", severity: "high" });
  else if (data.metrics.totalTransfer > 2_500_000) issues.push({ label: "Transfer size could be reduced", evidence: `${(data.metrics.totalTransfer / 1_000_000).toFixed(2)} MB transferred.`, recommendation: "Review heavy images, fonts and scripts.", status: "warning" });
  for (const resource of data.largeResources) issues.push({ label: "Large resource", evidence: `${resource.name} — ${(resource.size / 1_000_000).toFixed(2)} MB`, recommendation: "Compress, resize, lazy-load or split this resource.", status: "warning" });

  return normalizePerformanceResult({ metrics: data.metrics, issues }, url);
}
