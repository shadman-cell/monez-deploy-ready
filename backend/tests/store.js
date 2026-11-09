import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "monez-store-"));
process.env.DATA_DIR = tmp;
const store = await import("../services/auditStore.js");
const job = store.createJob({ url: "https://example.com" });
if (!store.getJob(job.id)) throw new Error("Job was not persisted synchronously");
store.updateJob(job.id, { status: "running", progress: 50 }, { message: "halfway" });
if (store.getJob(job.id).progress !== 50) throw new Error("Job update failed");
const audit = store.saveAudit({ url: "https://example.com", scannedAt: new Date().toISOString(), categories: {} });
if (!store.getAudit(audit.id)) throw new Error("Audit save failed");
const schedule = store.saveSchedule({ url: "https://example.com", dayOfWeek: 1, time: "09:00", timezone: "UTC" });
if (!store.getSchedule(schedule.id)) throw new Error("Schedule save failed");
console.log("Store tests passed");
