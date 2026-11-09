import * as cheerio from "cheerio";

const UA = "SEOAuditMCP/1.0 (+https://github.com/your-org/seo-audit-mcp)";

/**
 * Fetch a URL with a timeout and return { ok, status, text, headers, finalUrl }.
 * Never throws — failures are reported in the result object so the audit
 * can continue and report a specific issue instead of crashing.
 */
export async function safeFetch(url, { timeoutMs = 15000, method = "GET" } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method,
      redirect: "follow",
      headers: { "User-Agent": UA },
      signal: controller.signal,
    });
    const text = await res.text();
    return {
      ok: res.ok,
      status: res.status,
      text,
      headers: Object.fromEntries(res.headers.entries()),
      finalUrl: res.url || url,
    };
  } catch (err) {
    return { ok: false, status: 0, text: "", headers: {}, error: err.message, finalUrl: url };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Crawl a single page and extract everything the SEO checkers need.
 * This is a single-page fetch, not a full-site spider — see crawlSite()
 * below for a shallow multi-page crawl driven by the sitemap/internal links.
 */
export async function crawlPage(url) {
  const res = await safeFetch(url);
  if (!res.ok) {
    return { url, ok: false, status: res.status, error: res.error || `HTTP ${res.status}` };
  }

  const $ = cheerio.load(res.text);

  const title = $("head > title").first().text().trim();
  const metaDescription = $('meta[name="description"]').attr("content")?.trim() || "";
  const canonical = $('link[rel="canonical"]').attr("href") || "";
  const robotsMeta = $('meta[name="robots"]').attr("content") || "";
  const viewport = $('meta[name="viewport"]').attr("content") || "";
  const lang = $("html").attr("lang") || "";

  const headings = { h1: [], h2: [], h3: [] };
  for (const tag of Object.keys(headings)) {
    $(tag).each((_, el) => headings[tag].push($(el).text().trim()));
  }

  const images = [];
  $("img").each((_, el) => {
    images.push({
      src: $(el).attr("src") || "",
      alt: $(el).attr("alt"),
      hasAlt: $(el).attr("alt") !== undefined,
      altLength: ($(el).attr("alt") || "").length,
    });
  });

  const links = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    links.push({ href, text: $(el).text().trim(), rel: $(el).attr("rel") || "" });
  });

  const jsonLdBlocks = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).contents().text();
    try {
      jsonLdBlocks.push(JSON.parse(raw));
    } catch {
      jsonLdBlocks.push({ __parseError: true, raw: raw.slice(0, 200) });
    }
  });

  const bodyTextFull = $("body").text().replace(/\s+/g, " ").trim();
  const wordCount = bodyTextFull.split(" ").filter(Boolean).length;

  return {
    url,
    ok: true,
    status: res.status,
    finalUrl: res.finalUrl,
    redirected: res.finalUrl !== url,
    title,
    titleLength: title.length,
    metaDescription,
    metaDescriptionLength: metaDescription.length,
    canonical,
    robotsMeta,
    viewport,
    lang,
    headings,
    images,
    links,
    internalLinkCount: links.filter((l) => isInternal(l.href, url)).length,
    externalLinkCount: links.filter((l) => l.href && !isInternal(l.href, url) && /^https?:/.test(l.href)).length,
    jsonLdBlocks,
    wordCount,
    bodyTextSample: bodyTextFull.slice(0, 5000),
    htmlSizeBytes: Buffer.byteLength(res.text, "utf8"),
  };
}

function isInternal(href, baseUrl) {
  if (!href) return false;
  if (href.startsWith("/") || href.startsWith("#")) return true;
  try {
    const base = new URL(baseUrl);
    const target = new URL(href, baseUrl);
    return target.host === base.host;
  } catch {
    return false;
  }
}

/**
 * Shallow crawl: fetch the homepage, then follow up to `maxPages` internal
 * links found on it (or in the sitemap, if present). Good enough for an
 * MVP audit without needing a headless browser.
 */
export async function crawlSite(baseUrl, { maxPages = 5 } = {}) {
  const home = await crawlPage(baseUrl);
  const pages = [home];
  if (!home.ok) return pages;

  const candidates = home.links
    .filter((l) => isInternal(l.href, baseUrl))
    .map((l) => new URL(l.href, baseUrl).toString())
    .filter((u, i, arr) => arr.indexOf(u) === i && u !== home.finalUrl);

  for (const url of candidates.slice(0, maxPages - 1)) {
    pages.push(await crawlPage(url));
  }
  return pages;
}
