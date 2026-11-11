// 画面まわり: 時間の進行、操作(マウス・タッチ・キー)、一覧、情報パネル、ラベル。
import { SolarScene, K_SIZE, K_SUN } from "./scene.js";
import * as EPH from "./ephemeris.js";
import { BODIES, BY_ID, EARTH_RADIUS, EARTH_MASS, KIND_LABEL, SOURCES } from "./bodies.js";

const $ = (id) => document.getElementById(id);
const canvas = $("view");
const scene = new SolarScene(canvas);
window.__solar = scene; // 確認用

// ---- 時間 -----------------------------------------------------------------------
const RATES = [1, 60, 600, 3600, 6 * 3600, 86400, 7 * 86400, 30 * 86400, 365.25 * 86400]; // シミュレーション秒 / 実秒
const RATE_LABEL = ["実時間", "1分", "10分", "1時間", "6時間", "1日", "1週間", "30日", "1年"];
const T_MIN = Date.UTC(1000, 0, 1), T_MAX = Date.UTC(3000, 0, 1);
const state = { t: Date.now(), playing: true, rate: 5, dir: 1, selected: "sun" };
const q = new URLSearchParams(location.search);
if (q.get("t")) state.t = Date.parse(q.get("t")) || state.t;
if (q.get("paused")) state.playing = false;

const fmtDate = new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "short" });
const fmtTime = new Intl.DateTimeFormat("ja-JP", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZoneName: "short" });
function renderClock() {
  const d = new Date(state.t);
  $("date-text").textContent = fmtDate.format(d);
  $("time-text").textContent = fmtTime.format(d);
  $("speed-text").textContent = state.rate === 0 ? (state.dir > 0 ? "実時間" : "逆再生 実時間") : `${state.dir > 0 ? "" : "逆再生 "}${RATE_LABEL[state.rate]} / 秒`;
  $("btn-play").textContent = state.playing ? "一時停止" : "再生";
  $("btn-play").setAttribute("aria-pressed", String(state.playing));
}
function stepRate(delta) {
  // 逆 1年 … 逆 実時間 | 実時間 … 1年 を 1 本の目盛りとして動かす
  let pos = state.dir > 0 ? state.rate : -state.rate - 1;
  pos = Math.max(-RATES.length, Math.min(RATES.length - 1, pos + delta));
  state.dir = pos >= 0 ? 1 : -1;
  state.rate = pos >= 0 ? pos : -pos - 1;
  state.playing = true;
  renderClock();
}
$("btn-play").onclick = () => { state.playing = !state.playing; renderClock(); };
$("btn-slower").onclick = () => stepRate(-1);
$("btn-faster").onclick = () => stepRate(1);
$("btn-now").onclick = () => { state.t = Date.now(); renderClock(); };
$("date-input").onchange = (e) => {
  const v = Date.parse(e.target.value);
  if (!Number.isNaN(v)) { state.t = Math.max(T_MIN, Math.min(T_MAX, v)); renderClock(); }
};
$("date-input").onfocus = (e) => {
  const d = new Date(state.t - new Date(state.t).getTimezoneOffset() * 60000);
  e.target.value = d.toISOString().slice(0, 16);
};

// ---- 表示の切り替え ---------------------------------------------------------------
function setScaleMode(mode) {
  scene.setScaleMode(mode);
  $("scale-easy").setAttribute("aria-pressed", String(mode === "easy"));
  $("scale-real").setAttribute("aria-pressed", String(mode === "real"));
  $("scale-note").textContent = mode === "easy"
    ? `見やすい表示 — 大きさを誇張しています（惑星・衛星 ×${K_SIZE}、太陽 ×${K_SUN}、衛星の軌道は圧縮）。惑星どうしの大きさの比と、軌道の距離は実際のとおり。`
    : "実スケール — 距離も大きさも実際の比率。惑星は点にしか見えません。天体を選ぶと、その場所まで飛びます。";
}
$("scale-easy").onclick = () => setScaleMode("easy");
$("scale-real").onclick = () => setScaleMode("real");
for (const key of ["orbits", "labels", "moons", "belt"]) {
  const el = $("tg-" + key);
  el.onclick = () => {
    const on = el.getAttribute("aria-pressed") !== "true";
    el.setAttribute("aria-pressed", String(on));
    scene.setShow(key, on);
  };
}
$("btn-home").onclick = () => { scene.home(); select("sun", false); };
$("btn-about").onclick = () => $("about").showModal();
$("about-close").onclick = () => $("about").close();
$("btn-list").onclick = () => document.body.classList.toggle("list-open");

// ---- 一覧 -----------------------------------------------------------------------
const listEl = $("list");
function addItem(b, depth) {
  const btn = document.createElement("button");
  btn.className = "item" + (depth ? " child" : "");
  btn.dataset.id = b.id;
  btn.innerHTML = `<span class="dot" style="background:${b.color}"></span><span class="nm">${b.name}</span><span class="en">${b.en}</span>`;
  btn.onclick = () => { select(b.id, true); document.body.classList.remove("list-open"); };
  listEl.appendChild(btn);
}
function addHeading(text) {
  const h = document.createElement("div");
  h.className = "heading";
  h.textContent = text;
  listEl.appendChild(h);
}
addHeading("恒星");
addItem(BY_ID.sun, 0);
addHeading("惑星と衛星");
for (const b of BODIES.filter((x) => x.kind === "planet")) { addItem(b, 0); for (const c of b.children) addItem(BY_ID[c], 1); }
addHeading("準惑星");
for (const b of BODIES.filter((x) => x.kind === "dwarf")) { addItem(b, 0); for (const c of b.children) addItem(BY_ID[c], 1); }

// ---- 情報パネル -------------------------------------------------------------------
const AU = EPH.AU_KM;
const num = (v, digits = 0) => v.toLocaleString("ja-JP", { maximumFractionDigits: digits, minimumFractionDigits: digits });
function km(v) {
  if (v >= 1e8) return `${num(v / 1e8, 2)} 億 km`;
  if (v >= 1e4) return `${num(v / 1e4, 1)} 万 km`;
  return `${num(v, 0)} km`;
}
function period(days) {
  const d = Math.abs(days);
  if (d >= 365.25 * 2) return `${num(d / 365.25, 2)} 年`;
  if (d >= 2) return `${num(d, 2)} 日`;
  return `${num(d * 24, 2)} 時間`;
}
function lightTime(kmDist) {
  const s = kmDist / 299792.458;
  if (s < 90) return `${num(s, 1)} 秒`;
  if (s < 5400) return `${num(s / 60, 1)} 分`;
  return `${num(s / 3600, 2)} 時間`;
}
function mass(kg) {
  const e = Math.floor(Math.log10(kg));
  return `${num(kg / Math.pow(10, e), 3)} × 10<sup>${e}</sup> kg`;
}
function staticRows(b) {
  const rows = [];
  rows.push(["分類", b.kind === "moon" ? `${BY_ID[b.parent].name}の衛星` : KIND_LABEL[b.kind]]);
  rows.push(["平均半径", `${num(b.radius, b.radius < 100 ? 1 : 0)} km<small>地球の ${num(b.radius / EARTH_RADIUS, b.radius / EARTH_RADIUS < 0.1 ? 4 : 2)} 倍</small>`]);
  if (b.mass) rows.push(["質量", `${mass(b.mass)}<small>地球の ${b.mass / EARTH_MASS < 0.001 ? (b.mass / EARTH_MASS).toExponential(2) : num(b.mass / EARTH_MASS, b.mass / EARTH_MASS < 1 ? 4 : 2)} 倍</small>`]);
  if (b.density) rows.push(["平均密度", `${num(b.density, 2)} g/cm³`]);
  if (b.orbYears) rows.push(["公転周期", period(b.orbYears * 365.25)]);
  if (b.orbDays) rows.push(["公転周期", period(b.orbDays)]);
  if (b.semiMajorKm) rows.push(["軌道長半径", km(b.semiMajorKm)]);
  if (b.rotDays && b.kind !== "moon" && b.kind !== "star") rows.push(["自転周期", period(b.rotDays) + (b.rotDays < 0 ? "<small>公転と逆向き</small>" : "")]);
  if (b.kind === "moon") rows.push(["自転", "公転と同期<small>同じ面を親天体に向ける</small>"]);
  if (b.obliquity != null) rows.push(["赤道の傾き", `${num(b.obliquity, 1)}°`]);
  if (b.meanTempC != null) rows.push(["平均気温", `${num(b.meanTempC)} ℃`]);
  if (b.gravity) rows.push(["表面重力", `${num(b.gravity, 2)} m/s²`]);
  if (b.moons != null) rows.push(["衛星の数", `${b.moons}<small>NASA ファクトシートの値</small>`]);
  if (b.kind === "star") { rows.push(["自転周期", period(b.rotDays) + "<small>赤道付近</small>"]); }
  return rows;
}
function select(id, fly) {
  state.selected = id;
  const b = BY_ID[id];
  if (fly) scene.focus(id);
  for (const el of listEl.querySelectorAll(".item")) el.setAttribute("aria-current", String(el.dataset.id === id));
  $("info-name").textContent = b.name;
  $("info-en").textContent = b.en;
  $("info-desc").textContent = b.desc;
  $("info-static").innerHTML = staticRows(b).map(([k, v]) => `<div class="row"><dt>${k}</dt><dd>${v}</dd></div>`).join("");
  $("info-tex").textContent = "表面の画像: " + b.texNote;
  $("info").hidden = false;
  renderLive();
}
function renderLive() {
  const b = BY_ID[state.selected], P = scene.real;
  if (!P) return;
  const p = P[b.id], e = P.earth, rows = [];
  const dSun = Math.hypot(p[0], p[1], p[2]);
  if (b.kind !== "star") rows.push(["太陽からの距離", `${km(dSun)}<small>${num(dSun / AU, 3)} au ・ 光で ${lightTime(dSun)}</small>`]);
  if (b.id !== "earth") {
    const dE = Math.hypot(p[0] - e[0], p[1] - e[1], p[2] - e[2]);
    rows.push(["地球からの距離", `${km(dE)}<small>${num(dE / AU, dE / AU < 0.01 ? 5 : 3)} au ・ 光で ${lightTime(dE)}</small>`]);
  }
  if (b.kind === "moon" && b.parent !== "earth") {
    const pr = P[b.parent];
    rows.push([`${BY_ID[b.parent].name}からの距離`, km(Math.hypot(p[0] - pr[0], p[1] - pr[1], p[2] - pr[2]))]);
  }
  if (b.kind !== "star") {
    // 公転の速さ: 60 秒後の位置との差(衛星は親天体に対する速さ)
    const jd = EPH.jdFromMs(state.t), P2 = EPH.positions(jd + 60 / 86400);
    const ref = b.kind === "moon" ? b.parent : "sun";
    const v = Math.hypot(P2[b.id][0] - P2[ref][0] - (p[0] - P[ref][0]), P2[b.id][1] - P2[ref][1] - (p[1] - P[ref][1]), P2[b.id][2] - P2[ref][2] - (p[2] - P[ref][2])) / 60;
    rows.push(["公転の速さ", `${num(v, 2)} km/s<small>${b.kind === "moon" ? BY_ID[b.parent].name : "太陽"}に対して</small>`]);
  }
  $("info-live").innerHTML = rows.map(([k, v]) => `<div class="row"><dt>${k}</dt><dd>${v}</dd></div>`).join("");
}

// ---- ラベル ---------------------------------------------------------------------
const labelsEl = $("labels");
const labels = {};
for (const b of BODIES) {
  const el = document.createElement("button");
  el.className = "label " + b.kind;
  el.textContent = b.name;
  el.onclick = () => select(b.id, true);
  labelsEl.appendChild(el);
  labels[b.id] = { el, w: b.name.length * 14 + 18 };
}
const PRIORITY = { star: 0, planet: 1, dwarf: 2, moon: 3 };
function renderLabels() {
  const kept = [];
  const order = BODIES.slice().sort((a, b) => (a.id === state.selected ? -1 : b.id === state.selected ? 1 : PRIORITY[a.kind] - PRIORITY[b.kind]));
  for (const b of order) {
    const s = scene.screen[b.id], L = labels[b.id];
    let on = scene.show.labels && s && s.onScreen && s.pickable && s.r < scene.height * 0.6;
    const x = s ? s.x + Math.max(6, Math.min(s.r, 400) * 0.72) + 6 : 0, y = s ? s.y - Math.max(6, Math.min(s.r, 400) * 0.72) - 6 : 0;
    if (on) {
      const box = [x, y - 12, x + L.w, y + 12];
      if (kept.some((k) => box[0] < k[2] && box[2] > k[0] && box[1] < k[3] && box[3] > k[1])) on = false;
      else kept.push(box);
    }
    L.el.style.display = on ? "block" : "none";
    if (on) L.el.style.transform = `translate(${x.toFixed(1)}px, ${(y - 12).toFixed(1)}px)`;
    L.el.classList.toggle("selected", b.id === state.selected);
  }
}

// ---- マウス・タッチ・キー -----------------------------------------------------------
const pointers = new Map();
let dragDist = 0, pinch = 0;
canvas.addEventListener("pointerdown", (e) => {
  canvas.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 1) dragDist = 0;
  if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); }
});
canvas.addEventListener("pointermove", (e) => {
  const p = pointers.get(e.pointerId);
  if (!p) {
    canvas.style.cursor = scene.pick(e.offsetX, e.offsetY) ? "pointer" : "grab";
    return;
  }
  const dx = e.clientX - p.x, dy = e.clientY - p.y;
  p.x = e.clientX; p.y = e.clientY;
  if (pointers.size === 1) {
    dragDist += Math.abs(dx) + Math.abs(dy);
    scene.rotate(dx, dy);
    canvas.style.cursor = "grabbing";
  } else if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    if (pinch > 0 && d > 0) scene.zoom(pinch / d);
    pinch = d;
    dragDist = 99;
  }
});
function release(e) {
  if (!pointers.has(e.pointerId)) return;
  pointers.delete(e.pointerId);
  if (pointers.size === 0 && dragDist < 6 && e.type === "pointerup") {
    const rect = canvas.getBoundingClientRect();
    const id = scene.pick(e.clientX - rect.left, e.clientY - rect.top);
    if (id) select(id, true);
  }
  canvas.style.cursor = "grab";
}
canvas.addEventListener("pointerup", release);
canvas.addEventListener("pointercancel", release);
canvas.addEventListener("wheel", (e) => { e.preventDefault(); scene.zoom(Math.exp(e.deltaY * (e.ctrlKey ? 0.01 : 0.0016))); }, { passive: false });
window.addEventListener("keydown", (e) => {
  if (e.target.tagName === "INPUT" || $("about").open) return;
  if (e.code === "Space") { e.preventDefault(); $("btn-play").click(); }
  else if (e.key === "ArrowRight") stepRate(1);
  else if (e.key === "ArrowLeft") stepRate(-1);
  else if (e.key === "Escape" || e.key === "h") $("btn-home").click();
  else if (e.key === "+" || e.key === "=") scene.zoom(0.8);
  else if (e.key === "-") scene.zoom(1.25);
  else if (/^[1-8]$/.test(e.key)) select(BODIES.filter((b) => b.kind === "planet")[+e.key - 1].id, true);
});
window.addEventListener("resize", () => scene.resize());

// ---- 出典 -----------------------------------------------------------------------
$("about-sources").innerHTML = [
  ["惑星の軌道", "JPL Solar System Dynamics「Approximate Positions of the Planets」のケプラー要素と変化率", SOURCES.elements],
  ["衛星の軌道", "JPL「Planetary Satellite Mean Elements」。位相は JPL Horizons の位置に合わせて調整", SOURCES.satElements],
  ["月の位置", "J. Meeus『Astronomical Algorithms』の級数（主要項）。JPL Horizons と照合", "https://ssd.jpl.nasa.gov/horizons/"],
  ["準惑星の軌道", "JPL Small-Body Database の接触軌道要素", SOURCES.dwarfElements],
  ["大きさ・質量など", "JPL「Planetary Physical Parameters」「Planetary Satellite Physical Parameters」、NASA NSSDCA Planetary Fact Sheets", SOURCES.factSheets],
  ["自転", "NAIF 汎用 PCK pck00011（IAU の自転軸と本初子午線）", SOURCES.rotation],
  ["土星の環", "NASA NSSDCA「Saturnian Rings Fact Sheet」の半径から生成", "https://nssdc.gsfc.nasa.gov/planetary/factsheet/satringfact.html"],
  ["星空", "Yale Bright Star Catalogue 第 5 版（9,096 星）", "http://tdc-www.harvard.edu/catalogs/bsc5.html"],
  ["天体の画像", "NASA 3D Resources（著作権なし）／NASA GSFC Scientific Visualization Studio（Blue Marble、CGI Moon Kit）／NASA Earth Observatory（夜景）／MESSENGER 水星モザイク（NASA / JHUAPL / Carnegie、パブリックドメイン）", "https://github.com/nasa/NASA-3D-Resources"],
  ["描画", "three.js（MIT License）", "https://threejs.org/"],
].map(([k, v, url]) => `<div class="row"><dt>${k}</dt><dd>${v}<small>${url}</small></dd></div>`).join("");

// ---- ループ ---------------------------------------------------------------------
let last = performance.now(), liveAt = 0, clockAt = 0;
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (state.playing) state.t = Math.max(T_MIN, Math.min(T_MAX, state.t + dt * 1000 * RATES[state.rate] * state.dir));
  scene.update(EPH.jdFromMs(state.t), dt);
  renderLabels();
  if (now - clockAt > 100) { clockAt = now; renderClock(); }
  if (now - liveAt > 250) { liveAt = now; renderLive(); }
  requestAnimationFrame(frame);
}
scene.real = EPH.positions(EPH.jdFromMs(state.t));
setScaleMode(q.get("scale") === "real" ? "real" : "easy");
if (q.get("scale") === "real") scene.scale = 0;
select(q.get("focus") && BY_ID[q.get("focus")] ? q.get("focus") : "sun", false);
if (q.get("focus") && BY_ID[q.get("focus")]) scene.focus(q.get("focus"), { instant: true });
renderClock();
requestAnimationFrame(frame);

if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register("sw.js").catch(() => {});
