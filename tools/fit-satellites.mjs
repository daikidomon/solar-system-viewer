// 衛星の位相合わせ。
// JPL の平均軌道要素の表は歳差周期が 3〜4 桁しかなく、平均黄経を 2000 年から数十年先へ進めると
// 位相がずれる。そこで JPL Horizons の位置ベクトル(現在の前後 約 27 年)に合わせて、
// 各衛星の平均黄経 L(t) = L0 + n·(t − t0) を最小二乗で求める。軌道の形と向きは表のまま使う。
//   node tools/fit-satellites.mjs      → app/data/sat-phase.js
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DATA } from "../app/data/solar-data.js";
import * as EPH from "../app/js/ephemeris.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEG = Math.PI / 180;
const T0 = 2461355.5; // 2026-11-11 00:00 TDB
const PARENT = { mars: "499", jupiter: "599", saturn: "699", uranus: "799", neptune: "899", pluto: "999" };
EPH.setSatellitePhase({});

async function vectors(command, center, jds) {
  const params = { OBJ_DATA: "NO", MAKE_EPHEM: "YES", COMMAND: command, EPHEM_TYPE: "VECTORS", CENTER: center, REF_PLANE: "ECLIPTIC", REF_SYSTEM: "ICRF", OUT_UNITS: "KM-S", VEC_TABLE: "1", TLIST: jds.map((j) => j.toFixed(5)).join(" "), TLIST_TYPE: "JD", TIME_TYPE: "TDB" };
  const q = "format=text&" + Object.entries(params).map(([k, v]) => `${k}=%27${encodeURIComponent(v)}%27`).join("&");
  for (let attempt = 0; ; attempt++) {
    try {
      const text = await (await fetch("https://ssd.jpl.nasa.gov/api/horizons.api?" + q, { headers: { "User-Agent": "solar-system-viewer build script" } })).text();
      if (!text.includes("$$SOE")) throw new Error(text.slice(0, 300));
      const out = [];
      const re = /(\d{7}\.\d+)\s*=\s*A\.D\.[^\n]*\n\s*X\s*=\s*([-\d.E+]+)\s*Y\s*=\s*([-\d.E+]+)\s*Z\s*=\s*([-\d.E+]+)/g;
      let m;
      while ((m = re.exec(text.split("$$SOE")[1].split("$$EOE")[0]))) out.push({ jd: +m[1], r: [+m[2], +m[3], +m[4]] });
      return out;
    } catch (e) {
      if (attempt >= 3) throw e;
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const wrap = (x) => ((((x + 180) % 360) + 360) % 360) - 180;

// 観測された真黄経(基準面の x 軸 → 昇交点 → 軌道に沿って測る)
function trueLongitude(s, jd, r) {
  const f = EPH.satelliteFrame(s);
  const v = [dot(r, f.x), dot(r, f.y), dot(r, f.z)];
  const node = EPH.satElementsAt(s, jd).node * DEG, inc = s.i * DEG;
  const p = [Math.cos(node), Math.sin(node), 0];
  const q = [-Math.sin(node) * Math.cos(inc), Math.cos(node) * Math.cos(inc), Math.sin(inc)];
  return (node + Math.atan2(dot(v, q), dot(v, p))) / DEG;
}
function lsq(pts) {
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (const [x, y] of pts) { sx += x; sy += y; sxx += x * x; sxy += x * y; }
  const n = pts.length, den = n * sxx - sx * sx;
  const slope = (n * sxy - sx * sy) / den;
  return { slope, intercept: (sy - slope * sx) / n };
}

// 正規方程式を解く(未知数 4 個まで)
function solve(rows, y) {
  const m = rows[0].length;
  const A = Array.from({ length: m }, () => new Array(m + 1).fill(0));
  // 列の大きさをそろえる(日数は 1e4 規模)
  const scale = rows[0].map((_, k) => Math.max(...rows.map((r) => Math.abs(r[k]))) || 1);
  rows.forEach((r, i) => { for (let a = 0; a < m; a++) { for (let b = 0; b < m; b++) A[a][b] += (r[a] / scale[a]) * (r[b] / scale[b]); A[a][m] += (r[a] / scale[a]) * y[i]; } });
  for (let c = 0; c < m; c++) {
    let p = c;
    for (let r = c + 1; r < m; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]];
    for (let r = 0; r < m; r++) if (r !== c) { const f = A[r][c] / A[c][c]; for (let k = c; k <= m; k++) A[r][k] -= f * A[c][k]; }
  }
  return A.map((row, i) => row[m] / row[i] / scale[i]);
}

const out = {};
for (const s of DATA.moons) {
  if (s.id === "moon") continue; // 月は級数で計算する
  // 周期の倍数で等比に広げたはしご(位相の巻き数を取り違えないため)
  const offs = [0, 0.17, 0.37, 0.61, 0.83].map((k) => k * s.P);
  for (let d = s.P * 1.13; d < 27.2 * 365.25; d *= 2.7) { offs.push(d); offs.push(-d * 0.93); }
  offs.sort((a, b) => Math.abs(a) - Math.abs(b));
  const recs = await vectors(String(s.code), "500@" + PARENT[s.parent], offs.map((d) => T0 + d));
  const obs = recs.map((r) => ({ d: r.jd - T0, L: trueLongitude(s, r.jd, r.r) })).sort((a, b) => Math.abs(a.d) - Math.abs(b.d));
  // 初期値: 表からの見積もり
  const wRate = s.Pw ? 360 / (s.Pw * 365.25) : 0, nodeRate = s.Pnode ? ((s.i > 90 ? 1 : -1) * 360) / (s.Pnode * 365.25) : 0;
  let n = 360 / s.P + wRate + nodeRate, L0 = obs[0].L;
  const used = [[0, obs[0].L]];
  for (let k = 1; k < obs.length; k++) {
    const pred = L0 + n * obs[k].d;
    used.push([obs[k].d, pred + wrap(obs[k].L - pred)]);
    if (used.length >= 3) { const f = lsq(used); n = f.slope; L0 = f.intercept; }
    else n = (used[1][1] - used[0][1]) / (used[1][0] - used[0][0]);
  }
  let res = used.map(([d, L]) => L - (L0 + n * d));
  let rms = Math.sqrt(res.reduce((a, b) => a + b * b, 0) / res.length);
  let lib = null;
  if (s.id === "mimas" || s.id === "tethys") {
    // ミマスとテティスは 2:4 の平均運動共鳴で平均黄経が約 70 年周期で秤動する(ミマスで ±40° 規模)。
    // 周期はデータから選ぶ: 55〜90 年を試して残差が最小のものを取る
    let best = null;
    for (let years = 55; years <= 90; years += 0.25) {
      const P = years * 365.25;
      const rows = used.map(([d]) => [1, d, Math.sin((2 * Math.PI * d) / P), Math.cos((2 * Math.PI * d) / P)]);
      const sol = solve(rows, used.map((u) => u[1]));
      const r = used.map(([d, L], i) => L - rows[i].reduce((a, v, k) => a + v * sol[k], 0));
      const e = Math.sqrt(r.reduce((a, b) => a + b * b, 0) / r.length);
      if (!best || e < best.e) best = { e, P, sol, r };
    }
    L0 = best.sol[0]; n = best.sol[1]; lib = { P: best.P, A: +best.sol[2].toFixed(4), B: +best.sol[3].toFixed(4) };
    res = best.r; rms = best.e;
    L0 += 0; // 秤動項は別に持つ
  }
  out[s.id] = { t0: T0, L0: +(((L0 % 360) + 360) % 360).toFixed(4), n: +n.toFixed(8), rmsDeg: +rms.toFixed(2), maxDeg: +Math.max(...res.map(Math.abs)).toFixed(2), points: used.length };
  if (lib) { out[s.id].lib = lib; console.log(`   秤動: 周期 ${(lib.P / 365.25).toFixed(2)} 年, 振幅 ${Math.hypot(lib.A, lib.B).toFixed(2)}°`); }
  console.log(`${s.id.padEnd(10)} n=${n.toFixed(6)}°/日 (表からの見積 ${(360 / s.P + wRate + nodeRate).toFixed(6)})  L0=${out[s.id].L0}°  残差 rms ${rms.toFixed(2)}° 最大 ${out[s.id].maxDeg}°  点数 ${used.length}`);
}
fs.writeFileSync(path.join(ROOT, "app/data/sat-phase.js"),
  "// 生成物: tools/fit-satellites.mjs が JPL Horizons の位置ベクトルに合わせて求めた衛星の平均黄経。\n// L(t) = L0 + n·(t − t0) [度]。t0 はユリウス日(TDB)。\nexport const SAT_PHASE = " + JSON.stringify(out, null, 1) + ";\n");
