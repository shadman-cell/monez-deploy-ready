const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

async function jsonRequest(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || data.hint || `Request failed with ${response.status}`);
  }
  return response.json();
}

export const getDemoAudit = () => jsonRequest("/api/demo-audit");
export const createAudit = (url, expectedSchemaTypes = []) => jsonRequest("/api/audits", { method: "POST", body: JSON.stringify({ url, expectedSchemaTypes }) });
export const getJob = (id) => jsonRequest(`/api/jobs/${id}`);
export const getAudit = (id) => jsonRequest(`/api/audits/${id}`);
export const listAudits = (limit = 50) => jsonRequest(`/api/audits?limit=${limit}`);
export const listSchedules = () => jsonRequest("/api/schedules");
export const createSchedule = (payload) => jsonRequest("/api/schedules", { method: "POST", body: JSON.stringify(payload) });
export const updateSchedule = (id, payload) => jsonRequest(`/api/schedules/${id}`, { method: "PUT", body: JSON.stringify(payload) });
export const deleteSchedule = (id) => jsonRequest(`/api/schedules/${id}`, { method: "DELETE" });
export const runScheduleNow = (id) => jsonRequest(`/api/schedules/${id}/run-now`, { method: "POST", body: "{}" });
export const sendAuditEmail = (id, email, type = "full") => jsonRequest(`/api/audits/${id}/email`, { method: "POST", body: JSON.stringify({ email, type }) });
export const getWeeklySummary = (url) => jsonRequest(`/api/weekly/summary?url=${encodeURIComponent(url)}`);
export const sendWeeklyEmail = (url, email) => jsonRequest("/api/weekly/email", { method: "POST", body: JSON.stringify({ url, email }) });
export const getSystemStatus = () => jsonRequest("/api/system/status");

// Backward compatible helper: now resolves an async job instead of keeping one HTTP request open.
export async function runAudit(url) {
  const created = await createAudit(url);
  while (true) {
    const job = await getJob(created.jobId);
    if (job.status === "completed") return getAudit(job.auditId);
    if (job.status === "failed") throw new Error(job.error || "Audit failed");
    await new Promise((r) => setTimeout(r, 1200));
  }
}


function triggerBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export async function downloadStoredReport(auditId, type = "full", filename = "monez-report.pdf") {
  const response = await fetch(`${API_BASE}/api/audits/${auditId}/report.pdf?type=${encodeURIComponent(type)}`);
  if (!response.ok) throw new Error("PDF generation failed");
  triggerBlob(await response.blob(), filename);
}

export async function downloadWeeklyReport(url, filename = "monez-weekly-report.pdf") {
  const response = await fetch(`${API_BASE}/api/weekly/report.pdf?url=${encodeURIComponent(url)}`);
  if (!response.ok) throw new Error("Weekly PDF generation failed");
  triggerBlob(await response.blob(), filename);
}

export async function downloadPdf(audit, filename = "monez-audit-report.pdf", type = "full") {
  if (audit?.id && audit?.reportType === "website-audit") return downloadStoredReport(audit.id, type, filename);
  const response = await fetch(`${API_BASE}/api/report/pdf?type=${encodeURIComponent(type)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(audit) });
  if (!response.ok) throw new Error("PDF generation failed");
  triggerBlob(await response.blob(), filename);
}
