import fs from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";

const COLORS = {
  ink: "#1a1a2e",
  muted: "#5b5b6b",
  line: "#e2e2e8",
  high: "#d64545",
  medium: "#e0a02c",
  low: "#3d8b6a",
  accent: "#2f5fda",
};

function severityColor(sev) {
  return { High: COLORS.high, Medium: COLORS.medium, Low: COLORS.low }[sev] || COLORS.muted;
}

export function writeJsonReport(report, outDir = "reports/json") {
  fs.mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, `${slug(report.website)}-${dateStamp()}.json`);
  fs.writeFileSync(file, JSON.stringify(report, null, 2));
  return file;
}

export function writePdfReport(report, outDir = "reports/pdf") {
  fs.mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, `${slug(report.website)}-seo-audit-${dateStamp()}.pdf`);

  const doc = new PDFDocument({ size: "A4", margin: 50, bufferPages: true });
  doc.pipe(fs.createWriteStream(file));

  drawHeader(doc, report);
  drawScoreSummary(doc, report);
  drawCategoryTable(doc, report);
  drawIssues(doc, report);
  drawFooter(doc);

  doc.end();
  return file;
}

function drawHeader(doc, report) {
  doc.fillColor(COLORS.ink).fontSize(22).font("Helvetica-Bold").text("SEO Audit Report");
  doc.moveDown(0.2);
  doc.fontSize(12).font("Helvetica").fillColor(COLORS.muted)
    .text(`${report.website}  •  ${report.url}`);
  doc.text(`Generated: ${new Date(report.auditedAt).toLocaleString()}`);
  doc.moveDown(1);
  line(doc);
  doc.moveDown(0.8);
}

function drawScoreSummary(doc, report) {
  const scoreColor = report.score >= 8 ? COLORS.low : report.score >= 5 ? COLORS.medium : COLORS.high;
  doc.fontSize(14).font("Helvetica-Bold").fillColor(COLORS.ink).text("Overall Score");
  doc.moveDown(0.3);
  doc.fontSize(36).font("Helvetica-Bold").fillColor(scoreColor).text(`${report.score} / 10`);
  doc.moveDown(0.6);
  doc.fontSize(10).font("Helvetica").fillColor(COLORS.muted).text(
    "Weighted across Technical SEO (20%), On-Page SEO (25%), Local SEO (15%), Schema (15%), Performance (15%), Content (10%)."
  );
  doc.moveDown(1);
}

function drawCategoryTable(doc, report) {
  doc.fontSize(14).font("Helvetica-Bold").fillColor(COLORS.ink).text("Category Breakdown");
  doc.moveDown(0.4);

  const labels = {
    technicalSEO: "Technical SEO",
    onPageSEO: "On-Page SEO",
    localSEO: "Local SEO",
    schema: "Schema Markup",
    performance: "Performance",
    content: "Content",
  };

  const startX = doc.x;
  let y = doc.y;
  const barMaxWidth = 260;

  for (const [key, label] of Object.entries(labels)) {
    const value = report.categories[key] ?? 0;
    doc.fontSize(10).font("Helvetica").fillColor(COLORS.ink).text(label, startX, y, { width: 130 });
    doc.fontSize(10).font("Helvetica-Bold").fillColor(COLORS.ink).text(`${value}/10`, startX + 130, y, { width: 40 });

    const barX = startX + 175;
    const barY = y + 2;
    doc.rect(barX, barY, barMaxWidth, 8).fill(COLORS.line);
    const filled = Math.max(2, (value / 10) * barMaxWidth);
    doc.rect(barX, barY, filled, 8).fill(value >= 8 ? COLORS.low : value >= 5 ? COLORS.medium : COLORS.high);

    y += 22;
  }
  doc.y = y + 10;
  doc.x = startX;
}

function drawIssues(doc, report) {
  const leftMargin = doc.page.margins.left;
  const textX = leftMargin + 16;
  const textWidth = 545 - textX;

  doc.fontSize(14).font("Helvetica-Bold").fillColor(COLORS.ink).text("Issues & Recommendations", leftMargin, doc.y);
  doc.moveDown(0.3);

  if (report.issues.length === 0) {
    doc.fontSize(10).font("Helvetica").fillColor(COLORS.muted).text("No issues detected.", leftMargin, doc.y);
    doc.moveDown(1);
    return;
  }

  const counts = { High: 0, Medium: 0, Low: 0 };
  for (const i of report.issues) counts[i.severity] = (counts[i.severity] || 0) + 1;
  doc.fontSize(10).font("Helvetica").fillColor(COLORS.muted)
    .text(`${counts.High} High  •  ${counts.Medium} Medium  •  ${counts.Low} Low`, leftMargin, doc.y);
  doc.moveDown(0.6);

  for (const issue of report.issues) {
    if (doc.y > 700) {
      doc.addPage();
      doc.y = doc.page.margins.top;
    }
    const color = severityColor(issue.severity);
    const topY = doc.y;

    // Title first, so we know its height, then center the bullet against it.
    doc.fontSize(11).font("Helvetica-Bold").fillColor(COLORS.ink)
      .text(issue.title, textX, topY, { width: textWidth });
    const titleHeight = doc.y - topY;
    doc.circle(leftMargin + 3, topY + titleHeight / 2, 3).fill(color);

    doc.fontSize(9).font("Helvetica-Bold").fillColor(color)
      .text(issue.severity.toUpperCase(), textX, doc.y + 2);
    doc.moveDown(0.15);
    doc.fontSize(10).font("Helvetica").fillColor(COLORS.muted)
      .text(issue.recommendation, textX, doc.y, { width: textWidth });
    doc.moveDown(0.6);
  }
  doc.moveDown(0.5);
}

function drawFooter(doc) {
  const range = doc.bufferedPageRange();
  const savedBottomMargin = doc.page.margins.bottom;
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(i);
    doc.page.margins.bottom = 0; // writing inside the margin area would otherwise auto-add a blank page
    doc.fontSize(8).fillColor(COLORS.muted).text(
      `Generated by SEO Audit MCP  •  Page ${i + 1} of ${range.count}`,
      50,
      812,
      { align: "center", width: 495, lineBreak: false }
    );
    doc.page.margins.bottom = savedBottomMargin;
  }
}

function line(doc) {
  doc.moveTo(doc.x, doc.y).lineTo(545, doc.y).strokeColor(COLORS.line).stroke();
}

function slug(s) {
  return s.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
}

function dateStamp() {
  return new Date().toISOString().slice(0, 10);
}
