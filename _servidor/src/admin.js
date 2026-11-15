/* API do painel de administração (só para contas de administrador) */
import { json, fail, readJson, HttpError, normEmail, validEmail, clean, onlyDigits, UFS, endOfDayBR, newCode, normCode, showCode, DAY } from './util.js';
import { getSettings, saveSettings, audit } from './db.js';
import { getSession, grant, describeGrant } from './auth.js';
import { publicConfig, createReset, resetUrl } from './api.js';

const USER_FIELDS = 'id, email, name, crm, crm_uf, whatsapp, role, status, access_until, lifetime, plan, notes, created_at, last_login_at, last_seen_at';
const fmtDate = ms => ms ? new Date(ms).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '';
const fmtDateTime = ms => ms ? new Date(ms).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '';

function userFilter(f, t) {
  switch (f) {
    case 'com_acesso': return [`(role = 'admin' OR lifetime = 1 OR access_until > ?)`, [t]];
    case 'sem_acesso': return [`(role != 'admin' AND lifetime = 0 AND (access_until IS NULL OR access_until <= ?))`, [t]];
    case 'expirando': return [`(lifetime = 0 AND role != 'admin' AND access_until > ? AND access_until <= ?)`, [t, t + 7 * DAY]];
    case 'vitalicios': return [`lifetime = 1`, []];
    case 'bloqueados': return [`status = 'bloqueado'`, []];
    case 'admins': return [`role = 'admin'`, []];
    default: return ['1 = 1', []];
  }
}

export async function adminApi(req, env, ctx, url, path, st) {
  const s = await getSession(req, env, ctx);
  if (!s || !s.user) return fail('Entre com sua conta de administrador.', 401);
  if (s.user.role !== 'admin' || s.user.status !== 'ativo') return fail('Esta conta não é de administrador.', 403);
  const me = s.user, t = Date.now(), m = req.method, q = url.searchParams;
  const sub = path.slice('/api/admin'.length) || '/';
  const body = m === 'POST' ? await readJson(req) : null;
  const getUser = async id => {
    const u = await env.DB.prepare(`SELECT ${USER_FIELDS} FROM users WHERE id = ?1`).bind(Number(id) || 0).first();
    if (!u) throw new HttpError(404, 'Usuário não encontrado.');
    return u;
  };

  /* ---------- resumo ---------- */
  if (sub === '/resumo' && m === 'GET') {
    const [u, v, c, novos, venc] = await env.DB.batch([
      env.DB.prepare(`SELECT COUNT(*) AS total,
        SUM(CASE WHEN role = 'admin' OR lifetime = 1 OR access_until > ?1 THEN 1 ELSE 0 END) AS ativos,
        SUM(CASE WHEN lifetime = 1 THEN 1 ELSE 0 END) AS vitalicios,
        SUM(CASE WHEN lifetime = 0 AND role != 'admin' AND access_until > ?1 AND access_until <= ?2 THEN 1 ELSE 0 END) AS expirando,
        SUM(CASE WHEN created_at > ?3 THEN 1 ELSE 0 END) AS novos7,
        SUM(CASE WHEN last_seen_at > ?4 THEN 1 ELSE 0 END) AS ativos24,
        SUM(CASE WHEN status = 'bloqueado' THEN 1 ELSE 0 END) AS bloqueados FROM users`).bind(t, t + 7 * DAY, t - 7 * DAY, t - DAY),
      env.DB.prepare(`SELECT SUM(CASE WHEN last_seen_at > ?1 THEN 1 ELSE 0 END) AS v24, SUM(CASE WHEN last_seen_at > ?2 THEN 1 ELSE 0 END) AS v7 FROM sessions WHERE kind = 'visitante'`).bind(t - DAY, t - 7 * DAY),
      env.DB.prepare(`SELECT COUNT(*) AS ativos FROM codes WHERE revoked = 0 AND uses < max_uses AND (valid_until IS NULL OR valid_until > ?1) AND NOT (mode = 'data' AND until < ?1)`).bind(t),
      env.DB.prepare(`SELECT ${USER_FIELDS} FROM users ORDER BY created_at DESC LIMIT 6`),
      env.DB.prepare(`SELECT ${USER_FIELDS} FROM users WHERE lifetime = 0 AND role != 'admin' AND access_until > ?1 ORDER BY access_until ASC LIMIT 6`).bind(t)
    ]);
    return json({ ok: true, usuarios: u.results[0], visitantes: v.results[0], codigos: c.results[0], novos: novos.results, vencendo: venc.results, config: publicConfig(st, env), agora: t });
  }

  /* ---------- usuários ---------- */
  if ((sub === '/usuarios' || sub === '/usuarios.csv') && m === 'GET') {
    const [w, args] = userFilter(q.get('f'), t);
    const term = clean(q.get('q'), 80).toLowerCase();
    let where = w; const params = [...args];
    if (term) {
      const like = '%' + term.replace(/[%_]/g, '') + '%', dig = onlyDigits(term);
      where += ' AND (LOWER(name) LIKE ? OR LOWER(email) LIKE ?' + (dig ? ' OR crm LIKE ? OR whatsapp LIKE ?' : '') + ')';
      params.push(like, like); if (dig) params.push('%' + dig + '%', '%' + dig + '%');
    }
    const csv = sub === '/usuarios.csv';
    const off = Math.max(0, Number(q.get('off')) || 0), lim = csv ? 5000 : 100;
    const rows = (await env.DB.prepare(`SELECT ${USER_FIELDS}, (SELECT COUNT(*) FROM sessions s WHERE s.user_id = users.id) AS aparelhos FROM users WHERE ${where} ORDER BY created_at DESC LIMIT ${lim} OFFSET ${off}`).bind(...params).all()).results || [];
    if (csv) {
      const esc = v => { const x = String(v == null ? '' : v); return /[;"\n]/.test(x) ? '"' + x.replace(/"/g, '""') + '"' : x; };
      const lines = [['Nome', 'E-mail', 'CRM', 'UF', 'WhatsApp', 'Tipo', 'Situação', 'Acesso até', 'Vitalício', 'Origem', 'Cadastro', 'Último acesso', 'Observações'].join(';')];
      for (const r of rows) lines.push([r.name, r.email, r.crm, r.crm_uf, r.whatsapp, r.role === 'admin' ? 'administrador' : 'usuário', r.status, fmtDate(r.access_until), r.lifetime ? 'sim' : 'não', r.plan, fmtDateTime(r.created_at), fmtDateTime(r.last_seen_at), r.notes].map(esc).join(';'));
      await audit(env, req, me, 'exportou usuários', null, rows.length + ' linhas');
      return new Response('﻿' + lines.join('\r\n'), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="usuarios-${new Date().toISOString().slice(0, 10)}.csv"`, 'Cache-Control': 'no-store' } });
    }
    const tot = await env.DB.prepare(`SELECT COUNT(*) AS n FROM users WHERE ${where}`).bind(...params).first();
    return json({ ok: true, usuarios: rows, total: tot ? tot.n : rows.length, agora: t });
  }

  if (sub === '/usuario' && m === 'GET') {
    const u = await getUser(q.get('id'));
    const [ses, gr, rd, au] = await env.DB.batch([
      env.DB.prepare('SELECT substr(id, 1, 10) AS id, kind, created_at, last_seen_at, expires_at, place, ua FROM sessions WHERE user_id = ?1 ORDER BY last_seen_at DESC').bind(u.id),
      env.DB.prepare('SELECT g.*, b.name AS by_name FROM grants g LEFT JOIN users b ON b.id = g.by_user WHERE g.user_id = ?1 ORDER BY g.at DESC LIMIT 60').bind(u.id),
      env.DB.prepare('SELECT r.code, r.at, c.label, c.mode, c.days, c.until FROM redemptions r LEFT JOIN codes c ON c.code = r.code WHERE r.user_id = ?1 ORDER BY r.at DESC').bind(u.id),
      env.DB.prepare('SELECT at, actor, action, detail, place FROM audit WHERE target_id = ?1 ORDER BY id DESC LIMIT 60').bind(u.id)
    ]);
    return json({ ok: true, usuario: u, sessoes: ses.results, concessoes: gr.results, codigos: rd.results.map(r => Object.assign(r, { code: showCode(r.code) })), registro: au.results, agora: t });
  }

  if (sub === '/usuario/acesso' && m === 'POST') {
    const u = await getUser(body.id);
    const g = { mode: body.mode };
    if (g.mode === 'dias') { g.days = Math.round(Number(body.days)); if (!(g.days >= 1 && g.days <= 3650)) return fail('Número de dias inválido.'); }
    if (g.mode === 'data') { g.until = endOfDayBR(body.until); if (!(g.until > t)) return fail('Escolha uma data futura.'); }
    if (g.mode === 'remover' && u.id === me.id) return fail('Você não pode retirar o próprio acesso.');
    if (!['dias', 'data', 'vitalicio', 'remover'].includes(g.mode)) return fail('Tipo de acesso inválido.');
    // pelo painel, "até a data" define a data exata (e tira o vitalício); "remover" zera tudo
    const r = await grant(env, req, u.id, g, { source: 'admin', detail: clean(body.nota, 200) || null, by: me.id, exact: true });
    await audit(env, req, me, 'alterou acesso', u.id, describeGrant(g) + (body.nota ? ' (' + clean(body.nota, 200) + ')' : ''));
    return json({ ok: true, acesso: r });
  }

  if (sub === '/usuario/editar' && m === 'POST') {
    const u = await getUser(body.id);
    const name = body.nome !== undefined ? clean(body.nome, 100) : u.name;
    if (name.length < 3) return fail('Nome muito curto.');
    let email = body.email !== undefined ? normEmail(body.email) : u.email;
    if (!validEmail(email)) return fail('E-mail inválido.');
    if (email !== u.email.toLowerCase()) { const ex = await env.DB.prepare('SELECT id FROM users WHERE email = ?1 AND id != ?2').bind(email, u.id).first(); if (ex) return fail('Já existe outra conta com este e-mail.'); }
    const crm = body.crm !== undefined ? onlyDigits(body.crm).slice(0, 8) || null : u.crm;
    const uf = body.uf !== undefined ? (UFS.includes(String(body.uf).toUpperCase()) ? String(body.uf).toUpperCase() : null) : u.crm_uf;
    let w = body.whatsapp !== undefined ? onlyDigits(body.whatsapp) : u.whatsapp || '';
    if (w && (w.length === 10 || w.length === 11)) w = '55' + w;
    const notes = body.notas !== undefined ? String(body.notas || '').slice(0, 2000) : u.notes;
    await env.DB.prepare('UPDATE users SET name = ?1, email = ?2, crm = ?3, crm_uf = ?4, whatsapp = ?5, notes = ?6 WHERE id = ?7').bind(name, email, crm, crm ? uf : null, w || null, notes, u.id).run();
    await audit(env, req, me, body.notas !== undefined && Object.keys(body).length <= 2 ? 'editou observações' : 'editou dados', u.id, null);
    return json({ ok: true });
  }

  if (sub === '/usuario/status' && m === 'POST') {
    const u = await getUser(body.id);
    const status = body.status === 'bloqueado' ? 'bloqueado' : 'ativo';
    if (u.id === me.id && status === 'bloqueado') return fail('Você não pode bloquear a própria conta.');
    const stmts = [env.DB.prepare('UPDATE users SET status = ?1 WHERE id = ?2').bind(status, u.id)];
    if (status === 'bloqueado') stmts.push(env.DB.prepare('DELETE FROM sessions WHERE user_id = ?1').bind(u.id));
    await env.DB.batch(stmts);
    await audit(env, req, me, status === 'bloqueado' ? 'bloqueou a conta' : 'desbloqueou a conta', u.id, null);
    return json({ ok: true });
  }

  if (sub === '/usuario/papel' && m === 'POST') {
    const u = await getUser(body.id);
    const role = body.role === 'admin' ? 'admin' : 'user';
    if (u.id === me.id && role !== 'admin') return fail('Você não pode tirar o próprio acesso de administrador.');
    await env.DB.prepare('UPDATE users SET role = ?1 WHERE id = ?2').bind(role, u.id).run();
    await audit(env, req, me, role === 'admin' ? 'tornou administrador' : 'removeu administrador', u.id, null);
    return json({ ok: true });
  }

  if (sub === '/usuario/sessoes' && m === 'POST') {
    const u = await getUser(body.id);
    const r = u.id === me.id
      ? await env.DB.prepare('DELETE FROM sessions WHERE user_id = ?1 AND id != ?2').bind(u.id, s.id).run()
      : await env.DB.prepare('DELETE FROM sessions WHERE user_id = ?1').bind(u.id).run();
    await audit(env, req, me, 'encerrou sessões', u.id, (r.meta.changes || 0) + ' aparelho(s)');
    return json({ ok: true, encerradas: r.meta.changes || 0 });
  }

  if (sub === '/usuario/senha' && m === 'POST') {
    const u = await getUser(body.id);
    const token = await createReset(env, u.id, 48);
    await audit(env, req, me, 'gerou link de nova senha', u.id, null);
    return json({ ok: true, link: resetUrl(url, token), validade: '48 horas' });
  }

  if (sub === '/usuario/excluir' && m === 'POST') {
    const u = await getUser(body.id);
    if (u.id === me.id) return fail('Você não pode excluir a própria conta.');
    if (normEmail(body.confirmar) !== u.email.toLowerCase()) return fail('Para excluir, digite o e-mail da conta.');
    await env.DB.batch([
      env.DB.prepare('DELETE FROM sessions WHERE user_id = ?1').bind(u.id),
      env.DB.prepare('DELETE FROM resets WHERE user_id = ?1').bind(u.id),
      env.DB.prepare('DELETE FROM grants WHERE user_id = ?1').bind(u.id),
      env.DB.prepare('DELETE FROM subscriptions WHERE user_id = ?1').bind(u.id),
      env.DB.prepare('DELETE FROM users WHERE id = ?1').bind(u.id)
    ]);
    await audit(env, req, me, 'excluiu a conta', null, u.name + ' <' + u.email + '>');
    return json({ ok: true });
  }

  /* ---------- códigos de acesso ---------- */
  if (sub === '/codigos' && m === 'GET') {
    const f = q.get('f') || 'ativos';
    const conds = {
      ativos: `revoked = 0 AND uses < max_uses AND (valid_until IS NULL OR valid_until > ?1) AND NOT (mode = 'data' AND until < ?1)`,
      usados: `uses >= max_uses AND revoked = 0`,
      encerrados: `(revoked = 1 OR (valid_until IS NOT NULL AND valid_until <= ?1) OR (mode = 'data' AND until < ?1)) AND uses < max_uses`,
      todos: `1 = 1 OR ?1`
    };
    const term = clean(q.get('q'), 60);
    let where = conds[f] || conds.ativos; const params = [t];
    if (term) { where = `(${where}) AND (code LIKE ?2 OR LOWER(IFNULL(label, '')) LIKE ?3 OR LOWER(IFNULL(for_email, '')) LIKE ?3)`; params.push('%' + normCode(term) + '%', '%' + term.toLowerCase() + '%'); }
    const rows = (await env.DB.prepare(`SELECT c.*, (SELECT json_group_array(json_object('id', u.id, 'nome', u.name, 'email', u.email, 'at', r.at)) FROM redemptions r JOIN users u ON u.id = r.user_id WHERE r.code = c.code) AS quem
      FROM codes c WHERE ${where} ORDER BY created_at DESC LIMIT 300`).bind(...params).all()).results || [];
    return json({ ok: true, codigos: rows.map(r => Object.assign(r, { code: showCode(r.code), quem: JSON.parse(r.quem || '[]').filter(x => x && x.id) })), agora: t });
  }

  if (sub === '/codigos' && m === 'POST') {
    const mode = body.mode;
    if (!['dias', 'data', 'vitalicio'].includes(mode)) return fail('Escolha o tipo de acesso.');
    const days = mode === 'dias' ? Math.round(Number(body.days)) : null;
    if (mode === 'dias' && !(days >= 1 && days <= 3650)) return fail('Número de dias inválido (1 a 3650).');
    const until = mode === 'data' ? endOfDayBR(body.until) : null;
    if (mode === 'data' && !(until > t)) return fail('Escolha uma data futura para o fim do acesso.');
    const qtd = Math.round(Number(body.qtd) || 1), usos = Math.round(Number(body.usos) || 1);
    if (!(qtd >= 1 && qtd <= 200)) return fail('Quantidade de códigos: de 1 a 200.');
    if (!(usos >= 1 && usos <= 1000)) return fail('Usos por código: de 1 a 1000.');
    const valid = body.validade ? endOfDayBR(body.validade) : null;
    if (body.validade && !(valid > t)) return fail('A validade para resgate precisa ser uma data futura.');
    const email = body.email ? normEmail(body.email) : null;
    if (email && !validEmail(email)) return fail('E-mail inválido.');
    const label = clean(body.rotulo, 80) || null;
    const made = [];
    for (let tries = 0; made.length < qtd && tries < 5; tries++) {
      const want = qtd - made.length, batch = [];
      for (let i = 0; i < want; i++) {
        const c = newCode();
        batch.push([c, env.DB.prepare('INSERT OR IGNORE INTO codes (code, label, mode, days, until, max_uses, uses, valid_until, for_email, revoked, created_by, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0, ?7, ?8, 0, ?9, ?10)')
          .bind(c, label, mode, days, until, usos, valid, email, me.id, t)]);
      }
      const res = await env.DB.batch(batch.map(b => b[1]));
      res.forEach((r, i) => { if (r.meta && r.meta.changes) made.push(batch[i][0]); });
    }
    await audit(env, req, me, 'gerou códigos', null, made.length + ' código(s), ' + describeGrant({ mode, days, until }) + (usos > 1 ? ', ' + usos + ' usos cada' : '') + (label ? ', ' + label : ''));
    return json({ ok: true, codigos: made.map(showCode) });
  }

  if (sub === '/codigo/revogar' && m === 'POST') {
    const code = normCode(body.code);
    const r = await env.DB.prepare('UPDATE codes SET revoked = ?1 WHERE code = ?2').bind(body.desfazer ? 0 : 1, code).run();
    if (!r.meta.changes) return fail('Código não encontrado.', 404);
    await audit(env, req, me, body.desfazer ? 'reativou código' : 'cancelou código', null, showCode(code));
    return json({ ok: true });
  }

  /* ---------- ajustes ---------- */
  if (sub === '/config' && m === 'GET') return json({ ok: true, config: await getSettings(env, true), email: !!(env.RESEND_API_KEY && env.EMAIL_FROM) });
  if (sub === '/config' && m === 'POST') {
    const before = await getSettings(env, true);
    const after = await saveSettings(env, body.config || {});
    const changed = Object.keys(after).filter(k => JSON.stringify(after[k]) !== JSON.stringify(before[k]));
    if (changed.length) await audit(env, req, me, 'alterou ajustes', null, changed.map(k => k + ': ' + (typeof after[k] === 'boolean' ? (after[k] ? 'ligado' : 'desligado') : String(after[k]).slice(0, 60))).join('; '));
    return json({ ok: true, config: after });
  }

  /* ---------- registro ---------- */
  if (sub === '/registro' && m === 'GET') {
    const off = Math.max(0, Number(q.get('off')) || 0);
    const term = clean(q.get('q'), 60).toLowerCase();
    let where = '1 = 1'; const params = [];
    if (term) { where = '(LOWER(a.action) LIKE ?1 OR LOWER(IFNULL(a.actor, \'\')) LIKE ?1 OR LOWER(IFNULL(a.detail, \'\')) LIKE ?1 OR LOWER(IFNULL(u.name, \'\')) LIKE ?1 OR LOWER(IFNULL(u.email, \'\')) LIKE ?1)'; params.push('%' + term + '%'); }
    const rows = (await env.DB.prepare(`SELECT a.id, a.at, a.actor, a.actor_id, a.action, a.target_id, a.detail, a.place, u.name AS target_name FROM audit a LEFT JOIN users u ON u.id = a.target_id WHERE ${where} ORDER BY a.id DESC LIMIT 100 OFFSET ${off}`).bind(...params).all()).results || [];
    return json({ ok: true, registro: rows });
  }

  return fail('Endereço não encontrado.', 404);
}
