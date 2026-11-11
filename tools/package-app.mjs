// macOS アプリ(.app)を作る: node tools/package-app.mjs → dist/太陽系ビューア.app
import { packager } from "@electron/packager";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");
fs.rmSync(DIST, { recursive: true, force: true });
// バンドル内部の名前(CFBundleName とヘルパーの名前。Electron はこの名前でヘルパーを探す)は「太陽系」にする。
// 濁点を含む「ビューア」を内部の名前に使うと、codesign が封印の検証に失敗する(Unicode の正規化の違い)。
// フォルダ名と表示名だけ「太陽系ビューア」にする。
const NAME = "太陽系";
const [out] = await packager({
  dir: ROOT,
  name: NAME,
  executableName: "SolarSystemViewer",
  appBundleId: "local.solar-system-viewer",
  appCategoryType: "public.app-category.education",
  appVersion: "1.0.0",
  platform: "darwin",
  arch: process.arch,
  icon: path.join(ROOT, "build/icon.icns"),
  out: DIST,
  overwrite: true,
  asar: true,
  prune: true,
  ignore: (p) => p !== "" && !/^\/(app|electron|package\.json)(\/|$)/.test(p), // アプリに入れるのは app/ と electron/ だけ
});
const built = path.join(out, NAME + ".app");
const plist = path.join(built, "Contents/Info.plist");
execFileSync("/usr/libexec/PlistBuddy", ["-c", "Set :CFBundleDisplayName 太陽系ビューア", plist]);
// 配布用の署名は無い。この Mac で起動できるようアドホック署名を付け直す
execFileSync("codesign", ["--force", "--deep", "--sign", "-", built], { stdio: "inherit" });
execFileSync("codesign", ["--verify", "--deep", "--strict", built], { stdio: "inherit" });
const final = path.join(DIST, "太陽系ビューア.app");
fs.renameSync(built, final);
// Electron と Chromium のライセンス文書はアプリの隣に残す
fs.mkdirSync(path.join(DIST, "licenses"), { recursive: true });
for (const f of ["LICENSE", "LICENSES.chromium.html"]) if (fs.existsSync(path.join(out, f))) fs.renameSync(path.join(out, f), path.join(DIST, "licenses", f === "LICENSE" ? "LICENSE.electron.txt" : f));
fs.rmSync(out, { recursive: true, force: true });
console.log("packaged:", final);
