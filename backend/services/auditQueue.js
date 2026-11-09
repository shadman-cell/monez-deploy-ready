import { runFullAudit } from "./auditRunner.js";
import { createJob, updateJob, saveAudit, getSchedule, patchSchedule, listAuditsSince } from "./auditStore.js";
import { buildWeeklySummary } from "./weeklyReport.js";
import { sendWeeklyEmail, sendLowPerformanceAlert } from "./emailService.js";

const queue = [];
let active = 0;
const CONCURRENCY = Math.max(1, Number(process.env.AUDIT_CONCURRENCY || 1));

export function enqueueAudit({ url, source = "manual", scheduleId = null, expectedSchemaTypes = [], meta = {} }) {
  const job = createJob({ url, source, scheduleId, meta: { ...meta, expectedSchemaTypes } });
  queue.push({ jobId: job.id, url, source, scheduleId, expectedSchemaTypes });
  processQueue();
  return job;
}

async function scheduledFollowUp(audit, scheduleId, jobId) {
  const schedule = getSchedule(scheduleId);
  if (!schedule) return;
  patchSchedule(scheduleId, { lastJobId: jobId, lastAuditId: audit.id });
  const recipient = schedule.recipient || process.env.WEEKLY_REPORT_EMAIL;
  if (!recipient) return;
  const perf = Number(audit.categories?.performance?.score);
  if (schedule.notifyOnLowPerformance && Number.isFinite(perf) && perf < Number(schedule.lowPerformanceThreshold ?? 70)) {
    try { await sendLowPerformanceAlert({ audit, to: recipient, threshold: Number(schedule.lowPerformanceThreshold ?? 70) }); }
    catch (error) { updateJob(jobId, {}, { level: "warning", message: `Low-performance email could not send: ${error.message}` }); }
  }
  if (schedule.sendWeeklyReport) {
    const since = new Date(Date.now() - 7 * 86400000).toISOString();
    const history = listAuditsSince({ url: audit.url, since });
    const summary = buildWeeklySummary(audit.url, history);
    try { await sendWeeklyEmail({ summary, latestAudit: audit, to: recipient }); updateJob(jobId, {}, { message: `Weekly report emailed to ${recipient}` }); }
    catch (error) { updateJob(jobId, {}, { level: "warning", message: `Weekly report email could not send: ${error.message}` }); }
  }
}

async function execute(item) {
  const { jobId, url, source, scheduleId, expectedSchemaTypes } = item;
  updateJob(jobId, { status: "running", stage: "Starting", progress: 3 }, { message: "Audit worker started" });
  try {
    const audit = await runFullAudit({
      id: undefined,
      url,
      expectedSchemaTypes,
      onProgress: ({ stage, progress, message, level }) => updateJob(jobId, { stage: stage || undefined, progress: progress ?? undefined }, message ? { message, level } : null),
    });
    audit.metadata = { ...(audit.metadata || {}), source, scheduleId, jobId };
    const saved = saveAudit(audit);
    updateJob(jobId, { status: "completed", stage: "Complete", progress: 100, auditId: saved.id }, { message: "Reports saved and audit history updated" });
    if (scheduleId) await scheduledFollowUp(saved, scheduleId, jobId);
  } catch (error) {
    updateJob(jobId, { status: "failed", stage: "Failed", error: error.message }, { level: "error", message: error.message });
  }
}

async function processQueue() {
  while (active < CONCURRENCY && queue.length) {
    const item = queue.shift();
    active += 1;
    execute(item).finally(() => { active -= 1; processQueue(); });
  }
}

export function getQueueStatus() { return { queued: queue.length, active, concurrency: CONCURRENCY }; }
