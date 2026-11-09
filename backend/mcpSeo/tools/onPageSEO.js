/**
 * Runs on-page SEO checks against a single crawled page (see crawler.js).
 * Pure function of the crawl result — no network calls here.
 */
export function checkOnPageSEO(page) {
  const issues = [];

  if (!page.ok) {
    return { score: 0, issues: [{ title: `Page unreachable (${page.error || page.status})`, severity: "High", recommendation: "Fix the server error or broken URL before anything else." }] };
  }

  // Title
  if (!page.title) {
    issues.push({ title: "Missing <title> tag", severity: "High", recommendation: "Add a unique, descriptive title tag to every page." });
  } else if (page.titleLength < 30) {
    issues.push({ title: `Title tag is too short (${page.titleLength} chars)`, severity: "Medium", recommendation: "Expand the title to 50–60 characters, including the primary keyword and brand." });
  } else if (page.titleLength > 60) {
    issues.push({ title: `Title tag is too long (${page.titleLength} chars)`, severity: "Low", recommendation: "Shorten the title to under 60 characters so it isn't truncated in search results." });
  }

  // Meta description
  if (!page.metaDescription) {
    issues.push({ title: "Missing meta description", severity: "Medium", recommendation: "Write a 120–160 character meta description summarizing the page and including a call to action." });
  } else if (page.metaDescriptionLength < 70 || page.metaDescriptionLength > 160) {
    issues.push({ title: `Meta description length is off (${page.metaDescriptionLength} chars)`, severity: "Low", recommendation: "Aim for 120–160 characters so it displays fully in search results." });
  }

  // H1
  const h1Count = page.headings?.h1?.length || 0;
  if (h1Count === 0) {
    issues.push({ title: "No H1 heading found", severity: "High", recommendation: "Add exactly one H1 that describes the page and includes the primary keyword." });
  } else if (h1Count > 1) {
    issues.push({ title: `Multiple H1 headings found (${h1Count})`, severity: "Medium", recommendation: "Use a single H1 per page; demote the others to H2/H3." });
  }

  // Canonical
  if (!page.canonical) {
    issues.push({ title: "Missing canonical tag", severity: "Low", recommendation: "Add a self-referencing <link rel=\"canonical\"> to prevent duplicate-content issues." });
  }

  // Robots meta
  if (/noindex/i.test(page.robotsMeta)) {
    issues.push({ title: "Page is set to noindex", severity: "High", recommendation: "Remove the noindex directive if this page should appear in search results." });
  }

  // Viewport / mobile
  if (!page.viewport) {
    issues.push({ title: "Missing responsive viewport meta tag", severity: "Medium", recommendation: "Add <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"> for mobile SEO." });
  }

  // Lang attribute
  if (!page.lang) {
    issues.push({ title: "Missing lang attribute on <html>", severity: "Low", recommendation: "Add a lang attribute (e.g. lang=\"en\") to help search engines and assistive tech." });
  }

  // Thin content
  if (page.wordCount < 250) {
    issues.push({ title: `Thin content (${page.wordCount} words)`, severity: "Medium", recommendation: "Expand the page to at least 300–500 words of unique, useful content." });
  }

  // Page weight
  if (page.htmlSizeBytes > 300_000) {
    issues.push({ title: "HTML document is unusually large", severity: "Low", recommendation: "Trim inline scripts/styles or move them to external files to speed up parsing." });
  }

  const score = scoreFromIssues(issues, 10);
  return { score, issues };
}

export function scoreFromIssues(issues, base = 10) {
  const penalty = { High: 2.5, Medium: 1.2, Low: 0.5 };
  let score = base;
  for (const issue of issues) score -= penalty[issue.severity] ?? 1;
  return Math.max(0, Math.round(score * 10) / 10);
}
