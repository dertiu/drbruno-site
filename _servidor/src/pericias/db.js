/* Banco do /pericias (D1 próprio, binding DBP), separado do banco das calculadoras.
   As tabelas são criadas sozinhas. Para mudar a estrutura: acrescente uma etapa em MIGRATIONS. */

const MIGRATIONS = [
  `CREATE TABLE IF NOT EXISTS p_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chave TEXT NOT NULL UNIQUE,
    login TEXT NOT NULL UNIQUE COLLATE NOCASE,
    nome TEXT NOT NULL,
    email TEXT, whatsapp TEXT,
    papel TEXT NOT NULL DEFAULT 'assistente',
    admin INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'ativo',
    pass TEXT,
    totp_secret TEXT,
    totp_on INTEGER NOT NULL DEFAULT 0,
    totp_last INTEGER,
    backup TEXT,
    created_at INTEGER NOT NULL,
    created_by INTEGER,
    pass_changed_at INTEGER,
    last_login_at INTEGER,
    last_seen_at INTEGER
  );
  CREATE TABLE IF NOT EXISTS p_sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    max_at INTEGER NOT NULL,
    last_seen_at INTEGER NOT NULL,
    ip TEXT, place TEXT, ua TEXT
  );
  CREATE INDEX IF NOT EXISTS p_sessions_user ON p_sessions(user_id);
  CREATE TABLE IF NOT EXISTS p_tickets (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    kind TEXT NOT NULL,
    data TEXT,
    expires_at INTEGER NOT NULL,
    tries INTEGER NOT NULL DEFAULT 0,
    used INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS p_tickets_user ON p_tickets(user_id, kind);
  CREATE TABLE IF NOT EXISTS p_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS p_limits (k TEXT PRIMARY KEY, n INTEGER NOT NULL, reset_at INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS p_audit (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    at INTEGER NOT NULL,
    actor_id INTEGER,
    actor TEXT,
    action TEXT NOT NULL,
    target_id INTEGER,
    detail TEXT,
    ip TEXT, place TEXT, ua TEXT
  );
  CREATE INDEX IF NOT EXISTS p_audit_at ON p_audit(at);
  CREATE INDEX IF NOT EXISTS p_audit_target ON p_audit(target_id, at);`,
  // sincronia: cada alteração feita pelo app (ou direto na planilha) e quem está com qual processo aberto
  `CREATE TABLE IF NOT EXISTS p_sync (
    v INTEGER PRIMARY KEY AUTOINCREMENT,
    at INTEGER NOT NULL,
    chave TEXT, nome TEXT, acao TEXT NOT NULL, proc TEXT
  );
  CREATE TABLE IF NOT EXISTS p_presenca (
    chave TEXT PRIMARY KEY,
    nome TEXT, proc TEXT, editando INTEGER NOT NULL DEFAULT 0, at INTEGER NOT NULL
  );`
];

let ready = null;
export function ensureSchemaP(env) {
  if (!env.DBP) throw new Error('Banco do /pericias (DBP) não configurado');
  if (!ready) ready = migrate(env).catch(e => { ready = null; throw e; });
  return ready;
}
async function migrate(env) {
  let v = 0;
  try {
    const r = await env.DBP.prepare("SELECT value FROM p_settings WHERE key = 'schema'").first();
    v = r ? Number(r.value) || 0 : 0;
  } catch (e) { v = 0; }
  for (let i = v; i < MIGRATIONS.length; i++) {
    await env.DBP.batch(MIGRATIONS[i].split(';').map(s => s.trim()).filter(Boolean).map(s => env.DBP.prepare(s)));
    await env.DBP.prepare("INSERT INTO p_settings (key, value) VALUES ('schema', ?1) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(String(i + 1)).run();
  }
}

/* ---------- ajustes (editáveis no painel de usuários) ---------- */
export const DEFAULTS_P = {
  exigir_2fa: false,         // ligado: todos precisam da verificação em duas etapas (por enquanto, só login e senha)
  sessao_dias: 7,            // sem usar por N dias, pede login de novo
  sessao_max_dias: 30,       // mesmo usando, pede login de novo depois de N dias
  max_aparelhos: 3,
  so_brasil: false,          // só aceita login vindo de conexões no Brasil
  contato_whatsapp: ''
};
const TYPES = { exigir_2fa: 'b', sessao_dias: 'n', sessao_max_dias: 'n', max_aparelhos: 'n', so_brasil: 'b', contato_whatsapp: 's' };
const LIMITS = { sessao_dias: [1, 60], sessao_max_dias: [1, 180], max_aparelhos: [1, 10] };

let cache = null, cacheAt = 0;
export async function getSettingsP(env, fresh) {
  if (!fresh && cache && Date.now() - cacheAt < 15000) return cache;
  const rows = (await env.DBP.prepare("SELECT key, value FROM p_settings WHERE key != 'schema'").all()).results || [];
  const s = Object.assign({}, DEFAULTS_P);
  for (const r of rows) if (r.key in TYPES) { try { s[r.key] = JSON.parse(r.value); } catch (e) { } }
  if (s.sessao_max_dias < s.sessao_dias) s.sessao_max_dias = s.sessao_dias;
  cache = s; cacheAt = Date.now();
  return s;
}
export async function saveSettingsP(env, patch) {
  const stmts = [];
  for (const [k, v0] of Object.entries(patch || {})) {
    if (!(k in TYPES)) continue;
    let v = v0;
    if (TYPES[k] === 'b') v = !!v;
    else if (TYPES[k] === 'n') { v = Math.round(Number(v)); if (!isFinite(v)) continue; const [a, b] = LIMITS[k]; v = Math.max(a, Math.min(b, v)); }
    else v = String(v == null ? '' : v).replace(/\D/g, '').slice(0, 15);
    stmts.push(env.DBP.prepare('INSERT INTO p_settings (key, value) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value = excluded.value').bind(k, JSON.stringify(v)));
  }
  if (stmts.length) await env.DBP.batch(stmts);
  cache = null;
  return getSettingsP(env, true);
}

/* ---------- registro ---------- */
export function auditP(env, req, actor, action, targetId, detail) {
  const cf = (req && req.cf) || {};
  return env.DBP.prepare('INSERT INTO p_audit (at, actor_id, actor, action, target_id, detail, ip, place, ua) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)')
    .bind(Date.now(), actor ? actor.id || null : null, actor ? (actor.nome || actor.login || null) : null, action, targetId || null,
      detail ? String(detail).slice(0, 500) : null,
      req ? (req.headers.get('CF-Connecting-IP') || '') : '', [cf.city, cf.country].filter(Boolean).join(', '),
      req ? (req.headers.get('User-Agent') || '').slice(0, 200) : '').run().catch(() => { });
}

/* ---------- limite de tentativas ---------- */
export async function hitP(env, key, max, windowMs) {
  const t = Date.now();
  const r = await env.DBP.prepare(`INSERT INTO p_limits (k, n, reset_at) VALUES (?1, 1, ?2)
    ON CONFLICT(k) DO UPDATE SET n = CASE WHEN p_limits.reset_at < ?3 THEN 1 ELSE p_limits.n + 1 END,
    reset_at = CASE WHEN p_limits.reset_at < ?3 THEN ?2 ELSE p_limits.reset_at END RETURNING n, reset_at`).bind(key, t + windowMs, t).first();
  return { ok: !r || r.n <= max, retryIn: r ? Math.max(0, r.reset_at - t) : 0 };
}

export async function cleanupP(env) {
  const t = Date.now();
  await env.DBP.batch([
    env.DBP.prepare('DELETE FROM p_sessions WHERE expires_at < ?1 OR max_at < ?1').bind(t),
    env.DBP.prepare('DELETE FROM p_limits WHERE reset_at < ?1').bind(t),
    env.DBP.prepare('DELETE FROM p_tickets WHERE expires_at < ?1 OR used = 1').bind(t - 86400000),
    env.DBP.prepare('DELETE FROM p_audit WHERE at < ?1').bind(t - 730 * 86400000),
    env.DBP.prepare('DELETE FROM p_sync WHERE at < ?1').bind(t - 7 * 86400000),
    env.DBP.prepare('DELETE FROM p_presenca WHERE at < ?1').bind(t - 86400000)
  ]);
}
