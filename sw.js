/* Venus · Service Worker — offline garantizado + actualizaciones automáticas
   Estrategia: la página (index.html) va RED PRIMERO (si hay internet, siempre
   la última versión publicada; si no, la copia cacheada → offline intacto).
   El resto de recursos van caché primero. */
const CACHE = "venus-v23";
const MEDIA = "venus-media-v1"; // animaciones de ejercicios: caché aparte, sobrevive a las versiones
const ASSETS = ["./", "./index.html", "./manifest.json", "./media/pike-push-up.webp", "./media/hollow-hold.webp", "./media/hip-thrust.webp", "./media/handstand-wall.webp"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== MEDIA).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const isNav = e.request.mode === "navigate" || e.request.url.endsWith("/index.html");
  if (e.request.url.includes("/exercises-dataset/") && e.request.url.endsWith(".gif")) {
    // GIF de referencia: caché primero; si no está y hay red, se guarda para la próxima vez (también offline)
    e.respondWith(
      caches.open(MEDIA).then((c) =>
        c.match(e.request).then((hit) => hit || fetch(e.request).then((resp) => { if (resp.ok) c.put(e.request, resp.clone()); return resp; }))
      ).catch(() => new Response("", { status: 504 }))
    );
    return;
  }
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
