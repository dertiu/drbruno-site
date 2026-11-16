/* API pública: cadastro, entrada, visitante, códigos e senha */
import { json, fail, readJson, HttpError, normEmail, validEmail, onlyDigits, clean, UFS, normCode, showCode, clientIp, sha256hex, randomToken, safeEqual, DAY } from './util.js';
import { getSettings, audit, hit } from './db.js';
import { hashPassword, checkPassword, passwordProblem, createSession, enforceDeviceLimit, getSession, accessOf, grant, describeGrant, clearCookie } from './auth.js';
import { adminApi } from './admin.js';
import { codigoConfiguracao, apagarCodigoConfiguracao } from './comum/segredos.js';

const te = new TextEncoder();
const fmtDate = ms => new Date(ms).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });

export function publicConfig(st, env) {
  return {
    visitante: !!st.visitante, cadastro: !!st.cadastro, crm_obrigatorio: !!st.crm_obrigatorio,
    contato_whatsapp: st.contato_whatsapp || '', aviso_sem_acesso: st.aviso_sem_acesso || '',
    assinatura_link: st.assinatura_link || '', assinatura_texto: st.assinatura_texto || 'Assinar',
    email_senha: !!(env.RESEND_API_KEY && env.EMAIL_FROM)
  };
}
export const pubUser = u => u && { nome: u.name, email: u.email, crm: u.crm || '', uf: u.crm_uf || '', whatsapp: u.whatsapp || '', admin: u.role === 'admin' };

let adminExists = false;
async function needsSetup(env) {
  if (adminExists) return false;
  const r = await env.DB.prepare("SELECT 1 AS x FROM users WHERE role = 'admin' LIMIT 1").first();
  if (r) { adminExists = true; return false; }
  return true;
}

async function me(env, s, st, extraHeaders, status = 200) {
  const a = accessOf(s, st);
  const out = {
    ok: true,
    logado: !!s,
    tipo: s ? s.kind : null,
    usuario: s && s.user ? pubUser(s.user) : null,
    acesso: a,
    offline_dias: s && s.kind === 'visitante' ? st.offline_dias_visitante : st.offline_dias,
    config: publicConfig(st, env),
    agora: Date.now()
  };
  if (!s || !s.user) out.setup = (await needsSetup(env)) && !!(await codigoConfiguracao(env.ADMIN_SETUP_CODE, env.DB, 'settings'));
  return json(out, status, extraHeaders);
}

/* Revalida a sessão recém-criada para devolver o estado completo */
async function meAfter(env, req, cookie, st) {
  const token = cookie.split(';')[0].split('=')[1];
  const fake = new Request(req.url, { headers: { Cookie: '__Host-drb=' + token } });
  const s = await getSession(fake, env);
  return me(env, s, st, { 'Set-Cookie': cookie });
}

const tooMany = r => new HttpError(429, 'Muitas tentativas. Aguarde ' + Math.max(1, Math.ceil(r.retryIn / 60000)) + ' minuto(s) e tente de novo.');

/* ---------- códigos de acesso ---------- */
async function checkCode(env, raw, email, userId) {
  const code = normCode(raw);
  if (code.length < 6) throw new HttpError(400, 'Digite o código completo.');
  const c = await env.DB.prepare('SELECT * FROM codes WHERE code = ?1').bind(code).first();
  const t = Date.now();
  if (!c) throw new HttpError(404, 'Código não encontrado. Confira as letras e números.');
  if (c.revoked) throw new HttpError(410, 'Este código foi cancelado.');
  if (c.valid_until && c.valid_until < t) throw new HttpError(410, 'Este código venceu em ' + fmtDate(c.valid_until) + '.');
  if (c.uses >= c.max_uses) throw new HttpError(410, 'Este código já foi usado.');
  if (c.for_email && email && c.for_email.toLowerCase() !== String(email).toLowerCase()) throw new HttpError(403, 'Este código foi criado para outro e-mail.');
  if (c.mode === 'data' && c.until < t) throw new HttpError(410, 'Este código dava acesso até ' + fmtDate(c.until) + ', data que já passou.');
  if (userId) {
    const used = await env.DB.prepare('SELECT 1 AS x FROM redemptions WHERE code = ?1 AND user_id = ?2').bind(code, userId).first();
    if (used) throw new HttpError(409, 'Você já usou este código.');
  }
  return c;
}
async function redeem(env, req, user, raw) {
  const c = await checkCode(env, raw, user.email, user.id);
  const r = await env.DB.prepare('UPDATE codes SET uses = uses + 1 WHERE code = ?1 AND uses < max_uses AND revoked = 0').bind(c.code).run();
  if (!r.meta || !r.meta.changes) throw new HttpError(410, 'Este código acabou de ser usado.');
  const g = { mode: c.mode, days: c.days, until: c.until };
  const res = await grant(env, req, user.id, g, { source: 'codigo', detail: showCode(c.code) + (c.label ? ' (' + c.label + ')' : ''), exact: false });
  await env.DB.prepare('INSERT OR IGNORE INTO redemptions (code, user_id, at) VALUES (?1, ?2, ?3)').bind(c.code, user.id, Date.now()).run();
  await audit(env, req, user, 'usou código', user.id, showCode(c.code) + ': ' + describeGrant(g));
  return res;
}

/* ---------- e-mail (opcional, via Resend) ---------- */
async function sendMail(env, to, subject, text) {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) return false;
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: env.EMAIL_FROM, to: [to], subject, text })
  });
  return r.ok;
}
export async function createReset(env, userId, hours) {
  const token = randomToken(24), t = Date.now();
  await env.DB.prepare('INSERT INTO resets (id, user_id, expires_at, used, created_at) VALUES (?1, ?2, ?3, 0, ?4)').bind(await sha256hex(token), userId, t + hours * 3600000, t).run();
  return token;
}
const resetUrl = (url, token) => url.origin + '/calculadoras/#redefinir=' + token;

/* ---------- validação do cadastro ---------- */
function readProfile(b, st, partial) {
  const p = {};
  p.name = clean(b.nome, 100);
  if (!partial || b.nome !== undefined) if (p.name.length < 3) throw new HttpError(400, 'Digite seu nome completo.');
  const crm = onlyDigits(b.crm).slice(0, 8), uf = String(b.uf || '').toUpperCase();
  if (crm || uf || (st.crm_obrigatorio && !partial)) {
    if (crm.length < 3) throw new HttpError(400, 'Digite o número do CRM.');
    if (!UFS.includes(uf)) throw new HttpError(400, 'Escolha a UF do CRM.');
  }
  p.crm = crm || null; p.crm_uf = crm ? uf : null;
  let w = onlyDigits(b.whatsapp);
  if (w.length === 10 || w.length === 11) w = '55' + w;
  if (!partial || b.whatsapp !== undefined) if (w.length < 12 || w.length > 13) throw new HttpError(400, 'Digite o WhatsApp com DDD.');
  p.whatsapp = w || null;
  return p;
}

export async function api(req, env, ctx, url) {
  const path = url.pathname.replace(/\/+$/, '');
  const method = req.method;
  // proteção contra envio a partir de outros sites
  if (method !== 'GET' && method !== 'HEAD') {
    const o = req.headers.get('Origin');
    if (o && o !== url.origin) return fail('Origem não permitida.', 403);
  }
  try {
    const st = await getSettings(env);
    if (path.startsWith('/api/admin/') || path === '/api/admin') return await adminApi(req, env, ctx, url, path, st);
    const s = await getSession(req, env, ctx);
    const ip = clientIp(req);

    if (path === '/api/eu' && method === 'GET') return await me(env, s, st);

    if (path === '/api/visitante' && method === 'POST') {
      if (!st.visitante) return fail('O acesso de visitante foi encerrado. Crie sua conta ou entre.', 403);
      const a = accessOf(s, st);
      if (s && a.ok) return await me(env, s, st);
      const r = await hit(env, 'vis:' + ip, 60, 3600000); if (!r.ok) throw tooMany(r);
      if (s) await env.DB.prepare('DELETE FROM sessions WHERE id = ?1').bind(s.id).run();
      const { cookie } = await createSession(env, req, 'visitante', null);
      return await meAfter(env, req, cookie, st);
    }

    if (path === '/api/entrar' && method === 'POST') {
      const b = await readJson(req);
      const email = normEmail(b.email);
      let r = await hit(env, 'loginip:' + ip, 60, 900000); if (!r.ok) throw tooMany(r);
      r = await hit(env, 'login:' + email, 10, 900000); if (!r.ok) throw tooMany(r);
      const u = validEmail(email) ? await env.DB.prepare('SELECT * FROM users WHERE email = ?1').bind(email).first() : null;
      const chk = await checkPassword(b.senha, u && u.pass, env);
      if (!u || !chk.ok) {
        if (u) await audit(env, req, null, 'senha errada', u.id, email);
        return fail('E-mail ou senha incorretos.', 401);
      }
      if (u.status !== 'ativo') return fail('Sua conta está bloqueada. Fale com o administrador.', 403);
      if (s) await env.DB.prepare('DELETE FROM sessions WHERE id = ?1').bind(s.id).run();
      const { cookie } = await createSession(env, req, 'user', u.id);
      await enforceDeviceLimit(env, req, u, st.max_aparelhos);
      await env.DB.prepare('UPDATE users SET last_login_at = ?1, last_seen_at = ?1 WHERE id = ?2').bind(Date.now(), u.id).run();
      if (chk.rehash) await env.DB.prepare('UPDATE users SET pass = ?1 WHERE id = ?2').bind(await hashPassword(b.senha, env), u.id).run();
      await audit(env, req, u, 'entrou', u.id, null);
      return await meAfter(env, req, cookie, st);
    }

    if (path === '/api/cadastro' && method === 'POST') {
      if (!st.cadastro) return fail('O cadastro de novas contas está fechado no momento.', 403);
      const b = await readJson(req);
      const r = await hit(env, 'cad:' + ip, 30, 3600000); if (!r.ok) throw tooMany(r);
      const email = normEmail(b.email);
      if (!validEmail(email)) return fail('Digite um e-mail válido.');
      const p = readProfile(b, st, false);
      const pp = passwordProblem(b.senha); if (pp) return fail(pp);
      if (b.codigo && String(b.codigo).trim()) await checkCode(env, b.codigo, email, null);
      const exists = await env.DB.prepare('SELECT id FROM users WHERE email = ?1').bind(email).first();
      if (exists) return fail('Já existe uma conta com este e-mail. Use Entrar ou Esqueci a senha.', 409);
      const t = Date.now();
      const ins = await env.DB.prepare('INSERT INTO users (email, name, crm, crm_uf, whatsapp, pass, created_at, last_login_at, last_seen_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7, ?7)')
        .bind(email, p.name, p.crm, p.crm_uf, p.whatsapp, await hashPassword(b.senha, env), t).run();
      const user = { id: ins.meta.last_row_id, email, name: p.name };
      await audit(env, req, user, 'criou a conta', user.id, [p.crm ? 'CRM ' + p.crm + '/' + p.crm_uf : '', s && s.kind === 'visitante' ? 'vinha como visitante' : ''].filter(Boolean).join('; '));
      let codeMsg = null;
      if (b.codigo && String(b.codigo).trim()) { try { await redeem(env, req, user, b.codigo); } catch (e) { codeMsg = e.message; } }
      if (s) await env.DB.prepare('DELETE FROM sessions WHERE id = ?1').bind(s.id).run();
      const { cookie } = await createSession(env, req, 'user', user.id);
      const res = await meAfter(env, req, cookie, st);
      if (!codeMsg) return res;
      const j = await res.json(); j.aviso = codeMsg;
      return json(j, 200, { 'Set-Cookie': cookie });
    }

    if (path === '/api/sair' && method === 'POST') {
      if (s) await env.DB.prepare('DELETE FROM sessions WHERE id = ?1').bind(s.id).run();
      return json({ ok: true }, 200, { 'Set-Cookie': clearCookie() });
    }

    if (path === '/api/resgatar' && method === 'POST') {
      if (!s || !s.user) return fail('Entre na sua conta (ou crie uma) para usar o código.', 401);
      const b = await readJson(req);
      const r = await hit(env, 'code:' + s.user.id, 12, 3600000); if (!r.ok) throw tooMany(r);
      const r2 = await hit(env, 'codeip:' + ip, 30, 3600000); if (!r2.ok) throw tooMany(r2);
      await redeem(env, req, s.user, b.codigo);
      return await me(env, await getSession(req, env), st);
    }

    if (path === '/api/conta' && method === 'POST') {
      if (!s || !s.user) return fail('Entre na sua conta.', 401);
      const b = await readJson(req);
      const p = readProfile(Object.assign({ nome: s.user.name, crm: s.user.crm, uf: s.user.crm_uf, whatsapp: s.user.whatsapp }, b), st, false);
      await env.DB.prepare('UPDATE users SET name = ?1, crm = ?2, crm_uf = ?3, whatsapp = ?4 WHERE id = ?5').bind(p.name, p.crm, p.crm_uf, p.whatsapp, s.user.id).run();
      return await me(env, await getSession(req, env), st);
    }

    if (path === '/api/senha/trocar' && method === 'POST') {
      if (!s || !s.user) return fail('Entre na sua conta.', 401);
      const b = await readJson(req);
      const r = await hit(env, 'pw:' + s.user.id, 10, 3600000); if (!r.ok) throw tooMany(r);
      const u = await env.DB.prepare('SELECT pass FROM users WHERE id = ?1').bind(s.user.id).first();
      if (!(await checkPassword(b.atual, u && u.pass, env)).ok) return fail('A senha atual não confere.', 401);
      const pp = passwordProblem(b.nova); if (pp) return fail(pp);
      await env.DB.batch([
        env.DB.prepare('UPDATE users SET pass = ?1 WHERE id = ?2').bind(await hashPassword(b.nova, env), s.user.id),
        env.DB.prepare('DELETE FROM sessions WHERE user_id = ?1 AND id != ?2').bind(s.user.id, s.id)
      ]);
      await audit(env, req, s.user, 'trocou a senha', s.user.id, null);
      return json({ ok: true });
    }

    if (path === '/api/senha/esqueci' && method === 'POST') {
      const b = await readJson(req);
      const email = normEmail(b.email);
      if (!(env.RESEND_API_KEY && env.EMAIL_FROM)) return json({ ok: true, email: false, contato: st.contato_whatsapp || '' });
      let r = await hit(env, 'forgotip:' + ip, 6, 3600000); if (!r.ok) throw tooMany(r);
      r = await hit(env, 'forgot:' + email, 3, 3600000); if (!r.ok) throw tooMany(r);
      const u = validEmail(email) ? await env.DB.prepare("SELECT id, name, email FROM users WHERE email = ?1 AND status = 'ativo'").bind(email).first() : null;
      if (u) {
        const token = await createReset(env, u.id, 2);
        const ok = await sendMail(env, u.email, 'Nova senha das calculadoras',
          `Olá, ${u.name.split(' ')[0]}.\n\nPara criar uma nova senha, abra o link abaixo (vale por 2 horas):\n${resetUrl(url, token)}\n\nSe não foi você que pediu, ignore este e-mail.\n\nDr. Bruno Michels`);
        await audit(env, req, null, ok ? 'pediu nova senha (e-mail enviado)' : 'pediu nova senha (falha no e-mail)', u.id, null);
      }
      return json({ ok: true, email: true });
    }

    if ((path === '/api/senha/verificar' || path === '/api/senha/redefinir') && method === 'POST') {
      const b = await readJson(req);
      const r = await hit(env, 'reset:' + ip, 20, 3600000); if (!r.ok) throw tooMany(r);
      const tk = String(b.token || '');
      const row = tk.length > 20 ? await env.DB.prepare('SELECT r.id, r.user_id, r.expires_at, r.used, u.email, u.name, u.status FROM resets r JOIN users u ON u.id = r.user_id WHERE r.id = ?1').bind(await sha256hex(tk)).first() : null;
      if (!row || row.used || row.expires_at < Date.now()) return fail('Este link não vale mais. Peça um novo.', 410);
      if (path === '/api/senha/verificar') return json({ ok: true, email: row.email, nome: row.name });
      const pp = passwordProblem(b.senha); if (pp) return fail(pp);
      await env.DB.batch([
        env.DB.prepare('UPDATE users SET pass = ?1 WHERE id = ?2').bind(await hashPassword(b.senha, env), row.user_id),
        env.DB.prepare('UPDATE resets SET used = 1 WHERE user_id = ?1').bind(row.user_id),
        env.DB.prepare('DELETE FROM sessions WHERE user_id = ?1').bind(row.user_id)
      ]);
      await audit(env, req, { id: row.user_id, name: row.name }, 'criou nova senha pelo link', row.user_id, null);
      if (row.status !== 'ativo') return fail('Senha alterada, mas a conta está bloqueada. Fale com o administrador.', 403);
      if (s) await env.DB.prepare('DELETE FROM sessions WHERE id = ?1').bind(s.id).run();
      const { cookie } = await createSession(env, req, 'user', row.user_id);
      return await meAfter(env, req, cookie, st);
    }

    if (path === '/api/configurar' && method === 'POST') {
      const codigoCfg = await codigoConfiguracao(env.ADMIN_SETUP_CODE, env.DB, 'settings');
      if (!codigoCfg) return fail('Falta o código de configuração (segredo ADMIN_SETUP_CODE ou linha codigo_configuracao no banco).', 403);
      if (!(await needsSetup(env))) return fail('O administrador já foi criado. Use Entrar.', 409);
      const r = await hit(env, 'setup:' + ip, 8, 3600000); if (!r.ok) throw tooMany(r);
      const b = await readJson(req);
      const a = te.encode(String(b.codigo || '')), c = te.encode(codigoCfg);
      if (a.length !== c.length || !safeEqual(a, c)) return fail('Código de configuração incorreto.', 401);
      const email = normEmail(b.email);
      if (!validEmail(email)) return fail('Digite um e-mail válido.');
      const p = readProfile(b, Object.assign({}, st, { crm_obrigatorio: false }), true);
      const pp = passwordProblem(b.senha); if (pp) return fail(pp);
      const t = Date.now(), hash = await hashPassword(b.senha, env);
      const ex = await env.DB.prepare('SELECT id FROM users WHERE email = ?1').bind(email).first();
      let id;
      if (ex) { await env.DB.prepare("UPDATE users SET role = 'admin', status = 'ativo', pass = ?1, name = ?2 WHERE id = ?3").bind(hash, p.name, ex.id).run(); id = ex.id; }
      else id = (await env.DB.prepare("INSERT INTO users (email, name, crm, crm_uf, whatsapp, pass, role, created_at, last_login_at, last_seen_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'admin', ?7, ?7, ?7)")
        .bind(email, p.name, p.crm, p.crm_uf, p.whatsapp, hash, t).run()).meta.last_row_id;
      adminExists = true;
      await apagarCodigoConfiguracao(env.DB, 'settings');
      await audit(env, req, { id, name: p.name }, 'criou o administrador', id, null);
      if (s) await env.DB.prepare('DELETE FROM sessions WHERE id = ?1').bind(s.id).run();
      const { cookie } = await createSession(env, req, 'user', id);
      return await meAfter(env, req, cookie, st);
    }

    return fail('Endereço não encontrado.', 404);
  } catch (e) {
    if (e instanceof HttpError) return fail(e.message, e.status);
    console.error('api', path, e && e.stack || e);
    return fail('Erro no servidor. Tente de novo em instantes.', 500);
  }
}

export { redeem, checkCode, resetUrl, DAY };
