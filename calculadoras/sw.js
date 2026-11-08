/* Cache para uso offline no plantão. Atualiza em segundo plano a cada abertura. */
const CACHE = 'calc-v4';
const ASSETS = ['./', 'index.html', 'style.css', 'core.js', 't-med.js', 't-esc.js', 't-lab.js', 't-ped.js', 't-cir.js', 't-util.js', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png', 'fonts/atkinson-hyperlegible-next-latin-wght-normal.woff2', 'fonts/atkinson-hyperlegible-next-latin-ext-wght-normal.woff2'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith(caches.open(CACHE).then(cache =>
    cache.match(req).then(hit => {
      const net = fetch(req).then(res => { if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    })));
});
