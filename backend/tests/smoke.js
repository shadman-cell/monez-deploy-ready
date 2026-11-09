import assert from "node:assert/strict";
import { createDemoAudit } from "../sample/sampleAudit.js";

const audit = createDemoAudit();
assert.equal(audit.reportType, "website-audit");
assert.equal(audit.summary.total, audit.summary.passed + audit.summary.failed + audit.summary.warnings + audit.summary.informational);
assert.ok(audit.overallScore >= 0 && audit.overallScore <= 100);
for (const key of ["seo", "aeo", "geo", "performance", "responsive", "websiteQA"]) {
  assert.ok(audit.categories[key]?.checks?.length > 0, `${key} should contain checks`);
}
assert.deepEqual(Object.keys(audit.categories).sort(), ["aeo", "geo", "performance", "responsive", "seo", "websiteQA"].sort());
console.log("Monez smoke tests passed", { overallScore: audit.overallScore, summary: audit.summary });
