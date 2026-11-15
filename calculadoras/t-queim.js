/* Queimados: superfície corporal queimada pintando o boneco (Lund-Browder por idade) ou digitando o valor,
   com a reposição volêmica (Parkland ou ATLS) e a meta de diurese. */
(function () {
  'use strict';
  const D = window.DRB, u = D.u, fmt = u.fmt;
  const LS = 'drb_queim';
  const FAIXAS = [['0', 'Menos de 1 ano'], ['1', '1 a 4 anos'], ['2', '5 a 9 anos'], ['3', '10 a 14 anos'], ['4', '15 anos'], ['5', 'Adulto']];
  // Lund-Browder: porcentagem da região inteira (frente + costas), por faixa etária
  const LB = {
    cab: [19, 17, 13, 11, 9, 7], pes: 2, tra: 13, trp: 13, ndD: 2.5, ndE: 2.5, gen: 1,
    bdD: 4, bdE: 4, abD: 3, abE: 3, mD: 2.5, mE: 2.5,
    cxD: [5.5, 6.5, 8, 8.5, 9, 9.5], cxE: [5.5, 6.5, 8, 8.5, 9, 9.5], pnD: [5, 5, 5.5, 6, 6.5, 7], pnE: [5, 5, 5.5, 6, 6.5, 7], peD: 3.5, peE: 3.5
  };
  const NOME = { cab: 'cabeça', pes: 'pescoço', tra: 'tronco anterior', trp: 'tronco posterior', ndD: 'nádega direita', ndE: 'nádega esquerda', gen: 'genitália',
    bdD: 'braço direito', bdE: 'braço esquerdo', abD: 'antebraço direito', abE: 'antebraço esquerdo', mD: 'mão direita', mE: 'mão esquerda',
    cxD: 'coxa direita', cxE: 'coxa esquerda', pnD: 'perna direita', pnE: 'perna esquerda', peD: 'pé direito', peE: 'pé esquerdo' };
  // parte da região que aparece em cada vista
  const SHARE = r => r === 'tra' || r === 'gen' ? { f: 1, b: 0 } : r === 'trp' || r === 'ndD' || r === 'ndE' ? { f: 0, b: 1 } : { f: 0.5, b: 0.5 };
  const PROF = [['1', '1º grau', 'não entra no cálculo'], ['2s', '2º superficial', ''], ['2p', '2º profundo', ''], ['3', '3º grau', ''], ['x', 'Apagar', '']];
  const PROF_TXT = { '2s': 'segundo grau superficial', '2p': 'segundo grau profundo', '3': 'terceiro grau', '1': 'primeiro grau' };
  const FRAC = [['1', 'Região inteira'], ['0.5', 'Metade'], ['0.25', 'Um quarto']];

  // formas do boneco (coordenadas de uma vista de 200 x 410); D/E = lado do paciente
  const ARM = (x, side) => [['bd' + side, 'rect', { x, y: 80, width: 22, height: 62, rx: 10 }], ['ab' + side, 'rect', { x: x - 4, y: 144, width: 22, height: 56, rx: 9 }], ['m' + side, 'rect', { x: x - 8, y: 202, width: 24, height: 28, rx: 9 }]];
  const LEG = (x, side, y0, hh) => [['cx' + side, 'rect', { x, y: y0, width: 36, height: hh, rx: 12 }], ['pn' + side, 'rect', { x: x + 4, y: 292, width: 30, height: 84, rx: 10 }], ['pe' + side, 'rect', { x: side === 'D' ? x - 4 : x + 2, y: 380, width: 36, height: 20, rx: 8 }]];
  const FRENTE = [
    ['cab', 'ellipse', { cx: 100, cy: 34, rx: 23, ry: 28 }], ['pes', 'rect', { x: 88, y: 60, width: 24, height: 16, rx: 4 }],
    ['tra', 'path', { d: 'M62 76 L138 76 Q146 78 146 88 L142 190 L58 190 L54 88 Q54 78 62 76 Z' }], ['gen', 'path', { d: 'M88 191 L112 191 L106 208 L94 208 Z' }]
  ].concat(ARM(30, 'D'), ARM(148, 'E'), LEG(60, 'D', 192, 96), LEG(104, 'E', 192, 96));
  const COSTAS = [
    ['cab', 'ellipse', { cx: 100, cy: 34, rx: 23, ry: 28 }], ['pes', 'rect', { x: 88, y: 60, width: 24, height: 16, rx: 4 }],
    ['trp', 'path', { d: 'M62 76 L138 76 Q146 78 146 88 L143 176 L57 176 L54 88 Q54 78 62 76 Z' }],
    ['ndE', 'rect', { x: 57, y: 177, width: 42, height: 34, rx: 12 }], ['ndD', 'rect', { x: 101, y: 177, width: 42, height: 34, rx: 12 }]
  ].concat(ARM(30, 'E'), ARM(148, 'D'), LEG(60, 'E', 213, 75), LEG(104, 'D', 213, 75));

  const st = Object.assign({ cells: {}, brush: '2s', frac: '1', faixa: '', modo: 'des', manual: '', form: 'pk', eletr: false, inal: false, horas: '' }, u.LS(LS, {}));
  const save = () => u.SAVE(LS, st);
  let fimFn = null;

  function faixaAuto() {
    const p = D.S.patient, a = u.num(p.age);
    if (!isFinite(a)) return '5';
    const y = p.ageU === 'm' ? a / 12 : p.ageU === 'd' ? a / 365.25 : a;
    return y < 1 ? '0' : y < 5 ? '1' : y < 10 ? '2' : y < 15 ? '3' : y < 16 ? '4' : '5';
  }
  const faixa = () => st.faixa || faixaAuto();
  const regPct = r => { const v = LB[r]; return Array.isArray(v) ? v[+faixa()] : v; };
  const cellPct = (k, c) => { const [r, vw] = k.split('|'); return regPct(r) * SHARE(r)[vw] * +c.f; };
  const anosPaciente = () => { const p = D.S.patient, a = u.num(p.age); if (!isFinite(a)) return NaN; return p.ageU === 'm' ? a / 12 : p.ageU === 'd' ? a / 365.25 : a; };

  function calc() {
    const por = { '1': 0, '2s': 0, '2p': 0, '3': 0 }, regs = {};
    Object.keys(st.cells).forEach(k => {
      const c = st.cells[k], p = cellPct(k, c); por[c.d] += p;
      const r = k.split('|')[0]; (regs[r] = regs[r] || { '1': 0, '2s': 0, '2p': 0, '3': 0 })[c.d] += p;
    });
    const desenho = por['2s'] + por['2p'] + por['3'];
    const manual = u.num(st.manual), scq = st.modo === 'man' ? manual : desenho;
    const kg = u.num(D.S.patient.kg), anos = anosPaciente(), crianca = faixa() !== '5' && faixa() !== '4' ? true : (isFinite(anos) && anos < 15);
    const al = [], rows = [], notes = [];
    if (st.modo === 'man' && !isFinite(manual)) return { alerts: [{ lvl: 'info', text: 'Digite a superfície queimada de 2º e 3º graus em %.' }] };
    if (st.modo === 'des' && !Object.keys(st.cells).length) return { alerts: [{ lvl: 'info', text: 'Escolha a profundidade e toque ou arraste sobre as áreas queimadas do boneco, ou digite o valor.' }] };
    if (scq > 100) al.push({ lvl: 'crit', text: 'Soma acima de 100%: confira o desenho.' });
    if (st.modo === 'des') {
      rows.push(['2º grau superficial', fmt(por['2s'], 1) + '%'], ['2º grau profundo', fmt(por['2p'], 1) + '%'], ['3º grau', fmt(por['3'], 1) + '%']);
      if (por['1']) rows.push(['1º grau (fora do cálculo)', fmt(por['1'], 1) + '%']);
      rows.push(['Tabela de Lund-Browder', FAIXAS[+faixa()][1]]);
    }
    let txtVol = '';
    if (isFinite(kg) && kg > 0 && scq > 0) {
      const k = st.form === 'pk' ? 4 : st.eletr ? 4 : crianca ? 3 : 2;
      const nomeF = st.form === 'pk' ? 'Parkland, 4 mL/kg/% SCQ' : 'ATLS, ' + k + ' mL/kg/% SCQ' + (st.eletr ? ' (lesão elétrica)' : crianca ? ' (criança)' : '');
      const V = k * kg * scq, h = Math.max(0, u.num(st.horas) || 0);
      rows.push(['Fórmula', nomeF], ['Ringer lactato em 24 h', u.fmt(V, 0) + ' mL']);
      let r1, r2;
      if (h < 8) { r1 = (V / 2) / (8 - h); r2 = (V / 2) / 16; rows.push(['Primeira metade', u.fmt(V / 2, 0) + ' mL até a 8ª hora: ' + u.fmt(r1, 0) + ' mL/h' + (h ? ' (em ' + fmt(8 - h, 1) + ' h)' : '')], ['Segunda metade', u.fmt(V / 2, 0) + ' mL nas 16 h seguintes: ' + u.fmt(r2, 0) + ' mL/h']); }
      else if (h < 24) { r1 = V / (24 - h); al.push({ lvl: 'warn', text: 'Já passaram ' + fmt(h, 1) + ' h da queimadura. O volume restante (' + u.fmt(V, 0) + ' mL, se nada foi infundido) daria ' + u.fmt(r1, 0) + ' mL/h até a 24ª hora; desconte o já infundido e guie pela diurese.' }); }
      if (kg < 30) { const m = kg <= 10 ? 4 * kg : kg <= 20 ? 40 + 2 * (kg - 10) : 60 + (kg - 20); rows.push(['Manutenção (criança < 30 kg)', u.fmt(m, 0) + ' mL/h de soro glicosado 5% com eletrólitos, além da reposição']); }
      const meta = st.eletr ? '1 a 1,5 mL/kg/h (' + u.fmt(kg, 0) + ' a ' + u.fmt(1.5 * kg, 0) + ' mL/h) até clarear a urina' : kg < 30 ? '1 mL/kg/h (' + u.fmt(kg, 0) + ' mL/h)' : '0,5 mL/kg/h (' + u.fmt(0.5 * kg, 0) + ' mL/h, em geral 30 a 50 mL/h)';
      rows.push(['Meta de diurese', meta]);
      txtVol = ' Peso de ' + fmt(kg, 1) + ' kg. Reposição volêmica pela fórmula de ' + nomeF + ': ' + u.fmt(V, 0) + ' mL de Ringer lactato em 24 horas a partir do horário da queimadura, ' +
        (h < 8 ? 'sendo ' + u.fmt(V / 2, 0) + ' mL até a 8ª hora (' + u.fmt(r1, 0) + ' mL/h) e ' + u.fmt(V / 2, 0) + ' mL nas 16 horas seguintes (' + u.fmt(r2, 0) + ' mL/h)' : 'com ajuste pelo atraso de ' + fmt(h, 1) + ' horas') +
        (kg < 30 ? ', associada a soro de manutenção' : '') + '. Meta de diurese de ' + meta + ', com ajuste do volume conforme a diurese.';
    } else if (scq > 0) al.push({ lvl: 'info', text: 'Informe o peso para calcular a reposição.' });
    const lim = crianca ? 10 : 20;
    if (scq >= lim) al.unshift({ lvl: 'warn', text: 'SCQ de ' + fmt(scq, 1) + '%: indicação de reposição volêmica formal (' + (crianca ? 'criança, a partir de 10%' : 'adulto, a partir de 20%') + ').' });
    else if (scq > 0) al.unshift({ lvl: 'info', text: 'Abaixo de ' + lim + '%: em geral sem reposição formal; hidratação oral ou manutenção conforme a clínica. A fórmula fica como referência.' });
    const esp = [];
    if (st.cells['cab|f'] || st.cells['cab|b']) esp.push('face ou crânio');
    if (st.cells['mD|f'] || st.cells['mD|b'] || st.cells['mE|f'] || st.cells['mE|b']) esp.push('mãos');
    if (st.cells['peD|f'] || st.cells['peD|b'] || st.cells['peE|f'] || st.cells['peE|b']) esp.push('pés');
    if (st.cells['gen|f']) esp.push('genitália ou períneo');
    const ref = [];
    if (por['2s'] + por['2p'] > 10 || (st.modo === 'man' && scq > 10)) ref.push('2º grau acima de 10%');
    if (por['3'] > 0) ref.push('3º grau');
    if (esp.length) ref.push('áreas especiais (' + esp.join(', ') + ')');
    if (st.eletr) ref.push('lesão elétrica'); if (st.inal) ref.push('lesão inalatória');
    if (ref.length) al.push({ lvl: 'crit', text: 'Critérios de encaminhamento a centro de queimados: ' + ref.join('; ') + '. Considere também grandes articulações, lesão química, trauma associado e comorbidades.' });
    if (st.inal) notes.push('Lesão inalatória: avaliar via aérea precocemente; pode aumentar a necessidade de volume.');
    notes.push('Cálculo pela área de 2º e 3º graus; o 1º grau não entra. Palma da mão do paciente com os dedos corresponde a cerca de 1% da superfície. A fórmula é ponto de partida: titule pela diurese e pela clínica.');
    const lista = Object.keys(regs).map(r => { const x = regs[r], tot = x['2s'] + x['2p'] + x['3'] + x['1']; const ds = ['3', '2p', '2s', '1'].filter(d => x[d]).map(d => PROF_TXT[d]); return NOME[r] + ' (' + fmt(tot, 1) + '%, ' + ds.join(' e ') + ')'; });
    const txt = 'Queimadura' + (st.modo === 'des' && lista.length ? ' em ' + lista.join(', ') : '') + '. Superfície corporal queimada de ' + fmt(scq, 1) + '% considerando 2º e 3º graus' +
      (st.modo === 'des' ? ' (2º grau superficial ' + fmt(por['2s'], 1) + '%, 2º grau profundo ' + fmt(por['2p'], 1) + '%, 3º grau ' + fmt(por['3'], 1) + '%), estimada pela tabela de Lund-Browder para a faixa ' + FAIXAS[+faixa()][1].toLowerCase() : ', estimativa informada') + '.' +
      (st.eletr ? ' Lesão elétrica.' : '') + (st.inal ? ' Suspeita de lesão inalatória.' : '') + txtVol;
    return { main: { label: 'SCQ (2º e 3º graus)', value: fmt(scq, 1), unit: '%' }, rows, alerts: al, notes, text: txt };
  }

  const tool = {
    id: 'queimados', g: 'cir', title: 'Queimados: superfície corporal e reposição', desc: 'Pinte as áreas no boneco (Lund-Browder por idade) ou digite a %, com Parkland ou ATLS e meta de diurese',
    kw: 'queimadura queimado superficie corporal queimada scq sqc lund browder regra dos nove wallace parkland atls reposicao volemica ringer diurese grande queimado pericia dano estetico',
    disc: 'Ferramenta de apoio. A estimativa da área e a fórmula são ponto de partida; titule pela diurese, pela clínica e pelo protocolo do serviço.',
    render: (h) => {
      const root = h('div', { class: 'tgrid qm' });
      const form = h('section', { class: 'panel' }), res = h('section', { class: 'panel result', id: 'res' });
      root.append(form, res);
      const segB = (opts, cur, on, cls) => h('div', { class: 'seg' + (cls ? ' ' + cls : ''), role: 'group' }, opts.map(o => h('button', { type: 'button', class: String(cur) === String(o[0]) ? 'on' : '', 'aria-pressed': String(cur) === String(o[0]) ? 'true' : 'false', 'data-p': o[0], onclick: () => on(o[0]) }, o[1])));
      const num = (lbl, val, unit, on, hint) => h('label', { class: 'fld' }, h('span', { class: 'lbl' }, lbl), h('span', { class: 'inwrap' }, h('input', { inputmode: 'decimal', autocomplete: 'off', value: val == null ? '' : val, oninput: e => on(e.target.value) }), unit && h('span', { class: 'unit' }, unit)), hint && h('span', { class: 'fh' }, hint));
      const chk = (lbl, val, on) => { const cb = h('input', { type: 'checkbox', onchange: e => on(e.target.checked) }); cb.checked = !!val; return h('label', { class: 'chk full' }, cb, h('span', { class: 'box' }), h('span', { class: 'ctext' }, lbl)); };
      let svgWrap;
      const SVGNS = 'http://www.w3.org/2000/svg';
      const el = (tag, attrs) => { const e = document.createElementNS(SVGNS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
      function svg() {
        const s = el('svg', { viewBox: '0 0 430 440', class: 'qm-svg', role: 'img', 'aria-label': 'Boneco para marcar as áreas queimadas, frente e costas' });
        [[0, FRENTE, 'f', 'Frente'], [230, COSTAS, 'b', 'Costas']].forEach(([ox, shapes, vw, lab]) => {
          const g = el('g', { transform: 'translate(' + ox + ',14)' });
          const t = el('text', { x: 100, y: -2, 'text-anchor': 'middle', class: 'qm-lab' }); t.textContent = lab; g.append(t);
          shapes.forEach(([r, tag, a]) => {
            const k = r + '|' + vw, c = st.cells[k];
            const e = el(tag, Object.assign({}, a, { class: 'qm-r' + (c ? ' d' + c.d : ''), 'data-k': k, 'fill-opacity': c ? (c.f === '1' ? 1 : c.f === '0.5' ? 0.6 : 0.38) : 1 }));
            const ti = el('title', {}); ti.textContent = NOME[r] + (c ? ': ' + fmt(cellPct(k, c), 2) + '%' : ': ' + fmt(regPct(r) * SHARE(r)[vw], 2) + '% desta face'); e.append(ti);
            g.append(e);
          });
          [['D', vw === 'f' ? 30 : 170], ['E', vw === 'f' ? 170 : 30]].forEach(([l, x]) => { const tt = el('text', { x, y: 412, 'text-anchor': 'middle', class: 'qm-lab sm' }); tt.textContent = l === 'D' ? 'direito' : 'esquerdo'; g.append(tt); });
          s.append(g);
        });
        let pintando = false, apagar = false, ultimo = null;
        const regiao = ev => { const t = document.elementFromPoint(ev.clientX, ev.clientY); return t && t.closest && t.closest('.qm-r'); };
        const aplica = r => {
          if (!r) return; const k = r.getAttribute('data-k'); if (k === ultimo) return; ultimo = k;
          if (apagar || st.brush === 'x') delete st.cells[k]; else st.cells[k] = { d: st.brush, f: st.frac };
          const c = st.cells[k]; r.setAttribute('class', 'qm-r' + (c ? ' d' + c.d : '')); r.setAttribute('fill-opacity', c ? (c.f === '1' ? 1 : c.f === '0.5' ? 0.6 : 0.38) : 1);
          save(); upd();
        };
        s.addEventListener('pointerdown', ev => {
          const r = ev.target.closest && ev.target.closest('.qm-r'); if (!r) return;
          ev.preventDefault(); pintando = true; ultimo = null;
          const c = st.cells[r.getAttribute('data-k')];
          apagar = !!(c && c.d === st.brush && c.f === st.frac);
          if (st.modo !== 'des') { st.modo = 'des'; save(); build(); return; }
          aplica(r);
        });
        s.addEventListener('pointermove', ev => { if (pintando) aplica(regiao(ev)); });
        if (fimFn) { window.removeEventListener('pointerup', fimFn); window.removeEventListener('pointercancel', fimFn); }
        fimFn = () => { pintando = false; ultimo = null; };
        window.addEventListener('pointerup', fimFn); window.addEventListener('pointercancel', fimFn);
        return s;
      }
      function upd() { try { D.renderResult(res, calc(), tool, () => {}); } catch (e) { console.error(e); } }
      function build() {
        form.innerHTML = '';
        const p = D.S.patient;
        form.append(h('div', { class: 'fgrid' },
          num('Peso', p.kg, 'kg', x => { D.S.patient.kg = x; D.savePatient(); upd(); }),
          h('label', { class: 'fld' }, h('span', { class: 'lbl' }, 'Faixa etária (Lund-Browder)'), (() => { const s = h('select', { onchange: e => { st.faixa = e.target.value; save(); build(); } }, [h('option', { value: '' }, 'Automática: ' + FAIXAS[+faixaAuto()][1].toLowerCase())].concat(FAIXAS.map(f => h('option', { value: f[0] }, f[1])))); s.value = st.faixa; return s; })())));
        form.append(h('div', { class: 'fld full' }, h('span', { class: 'lbl' }, 'Superfície queimada'), segB([['des', 'Pintar no boneco'], ['man', 'Digitar o valor']], st.modo, x => { st.modo = x; save(); build(); })));
        if (st.modo === 'man') form.append(h('div', { class: 'fgrid' }, num('SCQ de 2º e 3º graus', st.manual, '%', x => { st.manual = x; save(); upd(); }, 'Pela regra dos nove, palma da mão ou outra estimativa')));
        else {
          form.append(h('div', { class: 'fld full' }, h('span', { class: 'lbl' }, 'Profundidade'), segB(PROF.map(x => [x[0], x[1]]), st.brush, x => { st.brush = x; save(); build(); }, 'qm-brush')),
            h('div', { class: 'fld full' }, h('span', { class: 'lbl' }, 'Quanto da área tocada'), segB(FRAC, st.frac, x => { st.frac = x; save(); build(); })));
          svgWrap = h('div', { class: 'qm-wrap' }, svg());
          form.append(svgWrap, h('div', { class: 'qm-leg' }, PROF.slice(0, 4).map(x => h('span', null, h('i', { class: 'qm-sw d' + x[0] }), x[1] + (x[2] ? ' (' + x[2] + ')' : ''))),
            h('button', { type: 'button', class: 'pclear', onclick: () => { st.cells = {}; save(); build(); D.toast('Desenho limpo'); } }, 'Limpar desenho')),
          h('p', { class: 'hint' }, 'Toque numa região ou arraste o dedo para pintar. Tocar de novo com a mesma profundidade apaga. Frente e costas valem metade de cada membro, da cabeça e do pescoço.'));
        }
        form.append(h('h2', { class: 'sec' }, 'Reposição volêmica'),
          h('div', { class: 'fld full' }, h('span', { class: 'lbl' }, 'Fórmula'), segB([['pk', 'Parkland (4 mL)'], ['atls', 'ATLS (2 mL adulto, 3 mL criança, 4 mL elétrica)']], st.form, x => { st.form = x; save(); build(); })),
          h('div', { class: 'fgrid' }, num('Horas desde a queimadura', st.horas, 'h', x => { st.horas = x; save(); upd(); }, 'O tempo conta da hora da queimadura, não da chegada')),
          chk('Lesão elétrica', st.eletr, x => { st.eletr = x; save(); upd(); }), chk('Suspeita de lesão inalatória', st.inal, x => { st.inal = x; save(); upd(); }));
        upd();
      }
      build();
      return root;
    }
  };
  D.add(tool);
})();
