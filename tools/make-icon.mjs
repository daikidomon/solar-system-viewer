// アプリのアイコンを描いて書き出す(1024 px → macOS の .icns と PWA 用の PNG)。
import puppeteer from "puppeteer-core";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CHROME } from "./shot-file.mjs";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const html = `<!doctype html><body style="margin:0;background:transparent"><canvas id="c" width="1024" height="1024"></canvas><script>
const c=document.getElementById('c'),g=c.getContext('2d');
// macOS のアイコン枠: 824 px の角丸四角(半径 185)を中央に
const x=100,y=100,s=824,r=185;
g.beginPath();g.moveTo(x+r,y);g.arcTo(x+s,y,x+s,y+s,r);g.arcTo(x+s,y+s,x,y+s,r);g.arcTo(x,y+s,x,y,r);g.arcTo(x,y,x+s,y,r);g.closePath();g.save();g.clip();
const bg=g.createRadialGradient(360,330,40,512,512,720);bg.addColorStop(0,'#1b2030');bg.addColorStop(1,'#04050a');g.fillStyle=bg;g.fillRect(0,0,1024,1024);
let seed=7;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
for(let i=0;i<70;i++){g.globalAlpha=0.25+rnd()*0.6;g.fillStyle='#fff';const rr=1.2+rnd()*2.4;g.beginPath();g.arc(120+rnd()*784,120+rnd()*784,rr,0,7);g.fill()}
g.globalAlpha=1;g.translate(512,528);g.rotate(-0.42);
function ring(front){g.save();g.scale(1,0.3);for(const [ra,w,col] of [[330,58,'rgba(214,196,160,0.95)'],[262,40,'rgba(170,152,122,0.8)'],[392,14,'rgba(214,196,160,0.75)']]){g.beginPath();g.arc(0,0,ra,front?0:Math.PI,front?Math.PI:2*Math.PI);g.lineWidth=w;g.strokeStyle=col;g.stroke()}g.restore()}
ring(false);
const pg=g.createRadialGradient(-70,-80,20,0,0,215);pg.addColorStop(0,'#ffe2a8');pg.addColorStop(0.55,'#e9b565');pg.addColorStop(1,'#8a5a22');
g.beginPath();g.arc(0,0,200,0,7);g.fillStyle=pg;g.fill();
g.save();g.beginPath();g.arc(0,0,200,0,7);g.clip();g.globalAlpha=0.16;g.fillStyle='#7a4a12';for(const yy of [-120,-52,26,96]){g.fillRect(-220,yy,440,26)}g.restore();
ring(true);g.restore();
</script>`;
const tmp = path.join(ROOT, "raw/icon.html");
fs.writeFileSync(tmp, html);
const browser = await puppeteer.launch({ executablePath: CHROME });
const page = await browser.newPage();
await page.setViewport({ width: 1024, height: 1024 });
await page.goto("file://" + tmp);
const png = path.join(ROOT, "raw/icon-1024.png");
await page.screenshot({ path: png, omitBackground: true });
await browser.close();
const set = path.join(ROOT, "raw/icon.iconset");
fs.rmSync(set, { recursive: true, force: true });
fs.mkdirSync(set, { recursive: true });
for (const n of [16, 32, 128, 256, 512]) {
  execFileSync("sips", ["-z", String(n), String(n), png, "--out", path.join(set, `icon_${n}x${n}.png`)], { stdio: "ignore" });
  execFileSync("sips", ["-z", String(n * 2), String(n * 2), png, "--out", path.join(set, `icon_${n}x${n}@2x.png`)], { stdio: "ignore" });
}
fs.mkdirSync(path.join(ROOT, "build"), { recursive: true });
execFileSync("iconutil", ["-c", "icns", set, "-o", path.join(ROOT, "build/icon.icns")]);
for (const n of [192, 512]) execFileSync("sips", ["-z", String(n), String(n), png, "--out", path.join(ROOT, `app/icons/icon-${n}.png`)], { stdio: "ignore" });
console.log("icon:", fs.statSync(path.join(ROOT, "build/icon.icns")).size, "bytes");
