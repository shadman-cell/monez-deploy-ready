import { normalizeSeoResult } from "../services/seoNormalizer.js";
import { normalizePerformanceResult } from "../services/performanceNormalizer.js";
import { normalizeWebsiteQaResult } from "../services/websiteQaNormalizer.js";
import { createCheck, scoreFromChecks, summarizeChecks } from "../utils/auditCheck.js";
import { buildAudit } from "../services/auditSummary.js";

export function createDemoAudit() {
  const url = "https://example.com";
  const seo = normalizeSeoResult({ title: "Example Website", metaDescription: "A sample audit used by Monez.", h1: ["Example Website"], canonical: url, robots: true, sitemap: `${url}/sitemap.xml` }, url);
  const aeoChecks = [
    createCheck({ id: "aeo-demo-1", category: "aeo", label: "Answer-first introduction", status: "pass", url, actual: "Clear summary paragraph detected" }),
    createCheck({ id: "aeo-demo-2", category: "aeo", label: "Question-led coverage", status: "warning", url, actual: "1 question-style heading", recommendation: "Add useful question-led sections where relevant." }),
    createCheck({ id: "aeo-demo-3", category: "aeo", label: "Direct answer blocks", status: "pass", url, actual: "2 answer blocks detected" }),
    createCheck({ id: "aeo-demo-4", category: "aeo", label: "Scannable answer formats", status: "pass", url, actual: "Lists and definitions detected" }),
  ];
  const aeo = { name: "AEO", score: scoreFromChecks(aeoChecks), summary: summarizeChecks(aeoChecks), checks: aeoChecks, note: "Monez AEO is a practical Answer Engine Optimization readiness score." };
  const geoChecks = [
    createCheck({ id: "geo-demo-1", category: "geo", label: "Answer-ready content", status: "pass", url, actual: "820 words · clear introductory answer" }),
    createCheck({ id: "geo-demo-2", category: "geo", label: "Structured data signals", status: "pass", url, actual: "Organization, WebSite" }),
    createCheck({ id: "geo-demo-3", category: "geo", label: "Entity clarity", status: "pass", url, actual: "Organization schema detected" }),
    createCheck({ id: "geo-demo-4", category: "geo", label: "Question / FAQ coverage", status: "warning", url, actual: "1 question-style heading", recommendation: "Add useful question-led sections where appropriate." }),
    createCheck({ id: "geo-demo-5", category: "geo", label: "Authorship / trust signal", status: "warning", url, actual: "No explicit author detected" }),
    createCheck({ id: "geo-demo-6", category: "geo", label: "AI crawler directives", status: "pass", url, actual: "No explicit blanket AI-bot block detected" }),
  ];
  const geo = { name: "GEO", score: scoreFromChecks(geoChecks), summary: summarizeChecks(geoChecks), checks: geoChecks, note: "Monez GEO is a heuristic Generative Engine Optimization readiness score, not an official search-engine metric." };
  const performance = normalizePerformanceResult({ score: 76, metrics: { fcp: 1250, lcp: 3150, cls: 0.06, tbt: 220, loadTime: 3420, ttfb: 410, totalTransfer: 2850000, resourceCount: 74 }, issues: [{ label: "Large hero image", status: "warning", evidence: "Hero image is approximately 1.2 MB.", recommendation: "Compress and serve a responsive next-generation image." }] }, url);
  const responsiveChecks = [
    createCheck({ id: "demo-r1", category: "responsive", label: "Desktop — Horizontal overflow", status: "pass", url }),
    createCheck({ id: "demo-r2", category: "responsive", label: "Tablet — Horizontal overflow", status: "pass", url }),
    createCheck({ id: "demo-r3", category: "responsive", label: "Mobile — Horizontal overflow", status: "fail", url, actual: "34px overflow", recommendation: "Fix the fixed-width CTA container.", severity: "high" }),
    createCheck({ id: "demo-r4", category: "responsive", label: "Viewport meta", status: "pass", url }),
  ];
  const responsive = { name: "Responsive", score: scoreFromChecks(responsiveChecks), summary: summarizeChecks(responsiveChecks), checks: responsiveChecks, devices: [
    { name: "Desktop", width: 1440, height: 900, overflow: 0, viewportMeta: "width=device-width, initial-scale=1", tinyTargets: 0 },
    { name: "Tablet", width: 768, height: 1024, overflow: 0, viewportMeta: "width=device-width, initial-scale=1", tinyTargets: 3 },
    { name: "Mobile", width: 375, height: 812, overflow: 34, viewportMeta: "width=device-width, initial-scale=1", tinyTargets: 9 },
  ] };
  const websiteQA = normalizeWebsiteQaResult({ checks: [
    { id: "demo-q1", label: "Broken links", status: "pass", actual: "0 broken links" },
    { id: "demo-q2", label: "Images load", status: "pass", actual: "24/24 images loaded" },
    { id: "demo-q3", label: "Image ALT coverage", status: "warning", actual: "2 images without ALT", recommendation: "Review meaningful images and add ALT text." },
    { id: "demo-q4", label: "Buttons clickable", status: "pass", actual: "12/12 visible buttons enabled" },
  ] }, url);
  return buildAudit({ url, seo, aeo, geo, performance, responsive, websiteQA, metadata: { mode: "demo" } });
}
