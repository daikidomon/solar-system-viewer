// 3D シーン: 天体暦の位置を Three.js の空間に置き、カメラと表示スケールを管理する。
//
// 設計の要点
//  - 位置は倍精度(km)で持ち、毎フレーム「注視点を原点にした相対座標」に直してから GPU に渡す。
//    太陽系は 45 億 km、惑星は数千 km。単精度のままでは近づいたときに震える。
//  - 奥行きは対数深度バッファ。10 m から 10^12 km までを 1 つのカメラで写す。
//  - 表示スケール s: 0 = 実スケール、1 = 見やすい表示(惑星 ×400、太陽 ×20、衛星の軌道は対数圧縮)。
import * as THREE from "../vendor/three.module.min.js";
import * as EPH from "./ephemeris.js";
import { BODIES, BY_ID, RINGS } from "./bodies.js";
import { STARS } from "../data/stars.js";

const U = 1e-3; // 1 単位 = 1000 km
export const K_SIZE = 400, K_SUN = 20;
const DEG = Math.PI / 180;
const dirToThree = (v, out) => out.set(v[0], v[2], -v[1]); // 黄道 (x, y, z) → Three (x, z, −y)。y が黄道の北
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const lerp = (a, b, t) => a + (b - a) * t;

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---- シェーダ -------------------------------------------------------------------
const BODY_VS = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_vertex>
  varying vec2 vUv; varying vec3 vN; varying vec3 vPosV; varying vec3 vPosW; varying vec3 vLocal;
  void main() {
    vUv = uv;
    vLocal = position;
    vN = normalize(normalMatrix * normal);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vPosW = wp.xyz;
    vec4 mv = viewMatrix * wp;
    vPosV = mv.xyz;
    gl_Position = projectionMatrix * mv;
    #include <logdepthbuf_vertex>
  }`;
const BODY_FS = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_fragment>
  uniform sampler2D map; uniform sampler2D nightMap; uniform sampler2D ringMap;
  uniform float hasNight, hasRing, atmStrength, ambient;
  uniform vec3 sunDirV, sunDirW, atmColor, centerW, ringNormalW;
  uniform vec2 ringRange; // 環の内径・外径(ワールド単位)
  varying vec2 vUv; varying vec3 vN; varying vec3 vPosV; varying vec3 vPosW;
  void main() {
    #include <logdepthbuf_fragment>
    vec3 n = normalize(vN);
    vec3 base = texture2D(map, vUv).rgb;
    float ndl = dot(n, sunDirV);
    float lit = max(ndl, 0.0);
    // 土星: 環が本体に落とす影(太陽へ向かう直線が環の面を横切る位置の濃さ)
    float shadow = 1.0;
    if (hasRing > 0.5) {
      vec3 p = vPosW - centerW;
      float den = dot(sunDirW, ringNormalW);
      if (abs(den) > 1e-4) {
        float t = -dot(p, ringNormalW) / den;
        if (t > 0.0) {
          float u = (length(p + sunDirW * t) - ringRange.x) / (ringRange.y - ringRange.x);
          if (u > 0.0 && u < 1.0) shadow = 1.0 - 0.8 * texture2D(ringMap, vec2(u, 0.5)).a;
        }
      }
    }
    vec3 col = base * (lit * shadow + ambient);
    if (hasNight > 0.5) col += texture2D(nightMap, vUv).rgb * smoothstep(0.06, -0.12, ndl) * 0.85; // 夜側の街の灯り
    vec3 v = normalize(-vPosV);
    float rim = pow(1.0 - max(dot(n, v), 0.0), 2.6);
    col += atmColor * rim * atmStrength * smoothstep(-0.25, 0.35, ndl); // 大気のふち(昼側だけ光る)
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }`;
const SUN_FS = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_fragment>
  uniform float time;
  varying vec2 vUv; varying vec3 vN; varying vec3 vPosV; varying vec3 vPosW; varying vec3 vLocal;
  float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float noise(vec3 x) {
    vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
  }
  void main() {
    #include <logdepthbuf_fragment>
    vec3 d = normalize(vLocal); // 太陽に固定した方向(自転とともに回る)
    float g = noise(d * 40.0 + time) * 0.55 + noise(d * 110.0 - time * 1.7) * 0.3 + noise(d * 9.0) * 0.35; // 粒状斑
    float mu = max(dot(normalize(vN), normalize(-vPosV)), 0.0);
    float limb = 0.42 + 0.58 * pow(mu, 0.55); // 周辺減光
    vec3 col = mix(vec3(1.0, 0.56, 0.16), vec3(1.0, 0.93, 0.72), clamp(g, 0.0, 1.0)) * limb * 1.25;
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }`;
const RING_VS = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_vertex>
  uniform vec2 radii; // 惑星半径を 1 とした内径・外径
  varying float vU; varying vec3 vPosW;
  void main() {
    vU = (length(position.xz) - radii.x) / (radii.y - radii.x);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vPosW = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
    #include <logdepthbuf_vertex>
  }`;
const RING_FS = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_fragment>
  uniform sampler2D ringMap; uniform vec3 sunDirW, centerW, ringNormalW; uniform float planetR;
  varying float vU; varying vec3 vPosW;
  void main() {
    #include <logdepthbuf_fragment>
    vec4 t = texture2D(ringMap, vec2(vU, 0.5));
    // 本体が環に落とす影: 太陽へ向かう直線が球に当たるか
    vec3 p = vPosW - centerW;
    float b = dot(p, sunDirW), disc = b * b - (dot(p, p) - planetR * planetR);
    float shadow = b < 0.0 ? smoothstep(0.0, planetR * planetR * 0.02, -disc) : 1.0;
    float tilt = abs(dot(ringNormalW, sunDirW));
    vec3 col = t.rgb * (0.06 + shadow * (0.45 + 0.75 * sqrt(tilt)));
    gl_FragColor = vec4(col, t.a);
    #include <colorspace_fragment>
  }`;
const POINT_VS = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_vertex>
  attribute float size; attribute float alpha; attribute vec3 tint;
  uniform float pixelRatio;
  varying float vAlpha; varying vec3 vTint;
  void main() {
    vAlpha = alpha; vTint = tint;
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
    gl_PointSize = size * pixelRatio;
    #include <logdepthbuf_vertex>
  }`;
const POINT_FS = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_fragment>
  varying float vAlpha; varying vec3 vTint;
  void main() {
    #include <logdepthbuf_fragment>
    float d = length(gl_PointCoord - 0.5) * 2.0;
    float a = smoothstep(1.0, 0.55, d) * vAlpha;
    if (a < 0.004) discard;
    gl_FragColor = vec4(vTint, a);
    #include <colorspace_fragment>
  }`;

// ---- 手続き生成のテクスチャ ------------------------------------------------------
function valueNoise(seed) {
  const r = rng(seed), N = 64, g = new Float32Array(N * N);
  for (let i = 0; i < g.length; i++) g[i] = r();
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const at = (a, b) => g[(((b % N) + N) % N) * N + (((a % N) + N) % N)];
    return lerp(lerp(at(xi, yi), at(xi + 1, yi), sx), lerp(at(xi, yi + 1), at(xi + 1, yi + 1), sx), sy);
  };
}
function canvasTexture(w, h, paint) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d");
  const img = ctx.createImageData(w, h);
  paint(img.data, w, h);
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
function proceduralTexture(id, color) {
  const base = new THREE.Color(color);
  const n = valueNoise(id.length * 977 + id.charCodeAt(0) * 131 + id.charCodeAt(1));
  const W = 512, H = 256;
  return canvasTexture(W, H, (d) => {
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const u = x / W, v = y / H;
        let k;
        if (id === "uranus") {
          // ほぼ無地。緯度方向のごく淡い帯と、極のわずかな明るさだけ
          k = 0.94 + 0.05 * n(1.3, v * 9) + 0.03 * Math.abs(v - 0.5);
        } else {
          // 岩と氷の天体: 数オクターブの雑音(左右の端がつながるよう経度を円に写す)
          const a = u * Math.PI * 2, cx = Math.cos(a) * 3 + 5, cy = Math.sin(a) * 3 + 5;
          k = 0.62 + 0.3 * n(cx * 2 + v * 3, cy * 2 + v * 5) + 0.18 * n(cx * 6 + v * 11, cy * 6 - v * 7) + 0.1 * n(cx * 17 - v * 23, cy * 17 + v * 19) - 0.2;
        }
        const i = (y * W + x) * 4;
        d[i] = Math.min(255, base.r * 255 * k); d[i + 1] = Math.min(255, base.g * 255 * k); d[i + 2] = Math.min(255, base.b * 255 * k); d[i + 3] = 255;
      }
    }
  });
}
// 土星の環: NASA の公表半径(km)から濃さの分布を作る。x 方向が半径
function ringTexture() {
  const W = 2048, inner = RINGS.dIn, outer = RINGS.f + 1500;
  const n = valueNoise(606);
  return {
    inner, outer,
    tex: canvasTexture(W, 1, (d) => {
      for (let x = 0; x < W; x++) {
        const r = inner + ((x + 0.5) / W) * (outer - inner);
        let a = 0, tone = 1;
        const fine = 0.75 + 0.5 * n(r / 90, 3.1) * n(r / 700, 9.7) + 0.2 * n(r / 23, 1.2); // 細かい濃淡
        if (r < RINGS.cIn) { a = 0.03; tone = 0.6; } //                                         D 環(ごく淡い)
        else if (r < RINGS.bIn) { a = 0.16 + 0.14 * n(r / 800, 2.2); tone = 0.62; } //          C 環
        else if (r < RINGS.bOut) { a = 0.78 + 0.2 * Math.min(1, fine); tone = 1.0; } //         B 環(最も濃い)
        else if (r < RINGS.aIn) { a = 0.07 + 0.05 * n(r / 300, 5.5); tone = 0.55; } //          カッシーニの間隙
        else if (r < RINGS.aOut) { a = 0.56 + 0.16 * fine; tone = 0.88; if (Math.abs(r - RINGS.encke) < 170 || Math.abs(r - RINGS.keeler) < 40) a = 0.02; } // A 環
        else if (Math.abs(r - RINGS.f) < 260) { a = 0.32; tone = 0.85; } //                     F 環
        a = Math.max(0, Math.min(1, a * fine));
        const i = x * 4;
        d[i] = 222 * tone; d[i + 1] = 204 * tone; d[i + 2] = 172 * tone; d[i + 3] = a * 255;
      }
    }),
  };
}
// 未撮影(黒)の領域を、撮影済みの平均色を暗くした灰色で埋める
function fillUnmapped(image) {
  const c = document.createElement("canvas");
  c.width = image.width; c.height = image.height;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(image, 0, 0);
  const img = ctx.getImageData(0, 0, c.width, c.height), d = img.data;
  let r = 0, g = 0, b = 0, cnt = 0;
  for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] > 36) { r += d[i]; g += d[i + 1]; b += d[i + 2]; cnt++; }
  if (cnt) { r = (r / cnt) * 0.55; g = (g / cnt) * 0.55; b = (b / cnt) * 0.55; }
  for (let i = 0; i < d.length; i += 4) {
    const lum = d[i] + d[i + 1] + d[i + 2];
    if (lum < 36) { const k = lum / 36; d[i] = lerp(r, d[i], k); d[i + 1] = lerp(g, d[i + 1], k); d[i + 2] = lerp(b, d[i + 2], k); }
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function starColor(bv) {
  // B−V 色指数 → おおよその色(青白 → 白 → 橙)
  const t = Math.max(-0.4, Math.min(2, bv));
  const r = t < 0.4 ? 0.62 + 0.38 * ((t + 0.4) / 0.8) : 1;
  const g = t < 0.4 ? 0.74 + 0.26 * ((t + 0.4) / 0.8) : 1 - 0.32 * ((t - 0.4) / 1.6);
  const b = t < 0.4 ? 1 : 1 - 0.62 * Math.min(1, (t - 0.4) / 1.2);
  return [r, g, b];
}

// ---- 本体 -----------------------------------------------------------------------
export class SolarScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, logarithmicDepthBuffer: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0x04050a, 1);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(42, 1, 1e-5, 2e10);
    this.jd = 0;
    this.scale = 1; //        現在の表示スケール(0 実スケール – 1 見やすい)
    this.scaleTarget = 1;
    this.focusId = "sun";
    this.cam = { az: -0.9, pol: 0.5, dist: 1.75e9, tAz: -0.9, tPol: 0.5, tDist: 1.75e9 };
    this.trans = null; //     注視点の移動
    this.show = { orbits: true, labels: true, belt: true, moons: true };
    this.screen = {}; //      id → 画面上の位置と見かけの半径
    this.real = null;
    this.disp = {};
    this.radius = {};
    this.originKm = [0, 0, 0];
    this._v = new THREE.Vector3();
    this._m = new THREE.Matrix4();
    this.loader = new THREE.TextureLoader();
    this.objs = {};
    this._buildStars();
    this._buildBodies();
    this._buildOrbits();
    this._buildMarkers();
    this._buildBelt();
    this.resize();
  }

  // ---- 組み立て ----
  _buildStars() {
    const n = STARS.length / 4;
    const pos = new Float32Array(n * 3), tint = new Float32Array(n * 3), size = new Float32Array(n), alpha = new Float32Array(n);
    const e = 23.4392911 * DEG, ce = Math.cos(e), se = Math.sin(e);
    for (let i = 0; i < n; i++) {
      const ra = STARS[i * 4] * DEG, dec = STARS[i * 4 + 1] * DEG, mag = STARS[i * 4 + 2];
      const x = Math.cos(dec) * Math.cos(ra), y = Math.cos(dec) * Math.sin(ra), z = Math.sin(dec);
      const ey = ce * y + se * z, ez = -se * y + ce * z; // 赤道 → 黄道
      pos[i * 3] = x * 100; pos[i * 3 + 1] = ez * 100; pos[i * 3 + 2] = -ey * 100;
      const [r, g, b] = starColor(STARS[i * 4 + 3]);
      tint[i * 3] = r; tint[i * 3 + 1] = g; tint[i * 3 + 2] = b;
      const f = Math.pow(10, -0.4 * (mag - 1.0)); // 1 等星を 1 とした明るさ
      size[i] = Math.max(1.3, Math.min(5.2, 1.3 + 2.4 * Math.pow(f, 0.42)));
      alpha[i] = Math.max(0.22, Math.min(1, 0.3 + 0.75 * Math.pow(f, 0.35)));
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("tint", new THREE.BufferAttribute(tint, 3));
    geo.setAttribute("size", new THREE.BufferAttribute(size, 1));
    geo.setAttribute("alpha", new THREE.BufferAttribute(alpha, 1));
    // 不透明パス(最初)で加算描画する。透明パスに回すと惑星の上に星が描かれてしまう
    const mat = new THREE.ShaderMaterial({ vertexShader: POINT_VS, fragmentShader: POINT_FS, uniforms: { pixelRatio: { value: this.renderer.getPixelRatio() } }, transparent: false, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false });
    this.stars = new THREE.Points(geo, mat);
    this.stars.frustumCulled = false;
    this.stars.renderOrder = -100;
    this.scene.add(this.stars);
  }

  _buildBodies() {
    const geo = new THREE.SphereGeometry(1, 96, 48);
    const ring = ringTexture();
    const black = canvasTexture(1, 1, (d) => { d[3] = 255; });
    for (const b of BODIES) {
      const group = new THREE.Group();
      let mat;
      if (b.kind === "star") {
        mat = new THREE.ShaderMaterial({ vertexShader: BODY_VS, fragmentShader: SUN_FS, uniforms: { time: { value: 0 } } });
      } else {
        const atm = b.atmosphere || ["#000000", 0];
        mat = new THREE.ShaderMaterial({
          vertexShader: BODY_VS, fragmentShader: BODY_FS,
          uniforms: {
            map: { value: proceduralTexture(b.id, b.color) }, nightMap: { value: black }, ringMap: { value: ring.tex },
            hasNight: { value: 0 }, hasRing: { value: b.id === "saturn" ? 1 : 0 }, atmStrength: { value: atm[1] }, ambient: { value: 0.012 },
            sunDirV: { value: new THREE.Vector3(1, 0, 0) }, sunDirW: { value: new THREE.Vector3(1, 0, 0) }, atmColor: { value: new THREE.Color(atm[0]) },
            centerW: { value: new THREE.Vector3() }, ringNormalW: { value: new THREE.Vector3(0, 1, 0) }, ringRange: { value: new THREE.Vector2(1, 2) },
          },
        });
        if (b.tex) {
          this.loader.load(b.tex, (t) => {
            const tex = b.partialMap ? fillUnmapped(t.image) : t;
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.anisotropy = 8;
            mat.uniforms.map.value = tex;
          });
        }
        if (b.id === "earth") {
          this.loader.load("textures/earth_night.jpg", (t) => { t.colorSpace = THREE.SRGBColorSpace; mat.uniforms.nightMap.value = t; mat.uniforms.hasNight.value = 1; });
        }
      }
      const mesh = new THREE.Mesh(geo, mat);
      group.add(mesh);
      const o = { body: b, group, mesh, mat };
      if (b.id === "saturn") {
        const rIn = ring.inner / b.eqRadius, rOut = ring.outer / b.eqRadius;
        const rg = new THREE.RingGeometry(rIn, rOut, 256, 1);
        rg.rotateX(-Math.PI / 2); // 赤道面(局所 XZ)に寝かせる
        const rm = new THREE.ShaderMaterial({
          vertexShader: RING_VS, fragmentShader: RING_FS, transparent: true, depthWrite: false, side: THREE.DoubleSide,
          uniforms: { ringMap: { value: ring.tex }, radii: { value: new THREE.Vector2(rIn, rOut) }, sunDirW: { value: new THREE.Vector3() }, centerW: { value: new THREE.Vector3() }, ringNormalW: { value: new THREE.Vector3() }, planetR: { value: 1 } },
        });
        o.ring = new THREE.Mesh(rg, rm);
        o.ringRange = [rIn, rOut];
        mesh.add(o.ring);
      }
      if (b.kind === "star") {
        // 遠くからでも太陽の位置が分かるよう、光芒を重ねる
        const c = document.createElement("canvas");
        c.width = c.height = 256;
        const g = c.getContext("2d");
        const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
        grad.addColorStop(0, "rgba(255,244,214,1)"); grad.addColorStop(0.12, "rgba(255,226,160,0.55)"); grad.addColorStop(0.35, "rgba(255,190,110,0.14)"); grad.addColorStop(1, "rgba(255,170,80,0)");
        g.fillStyle = grad; g.fillRect(0, 0, 256, 256);
        const tex = new THREE.CanvasTexture(c);
        tex.colorSpace = THREE.SRGBColorSpace;
        o.glare = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
        group.add(o.glare);
      }
      this.scene.add(group);
      this.objs[b.id] = o;
    }
  }

  _buildOrbits() {
    for (const b of BODIES) {
      if (b.kind === "star") continue;
      const n = b.kind === "moon" ? 192 : 512;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
      const mat = new THREE.LineBasicMaterial({ color: new THREE.Color(b.color).multiplyScalar(b.kind === "moon" ? 0.55 : 0.7), transparent: true, opacity: 0.6, depthWrite: false });
      const line = new THREE.LineLoop(geo, mat);
      line.frustumCulled = false;
      this.scene.add(line);
      Object.assign(this.objs[b.id], { orbit: line, orbitN: n, orbitJd: -1e9 });
    }
  }

  _buildMarkers() {
    const n = BODIES.length;
    const geo = new THREE.BufferGeometry();
    const tint = new Float32Array(n * 3);
    BODIES.forEach((b, i) => { const c = new THREE.Color(b.color); tint.set([c.r, c.g, c.b], i * 3); });
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    geo.setAttribute("tint", new THREE.BufferAttribute(tint, 3));
    geo.setAttribute("size", new THREE.BufferAttribute(new Float32Array(n).fill(6), 1));
    geo.setAttribute("alpha", new THREE.BufferAttribute(new Float32Array(n), 1));
    this.markers = new THREE.Points(geo, new THREE.ShaderMaterial({ vertexShader: POINT_VS, fragmentShader: POINT_FS, uniforms: { pixelRatio: { value: this.renderer.getPixelRatio() } }, transparent: true, depthWrite: false }));
    this.markers.frustumCulled = false;
    this.scene.add(this.markers);
  }

  // 小惑星帯: 個々の天体は実在のものではなく、分布だけ実際に似せて生成する
  // (軌道長半径 2.1–3.3 au、木星との共鳴で空くカークウッドの空隙を再現)
  _buildBelt() {
    const N = 4500, r = rng(2026);
    const gaps = [[2.065, 0.03], [2.502, 0.035], [2.825, 0.03], [2.958, 0.025], [3.279, 0.04]];
    const el = new Float64Array(N * 6);
    for (let i = 0; i < N; ) {
      const a = 2.1 + 1.2 * r();
      if (gaps.some(([g, w]) => Math.abs(a - g) < w) || r() > 0.35 + 0.65 * Math.exp(-Math.pow((a - 2.7) / 0.45, 2))) continue;
      const e = Math.min(0.3, 0.085 * Math.sqrt(-2 * Math.log(1 - r() * 0.999)));
      const inc = Math.min(28, 6.5 * Math.sqrt(-2 * Math.log(1 - r() * 0.999))) * DEG;
      el.set([a, e, inc, r() * 2 * Math.PI, r() * 2 * Math.PI, r() * 2 * Math.PI], i * 6);
      i++;
    }
    this.beltEl = el;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    geo.setAttribute("tint", new THREE.BufferAttribute(new Float32Array(N * 3).fill(0.72), 3));
    geo.setAttribute("size", new THREE.BufferAttribute(new Float32Array(N).fill(1.6), 1));
    geo.setAttribute("alpha", new THREE.BufferAttribute(new Float32Array(N).fill(0.55), 1));
    this.belt = new THREE.Points(geo, new THREE.ShaderMaterial({ vertexShader: POINT_VS, fragmentShader: POINT_FS, uniforms: { pixelRatio: { value: this.renderer.getPixelRatio() } }, transparent: true, depthWrite: false }));
    this.belt.frustumCulled = false;
    this.beltJd = -1e9;
    this.scene.add(this.belt);
  }
  _updateBelt(jd) {
    if (Math.abs(jd - this.beltJd) < 0.02) return;
    this.beltJd = jd;
    const el = this.beltEl, pos = this.belt.geometry.attributes.position.array, N = el.length / 6;
    const d = jd - 2451545, k = 0.01720209895; // ガウス引力定数(rad/日)
    for (let i = 0; i < N; i++) {
      const a = el[i * 6], e = el[i * 6 + 1], inc = el[i * 6 + 2], node = el[i * 6 + 3], w = el[i * 6 + 4];
      const M = el[i * 6 + 5] + (k / Math.pow(a, 1.5)) * d;
      let E = M + e * Math.sin(M);
      E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
      E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
      const xp = a * (Math.cos(E) - e), yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
      const cw = Math.cos(w), sw = Math.sin(w), cn = Math.cos(node), sn = Math.sin(node), ci = Math.cos(inc), si = Math.sin(inc);
      const x = (cw * cn - sw * sn * ci) * xp + (-sw * cn - cw * sn * ci) * yp;
      const y = (cw * sn + sw * cn * ci) * xp + (-sw * sn + cw * cn * ci) * yp;
      const z = sw * si * xp + cw * si * yp;
      const s = EPH.AU_KM * U;
      pos[i * 3] = x * s; pos[i * 3 + 1] = z * s; pos[i * 3 + 2] = -y * s;
    }
    this.belt.geometry.attributes.position.needsUpdate = true;
  }

  // ---- 表示スケール ----
  displayRadius(b, s = this.scale) {
    return b.eqRadius * Math.pow(b.kind === "star" ? K_SUN : K_SIZE, s);
  }
  // 衛星の軌道は「見やすい表示」では対数で圧縮して、拡大した惑星の外側に並べる
  moonFactor(b, r, s = this.scale) {
    const p = BY_ID[b.parent];
    const easy = p.eqRadius * K_SIZE * (1.5 + 1.1 * Math.log(Math.max(1.05, r / p.eqRadius)));
    return Math.pow(easy / r, s);
  }
  _computeDisplay() {
    const real = this.real;
    for (const b of BODIES) this.radius[b.id] = this.displayRadius(b);
    for (const b of BODIES) if (b.kind !== "moon") this.disp[b.id] = real[b.id];
    for (const b of BODIES) {
      if (b.kind !== "moon") continue;
      const p = real[b.parent], q = real[b.id], dp = this.disp[b.parent];
      const rel = [q[0] - p[0], q[1] - p[1], q[2] - p[2]];
      const f = this.moonFactor(b, Math.hypot(rel[0], rel[1], rel[2]));
      this.disp[b.id] = [dp[0] + rel[0] * f, dp[1] + rel[1] * f, dp[2] + rel[2] * f];
    }
  }

  // ---- 操作 ----
  setScaleMode(mode) { this.scaleTarget = mode === "real" ? 0 : 1; }
  setShow(key, on) { this.show[key] = on; }
  defaultDistance(id) {
    const b = BY_ID[id];
    return this.displayRadius(b, this.scaleTarget) * (b.id === "saturn" ? 7 : 4.2);
  }
  focus(id, opts = {}) {
    if (!BY_ID[id]) return;
    const from = this.trans ? null : this.focusId;
    const d1 = opts.dist || this.defaultDistance(id);
    if (id === this.focusId && !this.trans) { this.cam.tDist = d1; return; }
    this.trans = { fromPos: from ? null : this.originKm.slice(), fromId: from, toId: id, t: 0, dur: opts.instant ? 0.001 : 2.4, d0: this.cam.dist, d1 };
    this.focusId = id;
    this.cam.tDist = d1;
    // 昼の面が見える側(太陽の方向から 40° ほど横)へ回り込む
    if (id !== "sun" && this.real && !opts.keepAngle) {
      const p = this.real[id], l = Math.hypot(p[0], p[1], p[2]);
      const sx = -p[0] / l, sy = -p[2] / l, sz = p[1] / l; // 太陽の方向(Three の座標)
      let az = Math.atan2(sz, sx) + 0.7;
      const cur = this.cam.tAz;
      az += Math.round((cur - az) / (2 * Math.PI)) * 2 * Math.PI; // 近い方へ回る
      this.cam.tAz = az;
      this.cam.tPol = Math.max(-1.2, Math.min(1.2, Math.asin(sy) + 0.3));
      if (opts.instant) { this.cam.az = this.cam.tAz; this.cam.pol = this.cam.tPol; }
    }
  }
  home() {
    this.focus("sun", { dist: this.scaleTarget > 0.5 ? 1.75e9 : 1.75e9 });
    this.cam.tPol = 0.5;
  }
  rotate(dx, dy) {
    this.cam.tAz += dx * 0.0052;
    this.cam.tPol = Math.max(-1.52, Math.min(1.52, this.cam.tPol + dy * 0.0052));
  }
  zoom(factor) {
    const min = this.radius[this.focusId] * 1.25, max = 1.6e10;
    const d = Math.max(min, Math.min(max, this.cam.tDist * factor));
    this.cam.tDist = d;
    if (this.trans) this.trans.d1 = d;
  }
  pick(x, y) {
    let best = null, bestScore = Infinity;
    for (const b of BODIES) {
      const s = this.screen[b.id];
      if (!s || !s.onScreen || !s.pickable) continue;
      const d = Math.hypot(s.x - x, s.y - y);
      const reach = Math.max(16, s.r + 4);
      if (d > reach) continue;
      const score = d / reach + (b.kind === "moon" ? 0.05 : 0) + s.depth * 1e-14;
      if (score < bestScore) { bestScore = score; best = b.id; }
    }
    return best;
  }
  resize() {
    const w = this.canvas.clientWidth || window.innerWidth, h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.width = w; this.height = h;
  }

  // ---- 毎フレーム ----
  update(jd, dt) {
    this.jd = jd;
    this.real = EPH.positions(jd);

    // 表示スケールの切り替え(約 2.5 秒)。注視中の天体が画面に収まり続けるよう距離も一緒に伸縮する
    if (this.scale !== this.scaleTarget) {
      const before = this.displayRadius(BY_ID[this.focusId]);
      const step = dt / 2.5;
      this.scale = this.scaleTarget > this.scale ? Math.min(this.scaleTarget, this.scale + step) : Math.max(this.scaleTarget, this.scale - step);
      const ratio = this.displayRadius(BY_ID[this.focusId]) / before;
      if (this.cam.dist < before * 60) { this.cam.dist *= ratio; this.cam.tDist *= ratio; if (this.trans) { this.trans.d0 *= ratio; this.trans.d1 *= ratio; } }
    }
    this._computeDisplay();

    // 注視点(原点)とカメラ
    const cam = this.cam;
    const k = 1 - Math.exp(-dt * 9);
    cam.az += (cam.tAz - cam.az) * k;
    cam.pol += (cam.tPol - cam.pol) * k;
    const target = this.disp[this.focusId];
    if (this.trans) {
      const tr = this.trans;
      tr.t = Math.min(1, tr.t + dt / tr.dur);
      const u = easeInOut(tr.t);
      const a = tr.fromId ? this.disp[tr.fromId] : tr.fromPos;
      const sep = Math.hypot(target[0] - a[0], target[1] - a[1], target[2] - a[2]);
      this.originKm = [lerp(a[0], target[0], u), lerp(a[1], target[1], u), lerp(a[2], target[2], u)];
      // 2 天体が同時に見える距離まで一度引いてから寄る
      const l0 = Math.log(tr.d0), l1 = Math.log(tr.d1);
      const bump = Math.max(0, Math.log(Math.max(sep * 0.75, tr.d0, tr.d1)) - (l0 + l1) / 2);
      cam.dist = Math.exp(lerp(l0, l1, u) + bump * Math.sin(Math.PI * u) * (sep > Math.max(tr.d0, tr.d1) ? 1 : 0));
      if (tr.t >= 1) { this.trans = null; cam.dist = tr.d1; cam.tDist = tr.d1; }
    } else {
      this.originKm = target.slice();
      cam.dist = Math.exp(lerp(Math.log(cam.dist), Math.log(cam.tDist), k));
    }
    const cp = Math.cos(cam.pol);
    this.camera.position.set(cam.dist * U * cp * Math.cos(cam.az), cam.dist * U * Math.sin(cam.pol), cam.dist * U * cp * Math.sin(cam.az));
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(0, 0, 0);
    this.camera.updateMatrixWorld();
    this.stars.position.copy(this.camera.position);

    const O = this.originKm, v = this._v;
    const place = (p, obj) => obj.position.set((p[0] - O[0]) * U, (p[2] - O[2]) * U, -(p[1] - O[1]) * U);
    const sunP = this.disp.sun;
    const focusSystem = BY_ID[this.focusId].kind === "moon" ? BY_ID[this.focusId].parent : this.focusId;
    const viewRot = this._m.extractRotation(this.camera.matrixWorldInverse);
    const tanHalf = Math.tan((this.camera.fov * DEG) / 2);
    const mPos = this.markers.geometry.attributes.position.array, mAlpha = this.markers.geometry.attributes.alpha.array;
    const X = new THREE.Vector3(), Y = new THREE.Vector3(), Z = new THREE.Vector3(), rot = new THREE.Matrix4();

    BODIES.forEach((b, i) => {
      const o = this.objs[b.id], p = this.disp[b.id], R = this.radius[b.id];
      place(p, o.group);
      o.mesh.scale.set(R * U, R * U * b.polar, R * U);

      // 向き: 天体固定系(X = 経度 0°, Z = 北極)を Three の局所軸(X, Y = 北, −Z = 東)へ
      let ax;
      if (b.kind === "moon") {
        const pr = this.real[b.parent], q = this.real[b.id];
        ax = EPH.lockedAxes([q[0] - pr[0], q[1] - pr[1], q[2] - pr[2]], b.elements);
      } else if (EPH_HAS_ROTATION.has(b.id)) ax = EPH.bodyAxes(b.id, jd);
      else {
        const w = ((jd / (b.rotDays || 1)) % 1) * 2 * Math.PI;
        ax = { x: [Math.cos(w), Math.sin(w), 0], y: [-Math.sin(w), Math.cos(w), 0], z: [0, 0, 1] };
      }
      dirToThree(ax.x, X); dirToThree(ax.z, Y); dirToThree(ax.y, Z).negate();
      o.mesh.quaternion.setFromRotationMatrix(rot.makeBasis(X, Y, Z));

      // 太陽の方向(ワールドとビュー)
      if (b.kind === "star") {
        this.clock = (this.clock || 0) + dt;
        o.mat.uniforms.time.value = this.clock * 0.06; // 粒状斑は実時間でゆっくり動かす(早送りしても明滅しない)
        const distCam = o.group.position.distanceTo(this.camera.position);
        const s = Math.max(R * U * 7, distCam * 0.045);
        o.glare.scale.set(s, s, 1);
        o.glare.material.opacity = Math.max(0, Math.min(1, (distCam / (R * U) - 3) / 9)); // 近づいたら光芒を消して表面を見せる
      } else {
        v.set(sunP[0] - p[0], sunP[2] - p[2], -(sunP[1] - p[1])).normalize();
        const un = o.mat.uniforms;
        un.sunDirW.value.copy(v);
        un.sunDirV.value.copy(v).applyMatrix4(viewRot);
        un.centerW.value.copy(o.group.position);
        if (o.ring) {
          un.ringNormalW.value.copy(Y);
          un.ringRange.value.set(o.ringRange[0] * R * U, o.ringRange[1] * R * U);
          const ru = o.ring.material.uniforms;
          ru.sunDirW.value.copy(v); ru.centerW.value.copy(o.group.position); ru.ringNormalW.value.copy(Y); ru.planetR.value = R * U;
        }
      }

      // 画面上の位置と見かけの半径
      v.copy(o.group.position).applyMatrix4(this.camera.matrixWorldInverse);
      const depth = -v.z;
      const rPx = depth > 0 ? ((R * U) / (depth * tanHalf)) * (this.height / 2) : 0;
      v.copy(o.group.position).project(this.camera);
      const sx = (v.x * 0.5 + 0.5) * this.width, sy = (-v.y * 0.5 + 0.5) * this.height;
      const inSystem = b.kind !== "moon" || b.parent === focusSystem;
      const visible = b.kind !== "moon" || (this.show.moons && inSystem);
      o.group.visible = b.kind !== "moon" || this.show.moons;
      this.screen[b.id] = { x: sx, y: sy, r: rPx, depth, onScreen: depth > 0 && sx > -50 && sx < this.width + 50 && sy > -50 && sy < this.height + 50, pickable: visible, inSystem };
      // 小さすぎて見えない天体は点で示す
      mPos[i * 3] = o.group.position.x; mPos[i * 3 + 1] = o.group.position.y; mPos[i * 3 + 2] = o.group.position.z;
      mAlpha[i] = visible ? Math.max(0, Math.min(1, (4.5 - rPx) / 2.5)) * (b.kind === "moon" ? 0.8 : 1) : 0;
    });
    this.markers.geometry.attributes.position.needsUpdate = true;
    this.markers.geometry.attributes.alpha.needsUpdate = true;

    this._updateOrbits(jd, focusSystem, place);
    this.belt.visible = this.show.belt;
    if (this.show.belt) { this._updateBelt(jd); place(sunP, this.belt); }
    this.renderer.render(this.scene, this.camera);
  }

  _updateOrbits(jd, focusSystem, place) {
    const jdTT = jd + 69.184 / 86400;
    for (const b of BODIES) {
      const o = this.objs[b.id];
      if (!o.orbit) continue;
      const isMoon = b.kind === "moon";
      const on = this.show.orbits && (!isMoon || (this.show.moons && b.parent === focusSystem));
      o.orbit.visible = on;
      if (!on) continue;
      const arr = o.orbit.geometry.attributes.position.array;
      if (isMoon) {
        // 衛星の軌道は表示スケールで形が変わるので毎回作り直す
        const pts = EPH.satelliteOrbit(b.elements, jdTT, o.orbitN);
        for (let i = 0; i < o.orbitN; i++) {
          const x = pts[i * 3], y = pts[i * 3 + 1], z = pts[i * 3 + 2];
          const f = this.moonFactor(b, Math.hypot(x, y, z)) * U;
          arr[i * 3] = x * f; arr[i * 3 + 1] = z * f; arr[i * 3 + 2] = -y * f;
        }
        o.orbit.geometry.attributes.position.needsUpdate = true;
        place(this.disp[b.parent], o.orbit);
      } else {
        if (Math.abs(jd - o.orbitJd) > 120) {
          const pts = b.kind === "planet" ? EPH.planetOrbit(b.id, jdTT, o.orbitN) : EPH.dwarfOrbit(b.elements, o.orbitN);
          for (let i = 0; i < o.orbitN; i++) { arr[i * 3] = pts[i * 3] * U; arr[i * 3 + 1] = pts[i * 3 + 2] * U; arr[i * 3 + 2] = -pts[i * 3 + 1] * U; }
          o.orbit.geometry.attributes.position.needsUpdate = true;
          o.orbitJd = jd;
        }
        place(this.disp.sun, o.orbit);
      }
      // 近づいた天体自身の軌道線は消す(線が天体を貫いて見えるのを避ける)
      const near = b.id === this.focusId || b.id === focusSystem ? Math.max(0, Math.min(1, (this.cam.dist / this.radius[b.id] - 25) / 60)) : 1;
      o.orbit.material.opacity = (isMoon ? 0.5 : 0.6) * near;
    }
  }
}
const EPH_HAS_ROTATION = new Set(["sun", "mercury", "venus", "earth", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"]);
