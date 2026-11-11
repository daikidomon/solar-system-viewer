// PWA の確認: service worker が登録され、オフラインでも再読み込みできるか。
import puppeteer from "puppeteer-core";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CHROME } from "./shot-file.mjs";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 5197;
const server = spawn("node", ["server.mjs", "--port", String(PORT)], { cwd: ROOT, stdio: "ignore" });
await new Promise((r) => setTimeout(r, 600));
const browser = await puppeteer.launch({ executablePath: CHROME, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
try {
  const page = await browser.newPage();
  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: "networkidle0" });
  const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
  const cached = await page.evaluate(async () => { const keys = await caches.keys(); const c = await caches.open(keys[0]); return { cache: keys[0], entries: (await c.keys()).length }; });
  const manifest = await page.evaluate(async () => { const m = await (await fetch(document.querySelector("link[rel=manifest]").href)).json(); return { name: m.name, display: m.display, icons: m.icons.length }; });
  server.kill(); // サーバーを止めてから読み直す = オフライン
  await new Promise((r) => setTimeout(r, 500));
  await page.reload({ waitUntil: "load" });
  await new Promise((r) => setTimeout(r, 2500));
  const offline = await page.evaluate(() => ({ title: document.title, bodies: window.__solar ? Object.keys(window.__solar.objs).length : 0, texLoaded: !!(window.__solar && window.__solar.objs.earth.mat.uniforms.hasNight.value) }));
  console.log(JSON.stringify({ scope, cached, manifest, offline }));
} finally {
  await browser.close();
  server.kill();
}
