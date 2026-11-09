import { normalizeSeoResult } from "./seoNormalizer.js";

export async function scanSeo(page, url) {
  const data = await page.evaluate(() => ({
    title: document.title || "",
    metaDescription: document.querySelector('meta[name="description"]')?.content || "",
    h1: [...document.querySelectorAll("h1")].map((el) => el.textContent?.trim()).filter(Boolean),
    canonical: document.querySelector('link[rel="canonical"]')?.href || "",
  }));

  const origin = new URL(url).origin;
  async function reachable(path) {
    try {
      const res = await fetch(`${origin}${path}`, { redirect: "follow" });
      return res.ok;
    } catch {
      return false;
    }
  }
  const [robots, sitemapXml, sitemapIndex] = await Promise.all([
    reachable("/robots.txt"),
    reachable("/sitemap.xml"),
    reachable("/sitemap_index.xml"),
  ]);

  return normalizeSeoResult({ ...data, robots, sitemap: sitemapXml ? `${origin}/sitemap.xml` : sitemapIndex ? `${origin}/sitemap_index.xml` : false }, url);
}
