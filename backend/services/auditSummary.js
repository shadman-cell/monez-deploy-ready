import { summarizeChecks } from "../utils/auditCheck.js";

const WEBSITE_WEIGHTS = { seo: 0.20, aeo: 0.15, geo: 0.15, performance: 0.22, responsive: 0.16, websiteQA: 0.12 };

export function buildAudit({ id, url, seo, aeo, geo, performance, responsive, websiteQA, metadata = {} }) {
  const all = { seo, aeo, geo, performance, responsive, websiteQA };
  const categories = Object.fromEntries(Object.entries(all).filter(([, value]) => value));
  const checks = Object.values(categories).flatMap((c) => c?.checks || []);
  const summary = summarizeChecks(checks);

  let weighted = 0;
  let usedWeight = 0;
  for (const [key, category] of Object.entries(categories)) {
    if (category?.score !== null && category?.score !== undefined && WEBSITE_WEIGHTS[key] != null) {
      const w = WEBSITE_WEIGHTS[key];
      weighted += Number(category.score) * w;
      usedWeight += w;
    }
  }
  const overallScore = usedWeight ? Math.round(weighted / usedWeight) : 0;

  return {
    id,
    schemaVersion: "3.1",
    reportType: "website-audit",
    url,
    scannedAt: new Date().toISOString(),
    overallScore,
    summary,
    categories,
    checks,
    passedChecks: checks.filter((c) => c.status === "pass"),
    failedChecks: checks.filter((c) => c.status === "fail"),
    warnings: checks.filter((c) => c.status === "warning"),
    metadata,
  };
}
