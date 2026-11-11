// オフラインで開けるよう、app/ 内の全ファイルを先読みする service worker を書き出す。
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
const APP = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "app");
const files = [];
(function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (f !== "sw.js" && !f.startsWith(".")) files.push(path.relative(APP, p).split(path.sep).join("/"));
  }
})(APP);
const hash = crypto.createHash("sha1");
for (const f of files.sort()) hash.update(f).update(fs.readFileSync(path.join(APP, f)));
const version = hash.digest("hex").slice(0, 12);
fs.writeFileSync(path.join(APP, "sw.js"), `// 生成物: tools/build-sw.mjs
const CACHE = "solar-${version}";
const FILES = ${JSON.stringify(["./", ...files])};
self.addEventListener("install", (e) => e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener("activate", (e) => e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request)));
});
`);
console.log(`sw.js: ${files.length} files, cache solar-${version}`);
