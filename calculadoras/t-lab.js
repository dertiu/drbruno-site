/* Renal, metabólico, gasometria, ventilação, oxigênio, fluidos e perícia */
(function () {
  'use strict';
  const D = window.DRB, u = D.u, F = D.f, fmt = u.fmt, dv = u.dv;
  const inch = cm => cm / 2.54;
  const ibw = (sex, cm) => (sex === 'F' ? 45.5 : 50) + 2.3 * (inch(cm) - 60);
  const pbw = (sex, cm) => (sex === 'F' ? 45.5 : 50) + 0.91 * (cm - 152.4);

  /* ---------- Função renal ---------- */
  const clcr = {
    id: 'clcr', g: 'lab', title: 'Função renal: clearance e TFG', desc: 'Cockcroft-Gault (3 pesos), CKD-EPI 2021 e Schwartz pediátrico',
    kw: 'clearance creatinina tfg renal cockcroft gault ckd-epi schwartz ajuste dose irc drc',
    fields: [F.N('cr', 'Creatinina sérica', { unit: 'mg/dL', full: true }), F.AGE(), F.SEX(), F.KG(), F.CM()],
    calc: v => {
      const { cr, age, sex, kg, cm } = v;
      if (!(cr > 0) || !isFinite(age)) return { alerts: [{ lvl: 'info', text: 'Informe creatinina e idade (e sexo, peso e altura para os demais cálculos).' }] };
      const rows = [], al = [], tx = [];
      let main = null;
      if (age < 18) {
        if (cm > 0) { const e = 0.413 * cm / cr; main = { label: 'TFG estimada (Schwartz)', value: fmt(e, 0), unit: 'mL/min/1,73 m²' }; rows.push(['Schwartz pediátrico (0,413 × altura ÷ Cr)', `${fmt(e, 0)} mL/min/1,73 m²`]); tx.push(`Schwartz ${fmt(e, 0)} mL/min/1,73 m²`); }
        else al.push({ lvl: 'info', text: 'Informe a altura para o cálculo de Schwartz (menores de 18 anos).' });
      }
      if (age >= 18 && sex) {
        const k = sex === 'F' ? 0.7 : 0.9, a = sex === 'F' ? -0.241 : -0.302;
        const e = 142 * Math.pow(Math.min(cr / k, 1), a) * Math.pow(Math.max(cr / k, 1), -1.2) * Math.pow(0.9938, age) * (sex === 'F' ? 1.012 : 1);
        const g = e >= 90 ? 'G1' : e >= 60 ? 'G2' : e >= 45 ? 'G3a' : e >= 30 ? 'G3b' : e >= 15 ? 'G4' : 'G5';
        main = { label: 'TFG estimada (CKD-EPI 2021)', value: fmt(e, 0), unit: 'mL/min/1,73 m²' };
        rows.push(['CKD-EPI 2021', `${fmt(e, 0)} mL/min/1,73 m² (${g})`]); tx.push(`CKD-EPI 2021 ${fmt(e, 0)} mL/min/1,73 m² (${g})`);
      }
      if (age >= 18 && sex && kg > 0) {
        const f = (140 - age) / (72 * cr) * (sex === 'F' ? 0.85 : 1);
        rows.push(['Cockcroft-Gault, peso real', `${fmt(f * kg, 0)} mL/min`]);
        if (cm > 0) {
          const ib = ibw(sex, cm), aj = ib + 0.4 * (kg - ib), imc = kg / Math.pow(cm / 100, 2);
          rows.push(['Cockcroft-Gault, peso ideal', `${fmt(f * ib, 0)} mL/min`], ['Cockcroft-Gault, peso ajustado', `${fmt(f * aj, 0)} mL/min`]);
          const use = imc >= 30 ? aj : imc < 18.5 || kg <= ib ? kg : ib;
          rows.push(['Peso sugerido para o CG', `${imc >= 30 ? 'ajustado' : kg <= ib ? 'real' : 'ideal'} (${fmt(use, 1)} kg; IMC ${fmt(imc, 1)})`]);
          tx.push(`Cockcroft-Gault ${fmt(f * use, 0)} mL/min`);
          if (!main) main = { label: 'Clearance (Cockcroft-Gault)', value: fmt(f * use, 0), unit: 'mL/min' };
        } else if (!main) main = { label: 'Clearance (Cockcroft-Gault)', value: fmt(f * kg, 0), unit: 'mL/min' };
      }
      if (!main && !al.length) al.push({ lvl: 'info', text: 'Informe sexo (adultos) e peso/altura para completar os cálculos.' });
      al.push({ lvl: 'info', text: 'Estimativas válidas em estado de equilíbrio da creatinina. Não usar na lesão renal aguda (a creatinina ainda não refletiu a TFG real), gestantes, amputados e hepatopatas graves.' });
      return { main, rows, alerts: al, text: `Creatinina ${fmt(cr, 2)} mg/dL: ${tx.join('; ')}.` };
    }
  };

  /* ---------- IMC, SC, peso ideal ---------- */
  const imc = {
    id: 'imc', g: 'lab', title: 'IMC, superfície corporal e peso ideal', desc: 'IMC, superfície corporal (Mosteller), peso ideal (Devine), peso ajustado e peso predito para ventilação',
    kw: 'imc peso altura obesidade superficie corporal mosteller peso ideal devine antropometria pericia',
    fields: [F.KG(), F.CM(), F.SEX(), F.AGE()],
    calc: v => {
      const { kg, cm, sex, age } = v; if (!(kg > 0) || !(cm > 0)) return null;
      const m = cm / 100, imc = kg / (m * m), sc = Math.sqrt(cm * kg / 3600);
      const cl = imc < 16 ? 'Magreza grau III' : imc < 17 ? 'Magreza grau II' : imc < 18.5 ? 'Magreza grau I' : imc < 25 ? 'Peso adequado' : imc < 30 ? 'Sobrepeso' : imc < 35 ? 'Obesidade grau I' : imc < 40 ? 'Obesidade grau II' : 'Obesidade grau III';
      const rows = [['Superfície corporal (Mosteller)', `${fmt(sc, 2)} m²`]];
      if (sex) { const ib = ibw(sex, cm), pb = pbw(sex, cm); rows.push(['Peso ideal (Devine)', `${fmt(ib, 1)} kg`], ['Peso ajustado (ideal + 40% do excesso)', `${fmt(ib + 0.4 * (kg - ib), 1)} kg`], ['Peso predito (ventilação, ARDSnet)', `${fmt(pb, 1)} kg`], ['% do peso ideal', `${fmt(kg / ib * 100, 0)}%`]); }
      const al = isFinite(age) && age < 18 ? [{ lvl: 'warn', text: 'Menor de 18 anos: a classificação do IMC exige percentil por idade e sexo (curvas OMS). A classificação mostrada vale para adultos.' }] : [];
      return { main: { label: 'IMC', value: fmt(imc, 1), unit: 'kg/m²' }, sub: cl, rows, alerts: al, text: `Peso ${fmt(kg, 1)} kg, altura ${fmt(cm, 0)} cm, IMC ${fmt(imc, 1)} kg/m² (${cl}), SC ${fmt(sc, 2)} m².` };
    }
  };

  /* ---------- Gasometria ---------- */
  const gaso = {
    id: 'gaso', g: 'lab', title: 'Gasometria arterial: interpretação', desc: 'Distúrbio primário, compensação esperada, ânion gap e delta-delta',
    kw: 'gasometria ph pco2 bicarbonato acidose alcalose anion gap delta winter compensacao',
    fields: [F.N('ph', 'pH'), F.N('pco2', 'pCO₂', { unit: 'mmHg' }), F.N('hco3', 'HCO₃⁻', { unit: 'mEq/L' }), F.N('na', 'Sódio', { unit: 'mEq/L' }), F.N('cl', 'Cloro', { unit: 'mEq/L' }), F.N('alb', 'Albumina', { unit: 'g/dL' })],
    calc: v => {
      const { ph, pco2, hco3, na, cl, alb } = v; if (![ph, pco2, hco3].every(isFinite)) return null;
      const acid = ph < 7.35, alk = ph > 7.45, rAc = pco2 > 45, rAl = pco2 < 35, mAc = hco3 < 22, mAl = hco3 > 26;
      let prim;
      if (acid) prim = mAc && rAc ? 'Acidose mista' : mAc ? 'Acidose metabólica' : rAc ? 'Acidose respiratória' : 'Acidemia: conferir valores';
      else if (alk) prim = mAl && rAl ? 'Alcalose mista' : mAl ? 'Alcalose metabólica' : rAl ? 'Alcalose respiratória' : 'Alcalemia: conferir valores';
      else if (mAc && rAl) prim = 'Acidose metabólica + alcalose respiratória';
      else if (mAl && rAc) prim = 'Alcalose metabólica + acidose respiratória';
      else prim = (mAc || mAl || rAc || rAl) ? 'pH normal com distúrbio compensado ou misto' : 'Equilíbrio ácido-base normal';
      const rows = [], al = [], tx = [prim];
      const add = (lvl, t) => { al.push({ lvl, text: t }); tx.push(t); };
      const metAc = mAc && !alk, metAl = mAl && !acid, respAc = rAc && !alk && !metAl, respAl = rAl && !acid && !metAc;
      if (metAc) {
        const e = 1.5 * hco3 + 8; rows.push(['pCO₂ esperado (Winter)', `${fmt(e - 2, 0)} a ${fmt(e + 2, 0)} mmHg`]);
        if (pco2 > e + 2) add('warn', 'pCO₂ acima do esperado: acidose respiratória associada (compensação insuficiente).');
        else if (pco2 < e - 2) add('warn', 'pCO₂ abaixo do esperado: alcalose respiratória associada.'); else add('info', 'Compensação respiratória adequada para a acidose metabólica.');
      }
      if (metAl) {
        const e = 40 + 0.7 * (hco3 - 24); rows.push(['pCO₂ esperado', `${fmt(e - 5, 0)} a ${fmt(e + 5, 0)} mmHg`]);
        if (pco2 > e + 5) add('warn', 'pCO₂ acima do esperado: acidose respiratória associada.'); else if (pco2 < e - 5) add('warn', 'pCO₂ abaixo do esperado: alcalose respiratória associada.'); else add('info', 'Compensação respiratória adequada para a alcalose metabólica.');
      }
      if (respAc) {
        const a = 24 + (pco2 - 40) / 10, c = 24 + 3.5 * (pco2 - 40) / 10; rows.push(['HCO₃⁻ esperado (agudo / crônico)', `${fmt(a, 0)} / ${fmt(c, 0)} mEq/L`]);
        if (hco3 < a - 2) add('warn', 'HCO₃⁻ abaixo do esperado: acidose metabólica associada.'); else if (hco3 > c + 2) add('warn', 'HCO₃⁻ acima do esperado: alcalose metabólica associada.');
        else add('info', hco3 <= a + 2 ? 'Compatível com acidose respiratória aguda.' : 'Compatível com acidose respiratória crônica ou aguda sobre crônica.');
      }
      if (respAl) {
        const a = 24 - 2 * (40 - pco2) / 10, c = 24 - 4 * (40 - pco2) / 10; rows.push(['HCO₃⁻ esperado (agudo / crônico)', `${fmt(a, 0)} / ${fmt(c, 0)} mEq/L`]);
        if (hco3 > a + 2) add('warn', 'HCO₃⁻ acima do esperado: alcalose metabólica associada.'); else if (hco3 < c - 2) add('warn', 'HCO₃⁻ abaixo do esperado: acidose metabólica associada.');
        else add('info', hco3 >= a - 2 ? 'Compatível com alcalose respiratória aguda.' : 'Compatível com alcalose respiratória crônica.');
      }
      if (isFinite(na) && isFinite(cl)) {
        const ag = na - cl - hco3, agc = isFinite(alb) ? ag + 2.5 * (4 - alb) : ag;
        rows.push(['Ânion gap', `${fmt(ag, 1)} mEq/L`]); if (isFinite(alb)) rows.push(['Ânion gap corrigido (albumina)', `${fmt(agc, 1)} mEq/L`]);
        if (agc > 12) {
          add('warn', 'Ânion gap elevado: acidose metabólica de AG aumentado (cetoacidose, lactato, uremia, intoxicações).');
          if (hco3 < 24) { const dr = (agc - 12) / (24 - hco3); rows.push(['Delta-delta (ΔAG/ΔHCO₃⁻)', fmt(dr, 2)]); add('info', dr < 0.4 ? 'Delta-delta < 0,4: acidose hiperclorêmica associada.' : dr < 1 ? 'Delta-delta 0,4 a 1: acidose de AG aumentado mista com hiperclorêmica.' : dr <= 2 ? 'Delta-delta 1 a 2: acidose de AG aumentado pura.' : 'Delta-delta > 2: alcalose metabólica associada.'); }
        } else if (mAc) add('info', 'Ânion gap normal: acidose hiperclorêmica (perda de bicarbonato: diarreia, acidose tubular renal, excesso de SF).');
      }
      return { main: { label: 'Interpretação', value: prim, small: true }, sub: `pH ${fmt(ph, 2)} · pCO₂ ${fmt(pco2, 0)} · HCO₃⁻ ${fmt(hco3, 0)}`, rows, alerts: al, text: `Gasometria: pH ${fmt(ph, 2)}, pCO₂ ${fmt(pco2, 0)}, HCO₃⁻ ${fmt(hco3, 0)}. ${tx.join(' ')}` };
    }
  };

  /* ---------- Sódio: correção ---------- */
  const TBWF = (age, sex) => (!isFinite(age) || age < 18) ? 0.6 : age >= 65 ? (sex === 'F' ? 0.45 : 0.5) : (sex === 'F' ? 0.5 : 0.6);
  const nacorr = {
    id: 'nacorr', g: 'lab', title: 'Sódio: hiponatremia e hipernatremia', desc: 'Variação esperada do Na⁺ por litro (Adrogué-Madias), volume de solução e déficit de água livre',
    kw: 'sodio hiponatremia hipernatremia adrogue madias agua livre deficit salina hipertonica desmielinizacao osmotica',
    fields: v => v.mode === 'hiper'
      ? [F.SEG('mode', '', [['hipo', 'Hiponatremia'], ['hiper', 'Hipernatremia']], { def: 'hipo' }), F.KG(), F.AGE(), F.SEX(), F.N('na', 'Sódio sérico', { unit: 'mEq/L' }), F.N('alvo', 'Sódio alvo', { unit: 'mEq/L', def: 145 }), F.N('hh', 'Queda máxima por hora', { unit: 'mEq/L/h', def: '0,5', full: true })]
      : [F.SEG('mode', '', [['hipo', 'Hiponatremia'], ['hiper', 'Hipernatremia']], { def: 'hipo' }), F.KG(), F.AGE(), F.SEX(), F.N('na', 'Sódio sérico', { unit: 'mEq/L' }), F.N('dna', 'Aumento desejado em 24 h', { unit: 'mEq/L', def: 6 }),
        F.SEL('inf', 'Solução a infundir', [['513', 'NaCl 3% (513 mEq/L)'], ['154', 'NaCl 0,9% (154 mEq/L)'], ['77', 'NaCl 0,45% (77 mEq/L)'], ['130', 'Ringer lactato (130 mEq/L)'], ['0', 'SG 5% (0 mEq/L)']], { def: '154' })],
    calc: v => {
      const { kg, age, sex, na } = v; if (!(kg > 0) || !(na > 0)) return { alerts: [{ lvl: 'warn', text: 'Informe peso e sódio sérico.' }] };
      const f = TBWF(age, sex), tbw = f * kg, al = [];
      if (!isFinite(age) || (age >= 18 && !sex)) al.push({ lvl: 'info', text: 'Informe idade e sexo para refinar a água corporal total (assumido 0,6 × peso).' });
      if (v.mode === 'hiper') {
        const alvo = v.alvo, hh = v.hh || 0.5; if (!(alvo > 0)) return null;
        const def = tbw * (na / alvo - 1), horas = (na - alvo) / hh;
        if (na <= alvo) return { alerts: [{ lvl: 'info', text: 'O sódio já está no alvo ou abaixo.' }] };
        al.push({ lvl: 'warn', text: 'Corrigir a hipernatremia crônica (> 48 h) em no máximo 10 a 12 mEq/L em 24 h (0,5 mEq/L/h) para evitar edema cerebral. Dosar Na⁺ a cada 4 a 6 h.' });
        return { main: { label: 'Déficit de água livre', value: fmt(def, 1), unit: 'L' }, rows: [['Água corporal total', `${fmt(tbw, 1)} L (${fmt(f, 2)} × peso)`], ['Tempo mínimo de correção', `${fmt(horas, 0)} h`], ['Reposição de água livre', `${fmt(def * 1000 / horas, 0)} mL/h (mais perdas contínuas)`]], alerts: al, text: `Hipernatremia Na ${fmt(na, 0)}: déficit de água livre ${fmt(def, 1)} L; correção em ${fmt(horas, 0)} h.` };
      }
      const inf = Number(v.inf), dna = v.dna; if (!(dna > 0)) return null;
      const d1 = (inf - na) / (tbw + 1);
      if (d1 <= 0) return { alerts: [{ lvl: 'crit', text: 'Esta solução não eleva o sódio (concentração menor ou igual à sérica). Escolha uma solução mais concentrada.' }] };
      const vol = dna / d1;
      if (dna > 8) al.push({ lvl: 'crit', text: 'Aumento > 8 mEq/L em 24 h: risco de síndrome de desmielinização osmótica. Limite habitual: 8 mEq/L/24 h (4 a 6 nos de alto risco).' });
      al.push({ lvl: 'info', text: 'Alto risco de desmielinização: Na⁺ < 105, hipocalemia, etilismo, desnutrição, hepatopatia. Dosar Na⁺ a cada 2 a 4 h; se corrigir rápido demais, considerar reduzir com água livre e desmopressina.' });
      return { main: { label: 'Volume total em 24 h', value: fmt(vol * 1000, 0), unit: 'mL' }, rows: [['Água corporal total', `${fmt(tbw, 1)} L`], ['Variação por litro infundido', `+${fmt(d1, 1)} mEq/L`], ['Vazão média', `${fmt(vol * 1000 / 24, 0)} mL/h`], ['Sódio alvo em 24 h', `${fmt(na + dna, 0)} mEq/L`]], alerts: al,
        notes: ['Hiponatremia grave sintomática (convulsão, coma): NaCl 3% em bolus de 100 a 150 mL (ou 2 mL/kg) em 10 min, repetível, buscando +4 a 6 mEq/L.'], text: `Hiponatremia Na ${fmt(na, 0)}: meta +${fmt(dna, 0)} mEq/L em 24 h; ${fmt(vol * 1000, 0)} mL da solução escolhida (${fmt(vol * 1000 / 24, 0)} mL/h).` };
    }
  };

  /* ---------- Cálculos laboratoriais ---------- */
  const lab = {
    id: 'lab', g: 'lab', title: 'Cálculos laboratoriais', desc: 'Na⁺ corrigido pela glicose, Ca²⁺ corrigido, osmolaridade, FeNa/FeUréia e LDL (Friedewald)',
    kw: 'sodio corrigido glicose calcio corrigido albumina osmolaridade osmolar gap fena fenao feureia ldl friedewald colesterol',
    fields: v => {
      const m = v.mode || 'nagl';
      const out = [F.SEL('mode', 'Cálculo', [['nagl', 'Sódio corrigido pela glicose'], ['ca', 'Cálcio corrigido pela albumina'], ['osm', 'Osmolaridade sérica e gap osmolar'], ['fena', 'Excreção fracionada de sódio e ureia'], ['ldl', 'LDL (Friedewald) e não-HDL']], { def: 'nagl', rebuild: true })];
      if (m === 'nagl') out.push(F.N('na', 'Sódio', { unit: 'mEq/L' }), F.N('gl', 'Glicemia', { unit: 'mg/dL' }));
      if (m === 'ca') out.push(F.N('ca', 'Cálcio total', { unit: 'mg/dL' }), F.N('alb', 'Albumina', { unit: 'g/dL' }));
      if (m === 'osm') out.push(F.N('na', 'Sódio', { unit: 'mEq/L' }), F.N('gl', 'Glicemia', { unit: 'mg/dL' }), F.N('ur', 'Ureia', { unit: 'mg/dL' }), F.N('et', 'Etanol (opcional)', { unit: 'mg/dL' }), F.N('om', 'Osmolaridade medida (opcional)', { unit: 'mOsm/kg', full: true }));
      if (m === 'fena') out.push(F.N('una', 'Sódio urinário', { unit: 'mEq/L' }), F.N('pna', 'Sódio plasmático', { unit: 'mEq/L' }), F.N('ucr', 'Creatinina urinária', { unit: 'mg/dL' }), F.N('pcr', 'Creatinina plasmática', { unit: 'mg/dL' }), F.N('uur', 'Ureia urinária (opcional)', { unit: 'mg/dL' }), F.N('pur', 'Ureia plasmática (opcional)', { unit: 'mg/dL' }));
      if (m === 'ldl') out.push(F.N('ct', 'Colesterol total', { unit: 'mg/dL' }), F.N('hdl', 'HDL', { unit: 'mg/dL' }), F.N('tg', 'Triglicerídeos', { unit: 'mg/dL' }));
      return out;
    },
    calc: v => {
      const m = v.mode || 'nagl';
      if (m === 'nagl') { if (!isFinite(v.na) || !isFinite(v.gl)) return null; const a = v.na + 1.6 * (v.gl - 100) / 100, b = v.na + 2.4 * (v.gl - 100) / 100; return { main: { label: 'Sódio corrigido (1,6)', value: fmt(a, 1), unit: 'mEq/L' }, rows: [['Fator 2,4 (Hillier)', `${fmt(b, 1)} mEq/L`]], alerts: [{ lvl: 'info', text: 'Acréscimo de 1,6 mEq/L de Na⁺ para cada 100 mg/dL de glicose acima de 100 (2,4 em glicemias > 400).' }], text: `Na corrigido ${fmt(a, 1)} mEq/L (Na ${fmt(v.na, 0)}, glicemia ${fmt(v.gl, 0)}).` }; }
      if (m === 'ca') { if (!isFinite(v.ca) || !isFinite(v.alb)) return null; const c = v.ca + 0.8 * (4 - v.alb); return { main: { label: 'Cálcio corrigido', value: fmt(c, 1), unit: 'mg/dL' }, alerts: [{ lvl: 'info', text: 'Fórmula pouco confiável em doentes críticos: prefira o cálcio iônico.' }], text: `Cálcio corrigido ${fmt(c, 1)} mg/dL.` }; }
      if (m === 'osm') {
        if (!['na', 'gl', 'ur'].every(k => isFinite(v[k]))) return null;
        let o = 2 * v.na + v.gl / 18 + v.ur / 6; const rows = [];
        if (isFinite(v.et)) { o += v.et / 3.7; rows.push(['Contribuição do etanol', `${fmt(v.et / 3.7, 1)} mOsm/kg`]); }
        const al = [];
        if (isFinite(v.om)) { const g = v.om - o; rows.push(['Gap osmolar', `${fmt(g, 1)} mOsm/kg`]); al.push({ lvl: g > 10 ? 'warn' : 'info', text: g > 10 ? 'Gap osmolar > 10: considerar álcoois tóxicos (metanol, etilenoglicol), manitol ou cetoacidose.' : 'Gap osmolar dentro do esperado (< 10).' }); }
        return { main: { label: 'Osmolaridade calculada', value: fmt(o, 0), unit: 'mOsm/kg' }, rows, alerts: al, text: `Osmolaridade calculada ${fmt(o, 0)} mOsm/kg.` };
      }
      if (m === 'fena') {
        if (!['una', 'pna', 'ucr', 'pcr'].every(k => isFinite(v[k]))) return null;
        const fe = (v.una * v.pcr) / (v.pna * v.ucr) * 100, rows = [], al = [];
        al.push({ lvl: 'info', text: fe < 1 ? 'FeNa < 1%: sugere causa pré-renal.' : fe > 2 ? 'FeNa > 2%: sugere necrose tubular aguda.' : 'FeNa entre 1 e 2%: indeterminada.' });
        if (isFinite(v.uur) && isFinite(v.pur)) { const fu = (v.uur * v.pcr) / (v.pur * v.ucr) * 100; rows.push(['FeUréia', `${fmt(fu, 1)}%`]); al.push({ lvl: 'info', text: fu < 35 ? 'FeUréia < 35%: sugere causa pré-renal (útil em uso de diuréticos).' : 'FeUréia > 35%: sugere lesão tubular.' }); }
        return { main: { label: 'FeNa', value: fmt(fe, 2), unit: '%' }, rows, alerts: al, text: `FeNa ${fmt(fe, 2)}%.` };
      }
      if (!['ct', 'hdl', 'tg'].every(k => isFinite(v[k]))) return null;
      const nh = v.ct - v.hdl, rows = [['Colesterol não-HDL', `${fmt(nh, 0)} mg/dL`]];
      if (v.tg >= 400) return { main: { label: 'Não-HDL', value: fmt(nh, 0), unit: 'mg/dL' }, rows, alerts: [{ lvl: 'warn', text: 'Triglicerídeos ≥ 400 mg/dL: Friedewald não é válido. Solicite LDL direto.' }] };
      const l = v.ct - v.hdl - v.tg / 5; return { main: { label: 'LDL (Friedewald)', value: fmt(l, 0), unit: 'mg/dL' }, rows, text: `LDL ${fmt(l, 0)} mg/dL; não-HDL ${fmt(nh, 0)} mg/dL.` };
    }
  };

  /* ---------- QTc ---------- */
  const qtc = {
    id: 'qtc', g: 'lab', title: 'QT corrigido (QTc)', desc: 'Bazett, Fridericia, Framingham e Hodges',
    kw: 'qtc qt eletrocardiograma ecg bazett fridericia torsades arritmia intervalo',
    fields: [F.N('qt', 'Intervalo QT', { unit: 'ms' }), F.N('fc', 'Frequência cardíaca', { unit: 'bpm' }), F.SEX()],
    calc: v => {
      if (!(v.qt > 0) || !(v.fc > 0)) return null;
      const rr = 60 / v.fc, b = v.qt / Math.sqrt(rr), fr = v.qt / Math.cbrt(rr), fm = v.qt + 154 * (1 - rr), h = v.qt + 1.75 * (v.fc - 60);
      const lim = v.sex === 'F' ? 470 : 450, al = [];
      al.push({ lvl: fr >= 500 ? 'crit' : fr > lim ? 'warn' : 'ok', text: fr >= 500 ? 'QTc ≥ 500 ms: alto risco de torsades de pointes. Suspender fármacos que prolongam o QT, corrigir K⁺ e Mg²⁺.' : fr > lim ? `QTc prolongado (> ${lim} ms).` : 'QTc dentro do limite de normalidade.' });
      if (!v.sex) al.push({ lvl: 'info', text: 'Informe o sexo para o ponto de corte (homem > 450; mulher > 470 ms).' });
      al.push({ lvl: 'info', text: 'A fórmula de Bazett superestima o QTc em FC > 90 bpm; prefira Fridericia nessa faixa.' });
      return { main: { label: 'QTc (Fridericia)', value: fmt(fr, 0), unit: 'ms' }, rows: [['Bazett', `${fmt(b, 0)} ms`], ['Framingham', `${fmt(fm, 0)} ms`], ['Hodges', `${fmt(h, 0)} ms`]], alerts: al, text: `QT ${fmt(v.qt, 0)} ms, FC ${fmt(v.fc, 0)} bpm: QTc Fridericia ${fmt(fr, 0)} ms, Bazett ${fmt(b, 0)} ms.` };
    }
  };

  /* ---------- Conversões ---------- */
  const CV = [['gl', 'Glicose: mg/dL ⇄ mmol/L', 'mg/dL', 'mmol/L', 1 / 18.016], ['cr', 'Creatinina: mg/dL ⇄ µmol/L', 'mg/dL', 'µmol/L', 88.4], ['ur', 'Ureia: mg/dL ⇄ BUN (mg/dL)', 'ureia', 'BUN', 1 / 2.14],
    ['bi', 'Bilirrubina: mg/dL ⇄ µmol/L', 'mg/dL', 'µmol/L', 17.1], ['col', 'Colesterol: mg/dL ⇄ mmol/L', 'mg/dL', 'mmol/L', 0.02586], ['tg', 'Triglicerídeos: mg/dL ⇄ mmol/L', 'mg/dL', 'mmol/L', 0.01129],
    ['ca', 'Cálcio: mg/dL ⇄ mmol/L', 'mg/dL', 'mmol/L', 0.2495], ['pa', 'Pressão: mmHg ⇄ kPa', 'mmHg', 'kPa', 0.13332], ['kg', 'Peso: kg ⇄ lb', 'kg', 'lb', 2.20462],
    ['cm', 'Altura: cm ⇄ polegadas', 'cm', 'pol', 1 / 2.54], ['mg', 'Eletrólito: mg ⇄ mEq (potássio)', 'mg', 'mEq', 1 / 39.1], ['tf', 'Temperatura: °C ⇄ °F', '°C', '°F', 0]];
  const conv = {
    id: 'conv', g: 'lab', title: 'Conversões de unidades', desc: 'Glicose, creatinina, ureia, bilirrubina, lipídios, cálcio, pressão, peso, altura e temperatura',
    kw: 'conversao unidades mmol umol glicose creatinina libra fahrenheit celsius mmhg kpa polegada',
    fields: [F.SEL('t', 'Conversão', CV.map(c => [c[0], c[1]]), { def: 'gl' }), F.SEG('dir', '', [['ab', 'Primeira → segunda'], ['ba', 'Segunda → primeira']], { def: 'ab' }), F.N('x', 'Valor', { full: true })],
    calc: v => {
      const c = CV.find(k => k[0] === v.t) || CV[0], x = v.x; if (!isFinite(x)) return null;
      const ab = v.dir !== 'ba'; let r;
      if (c[0] === 'tf') r = ab ? x * 9 / 5 + 32 : (x - 32) * 5 / 9; else r = ab ? x * c[4] : x / c[4];
      const from = ab ? c[2] : c[3], to = ab ? c[3] : c[2];
      return { main: { label: 'Resultado', value: fmt(r, r < 1 ? 3 : 2), unit: to }, sub: `${fmt(x, 3)} ${from}`, text: `${fmt(x, 3)} ${from} = ${fmt(r, 3)} ${to}.` };
    }
  };

  /* ---------- Ventilação mecânica ---------- */
  const vent = {
    id: 'vent', g: 'vent', title: 'Ventilação mecânica', desc: 'Peso predito, volume corrente, driving pressure, complacência, resistência e índice de Tobin',
    kw: 'ventilacao mecanica vm respirador volume corrente peso predito complacencia driving pressure platô resistencia tobin rsbi sdra',
    fields: [F.CM(), F.SEX(), F.N('vt', 'Volume corrente em uso', { unit: 'mL' }), F.N('fr', 'Frequência respiratória', { unit: 'irpm' }), F.N('pplat', 'Pressão de platô', { unit: 'cmH₂O' }), F.N('ppico', 'Pressão de pico', { unit: 'cmH₂O' }), F.N('peep', 'PEEP', { unit: 'cmH₂O' }), F.N('fluxo', 'Fluxo inspiratório', { unit: 'L/min' })],
    calc: v => {
      if (!(v.cm > 0) || !v.sex) return { alerts: [{ lvl: 'info', text: 'Informe altura e sexo para o peso predito.' }] };
      const pb = pbw(v.sex, v.cm), rows = [['VC 6 mL/kg', `${fmt(6 * pb, 0)} mL`], ['VC faixa 4 a 8 mL/kg', `${fmt(4 * pb, 0)} a ${fmt(8 * pb, 0)} mL`]], al = [], tx = [`Peso predito ${fmt(pb, 1)} kg`];
      if (v.vt > 0) { const k = v.vt / pb; rows.push(['VC em uso', `${fmt(k, 1)} mL/kg de peso predito`]); tx.push(`VC ${fmt(v.vt, 0)} mL (${fmt(k, 1)} mL/kg)`); if (k > 8) al.push({ lvl: 'warn', text: 'VC acima de 8 mL/kg de peso predito: reduzir (ventilação protetora).' }); if (v.fr > 0) { rows.push(['Volume-minuto', `${fmt(v.vt * v.fr / 1000, 1)} L/min`]); rows.push(['Índice de Tobin (FR/VC)', `${fmt(v.fr / (v.vt / 1000), 0)} irpm/L`]); } }
      if (v.pplat > 0) { if (v.pplat > 30) al.push({ lvl: 'warn', text: 'Pressão de platô > 30 cmH₂O: reduzir o VC / revisar a estratégia ventilatória.' }); if (isFinite(v.peep)) { const dp = v.pplat - v.peep; rows.push(['Driving pressure (platô − PEEP)', `${fmt(dp, 0)} cmH₂O`]); tx.push(`driving pressure ${fmt(dp, 0)}`); if (dp > 15) al.push({ lvl: 'warn', text: 'Driving pressure > 15 cmH₂O: associada a maior mortalidade na SDRA.' }); if (v.vt > 0 && dp > 0) rows.push(['Complacência estática', `${fmt(v.vt / dp, 0)} mL/cmH₂O`]); } }
      if (v.ppico > 0 && isFinite(v.peep) && v.vt > 0) rows.push(['Complacência dinâmica', `${fmt(v.vt / (v.ppico - v.peep), 0)} mL/cmH₂O`]);
      if (v.ppico > 0 && v.pplat > 0 && v.fluxo > 0) rows.push(['Resistência de vias aéreas', `${fmt((v.ppico - v.pplat) / (v.fluxo / 60), 1)} cmH₂O/L/s`]);
      return { main: { label: 'Peso predito (ARDSnet)', value: fmt(pb, 1), unit: 'kg' }, rows, alerts: al, text: tx.join('; ') + '.', notes: ['Pressão de platô e resistência exigem pausa inspiratória em fluxo constante, sem esforço do paciente.'] };
    }
  };

  /* ---------- Oxigenação ---------- */
  const oxig = {
    id: 'oxig', g: 'vent', title: 'Oxigenação: PaO₂/FiO₂, gradiente A-a e ROX', desc: 'Relação P/F, classificação de Berlin, gradiente alvéolo-arterial e índice ROX',
    kw: 'oxigenacao pao2 fio2 relacao pf berlin sdra gradiente alveolo arterial rox cnaf spo2',
    fields: [F.N('pao2', 'PaO₂', { unit: 'mmHg' }), F.N('fio2', 'FiO₂', { unit: '%' }), F.N('paco2', 'PaCO₂ (para gradiente A-a)', { unit: 'mmHg', full: true }), F.N('peep', 'PEEP', { unit: 'cmH₂O' }), F.AGE(), F.N('spo2', 'SpO₂', { unit: '%' }), F.N('fr', 'FR', { unit: 'irpm' }), F.N('patm', 'Pressão atmosférica', { unit: 'mmHg', def: 760, full: true })],
    calc: v => {
      const rows = [], al = [], tx = []; let main = null;
      if (v.pao2 > 0 && v.fio2 > 0) {
        const f = v.fio2 / 100, pf = v.pao2 / f; main = { label: 'PaO₂/FiO₂', value: fmt(pf, 0), unit: 'mmHg' }; tx.push(`P/F ${fmt(pf, 0)}`);
        const cl = pf > 300 ? 'Sem critério de SDRA pela relação P/F' : pf > 200 ? 'SDRA leve (200 a 300)' : pf > 100 ? 'SDRA moderada (100 a 200)' : 'SDRA grave (≤ 100)';
        rows.push(['Classificação (Berlin)', cl]); if (pf <= 300 && !(v.peep >= 5)) al.push({ lvl: 'info', text: 'Os critérios de Berlin exigem PEEP ≥ 5 cmH₂O, infiltrado bilateral e início em até 1 semana.' });
        if (v.paco2 > 0) { const pa = f * (v.patm - 47) - v.paco2 / 0.8, aa = pa - v.pao2; rows.push(['PAO₂ (equação do gás alveolar)', `${fmt(pa, 0)} mmHg`], ['Gradiente A-a', `${fmt(aa, 0)} mmHg`]); tx.push(`A-a ${fmt(aa, 0)}`); if (isFinite(v.age)) { const e = v.age / 4 + 4; rows.push(['A-a esperado (idade ÷ 4 + 4)', `${fmt(e, 0)} mmHg`]); al.push({ lvl: aa > e + 5 ? 'warn' : 'info', text: aa > e + 5 ? 'Gradiente A-a aumentado: distúrbio V/Q, shunt ou difusão.' : 'Gradiente A-a dentro do esperado: considerar hipoventilação ou baixa FiO₂ ambiente.' }); } }
      }
      if (v.spo2 > 0 && v.fio2 > 0) {
        const sf = v.spo2 / (v.fio2 / 100); rows.push(['SpO₂/FiO₂', fmt(sf, 0)]); if (!main) main = { label: 'SpO₂/FiO₂', value: fmt(sf, 0), unit: '' };
        if (v.fr > 0) { const rox = sf / v.fr; rows.push(['Índice ROX', fmt(rox, 2)]); al.push({ lvl: rox >= 4.88 ? 'ok' : rox < 2.85 ? 'crit' : 'warn', text: rox >= 4.88 ? 'ROX ≥ 4,88 (após 2 a 12 h): baixa probabilidade de falha do cateter nasal de alto fluxo.' : rox < 2.85 ? 'ROX < 2,85 em 2 h: alto risco de falha do alto fluxo; considerar intubação.' : 'ROX intermediário: reavaliar em 1 a 2 h.' }); tx.push(`ROX ${fmt(rox, 2)}`); }
      }
      if (!main) return null;
      return { main, rows, alerts: al, text: tx.join('; ') + '.' };
    }
  };

  /* ---------- Cilindro de oxigênio ---------- */
  const o2 = {
    id: 'o2cil', g: 'vent', title: 'Autonomia do cilindro de oxigênio', desc: 'Tempo restante do cilindro conforme pressão, volume e fluxo. Referência de FiO₂ por dispositivo',
    kw: 'oxigenio cilindro autonomia transporte duracao fluxo fio2 cateter mascara venturi',
    fields: [F.N('vol', 'Volume hidráulico do cilindro', { unit: 'L', def: 10, hint: 'Gravado no ombro do cilindro. Ex.: cilindro de 10 m³ ≈ 50 L.', full: true }), F.N('p', 'Pressão no manômetro', { unit: 'bar', def: 150 }), F.N('res', 'Reserva de segurança', { unit: 'bar', def: 20 }), F.N('flux', 'Fluxo de O₂', { unit: 'L/min', full: true })],
    calc: v => {
      if (!(v.vol > 0) || !(v.p > 0) || !(v.flux > 0)) return null;
      const tot = v.vol * v.p, ate = v.vol * Math.max(0, v.p - (v.res || 0)), min = ate / v.flux, h = Math.floor(min / 60);
      return { main: { label: 'Autonomia até a reserva', value: `${h} h ${Math.round(min - h * 60)} min`, small: true }, rows: [['Oxigênio disponível', `${fmt(tot, 0)} L`], ['Autonomia total (até zerar)', `${fmt(tot / v.flux / 60, 1)} h`], ['Fluxo', `${fmt(v.flux, 1)} L/min`]],
        notes: ['Estimativa de FiO₂: cateter nasal ≈ 21% + 4% por L/min (1 a 6 L/min); máscara simples (5 a 10 L/min) ≈ 35 a 55%; máscara com reservatório (10 a 15 L/min) ≈ 60 a 90%; Venturi: fração fixa da válvula.'],
        text: `Cilindro ${fmt(v.vol, 0)} L a ${fmt(v.p, 0)} bar, fluxo ${fmt(v.flux, 1)} L/min: autonomia de ${h} h ${Math.round(min - h * 60)} min até a reserva.` };
    }
  };

  /* ---------- Gotejamento ---------- */
  const gotas = {
    id: 'gotas', g: 'vent', title: 'Gotejamento e vazão', desc: 'Gotas/min, microgotas/min e mL/h; ou o tempo de infusão para um gotejamento',
    kw: 'gotas microgotas gotejamento soro hidratacao vazao equipo macrogotas infusao tempo',
    fields: v => [F.SEG('mode', '', [['t', 'Tempo → gotejamento'], ['g', 'Gotas/min → tempo']], { def: 't' }), F.N('vol', 'Volume a infundir', { unit: 'mL' }),
      ...(v.mode === 'g' ? [F.N('gts', 'Gotejamento', { unit: 'gotas/min' })] : [F.N('h', 'Tempo de infusão', { unit: 'h' })])],
    calc: v => {
      if (!(v.vol > 0)) return null;
      if (v.mode === 'g') { if (!(v.gts > 0)) return null; const h = v.vol / (v.gts * 3); return { main: { label: 'Tempo de infusão', value: fmt(h, 2), unit: 'h' }, rows: [['Vazão', `${fmt(v.gts * 3, 0)} mL/h`], ['Em microgotas/min', `${fmt(v.gts * 3, 0)}`]], text: `${fmt(v.vol, 0)} mL a ${fmt(v.gts, 0)} gotas/min em ${fmt(h, 2)} h.` }; }
      if (!(v.h > 0)) return null;
      return { main: { label: 'Macrogotas', value: fmt(v.vol / (v.h * 3), 0), unit: 'gotas/min' }, rows: [['Microgotas', `${fmt(v.vol / v.h, 0)} microgotas/min`], ['Vazão', `${fmt(v.vol / v.h, 1)} mL/h`]], notes: ['Macrogotas: 20 gotas = 1 mL (gotas/min = mL/h ÷ 3). Microgotas: 60 microgotas = 1 mL (microgotas/min = mL/h).'], text: `${fmt(v.vol, 0)} mL em ${fmt(v.h, 2)} h: ${fmt(v.vol / (v.h * 3), 0)} gotas/min ou ${fmt(v.vol / v.h, 0)} microgotas/min (${fmt(v.vol / v.h, 1)} mL/h).` };
    }
  };

  /* ---------- Diluições ---------- */
  const dil = {
    id: 'dil', g: 'vent', title: 'Diluição e concentração', desc: 'C₁V₁ = C₂V₂, porcentagem ⇄ mg/mL e razão (1:1.000)',
    kw: 'diluicao concentracao c1v1 porcentagem mg/ml razao solucao ampola agua destilada',
    fields: v => {
      const m = v.mode || 'c';
      const out = [F.SEG('mode', '', [['c', 'C₁V₁ = C₂V₂'], ['p', '% ⇄ mg/mL'], ['r', 'Razão 1:X']], { def: 'c' })];
      if (m === 'c') out.push(F.N('c1', 'Concentração inicial (C₁)', { full: true }), F.N('c2', 'Concentração final (C₂)'), F.N('v2', 'Volume final (V₂)', { unit: 'mL' }));
      if (m === 'p') out.push(F.N('pc', 'Porcentagem', { unit: '%', full: true }));
      if (m === 'r') out.push(F.N('rx', 'Razão 1 : X', { hint: 'Ex.: 1:1.000 → X = 1000', full: true }));
      return out;
    },
    calc: v => {
      const m = v.mode || 'c';
      if (m === 'c') { if (!(v.c1 > 0) || !(v.c2 > 0) || !(v.v2 > 0)) return null; const v1 = v.c2 * v.v2 / v.c1; if (v1 > v.v2) return { alerts: [{ lvl: 'crit', text: 'A concentração final não pode ser maior que a inicial.' }] };
        return { main: { label: 'Volume da solução concentrada (V₁)', value: u.auto(v1), unit: 'mL' }, rows: [['Diluente a acrescentar', `${u.auto(v.v2 - v1)} mL`], ['Volume final', `${fmt(v.v2, 1)} mL`]], text: `Retirar ${u.auto(v1)} mL da solução concentrada e completar com ${u.auto(v.v2 - v1)} mL de diluente (volume final ${fmt(v.v2, 1)} mL).` }; }
      if (m === 'p') { if (!(v.pc > 0)) return null; return { main: { label: 'Concentração', value: fmt(v.pc * 10, 3), unit: 'mg/mL' }, rows: [['Em mg por 100 mL', `${fmt(v.pc * 1000, 1)} mg`]], text: `${fmt(v.pc, 3)}% = ${fmt(v.pc * 10, 3)} mg/mL.` }; }
      if (!(v.rx > 0)) return null; return { main: { label: 'Concentração', value: fmt(1000 / v.rx, 4), unit: 'mg/mL' }, rows: [['Porcentagem', `${fmt(100 / v.rx, 4)}%`]], text: `1:${fmt(v.rx, 0)} = ${fmt(1000 / v.rx, 4)} mg/mL.` };
    }
  };

  /* ---------- Datas e idade (perícia) ---------- */
  const parseD = s => (s ? new Date(s + 'T00:00:00') : null);
  const ymd = (a, b) => {
    let y = b.getFullYear() - a.getFullYear(), m = b.getMonth() - a.getMonth(), d = b.getDate() - a.getDate();
    if (d < 0) { m--; d += new Date(b.getFullYear(), b.getMonth(), 0).getDate(); } if (m < 0) { y--; m += 12; } return { y, m, d };
  };
  const datas = {
    id: 'datas', g: 'peri', title: 'Datas: idade e intervalo', desc: 'Idade na data da perícia, tempo entre duas datas e data após N dias, meses ou anos',
    kw: 'data idade intervalo prazo dias meses anos nascimento pericia der dii tempo decorrido',
    fields: v => v.mode === 'add'
      ? [F.SEG('mode', '', [['dif', 'Intervalo entre datas'], ['add', 'Somar ao prazo']], { def: 'dif' }), F.DATE('d1', 'Data inicial', { def: u.today(), full: true }), F.N('n', 'Quantidade'), F.SEL('un', 'Unidade', [['d', 'dias'], ['m', 'meses'], ['a', 'anos']], { def: 'd', full: false })]
      : [F.SEG('mode', '', [['dif', 'Intervalo entre datas'], ['add', 'Somar ao prazo']], { def: 'dif' }), F.DATE('d1', 'Data inicial (ex.: nascimento, acidente)', { full: true }), F.DATE('d2', 'Data final (ex.: perícia)', { def: u.today(), full: true })],
    calc: v => {
      const fm = d => d.toLocaleDateString('pt-BR');
      if (v.mode === 'add') {
        const a = parseD(v.d1), n = v.n; if (!a || !isFinite(n)) return null; const r = new Date(a);
        if (v.un === 'd') r.setDate(r.getDate() + n); else if (v.un === 'm') r.setMonth(r.getMonth() + n); else r.setFullYear(r.getFullYear() + n);
        const wd = r.toLocaleDateString('pt-BR', { weekday: 'long' });
        return { main: { label: 'Data resultante', value: fm(r), small: true }, sub: wd, text: `${fm(a)} + ${n} ${{ d: 'dia(s)', m: 'mês(es)', a: 'ano(s)' }[v.un]} = ${fm(r)}.` };
      }
      let a = parseD(v.d1), b = parseD(v.d2); if (!a || !b) return null;
      let al = []; if (b < a) { [a, b] = [b, a]; al.push({ lvl: 'info', text: 'Datas invertidas: o cálculo considerou a menor como inicial.' }); }
      const r = ymd(a, b), days = Math.round((b - a) / 864e5);
      return { main: { label: 'Intervalo', value: `${r.y} a ${r.m} m ${r.d} d`, small: true }, rows: [['Total de dias', fmt(days, 0)], ['Total de meses completos', fmt(r.y * 12 + r.m, 0)], ['Total de semanas', fmt(days / 7, 1)]], alerts: al, text: `Entre ${fm(a)} e ${fm(b)}: ${r.y} anos, ${r.m} meses e ${r.d} dias (${fmt(days, 0)} dias).` };
    }
  };

  /* ---------- Links (perícia) ---------- */
  const abemid = { id: 'abemid', g: 'peri', title: 'ABEMID', desc: 'Complexidade assistencial · imprime em 1 página', kw: 'internacao domiciliar home care', href: '/ABEMID/' };
  const nead = { id: 'nead', g: 'peri', title: 'NEAD', desc: 'Planejamento de atenção domiciliar · imprime em 1 página', kw: 'internacao domiciliar home care', href: '/nead/' };

  /* ---------- Reposição de eletrólitos ---------- */
  const repos = {
    id: 'repos', g: 'lab', title: 'Reposição e correção de eletrólitos', desc: 'Potássio pela regra prática (faixa 3,3 a 5,5): KCl na hipocalemia; cálcio, solução polarizante, salbutamol, furosemida e resina na hipercalemia. Magnésio, cálcio, fosfato e bicarbonato',
    kw: 'reposicao correcao eletrolitos hipocalemia hipercalemia hiperpotassemia hipopotassemia potassio kcl solucao polarizante gluconato calcio furosemida salbutamol sorcal resina dialise magnesio fosfato bicarbonato hipocalcemia hipomagnesemia hipofosfatemia',
    disc: 'Regra prática de apoio. Correção de potássio exige monitorização (ECG, K⁺ seriado, glicemia e função renal). Confira com o protocolo do hospital.',
    fields: v => {
      const m = v.mode || 'k';
      const out = [F.SEL('mode', 'Eletrólito', [['k', 'Potássio (hipo e hipercalemia)'], ['mg', 'Magnésio'], ['ca', 'Cálcio (gluconato)'], ['po', 'Fosfato'], ['hco', 'Bicarbonato (déficit)']], { def: 'k', rebuild: true })];
      if (m === 'k') out.push(F.N('kv', 'Potássio sérico', { unit: 'mEq/L', full: true }), F.KG({ hint: 'Opcional: usado no bicarbonato' }),
        F.CHK('ecg', 'Alteração no ECG (T apiculada, QRS largo, arritmia) ou fraqueza muscular', null),
        F.CHK('drc', 'Doença renal, oligúria ou uso de IECA, BRA ou espironolactona', null),
        F.SEC('Se hipocalemia'), F.SEG('ac', 'Acesso venoso', [['p', 'Periférico'], ['c', 'Central']], { def: 'p' }), F.CHK('vo', 'Aceita via oral', null, { def: true }),
        F.SEC('Se hipercalemia'), F.N('gl', 'Glicemia', { unit: 'mg/dL', hint: 'Para a solução polarizante' }), F.CHK('acid', 'Acidose metabólica (HCO₃⁻ < 15 ou pH < 7,2)', null));
      else out.push(F.KG());
      if (m === 'mg') out.push(F.N('mv', 'Magnésio sérico', { unit: 'mg/dL' }), F.CHK('grave', 'Arritmia (torsades) ou convulsão', null));
      if (m === 'ca') out.push(F.N('cav', 'Cálcio total', { unit: 'mg/dL' }), F.N('alb', 'Albumina', { unit: 'g/dL', def: 4 }), F.CHK('sint', 'Sintomático (tetania, convulsão, QT longo)', null));
      if (m === 'po') out.push(F.N('pv', 'Fósforo sérico', { unit: 'mg/dL' }));
      if (m === 'hco') out.push(F.N('hv', 'HCO₃⁻ sérico', { unit: 'mEq/L' }), F.N('ha', 'HCO₃⁻ alvo', { unit: 'mEq/L', def: 15 }));
      return out;
    },
    calc: v => {
      const kg = v.kg, m = v.mode || 'k';
      if (m === 'k') return potassio(v);
      if (!(kg > 0)) return { alerts: [{ lvl: 'warn', text: 'Informe o peso.' }] };
      if (m === 'mg') {
        const mv = v.mv;
        const rows = [['Sulfato de magnésio 10% (1 g/10 mL = 8,1 mEq)', '1 a 2 g (10 a 20 mL) em 100 mL de SF em 15 a 60 min'], ['Repor depois', '4 a 6 g (40 a 60 mL de MgSO₄ 10%) em 500 mL em 12 a 24 h']];
        const al = [{ lvl: 'info', text: 'Hipomagnesemia leve (1,2 a 1,6 mg/dL) pode ser reposta por via oral. Cuidado na insuficiência renal (reduzir 50%).' }];
        if (v.grave) al.unshift({ lvl: 'crit', text: 'Torsades/convulsão: MgSO₄ 2 g (20 mL de 10%) IV em 5 a 15 min, repetível. Monitorizar reflexo patelar e FR.' });
        if (isFinite(mv)) rows.unshift(['Magnésio sérico', `${fmt(mv, 1)} mg/dL`]);
        return { main: { label: 'Dose inicial', value: '1 a 2', unit: 'g IV' }, rows, alerts: al, text: 'Magnésio: sulfato de magnésio 10%, 1 a 2 g IV em 100 mL SF em 15 a 60 min; manutenção 4 a 6 g/dia.' };
      }
      if (m === 'ca') {
        const ca = v.cav, alb = v.alb;
        const cc = isFinite(ca) && isFinite(alb) ? ca + 0.8 * (4 - alb) : NaN;
        const rows = [];
        if (isFinite(cc)) rows.push(['Cálcio corrigido pela albumina', `${fmt(cc, 1)} mg/dL (Ca + 0,8 × (4 − albumina))`]);
        rows.push(['Gluconato de cálcio 10% (10 mL = 1 g = 4,65 mEq)', v.sint ? '1 a 2 g (10 a 20 mL) em 100 mL de SG 5% em 10 a 20 min' : '1 a 2 g em 50 a 100 mL em 30 min, depois manutenção'], ['Manutenção', '0,5 a 1,5 mg/kg/h de cálcio elementar (gluconato 10% 10 a 15 mL/h em 100 mL de SG 5%)']);
        const al = [{ lvl: 'info', text: 'Prefira cálcio iônico quando disponível, pois a correção pela albumina pode errar no doente crítico.' }, { lvl: 'warn', text: 'Infundir em bolus lento, com monitorização, e nunca no mesmo acesso do bicarbonato ou fosfato. Em uso de digoxina, evitar bolus.' }];
        if (isFinite(cc) && cc >= 8.5) al.unshift({ lvl: 'ok', text: 'Cálcio corrigido normal: reposição geralmente desnecessária (se assintomático).' });
        return { main: { label: 'Cálcio corrigido', value: isFinite(cc) ? fmt(cc, 1) : 'n/d', unit: 'mg/dL' }, rows, alerts: al, text: `Cálcio ${isFinite(cc) ? 'corrigido ' + fmt(cc, 1) + ' mg/dL; ' : ''}gluconato de cálcio 10% 1 a 2 g IV em 10 a 30 min.` };
      }
      if (m === 'po') {
        const p = v.pv; if (!(p > 0)) return { alerts: [{ lvl: 'info', text: 'Informe o fósforo sérico.' }] };
        const dose = p < 1 ? 0.64 : p < 2.3 ? 0.32 : 0, tot = dose * kg;
        if (!dose) return { alerts: [{ lvl: 'info', text: 'Fósforo normal ou acima de 2,3 mg/dL: sem reposição.' }] };
        return { main: { label: 'Fosfato', value: fmt(tot, 0), unit: 'mmol' }, rows: [['Dose', `${dose} mmol/kg (${p < 1 ? 'grave, < 1 mg/dL' : 'moderada, 1 a 2,3 mg/dL'})`], ['Velocidade', 'Infundir em 6 a 12 h (máx. 7,5 mmol/h)'], ['Fosfato de potássio ou sódio (3 mmol P/mL)', `${fmt(tot / 3, 1)} mL diluídos em 250 a 500 mL de SF`]],
          alerts: [{ lvl: 'warn', text: 'Cuidado com insuficiência renal e hipocalcemia; reduzir a dose em 50%. Monitorizar P, Ca e K a cada 6 h.' }], text: `Hipofosfatemia (P ${fmt(p, 1)}): fosfato ${fmt(tot, 0)} mmol em 6 a 12 h.` };
      }
      const h = v.hv, ha = v.ha || 15; if (!(h > 0)) return { alerts: [{ lvl: 'info', text: 'Informe o bicarbonato sérico.' }] };
      if (h >= ha) return { alerts: [{ lvl: 'info', text: 'Bicarbonato no alvo ou acima.' }] };
      const def = 0.5 * kg * (ha - h);
      return { main: { label: 'Déficit de bicarbonato', value: fmt(def, 0), unit: 'mEq' }, rows: [['Bicarbonato 8,4% (1 mEq/mL)', `${fmt(def, 0)} mL no total`], ['Infundir', 'Metade nas primeiras 4 a 6 h; reavaliar gasometria']],
        alerts: [{ lvl: 'warn', text: 'Reservar para acidose grave (pH < 7,1 a 7,2) ou hipercalemia. Em CAD, só se pH < 6,9. Monitorizar K⁺ e Ca²⁺ ionizado.' }], text: `Déficit de HCO3: 0,5 × ${fmt(kg, 1)} × (${ha} − ${fmt(h, 0)}) = ${fmt(def, 0)} mEq.` };
    }
  };

  /* ---------- potássio: regra prática, faixa 3,3 a 5,5 ---------- */
  function potassio(v) {
    const k = v.kv, kg = v.kg;
    if (!(k > 0)) return { alerts: [{ lvl: 'info', text: 'Informe o potássio sérico.' }] };
    const steps = [], al = [];
    if (k >= 3.3 && k <= 5.5) {
      return { main: { label: 'Potássio', value: fmt(k, 1), unit: 'mEq/L' }, sub: 'Dentro da faixa prática (3,3 a 5,5): sem correção',
        alerts: [{ lvl: 'ok', text: 'Manter a dieta e as medicações habituais. Repetir conforme o quadro clínico.' }, { lvl: 'info', text: 'Situações com conduta própria: cetoacidose (use o protocolo da CAD), arritmia, uso de digoxina.' }],
        text: `Potássio ${fmt(k, 1)} mEq/L, dentro da faixa prática (3,3 a 5,5). Sem correção.` };
    }
    if (k < 3.3) {
      const sev = v.ecg || k < 2.5 ? 'grave' : k < 3 ? 'moderada' : 'leve', perif = v.ac !== 'c';
      const PER = 'SF 0,9% 500 mL + KCl 19,1% 8 mL (20 mEq) EV em 2 h (250 mL/h = 10 mEq/h)';
      const CEN = 'SF 0,9% 100 mL + KCl 19,1% 8 mL (20 mEq) EV em 1 h, em bomba de infusão, com monitor cardíaco (20 mEq/h)';
      const VO = 'Cloreto de potássio xarope 6% (0,8 mEq/mL): 15 mL VO de 8/8h após as refeições (≈ 36 mEq/dia), ou KCl 600 mg (8 mEq): 2 cp VO de 8/8h';
      if (sev === 'leve') {
        steps.push(v.vo ? { t: 'Reposição oral', d: VO + ', por 3 a 5 dias.' } : { t: 'Reposição venosa', d: PER + '. Uma etapa e dosar o K⁺ em 6 h.' });
        steps.push({ t: 'Controle', d: 'Dosar K⁺ em 24 a 48 h. Tratar a causa (diurético, vômitos, diarreia).' });
      } else if (sev === 'moderada') {
        steps.push({ t: 'Reposição venosa', d: (perif ? PER : CEN) + `. Fazer 2 a 3 etapas (40 a 60 mEq) e dosar o K⁺ após cada 40 mEq.` });
        if (v.vo) steps.push({ t: 'Associar via oral', d: VO + '.' });
        steps.push({ t: 'Controle', d: 'ECG. Dosar K⁺ a cada 4 a 6 h até sair da faixa de risco.' });
      } else {
        steps.push({ t: 'Monitorizar', d: 'Monitor cardíaco contínuo e ECG. Acesso central de preferência.' });
        steps.push({ t: 'Reposição venosa', d: (perif ? PER + '. Se acesso só periférico, pode usar 2 acessos simultâneos com essa solução' : CEN + '. Repetir a cada hora conforme o K⁺') + '. Dosar o K⁺ a cada 1 a 2 h.' });
        steps.push({ t: 'Magnésio', d: 'Sulfato de magnésio 10% 20 mL (2 g) em 100 mL de SF 0,9% EV em 1 h (hipomagnesemia impede a correção do potássio).' });
      }
      al.push({ lvl: 'warn', text: 'Nunca fazer KCl em bolus nem puro. Periférico: até 40 mEq/L e 10 mEq/h. Central: até 20 mEq/h com monitor.' });
      if (v.drc) al.push({ lvl: 'warn', text: 'Doença renal ou oligúria: reduzir a dose pela metade e dosar o K⁺ com mais frequência.' });
      if (sev !== 'grave' && k < 3) al.push({ lvl: 'info', text: 'Dosar e repor o magnésio se baixo.' });
      return { main: { label: 'Hipocalemia', value: sev, small: true }, sub: `K⁺ ${fmt(k, 1)} mEq/L: corrigir até voltar à faixa 3,3 a 5,5`, steps, alerts: al,
        text: `Hipocalemia ${sev} (K ${fmt(k, 1)}). ` + steps.map(x => x.t + ': ' + x.d).join(' ') };
    }
    // hipercalemia
    const sev = v.ecg || k >= 6.5 ? 'grave' : k >= 6 ? 'moderada' : 'leve', gl = v.gl;
    steps.push({ t: 'Confirmar e monitorizar', d: 'Afastar pseudo-hipercalemia (hemólise, garrote prolongado). ECG' + (sev !== 'leve' ? ' e monitor cardíaco contínuo.' : '.') });
    if (sev === 'grave') steps.push({ t: 'Proteger o coração', lvl: 'crit', d: 'Gluconato de cálcio 10% 10 mL (1 g) EV em 2 a 5 min. Repetir em 5 min se o ECG continuar alterado (até 3 doses). Efeito em minutos, dura 30 a 60 min. Em uso de digoxina, infundir em 20 a 30 min.' });
    if (sev !== 'leve') {
      steps.push({ t: 'Solução polarizante', d: isFinite(gl) && gl >= 250 ? 'Insulina regular 10 UI EV (glicemia ≥ 250: sem glicose). Glicemia capilar de 1/1h por 4 a 6 h.' : 'Insulina regular 10 UI + glicose 50% 100 mL EV em 30 a 60 min (ou SG 10% 500 mL + insulina regular 10 UI em 1 h). Glicemia capilar de 1/1h por 4 a 6 h.' });
      steps.push({ t: 'Salbutamol', d: 'Salbutamol aerossol 200 mcg: 6 jatos (1.200 mcg) com espaçador; pode repetir em 20 min. Complementa a insulina, não substitui. Cuidado em coronariopatas.' });
      if (v.acid) steps.push({ t: 'Bicarbonato (acidose)', d: kg > 0 ? `Bicarbonato de sódio 8,4% ${fmt(Math.round(kg), 0)} mL (1 mEq/kg) EV em 30 min.` : 'Bicarbonato de sódio 8,4% 1 mL/kg (1 mEq/kg) EV em 30 min.' });
    }
    steps.push({ t: 'Retirar potássio do corpo', d: 'Furosemida 40 a 80 mg EV (cerca de 1 mg/kg) se houver diurese e sem hipovolemia (doses maiores na doença renal). Poliestirenossulfonato de cálcio (Sorcal) 30 g VO diluído em 100 mL de água de 8/8h.' });
    if (sev === 'grave' || v.drc) steps.push({ t: 'Avaliar hemodiálise', lvl: 'warn', d: 'Se K⁺ ≥ 6,5 refratário, insuficiência renal oligúrica, acidose grave ou hipervolemia.' });
    steps.push({ t: 'Suspender e investigar', d: 'IECA, BRA, espironolactona, AINE, suplemento de potássio, heparina, trimetoprima e betabloqueador. Dieta pobre em potássio.' });
    steps.push({ t: 'Controle', d: sev === 'leve' ? 'Dosar K⁺ em 6 a 12 h.' : 'Dosar K⁺ em 1 a 2 h após as medidas; o efeito da insulina e do salbutamol dura 4 a 6 h.' });
    if (sev === 'grave') al.push({ lvl: 'crit', text: 'Hipercalemia grave: emergência. Cálcio primeiro, depois insulina com glicose e salbutamol, em seguida remover o potássio.' });
    return { main: { label: 'Hipercalemia', value: sev, small: true }, sub: `K⁺ ${fmt(k, 1)} mEq/L: corrigir até voltar à faixa 3,3 a 5,5`, steps, alerts: al,
      text: `Hipercalemia ${sev} (K ${fmt(k, 1)}). ` + steps.map(x => x.t + ': ' + x.d).join(' ') };
  }

  D.add(repos, clcr, imc, gaso, nacorr, lab, qtc, conv, vent, oxig, o2, gotas, dil, datas, abemid, nead);
})();
