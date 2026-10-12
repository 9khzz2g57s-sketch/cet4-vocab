/* 四级词汇学习台 — 离线缓存
   策略：HTML 走「网络优先，离线回退缓存」，保证每次都能拿到最新版；
        图标等静态资源走「缓存优先」。 */
const CACHE = "cet4-vocab-v2";
const ASSETS = ["./", "./index.html", "./manifest.webmanifest", "./icons/icon-180.png", "./icons/icon-192.png", "./icons/icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(() => {}).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const isHTML = req =>
  req.mode === "navigate" ||
  (req.headers.get("accept") || "").includes("text/html") ||
  /\.html?$/.test(new URL(req.url).pathname) ||
  new URL(req.url).pathname.endsWith("/");

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;

  if (isHTML(req)) {
    // 网络优先：拿得到就用最新的，拿不到（离线）再回退缓存
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() =>
        caches.match(req, { ignoreSearch: true }).then(hit => hit || caches.match("./index.html"))
      )
    );
    return;
  }

  // 其它静态资源：缓存优先
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      return res;
    }))
  );
});
