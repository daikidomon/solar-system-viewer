// 位置計算の検算: JPL Horizons(DE441 ほか)のベクトルと、このアプリの天体暦を突き合わせる。
//   node tools/verify-ephemeris.mjs            (ネットワーク接続が必要)
// 結果は raw/verify-report.json にも保存する。
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DATA } from "../app/data/solar-data.js";
import * as EPH from "../app/js/ephemeris.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TT_OFFSET = 69.184 / 86400;
const DEG = Math.PI / 180;

async function horizons(params) {
  const q =
    "format=text&" +
    Object.entries({ OBJ_DATA: "NO", MAKE_EPHEM: "YES", ...params })
      .map(([k, v]) => `${k}=%27${encodeURIComponent(v)}%27`)
      .join("&");
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch("https://ssd.jpl.nasa.gov/api/horizons.api?" + q, { headers: { "User-Agent": "solar-system-viewer verification script" } });
      const text = await res.text();
      if (text.includes("$$SOE")) return text;
      if (attempt === 2) throw new Error("Horizons: " + text.slice(0, 400));
    } catch (e) {
      if (attempt === 2) throw e;
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
}
// 日心(または惑星中心)・黄道 J2000 の位置ベクトル(km)
async function vector(command, center, jd) {
  const text = await horizons({ COMMAND: command, EPHEM_TYPE: "VECTORS", CENTER: center, REF_PLANE: "ECLIPTIC", REF_SYSTEM: "ICRF", OUT_UNITS: "KM-S", VEC_TABLE: "1", TLIST: jd.toFixed(6), TLIST_TYPE: "JD", TIME_TYPE: "TDB" });
  const body = text.split("$$SOE")[1].split("$$EOE")[0];
  const m = /X\s*=\s*([-\d.E+]+)\s*Y\s*=\s*([-\d.E+]+)\s*Z\s*=\s*([-\d.E+]+)/.exec(body);
  return [parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3])];
}
const norm = (v) => Math.hypot(...v);
const angle = (a, b) => Math.acos(Math.max(-1, Math.min(1, (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (norm(a) * norm(b))))) / DEG;
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];

const DATES = [
  ["1990-01-01", 2447892.5],
  ["2026-11-11", 2461355.5],
  ["2045-06-01", 2468132.5],
];
const NAIF = { mercury: "199", venus: "299", earth: "399", mars: "499", jupiter: "599", saturn: "699", uranus: "799", neptune: "899" };
const DWARF = { pluto: "999", ceres: "1;", eris: "136199;", haumea: "136108;", makemake: "136472;" };
const PARENT = { earth: "399", mars: "499", jupiter: "599", saturn: "699", uranus: "799", neptune: "899", pluto: "999" };

const report = { generated: new Date().toISOString().slice(0, 10), heliocentric: [], satellites: [], rotation: [] };
console.log("== 日心位置(黄道 J2000) 本アプリ vs JPL Horizons ==");
console.log("天体        日付         角度差(°)   距離差(km)      距離差(%)");
for (const [label, jd] of DATES) {
  const mine = EPH.positions(jd - TT_OFFSET);
  for (const [key, cmd] of [...Object.entries(NAIF), ...Object.entries(DWARF)]) {
    const ref = await vector(cmd, "500@10", jd);
    const a = angle(mine[key], ref), dr = norm(mine[key]) - norm(ref);
    report.heliocentric.push({ body: key, date: label, angleDeg: +a.toFixed(5), distKm: Math.round(dr), distPct: +((100 * dr) / norm(ref)).toFixed(5) });
    console.log(`${key.padEnd(10)}  ${label}  ${a.toFixed(4).padStart(9)}  ${Math.round(dr).toLocaleString().padStart(14)}  ${((100 * dr) / norm(ref)).toFixed(4).padStart(9)}`);
  }
}

console.log("\n== 衛星(親天体から見た方向と距離) ==");
console.log("衛星        日付         角度差(°)   距離差(km)   距離差(%)");
// 位相合わせに使っていない日付で確かめる
for (const [label, jd] of [["2024-02-29", 2460369.5], ["2029-07-04", 2462321.5], ["2035-01-20", 2464347.5]]) {
  const mine = EPH.positions(jd - TT_OFFSET);
  for (const s of DATA.moons) {
    const ref = await vector(String(s.code), "500@" + PARENT[s.parent], jd);
    const rel = sub(mine[s.id], mine[s.parent]);
    const a = angle(rel, ref), dr = norm(rel) - norm(ref);
    report.satellites.push({ body: s.id, date: label, angleDeg: +a.toFixed(3), distKm: Math.round(dr), distPct: +((100 * dr) / norm(ref)).toFixed(3) });
    console.log(`${s.id.padEnd(10)}  ${label}  ${a.toFixed(3).padStart(9)}  ${Math.round(dr).toLocaleString().padStart(11)}  ${((100 * dr) / norm(ref)).toFixed(3).padStart(8)}`);
  }
}

// 自転の検算: 太陽直下点の緯度・経度(Horizons の観測量 15)
console.log("\n== 自転(太陽直下点) ==");
async function subSolar(command, center, jd) {
  const text = await horizons({ COMMAND: command, EPHEM_TYPE: "OBSERVER", CENTER: center, QUANTITIES: "15", TLIST: jd.toFixed(6), TLIST_TYPE: "JD", TIME_TYPE: "UT", ANG_FORMAT: "DEG", CSV_FORMAT: "YES" });
  const line = text.split("$$SOE")[1].split("$$EOE")[0].trim().split("\n")[0];
  const cells = line.split(",").map((c) => c.trim()).filter((c) => /^-?\d+\.\d+$/.test(c));
  return { lon: parseFloat(cells[cells.length - 2]), lat: parseFloat(cells[cells.length - 1]) };
}
for (const [key, cmd, center, westPositive] of [["earth", "399", "500@10", false], ["mars", "499", "500@399", true], ["jupiter", "599", "500@399", true]]) {
  const jdUT = 2461355.5 + 0.5; // 2026-11-11 12:00 UT
  try {
    const ref = await subSolar(cmd, center, jdUT);
    // Horizons の値は「観測者に見える時刻」のもの。光が届くまでの時間だけ自転を戻して比べる
    const P = EPH.positions(jdUT);
    const obs = center === "500@10" ? P.sun : P.earth;
    const lightDays = Math.hypot(P[key][0] - obs[0], P[key][1] - obs[1], P[key][2] - obs[2]) / 299792.458 / 86400;
    const mine = EPH.subSolarPoint(key, jdUT - lightDays, EPH.positions(jdUT - lightDays)[key]);
    const refEast = westPositive ? (360 - ref.lon) % 360 : ref.lon;
    const dLon = ((mine.lon - refEast + 540) % 360) - 180;
    report.rotation.push({ body: key, mine: { lat: +mine.lat.toFixed(2), lonE: +((mine.lon + 360) % 360).toFixed(2) }, horizons: { lat: ref.lat, lonE: +refEast.toFixed(2) }, dLon: +dLon.toFixed(2), dLat: +(mine.lat - ref.lat).toFixed(2) });
    console.log(`${key.padEnd(8)} 本アプリ 緯度 ${mine.lat.toFixed(2)}° 東経 ${((mine.lon + 360) % 360).toFixed(2)}° | Horizons 緯度 ${ref.lat}° 東経 ${refEast.toFixed(2)}° | 差 経度 ${dLon.toFixed(2)}° 緯度 ${(mine.lat - ref.lat).toFixed(2)}°`);
  } catch (e) {
    console.log(key, "取得失敗:", String(e).slice(0, 200));
  }
}
fs.writeFileSync(path.join(ROOT, "raw/verify-report.json"), JSON.stringify(report, null, 1));
