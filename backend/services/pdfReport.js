import PDFDocument from "pdfkit";
import { PassThrough } from "node:stream";

const C = { ink: "#172033", muted: "#667085", line: "#E4E7EC", accent: "#4F46E5", good: "#198754", warn: "#D97706", bad: "#DC2626", panel: "#F8FAFC" };
function scoreColor(v) { return v >= 80 ? C.good : v >= 60 ? C.warn : C.bad; }
function statusColor(s) { return s === "pass" ? C.good : s === "fail" ? C.bad : C.warn; }
function mark(s) { return s === "pass" ? "PASS" : s === "fail" ? "FAIL" : s === "warning" ? "WARN" : String(s || "INFO").toUpperCase(); }
function pageBreak(doc, need = 100) { if (doc.y + need > 755) doc.addPage(); }
function line(doc) { doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor(C.line).stroke(); }

function header(doc, title, subtitle, audit) {
  doc.fillColor(C.ink).font("Helvetica-Bold").fontSize(23).text(title);
  doc.font("Helvetica").fontSize(10).fillColor(C.muted).text(subtitle);
  doc.moveDown(.4);
  if (audit?.url) doc.text(audit.url);
  if (audit?.scannedAt) doc.text(`Generated: ${new Date(audit.scannedAt).toLocaleString()}`);
  doc.moveDown(.7); line(doc); doc.moveDown(.7);
}

function scoreHero(doc, audit) {
  const score = Number(audit.overallScore ?? 0);
  doc.font("Helvetica-Bold").fontSize(13).fillColor(C.ink).text("Overall Score");
  doc.fontSize(36).fillColor(scoreColor(score)).text(`${score} / 100`);
  const s = audit.summary || {};
  doc.font("Helvetica").fontSize(9).fillColor(C.muted).text(`Total ${s.total ?? 0}  •  Passed ${s.passed ?? 0}  •  Failed ${s.failed ?? 0}  •  Warnings ${s.warnings ?? 0}  •  Pass rate ${s.passPercentage ?? 0}%`);
  doc.moveDown(.8);
}

function categoryBars(doc, categories, keys = null) {
  const entries = Object.entries(categories || {}).filter(([key]) => !keys || keys.includes(key));
  const labels = { seo: "SEO", aeo: "AEO", geo: "GEO", performance: "Performance", responsive: "Responsive", websiteQA: "Website QA" };
  doc.font("Helvetica-Bold").fontSize(13).fillColor(C.ink).text("Category Breakdown"); doc.moveDown(.4);
  for (const [key, cat] of entries) {
    const value = cat?.score;
    const y = doc.y;
    doc.font("Helvetica").fontSize(9).fillColor(C.ink).text(labels[key] || cat?.name || key, 50, y, { width: 120 });
    doc.font("Helvetica-Bold").text(value == null ? "N/A" : `${value}/100`, 170, y, { width: 55 });
    doc.rect(230, y + 2, 285, 8).fill(C.line);
    if (value != null) doc.rect(230, y + 2, Math.max(2, Math.min(285, value / 100 * 285)), 8).fill(scoreColor(value));
    doc.y = y + 21;
  }
  doc.moveDown(.4);
}

function mcpSeoBreakdown(doc, seo) {
  if (!seo?.mcpCategories) return;
  pageBreak(doc, 150);
  doc.font("Helvetica-Bold").fontSize(13).fillColor(C.ink).text("SEO MCP Deep Audit");
  doc.font("Helvetica").fontSize(9).fillColor(C.muted).text("Technical SEO, On-Page SEO, Local SEO, Schema, Performance and Content scoring from the supplied SEO Audit MCP.");
  doc.moveDown(.45);
  const labels = { technicalSEO: "Technical SEO", onPageSEO: "On-Page SEO", localSEO: "Local SEO", schema: "Schema Markup", performance: "MCP Performance", content: "Content" };
  for (const [key, value] of Object.entries(seo.mcpCategories)) {
    const y = doc.y;
    doc.font("Helvetica").fontSize(9).fillColor(C.ink).text(labels[key] || key, 50, y, { width: 120 });
    doc.font("Helvetica-Bold").text(`${value}/10`, 170, y, { width: 45 });
    doc.rect(220, y + 2, 250, 7).fill(C.line);
    doc.rect(220, y + 2, Math.max(2, Math.min(250, value / 10 * 250)), 7).fill(value >= 8 ? C.good : value >= 5 ? C.warn : C.bad);
    doc.y = y + 19;
  }
  doc.moveDown(.4);
}

function checks(doc, title, list = [], max = null) {
  pageBreak(doc, 80);
  doc.font("Helvetica-Bold").fontSize(13).fillColor(C.ink).text(title);
  doc.moveDown(.4);
  const items = max ? list.slice(0, max) : list;
  if (!items.length) { doc.font("Helvetica").fontSize(9).fillColor(C.muted).text("No items to show."); doc.moveDown(.6); return; }
  for (const item of items) {
    pageBreak(doc, 90);
    const y = doc.y;
    doc.circle(54, y + 5, 3).fill(statusColor(item.status));
    doc.font("Helvetica-Bold").fontSize(9.5).fillColor(C.ink).text(`${mark(item.status)}  ${item.label}`, 66, y, { width: 470 });
    if (item.actual) doc.font("Helvetica").fontSize(8.5).fillColor(C.muted).text(`Actual: ${String(item.actual).slice(0, 420)}`, 66, doc.y + 2, { width: 470 });
    if (item.evidence) doc.text(`Evidence: ${String(item.evidence).slice(0, 520)}`, 66, doc.y + 2, { width: 470 });
    if (item.recommendation) doc.fillColor(C.ink).text(`Fix: ${String(item.recommendation).slice(0, 520)}`, 66, doc.y + 2, { width: 470 });
    doc.moveDown(.55);
  }
}

function performanceSection(doc, perf) {
  if (!perf) return;
  pageBreak(doc, 160);
  doc.font("Helvetica-Bold").fontSize(14).fillColor(C.ink).text("Performance Report");
  doc.font("Helvetica").fontSize(9).fillColor(C.muted).text(`${perf.engine || "browser"} engine · ${perf.note || ""}`); doc.moveDown(.5);
  const m = perf.metrics || {};
  const metrics = [["FCP", m.fcp, "ms"], ["LCP", m.lcp, "ms"], ["CLS", m.cls, ""], ["TBT", m.tbt, "ms"], ["Load", m.loadTime, "ms"], ["TTFB", m.ttfb, "ms"], ["Resources", m.resourceCount, ""], ["Transfer", m.totalTransfer != null ? (m.totalTransfer / 1_000_000).toFixed(2) : null, "MB"]];
  let x = 50; let y = doc.y;
  metrics.forEach(([label, value, unit], index) => {
    if (index && index % 4 === 0) { x = 50; y += 52; }
    doc.roundedRect(x, y, 115, 42, 5).fill(C.panel);
    doc.font("Helvetica").fontSize(7.5).fillColor(C.muted).text(label, x + 8, y + 7, { width: 99 });
    doc.font("Helvetica-Bold").fontSize(12).fillColor(C.ink).text(value == null ? "N/A" : `${typeof value === "number" ? Number(value.toFixed?.(2) ?? value) : value}${unit}`, x + 8, y + 20, { width: 99 });
    x += 123;
  });
  doc.y = y + 56;
  checks(doc, "Performance issues & recommendations", (perf.checks || []).filter((c) => c.status !== "pass"));
}

function responsiveSection(doc, responsive) {
  if (!responsive) return;
  pageBreak(doc, 120);
  doc.font("Helvetica-Bold").fontSize(14).fillColor(C.ink).text("Responsive Visual Verification"); doc.moveDown(.4);
  for (const device of responsive.devices || []) {
    pageBreak(doc, 180);
    doc.font("Helvetica-Bold").fontSize(10).fillColor(C.ink).text(`${device.name}  ${device.width} × ${device.height}`);
    doc.font("Helvetica").fontSize(8).fillColor(C.muted).text(`Overflow: ${Math.max(0, Math.round(device.overflow || 0))}px  •  Small targets: ${device.tinyTargets ?? 0}`);
    if (device.screenshot?.startsWith("data:image")) {
      try {
        const buf = Buffer.from(device.screenshot.split(",")[1], "base64");
        doc.image(buf, 50, doc.y + 6, { fit: [495, 150], align: "center" });
        doc.y += 160;
      } catch {}
    }
    doc.moveDown(.3);
  }
}

function footer(doc, label = "Monez") {
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(i);
    doc.font("Helvetica").fontSize(7.5).fillColor(C.muted).text(`${label}  •  Page ${i + 1} of ${range.count}`, 50, 815, { width: 495, align: "center", lineBreak: false });
  }
}

export function createAuditPdf(audit, stream, { type = "full" } = {}) {
  const doc = new PDFDocument({ size: "A4", margin: 50, bufferPages: true });
  doc.pipe(stream);
  const isPerformance = type === "performance";
  const isSeo = type === "seo";
  header(doc, isPerformance ? "Performance Audit Report" : isSeo ? "SEO · AEO · GEO Audit Report" : "Monez Website Audit Report", isPerformance ? "Performance metrics, issues and recommendations" : isSeo ? "SEO powered by supplied MCP + dedicated AEO and GEO readiness" : "SEO · AEO · GEO · Performance · Responsive · Website QA", audit);
  if (!isPerformance && !isSeo) scoreHero(doc, audit);
  categoryBars(doc, audit.categories, isPerformance ? ["performance"] : isSeo ? ["seo", "aeo", "geo"] : null);
  if (!isPerformance) mcpSeoBreakdown(doc, audit.categories?.seo);
  if (isSeo || type === "full") {
    checks(doc, "SEO issues & recommendations", audit.categories?.seo?.checks || []);
    checks(doc, "AEO checks", audit.categories?.aeo?.checks || []);
    checks(doc, "GEO checks", audit.categories?.geo?.checks || []);
  }
  if (isPerformance || type === "full") performanceSection(doc, audit.categories?.performance);
  if (type === "full") {
    responsiveSection(doc, audit.categories?.responsive);
    checks(doc, "Website QA", audit.categories?.websiteQA?.checks || []);
    checks(doc, "Failed / bug results", audit.failedChecks || []);
  }
  footer(doc, "Generated by Monez");
  doc.end();
}

export function createWeeklyPdf(summary, stream) {
  const doc = new PDFDocument({ size: "A4", margin: 50, bufferPages: true });
  doc.pipe(stream);
  header(doc, "Monez Weekly Website Report", "7-day audit history and performance summary", { url: summary.url, scannedAt: summary.generatedAt });
  doc.font("Helvetica-Bold").fontSize(26).fillColor(scoreColor(summary.averagePerformance ?? 0)).text(summary.averagePerformance == null ? "N/A" : `${summary.averagePerformance}/100`);
  doc.font("Helvetica").fontSize(9).fillColor(C.muted).text(`Average performance · ${summary.auditCount} audit(s) in this report`);
  doc.moveDown(.8);
  const cards = [["Latest performance", summary.latestPerformance], ["7-day change", summary.performanceChange == null ? null : `${summary.performanceChange >= 0 ? "+" : ""}${summary.performanceChange}`], ["Lowest", summary.lowestPerformance], ["Highest", summary.highestPerformance]];
  let x = 50; const y = doc.y;
  for (const [label, value] of cards) { doc.roundedRect(x, y, 115, 48, 5).fill(C.panel); doc.font("Helvetica").fontSize(7.5).fillColor(C.muted).text(label, x+8, y+8, { width: 98 }); doc.font("Helvetica-Bold").fontSize(13).fillColor(C.ink).text(value == null ? "N/A" : String(value), x+8, y+24, { width: 98 }); x += 123; }
  doc.y = y + 64;
  doc.font("Helvetica-Bold").fontSize(13).fillColor(C.ink).text("Average category scores"); doc.moveDown(.3);
  for (const [key, value] of Object.entries(summary.categoryAverages || {})) {
    doc.font("Helvetica").fontSize(9).fillColor(C.ink).text(`${key.toUpperCase()}: ${value == null ? "N/A" : `${value}/100`}`);
  }
  doc.moveDown(.8);
  doc.font("Helvetica-Bold").fontSize(13).text("Audit history"); doc.moveDown(.4);
  for (const item of summary.audits || []) { pageBreak(doc, 30); doc.font("Helvetica").fontSize(8.5).fillColor(C.ink).text(`${new Date(item.scannedAt).toLocaleString()}  •  Overall ${item.overallScore ?? "N/A"}  •  Performance ${item.performance ?? "N/A"}  •  SEO ${item.seo ?? "N/A"}  •  AEO ${item.aeo ?? "N/A"}  •  GEO ${item.geo ?? "N/A"}`); }
  footer(doc, "Generated by Monez");
  doc.end();
}

function toBuffer(builder) {
  return new Promise((resolve, reject) => {
    const stream = new PassThrough();
    const chunks = [];
    stream.on("data", (c) => chunks.push(c)); stream.on("end", () => resolve(Buffer.concat(chunks))); stream.on("error", reject);
    builder(stream);
  });
}
export const renderAuditPdfBuffer = (audit, type = "full") => toBuffer((stream) => createAuditPdf(audit, stream, { type }));
export const renderWeeklyPdfBuffer = (summary) => toBuffer((stream) => createWeeklyPdf(summary, stream));
