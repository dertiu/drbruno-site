/* Painel de administração: usuários, códigos de acesso, ajustes e registro */
(function () {
  'use strict';
  const doc = document, root = doc.getElementById('pn');
  try { doc.body.dataset.theme = JSON.parse(localStorage.getItem('drb_theme') || '"dark"'); } catch (e) { }
  const SITE = location.origin + '/calculadoras/';
  const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];

  /* ---------- utilitários ---------- */
  function h(tag, props) {
    const el = doc.createElement(tag);
    if (props) for (const k in props) {
      const v = props[k];
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (let i = 2; i < arguments.length; i++) for (const c of [].concat(arguments[i])) { if (c == null || c === false) continue; el.append(c.nodeType ? c : doc.createTextNode(c)); }
    return el;
  }
  const P = {
    home: '<path d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><path d="M16 4.5a3.5 3.5 0 010 7M18 14c2.3.7 3.5 2.8 3.5 6"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3M15 8l2 2"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1L7 17M17 7l2.1-2.1"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    back: '<path d="M15 18l-6-6 6-6"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 012-2h10"/>',
    chat: '<path d="M4 20l1.5-4A8 8 0 1112 20a8 8 0 01-4-1z"/>',
    out: '<path d="M15 4h4a1 1 0 011 1v14a1 1 0 01-1 1h-4M10 17l5-5-5-5M15 12H3"/>',
    ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
    down: '<path d="M12 4v12M6 11l6 6 6-6M4 20h16"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    chev: '<path d="M9 6l6 6-6 6"/>'
  };
  function ic(n) {
    const s = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('class', 'ico'); s.setAttribute('aria-hidden', 'true');
    s.innerHTML = P[n] || ''; return s;
  }
  const fmtD = ms => ms ? new Date(ms).toLocaleDateString('pt-BR') : '';
  const fmtDT = ms => ms ? new Date(ms).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
  function rel(ms) {
    if (!ms) return 'nunca';
    const d = Date.now() - ms, m = Math.round(d / 60000);
    if (m < 2) return 'agora'; if (m < 60) return 'há ' + m + ' min';
    const hh = Math.round(m / 60); if (hh < 24) return 'há ' + hh + ' h';
    const dd = Math.round(hh / 24); if (dd < 31) return 'há ' + dd + (dd === 1 ? ' dia' : ' dias');
    return 'em ' + fmtD(ms);
  }
  const daysLeft = ms => Math.ceil((ms - Date.now()) / 864e5);
  const phone = w => { let d = String(w || '').replace(/\D/g, ''); if (d.slice(0, 2) === '55' && d.length > 11) d = d.slice(2); return d.length === 11 ? '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7) : d.length === 10 ? '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6) : d; };
  const wa = (num, msg) => 'https://wa.me/' + String(num || '').replace(/\D/g, '') + (msg ? '?text=' + encodeURIComponent(msg) : '');
  const todayPlus = d => { const x = new Date(Date.now() + d * 864e5); return x.toLocaleDateString('sv-SE'); };
  function device(ua) {
    ua = ua || '';
    const os = /iPhone|iPad/.test(ua) ? 'iPhone/iPad' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : 'Aparelho';
    const br = /Edg\//.test(ua) ? 'Edge' : /SamsungBrowser/.test(ua) ? 'Samsung Internet' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : '';
    return br ? br + ' no ' + os : os;
  }

  async function api(path, body) {
    let r;
    try {
      r = await fetch('/api/' + path, { method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin', cache: 'no-store', headers: body === undefined ? {} : { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
    } catch (e) { throw new Error('Sem conexão com a internet.'); }
    let j = null; try { j = await r.json(); } catch (e) { }
    if (r.status === 401 && path.indexOf('admin/') === 0) { boot(); throw new Error('Sua sessão terminou. Entre de novo.'); }
    if (!r.ok || !j || j.ok === false) { const e = new Error((j && j.erro) || 'Erro ' + r.status); e.status = r.status; throw e; }
    return j;
  }

  /* avisos rápidos */
  const toasts = h('div', { class: 'pn-toasts', 'aria-live': 'polite' });
  function toast(msg, kind) {
    const t = h('div', { class: 'pn-toast' + (kind ? ' ' + kind : '') }, msg);
    toasts.append(t); setTimeout(() => t.classList.add('out'), 3200); setTimeout(() => t.remove(), 3600);
  }
  async function copy(text, what) {
    try { await navigator.clipboard.writeText(text); toast((what || 'Texto') + ' copiado.', 'ok'); }
    catch (e) { const ta = h('textarea', null, text); doc.body.append(ta); ta.select(); try { doc.execCommand('copy'); toast((what || 'Texto') + ' copiado.', 'ok'); } catch (x) { toast('Não consegui copiar.', 'crit'); } ta.remove(); }
  }
  /* janela de confirmação */
  function ask(title, text, ok, danger, typed) {
    return new Promise(res => {
      const inp = typed ? h('input', { class: 'pn-in', type: 'text', placeholder: typed, autocomplete: 'off' }) : null;
      const close = v => { w.remove(); doc.removeEventListener('keydown', esc); res(v); };
      const esc = e => { if (e.key === 'Escape') close(false); };
      const go = h('button', { type: 'button', class: 'pn-btn ' + (danger ? 'danger' : 'pri'), onclick: () => { if (typed && inp.value.trim().toLowerCase() !== typed.toLowerCase()) { inp.focus(); inp.classList.add('bad'); return; } close(typed ? inp.value.trim() : true); } }, ok);
      const w = h('div', { class: 'pn-modal-w', onclick: e => { if (e.target === w) close(false); } },
        h('div', { class: 'pn-modal', role: 'dialog', 'aria-modal': 'true' },
          h('h2', null, title), text && h('p', null, text), inp,
          h('div', { class: 'pn-modal-a' }, h('button', { type: 'button', class: 'pn-btn ghost', onclick: () => close(false) }, 'Cancelar'), go)));
      doc.body.append(w); doc.addEventListener('keydown', esc);
      (inp || go).focus();
    });
  }
  async function act(btn, fn) {
    if (btn && btn.disabled) return;
    const txt = btn ? btn.innerHTML : '';
    if (btn) { btn.disabled = true; btn.classList.add('busy'); }
    try { await fn(); } catch (e) { toast(e.message, 'crit'); }
    finally { if (btn && btn.isConnected) { btn.disabled = false; btn.classList.remove('busy'); btn.innerHTML = txt; } }
  }
  const fld = (label, el, hint) => h('label', { class: 'pn-f' }, h('span', null, label), el, hint && h('small', null, hint));
  const inp = props => h('input', Object.assign({ class: 'pn-in' }, props));
  function sw(label, on, onchange, hint) {
    const b = h('button', { type: 'button', role: 'switch', class: 'pn-sw', 'aria-checked': on ? 'true' : 'false', onclick: () => { const v = b.getAttribute('aria-checked') !== 'true'; b.setAttribute('aria-checked', v); onchange(v); } }, h('i'));
    return h('div', { class: 'pn-swrow' }, h('div', null, h('b', null, label), hint && h('small', null, hint)), b);
  }
  function accessInfo(u) {
    if (u.status === 'bloqueado') return ['Bloqueado', 'crit'];
    if (u.role === 'admin') return ['Administrador', 'acc'];
    if (u.lifetime) return ['Vitalício', 'ok'];
    if (u.access_until && u.access_until > Date.now()) { const d = daysLeft(u.access_until); return ['Até ' + fmtD(u.access_until), d <= 7 ? 'warn' : 'ok']; }
    if (u.access_until) return ['Expirou em ' + fmtD(u.access_until), 'muted'];
    return ['Sem acesso', 'muted'];
  }
  const pill = (txt, kind) => h('span', { class: 'pn-pill ' + (kind || '') }, txt);
  function grantText(c) {
    if (c.mode === 'vitalicio') return 'Vitalício';
    if (c.mode === 'dias') return c.days + (c.days == 1 ? ' dia' : ' dias');
    if (c.mode === 'data') return 'Até ' + fmtD(c.until);
    return c.mode;
  }

  /* ---------- entrada no painel ---------- */
  let ME = null;
  function shell(content) {
    root.innerHTML = '';
    root.append(h('div', { class: 'pn-login' }, h('div', { class: 'pn-login-card' },
      h('div', { class: 'pn-brand' }, h('img', { src: '/calculadoras/icon.svg', alt: '', width: 44, height: 44 }), h('div', null, h('b', null, 'Painel de usuários'), h('span', null, 'Calculadoras Dr. Bruno Michels'))),
      content)), toasts);
  }
  function renderLogin(msg) {
    const err = h('div', { class: 'pn-err', hidden: !msg }, msg || '');
    const em = inp({ type: 'email', autocomplete: 'username', required: true, id: 'pn-email' });
    const pw = inp({ type: 'password', autocomplete: 'current-password', required: true, id: 'pn-senha' });
    const go = h('button', { type: 'submit', class: 'pn-btn pri wide' }, 'Entrar');
    shell(h('form', { class: 'pn-col', onsubmit: e => {
      e.preventDefault(); err.hidden = true;
      act(go, async () => {
        try { const j = await api('entrar', { email: em.value, senha: pw.value }); if (j.usuario && j.usuario.admin) { ME = j; app(); } else { err.hidden = false; err.textContent = 'Esta conta não é de administrador.'; } }
        catch (x) { err.hidden = false; err.textContent = x.message; }
      });
    } }, fld('E-mail', em), fld('Senha', pw), err, go, h('a', { class: 'pn-link', href: '/calculadoras/' }, 'Voltar às calculadoras')));
  }
  function renderSetup() {
    const err = h('div', { class: 'pn-err', hidden: true });
    const f = { nome: inp({ type: 'text', autocomplete: 'name' }), email: inp({ type: 'email', autocomplete: 'username' }), senha: inp({ type: 'password', autocomplete: 'new-password' }), whatsapp: inp({ type: 'tel', autocomplete: 'tel' }), codigo: inp({ type: 'password', autocomplete: 'off' }) };
    const go = h('button', { type: 'submit', class: 'pn-btn pri wide' }, 'Criar administrador');
    shell(h('form', { class: 'pn-col', onsubmit: e => {
      e.preventDefault(); err.hidden = true;
      act(go, async () => {
        try { const j = await api('configurar', { nome: f.nome.value, email: f.email.value, senha: f.senha.value, whatsapp: f.whatsapp.value, codigo: f.codigo.value }); ME = j; app(); toast('Administrador criado.', 'ok'); }
        catch (x) { err.hidden = false; err.textContent = x.message; }
      });
    } }, h('p', { class: 'pn-p' }, 'Primeiro acesso: crie a conta de administrador. Use o código de configuração das calculadoras (vale uma vez só).'),
      fld('Nome completo', f.nome), fld('E-mail', f.email), fld('Senha (mínimo 8 caracteres)', f.senha), fld('WhatsApp (opcional)', f.whatsapp), fld('Código de configuração', f.codigo), err, go));
  }
  async function boot() {
    try {
      const j = await api('eu');
      if (j.usuario && j.usuario.admin) { ME = j; app(); return; }
      if (j.setup) { renderSetup(); return; }
      renderLogin(j.usuario ? 'Você entrou como ' + j.usuario.email + ', que não é administrador. Entre com a conta de administrador.' : '');
    } catch (e) { shell(h('div', { class: 'pn-col' }, h('div', { class: 'pn-err' }, e.message), h('button', { type: 'button', class: 'pn-btn pri wide', onclick: boot }, 'Tentar de novo'))); }
  }

  /* ---------- estrutura do painel ---------- */
  const TABS = [['resumo', 'Resumo', 'home'], ['usuarios', 'Usuários', 'users'], ['codigos', 'Códigos', 'key'], ['ajustes', 'Ajustes', 'gear'], ['registro', 'Registro', 'list']];
  let view, nav;
  function app() {
    root.innerHTML = '';
    nav = h('nav', { class: 'pn-tabs', 'aria-label': 'Seções' }, TABS.map(([id, t, i]) => h('a', { href: '#/' + id, 'data-t': id }, ic(i), h('span', null, t))));
    view = h('main', { class: 'pn-main' });
    root.append(h('header', { class: 'pn-hdr' }, h('div', { class: 'pn-hdr-in' },
      h('a', { class: 'pn-brand sm', href: '#/resumo' }, h('img', { src: '/calculadoras/icon.svg', alt: '', width: 36, height: 36 }), h('div', null, h('b', null, 'Painel'), h('span', null, ME.usuario.nome))),
      h('div', { class: 'pn-hdr-a' },
        h('a', { class: 'pn-btn ghost sm', href: '/calculadoras/' }, ic('ext'), h('span', { class: 'hide-sm' }, 'Calculadoras')),
        h('button', { type: 'button', class: 'pn-btn ghost sm', title: 'Sair', onclick: async () => { try { await api('sair', {}); } catch (e) { } try { localStorage.removeItem('drb_lic'); } catch (e) { } location.reload(); } }, ic('out'), h('span', { class: 'hide-sm' }, 'Sair')))),
      h('div', { class: 'pn-hdr-in tabs' }, nav)), view, toasts);
    window.onhashchange = route;
    if (!/^#\//.test(location.hash)) history.replaceState(null, '', '#/resumo');
    route();
  }
  function route() {
    const m = location.hash.replace(/^#\//, '').split('?')[0].split('/');
    const tab = TABS.some(t => t[0] === m[0]) ? m[0] : 'resumo';
    nav.querySelectorAll('a').forEach(a => { const on = a.dataset.t === tab; a.classList.toggle('on', on); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    view.innerHTML = ''; window.scrollTo(0, 0);
    const v = h('div', { class: 'pn-view' }); view.append(v);
    ({ resumo: vResumo, usuarios: m[1] ? vUser : vUsers, codigos: vCodes, ajustes: vAjustes, registro: vRegistro })[tab](v, m[1]);
  }
  const loading = () => h('div', { class: 'pn-loading' }, h('div', { class: 'pn-spin' }));
  const errorView = (v, e, retry) => { v.innerHTML = ''; v.append(h('div', { class: 'pn-err' }, e.message), h('button', { type: 'button', class: 'pn-btn', onclick: retry }, 'Tentar de novo')); };
  const card = (title, ...kids) => h('section', { class: 'pn-card' }, title && h('h2', null, title), kids);

  /* ---------- Resumo ---------- */
  async function vResumo(v) {
    v.append(h('h1', { class: 'pn-title' }, 'Resumo'), loading());
    let j; try { j = await api('admin/resumo'); } catch (e) { return errorView(v, e, () => vResumo(v)); }
    v.lastChild.remove();
    const u = j.usuarios || {}, vis = j.visitantes || {};
    const stat = (n, label, href, kind) => h('a', { class: 'pn-stat ' + (kind || ''), href }, h('b', null, String(n || 0)), h('span', null, label));
    v.append(h('div', { class: 'pn-stats' },
      stat(u.total, 'Usuários cadastrados', '#/usuarios'),
      stat(u.ativos, 'Com acesso ativo', '#/usuarios?f=com_acesso', 'ok'),
      stat(u.expirando, 'Vencem em 7 dias', '#/usuarios?f=expirando', u.expirando ? 'warn' : ''),
      stat(u.novos7, 'Novos nos últimos 7 dias', '#/usuarios'),
      stat(u.ativos24, 'Usaram nas últimas 24 h', '#/usuarios'),
      stat(vis.v24, 'Visitantes nas últimas 24 h', '#/ajustes'),
      stat((j.codigos || {}).ativos, 'Códigos disponíveis', '#/codigos')));
    const on = j.config.visitante;
    const vbtn = h('button', { type: 'button', class: 'pn-btn ' + (on ? '' : 'pri') }, on ? 'Desligar modo visitante' : 'Ligar modo visitante');
    vbtn.onclick = () => act(vbtn, async () => {
      if (on && !(await ask('Desligar o modo visitante?', 'Quem entrou como visitante perde o acesso na próxima vez que abrir o app com internet. Contas com acesso liberado continuam normalmente.', 'Desligar', true))) return;
      await api('admin/config', { config: { visitante: !on } }); toast(on ? 'Modo visitante desligado.' : 'Modo visitante ligado.', 'ok'); route();
    });
    v.append(h('div', { class: 'pn-grid2' },
      card('Modo visitante', h('div', { class: 'pn-vis ' + (on ? 'on' : 'off') }, h('b', null, on ? 'Ligado' : 'Desligado'),
        h('p', null, on ? 'Qualquer pessoa entra com um clique e usa todas as calculadoras. Contas sem acesso liberado também usam tudo. Desligue quando começar a cobrar.' : 'Só entra quem tem acesso liberado (código, cortesia ou assinatura).')),
        h('p', { class: 'pn-p sm' }, (vis.v7 || 0) + ' visitante(s) nos últimos 7 dias.'), vbtn),
      card('Ações rápidas',
        h('a', { class: 'pn-btn pri', href: '#/codigos' }, ic('key'), 'Gerar código de acesso'),
        h('a', { class: 'pn-btn', href: '#/usuarios' }, ic('users'), 'Ver usuários'),
        h('a', { class: 'pn-btn', href: '/calculadoras/admin.html' }, ic('ext'), 'Editor de conteúdo (receitas, descrições)'))));
    const ulist = (rows, empty, sub) => rows && rows.length ? h('div', { class: 'pn-list' }, rows.map(x => userRow(x, sub))) : h('p', { class: 'pn-p sm' }, empty);
    v.append(h('div', { class: 'pn-grid2' },
      card('Cadastros recentes', ulist(j.novos, 'Nenhum cadastro ainda.', x => 'Cadastro ' + rel(x.created_at))),
      card('Acessos que vencem primeiro', ulist(j.vencendo, 'Nenhum acesso com data de fim.', x => 'Vence em ' + fmtD(x.access_until) + ' (' + daysLeft(x.access_until) + ' dias)'))));
  }

  function userRow(u, sub) {
    const [txt, kind] = accessInfo(u);
    return h('a', { class: 'pn-row', href: '#/usuarios/' + u.id },
      h('div', { class: 'pn-row-m' }, h('b', null, u.name), h('span', null, sub ? sub(u) : [u.email, u.crm ? 'CRM ' + u.crm + '/' + (u.crm_uf || '') : ''].filter(Boolean).join(' · '))),
      h('div', { class: 'pn-row-r' }, pill(txt, kind), !sub && h('small', null, 'Visto ' + rel(u.last_seen_at))), ic('chev'));
  }

  /* ---------- Usuários ---------- */
  const US = { f: 'todos', q: '' };
  async function vUsers(v) {
    const qs = new URLSearchParams((location.hash.split('?')[1]) || '');
    if (qs.get('f')) US.f = qs.get('f');
    const FILT = [['todos', 'Todos'], ['com_acesso', 'Com acesso'], ['sem_acesso', 'Sem acesso'], ['expirando', 'Vencem em 7 dias'], ['vitalicios', 'Vitalícios'], ['bloqueados', 'Bloqueados'], ['admins', 'Administradores']];
    const list = h('div', { class: 'pn-list' }), count = h('span', { class: 'pn-count' });
    const q = inp({ type: 'search', placeholder: 'Buscar por nome, e-mail, CRM ou WhatsApp', value: US.q, 'aria-label': 'Buscar usuário' });
    const chips = h('div', { class: 'pn-chips' }, FILT.map(([id, t]) => h('button', { type: 'button', class: 'pn-chip' + (US.f === id ? ' on' : ''), onclick: e => { US.f = id; chips.querySelectorAll('.pn-chip').forEach(c => c.classList.remove('on')); e.currentTarget.classList.add('on'); load(0); } }, t)));
    const csv = h('a', { class: 'pn-btn ghost sm', download: true }, ic('down'), 'Exportar planilha');
    const more = h('button', { type: 'button', class: 'pn-btn ghost wide', hidden: true }, 'Carregar mais');
    let tm = null, shown = 0;
    q.oninput = () => { clearTimeout(tm); tm = setTimeout(() => { US.q = q.value.trim(); load(0); }, 250); };
    async function load(off) {
      csv.href = '/api/admin/usuarios.csv?f=' + encodeURIComponent(US.f) + '&q=' + encodeURIComponent(US.q);
      if (!off) { list.innerHTML = ''; list.append(loading()); shown = 0; }
      try {
        const j = await api('admin/usuarios?f=' + encodeURIComponent(US.f) + '&q=' + encodeURIComponent(US.q) + '&off=' + off);
        if (!off) list.innerHTML = '';
        j.usuarios.forEach(u => list.append(userRow(u)));
        shown += j.usuarios.length;
        if (!shown) list.append(h('p', { class: 'pn-empty' }, US.q ? 'Ninguém encontrado com essa busca.' : 'Nenhum usuário neste filtro.'));
        count.textContent = j.total + (j.total === 1 ? ' usuário' : ' usuários');
        more.hidden = shown >= j.total;
      } catch (e) { list.innerHTML = ''; list.append(h('div', { class: 'pn-err' }, e.message)); }
    }
    more.onclick = () => act(more, () => load(shown));
    v.append(h('div', { class: 'pn-tt' }, h('h1', { class: 'pn-title' }, 'Usuários'), count, csv),
      h('label', { class: 'pn-search' }, ic('search'), q), chips, list, more);
    load(0);
  }

  async function vUser(v, id) {
    v.append(h('a', { class: 'pn-back', href: '#/usuarios' }, ic('back'), 'Usuários'), loading());
    let j; try { j = await api('admin/usuario?id=' + encodeURIComponent(id)); } catch (e) { return errorView(v, e, () => route()); }
    v.lastChild.remove();
    const u = j.usuario, self = u.id === ME.usuario.id, reload = () => route();
    const [txt, kind] = accessInfo(u);
    v.append(h('div', { class: 'pn-uh' },
      h('div', null, h('h1', { class: 'pn-title' }, u.name), h('p', { class: 'pn-p' }, u.email)),
      h('div', { class: 'pn-uh-p' }, pill(txt, kind), u.role === 'admin' && u.status === 'bloqueado' ? pill('Administrador', 'acc') : null)));

    /* acesso */
    const note = inp({ type: 'text', placeholder: 'Ex.: residente R1, cortesia, pagou via Pix', maxlength: 200 });
    const give = (g, label, btn) => act(btn, async () => {
      if (g.mode === 'remover' && !(await ask('Retirar o acesso de ' + u.name.split(' ')[0] + '?', 'A pessoa continua com a conta, mas sem acesso às calculadoras (exceto enquanto o modo visitante estiver ligado).', 'Retirar acesso', true))) return;
      await api('admin/usuario/acesso', Object.assign({ id: u.id, nota: note.value }, g)); toast(label, 'ok'); reload();
    });
    let now;
    if (u.role === 'admin') now = 'Administrador: acesso total, sem data de fim.';
    else if (u.lifetime) now = 'Acesso vitalício.';
    else if (u.access_until && u.access_until > Date.now()) now = 'Acesso até ' + fmtD(u.access_until) + ' (faltam ' + daysLeft(u.access_until) + ' dias).';
    else if (u.access_until) now = 'O acesso terminou em ' + fmtD(u.access_until) + '.';
    else now = 'Ainda sem acesso liberado.';
    const date = inp({ type: 'date', min: todayPlus(1), value: todayPlus(30), 'aria-label': 'Data de fim do acesso' });
    const qb = (days, label) => { const b = h('button', { type: 'button', class: 'pn-btn sm' }, label); b.onclick = () => give({ mode: 'dias', days }, '+' + label + ' liberado.', b); return b; };
    const bDate = h('button', { type: 'button', class: 'pn-btn sm' }, 'Definir');
    bDate.onclick = () => give({ mode: 'data', until: date.value }, 'Acesso definido até ' + date.value.split('-').reverse().join('/') + '.', bDate);
    const bLife = h('button', { type: 'button', class: 'pn-btn sm' }, 'Vitalício');
    bLife.onclick = () => give({ mode: 'vitalicio' }, 'Acesso vitalício liberado.', bLife);
    const bRem = h('button', { type: 'button', class: 'pn-btn sm danger' }, 'Retirar acesso');
    bRem.onclick = () => give({ mode: 'remover' }, 'Acesso retirado.', bRem);
    v.append(card('Acesso', h('p', { class: 'pn-now' }, now),
      u.role !== 'admin' && h('div', { class: 'pn-col' },
        h('div', { class: 'pn-sub' }, 'Somar dias ao acesso atual'),
        h('div', { class: 'pn-btns' }, qb(7, '7 dias'), qb(30, '30 dias'), qb(90, '90 dias'), qb(180, '6 meses'), qb(365, '1 ano')),
        h('div', { class: 'pn-sub' }, 'Ou definir até uma data'),
        h('div', { class: 'pn-inline' }, date, bDate),
        h('div', { class: 'pn-btns' }, bLife, !self && (u.lifetime || u.access_until) ? bRem : null),
        fld('Observação desta liberação (opcional)', note))));

    /* dados */
    const d = { nome: inp({ value: u.name }), email: inp({ type: 'email', value: u.email }), crm: inp({ value: u.crm || '', inputmode: 'numeric' }), uf: h('select', { class: 'pn-in' }, h('option', { value: '' }, '-'), UFS.map(x => h('option', { value: x, selected: x === u.crm_uf }, x))), whatsapp: inp({ type: 'tel', value: phone(u.whatsapp) }) };
    const bSave = h('button', { type: 'button', class: 'pn-btn pri' }, 'Salvar dados');
    bSave.onclick = () => act(bSave, async () => { await api('admin/usuario/editar', { id: u.id, nome: d.nome.value, email: d.email.value, crm: d.crm.value, uf: d.uf.value, whatsapp: d.whatsapp.value }); toast('Dados salvos.', 'ok'); reload(); });
    const notes = h('textarea', { class: 'pn-in ta', rows: 3, placeholder: 'Anotações só para você (ex.: colega do HSaúde, pagou até março)' }, u.notes || '');
    const bNotes = h('button', { type: 'button', class: 'pn-btn' }, 'Salvar observações');
    bNotes.onclick = () => act(bNotes, async () => { await api('admin/usuario/editar', { id: u.id, notas: notes.value }); toast('Observações salvas.', 'ok'); });
    v.append(h('div', { class: 'pn-grid2' },
      card('Dados', h('div', { class: 'pn-form2' }, fld('Nome', d.nome), fld('E-mail', d.email), h('div', { class: 'pn-row2' }, fld('CRM', d.crm), fld('UF', d.uf)), fld('WhatsApp', d.whatsapp)),
        h('div', { class: 'pn-btns' }, bSave, u.whatsapp && h('a', { class: 'pn-btn ghost', href: wa(u.whatsapp), target: '_blank', rel: 'noopener' }, ic('chat'), 'Conversar')),
        h('p', { class: 'pn-p sm' }, 'Cadastro em ' + fmtDT(u.created_at) + '. Último acesso ' + rel(u.last_seen_at) + '.')),
      card('Observações', notes, h('div', { class: 'pn-btns' }, bNotes))));

    /* conta */
    const linkBox = h('div', { class: 'pn-col', hidden: true });
    const bLink = h('button', { type: 'button', class: 'pn-btn' }, 'Gerar link de nova senha');
    bLink.onclick = () => act(bLink, async () => {
      const r = await api('admin/usuario/senha', { id: u.id });
      const msg = 'Olá, ' + u.name.split(' ')[0] + '! Para criar sua nova senha nas calculadoras, abra este link (vale por ' + r.validade + '):\n' + r.link;
      linkBox.innerHTML = ''; linkBox.hidden = false;
      linkBox.append(h('div', { class: 'pn-code-out' }, h('code', null, r.link)),
        h('div', { class: 'pn-btns' }, h('button', { type: 'button', class: 'pn-btn sm', onclick: () => copy(r.link, 'Link') }, ic('copy'), 'Copiar link'),
          u.whatsapp && h('a', { class: 'pn-btn sm', href: wa(u.whatsapp, msg), target: '_blank', rel: 'noopener' }, ic('chat'), 'Enviar pelo WhatsApp')));
    });
    const bBlock = h('button', { type: 'button', class: 'pn-btn' + (u.status === 'bloqueado' ? ' pri' : ' danger') }, u.status === 'bloqueado' ? 'Desbloquear conta' : 'Bloquear conta');
    bBlock.onclick = () => act(bBlock, async () => {
      const block = u.status !== 'bloqueado';
      if (block && !(await ask('Bloquear ' + u.name + '?', 'A pessoa é desconectada de todos os aparelhos e não consegue mais entrar até você desbloquear.', 'Bloquear', true))) return;
      await api('admin/usuario/status', { id: u.id, status: block ? 'bloqueado' : 'ativo' }); toast(block ? 'Conta bloqueada.' : 'Conta desbloqueada.', 'ok'); reload();
    });
    const bRole = h('button', { type: 'button', class: 'pn-btn' }, u.role === 'admin' ? 'Remover administrador' : 'Tornar administrador');
    bRole.onclick = () => act(bRole, async () => {
      const to = u.role === 'admin' ? 'user' : 'admin';
      if (!(await ask(to === 'admin' ? 'Tornar administrador?' : 'Remover administrador?', to === 'admin' ? 'Administradores veem todos os usuários, geram códigos, mudam ajustes e abrem o editor de conteúdo.' : 'A pessoa volta a ser usuária comum.', 'Confirmar', to === 'admin'))) return;
      await api('admin/usuario/papel', { id: u.id, role: to }); toast('Feito.', 'ok'); reload();
    });
    const bSes = h('button', { type: 'button', class: 'pn-btn' }, 'Desconectar aparelhos (' + j.sessoes.length + ')');
    bSes.onclick = () => act(bSes, async () => { const r = await api('admin/usuario/sessoes', { id: u.id }); toast(r.encerradas + ' aparelho(s) desconectado(s).', 'ok'); reload(); });
    const bDel = h('button', { type: 'button', class: 'pn-btn danger' }, 'Excluir conta');
    bDel.onclick = () => act(bDel, async () => {
      const typed = await ask('Excluir a conta de ' + u.name + '?', 'Isto apaga a conta e o histórico de acesso. Não dá para desfazer. Para confirmar, digite o e-mail da conta:', 'Excluir', true, u.email);
      if (!typed) return;
      await api('admin/usuario/excluir', { id: u.id, confirmar: typed }); toast('Conta excluída.', 'ok'); location.hash = '#/usuarios';
    });
    v.append(card('Conta', h('div', { class: 'pn-btns' }, bLink, !self && bBlock, !self && bRole, j.sessoes.length ? bSes : null, !self && bDel), linkBox));

    /* aparelhos, códigos e histórico */
    v.append(h('div', { class: 'pn-grid2' },
      card('Aparelhos conectados', j.sessoes.length ? h('div', { class: 'pn-mini' }, j.sessoes.map(s => h('div', null, h('b', null, device(s.ua)), h('span', null, [s.place, 'usado ' + rel(s.last_seen_at)].filter(Boolean).join(' · '))))) : h('p', { class: 'pn-p sm' }, 'Nenhum aparelho conectado agora.')),
      card('Códigos usados', j.codigos.length ? h('div', { class: 'pn-mini' }, j.codigos.map(c => h('div', null, h('b', { class: 'mono' }, c.code), h('span', null, [c.mode ? grantText(c) : '', c.label, fmtDT(c.at)].filter(Boolean).join(' · '))))) : h('p', { class: 'pn-p sm' }, 'Nenhum código usado.'))));
    v.append(card('Histórico', j.registro.length ? h('div', { class: 'pn-log' }, j.registro.map(r => h('div', null, h('time', null, fmtDT(r.at)), h('span', null, h('b', null, r.action), r.detail ? ': ' + r.detail : '', r.actor && r.actor !== u.name ? ' (por ' + r.actor + ')' : ''), r.place && h('small', null, r.place)))) : h('p', { class: 'pn-p sm' }, 'Sem registros.')));
  }

  /* ---------- Códigos ---------- */
  const CS = { f: 'ativos', q: '' };
  function codeMessage(codes, c) {
    const what = c.mode === 'vitalicio' ? 'acesso vitalício' : c.mode === 'dias' ? 'acesso por ' + c.days + ' dias' : 'acesso até ' + c.until.split('-').reverse().join('/');
    return 'Olá! Seu código de ' + what + ' às calculadoras de plantão do Dr. Bruno Michels:\n\n' + codes.join('\n') +
      '\n\nComo usar: abra ' + SITE + ' , toque em Criar conta e coloque o código no fim do cadastro. Se já tiver conta, use em Minha conta.';
  }
  function vCodes(v) {
    v.append(h('h1', { class: 'pn-title' }, 'Códigos de acesso'));
    /* gerar */
    const st = { mode: 'dias' };
    const days = inp({ type: 'number', min: 1, max: 3650, value: 30, inputmode: 'numeric' });
    const until = inp({ type: 'date', min: todayPlus(1), value: todayPlus(365) });
    const qtd = inp({ type: 'number', min: 1, max: 200, value: 1, inputmode: 'numeric' });
    const usos = inp({ type: 'number', min: 1, max: 1000, value: 1, inputmode: 'numeric' });
    const rot = inp({ type: 'text', maxlength: 80, placeholder: 'Ex.: Residentes 2027, Dra. Ana' });
    const em = inp({ type: 'email', placeholder: 'Opcional' });
    const val = inp({ type: 'date', min: todayPlus(1) });
    const fDays = h('div', { class: 'pn-col' }, fld('Quantos dias de acesso', days), h('div', { class: 'pn-btns' }, [[7, '7'], [30, '30'], [90, '90'], [180, '180'], [365, '365']].map(([n, t]) => h('button', { type: 'button', class: 'pn-chip', onclick: () => { days.value = n; } }, t + ' dias'))));
    const fDate = h('div', { hidden: true }, fld('Acesso até', until));
    const seg = h('div', { class: 'pn-seg', role: 'tablist' }, [['dias', 'Por dias'], ['data', 'Até uma data'], ['vitalicio', 'Vitalício']].map(([m, t]) =>
      h('button', { type: 'button', class: m === st.mode ? 'on' : '', onclick: e => { st.mode = m; seg.querySelectorAll('button').forEach(b => b.classList.remove('on')); e.currentTarget.classList.add('on'); fDays.hidden = m !== 'dias'; fDate.hidden = m !== 'data'; } }, t)));
    const out = h('div', { class: 'pn-col', hidden: true });
    const go = h('button', { type: 'button', class: 'pn-btn pri' }, ic('plus'), 'Gerar');
    go.onclick = () => act(go, async () => {
      const body = { mode: st.mode, days: days.value, until: until.value, qtd: qtd.value, usos: usos.value, rotulo: rot.value, email: em.value, validade: val.value };
      const r = await api('admin/codigos', body);
      const msg = codeMessage(r.codigos, { mode: st.mode, days: days.value, until: until.value });
      out.innerHTML = ''; out.hidden = false;
      out.append(h('div', { class: 'pn-okb' }, r.codigos.length === 1 ? 'Código gerado:' : r.codigos.length + ' códigos gerados:'),
        h('div', { class: 'pn-codes' }, r.codigos.map(c => h('button', { type: 'button', class: 'pn-codebig', title: 'Copiar', onclick: () => copy(c, 'Código') }, h('span', null, c), ic('copy')))),
        h('div', { class: 'pn-btns' },
          r.codigos.length > 1 && h('button', { type: 'button', class: 'pn-btn sm', onclick: () => copy(r.codigos.join('\n'), 'Códigos') }, ic('copy'), 'Copiar todos'),
          h('button', { type: 'button', class: 'pn-btn sm', onclick: () => copy(msg, 'Mensagem') }, ic('copy'), 'Copiar mensagem pronta'),
          h('a', { class: 'pn-btn sm', href: 'https://wa.me/?text=' + encodeURIComponent(msg), target: '_blank', rel: 'noopener' }, ic('chat'), 'Enviar pelo WhatsApp')));
      loadList();
    });
    v.append(card('Gerar códigos', h('div', { class: 'pn-col' }, seg, fDays, fDate,
      h('details', { class: 'pn-more' }, h('summary', null, 'Mais opções (vários códigos, grupo, validade)'),
        h('div', { class: 'pn-form2' },
          fld('Quantos códigos', qtd, 'Um código diferente para cada pessoa.'),
          fld('Usos por código', usos, 'Mais de 1 cria um código de grupo (ex.: turma de residentes).'),
          fld('Rótulo', rot, 'Para você lembrar para quem foi.'),
          fld('Só para este e-mail', em, 'Opcional: o código só funciona nessa conta.'),
          fld('Resgatar até', val, 'Opcional: depois desta data o código não funciona mais.'))),
      h('div', { class: 'pn-btns' }, go), out)));

    /* lista */
    const list = h('div', { class: 'pn-list' });
    const FILT = [['ativos', 'Disponíveis'], ['usados', 'Já usados'], ['encerrados', 'Cancelados ou vencidos'], ['todos', 'Todos']];
    const chips = h('div', { class: 'pn-chips' }, FILT.map(([id, t]) => h('button', { type: 'button', class: 'pn-chip' + (CS.f === id ? ' on' : ''), onclick: e => { CS.f = id; chips.querySelectorAll('.pn-chip').forEach(c => c.classList.remove('on')); e.currentTarget.classList.add('on'); loadList(); } }, t)));
    const q = inp({ type: 'search', placeholder: 'Buscar código, rótulo ou e-mail', value: CS.q, 'aria-label': 'Buscar código' });
    let tm; q.oninput = () => { clearTimeout(tm); tm = setTimeout(() => { CS.q = q.value.trim(); loadList(); }, 250); };
    async function loadList() {
      list.innerHTML = ''; list.append(loading());
      try {
        const j = await api('admin/codigos?f=' + CS.f + '&q=' + encodeURIComponent(CS.q));
        list.innerHTML = '';
        if (!j.codigos.length) list.append(h('p', { class: 'pn-empty' }, 'Nenhum código aqui.'));
        j.codigos.forEach(c => {
          const t = Date.now();
          const state = c.revoked ? ['Cancelado', 'muted'] : c.uses >= c.max_uses ? ['Usado', 'acc'] : (c.valid_until && c.valid_until < t) || (c.mode === 'data' && c.until < t) ? ['Vencido', 'muted'] : ['Disponível', 'ok'];
          const rv = h('button', { type: 'button', class: 'pn-btn sm ' + (c.revoked ? '' : 'danger') }, c.revoked ? 'Reativar' : 'Cancelar');
          rv.onclick = () => act(rv, async () => {
            if (!c.revoked && !(await ask('Cancelar o código ' + c.code + '?', 'Ele deixa de funcionar para novos resgates. Quem já usou continua com o acesso.', 'Cancelar código', true))) return;
            await api('admin/codigo/revogar', { code: c.code, desfazer: !!c.revoked }); toast(c.revoked ? 'Código reativado.' : 'Código cancelado.', 'ok'); loadList();
          });
          const meta = [grantText(c), c.max_uses > 1 ? c.uses + ' de ' + c.max_uses + ' usos' : null, c.label, c.for_email ? 'só ' + c.for_email : null, c.valid_until ? 'resgatar até ' + fmtD(c.valid_until) : null, 'criado ' + fmtD(c.created_at)].filter(Boolean).join(' · ');
          list.append(h('div', { class: 'pn-crow' },
            h('div', { class: 'pn-crow-m' },
              h('button', { type: 'button', class: 'pn-codebtn mono', title: 'Copiar', onclick: () => copy(c.code, 'Código') }, c.code, ic('copy')),
              h('span', null, meta),
              c.quem.length ? h('div', { class: 'pn-who' }, 'Usado por: ', c.quem.map((p, i) => [i ? ', ' : '', h('a', { href: '#/usuarios/' + p.id }, p.nome)])) : null),
            h('div', { class: 'pn-crow-r' }, pill(state[0], state[1]), !(c.uses >= c.max_uses) && rv)));
        });
      } catch (e) { list.innerHTML = ''; list.append(h('div', { class: 'pn-err' }, e.message)); }
    }
    v.append(h('h2', { class: 'pn-h2' }, 'Códigos gerados'), h('label', { class: 'pn-search' }, ic('search'), q), chips, list);
    loadList();
  }

  /* ---------- Ajustes ---------- */
  async function vAjustes(v) {
    v.append(h('h1', { class: 'pn-title' }, 'Ajustes'), loading());
    let j; try { j = await api('admin/config'); } catch (e) { return errorView(v, e, () => route()); }
    v.lastChild.remove();
    const c = Object.assign({}, j.config), dirty = new Set();
    const save = h('button', { type: 'button', class: 'pn-btn pri', disabled: true }, 'Salvar ajustes');
    const mark = (k, val) => { c[k] = val; dirty.add(k); save.disabled = false; };
    const num = (k, min, max) => { const i = inp({ type: 'number', min, max, value: c[k], inputmode: 'numeric' }); i.oninput = () => mark(k, i.value); return i; };
    const txt = (k, props) => { const i = inp(Object.assign({ type: 'text', value: c[k] || '' }, props || {})); i.oninput = () => mark(k, i.value); return i; };
    const ta = h('textarea', { class: 'pn-in ta', rows: 3, maxlength: 600 }, c.aviso_sem_acesso || ''); ta.oninput = () => mark('aviso_sem_acesso', ta.value);
    save.onclick = () => act(save, async () => {
      const patch = {}; dirty.forEach(k => { patch[k] = c[k]; });
      const r = await api('admin/config', { config: patch });
      Object.assign(c, r.config); dirty.clear(); toast('Ajustes salvos.', 'ok'); route();
    });
    v.append(
      card('Acesso',
        sw('Modo visitante', c.visitante, x => mark('visitante', x), 'Botão "Entrar como visitante" libera tudo com um clique. Contas sem acesso também usam tudo enquanto estiver ligado.'),
        sw('Cadastro aberto', c.cadastro, x => mark('cadastro', x), 'Permite que novas pessoas criem conta.'),
        sw('CRM obrigatório no cadastro', c.crm_obrigatorio, x => mark('crm_obrigatorio', x), 'Desligue se quiser aceitar estudantes ou outros profissionais.'),
        h('div', { class: 'pn-form3' },
          fld('Aparelhos por conta', num('max_aparelhos', 1, 20), 'Ao entrar num aparelho a mais, o mais antigo sai. Dificulta emprestar a senha.'),
          fld('Dias offline (contas)', num('offline_dias', 1, 120), 'Tempo que o app funciona sem internet antes de pedir conexão.'),
          fld('Dias offline (visitantes)', num('offline_dias_visitante', 1, 120)))),
      card('Contato e assinatura',
        fld('WhatsApp para contato (com DDD)', txt('contato_whatsapp', { type: 'tel', placeholder: '17999999999' }), 'Aparece para quem está sem acesso e para quem esqueceu a senha.'),
        fld('Mensagem para quem está sem acesso', ta),
        h('div', { class: 'pn-form2' },
          fld('Link de assinatura', txt('assinatura_link', { type: 'url', placeholder: 'https://mpago.la/...' }), 'Opcional. Link de pagamento (Mercado Pago, PagSeguro, Stripe). Deixe vazio para não mostrar.'),
          fld('Texto do botão de assinatura', txt('assinatura_texto', { placeholder: 'Assinar por R$ 19,90 por mês' })))),
      card('E-mail', h('p', { class: 'pn-p sm' }, j.email
        ? 'Envio de e-mail configurado: quem esquece a senha recebe o link sozinho.'
        : 'Envio de e-mail não configurado: quem esquece a senha vê o botão do WhatsApp, e você gera o link na página do usuário. Para automatizar, veja o guia (seção E-mail).')),
      h('div', { class: 'pn-savebar' }, save));
  }

  /* ---------- Registro ---------- */
  function vRegistro(v) {
    const list = h('div', { class: 'pn-log big' });
    const q = inp({ type: 'search', placeholder: 'Buscar (nome, ação, código)', 'aria-label': 'Buscar no registro' });
    const more = h('button', { type: 'button', class: 'pn-btn ghost wide', hidden: true }, 'Carregar mais');
    let off = 0, tm;
    async function load(reset) {
      if (reset) { off = 0; list.innerHTML = ''; }
      try {
        const j = await api('admin/registro?off=' + off + '&q=' + encodeURIComponent(q.value.trim()));
        j.registro.forEach(r => list.append(h('div', null, h('time', null, fmtDT(r.at)),
          h('span', null, h('b', null, r.actor || 'Sistema'), ' ', r.action,
            r.target_id && r.target_name && r.target_name !== r.actor ? [' ', h('a', { href: '#/usuarios/' + r.target_id }, r.target_name)] : null,
            r.detail ? ': ' + r.detail : ''), r.place && h('small', null, r.place))));
        off += j.registro.length; more.hidden = j.registro.length < 100;
        if (!off) list.append(h('p', { class: 'pn-empty' }, 'Nada registrado.'));
      } catch (e) { list.append(h('div', { class: 'pn-err' }, e.message)); }
    }
    q.oninput = () => { clearTimeout(tm); tm = setTimeout(() => load(true), 300); };
    more.onclick = () => act(more, () => load(false));
    v.append(h('h1', { class: 'pn-title' }, 'Registro'), h('p', { class: 'pn-p' }, 'Cadastros, entradas, senhas erradas, códigos usados e tudo o que foi feito no painel.'),
      h('label', { class: 'pn-search' }, ic('search'), q), list, more);
    load(true);
  }

  boot();
})();
