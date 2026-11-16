/* Servidor do site brunomichels.com.br (Cloudflare Workers + D1)
   - /api/*            login, cadastro, visitante, códigos e painel
   - /calculadoras/*   o código das calculadoras só é entregue a quem tem acesso
   - /painel/          painel de administração
   - /pericias/*       área privada do perito, separada (ver pericias/index.js)
   - o resto do site (página inicial etc.) é servido como antes, sem passar por aqui */
import { ensureSchema, getSettings, cleanup } from './db.js';
import { api } from './api.js';
import { getSession, accessOf } from './auth.js';
import { pericias } from './pericias/index.js';
import { ensureSchemaP, cleanupP } from './pericias/db.js';

// arquivos das calculadoras que qualquer um pode baixar (não contêm a lógica nem o conteúdo)
const PUBLIC_CALC = /^\/calculadoras\/(?:|index\.html|gate\.js|gate\.css|sw\.js|style\.css|manifest\.webmanifest|icon[\w.-]*\.(?:svg|png)|fonts\/[\w.-]+)$/;
// editor de conteúdo: só administradores
const ADMIN_CALC = /^\/calculadoras\/(?:admin(?:\.html)?|admin\.css|editor\.js)$/;

const BASE_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'SAMEORIGIN',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'Cross-Origin-Opener-Policy': 'same-origin'
};

function withHeaders(res, extra) {
  const r = new Response(res.body, res);
  for (const [k, v] of Object.entries(BASE_HEADERS)) if (!r.headers.has(k)) r.headers.set(k, v);
  if (extra) for (const [k, v] of Object.entries(extra)) r.headers.set(k, v);
  return r;
}
const text = (msg, status) => new Response(msg, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });

async function calculadoras(req, env, ctx, url) {
  const p = url.pathname;
  if (PUBLIC_CALC.test(p)) return withHeaders(await env.ASSETS.fetch(req), { 'X-Robots-Tag': 'noindex' });
  if (p === '/calculadoras') return Response.redirect(url.origin + '/calculadoras/' + url.search, 301);
  const s = await getSession(req, env, ctx);
  if (ADMIN_CALC.test(p)) {
    if (!s || !s.user || s.user.role !== 'admin' || s.user.status !== 'ativo') {
      if (/\/admin(?:\.html)?$/.test(p)) return Response.redirect(url.origin + '/painel/?volta=' + encodeURIComponent(p), 302);
      return text('Acesso restrito ao administrador.', 403);
    }
    const r = await env.ASSETS.fetch(req);
    return withHeaders(r, { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' });
  }
  const st = await getSettings(env);
  const a = accessOf(s, st);
  if (!a.ok) return text('Acesso restrito. Entre em ' + url.origin + '/calculadoras/', s ? 403 : 401);
  const r = await env.ASSETS.fetch(req);
  return withHeaders(r, { 'Cache-Control': 'private, no-cache', 'X-Robots-Tag': 'noindex' });
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    // www.brunomichels.com.br -> brunomichels.com.br
    if (url.hostname.startsWith('www.')) { url.hostname = url.hostname.slice(4); return Response.redirect(url.toString(), 301); }
    try {
      if (url.pathname.startsWith('/api/')) {
        await ensureSchema(env);
        return withHeaders(await api(req, env, ctx, url), { 'X-Robots-Tag': 'noindex' });
      }
      if (url.pathname === '/pericias' || url.pathname.startsWith('/pericias/')) return await pericias(req, env, ctx, url);
      if (url.pathname === '/calculadoras' || url.pathname.startsWith('/calculadoras/')) {
        await ensureSchema(env);
        return await calculadoras(req, env, ctx, url);
      }
      return env.ASSETS.fetch(req);
    } catch (e) {
      console.error('erro', url.pathname, e && e.stack || e);
      return text('Erro no servidor. Tente de novo em instantes.', 500);
    }
  },
  async scheduled(event, env, ctx) {
    await ensureSchema(env);
    ctx.waitUntil(cleanup(env));
    if (env.DBP) { await ensureSchemaP(env); ctx.waitUntil(cleanupP(env)); }
  }
};
