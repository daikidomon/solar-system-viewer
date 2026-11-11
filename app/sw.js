// 生成物: tools/build-sw.mjs
const CACHE = "solar-a422e21d805a";
const FILES = ["./","css/style.css","data/sat-phase.js","data/solar-data.js","data/stars.js","icons/icon-192.png","icons/icon-512.png","index.html","js/app.js","js/bodies.js","js/ephemeris.js","js/scene.js","manifest.webmanifest","textures/ariel.jpg","textures/callisto.jpg","textures/charon.jpg","textures/deimos.jpg","textures/dione.jpg","textures/earth.jpg","textures/earth_night.jpg","textures/enceladus.jpg","textures/europa.jpg","textures/ganymede.jpg","textures/iapetus.jpg","textures/io.jpg","textures/jupiter.jpg","textures/mars.jpg","textures/mercury.jpg","textures/mimas.jpg","textures/miranda.jpg","textures/moon.jpg","textures/neptune.jpg","textures/oberon.jpg","textures/phobos.jpg","textures/pluto.jpg","textures/rhea.jpg","textures/saturn.jpg","textures/tethys.jpg","textures/titan.jpg","textures/titania.jpg","textures/triton.jpg","textures/umbriel.jpg","textures/venus.jpg","vendor/three.LICENSE.txt","vendor/three.module.min.js"];
self.addEventListener("install", (e) => e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener("activate", (e) => e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request)));
});
