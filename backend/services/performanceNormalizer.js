import { createCheck, scoreFromChecks, summarizeChecks } from "../utils/auditCheck.js";

function metricCheck({ id, label, value, good, poor, unit = "ms", url }) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return createCheck({ id, category: "performance", label, status: "warning", url, expected: `Metric available`, actual: "Not available", severity: "low" });
  }
  const n = Number(value);
  const status = n <= good ? "pass" : n >= poor ? "fail" : "warning";
  return createCheck({
    id,
    category: "performance",
    label,
    status,
    url,
    expected: `Good ≤ ${good}${unit}`,
    actual: `${Number(n.toFixed(2))}${unit}`,
    recommendation: status === "fail" ? `Investigate ${label} and the resources blocking or delaying the page.` : "",
    severity: status === "fail" ? "high" : "medium",
  });
}

export function normalizePerformanceResult(input = {}, url = "") {
  const metrics = input.metrics ?? input;
  const checks = [
    metricCheck({ id: "perf-fcp", label: "First Contentful Paint", value: metrics.fcp, good: 1800, poor: 3000, url }),
    metricCheck({ id: "perf-lcp", label: "Largest Contentful Paint", value: metrics.lcp, good: 2500, poor: 4000, url }),
    metricCheck({ id: "perf-cls", label: "Cumulative Layout Shift", value: metrics.cls, good: 0.1, poor: 0.25, unit: "", url }),
    metricCheck({ id: "perf-tbt", label: "Total Blocking Time", value: metrics.tbt, good: 200, poor: 600, url }),
    metricCheck({ id: "perf-load", label: "Load time", value: metrics.loadTime, good: 3000, poor: 6000, url }),
  ];
  for (const issue of input.issues || []) {
    checks.push(createCheck({
      id: issue.id || `perf-issue-${checks.length}`,
      category: "performance",
      label: issue.label || issue.title || "Performance issue",
      status: issue.status || "fail",
      url,
      evidence: issue.evidence || issue.description || "",
      recommendation: issue.recommendation || "Review this performance issue.",
      severity: issue.severity || "medium",
    }));
  }
  return { name: "Performance", score: input.score ?? scoreFromChecks(checks), summary: summarizeChecks(checks), metrics, checks, raw: input };
}

export function normalizeLighthouseResult(lhr = {}, url = "") {
  const audits = lhr.audits || lhr?.lhr?.audits || {};
  const categories = lhr.categories || lhr?.lhr?.categories || {};
  const numeric = (id) => audits[id]?.numericValue ?? null;
  return normalizePerformanceResult({
    score: categories.performance?.score != null ? Math.round(categories.performance.score * 100) : undefined,
    metrics: {
      fcp: numeric("first-contentful-paint"),
      lcp: numeric("largest-contentful-paint"),
      cls: numeric("cumulative-layout-shift"),
      tbt: numeric("total-blocking-time"),
      loadTime: numeric("speed-index"),
    },
    issues: Object.values(audits)
      .filter((a) => a && a.score != null && a.score < 0.5 && a.title)
      .slice(0, 8)
      .map((a) => ({ label: a.title, evidence: a.description || "", status: "fail", severity: "medium" })),
  }, url);
}
