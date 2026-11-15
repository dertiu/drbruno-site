/* Banco de dados (Cloudflare D1, SQLite). As tabelas são criadas sozinhas no primeiro acesso.
   Para mudar a estrutura no futuro: acrescente uma nova etapa em MIGRATIONS (nunca altere as antigas). */

const MIGRATIONS = [
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    name TEXT NOT NULL,
    crm TEXT, crm_uf TEXT, whatsapp TEXT,
    pass TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    status TEXT NOT NULL DEFAULT 'ativo',
    access_until INTEGER,
    lifetime INTEGER NOT NULL DEFAULT 0,
    plan TEXT,
    notes TEXT,
    created_at INTEGER NOT NULL,
    last_login_at INTEGER,
    last_seen_at INTEGER
  );
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER,
    kind TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    last_seen_at INTEGER NOT NULL,
    ip TEXT, place TEXT, ua TEXT
  );
  CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS sessions_seen ON sessions(kind, last_seen_at);
  CREATE TABLE IF NOT EXISTS codes (
    code TEXT PRIMARY KEY,
    label TEXT,
    mode TEXT NOT NULL,
    days INTEGER,
    until INTEGER,
    max_uses INTEGER NOT NULL DEFAULT 1,
    uses INTEGER NOT NULL DEFAULT 0,
    valid_until INTEGER,
    for_email TEXT COLLATE NOCASE,
    revoked INTEGER NOT NULL DEFAULT 0,
    created_by INTEGER,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS redemptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    at INTEGER NOT NULL,
    UNIQUE(code, user_id)
  );
  CREATE TABLE IF NOT EXISTS grants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    at INTEGER NOT NULL,
    source TEXT NOT NULL,
    detail TEXT,
    by_user INTEGER,
    before_until INTEGER, before_life INTEGER,
    after_until INTEGER, after_life INTEGER
  );
  CREATE INDEX IF NOT EXISTS grants_user ON grants(user_id, at);
  CREATE TABLE IF NOT EXISTS resets (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    used INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS limits (k TEXT PRIMARY KEY, n INTEGER NOT NULL, reset_at INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS audit (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    at INTEGER NOT NULL,
    actor_id INTEGER,
    actor TEXT,
    action TEXT NOT NULL,
    target_id INTEGER,
    detail TEXT,
    ip TEXT, place TEXT
  );
  CREATE INDEX IF NOT EXISTS audit_at ON audit(at);
  CREATE INDEX IF NOT EXISTS audit_target ON audit(target_id, at);
  CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    provider TEXT NOT NULL,
    provider_ref TEXT,
    plan TEXT,
    status TEXT NOT NULL,
    current_period_end INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS subs_user ON subscriptions(user_id);`
];

let ready = null;
export function ensureSchema(env) {
  if (!ready) ready = migrate(env).catch(e => { ready = null; throw e; });
  return ready;
}
async function migrate(env) {
  let v = 0;
  try {
    const r = await env.DB.prepare("SELECT value FROM settings WHERE key = 'schema'").first();
    v = r ? Number(r.value) || 0 : 0;
  } catch (e) { v = 0; }
  for (let i = v; i < MIGRATIONS.length; i++) {
    const stmts = MIGRATIONS[i].split(';').map(s => s.trim()).filter(Boolean).map(s => env.DB.prepare(s));
    await env.DB.batch(stmts);
    await env.DB.prepare("INSERT INTO settings (key, value) VALUES ('schema', ?1) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(String(i + 1)).run();
  }
}

/* ---------- ajustes do site (editáveis no painel) ---------- */
export const DEFAULTS = {
  visitante: true,
  cadastro: true,
  crm_obrigatorio: true,
  max_aparelhos: 3,
  offline_dias: 10,
  offline_dias_visitante: 3,
  contato_whatsapp: '',
  aviso_sem_acesso: 'Sua conta ainda não tem acesso liberado. Use um código de acesso ou peça a liberação pelo WhatsApp.',
  assinatura_link: '',
  assinatura_texto: 'Assinar'
};
const TYPES = { visitante: 'b', cadastro: 'b', crm_obrigatorio: 'b', max_aparelhos: 'n', offline_dias: 'n', offline_dias_visitante: 'n', contato_whatsapp: 's', aviso_sem_acesso: 's', assinatura_link: 's', assinatura_texto: 's' };

let cache = null, cacheAt = 0;
export async function getSettings(env, fresh) {
  if (!fresh && cache && Date.now() - cacheAt < 20000) return cache;
  const rows = (await env.DB.prepare("SELECT key, value FROM settings WHERE key != 'schema'").all()).results || [];
  const s = Object.assign({}, DEFAULTS);
  for (const r of rows) if (r.key in TYPES) { try { s[r.key] = JSON.parse(r.value); } catch (e) { } }
  cache = s; cacheAt = Date.now();
  return s;
}
export async function saveSettings(env, patch) {
  const stmts = [];
  for (const [k, v0] of Object.entries(patch || {})) {
    if (!(k in TYPES)) continue;
    let v = v0;
    if (TYPES[k] === 'b') v = !!v;
    else if (TYPES[k] === 'n') { v = Math.round(Number(v)); if (!isFinite(v)) continue; v = Math.max(1, Math.min(k === 'max_aparelhos' ? 20 : 120, v)); }
    else v = String(v == null ? '' : v).slice(0, k === 'aviso_sem_acesso' ? 600 : 300).trim();
    if (k === 'assinatura_link' && v && !/^https:\/\//i.test(v)) continue;
    if (k === 'contato_whatsapp') v = v.replace(/\D/g, '').slice(0, 15);
    stmts.push(env.DB.prepare('INSERT INTO settings (key, value) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value = excluded.value').bind(k, JSON.stringify(v)));
  }
  if (stmts.length) await env.DB.batch(stmts);
  cache = null;
  return getSettings(env, true);
}

/* ---------- registro de ações ---------- */
export function audit(env, req, actor, action, targetId, detail) {
  const cf = (req && req.cf) || {};
  const ip = req ? (req.headers.get('CF-Connecting-IP') || '') : '';
  const place = [cf.city, cf.country].filter(Boolean).join(', ');
  return env.DB.prepare('INSERT INTO audit (at, actor_id, actor, action, target_id, detail, ip, place) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)')
    .bind(Date.now(), actor ? actor.id || null : null, actor ? (actor.name || actor.email || 'visitante') : null, action, targetId || null, detail ? String(detail).slice(0, 500) : null, ip, place).run().catch(() => { });
}

/* ---------- limite de tentativas (contra robôs e chutes de senha) ---------- */
export async function hit(env, key, max, windowMs) {
  const t = Date.now();
  const r = await env.DB.prepare(`INSERT INTO limits (k, n, reset_at) VALUES (?1, 1, ?2)
    ON CONFLICT(k) DO UPDATE SET n = CASE WHEN limits.reset_at < ?3 THEN 1 ELSE limits.n + 1 END,
    reset_at = CASE WHEN limits.reset_at < ?3 THEN ?2 ELSE limits.reset_at END RETURNING n, reset_at`).bind(key, t + windowMs, t).first();
  return { ok: !r || r.n <= max, retryIn: r ? Math.max(0, r.reset_at - t) : 0 };
}

/* ---------- limpeza diária ---------- */
export async function cleanup(env) {
  const t = Date.now();
  await env.DB.batch([
    env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?1').bind(t),
    env.DB.prepare('DELETE FROM limits WHERE reset_at < ?1').bind(t),
    env.DB.prepare('DELETE FROM resets WHERE expires_at < ?1 OR used = 1').bind(t - 86400000),
    env.DB.prepare('DELETE FROM audit WHERE at < ?1').bind(t - 400 * 86400000)
  ]);
}
