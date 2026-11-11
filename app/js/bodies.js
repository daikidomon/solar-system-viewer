// 天体の一覧: 生成データ(JPL / NASA の表)に、日本語名・色・テクスチャ・説明を足す。
import { DATA } from "../data/solar-data.js";
import { SAT_PHASE } from "../data/sat-phase.js";

const G = 6.6743e-20; // km^3 kg^-1 s^-2
const EARTH = DATA.planets.earth.phys;

const TEX_NASA3D = "NASA 3D Resources";
const PROCEDURAL = "模様は手続き生成（実際の画像ではありません）";

// id: [日本語名, 英語名, 色, テクスチャの出典, 説明]
const INFO = {
  sun: ["太陽", "Sun", "#ffd98a", PROCEDURAL, "太陽系の質量の 99.8% を占める恒星。表面の粒状の模様は対流のしるし。"],
  mercury: ["水星", "Mercury", "#b9b2aa", "MESSENGER MDIS 全球モザイク（NASA / JHUAPL / Carnegie）", "太陽に最も近い惑星。大気がほとんどなく、昼と夜の温度差がきわめて大きい。"],
  venus: ["金星", "Venus", "#e9c98b", TEX_NASA3D + "（マゼランのレーダーによる地形図。実際は厚い雲に覆われて地表は見えない）", "二酸化炭素の厚い大気に覆われ、表面は 460℃ 前後。自転の向きが公転と逆。"],
  earth: ["地球", "Earth", "#5aa2ff", "NASA Blue Marble（NASA GSFC）／夜景: NASA Earth Observatory", "表面に液体の水の海がある惑星。夜側には都市の灯りが見える。"],
  mars: ["火星", "Mars", "#e0703c", TEX_NASA3D, "酸化鉄で赤く見える惑星。太陽系最大の火山オリンポス山がある。"],
  jupiter: ["木星", "Jupiter", "#e3b98a", TEX_NASA3D, "太陽系最大の惑星。大赤斑は地球より大きな渦。"],
  saturn: ["土星", "Saturn", "#ead9a6", TEX_NASA3D + "（環は NASA の公表半径から手続き生成）", "氷の粒でできた環をもつ。平均密度は水より小さい。"],
  uranus: ["天王星", "Uranus", "#9fe3e6", PROCEDURAL, "自転軸がほぼ横倒しになっている氷の巨大惑星。"],
  neptune: ["海王星", "Neptune", "#5b82ff", TEX_NASA3D, "太陽から最も遠い惑星。太陽の光が届くまで約 4 時間かかる。"],
  pluto: ["冥王星", "Pluto", "#d9b89c", TEX_NASA3D + "（最新の観測より古いデータに基づく可能性があります）", "2006 年から準惑星に分類。2015 年に探査機ニュー・ホライズンズが接近観測した。"],
  ceres: ["ケレス", "Ceres", "#a9a6a0", PROCEDURAL, "小惑星帯で最大の天体。準惑星。"],
  eris: ["エリス", "Eris", "#d8d4cc", PROCEDURAL, "冥王星とほぼ同じ大きさの、海王星より遠い準惑星。"],
  haumea: ["ハウメア", "Haumea", "#cfcac2", PROCEDURAL, "約 4 時間で自転する準惑星。実際は細長い形（ここでは球で表示）。"],
  makemake: ["マケマケ", "Makemake", "#c9a58a", PROCEDURAL, "海王星より外側のカイパーベルトにある準惑星。"],
  moon: ["月", "Moon", "#cfcfcf", "NASA SVS CGI Moon Kit（LRO）", "地球のただ一つの自然衛星。いつも同じ面を地球に向けている。"],
  phobos: ["フォボス", "Phobos", "#a89c90", TEX_NASA3D, "火星の小さな衛星。実際はいびつな形（ここでは球で表示）。"],
  deimos: ["ダイモス", "Deimos", "#b3a797", TEX_NASA3D, "火星の小さな衛星。実際はいびつな形（ここでは球で表示）。"],
  io: ["イオ", "Io", "#e8d27a", TEX_NASA3D, "太陽系で最も火山活動が活発な天体。"],
  europa: ["エウロパ", "Europa", "#d9cdb8", TEX_NASA3D, "氷の表面の下に海があると考えられている。"],
  ganymede: ["ガニメデ", "Ganymede", "#b8ab9b", TEX_NASA3D, "太陽系最大の衛星。水星より大きい。"],
  callisto: ["カリスト", "Callisto", "#8f8576", TEX_NASA3D, "クレーターに覆われた古い表面をもつ。"],
  mimas: ["ミマス", "Mimas", "#c9c9c9", TEX_NASA3D, "直径の 3 分の 1 ほどもある巨大クレーターをもつ。"],
  enceladus: ["エンケラドス", "Enceladus", "#f1f1f1", TEX_NASA3D, "南極付近から氷の粒を噴き出している。"],
  tethys: ["テティス", "Tethys", "#dddddd", TEX_NASA3D, "ほとんどが水の氷でできた衛星。"],
  dione: ["ディオネ", "Dione", "#d2d2d2", TEX_NASA3D, "氷の崖が明るい筋として見える衛星。"],
  rhea: ["レア", "Rhea", "#cfcfcf", TEX_NASA3D, "土星で 2 番目に大きい衛星。"],
  titan: ["タイタン", "Titan", "#e8a04a", TEX_NASA3D + "（もやに覆われた見かけ）", "濃い大気をもつただ一つの衛星。"],
  iapetus: ["イアペトゥス", "Iapetus", "#a09a90", TEX_NASA3D, "片面が暗く、反対側が明るい。"],
  ariel: ["アリエル", "Ariel", "#c8c8c8", TEX_NASA3D + "（ボイジャー 2 号が撮影した範囲のみ。未撮影の領域は灰色）", "天王星の衛星。"],
  umbriel: ["ウンブリエル", "Umbriel", "#8c8c8c", TEX_NASA3D + "（ボイジャー 2 号が撮影した範囲のみ。未撮影の領域は灰色）", "天王星の衛星の中で最も暗い。"],
  titania: ["チタニア", "Titania", "#bdb7b0", TEX_NASA3D + "（ボイジャー 2 号が撮影した範囲のみ。未撮影の領域は灰色）", "天王星で最大の衛星。"],
  oberon: ["オベロン", "Oberon", "#a8a29c", TEX_NASA3D + "（ボイジャー 2 号が撮影した範囲のみ。未撮影の領域は灰色）", "天王星の主な衛星の中で最も外側を回る。"],
  miranda: ["ミランダ", "Miranda", "#c4c4c4", TEX_NASA3D + "（ボイジャー 2 号が撮影した範囲のみ。未撮影の領域は灰色）", "つぎはぎのような複雑な地形をもつ。"],
  triton: ["トリトン", "Triton", "#d9c8c0", TEX_NASA3D + "（ボイジャー 2 号が撮影した範囲のみ。未撮影の領域は灰色）", "海王星の自転と逆向きに公転する大きな衛星。"],
  charon: ["カロン", "Charon", "#b3a9a4", TEX_NASA3D + "（最新の観測より古いデータに基づく可能性があります）", "冥王星の半分ほどの大きさがある衛星。"],
};
const PARTIAL_MAPS = new Set(["ariel", "umbriel", "titania", "oberon", "miranda", "triton"]);
const NO_TEXTURE = new Set(["sun", "uranus", "ceres", "eris", "haumea", "makemake"]);
// 大気のふち(色, 強さ)
const ATMOSPHERE = { earth: ["#6fa8ff", 0.9], venus: ["#f0d8a0", 0.5], mars: ["#e9a27a", 0.25], titan: ["#f0a850", 0.6], jupiter: ["#e8d0b0", 0.18], saturn: ["#f0e0b8", 0.18], uranus: ["#b8f0f0", 0.3], neptune: ["#7fa0ff", 0.35], pluto: ["#a8c0e0", 0.12] };

function make(id, kind, parent, extra) {
  const [name, en, color, texNote, desc] = INFO[id];
  return { id, kind, parent, name, en, color, texNote, desc, tex: NO_TEXTURE.has(id) ? null : `textures/${id}.jpg`, partialMap: PARTIAL_MAPS.has(id), atmosphere: ATMOSPHERE[id] || null, ...extra };
}

export const BODIES = [];
const sun = DATA.sun;
BODIES.push(make("sun", "star", null, { radius: sun.meanRadius, eqRadius: sun.meanRadius, polar: 1, mass: sun.mass * 1e24, rotDays: sun.rotHours / 24, sun }));
for (const [id, p] of Object.entries(DATA.planets)) {
  const ph = p.phys;
  BODIES.push(make(id, "planet", "sun", {
    radius: ph.meanRadius, eqRadius: ph.eqRadius, polar: (3 * ph.meanRadius - 2 * ph.eqRadius) / ph.eqRadius, // 平均半径と赤道半径から極半径を出す
    mass: ph.mass * 1e24, density: ph.density, rotDays: ph.rotPeriodDays, orbYears: ph.orbPeriodYears, gravity: ph.gravity, escapeV: ph.escapeV,
    obliquity: p.fact.obliquity, meanTempC: p.fact.meanTempC, moons: p.fact.moons, dayHours: p.fact.dayHours,
  }));
}
for (const d of DATA.dwarfs) {
  const ph = d.phys;
  BODIES.push(make(d.id, "dwarf", "sun", {
    radius: ph.meanRadius, eqRadius: ph.meanRadius, polar: 1, mass: ph.mass * 1e24, density: ph.density, rotDays: ph.rotPeriodDays, orbYears: ph.orbPeriodYears,
    gravity: ph.gravity, escapeV: ph.escapeV, elements: d,
    ...(d.id === "pluto" ? { obliquity: DATA.plutoFact.obliquity, meanTempC: DATA.plutoFact.meanTempC, moons: DATA.plutoFact.moons } : {}),
  }));
}
for (const m of DATA.moons) {
  const ph = SAT_PHASE[m.id];
  BODIES.push(make(m.id, "moon", m.parent, {
    radius: m.meanRadius, eqRadius: m.meanRadius, polar: 1, mass: m.gm != null ? m.gm / G : null, density: m.density,
    orbDays: ph ? 360 / Math.abs(ph.n) : m.P, semiMajorKm: m.a, ecc: m.e, incl: m.i, frame: m.frame, elements: m, rotDays: ph ? 360 / Math.abs(ph.n) : m.P,
  }));
}
export const BY_ID = Object.fromEntries(BODIES.map((b) => [b.id, b]));
for (const b of BODIES) b.children = BODIES.filter((c) => c.parent === b.id && c.kind === "moon").map((c) => c.id);

export const EARTH_RADIUS = EARTH.meanRadius;
export const EARTH_MASS = EARTH.mass * 1e24;
export const KIND_LABEL = { star: "恒星", planet: "惑星", dwarf: "準惑星", moon: "衛星" };
export const RINGS = DATA.saturnRings;
export const SOURCES = DATA.generatedFrom;
