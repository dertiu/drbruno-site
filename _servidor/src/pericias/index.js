/* /pericias: área privada do perito e da equipe. Totalmente separada das calculadoras:
   banco próprio (DBP), cookie próprio (só vale em /pericias), usuários e senhas próprios.
   - /pericias/conta/*   login, duas etapas, Minha conta e painel de usuários (JSON)
   - /pericias/perfil/   página Minha conta (e Usuários, para o administrador)
   - /pericias/api       repasse ao Apps Script da planilha, assinado com PERICIAS_CHAVE
   - /pericias/*         arquivos do app; o código só sai depois do login */
import { json, fail, readJson, HttpError, randomToken, sha256hex, safeEqual, clientIp, clientPlace, clientUa, clean, onlyDigits, validEmail, DAY } from '../util.js';
import { hashSenha, conferirSenha, problemaSenha } from '../comum/senha.js';
import { ensureSchemaP, getSettingsP, saveSettingsP, auditP, hitP } from './db.js';
import { newSecret, checkTotp, otpauthUri, newBackupCodes, normBackup } from './totp.js';
import { segredos, codigoConfiguracao, apagarCodigoConfiguracao } from '../comum/segredos.js';

const COOKIE = '__Secure-pericias';
const te = new TextEncoder();
const cfgSenha = async env => ({ pepper: (await segredos(env)).periciasPepper, iter: env.SENHA_ITERACOES });

// arquivos que qualquer um pode baixar: a casca da tela de entrada (sem dados nem lógica do app)
const PUBLICO = /^\/pericias\/(?:|index\.html|entrar\.js|entrar\.css|tema\.js|app\.css|logo-128\.webp|logo-192\.png|manifest\.webmanifest|eproc-atalho\.user\.js)$/;
// ações do app que só leem (não entram no registro, para não lotar)
const LEITURAS = new Set(['inicial', 'me', 'docs', 'modelos', 'historico', 'listar', 'agenda', 'atividade', 'discordCanais']);
const SO_PERITO = new Set(['gestao', 'modeloExcluir']);
// ações que não mudam o que os outros veem (não disparam atualização nos outros aparelhos)
const SEM_MUDANCA = new Set(['prefsSalvar', 'gestao', 'discordEnviar', 'discordRotina', 'carimbo']);

const CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'; object-src 'none'";
const HEADERS = {
  'Content-Security-Policy': CSP,
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'X-Robots-Tag': 'noindex, nofollow',
  'Strict-Transport-Security': 'max-age=31536000'
};
function secure(res, extra) {
  const r = new Response(res.body, res);
  for (const [k, v] of Object.entries(HEADERS)) r.headers.set(k, v);
  if (extra) for (const [k, v] of Object.entries(extra)) r.headers.set(k, v);
  return r;
}
const fmtDate = ms => new Date(ms).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
const tooMany = r => new HttpError(429, 'Muitas tentativas. Aguarde ' + Math.max(1, Math.ceil(r.retryIn / 60000)) + ' minuto(s) e tente de novo.');
const normLogin = s => String(s || '').trim().toLowerCase();
const validLogin = s => /^[a-z0-9][a-z0-9._@-]{2,59}$/.test(s);
const normChave = s => String(s || '').trim().toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, 40);

/* ---------- sessões ---------- */
function readCookie(req) {
  const c = req.headers.get('Cookie') || '';
  for (const part of c.split(/;\s*/)) { const i = part.indexOf('='); if (i > 0 && part.slice(0, i) === COOKIE) return part.slice(i + 1); }
  return '';
}
const cookieOf = (token, maxMs) => `${COOKIE}=${token}; Path=/pericias; Secure; HttpOnly; SameSite=Strict; Max-Age=${Math.floor(maxMs / 1000)}`;
const clearCookie = () => `${COOKIE}=; Path=/pericias; Secure; HttpOnly; SameSite=Strict; Max-Age=0`;

const USER = 'u.id, u.chave, u.login, u.nome, u.email, u.whatsapp, u.papel, u.admin, u.status, u.totp_on, u.created_at, u.last_login_at, u.last_seen_at, u.pass_changed_at';
async function getSession(req, env, ctx, st) {
  const token = readCookie(req);
  if (!token || token.length < 30 || token.length > 60) return null;
  const id = await sha256hex(token);
  const r = await env.DBP.prepare(`SELECT s.id AS sid, s.expires_at, s.max_at, s.last_seen_at AS s_seen, ${USER} FROM p_sessions s JOIN p_users u ON u.id = s.user_id WHERE s.id = ?1`).bind(id).first();
  if (!r) return null;
  const t = Date.now();
  if (r.expires_at < t || r.max_at < t || r.status !== 'ativo') {
    await env.DBP.prepare('DELETE FROM p_sessions WHERE id = ?1').bind(id).run();
    return null;
  }
  if (t - r.s_seen > 600000) {
    const p = env.DBP.batch([
      env.DBP.prepare('UPDATE p_sessions SET last_seen_at = ?1, expires_at = ?2, ip = ?3, place = ?4 WHERE id = ?5').bind(t, Math.min(r.max_at, t + st.sessao_dias * DAY), clientIp(req), clientPlace(req), id),
      env.DBP.prepare('UPDATE p_users SET last_seen_at = ?1 WHERE id = ?2').bind(t, r.id)
    ]).catch(() => { });
    if (ctx && ctx.waitUntil) ctx.waitUntil(p); else await p;
  }
  return { id, user: r };
}
async function createSession(env, req, user, st) {
  const token = randomToken(32), id = await sha256hex(token), t = Date.now();
  const max = t + st.sessao_max_dias * DAY;
  await env.DBP.prepare('INSERT INTO p_sessions (id, user_id, created_at, expires_at, max_at, last_seen_at, ip, place, ua) VALUES (?1, ?2, ?3, ?4, ?5, ?3, ?6, ?7, ?8)')
    .bind(id, user.id, t, Math.min(max, t + st.sessao_dias * DAY), max, clientIp(req), clientPlace(req), clientUa(req)).run();
  // limite de aparelhos: os mais antigos saem
  const rows = (await env.DBP.prepare('SELECT id FROM p_sessions WHERE user_id = ?1 ORDER BY last_seen_at DESC').bind(user.id).all()).results || [];
  const extra = rows.filter(x => x.id !== id).slice(Math.max(0, st.max_aparelhos - 1));
  if (extra.length) {
    await env.DBP.batch(extra.map(x => env.DBP.prepare('DELETE FROM p_sessions WHERE id = ?1').bind(x.id)));
    await auditP(env, req, user, 'aparelho antigo desconectado (limite)', user.id, extra.length + ' sessão(ões)');
  }
  await env.DBP.prepare('UPDATE p_users SET last_login_at = ?1, last_seen_at = ?1 WHERE id = ?2').bind(t, user.id).run();
  return cookieOf(token, max - t);
}
const pub = u => u && { chave: u.chave, login: u.login, nome: u.nome, email: u.email || '', whatsapp: u.whatsapp || '', papel: u.papel, admin: !!u.admin, duas_etapas: !!u.totp_on };

/* ---------- tickets: etapas curtas do login (código, convite, ativar duas etapas) ---------- */
async function newTicket(env, userId, kind, minutes, data) {
  const token = randomToken(24), t = Date.now();
  await env.DBP.batch([
    env.DBP.prepare('DELETE FROM p_tickets WHERE user_id = ?1 AND kind = ?2').bind(userId, kind),
    env.DBP.prepare('INSERT INTO p_tickets (id, user_id, kind, data, expires_at, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)').bind(await sha256hex(token), userId, kind, data || null, t + minutes * 60000, t)
  ]);
  return token;
}
async function getTicket(env, token, kinds) {
  const tk = String(token || '');
  if (tk.length < 20 || tk.length > 60) return null;
  const r = await env.DBP.prepare(`SELECT t.id AS tid, t.kind, t.data, t.expires_at, t.tries, t.used, ${USER}, u.pass, u.totp_secret, u.totp_last, u.backup FROM p_tickets t JOIN p_users u ON u.id = t.user_id WHERE t.id = ?1`).bind(await sha256hex(tk)).first();
  if (!r || r.used || r.expires_at < Date.now() || !kinds.includes(r.kind)) return null;
  return r;
}
const useTicket = (env, tid) => env.DBP.prepare('UPDATE p_tickets SET used = 1 WHERE id = ?1').bind(tid).run();

/* depois de senha certa: decide o próximo passo (código, cadastrar as duas etapas ou entrar direto) */
async function nextStep(env, req, u, st) {
  if (u.totp_on) {
    const ticket = await newTicket(env, u.id, '2fa', 5);
    return json({ ok: true, etapa: 'codigo', ticket, nome: u.nome });
  }
  if (st.exigir_2fa) {
    const secret = newSecret();
    const ticket = await newTicket(env, u.id, 'cadastro2fa', 20, secret);
    return json({ ok: true, etapa: 'cadastrar', ticket, nome: u.nome, segredo: secret, uri: otpauthUri(u.login, secret) });
  }
  const cookie = await createSession(env, req, u, st);
  await auditP(env, req, u, 'entrou', u.id, null);
  return json({ ok: true, etapa: 'pronto', usuario: pub(u) }, 200, { 'Set-Cookie': cookie });
}

async function backupHash(env, code) { return sha256hex((await segredos(env)).periciasPepper + '|' + normBackup(code)); }
async function makeBackup(env) {
  const codes = newBackupCodes();
  const hashes = [];
  for (const c of codes) hashes.push(await backupHash(env, c));
  return { codes, stored: JSON.stringify(hashes) };
}

/* confere código de 6 dígitos ou código de recuperação; grava o uso */
async function verifySecond(env, u, code, secret) {
  const k = await checkTotp(secret || u.totp_secret, code, secret ? null : u.totp_last);
  if (k != null) { await env.DBP.prepare('UPDATE p_users SET totp_last = ?1 WHERE id = ?2').bind(k, u.id).run(); return 'totp'; }
  if (!secret && u.backup && normBackup(code).length === 10) {
    const list = JSON.parse(u.backup || '[]'), h = await backupHash(env, code), i = list.indexOf(h);
    if (i >= 0) { list.splice(i, 1); await env.DBP.prepare('UPDATE p_users SET backup = ?1 WHERE id = ?2').bind(JSON.stringify(list), u.id).run(); return 'recuperacao:' + list.length; }
  }
  return null;
}

/* ---------- repasse ao Apps Script ---------- */
async function hmacHex(key, msg) {
  const k = await crypto.subtle.importKey('raw', te.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return [...new Uint8Array(await crypto.subtle.sign('HMAC', k, te.encode(msg)))].map(b => b.toString(16).padStart(2, '0')).join('');
}
async function assinado(env, user, acao) {
  const p = { u: user.chave, p: user.papel, a: acao, t: String(Date.now()), n: randomToken(12) };
  p.s = await hmacHex((await segredos(env)).periciasChave, [p.u, p.p, p.a, p.t, p.n].join('|'));
  return env.PERICIAS_GAS_URL + (env.PERICIAS_GAS_URL.includes('?') ? '&' : '?') + new URLSearchParams(p).toString();
}
async function chamarGas(target, body) {
  // o Apps Script responde com redirecionamento (302) para o endereço que entrega o resultado; segue à mão
  let r = await fetch(target, { method: 'POST', body, headers: { 'Content-Type': 'text/plain;charset=utf-8' }, redirect: 'manual' });
  for (let i = 0; i < 3 && r.status >= 300 && r.status < 400 && r.headers.get('Location'); i++) {
    r = await fetch(new URL(r.headers.get('Location'), target).toString(), { method: 'GET', redirect: 'manual' });
  }
  return r;
}
const marcar = (env, quem, acao, proc) => env.DBP.prepare('INSERT INTO p_sync (at, chave, nome, acao, proc) VALUES (?1, ?2, ?3, ?4, ?5)')
  .bind(Date.now(), quem ? quem.chave : null, quem ? quem.nome : 'Planilha', acao, proc || null).run();

async function proxy(req, env, ctx, url, s) {
  const acao = url.searchParams.get('acao') || '';
  if (!/^[a-zA-Z]{2,30}$/.test(acao) || acao === 'login' || acao === 'logout') return fail('Ação inválida.', 400);
  if (SO_PERITO.has(acao) && s.user.papel !== 'perito') return fail('Sem permissão.', 403);
  if (!env.PERICIAS_GAS_URL || !(await segredos(env)).periciasChave) return fail('Servidor da planilha não configurado: falta o segredo SEGREDO_SITE no Cloudflare.', 503);
  const len = Number(req.headers.get('Content-Length') || 0);
  if (len > 30 * 1024 * 1024) return fail('Arquivo grande demais.', 413);
  const leitura = LEITURAS.has(acao);
  const proc = (url.searchParams.get('proc') || '').replace(/\D/g, '').slice(0, 25);
  if (!leitura) ctx.waitUntil(auditP(env, req, s.user, 'app: ' + acao, s.user.id, proc || null));
  let r;
  try { r = await chamarGas(await assinado(env, s.user, acao), req.body); }
  catch (e) { return fail('A planilha não respondeu. Tente de novo em instantes.', 502); }
  if (!r.ok) return fail('A planilha respondeu com erro ' + r.status + '.', 502);
  const h = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
  if (leitura) return new Response(r.body, { status: 200, headers: h });
  // alteração: se deu certo, registra para os outros aparelhos atualizarem na hora
  const txt = await r.text();
  let ok = false; try { ok = JSON.parse(txt).ok === true; } catch (e) { }
  if (ok && !SEM_MUDANCA.has(acao)) await marcar(env, s.user, acao, proc);
  return new Response(txt, { status: 200, headers: h });
}

/* alterações feitas direto na planilha (fora do app): no máximo uma consulta por minuto ao Apps Script,
   para todos os aparelhos juntos. Se a planilha mudou sem passar pelo app, avisa os aparelhos. */
async function conferirPlanilha(env, user) {
  if (!env.PERICIAS_GAS_URL || !(await segredos(env)).periciasChave) return;
  const t = Date.now();
  const teste = env.PERICIAS_SYNC_TESTE === '1'; // só nos testes: confere a planilha a cada 2 s em vez de 60 s
  const r = await env.DBP.prepare("UPDATE p_settings SET value = ?1 WHERE key = 'carimbo_em' AND CAST(value AS INTEGER) < ?2").bind(String(t), t - (teste ? 2000 : 60000)).run();
  if (!r.meta.changes) {
    const ex = await env.DBP.prepare("SELECT value FROM p_settings WHERE key = 'carimbo_em'").first();
    if (ex) return; // outro aparelho conferiu há menos de 1 minuto
    await env.DBP.prepare("INSERT OR IGNORE INTO p_settings (key, value) VALUES ('carimbo_em', ?1)").bind(String(t)).run();
  }
  const res = await chamarGas(await assinado(env, user, 'carimbo'), JSON.stringify({ acao: 'carimbo' }));
  let j = null; try { j = await res.json(); } catch (e) { }
  if (!j || !j.ok || !Number(j.t)) return; // Apps Script ainda sem a função carimbo
  const ant = await env.DBP.prepare("SELECT value FROM p_settings WHERE key = 'carimbo_t'").first();
  await env.DBP.prepare("INSERT INTO p_settings (key, value) VALUES ('carimbo_t', ?1) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(String(j.t)).run();
  if (!ant || Number(j.t) <= Number(ant.value)) return;
  // mudança feita pelo app nos últimos 90 s explica a nova data da planilha
  const rec = await env.DBP.prepare('SELECT MAX(at) AS at FROM p_sync WHERE chave IS NOT NULL').first();
  if (rec && rec.at && Number(j.t) - rec.at < (teste ? 1500 : 90000)) return;
  await marcar(env, null, 'planilha', null);
}

/* ---------- API de conta e painel ---------- */
async function conta(req, env, ctx, url, st) {
  const path = url.pathname.replace(/^\/pericias\/conta\/?/, '').replace(/\/+$/, '');
  const m = req.method, ip = clientIp(req);
  if (m !== 'GET') { const o = req.headers.get('Origin'); if (o && o !== url.origin) return fail('Origem não permitida.', 403); }
  const s = await getSession(req, env, ctx, st);
  const body = m === 'POST' ? await readJson(req) : null;
  const users0 = async () => (await env.DBP.prepare('SELECT COUNT(*) AS n FROM p_users').first()).n;

  if (path === 'eu' && m === 'GET') {
    const out = { ok: true, logado: !!s, usuario: s ? pub(s.user) : null, config: { contato_whatsapp: st.contato_whatsapp, exigir_2fa: st.exigir_2fa, sessao_dias: st.sessao_dias, sessao_max_dias: st.sessao_max_dias } };
    if (!s) out.setup = !!(await codigoConfiguracao(env.PERICIAS_SETUP_CODE, env.DBP, 'p_settings')) && (await users0()) === 0;
    return json(out);
  }

  if (path === 'entrar' && m === 'POST') {
    const login = normLogin(body.login);
    let r = await hitP(env, 'ip:' + ip, 40, 900000); if (!r.ok) throw tooMany(r);
    r = await hitP(env, 'login:' + login, 8, 900000); if (!r.ok) throw tooMany(r);
    const cc = req.cf && req.cf.country;
    if (st.so_brasil && cc && cc !== 'BR') { await auditP(env, req, null, 'login recusado fora do Brasil', null, login + ' (' + cc + ')'); return fail('Acesso permitido só a partir do Brasil.', 403); }
    const u = validLogin(login) ? await env.DBP.prepare(`SELECT ${USER}, u.pass, u.totp_secret, u.totp_last, u.backup FROM p_users u WHERE u.login = ?1`).bind(login).first() : null;
    const chk = await conferirSenha(body.senha, u && u.pass, await cfgSenha(env));
    if (!u || !chk.ok) {
      if (u) await auditP(env, req, null, 'senha errada', u.id, login);
      return fail(u && !u.pass ? 'Esta conta ainda não tem senha. Use o link de convite que você recebeu.' : 'Usuário ou senha incorretos.', 401);
    }
    if (u.status !== 'ativo') { await auditP(env, req, u, 'tentou entrar com a conta bloqueada', u.id, null); return fail('Conta bloqueada. Fale com o administrador.', 403); }
    if (chk.rehash) await env.DBP.prepare('UPDATE p_users SET pass = ?1 WHERE id = ?2').bind(await hashSenha(body.senha, await cfgSenha(env)), u.id).run();
    return await nextStep(env, req, u, st);
  }

  if (path === 'entrar/codigo' && m === 'POST') {
    const r = await hitP(env, 'cod:' + ip, 30, 900000); if (!r.ok) throw tooMany(r);
    const tk = await getTicket(env, body.ticket, ['2fa', 'cadastro2fa']);
    if (!tk) return fail('O tempo para digitar o código acabou. Entre de novo.', 410);
    if (tk.status !== 'ativo') return fail('Conta bloqueada.', 403);
    await env.DBP.prepare('UPDATE p_tickets SET tries = tries + 1 WHERE id = ?1').bind(tk.tid).run();
    if (tk.tries >= 5) { await useTicket(env, tk.tid); return fail('Muitos códigos errados. Entre de novo.', 429); }
    const how = await verifySecond(env, tk, body.codigo, tk.kind === 'cadastro2fa' ? tk.data : null);
    if (!how) { await auditP(env, req, null, 'código de duas etapas errado', tk.id, null); return fail('Código incorreto. Confira o código atual no aplicativo autenticador.', 401); }
    await useTicket(env, tk.tid);
    let codes = null;
    if (tk.kind === 'cadastro2fa') {
      const b = await makeBackup(env); codes = b.codes;
      await env.DBP.prepare('UPDATE p_users SET totp_secret = ?1, totp_on = 1, totp_last = ?2, backup = ?3 WHERE id = ?4').bind(tk.data, Math.floor(Date.now() / 30000), b.stored, tk.id).run();
      await auditP(env, req, tk, 'ativou as duas etapas', tk.id, null);
    }
    const cookie = await createSession(env, req, tk, st);
    await auditP(env, req, tk, how.startsWith('recuperacao') ? 'entrou com código de recuperação' : 'entrou', tk.id, how.startsWith('recuperacao') ? 'restam ' + how.split(':')[1] : null);
    const u = await env.DBP.prepare(`SELECT ${USER} FROM p_users u WHERE u.id = ?1`).bind(tk.id).first();
    return json({ ok: true, etapa: 'pronto', usuario: pub(u), recuperacao: codes, restam: how.startsWith('recuperacao') ? Number(how.split(':')[1]) : undefined }, 200, { 'Set-Cookie': cookie });
  }

  if ((path === 'convite/verificar' || path === 'convite/definir') && m === 'POST') {
    const r = await hitP(env, 'conv:' + ip, 20, 3600000); if (!r.ok) throw tooMany(r);
    const tk = await getTicket(env, body.token, ['convite', 'senha']);
    if (!tk) return fail('Este link não vale mais. Peça um novo ao administrador.', 410);
    if (path === 'convite/verificar') return json({ ok: true, nome: tk.nome, login: tk.login, tipo: tk.kind });
    const pp = problemaSenha(body.senha); if (pp) return fail(pp);
    if (tk.status !== 'ativo') return fail('Conta bloqueada. Fale com o administrador.', 403);
    await env.DBP.batch([
      env.DBP.prepare('UPDATE p_users SET pass = ?1, pass_changed_at = ?2 WHERE id = ?3').bind(await hashSenha(body.senha, await cfgSenha(env)), Date.now(), tk.id),
      env.DBP.prepare('UPDATE p_tickets SET used = 1 WHERE user_id = ?1 AND kind IN (\'convite\', \'senha\')').bind(tk.id),
      env.DBP.prepare('DELETE FROM p_sessions WHERE user_id = ?1').bind(tk.id)
    ]);
    await auditP(env, req, tk, tk.kind === 'convite' ? 'criou a senha pelo convite' : 'criou nova senha pelo link', tk.id, null);
    const u = await env.DBP.prepare(`SELECT ${USER}, u.pass, u.totp_secret, u.totp_last, u.backup FROM p_users u WHERE u.id = ?1`).bind(tk.id).first();
    return await nextStep(env, req, u, st);
  }

  if (path === 'configurar' && m === 'POST') {
    const codigoCfg = await codigoConfiguracao(env.PERICIAS_SETUP_CODE, env.DBP, 'p_settings');
    if (!codigoCfg) return fail('Falta o código de configuração (segredo PERICIAS_SETUP_CODE ou linha codigo_configuracao no banco).', 403);
    if ((await users0()) > 0) return fail('O administrador já foi criado.', 409);
    const r = await hitP(env, 'setup:' + ip, 8, 3600000); if (!r.ok) throw tooMany(r);
    const a = te.encode(String(body.codigo || '')), c = te.encode(codigoCfg);
    if (a.length !== c.length || !safeEqual(a, c)) return fail('Código de configuração incorreto.', 401);
    const nome = clean(body.nome, 80), login = normLogin(body.login), chave = normChave(body.chave || login);
    if (nome.length < 2) return fail('Digite seu nome.');
    if (!validLogin(login)) return fail('Login inválido: use de 3 a 60 letras, números, ponto, hífen ou @.');
    if (chave.length < 2) return fail('Usuário da planilha inválido.');
    const pp = problemaSenha(body.senha); if (pp) return fail(pp);
    const t = Date.now();
    const id = (await env.DBP.prepare("INSERT INTO p_users (chave, login, nome, papel, admin, pass, created_at, pass_changed_at) VALUES (?1, ?2, ?3, 'perito', 1, ?4, ?5, ?5)")
      .bind(chave, login, nome, await hashSenha(body.senha, await cfgSenha(env)), t).run()).meta.last_row_id;
    await auditP(env, req, { id, nome }, 'criou o administrador', id, 'usuário da planilha: ' + chave);
    await apagarCodigoConfiguracao(env.DBP, 'p_settings');
    const u = await env.DBP.prepare(`SELECT ${USER}, u.pass, u.totp_secret, u.totp_last, u.backup FROM p_users u WHERE u.id = ?1`).bind(id).first();
    return await nextStep(env, req, u, st);
  }

  if (path === 'sair' && m === 'POST') {
    if (s) { await env.DBP.prepare('DELETE FROM p_sessions WHERE id = ?1').bind(s.id).run(); await auditP(env, req, s.user, 'saiu', s.user.id, null); }
    return json({ ok: true }, 200, { 'Set-Cookie': clearCookie() });
  }

  /* ----- daqui para baixo, só com login ----- */
  if (!s) return fail('Sessão expirada. Entre novamente.', 401);
  const me = s.user;

  if (path === 'equipe' && m === 'GET') {
    const rows = (await env.DBP.prepare("SELECT chave AS u, nome, papel FROM p_users WHERE status = 'ativo' ORDER BY nome").all()).results || [];
    return json({ ok: true, usuarios: rows });
  }

  /* sincronia: chamada leve a cada poucos segundos; não toca na planilha */
  if (path === 'sincronia' && m === 'POST') {
    const t = Date.now(), primeira = body.v == null, desde = Math.max(0, Number(body.v) || 0);
    if (body.pres) {
      const proc = String(body.ficha || '').replace(/\D/g, '').slice(0, 25) || null;
      await env.DBP.prepare('INSERT INTO p_presenca (chave, nome, proc, editando, at) VALUES (?1, ?2, ?3, ?4, ?5) ON CONFLICT(chave) DO UPDATE SET nome = excluded.nome, proc = excluded.proc, editando = excluded.editando, at = excluded.at')
        .bind(me.chave, me.nome, proc, body.editando ? 1 : 0, t).run();
    }
    const [mx, mud, pres] = await env.DBP.batch([
      env.DBP.prepare('SELECT IFNULL(MAX(v), 0) AS v FROM p_sync'),
      env.DBP.prepare('SELECT v, at, chave, nome, acao, proc FROM p_sync WHERE v > ?1 ORDER BY v LIMIT 40').bind(desde),
      env.DBP.prepare('SELECT chave, nome, proc, editando, at FROM p_presenca WHERE at > ?1 AND chave != ?2').bind(t - 35000, me.chave)
    ]);
    ctx.waitUntil(conferirPlanilha(env, me).catch(e => console.error('carimbo', e && e.message)));
    return json({ ok: true, v: mx.results[0].v, mudancas: primeira ? [] : mud.results, presenca: pres.results, agora: t });
  }

  if (path === 'perfil' && m === 'POST') {
    const nome = body.nome !== undefined ? clean(body.nome, 80) : me.nome;
    if (nome.length < 2) return fail('Nome muito curto.');
    const login = body.login !== undefined ? normLogin(body.login) : me.login;
    if (!validLogin(login)) return fail('Login inválido: use de 3 a 60 letras, números, ponto, hífen ou @.');
    if (login !== me.login.toLowerCase()) {
      const ex = await env.DBP.prepare('SELECT id FROM p_users WHERE login = ?1 AND id != ?2').bind(login, me.id).first();
      if (ex) return fail('Este login já está em uso.');
    }
    const email = body.email !== undefined ? String(body.email || '').trim().toLowerCase() : me.email;
    if (email && !validEmail(email)) return fail('E-mail inválido.');
    let w = body.whatsapp !== undefined ? onlyDigits(body.whatsapp) : me.whatsapp || '';
    if (w && (w.length === 10 || w.length === 11)) w = '55' + w;
    await env.DBP.prepare('UPDATE p_users SET nome = ?1, login = ?2, email = ?3, whatsapp = ?4 WHERE id = ?5').bind(nome, login, email || null, w || null, me.id).run();
    const mudou = [nome !== me.nome && 'nome', login !== me.login.toLowerCase() && 'login (' + me.login + ' para ' + login + ')', email !== (me.email || '') && 'e-mail', w !== (me.whatsapp || '') && 'WhatsApp'].filter(Boolean);
    if (mudou.length) await auditP(env, req, me, 'alterou o perfil', me.id, mudou.join(', '));
    const u = await env.DBP.prepare(`SELECT ${USER} FROM p_users u WHERE u.id = ?1`).bind(me.id).first();
    return json({ ok: true, usuario: pub(u) });
  }

  if (path === 'senha' && m === 'POST') {
    const r = await hitP(env, 'pw:' + me.id, 10, 3600000); if (!r.ok) throw tooMany(r);
    const u = await env.DBP.prepare('SELECT pass FROM p_users WHERE id = ?1').bind(me.id).first();
    if (!(await conferirSenha(body.atual, u && u.pass, await cfgSenha(env))).ok) return fail('A senha atual não confere.', 401);
    const pp = problemaSenha(body.nova); if (pp) return fail(pp);
    if (body.nova === body.atual) return fail('A nova senha precisa ser diferente da atual.');
    await env.DBP.batch([
      env.DBP.prepare('UPDATE p_users SET pass = ?1, pass_changed_at = ?2 WHERE id = ?3').bind(await hashSenha(body.nova, await cfgSenha(env)), Date.now(), me.id),
      env.DBP.prepare('DELETE FROM p_sessions WHERE user_id = ?1 AND id != ?2').bind(me.id, s.id)
    ]);
    await auditP(env, req, me, 'trocou a senha', me.id, null);
    return json({ ok: true });
  }

  if (path === '2fa/iniciar' && m === 'POST') {
    const secret = newSecret();
    const ticket = await newTicket(env, me.id, '2fa_novo', 15, secret);
    return json({ ok: true, ticket, segredo: secret, uri: otpauthUri(me.login, secret) });
  }
  if (path === '2fa/ativar' && m === 'POST') {
    const tk = await getTicket(env, body.ticket, ['2fa_novo']);
    if (!tk || tk.id !== me.id) return fail('O tempo acabou. Comece de novo.', 410);
    await env.DBP.prepare('UPDATE p_tickets SET tries = tries + 1 WHERE id = ?1').bind(tk.tid).run();
    if (tk.tries >= 5) { await useTicket(env, tk.tid); return fail('Muitos códigos errados. Comece de novo.', 429); }
    if (!(await verifySecond(env, tk, body.codigo, tk.data))) return fail('Código incorreto. Confira o código atual no aplicativo.', 401);
    await useTicket(env, tk.tid);
    const b = await makeBackup(env);
    await env.DBP.prepare('UPDATE p_users SET totp_secret = ?1, totp_on = 1, totp_last = ?2, backup = ?3 WHERE id = ?4').bind(tk.data, Math.floor(Date.now() / 30000), b.stored, me.id).run();
    await auditP(env, req, me, me.totp_on ? 'trocou o aparelho das duas etapas' : 'ativou as duas etapas', me.id, null);
    return json({ ok: true, recuperacao: b.codes });
  }
  if (path === '2fa/recuperacao' && m === 'POST') {
    const u = await env.DBP.prepare('SELECT id, totp_secret, totp_last, backup FROM p_users WHERE id = ?1').bind(me.id).first();
    if (!me.totp_on) return fail('Ative as duas etapas primeiro.');
    const r = await hitP(env, 'rec:' + me.id, 10, 3600000); if (!r.ok) throw tooMany(r);
    if (!(await checkTotp(u.totp_secret, body.codigo, null))) return fail('Código incorreto.', 401);
    const b = await makeBackup(env);
    await env.DBP.prepare('UPDATE p_users SET backup = ?1 WHERE id = ?2').bind(b.stored, me.id).run();
    await auditP(env, req, me, 'gerou novos códigos de recuperação', me.id, null);
    return json({ ok: true, recuperacao: b.codes });
  }
  if (path === '2fa/desativar' && m === 'POST') {
    if (st.exigir_2fa) return fail('As duas etapas são obrigatórias para todos. O administrador pode mudar isso nos ajustes.', 403);
    const u = await env.DBP.prepare('SELECT pass FROM p_users WHERE id = ?1').bind(me.id).first();
    if (!(await conferirSenha(body.senha, u && u.pass, await cfgSenha(env))).ok) return fail('Senha incorreta.', 401);
    await env.DBP.prepare('UPDATE p_users SET totp_secret = NULL, totp_on = 0, totp_last = NULL, backup = NULL WHERE id = ?1').bind(me.id).run();
    await auditP(env, req, me, 'desativou as duas etapas', me.id, null);
    return json({ ok: true });
  }
  if (path === '2fa/estado' && m === 'GET') {
    const u = await env.DBP.prepare('SELECT backup FROM p_users WHERE id = ?1').bind(me.id).first();
    return json({ ok: true, ativo: !!me.totp_on, recuperacao_restantes: me.totp_on ? JSON.parse((u && u.backup) || '[]').length : 0, obrigatorio: st.exigir_2fa });
  }

  if (path === 'sessoes' && m === 'GET') {
    const rows = (await env.DBP.prepare('SELECT id, created_at, last_seen_at, place, ua FROM p_sessions WHERE user_id = ?1 ORDER BY last_seen_at DESC').bind(me.id).all()).results || [];
    return json({ ok: true, sessoes: rows.map(x => ({ id: x.id.slice(0, 12), atual: x.id === s.id, criada: x.created_at, vista: x.last_seen_at, local: x.place, ua: x.ua })) });
  }
  if (path === 'sessoes/encerrar' && m === 'POST') {
    const alvo = String(body.id || '');
    const r = alvo === 'outras'
      ? await env.DBP.prepare('DELETE FROM p_sessions WHERE user_id = ?1 AND id != ?2').bind(me.id, s.id).run()
      : await env.DBP.prepare("DELETE FROM p_sessions WHERE user_id = ?1 AND id != ?2 AND substr(id, 1, 12) = ?3").bind(me.id, s.id, alvo.slice(0, 12)).run();
    await auditP(env, req, me, 'desconectou aparelhos', me.id, (r.meta.changes || 0) + ' sessão(ões)');
    return json({ ok: true, encerradas: r.meta.changes || 0 });
  }
  if (path === 'historico' && m === 'GET') {
    const rows = (await env.DBP.prepare("SELECT at, actor, action, detail, place, ua FROM p_audit WHERE target_id = ?1 AND action NOT LIKE 'app: %' ORDER BY id DESC LIMIT 40").bind(me.id).all()).results || [];
    return json({ ok: true, registro: rows });
  }

  /* ----- administrador ----- */
  if (path.startsWith('admin/')) {
    if (!me.admin) return fail('Só o administrador.', 403);
    return await admin(req, env, url, path.slice(6), m, body, me, s, st);
  }
  return fail('Endereço não encontrado.', 404);
}

async function admin(req, env, url, sub, m, body, me, s, st) {
  const t = Date.now();
  const getU = async id => {
    const u = await env.DBP.prepare(`SELECT ${USER}, (SELECT COUNT(*) FROM p_sessions x WHERE x.user_id = u.id) AS aparelhos, u.pass IS NOT NULL AS tem_senha FROM p_users u WHERE u.id = ?1`).bind(Number(id) || 0).first();
    if (!u) throw new HttpError(404, 'Usuário não encontrado.');
    return u;
  };
  const link = (token) => url.origin + '/pericias/#definir=' + token;

  if (sub === 'usuarios' && m === 'GET') {
    const rows = (await env.DBP.prepare(`SELECT ${USER}, (SELECT COUNT(*) FROM p_sessions x WHERE x.user_id = u.id) AS aparelhos, u.pass IS NOT NULL AS tem_senha FROM p_users u ORDER BY u.status, u.nome`).all()).results || [];
    return json({ ok: true, usuarios: rows, ajustes: st, agora: t });
  }
  if (sub === 'usuario' && m === 'GET') {
    const u = await getU(url.searchParams.get('id'));
    const [ses, reg] = await env.DBP.batch([
      env.DBP.prepare('SELECT substr(id, 1, 12) AS id, created_at, last_seen_at, place, ua FROM p_sessions WHERE user_id = ?1 ORDER BY last_seen_at DESC').bind(u.id),
      env.DBP.prepare("SELECT at, actor, action, detail, place FROM p_audit WHERE target_id = ?1 ORDER BY id DESC LIMIT 80").bind(u.id)
    ]);
    return json({ ok: true, usuario: u, sessoes: ses.results, registro: reg.results });
  }
  if (sub === 'criar' && m === 'POST') {
    const nome = clean(body.nome, 80), login = normLogin(body.login), chave = normChave(body.chave || login);
    if (nome.length < 2) return fail('Digite o nome.');
    if (!validLogin(login)) return fail('Login inválido: use de 3 a 60 letras, números, ponto, hífen ou @.');
    if (chave.length < 2) return fail('Usuário da planilha inválido.');
    if (await env.DBP.prepare('SELECT id FROM p_users WHERE login = ?1').bind(login).first()) return fail('Este login já está em uso.');
    if (await env.DBP.prepare('SELECT id FROM p_users WHERE chave = ?1').bind(chave).first()) return fail('Este usuário da planilha já pertence a outra conta.');
    const papel = body.papel === 'perito' ? 'perito' : 'assistente';
    const email = String(body.email || '').trim().toLowerCase();
    if (email && !validEmail(email)) return fail('E-mail inválido.');
    let w = onlyDigits(body.whatsapp); if (w.length === 10 || w.length === 11) w = '55' + w;
    const id = (await env.DBP.prepare('INSERT INTO p_users (chave, login, nome, email, whatsapp, papel, admin, created_at, created_by) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)')
      .bind(chave, login, nome, email || null, w || null, papel, body.admin ? 1 : 0, t, me.id).run()).meta.last_row_id;
    const token = await newTicket(env, id, 'convite', 72 * 60);
    await auditP(env, req, me, 'criou a conta', id, `${nome} (${login}), ${papel}${body.admin ? ', administrador' : ''}, usuário da planilha: ${chave}`);
    return json({ ok: true, id, link: link(token), validade: '72 horas' });
  }
  if (sub === 'editar' && m === 'POST') {
    const u = await getU(body.id);
    const nome = body.nome !== undefined ? clean(body.nome, 80) : u.nome;
    const login = body.login !== undefined ? normLogin(body.login) : u.login;
    if (nome.length < 2) return fail('Nome muito curto.');
    if (!validLogin(login)) return fail('Login inválido.');
    if (login !== u.login.toLowerCase() && await env.DBP.prepare('SELECT id FROM p_users WHERE login = ?1 AND id != ?2').bind(login, u.id).first()) return fail('Este login já está em uso.');
    const papel = body.papel !== undefined ? (body.papel === 'perito' ? 'perito' : 'assistente') : u.papel;
    const adm = body.admin !== undefined ? (body.admin ? 1 : 0) : u.admin;
    if (u.id === me.id && !adm) return fail('Você não pode tirar o próprio acesso de administrador.');
    const email = body.email !== undefined ? String(body.email || '').trim().toLowerCase() : u.email || '';
    if (email && !validEmail(email)) return fail('E-mail inválido.');
    let w = body.whatsapp !== undefined ? onlyDigits(body.whatsapp) : u.whatsapp || ''; if (w.length === 10 || w.length === 11) w = '55' + w;
    await env.DBP.prepare('UPDATE p_users SET nome = ?1, login = ?2, papel = ?3, admin = ?4, email = ?5, whatsapp = ?6 WHERE id = ?7').bind(nome, login, papel, adm, email || null, w || null, u.id).run();
    const mud = [nome !== u.nome && 'nome', login !== u.login.toLowerCase() && 'login ' + u.login + ' para ' + login, papel !== u.papel && 'perfil ' + papel, adm !== u.admin && (adm ? 'virou administrador' : 'deixou de ser administrador'), email !== (u.email || '') && 'e-mail', w !== (u.whatsapp || '') && 'WhatsApp'].filter(Boolean);
    if (mud.length) await auditP(env, req, me, 'editou a conta', u.id, mud.join(', '));
    return json({ ok: true });
  }
  if (sub === 'status' && m === 'POST') {
    const u = await getU(body.id);
    if (u.id === me.id) return fail('Você não pode bloquear a própria conta.');
    const status = body.status === 'bloqueado' ? 'bloqueado' : 'ativo';
    const stmts = [env.DBP.prepare('UPDATE p_users SET status = ?1 WHERE id = ?2').bind(status, u.id)];
    if (status === 'bloqueado') stmts.push(env.DBP.prepare('DELETE FROM p_sessions WHERE user_id = ?1').bind(u.id));
    await env.DBP.batch(stmts);
    await auditP(env, req, me, status === 'bloqueado' ? 'bloqueou a conta' : 'desbloqueou a conta', u.id, null);
    return json({ ok: true });
  }
  if (sub === 'link-senha' && m === 'POST') {
    const u = await getU(body.id);
    const token = await newTicket(env, u.id, u.tem_senha ? 'senha' : 'convite', 72 * 60);
    await auditP(env, req, me, u.tem_senha ? 'gerou link de nova senha' : 'gerou novo convite', u.id, null);
    return json({ ok: true, link: link(token), validade: '72 horas' });
  }
  if (sub === '2fa-reset' && m === 'POST') {
    const u = await getU(body.id);
    await env.DBP.batch([
      env.DBP.prepare('UPDATE p_users SET totp_secret = NULL, totp_on = 0, totp_last = NULL, backup = NULL WHERE id = ?1').bind(u.id),
      env.DBP.prepare('DELETE FROM p_sessions WHERE user_id = ?1 AND id != ?2').bind(u.id, s.id)
    ]);
    await auditP(env, req, me, 'zerou as duas etapas', u.id, 'cadastra de novo no próximo login');
    return json({ ok: true });
  }
  if (sub === 'sessoes' && m === 'POST') {
    const u = await getU(body.id);
    const r = await env.DBP.prepare('DELETE FROM p_sessions WHERE user_id = ?1 AND id != ?2').bind(u.id, s.id).run();
    await auditP(env, req, me, 'desconectou os aparelhos', u.id, (r.meta.changes || 0) + ' sessão(ões)');
    return json({ ok: true, encerradas: r.meta.changes || 0 });
  }
  if (sub === 'excluir' && m === 'POST') {
    const u = await getU(body.id);
    if (u.id === me.id) return fail('Você não pode excluir a própria conta.');
    if (normLogin(body.confirmar) !== u.login.toLowerCase()) return fail('Para excluir, digite o login da conta.');
    await env.DBP.batch([
      env.DBP.prepare('DELETE FROM p_sessions WHERE user_id = ?1').bind(u.id),
      env.DBP.prepare('DELETE FROM p_tickets WHERE user_id = ?1').bind(u.id),
      env.DBP.prepare('DELETE FROM p_users WHERE id = ?1').bind(u.id)
    ]);
    await auditP(env, req, me, 'excluiu a conta', null, `${u.nome} (${u.login}), usuário da planilha: ${u.chave}`);
    return json({ ok: true });
  }
  if (sub === 'ajustes' && m === 'POST') {
    const before = await getSettingsP(env, true);
    const after = await saveSettingsP(env, body.ajustes || {});
    const ch = Object.keys(after).filter(k => JSON.stringify(after[k]) !== JSON.stringify(before[k]));
    if (ch.length) await auditP(env, req, me, 'alterou ajustes', null, ch.map(k => k + ': ' + (typeof after[k] === 'boolean' ? (after[k] ? 'ligado' : 'desligado') : after[k])).join('; '));
    return json({ ok: true, ajustes: after });
  }
  if (sub === 'registro' && m === 'GET') {
    const off = Math.max(0, Number(url.searchParams.get('off')) || 0);
    const q = clean(url.searchParams.get('q'), 60).toLowerCase();
    const where = q ? "WHERE (LOWER(a.action) LIKE ?1 OR LOWER(IFNULL(a.actor, '')) LIKE ?1 OR LOWER(IFNULL(a.detail, '')) LIKE ?1 OR LOWER(IFNULL(u.nome, '')) LIKE ?1)" : '';
    const st2 = env.DBP.prepare(`SELECT a.id, a.at, a.actor, a.action, a.target_id, a.detail, a.place, a.ua, u.nome AS alvo FROM p_audit a LEFT JOIN p_users u ON u.id = a.target_id ${where} ORDER BY a.id DESC LIMIT 100 OFFSET ${off}`);
    const rows = ((q ? await st2.bind('%' + q + '%').all() : await st2.all()).results) || [];
    return json({ ok: true, registro: rows });
  }
  return fail('Endereço não encontrado.', 404);
}

/* ---------- entrada ---------- */
export async function pericias(req, env, ctx, url) {
  const p = url.pathname;
  if (p === '/pericias') return Response.redirect(url.origin + '/pericias/' + url.search, 301);
  try {
    await ensureSchemaP(env);
    const st = await getSettingsP(env);
    if (p.startsWith('/pericias/conta/')) return secure(await conta(req, env, ctx, url, st));
    if (p === '/pericias/api') {
      if (req.method !== 'POST') return secure(fail('Use POST.', 405));
      const o = req.headers.get('Origin'); if (o && o !== url.origin) return secure(fail('Origem não permitida.', 403));
      const s = await getSession(req, env, ctx, st);
      if (!s) return secure(fail('Sessão expirada. Entre novamente.', 401));
      return secure(await proxy(req, env, ctx, url, s));
    }
    if (PUBLICO.test(p)) return secure(await env.ASSETS.fetch(req), { 'Cache-Control': /\.(?:html)$|\/$/.test(p) ? 'no-cache' : 'public, max-age=300' });
    const s = await getSession(req, env, ctx, st);
    if (!s) {
      if (/\/$|\.html$|\/perfil$/.test(p)) return Response.redirect(url.origin + '/pericias/', 302);
      return secure(new Response('Entre no app de perícias para continuar.', { status: 401, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } }));
    }
    // a parte de administração da página Minha conta só vai para administradores
    if (/^\/pericias\/perfil\/admin\.(?:js|css)$/.test(p) && !s.user.admin) return secure(new Response('Só o administrador.', { status: 403, headers: { 'Cache-Control': 'no-store' } }));
    return secure(await env.ASSETS.fetch(req), { 'Cache-Control': 'private, no-store' });
  } catch (e) {
    if (e instanceof HttpError) return secure(fail(e.message, e.status));
    console.error('pericias', p, e && e.stack || e);
    return secure(fail('Erro no servidor. Tente de novo em instantes.', 500));
  }
}
