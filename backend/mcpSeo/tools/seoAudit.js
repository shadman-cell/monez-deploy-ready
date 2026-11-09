import { crawlPage } from "./crawler.js";
import { checkTechnicalSEO } from "./technicalSEO.js";
import { checkOnPageSEO, scoreFromIssues } from "./onPageSEO.js";
import { checkImageSEO } from "./imageSEO.js";
import { checkSchema } from "./schemaChecker.js";
import { checkLocalSEO } from "./localSEO.js";
import { checkPerformance } from "./performance.js";
import { computeOverallScore, sortIssues } from "./scoring.js";

/**
 * Runs the full audit pipeline for a single website and returns the
 * structured JSON report described in the project brief.
 *
 * options.expectedSchemaTypes lets the caller tailor schema checks to the
 * business vertical (e.g. ["AutoDealer", "Vehicle"] for a car dealer).
 */
export async function runAudit(url, options = {}) {
  const normalizedUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  const startedAt = new Date().toISOString();

  const page = await crawlPage(normalizedUrl);

  const [technical, onPage, images, schema] = await Promise.all([
    checkTechnicalSEO(normalizedUrl),
    Promise.resolve(checkOnPageSEO(page)),
    Promise.resolve(checkImageSEO(page)),
    Promise.resolve(checkSchema(page, options.expectedSchemaTypes)),
  ]);

  const local = checkLocalSEO(page, schema.foundTypes);
  const performance = await checkPerformance(normalizedUrl, page);

  // "Content" category: a simple proxy from word count + heading structure,
  // since there's no separate module for it in the brief.
  const contentScore = scoreContent(page);

  const categories = {
    technicalSEO: technicalScoreFrom(technical),
    onPageSEO: onPage.score,
    localSEO: local.score,
    schema: schema.score,
    performance: (performance.performance ?? 50) / 10,
    content: contentScore,
  };

  const allIssues = sortIssues([
    ...technical.issues,
    ...onPage.issues,
    ...images.issues,
    ...schema.issues,
    ...local.issues,
    ...(performance.issues || []),
  ]);

  const overallScore = computeOverallScore(categories);

  return {
    website: hostnameOf(normalizedUrl),
    url: normalizedUrl,
    auditedAt: startedAt,
    score: overallScore,
    categories: roundCategories(categories),
    details: {
      page: page.ok ? summarizePage(page) : { error: page.error },
      technicalSEO: technical,
      onPageSEO: onPage,
      images,
      schema,
      localSEO: local,
      performance,
    },
    issues: allIssues,
  };
}

function technicalScoreFrom(technical) {
  return scoreFromIssues(technical.issues, 10);
}

function scoreContent(page) {
  if (!page.ok) return 0;
  let score = 10;
  if (page.wordCount < 150) score -= 4;
  else if (page.wordCount < 300) score -= 2;
  const h2Count = page.headings?.h2?.length || 0;
  if (h2Count === 0) score -= 2;
  return Math.max(0, score);
}

function summarizePage(page) {
  return {
    finalUrl: page.finalUrl,
    title: page.title,
    metaDescription: page.metaDescription,
    h1: page.headings?.h1,
    wordCount: page.wordCount,
    imageCount: page.images?.length || 0,
    internalLinkCount: page.internalLinkCount,
    externalLinkCount: page.externalLinkCount,
  };
}

function roundCategories(categories) {
  const out = {};
  for (const [k, v] of Object.entries(categories)) out[k] = Math.round((v ?? 0) * 10) / 10;
  return out;
}

function hostnameOf(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
