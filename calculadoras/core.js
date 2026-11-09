/* Calculadoras de plantão | Dr. Bruno Michels | núcleo: utilitários, hub, motor de formulários */
(function () {
  'use strict';
  const D = window.DRB = {
    tools: [],
    groups: [
      { id: 'med', c: '#e9b766', title: 'Medicações e infusões' },
      { id: 'rx', c: '#e6a3c4', title: 'Receitas prontas' },
      { id: 'cir', c: '#ee9474', title: 'Cirurgia e trauma' },
      { id: 'desc', c: '#e8c48a', title: 'Descrições cirúrgicas' },
      { id: 'ped', c: '#71cbe3', title: 'Pediatria e emergência' },
      { id: 'esc', c: '#a9cf7c', title: 'Escores clínicos' },
      { id: 'lab', c: '#bda6ec', title: 'Renal, metabólico e gasometria' },
      { id: 'vent', c: '#93b6f2', title: 'Ventilação, oxigênio e fluidos' },
      { id: 'util', c: '#b9c2cb', title: 'Utilidades do plantão' },
      { id: 'peri', c: '#a0a9b2', title: 'Perícia' }
    ]
  };
  D.add = (...t) => D.tools.push(...t);
  D.links = [];
  const u = D.u = {};

  /* ---------- utilitários ---------- */
  u.num = s => {
    if (typeof s === 'number') return s;
    const n = parseFloat(String(s == null ? '' : s).trim().replace(',', '.'));
    return isFinite(n) ? n : NaN;
  };
  u.fmt = (n, d = 1) => isFinite(n) ? n.toLocaleString('pt-BR', { maximumFractionDigits: d, minimumFractionDigits: 0 }) : 'n/d';
  // casas decimais conforme a grandeza (volumes em mL)
  u.auto = n => !isFinite(n) ? 'n/d' : u.fmt(n, Math.abs(n) >= 100 ? 0 : Math.abs(n) >= 10 ? 1 : 2);
  u.norm = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  u.LS = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
  u.SAVE = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } };
  u.range = (a, b, d = 1) => (Math.abs(a - b) < 1e-9 ? u.fmt(a, d) : u.fmt(a, d) + ' a ' + u.fmt(b, d));
  u.rangeAuto = (a, b) => (Math.abs(a - b) < 1e-9 ? u.auto(a) : u.auto(a) + ' a ' + u.auto(b));
  u.dv = n => String(n).replace('.', ',');
  u.today = () => new Date().toLocaleDateString('sv-SE');

  const h = u.h = (tag, props, ...kids) => {
    const el = document.createElement(tag);
    if (props) for (const k in props) {
      const v = props[k];
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids.flat(Infinity)) {
      if (c == null || c === false) continue;
      el.append(c.nodeType ? c : document.createTextNode(c));
    }
    return el;
  };

  const ICONS = {
    star: '<path d="M12 2.5l3 6.1 6.7 1-4.9 4.7 1.2 6.7L12 17.9l-6 3.1 1.2-6.7-4.9-4.7 6.7-1z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
    back: '<path d="M15 18l-6-6 6-6"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 012-2h10"/>',
    alert: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18h.01"/>',
    hist: '<path d="M3 12a9 9 0 109-9 9 9 0 00-6.4 2.6L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    chev: '<path d="M9 6l6 6-6 6"/>',
    home: '<path d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/>'
  };
  const icon = u.icon = (n, fill, size) => {
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('class', 'ico' + (fill ? ' fill' : ''));
    if (size) { s.style.width = s.style.height = size + 'px'; }
    s.setAttribute('aria-hidden', 'true');
    s.innerHTML = ICONS[n];
    return s;
  };

  /* ---------- construtores de campos ---------- */
  const F = D.f = {};
  F.N = (id, label, o) => Object.assign({ type: 'num', id, label }, o);
  F.SEL = (id, label, options, o) => Object.assign({ type: 'sel', id, label, options, full: true }, o);
  F.SEG = (id, label, options, o) => Object.assign({ type: 'seg', id, label, options }, o);
  F.CHK = (id, label, pts, o) => Object.assign({ type: 'chk', id, label, pts }, o);
  F.DATE = (id, label, o) => Object.assign({ type: 'date', id, label }, o);
  F.SEC = label => ({ type: 'sec', label });
  F.NOTE = text => ({ type: 'note', text });
  F.BTN = (label, action) => ({ type: 'btn', id: '_btn_' + label, label, action });
  F.KG = o => F.N('kg', 'Peso', Object.assign({ unit: 'kg', p: 'kg' }, o));
  F.CM = o => F.N('cm', 'Altura', Object.assign({ unit: 'cm', p: 'cm' }, o));
  F.AGE = o => Object.assign({ type: 'age', id: 'age', label: 'Idade' }, o);
  F.SEX = o => F.SEL('sex', 'Sexo', [['', 'Selecione'], ['M', 'Masculino'], ['F', 'Feminino']], Object.assign({ p: 'sex', full: false }, o));

  // Fábrica de escores: itens com opções (pontos) ou caixas de seleção.
  // items: {id,label,opts:[[pts,texto],...]} | {id,label,chk:pts}
  F.score = function (def) {
    const items = def.items;
    const tool = {
      id: def.id, g: def.g || 'esc', title: def.title, desc: def.desc, kw: def.kw || '',
      fields: v => {
        const out = [];
        (def.pre || []).forEach(x => out.push(x));
        items.forEach(it => {
          if (it.sec) out.push(F.SEC(it.sec));
          else if (it.chk != null) out.push(F.CHK(it.id, it.label, it.chk));
          else out.push(F.SEL(it.id, it.label, it.opts.map(o => [String(o[0]), o[1]]), { def: String(it.opts[0][0]) }));
        });
        return out;
      },
      calc: v => {
        let total = 0; const parts = [];
        items.forEach(it => {
          if (it.sec) return;
          if (it.chk != null) { if (v[it.id]) { total += it.chk; parts.push(it.short || it.label); } }
          else {
            const pts = Number(v[it.id]); total += pts;
            const o = it.opts.find(x => String(x[0]) === String(v[it.id]));
            if (pts !== 0 && o) parts.push((it.short || it.label) + ': ' + o[1]);
          }
        });
        let ex = { pts: 0, parts: [] };
        if (def.extra) { ex = def.extra(v) || ex; total += ex.pts; parts.push(...ex.parts); }
        if (def.round) total = def.round(total);
        const it = def.interp(total, v) || {};
        const r = {
          main: { label: 'Pontuação', value: u.fmt(total, def.dec == null ? 0 : def.dec), unit: def.max != null ? 'de ' + u.fmt(def.max, 1) : (def.unit || 'pontos') },
          sub: it.title, rows: it.rows || [], alerts: it.text ? [{ lvl: it.lvl || 'info', text: it.text }] : [],
          notes: it.notes || []
        };
        r.text = (`${def.title}: ${u.fmt(total, def.dec == null ? 0 : def.dec)}${def.max != null ? '/' + u.fmt(def.max, 1) : ''} pontos` +
          (it.title ? ` (${it.title})` : '') + (parts.length ? '. Itens: ' + parts.join('; ') : '') + (it.text ? '. ' + it.text : '') + '.').replace(/\.\.$/, '.');
        return r;
      }
    };
    return tool;
  };

  /* ---------- estado ---------- */
  const S = D.S = {
    theme: u.LS('drb_theme', 'dark'),
    favs: u.LS('drb_favs', ['dose', 'inf']),
    recents: u.LS('drb_recents', []),
    patient: Object.assign({ kg: '', age: '', ageU: 'a', sex: '', cm: '' }, u.LS('drb_patient', {})),
    vals: {}, q: ''
  };
  const savePatient = D.savePatient = () => { u.SAVE('drb_patient', S.patient); chip(); };
  const ageLabel = () => {
    const a = S.patient.age; if (a === '' || a == null) return '';
    return a + ' ' + ({ a: 'anos', m: 'meses', d: 'dias' }[S.patient.ageU] || 'anos');
  };
  function chip() {
    const el = document.getElementById('pt'); if (!el) return;
    const p = S.patient;
    const bits = [p.kg !== '' && p.kg + ' kg', ageLabel(), p.sex, p.cm !== '' && p.cm + ' cm'].filter(Boolean);
    el.hidden = !bits.length;
    el.textContent = '';
    if (bits.length) { el.append(icon('user', false, 16), ...bits.map(b => h('span', { class: 'tok' }, b))); el.title = 'Paciente atual. Toque para editar.'; }
  }

  /* ---------- hub ---------- */
  const app = () => document.getElementById('app');
  const isFav = id => S.favs.includes(id);
  function toggleFav(id) {
    S.favs = isFav(id) ? S.favs.filter(f => f !== id) : [...S.favs, id];
    u.SAVE('drb_favs', S.favs);
    if (typeof sideRefresh === 'function') sideRefresh(sideKeyT, sideKeyG);
  }
  const grpName = id => (D.groups.find(g => g.id === id) || {}).title || '';

  function hubView(gid) {
    const root = h('main', { class: 'wrap' });
    const G = gid && D.groups.find(g => g.id === gid);
    const byId = id => D.tools.find(t => t.id === id);
    const row = t => {
      const g = D.groups.find(x => x.id === t.g) || {};
      const a = h('a', { class: 'trow-a', href: t.href || '#/' + t.id, target: t.href && t.href[0] !== '#' ? '_blank' : null, rel: t.href && t.href[0] !== '#' ? 'noopener' : null },
        h('span', { class: 'tt' }, t.title), h('span', { class: 'td' }, t.desc));
      const st = h('button', { class: 'star' + (isFav(t.id) ? ' on' : ''), type: 'button', title: isFav(t.id) ? 'Remover dos favoritos' : 'Adicionar aos favoritos', 'aria-label': 'Favoritar ' + t.title, 'aria-pressed': isFav(t.id) ? 'true' : 'false',
        onclick: e => { e.preventDefault(); toggleFav(t.id); draw(); } }, icon('star', isFav(t.id)));
      return h('li', { class: 'trow', style: '--gc:' + (g.c || 'var(--cyan)') }, a, st);
    };
    const box = h('div');
    function draw() {
      box.innerHTML = '';
      if (G) {
        root.querySelector('.title').textContent = G.title;
      } else {
        const av = ((window.DRB_DATA || {}).aviso || '').trim();
        if (av) box.append(h('div', { class: 'aviso', role: 'note' }, icon('alert'), h('span', null, av)));
        box.append(patientPanel());
        const favs = S.favs.map(byId).filter(Boolean), rec = S.recents.map(byId).filter(t => t && !S.favs.includes(t.id)).slice(0, 5);
        if (favs.length || rec.length) {
          const q = h('section', { class: 'quick' });
          if (favs.length) q.append(h('h2', { class: 'qh' }, 'Favoritos'), h('div', { class: 'chips' }, favs.map(t => h('a', { class: 'qchip fav', href: t.href || '#/' + t.id }, icon('star', true, 14), t.title))));
          if (rec.length) q.append(h('h2', { class: 'qh' }, 'Usadas recentemente'), h('div', { class: 'chips' }, rec.map(t => h('a', { class: 'qchip', href: t.href || '#/' + t.id }, t.title))));
          box.append(q);
        }
      }
      D.groups.forEach(g => {
        if (G && g.id !== G.id) return;
        const ts = D.tools.filter(t => t.g === g.id); if (!ts.length) return;
        box.append(h('section', { class: 'grp', style: '--gc:' + (g.c || 'var(--cyan)'), id: 'grp-' + g.id },
          !G && h('h2', { class: 'grp-t' }, h('a', { href: '#/g/' + g.id }, h('i', { class: 'dot' }), g.title, h('span', { class: 'n' }, ts.length + ''))),
          h('ul', { class: 'tlist' }, ts.map(row))));
      });
      box.append(disclaimer('Ferramentas de apoio à decisão. Não substituem o julgamento clínico. Confira doses, diluições e indicações com o protocolo da sua instituição e a bula antes de prescrever ou administrar.'));
      if (!G) box.append(h('p', { class: 'adm-link' }, ((window.DRB_DATA || {}).estatisticas ? 'Este site registra estatísticas anônimas de uso, sem cookies e sem dados pessoais. ' : ''), h('a', { href: 'admin.html' }, 'Painel do editor')));
    }
    root.append(h('h1', { class: 'title' }, G ? G.title : 'Plantão'),
      h('p', { class: 'lead' }, G ? 'Toque em uma ferramenta para abrir. A estrela fixa a ferramenta nos favoritos.' : 'Informe o paciente uma vez: peso, idade e sexo preenchem todas as calculadoras.'), box);
    draw();
    return root;
  }
  function patientPanel() {
    const p = S.patient;
    const f = (id, label, unit, w) => h('label', { class: 'pf ' + (w || '') }, h('span', null, label),
      h('span', { class: 'pfin' }, h('input', { inputmode: 'decimal', autocomplete: 'off', value: p[id] || '', 'aria-label': label, oninput: e => { S.patient[id] = e.target.value; S.vals = {}; savePatient(); } }), unit && h('span', { class: 'u' }, unit)));
    const ageU = h('select', { 'aria-label': 'Unidade da idade', onchange: e => { S.patient.ageU = e.target.value; S.vals = {}; savePatient(); } }, [['a', 'anos'], ['m', 'meses'], ['d', 'dias']].map(([v, l]) => h('option', { value: v }, l)));
    ageU.value = p.ageU || 'a';
    const age = h('label', { class: 'pf' }, h('span', null, 'Idade'), h('span', { class: 'pfin' }, h('input', { inputmode: 'decimal', autocomplete: 'off', value: p.age || '', 'aria-label': 'Idade', oninput: e => { S.patient.age = e.target.value; S.vals = {}; savePatient(); } }), ageU));
    const sex = h('div', { class: 'pf' }, h('span', null, 'Sexo'), h('div', { class: 'pseg', role: 'group', 'aria-label': 'Sexo' }, [['M', 'Masc.'], ['F', 'Fem.']].map(([v, l]) =>
      h('button', { type: 'button', class: p.sex === v ? 'on' : '', 'aria-pressed': p.sex === v ? 'true' : 'false', onclick: e => { S.patient.sex = S.patient.sex === v ? '' : v; S.vals = {}; savePatient(); e.currentTarget.parentNode.querySelectorAll('button').forEach(b => { const on = b === e.currentTarget && S.patient.sex === v; b.className = on ? 'on' : ''; b.setAttribute('aria-pressed', on); }); } }, l))));
    const clear = h('button', { type: 'button', class: 'pclear', onclick: () => { S.patient = { kg: '', age: '', ageU: 'a', sex: '', cm: '' }; S.vals = {}; savePatient(); route(); } }, 'Novo paciente');
    return h('section', { class: 'pat', 'aria-label': 'Paciente atual' },
      h('div', { class: 'pat-h' }, h('h2', null, 'Paciente atual'), clear),
      h('div', { class: 'pat-g' }, f('kg', 'Peso', 'kg'), age, sex, f('cm', 'Altura', 'cm')));
  }
  const disclaimer = txt => h('p', { class: 'disc' }, icon('alert'), txt);

  /* ---------- tela de ferramenta ---------- */
  function toolView(t, sub) {
    const st = S.vals[t.id] || (S.vals[t.id] = { raw: {} });
    const raw = st.raw;
    const root = h('main', { class: 'wrap' });
    const starB = h('button', { class: 'icon-btn star-b' + (isFav(t.id) ? ' on' : ''), type: 'button', title: 'Favoritar', 'aria-label': 'Favoritar', onclick: () => { toggleFav(t.id); starB.className = 'icon-btn star-b' + (isFav(t.id) ? ' on' : ''); starB.innerHTML = ''; starB.append(icon('star', isFav(t.id))); } }, icon('star', isFav(t.id)));
    root.append(
      h('div', { class: 'toprow' }, h('a', { class: 'back', href: '#/g/' + t.g }, icon('back'), grpName(t.g)), starB),
      h('h1', { class: 'title' }, t.title),
      h('p', { class: 'tdesc' }, t.desc));
    if (t.render) {
      root.append(t.render(h, u, sub));
      root.append(disclaimer(t.disc || 'Ferramenta de apoio.'));
      return root;
    }
    const form = h('section', { class: 'panel' });
    const res = h('section', { class: 'panel result', id: 'res' });
    root.append(h('div', { class: 'tgrid' }, form, res));
    root.append(disclaimer(t.disc || 'Ferramenta de apoio. Confira doses, diluições e indicações com o protocolo da sua instituição antes de decidir a conduta.'));
    let fields = [], mini = null, last = null;

    const getFields = () => typeof t.fields === 'function' ? t.fields(Object.assign({}, raw)) : t.fields;
    function defaults() {
      fields = getFields();
      fields.forEach(f => {
        if (f.type === 'sec' || f.type === 'note' || f.type === 'btn') return;
        if (f.type === 'age') { raw[f.id] = S.patient.age; raw[f.id + 'U'] = S.patient.ageU || 'a'; return; }
        if (f.p) raw[f.id] = S.patient[f.p];
        else if (raw[f.id] === undefined) {
          if (f.def !== undefined) raw[f.id] = (typeof f.def === 'boolean' || typeof f.def === 'function') ? f.def : String(f.def);
          else if (f.type === 'chk') raw[f.id] = false;
          else if (f.type === 'date') raw[f.id] = '';
        }
        if (f.type === 'sel' || f.type === 'seg') {
          if (!f.options.some(o => String(o[0]) === String(raw[f.id]))) raw[f.id] = String(f.options[0][0]);
        }
      });
    }
    function parse() {
      const v = {};
      fields.forEach(f => {
        if (f.type === 'sec' || f.type === 'note' || f.type === 'btn') return;
        const r = raw[f.id];
        if (f.type === 'num') v[f.id] = u.num(r);
        else if (f.type === 'age') {
          const a = u.num(r), un = raw[f.id + 'U'] || 'a';
          v[f.id] = isFinite(a) ? (un === 'a' ? a : un === 'm' ? a / 12 : a / 365.25) : NaN;
          v[f.id + 'M'] = isFinite(v[f.id]) ? v[f.id] * 12 : NaN;
        } else if (f.type === 'chk') v[f.id] = !!r;
        else v[f.id] = r;
      });
      return v;
    }
    function fieldEl(f) {
      const id = 'f_' + t.id + '_' + f.id;
      const set = (val, rebuild) => {
        raw[f.id] = val;
        if (f.p) { S.patient[f.p] = val; savePatient(); }
        if (f.type === 'age') { S.patient.age = val; savePatient(); }
        if (f.reset) f.reset.forEach(k => delete raw[k]);
        if (t.onInput) t.onInput(parse(), f.id);
        if (rebuild || f.rebuild || f.reset) build(); else update();
      };
      const fc = cls => 'fld' + (f.full ? ' full' : '') + (cls ? ' ' + cls : '');
      switch (f.type) {
        case 'num':
          return h('label', { class: fc(), for: id }, h('span', { class: 'lbl' }, f.label),
            h('span', { class: 'inwrap' },
              h('input', { id, inputmode: 'decimal', autocomplete: 'off', placeholder: f.ph || '', value: raw[f.id] == null ? '' : raw[f.id], oninput: e => set(e.target.value) }),
              f.unit && h('span', { class: 'unit' }, f.unit)),
            f.hint && h('span', { class: 'fh' }, f.hint));
        case 'age': {
          const sel = h('select', { 'aria-label': 'Unidade da idade', onchange: e => { raw[f.id + 'U'] = e.target.value; S.patient.ageU = e.target.value; savePatient(); update(); } },
            [['a', 'anos'], ['m', 'meses'], ['d', 'dias']].map(([v, l]) => h('option', { value: v }, l)));
          sel.value = raw[f.id + 'U'] || 'a';
          return h('label', { class: fc(), for: id }, h('span', { class: 'lbl' }, f.label),
            h('span', { class: 'inwrap' },
              h('input', { id, inputmode: 'decimal', autocomplete: 'off', value: raw[f.id] == null ? '' : raw[f.id], oninput: e => set(e.target.value) }), sel));
        }
        case 'date':
          return h('label', { class: fc(), for: id }, h('span', { class: 'lbl' }, f.label),
            h('input', { id, type: 'date', value: raw[f.id] || '', oninput: e => set(e.target.value) }));
        case 'sel': {
          const s = h('select', { id, onchange: e => set(e.target.value) });
          let og = null, cur = null;
          f.options.forEach(o => {
            const g = o[2];
            if (g && g !== cur) { og = h('optgroup', { label: g }); s.append(og); cur = g; }
            (g ? og : s).append(h('option', { value: String(o[0]) }, o[1]));
          });
          s.value = String(raw[f.id]);
          return h('label', { class: fc(), for: id }, h('span', { class: 'lbl' }, f.label), s, f.hint && h('span', { class: 'fh' }, f.hint));
        }
        case 'seg':
          return h('div', { class: 'fld full' }, f.label && h('span', { class: 'lbl' }, f.label),
            h('div', { class: 'seg', role: 'group' }, f.options.map(o =>
              h('button', { type: 'button', class: String(raw[f.id]) === String(o[0]) ? 'on' : '', 'aria-pressed': String(raw[f.id]) === String(o[0]), onclick: () => set(String(o[0]), true) }, o[1]))));
        case 'btn':
          return h('button', { type: 'button', class: 'copy full', style: 'grid-column:1/-1;min-height:44px;font-size:16px', onclick: () => { f.action(raw); build(); } }, f.label);
        case 'chk': {
          const cb = h('input', { type: 'checkbox', id, onchange: e => set(e.target.checked) });
          cb.checked = !!raw[f.id];
          return h('label', { class: 'chk full', for: id }, cb, h('span', { class: 'box' }), h('span', { class: 'ctext' }, f.label),
            f.pts != null && h('span', { class: 'pts' }, (f.pts > 0 ? '+' : '') + f.pts));
        }
      }
      return h('span');
    }
    function build() {
      defaults();
      form.innerHTML = '';
      let grid = null;
      fields.forEach(f => {
        if (f.type === 'sec') { form.append(h('h2', { class: 'sec' }, f.label)); grid = null; return; }
        if (f.type === 'note') { form.append(h('p', { class: 'hint' }, f.text)); grid = null; return; }
        if (!grid) { grid = h('div', { class: 'fgrid' }); form.append(grid); }
        grid.append(fieldEl(f));
      });
      const nf = fields.filter(f => f.type !== 'sec' && f.type !== 'note').length;
      if (nf > 7 && !mini) {
        mini = h('div', { class: 'mini', role: 'button', onclick: () => res.scrollIntoView({ behavior: 'smooth' }) }, h('span', null, ''), h('b', null, ''));
        root.append(mini);
      }
      update();
    }
    function update() {
      let r = null;
      try { r = t.calc(parse()); } catch (e) { console.error(e); r = { alerts: [{ lvl: 'crit', text: 'Erro no cálculo: ' + e.message }] }; }
      last = r;
      renderResult(res, r, t, obj => { Object.assign(raw, obj); build(); });
      if (mini) {
        mini.hidden = !(r && r.main);
        if (r && r.main) { mini.firstChild.textContent = r.main.label || 'Resultado'; mini.lastChild.textContent = r.main.value + (r.main.unit ? ' ' + r.main.unit : ''); }
      }
    }
    build();
    return root;
  }

  function renderResult(el, r, t, onSet) {
    el.innerHTML = '';
    if (!r || (!r.main && !(r.alerts && r.alerts.length) && !r.table && !(r.rows && r.rows.length) && !(r.steps && r.steps.length))) {
      el.append(h('div', { class: 'empty' }, 'Preencha os campos para ver o resultado.')); return;
    }
    if (r.main) {
      el.append(h('div', { class: 'rlabel' }, r.main.label || 'Resultado'),
        h('div', { class: 'big' }, h('span', { class: 'bigv' + (r.main.small ? ' sm' : '') }, r.main.value), r.main.unit && h('span', { class: 'bigu' }, r.main.unit)));
    }
    if (r.sub) el.append(h('div', { class: 'sub' }, r.sub));
    (r.gauges || []).forEach(g => {
      const span = g.max - g.min, pc = x => Math.max(0, Math.min(100, (x - g.min) / span * 100));
      const bar = h('div', { class: 'gbar' }, g.zones.map(z => h('i', { class: 'z-' + z[2], style: `left:${pc(z[0])}%;width:${Math.max(0, pc(z[1]) - pc(z[0]))}%` })),
        h('b', { class: 'gmark', style: `left:${pc(g.value)}%` }));
      el.append(h('div', { class: 'gauge' }, h('div', { class: 'glab' }, h('span', null, g.label), h('span', { class: 'gv ' + (g.lvl || '') }, g.text || '')), bar,
        g.ticks && h('div', { class: 'gtk' }, g.ticks.map(t => h('span', null, t)))));
    });
    if (r.steps && r.steps.length) el.append(h('ol', { class: 'rsteps' }, r.steps.map(x => h('li', { class: x.lvl || '' }, h('b', null, x.t), h('span', null, x.d)))));
    if (r.rows && r.rows.length) el.append(h('dl', { class: 'rows' }, r.rows.map(([k, v]) => h('div', { class: 'r' }, h('dt', null, k), h('dd', null, v)))));
    (r.alerts || []).forEach(a => el.append(h('div', { class: 'alert ' + (a.lvl || '') }, icon('alert'), h('span', null, a.text))));
    if (r.table) {
      const tb = r.table;
      if (tb.title) el.append(h('h3', { class: 'ttl' }, tb.title));
      el.append(h('table', { class: 'tbl' + (tb.head.length >= 3 ? ' wide' : '') },
        h('thead', null, h('tr', null, tb.head.map(c => h('th', null, c)))),
        h('tbody', null, tb.rows.map(row => {
          if (row.sec) return h('tr', { class: 'tsec' }, h('th', { colspan: tb.head.length, scope: 'colgroup' }, row.sec));
          const cells = row.cells || row;
          return h('tr', { class: row.set ? 'click' : '', onclick: row.set ? () => onSet(row.set) : null }, cells.map((c, i) => h('td', { class: i === 0 ? 'k' : '' }, c)));
        }))));
      if (tb.cap) el.append(h('p', { class: 'cap' }, tb.cap));
    }
    (r.notes || []).forEach(n => el.append(h('p', { class: 'note' }, n)));
    const text = r.text || defaultText(t, r);
    if (text) {
      const b = h('button', { type: 'button', class: 'copy' }, icon('copy'), 'Copiar para prontuário');
      b.onclick = () => {
        const done = () => { b.lastChild.textContent = 'Copiado'; setTimeout(() => { b.lastChild.textContent = 'Copiar para prontuário'; }, 1600); };
        if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, () => fallbackCopy(text, done));
        else fallbackCopy(text, done);
      };
      el.append(b);
    }
  }
  function fallbackCopy(text, done) {
    const ta = h('textarea', { style: 'position:fixed;opacity:0' }); ta.value = text; document.body.append(ta); ta.select();
    try { document.execCommand('copy'); done(); } catch (e) { } ta.remove();
  }
  function defaultText(t, r) {
    if (!r.main) return '';
    return `${t.title}: ${r.main.value}${r.main.unit ? ' ' + r.main.unit : ''}` + (r.sub ? ` (${r.sub})` : '') +
      (r.rows && r.rows.length ? '. ' + r.rows.map(x => x[0] + ': ' + x[1]).join('; ') : '') + '.';
  }

  /* ---------- barra lateral e busca global ---------- */
  const OPEN = u.LS('drb_open', {});
  let sideKeyT = null, sideKeyG = null;
  function sideBuild() {
    const el = document.getElementById('side'); if (!el) return;
    el.innerHTML = '';
    const nav = h('nav', { 'aria-label': 'Ferramentas' });
    nav.append(h('a', { class: 'sl home', href: '#/', 'data-k': 'home' }, icon('home', false, 18), 'Início'));
    const favs = S.favs.map(id => D.tools.find(t => t.id === id)).filter(Boolean);
    if (favs.length) nav.append(sideGroup_({ id: 'fav', title: 'Favoritos', c: 'var(--read)' }, favs, true));
    D.groups.forEach(g => { const ts = D.tools.filter(t => t.g === g.id); if (ts.length) nav.append(sideGroup_(g, ts)); });
    el.append(nav);
  }
  function sideGroup_(g, ts, fav) {
    const open = fav ? OPEN.fav !== false : OPEN.cur === g.id;
    const box = h('div', { class: 'sg' + (open ? ' open' : ''), 'data-g': g.id, style: '--gc:' + g.c });
    const head = h('button', { class: 'sgh', type: 'button', 'aria-expanded': open ? 'true' : 'false', onclick: () => {
      const o = !box.classList.contains('open');
      if (!fav) { box.parentNode.querySelectorAll('.sg.open:not([data-g="fav"])').forEach(x => { if (x !== box) { x.classList.remove('open'); x.querySelector('.sgh').setAttribute('aria-expanded', 'false'); } }); OPEN.cur = o ? g.id : null; }
      else OPEN.fav = o;
      box.classList.toggle('open', o); head.setAttribute('aria-expanded', o); u.SAVE('drb_open', OPEN);
    } }, h('i', { class: 'dot' }), h('span', { class: 'gn' }, g.title), h('span', { class: 'gc' }, String(ts.length)), icon('chev', false, 16));
    const list = h('div', { class: 'sgl' }, ts.map(t => h('a', { class: 'sl', href: t.href || '#/' + t.id, target: t.href && t.href[0] !== '#' ? '_blank' : null, 'data-k': t.id + (fav ? '-f' : '') }, t.title)));
    box.append(head, list);
    return box;
  }
  function sideRefresh(tid, gid) {
    sideKeyT = tid || null; sideKeyG = gid || null;
    sideBuild();
    const el = document.getElementById('side'); if (!el) return;
    const key = tid ? tid : gid ? 'g/' + gid : 'home';
    el.querySelectorAll('.sl').forEach(a => { const k = a.getAttribute('data-k'); if (k === key || k === key + '-f') { a.classList.add('act'); a.setAttribute('aria-current', 'page'); } });
    const t = tid && D.tools.find(x => x.id === tid), g = t ? t.g : gid;
    if (g && OPEN.cur !== g) { OPEN.cur = g; u.SAVE('drb_open', OPEN); sideBuild(); el.querySelectorAll('.sl').forEach(a => { const k = a.getAttribute('data-k'); if (k === key || k === key + '-f') { a.classList.add('act'); a.setAttribute('aria-current', 'page'); } }); }
    const act = el.querySelector('.sl.act');
    if (act) { const top = act.offsetParent === el ? act.offsetTop : act.offsetTop - el.offsetTop, vis = el.clientHeight; if (top < el.scrollTop || top > el.scrollTop + vis - 60) el.scrollTop = Math.max(0, top - vis / 3); }
  }
  const closeSide = () => { document.body.classList.remove('side-open'); };
  function searchInit() {
    const inp = document.getElementById('gs'), box = document.getElementById('gsr'); if (!inp) return;
    let items = [], cur = -1;
    const run = () => {
      const q = u.norm(inp.value.trim()); box.innerHTML = ''; items = []; cur = -1;
      if (!q) { box.hidden = true; return; }
      const parts = q.split(/\s+/);
      const scored = D.tools.concat(D.links).map(t => {
        const ti = u.norm(t.title), all = u.norm(t.title + ' ' + t.desc + ' ' + (t.kw || ''));
        if (!parts.every(p => all.includes(p))) return null;
        return { t, s: (ti.startsWith(q) ? 0 : ti.includes(q) ? 1 : parts.every(p => ti.includes(p)) ? 2 : 3) };
      }).filter(Boolean).sort((a, b) => a.s - b.s).slice(0, 9);
      box.hidden = false;
      if (!scored.length) { box.append(h('div', { class: 'gse' }, 'Nenhuma ferramenta encontrada.')); return; }
      scored.forEach(({ t }) => {
        const g = D.groups.find(x => x.id === t.g) || {};
        const a = h('a', { class: 'gsi', href: t.href || '#/' + t.id, target: t.href && t.href[0] !== '#' ? '_blank' : null, style: '--gc:' + (g.c || 'var(--accent)'), onclick: () => { inp.value = ''; box.hidden = true; inp.blur(); } },
          h('span', { class: 'gk' }, g.title || ''), h('span', { class: 'gt' }, t.title), h('span', { class: 'gd' }, t.desc));
        box.append(a); items.push(a);
      });
      mark(0);
    };
    const mark = i => { items.forEach((a, j) => a.classList.toggle('on', j === i)); cur = i; if (items[i]) items[i].scrollIntoView({ block: 'nearest' }); };
    inp.addEventListener('input', run);
    inp.addEventListener('focus', () => { if (inp.value) run(); });
    inp.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); if (items.length) mark((cur + 1) % items.length); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); if (items.length) mark((cur - 1 + items.length) % items.length); }
      else if (e.key === 'Enter') { if (items[cur]) { e.preventDefault(); items[cur].click(); if (items[cur].getAttribute('target') !== '_blank') location.hash = items[cur].getAttribute('href'); } }
      else if (e.key === 'Escape') { inp.value = ''; box.hidden = true; inp.blur(); }
    });
    document.addEventListener('click', e => { if (!e.target.closest('.gsw')) box.hidden = true; });
    document.addEventListener('keydown', e => { if ((e.key === '/' || (e.key === 'k' && (e.ctrlKey || e.metaKey))) && !/INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || '')) { e.preventDefault(); inp.focus(); inp.select(); } });
  }

  /* ---------- roteamento e inicialização ---------- */
  function route() {
    const id = decodeURIComponent((location.hash || '').replace(/^#\/?/, ''));
    const gm = id.match(/^g\/(.+)$/);
    const base = gm ? '' : id.split('/')[0], sub = gm ? '' : id.slice(base.length + 1);
    const t = gm ? null : D.tools.find(x => x.id === base && !x.href);
    const lk = D.tools.find(x => x.href === '#/' + id);
    const a = app(); a.innerHTML = '';
    if (t) {
      S.recents = [t.id, ...S.recents.filter(r => r !== t.id)].slice(0, 6);
      u.SAVE('drb_recents', S.recents);
      a.append(toolView(t, sub));
      document.title = t.title + ' | Calculadoras Dr. Bruno Michels';
    } else {
      a.append(hubView(gm && gm[1]));
      document.title = 'Calculadoras de plantão | Dr. Bruno Michels';
    }
    track(id || 'inicio', t ? t.title : gm ? 'Grupo ' + gm[1] : 'Início');
    window.scrollTo(0, 0);
    sideRefresh(lk ? lk.id : t ? t.id : null, gm ? gm[1] : null);
    closeSide();
  }
  /* ---------- estatísticas anônimas de uso (GoatCounter, sem cookies) ---------- */
  const GC = ((window.DRB_DATA || {}).estatisticas || '').trim();
  let gcLoaded = false, gcQueue = [];
  function track(path, title) {
    if (!GC || !/^https?:$/.test(location.protocol) || /^(localhost|127\.)/.test(location.hostname)) return;
    const send = p => { try { window.goatcounter.count(p); } catch (e) { } };
    const p = { path: '/calculadoras/' + path, title: title || path };
    if (window.goatcounter && window.goatcounter.count) return send(p);
    gcQueue.push(p);
    if (gcLoaded) return; gcLoaded = true;
    window.goatcounter = { no_onload: true };
    const s = document.createElement('script'); s.async = true; s.src = 'https://gc.zgo.at/count.js'; s.dataset.goatcounter = 'https://' + GC + '.goatcounter.com/count';
    s.onload = () => { gcQueue.splice(0).forEach(send); };
    document.head.append(s);
  }
  D.track = track;
  function setTheme() {
    document.body.dataset.theme = S.theme;
    const b = document.getElementById('theme'); b.innerHTML = '';
    b.append(icon(S.theme === 'dark' ? 'sun' : 'moon'));
    const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = S.theme === 'dark' ? '#121920' : '#f2f5f8';
  }
  D.boot = function () {
    setTheme(); chip(); searchInit();
    const mb = document.getElementById('menu'); if (mb) mb.append(icon('menu'));
    const gsi = document.querySelector('.gsico'); if (gsi) gsi.append(icon('search'));
    if (mb) mb.onclick = () => document.body.classList.toggle('side-open');
    const ov = document.getElementById('ov'); if (ov) ov.onclick = closeSide;
    document.getElementById('theme').onclick = () => { S.theme = S.theme === 'dark' ? 'light' : 'dark'; u.SAVE('drb_theme', S.theme); setTheme(); };
    document.getElementById('pt').onclick = () => {
      if (location.hash && location.hash !== '#/') location.hash = '#/';
      setTimeout(() => { const i = document.querySelector('.pat input'); if (i) i.focus(); }, 60);
    };
    window.addEventListener('hashchange', route);
    route();
    if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) navigator.serviceWorker.register('sw.js').catch(() => { });
  };
})();
