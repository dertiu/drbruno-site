/* Receita livre: a pessoa escolhe remédio por remédio e cada um já vem com a posologia das receitas prontas
   (dose pelo peso e pela idade na criança). Também aceita item escrito à mão. Nada do paciente é guardado
   além do peso e da idade, que são os mesmos do painel do paciente. */
(function () {
  'use strict';
  const D = window.DRB, u = D.u;
  if (!D.rx) return;
  const { R, VIA, fill, CTX, base } = D.rx;

  /* ---------- catálogo: cada remédio das receitas, com todas as posologias usadas ---------- */
  const CAT = [], IDX = new Map();
  R.forEach(r => r.it.forEach(it => {
    const pop = r.ped ? 'c' : 'a', key = pop + '|' + it.n;
    let m = IDX.get(key);
    if (!m) { m = { key, pop, n: it.n, v: it.v, vars: [] }; IDX.set(key, m); CAT.push(m); }
    const vk = (it.q || '') + '|' + (it.p || '') + '|' + (it.se || '');
    let va = m.vars.find(x => x.k === vk);
    if (!va) { va = { k: vk, q: it.q || '', p: it.p || '', se: it.se || '', de: [] }; m.vars.push(va); }
    if (va.de.indexOf(r.t) < 0) va.de.push(r.t);
  }));
  CAT.forEach(m => m.vars.sort((a, b) => b.de.length - a.de.length));

  const W = 54;
  const line = (n, q) => { const d = Math.max(4, W - n.length - (q ? q.length : 0) - 2); return n + ' ' + '-'.repeat(d) + (q ? ' ' + q : ''); };
  const br = x => String(x).replace('.', ',');
  const needs = s => ({ kg: /\{(gt|ml|mg|kg|litros|ivermectina|dengueped|peso|fr)/i.test(s), age: /\{idade/i.test(s) });
  const SE = se => { const m = /^(idade|peso)(<=|>=|<|>)([\d.]+)$/.exec(se || ''); if (!m) return ''; const q = { '<': 'abaixo de', '<=': 'até', '>': 'acima de', '>=': 'a partir de' }[m[2]]; return m[1] === 'idade' ? `${q} ${br(m[3])} ${+m[3] === 1 ? 'ano' : 'anos'}` : `${q} ${br(m[3])} kg`; };
  const cabe = (se, c) => {
    const m = /^(idade|peso)(<=|>=|<|>)([\d.]+)$/.exec(se || ''); if (!m) return true;
    const v = m[1] === 'idade' ? c.age : c.kg, n = +m[3]; if (!(v >= 0) || (m[1] === 'peso' && !(v > 0))) return true;
    return m[2] === '<' ? v < n : m[2] === '<=' ? v <= n : m[2] === '>' ? v > n : v >= n;
  };

  /* ---------- estado (só na memória desta aba) ---------- */
  const ST = { pop: '', q: '', itens: [], edit: null, seq: 0 };
  const novo = (m, vi) => ({ id: ++ST.seq, m: m ? m.key : null, vi: vi || 0, v: m ? m.v : 'ORAL', n: m ? m.n : '', q: null, p: null });
  const cat = it => (it.m ? IDX.get(it.m) : null);
  const cur = it => { const m = cat(it); return m ? m.vars[Math.min(it.vi, m.vars.length - 1)] : null; };
  // texto que vale: o editado pela pessoa ou o calculado
  const nomeDe = (it, c) => (it.m ? fill(it.n, c) : (it.n || '').toLocaleUpperCase('pt-BR'));
  const qtDe = (it, c) => (it.q != null ? it.q : cur(it) ? fill(cur(it).q, c) : '');
  const posDe = (it, c) => (it.p != null ? it.p : cur(it) ? fill(cur(it).p, c) : '');

  function texto(c) {
    const vias = [];
    ST.itens.forEach(it => { if (vias.indexOf(it.v) < 0) vias.push(it.v); });
    const out = [];
    vias.forEach(v => {
      out.push((VIA[v] || 'USO ' + v) + ':', '');
      ST.itens.filter(it => it.v === v).forEach((it, i) => out.push(`${i + 1}. ${line(nomeDe(it, c), qtDe(it, c).toLocaleUpperCase('pt-BR'))}`, posDe(it, c).toLocaleUpperCase('pt-BR'), ''));
    });
    return out.join('\n').trim();
  }

  const tool = {
    id: 'rx-livre', g: 'rx', title: 'Receita livre (monte item por item)',
    desc: 'Escolha os remédios um a um: cada um já vem com a posologia das receitas prontas, com dose pelo peso na criança',
    kw: 'receita livre montar receita receituario remedio medicamento posologia dose peso crianca adulto prescricao avulsa item por item',
    disc: 'Posologias das receitas prontas do app. Confira dose, alergias, idade mínima, gestação e função renal antes de entregar.',
    render: (h, u2, sub) => {
      if (sub === 'c' || sub === 'a') ST.pop = sub;
      if (!ST.pop) { const a = u.num(D.S.patient.age), un = D.S.patient.ageU || 'a'; ST.pop = isFinite(a) && (un !== 'a' || a < 12) ? 'c' : 'a'; }
      const root = h('div', { class: 'rl' });
      const top = h('section', { class: 'panel rl-top' }), doc = h('section', { class: 'rl-doc' });
      root.append(top, doc);

      const popSeg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Público' });
      const pt = h('div', { class: 'rx-pt' });
      const q = h('input', { type: 'search', class: 'rx-q rl-q', placeholder: 'Buscar remédio: amoxicilina, dipirona, prednisolona…', 'aria-label': 'Buscar remédio', value: ST.q, oninput: e => { ST.q = e.target.value; lista(); } });
      const res = h('ul', { class: 'rl-res' });
      top.append(popSeg, pt, h('label', { class: 'gs rx-search' }, u.icon('search'), q), res,
        h('button', { type: 'button', class: 'rx-btn sm', onclick: () => { ST.itens.push(novo(null)); ST.edit = null; papel(); setTimeout(() => { const ins = doc.querySelectorAll('.rl-nm-in'); if (ins.length) ins[ins.length - 1].focus(); }, 0); } }, '+ Item escrito à mão'));

      function chips() {
        popSeg.innerHTML = '';
        [['c', 'Criança'], ['a', 'Adulto']].forEach(([v, l]) => popSeg.append(h('button', { type: 'button', class: ST.pop === v ? 'on' : '', 'aria-pressed': ST.pop === v ? 'true' : 'false', onclick: () => { ST.pop = v; chips(); paciente(); lista(); } }, l)));
      }
      function paciente() {
        pt.innerHTML = '';
        const precisa = ST.pop === 'c' || ST.itens.some(it => { const va = cur(it); if (!va) return false; const n = needs(it.n + ' ' + va.q + ' ' + va.p); return n.kg || n.age; });
        if (!precisa) return;
        const p = D.S.patient;
        const mud = () => { D.savePatient(); papel(); lista(); };
        const su = h('select', { 'aria-label': 'Unidade da idade', onchange: e => { p.ageU = e.target.value; mud(); } }, [['a', 'anos'], ['m', 'meses']].map(([v, l]) => h('option', { value: v }, l)));
        su.value = p.ageU === 'm' ? 'm' : 'a';
        pt.append(
          h('label', { class: 'pf' }, h('span', null, 'Peso'), h('span', { class: 'pfin' }, h('input', { inputmode: 'decimal', value: p.kg || '', 'aria-label': 'Peso', oninput: e => { p.kg = e.target.value; D.S.vals = {}; mud(); } }), h('span', { class: 'u' }, 'kg'))),
          h('label', { class: 'pf' }, h('span', null, 'Idade'), h('span', { class: 'pfin' }, h('input', { inputmode: 'decimal', value: p.age || '', 'aria-label': 'Idade', oninput: e => { p.age = e.target.value; D.S.vals = {}; mud(); } }), su)));
      }
      function lista() {
        res.innerHTML = '';
        const parts = u.norm(ST.q.trim()).split(/\s+/).filter(Boolean);
        if (!parts.length) { res.append(h('li', { class: 'rl-dica' }, `${CAT.filter(m => m.pop === ST.pop).length} remédios de ${ST.pop === 'c' ? 'criança' : 'adulto'} disponíveis. Digite parte do nome para buscar.`)); return; }
        const c = CTX();
        const achados = CAT.filter(m => m.pop === ST.pop && parts.every(p => u.norm(m.n + ' ' + (VIA[m.v] || '')).includes(p))).slice(0, 30);
        if (!achados.length) { res.append(h('li', { class: 'rl-dica' }, 'Nenhum remédio com esse nome nas receitas. Use "Item escrito à mão".')); return; }
        achados.forEach(m => res.append(h('li', null, h('button', { type: 'button', class: 'rl-add', onclick: () => {
          ST.itens.push(novo(m, 0)); ST.edit = null; ST.q = ''; q.value = ''; lista(); paciente(); papel();
        } }, h('span', { class: 'rl-add-n' }, fill(m.n, c)), h('span', { class: 'rl-add-d' }, (VIA[m.v] || '').replace('USO ', '').toLowerCase() + (m.vars.length > 1 ? ' · ' + m.vars.length + ' posologias' : '')), h('span', { class: 'rl-mais', 'aria-hidden': 'true' }, '+')))));
      }

      function papel() {
        doc.innerHTML = '';
        const c = CTX();
        if (!ST.itens.length) {
          doc.append(h('div', { class: 'rx-blank' }, h('h2', null, 'Receita vazia'), h('p', null, 'Busque um remédio acima e toque nele para incluir. Cada um entra com a posologia das receitas prontas. Dá para trocar a posologia, editar o texto ou escrever um item à mão.')));
          return;
        }
        const falta = [];
        ST.itens.forEach(it => { const va = cur(it); if (!va) return; const n = needs(it.n + ' ' + va.q + ' ' + va.p); if (n.kg && !(c.kg > 0) && falta.indexOf('o peso') < 0) falta.push('o peso'); if (n.age && !isFinite(c.age) && falta.indexOf('a idade') < 0) falta.push('a idade'); });

        if (ST.edit != null) {
          const ta = h('textarea', { class: 'rx-edit', 'aria-label': 'Texto da receita', oninput: e => { ST.edit = e.target.value; } });
          ta.value = ST.edit; doc.append(ta);
        } else {
          const pp = h('div', { class: 'rx-paper rl-paper' });
          const vias = []; ST.itens.forEach(it => { if (vias.indexOf(it.v) < 0) vias.push(it.v); });
          vias.forEach(v => {
            pp.append(h('div', { class: 'rx-via' }, (VIA[v] || 'USO ' + v) + ':'));
            ST.itens.filter(it => it.v === v).forEach((it, i) => {
              const m = cat(it), va = cur(it);
              const tira = h('button', { type: 'button', class: 'rl-x', 'aria-label': 'Tirar ' + nomeDe(it, c), onclick: () => { ST.itens = ST.itens.filter(x => x !== it); paciente(); papel(); } }, '×');
              const nome = m ? h('span', { class: 'rx-n' }, nomeDe(it, c))
                : h('span', { class: 'rl-man' },
                  h('input', { class: 'rl-nm-in', value: it.n, placeholder: 'NOME E APRESENTAÇÃO', 'aria-label': 'Nome do remédio', oninput: e => { it.n = e.target.value; } }),
                  h('select', { class: 'rl-via-sel', 'aria-label': 'Via', onchange: e => { it.v = e.target.value; papel(); } }, Object.keys(VIA).map(k => { const o = h('option', { value: k }, VIA[k].replace('USO ', '').toLowerCase()); if (k === it.v) o.selected = true; return o; })));
              const qt = h('input', { class: 'rl-qt', value: qtDe(it, c), placeholder: 'QUANTIDADE', 'aria-label': 'Quantidade', oninput: e => { it.q = e.target.value; } });
              const pos = h('textarea', { class: 'rl-pos', rows: 2, placeholder: 'POSOLOGIA', 'aria-label': 'Posologia', oninput: e => { it.p = e.target.value; } });
              pos.value = posDe(it, c);
              const extra = [];
              if (m && m.vars.length > 1) {
                const s = h('select', { class: 'rl-var', 'aria-label': 'Posologia', onchange: e => { it.vi = +e.target.value; it.q = null; it.p = null; paciente(); papel(); } },
                  m.vars.map((x, k) => {
                    const t = fill(x.p, c), dup = m.vars.some((y, j) => j !== k && fill(y.p, c) === t);
                    const lb = (t.length > 70 ? t.slice(0, 70) + '…' : t) + (dup ? ' · ' + fill(x.q, c) : '') + (x.se ? ' · ' + SE(x.se) : '');
                    const o = h('option', { value: k }, lb); if (k === it.vi) o.selected = true; return o;
                  }));
                extra.push(h('label', { class: 'rl-varl' }, h('span', null, 'Outra posologia'), s));
              }
              if (va) {
                const b = base(va.p + ' ' + va.q + ' ' + it.n);
                if (b) extra.push(h('span', { class: 'rl-base' }, 'Dose: ' + b));
                if (va.se) extra.push(h('span', { class: 'rl-base' + (cabe(va.se, c) ? '' : ' rl-warn') }, (cabe(va.se, c) ? 'Indicado ' : 'Atenção: indicado ') + SE(va.se)));
                if (it.p != null || it.q != null) extra.push(h('button', { type: 'button', class: 'rl-rec', onclick: () => { it.p = null; it.q = null; papel(); } }, 'Voltar ao texto calculado'));
              }
              pp.append(h('div', { class: 'rl-it' },
                h('span', { class: 'rx-num' }, (i + 1) + '.'),
                h('div', { class: 'rx-body' }, h('div', { class: 'rl-l1' }, nome, qt, tira), pos, ...extra)));
            });
          });
          doc.append(pp);
        }
        const acts = h('div', { class: 'rx-actions' });
        if (falta.length) acts.append(h('div', { class: 'alert' }, u.icon('alert'), h('span', null, 'Informe ' + falta.join(' e ') + ' para calcular as doses.')));
        const copyB = h('button', { type: 'button', class: 'copy rx-copy' }, u.icon('copy'), 'Copiar receita');
        copyB.onclick = () => {
          const t = ST.edit != null ? ST.edit : texto(CTX());
          const ok = () => { copyB.lastChild.textContent = 'Copiada'; setTimeout(() => { copyB.lastChild.textContent = 'Copiar receita'; }, 1600); };
          if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(t).then(ok, () => fb(t, ok)); else fb(t, ok);
        };
        acts.append(copyB,
          h('button', { type: 'button', class: 'rx-btn', onclick: () => { ST.edit = ST.edit != null ? null : texto(CTX()); papel(); } }, ST.edit != null ? 'Voltar aos itens' : 'Editar texto'),
          h('button', { type: 'button', class: 'rx-btn', onclick: () => { ST.itens = []; ST.edit = null; paciente(); papel(); } }, 'Limpar receita'));
        doc.append(acts);
      }
      function fb(t, ok) { const ta = h('textarea', { style: 'position:fixed;opacity:0' }); ta.value = t; document.body.append(ta); ta.select(); try { document.execCommand('copy'); ok(); } catch (e) { } ta.remove(); }

      chips(); paciente(); lista(); papel();
      return root;
    }
  };

  D.add(tool, { id: 'ped-rx-livre', g: 'ped', title: 'Receita livre pediátrica', desc: 'Monte a receita remédio por remédio, com dose pelo peso da criança', kw: 'receita livre criança pediatria montar', href: '#/rx-livre/c' });
  D.rxLivre = { CAT };
})();
