export const VALID_STATUS = new Set(["pass", "fail", "warning", "info", "not_run"]);

export function createCheck({
  id,
  category,
  label,
  status = "info",
  url = "",
  expected = "",
  actual = "",
  evidence = "",
  recommendation = "",
  severity = "low",
  meta = {},
}) {
  const normalizedStatus = VALID_STATUS.has(status) ? status : "info";
  return {
    id: id || `${category}-${Math.random().toString(36).slice(2, 10)}`,
    category,
    label,
    status: normalizedStatus,
    url,
    expected,
    actual,
    evidence,
    recommendation,
    severity,
    meta,
  };
}

export function summarizeChecks(checks = []) {
  const total = checks.filter((c) => c.status !== "not_run").length;
  const passed = checks.filter((c) => c.status === "pass").length;
  const failed = checks.filter((c) => c.status === "fail").length;
  const warnings = checks.filter((c) => c.status === "warning").length;
  const informational = checks.filter((c) => c.status === "info").length;
  const passPercentage = total ? Number(((passed / total) * 100).toFixed(1)) : 0;
  return { total, passed, failed, warnings, informational, passPercentage };
}

export function scoreFromChecks(checks = []) {
  const applicable = checks.filter((c) => c.status !== "not_run" && c.status !== "info");
  if (!applicable.length) return null;
  const points = applicable.reduce((sum, c) => {
    if (c.status === "pass") return sum + 1;
    if (c.status === "warning") return sum + 0.5;
    return sum;
  }, 0);
  return Math.round((points / applicable.length) * 100);
}
