/**
 * Renders HTML to a PDF buffer using headless Chromium.
 *
 * Two code paths, chosen by whether we're actually running on Vercel
 * (`process.env.VERCEL`, set automatically by the platform — not just any
 * production build, so `npm run build && npm run start` locally still uses
 * the local-dev path):
 *
 *  - On Vercel: `puppeteer-core` + `@sparticuz/chromium-min`, which downloads
 *    a Lambda-compatible Chromium binary from a remote URL on cold start and
 *    caches it in /tmp. Requires the CHROMIUM_PACK_URL env var (see README).
 *  - Everywhere else (local dev on your own machine): the full `puppeteer`
 *    package, which downloads its own matching Chromium build for your OS at
 *    `npm install` time — no extra setup needed.
 */
export async function htmlToPdfBuffer(html: string): Promise<Buffer> {
  const onVercel = !!process.env.VERCEL;

  const browser = onVercel ? await launchServerlessBrowser() : await launchLocalBrowser();

  try {
    const page = await browser.newPage();
    // page.setContent()'s waitUntil doesn't support "networkidle{0,2}" (those
    // only apply to real navigations); "load" is the closest equivalent and
    // fires once everything referenced in the HTML (fonts, inline images) is
    // loaded.
    await page.setContent(html, { waitUntil: "load" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", bottom: "0", left: "0", right: "0" },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

async function launchServerlessBrowser() {
  const packUrl = process.env.CHROMIUM_PACK_URL;
  if (!packUrl) {
    throw new Error(
      "CHROMIUM_PACK_URL is not set. On Vercel, PDF generation needs a URL to a prebuilt " +
        "Chromium pack matching the installed @sparticuz/chromium-min version — see the " +
        "'Serverless Chromium' section of the setup guide for where to get it."
    );
  }
  const { default: chromium } = await import("@sparticuz/chromium-min");
  const puppeteer = await import("puppeteer-core");
  return puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(packUrl),
    headless: true,
  });
}

async function launchLocalBrowser() {
  const puppeteer = (await import("puppeteer")).default;
  return puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    // Lets local verification (this sandbox, CI, etc.) point at a pre-existing
    // Chromium binary instead of puppeteer's own downloaded one, if set.
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
  });
}
