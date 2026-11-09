import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const DATA_DIR = path.resolve(process.env.DATA_DIR || "data");
const FILES = {
  audits: path.join(DATA_DIR, "audits.json"),
  jobs: path.join(DATA_DIR, "jobs.json"),
  schedules: path.join(DATA_DIR, "schedules.json"),
};

function ensureDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  for (const file of Object.values(FILES)) {
    if (!fs.existsSync(file)) fs.writeFileSync(file, "[]", "utf8");
  }
}

function readArray(file) {
  ensureDir();
  try {
    const value = JSON.parse(fs.readFileSync(file, "utf8"));
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function queueWrite(file, value) {
  ensureDir();
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2), "utf8");
  fs.renameSync(tmp, file);
}

export function makeId(prefix = "id") {
  return `${prefix}_${Date.now().toString(36)}_${crypto.randomBytes(4).toString("hex")}`;
}

export function createJob({ url, source = "manual", scheduleId = null, meta = {} }) {
  const jobs = readArray(FILES.jobs);
  const job = {
    id: makeId("job"),
    url,
    source,
    scheduleId,
    status: "queued",
    stage: "Queued",
    progress: 0,
    logs: [{ at: new Date().toISOString(), level: "info", message: "Audit queued" }],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    auditId: null,
    error: null,
    meta,
  };
  jobs.unshift(job);
  queueWrite(FILES.jobs, jobs.slice(0, 250));
  return job;
}

export function updateJob(id, patch = {}, log = null) {
  const jobs = readArray(FILES.jobs);
  const idx = jobs.findIndex((x) => x.id === id);
  if (idx < 0) return null;
  const current = jobs[idx];
  const logs = Array.isArray(current.logs) ? current.logs : [];
  if (log) logs.push({ at: new Date().toISOString(), level: log.level || "info", message: log.message || String(log) });
  jobs[idx] = { ...current, ...patch, logs: logs.slice(-80), updatedAt: new Date().toISOString() };
  queueWrite(FILES.jobs, jobs);
  return jobs[idx];
}

export function getJob(id) {
  return readArray(FILES.jobs).find((x) => x.id === id) || null;
}

export function listJobs(limit = 30) {
  return readArray(FILES.jobs).slice(0, limit);
}

export function saveAudit(audit) {
  const audits = readArray(FILES.audits);
  const record = { ...audit, id: audit.id || makeId("audit") };
  const idx = audits.findIndex((x) => x.id === record.id);
  if (idx >= 0) audits[idx] = record;
  else audits.unshift(record);
  queueWrite(FILES.audits, audits.slice(0, 500));
  return record;
}

export function getAudit(id) {
  return readArray(FILES.audits).find((x) => x.id === id) || null;
}

export function listAudits({ limit = 50, url } = {}) {
  const items = readArray(FILES.audits);
  const filtered = url ? items.filter((x) => x.url === url) : items;
  return filtered.slice(0, limit);
}

export function listAuditsSince({ url, since }) {
  const t = new Date(since).getTime();
  return readArray(FILES.audits).filter((x) => (!url || x.url === url) && new Date(x.scannedAt || x.createdAt || 0).getTime() >= t);
}

export function listSchedules() {
  return readArray(FILES.schedules);
}

export function getSchedule(id) {
  return readArray(FILES.schedules).find((x) => x.id === id) || null;
}

export function saveSchedule(input) {
  const schedules = readArray(FILES.schedules);
  const now = new Date().toISOString();
  const record = {
    id: input.id || makeId("schedule"),
    url: input.url,
    enabled: input.enabled !== false,
    dayOfWeek: Number(input.dayOfWeek ?? 1),
    time: input.time || "09:00",
    timezone: input.timezone || "Asia/Dhaka",
    recipient: input.recipient || process.env.WEEKLY_REPORT_EMAIL || "",
    lowPerformanceThreshold: Number(input.lowPerformanceThreshold ?? process.env.DEFAULT_PERFORMANCE_THRESHOLD ?? 70),
    notifyOnLowPerformance: input.notifyOnLowPerformance !== false,
    sendWeeklyReport: input.sendWeeklyReport !== false,
    expectedSchemaTypes: Array.isArray(input.expectedSchemaTypes) ? input.expectedSchemaTypes : [],
    lastRunLocalDate: input.lastRunLocalDate || null,
    lastJobId: input.lastJobId || null,
    lastAuditId: input.lastAuditId || null,
    createdAt: input.createdAt || now,
    updatedAt: now,
  };
  const idx = schedules.findIndex((x) => x.id === record.id);
  if (idx >= 0) schedules[idx] = { ...schedules[idx], ...record };
  else schedules.unshift(record);
  queueWrite(FILES.schedules, schedules);
  return record;
}

export function deleteSchedule(id) {
  const schedules = readArray(FILES.schedules);
  const next = schedules.filter((x) => x.id !== id);
  queueWrite(FILES.schedules, next);
  return next.length !== schedules.length;
}

export function patchSchedule(id, patch) {
  const current = getSchedule(id);
  if (!current) return null;
  return saveSchedule({ ...current, ...patch, id });
}

ensureDir();
