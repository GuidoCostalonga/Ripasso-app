// Tiene in memoria i file dell'app, così si apre anche senza rete.
const VERSIONE = "ripasso-v2";
const FILE = [
  "./", "index.html", "stile.css", "app.js", "store.js", "ai.js",
  "manifest.webmanifest", "icona.svg", "icona-192.png", "icona-512.png",
  "https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@0.135.0/+esm",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSIONE).then((c) => c.addAll(FILE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((chiavi) => Promise.all(chiavi.filter((k) => k !== VERSIONE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Prima la rete, poi la copia salvata. Le chiamate a Claude non passano di qui.
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request)
      .then((r) => {
        if (r.ok) {
          const copia = r.clone();
          caches.open(VERSIONE).then((c) => c.put(e.request, copia));
        }
        return r;
      })
      .catch(() => caches.match(e.request))
  );
});
