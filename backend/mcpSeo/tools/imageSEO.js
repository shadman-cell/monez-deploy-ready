import { scoreFromIssues } from "./onPageSEO.js";

const GENERIC_ALT = new Set(["image", "photo", "picture", "img", "car", "logo", "icon", ""]);

export function checkImageSEO(page) {
  const issues = [];
  if (!page.ok || !page.images) {
    return { score: 0, missingAlt: 0, keywordStuffedAlt: 0, genericAlt: 0, totalImages: 0, issues: [] };
  }

  const totalImages = page.images.length;
  const missingAlt = page.images.filter((img) => !img.hasAlt).length;
  const genericAlt = page.images.filter((img) => img.hasAlt && GENERIC_ALT.has((img.alt || "").trim().toLowerCase())).length;
  const keywordStuffedAlt = page.images.filter((img) => img.hasAlt && img.altLength > 125).length;

  if (missingAlt > 0) {
    issues.push({
      title: `${missingAlt} image(s) missing alt text`,
      severity: missingAlt > totalImages / 2 ? "High" : "Medium",
      recommendation: "Add descriptive alt text to every content image (decorative images can use alt=\"\").",
    });
  }
  if (genericAlt > 0) {
    issues.push({
      title: `${genericAlt} image(s) use generic alt text`,
      severity: "Low",
      recommendation: "Replace generic alt text (e.g. 'image', 'photo') with specific, descriptive text.",
    });
  }
  if (keywordStuffedAlt > 0) {
    issues.push({
      title: `${keywordStuffedAlt} image(s) have overly long/stuffed alt text`,
      severity: "Low",
      recommendation: "Keep alt text concise (under ~125 characters) and avoid keyword stuffing.",
    });
  }

  const score = totalImages === 0 ? 10 : scoreFromIssues(issues, 10);
  return { score, missingAlt, keywordStuffedAlt, genericAlt, totalImages, issues };
}
