// Category weights — must sum to 1. Matches the spec in the project brief.
export const WEIGHTS = {
  technicalSEO: 0.20,
  onPageSEO: 0.25,
  localSEO: 0.15,
  schema: 0.15,
  performance: 0.15,
  content: 0.10,
};

/**
 * categories: { technicalSEO, onPageSEO, localSEO, schema, performance, content }
 * each a 0-10 number. Returns a 0-10 overall score (one decimal place).
 */
export function computeOverallScore(categories) {
  let total = 0;
  for (const [key, weight] of Object.entries(WEIGHTS)) {
    const value = categories[key] ?? 0;
    total += value * weight;
  }
  return Math.round(total * 10) / 10;
}

export function severityRank(sev) {
  return { High: 0, Medium: 1, Low: 2 }[sev] ?? 3;
}

export function sortIssues(issues) {
  return [...issues].sort((a, b) => severityRank(a.severity) - severityRank(b.severity));
}
