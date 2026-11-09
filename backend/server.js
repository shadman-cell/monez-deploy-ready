
import express from "express";
import cors from "cors";
import { createAuditPdf, createWeeklyPdf } from "./services/pdfReport.js";
import { createDemoAudit } from "./sample/sampleAudit.js";
import { enqueueAudit, getQueueStatus } from "./services/auditQueue.js";
import { startScheduler } from "./services/scheduler.js";
import {
  getJob,
  listJobs,
  getAudit,
  listAudits,
  listAuditsSince,
  listSchedules,
  getSchedule,
  saveSchedule,
  deleteSchedule,
  patchSchedule
} from "./services/auditStore.js";
import { buildWeeklySummary } from "./services/weeklyReport.js";
import {
  sendAuditEmail,
  sendWeeklyEmail,
  getMailStatus
} from "./services/emailService.js";

const app = express();

const PORT = Number(process.env.PORT || 5000);
const HOST = "0.0.0.0";

// CORS configuration for local development and Vercel
const allowedOrigins = String(
  process.env.FRONTEND_URL || "http://localhost:5173"
)
  .split(",")
  .map((x) => x.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, cb) {
    if (
      !origin ||
      allowedOrigins.includes("*") ||
      allowedOrigins.includes(origin)
    ) {
      return cb(null, true);
    }

    cb(new Error("CORS origin not allowed"));
  }
}));

app.use(express.json({ limit: "25mb" }));

function validUrl(value) {
  try {
    const u = new URL(
      /^https?:\/\//i.test(value) ? value : `https://${value}`
    );

    return /^https?:$/.test(u.protocol)
      ? u.toString()
      : null;
  } catch {
    return null;
  }
}

function safeFilename(url) {
  try {
    return new URL(url)
      .hostname
      .replace(/[^a-z0-9.-]/gi, "-");
  } catch {
    return "website";
  }
}

// ===============================
// HEALTH & SYSTEM STATUS
// ===============================

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "monez-deploy-ready",
    time: new Date().toISOString(),
    queue: getQueueStatus(),
    mail: getMailStatus()
  });
});

app.get("/api/demo-audit", (_req, res) => {
  res.json(createDemoAudit());
});

app.get("/api/system/status", (_req, res) => {
  res.json({
    queue: getQueueStatus(),
    mail: getMailStatus(),
    schedules: listSchedules().length
  });
});

// ===============================
// WEBSITE AUDIT
// ===============================

// Long audits are queued.
// The HTTP request returns immediately with a job ID.

app.post("/api/audits", (req, res) => {
  const url = validUrl(req.body?.url || "");

  if (!url) {
    return res.status(400).json({
      error: "A valid website URL is required."
    });
  }

  const job = enqueueAudit({
    url,
    source: "manual",
    expectedSchemaTypes: req.body?.expectedSchemaTypes || []
  });

  res.status(202).json({
    jobId: job.id,
    status: job.status,
    statusUrl: `/api/jobs/${job.id}`
  });
});

app.post("/api/audit/run", (req, res) => {
  const url = validUrl(req.body?.url || "");

  if (!url) {
    return res.status(400).json({
      error: "A valid website URL is required."
    });
  }

  const job = enqueueAudit({
    url,
    source: "manual",
    expectedSchemaTypes: req.body?.expectedSchemaTypes || []
  });

  res.status(202).json({
    jobId: job.id,
    status: job.status
  });
});

// ===============================
// JOB MANAGEMENT
// ===============================

app.get("/api/jobs", (req, res) => {
  res.json(listJobs(Number(req.query.limit || 30)));
});

app.get("/api/jobs/:id", (req, res) => {
  const job = getJob(req.params.id);

  if (!job) {
    return res.status(404).json({
      error: "Job not found."
    });
  }

  res.json(job);
});

// ===============================
// AUDIT HISTORY
// ===============================

app.get("/api/audits", (req, res) => {
  res.json(
    listAudits({
      limit: Number(req.query.limit || 50),
      url: req.query.url || undefined
    })
  );
});

app.get("/api/audits/:id", (req, res) => {
  const audit = getAudit(req.params.id);

  if (!audit) {
    return res.status(404).json({
      error: "Audit not found."
    });
  }

  res.json(audit);
});

// ===============================
// AUDIT PDF REPORT
// ===============================

app.get("/api/audits/:id/report.pdf", (req, res) => {
  const audit = getAudit(req.params.id);

  if (!audit) {
    return res.status(404).json({
      error: "Audit not found."
    });
  }

  const type = ["full", "performance", "seo"].includes(
    req.query.type
  )
    ? req.query.type
    : "full";

  res.setHeader("Content-Type", "application/pdf");

  res.setHeader(
    "Content-Disposition",
    `attachment; filename=monez-${type}-${safeFilename(audit.url)}.pdf`
  );

  createAuditPdf(audit, res, { type });
});

// ===============================
// AUDIT EMAIL
// ===============================

app.post("/api/audits/:id/email", async (req, res) => {
  const audit = getAudit(req.params.id);

  if (!audit) {
    return res.status(404).json({
      error: "Audit not found."
    });
  }

  try {
    res.json(
      await sendAuditEmail({
        audit,
        to: req.body?.email,
        type: req.body?.type || "full"
      })
    );
  } catch (error) {
    res.status(503).json({
      error: error.message
    });
  }
});

// ===============================
// WEEKLY PDF REPORT
// ===============================

app.get("/api/weekly/report.pdf", (req, res) => {
  const url = validUrl(req.query.url || "");

  if (!url) {
    return res.status(400).json({
      error: "A valid url query parameter is required."
    });
  }

  const since = new Date(
    Date.now() - 7 * 86400000
  ).toISOString();

  const summary = buildWeeklySummary(
    url,
    listAuditsSince({ url, since })
  );

  res.setHeader("Content-Type", "application/pdf");

  res.setHeader(
    "Content-Disposition",
    `attachment; filename=monez-weekly-${safeFilename(url)}.pdf`
  );

  createWeeklyPdf(summary, res);
});

app.get("/api/weekly/summary", (req, res) => {
  const url = validUrl(req.query.url || "");

  if (!url) {
    return res.status(400).json({
      error: "A valid url query parameter is required."
    });
  }

  const since = new Date(
    Date.now() - 7 * 86400000
  ).toISOString();

  res.json(
    buildWeeklySummary(
      url,
      listAuditsSince({ url, since })
    )
  );
});

// ===============================
// WEEKLY EMAIL REPORT
// ===============================

app.post("/api/weekly/email", async (req, res) => {
  const url = validUrl(req.body?.url || "");

  if (!url) {
    return res.status(400).json({
      error: "A valid URL is required."
    });
  }

  const since = new Date(
    Date.now() - 7 * 86400000
  ).toISOString();

  const history = listAuditsSince({
    url,
    since
  });

  const summary = buildWeeklySummary(url, history);

  try {
    res.json(
      await sendWeeklyEmail({
        summary,
        latestAudit: history[0] || null,
        to: req.body?.email || process.env.WEEKLY_REPORT_EMAIL
      })
    );
  } catch (error) {
    res.status(503).json({
      error: error.message
    });
  }
});

// ===============================
// SCHEDULE MANAGEMENT
// ===============================

app.get("/api/schedules", (_req, res) => {
  res.json(listSchedules());
});

app.post("/api/schedules", (req, res) => {
  const url = validUrl(req.body?.url || "");

  if (!url) {
    return res.status(400).json({
      error: "A valid website URL is required."
    });
  }

  if (!/^\d{2}:\d{2}$/.test(req.body?.time || "")) {
    return res.status(400).json({
      error: "time must be HH:MM."
    });
  }

  const schedule = saveSchedule({
    ...req.body,
    url
  });

  res.status(201).json(schedule);
});

app.put("/api/schedules/:id", (req, res) => {
  const existing = getSchedule(req.params.id);

  if (!existing) {
    return res.status(404).json({
      error: "Schedule not found."
    });
  }

  const url = req.body.url
    ? validUrl(req.body.url)
    : existing.url;

  if (!url) {
    return res.status(400).json({
      error: "A valid website URL is required."
    });
  }

  res.json(
    saveSchedule({
      ...existing,
      ...req.body,
      id: existing.id,
      url
    })
  );
});

app.delete("/api/schedules/:id", (req, res) => {
  res.json({
    deleted: deleteSchedule(req.params.id)
  });
});

app.post("/api/schedules/:id/run-now", (req, res) => {
  const schedule = getSchedule(req.params.id);

  if (!schedule) {
    return res.status(404).json({
      error: "Schedule not found."
    });
  }

  const job = enqueueAudit({
    url: schedule.url,
    source: "schedule-run-now",
    scheduleId: schedule.id,
    expectedSchemaTypes: schedule.expectedSchemaTypes || []
  });

  patchSchedule(schedule.id, {
    lastJobId: job.id
  });

  res.status(202).json({
    jobId: job.id
  });
});

// ===============================
// DIRECT PDF ENDPOINT
// ===============================

app.post("/api/report/pdf", (req, res) => {
  const audit = req.body;

  if (!audit || !audit.summary) {
    return res.status(400).json({
      error: "Normalized audit payload is required."
    });
  }

  res.setHeader("Content-Type", "application/pdf");

  res.setHeader(
    "Content-Disposition",
    `attachment; filename=monez-${safeFilename(audit.url)}-report.pdf`
  );

  createAuditPdf(audit, res, {
    type: req.query.type || "full"
  });
});

// ===============================
// START SCHEDULER & SERVER
// ===============================

startScheduler();

app.listen(PORT, HOST, () => {
  console.log(
    `Monez deploy-ready backend running on http://${HOST}:${PORT}`
  );
});
