/* CAD: protocolo passo a passo com acompanhamento hora a hora (adulto) */
(function () {
  'use strict';
  const D = window.DRB, u = D.u, fmt = u.fmt;
  const KEY = 'drb_cad', TTL = 48 * 3600 * 1000;
  const n = x => u.num(x);
  const r05 = x => Math.round(x * 2) / 2;
  const hhmm = t => { const d = new Date(t); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
  const load = () => { const s = u.LS(KEY, null); if (!s || (s.saved && Date.now() - s.saved > TTL)) return { ini: {}, reg: '0.1', log: [], t0: null }; return s; };
  const save = s => { s.saved = Date.now(); u.SAVE(KEY, s); };

  /* ---------- avaliação inicial ---------- */
  function initial(s) {
    const i = s.ini, kg = n(D.S.patient.kg), ageRaw = n(D.S.patient.age), ageU = D.S.patient.ageU || 'a';
    const age = isFinite(ageRaw) ? (ageU === 'a' ? ageRaw : ageU === 'm' ? ageRaw / 12 : ageRaw / 365) : NaN;
    const gl = n(i.gl), ph = n(i.ph), hco3 = n(i.hco3), k = n(i.k), na = n(i.na), cl = n(i.cl), cet = n(i.cet);
    const ag = isFinite(na) && isFinite(cl) && isFinite(hco3) ? na - cl - hco3 : NaN;
    const nac = isFinite(na) && isFinite(gl) ? na + 1.6 * (gl - 100) / 100 : NaN;
    const osm = isFinite(na) && isFinite(gl) ? 2 * na + gl / 18 : NaN;
    const Dc = (isFinite(gl) && gl >= 200) || !!i.dm, Kc = (isFinite(cet) && cet >= 3) || !!i.cetu, Ac = (isFinite(ph) && ph < 7.3) || (isFinite(hco3) && hco3 < 18);
    let sev = '';
    if (isFinite(ph) || isFinite(hco3)) {
      const p = isFinite(ph) ? ph : 9, b = isFinite(hco3) ? hco3 : 99;
      sev = p < 7 || b < 10 ? 'grave' : p < 7.25 || b < 15 ? 'moderada' : 'leve';
    }
    return { kg, age, ped: isFinite(age) && age < 18, gl, ph, hco3, k, na, cl, cet, ag, nac, osm, Dc, Kc, Ac, sev, card: !!i.card };
  }

  /* ---------- simulação do acompanhamento ---------- */
  function simulate(s, I) {
    const kg = I.kg, steps = [];
    const per = s.reg === '0.14' ? 0.14 : s.reg === '0.05' ? 0.05 : 0.1;
    let rate = r05(per * kg), dex = false, paused = false, resolved = false;
    let hid = { sol: I.nac >= 135 ? 'NaCl 0,45%' : 'SF 0,9%', mlh: I.card ? 150 : 250 }, gli = null;
    let lastK = I.k, lastNa = I.na, lastCl = I.cl, lastGasT = s.t0;
    s.log.forEach((e, idx) => {
      const msgs = [], gl = n(e.gl), ph = n(e.ph), hco3 = n(e.hco3), k = n(e.k), cet = n(e.cet);
      if (isFinite(n(e.na))) lastNa = n(e.na); if (isFinite(n(e.cl))) lastCl = n(e.cl);
      const prev = idx > 0 ? s.log[idx - 1] : null;
      const dt = prev ? Math.max(0.25, (e.t - prev.t) / 3.6e6) : 0, drop = prev && isFinite(n(prev.gl)) && isFinite(gl) ? (n(prev.gl) - gl) / dt : NaN;
      let lvl = 'info';
      if (idx === 0) msgs.push(`Início da insulina: ${fmt(rate, 1)} UI/h = ${fmt(rate, 1)} mL/h (${fmt(per, 2)} UI/kg/h).`);
      // potássio
      if (isFinite(k)) {
        lastK = k;
        if (k < 3.5) { paused = true; lvl = 'crit'; msgs.push(`K⁺ ${fmt(k, 1)}: PAUSAR a insulina. Repor KCl 10 mEq/h (SF 0,9% 1.000 mL + KCl 19,1% 16 mL a 250 mL/h). Dosar K⁺ em 1 a 2 h e retomar a insulina quando K⁺ ≥ 3,5.`); }
        else { if (paused) msgs.push('K⁺ ≥ 3,5: retomar a insulina.'); paused = false;
          msgs.push(k <= 5 ? `K⁺ ${fmt(k, 1)}: manter KCl 19,1% 8 a 12 mL (20 a 30 mEq) em cada 1.000 mL de soro (alvo 4 a 5).` : `K⁺ ${fmt(k, 1)}: sem KCl no soro. Dosar novamente em 2 h.`); }
      }
      // glicemia
      if (idx > 0 && isFinite(gl)) {
        if (gl < 70) {
          lvl = 'crit'; dex = true; rate = Math.max(r05(0.02 * kg), r05(rate / 2)); gli = { sol: 'SG 10%', mlh: 150 };
          msgs.push(`HIPOGLICEMIA (${fmt(gl, 0)}): glicose 50% 40 mL EV agora; SG 10% a 150 mL/h; reduzir insulina para ${fmt(rate, 1)} UI/h. Glicemia em 15 a 30 min.`);
        } else if (!dex) {
          if (gl < 250) {
            dex = true; rate = Math.min(rate, r05(0.05 * kg)); gli = { sol: 'SG 5%', mlh: 150 }; hid.mlh = Math.min(hid.mlh, 150);
            msgs.push(`Glicemia < 250: INICIAR SG 5% a 150 mL/h, reduzir a hidratação para ${hid.mlh} mL/h e a insulina para ${fmt(rate, 1)} UI/h (0,05 UI/kg/h). Alvo: glicemia entre 150 e 250 até sair da acidose.`);
          } else if (isFinite(drop)) {
            if (drop < 50) { const nr = r05(Math.max(rate + 1, rate * 1.25)); msgs.push(`Queda de ${fmt(drop, 0)} mg/dL/h (abaixo de 50): conferir hidratação e acesso; aumentar insulina de ${fmt(rate, 1)} para ${fmt(nr, 1)} UI/h.`); rate = nr; lvl = 'warn'; }
            else if (drop > 100) { const nr = r05(Math.max(0.05 * kg, rate * 0.75)); msgs.push(`Queda de ${fmt(drop, 0)} mg/dL/h (acima de 100): reduzir insulina para ${fmt(nr, 1)} UI/h.`); rate = nr; lvl = 'warn'; }
            else msgs.push(`Queda de ${fmt(drop, 0)} mg/dL/h (alvo 50 a 75): manter ${fmt(rate, 1)} UI/h.`);
          }
        } else {
          if (gl > 250) { const nr = r05(Math.min(0.1 * kg, rate + Math.max(1, 0.02 * kg))); msgs.push(`Glicemia ${fmt(gl, 0)} (acima do alvo): aumentar insulina para ${fmt(nr, 1)} UI/h e manter ${gli ? gli.sol : 'SG 5%'}.`); rate = nr; lvl = 'warn'; }
          else if (gl >= 150) msgs.push(`Glicemia ${fmt(gl, 0)} no alvo (150 a 250): manter insulina ${fmt(rate, 1)} UI/h e ${gli ? gli.sol + ' ' + gli.mlh + ' mL/h' : 'SG 5% 150 mL/h'}.`);
          else if (gl >= 100) {
            if (gli && gli.sol === 'SG 5%') { gli = { sol: 'SG 10%', mlh: 150 }; msgs.push(`Glicemia ${fmt(gl, 0)} (abaixo do alvo): trocar SG 5% por SG 10% a 150 mL/h; manter insulina ${fmt(rate, 1)} UI/h.`); }
            else { rate = Math.max(r05(0.02 * kg), r05(rate * 0.75)); gli = { sol: 'SG 10%', mlh: 150 }; msgs.push(`Glicemia ${fmt(gl, 0)} (abaixo do alvo): manter SG 10% e reduzir insulina para ${fmt(rate, 1)} UI/h (não desligar enquanto houver acidose).`); }
            lvl = 'warn';
          } else {
            rate = Math.max(r05(0.02 * kg), r05(rate * 0.5)); gli = { sol: 'SG 10%', mlh: 200 }; lvl = 'warn';
            msgs.push(`Glicemia ${fmt(gl, 0)}: SG 10% a 200 mL/h e insulina reduzida para ${fmt(rate, 1)} UI/h. Glicemia em 30 min.`);
          }
        }
      }
      if (paused) { for (let j = 0; j < msgs.length; j++) if (/insulina/i.test(msgs[j]) && !/PAUSAR/.test(msgs[j]) && !/^Início/.test(msgs[j])) msgs[j] += ' Obs.: a insulina segue pausada pelo K⁺ baixo; ao retomar, usar essa vazão.'; }
      // gasometria
      let ag = NaN, gas = false;
      if (isFinite(ph) || isFinite(hco3)) {
        gas = true; lastGasT = e.t;
        ag = isFinite(lastNa) && isFinite(lastCl) && isFinite(hco3) ? lastNa - lastCl - hco3 : NaN;
        if (isFinite(ph) && ph < 6.9) { lvl = 'crit'; msgs.push('pH < 6,9: bicarbonato de sódio 8,4% 100 mL (100 mEq) em 400 mL de água destilada + KCl 19,1% 8 mL, em 2 h; repetir a cada 2 h até pH ≥ 7,0.'); }
        else if (isFinite(ph) && ph < 7) msgs.push('pH entre 6,9 e 7,0: bicarbonato pode ser considerado se instabilidade hemodinâmica; em geral não é necessário.');
        const r24 = isFinite(cet) && cet < 0.6 && ((isFinite(ph) && ph >= 7.3) || (isFinite(hco3) && hco3 >= 18));
        const cnt = [isFinite(hco3) && hco3 >= 15, isFinite(ph) && ph > 7.3, isFinite(ag) && ag <= 12].filter(Boolean).length;
        const glNow = isFinite(gl) ? gl : NaN;
        const rCl = isFinite(glNow) && glNow < 200 && cnt >= 2;
        if (r24 || rCl) { resolved = true; lvl = 'ok'; msgs.push('META ATINGIDA: critérios de resolução da CAD presentes (' + [r24 && 'ADA 2024: cetonemia < 0,6 com pH ≥ 7,3 ou HCO₃ ≥ 18', rCl && 'clássico: glicemia < 200 e 2 de HCO₃ ≥ 15, pH > 7,3, ânion gap ≤ 12'].filter(Boolean).join('; ') + '). Fazer a transição para insulina subcutânea.'); }
        else msgs.push(`Ainda em acidose (pH ${isFinite(ph) ? fmt(ph, 2) : 'n/d'}, HCO₃ ${isFinite(hco3) ? fmt(hco3, 0) : 'n/d'}${isFinite(ag) ? ', AG ' + fmt(ag, 0) : ''}): manter a insulina até a resolução.`);
      }
      steps.push({ e, dt, drop, rate: paused ? 0 : rate, paused, dex, hid: Object.assign({}, hid), gli: gli && Object.assign({}, gli), msgs, lvl, ag, gas, resolved });
    });
    const last = steps[steps.length - 1];
    return { steps, rate: last ? last.rate : r05(per * kg), paused, dex, hid, gli, resolved, lastK, nextGl: last ? last.e.t + 3.6e6 : null, nextGas: lastGasT ? lastGasT + 7.2e6 : null, per };
  }

  /* ---------- tela ---------- */
  const tool = {
    id: 'cad', g: 'med', title: 'CAD: protocolo passo a passo',
    desc: 'Expansão volêmica, potássio, insulina em bomba e acompanhamento hora a hora com ajuste da vazão, soro glicosado e meta de resolução',
    kw: 'cad cetoacidose diabetica dka insulina bomba bic potassio hidratacao soro glicosado protocolo hora a hora gasometria resolucao transicao',
    disc: 'Protocolo para adultos baseado no consenso ADA/EASD/JBDS 2024 e na diretriz da SBD. Os ajustes são sugestões: a decisão é sua, à beira do leito. Em menores de 18 anos, siga o protocolo pediátrico (ISPAD): risco de edema cerebral.',
    render: h => {
      const s = load();
      const root = h('div', { class: 'cad' });
      const P = D.S.patient;
      function persist() { save(s); }
      function draw() {
        root.innerHTML = '';
        const I = initial(s), sim = s.t0 ? simulate(s, I) : null, kg = I.kg;
        const field = (id, label, unit, ph) => h('label', { class: 'pf' }, h('span', null, label), h('span', { class: 'pfin' },
          h('input', { inputmode: 'decimal', value: s.ini[id] || '', placeholder: ph || '', 'aria-label': label, onchange: e => { s.ini[id] = e.target.value; persist(); draw(); } }), unit && h('span', { class: 'u' }, unit)));
        const chk = (id, label) => { const c = h('input', { type: 'checkbox', onchange: e => { s.ini[id] = e.target.checked; persist(); draw(); } }); c.checked = !!s.ini[id]; return h('label', { class: 'chk' }, c, h('span', { class: 'box' }), h('span', { class: 'ctext' }, label)); };
        const step = (num, title, ...kids) => h('section', { class: 'panel cad-step' }, h('h2', { class: 'cad-h' }, h('span', { class: 'cad-n' }, String(num)), title), ...kids);
        const al = (lvl, t) => h('div', { class: 'alert ' + lvl }, u.icon('alert'), h('span', null, t));
        const rows = rr => h('dl', { class: 'rows' }, rr.filter(Boolean).map(([k, v]) => h('div', { class: 'r' }, h('dt', null, k), h('dd', null, v))));

        // painel "bomba agora"
        if (sim) {
          const st = sim.resolved ? 'Meta atingida' : sim.paused ? 'Insulina pausada (K⁺ baixo)' : 'Em correção';
          root.append(h('section', { class: 'cad-now' + (sim.resolved ? ' ok' : sim.paused ? ' crit' : '') },
            h('div', { class: 'cad-now-h' }, h('span', null, 'Bomba agora'), h('b', null, st)),
            h('div', { class: 'cad-meters' },
              h('div', { class: 'm' }, h('span', null, 'Insulina'), h('b', null, fmt(sim.rate, 1)), h('i', null, 'mL/h = UI/h'), h('small', null, kg > 0 ? fmt(sim.rate / kg, 3) + ' UI/kg/h' : '')),
              h('div', { class: 'm' }, h('span', null, sim.hid.sol), h('b', null, String(sim.hid.mlh)), h('i', null, 'mL/h'), h('small', null, sim.lastK < 3.5 ? 'KCl 40 mEq/L (10 mEq/h)' : sim.lastK <= 5 ? 'KCl 20 a 30 mEq/L' : 'sem KCl')),
              h('div', { class: 'm' }, h('span', null, sim.gli ? sim.gli.sol : 'Soro glicosado'), h('b', null, sim.gli ? String(sim.gli.mlh) : '0'), h('i', null, 'mL/h'), h('small', null, sim.gli ? 'iniciado com glicemia < 250' : 'iniciar quando glicemia < 250'))),
            h('div', { class: 'cad-next' }, h('span', null, 'Próxima glicemia: ', h('b', null, sim.nextGl ? hhmm(sim.nextGl) : 'n/d')), h('span', null, 'Próxima gasometria e K⁺: ', h('b', null, sim.nextGas ? hhmm(sim.nextGas) : 'n/d')))));
        }

        // 1. dados e diagnóstico
        const kgIn = h('label', { class: 'pf' }, h('span', null, 'Peso'), h('span', { class: 'pfin' }, h('input', { inputmode: 'decimal', value: P.kg || '', 'aria-label': 'Peso', onchange: e => { P.kg = e.target.value; D.savePatient(); draw(); } }), h('span', { class: 'u' }, 'kg')));
        const ageIn = h('label', { class: 'pf' }, h('span', null, 'Idade'), h('span', { class: 'pfin' }, h('input', { inputmode: 'decimal', value: P.age || '', 'aria-label': 'Idade', onchange: e => { P.age = e.target.value; P.ageU = 'a'; D.savePatient(); draw(); } }), h('span', { class: 'u' }, 'anos')));
        const dx = [];
        if (isFinite(I.gl) || isFinite(I.ph) || isFinite(I.hco3)) {
          const ok = I.Dc && I.Kc && I.Ac;
          dx.push(al(ok ? 'crit' : 'info', ok ? `CAD ${I.sev}: glicemia/DM, cetose e acidose presentes.` : `Critérios: hiperglicemia ou DM ${I.Dc ? 'sim' : 'não'}; cetose ${I.Kc ? 'sim' : 'não confirmada'}; acidose ${I.Ac ? 'sim' : 'não'}. Diagnóstico exige os três.`));
          if (I.ped) dx.push(al('crit', 'Menor de 18 anos: usar protocolo pediátrico (ISPAD). Expansão 10 mL/kg em 30 a 60 min, sem bolus de insulina, 0,05 a 0,1 UI/kg/h após 1 h de hidratação.'));
          if (isFinite(I.osm) && I.osm > 320) dx.push(al('warn', `Osmolalidade efetiva ${fmt(I.osm, 0)}: componente hiperosmolar. Queda da osmolalidade não deve passar de 3 a 8 mOsm/kg/h.`));
        }
        root.append(step(1, 'Dados de entrada e diagnóstico',
          h('div', { class: 'cad-grid' }, kgIn, ageIn, field('gl', 'Glicemia', 'mg/dL'), field('ph', 'pH', ''), field('hco3', 'HCO₃⁻', 'mEq/L'), field('k', 'Potássio', 'mEq/L'), field('na', 'Sódio', 'mEq/L'), field('cl', 'Cloro', 'mEq/L'), field('cet', 'Cetonemia (opcional)', 'mmol/L')),
          h('div', { class: 'cad-chk' }, chk('dm', 'Diabetes conhecido'), chk('cetu', 'Cetonúria ≥ 2+'), chk('card', 'Idoso, cardiopata ou DRC (volumes menores)')),
          rows([isFinite(I.ag) && ['Ânion gap', `${fmt(I.ag, 0)} mEq/L`], isFinite(I.nac) && ['Sódio corrigido', `${fmt(I.nac, 0)} mEq/L`], isFinite(I.osm) && ['Osmolalidade efetiva', `${fmt(I.osm, 0)} mOsm/kg`], I.sev && ['Gravidade', I.sev]]),
          ...dx,
          h('p', { class: 'hint' }, 'Solicitar: glicemia, gasometria venosa, Na, K, Cl, ureia, creatinina, fósforo, hemograma, cetonemia ou cetonúria, ECG e investigar o fator desencadeante (infecção, omissão de insulina, IAM, iSGLT2).')));

        // 2. expansão
        if (kg > 0) {
          const v15 = Math.round(15 * kg / 50) * 50, v20 = Math.round(Math.min(20 * kg, 1500) / 50) * 50;
          const after = isFinite(I.nac) ? (I.nac >= 135 ? 'NaCl 0,45%' : 'SF 0,9%') : 'SF 0,9% (ou NaCl 0,45% se Na⁺ corrigido ≥ 135)';
          root.append(step(2, 'Expansão volêmica (1ª hora)',
            I.ped ? rows([['SF 0,9%', `${fmt(10 * kg, 0)} mL (10 mL/kg) em 30 a 60 min`]])
              : I.card ? rows([['SF 0,9% ou Ringer lactato', '250 a 500 mL em 30 min e reavaliar (congestão, diurese)']])
                : rows([['SF 0,9% ou Ringer lactato', `${fmt(v15, 0)} a ${fmt(v20, 0)} mL em 1 h (15 a 20 mL/kg)`], ['Vazão na 1ª hora', `${fmt(v20, 0)} mL/h`]]),
            rows([['Depois da 1ª hora', `${after} a ${I.card ? '150' : '250'} mL/h (4 a 14 mL/kg/h: ${fmt(4 * kg, 0)} a ${fmt(14 * kg, 0)} mL/h), conforme volemia e diurese`],
              ['Preparo do NaCl 0,45%', 'SF 0,9% 500 mL + água destilada 500 mL (ou AD 1.000 mL + NaCl 20% 22,5 mL)']]),
            h('p', { class: 'hint' }, 'Choque: repetir 20 mL/kg. Meta de diurese acima de 0,5 mL/kg/h. Reavaliar a volemia a cada hora.')));
        } else root.append(step(2, 'Expansão volêmica (1ª hora)', al('warn', 'Informe o peso no passo 1.')));

        // 3. potássio
        const k = I.k;
        root.append(step(3, 'Potássio antes da insulina',
          !isFinite(k) ? al('warn', 'Informe o potássio no passo 1. Não iniciar insulina sem conhecer o K⁺.')
            : k < 3.5 ? h('div', null, al('crit', `K⁺ ${fmt(k, 1)} (< 3,5): NÃO iniciar a insulina. Repor KCl 10 mEq/h e dosar o K⁺ a cada 1 a 2 h.`), rows([['Solução prática', 'SF 0,9% 1.000 mL + KCl 19,1% 16 mL (40 mEq) a 250 mL/h = 10 mEq/h'], ['Iniciar insulina quando', 'K⁺ ≥ 3,5 mEq/L']]))
              : k <= 5 ? h('div', null, al('warn', `K⁺ ${fmt(k, 1)} (3,5 a 5,0): repor junto com a hidratação e iniciar a insulina.`), rows([['Solução prática', 'KCl 19,1% 8 a 12 mL (20 a 30 mEq) em cada 1.000 mL do soro de hidratação'], ['Alvo', 'K⁺ entre 4 e 5 mEq/L']]))
                : al('ok', `K⁺ ${fmt(k, 1)} (> 5,0): não repor agora. Iniciar a insulina e dosar o K⁺ em 2 h.`),
          h('p', { class: 'hint' }, 'Confirmar diurese antes de repor. KCl 19,1% = 2,56 mEq/mL. Em acesso periférico, até 40 mEq/L e 10 mEq/h.')));

        // 4. insulina
        const blocked = !isFinite(k) || k < 3.5 || !(kg > 0) || !isFinite(I.gl);
        const regs = I.ped ? [['0.05', '0,05 UI/kg/h'], ['0.1', '0,1 UI/kg/h']] : [['0.1', '0,1 UI/kg/h sem bolus (ADA 2024)'], ['0.1b', 'Bolus 0,1 UI/kg + 0,1 UI/kg/h'], ['0.14', '0,14 UI/kg/h sem bolus']];
        if (!regs.some(r => r[0] === s.reg)) s.reg = regs[0][0];
        const per = s.reg === '0.14' ? 0.14 : s.reg === '0.05' ? 0.05 : 0.1, rate0 = kg > 0 ? r05(per * kg) : NaN;
        const seg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Esquema de insulina' }, regs.map(([v, l]) => h('button', { type: 'button', class: s.reg === v ? 'on' : '', 'aria-pressed': s.reg === v ? 'true' : 'false', disabled: !!s.t0, onclick: () => { s.reg = v; persist(); draw(); } }, l)));
        root.append(step(4, 'Insulina regular em bomba de infusão',
          rows([['Solução', 'SF 0,9% 100 mL + insulina regular 100 UI (1 mL) = 1 UI/mL'], ['Equipo', 'Preencher e desprezar 20 mL antes de conectar']]), seg,
          kg > 0 && h('div', { class: 'cad-big' }, h('span', null, 'Vazão inicial'), h('b', null, fmt(rate0, 1)), h('i', null, `mL/h (${fmt(rate0, 1)} UI/h)`)),
          s.reg === '0.1b' && kg > 0 && rows([['Bolus EV antes da bomba', `${fmt(r05(0.1 * kg), 1)} UI de insulina regular`]]),
          s.t0 ? h('p', { class: 'hint' }, `Insulina iniciada às ${hhmm(s.t0)}.`) :
            h('button', { type: 'button', class: 'copy cad-start', disabled: blocked, onclick: () => {
              const t = Date.now(); s.t0 = t; s.log = [{ t, gl: s.ini.gl, ph: s.ini.ph, hco3: s.ini.hco3, k: s.ini.k, na: s.ini.na, cl: s.ini.cl, cet: s.ini.cet }]; persist(); draw();
              setTimeout(() => { const f = document.getElementById('cad-gl'); if (f) f.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 50);
            } }, blocked ? (isFinite(k) && k < 3.5 ? 'Aguardando K⁺ ≥ 3,5' : 'Preencha peso, glicemia e potássio') : 'Iniciar a insulina agora (hora 0)')));

        // 5. acompanhamento
        if (s.t0 && sim) {
          const tIn = h('input', { type: 'time', value: hhmm(Date.now()), 'aria-label': 'Hora da medida' });
          const gIn = h('input', { id: 'cad-gl', inputmode: 'decimal', 'aria-label': 'Glicemia capilar' });
          const ex = { ph: h('input', { inputmode: 'decimal', 'aria-label': 'pH' }), hco3: h('input', { inputmode: 'decimal', 'aria-label': 'HCO3' }), k: h('input', { inputmode: 'decimal', 'aria-label': 'Potássio' }), na: h('input', { inputmode: 'decimal', 'aria-label': 'Sódio' }), cl: h('input', { inputmode: 'decimal', 'aria-label': 'Cloro' }), cet: h('input', { inputmode: 'decimal', 'aria-label': 'Cetonemia' }) };
          const gasDue = sim.nextGas && Date.now() >= sim.nextGas - 10 * 60000;
          const det = h('details', { class: 'cad-gas', open: gasDue ? true : null }, h('summary', null, 'Gasometria e eletrólitos (a cada 2 h)' + (gasDue ? ': agora' : '')),
            h('div', { class: 'cad-grid' }, ...[['ph', 'pH', ''], ['hco3', 'HCO₃⁻', 'mEq/L'], ['k', 'Potássio', 'mEq/L'], ['na', 'Sódio', 'mEq/L'], ['cl', 'Cloro', 'mEq/L'], ['cet', 'Cetonemia', 'mmol/L']].map(([id, l, un]) =>
              h('label', { class: 'pf' }, h('span', null, l), h('span', { class: 'pfin' }, ex[id], un && h('span', { class: 'u' }, un))))));
          const add = () => {
            if (!isFinite(n(gIn.value))) { gIn.focus(); return; }
            const last = s.log[s.log.length - 1], [hh, mm] = (tIn.value || hhmm(Date.now())).split(':').map(Number);
            const d = new Date(last.t); d.setHours(hh, mm, 0, 0); let t = d.getTime(); while (t <= last.t - 3600000) t += 86400000; if (t <= last.t) t = last.t + 60000;
            const e = { t, gl: gIn.value }; Object.keys(ex).forEach(k2 => { if (ex[k2].value.trim()) e[k2] = ex[k2].value; });
            s.log.push(e); persist(); draw();
          };
          gIn.addEventListener('keydown', e => { if (e.key === 'Enter') add(); });
          const tbl = h('div', { class: 'cad-log' }, sim.steps.slice().reverse().map((st, i) => h('div', { class: 'cad-row ' + st.lvl },
            h('div', { class: 'cad-row-h' }, h('b', null, hhmm(st.e.t)), h('span', null, `Glicemia ${isFinite(n(st.e.gl)) ? fmt(n(st.e.gl), 0) : 'n/d'}`),
              isFinite(st.drop) && h('span', null, `${st.drop >= 0 ? 'queda' : 'subida'} ${fmt(Math.abs(st.drop), 0)}/h`),
              st.gas && h('span', null, `pH ${isFinite(n(st.e.ph)) ? fmt(n(st.e.ph), 2) : 'n/d'} · HCO₃ ${isFinite(n(st.e.hco3)) ? fmt(n(st.e.hco3), 0) : 'n/d'}${isFinite(st.ag) ? ' · AG ' + fmt(st.ag, 0) : ''}`),
              h('span', { class: 'cad-pump' }, `Insulina ${fmt(st.rate, 1)} mL/h${st.gli ? ' · ' + st.gli.sol + ' ' + st.gli.mlh + ' mL/h' : ''}`)),
            h('ul', null, st.msgs.map(m => h('li', null, m))))));
          const undo = s.log.length > 1 && h('button', { type: 'button', class: 'rx-btn', onclick: () => { s.log.pop(); persist(); draw(); } }, 'Desfazer a última medida');
          root.append(step(5, 'Acompanhamento hora a hora',
            h('div', { class: 'cad-add' }, h('label', { class: 'pf' }, h('span', null, 'Hora'), h('span', { class: 'pfin' }, tIn)),
              h('label', { class: 'pf' }, h('span', null, 'Glicemia capilar'), h('span', { class: 'pfin' }, gIn, h('span', { class: 'u' }, 'mg/dL'))),
              h('button', { type: 'button', class: 'copy rx-copy', onclick: add }, 'Registrar e ajustar')),
            det, tbl, undo));

          // 6. resolução e transição
          if (sim.resolved && kg > 0) {
            const tdd = Math.round(0.5 * kg), nph = Math.round(tdd / 4), reg = Math.round(tdd / 6);
            root.append(step(6, 'Meta atingida: transição para insulina subcutânea',
              al('ok', 'CAD resolvida. Fazer a insulina SC e manter a bomba por mais 1 a 2 h antes de desligar. Liberar dieta se aceitar.'),
              rows([['Dose total diária estimada', `${tdd} UI (0,5 UI/kg/dia; faixa 0,3 a 0,6)`], ['Insulina NPH', `${nph} UI SC às 7h e ${nph} UI SC às 22h`], ['Insulina regular', `${reg} UI SC 30 min antes do café, almoço e jantar`], ['Correção', 'Esquema de regular conforme glicemia capilar antes das refeições']]),
              h('p', { class: 'hint' }, 'Se já usava insulina, retomar a dose prévia ajustada. Investigar e tratar o fator desencadeante. Orientar o paciente e encaminhar para acompanhamento.')));
          }
        }

        // ações gerais
        const txt = () => {
          const L = [`CAD (${kg > 0 ? fmt(kg, 1) + ' kg' : 'peso n/d'}). Entrada: glicemia ${s.ini.gl || 'n/d'}, pH ${s.ini.ph || 'n/d'}, HCO3 ${s.ini.hco3 || 'n/d'}, K ${s.ini.k || 'n/d'}${isFinite(I.ag) ? ', AG ' + fmt(I.ag, 0) : ''}.`];
          if (sim) { L.push(`Insulina regular em BIC (1 UI/mL) iniciada às ${hhmm(s.t0)}.`); sim.steps.forEach(st => L.push(`${hhmm(st.e.t)}: glicemia ${st.e.gl}${st.gas ? `, pH ${st.e.ph || 'n/d'}, HCO3 ${st.e.hco3 || 'n/d'}${st.e.k ? ', K ' + st.e.k : ''}` : ''}. Insulina ${fmt(st.rate, 1)} mL/h${st.gli ? ', ' + st.gli.sol + ' ' + st.gli.mlh + ' mL/h' : ''}.`)); L.push(sim.resolved ? 'CAD resolvida.' : 'Em correção.'); }
          return L.join('\n');
        };
        const copyB = h('button', { type: 'button', class: 'copy' }, u.icon('copy'), 'Copiar evolução');
        copyB.onclick = () => { const t = txt(); const done = () => { copyB.lastChild.textContent = 'Copiado'; setTimeout(() => { copyB.lastChild.textContent = 'Copiar evolução'; }, 1500); };
          if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(t).then(done, done); else { const ta = h('textarea', { style: 'position:fixed;opacity:0' }); ta.value = t; document.body.append(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (e) { } ta.remove(); } };
        root.append(h('div', { class: 'cad-actions' }, copyB, h('button', { type: 'button', class: 'rx-btn', onclick: () => { if (window.confirm('Encerrar este caso e apagar os dados da CAD deste aparelho?')) { s.ini = {}; s.log = []; s.t0 = null; s.reg = '0.1'; u.SAVE(KEY, null); try { localStorage.removeItem(KEY); } catch (e) { } draw(); } } }, 'Novo caso (apagar)')),
          h('p', { class: 'hint' }, 'Os valores ficam salvos só neste aparelho por até 48 h, sem identificação do paciente.'));
      }
      draw();
      return root;
    }
  };

  D.add(tool);
  D.cad = { simulate, initial };
})();
