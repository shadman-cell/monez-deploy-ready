import { createCheck, scoreFromChecks, summarizeChecks } from "../utils/auditCheck.js";

export function normalizeWebsiteQaResult(input = {}, url = "") {
  const source = input.checks || input.results || [];
  const checks = source.map((item, index) => createCheck({
    id: item.id || `qa-${index + 1}`,
    category: "websiteQA",
    label: item.label || item.name || item.type || "Website QA check",
    status: item.status || (item.pass === true ? "pass" : item.pass === false ? "fail" : "info"),
    url: item.url || url,
    expected: item.expected || "",
    actual: item.actual || "",
    evidence: item.evidence || item.details || "",
    recommendation: item.recommendation || "",
    severity: item.severity || "medium",
    meta: item.meta || {},
  }));
  return { name: "Website QA", score: input.score ?? scoreFromChecks(checks), summary: summarizeChecks(checks), checks, raw: input };
}
