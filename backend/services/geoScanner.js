import { createCheck, scoreFromChecks, summarizeChecks } from "../utils/auditCheck.js";

const AI_BOTS = ["gptbot", "chatgpt-user", "claudebot", "anthropic-ai", "perplexitybot", "google-extended"];

function robotsBlocksAiBots(text = "") {
  const lower = String(text).toLowerCase();
  const blocked = [];
  for (const bot of AI_BOTS) {
    const sections = lower.split(/user-agent\s*:/i).slice(1);
    for (const section of sections) {
      const lines = section.split(/\r?\n/).map((line) => line.trim());
      const agent = lines[0]?.split(/\s+/)[0] || "";
      if (agent.includes(bot) && lines.some((line) => /^disallow\s*:\s*\/$/i.test(line))) { blocked.push(bot); break; }
    }
  }
  return [...new Set(blocked)];
}

export async function scanGeo(page, url) {
  const data = await page.evaluate(() => {
    const clean = (v) => String(v || "").replace(/\s+/g, " ").trim();
    const body = clean(document.body?.innerText || "");
    const jsonLd = [...document.querySelectorAll('script[type="application/ld+json"]')].map((el) => { try { return JSON.parse(el.textContent || "{}"); } catch { return null; } }).filter(Boolean);
    const schemaTypes = [];
    const visit = (v) => { if (!v || typeof v !== "object") return; if (Array.isArray(v)) return v.forEach(visit); const t = v["@type"]; if (t) schemaTypes.push(...(Array.isArray(t) ? t : [t]).map(String)); Object.values(v).forEach((x) => { if (x && typeof x === "object") visit(x); }); };
    jsonLd.forEach(visit);
    const author = clean(document.querySelector('meta[name="author"]')?.content || document.querySelector('[rel="author"], [class*="author" i]')?.textContent || "");
    const siteName = clean(document.querySelector('meta[property="og:site_name"]')?.content || document.querySelector('meta[name="application-name"]')?.content || "");
    const published = clean(document.querySelector('meta[property="article:published_time"]')?.content || document.querySelector("time[datetime]")?.getAttribute("datetime") || "");
    const modified = clean(document.querySelector('meta[property="article:modified_time"]')?.content || "");
    const externalLinks = [...document.querySelectorAll("a[href]")].filter((a) => { try { return new URL(a.href, location.href).origin !== location.origin; } catch { return false; } });
    const authoritativeLike = externalLinks.filter((a) => /\.gov\b|\.edu\b|wikipedia\.org|schema\.org|developers\.google\.com|support\./i.test(a.href)).length;
    const entitySchema = schemaTypes.some((t) => /Organization|LocalBusiness|Person|Product|Service|Article|NewsArticle|WebSite/i.test(t));
    const sameAsCount = jsonLd.reduce((count, node) => count + JSON.stringify(node).match(/"sameAs"/g)?.length || count, 0);
    const hasAbout = [...document.querySelectorAll("a")].some((a) => /about|company|who we are/i.test(clean(a.textContent)));
    const contactSignals = /\b(?:\+?\d[\d\s().-]{7,}\d)\b/.test(body) || [...document.querySelectorAll('a[href^="mailto:"],a[href^="tel:"]')].length > 0;
    return { wordCount: body.split(/\s+/).filter(Boolean).length, schemaTypes: [...new Set(schemaTypes)], author, siteName, published, modified, externalLinks: externalLinks.length, authoritativeLike, entitySchema, sameAsCount, hasAbout, contactSignals };
  });

  let robotsText = "";
  try { const r = await fetch(`${new URL(url).origin}/robots.txt`, { redirect: "follow", signal: AbortSignal.timeout(10000) }); if (r.ok) robotsText = await r.text(); } catch {}
  const blockedAiBots = robotsBlocksAiBots(robotsText);

  const checks = [
    createCheck({ id: "geo-entity", category: "geo", label: "Entity clarity", status: data.entitySchema || data.siteName ? "pass" : "warning", url, expected: "A clearly identifiable organization/person/product/service entity", actual: data.entitySchema ? `Entity schema: ${data.schemaTypes.filter((t) => /Organization|LocalBusiness|Person|Product|Service|WebSite/i.test(t)).join(", ") || "detected"}` : data.siteName || "Weak entity signals", recommendation: data.entitySchema || data.siteName ? "" : "Make the primary entity explicit with consistent naming, About/contact information and accurate structured data.", severity: "high" }),
    createCheck({ id: "geo-structured-data", category: "geo", label: "Structured knowledge signals", status: data.schemaTypes.length ? "pass" : "warning", url, expected: "Accurate JSON-LD schema describing important entities/content", actual: data.schemaTypes.length ? data.schemaTypes.join(", ") : "No JSON-LD detected", recommendation: data.schemaTypes.length ? "" : "Add accurate structured data that reflects visible content and the real business/entity.", severity: "medium" }),
    createCheck({ id: "geo-trust", category: "geo", label: "Trust & ownership signals", status: data.author || (data.hasAbout && data.contactSignals) ? "pass" : "warning", url, expected: "Clear author/organization ownership and contact context", actual: `${data.author ? `Author: ${data.author}` : "No explicit author"} · About ${data.hasAbout ? "yes" : "no"} · Contact ${data.contactSignals ? "yes" : "no"}`, recommendation: data.author || (data.hasAbout && data.contactSignals) ? "" : "Expose the responsible organization/author and clear contact/About information.", severity: "medium" }),
    createCheck({ id: "geo-citations", category: "geo", label: "Supporting source signals", status: data.externalLinks >= 2 ? "pass" : "warning", url, expected: "Relevant external references where claims need support", actual: `${data.externalLinks} external link(s) · ${data.authoritativeLike} authority-pattern link(s)`, recommendation: data.externalLinks >= 2 ? "" : "For factual or research-heavy claims, cite useful primary or authoritative sources where appropriate.", severity: "low" }),
    createCheck({ id: "geo-freshness", category: "geo", label: "Freshness metadata", status: data.modified || data.published ? "pass" : "warning", url, expected: "Published/updated metadata where freshness matters", actual: data.modified || data.published || "No publication/update date detected", recommendation: data.modified || data.published ? "" : "For time-sensitive content, expose accurate published/updated dates.", severity: "low" }),
    createCheck({ id: "geo-consistency", category: "geo", label: "Entity consistency links", status: data.sameAsCount > 0 || data.contactSignals ? "pass" : "warning", url, expected: "Consistent identity signals and verifiable profiles/contact data", actual: `${data.sameAsCount} sameAs signal(s) · contact ${data.contactSignals ? "detected" : "not detected"}`, recommendation: data.sameAsCount > 0 || data.contactSignals ? "" : "Strengthen consistent organization identity and verified profile/contact signals where appropriate.", severity: "low" }),
    createCheck({ id: "geo-ai-access", category: "geo", label: "AI crawler directives", status: blockedAiBots.length ? "warning" : "pass", url, expected: "No accidental blanket AI-crawler block unless intentional", actual: blockedAiBots.length ? `Explicitly blocked: ${blockedAiBots.join(", ")}` : "No explicit blanket block detected", evidence: "Crawler policy is a site-owner choice; this check only surfaces discoverability configuration.", recommendation: blockedAiBots.length ? "Confirm these robots.txt rules are intentional and aligned with your AI-content policy." : "", severity: "low" }),
  ];

  return { name: "GEO", score: scoreFromChecks(checks), summary: summarizeChecks(checks), checks, raw: { ...data, blockedAiBots }, note: "Monez GEO is a heuristic Generative Engine Optimization readiness score, not an official ranking metric." };
}
