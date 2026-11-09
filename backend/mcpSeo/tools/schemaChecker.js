import { scoreFromIssues } from "./onPageSEO.js";

/**
 * expectedTypes lets a user tell the audit what schema this kind of business
 * should have (e.g. ["AutoDealer", "LocalBusiness"] for a car dealership).
 * Defaults to a generic business set.
 */
export function checkSchema(page, expectedTypes = ["Organization", "LocalBusiness", "BreadcrumbList", "FAQPage"]) {
  const issues = [];
  const found = {};
  const parseErrors = [];

  const blocks = page.jsonLdBlocks || [];
  for (const block of blocks) {
    if (block.__parseError) {
      parseErrors.push(block.raw);
      continue;
    }
    const items = Array.isArray(block) ? block : [block];
    for (const item of items) {
      const types = [].concat(item["@type"] || []);
      for (const t of types) found[t] = (found[t] || 0) + 1;
      // @graph support
      if (Array.isArray(item["@graph"])) {
        for (const g of item["@graph"]) {
          const gTypes = [].concat(g["@type"] || []);
          for (const t of gTypes) found[t] = (found[t] || 0) + 1;
        }
      }
    }
  }

  if (blocks.length === 0) {
    issues.push({
      title: "No JSON-LD structured data found",
      severity: "High",
      recommendation: `Add JSON-LD schema for: ${expectedTypes.join(", ")}.`,
    });
  }

  if (parseErrors.length > 0) {
    issues.push({
      title: `${parseErrors.length} JSON-LD block(s) failed to parse`,
      severity: "Medium",
      recommendation: "Fix the malformed JSON in your structured data (check for trailing commas, quotes).",
    });
  }

  const missingTypes = expectedTypes.filter((t) => !found[t]);
  if (missingTypes.length > 0 && blocks.length > 0) {
    issues.push({
      title: `Missing expected schema type(s): ${missingTypes.join(", ")}`,
      severity: "Medium",
      recommendation: `Add JSON-LD blocks for ${missingTypes.join(", ")} to improve rich-result eligibility.`,
    });
  }

  const schemaSummary = Object.fromEntries(
    expectedTypes.map((t) => [t, found[t] ? "Available" : "Missing"])
  );

  const score = scoreFromIssues(issues, 10);
  return { score, schema: schemaSummary, foundTypes: found, issues };
}
