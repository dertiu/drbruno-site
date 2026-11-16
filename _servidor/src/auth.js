/* Senhas, sessões e regras de acesso */
import { randomToken, sha256hex, clientIp, clientPlace, clientUa, DAY } from './util.js';
import { hashSenha, conferirSenha, problemaSenha } from './comum/senha.js';
import { audit } from './db.js';

/* ---------- senhas (ver comum/senha.js): calculadoras usam SENHA_PEPPER e SENHA_ITERACOES ---------- */
const cfgSenha = env => ({ pepper: env && env.SENHA_PEPPER, iter: env && env.SENHA_ITERACOES });
export const hashPassword = (pw, env) => hashSenha(pw, cfgSenha(env));
export const checkPassword = (pw, stored, env) => conferirSenha(pw, stored, cfgSenha(env));
export const passwordProblem = problemaSenha;

/* ---------- sessões em cookie seguro (HttpOnly, inacessível ao JavaScript) ---------- */
export const COOKIE = '__Host-drb';
const TTL = { user: 90 * DAY, visitante: 30 * DAY };

function readCookie(req, name) {
  const c = req.headers.get('Cookie') || '';
  for (const part of c.split(/;\s*/)) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i) === name) return part.slice(i + 1);
  }
  return '';
}
export const setCookie = (token, ttl) => `${COOKIE}=${token}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(ttl / 1000)}`;
export const clearCookie = () => `${COOKIE}=; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0`;

export async function createSession(env, req, kind, userId) {
  const token = randomToken(32), id = await sha256hex(token), t = Date.now(), ttl = TTL[kind] || TTL.user;
  await env.DB.prepare('INSERT INTO sessions (id, user_id, kind, created_at, expires_at, last_seen_at, ip, place, ua) VALUES (?1, ?2, ?3, ?4, ?5, ?4, ?6, ?7, ?8)')
    .bind(id, userId || null, kind, t, t + ttl, clientIp(req), clientPlace(req), clientUa(req)).run();
  return { cookie: setCookie(token, ttl), id };
}

/* Mantém no máximo N aparelhos conectados por conta: os mais antigos saem */
export async function enforceDeviceLimit(env, req, user, max) {
  const rows = (await env.DB.prepare('SELECT id FROM sessions WHERE user_id = ?1 ORDER BY last_seen_at DESC').bind(user.id).all()).results || [];
  const extra = rows.slice(Math.max(1, max));
  if (!extra.length) return 0;
  await env.DB.batch(extra.map(r => env.DB.prepare('DELETE FROM sessions WHERE id = ?1').bind(r.id)));
  await audit(env, req, user, 'limite de aparelhos', user.id, extra.length + ' sessão(ões) antiga(s) encerrada(s)');
  return extra.length;
}

const USER_COLS = 'u.id AS uid, u.email, u.name, u.crm, u.crm_uf, u.whatsapp, u.role, u.status, u.access_until, u.lifetime, u.plan, u.created_at AS u_created, u.last_seen_at AS u_seen';
export async function getSession(req, env, ctx) {
  const token = readCookie(req, COOKIE);
  if (!token || token.length < 30 || token.length > 60) return null;
  const id = await sha256hex(token);
  const r = await env.DB.prepare(`SELECT s.id, s.kind, s.user_id, s.expires_at, s.last_seen_at, ${USER_COLS}
    FROM sessions s LEFT JOIN users u ON u.id = s.user_id WHERE s.id = ?1`).bind(id).first();
  if (!r) return null;
  const t = Date.now();
  if (r.expires_at < t || (r.kind === 'user' && !r.uid)) {
    await env.DB.prepare('DELETE FROM sessions WHERE id = ?1').bind(id).run();
    return null;
  }
  const s = {
    id, kind: r.kind,
    user: r.uid ? { id: r.uid, email: r.email, name: r.name, crm: r.crm, crm_uf: r.crm_uf, whatsapp: r.whatsapp, role: r.role, status: r.status, access_until: r.access_until, lifetime: r.lifetime, plan: r.plan, created_at: r.u_created } : null
  };
  // renova a sessão (no máximo uma escrita por hora)
  if (t - r.last_seen_at > 3600000) {
    const ttl = TTL[r.kind] || TTL.user;
    const p = env.DB.batch([
      env.DB.prepare('UPDATE sessions SET last_seen_at = ?1, expires_at = ?2, ip = ?3, place = ?4 WHERE id = ?5').bind(t, t + ttl, clientIp(req), clientPlace(req), id),
      ...(r.uid ? [env.DB.prepare('UPDATE users SET last_seen_at = ?1 WHERE id = ?2').bind(t, r.uid)] : [])
    ]).catch(() => { });
    if (ctx && ctx.waitUntil) ctx.waitUntil(p); else await p;
  }
  return s;
}

/* ---------- regra de acesso: quem pode abrir as calculadoras ---------- */
export function accessOf(s, st) {
  const t = Date.now();
  if (!s) return { ok: false, motivo: 'sem_sessao' };
  if (s.kind === 'visitante') return st.visitante ? { ok: true, tipo: 'visitante' } : { ok: false, motivo: 'visitante_encerrado' };
  const u = s.user;
  if (!u) return { ok: false, motivo: 'sem_sessao' };
  if (u.status !== 'ativo') return { ok: false, motivo: 'bloqueado' };
  if (u.role === 'admin') return { ok: true, tipo: 'admin', vitalicio: true };
  if (u.lifetime) return { ok: true, tipo: 'vitalicio', vitalicio: true };
  if (u.access_until && u.access_until > t) return { ok: true, tipo: 'periodo', ate: u.access_until };
  if (st.visitante) return { ok: true, tipo: 'aberto', expirou: u.access_until || null };
  return { ok: false, motivo: u.access_until ? 'expirou' : 'sem_acesso', ate: u.access_until || null };
}

/* ---------- conceder, estender ou retirar acesso (usado por códigos, painel e, no futuro, assinatura) ---------- */
export async function grant(env, req, userId, g, meta) {
  const u = await env.DB.prepare('SELECT id, access_until, lifetime FROM users WHERE id = ?1').bind(userId).first();
  if (!u) throw new Error('usuário não encontrado');
  const t = Date.now();
  let until = u.access_until || null, life = u.lifetime ? 1 : 0;
  if (g.mode === 'vitalicio') life = 1;
  else if (g.mode === 'dias') { const d = Math.max(1, Math.min(3650, Math.round(Number(g.days) || 0))); until = Math.max(t, until || 0) + d * DAY; }
  else if (g.mode === 'data') { if (!(g.until > t)) throw new Error('data inválida'); until = meta.exact ? g.until : Math.max(until || 0, g.until); if (meta.exact) life = 0; }
  else if (g.mode === 'remover') { until = null; life = 0; }
  else throw new Error('tipo de acesso inválido');
  const plan = life ? 'vitalicio' : until ? (meta.source === 'assinatura' ? 'assinatura' : meta.source === 'codigo' ? 'codigo' : 'cortesia') : null;
  await env.DB.batch([
    env.DB.prepare('UPDATE users SET access_until = ?1, lifetime = ?2, plan = ?3 WHERE id = ?4').bind(until, life, plan, userId),
    env.DB.prepare('INSERT INTO grants (user_id, at, source, detail, by_user, before_until, before_life, after_until, after_life) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)')
      .bind(userId, t, meta.source, meta.detail || null, meta.by || null, u.access_until || null, u.lifetime ? 1 : 0, until, life)
  ]);
  return { access_until: until, lifetime: life };
}

export function describeGrant(g) {
  if (g.mode === 'vitalicio') return 'vitalício';
  if (g.mode === 'dias') return g.days + (g.days == 1 ? ' dia' : ' dias');
  if (g.mode === 'data') return 'até ' + new Date(g.until).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  if (g.mode === 'remover') return 'acesso retirado';
  return g.mode;
}
