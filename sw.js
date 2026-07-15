const CACHE = "budget-v5";
const ASSETS = [
  "./", "index.html", "styles.css", "app.js", "manifest.webmanifest",
  "icon-180.png", "icon-192.png", "icon-512.png",
  "fonts/fraunces-400.woff2", "fonts/fraunces-600.woff2",
  "fonts/geist-400.woff2", "fonts/geist-500.woff2", "fonts/geist-600.woff2",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request)));
});
