import { normalizeWebsiteQaResult } from "./websiteQaNormalizer.js";

async function checkUrl(target, timeout = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    let res = await fetch(target, { method: "HEAD", redirect: "follow", signal: controller.signal });
    if (res.status === 405 || res.status === 403) res = await fetch(target, { method: "GET", redirect: "follow", signal: controller.signal });
    return { status: res.status, ok: res.ok, finalUrl: res.url };
  } catch (error) {
    return { status: 0, ok: false, error: error.message };
  } finally {
    clearTimeout(timer);
  }
}

export async function scanWebsiteQa(page, url, limit = 25) {
  const pageData = await page.evaluate(() => ({
    images: [...document.images].map((img) => ({ src: img.currentSrc || img.src, alt: img.alt, complete: img.complete, naturalWidth: img.naturalWidth })).slice(0, 100),
    buttons: [...document.querySelectorAll('button, input[type="button"], input[type="submit"], [role="button"]')].map((b) => ({ text: b.textContent?.trim() || b.value || b.getAttribute("aria-label") || "", disabled: Boolean(b.disabled), visible: Boolean(b.offsetWidth || b.offsetHeight || b.getClientRects().length) })).slice(0, 100),
    links: [...document.querySelectorAll("a[href]")].map((a) => a.href).filter((href) => /^https?:/i.test(href)),
  }));

  const checks = [];
  const brokenImages = pageData.images.filter((img) => img.complete && img.naturalWidth === 0);
  checks.push({ id: "qa-images-load", label: "Images load", status: brokenImages.length ? "fail" : "pass", url, expected: "All discovered images load", actual: brokenImages.length ? `${brokenImages.length} broken image(s)` : `${pageData.images.length} image(s) checked`, evidence: brokenImages.slice(0, 5).map((i) => i.src).join("\n"), recommendation: brokenImages.length ? "Fix broken image URLs or delivery." : "", severity: "high" });
  const missingAlt = pageData.images.filter((img) => !img.alt);
  checks.push({ id: "qa-image-alt", label: "Image ALT coverage", status: missingAlt.length ? "warning" : "pass", url, expected: "Meaningful images have ALT text", actual: `${missingAlt.length} image(s) without ALT`, recommendation: missingAlt.length ? "Review missing ALT attributes for meaningful images." : "", severity: "medium" });
  const usableButtons = pageData.buttons.filter((b) => b.visible && !b.disabled);
  checks.push({ id: "qa-buttons", label: "Visible buttons are enabled", status: usableButtons.length || !pageData.buttons.length ? "pass" : "warning", url, expected: "Interactive buttons available when expected", actual: `${usableButtons.length}/${pageData.buttons.length} visible enabled button(s)`, severity: "low" });

  const unique = [...new Set(pageData.links)].slice(0, limit);
  const linkResults = await Promise.all(unique.map(async (href) => ({ href, ...(await checkUrl(href)) })));
  for (const r of linkResults) {
    checks.push({ id: `qa-link-${checks.length}`, label: "Link status", status: r.ok ? "pass" : "fail", url: r.href, expected: "HTTP 2xx/3xx reachable destination", actual: r.status ? `HTTP ${r.status}` : (r.error || "Request failed"), recommendation: r.ok ? "" : "Fix or remove the broken destination.", severity: r.ok ? "low" : "high" });
  }

  return normalizeWebsiteQaResult({ checks }, url);
}
