function isNavigationTimeout(error) {
  return /timeout/i.test(String(error?.message || error || ""));
}

async function pageHasUsableDocument(page) {
  try {
    const state = await page.evaluate(() => ({
      readyState: document.readyState,
      hasBody: Boolean(document.body),
      textLength: (document.body?.innerText || "").trim().length,
      htmlLength: document.documentElement?.outerHTML?.length || 0,
    }));
    return state.hasBody && (state.textLength > 0 || state.htmlLength > 500);
  } catch {
    return false;
  }
}

/**
 * Navigate without failing an audit just because DOMContentLoaded is delayed by
 * third-party scripts. A committed HTML document is enough for Monez to
 * continue, and we then give the page a bounded amount of time to render.
 */
export async function safeGoto(page, url, options = {}) {
  const navigationTimeout = Number(options.timeout || 60000);
  const domReadyTimeout = Number(options.domReadyTimeout || 15000);
  const renderWaitMs = Number(options.renderWaitMs || 1200);

  page.setDefaultNavigationTimeout(navigationTimeout);
  page.setDefaultTimeout(Math.min(navigationTimeout, 30000));

  let response = null;
  let firstError = null;

  try {
    // For an audit we need the document response, not every deferred script.
    // Starting with `commit` prevents slow third-party JS from blocking the scan.
    response = await page.goto(url, {
      waitUntil: "commit",
      timeout: navigationTimeout,
    });
  } catch (error) {
    firstError = error;

    // If the browser already has useful HTML, keep auditing it instead of
    // discarding the whole run just because Playwright reported a timeout.
    if (await pageHasUsableDocument(page)) {
      response = null;
    } else if (isNavigationTimeout(error)) {
      // One retry is useful for slow DNS/TLS/origin startup.
      await page.waitForTimeout(1000);
      response = await page.goto(url, {
        waitUntil: "commit",
        timeout: navigationTimeout,
      });
    } else {
      throw error;
    }
  }

  // DOMContentLoaded/networkidle are best-effort only. Many production sites
  // keep long-lived network requests open, so neither should fail the audit.
  await page.waitForLoadState("domcontentloaded", { timeout: domReadyTimeout }).catch(() => {});
  await page.waitForFunction(() => Boolean(document.body), { timeout: domReadyTimeout }).catch(() => {});
  await page.waitForLoadState("networkidle", { timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(renderWaitMs);

  if (!(await pageHasUsableDocument(page))) {
    const suffix = firstError ? ` Original navigation error: ${firstError.message}` : "";
    throw new Error(`Page did not produce a usable HTML document within ${navigationTimeout}ms.${suffix}`);
  }

  return {
    response,
    finalUrl: page.url(),
    recoveredFromTimeout: Boolean(firstError),
    navigationWarning: firstError?.message || null,
  };
}
