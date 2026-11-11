// 操作の確認: クリックで天体へ移動、一覧、スケール切替、時間操作、回転・ズーム、ピンチ、日時指定。
import puppeteer from "puppeteer-core";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CHROME } from "./shot-file.mjs";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 5198;
const server = spawn("node", ["server.mjs", "--port", String(PORT)], { cwd: ROOT, stdio: "ignore" });
await new Promise((r) => setTimeout(r, 600));
const browser = await puppeteer.launch({ executablePath: CHROME, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
const results = [], problems = [];
const check = (name, ok, detail = "") => { results.push({ name, ok, detail }); console.log(`${ok ? "✓" : "✗"} ${name}${detail ? " — " + detail : ""}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1000 });
  page.on("console", (m) => { if (m.type() === "error") problems.push(m.text().slice(0, 200)); });
  page.on("pageerror", (e) => problems.push(String(e).slice(0, 300)));
  await page.goto(`http://127.0.0.1:${PORT}/index.html?t=2026-11-11T03:00:00Z&paused=1`, { waitUntil: "networkidle0" });
  await sleep(1500);
  const S = () => page.evaluate(() => ({ focus: window.__solar.focusId, scale: window.__solar.scale, az: window.__solar.cam.tAz, dist: window.__solar.cam.tDist, orbits: window.__solar.show.orbits, name: document.getElementById("info-name").textContent, date: document.getElementById("date-text").textContent + " " + document.getElementById("time-text").textContent, speed: document.getElementById("speed-text").textContent }));

  // 1. 3D 上の木星をクリック → カメラが飛んで追従
  const j = await page.evaluate(() => window.__solar.screen.jupiter);
  await page.mouse.click(j.x, j.y);
  await sleep(3200);
  let s = await S();
  check("3D 上の天体をクリックすると移動する", s.focus === "jupiter" && s.name === "木星", `focus=${s.focus}, パネル=${s.name}`);
  await page.screenshot({ path: path.join(ROOT, "raw/shots/after-click-jupiter.png") });

  // 2. 一覧から選択
  await page.click('#list .item[data-id="mars"]');
  await sleep(3200);
  s = await S();
  check("一覧から選ぶと移動する", s.focus === "mars" && s.name === "火星", `focus=${s.focus}`);

  // 3. スケール切替(アニメーション)
  await page.click("#scale-real");
  await sleep(800);
  const mid = (await S()).scale;
  await sleep(2600);
  s = await S();
  check("実スケールへの切替がアニメーションする", mid > 0.05 && mid < 0.95 && s.scale === 0, `途中 ${mid.toFixed(2)} → ${s.scale}`);
  await page.screenshot({ path: path.join(ROOT, "raw/shots/real-mars.png") });
  await page.click("#scale-easy");
  await sleep(3000);
  check("見やすい表示に戻る", (await S()).scale === 1);

  // 4. 時間操作
  const d0 = (await S()).date;
  await page.click("#btn-play");
  await sleep(1200);
  s = await S();
  check("再生で日時が進む", s.date !== d0, `${d0} → ${s.date}`);
  await page.click("#btn-faster");
  check("速度を上げられる", (await S()).speed === "1週間 / 秒", (await S()).speed);
  for (let i = 0; i < 8; i++) await page.click("#btn-slower");
  check("逆再生にできる", (await S()).speed.startsWith("逆再生"), (await S()).speed);
  await page.click("#btn-play");
  const paused = (await S()).date;
  await sleep(700);
  check("一時停止で止まる", (await S()).date === paused);

  // 5. 日時指定
  await page.evaluate(() => { const el = document.getElementById("date-input"); el.value = "2035-09-02T10:30"; el.dispatchEvent(new Event("change")); });
  await sleep(300);
  s = await S();
  check("日時を指定できる", s.date.includes("2035年9月2日"), s.date);

  // 6. 回転とズーム
  const a0 = s.az, z0 = s.dist;
  await page.mouse.move(800, 560); await page.mouse.down(); await page.mouse.move(980, 600, { steps: 8 }); await page.mouse.up();
  await page.mouse.wheel({ deltaY: 400 });
  await sleep(600);
  s = await S();
  check("ドラッグで回転する", Math.abs(s.az - a0) > 0.3, `方位 ${a0.toFixed(2)} → ${s.az.toFixed(2)}`);
  check("ホイールで拡大縮小する", s.dist > z0 * 1.3, `距離 ×${(s.dist / z0).toFixed(2)}`);
  check("ドラッグでは天体の選択が変わらない", s.focus === "mars");

  // 7. 表示の切替
  await page.click("#tg-orbits");
  check("軌道線を消せる", (await S()).orbits === false);
  await page.click("#tg-orbits");

  // 8. 全体に戻る
  await page.keyboard.press("Escape");
  await sleep(3000);
  check("Esc で全体表示に戻る", (await S()).focus === "sun");

  // 9. 出典ダイアログ
  await page.click("#btn-about");
  await sleep(300);
  check("出典ダイアログが開く", await page.evaluate(() => document.getElementById("about").open && document.querySelectorAll("#about-sources .row").length >= 8));
  await page.screenshot({ path: path.join(ROOT, "raw/shots/about.png") });
  await page.click("#about-close");
  await page.close();

  // 10. タッチ: 1 本指で回転、2 本指のピンチで拡大縮小、タップで選択
  const phone = await browser.newPage();
  await phone.setViewport({ width: 820, height: 1180, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  phone.on("pageerror", (e) => problems.push(String(e).slice(0, 300)));
  await phone.goto(`http://127.0.0.1:${PORT}/index.html?t=2026-11-11T03:00:00Z&paused=1`, { waitUntil: "networkidle0" });
  await sleep(1500);
  const T = () => phone.evaluate(() => ({ focus: window.__solar.focusId, az: window.__solar.cam.tAz, dist: window.__solar.cam.tDist }));
  let t0 = await T();
  const f1 = await phone.touchscreen.touchStart(400, 700);
  await f1.move(520, 720); await f1.move(600, 730); await f1.end();
  await sleep(300);
  let t1 = await T();
  check("1 本指のドラッグで回転する", Math.abs(t1.az - t0.az) > 0.3, `方位 ${t0.az.toFixed(2)} → ${t1.az.toFixed(2)}`);
  const a = await phone.touchscreen.touchStart(360, 700), b = await phone.touchscreen.touchStart(460, 700);
  await a.move(300, 700); await b.move(520, 700); await a.move(240, 700); await b.move(580, 700);
  await a.end(); await b.end();
  await sleep(300);
  const t2 = await T();
  check("2 本指のピンチで拡大する", t2.dist < t1.dist * 0.6, `距離 ×${(t2.dist / t1.dist).toFixed(2)}`);
  const sat = await phone.evaluate(() => window.__solar.screen.venus);
  await phone.touchscreen.tap(sat.x, sat.y);
  await sleep(3000);
  check("タップで天体を選べる", (await T()).focus === "venus", (await T()).focus);
  await phone.close();
} finally {
  await browser.close();
  server.kill();
}
console.log(problems.length ? "コンソールエラー:\n" + problems.join("\n") : "コンソールエラーなし");
console.log(`${results.filter((r) => r.ok).length}/${results.length} 項目 OK`);
