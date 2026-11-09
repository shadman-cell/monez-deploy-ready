# Monez Deployment

## Required environment

Create `backend/.env` from `.env.example`. Important values:

```env
PORT=5000
FRONTEND_URL=https://your-monez-domain.com
SCAN_TIMEOUT_MS=60000
AUDIT_CONCURRENCY=1
WEEKLY_REPORT_EMAIL=shadmansakibalam@gmail.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-sender@gmail.com
SMTP_PASS=your-google-app-password
MAIL_FROM=your-sender@gmail.com
```

Create `frontend/.env`:

```env
VITE_API_BASE=https://your-monez-api-domain.com
```

## Docker

```bash
docker compose up -d --build
```

Persist `backend/data` in production. It contains schedules, audit jobs and audit history.

## Timeout resilience

Audits run through the backend queue. The start endpoint returns immediately with a job ID. Browser navigation uses the resilient navigation helper; recoverable module errors are recorded as warnings rather than failing the whole audit whenever possible.

## Scheduler

The scheduler checks due weekly schedules periodically. Keep one scheduler-owning backend instance unless you add distributed locking for multi-instance deployment.
