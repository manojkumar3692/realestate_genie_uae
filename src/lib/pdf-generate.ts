import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const CHROMIUM_PATH = "/opt/pw-browsers/chromium";

export async function htmlToPdfBuffer(html: string): Promise<Buffer> {
  const launchOptions = {
    ...(fs.existsSync(CHROMIUM_PATH) ? { executablePath: CHROMIUM_PATH } : {}),
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  };

  const browser = await chromium.launch(launchOptions);
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", bottom: "0", left: "0", right: "0" },
    });
    return pdf;
  } finally {
    await browser.close();
  }
}

export function reportsDir(): string {
  const dir = path.join(process.cwd(), "data", "reports");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export async function savePdfToDisk(fileName: string, buffer: Buffer): Promise<string> {
  const filePath = path.join(reportsDir(), fileName);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}
