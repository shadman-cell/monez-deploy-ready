import { runAudit } from "../mcpSeo/tools/seoAudit.js";
import { createCheck, summarizeChecks } from "../utils/auditCheck.js";

function severityToStatus(severity) {
  const s = String(severity || "").toLowerCase();
  return s === "high" ? "fail" : s === "medium" ? "warning" : "warning";
}

function safe(v, fallback = "") { return v ?? fallback; }

export async function runMcpSeoAudit(url, options = {}) {
  const report = await runAudit(url, { expectedSchemaTypes: options.expectedSchemaTypes || undefined });
  const page = report.details?.page || {};
  const technical = report.details?.technicalSEO || {};
  const onPage = report.details?.onPageSEO || {};

  const checks = [
    createCheck({ id: "seo-title", category: "seo", label: "Meta title", status: page.title ? "pass" : "fail", url, expected: "Present and descriptive", actual: page.title || "Missing", recommendation: page.title ? "" : "Add a unique descriptive title.", severity: "high" }),
    createCheck({ id: "seo-description", category: "seo", label: "Meta description", status: page.metaDescription ? "pass" : "fail", url, expected: "Present and useful", actual: page.metaDescription || "Missing", recommendation: page.metaDescription ? "" : "Add a concise meta description.", severity: "medium" }),
    createCheck({ id: "seo-h1", category: "seo", label: "Primary H1", status: Array.isArray(page.h1) && page.h1.length === 1 ? "pass" : "warning", url, expected: "Exactly one clear H1", actual: Array.isArray(page.h1) ? `${page.h1.length} H1 element(s)` : "Unavailable", evidence: Array.isArray(page.h1) ? page.h1.join(" | ") : "", recommendation: Array.isArray(page.h1) && page.h1.length === 1 ? "" : "Use one clear primary H1 where appropriate.", severity: "medium" }),
    createCheck({ id: "seo-https", category: "seo", label: "HTTPS", status: technical.https === false ? "fail" : "pass", url, expected: "HTTPS enabled", actual: technical.https === false ? "Not secure" : "HTTPS detected", recommendation: technical.https === false ? "Serve the site over HTTPS." : "", severity: "high" }),
    createCheck({ id: "seo-robots", category: "seo", label: "robots.txt", status: technical.robots?.found ? (technical.robots?.blocksEverything ? "fail" : "pass") : "warning", url, expected: "Accessible and not blocking the full production site", actual: technical.robots?.found ? (technical.robots?.blocksEverything ? "Blocks all crawling" : "Detected") : "Missing/unreachable", recommendation: technical.robots?.found ? "" : "Add and verify robots.txt.", severity: "medium" }),
    createCheck({ id: "seo-sitemap", category: "seo", label: "XML sitemap", status: technical.sitemap?.found ? "pass" : "warning", url, expected: "Accessible XML sitemap", actual: technical.sitemap?.found ? `${technical.sitemap.url} (${technical.sitemap.urlCount || 0} entry/entries)` : "Not found", recommendation: technical.sitemap?.found ? "" : "Publish an XML sitemap and reference it from robots.txt.", severity: "medium" }),
  ];

  for (const [index, issue] of (report.issues || []).entries()) {
    checks.push(createCheck({
      id: `seo-mcp-${index}`,
      category: "seo",
      label: issue.title || "SEO issue",
      status: severityToStatus(issue.severity),
      url: issue.url || url,
      expected: "SEO best-practice requirement satisfied",
      actual: issue.evidence || "Issue detected by SEO Audit MCP",
      evidence: issue.evidence || "",
      recommendation: issue.recommendation || "Review and resolve this SEO issue.",
      severity: String(issue.severity || "medium").toLowerCase(),
      meta: { source: "seo-audit-mcp" },
    }));
  }

  return {
    name: "SEO",
    score: Math.max(0, Math.min(100, Math.round(Number(report.score || 0) * 10))),
    summary: summarizeChecks(checks),
    checks,
    raw: report,
    mcpCategories: Object.fromEntries(Object.entries(report.categories || {}).map(([k, v]) => [k, Math.round(Number(v || 0) * 10) / 10])),
    topIssues: (report.issues || []).slice(0, 10),
    source: "SEO Audit MCP",
    note: "SEO result is powered by the supplied SEO Audit MCP pipeline.",
  };
}
