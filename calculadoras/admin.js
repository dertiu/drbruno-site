/* Painel do editor, versão 2: receitas, descrições cirúrgicas, diluições e aviso.
   Os colegas usam o site sem login. A senha abre o painel; o botão Publicar grava no GitHub com a chave do editor,
   guardada só no aparelho dele e cifrada com a senha. Tudo o que é editado fica como rascunho no aparelho
   (apenas as diferenças) até publicar. Ao publicar, o painel lê a versão mais nova do site e aplica as diferenças
   sobre ela, para nunca apagar alterações feitas em outro aparelho. */
(function () {
  'use strict';
  const D = window.DRB, u = D.u, h = u.h;
  const root = document.getElementById('ad');
  try { document.body.dataset.theme = JSON.parse(localStorage.getItem('drb_theme') || '"dark"'); } catch (e) { }

  /* ---------- ícones ---------- */
  const P = {
    home: '<path d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10"/>',
    rx: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/>',
    clip: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h4"/>',
    drop: '<path d="M12 3s6 6.5 6 11a6 6 0 01-12 0c0-4.5 6-11 6-11z"/>',
    bell: '<path d="M6 16v-5a6 6 0 0112 0v5l2 2H4z"/><path d="M10 21h4"/>',
    hist: '<path d="M3 12a9 9 0 109-9 9 9 0 00-6.4 2.6L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/>',
    ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    dup: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 012-2h10"/>',
    undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 010 10h-3"/>',
    up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
    dn: '<path d="M12 5v14M6 13l6 6 6-6"/>',
    more: '<circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none"/>',
    out: '<path d="M15 4h4a1 1 0 011 1v14a1 1 0 01-1 1h-4M10 17l5-5-5-5M15 12H3"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    upload: '<path d="M12 15V3M7 8l5-5 5 5M4 21h16"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/>',
    tags: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.3"/>'
  };
  function ic(n, size) {
    if (!P[n]) return u.icon(n, false, size);
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('class', 'ico'); s.setAttribute('aria-hidden', 'true');
    if (size) s.style.width = s.style.height = size + 'px';
    s.innerHTML = P[n];
    return s;
  }

  /* ---------- senha e sessão ---------- */
  const SALT = 'b44916b6c2580307493157d5d9e683e3', VER = '1029be47d6dbcbea5de139b10f1b8639ea0f11e62c411e662de7eb96c83fbeaf', ITER = 600000;
  const SKEY = 'drb_adm_k', TK = 'drb_adm_t', FK = 'drb_adm_fail', IDLE = 30 * 60 * 1000;
  const hex = b => Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join('');
  const unhex = s => new Uint8Array(s.match(/../g).map(x => parseInt(x, 16)));
  const subtle = window.crypto && crypto.subtle;
  async function derive(pw) {
    const base = await subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']);
    return new Uint8Array(await subtle.deriveBits({ name: 'PBKDF2', salt: unhex(SALT), iterations: ITER, hash: 'SHA-256' }, base, 256));
  }
  const verOf = async raw => hex(await subtle.digest('SHA-256', raw));
  const ss = { get: k => { try { return sessionStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) { } }, del: k => { try { sessionStorage.removeItem(k); } catch (e) { } } };

  if (!subtle) {
    if (location.protocol === 'http:' && !/^(localhost|127\.)/.test(location.hostname)) { location.replace('https://' + location.host + location.pathname); return; }
    root.append(h('div', { class: 'ad-login' }, h('div', { class: 'ad-login-card' }, h('h1', null, 'Navegador sem suporte'), h('p', null, 'Abra o painel em um navegador atualizado, pelo endereço com https.'))));
    return;
  }
  let rawKey = null;
  { const s = ss.get(SKEY); if (s) rawKey = unhex(s); }
  { const t = +(ss.get(TK) || 0); if (rawKey && t && Date.now() - t > IDLE) { ss.del(SKEY); ss.del(TK); rawKey = null; } }
  if (!rawKey) { login(); return; }

  function login() {
    const inp = h('input', { type: 'password', class: 'ad-in', autocomplete: 'current-password', placeholder: 'Senha do editor', 'aria-label': 'Senha' });
    const eye = h('button', { type: 'button', class: 'ad-ib', 'aria-label': 'Mostrar senha', onclick: () => { inp.type = inp.type === 'password' ? 'text' : 'password'; inp.focus(); } }, ic('eye'));
    const err = h('p', { class: 'ad-err', role: 'alert' });
    const btn = h('button', { type: 'submit', class: 'ad-btn pri' }, 'Entrar');
    const go = async e => {
      if (e) e.preventDefault();
      if (!inp.value) { inp.focus(); return; }
      let f = u.LS(FK, {});
      if (f.until && Date.now() < f.until) { err.textContent = `Muitas tentativas erradas. Aguarde ${Math.ceil((f.until - Date.now()) / 1000)} s.`; return; }
      btn.disabled = true; btn.textContent = 'Conferindo…'; err.textContent = '';
      try {
        const raw = await derive(inp.value);
        if (await verOf(raw) === VER) { try { localStorage.removeItem(FK); } catch (x) { } ss.set(SKEY, hex(raw)); ss.set(TK, String(Date.now())); location.reload(); return; }
        f.n = (f.n || 0) + 1; if (f.n >= 5) f.until = Date.now() + 60000 * Math.pow(2, f.n - 5);
        u.SAVE(FK, f);
        err.textContent = f.until && f.n >= 5 ? 'Senha incorreta. Painel bloqueado por alguns minutos.' : 'Senha incorreta.'; inp.select();
      } catch (x) { err.textContent = 'Erro ao conferir a senha: ' + x.message; }
      btn.disabled = false; btn.textContent = 'Entrar';
    };
    root.append(h('div', { class: 'ad-login' }, h('form', { class: 'ad-login-card', onsubmit: go },
      h('div', { class: 'ad-login-logo' }, ic('lock')),
      h('div', null, h('h1', null, 'Painel do editor'), h('p', null, 'Calculadoras de plantão')),
      h('label', { class: 'ad-f' }, h('span', null, 'Senha'), h('div', { class: 'ad-unit' }, inp, eye)),
      btn, err,
      h('a', { class: 'ad-login-back', href: './' }, 'Voltar às calculadoras'))));
    setTimeout(() => inp.focus(), 50);
  }

  let lastAct = Date.now();
  ['pointerdown', 'keydown', 'touchstart', 'scroll'].forEach(ev => addEventListener(ev, () => { lastAct = Date.now(); ss.set(TK, String(lastAct)); }, { passive: true }));
  setInterval(() => { if (Date.now() - lastAct > IDLE) logout(); }, 30000);
  function logout() { ss.del(SKEY); ss.del(TK); location.reload(); }

  /* ---------- chave do GitHub (cifrada com a senha, só neste aparelho) ---------- */
  const CFG = 'drb_admin_cfg';
  const cfg = Object.assign({ repo: 'dertiu/drbruno-site', branch: 'main', tokenEnc: null }, u.LS(CFG, {}));
  const saveCfg = () => { const c = Object.assign({}, cfg); delete c.token; delete c.path; u.SAVE(CFG, c); };
  const aesP = subtle.importKey('raw', rawKey, 'AES-GCM', false, ['encrypt', 'decrypt']);
  async function setToken(t) {
    cfg.token = t || '';
    if (t) { const iv = crypto.getRandomValues(new Uint8Array(12)); cfg.tokenEnc = { iv: hex(iv), ct: hex(await subtle.encrypt({ name: 'AES-GCM', iv }, await aesP, new TextEncoder().encode(t))) }; }
    else cfg.tokenEnc = null;
    saveCfg();
  }
  const ready = (async () => {
    if (cfg.token) { await setToken(cfg.token); return; }
    if (cfg.tokenEnc) {
      try { cfg.token = new TextDecoder().decode(await subtle.decrypt({ name: 'AES-GCM', iv: unhex(cfg.tokenEnc.iv) }, await aesP, unhex(cfg.tokenEnc.ct))); }
      catch (e) { cfg.token = ''; }
    }
  })();

  /* ---------- utilitários ---------- */
  const clone = o => o === undefined ? undefined : JSON.parse(JSON.stringify(o));
  const stable = v => JSON.stringify(v, (k, x) => x && typeof x === 'object' && !Array.isArray(x) ? Object.keys(x).sort().reduce((o, k2) => { o[k2] = x[k2]; return o; }, {}) : x);
  const slug = (s, n) => u.norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, n || 50) || 'item';
  const uniq = (list, id) => { let x = id, i = 2; while (list.some(r => r.id === x)) x = id + '-' + i++; return x; };
  const plural = (n, a, b) => n + ' ' + (n === 1 ? a : b);
  const fmtDate = s => { const d = new Date(s); return d.toLocaleDateString('pt-BR') + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); };
  const VIA = D.rx.VIA, fill = D.rx.fill;
  const viaLabel = k => { const s = VIA[k].replace(/^USO /, '').toLowerCase(); return s.charAt(0).toUpperCase() + s.slice(1); };
  const fits = (it, c) => {
    const m = /^(idade|peso)(<=|>=|<|>)([\d.]+)$/.exec(it.se || ''); if (!m) return true;
    const v = m[1] === 'idade' ? c.age : c.kg, n = +m[3]; if (!(v >= 0) || (m[1] === 'peso' && !(v > 0))) return true;
    return m[2] === '<' ? v < n : m[2] === '<=' ? v <= n : m[2] === '>' ? v > n : v >= n;
  };
  // deixa o campo opcional fora do registro quando vazio, para não marcar como alterado à toa
  const setOpt = (o, k, v) => { if (v === '' || v == null || v === false || (Array.isArray(v) && !v.length)) delete o[k]; else o[k] = v; };
  const marked = s => String(s || '').split(/(_{3,})/).map(p => /^_{3,}$/.test(p) ? h('mark', null, p) : p);
  const grow = t => { if (!t.isConnected) return; t.style.height = 'auto'; t.style.height = (t.scrollHeight + 3) + 'px'; };

  /* ---------- arquivos de dados ---------- */
  const F = {
    dados: {
      key: 'dados', path: 'calculadoras/dados.js', local: 'dados.js',
      schema: { receitas: 'list', cats: 'olist', inf: 'map', aviso: 'val', estatisticas: 'val' },
      norm: o => { o.cats = o.cats || []; o.receitas = o.receitas || []; o.inf = o.inf || {}; o.aviso = o.aviso || ''; o.estatisticas = o.estatisticas || ''; return o; },
      text: d => { const o = clone(d); o.atualizado = u.today(); return '/* Dados editáveis pelo painel do editor (admin.html). Não editar à mão se for usar o painel. */\nwindow.DRB_DATA = ' + JSON.stringify(o, null, 1) + ';\n'; }
    },
    desc: {
      key: 'desc', path: 'calculadoras/descricoes.js', local: 'descricoes.js',
      schema: { m: 'list', cats: 'olist' },
      norm: o => { o.cats = o.cats || []; o.m = o.m || []; return o; },
      text: d => '/* Descrições cirúrgicas: modelos por procedimento e autor. Editável pelo painel do editor (admin.html). */\nwindow.DRB_DESC = {"atualizado":' + JSON.stringify(u.today()) + ',"cats":' + JSON.stringify(d.cats) + ',"m":[\n' + d.m.map(m => JSON.stringify(m)).join(',\n') + '\n]};\n'
    }
  };
  const parseFile = txt => JSON.parse(txt.slice(txt.indexOf('{'), txt.lastIndexOf('}') + 1));
  const noDate = o => { const c = Object.assign({}, o); delete c.atualizado; return stable(c); };
  function setBase(f, obj) {
    f.base = obj; f.bs = new Map();
    for (const k in f.schema) if (f.schema[k] !== 'val' && f.schema[k] !== 'map') (obj[k] || []).forEach(x => f.bs.set(k + '|' + x.id, stable(x)));
  }
  // estado de um registro em relação ao que está publicado: 'new', 'edit' ou null
  const stateOf = (f, k, x) => { const b = f.bs.get(k + '|' + x.id); return b === undefined ? 'new' : b !== stable(x) ? 'edit' : null; };

  // diferenças entre o publicado e o rascunho (é só isso que fica guardado no aparelho)
  function diff(f) {
    const b = f.base, d = f.data, p = {};
    for (const k in f.schema) {
      const t = f.schema[k];
      if (t === 'val') { if ((b[k] || '') !== (d[k] || '')) p[k] = d[k]; }
      else if (t === 'map') {
        const bm = b[k] || {}, dm = d[k] || {}, o = {};
        new Set(Object.keys(bm).concat(Object.keys(dm))).forEach(id => { if (stable(bm[id]) !== stable(dm[id])) o[id] = dm[id] === undefined ? null : dm[id]; });
        if (Object.keys(o).length) p[k] = o;
      } else {
        const bl = b[k] || [], dl = d[k] || [], di = new Set(dl.map(x => x.id)), up = {}, del = [];
        dl.forEach((x, i) => { if (stateOf(f, k, x)) up[x.id] = { r: x, i }; });
        bl.forEach(x => { if (!di.has(x.id)) del.push(x.id); });
        let ord = null;
        if (t === 'olist') { const a = bl.filter(x => di.has(x.id)).map(x => x.id).join('|'), z = dl.filter(x => f.bs.has(k + '|' + x.id)).map(x => x.id).join('|'); if (a !== z) ord = dl.map(x => x.id); }
        if (Object.keys(up).length || del.length || ord) { p[k] = { up, del }; if (ord) p[k].ord = ord; }
      }
    }
    return Object.keys(p).length ? p : null;
  }
  function apply(base, patch, schema) {
    const out = clone(base);
    if (!patch) return out;
    for (const k in schema) {
      const t = schema[k], pk = patch[k]; if (pk === undefined) continue;
      if (t === 'val') out[k] = pk;
      else if (t === 'map') { out[k] = out[k] || {}; for (const id in pk) { if (pk[id] === null) delete out[k][id]; else out[k][id] = clone(pk[id]); } }
      else {
        let l = (out[k] || []).filter(x => pk.del.indexOf(x.id) < 0);
        Object.keys(pk.up).map(id => [id, pk.up[id]]).sort((a, b) => a[1].i - b[1].i).forEach(([id, z]) => {
          const j = l.findIndex(x => x.id === id); if (j >= 0) l[j] = clone(z.r); else l.splice(Math.min(z.i, l.length), 0, clone(z.r));
        });
        if (pk.ord) { const pos = new Map(pk.ord.map((id, i) => [id, i])); l = l.map((x, i) => [x, i]).sort((a, b) => (pos.has(a[0].id) ? pos.get(a[0].id) : 1e6 + a[1]) - (pos.has(b[0].id) ? pos.get(b[0].id) : 1e6 + b[1])).map(z => z[0]); }
        out[k] = l;
      }
    }
    return out;
  }
  const PK = 'drb_ad2_patch';
  function storePatch() {
    const p = { dados: diff(F.dados), desc: diff(F.desc) };
    if (p.dados || p.desc) u.SAVE(PK, Object.assign(p, { t: Date.now() })); else { try { localStorage.removeItem(PK); } catch (e) { } }
  }

  /* ---------- lista legível de alterações pendentes ---------- */
  const AREA = { rx: 'Receitas', rxcat: 'Categorias de receitas', desc: 'Descrições cirúrgicas', dcat: 'Categorias de descrições', inf: 'Diluições', aviso: 'Aviso', est: 'Contador de acessos' };
  function changes() {
    const out = [];
    const lists = [['dados', 'receitas', 'rx', 'receitas'], ['dados', 'cats', 'rxcat', null], ['desc', 'm', 'desc', 'descricoes'], ['desc', 'cats', 'dcat', null]];
    lists.forEach(([fk, k, area, route]) => {
      const f = F[fk], dl = f.data[k], ids = new Set(dl.map(x => x.id));
      dl.forEach(x => { const s = stateOf(f, k, x); if (s) out.push({ fk, area, type: s, id: x.id, title: x.t || '(sem título)', sub: x.a || '', href: route ? '#/' + route + '/' + x.id : null }); });
      f.base[k].forEach((x, i) => { if (!ids.has(x.id)) out.push({ fk, area, type: 'del', id: x.id, title: x.t || x.id, sub: x.a || '', base: x, bi: i, coll: k }); });
      if (k === 'cats') { const a = f.base.cats.filter(x => ids.has(x.id)).map(x => x.id).join('|'), z = dl.filter(x => f.bs.has('cats|' + x.id)).map(x => x.id).join('|'); if (a !== z) out.push({ fk, area, type: 'edit', id: '_ord', title: 'Ordem das categorias' }); }
    });
    const bi = F.dados.base.inf, di = F.dados.data.inf;
    new Set(Object.keys(bi).concat(Object.keys(di))).forEach(id => { if (stable(bi[id]) !== stable(di[id])) { const d = D.INF.find(x => x.id === id); out.push({ fk: 'dados', area: 'inf', type: 'edit', id, title: (d ? d.name : id) + (di[id] ? '' : ' (volta ao padrão)'), href: '#/diluicoes' }); } });
    if (F.dados.base.aviso !== F.dados.data.aviso) out.push({ fk: 'dados', area: 'aviso', type: 'edit', id: 'aviso', title: F.dados.data.aviso.trim() ? 'Texto do aviso' : 'Aviso removido', href: '#/aviso' });
    if (F.dados.base.estatisticas !== F.dados.data.estatisticas) out.push({ fk: 'dados', area: 'est', type: 'edit', id: 'est', title: 'Código do contador', href: '#/ajustes' });
    return out;
  }
  const TYPE = { new: 'Nova', edit: 'Editada', del: 'Excluída' };
  function commitMsg(fk) {
    const c = changes().filter(x => x.fk === fk), by = t => c.filter(x => x.type === t).map(x => x.title + (x.sub ? ' (' + x.sub + ')' : ''));
    const parts = [];
    if (by('new').length) parts.push('criou ' + by('new').join(', '));
    if (by('edit').length) parts.push('editou ' + by('edit').join(', '));
    if (by('del').length) parts.push('excluiu ' + by('del').join(', '));
    let s = (fk === 'desc' ? 'descrições: ' : '') + (parts.join('; ') || 'ajustes');
    if (S.restored[fk]) s = 'restaurou a versão de ' + S.restored[fk] + '; ' + s;
    return 'Painel do editor: ' + (s.length > 300 ? s.slice(0, 297) + '…' : s);
  }
  function problems() {
    const out = [], ch = changes().filter(c => c.type !== 'del' && c.href);
    ch.forEach(c => {
      if (c.area === 'rx') {
        const r = F.dados.data.receitas.find(x => x.id === c.id);
        if (!r.t.trim()) out.push({ t: 'Receita sem título', href: c.href });
        if (!r.it.some(it => (it.n || '').trim())) out.push({ t: `“${r.t || 'Sem título'}” não tem medicamento`, href: c.href });
        r.it.forEach((it, i) => { if ((it.n || '').trim() && !(it.p || '').trim()) out.push({ t: `“${r.t}”: o item ${i + 1} está sem posologia`, href: c.href }); });
      }
      if (c.area === 'desc') {
        const m = F.desc.data.m.find(x => x.id === c.id);
        if (!m.t.trim()) out.push({ t: 'Descrição sem título', href: c.href });
        if (!(m.s || []).length) out.push({ t: `“${m.t}” não tem passos`, href: c.href });
        (m.sg || []).forEach(g => { if (!/^\d{10}$/.test(g)) out.push({ t: `“${m.t}”: código SIGTAP ${g} inválido`, href: c.href }); });
      }
    });
    ['dados', 'desc'].forEach(fk => F[fk].data.cats.forEach(c => { if (!(c.t || '').trim()) out.push({ t: 'Há uma categoria sem nome', href: null }); }));
    return out;
  }

  /* ---------- estado da tela ---------- */
  const S = {
    busy: false, src: '', loadErr: '', restored: {}, scroll: {}, lastRoute: '',
    ui: { rx: { q: '', cat: '', pop: '', sc: false, chg: false }, desc: { q: '', cat: '', a: '', sc: false, chg: false }, inf: { q: '', chg: false }, pv: { kg: '14', age: '3', opt: false } }
  };

  /* ---------- avisos, janelas e menus ---------- */
  const toasts = h('div', { class: 'ad-toasts', role: 'status', 'aria-live': 'polite' });
  function toast(msg, o) {
    o = o || {};
    const t = h('div', { class: 'ad-toast' + (o.crit ? ' crit' : '') }, h('span', null, msg),
      o.action && h('button', { type: 'button', onclick: () => { t.remove(); o.action.fn(); } }, o.action.label));
    toasts.append(t); setTimeout(() => t.remove(), o.ms || (o.action ? 8000 : 4500));
    while (toasts.children.length > 3) toasts.firstChild.remove();
  }
  let dlgClose = null;
  function dialog(o) {
    const prev = document.activeElement;
    const ov = h('div', { class: 'ad-ov', onmousedown: e => { if (e.target === ov) close(); } });
    const dlg = h('div', { class: 'ad-dlg' + (o.wide ? ' wide' : ''), role: 'dialog', 'aria-modal': 'true', 'aria-label': o.title });
    const foot = h('div', { class: 'ad-dlg-f' });
    const key = e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
    let done = false;
    function close() { if (done) return; done = true; ov.remove(); document.removeEventListener('keydown', key, true); dlgClose = null; if (prev && prev.focus && prev.isConnected) prev.focus(); if (o.onClose) o.onClose(); }
    dlg.append(h('div', { class: 'ad-dlg-h' }, h('h2', null, o.title), h('button', { type: 'button', class: 'ad-ib', 'aria-label': 'Fechar', onclick: close }, ic('x'))), h('div', { class: 'ad-dlg-b' }, o.body), foot);
    (o.actions || []).forEach(a => foot.append(h('button', { type: 'button', class: 'ad-btn ' + (a.cls || ''), onclick: () => a.fn ? a.fn(close) : close() }, a.label)));
    if (!foot.children.length) foot.remove();
    ov.append(dlg); document.body.append(ov); document.addEventListener('keydown', key, true); dlgClose = close;
    setTimeout(() => { const f = dlg.querySelector('.ad-dlg-b input, .ad-dlg-b textarea') || dlg.querySelector('.ad-dlg-f .pri, .ad-dlg-f .solid') || dlg.querySelector('button'); if (f) f.focus(); }, 30);
    return { close, dlg, foot };
  }
  const ask = (title, text, ok, danger) => new Promise(res => {
    let v = false;
    dialog({ title, body: h('p', { class: 'ad-hint' }, text), actions: [{ label: 'Cancelar' }, { label: ok, cls: danger ? 'danger solid' : 'pri', fn: c => { v = true; c(); } }], onClose: () => res(v) });
  });
  const promptBox = (title, label, ok) => new Promise(res => {
    let v = null;
    const i = h('input', { class: 'ad-in', autocomplete: 'off' });
    const d = dialog({ title, body: h('label', { class: 'ad-f' }, h('span', null, label), i), actions: [{ label: 'Cancelar' }, { label: ok || 'Criar', cls: 'pri', fn: c => { v = i.value.trim() || null; c(); } }], onClose: () => res(v) });
    i.addEventListener('keydown', e => { if (e.key === 'Enter') { v = i.value.trim() || null; d.close(); } });
  });
  let openMenu = null;
  const outside = e => { if (openMenu && !openMenu.contains(e.target)) closeMenu(); };
  function closeMenu() { if (openMenu) { openMenu.remove(); openMenu = null; document.removeEventListener('mousedown', outside, true); } }
  function menu(anchor, items) {
    closeMenu();
    const m = h('div', { class: 'ad-menu', role: 'menu' });
    items.filter(Boolean).forEach(it => m.append(it === '-' ? h('hr') : it.href
      ? h('a', { href: it.href, target: it.ext ? '_blank' : null, rel: it.ext ? 'noopener' : null, role: 'menuitem', onclick: closeMenu }, ic(it.icon), it.label)
      : h('button', { type: 'button', role: 'menuitem', class: it.danger ? 'danger' : null, onclick: () => { closeMenu(); it.fn(); } }, ic(it.icon), it.label)));
    document.body.append(m);
    const r = anchor.getBoundingClientRect(), mw = m.offsetWidth, mh = m.offsetHeight;
    m.style.left = Math.max(8, Math.min(r.right - mw, innerWidth - mw - 8)) + 'px';
    m.style.top = (r.bottom + 6 + mh > innerHeight ? Math.max(8, r.top - mh - 6) : r.bottom + 6) + 'px';
    openMenu = m; setTimeout(() => document.addEventListener('mousedown', outside, true), 0);
    const f = m.querySelector('button, a'); if (f) f.focus();
  }

  /* ---------- construtores de campos ---------- */
  const field = (label, ctrl, o) => { o = o || {}; return h('label', { class: 'ad-f' + (o.full ? ' full' : '') + (o.cls ? ' ' + o.cls : '') }, h('span', null, label), ctrl, o.hint && h('small', null, o.hint)); };
  function upper(el) { const a = el.selectionStart, b = el.selectionEnd, v = el.value.toUpperCase(); if (v !== el.value) { el.value = v; try { el.setSelectionRange(a, b); } catch (e) { } } }
  // campo de texto ligado a obj[key]; o.up = maiúsculas, o.opt = some do registro quando vazio, o.on = depois de mudar
  function inp(obj, key, o) {
    o = o || {};
    const el = h(o.area ? 'textarea' : 'input', Object.assign({ class: 'ad-in' + (o.up ? ' ad-up' : '') + (o.grow ? ' grow' : ''), placeholder: o.ph || null, autocomplete: 'off', rows: o.area ? (o.rows || 3) : null, list: o.list || null, inputmode: o.mode || null }, o.attrs));
    const get = () => { const v = obj[key]; return o.lines ? (v || []).join('\n') : (v == null ? '' : String(v)); };
    el.value = get();
    el.addEventListener('input', () => {
      if (o.up) upper(el);
      let v = el.value;
      if (o.lines) v = v.split('\n').map(x => x.trim()).filter(Boolean);
      if (o.opt) setOpt(obj, key, v); else obj[key] = v;
      if (o.grow) grow(el);
      touch(); if (o.on) o.on(v);
    });
    return el;
  }
  function sw(label, checked, on) {
    const c = h('input', { type: 'checkbox', role: 'switch' }); c.checked = !!checked;
    c.addEventListener('change', () => on(c.checked));
    return h('label', { class: 'ad-sw' }, c, h('span', null, label));
  }
  function seg(opts, val, on) {
    const box = h('div', { class: 'ad-seg', role: 'group' });
    opts.forEach(([v, l]) => box.append(h('button', { type: 'button', class: v === val ? 'on' : null, 'aria-pressed': v === val ? 'true' : 'false', onclick: () => { [...box.children].forEach(b => { b.classList.remove('on'); b.setAttribute('aria-pressed', 'false'); }); box.children[opts.findIndex(x => x[0] === v)].classList.add('on'); on(v); } }, l)));
    return box;
  }
  function search(val, ph, on) {
    const i = h('input', { type: 'search', placeholder: ph, autocomplete: 'off', 'aria-label': ph });
    i.value = val; i.addEventListener('input', () => on(i.value));
    return h('label', { class: 'ad-search' }, ic('search', 18), i, h('kbd', null, '/'));
  }
  const toList = box => { const r = box.getBoundingClientRect(); if (r.top < 70) scrollTo(0, Math.max(0, scrollY + r.top - 180)); };
  const chip = (label, on, fn) => h('button', { type: 'button', class: 'ad-chip' + (on ? ' on' : ''), 'aria-pressed': on ? 'true' : 'false', onclick: fn }, on && ic('check'), label);
  const tag = (t, cls) => h('span', { class: 'ad-tag' + (cls ? ' ' + cls : '') }, t);
  const stTag = s => s ? tag(s === 'new' ? 'Nova' : 'Editada', s) : null;
  const catSelect = (fk, cur, on) => {
    const sel = h('select', null, F[fk].data.cats.map(c => h('option', { value: c.id }, c.t || '(sem nome)')), h('option', { value: '__new' }, 'Nova categoria…'));
    sel.value = cur;
    sel.addEventListener('change', async () => {
      if (sel.value !== '__new') { on(sel.value); return; }
      sel.value = cur;
      const t = await promptBox('Nova categoria', 'Nome da categoria');
      if (!t) return;
      const cats = F[fk].data.cats, id = uniq(cats, slug(t, 30));
      cats.push(fk === 'dados' ? { id, t, d: '' } : { id, t }); on(id); render();
    });
    return sel;
  };

  /* ---------- estrutura da tela ---------- */
  const app = h('div', { class: 'ad-app' });
  const side = h('aside', { class: 'ad-side', 'aria-label': 'Menu do painel' });
  const scrim = h('div', { class: 'ad-scrim', onclick: () => app.classList.remove('menu') });
  const topT = h('div', { class: 'ad-top-t' });
  const statusBtn = h('button', { type: 'button', class: 'ad-status', onclick: () => { if (changes().length) review(); } });
  const pubBtn = h('button', { type: 'button', class: 'ad-btn pri pub', onclick: () => review() }, ic('upload'), h('span', { class: 't' }, 'Publicar'));
  const view = h('main', { class: 'ad-view', id: 'main', tabindex: '-1' });
  app.append(side, scrim, h('div', { class: 'ad-main' },
    h('header', { class: 'ad-top' }, h('button', { type: 'button', class: 'ad-ib ad-top-menu', 'aria-label': 'Abrir menu', onclick: () => app.classList.add('menu') }, ic('menu')), topT, h('div', { class: 'ad-top-r' }, statusBtn, pubBtn)),
    view));

  const NAV = [['inicio', 'Início', 'home'], ['receitas', 'Receitas', 'rx', 'rx'], ['descricoes', 'Descrições cirúrgicas', 'clip', 'desc'], ['diluicoes', 'Diluições', 'drop', 'inf'], ['aviso', 'Aviso', 'bell', 'aviso'], '-', ['historico', 'Histórico e backups', 'hist'], ['ajustes', 'Ajustes', 'gear', 'est']];
  function chrome() {
    const ch = changes(), n = ch.length, areas = new Set(ch.map(c => c.area === 'rxcat' ? 'rx' : c.area === 'dcat' ? 'desc' : c.area));
    const sec = route()[0];
    side.innerHTML = '';
    side.append(h('a', { class: 'ad-brand', href: '#/inicio' }, h('span', { class: 'ad-brand-i' }, ic('rx')), h('span', null, h('b', null, 'Painel do editor'), h('small', null, 'Calculadoras de plantão'))));
    const nav = h('nav', { class: 'ad-nav' });
    NAV.forEach(x => {
      if (x === '-') { nav.append(h('div', { class: 'ad-nav-sep' })); return; }
      const [id, l, i, area] = x, cnt = id === 'receitas' ? F.dados.data.receitas.length : id === 'descricoes' ? F.desc.data.m.length : null;
      nav.append(h('a', { href: '#/' + id, class: sec === id ? 'on' : null, 'aria-current': sec === id ? 'page' : null }, ic(i), l,
        area && areas.has(area) ? h('span', { class: 'ad-dot edit', title: 'Alterações não publicadas' }) : cnt != null && h('span', { class: 'n' }, cnt)));
    });
    side.append(nav, h('div', { class: 'ad-side-f' },
      h('a', { href: './', target: '_blank', rel: 'noopener' }, ic('ext'), 'Abrir o site'),
      h('button', { type: 'button', onclick: () => { const t = document.body.dataset.theme === 'dark' ? 'light' : 'dark'; document.body.dataset.theme = t; u.SAVE('drb_theme', t); chrome(); } }, ic(document.body.dataset.theme === 'dark' ? 'sun' : 'moon'), document.body.dataset.theme === 'dark' ? 'Tema claro' : 'Tema escuro'),
      h('button', { type: 'button', onclick: logout }, ic('out'), 'Sair')));
    statusBtn.innerHTML = '';
    statusBtn.classList.toggle('pend', n > 0 && !S.busy);
    if (S.busy) statusBtn.append(h('span', { class: 'ad-spin', style: 'width:16px;height:16px;border-width:2px' }), h('span', { class: 't' }, 'Publicando…'));
    else if (n) statusBtn.append(h('span', { class: 'ad-dot edit' }), h('b', null, n), h('span', { class: 't' }, n === 1 ? 'alteração não publicada' : 'alterações não publicadas'));
    else statusBtn.append(ic('check'), h('span', { class: 't' }, 'Tudo publicado'));
    statusBtn.title = n ? 'Revisar e publicar' : 'O site está igual ao painel';
    pubBtn.disabled = !n || S.busy;
  }
  let tmr = null;
  function touch() { clearTimeout(tmr); tmr = setTimeout(() => { storePatch(); chrome(); }, 250); }

  /* ---------- rotas ---------- */
  const route = () => location.hash.replace(/^#\/?/, '').split('/').map(x => { try { return decodeURIComponent(x); } catch (e) { return x; } });
  const go = r => { location.hash = '#/' + r; };
  function render() {
    closeMenu(); app.classList.remove('menu');
    const [sec, id] = route(), key = sec + (id ? '/' + id : '');
    if (S.lastRoute && S.lastRoute !== key) S.scroll[S.lastRoute] = scrollY;
    const same = S.lastRoute === key;
    S.lastRoute = key;
    const y = same ? scrollY : (S.scroll[key] || 0);
    view.innerHTML = ''; view.className = 'ad-view';
    const scr = { inicio: home, receitas: id ? rxEdit : rxList, descricoes: id ? descEdit : descList, diluicoes: infScreen, aviso: avisoScreen, historico: histScreen, ajustes: cfgScreen }[sec] || home;
    scr(id);
    chrome();
    requestAnimationFrame(() => { view.querySelectorAll('textarea.grow').forEach(grow); scrollTo(0, y); });
  }
  addEventListener('hashchange', render);
  addEventListener('resize', () => view.querySelectorAll('textarea.grow').forEach(grow));
  addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (!dlgClose) review(); return; }
    if (e.key === 'Escape') { closeMenu(); app.classList.remove('menu'); return; }
    if (e.key === '/' && !dlgClose && !/INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || '')) {
      const s = view.querySelector('.ad-search input'); if (s) { e.preventDefault(); s.focus(); s.select(); }
    }
  });
  // no editor (com voltar), o botão de ações fica sempre ao lado do título, também no celular
  const head = (title, sub, right, crumb) => h('div', null, crumb && h('a', { class: 'ad-crumb', href: crumb[0] }, ic('back'), crumb[1]),
    h('div', { class: 'ad-head' + (crumb ? ' ed' : '') }, h('div', { class: 'ad-head-t' }, typeof title === 'string' ? h('h1', null, title) : title, sub && h('p', { class: 'sub' }, sub)), right && h('div', { class: 'ad-head-r' }, right)));
  const card = (title, hint, ...kids) => h('section', { class: 'ad-card' }, (title || hint) && h('div', { class: 'ad-card-h' }, title && h('h2', { class: 'ad-h2' }, title), hint && h('p', { class: 'ad-hint' }, hint)), ...kids);
  const info = (cls, ...kids) => h('div', { class: 'ad-info ' + (cls || '') }, ic(cls === 'ok' ? 'check' : cls ? 'alert' : 'info'), h('div', null, ...kids));

  /* ---------- início ---------- */
  function home() {
    topT.textContent = 'Início';
    const dd = F.dados.data, ch = changes();
    const infN = Object.keys(dd.inf).length;
    view.append(head('Painel do editor', 'Edite o conteúdo das calculadoras e publique para todos os colegas.'));
    if (!cfg.token) view.append(h('div', { style: 'margin-bottom:16px' }, info('warn', h('b', null, 'Para publicar, conecte o GitHub uma vez neste aparelho. '), h('button', { type: 'button', class: 'ad-link', onclick: () => connect() }, 'Conectar agora'))));
    if (S.loadErr) view.append(h('div', { style: 'margin-bottom:16px' }, info('warn', S.loadErr)));
    view.append(h('div', { class: 'ad-stats' },
      h('a', { class: 'ad-stat', href: '#/receitas' }, h('span', null, 'Receitas'), h('b', null, dd.receitas.length), h('small', null, plural(dd.cats.length, 'categoria', 'categorias'))),
      h('a', { class: 'ad-stat', href: '#/descricoes' }, h('span', null, 'Descrições cirúrgicas'), h('b', null, F.desc.data.m.length), h('small', null, plural(F.desc.data.cats.length, 'categoria', 'categorias'))),
      h('a', { class: 'ad-stat', href: '#/diluicoes' }, h('span', null, 'Diluições'), h('b', null, D.INF.length), h('small', null, infN ? plural(infN, 'alterada do padrão', 'alteradas do padrão') : 'todas no padrão')),
      h('a', { class: 'ad-stat', href: '#/aviso' }, h('span', null, 'Aviso na página inicial'), h('b', null, dd.aviso.trim() ? 'Ativo' : 'Desligado'), h('small', null, dd.aviso.trim() ? dd.aviso.trim().slice(0, 40) + (dd.aviso.trim().length > 40 ? '…' : '') : 'nenhuma mensagem'))));
    const pend = h('div', { class: 'ad-pend' });
    ch.forEach(c => pend.append(h('div', { class: 'ad-pend-row' }, tag(TYPE[c.type], c.type),
      h('div', { style: 'min-width:0' }, c.href ? h('a', { href: c.href }, c.title) : h('span', null, c.title), c.sub && h('span', { class: 'k' }, ' · ' + c.sub), h('div', { class: 'k' }, AREA[c.area])),
      c.type === 'del' ? h('button', { type: 'button', class: 'ad-btn sm', onclick: () => { const l = F[c.fk].data[c.coll]; l.splice(Math.min(c.bi, l.length), 0, clone(c.base)); storePatch(); render(); toast(`“${c.title}” restaurada.`); } }, ic('undo'), 'Restaurar') : h('span'))));
    view.append(card('Alterações não publicadas', ch.length ? 'Ficam guardadas neste aparelho até você publicar. Os colegas ainda veem a versão anterior.' : 'Nada pendente: os colegas já veem exatamente o que está no painel.',
      ch.length ? pend : null,
      ch.length ? h('div', { class: 'ad-acts' }, h('button', { type: 'button', class: 'ad-btn pri', onclick: () => review() }, ic('upload'), 'Revisar e publicar'), h('button', { type: 'button', class: 'ad-btn ghost', onclick: discardAll }, 'Descartar tudo')) : null));
    view.append(card('Atalhos', null, h('div', { class: 'ad-acts' },
      h('button', { type: 'button', class: 'ad-btn', onclick: newRx }, ic('plus'), 'Nova receita'),
      h('button', { type: 'button', class: 'ad-btn', onclick: newDesc }, ic('plus'), 'Nova descrição'),
      h('a', { class: 'ad-btn', href: './', target: '_blank', rel: 'noopener' }, ic('ext'), 'Abrir o site'),
      dd.estatisticas && h('a', { class: 'ad-btn', href: `https://${dd.estatisticas}.goatcounter.com`, target: '_blank', rel: 'noopener' }, ic('ext'), 'Ver acessos')),
      h('p', { class: 'ad-hint' }, 'Atalhos de teclado: Ctrl+S publica e / vai para a busca.')));
  }
  async function discardAll() {
    if (!await ask('Descartar tudo?', 'Todas as alterações que ainda não foram publicadas serão perdidas. O site continua como está.', 'Descartar', true)) return;
    F.dados.data = clone(F.dados.base); F.desc.data = clone(F.desc.base); S.restored = {};
    storePatch(); render(); toast('Alterações descartadas.');
  }

  /* ---------- receitas: lista ---------- */
  function rxList() {
    topT.textContent = 'Receitas';
    const f = F.dados, d = f.data, ui = S.ui.rx;
    const sel = h('select', { class: 'ad-sel', 'aria-label': 'Categoria', onchange: e => { ui.cat = e.target.value; draw(); } }, h('option', { value: '' }, 'Todas as categorias'), d.cats.map(c => h('option', { value: c.id }, c.t)));
    sel.value = ui.cat;
    const chips = h('div', { class: 'ad-chips' }), box = h('div'), count = h('span', { class: 'ad-count' });
    view.append(head('Receitas', 'Modelos de receita por diagnóstico. Toque em uma para editar.', [
      h('button', { type: 'button', class: 'ad-btn ghost', onclick: () => cats('dados') }, ic('tags'), 'Categorias'),
      h('button', { type: 'button', class: 'ad-btn pri', onclick: newRx }, ic('plus'), 'Nova receita')]),
      h('div', { class: 'ad-tools' }, search(ui.q, 'Buscar receita ou medicamento', v => { ui.q = v; draw(); }), sel), chips, box);
    function draw() {
      chips.innerHTML = '';
      chips.append(chip('Adulto', ui.pop === 'a', () => { ui.pop = ui.pop === 'a' ? '' : 'a'; draw(); }), chip('Criança', ui.pop === 'c', () => { ui.pop = ui.pop === 'c' ? '' : 'c'; draw(); }),
        chip('Santa Casa', ui.sc, () => { ui.sc = !ui.sc; draw(); }), chip('Não publicadas', ui.chg, () => { ui.chg = !ui.chg; draw(); }), count);
      const parts = u.norm(ui.q.trim()).split(/\s+/).filter(Boolean), cn = id => (d.cats.find(c => c.id === id) || {}).t || '';
      const ls = d.receitas.filter(r => (!ui.cat || r.c === ui.cat) && (!ui.pop || (ui.pop === 'c') === !!r.ped) && (!ui.sc || r.src === 'sc') && (!ui.chg || stateOf(f, 'receitas', r))
        && (!parts.length || ((s) => parts.every(p => s.includes(p)))(u.norm(r.t + ' ' + r.kw + ' ' + cn(r.c) + ' ' + r.it.map(i => i.n).join(' ')))));
      count.textContent = plural(ls.length, 'receita', 'receitas');
      box.innerHTML = '';
      if (!ls.length) { box.append(h('div', { class: 'ad-list' }, h('div', { class: 'ad-empty' }, h('b', null, 'Nenhuma receita encontrada'), 'Mude a busca ou os filtros, ou crie uma nova.'))); return; }
      const order = d.cats.map(c => c.id), groups = new Map();
      ls.slice().sort((a, b) => ((order.indexOf(a.c) + 1 || 999) - (order.indexOf(b.c) + 1 || 999)) || ((a.ped ? 1 : 0) - (b.ped ? 1 : 0))).forEach(r => { if (!groups.has(r.c)) groups.set(r.c, []); groups.get(r.c).push(r); });
      const list = h('div', { class: 'ad-list' });
      groups.forEach((rs, c) => {
        list.append(h('div', { class: 'ad-ghead' }, cn(c) || 'Sem categoria', h('span', null, rs.length)));
        rs.forEach(r => { const s = stateOf(f, 'receitas', r); list.append(h('a', { class: 'ad-row', href: '#/receitas/' + encodeURIComponent(r.id) }, h('span', { class: 'ad-dot ' + (s || '') }),
          h('div', { style: 'min-width:0' }, h('b', null, r.t || '(sem título)'), h('small', null, r.it.map(i => i.n).filter(Boolean).join(' · ') || 'sem medicamentos')),
          h('span', { class: 'meta' }, r.ped && tag('Criança', 'acc'), r.src === 'sc' && tag('Santa Casa')), ic('chev'))); });
      });
      box.append(list);
      if (drawn) toList(box); drawn = true;
    }
    let drawn = false;
    draw();
  }
  function newRx() {
    const d = F.dados.data, ui = S.ui.rx, id = uniq(d.receitas, 'nova-receita');
    const r = { id, t: 'Nova receita', c: ui.cat || (d.cats[0] || {}).id || 'out', kw: '', it: [{ v: 'ORAL', n: '', q: '', p: '' }] };
    if (ui.pop === 'c') r.ped = true;
    d.receitas.unshift(r); touch(); go('receitas/' + id);
    setTimeout(() => { const t = view.querySelector('input'); if (t) { t.focus(); t.select(); } }, 60);
  }

  /* ---------- receitas: editor ---------- */
  function rxEdit(id) {
    const f = F.dados, d = f.data, r = d.receitas.find(x => x.id === id);
    topT.textContent = 'Receitas';
    if (!r) { notFound('Receita', 'receitas'); return; }
    topT.textContent = r.t || 'Receita';
    const published = f.bs.has('receitas|' + r.id);
    const h1 = h('h1', null, r.t || 'Sem título'), stBox = h('span');
    const refresh = () => { h1.textContent = r.t || 'Sem título'; topT.textContent = r.t || 'Receita'; stBox.innerHTML = ''; const s = stateOf(f, 'receitas', r); if (s) stBox.append(stTag(s)); preview(); };
    const ch = () => refresh();
    const moreBtn = h('button', { type: 'button', class: 'ad-ib', 'aria-label': 'Mais ações', onclick: e => menu(e.currentTarget, [
      { icon: 'dup', label: 'Duplicar receita', fn: () => { const c = clone(r); c.id = uniq(d.receitas, r.id + '-copia'); c.t = r.t + ' (cópia)'; d.receitas.splice(d.receitas.indexOf(r) + 1, 0, c); touch(); go('receitas/' + c.id); toast('Cópia criada.'); } },
      published && { icon: 'ext', label: 'Ver no site', href: 'index.html#/receitas/' + r.id, ext: true },
      stateOf(f, 'receitas', r) === 'edit' && { icon: 'undo', label: 'Voltar à versão publicada', fn: () => revert('dados', 'receitas', r.id) },
      '-',
      { icon: 'trash', label: 'Excluir receita', danger: true, fn: () => del('dados', 'receitas', r, 'receitas') }]) }, ic('more'));
    view.append(head(h('div', { style: 'display:flex;gap:10px;align-items:center;flex-wrap:wrap' }, h1, stBox), null, [moreBtn], ['#/receitas', 'Receitas']));
    view.classList.add('wide');

    const pop = seg([['a', 'Adulto'], ['c', 'Criança']], r.ped ? 'c' : 'a', v => { setOpt(r, 'ped', v === 'c'); touch(); ch(); });
    const items = h('div', { class: 'ad-items' });
    const pv = h('div', { class: 'ad-paper', 'aria-live': 'polite' });
    const ori = inp(r, 'ori', { area: true, grow: true, up: true, lines: true, opt: true, rows: 2, ph: 'Ex.: Retornar se febre persistir por mais de 3 dias.', on: ch });
    const form = h('div', null,
      card('Identificação', null, h('div', { class: 'ad-grid' },
        field('Título (diagnóstico)', inp(r, 't', { on: ch, ph: 'Ex.: Conjuntivite bacteriana' }), { full: true }),
        field('Categoria', catSelect('dados', r.c, v => { r.c = v; touch(); ch(); })),
        h('div', { class: 'ad-f' }, h('span', null, 'Público'), pop),
        h('div', { class: 'full' }, sw('Modelo da Santa Casa (aparece no filtro do serviço)', r.src === 'sc', v => { setOpt(r, 'src', v ? 'sc' : ''); touch(); ch(); })),
        h('details', { class: 'ad-help full', open: r.kw && !published ? true : null }, h('summary', null, 'Palavras de busca'),
          h('div', null, field('Sinônimos e termos que o colega pode digitar na busca', inp(r, 'kw', { ph: 'olho vermelho colírio secreção', on: ch }), { hint: 'O título e os nomes dos medicamentos já entram na busca.' }))))),
      card('Medicamentos', 'Cada item vira uma linha da receita. Itens opcionais aparecem desmarcados para o colega escolher.', items),
      card('Orientações ao paciente', 'Uma por linha. Saem no fim da receita, desmarcadas, para o colega escolher.', ori),
      card('Nota para o médico', 'Aparece só na tela do colega; não sai na receita.', inp(r, 'nota', { area: true, grow: true, opt: true, rows: 2, ph: 'Ex.: Ajustar a dose se o clearance de creatinina estiver reduzido.', on: ch })),
      card(null, null, h('details', { class: 'ad-help' }, h('summary', null, 'Dose pelo peso ou pela idade'),
        h('div', null, h('p', { class: 'ad-hint' }, 'Escreva estes marcadores no medicamento, na quantidade ou na posologia. O site troca pelo valor do paciente; sem peso ou idade, aparece ___ para o colega completar.'),
          h('table', null, [
            ['{gt:1:40} GOTAS', '1 gota por kg, no máximo 40'], ['{ml:0.3333:10} ML', 'peso ÷ 3 em mL, no máximo 10 (arredonda para 0,5 mL)'], ['{mg:50:1000} MG', '50 mg/kg, no máximo 1.000 mg'],
            ['{idade:2=2,5 ML|6=5 ML|10 ML}', 'abaixo de 2 anos 2,5 mL; abaixo de 6 anos 5 mL; acima, 10 mL'], ['{peso:15=1/2 CP|01 CP}', 'até 15 kg meio comprimido; acima, 1'],
            ['{kg}', 'peso do paciente'], ['{litros:60}', '60 mL/kg em litros'], ['{ivermectina}', 'comprimidos de 6 mg pela tabela de peso']
          ].map(([a, b]) => h('tr', null, h('td', null, h('code', null, a)), h('td', null, b)))),
          h('p', { class: 'ad-hint' }, 'Para um item valer só para uma faixa (por exemplo, só abaixo de 10 kg), use a opção "Para quem" do item.')))));
    const kg = h('input', { inputmode: 'decimal', 'aria-label': 'Peso de teste' }), age = h('input', { inputmode: 'decimal', 'aria-label': 'Idade de teste' });
    kg.value = S.ui.pv.kg; age.value = S.ui.pv.age;
    kg.addEventListener('input', () => { S.ui.pv.kg = kg.value; preview(); }); age.addEventListener('input', () => { S.ui.pv.age = age.value; preview(); });
    const sidePv = h('div', { class: 'ad-ed-side' }, card(null, null,
      h('div', { class: 'ad-pv-h' }, h('b', null, 'Prévia'), h('span', { style: 'margin-left:auto' }, sw('Mostrar opcionais', S.ui.pv.opt, v => { S.ui.pv.opt = v; preview(); }))),
      h('div', { class: 'ad-pv-in' }, h('div', { class: 'ad-unit' }, kg, h('span', null, 'kg')), h('div', { class: 'ad-unit' }, age, h('span', null, 'anos'))),
      pv));
    view.append(h('div', { class: 'ad-ed' }, form, sidePv));

    function drawItems() {
      items.innerHTML = '';
      r.it.forEach((it, i) => items.append(itemCard(it, i)));
      items.append(h('button', { type: 'button', class: 'ad-add', onclick: () => { r.it.push({ v: (r.it[r.it.length - 1] || {}).v || 'ORAL', n: '', q: '', p: '' }); touch(); drawItems(); ch(); const ins = items.querySelectorAll('.ad-item'); const last = ins[ins.length - 1]; if (last) last.querySelector('input').focus(); } }, ic('plus'), 'Adicionar medicamento'));
      requestAnimationFrame(() => items.querySelectorAll('textarea.grow').forEach(grow));
    }
    function itemCard(it, i) {
      const via = h('select', { 'aria-label': 'Via' }, Object.keys(VIA).map(k => h('option', { value: k }, viaLabel(k))));
      via.value = it.v; via.addEventListener('change', () => { it.v = via.value; touch(); ch(); });
      const mv = dd => { const j = i + dd; if (j < 0 || j >= r.it.length) return; [r.it[i], r.it[j]] = [r.it[j], r.it[i]]; touch(); drawItems(); ch(); };
      const box = h('div', { class: 'ad-item' + (it.opt ? ' opt' : '') });
      box.append(
        h('div', { class: 'ad-item-r1' },
          field('Via', via, { cls: 'via' }),
          field('Medicamento e apresentação', inp(it, 'n', { up: true, ph: 'Ex.: Dipirona 500 mg/mL gotas', on: ch })),
          field('Quantidade', inp(it, 'q', { up: true, ph: 'Ex.: 1 frasco', on: ch }))),
        field('Posologia', inp(it, 'p', { area: true, grow: true, up: true, rows: 2, ph: 'Ex.: Tomar {gt:1:40} gotas de 6/6 horas se dor ou febre.', on: ch })),
        h('div', { class: 'ad-item-f' },
          sw('Opcional', it.opt, v => { setOpt(it, 'opt', v); box.classList.toggle('opt', v); touch(); ch(); }),
          condCtl(it),
          h('span', { class: 'sp' },
            h('button', { type: 'button', class: 'ad-ib', title: 'Subir', 'aria-label': 'Subir item', disabled: i === 0 ? true : null, onclick: () => mv(-1) }, ic('up')),
            h('button', { type: 'button', class: 'ad-ib', title: 'Descer', 'aria-label': 'Descer item', disabled: i === r.it.length - 1 ? true : null, onclick: () => mv(1) }, ic('dn')),
            h('button', { type: 'button', class: 'ad-ib', title: 'Duplicar', 'aria-label': 'Duplicar item', onclick: () => { r.it.splice(i + 1, 0, clone(it)); touch(); drawItems(); ch(); } }, ic('dup')),
            h('button', { type: 'button', class: 'ad-ib danger', title: 'Remover', 'aria-label': 'Remover item', onclick: () => {
              const old = r.it.splice(i, 1)[0]; touch(); drawItems(); ch();
              toast('Medicamento removido.', { action: { label: 'Desfazer', fn: () => { r.it.splice(Math.min(i, r.it.length), 0, old); touch(); drawItems(); ch(); } } });
            } }, ic('trash')))));
      return box;
    }
    function condCtl(it) {
      const m = /^(idade|peso)(<=|>=|<|>)([\d.]+)$/.exec(it.se || '') || [null, '', '<', ''];
      const st = { k: m[1], op: m[2], v: m[3] };
      const wrap = h('span', { class: 'ad-cond' });
      const save = () => { if (st.k && u.num(st.v) >= 0) it.se = st.k + st.op + String(u.num(st.v)); else delete it.se; touch(); ch(); };
      function draw() {
        wrap.innerHTML = '';
        const k = h('select', { 'aria-label': 'Para quem' }, h('option', { value: '' }, 'Para todos'), h('option', { value: 'idade' }, 'Só por idade'), h('option', { value: 'peso' }, 'Só por peso'));
        k.value = st.k; k.addEventListener('change', () => { st.k = k.value; if (st.k && !st.v) st.v = st.k === 'idade' ? '2' : '10'; save(); draw(); });
        wrap.append(k);
        if (!st.k) return;
        const op = h('select', { 'aria-label': 'Condição' }, [['<', 'abaixo de'], ['<=', 'até'], ['>=', 'a partir de'], ['>', 'acima de']].map(([v, l]) => h('option', { value: v }, l)));
        op.value = st.op; op.addEventListener('change', () => { st.op = op.value; save(); });
        const v = h('input', { inputmode: 'decimal', 'aria-label': 'Valor' }); v.value = u.dv(st.v);
        v.addEventListener('input', () => { st.v = String(u.num(v.value)); save(); });
        wrap.append(op, v, st.k === 'idade' ? 'anos' : 'kg');
      }
      draw();
      return wrap;
    }
    function preview() {
      const c = { kg: u.num(S.ui.pv.kg), age: u.num(S.ui.pv.age) }, groups = [];
      pv.innerHTML = '';
      r.it.forEach(it => {
        if (!(it.n || '').trim() && !(it.p || '').trim()) return;
        if (it.opt && !S.ui.pv.opt) return;
        let g = groups.find(x => x.v === it.v); if (!g) { g = { v: it.v, l: [] }; groups.push(g); } g.l.push(it);
      });
      if (!groups.length) { pv.append(h('p', { class: 'blank' }, 'Preencha um medicamento para ver a receita.')); return; }
      groups.forEach(g => {
        pv.append(h('div', { class: 'via' }, VIA[g.v] + ':'));
        let n = 0;
        g.l.forEach(it => {
          const ok = fits(it, c); if (ok) n++;
          pv.append(h('div', { class: 'it' + (ok ? '' : ' off') + (it.opt ? ' off' : '') }, h('span', { class: 'num' }, ok ? n + '.' : '·'),
            h('div', { class: 'nm' }, h('span', null, fill(it.n, c) ? marked(fill(it.n, c)) : '(sem nome)'), it.opt && h('span', { class: 'opt' }, 'opcional'), !ok && h('span', { class: 'opt' }, 'não entra para este paciente'), h('span', { class: 'qt' }, fill(it.q, c))),
            h('div', { class: 'p' }, marked(fill(it.p, c)))));
        });
      });
      if ((r.ori || []).length) pv.append(h('div', { class: 'ori' }, h('b', null, 'ORIENTAÇÕES: '), r.ori.join(' ')));
    }
    drawItems(); refresh();
  }

  /* ---------- descrições: lista ---------- */
  const authors = () => [...new Set(F.desc.data.m.map(m => m.a).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  function descList() {
    topT.textContent = 'Descrições cirúrgicas';
    const f = F.desc, d = f.data, ui = S.ui.desc;
    const cn = id => (d.cats.find(c => c.id === id) || {}).t || '';
    const sel = h('select', { class: 'ad-sel', 'aria-label': 'Categoria', onchange: e => { ui.cat = e.target.value; draw(); } }, h('option', { value: '' }, 'Todas as categorias'), d.cats.map(c => h('option', { value: c.id }, c.t)));
    sel.value = ui.cat;
    const asel = h('select', { class: 'ad-sel', 'aria-label': 'Cirurgião', onchange: e => { ui.a = e.target.value; draw(); } }, h('option', { value: '' }, 'Todos os cirurgiões'), h('option', { value: '_' }, 'Sem cirurgião'), authors().map(a => h('option', { value: a }, a)));
    asel.value = ui.a;
    const chips = h('div', { class: 'ad-chips' }), box = h('div'), count = h('span', { class: 'ad-count' });
    view.append(head('Descrições cirúrgicas', 'Modelos por procedimento e cirurgião. Toque em um para editar.', [
      h('button', { type: 'button', class: 'ad-btn ghost', onclick: () => cats('desc') }, ic('tags'), 'Categorias'),
      h('button', { type: 'button', class: 'ad-btn pri', onclick: newDesc }, ic('plus'), 'Nova descrição')]),
      h('div', { class: 'ad-tools' }, search(ui.q, 'Buscar procedimento, cirurgião ou código', v => { ui.q = v; draw(); }), sel, asel), chips, box);
    function draw() {
      chips.innerHTML = '';
      chips.append(chip('Santa Casa', ui.sc, () => { ui.sc = !ui.sc; draw(); }), chip('Não publicadas', ui.chg, () => { ui.chg = !ui.chg; draw(); }), count);
      const parts = u.norm(ui.q.trim()).split(/\s+/).filter(Boolean);
      const ls = d.m.filter(m => (!ui.cat || m.c === ui.cat) && (!ui.a || (ui.a === '_' ? !m.a : m.a === ui.a)) && (!ui.sc || m.src === 'sc') && (!ui.chg || stateOf(f, 'm', m))
        && (!parts.length || ((s) => parts.every(p => s.includes(p)))(u.norm([m.t, m.a, m.nt, m.cp, cn(m.c), (m.sg || []).join(' ')].join(' ')))));
      count.textContent = plural(ls.length, 'modelo', 'modelos');
      box.innerHTML = '';
      if (!ls.length) { box.append(h('div', { class: 'ad-list' }, h('div', { class: 'ad-empty' }, h('b', null, 'Nenhuma descrição encontrada'), 'Mude a busca ou os filtros, ou crie uma nova.'))); return; }
      const order = d.cats.map(c => c.id), groups = new Map();
      ls.slice().sort((a, b) => ((order.indexOf(a.c) + 1 || 999) - (order.indexOf(b.c) + 1 || 999)) || a.t.localeCompare(b.t, 'pt-BR') || (a.a || '').localeCompare(b.a || '', 'pt-BR')).forEach(m => { if (!groups.has(m.c)) groups.set(m.c, []); groups.get(m.c).push(m); });
      const list = h('div', { class: 'ad-list' });
      let shown = 0; const MAX = ui.all ? 1e9 : 150;
      for (const [c, ms] of groups) {
        if (shown >= MAX) break;
        list.append(h('div', { class: 'ad-ghead' }, cn(c) || 'Sem categoria', h('span', null, ms.length)));
        for (const m of ms) {
          if (shown++ >= MAX) break;
          const s = stateOf(f, 'm', m);
          list.append(h('a', { class: 'ad-row', href: '#/descricoes/' + encodeURIComponent(m.id) }, h('span', { class: 'ad-dot ' + (s || '') }),
            h('div', { style: 'min-width:0' }, h('b', null, m.t || '(sem título)', m.nt && h('i', null, ' · ' + m.nt)), h('small', null, [m.a || 'Sem cirurgião', plural((m.s || []).length, 'passo', 'passos'), (m.sg || []).join(' ')].filter(Boolean).join(' · '))),
            h('span', { class: 'meta' }, m.src === 'sc' && tag('Santa Casa')), ic('chev')));
        }
      }
      if (ls.length > MAX) list.append(h('button', { type: 'button', class: 'ad-more', onclick: () => { ui.all = true; draw(); } }, `Mostrar todos os ${ls.length}`));
      box.append(list);
      if (drawn) toList(box); drawn = true;
    }
    let drawn = false;
    draw();
  }
  function newDesc() {
    const d = F.desc.data, ui = S.ui.desc, id = uniq(d.m, 'nova-descricao');
    d.m.unshift({ id, c: ui.cat || (d.cats[0] || {}).id || 'abd', t: 'Nova descrição', a: '', an: '', dx: '', cp: '', rel: 'Procedimento sem intercorrências.', s: ['PACIENTE EM DECÚBITO DORSAL HORIZONTAL SOB ___', 'ASSEPSIA, ANTISSEPSIA E COLOCAÇÃO DE CAMPOS ESTÉREIS'] });
    touch(); go('descricoes/' + id);
    setTimeout(() => { const t = view.querySelector('input'); if (t) { t.focus(); t.select(); } }, 60);
  }

  /* ---------- tabela SIGTAP (carrega só quando precisa) ---------- */
  let sgMap = null, sgP = null;
  function loadSigtap() {
    if (sgP) return sgP;
    sgP = new Promise(res => {
      const done = () => { const X = window.DRB_SIGTAP; if (X && X.P) { sgMap = new Map(X.P.map(p => [p[0], p[1]])); } res(sgMap); };
      if (window.DRB_SIGTAP) return done();
      const s = document.createElement('script'); s.src = 'sigtap.js'; s.onload = done; s.onerror = () => res(null); document.head.append(s);
    });
    return sgP;
  }

  /* ---------- descrições: editor ---------- */
  function descEdit(id) {
    const f = F.desc, d = f.data, m = d.m.find(x => x.id === id);
    topT.textContent = 'Descrições cirúrgicas';
    if (!m) { notFound('Descrição', 'descricoes'); return; }
    topT.textContent = m.t || 'Descrição';
    const published = f.bs.has('m|' + m.id);
    const h1 = h('h1', null, m.t || 'Sem título'), stBox = h('span'), pv = h('div', { class: 'ad-paper' });
    const refresh = () => { h1.textContent = m.t || 'Sem título'; topT.textContent = m.t || 'Descrição'; stBox.innerHTML = ''; const s = stateOf(f, 'm', m); if (s) stBox.append(stTag(s)); preview(); };
    const moreBtn = h('button', { type: 'button', class: 'ad-ib', 'aria-label': 'Mais ações', onclick: e => menu(e.currentTarget, [
      { icon: 'dup', label: 'Duplicar descrição', fn: () => { const c = clone(m); c.id = uniq(d.m, m.id + '-copia'); c.t = m.t + ' (cópia)'; delete c.fm; delete c.x; d.m.splice(d.m.indexOf(m) + 1, 0, c); touch(); go('descricoes/' + c.id); toast('Cópia criada.'); } },
      published && { icon: 'ext', label: 'Ver no site', href: 'index.html#/descricoes/' + m.id, ext: true },
      stateOf(f, 'm', m) === 'edit' && { icon: 'undo', label: 'Voltar à versão publicada', fn: () => revert('desc', 'm', m.id) },
      '-',
      { icon: 'trash', label: 'Excluir descrição', danger: true, fn: () => del('desc', 'm', m, 'descricoes') }]) }, ic('more'));
    view.append(head(h('div', { style: 'display:flex;gap:10px;align-items:center;flex-wrap:wrap' }, h1, stBox), m.a ? 'Modelo de ' + m.a : null, [moreBtn], ['#/descricoes', 'Descrições cirúrgicas']));
    view.classList.add('wide');
    const dl = h('datalist', { id: 'ad-authors' }, authors().map(a => h('option', { value: a })));
    const codes = codesCtl(m, refresh);
    const steps = h('textarea', { class: 'grow', rows: 10, placeholder: 'Um passo por linha' });
    steps.value = (m.s || []).join('\n');
    const stepN = h('small', null);
    const countSteps = () => { stepN.textContent = plural((m.s || []).length, 'passo', 'passos') + '. Use ___ para o que será completado no plantão.'; };
    steps.addEventListener('input', () => { m.s = steps.value.split('\n').map(x => x.trim()).filter(Boolean); grow(steps); countSteps(); touch(); refresh(); });
    countSteps();
    const famInfo = m.fm ? info('', 'Este modelo faz parte de um grupo com opções no site', m.x ? ' (' + Object.keys(m.x).map(k => k + ' ' + m.x[k]).join(', ') + ')' : '', '. O colega escolhe as opções e o site usa o modelo mais próximo. O agrupamento não é alterado aqui.') : null;
    const form = h('div', null, dl,
      card('Identificação', null, famInfo, h('div', { class: 'ad-grid' },
        field('Título (procedimento)', inp(m, 't', { on: refresh, ph: 'Ex.: Colecistectomia videolaparoscópica' }), { full: true }),
        field('Categoria', catSelect('desc', m.c, v => { m.c = v; touch(); refresh(); })),
        field('Modelo de (cirurgião)', inp(m, 'a', { list: 'ad-authors', ph: 'Ex.: Dra Fulana', on: refresh })),
        field('Variação', inp(m, 'nt', { opt: true, ph: 'Ex.: incisão de Davis, pediatria', on: refresh }), { full: true, hint: 'Aparece ao lado do título para diferenciar modelos parecidos.' }),
        h('div', { class: 'full' }, sw('Modelo da Santa Casa', m.src === 'sc', v => { setOpt(m, 'src', v ? 'sc' : ''); touch(); refresh(); })))),
      card('Dados para a AIH', null, h('div', { class: 'ad-grid' },
        field('Tipo de anestesia', inp(m, 'an', { ph: 'Ex.: Anestesia geral', on: refresh })),
        field('Diagnóstico pré-operatório', inp(m, 'dx', { ph: 'Ex.: Colelitíase', on: refresh })),
        field('Cirurgia proposta e realizada', inp(m, 'cp', { on: refresh }), { full: true }),
        h('div', { class: 'ad-f full' }, h('span', null, 'Códigos SIGTAP'), codes, h('small', null, 'Digite os 10 números e tecle Enter. Pode colar com pontos e traço.')),
        field('Relatório da cirurgia', inp(m, 'rel', { on: refresh }), { full: true }))),
      card('Passos da descrição', null, h('label', { class: 'ad-f' }, h('span', null, 'Um passo por linha, sem número'), steps, stepN)));
    view.append(h('div', { class: 'ad-ed' }, form, h('div', { class: 'ad-ed-side' }, card(null, null, h('div', { class: 'ad-pv-h' }, h('b', null, 'Prévia')), pv))));
    function preview() {
      pv.innerHTML = '';
      pv.append(h('div', { class: 'dh' }, (m.t || 'Sem título').toUpperCase()));
      const rows = [['Anestesia', m.an], ['Diagnóstico', m.dx], ['Cirurgia', m.cp], ['SIGTAP', (m.sg || []).join(', ')], ['Relatório', m.rel]].filter(x => (x[1] || '').trim());
      if (rows.length) pv.append(h('dl', null, rows.map(([a, b]) => [h('dt', null, a), h('dd', null, b)])));
      pv.append((m.s || []).length ? h('ol', null, m.s.map(x => h('li', null, marked(x)))) : h('p', { class: 'blank' }, 'Escreva os passos para ver a descrição.'));
    }
    refresh();
  }
  function codesCtl(m, after) {
    const box = h('div', { class: 'ad-codes' });
    const i = h('input', { inputmode: 'numeric', placeholder: m.sg && m.sg.length ? 'Outro código' : '0407020039', 'aria-label': 'Código SIGTAP' });
    function draw() {
      [...box.querySelectorAll('.ad-code')].forEach(x => x.remove());
      (m.sg || []).forEach((g, k) => {
        const nm = sgMap ? sgMap.get(g) : null, bad = !/^\d{10}$/.test(g) || (sgMap && !nm);
        box.insertBefore(h('span', { class: 'ad-code' + (bad ? ' bad' : ''), title: nm || (bad ? 'Código não encontrado na tabela SIGTAP' : '') }, h('b', null, g), h('span', null, nm ? nm.charAt(0) + nm.slice(1).toLowerCase() : bad && sgMap ? 'não encontrado' : ''),
          h('button', { type: 'button', 'aria-label': 'Remover código ' + g, onclick: () => { m.sg.splice(k, 1); setOpt(m, 'sg', m.sg); touch(); draw(); after(); } }, ic('x'))), i);
      });
    }
    function add() {
      const raw = i.value.trim(); if (!raw) return;
      const found = raw.replace(/[.\-\s]/g, '').match(/\d+/g) || [];
      const ok = found.filter(x => x.length === 10), bad = found.filter(x => x.length !== 10);
      if (bad.length || !ok.length) toast('O código SIGTAP tem 10 números.', { crit: true });
      if (ok.length) { m.sg = m.sg || []; ok.forEach(x => { if (m.sg.indexOf(x) < 0) m.sg.push(x); }); touch(); draw(); after(); i.value = ''; }
    }
    i.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); } else if (e.key === 'Backspace' && !i.value && (m.sg || []).length) { m.sg.pop(); setOpt(m, 'sg', m.sg); touch(); draw(); after(); } });
    i.addEventListener('blur', add);
    box.append(i); draw();
    loadSigtap().then(() => { if (box.isConnected) draw(); });
    box.addEventListener('click', e => { if (e.target === box) i.focus(); });
    return box;
  }

  /* ---------- ações comuns de registros ---------- */
  function del(fk, coll, rec, back) {
    const l = F[fk].data[coll], i = l.indexOf(rec);
    if (i < 0) return;
    l.splice(i, 1); touch(); go(back);
    toast(`“${rec.t || 'Sem título'}” excluída.`, { action: { label: 'Desfazer', fn: () => { const l2 = F[fk].data[coll]; if (!l2.some(x => x.id === rec.id)) l2.splice(Math.min(i, l2.length), 0, rec); touch(); go(back + '/' + encodeURIComponent(rec.id)); } } });
  }
  async function revert(fk, coll, id) {
    if (!await ask('Voltar à versão publicada?', 'As alterações feitas neste modelo e ainda não publicadas serão perdidas.', 'Voltar', true)) return;
    const f = F[fk], b = f.base[coll].find(x => x.id === id), l = f.data[coll], i = l.findIndex(x => x.id === id);
    if (b && i >= 0) l[i] = clone(b);
    storePatch(); render(); toast('Voltou à versão publicada.');
  }
  function notFound(what, back) {
    view.append(head(what + ' não encontrada', 'Ela pode ter sido excluída ou o link está errado.', null, ['#/' + back, 'Voltar']));
  }

  /* ---------- categorias ---------- */
  function cats(fk) {
    const f = F[fk], coll = fk === 'dados' ? 'receitas' : 'm', list = h('div', { class: 'ad-cats' });
    function draw() {
      list.innerHTML = '';
      const cs = f.data.cats;
      cs.forEach((c, i) => {
        const used = f.data[coll].filter(x => x.c === c.id).length;
        const mv = dd => { const j = i + dd; if (j < 0 || j >= cs.length) return; [cs[i], cs[j]] = [cs[j], cs[i]]; touch(); draw(); };
        list.append(h('div', { class: 'ad-cat' },
          h('div', { style: 'display:grid;gap:8px;min-width:0' },
            field('Nome', inp(c, 't', {})),
            fk === 'dados' && field('Descrição curta (aparece no site)', inp(c, 'd', { ph: 'Ex.: Conjuntivites, hordéolo, olho seco' })),
            h('small', { class: 'u' }, used ? plural(used, 'modelo usa esta categoria', 'modelos usam esta categoria') : 'Nenhum modelo usa esta categoria')),
          h('div', { class: 'b' },
            h('button', { type: 'button', class: 'ad-ib', 'aria-label': 'Subir', disabled: i === 0 ? true : null, onclick: () => mv(-1) }, ic('up')),
            h('button', { type: 'button', class: 'ad-ib', 'aria-label': 'Descer', disabled: i === cs.length - 1 ? true : null, onclick: () => mv(1) }, ic('dn')),
            h('button', { type: 'button', class: 'ad-ib danger', 'aria-label': 'Excluir categoria', title: used ? 'Mude os modelos para outra categoria antes de excluir' : 'Excluir', disabled: used ? true : null, onclick: () => { cs.splice(i, 1); touch(); draw(); } }, ic('trash')))));
      });
    }
    draw();
    dialog({ title: fk === 'dados' ? 'Categorias de receitas' : 'Categorias de descrições', wide: true,
      body: [h('p', { class: 'ad-hint' }, 'A ordem aqui é a ordem em que aparecem no site. Só é possível excluir categorias vazias.'), list,
        h('button', { type: 'button', class: 'ad-add', onclick: () => { const cs = f.data.cats, id = uniq(cs, 'nova-categoria'); cs.push(fk === 'dados' ? { id, t: 'Nova categoria', d: '' } : { id, t: 'Nova categoria' }); touch(); draw(); const ins = list.querySelectorAll('input'); const t = ins[ins.length - (fk === 'dados' ? 2 : 1)]; if (t) { t.focus(); t.select(); } } }, ic('plus'), 'Nova categoria')],
      actions: [{ label: 'Pronto', cls: 'pri' }], onClose: () => render() });
  }

  /* ---------- diluições ---------- */
  function infScreen() {
    topT.textContent = 'Diluições';
    const d = F.dados.data, ui = S.ui.inf, box = h('div'), chips = h('div', { class: 'ad-chips' }), count = h('span', { class: 'ad-count' });
    view.append(head('Diluições', 'Diluição padrão da calculadora de drogas vasoativas e infusões. Vale para todos; cada colega ainda pode personalizar no próprio aparelho.'),
      h('div', { class: 'ad-tools' }, search(ui.q, 'Buscar droga', v => { ui.q = v; draw(); })), chips, box);
    function draw() {
      chips.innerHTML = '';
      chips.append(chip('Só as alteradas', ui.chg, () => { ui.chg = !ui.chg; draw(); }), count);
      const parts = u.norm(ui.q.trim()).split(/\s+/).filter(Boolean);
      const ls = D.INF_DEF.filter(def => (!ui.chg || d.inf[def.id]) && (!parts.length || parts.every(p => u.norm(D.INF.find(x => x.id === def.id).name).includes(p))));
      count.textContent = plural(ls.length, 'droga', 'drogas');
      box.innerHTML = '';
      if (!ls.length) { box.append(h('div', { class: 'ad-list' }, h('div', { class: 'ad-empty' }, h('b', null, 'Nenhuma droga encontrada')))); return; }
      const list = h('div', { class: 'ad-list' }), groups = new Map();
      ls.forEach(def => { const g = D.INF.find(x => x.id === def.id).g; if (!groups.has(g)) groups.set(g, []); groups.get(g).push(def); });
      groups.forEach((defs, g) => { list.append(h('div', { class: 'ad-ghead' }, g, h('span', null, defs.length))); defs.forEach(def => list.append(infRow(def))); });
      box.append(list);
      requestAnimationFrame(() => box.querySelectorAll('textarea.grow').forEach(grow));
    }
    function infRow(def) {
      const x = D.INF.find(z => z.id === def.id), cur = Object.assign({}, def, d.inf[def.id] || {});
      const conc = h('span', { class: 'c' }), right = h('div', { class: 'r' }), row = h('div', { class: 'ad-inf' });
      const upd = () => {
        conc.textContent = cur.vol > 0 && cur.amt > 0 ? `${u.fmt(cur.amt / cur.vol, 3)} ${x.amtU}/mL` : 'confira os valores';
        right.innerHTML = '';
        if (d.inf[def.id]) right.append(tag('Alterada', 'edit'), h('button', { type: 'button', class: 'ad-btn sm ghost', onclick: () => { delete d.inf[def.id]; touch(); row.replaceWith(infRow(def)); } }, ic('undo'), 'Padrão'));
      };
      const set = (k, v) => {
        cur[k] = v;
        const o = { amt: cur.amt, vol: cur.vol, note: cur.note };
        if (o.amt === def.amt && o.vol === def.vol && (o.note || '') === (def.note || '')) delete d.inf[def.id]; else d.inf[def.id] = o;
        touch(); upd();
      };
      const num = (k, unit) => { const i = h('input', { inputmode: 'decimal', 'aria-label': k === 'amt' ? 'Quantidade de droga' : 'Volume total' }); i.value = u.dv(cur[k]); i.addEventListener('input', () => { const v = u.num(i.value); if (v > 0) set(k, v); }); return h('div', { class: 'ad-unit' }, i, h('span', null, unit)); };
      const note = h('textarea', { class: 'grow', rows: 1, 'aria-label': 'Como preparar' }); note.value = cur.note || '';
      note.addEventListener('input', () => { grow(note); set('note', note.value); });
      row.append(h('div', { class: 'ad-inf-n' }, h('b', null, x.name), conc, h('small', null, `Padrão: ${u.dv(def.amt)} ${x.amtU} em ${u.dv(def.vol)} mL`)),
        field('Droga', num('amt', x.amtU)), field('Volume total', num('vol', 'mL')), field('Como preparar', note, { cls: 'note' }), right);
      upd();
      return row;
    }
    draw();
  }

  /* ---------- aviso ---------- */
  function avisoScreen() {
    topT.textContent = 'Aviso';
    const d = F.dados.data;
    const pv = h('div', { class: 'aviso', style: 'margin:0' }, u.icon('alert'), h('span', null, d.aviso));
    const state = h('span');
    const upd = () => { pv.lastChild.textContent = d.aviso; pv.hidden = !d.aviso.trim(); state.innerHTML = ''; state.append(d.aviso.trim() ? tag('Ativo', 'new') : tag('Desligado')); clr.hidden = !d.aviso; };
    const ta = inp(d, 'aviso', { area: true, grow: true, rows: 3, ph: 'Ex.: Protocolo de sepse atualizado em novembro. Novas receitas de dermatologia.', on: upd });
    const clr = h('button', { type: 'button', class: 'ad-btn sm ghost', onclick: () => { d.aviso = ''; ta.value = ''; grow(ta); touch(); upd(); } }, ic('x'), 'Apagar aviso');
    view.append(head('Aviso', 'Mensagem curta no topo da página inicial das calculadoras, para todos os colegas.'),
      card(null, null, h('div', { class: 'ad-card-h' }, h('h2', { class: 'ad-h2' }, 'Mensagem'), state, h('span', { class: 'r' }, clr)), field('Texto (deixe vazio para não mostrar nada)', ta)),
      card('Como vai aparecer', null, pv));
    upd();
  }

  /* ---------- histórico e backups ---------- */
  function histScreen() {
    topT.textContent = 'Histórico e backups';
    const box = h('div', { class: 'ad-list' }, h('div', { class: 'ad-empty' }, h('span', { class: 'ad-spin', style: 'display:inline-block' }), h('div', null, 'Carregando o histórico…')));
    const rel = h('div');
    view.append(head('Histórico e backups', 'Cada publicação fica registrada e pode ser restaurada. Nada se perde.'),
      card('Backups', 'Além do registro abaixo, toda segunda-feira é gerado um backup completo do site.',
        h('div', { class: 'ad-acts' },
          h('a', { class: 'ad-btn', href: `https://github.com/${cfg.repo}/archive/refs/heads/${cfg.branch}.zip` }, ic('down'), 'Baixar o site inteiro (.zip)'),
          h('button', { type: 'button', class: 'ad-btn', onclick: () => saveFile(F.dados.text(F.dados.base), 'dados-' + u.today() + '.js') }, ic('down'), 'Receitas, diluições e aviso'),
          h('button', { type: 'button', class: 'ad-btn', onclick: () => saveFile(F.desc.text(F.desc.base), 'descricoes-' + u.today() + '.js') }, ic('down'), 'Descrições cirúrgicas')), rel),
      h('div', { style: 'height:16px' }),
      h('h2', { class: 'ad-h2', style: 'margin:8px 0 12px' }, 'Publicações'), box);
    (async () => {
      try {
        const q = p => ghPub(`https://api.github.com/repos/${cfg.repo}/commits?path=${encodeURIComponent(p)}&sha=${encodeURIComponent(cfg.branch)}&per_page=30`);
        const [a, b] = await Promise.all([q(F.dados.path), q(F.desc.path)]);
        const all = a.map(c => Object.assign(c, { fk: 'dados' })).concat(b.map(c => Object.assign(c, { fk: 'desc' })))
          .sort((x, y) => new Date(y.commit.author.date) - new Date(x.commit.author.date)).slice(0, 40);
        const latest = { dados: a[0] && a[0].sha, desc: b[0] && b[0].sha };
        box.innerHTML = '';
        if (!all.length) { box.append(h('div', { class: 'ad-empty' }, 'Nenhuma publicação registrada ainda.')); return; }
        all.forEach(c => {
          const who = (c.author && c.author.login) || (c.commit.author && c.commit.author.name) || '';
          const msg = c.commit.message.split('\n')[0].replace(/^Painel do editor: /, '');
          const when = fmtDate(c.commit.author.date), cur = latest[c.fk] === c.sha;
          box.append(h('div', { class: 'ad-ver' },
            h('div', { style: 'display:flex;gap:8px;align-items:center;flex-wrap:wrap' }, h('b', null, when), tag(c.fk === 'desc' ? 'Descrições' : 'Receitas e dados'), cur && tag('Versão atual', 'acc'), who && h('span', { class: 'ad-hint' }, who)),
            h('p', null, msg),
            h('div', { class: 'r' },
              h('a', { class: 'ad-ib', href: c.html_url, target: '_blank', rel: 'noopener', title: 'Ver o que mudou', 'aria-label': 'Ver o que mudou' }, ic('ext')),
              h('button', { type: 'button', class: 'ad-ib', 'aria-label': 'Mais ações', onclick: e => menu(e.currentTarget, [
                { icon: 'down', label: 'Baixar esta versão', fn: () => getVersion(c.fk, c.sha).then(t => saveFile(t, (c.fk === 'desc' ? 'descricoes-' : 'dados-') + c.sha.slice(0, 7) + '.js')).catch(e2 => toast('Falhou: ' + e2.message, { crit: true })) },
                !cur && { icon: 'undo', label: 'Restaurar esta versão', fn: () => restore(c.fk, c.sha, when) }]) }, ic('more')))));
        });
      } catch (e) { box.innerHTML = ''; box.append(h('div', { class: 'ad-empty' }, h('b', null, 'Não carregou o histórico'), e.message)); }
      try {
        const rs = (await ghPub(`https://api.github.com/repos/${cfg.repo}/releases?per_page=12`)).filter(r => /^backup-/.test(r.tag_name));
        if (rs.length) rel.append(h('div', { class: 'ad-pend' }, rs.map(r => h('div', { class: 'ad-pend-row' }, ic('hist'), h('span', null, 'Backup semanal de ' + fmtDate(r.created_at)),
          h('a', { class: 'ad-btn sm', href: (r.assets && r.assets[0] && r.assets[0].browser_download_url) || r.html_url }, 'Baixar')))));
      } catch (e) { }
    })();
  }
  async function getVersion(fk, sha) {
    const r = await fetch(`https://raw.githubusercontent.com/${cfg.repo}/${sha}/${F[fk].path}`, { cache: 'no-store' });
    if (!r.ok) throw new Error('erro ' + r.status); return r.text();
  }
  async function restore(fk, sha, when) {
    if (!await ask('Restaurar esta versão?', `A versão de ${when} (${fk === 'desc' ? 'descrições cirúrgicas' : 'receitas, diluições e aviso'}) vai para o painel como rascunho, no lugar do que está lá agora. Confira e publique para valer no site.`, 'Restaurar')) return;
    try {
      const f = F[fk]; f.data = f.norm(parseFile(await getVersion(fk, sha))); S.restored[fk] = when;
      storePatch(); go('inicio'); toast(`Versão de ${when} carregada. Confira e publique.`);
    } catch (e) { toast('Não foi possível restaurar: ' + e.message, { crit: true }); }
  }
  function saveFile(txt, name) { const a = h('a', { href: URL.createObjectURL(new Blob([txt], { type: 'text/javascript' })), download: name }); document.body.append(a); a.click(); a.remove(); }

  /* ---------- ajustes ---------- */
  function cfgScreen() {
    topT.textContent = 'Ajustes';
    const d = F.dados.data, msg = h('div');
    const ghState = cfg.token ? info('ok', 'Conectado neste aparelho. O botão Publicar grava direto no site. A chave fica guardada aqui, cifrada com a sua senha.')
      : info('warn', 'Ainda não conectado neste aparelho. Ao publicar pela primeira vez, o painel mostra o passo a passo.');
    const code = inp(d, 'estatisticas', { ph: 'ex.: brunomichels', on: v => { const c = v.toLowerCase().replace(/[^a-z0-9-]/g, ''); if (c !== v) { d.estatisticas = c; code.value = c; } } });
    view.append(head('Ajustes', null),
      card('Conexão com o GitHub', 'O site fica hospedado no GitHub. Para publicar, o painel usa uma chave da sua conta.', ghState,
        h('div', { class: 'ad-acts' },
          h('button', { type: 'button', class: 'ad-btn', onclick: () => connect(() => render()) }, cfg.token ? 'Trocar a chave' : 'Conectar agora'),
          cfg.token && h('button', { type: 'button', class: 'ad-btn ghost', onclick: test }, 'Testar conexão'),
          cfg.token && h('button', { type: 'button', class: 'ad-btn ghost danger', onclick: async () => { if (await ask('Remover a chave?', 'Para publicar deste aparelho de novo, será preciso conectar outra vez.', 'Remover', true)) { await setToken(''); render(); } } }, 'Remover deste aparelho')), msg),
      card('Contador de acessos', 'Mostra quantas pessoas usam o site, quais ferramentas abrem e de onde, sem cookies e sem identificar ninguém. Usa o GoatCounter, gratuito.',
        field('Código do contador', code, { hint: 'Crie a conta em goatcounter.com/signup, use o mesmo código aqui e publique.' }),
        d.estatisticas && h('div', { class: 'ad-acts' }, h('a', { class: 'ad-btn', href: `https://${d.estatisticas}.goatcounter.com`, target: '_blank', rel: 'noopener' }, ic('ext'), 'Abrir o painel de acessos'))),
      card('Aparência', null, seg([['dark', 'Escuro'], ['light', 'Claro']], document.body.dataset.theme, v => { document.body.dataset.theme = v; u.SAVE('drb_theme', v); chrome(); })),
      card(null, null, h('details', { class: 'ad-help' }, h('summary', null, 'Avançado'),
        h('div', { class: 'ad-grid' }, field('Repositório', inp(cfg, 'repo', { on: saveCfg })), field('Branch', inp(cfg, 'branch', { on: saveCfg }))))));
    async function test() {
      msg.innerHTML = ''; msg.append(h('p', { class: 'ad-hint' }, 'Testando…'));
      try { const r = await gh('GET', `https://api.github.com/repos/${cfg.repo}`); msg.innerHTML = ''; msg.append(r.permissions && r.permissions.push ? info('ok', 'Conexão funcionando: pode publicar.') : info('crit', 'A chave abre o repositório, mas não tem permissão de escrita.')); }
      catch (e) { msg.innerHTML = ''; msg.append(info('crit', 'Falhou: ' + e.message)); }
    }
  }
  const TOKEN_URL = () => 'https://github.com/settings/personal-access-tokens/new?name=' + encodeURIComponent('Painel calculadoras') +
    '&description=' + encodeURIComponent('Publicar alterações do painel do editor') + '&target_name=' + encodeURIComponent(cfg.repo.split('/')[0]) + '&expires_in=365&contents=write';
  function connect(after) {
    const i = h('input', { type: 'password', class: 'ad-in', autocomplete: 'off', placeholder: 'github_pat_…', 'aria-label': 'Chave do GitHub' });
    const msg = h('div');
    const dl = dialog({ title: 'Conectar ao GitHub', body: [
      h('p', { class: 'ad-hint' }, 'Faça uma vez em cada aparelho. A chave fica guardada só aqui, cifrada com a sua senha.'),
      h('ol', { class: 'steps' },
        h('li', null, h('a', { href: TOKEN_URL(), target: '_blank', rel: 'noopener' }, 'Abrir o GitHub para gerar a chave'), '. Nome, validade e permissão já vêm preenchidos.'),
        h('li', null, 'Em ', h('b', null, 'Repository access'), ', escolha ', h('b', null, 'Only select repositories'), ' e marque ', h('b', null, cfg.repo.split('/')[1]), '.'),
        h('li', null, 'No fim da página, toque em ', h('b', null, 'Generate token'), ', copie a chave e cole abaixo.')),
      i, msg],
      actions: [{ label: 'Cancelar' }, { label: 'Conectar', cls: 'pri', fn: go2 }] });
    i.addEventListener('keydown', e => { if (e.key === 'Enter') go2(); });
    async function go2() {
      const t = i.value.trim(); if (!t) { i.focus(); return; }
      msg.innerHTML = ''; msg.append(h('p', { class: 'ad-hint' }, 'Conferindo a chave…'));
      cfg.token = t;
      try {
        const r = await gh('GET', `https://api.github.com/repos/${cfg.repo}`);
        if (!(r.permissions && r.permissions.push)) throw new Error('a chave não tem permissão de escrita (Contents: Read and write) em ' + cfg.repo);
        await setToken(t); dl.close(); toast('Conectado. Agora o botão Publicar grava direto no site.'); track('editor/conectou');
        if (after) after(); else render();
      } catch (e) { cfg.token = ''; msg.innerHTML = ''; msg.append(info('crit', 'Não conectou: ' + e.message)); }
    }
  }

  /* ---------- GitHub ---------- */
  async function gh(method, url, payload) {
    await ready;
    if (!cfg.token) throw new Error('o painel ainda não está conectado ao GitHub');
    const r = await fetch(url, { method, cache: 'no-store', headers: { Authorization: 'Bearer ' + cfg.token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }, body: payload ? JSON.stringify(payload) : undefined });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      const e = new Error((r.status === 401 ? 'chave inválida ou expirada' : r.status === 403 || r.status === 404 ? 'sem permissão para este repositório' : r.status === 409 ? 'o site mudou durante a gravação' : r.status === 422 ? 'o GitHub recusou o arquivo' : 'erro ' + r.status) + (j.message ? ' (' + j.message + ')' : ''));
      e.status = r.status; throw e;
    }
    return j;
  }
  async function ghPub(url) {
    await ready;
    if (cfg.token) return gh('GET', url);
    const r = await fetch(url, { cache: 'no-store', headers: { Accept: 'application/vnd.github+json' } });
    if (!r.ok) throw new Error(r.status === 403 ? 'limite de consultas do GitHub atingido; conecte o painel em Ajustes ou tente em 1 hora' : 'erro ' + r.status);
    return r.json();
  }
  const contentsUrl = p => `https://api.github.com/repos/${cfg.repo}/contents/${p}`;
  const b64 = str => { const bytes = new TextEncoder().encode(str); let bin = ''; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(bin); };
  const unb64 = s => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\s/g, '')), c => c.charCodeAt(0)));
  async function remote(f) {
    try {
      const j = await gh('GET', contentsUrl(f.path) + '?ref=' + encodeURIComponent(cfg.branch));
      let txt = j.content ? unb64(j.content) : '';
      if (!txt && j.download_url) txt = await (await fetch(j.download_url, { cache: 'no-store' })).text();
      return { obj: f.norm(parseFile(txt)), sha: j.sha };
    } catch (e) { throw e; }
  }

  /* ---------- revisar e publicar ---------- */
  function review() {
    closeMenu();
    const ch = changes();
    if (!ch.length) { toast('Nada para publicar: o site já está igual ao painel.'); return; }
    if (S.busy) return;
    const pr = problems(), body = [];
    const byArea = {};
    ch.forEach(c => { (byArea[c.area] = byArea[c.area] || []).push(c); });
    const rv = h('div', { class: 'ad-rv' });
    Object.keys(AREA).forEach(a => {
      if (!byArea[a]) return;
      rv.append(h('h3', null, AREA[a]), h('ul', null, byArea[a].map(c => h('li', null, tag(TYPE[c.type], c.type), c.href ? h('a', { href: c.href, onclick: () => d.close() }, c.title) : h('span', null, c.title), c.sub && h('span', { class: 'ad-hint' }, c.sub)))));
    });
    body.push(h('p', { class: 'ad-hint' }, `${plural(ch.length, 'alteração vai', 'alterações vão')} para o site. Os colegas veem em poucos minutos, ao recarregar a página.`), rv);
    if (pr.length) body.push(info('warn', h('b', null, 'Confira antes:'), h('ul', { style: 'margin:6px 0 0;padding-left:18px' }, pr.map(p => h('li', null, p.href ? h('a', { href: p.href, onclick: () => d.close() }, p.t) : p.t)))));
    if (!cfg.token) body.push(info('', 'Este aparelho ainda não está conectado ao GitHub. Ao continuar, o painel mostra como conectar (uma vez só).'));
    const d = dialog({ title: 'Revisar e publicar', wide: true, body, actions: [{ label: 'Voltar' }, { label: pr.length ? 'Publicar mesmo assim' : 'Publicar para todos', cls: 'pri', fn: c => { c(); publish(); } }] });
  }
  async function publish() {
    await ready;
    if (!cfg.token) { connect(publish); return; }
    if (S.busy) return;
    S.busy = true; chrome();
    let merged = false;
    try {
      for (const fk of ['dados', 'desc']) {
        const f = F[fk], patch = diff(f);
        if (!patch) continue;
        const message = commitMsg(fk);
        for (let tries = 0; ; tries++) {
          const rem = await remote(f);
          let out = f.data;
          if (noDate(rem.obj) !== noDate(f.base)) { out = apply(rem.obj, patch, f.schema); merged = true; }
          try {
            const res = await gh('PUT', contentsUrl(f.path), { message, content: b64(f.text(out)), branch: cfg.branch, sha: rem.sha });
            setBase(f, clone(out)); f.data = clone(out); f.sha = res.content && res.content.sha; delete S.restored[fk];
            break;
          } catch (e) { if ((e.status === 409 || e.status === 422) && tries < 2) continue; throw e; }
        }
        storePatch();
      }
      track('editor/salvou');
      toast(merged ? 'Publicado. O site tinha alterações mais novas, feitas em outro lugar, e elas foram mantidas junto com as suas.' : 'Publicado para todos. Os colegas veem em poucos minutos, ao recarregar a página.', { ms: 7000 });
    } catch (e) {
      toast('Não publicou: ' + e.message + '. Nada foi perdido; tente de novo.', { crit: true, ms: 10000 });
      if (e.status === 401) await setToken('');
    }
    S.busy = false; render();
  }

  /* ---------- contador de acessos ---------- */
  let gcReady = false;
  function track(path) {
    const code = F.dados.base && F.dados.base.estatisticas;
    if (!code) return;
    const send = () => { try { window.goatcounter.count({ path, title: path, event: true }); } catch (e) { } };
    if (window.goatcounter && window.goatcounter.count) return send();
    if (gcReady) return;
    gcReady = true; window.goatcounter = { no_onload: true };
    const s = document.createElement('script'); s.async = true; s.src = 'https://gc.zgo.at/count.js'; s.dataset.goatcounter = `https://${code}.goatcounter.com/count`;
    s.onload = send; document.head.append(s);
  }

  /* ---------- início: carrega os dados mais recentes ---------- */
  async function load() {
    root.append(h('div', { class: 'ad-loading' }, h('div', { class: 'ad-spin' }), 'Carregando o conteúdo…'));
    await ready;
    const stored = u.LS(PK, {}) || {};
    let viaSite = false;
    try {
      for (const fk of ['dados', 'desc']) {
        const f = F[fk]; let obj = null;
        if (cfg.token) {
          try { const r = await remote(f); obj = r.obj; f.sha = r.sha; }
          catch (e) {
            if (e.status === 401) { await setToken(''); S.loadErr = 'A chave do GitHub expirou ou foi removida. Conecte de novo em Ajustes para publicar.'; }
            else S.loadErr = 'Não consegui ler a versão mais recente pelo GitHub (' + e.message + '). Os dados vieram do site e podem estar alguns minutos atrasados; ao publicar, o painel confere de novo.';
          }
        }
        if (!obj) { viaSite = true; const r = await fetch(f.local, { cache: 'no-store' }); if (!r.ok) throw new Error('erro ' + r.status + ' ao abrir ' + f.local); obj = f.norm(parseFile(await r.text())); }
        setBase(f, obj);
        f.data = apply(obj, stored[fk], f.schema);
      }
    } catch (e) {
      root.innerHTML = '';
      root.append(h('div', { class: 'ad-login' }, h('div', { class: 'ad-login-card' }, h('h1', null, 'Não foi possível carregar'), h('p', null, e.message), h('button', { type: 'button', class: 'ad-btn pri', onclick: () => location.reload() }, 'Tentar de novo'))));
      return;
    }
    S.src = viaSite ? 'site' : 'github';
    root.innerHTML = ''; root.append(app); document.body.append(toasts);
    if (!location.hash || location.hash === '#' || location.hash === '#/') history.replaceState(null, '', '#/inicio');
    render();
    track('editor/entrou');
  }
  load();
})();
