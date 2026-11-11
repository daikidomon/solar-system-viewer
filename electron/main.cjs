// デスクトップアプリの入口(Electron)。app/ をそのまま表示する。
// file:// では ES モジュールを読み込めないため、独自スキーム app:// でローカルのファイルを配る。
const { app, BrowserWindow, protocol, net, shell, Menu } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const { pathToFileURL } = require("node:url");

const APP_DIR = path.join(__dirname, "..", "app");
protocol.registerSchemesAsPrivileged([{ scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true } }]);

// 動作確認用: --self-test=<png の出力先> を付けると、描画した画面を保存して終了する
const selfTest = process.argv.find((a) => a.startsWith("--self-test="));

function createWindow() {
  const win = new BrowserWindow({
    width: 1440, height: 900, minWidth: 720, minHeight: 520,
    title: "太陽系ビューア", backgroundColor: "#04050a", show: !selfTest,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: "deny" }; });
  win.loadURL("app://solar/index.html" + (selfTest ? "?t=2026-11-11T03:00:00Z&paused=1&focus=saturn" : ""));
  if (selfTest) {
    const errors = [];
    win.webContents.on("console-message", (_e, level, message) => { if (level >= 3) errors.push(message); });
    win.webContents.on("did-finish-load", () => {
      setTimeout(async () => {
        const img = await win.webContents.capturePage();
        fs.writeFileSync(selfTest.split("=")[1], img.toPNG());
        const info = await win.webContents.executeJavaScript("JSON.stringify({focus: window.__solar.focusId, bodies: Object.keys(window.__solar.objs).length, title: document.title})");
        console.log("SELFTEST " + info + " errors=" + JSON.stringify(errors));
        app.quit();
      }, 3500);
    });
  }
}

app.whenReady().then(() => {
  protocol.handle("app", (request) => {
    let p = decodeURIComponent(new URL(request.url).pathname);
    if (p === "/" || p === "") p = "/index.html";
    const file = path.normalize(path.join(APP_DIR, p));
    if (!file.startsWith(APP_DIR)) return new Response("forbidden", { status: 403 });
    return net.fetch(pathToFileURL(file).toString());
  });
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: "太陽系ビューア", submenu: [{ role: "about", label: "太陽系ビューアについて" }, { type: "separator" }, { role: "hide", label: "隠す" }, { role: "quit", label: "終了" }] },
    { label: "表示", submenu: [{ role: "reload", label: "再読み込み" }, { role: "togglefullscreen", label: "フルスクリーン" }, { type: "separator" }, { role: "resetZoom", label: "実際のサイズ" }, { role: "zoomIn", label: "拡大" }, { role: "zoomOut", label: "縮小" }] },
    { label: "ウインドウ", submenu: [{ role: "minimize", label: "しまう" }, { role: "close", label: "閉じる" }] },
  ]));
  createWindow();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on("window-all-closed", () => app.quit());
