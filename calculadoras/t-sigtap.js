/* SIGTAP e AIH: procedimentos do SUS (competência no arquivo sigtap.js), CID compatíveis e montagem de AIH com cirurgias múltiplas */
(function () {
  'use strict';
  const D = window.DRB, u = D.u;
  const MULT = '0415010012';
  const ls = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
  };
  const nrm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  /* ---------- dados (carregados sob demanda) ---------- */
  const S = D.sig = { ready: false, by: {}, list: [] };
  let waiting = null;
  S.load = cb => {
    if (S.ready) return cb && cb();
    if (waiting) { if (cb) waiting.push(cb); return; }
    waiting = cb ? [cb] : [];
    const s = document.createElement('script'); s.src = 'sigtap.js';
    s.onload = () => {
      const X = window.DRB_SIGTAP;
      X.P.forEach(a => { const p = { c: a[0], n: a[1], cx: a[2], sx: a[3], pm: a[4], i0: a[5], i1: a[6], sh: a[7], sp: a[8], r: a[9], d: a[10] ? a[10].split(' ') : [] }; p.k = nrm(p.n + ' ' + p.c); S.by[p.c] = p; S.list.push(p); });
      S.C = X.C; S.v = X.v; S.SG = X.SG; S.FO = X.FO; S.G = X.G; S.ready = true;
      S.cidList = Object.keys(X.C).map(k => ({ c: k, n: X.C[k], k: nrm(k + ' ' + S.fmtCid(k) + ' ' + X.C[k]) }));
      const w = waiting; waiting = null; w.forEach(f => f());
    };
    s.onerror = () => { const w = waiting; waiting = null; w.forEach(f => f(new Error('falhou'))); };
    document.head.append(s);
  };
  S.fmt = c => c && c.length === 10 ? c.slice(0, 2) + '.' + c.slice(2, 4) + '.' + c.slice(4, 6) + '.' + c.slice(6, 9) + '-' + c[9] : c || '';
  S.fmtCid = c => c && c.length === 4 ? c.slice(0, 3) + '.' + c[3] : c || '';
  S.label = c => { const p = S.by[c]; return S.fmt(c) + ' ' + (p ? p.n : ''); };
  S.cidName = c => (S.C && S.C[c]) || '';
  S.search = (q, opt) => {
    opt = opt || {};
    const qq = nrm(q).replace(/[.\-]/g, '').trim(); if (!qq) return [];
    const parts = qq.split(/\s+/);
    const out = [];
    for (const p of S.list) {
      if (opt.pr && p.r.indexOf('P') < 0) continue;
      if (opt.g && p.c.slice(0, 2) !== opt.g) continue;
      const k = p.k.replace(/[.\-]/g, '');
      if (parts.every(x => k.indexOf(x) >= 0)) out.push(p);
      if (out.length > 400) break;
    }
    const st = p => (p.c.startsWith(qq) ? 0 : nrm(p.n).startsWith(parts[0]) ? 1 : 2) + (p.r.indexOf('P') >= 0 ? 0 : 0.5);
    return out.sort((a, b) => st(a) - st(b) || a.n.localeCompare(b.n)).slice(0, opt.max || 60);
  };
  S.searchCid = (q, within) => {
    const qq = nrm(q).replace(/\./g, '').trim(); const parts = qq.split(/\s+/).filter(Boolean);
    const base = within ? within.map(c => ({ c, n: S.C[c] || '', k: nrm(c + ' ' + S.fmtCid(c) + ' ' + (S.C[c] || '')) })) : S.cidList;
    if (!parts.length) return base.slice(0, 80);
    return base.filter(x => parts.every(p => x.k.replace(/\./g, '').indexOf(p) >= 0)).sort((a, b) => (a.c.toLowerCase().startsWith(qq) ? 0 : 1) - (b.c.toLowerCase().startsWith(qq) ? 0 : 1) || a.c.localeCompare(b.c)).slice(0, 80);
  };
  S.cidProcs = cid => S.list.filter(p => p.d.indexOf(cid) >= 0);
  // texto da AIH: um procedimento, ou cirurgias múltiplas com a lista
  S.aihText = (codes, cid) => {
    const cs = codes.filter(Boolean); if (!cs.length) return '';
    const L = [];
    if (cs.length > 1) {
      L.push('PROCEDIMENTO PRINCIPAL: ' + S.label(MULT));
      L.push('PROCEDIMENTOS REALIZADOS:');
      cs.forEach((c, i) => L.push((i + 1) + '. ' + S.label(c)));
    } else L.push('PROCEDIMENTO: ' + S.label(cs[0]));
    if (cid) L.push('CID PRINCIPAL: ' + S.fmtCid(cid) + ' ' + S.cidName(cid).toLocaleUpperCase('pt-BR'));
    return L.join('\n');
  };
  S.MULT = MULT;
  const CX = { 0: 'Não se aplica', 1: 'Atenção básica', 2: 'Média complexidade', 3: 'Alta complexidade' };
  const SX = { M: 'Masculino', F: 'Feminino', I: 'Ambos', N: 'Não se aplica' };
  const REG = { P: 'AIH principal', E: 'AIH especial', S: 'AIH secundário' };
  const money = v => v ? 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 'R$ 0,00';
  const age = m => m >= 9999 ? 'sem limite' : m >= 12 ? Math.floor(m / 12) + ' anos' : m + ' meses';
  S.CX = CX;

  function copyText(t, btn, lbl) {
    const done = () => { if (btn) { const o = btn.lastChild.textContent; btn.lastChild.textContent = 'Copiado'; setTimeout(() => { btn.lastChild.textContent = lbl || o; }, 1500); } if (D.toast) D.toast('Copiado'); };
    const fb = () => { const x = document.createElement('textarea'); x.style.cssText = 'position:fixed;opacity:0'; x.value = t; document.body.append(x); x.select(); try { document.execCommand('copy'); done(); } catch (e) { } x.remove(); };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(t).then(done, fb); else fb();
  }
  S.copy = copyText;

  /* ---------- seletor de procedimento (usado também nas descrições) ---------- */
  S.picker = function (h, onPick, opt) {
    opt = opt || {};
    const box = h('div', { class: 'sg-pick' });
    const res = h('div', { class: 'sg-res' });
    const inp = h('input', { type: 'search', class: 'fillp-in', placeholder: opt.ph || 'Buscar procedimento por nome ou código', 'aria-label': 'Buscar procedimento SIGTAP', autocomplete: 'off',
      oninput: () => run(), onkeydown: e => { if (e.key === 'Enter') { e.preventDefault(); const b = res.querySelector('button'); if (b) b.click(); } if (e.key === 'Escape') { inp.value = ''; run(); } } });
    function run() {
      res.innerHTML = '';
      const q = inp.value.trim(); if (q.length < 2) return;
      S.load(() => {
        if (inp.value.trim() !== q) return;
        const rs = S.search(q, { max: 8, pr: opt.pr });
        if (!rs.length) { res.append(h('div', { class: 'hint' }, 'Nada encontrado.')); return; }
        rs.forEach(p => res.append(h('button', { type: 'button', class: 'sg-opt', onclick: () => { inp.value = ''; res.innerHTML = ''; onPick(p.c); } }, h('code', null, S.fmt(p.c)), h('span', null, p.n), p.r.indexOf('P') < 0 ? h('small', null, 'secundário') : '')));
      });
    }
    box.append(inp, res);
    return box;
  };

  /* ---------- ferramenta ---------- */
  const AIH = 'drb_aih';
  const tool = {
    id: 'sigtap', g: 'aih', title: 'SIGTAP: procedimentos, CID e AIH', desc: 'Busque o procedimento ou o CID, veja os CID compatíveis, valores e permanência, e monte a AIH (com cirurgias múltiplas)',
    kw: 'sigtap aih tabela sus procedimento codigo cid compativel internacao cirurgia multipla cirurgias multiplas laudo aih valor permanencia datasus',
    disc: 'Dados da Tabela de Procedimentos do SUS (SIGTAP/DATASUS). Confira a competência vigente e as regras do seu estabelecimento (habilitação, leito, OPM) antes de emitir a AIH.',
    render: (h, u2, sub) => {
      const root = h('div', { class: 'rx sg' });
      const side = h('section', { class: 'rx-l' }), doc = h('section', { class: 'rx-r' });
      root.append(side, doc);
      const st = { mode: 'p', q: '', g: '', pr: true, sel: null, cid: null, aih: ls.get(AIH, { c: [], cid: '' }) };
      if (sub && /^\d{10}$/.test(sub)) st.sel = sub; else if (sub && sub.indexOf('cid:') === 0) { st.mode = 'c'; st.cid = sub.slice(4).replace('.', '').toUpperCase(); }
      const saveAih = () => ls.set(AIH, st.aih);
      const setUrl = () => { try { history.replaceState(null, '', '#/sigtap' + (st.mode === 'c' && st.cid ? '/cid:' + st.cid : st.sel ? '/' + st.sel : '')); } catch (e) { } };
      const modeSeg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Buscar por' });
      const q = h('input', { type: 'search', class: 'rx-q', 'aria-label': 'Buscar', oninput: e => { st.q = e.target.value; list(); } });
      const gSel = h('select', { class: 'rx-catsel', 'aria-label': 'Grupo', onchange: e => { st.g = e.target.value; list(); } },
        [['', 'Todos os grupos'], ['04', 'Cirúrgicos (04)'], ['03', 'Clínicos (03)'], ['05', 'Transplantes (05)'], ['02', 'Diagnósticos (02)']].map(([v, l]) => h('option', { value: v }, l)));
      const prB = h('label', { class: 'desc-chk' }, h('input', { type: 'checkbox', onchange: e => { st.pr = e.target.checked; list(); } }), 'Só os que podem ser o principal da AIH');
      prB.firstChild.checked = st.pr;
      const ul = h('ul', { class: 'rx-list' }), cnt = h('p', { class: 'hint desc-n' });
      const aihBox = h('div', { class: 'sg-aih' });
      side.append(modeSeg, h('label', { class: 'gs rx-search' }, u.icon('search'), q), gSel, prB, cnt, ul);
      function modes() {
        modeSeg.innerHTML = '';
        [['p', 'Procedimento'], ['c', 'CID']].forEach(([v, l]) => modeSeg.append(h('button', { type: 'button', class: st.mode === v ? 'on' : '', 'aria-pressed': st.mode === v ? 'true' : 'false', onclick: () => { st.mode = v; st.q = ''; q.value = ''; modes(); list(); render(); setUrl(); } }, l)));
        q.placeholder = st.mode === 'p' ? 'Nome ou código: apendicectomia, 0407…' : 'CID ou doença: K35, apendicite…';
        gSel.style.display = prB.style.display = st.mode === 'p' ? '' : 'none';
      }
      function list() {
        ul.innerHTML = '';
        if (!S.ready) { cnt.textContent = 'Carregando a tabela…'; return; }
        if (st.mode === 'p') {
          const rs = st.q.trim() ? S.search(st.q, { g: st.g, pr: st.pr, max: 80 }) : S.list.filter(p => (!st.g || p.c.slice(0, 2) === st.g) && (!st.pr || p.r.indexOf('P') >= 0) && /^04070|^04040|^04120|^04150/.test(p.c)).slice(0, 80);
          cnt.textContent = st.q.trim() ? rs.length + (rs.length >= 80 ? '+ resultados' : ' resultados') : 'Digite para buscar em ' + S.list.length + ' procedimentos (competência ' + S.v.slice(4) + '/' + S.v.slice(0, 4) + ')';
          rs.forEach(p => ul.append(h('li', { class: 'rx-item' + (st.sel === p.c ? ' on' : '') }, h('button', { type: 'button', class: 'rx-open', onclick: () => { st.sel = p.c; list(); render(); setUrl(); if (window.innerWidth < 1000) window.scrollTo(0, 0); } },
            h('span', { class: 'rx-t' }, p.n), h('span', { class: 'desc-a sg-code' }, S.fmt(p.c))))));
        } else {
          const rs = S.searchCid(st.q);
          cnt.textContent = st.q.trim() ? rs.length + (rs.length >= 80 ? '+ CID' : ' CID') : 'Digite o CID ou o nome da doença';
          if (st.q.trim()) rs.forEach(x => ul.append(h('li', { class: 'rx-item' + (st.cid === x.c ? ' on' : '') }, h('button', { type: 'button', class: 'rx-open', onclick: () => { st.cid = x.c; list(); render(); setUrl(); if (window.innerWidth < 1000) window.scrollTo(0, 0); } },
            h('span', { class: 'rx-t' }, x.n), h('span', { class: 'desc-a sg-code' }, S.fmtCid(x.c))))));
        }
      }
      function aihPanel() {
        aihBox.innerHTML = '';
        const cs = st.aih.c;
        aihBox.append(h('h3', { class: 'sec', style: 'margin-top:0' }, 'AIH em montagem'));
        if (!cs.length) { aihBox.append(h('p', { class: 'hint' }, 'Use "+ Adicionar à AIH" nos procedimentos. Com mais de um procedimento cirúrgico, a AIH vai como ' + S.label(MULT) + ' e os procedimentos entram na lista.')); return; }
        if (cs.length > 1) aihBox.append(h('div', { class: 'alert info sg-mult' }, u.icon('alert'), h('span', null, 'Principal da AIH: ', h('b', null, S.label(MULT)))));
        const ol = h('ol', { class: 'sg-ol' });
        cs.forEach((c, i) => ol.append(h('li', null, h('code', null, S.fmt(c)), ' ', (S.by[c] || {}).n || '', h('button', { type: 'button', class: 'sg-x', 'aria-label': 'Remover', onclick: () => { cs.splice(i, 1); if (!cs.length) st.aih.cid = ''; saveAih(); aihPanel(); } }, '×'))));
        aihBox.append(ol);
        // CID principal: compatível com o 1º procedimento; marca quando serve para todos
        const first = S.by[cs[0]] || { d: [] };
        const all = cs.map(c => (S.by[c] || { d: [] }).d);
        const both = new Set(first.d.filter(x => all.every(l => !l.length || l.indexOf(x) >= 0)));
        const cidIn = h('input', { type: 'search', class: 'fillp-in', placeholder: first.d.length ? 'Filtrar CID compatível (' + first.d.length + ')' : 'Este procedimento não restringe CID: digite o CID', oninput: () => cidRes() });
        const res = h('div', { class: 'sg-res' });
        function cidRes() {
          res.innerHTML = '';
          const rs = S.searchCid(cidIn.value, first.d.length ? first.d : null).slice(0, cidIn.value.trim() ? 12 : 6);
          rs.forEach(x => res.append(h('button', { type: 'button', class: 'sg-opt' + (st.aih.cid === x.c ? ' on' : ''), onclick: () => { st.aih.cid = x.c; saveAih(); aihPanel(); } }, h('code', null, S.fmtCid(x.c)), h('span', null, x.n), cs.length > 1 && both.has(x.c) ? h('small', null, 'serve para todos') : '')));
        }
        aihBox.append(h('div', { class: 'fld full' }, h('span', { class: 'lbl' }, 'CID principal' + (st.aih.cid ? ': ' + S.fmtCid(st.aih.cid) + ' ' + S.cidName(st.aih.cid) : '')), cidIn, res));
        cidRes();
        const cb = h('button', { type: 'button', class: 'copy' }, u.icon('copy'), 'Copiar texto da AIH');
        cb.onclick = () => copyText(S.aihText(cs, st.aih.cid), cb, 'Copiar texto da AIH');
        aihBox.append(h('pre', { class: 'sg-pre' }, S.aihText(cs, st.aih.cid)), h('div', { class: 'sg-row' }, cb, h('button', { type: 'button', class: 'rx-btn', onclick: () => { st.aih = { c: [], cid: '' }; saveAih(); aihPanel(); } }, 'Limpar')));
      }
      function procView(p) {
        const inAih = st.aih.c.indexOf(p.c) >= 0;
        const add = h('button', { type: 'button', class: 'rx-btn' + (inAih ? '' : ' sg-add'), onclick: () => { if (inAih) st.aih.c = st.aih.c.filter(x => x !== p.c); else st.aih.c.push(p.c); saveAih(); render(); D.toast && D.toast(inAih ? 'Removido da AIH' : 'Adicionado à AIH'); } }, inAih ? 'Tirar da AIH' : '+ Adicionar à AIH');
        const cpy = h('button', { type: 'button', class: 'copy' }, u.icon('copy'), 'Copiar código e nome');
        cpy.onclick = () => copyText(S.label(p.c), cpy, 'Copiar código e nome');
        const facts = [['Código', S.fmt(p.c)], ['Registro', p.r.split('').map(x => REG[x]).join(', ')], ['Complexidade', CX[p.cx] || p.cx], ['Sexo', SX[p.sx] || p.sx],
          ['Permanência média', p.pm >= 9999 ? 'não se aplica' : p.pm + (p.pm === 1 ? ' dia' : ' dias')], ['Idade', age(p.i0) + ' a ' + age(p.i1)], ['Valor hospitalar (SH)', money(p.sh)], ['Valor profissional (SP)', money(p.sp)], ['Total SH + SP', money(p.sh + p.sp)],
          ['Grupo', (S.SG[p.c.slice(0, 4)] || '') + ' › ' + (S.FO[p.c.slice(0, 6)] || '')]];
        const cidF = h('input', { type: 'search', class: 'fillp-in', placeholder: 'Filtrar os ' + p.d.length + ' CID compatíveis', oninput: () => cl() });
        const cul = h('div', { class: 'sg-cids' });
        function cl() {
          cul.innerHTML = '';
          if (!p.d.length) { cul.append(h('p', { class: 'hint' }, 'O SIGTAP não restringe CID principal para este procedimento.')); return; }
          S.searchCid(cidF.value, p.d).forEach(x => cul.append(h('button', { type: 'button', class: 'sg-opt', title: 'Copiar', onclick: e => copyText(S.fmtCid(x.c) + ' ' + x.n, null) }, h('code', null, S.fmtCid(x.c)), h('span', null, x.n))));
        }
        cl();
        return h('div', null,
          h('div', { class: 'desc-head' }, h('h2', null, p.n), h('span', { class: 'desc-meta' }, S.fmt(p.c) + (p.r.indexOf('P') < 0 ? ' · não pode ser o principal da AIH' : ''))),
          h('div', { class: 'sg-row sg-acts' }, cpy, add),
          h('div', { class: 'panel' }, h('dl', { class: 'sg-dl' }, ...facts.map(([k, v]) => [h('dt', null, k), h('dd', null, v)]).flat())),
          h('div', { class: 'panel' }, h('h3', { class: 'sec', style: 'margin-top:0' }, 'CID principal compatível'), cidF, cul));
      }
      function cidView(c) {
        const ps = S.cidProcs(c).filter(p => p.r.indexOf('P') >= 0);
        const by = {}; ps.forEach(p => { const k = p.c.slice(0, 2); (by[k] = by[k] || []).push(p); });
        const cpy = h('button', { type: 'button', class: 'copy' }, u.icon('copy'), 'Copiar CID');
        cpy.onclick = () => copyText(S.fmtCid(c) + ' ' + S.cidName(c), cpy, 'Copiar CID');
        const box = h('div', null, h('div', { class: 'desc-head' }, h('h2', null, S.fmtCid(c) + ' ' + S.cidName(c)), h('span', { class: 'desc-meta' }, ps.length + ' procedimentos de AIH compatíveis')), h('div', { class: 'sg-row sg-acts' }, cpy));
        [['03', 'Tratamentos clínicos (internação clínica)'], ['04', 'Procedimentos cirúrgicos'], ['05', 'Transplantes'], ['02', 'Diagnósticos']].forEach(([g, t]) => {
          if (!by[g]) return;
          box.append(h('div', { class: 'panel' }, h('h3', { class: 'sec', style: 'margin-top:0' }, t + ' (' + by[g].length + ')'),
            ...by[g].map(p => h('button', { type: 'button', class: 'sg-opt', onclick: () => { st.mode = 'p'; st.sel = p.c; modes(); list(); render(); setUrl(); window.scrollTo(0, 0); } }, h('code', null, S.fmt(p.c)), h('span', null, p.n)))));
        });
        if (!ps.length) box.append(h('p', { class: 'hint' }, 'Nenhum procedimento de AIH tem este CID como principal compatível. Tente o CID com o quarto dígito (por exemplo K35.8 em vez de K35).'));
        return box;
      }
      function render() {
        doc.innerHTML = '';
        root.classList.toggle('has-sel', !!(st.mode === 'p' ? st.sel : st.cid));
        if (!S.ready) { doc.append(h('div', { class: 'rx-blank' }, h('h2', null, 'Carregando a tabela SIGTAP…'))); return; }
        const back = h('button', { type: 'button', class: 'rx-btn rx-back', onclick: () => { st.sel = null; st.cid = null; list(); render(); setUrl(); } }, '‹ Buscar');
        doc.append(h('div', { class: 'desc-pick rx-pick' }, back));
        const p = st.mode === 'p' && st.sel && S.by[st.sel];
        if (p) doc.append(procView(p));
        else if (st.mode === 'c' && st.cid && S.C[st.cid]) doc.append(cidView(st.cid));
        else if (st.mode === 'c' && st.cid) doc.append(h('div', { class: 'rx-blank' }, h('h2', null, 'CID ' + S.fmtCid(st.cid) + ' não está na tabela'), h('p', null, 'O SIGTAP usa a CID-10 da competência ' + S.v.slice(4) + '/' + S.v.slice(0, 4) + '. Alguns códigos novos da CID-10 ainda não aparecem: busque pelo nome da doença.')));
        else doc.append(h('div', { class: 'rx-blank' }, h('h2', null, st.mode === 'p' ? 'Busque um procedimento' : 'Busque um CID'),
          h('p', null, 'Tabela SIGTAP da competência ' + S.v.slice(4) + '/' + S.v.slice(0, 4) + ': ' + S.list.length + ' procedimentos de internação, com os CID principais compatíveis, valores e permanência. Pelo CID você vê quais procedimentos aceitam aquele diagnóstico, tanto para internação clínica quanto cirúrgica.')));
        aihPanel(); doc.append(h('div', { class: 'panel' }, aihBox));
      }
      modes(); list(); render();
      S.load(err => { if (err) { cnt.textContent = 'Não foi possível carregar a tabela. Verifique a conexão.'; return; } list(); render(); });
      return root;
    }
  };
  D.add(tool,
    { id: 'sigtap-cid', g: 'aih', title: 'CID compatível com o procedimento', desc: 'Pelo CID, veja os procedimentos de AIH (clínicos e cirúrgicos) que o aceitam como principal', kw: 'cid compativel aih internacao clinica sigtap', href: '#/sigtap/cid:' },
    { id: 'sigtap-mult', g: 'aih', title: 'Cirurgias múltiplas (04.15.01.001-2)', desc: 'Monte a AIH com dois ou mais procedimentos cirúrgicos', kw: 'cirurgias multiplas aih 0415010012 sigtap', href: '#/sigtap/' + MULT });
})();
