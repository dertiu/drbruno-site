/* Entrada das calculadoras: confere o acesso e só então carrega o app.
   Telas: visitante, entrar, criar conta, código de acesso, esqueci a senha, nova senha, sem conexão.
   Depois de entrar, o app funciona offline por alguns dias (definido no painel). */
(function () {
  'use strict';
  const BUILD = '__BUILD__', PRE = __PRE__;
  const LIC = 'drb_lic', doc = document, DAYMS = 864e5;
  const LS = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { } }
  };
  try { doc.body.dataset.theme = LS.get('drb_theme') || 'dark'; } catch (e) { }

  let me = null, loaded = false, gateEl = null;
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
    for (let i = 2; i < arguments.length; i++) {
      const kids = [].concat(arguments[i]);
      for (const c of kids) { if (c == null || c === false) continue; el.append(c.nodeType ? c : doc.createTextNode(c)); }
    }
    return el;
  }
  const IC = {
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    back: '<path d="M15 18l-6-6 6-6"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3M15 8l2 2"/>',
    chat: '<path d="M4 20l1.5-4A8 8 0 1112 20a8 8 0 01-4-1z"/>',
    out: '<path d="M15 4h4a1 1 0 011 1v14a1 1 0 01-1 1h-4M10 17l5-5-5-5M15 12H3"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>',
    star: '<path d="M12 2.5l3 6.1 6.7 1-4.9 4.7 1.2 6.7L12 17.9l-6 3.1 1.2-6.7-4.9-4.7 6.7-1z"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1L7 17M17 7l2.1-2.1"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13 7l4 4"/>',
    walk: '<circle cx="13" cy="4" r="2"/><path d="M9 21l2-6 3 3v5M8 12l3-4 4 3 3 1M11 8l-2 5"/>'
  };
  function ic(n) {
    const s = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('class', 'ico'); s.setAttribute('aria-hidden', 'true');
    s.innerHTML = IC[n] || ''; return s;
  }
  const fmtDate = ms => new Date(ms).toLocaleDateString('pt-BR');
  const first = n => String(n || '').trim().split(/\s+/)[0] || '';
  const wa = (num, msg) => 'https://wa.me/' + String(num).replace(/\D/g, '') + (msg ? '?text=' + encodeURIComponent(msg) : '');
  function maskPhone(v) {
    let d = String(v).replace(/\D/g, '');
    if (d.length > 11 && d.slice(0, 2) === '55') d = d.slice(2);
    d = d.slice(0, 11);
    if (d.length <= 2) return d;
    if (d.length <= 6) return '(' + d.slice(0, 2) + ') ' + d.slice(2);
    if (d.length <= 10) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
    return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
  }

  /* ---------- servidor ---------- */
  async function call(path, body) {
    const ctl = 'AbortController' in window ? new AbortController() : null;
    const tm = ctl ? setTimeout(() => ctl.abort(), 12000) : null;
    let r;
    try {
      r = await fetch('/api/' + path, {
        method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin', cache: 'no-store',
        headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body), signal: ctl ? ctl.signal : undefined
      });
    } catch (e) {
      const err = new Error('Sem conexão com a internet.'); err.offline = true; throw err;
    } finally { if (tm) clearTimeout(tm); }
    let j = null; try { j = await r.json(); } catch (e) { }
    if (!r.ok || !j || j.ok === false) { const err = new Error((j && j.erro) || 'Erro ' + r.status + '. Tente de novo.'); err.status = r.status; throw err; }
    return j;
  }

  /* ---------- licença para uso offline ---------- */
  function saveLic(j) {
    if (!j || !j.acesso || !j.acesso.ok) { LS.del(LIC); return; }
    const old = LS.get(LIC) || {}, t = Date.now();
    let span = (j.offline_dias || 7) * DAYMS;
    if (j.acesso.ate && j.agora) span = Math.min(span, j.acesso.ate - j.agora);
    LS.set(LIC, {
      ok: true, off: t + span, tipo: j.acesso.tipo, ate: j.acesso.ate || null,
      nome: j.usuario ? j.usuario.nome : '', email: j.usuario ? j.usuario.email : '', admin: !!(j.usuario && j.usuario.admin),
      b: old.b || null, w: old.w || 0
    });
  }
  const licValid = () => { const l = LS.get(LIC); return l && l.ok && l.off > Date.now() ? l : null; };

  /* ---------- service worker: cache do app para o plantão ---------- */
  function regSW() {
    if (!('serviceWorker' in navigator) || location.protocol.indexOf('http') !== 0) return;
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(() => { });
  }
  function swMsg(msg) {
    if (!('serviceWorker' in navigator)) return Promise.resolve(null);
    return navigator.serviceWorker.ready.then(reg => new Promise(res => {
      const ch = new MessageChannel(); const tm = setTimeout(() => res(null), 60000);
      ch.port1.onmessage = ev => { clearTimeout(tm); res(ev.data); };
      (reg.active || navigator.serviceWorker.controller).postMessage(msg, [ch.port2]);
    })).catch(() => null);
  }
  function warm(force) {
    const l = LS.get(LIC); if (!l) return;
    if (!force && l.b === BUILD && Date.now() - (l.w || 0) < DAYMS) return;
    swMsg({ t: 'warm' }).then(r => { if (r && r.ok) { const x = LS.get(LIC); if (x) { x.b = BUILD; x.w = Date.now(); LS.set(LIC, x); } } });
  }
  function purge() {
    swMsg({ t: 'purge' });
    try { if (window.caches) caches.delete('prot-v1'); } catch (e) { }
  }

  /* ---------- carregar o app ---------- */
  function loadApp() {
    if (loaded) return;
    loaded = true; closeGate(); doc.body.classList.remove('gate-on');
    window.DRB_HOOKS = { sideHead };
    const files = PRE.concat(['app.js']);
    (function next(i) {
      if (i >= files.length) return;
      const s = doc.createElement('script'); s.src = files[i];
      s.onload = () => next(i + 1);
      s.onerror = () => {
        loaded = false; doc.body.classList.add('gate-on');
        if (navigator.onLine === false) { show('offline'); return; }
        LS.del(LIC); show('carregando'); check();
      };
      doc.body.append(s);
    })(0);
  }

  async function check() {
    try {
      const j = await call('eu');
      apply(j);
    } catch (e) {
      if (loaded) return;
      if (licValid() && (e.offline || e.status >= 500)) { loadApp(); return; }
      show(e.offline ? 'offline' : 'erro', { msg: e.message });
    }
  }
  function apply(j) {
    me = j;
    if (j.acesso && j.acesso.ok) {
      const had = LS.get(LIC);
      saveLic(j);
      warm(!had || had.tipo !== j.acesso.tipo);
      if (!loaded) { loadApp(); return; }
      closeGate();
      // só redesenha o menu se algo da conta mudou (evita voltar ao topo a cada abertura)
      if (!had || had.tipo !== j.acesso.tipo || had.nome !== (j.usuario ? j.usuario.nome : '')) refreshSide();
      return;
    }
    LS.del(LIC); purge();
    if (loaded) { location.reload(); return; }
    show(j.logado && j.tipo === 'user' ? 'sem_acesso' : 'inicio');
  }
  function refreshSide() { try { window.dispatchEvent(new HashChangeEvent('hashchange')); } catch (e) { } }

  /* ---------- telas ---------- */
  function closeGate() { if (gateEl) { gateEl.remove(); gateEl = null; } doc.body.classList.remove('gate-open'); }
  function frame(content, opts) {
    closeGate();
    gateEl = h('div', { class: 'gt-w', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Acesso às calculadoras' });
    const card = h('div', { class: 'gt-card' });
    if (loaded && !(opts && opts.noClose)) card.append(h('button', { type: 'button', class: 'gt-x', 'aria-label': 'Fechar', onclick: closeGate }, ic('x')));
    card.append(h('div', { class: 'gt-brand' }, h('img', { src: 'icon.svg', alt: '', width: 48, height: 48 }),
      h('div', null, h('b', null, 'Calculadoras de plantão'), h('span', null, 'Dr. Bruno Michels'))));
    card.append(content);
    gateEl.append(card);
    doc.body.append(gateEl); doc.body.classList.add('gate-open');
    const f = gateEl.querySelector('input:not([type=checkbox])'); if (f && window.innerWidth > 700) setTimeout(() => f.focus(), 30);
  }
  const cfg = () => (me && me.config) || {};
  const errBox = () => h('div', { class: 'gt-err', role: 'alert', hidden: true });
  const setErr = (box, msg) => { box.textContent = msg || ''; box.hidden = !msg; };
  function field(label, input, hint) { return h('label', { class: 'gt-f' }, h('span', null, label), input, hint ? h('small', null, hint) : null); }
  function input(props) { return h('input', Object.assign({ class: 'gt-in' }, props)); }
  function pwField(label, auto, id) {
    const i = input({ type: 'password', autocomplete: auto, required: true, minlength: 8, id, name: id });
    const b = h('button', { type: 'button', class: 'gt-eye', 'aria-label': 'Mostrar senha', onclick: () => { i.type = i.type === 'password' ? 'text' : 'password'; } }, ic('eye'));
    return { el: h('label', { class: 'gt-f' }, h('span', null, label), h('div', { class: 'gt-pw' }, i, b)), input: i };
  }
  async function busy(btn, fn) {
    if (btn.disabled) return;
    const txt = btn.innerHTML; btn.disabled = true; btn.textContent = 'Aguarde…';
    try { await fn(); } finally { if (btn.isConnected) { btn.disabled = false; btn.innerHTML = txt; } }
  }
  const back = (to, label) => h('button', { type: 'button', class: 'gt-back', onclick: () => show(to) }, ic('back'), label || 'Voltar');

  function show(name, data) {
    data = data || {};
    const c = cfg();
    if (name === 'carregando') return frame(h('div', { class: 'gt-load' }, h('div', { class: 'gt-spin' }), h('p', { class: 'gt-p' }, 'Conferindo seu acesso…')), { noClose: true });
    if (name === 'offline') return frame(h('div', { class: 'gt-col' },
      h('h1', { class: 'gt-h' }, 'Sem conexão'),
      h('p', { class: 'gt-p' }, 'Para usar sem internet, abra o app uma vez com internet depois de entrar na sua conta. Assim as calculadoras ficam guardadas no aparelho.'),
      h('button', { type: 'button', class: 'gt-btn pri', onclick: () => { show('carregando'); check(); } }, 'Tentar de novo')), { noClose: true });
    if (name === 'erro') return frame(h('div', { class: 'gt-col' },
      h('h1', { class: 'gt-h' }, 'Não foi possível conferir o acesso'),
      h('p', { class: 'gt-p' }, data.msg || 'Tente de novo em instantes.'),
      h('button', { type: 'button', class: 'gt-btn pri', onclick: () => { show('carregando'); check(); } }, 'Tentar de novo')), { noClose: true });

    if (name === 'inicio') {
      const err = errBox();
      const em = input({ type: 'email', autocomplete: 'username', inputmode: 'email', required: true, id: 'gt-email', name: 'email', placeholder: 'seu@email.com' });
      const pw = pwField('Senha', 'current-password', 'gt-senha');
      const go = h('button', { type: 'submit', class: 'gt-btn' + (c.visitante ? '' : ' pri') }, 'Entrar');
      const form = h('form', { class: 'gt-col', novalidate: true, onsubmit: e => {
        e.preventDefault(); setErr(err);
        if (!em.value.trim() || !pw.input.value) { setErr(err, 'Digite e-mail e senha.'); return; }
        busy(go, async () => { try { apply(await call('entrar', { email: em.value, senha: pw.input.value })); } catch (x) { setErr(err, x.message); } });
      } }, field('E-mail', em), pw.el, err, go);
      const visErr = errBox();
      const vis = c.visitante && h('button', { type: 'button', class: 'gt-btn pri big', onclick: e => busy(e.currentTarget, async () => {
        try { apply(await call('visitante', {})); } catch (x) { setErr(visErr, x.message); }
      }) }, h('span', { class: 'gt-bl' }, ic('walk'), 'Entrar como visitante'), h('small', null, 'Acesso liberado, sem cadastro'));
      const ended = me && me.tipo === 'visitante' && !c.visitante;
      return frame(h('div', { class: 'gt-col' },
        ended && h('div', { class: 'gt-info' }, 'O acesso de visitante foi encerrado. Crie sua conta ou entre para continuar.'),
        vis, vis && visErr,
        h('div', { class: c.visitante ? 'gt-or' : 'gt-h2' }, c.visitante ? 'ou entre com sua conta' : 'Entre com sua conta'),
        form,
        h('div', { class: 'gt-links' },
          h('button', { type: 'button', class: 'gt-link', onclick: () => show('esqueci', { email: em.value }) }, 'Esqueci a senha')),
        c.cadastro && h('div', { class: 'gt-sep' }),
        c.cadastro && h('button', { type: 'button', class: 'gt-btn ghost', onclick: () => show('cadastro', { email: em.value }) }, 'Criar conta'),
        me && me.setup && h('a', { class: 'gt-link sm', href: '/painel/' }, 'Configurar o administrador do site')));
    }

    if (name === 'cadastro') {
      const err = errBox();
      const nome = input({ type: 'text', autocomplete: 'name', required: true, id: 'gt-nome', name: 'nome', autocapitalize: 'words' });
      const em = input({ type: 'email', autocomplete: 'email', inputmode: 'email', required: true, id: 'gt-cemail', name: 'email', value: data.email || '' });
      const pw = pwField('Crie uma senha', 'new-password', 'gt-csenha');
      const crm = input({ type: 'text', inputmode: 'numeric', autocomplete: 'off', id: 'gt-crm', name: 'crm', maxlength: 8, oninput: e => { e.target.value = e.target.value.replace(/\D/g, ''); } });
      const uf = h('select', { class: 'gt-in', id: 'gt-uf', name: 'uf', 'aria-label': 'UF do CRM' }, h('option', { value: '' }, 'UF'), UFS.map(u => h('option', { value: u, selected: u === 'SP' }, u)));
      const tel = input({ type: 'tel', inputmode: 'tel', autocomplete: 'tel-national', id: 'gt-tel', name: 'whatsapp', placeholder: '(17) 99999-9999', oninput: e => { e.target.value = maskPhone(e.target.value); } });
      const code = input({ type: 'text', autocomplete: 'off', autocapitalize: 'characters', id: 'gt-code', name: 'codigo', placeholder: 'Ex.: K7QM-4XPA', spellcheck: 'false' });
      const codeBox = h('div', { class: 'gt-code', hidden: !data.codigo }, field('Código de acesso', code));
      if (data.codigo) code.value = data.codigo;
      const codeBtn = h('button', { type: 'button', class: 'gt-link sm', hidden: !!data.codigo, onclick: e => { codeBox.hidden = false; e.currentTarget.hidden = true; code.focus(); } }, 'Tenho um código de acesso');
      const go = h('button', { type: 'submit', class: 'gt-btn pri' }, 'Criar conta');
      const crmLabel = 'CRM' + (c.crm_obrigatorio ? '' : ' (opcional)');
      const form = h('form', { class: 'gt-col', novalidate: true, onsubmit: e => {
        e.preventDefault(); setErr(err);
        const body = { nome: nome.value, email: em.value, senha: pw.input.value, crm: crm.value, uf: crm.value ? uf.value : '', whatsapp: tel.value, codigo: code.value };
        if (nome.value.trim().length < 3) return setErr(err, 'Digite seu nome completo.');
        if (!/\S+@\S+\.\S+/.test(em.value)) return setErr(err, 'Digite um e-mail válido.');
        if (pw.input.value.length < 8) return setErr(err, 'A senha precisa ter pelo menos 8 caracteres.');
        if (c.crm_obrigatorio && crm.value.length < 3) return setErr(err, 'Digite o número do CRM.');
        if (tel.value.replace(/\D/g, '').length < 10) return setErr(err, 'Digite o WhatsApp com DDD.');
        busy(go, async () => {
          try { const j = await call('cadastro', body); if (j.aviso) alertMsg('Conta criada. O código não foi aplicado: ' + j.aviso); apply(j); }
          catch (x) { setErr(err, x.message); }
        });
      } },
        field('Nome completo', nome), field('E-mail', em), pw.el,
        h('div', { class: 'gt-row' }, field(crmLabel, crm), h('label', { class: 'gt-f' }, h('span', null, 'UF'), uf)),
        field('WhatsApp', tel), codeBtn, codeBox, err, go,
        h('p', { class: 'gt-note' }, 'Seus dados servem só para controlar o acesso às calculadoras e para contato sobre a sua conta.'));
      return frame(h('div', { class: 'gt-col' }, back('inicio', 'Entrar'), h('h1', { class: 'gt-h' }, 'Criar conta'),
        h('p', { class: 'gt-p' }, 'Leva menos de um minuto.'), form));
    }

    if (name === 'sem_acesso') {
      const u = (me && me.usuario) || {}, a = (me && me.acesso) || {};
      if (a.motivo === 'bloqueado') return frame(h('div', { class: 'gt-col' },
        h('h1', { class: 'gt-h' }, 'Conta bloqueada'),
        h('p', { class: 'gt-p' }, 'Fale com o administrador para entender o que aconteceu.'),
        c.contato_whatsapp && h('a', { class: 'gt-btn', href: wa(c.contato_whatsapp, 'Olá! Minha conta nas calculadoras (' + u.email + ') aparece como bloqueada.'), target: '_blank', rel: 'noopener' }, ic('chat'), 'Falar pelo WhatsApp'),
        h('button', { type: 'button', class: 'gt-link', onclick: logout }, 'Sair da conta')), { noClose: true });
      const err = errBox();
      const code = input({ type: 'text', autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false', placeholder: 'Ex.: K7QM-4XPA', id: 'gt-rcode', name: 'codigo' });
      const go = h('button', { type: 'submit', class: 'gt-btn pri' }, ic('key'), 'Liberar acesso');
      const msg = a.motivo === 'expirou' && a.ate ? 'Seu acesso terminou em ' + fmtDate(a.ate) + '. Use um novo código ou fale comigo para renovar.' : (c.aviso_sem_acesso || 'Sua conta ainda não tem acesso liberado.');
      return frame(h('div', { class: 'gt-col' },
        h('h1', { class: 'gt-h' }, 'Olá, ' + first(u.nome) + '!'),
        h('p', { class: 'gt-p' }, msg),
        h('form', { class: 'gt-col', novalidate: true, onsubmit: e => {
          e.preventDefault(); setErr(err);
          if (code.value.replace(/\W/g, '').length < 6) return setErr(err, 'Digite o código completo.');
          busy(go, async () => { try { apply(await call('resgatar', { codigo: code.value })); } catch (x) { setErr(err, x.message); } });
        } }, field('Código de acesso', code), err, go),
        c.assinatura_link && h('a', { class: 'gt-btn', href: c.assinatura_link, target: '_blank', rel: 'noopener' }, ic('star'), c.assinatura_texto || 'Assinar'),
        c.contato_whatsapp && h('a', { class: 'gt-btn ghost', href: wa(c.contato_whatsapp, 'Olá, Dr. Bruno! Criei minha conta nas calculadoras (' + u.email + ') e gostaria de pedir acesso.'), target: '_blank', rel: 'noopener' }, ic('chat'), 'Pedir acesso pelo WhatsApp'),
        h('div', { class: 'gt-links' }, h('span', { class: 'gt-who' }, u.email), h('button', { type: 'button', class: 'gt-link', onclick: logout }, 'Sair'))), { noClose: true });
    }

    if (name === 'esqueci') {
      const err = errBox(), ok = h('div', { class: 'gt-okb', hidden: true });
      const em = input({ type: 'email', autocomplete: 'username', inputmode: 'email', id: 'gt-femail', name: 'email', value: data.email || '' });
      const go = h('button', { type: 'submit', class: 'gt-btn pri' }, 'Enviar link para nova senha');
      const box = h('div', { class: 'gt-col' });
      const form = h('form', { class: 'gt-col', novalidate: true, onsubmit: e => {
        e.preventDefault(); setErr(err);
        if (!/\S+@\S+\.\S+/.test(em.value)) return setErr(err, 'Digite seu e-mail.');
        busy(go, async () => {
          try {
            const j = await call('senha/esqueci', { email: em.value });
            form.hidden = true; ok.hidden = false; ok.innerHTML = '';
            if (j.email) ok.append('Se houver uma conta com este e-mail, você vai receber um link em instantes. Confira também a caixa de spam.');
            else {
              ok.append('Para criar uma nova senha, fale comigo pelo WhatsApp que eu envio um link.');
              if (j.contato) box.append(h('a', { class: 'gt-btn', href: wa(j.contato, 'Olá, Dr. Bruno! Esqueci a senha das calculadoras. Meu e-mail: ' + em.value), target: '_blank', rel: 'noopener' }, ic('chat'), 'Pedir nova senha pelo WhatsApp'));
            }
          } catch (x) { setErr(err, x.message); }
        });
      } }, field('E-mail da conta', em), err, go);
      box.append(back('inicio'), h('h1', { class: 'gt-h' }, 'Esqueci a senha'), form, ok);
      return frame(box);
    }

    if (name === 'redefinir') {
      const err = errBox();
      const pw = pwField('Nova senha', 'new-password', 'gt-nsenha');
      const pw2 = pwField('Repita a nova senha', 'new-password', 'gt-nsenha2');
      const go = h('button', { type: 'submit', class: 'gt-btn pri' }, 'Salvar e entrar');
      return frame(h('div', { class: 'gt-col' },
        h('h1', { class: 'gt-h' }, 'Criar nova senha'),
        data.email && h('p', { class: 'gt-p' }, 'Conta: ' + data.email),
        h('form', { class: 'gt-col', novalidate: true, onsubmit: e => {
          e.preventDefault(); setErr(err);
          if (pw.input.value.length < 8) return setErr(err, 'A senha precisa ter pelo menos 8 caracteres.');
          if (pw.input.value !== pw2.input.value) return setErr(err, 'As duas senhas não são iguais.');
          busy(go, async () => { try { apply(await call('senha/redefinir', { token: data.token, senha: pw.input.value })); } catch (x) { setErr(err, x.message); } });
        } }, h('input', { type: 'email', autocomplete: 'username', value: data.email || '', hidden: true, readonly: true }), pw.el, pw2.el, err, go)), { noClose: true });
    }
  }
  function alertMsg(m) { try { window.alert(m); } catch (e) { } }

  async function logout() {
    try { await call('sair', {}); } catch (e) { }
    LS.del(LIC); purge();
    location.replace(location.pathname);
  }

  /* ---------- "Minha conta" no menu lateral do app ---------- */
  function accessLine() {
    const a = me && me.acesso, l = LS.get(LIC) || {};
    const tipo = a ? a.tipo : l.tipo, ate = a ? a.ate : l.ate;
    if (tipo === 'admin') return 'Administrador';
    if (tipo === 'vitalicio') return 'Acesso vitalício';
    if (tipo === 'periodo' && ate) return 'Acesso até ' + fmtDate(ate);
    if (tipo === 'visitante') return 'Acesso de visitante';
    if (tipo === 'aberto') return 'Acesso livre (período aberto)';
    return '';
  }
  function sideHead() {
    const l = LS.get(LIC) || {}, u = me && me.usuario, vis = (me ? me.tipo === 'visitante' : l.tipo === 'visitante');
    const nome = vis ? 'Visitante' : (u ? u.nome : l.nome) || 'Minha conta';
    const sub = vis ? 'Toque para criar sua conta' : accessLine();
    return h('button', { type: 'button', class: 'gt-side' + (vis ? ' vis' : ''), onclick: openAccount, 'aria-label': 'Minha conta' },
      h('span', { class: 'gt-av' }, ic('user')), h('span', { class: 'gt-side-t' }, h('b', null, nome), sub && h('small', null, sub)));
  }
  function openAccount() {
    doc.body.classList.remove('side-open');
    const l = LS.get(LIC) || {}, u = me && me.usuario, vis = me ? me.tipo === 'visitante' : l.tipo === 'visitante';
    const admin = u ? u.admin : l.admin;
    const wrap = h('div', { class: 'sheet-w', onclick: e => { if (e.target === wrap) close(); } });
    const sheet = h('div', { class: 'sheet gt-acc', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Minha conta' });
    function close() { wrap.remove(); doc.body.classList.remove('sheet-open'); doc.removeEventListener('keydown', esc); }
    const esc = e => { if (e.key === 'Escape') close(); };
    doc.addEventListener('keydown', esc);
    sheet.append(h('div', { class: 'gt-acc-h' },
      h('div', null, h('b', null, vis ? 'Visitante' : (u ? u.nome : l.nome) || 'Minha conta'), h('span', null, vis ? 'Sem cadastro' : (u ? u.email : l.email) || '')),
      h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Fechar', onclick: close }, ic('x'))));
    const line = accessLine();
    if (line) sheet.append(h('div', { class: 'gt-pill' + (vis ? ' warn' : '') }, line));
    if (!me) sheet.append(h('p', { class: 'gt-p sm' }, 'Sem conexão agora. As opções da conta aparecem quando a internet voltar.'));
    if (vis) {
      sheet.append(h('p', { class: 'gt-p' }, 'Crie sua conta para continuar usando quando o acesso de visitante acabar. É rápido.'),
        h('button', { type: 'button', class: 'gt-btn pri', onclick: () => { close(); show('cadastro'); } }, 'Criar minha conta'),
        h('button', { type: 'button', class: 'gt-btn ghost', onclick: () => { close(); show('inicio'); } }, 'Já tenho conta: entrar'));
    } else if (me && u) {
      const err = errBox(), ok = h('div', { class: 'gt-okb', hidden: true });
      const code = input({ type: 'text', autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false', placeholder: 'Código de acesso', 'aria-label': 'Código de acesso' });
      const go = h('button', { type: 'submit', class: 'gt-btn' }, ic('key'), 'Usar');
      sheet.append(h('form', { class: 'gt-inline', novalidate: true, onsubmit: e => {
        e.preventDefault(); setErr(err); ok.hidden = true;
        if (code.value.replace(/\W/g, '').length < 6) return setErr(err, 'Digite o código completo.');
        busy(go, async () => { try { const j = await call('resgatar', { codigo: code.value }); apply(j); close(); openAccount(); } catch (x) { setErr(err, x.message); } });
      } }, code, go), err, ok);
      const pwBox = h('div', { class: 'gt-col', hidden: true });
      const p1 = pwField('Senha atual', 'current-password', 'gt-pa'), p2 = pwField('Nova senha', 'new-password', 'gt-pn');
      const perr = errBox(), pok = h('div', { class: 'gt-okb', hidden: true }), pgo = h('button', { type: 'submit', class: 'gt-btn pri' }, 'Trocar senha');
      pwBox.append(h('form', { class: 'gt-col', novalidate: true, onsubmit: e => {
        e.preventDefault(); setErr(perr); pok.hidden = true;
        if (p2.input.value.length < 8) return setErr(perr, 'A nova senha precisa ter pelo menos 8 caracteres.');
        busy(pgo, async () => { try { await call('senha/trocar', { atual: p1.input.value, nova: p2.input.value }); pok.hidden = false; pok.textContent = 'Senha alterada. Os outros aparelhos foram desconectados.'; p1.input.value = p2.input.value = ''; } catch (x) { setErr(perr, x.message); } });
      } }, h('input', { type: 'email', autocomplete: 'username', value: u.email, hidden: true, readonly: true }), p1.el, p2.el, perr, pok, pgo));
      sheet.append(h('div', { class: 'gt-acts' },
        h('button', { type: 'button', class: 'gt-btn ghost', onclick: () => { pwBox.hidden = !pwBox.hidden; } }, ic('lock'), 'Trocar senha'),
        admin && h('a', { class: 'gt-btn ghost', href: '/painel/' }, ic('gear'), 'Painel de usuários'),
        admin && h('a', { class: 'gt-btn ghost', href: 'admin.html' }, ic('edit'), 'Editor de conteúdo')), pwBox);
    }
    sheet.append(h('button', { type: 'button', class: 'gt-btn ghost danger', onclick: logout }, ic('out'), vis ? 'Sair do modo visitante' : 'Sair da conta'));
    wrap.append(sheet); doc.body.append(wrap); doc.body.classList.add('sheet-open');
  }

  /* ---------- início ---------- */
  function start() {
    regSW();
    const tk = (location.hash.match(/^#redefinir=([\w-]{20,})/) || [])[1];
    if (tk) {
      history.replaceState(null, '', location.pathname + location.search);
      show('carregando');
      call('senha/verificar', { token: tk }).then(j => show('redefinir', { token: tk, email: j.email }), e => {
        show('erro', { msg: e.message });
      });
      call('eu').then(j => { me = j; }, () => { });
      return;
    }
    if (licValid()) { loadApp(); check(); return; }
    show('carregando'); check();
  }
  start();
})();
