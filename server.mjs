// Web 版の起動: node server.mjs  →  http://localhost:5173
//   --host  同じネットワークのスマホやタブレットからも開けるようにする
//   --port N
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "app");
const args = process.argv.slice(2);
const port = Number(args[args.indexOf("--port") + 1]) || 5173;
const host = args.includes("--host") ? "0.0.0.0" : "127.0.0.1";
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".webmanifest": "application/manifest+json", ".jpg": "image/jpeg", ".png": "image/png", ".txt": "text/plain; charset=utf-8" };

http
  .createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (p.endsWith("/")) p += "index.html";
    const file = path.join(ROOT, p);
    if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404, { "Content-Type": "text/plain" }).end("not found"); return; }
      res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-cache" });
      res.end(data);
    });
  })
  .listen(port, host, () => {
    console.log(`太陽系ビューア: http://localhost:${port}`);
    if (host === "0.0.0.0") for (const list of Object.values(os.networkInterfaces())) for (const n of list) if (n.family === "IPv4" && !n.internal) console.log(`  同じネットワークから: http://${n.address}:${port}`);
  });
