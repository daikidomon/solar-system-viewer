// 任意のページを撮影する小道具: node tools/shot-file.mjs <url> <out.png> [w] [h]
import puppeteer from "puppeteer-core";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
const base = path.join(os.homedir(), ".cache/puppeteer/chrome-headless-shell");
const ver = fs.readdirSync(base).sort().pop();
const sub = fs.readdirSync(path.join(base, ver))[0];
export const CHROME = path.join(base, ver, sub, "chrome-headless-shell");
if (process.argv[1].endsWith("shot-file.mjs")) {
  const [url, out, w = 1600, h = 1000] = process.argv.slice(2);
  const browser = await puppeteer.launch({ executablePath: CHROME, args: ["--allow-file-access-from-files", "--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
  const page = await browser.newPage();
  await page.setViewport({ width: +w, height: +h });
  await page.goto(url, { waitUntil: "networkidle0" });
  await page.screenshot({ path: out, fullPage: true });
  await browser.close();
}
