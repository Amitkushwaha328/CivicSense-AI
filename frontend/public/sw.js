const CACHE_NAME = "civicsense-v1";
const ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/favicon.ico"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      // Return cached asset if found, else fetch from network
      return response || fetch(e.request);
    })
  );
});
