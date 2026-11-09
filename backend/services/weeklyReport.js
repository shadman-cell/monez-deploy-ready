export function buildWeeklySummary(url, audits = []) {
  const ordered = [...audits].sort((a, b) => new Date(a.scannedAt) - new Date(b.scannedAt));
  const perf = ordered.map((a) => Number(a.categories?.performance?.score)).filter(Number.isFinite);
  const avg = (values) => values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null;
  const categoryKeys = ["seo", "aeo", "geo", "performance", "responsive", "websiteQA"];
  const categoryAverages = Object.fromEntries(categoryKeys.map((key) => [key, avg(ordered.map((a) => Number(a.categories?.[key]?.score)).filter(Number.isFinite))]));
  const first = perf[0] ?? null;
  const latest = perf.at(-1) ?? null;
  return {
    url,
    generatedAt: new Date().toISOString(),
    periodDays: 7,
    auditCount: ordered.length,
    averagePerformance: avg(perf),
    latestPerformance: latest,
    performanceChange: first != null && latest != null ? latest - first : null,
    lowestPerformance: perf.length ? Math.min(...perf) : null,
    highestPerformance: perf.length ? Math.max(...perf) : null,
    categoryAverages,
    audits: ordered.map((a) => ({ id: a.id, scannedAt: a.scannedAt, overallScore: a.overallScore, performance: a.categories?.performance?.score ?? null, seo: a.categories?.seo?.score ?? null, aeo: a.categories?.aeo?.score ?? null, geo: a.categories?.geo?.score ?? null })),
  };
}
