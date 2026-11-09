# Monez Final QA Checklist

## Website audit
- [ ] URL audit creates a background job immediately.
- [ ] Progress/logs update while the scan runs.
- [ ] SEO uses the supplied MCP audit integration.
- [ ] AEO result and score render.
- [ ] GEO result and score render.
- [ ] Performance score and visual metrics render.
- [ ] Desktop, tablet and mobile screenshots render.
- [ ] Website QA checks render.
- [ ] A recoverable module timeout becomes a warning instead of crashing the full audit.

## Reports
- [ ] Full audit PDF downloads.
- [ ] SEO + AEO + GEO PDF downloads.
- [ ] Performance PDF downloads.
- [ ] Weekly PDF is generated from the latest 7-day history.
- [ ] PASS, FAIL and WARNING results are readable.

## Scheduling and email
- [ ] A weekly schedule can be created for each website.
- [ ] Day, time and timezone are saved correctly.
- [ ] Default recipient is `shadmansakibalam@gmail.com`.
- [ ] Run-now creates an audit job.
- [ ] Scheduled audit saves to history.
- [ ] Weekly email sends after the scheduled audit when enabled.
- [ ] Low-performance alert sends when score is below threshold.
- [ ] Manual Send Report works with a user-entered email address.

## Regression / deployment
- [ ] Backend `npm test` passes.
- [ ] Frontend production build succeeds.
- [ ] CORS production origin is configured.
- [ ] Playwright Chromium is installed in deployment.
- [ ] `backend/data` is persistent.
- [ ] SMTP credentials are stored as deployment secrets.
- [ ] Real slow websites do not create a frontend HTTP timeout.
