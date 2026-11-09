import { parseStringPromise } from "xml2js";
import { safeFetch } from "./crawler.js";

export async function checkTechnicalSEO(baseUrl) {
  const origin = new URL(baseUrl).origin;
  const issues = [];
  const result = { robots: null, sitemap: null, https: null };

  // --- HTTPS check ---
  result.https = origin.startsWith("https://");
  if (!result.https) {
    issues.push({
      title: "Site is not served over HTTPS",
      severity: "High",
      recommendation: "Move the site to HTTPS and redirect all HTTP traffic.",
    });
  }

  // --- robots.txt ---
  const robotsUrl = `${origin}/robots.txt`;
  const robotsRes = await safeFetch(robotsUrl);
  if (robotsRes.ok) {
    const disallowedAll = /User-agent:\s*\*\s*[\r\n]+Disallow:\s*\/\s*$/im.test(robotsRes.text);
    const sitemapLines = robotsRes.text
      .split(/\r?\n/)
      .filter((l) => /^sitemap:/i.test(l.trim()))
      .map((l) => l.split(":").slice(1).join(":").trim());

    result.robots = {
      found: true,
      blocksEverything: disallowedAll,
      sitemapDeclared: sitemapLines,
    };
    if (disallowedAll) {
      issues.push({
        title: "robots.txt disallows all crawling",
        severity: "High",
        recommendation: "Remove the blanket 'Disallow: /' rule unless the site is intentionally hidden from search engines.",
      });
    }
    if (sitemapLines.length === 0) {
      issues.push({
        title: "robots.txt does not declare a sitemap",
        severity: "Medium",
        recommendation: "Add a 'Sitemap:' line pointing to sitemap.xml so crawlers can discover it.",
      });
    }
  } else {
    result.robots = { found: false };
    issues.push({
      title: "robots.txt missing or unreachable",
      severity: "Medium",
      recommendation: "Add a robots.txt file at the site root with a Sitemap directive.",
    });
  }

  // --- sitemap.xml ---
  const sitemapCandidates = [
    ...(result.robots?.sitemapDeclared || []),
    `${origin}/sitemap.xml`,
    `${origin}/sitemap_index.xml`,
  ];
  let sitemapFound = null;
  for (const url of [...new Set(sitemapCandidates)]) {
    const res = await safeFetch(url);
    if (res.ok && /<urlset|<sitemapindex/i.test(res.text)) {
      sitemapFound = { url, xml: res.text };
      break;
    }
  }

  if (sitemapFound) {
    let urlCount = 0;
    try {
      const parsed = await parseStringPromise(sitemapFound.xml);
      if (parsed.urlset?.url) urlCount = parsed.urlset.url.length;
      else if (parsed.sitemapindex?.sitemap) urlCount = parsed.sitemapindex.sitemap.length;
    } catch {
      // malformed XML — still counts as "found" but flag it
      issues.push({
        title: "Sitemap XML could not be parsed",
        severity: "Medium",
        recommendation: "Validate the sitemap XML — it may be malformed.",
      });
    }
    result.sitemap = { found: true, url: sitemapFound.url, urlCount };
  } else {
    result.sitemap = { found: false };
    issues.push({
      title: "No sitemap.xml found",
      severity: "Medium",
      recommendation: "Generate and publish a sitemap.xml listing all indexable pages.",
    });
  }

  return { ...result, issues };
}
