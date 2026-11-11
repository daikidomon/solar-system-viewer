// アプリの確認用スクリーンショット: node tools/shots.mjs [名前...]
// ローカルサーバーを一時的に立て、ヘッドレス Chrome で開いて撮影し、コンソールのエラーを集める。
import puppeteer from "puppeteer-core";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CHROME } from "./shot-file.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "raw/shots");
fs.mkdirSync(OUT, { recursive: true });
const PORT = 5199;
const server = spawn("node", ["server.mjs", "--port", String(PORT)], { cwd: ROOT, stdio: "ignore" });
await new Promise((r) => setTimeout(r, 600));

const T = "2026-11-11T03:00:00Z"; // 日本時間の正午
const SHOTS = {
  overview: { q: `t=${T}&paused=1`, wait: 2500 },
  earth: { q: `t=${T}&paused=1&focus=earth`, wait: 2500 },
  saturn: { q: `t=${T}&paused=1&focus=saturn`, wait: 2500 },
  jupiter: { q: `t=${T}&paused=1&focus=jupiter`, wait: 2500, zoom: 3.2 },
  moon: { q: `t=${T}&paused=1&focus=moon`, wait: 2500 },
  mars: { q: `t=${T}&paused=1&focus=mars`, wait: 2500 },
  sun: { q: `t=${T}&paused=1&focus=sun`, wait: 3500 },
  real: { q: `t=${T}&paused=1&scale=real`, wait: 2500 },
  realearth: { q: `t=${T}&paused=1&scale=real&focus=earth`, wait: 2500 },
  realearthfar: { q: `t=${T}&paused=1&scale=real&focus=earth`, wait: 2500, zoom: 40 },
  phone: { q: `t=${T}&paused=1&focus=saturn`, wait: 2500, vp: [390, 844, 3] },
};
const want = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const names = want.length ? want : Object.keys(SHOTS);
const browser = await puppeteer.launch({ executablePath: CHROME, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--enable-unsafe-webgpu"] });
const problems = [];
try {
  for (const name of names) {
    const s = SHOTS[name];
    const page = await browser.newPage();
    const [w, h, dpr] = s.vp || [1600, 1000, 1];
    await page.setViewport({ width: w, height: h, deviceScaleFactor: dpr, hasTouch: !!s.vp, isMobile: !!s.vp });
    page.on("console", (m) => { if (["error", "warning"].includes(m.type())) problems.push(`[${name}] console.${m.type()}: ${m.text().slice(0, 300)}`); });
    page.on("pageerror", (e) => problems.push(`[${name}] pageerror: ${String(e).slice(0, 400)}`));
    page.on("requestfailed", (r) => problems.push(`[${name}] request failed: ${r.url()}`));
    await page.goto(`http://127.0.0.1:${PORT}/index.html?${s.q}`, { waitUntil: "networkidle0" });
    await new Promise((r) => setTimeout(r, s.wait));
    if (s.zoom) { await page.evaluate((z) => { window.__solar.zoom(z); }, s.zoom); await new Promise((r) => setTimeout(r, 1200)); }
    await page.screenshot({ path: path.join(OUT, name + ".png") });
    const info = await page.evaluate(() => ({ focus: window.__solar.focusId, dist: window.__solar.cam.dist, renderer: (() => { const gl = window.__solar.renderer.getContext(); const e = gl.getExtension("WEBGL_debug_renderer_info"); return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : "?"; })() }));
    console.log(name, JSON.stringify(info));
    await page.close();
  }
} finally {
  await browser.close();
  server.kill();
}
console.log(problems.length ? "問題:\n" + problems.join("\n") : "コンソールエラーなし");
