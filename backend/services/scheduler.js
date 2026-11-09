import { listSchedules, patchSchedule } from "./auditStore.js";
import { enqueueAudit } from "./auditQueue.js";

let timer = null;

function zonedParts(timezone) {
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, weekday: "short", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const parts = Object.fromEntries(formatter.formatToParts(new Date()).map((p) => [p.type, p.value]));
  const dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { dayOfWeek: dayMap[parts.weekday], date: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour), minute: Number(parts.minute) };
}

function due(schedule) {
  if (!schedule.enabled) return false;
  let p;
  try { p = zonedParts(schedule.timezone || "UTC"); } catch { p = zonedParts("UTC"); }
  if (p.dayOfWeek !== Number(schedule.dayOfWeek)) return false;
  const [h, m] = String(schedule.time || "09:00").split(":").map(Number);
  const nowMinutes = p.hour * 60 + p.minute;
  const targetMinutes = h * 60 + m;
  if (nowMinutes < targetMinutes) return false;
  if (schedule.lastRunLocalDate === p.date) return false;
  return { localDate: p.date };
}

export function checkSchedules() {
  for (const schedule of listSchedules()) {
    const state = due(schedule);
    if (!state) continue;
    const job = enqueueAudit({ url: schedule.url, source: "weekly-schedule", scheduleId: schedule.id, expectedSchemaTypes: schedule.expectedSchemaTypes || [], meta: { scheduledFor: `${state.localDate} ${schedule.time} ${schedule.timezone}` } });
    patchSchedule(schedule.id, { lastRunLocalDate: state.localDate, lastJobId: job.id });
  }
}

export function startScheduler() {
  if (timer) return;
  checkSchedules();
  timer = setInterval(checkSchedules, Number(process.env.SCHEDULER_POLL_MS || 60000));
  timer.unref?.();
}
