# Monez — Deploy-Ready Website Audit Platform

Monez is a website audit platform focused on SEO, AEO, GEO, performance, responsive QA, scheduled weekly audits, audit history and email reporting. This version intentionally contains **no design comparison module**.

## Main audit flow

Enter a website URL and start one audit. Monez runs:

- **SEO** — powered by the supplied SEO Audit MCP logic
- **AEO** — answer-engine readiness checks
- **GEO** — generative-engine readiness checks
- **Performance** — scoring, timing signals and visual metrics
- **Responsive** — desktop, tablet and mobile checks with screenshots
- **Website QA** — links, images and interactive elements

Long-running audits are queued. The frontend receives a job ID immediately and polls progress, so a slow website does not have to keep one browser request open until the scan finishes. Recoverable module failures are recorded as warnings while the remaining audit continues.

## Reports

Monez supports:

- Full website audit PDF
- SEO + AEO + GEO PDF
- Performance PDF
- 7-day weekly summary PDF
- Manual report email from the UI
- Automatic weekly report email after scheduled runs
- Low-performance alert email when the configured threshold is crossed

## Weekly scheduling

Each website can have its own day, time, timezone, recipient and low-performance threshold. The default recipient in the UI is `shadmansakibalam@gmail.com`; change it per schedule when required.

## Run locally

Backend:

```bash
cd backend
copy .env.example .env
npm install
npx playwright install chromium
npm run dev
```

Frontend:

```bash
cd frontend
copy .env.example .env
npm install
npm run dev
```

Open `http://localhost:5173`. The backend defaults to `http://localhost:5000`.

## Email configuration

Set the following in `backend/.env`:

```env
WEEKLY_REPORT_EMAIL=shadmansakibalam@gmail.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-sender@gmail.com
SMTP_PASS=your-google-app-password
MAIL_FROM=your-sender@gmail.com
```

Use a Gmail App Password rather than your normal Gmail password.

## Production notes

Persist the backend `data/` folder because it stores audit history, jobs and schedules. The included Docker files can be used for deployment. See `DEPLOYMENT.md` and `QA-CHECKLIST.md`.
