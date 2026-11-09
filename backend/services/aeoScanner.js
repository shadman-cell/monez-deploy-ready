import { createCheck, scoreFromChecks, summarizeChecks } from "../utils/auditCheck.js";

export async function scanAeo(page, url) {
  const data = await page.evaluate(() => {
    const clean = (v) => String(v || "").replace(/\s+/g, " ").trim();
    const body = clean(document.body?.innerText || "");
    const headings = [...document.querySelectorAll("h1,h2,h3")].map((el) => ({ tag: el.tagName, text: clean(el.textContent) })).filter((x) => x.text);
    const questionHeadings = headings.filter((h) => /\?$|^(what|why|how|when|where|who|which|can|does|do|is|are|should|will)\b/i.test(h.text));
    const directAnswers = questionHeadings.map((h) => {
      const el = [...document.querySelectorAll(h.tag.toLowerCase())].find((n) => clean(n.textContent) === h.text);
      if (!el) return 0;
      let n = el.nextElementSibling;
      let chars = 0;
      for (let i = 0; i < 3 && n; i += 1, n = n.nextElementSibling) {
        if (/^H[1-3]$/.test(n.tagName)) break;
        chars += clean(n.textContent).length;
      }
      return chars;
    });
    const jsonLd = [...document.querySelectorAll('script[type="application/ld+json"]')].map((el) => { try { return JSON.parse(el.textContent || "{}"); } catch { return null; } }).filter(Boolean);
    const types = [];
    const visit = (v) => {
      if (!v || typeof v !== "object") return;
      if (Array.isArray(v)) return v.forEach(visit);
      if (v["@type"]) types.push(...(Array.isArray(v["@type"]) ? v["@type"] : [v["@type"]]).map(String));
      Object.values(v).forEach((x) => { if (x && typeof x === "object") visit(x); });
    };
    jsonLd.forEach(visit);
    const firstParagraph = clean(document.querySelector("main p, article p, p")?.textContent || "");
    const listCount = document.querySelectorAll("main ul,main ol,article ul,article ol").length;
    const tableCount = document.querySelectorAll("main table,article table").length;
    const definitionLike = [...document.querySelectorAll("p")].filter((p) => /^.{2,80}\s+(is|are|means|refers to)\s+/i.test(clean(p.textContent))).length;
    const anchors = [...document.querySelectorAll('a[href^="#"]')].length;
    const breadcrumb = Boolean(document.querySelector('[aria-label*="breadcrumb" i], .breadcrumb, [itemtype*="BreadcrumbList"]'));
    return {
      wordCount: body.split(/\s+/).filter(Boolean).length,
      headings,
      questionHeadings,
      directAnswerCount: directAnswers.filter((n) => n >= 60).length,
      firstParagraphLength: firstParagraph.length,
      schemaTypes: [...new Set(types)],
      listCount,
      tableCount,
      definitionLike,
      anchors,
      breadcrumb,
    };
  });

  const qSchema = data.schemaTypes.some((t) => /FAQPage|QAPage|HowTo/i.test(t));
  const checks = [
    createCheck({ id: "aeo-answer-first", category: "aeo", label: "Answer-first introduction", status: data.firstParagraphLength >= 100 ? "pass" : data.firstParagraphLength >= 50 ? "warning" : "fail", url, expected: "A concise opening answer users and answer engines can understand quickly", actual: `${data.firstParagraphLength} characters in the first main paragraph`, recommendation: data.firstParagraphLength >= 100 ? "" : "Open the page with a concise summary that answers the primary intent before supporting detail.", severity: "high" }),
    createCheck({ id: "aeo-question-coverage", category: "aeo", label: "Question-led coverage", status: data.questionHeadings.length >= 2 ? "pass" : data.questionHeadings.length === 1 ? "warning" : "warning", url, expected: "Natural question-led sections where relevant", actual: `${data.questionHeadings.length} question-style heading(s)`, evidence: data.questionHeadings.slice(0, 5).map((x) => x.text).join(" | "), recommendation: data.questionHeadings.length >= 2 ? "" : "Add natural user-question sections when they match real search intent.", severity: "medium" }),
    createCheck({ id: "aeo-direct-answers", category: "aeo", label: "Direct answer blocks", status: data.directAnswerCount >= 2 ? "pass" : data.directAnswerCount === 1 ? "warning" : "warning", url, expected: "Questions followed by self-contained answers", actual: `${data.directAnswerCount} answer block(s) detected`, recommendation: data.directAnswerCount >= 2 ? "" : "Place concise, self-contained answers directly below relevant question headings.", severity: "medium" }),
    createCheck({ id: "aeo-structured-qa", category: "aeo", label: "Q&A structured data", status: qSchema ? "pass" : "warning", url, expected: "FAQPage/QAPage/HowTo schema only when it accurately reflects visible content", actual: qSchema ? `Detected: ${data.schemaTypes.filter((t) => /FAQPage|QAPage|HowTo/i.test(t)).join(", ")}` : "No Q&A schema detected", recommendation: qSchema ? "" : "If the page genuinely contains eligible FAQ/Q&A/HowTo content, add accurate structured data that mirrors visible content.", severity: "low" }),
    createCheck({ id: "aeo-scannable", category: "aeo", label: "Scannable answer formats", status: data.listCount + data.tableCount + data.definitionLike >= 2 ? "pass" : "warning", url, expected: "Useful lists, tables or definitions for structured answers", actual: `${data.listCount} lists · ${data.tableCount} tables · ${data.definitionLike} definition-style blocks`, recommendation: data.listCount + data.tableCount + data.definitionLike >= 2 ? "" : "Use lists, tables or compact definitions where they make answers easier to extract and understand.", severity: "low" }),
    createCheck({ id: "aeo-content-depth", category: "aeo", label: "Answer depth", status: data.wordCount >= 350 ? "pass" : data.wordCount >= 180 ? "warning" : "fail", url, expected: "Enough supporting detail to answer the topic accurately", actual: `${data.wordCount} words`, recommendation: data.wordCount >= 350 ? "" : "Expand thin content with useful supporting details, examples and clarifications.", severity: "medium" }),
    createCheck({ id: "aeo-navigation", category: "aeo", label: "Answer navigation", status: data.breadcrumb || data.anchors >= 2 ? "pass" : "warning", url, expected: "Clear content navigation for larger pages", actual: `${data.anchors} in-page anchor(s) · breadcrumb ${data.breadcrumb ? "detected" : "not detected"}`, recommendation: data.breadcrumb || data.anchors >= 2 ? "" : "For longer pages, add descriptive navigation such as breadcrumbs or in-page anchors.", severity: "low" }),
  ];

  return { name: "AEO", score: scoreFromChecks(checks), summary: summarizeChecks(checks), checks, raw: data, note: "Monez AEO is a practical Answer Engine Optimization readiness score, not an official search-engine metric." };
}
