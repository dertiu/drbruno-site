/* Receitas prontas: modelos de prescrição ambulatorial (adulto e pediatria) no formato do receituário */
(function () {
  'use strict';
  const D = window.DRB, u = D.u;

  /* ---------- dados (dados.js, editável pelo painel do editor) ---------- */
  const DATA = window.DRB_DATA || {};
  const VIA = { ORAL: 'USO ORAL', TOP: 'USO TÓPICO', OFT: 'USO OFTALMOLÓGICO', OTO: 'USO OTOLÓGICO', NAS: 'USO NASAL', INAL: 'USO INALATÓRIO', IM: 'USO INTRAMUSCULAR', EV: 'USO ENDOVENOSO', SC: 'USO SUBCUTÂNEO', VAG: 'USO VAGINAL', RET: 'USO RETAL', BUC: 'USO BUCAL', SL: 'USO SUBLINGUAL' };
  const CATS = (DATA.cats || []).map(c => [c.id, c.t, c.d || '']);
  const R = DATA.receitas || [];

  /* ---------- doses pelo peso e idade: marcadores no texto ----------
     {gt:A:MAX} gotas = peso × A (máx.)   {ml:A:MAX} mL = peso × A (máx.)   {mg:A:MAX} mg = peso × A (máx.)
     {kg} peso   {litros:A} litros = peso × A mL / 1000   {idade:1=TEXTO|6=TEXTO|TEXTO} por faixa etária (anos)
     {ivermectina} comprimidos de 6 mg pelo peso   {dengueped} e {dengueped3} volume diário de líquidos da dengue na criança */
  const B = '___';
  const br = n => String(n).replace('.', ',');
  const r05 = v => v >= 3 ? Math.round(v * 2) / 2 : Math.round(v * 10) / 10;
  const num = x => parseFloat(String(x).replace(',', '.'));
  function ivm(kg) {
    if (!(kg > 0)) return B + ' CP';
    if (kg < 15) return 'NÃO INDICADA ABAIXO DE 15 KG';
    return kg < 25 ? '1/2 CP' : kg < 36 ? '01 CP' : kg < 51 ? '1 E 1/2 CP' : kg < 66 ? '02 CP' : kg < 80 ? '2 E 1/2 CP' : '03 CP';
  }
  const dengPed = kg => kg <= 10 ? 130 * kg : kg <= 20 ? 100 * kg : 80 * kg;
  function fill(str, c) {
    if (typeof str !== 'string') return '';
    return str.replace(/\{([a-z0-9]+)(?::([^}]*))?\}/gi, (m, k, arg) => {
      k = k.toLowerCase(); const kg = c.kg, ok = kg > 0;
      const a = (arg || '').split(':'), f = num(a[0]), mx = a[1] != null && a[1] !== '' ? num(a[1]) : Infinity;
      switch (k) {
        case 'gt': return ok ? String(Math.max(1, Math.round(Math.min(kg * f, mx)))) : B;
        case 'ml': return ok ? br(r05(Math.min(kg * f, mx))) : B;
        case 'mg': return ok ? br(Math.round(Math.min(kg * f, mx))) : B;
        case 'kg': return ok ? br(Math.round(kg * 10) / 10) : B;
        case 'litros': return ok ? br(Math.round(kg * f / 100) / 10) : B;
        case 'ivermectina': return ivm(kg);
        case 'dengueped': return ok ? String(Math.round(dengPed(kg) / 10) * 10) : B;
        case 'dengueped3': return ok ? String(Math.round(dengPed(kg) / 30) * 10) : B;
        case 'idade': {
          if (!isFinite(c.age)) return B;
          const parts = (arg || '').split('|');
          for (const p of parts) { const i = p.indexOf('='); if (i < 0) return p; if (c.age < num(p.slice(0, i))) return p.slice(i + 1); }
          return B;
        }
      }
      return m;
    });
  }
  const KGT = /\{(gt|ml|mg|kg|litros|ivermectina|dengueped)/i, AGT = /\{idade/i;
  const needOf = r => { const s = r.it.map(i => i.n + ' ' + i.q + ' ' + i.p).join(' '); return (KGT.test(s) ? 'kg ' : '') + (AGT.test(s) ? 'age' : ''); };
  R.forEach(r => { r.need = needOf(r); });

  /* ---------- montagem do texto ---------- */
  const CTX = () => {
    const p = D.S.patient, a = u.num(p.age), un = p.ageU || 'a';
    return { kg: u.num(p.kg), age: isFinite(a) ? (un === 'a' ? a : un === 'm' ? a / 12 : a / 365.25) : NaN };
  };
  const val = (x, c) => fill(x, c);
  const line = (n, q) => { const w = 54, d = Math.max(4, w - n.length - (q ? q.length : 0) - 2); return n + ' ' + '-'.repeat(d) + (q ? ' ' + q : ''); };

  function compose(sel, inc, c) {
    const groups = [], seen = new Set(), ori = [];
    sel.forEach(rid => {
      const r = R.find(x => x.id === rid); if (!r) return;
      r.it.forEach((it, i) => {
        const key = rid + ':' + i; if (!inc(key, it)) return;
        const nm = val(it.n, c), sig = nm + '|' + val(it.p, c); if (seen.has(sig)) return; seen.add(sig);
        let g = groups.find(x => x.v === it.v); if (!g) { g = { v: it.v, items: [] }; groups.push(g); }
        g.items.push({ n: nm, q: val(it.q, c), p: val(it.p, c), key, it, rid });
      });
      (r.ori || []).forEach(o => o.split(/(?<=\.)\s+/).forEach(f => { f = f.trim(); if (f && !ori.includes(f)) ori.push(f); }));
    });
    return { groups, ori };
  }
  function toText(comp) {
    const out = [];
    comp.groups.forEach(g => {
      out.push(VIA[g.v] + ':', '');
      g.items.forEach((x, i) => out.push(`${i + 1}. ${line(x.n, x.q)}`, x.p, ''));
    });
    if (comp.ori.length) out.push('ORIENTAÇÕES: ' + comp.ori.join(' '));
    return out.join('\n').trim();
  }

  /* ---------- tela ---------- */
  const tool = {
    id: 'receitas', g: 'rx', title: 'Todas as receitas', desc: 'Modelos de receita por diagnóstico, adulto e pediatria, com dose pelo peso. Marque os itens, some receitas e copie',
    kw: 'receita receituário prescrição alta para casa modelo pronto conjuntivite ivas otite itu sarna dengue',
    disc: 'Modelos de apoio. Revise alergias, gestação, função renal, interações e a disponibilidade no SUS antes de entregar a receita.',
    render: (h, u2, sub) => {
      const st = { q: '', pop: '', cat: '', sel: [], inc: {}, edit: null };
      if (sub && sub.indexOf('c:') === 0) st.cat = sub.slice(2);
      else if (sub && R.find(r => r.id === sub)) st.sel = [sub];
      const root = h('div', { class: 'rx' });
      const side = h('section', { class: 'rx-l' }), doc = h('section', { class: 'rx-r', id: 'rxdoc' });
      root.append(side, doc);
      const search = h('input', { type: 'search', class: 'rx-q', placeholder: 'Filtrar: conjuntivite, otite, criança…', 'aria-label': 'Filtrar receitas', oninput: e => { st.q = e.target.value; list(); } });
      const popSeg = h('div', { class: 'seg rx-pop', role: 'group', 'aria-label': 'Público' });
      const catBox = h('select', { class: 'rx-catsel', 'aria-label': 'Área', onchange: e => { st.cat = e.target.value; list(); openFirst(); } });
      const ul = h('ul', { class: 'rx-list' });
      side.append(h('label', { class: 'gs rx-search' }, u.icon('search'), search), popSeg, catBox, ul);

      const setUrl = () => { try { const s = st.sel.length === 1 ? '/' + st.sel[0] : st.cat ? '/c:' + st.cat : ''; history.replaceState(null, '', '#/receitas' + s); } catch (e) { } };
      function chips() {
        popSeg.innerHTML = '';
        [['', 'Todos'], ['a', 'Adulto'], ['c', 'Criança']].forEach(([v, l]) => popSeg.append(h('button', { type: 'button', class: st.pop === v ? 'on' : '', 'aria-pressed': st.pop === v ? 'true' : 'false', onclick: () => { st.pop = v; chips(); list(); if (st.sel.length && !visible().some(r => r.id === st.sel[0])) openFirst(); } }, l)));
        catBox.innerHTML = '';
        [['', 'Todas as áreas']].concat(CATS.map(c => [c[0], c[1]])).forEach(([v, l]) => { const o = h('option', { value: v }, l); if (st.cat === v) o.selected = true; catBox.append(o); });
      }
      const visible = (q, cat) => {
        const parts = q ? u.norm(q.trim()).split(/\s+/).filter(Boolean) : [], c = cat == null ? st.cat : cat;
        return R.filter(r => (!st.pop || (st.pop === 'c' ? r.ped : !r.ped)) && (!c || r.c === c) &&
          (!parts.length || parts.every(p => u.norm(r.t + ' ' + r.kw + ' ' + (r.ped ? 'criança pediatria' : 'adulto')).includes(p))));
      };
      const openRx = id => { st.sel = [id]; st.edit = null; st.inc = {}; try { localStorage.setItem('drb_rx_last', id); } catch (e) { } list(); render(); setUrl(); };
      const openFirst = () => { const r = visible('')[0]; if (r) openRx(r.id); else { st.sel = []; render(); setUrl(); } };
      const catT = id => (CATS.find(c => c[0] === id) || [])[1] || '';
      function list() {
        ul.innerHTML = '';
        const rs = visible(st.q);
        if (!rs.length) { ul.append(h('li', { class: 'rx-empty' }, 'Nenhuma receita encontrada. Tente outro termo ou limpe os filtros.')); return; }
        let lastCat = null;
        rs.forEach(r => {
          if (!st.cat && r.c !== lastCat) { lastCat = r.c; ul.append(h('li', { class: 'rx-h' }, CATS.find(c => c[0] === r.c)[1])); }
          const on = st.sel.includes(r.id);
          ul.append(h('li', { class: 'rx-item' + (on ? ' on' : '') },
            h('button', { type: 'button', class: 'rx-open', onclick: () => { openRx(r.id); if (window.innerWidth < 1000) window.scrollTo(0, 0); } },
              h('span', { class: 'rx-t' }, r.t), r.ped && h('span', { class: 'rx-tag' }, 'criança')),
            h('button', { type: 'button', class: 'rx-add', title: on ? 'Remover da receita' : 'Somar à receita aberta', 'aria-label': (on ? 'Remover ' : 'Somar ') + r.t,
              onclick: () => { st.sel = on ? st.sel.filter(x => x !== r.id) : st.sel.concat(r.id); st.edit = null; list(); render(); setUrl(); } }, on ? '−' : '+')));
        });
      }
      const isInc = (key, it) => st.inc[key] != null ? st.inc[key] : !it.opt;
      function render() {
        doc.innerHTML = '';
        root.classList.toggle('has-sel', !!st.sel.length);
        if (!st.sel.length) {
          doc.append(h('div', { class: 'rx-blank' }, h('h2', null, 'Escolha um diagnóstico'),
            h('p', null, 'Toque em uma receita para abrir. Use o botão + para somar outra (por exemplo, IVAS + amoxicilina). Itens marcados como opção ficam desmarcados até você incluir.')));
          return;
        }
        const c = CTX(), rs = st.sel.map(id => R.find(r => r.id === id));
        const needKg = rs.some(r => (r.need || '').includes('kg')), needAge = rs.some(r => (r.need || '').includes('age'));
        // seletor de receita (celular) e somar outra
        const mkSel = (cls, label, first, onpick) => {
          const sel = h('select', { class: cls, 'aria-label': label, onchange: e => { const v = e.target.value; if (v) onpick(v); } });
          if (first) sel.append(h('option', { value: '' }, first));
          let lc = null, og = null;
          visible('', '').forEach(r => { if (r.c !== lc) { lc = r.c; og = h('optgroup', { label: catT(r.c) }); sel.append(og); } const o = h('option', { value: r.id }, r.t); if (!first && r.id === st.sel[0]) o.selected = true; og.append(o); });
          return sel;
        };
        const back = h('button', { type: 'button', class: 'rx-btn rx-back', onclick: () => { st.sel = []; list(); render(); setUrl(); window.scrollTo(0, 0); } }, '‹ Lista');
        doc.append(h('div', { class: 'desc-pick rx-pick' }, back, h('label', { class: 'desc-pl' }, h('span', { class: 'lbl' }, 'Receita'), mkSel('desc-psel', 'Receita', '', id => openRx(id)))));
        // cabeçalho com receitas selecionadas
        doc.append(h('div', { class: 'rx-sel' }, rs.map(r => h('span', { class: 'rx-chip' }, r.t,
          st.sel.length > 1 && h('button', { type: 'button', 'aria-label': 'Remover ' + r.t, onclick: () => { st.sel = st.sel.filter(x => x !== r.id); st.edit = null; list(); render(); setUrl(); } }, '×'))),
          mkSel('rx-addsel', 'Somar outra receita', '+ Somar outra receita', id => { if (!st.sel.includes(id)) st.sel = st.sel.concat(id); st.edit = null; list(); render(); setUrl(); })));
        if (needKg || needAge) {
          const p = D.S.patient;
          const fk = h('label', { class: 'pf' }, h('span', null, 'Peso'), h('span', { class: 'pfin' }, h('input', { inputmode: 'decimal', value: p.kg || '', 'aria-label': 'Peso', oninput: e => { p.kg = e.target.value; D.S.vals = {}; D.savePatient(); paper(); } }), h('span', { class: 'u' }, 'kg')));
          const su = h('select', { 'aria-label': 'Unidade da idade', onchange: e => { p.ageU = e.target.value; D.savePatient(); paper(); } }, [['a', 'anos'], ['m', 'meses']].map(([v, l]) => h('option', { value: v }, l)));
          su.value = p.ageU === 'm' ? 'm' : 'a';
          const fa = h('label', { class: 'pf' }, h('span', null, 'Idade'), h('span', { class: 'pfin' }, h('input', { inputmode: 'decimal', value: p.age || '', 'aria-label': 'Idade', oninput: e => { p.age = e.target.value; D.savePatient(); paper(); } }), su));
          doc.append(h('div', { class: 'rx-pt' }, needKg && fk, needAge && fa));
        }
        const paperBox = h('div', { class: 'rx-paper-wrap' });
        const tools = h('div', { class: 'rx-actions' });
        const notes = h('div', { class: 'rx-notes' });
        doc.append(paperBox, tools, notes);
        rs.forEach(r => { if (r.nota) notes.append(h('div', { class: 'alert info' }, u.icon('alert'), h('span', null, (rs.length > 1 ? r.t + ': ' : '') + r.nota))); });

        function paper() {
          const c2 = CTX(), comp = compose(st.sel, isInc, c2);
          paperBox.innerHTML = ''; tools.innerHTML = '';
          const miss = (needKg && !(c2.kg > 0)) || (needAge && !isFinite(c2.age));
          if (st.edit != null) {
            const ta = h('textarea', { class: 'rx-edit', 'aria-label': 'Texto da receita', oninput: e => { st.edit = e.target.value; } });
            ta.value = st.edit; paperBox.append(ta);
          } else {
            const pp = h('div', { class: 'rx-paper' });
            // todos os itens (incluídos e opções), agrupados por via, com caixa de seleção
            const all = []; const seen = new Set();
            st.sel.forEach(rid => { const r = R.find(x => x.id === rid); r.it.forEach((it, i) => { const sig = val(it.n, c2) + '|' + val(it.p, c2); if (seen.has(sig)) return; seen.add(sig); all.push({ it, key: rid + ':' + i }); }); });
            const vias = []; all.forEach(x => { if (!vias.includes(x.it.v)) vias.push(x.it.v); });
            vias.forEach(v => {
              pp.append(h('div', { class: 'rx-via' }, VIA[v] + ':'));
              let n = 0;
              all.filter(x => x.it.v === v).forEach(x => {
                const on = isInc(x.key, x.it); if (on) n++;
                const cb = h('input', { type: 'checkbox', 'aria-label': 'Incluir ' + val(x.it.n, c2), onchange: e => { st.inc[x.key] = e.target.checked; paper(); } }); cb.checked = on;
                pp.append(h('label', { class: 'rx-it' + (on ? '' : ' off') }, cb,
                  h('span', { class: 'rx-num' }, on ? n + '.' : ''),
                  h('span', { class: 'rx-body' }, h('span', { class: 'rx-n' }, val(x.it.n, c2), h('span', { class: 'rx-qt' }, val(x.it.q, c2)), x.it.opt && h('span', { class: 'rx-opt' }, 'opção')),
                    h('span', { class: 'rx-p' }, val(x.it.p, c2)))));
              });
            });
            if (comp.ori.length) pp.append(h('div', { class: 'rx-ori' }, h('b', null, 'ORIENTAÇÕES: '), comp.ori.join(' ')));
            paperBox.append(pp);
          }
          const text = st.edit != null ? st.edit : toText(comp);
          const copyB = h('button', { type: 'button', class: 'copy rx-copy' }, u.icon('copy'), 'Copiar receita');
          copyB.onclick = () => {
            const t = st.edit != null ? st.edit : toText(compose(st.sel, isInc, CTX()));
            const done = () => { copyB.lastChild.textContent = 'Copiada'; setTimeout(() => { copyB.lastChild.textContent = 'Copiar receita'; }, 1600); };
            if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(t).then(done, () => fb(t, done)); else fb(t, done);
          };
          const editB = h('button', { type: 'button', class: 'rx-btn', onclick: () => { st.edit = st.edit != null ? null : text; paper(); } }, st.edit != null ? 'Voltar aos itens' : 'Editar texto');
          tools.append(copyB, editB);
          if (miss) tools.prepend(h('div', { class: 'alert' }, u.icon('alert'), h('span', null, 'Informe ' + [needKg && !(c2.kg > 0) && 'o peso', needAge && !isFinite(c2.age) && 'a idade'].filter(Boolean).join(' e ') + ' para calcular as doses (aparecem como ___).')));
        }
        function fb(t, done) { const ta = h('textarea', { style: 'position:fixed;opacity:0' }); ta.value = t; document.body.append(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (e) { } ta.remove(); }
        paper();
      }
      chips(); list();
      if (!st.sel.length) {
        let last = null; try { last = localStorage.getItem('drb_rx_last'); } catch (e) { }
        if (!st.cat && last && R.find(r => r.id === last)) openRx(last); else openFirst();
      } else render();
      return root;
    }
  };

  const links = CATS.map(([id, t, d]) => ({ id: 'rx-' + id, g: 'rx', title: t, desc: d, kw: 'receita ' + d, href: '#/receitas/c:' + id }));
  D.add(tool, ...links);
  R.forEach(r => D.links.push({ id: 'rxl-' + r.id, g: 'rx', title: 'Receita: ' + r.t, desc: r.ped ? 'Receita pediátrica com dose pelo peso' : 'Receita pronta para copiar', kw: 'receita ' + r.kw, href: '#/receitas/' + r.id }));
  D.rx = { R, CATS, VIA, compose, toText, CTX, fill, needOf };
})();
