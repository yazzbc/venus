/* Venus · Service Worker — offline garantizado + actualizaciones automáticas
   Estrategia: la página (index.html) va RED PRIMERO (si hay internet, siempre
   la última versión publicada; si no, la copia cacheada → offline intacto).
   El resto de recursos van caché primero. */
const CACHE = "venus-v18";
const ASSETS = ["./", "./index.html", "./manifest.json"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
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
  const isNav = e.request.mode === "navigate" || e.request.url.endsWith("/index.html");
  if (isNav) {
    e.respondWith(
      fetch(e.request)
        .then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE).then((c) => c.put("./index.html", copy));
          return resp;
        })
        .catch(() =>
          caches.match("./index.html").then((r) => r || caches.match("./"))
        )
    );
  } else {
    e.respondWith(
      caches.match(e.request).then(
        (cached) =>
          cached ||
          fetch(e.request).then((resp) => {
            const copy = resp.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy));
            return resp;
          }).catch(() => caches.match("./index.html"))
      )
    );
  }
});
