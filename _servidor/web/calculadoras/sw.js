/* Cache para uso offline no plantão.
   - "shell": a casca do app (página, estilo, ícones, fontes), renovada a cada versão do site
   - "prot": o código e os dados das calculadoras; só entram aqui depois do login, saem ao sair da conta
     ou quando o servidor responde que o acesso acabou */
const BUILD = '__BUILD__';
const SHELL = __SHELL__;
const PROTECTED = __PROTECTED__;
const SHELL_CACHE = 'shell-' + BUILD, PROT_CACHE = 'prot-v1';
const abs = f => new URL(f, self.registration.scope).href;
const isProt = p => PROTECTED.some(f => p === new URL(abs(f)).pathname);

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL_CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  // apaga versões antigas (inclusive o cache antigo calc-v*, que guardava o código aberto)
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== SHELL_CACHE && k !== PROT_CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

async function warm() {
  const c = await caches.open(PROT_CACHE);
  let n = 0, denied = false;
  for (const f of PROTECTED) {
    try {
      const r = await fetch(new Request(abs(f), { credentials: 'same-origin', cache: 'no-cache' }));
      if (r.ok) { await c.put(abs(f), r); n++; }
      else if (r.status === 401 || r.status === 403) { denied = true; await c.delete(abs(f)); }
    } catch (e) { }
  }
  return { ok: n === PROTECTED.length, n, denied };
}
self.addEventListener('message', e => {
  const d = e.data || {}, port = e.ports && e.ports[0];
  const done = r => { try { if (port) port.postMessage(r); } catch (x) { } };
  if (d.t === 'warm') e.waitUntil(warm().then(done, () => done({ ok: false })));
  else if (d.t === 'purge') e.waitUntil(caches.delete(PROT_CACHE).then(() => done({ ok: true })));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const scope = new URL(self.registration.scope).pathname;
  if (!url.pathname.startsWith(scope)) return;
  if (/admin|editor/.test(url.pathname)) return; // editor sempre da rede
  if (req.cache === 'no-store') return;

  if (isProt(url.pathname)) {
    // código protegido: abre na hora pelo cache e atualiza em segundo plano
    e.respondWith(caches.open(PROT_CACHE).then(async c => {
      const key = url.origin + url.pathname;
      const hit = await c.match(key);
      const net = fetch(req).then(async r => {
        if (r.ok) await c.put(key, r.clone());
        else if (r.status === 401 || r.status === 403) await c.delete(key);
        return r;
      });
      if (hit) { e.waitUntil(net.catch(() => { })); return hit; }
      return net;
    }));
    return;
  }

  if (req.mode === 'navigate') {
    e.respondWith(caches.open(SHELL_CACHE).then(async c => (await c.match(abs('./'))) || fetch(req).catch(() => new Response('Sem conexão', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }))));
    return;
  }

  e.respondWith(caches.open(SHELL_CACHE).then(async c => {
    const hit = await c.match(req, { ignoreSearch: true });
    if (hit) return hit;
    const r = await fetch(req);
    if (r.ok && !/\.js$/.test(url.pathname)) c.put(req, r.clone());
    return r;
  }));
});
