// 天体暦: 日時から各天体の位置と向きを計算する(ブラウザと Node の両方で動く)。
//
//   惑星      JPL "Approximate Positions of the Planets" のケプラー要素と変化率 → ケプラー方程式
//   月        Meeus『Astronomical Algorithms』47 章の級数の主要項(JPL Horizons と照合済み)
//   他の衛星  JPL の平均軌道要素(ラプラス面/赤道面基準)を歳差つきで進める
//   準惑星    JPL SBDB の接触軌道要素を二体問題で進める
//   自転      NAIF PCK(IAU)の自転軸と本初子午線
//
// 座標系は日心・黄道 J2000(x: 春分点、z: 黄道の北)。長さは km。
import { DATA } from "../data/solar-data.js";
import { SAT_PHASE } from "../data/sat-phase.js";

export const AU_KM = 149597870.7;
export const DEG = Math.PI / 180;
const J2000 = 2451545.0;
const OBLIQUITY = 23.4392911 * DEG; // J2000 の平均黄道傾斜角
const COS_E = Math.cos(OBLIQUITY), SIN_E = Math.sin(OBLIQUITY);
const TT_MINUS_UTC = 69.184; // 秒(2017 年以降)
const EARTH_MOON_MASS_RATIO = 81.3005682; // DE440

export const jdFromMs = (ms) => ms / 86400000 + 2440587.5; // UTC のユリウス日
export const msFromJd = (jd) => (jd - 2440587.5) * 86400000;
const ttFromUtc = (jd) => jd + TT_MINUS_UTC / 86400;

const mod360 = (x) => ((x % 360) + 360) % 360;

// ケプラー方程式 E − e sin E = M(ニュートン法)
export function solveKepler(M, e) {
  let E = M + e * Math.sin(M) * (1 + e * Math.cos(M));
  for (let i = 0; i < 15; i++) {
    const d = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= d;
    if (Math.abs(d) < 1e-13) break;
  }
  return E;
}

// 軌道面内の座標 (xp, yp) を、近点引数 w・昇交点 node・傾斜 inc で基準面へ回す
function rotateOrbit(xp, yp, w, node, inc) {
  const cw = Math.cos(w), sw = Math.sin(w), cn = Math.cos(node), sn = Math.sin(node), ci = Math.cos(inc), si = Math.sin(inc);
  return [
    (cw * cn - sw * sn * ci) * xp + (-sw * cn - cw * sn * ci) * yp,
    (cw * sn + sw * cn * ci) * xp + (-sw * sn + cw * cn * ci) * yp,
    sw * si * xp + cw * si * yp,
  ];
}
const eqToEcl = ([x, y, z]) => [x, COS_E * y + SIN_E * z, -SIN_E * y + COS_E * z]; // 赤道 J2000 → 黄道 J2000

// ---- 惑星 ---------------------------------------------------------------------
// 1800–2050 年は表 1、それ以外は表 2(木星以遠は補正項つき)を使う
export function planetElements(key, jdTT) {
  const T = (jdTT - J2000) / 36525;
  const p = DATA.planets[key];
  const inRange = T >= -2 && T <= 0.5;
  const el = inRange ? p.el1 : p.el2;
  const v = (k) => el[k][0] + el[k][1] * T;
  const a = v("a"), e = v("e"), I = v("I"), L = v("L"), peri = v("peri"), node = v("node");
  let M = L - peri;
  if (!inRange && el.bcsf) {
    const [b, c, s, f] = el.bcsf;
    M += b * T * T + c * Math.cos(f * T * DEG) + s * Math.sin(f * T * DEG);
  }
  return { a, e, I, w: peri - node, node, M: mod360(M) };
}
function ellipsePoint(a, e, E) {
  return [a * (Math.cos(E) - e), a * Math.sqrt(1 - e * e) * Math.sin(E)];
}
export function planetPosition(key, jdTT) {
  const el = planetElements(key, jdTT);
  const E = solveKepler(el.M * DEG, el.e);
  const [xp, yp] = ellipsePoint(el.a * AU_KM, el.e, E);
  return rotateOrbit(xp, yp, el.w * DEG, el.node * DEG, el.I * DEG);
}
// 軌道の形(いまの要素での楕円)を n 点でなぞる
export function planetOrbit(key, jdTT, n = 512) {
  const el = planetElements(key, jdTT);
  const out = new Float64Array(n * 3);
  for (let i = 0; i < n; i++) {
    const [xp, yp] = ellipsePoint(el.a * AU_KM, el.e, (i / n) * 2 * Math.PI);
    const p = rotateOrbit(xp, yp, el.w * DEG, el.node * DEG, el.I * DEG);
    out.set(p, i * 3);
  }
  return out;
}

// ---- 月(地心・黄道 J2000) ------------------------------------------------------
// [D, M, M', F, 経度の係数(1e-6 度), 距離の係数(1e-3 km)]
const MOON_LR = [
  [0, 0, 1, 0, 6288774, -20905355], [2, 0, -1, 0, 1274027, -3699111], [2, 0, 0, 0, 658314, -2955968], [0, 0, 2, 0, 213618, -569925],
  [0, 1, 0, 0, -185116, 48888], [0, 0, 0, 2, -114332, -3149], [2, 0, -2, 0, 58793, 246158], [2, -1, -1, 0, 57066, -152138],
  [2, 0, 1, 0, 53322, -170733], [2, -1, 0, 0, 45758, -204586], [0, 1, -1, 0, -40923, -129620], [1, 0, 0, 0, -34720, 108743],
  [0, 1, 1, 0, -30383, 104755], [2, 0, 0, -2, 15327, 10321], [0, 0, 1, 2, -12528, 0], [0, 0, 1, -2, 10980, 79661],
  [4, 0, -1, 0, 10675, -34782], [0, 0, 3, 0, 10034, -23210], [4, 0, -2, 0, 8548, -21636], [2, 1, -1, 0, -7888, 24208],
  [2, 1, 0, 0, -6766, 30824], [1, 0, -1, 0, -5163, -8379], [1, 1, 0, 0, 4987, -16675], [2, -1, 1, 0, 4036, -12831],
  [2, 0, 2, 0, 3994, -10445], [4, 0, 0, 0, 3861, -11650], [2, 0, -3, 0, 3665, 14403], [0, 1, -2, 0, -2689, -7003],
  [2, 0, -1, 2, -2602, 0], [2, -1, -2, 0, 2390, 10056], [1, 0, 1, 0, -2348, 6322], [2, -2, 0, 0, 2236, -9884],
];
// [D, M, M', F, 緯度の係数(1e-6 度)]
const MOON_B = [
  [0, 0, 0, 1, 5128122], [0, 0, 1, 1, 280602], [0, 0, 1, -1, 277693], [2, 0, 0, -1, 173237], [2, 0, -1, 1, 55413],
  [2, 0, -1, -1, 46271], [2, 0, 0, 1, 32573], [0, 0, 2, 1, 17198], [2, 0, 1, -1, 9266], [0, 0, 2, -1, 8822],
  [2, -1, 0, -1, 8216], [2, 0, -2, -1, 4324], [2, 0, 1, 1, 4200], [2, 1, 0, -1, -3359], [2, -1, -1, 1, 2463],
  [2, -1, 0, 1, 2211], [2, -1, -1, -1, 2065], [0, 1, -1, -1, -1870], [4, 0, -1, -1, 1828], [0, 1, 0, 1, -1794],
];
export function moonGeocentric(jdTT) {
  const T = (jdTT - J2000) / 36525;
  const Lp = 218.3164477 + 481267.88123421 * T - 0.0015786 * T * T + (T * T * T) / 538841;
  const D = (297.8501921 + 445267.1114034 * T - 0.0018819 * T * T + (T * T * T) / 545868) * DEG;
  const M = (357.5291092 + 35999.0502909 * T - 0.0001536 * T * T) * DEG;
  const Mp = (134.9633964 + 477198.8675055 * T + 0.0087414 * T * T + (T * T * T) / 69699) * DEG;
  const F = (93.272095 + 483202.0175233 * T - 0.0036539 * T * T) * DEG;
  const Ecc = 1 - 0.002516 * T - 0.0000074 * T * T; // 地球軌道の離心率の変化
  let sl = 0, sr = 0, sb = 0;
  for (const [d, m, mp, f, l, r] of MOON_LR) {
    const arg = d * D + m * M + mp * Mp + f * F;
    const k = Math.abs(m) === 1 ? Ecc : Math.abs(m) === 2 ? Ecc * Ecc : 1;
    sl += l * k * Math.sin(arg);
    sr += r * k * Math.cos(arg);
  }
  for (const [d, m, mp, f, b] of MOON_B) {
    const k = Math.abs(m) === 1 ? Ecc : Math.abs(m) === 2 ? Ecc * Ecc : 1;
    sb += b * k * Math.sin(d * D + m * M + mp * Mp + f * F);
  }
  const A1 = (119.75 + 131.849 * T) * DEG, A2 = (53.09 + 479264.29 * T) * DEG, A3 = (313.45 + 481266.484 * T) * DEG;
  sl += 3958 * Math.sin(A1) + 1962 * Math.sin(Lp * DEG - F) + 318 * Math.sin(A2);
  sb += -2235 * Math.sin(Lp * DEG) + 382 * Math.sin(A3) + 175 * Math.sin(A1 - F) + 175 * Math.sin(A1 + F) + 127 * Math.sin(Lp * DEG - Mp) - 115 * Math.sin(Lp * DEG + Mp);
  // 当日の分点 → J2000 分点(黄経の一般歳差を引く)
  const precession = (5028.796195 * T + 1.1054348 * T * T) / 3600;
  const lon = (Lp + sl / 1e6 - precession) * DEG, lat = (sb / 1e6) * DEG, dist = 385000.56 + sr / 1000;
  return [dist * Math.cos(lat) * Math.cos(lon), dist * Math.cos(lat) * Math.sin(lon), dist * Math.sin(lat)];
}

// ---- 衛星(JPL 平均軌道要素) -----------------------------------------------------
function epochJD(str) {
  const m = /^(\d{4})-(\d{2})-(\d{2})(\.\d+)?/.exec(str);
  const day = +m[3] + (m[4] ? +m[4] : 0);
  return Date.UTC(+m[1], +m[2] - 1, 1) / 86400000 + 2440587.5 + (day - 1);
}
const satCache = new Map();
function satFrame(s) {
  // 基準面の極 (RA, Dec) から、基準面の直交基底を黄道 J2000 で作る。
  // x 軸 = 基準面が ICRF 赤道を北向きに横切る点(昇交点)、z 軸 = 極。
  if (satCache.has(s.id)) return satCache.get(s.id);
  let fr;
  if (s.frame === "ecliptic") fr = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1], t0: epochJD(s.epoch) };
  else {
    // ラプラス面は表の極、赤道面基準(天王星・海王星・冥王星の衛星)は親天体の自転軸を使う
    const pole = s.poleRA != null ? [s.poleRA, s.poleDec] : [DATA.rotation[s.parent].ra[0], DATA.rotation[s.parent].dec[0]];
    const ra = pole[0] * DEG, dec = pole[1] * DEG;
    let z = [Math.cos(dec) * Math.cos(ra), Math.cos(dec) * Math.sin(ra), Math.sin(dec)];
    // 赤道面基準の傾斜角は自転の角運動量の向きから測る。IAU の「北極」に対して逆回りの天王星は極を反転する
    if (s.poleRA == null && DATA.rotation[s.parent].pm[1] < 0) z = [-z[0], -z[1], -z[2]];
    const xl = Math.hypot(z[0], z[1]);
    const x = [-z[1] / xl, z[0] / xl, 0]; // Z_icrf × z
    const y = [z[1] * x[2] - z[2] * x[1], z[2] * x[0] - z[0] * x[2], z[0] * x[1] - z[1] * x[0]];
    fr = { x: eqToEcl(x), y: eqToEcl(y), z: eqToEcl(z), t0: epochJD(s.epoch) };
  }
  satCache.set(s.id, fr);
  return fr;
}
// 表の P は平均近点角の周期。近点引数と昇交点はそれぞれ P_apsis・P_node の周期で歳差する。
// 位相(平均黄経)は、表の歳差周期の桁数では数十年先まで保てないので、
// JPL Horizons の位置ベクトルに合わせて求めた L0・n(tools/fit-satellites.mjs)を使う。
let PHASE = SAT_PHASE;
export function setSatellitePhase(table) { PHASE = table || {}; satCache.clear(); }
export function satElementsAt(s, jdTT) {
  const d = jdTT - satFrame(s).t0;
  const wRate = s.Pw ? 360 / (s.Pw * 365.25) : 0; //          近点引数の進み(度/日)
  // 昇交点は順行軌道では後退し、逆行軌道(トリトン)では前進する
  const nodeRate = s.Pnode ? ((s.i > 90 ? 1 : -1) * 360) / (s.Pnode * 365.25) : 0;
  const w = s.w + wRate * d, node = s.node + nodeRate * d;
  const ph = PHASE[s.id];
  let M;
  if (ph) {
    const dt = jdTT - ph.t0;
    let L = ph.L0 + ph.n * dt;
    if (ph.lib) L += ph.lib.A * Math.sin((2 * Math.PI * dt) / ph.lib.P) + ph.lib.B * Math.cos((2 * Math.PI * dt) / ph.lib.P); // 共鳴による秤動
    M = L - w - node;
  } else M = s.M + (360 / s.P) * d;
  return { w, node, M };
}
// 基準面の基底(検算・位相合わせ用)
export function satelliteFrame(s) { return satFrame(s); }
function satFromElements(s, el, Erad) {
  const [xp, yp] = ellipsePoint(s.a, s.e, Erad);
  const [u, v, w] = rotateOrbit(xp, yp, el.w * DEG, el.node * DEG, s.i * DEG);
  const f = satFrame(s);
  return [u * f.x[0] + v * f.y[0] + w * f.z[0], u * f.x[1] + v * f.y[1] + w * f.z[1], u * f.x[2] + v * f.y[2] + w * f.z[2]];
}
// 親天体からの相対位置(km、黄道 J2000)
export function satellitePosition(s, jdTT) {
  if (s.id === "moon") return moonGeocentric(jdTT);
  const el = satElementsAt(s, jdTT);
  return satFromElements(s, el, solveKepler(mod360(el.M) * DEG, s.e));
}
export function satelliteOrbit(s, jdTT, n = 256) {
  const out = new Float64Array(n * 3);
  if (s.id === "moon") {
    for (let i = 0; i < n; i++) out.set(moonGeocentric(jdTT + (i / n - 0.5) * s.P), i * 3); // 今を中心に 1 周ぶん
    return out;
  }
  const el = satElementsAt(s, jdTT);
  for (let i = 0; i < n; i++) out.set(satFromElements(s, el, (i / n) * 2 * Math.PI), i * 3);
  return out;
}

// ---- 準惑星(接触軌道要素の二体伝播) ---------------------------------------------
export function dwarfPosition(d, jdTT) {
  const M = mod360(d.M + d.n * (jdTT - d.epochJD)) * DEG;
  const [xp, yp] = ellipsePoint(d.a * AU_KM, d.e, solveKepler(M, d.e));
  return rotateOrbit(xp, yp, d.w * DEG, d.node * DEG, d.i * DEG);
}
export function dwarfOrbit(d, n = 512) {
  const out = new Float64Array(n * 3);
  for (let i = 0; i < n; i++) {
    const [xp, yp] = ellipsePoint(d.a * AU_KM, d.e, (i / n) * 2 * Math.PI);
    out.set(rotateOrbit(xp, yp, d.w * DEG, d.node * DEG, d.i * DEG), i * 3);
  }
  return out;
}

// ---- 全天体の位置 ---------------------------------------------------------------
export const PLANET_KEYS = ["mercury", "venus", "earth", "mars", "jupiter", "saturn", "uranus", "neptune"];
const MOONS_BY_ID = Object.fromEntries(DATA.moons.map((m) => [m.id, m]));
const DWARF_BY_ID = Object.fromEntries(DATA.dwarfs.map((d) => [d.id, d]));

// 日心位置(km)。jdUTC は UTC のユリウス日
export function positions(jdUTC) {
  const jd = ttFromUtc(jdUTC);
  const out = { sun: [0, 0, 0] };
  for (const k of PLANET_KEYS) out[k] = planetPosition(k, jd);
  for (const d of DATA.dwarfs) out[d.id] = dwarfPosition(d, jd);
  // 表の「地球」は地球–月の重心。月の位置から地球本体を求める
  const moon = moonGeocentric(jd);
  const f = 1 / (1 + EARTH_MOON_MASS_RATIO);
  const emb = out.earth;
  out.earth = [emb[0] - moon[0] * f, emb[1] - moon[1] * f, emb[2] - moon[2] * f];
  for (const s of DATA.moons) {
    const p = out[s.parent], r = s.id === "moon" ? moon : satellitePosition(s, jd);
    out[s.id] = [p[0] + r[0], p[1] + r[1], p[2] + r[2]];
  }
  return out;
}

// ---- 自転(天体固定系 → 黄道 J2000 の回転行列。列が X=本初子午線, Y, Z=北極) -----------
export function bodyAxes(key, jdUTC) {
  const rot = DATA.rotation[key];
  const d = ttFromUtc(jdUTC) - J2000, T = d / 36525;
  let raDeg = rot.ra[0] + rot.ra[1] * T, decDeg = rot.dec[0] + rot.dec[1] * T, wDeg = rot.pm[0] + rot.pm[1] * d;
  if (rot.extra) {
    // 火星: IAU 2015 の長周期項(振幅の大きいものだけ)
    const ang = (t) => (t.angle[0] + t.angle[1] * T) * DEG;
    raDeg += rot.extra.ra.amp * Math.sin(ang(rot.extra.ra));
    decDeg += rot.extra.dec.amp * Math.cos(ang(rot.extra.dec));
    wDeg += rot.extra.pm.amp * Math.sin(ang(rot.extra.pm));
  }
  const ra = raDeg * DEG, dec = decDeg * DEG;
  const W = mod360(wDeg) * DEG;
  const z = [Math.cos(dec) * Math.cos(ra), Math.cos(dec) * Math.sin(ra), Math.sin(dec)];
  // 節線 n = Z_icrf × z(赤道面と天体の赤道の交線)。本初子午線は節線から W だけ回った方向
  const nl = Math.hypot(z[0], z[1]) || 1;
  const n = nl < 1e-9 ? [1, 0, 0] : [-z[1] / nl, z[0] / nl, 0];
  const m = [z[1] * n[2] - z[2] * n[1], z[2] * n[0] - z[0] * n[2], z[0] * n[1] - z[1] * n[0]]; // z × n
  const x = [Math.cos(W) * n[0] + Math.sin(W) * m[0], Math.cos(W) * n[1] + Math.sin(W) * m[1], Math.cos(W) * n[2] + Math.sin(W) * m[2]];
  const y = [z[1] * x[2] - z[2] * x[1], z[2] * x[0] - z[0] * x[2], z[0] * x[1] - z[1] * x[0]];
  return { x: eqToEcl(x), y: eqToEcl(y), z: eqToEcl(z) };
}
// 自転と公転が同期した衛星: 経度 0° が親天体を向き、北極は軌道面の法線
export function lockedAxes(relPos, s) {
  const l = Math.hypot(...relPos);
  const x = [-relPos[0] / l, -relPos[1] / l, -relPos[2] / l];
  let z = s.frame ? satFrame(s).z : [0, 0, 1];
  // 傾斜が 90° を超える(逆行)軌道では法線が反転する
  if (s.i > 90) z = [-z[0], -z[1], -z[2]];
  let y = [z[1] * x[2] - z[2] * x[1], z[2] * x[0] - z[0] * x[2], z[0] * x[1] - z[1] * x[0]];
  const yl = Math.hypot(...y);
  y = [y[0] / yl, y[1] / yl, y[2] / yl];
  const zz = [x[1] * y[2] - x[2] * y[1], x[2] * y[0] - x[0] * y[2], x[0] * y[1] - x[1] * y[0]];
  return { x, y, z: zz };
}
// 太陽直下点(緯度・東経、度)。自転モデルの検算に使う
export function subSolarPoint(key, jdUTC, pos) {
  const ax = bodyAxes(key, jdUTC);
  const l = Math.hypot(...pos);
  const s = [-pos[0] / l, -pos[1] / l, -pos[2] / l];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  return { lat: Math.asin(dot(s, ax.z)) / DEG, lon: Math.atan2(dot(s, ax.y), dot(s, ax.x)) / DEG };
}

export { MOONS_BY_ID, DWARF_BY_ID };
