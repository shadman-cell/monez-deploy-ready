import { scoreFromIssues } from "./onPageSEO.js";

const PHONE_RE = /(\+?\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/;
const ADDRESS_HINT_RE = /\d{1,6}\s+[A-Za-z0-9.\s]+\s(street|st|avenue|ave|road|rd|blvd|boulevard|drive|dr|lane|ln|way|suite|ste)\b/i;

/**
 * Cross-checks the business Name/Address/Phone (NAP) as it appears on the
 * page's visible text vs. what's declared in JSON-LD LocalBusiness schema.
 */
export function checkLocalSEO(page, schemaFoundTypes = {}) {
  const issues = [];
  const bodyText = page.bodyTextSample || "";

  const hasPhoneOnPage = PHONE_RE.test(bodyText);
  const hasAddressOnPage = ADDRESS_HINT_RE.test(bodyText);
  const hasLocalBusinessSchema = Boolean(schemaFoundTypes.LocalBusiness || schemaFoundTypes.AutoDealer || schemaFoundTypes.Organization);

  if (!hasPhoneOnPage) {
    issues.push({
      title: "No phone number detected on the page",
      severity: "Medium",
      recommendation: "Display a phone number in the header or footer for local trust and click-to-call SEO.",
    });
  }
  if (!hasAddressOnPage) {
    issues.push({
      title: "No physical address detected on the page",
      severity: "Medium",
      recommendation: "Add a full postal address (footer or Contact page) matching your Google Business Profile.",
    });
  }
  if (!hasLocalBusinessSchema) {
    issues.push({
      title: "No LocalBusiness/Organization schema found",
      severity: "High",
      recommendation: "Add LocalBusiness (or a vertical-specific type like AutoDealer) JSON-LD with matching NAP details.",
    });
  }

  const score = scoreFromIssues(issues, 10);
  return { score, hasPhoneOnPage, hasAddressOnPage, hasLocalBusinessSchema, issues };
}
