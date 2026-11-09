# Monez Integration Guide

This package is the website-audit-only Monez build. It intentionally has no design-comparison module.

## Preserve these modules

- supplied SEO Audit MCP integration
- AEO scanner
- GEO scanner
- performance audit and visual results
- resilient navigation
- responsive desktop/tablet/mobile screenshots
- website QA checks
- audit queue and progress logs
- audit history
- weekly scheduler
- PDF reports
- manual email delivery
- automatic weekly email delivery
- low-performance alerts

## Recommended integration order

1. Back up the current Monez project.
2. Merge backend services and `mcpSeo/`.
3. Merge queue/store/scheduler services.
4. Merge report and email services.
5. Merge API routes from `backend/server.js`.
6. Merge the frontend Website Audit page and components.
7. Configure `.env` values and SMTP.
8. Run backend tests.
9. Run a real URL audit.
10. Verify all three PDF report types.
11. Create a weekly schedule and test `Run now`.
12. Verify manual email and scheduled email delivery.
13. Run responsive/regression QA before release.
