import nodemailer from "nodemailer";
import { renderAuditPdfBuffer, renderWeeklyPdfBuffer } from "./pdfReport.js";

function mailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function transporter() {
  if (!mailConfigured()) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: String(process.env.SMTP_SECURE ?? "true").toLowerCase() === "true",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

function hostOf(url) { try { return new URL(url).hostname; } catch { return url; } }

export async function sendAuditEmail({ audit, to, type = "full", subject }) {
  const tx = transporter();
  if (!tx) throw new Error("Email is not configured. Set SMTP_HOST, SMTP_USER and SMTP_PASS in backend .env.");
  if (!to) throw new Error("Recipient email is required.");
  const pdf = await renderAuditPdfBuffer(audit, type);
  const label = type === "performance" ? "Performance" : type === "seo" ? "SEO-AEO-GEO" : "Full-Audit";
  const perf = audit.categories?.performance?.score;
  const info = await tx.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to,
    subject: subject || `Monez ${label} Report — ${hostOf(audit.url)}`,
    html: `<div style="font-family:Arial,sans-serif;color:#172033"><h2>Monez ${label} Report</h2><p><b>Website:</b> ${audit.url}</p><p><b>Overall score:</b> ${audit.overallScore ?? "N/A"}/100</p><p><b>Performance:</b> ${perf ?? "N/A"}/100</p><p>The requested PDF report is attached.</p></div>`,
    attachments: [{ filename: `monez-${label.toLowerCase()}-${hostOf(audit.url)}.pdf`, content: pdf, contentType: "application/pdf" }],
  });
  return { messageId: info.messageId, accepted: info.accepted, rejected: info.rejected };
}

export async function sendWeeklyEmail({ summary, latestAudit, to }) {
  const tx = transporter();
  if (!tx) throw new Error("Email is not configured. Set SMTP_HOST, SMTP_USER and SMTP_PASS in backend .env.");
  if (!to) throw new Error("Recipient email is required.");
  const weeklyPdf = await renderWeeklyPdfBuffer(summary);
  const attachments = [{ filename: `monez-weekly-${hostOf(summary.url)}.pdf`, content: weeklyPdf, contentType: "application/pdf" }];
  if (latestAudit) {
    const performancePdf = await renderAuditPdfBuffer(latestAudit, "performance");
    attachments.push({ filename: `monez-performance-${hostOf(summary.url)}.pdf`, content: performancePdf, contentType: "application/pdf" });
  }
  const change = summary.performanceChange == null ? "N/A" : `${summary.performanceChange >= 0 ? "+" : ""}${summary.performanceChange}`;
  const info = await tx.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to,
    subject: `Monez Weekly Performance Report — ${hostOf(summary.url)}`,
    html: `<div style="font-family:Arial,sans-serif;color:#172033"><h2>Weekly Website Audit Summary</h2><p><b>Website:</b> ${summary.url}</p><p><b>Average performance:</b> ${summary.averagePerformance ?? "N/A"}/100</p><p><b>Latest performance:</b> ${summary.latestPerformance ?? "N/A"}/100</p><p><b>7-day change:</b> ${change}</p><p><b>Audits included:</b> ${summary.auditCount}</p><p>The weekly summary and latest performance report are attached.</p></div>`,
    attachments,
  });
  return { messageId: info.messageId, accepted: info.accepted, rejected: info.rejected };
}

export async function sendLowPerformanceAlert({ audit, to, threshold }) {
  const tx = transporter();
  if (!tx) throw new Error("Email is not configured. Set SMTP_HOST, SMTP_USER and SMTP_PASS in backend .env.");
  const score = audit.categories?.performance?.score;
  const pdf = await renderAuditPdfBuffer(audit, "performance");
  const info = await tx.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to,
    subject: `Monez Alert: Performance ${score ?? "N/A"}/100 — ${hostOf(audit.url)}`,
    html: `<div style="font-family:Arial,sans-serif;color:#172033"><h2>Low Performance Alert</h2><p><b>Website:</b> ${audit.url}</p><p><b>Performance score:</b> ${score ?? "N/A"}/100</p><p><b>Your threshold:</b> ${threshold}/100</p><p>Monez detected a performance score below your configured threshold. The performance report is attached.</p></div>`,
    attachments: [{ filename: `monez-performance-alert-${hostOf(audit.url)}.pdf`, content: pdf, contentType: "application/pdf" }],
  });
  return { messageId: info.messageId };
}

export function getMailStatus() {
  return { configured: mailConfigured(), from: process.env.MAIL_FROM || process.env.SMTP_USER || null, defaultWeeklyRecipient: process.env.WEEKLY_REPORT_EMAIL || null };
}
