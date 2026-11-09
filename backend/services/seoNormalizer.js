import { createCheck, scoreFromChecks, summarizeChecks } from "../utils/auditCheck.js";

function passFail(value, predicate = Boolean) {
  return predicate(value) ? "pass" : "fail";
}

export function normalizeSeoResult(input = {}, url = "") {
  const title = input.title?.value ?? input.title ?? "";
  const metaDescription = input.metaDescription?.value ?? input.metaDescription ?? input.description ?? "";
  const headings = input.headings ?? {};
  const h1 = input.h1 ?? headings.h1 ?? [];
  const canonical = input.canonical?.value ?? input.canonical ?? "";
  const robots = input.robots ?? input.robotsTxt ?? null;
  const sitemap = input.sitemap ?? input.sitemapUrl ?? null;
  const checks = [
    createCheck({ id: "seo-title", category: "seo", label: "Meta title", status: passFail(title), url, expected: "Present", actual: title || "Missing", recommendation: title ? "" : "Add a unique descriptive title.", severity: "high" }),
    createCheck({ id: "seo-description", category: "seo", label: "Meta description", status: passFail(metaDescription), url, expected: "Present", actual: metaDescription || "Missing", recommendation: metaDescription ? "" : "Add a useful meta description.", severity: "medium" }),
    createCheck({ id: "seo-h1", category: "seo", label: "H1 heading", status: passFail(h1, (v) => Array.isArray(v) ? v.length === 1 : Boolean(v)), url, expected: "Exactly one primary H1", actual: Array.isArray(h1) ? `${h1.length} H1 element(s)` : (h1 || "Missing"), recommendation: Array.isArray(h1) && h1.length === 1 ? "" : "Use one clear primary H1 on the page.", severity: "medium" }),
    createCheck({ id: "seo-canonical", category: "seo", label: "Canonical URL", status: passFail(canonical), url, expected: "Present", actual: canonical || "Missing", recommendation: canonical ? "" : "Add a canonical link tag.", severity: "medium" }),
    createCheck({ id: "seo-robots", category: "seo", label: "robots.txt", status: robots === false ? "fail" : robots ? "pass" : "warning", url, expected: "Accessible and intentional", actual: robots === false ? "Unavailable" : robots ? "Detected" : "Not supplied", recommendation: robots ? "" : "Verify robots.txt in the existing SEO scanner.", severity: "medium" }),
    createCheck({ id: "seo-sitemap", category: "seo", label: "XML sitemap", status: sitemap === false ? "fail" : sitemap ? "pass" : "warning", url, expected: "Accessible sitemap", actual: sitemap === false ? "Unavailable" : sitemap ? String(sitemap) : "Not supplied", recommendation: sitemap ? "" : "Verify sitemap discovery in the existing SEO scanner.", severity: "medium" }),
  ];
  return { name: "SEO", score: input.score ?? scoreFromChecks(checks), summary: summarizeChecks(checks), checks, raw: input };
}
