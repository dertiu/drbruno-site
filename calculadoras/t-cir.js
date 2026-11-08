/* Cirurgia geral e trauma */
(function () {
  'use strict';
  const D = window.DRB, u = D.u, F = D.f, fmt = u.fmt, auto = u.auto;
  const C = (id, label, pts, short) => ({ id, label, chk: pts, short });

  /* ---------- Critérios de Tóquio (TG18) ---------- */
  const ORG = [
    ['o1', 'Cardiovascular: hipotensão com necessidade de dopamina ≥ 5 mcg/kg/min ou qualquer dose de noradrenalina'],
    ['o2', 'Neurológico: rebaixamento do nível de consciência'],
    ['o3', 'Respiratório: PaO₂/FiO₂ < 300'],
    ['o4', 'Renal: oligúria ou creatinina > 2,0 mg/dL'],
    ['o5', 'Hepático: INR > 1,5'],
    ['o6', 'Hematológico: plaquetas < 100.000/mm³']
  ];
  const toquio = {
    id: 'toquio', g: 'cir', title: 'Critérios de Tóquio (TG18): colecistite e colangite',
    desc: 'Diagnóstico e grau de gravidade (I, II, III) com a conduta sugerida',
    kw: 'toquio tokyo tg18 colecistite colangite aguda biliar murphy charcot reynolds cpre drenagem abdome agudo',
    disc: 'Baseado nas Diretrizes de Tóquio 2018. Conduta final depende do risco cirúrgico, da disponibilidade de CPRE/drenagem e da avaliação do cirurgião.',
    fields: v => {
      const m = v.mode || 'col';
      const out = [F.SEG('mode', '', [['col', 'Colecistite'], ['ang', 'Colangite']], { def: 'col' })];
      if (m === 'col') {
        out.push(F.SEC('A. Sinais locais de inflamação'), F.CHK('a1', 'Sinal de Murphy', null), F.CHK('a2', 'Massa, dor ou defesa em hipocôndrio direito', null),
          F.SEC('B. Sinais sistêmicos de inflamação'), F.CHK('b1', 'Febre', null), F.CHK('b2', 'PCR elevada', null), F.CHK('b3', 'Leucocitose', null),
          F.SEC('C. Imagem'), F.CHK('c1', 'Achados de colecistite aguda (US/TC/RM)', null),
          F.SEC('Gravidade: grau III (disfunção orgânica)'), ...ORG.map(o => F.CHK(o[0], o[1], null)),
          F.SEC('Gravidade: grau II'), F.CHK('g1', 'Leucócitos > 18.000/mm³', null), F.CHK('g2', 'Massa palpável dolorosa em hipocôndrio direito', null), F.CHK('g3', 'Duração dos sintomas > 72 h', null),
          F.CHK('g4', 'Inflamação local acentuada (gangrenosa, enfisematosa, abscesso, peritonite biliar)', null));
      } else {
        out.push(F.SEC('A. Inflamação sistêmica'), F.CHK('a1', 'Febre (> 38 °C) e/ou calafrios', null), F.CHK('a2', 'Leucócitos < 4.000 ou > 10.000/mm³, ou PCR ≥ 1 mg/dL', null),
          F.SEC('B. Colestase'), F.CHK('b1', 'Icterícia (bilirrubina total ≥ 2 mg/dL)', null), F.CHK('b2', 'Provas hepáticas alteradas (FA, GGT, AST, ALT > 1,5 × limite superior)', null),
          F.SEC('C. Imagem'), F.CHK('c1', 'Dilatação das vias biliares', null), F.CHK('c2', 'Evidência de etiologia (estenose, cálculo, stent)', null),
          F.SEC('Gravidade: grau III (disfunção orgânica)'), ...ORG.map(o => F.CHK(o[0], o[1], null)),
          F.SEC('Gravidade: grau II (dois ou mais)'), F.CHK('g1', 'Leucócitos > 12.000 ou < 4.000/mm³', null), F.CHK('g2', 'Febre ≥ 39 °C', null), F.CHK('g3', 'Idade ≥ 75 anos', null), F.CHK('g4', 'Bilirrubina total ≥ 5 mg/dL', null), F.CHK('g5', 'Albumina < 0,7 × limite inferior', null));
      }
      return out;
    },
    calc: v => {
      const m = v.mode || 'col', n = ks => ks.filter(k => v[k]).length;
      const org = n(ORG.map(o => o[0])) > 0;
      if (m === 'col') {
        const A = n(['a1', 'a2']) > 0, B = n(['b1', 'b2', 'b3']) > 0, Ci = !!v.c1;
        const dx = A && B && Ci ? 'Diagnóstico definitivo' : A && B ? 'Diagnóstico suspeito (confirmar por imagem)' : 'Critérios insuficientes';
        const grau = org ? 'III' : n(['g1', 'g2', 'g3', 'g4']) > 0 ? 'II' : 'I';
        const cond = grau === 'III' ? 'Ressuscitação e suporte de órgãos, antibiótico imediato e drenagem da vesícula (colecistostomia percutânea). Colecistectomia apenas em centro experiente e paciente com boa reserva.'
          : grau === 'II' ? 'Antibiótico e colecistectomia videolaparoscópica precoce por equipe experiente; se inflamação acentuada ou risco, drenagem percutânea e cirurgia posterior.'
            : 'Antibiótico (opcional se leve), analgesia e colecistectomia videolaparoscópica precoce (idealmente em até 72 h dos sintomas).';
        const al = [{ lvl: grau === 'III' ? 'crit' : grau === 'II' ? 'warn' : 'info', text: 'Conduta sugerida: ' + cond }];
        if (dx === 'Critérios insuficientes') al.unshift({ lvl: 'info', text: 'Diagnóstico exige pelo menos um sinal local (A) e um sinal sistêmico (B). Imagem confirma.' });
        return { main: { label: 'Gravidade', value: dx === 'Critérios insuficientes' ? 'Sem critério' : 'Grau ' + grau, small: false }, sub: dx, alerts: al,
          text: dx === 'Critérios insuficientes' ? 'Colecistite aguda (Tóquio TG18): critérios insuficientes para o diagnóstico.' : `Colecistite aguda (Tóquio TG18): ${dx.toLowerCase()}, grau ${grau}. ${cond}` };
      }
      const A = n(['a1', 'a2']) > 0, B = n(['b1', 'b2']) > 0, Ci = n(['c1', 'c2']) > 0;
      const dx = A && B && Ci ? 'Diagnóstico definitivo' : A && (B || Ci) ? 'Diagnóstico suspeito' : 'Critérios insuficientes';
      const g2 = n(['g1', 'g2', 'g3', 'g4', 'g5']);
      const grau = org ? 'III' : g2 >= 2 ? 'II' : 'I';
      const cond = grau === 'III' ? 'Suporte de órgãos, antibiótico imediato e drenagem biliar URGENTE (CPRE; se inviável, drenagem percutânea transhepática).'
        : grau === 'II' ? 'Antibiótico e drenagem biliar PRECOCE (CPRE nas primeiras 24 a 48 h).'
          : 'Antibiótico; drenagem biliar se não houver resposta em 24 h (CPRE eletiva se cálculo).';
      return { main: { label: 'Gravidade', value: dx === 'Critérios insuficientes' ? 'Sem critério' : 'Grau ' + grau }, sub: dx,
        alerts: [{ lvl: grau === 'III' ? 'crit' : grau === 'II' ? 'warn' : 'info', text: 'Conduta sugerida: ' + cond }, { lvl: 'info', text: 'Antibiótico cobrindo enterobactérias e anaeróbios conforme o protocolo do hospital, após hemoculturas.' }],
        text: dx === 'Critérios insuficientes' ? 'Colangite aguda (Tóquio TG18): critérios insuficientes para o diagnóstico.' : `Colangite aguda (Tóquio TG18): ${dx.toLowerCase()}, grau ${grau}. ${cond}` };
    }
  };

  /* ---------- Ranson ---------- */
  const ranson = F.score({
    id: 'ranson', g: 'cir', title: 'Ranson (pancreatite aguda)', max: 11, desc: 'Gravidade da pancreatite: admissão e 48 horas',
    kw: 'pancreatite aguda ranson gravidade lipase amilase abdome agudo',
    items: [{ sec: 'À admissão' }, C('i', 'Idade > 55 anos', 1, 'Idade'), C('l', 'Leucócitos > 16.000/mm³', 1, 'Leucócitos'), C('g', 'Glicemia > 200 mg/dL', 1, 'Glicemia'), C('d', 'LDH > 350 U/L', 1, 'LDH'), C('a', 'AST > 250 U/L', 1, 'AST'),
      { sec: 'Em 48 horas' }, C('h', 'Queda do hematócrito > 10 pontos', 1, 'Queda de Ht'), C('b', 'Aumento da ureia (BUN) > 5 mg/dL', 1, 'BUN'), C('c', 'Cálcio < 8 mg/dL', 1, 'Cálcio'), C('o', 'PaO₂ < 60 mmHg', 1, 'PaO₂'),
      C('e', 'Déficit de bases > 4 mEq/L', 1, 'Déficit de bases'), C('s', 'Sequestro de líquido > 6 L', 1, 'Sequestro')],
    interp: t => t <= 2 ? { title: 'Pancreatite leve', lvl: 'ok', text: 'Mortalidade aproximada abaixo de 5%. Hidratação, analgesia e dieta oral precoce conforme tolerância.' }
      : t <= 4 ? { title: 'Gravidade moderada', lvl: 'warn', text: 'Mortalidade aproximada de 15%. Considerar monitorização intensiva e reavaliações seriadas.' }
        : t <= 6 ? { title: 'Pancreatite grave', lvl: 'crit', text: 'Mortalidade aproximada de 40%. Indicar UTI.' }
          : { title: 'Pancreatite muito grave', lvl: 'crit', text: 'Mortalidade aproximada acima de 50%. Indicar UTI.' }
  });

  /* ---------- BISAP ---------- */
  const bisap = F.score({
    id: 'bisap', g: 'cir', title: 'BISAP (pancreatite aguda)', max: 5, desc: 'Mortalidade intra-hospitalar nas primeiras 24 horas',
    kw: 'pancreatite aguda bisap mortalidade ureia sirs derrame pleural',
    items: [C('b', 'Ureia (BUN) > 25 mg/dL (ureia > 54 mg/dL)', 1, 'Ureia'), C('i', 'Alteração do estado mental (Glasgow < 15)', 1, 'Estado mental'), C('s', 'SIRS: 2 ou mais critérios', 1, 'SIRS'), C('a', 'Idade > 60 anos', 1, 'Idade'), C('p', 'Derrame pleural', 1, 'Derrame pleural')],
    interp: t => t <= 2 ? { title: 'Baixo risco', lvl: 'ok', text: 'Mortalidade aproximada abaixo de 2%.' }
      : { title: t === 3 ? 'Alto risco' : 'Risco muito alto', lvl: 'crit', text: t === 3 ? 'Mortalidade aproximada de 5 a 8%. Considerar internação em unidade monitorizada.' : 'Mortalidade aproximada de 13 a 27%. Considerar UTI.' }
  });

  /* ---------- Profilaxia antibiótica cirúrgica ---------- */
  // Fármacos: dose adulta, dose pediátrica por kg, máximo, repique intraoperatório (h), tempo de infusão
  const AB = {
    cefa: { n: 'Cefazolina', ad: 2, au: 'g', ped: 30, pmax: 2000, redo: 4, t: 'bolus lento/30 min', heavy: [120, 3] },
    cefox: { n: 'Cefoxitina', ad: 2, au: 'g', ped: 40, pmax: 2000, redo: 2, t: '30 min' },
    cefur: { n: 'Cefuroxima', ad: 1.5, au: 'g', ped: 50, pmax: 1500, redo: 4, t: '30 min' },
    metro: { n: 'Metronidazol', ad: 0.5, au: 'g', ped: 15, pmax: 500, redo: null, t: '30 a 60 min' },
    clinda: { n: 'Clindamicina', ad: 0.9, au: 'g', ped: 10, pmax: 900, redo: 6, t: '30 min' },
    gent: { n: 'Gentamicina', adkg: 5, ped: 5, pmax: 480, redo: null, t: '30 min', note: 'Peso ideal ou ajustado em obesos' },
    vanco: { n: 'Vancomicina', adkg: 15, ped: 15, pmax: 2000, redo: null, t: '60 min, iniciar 120 min antes da incisão' },
    amps: { n: 'Ampicilina-sulbactam', ad: 3, au: 'g', ped: 50, pmax: 3000, redo: 2, t: '15 a 30 min' },
    cipro: { n: 'Ciprofloxacino', ad: 0.4, au: 'g', ped: 10, pmax: 400, redo: null, t: '60 min, iniciar 120 min antes da incisão' },
    ceftri: { n: 'Ceftriaxona', ad: 1, au: 'g', ped: 50, pmax: 1000, redo: null, t: '30 min' },
    azit: { n: 'Azitromicina', ad: 0.5, au: 'g', ped: 10, pmax: 500, redo: null, t: '60 min' }
  };
  const PRO = [
    { id: 'hernia', n: 'Hernioplastia com tela', ab: ['cefa'], alt: ['clinda'], note: 'Hernioplastia sem tela em baixo risco: profilaxia opcional.' },
    { id: 'colecis', n: 'Colecistectomia (aberta ou laparoscópica de alto risco)', ab: ['cefa'], alt: ['clinda', 'gent'], note: 'Videolaparoscópica eletiva de baixo risco: profilaxia não é rotina. Alto risco: idade > 60, DM, icterícia, colecistite aguda recente, colangite.' },
    { id: 'colo', n: 'Colorretal', ab: ['cefa', 'metro'], alt: ['clinda', 'gent'], note: 'Alternativa em monoterapia: cefoxitina 2 g. Associar preparo mecânico com antibiótico oral conforme protocolo.' },
    { id: 'apendi', n: 'Apendicectomia (não complicada)', ab: ['cefa', 'metro'], alt: ['clinda', 'gent'], note: 'Alternativa: cefoxitina 2 g. Apendicite complicada (perfuração) é tratamento, não profilaxia.' },
    { id: 'gastro', n: 'Gastroduodenal e bariátrica', ab: ['cefa'], alt: ['clinda', 'gent'], note: 'Indicada em estômago com hipocloridria, obstrução, sangramento ou obesidade mórbida.' },
    { id: 'delg', n: 'Intestino delgado (com ou sem obstrução)', ab: ['cefa', 'metro'], alt: ['clinda', 'gent'], note: 'Sem obstrução: cefazolina isolada pode bastar.' },
    { id: 'cabeca', n: 'Cabeça e pescoço (limpa-contaminada)', ab: ['cefa', 'metro'], alt: ['clinda'], note: 'Cirurgia limpa de cabeça e pescoço: profilaxia não indicada.' },
    { id: 'traumaabd', n: 'Trauma abdominal penetrante', ab: ['cefox'], alt: ['clinda', 'gent'], note: 'Manter por no máximo 24 h. Alternativa: cefazolina + metronidazol.' },
    { id: 'orto', n: 'Ortopedia: fixação de fratura e artroplastia', ab: ['cefa'], alt: ['vanco'], note: 'Fratura exposta é tratamento, seguir protocolo próprio. Torniquete: infundir antes da insuflação.' },
    { id: 'vasc', n: 'Vascular (periférica, com prótese)', ab: ['cefa'], alt: ['vanco'], note: 'Em colonização por MRSA, considerar vancomicina.' },
    { id: 'mama', n: 'Mama e partes moles limpas', ab: ['cefa'], alt: ['clinda'], note: 'Indicada em cirurgias com implante ou mastectomia; não rotineira em biópsia.' },
    { id: 'cesar', n: 'Cesárea', ab: ['cefa'], alt: ['clinda', 'gent'], note: 'Administrar antes da incisão. Trabalho de parto ou bolsa rota: associar azitromicina 500 mg.', extra: ['azit'] },
    { id: 'histe', n: 'Histerectomia', ab: ['cefa'], alt: ['clinda', 'gent'], note: 'Alternativa: cefoxitina 2 g ou ampicilina-sulbactam.' },
    { id: 'uro', n: 'Urológica (abertura do trato, ressecção)', ab: ['cefa'], alt: ['cipro'], note: 'Guiar por urocultura quando disponível.' },
    { id: 'cardio', n: 'Cardíaca e torácica', ab: ['cefur'], alt: ['vanco'], note: 'Cefazolina é alternativa. Duração máxima de 24 a 48 h.', alt2: 'cefa' }
  ];
  const profilaxia = {
    id: 'profilaxia', g: 'cir', title: 'Profilaxia antibiótica cirúrgica',
    desc: 'Selecione a cirurgia: antibiótico de escolha, dose pelo peso, momento e repique intraoperatório',
    kw: 'profilaxia antibiotica cirurgica cefazolina cefoxitina metronidazol clindamicina vancomicina repique intraoperatorio colorretal biliar hernia cesariana',
    disc: 'Baseado nas diretrizes ASHP/IDSA/SIS/SHEA de profilaxia cirúrgica. Ajuste ao perfil de resistência e ao protocolo da CCIH do seu hospital.',
    fields: [F.SEL('cir', 'Tipo de cirurgia', PRO.map(p => [p.id, p.n]), { def: 'hernia' }), F.KG(), F.AGE({ hint: 'Opcional: abaixo de 16 anos usa dose pediátrica' }),
      F.CHK('alerg', 'Alergia grave a betalactâmico (anafilaxia, angioedema, Stevens-Johnson)', null)],
    calc: v => {
      const p = PRO.find(x => x.id === v.cir) || PRO[0], kg = v.kg; if (!(kg > 0)) return { alerts: [{ lvl: 'warn', text: 'Informe o peso do paciente.' }] };
      const ped = isFinite(v.age) && v.age < 16;
      const ids = (v.alerg ? p.alt : p.ab).concat(v.alerg ? [] : (p.extra || []));
      const rows = [], txt = [];
      ids.forEach(id => {
        const a = AB[id]; let dose, unit = 'mg';
        if (ped) dose = Math.min(a.ped * kg, a.pmax);
        else if (a.adkg) dose = Math.min(a.adkg * kg, a.pmax);
        else { dose = a.ad * 1000; if (a.heavy && kg >= a.heavy[0]) dose = a.heavy[1] * 1000; }
        const dtxt = dose >= 1000 ? `${fmt(dose / 1000, 2)} g` : `${fmt(dose, 0)} mg`;
        const basis = ped ? `${a.ped} mg/kg (máx. ${fmt(a.pmax, 0)} mg)` : a.adkg ? `${a.adkg} mg/kg` : (a.heavy && kg >= a.heavy[0] ? `${a.heavy[1]} g (peso ≥ ${a.heavy[0]} kg)` : 'dose fixa do adulto');
        const redo = a.redo ? `a cada ${a.redo} h` : 'não repicar';
        rows.push([a.n, dtxt, redo, `${basis}; infusão ${a.t}`]);
        txt.push(`${a.n} ${dtxt} IV (repique ${redo})`);
      });
      if (v.alerg && p.alt2) { /* sem uso */ }
      const al = [{ lvl: 'info', text: 'Administrar dentro de 60 minutos antes da incisão (vancomicina e quinolonas: 120 minutos). Dose única; manter no máximo 24 h no pós-operatório e, na maioria das cirurgias, não prolongar.' },
        { lvl: 'info', text: 'Repicar também se perda sanguínea maior que 1.500 mL (ou 25 mL/kg em crianças) ou grandes queimados. Atenção ao tempo de cirurgia: repicar quando a duração ultrapassar 2 vezes a meia-vida do fármaco (intervalo na tabela).' }];
      if (v.alerg) al.unshift({ lvl: 'warn', text: 'Esquema alternativo para alergia grave a betalactâmico. Alergia leve ou apenas relato de “rash” não contraindica a cefazolina.' });
      return { main: { label: 'Esquema', value: ids.map(i => AB[i].n).join(' + '), small: true }, sub: p.n,
        table: { head: ['Fármaco', 'Dose IV', 'Repique intraop.', 'Base / infusão'], rows },
        alerts: al, notes: [p.note], text: `Profilaxia antibiótica (${p.n}), ${fmt(kg, 1)} kg: ${txt.join(' + ')}; iniciar até 60 min antes da incisão.` };
    }
  };

  /* ---------- Choque hemorrágico (ATLS) ---------- */
  const CLS = [
    ['I', '< 15%', '< 750 mL', '≤ 100', 'normal', 'normal', '14 a 20', '> 30', 'Ansioso, leve'],
    ['II', '15 a 30%', '750 a 1.500 mL', '100 a 120', 'normal', 'pressão de pulso reduzida', '20 a 30', '20 a 30', 'Ansioso'],
    ['III', '30 a 40%', '1.500 a 2.000 mL', '120 a 140', 'reduzida', 'reduzida', '30 a 40', '5 a 15', 'Confuso, ansioso'],
    ['IV', '> 40%', '> 2.000 mL', '> 140', 'reduzida', 'reduzida', '> 35', 'desprezível', 'Confuso, letárgico']
  ];
  const choque = {
    id: 'choque', g: 'cir', title: 'Choque hemorrágico (ATLS)', desc: 'Classe do choque pela FC e PA, perda estimada e reposição inicial',
    kw: 'trauma atls choque hemorragico classe sangramento reposicao volemica cristaloide volume indice de choque hemorragia',
    disc: 'Classificação do ATLS (10ª ed.). A classe é uma estimativa clínica; priorize controle do sangramento e hemoderivados em vez de cristaloide em excesso.',
    fields: [F.SEG('pop', '', [['a', 'Adulto'], ['c', 'Criança']], { def: 'a' }), F.KG(), F.N('fc', 'Frequência cardíaca', { unit: 'bpm' }), F.N('pas', 'PA sistólica', { unit: 'mmHg' }),
      F.SEL('cls', 'Classe do choque', [['auto', 'Estimar por FC e PA'], ['I', 'Classe I'], ['II', 'Classe II'], ['III', 'Classe III'], ['IV', 'Classe IV']], { def: 'auto' })],
    calc: v => {
      const kg = v.kg; if (!(kg > 0)) return { alerts: [{ lvl: 'warn', text: 'Informe o peso.' }] };
      const ped = v.pop === 'c', vol = (ped ? 80 : 70) * kg;
      let cl = v.cls;
      if (cl === 'auto') {
        if (!isFinite(v.fc) && !isFinite(v.pas)) return { alerts: [{ lvl: 'info', text: 'Informe FC e PA sistólica para estimar a classe, ou escolha a classe.' }] };
        const fc = isFinite(v.fc) ? v.fc : 0, pas = isFinite(v.pas) ? v.pas : 120;
        cl = fc > 140 || pas < 70 ? 'IV' : fc > 120 || pas < 90 ? 'III' : fc > 100 ? 'II' : 'I';
      }
      const row = CLS.find(x => x[0] === cl), pct = { I: [0, 0.15], II: [0.15, 0.3], III: [0.3, 0.4], IV: [0.4, 0.6] }[cl];
      const si = isFinite(v.fc) && v.pas > 0 ? v.fc / v.pas : NaN;
      const bol = ped ? 20 * kg : 1000;
      const rows = [['Volemia estimada', `${fmt(vol, 0)} mL (${ped ? 80 : 70} mL/kg)`], ['Perda estimada', `${row[1]} (${fmt(vol * pct[0], 0)} a ${fmt(vol * pct[1], 0)} mL)`],
        ['Parâmetros da classe', `FC ${row[3]} bpm; PAS ${row[4]}; FR ${row[6]}; diurese ${row[7] === 'desprezível' ? 'desprezível' : row[7] + ' mL/h'}; ${row[8].toLowerCase()}`]];
      if (isFinite(si)) rows.push(['Índice de choque (FC/PAS)', `${fmt(si, 2)}${si >= 0.9 ? ' (anormal, ≥ 0,9)' : ' (normal, < 0,9)'}`]);
      rows.push([`Bolus inicial de cristaloide aquecido`, ped ? `${fmt(bol, 0)} mL (20 mL/kg)` : '1.000 mL (adulto), reavaliar']);
      const al = [];
      if (cl === 'I') al.push({ lvl: 'info', text: 'Reposição com cristaloide geralmente suficiente. Reavaliar resposta e procurar fonte de sangramento.' });
      if (cl === 'II') al.push({ lvl: 'warn', text: 'Cristaloide aquecido; ter sangue tipado e prova cruzada disponíveis. Reavaliar a resposta após o bolus.' });
      if (cl === 'III' || cl === 'IV') al.push({ lvl: 'crit', text: 'Classes III e IV: iniciar hemoderivados precocemente (concentrado de hemácias, plasma e plaquetas em proporção equilibrada). Avaliar protocolo de transfusão maciça. Controle cirúrgico/endovascular do sangramento.' });
      al.push({ lvl: 'info', text: 'Limitar cristaloide (cerca de 1 L no adulto). Ressuscitação hipotensiva (PAS 80 a 90 mmHg) até o controle do sangramento, exceto no TCE e na lesão medular. Ácido tranexâmico 1 g IV em 10 min (idealmente em até 3 h), depois 1 g em 8 h. Prevenir hipotermia, acidose e coagulopatia.' });
      return { main: { label: 'Classe estimada', value: cl }, sub: `Perda ${row[1]} da volemia`, rows, alerts: al,
        text: `Choque hemorrágico classe ${cl} (perda ${row[1]}, ~${fmt(vol * pct[0], 0)} a ${fmt(vol * pct[1], 0)} mL em ${fmt(kg, 1)} kg).${isFinite(si) ? ' Índice de choque ' + fmt(si, 2) + '.' : ''}` };
    }
  };

  /* ---------- Transfusão maciça ---------- */
  const tmt = {
    id: 'tmt', g: 'cir', title: 'Transfusão maciça (trauma)', desc: 'Gatilhos de ativação (escore ABC), proporção 1:1:1 e metas laboratoriais',
    kw: 'transfusao maciça tmt trauma ptm sangue hemacias plasma plaquetas 1:1:1 abc score fibrinogenio acido tranexamico calcio hemorragia',
    disc: 'Ative o protocolo de transfusão maciça do seu hospital; os pacotes e a composição variam entre serviços.',
    fields: v => [F.SEC('Escore ABC (trauma): 2 ou mais positivos ativam o protocolo'), F.CHK('p', 'Mecanismo penetrante', 1), F.CHK('f', 'FAST positivo', 1), F.CHK('pa', 'PA sistólica ≤ 90 mmHg', 1), F.CHK('fc', 'Frequência cardíaca ≥ 120 bpm', 1),
      F.SEC('Gatilhos clínicos'), F.CHK('g1', 'Previsão ou uso de ≥ 4 concentrados de hemácias em 1 h com sangramento ativo', null), F.CHK('g2', 'Perda de > 50% da volemia em 3 h', null), F.CHK('g3', 'Sangramento > 150 mL/min', null),
      F.SEC('Planejamento'), F.KG({ hint: 'Opcional, para volume de plasma' }), F.SEL('un', 'Concentrados de hemácias na rodada', [['4', '4 unidades'], ['6', '6 unidades'], ['8', '8 unidades'], ['10', '10 unidades']], { def: '6' })],
    calc: v => {
      const abc = ['p', 'f', 'pa', 'fc'].filter(k => v[k]).length, ger = !!(v.g1 || v.g2 || v.g3), un = Number(v.un), kg = v.kg;
      const ativ = abc >= 2 || ger;
      const rows = [['Escore ABC', `${abc} de 4${abc >= 2 ? ' (ativar)' : ''}`], ['Proporção 1:1:1', `${un} CH : ${un} PFC (unidades) : ${Math.max(1, Math.round(un / 6))} pool de plaquetas ou ${Math.max(1, Math.round(un / 6))} aférese`]];
      if (kg > 0) rows.push(['Volume de plasma (15 mL/kg)', `${fmt(15 * kg, 0)} mL (${fmt(Math.ceil(15 * kg / 250), 0)} ${Math.ceil(15 * kg / 250) > 1 ? 'bolsas' : 'bolsa'} de ~250 mL)`]);
      rows.push(['Crioprecipitado', 'Se fibrinogênio < 150 a 200 mg/dL: 10 unidades (ou concentrado de fibrinogênio 3 a 4 g)'], ['Ácido tranexâmico', '1 g IV em 10 min nas primeiras 3 h; depois 1 g em 8 h'],
        ['Cálcio', 'Gluconato de cálcio 10%, 10 mL (1 g) a cada 4 CH ou conforme Ca iônico < 1,1 mmol/L'],
        ['Metas', 'Hb 7 a 9 g/dL; plaquetas > 50.000 (> 100.000 se TCE); INR < 1,5; fibrinogênio > 150 a 200; Ca iônico > 1,1; pH > 7,2; temperatura > 35 °C; lactato em queda']);
      return { main: { label: 'Ativar protocolo', value: ativ ? 'SIM' : 'Não' }, sub: ativ ? 'Critérios de transfusão maciça atingidos' : 'Reavaliar seriadamente', rows,
        alerts: [ativ ? { lvl: 'crit', text: 'Ativar o protocolo de transfusão maciça, solicitar rodadas sequenciais de pacotes balanceados e controlar o sangramento (cirurgia/angioembolização). Aquecer os hemoderivados e monitorar gasometria, cálcio e coagulação a cada rodada.' } : { lvl: 'info', text: 'Sem gatilho no momento. Tipar e cruzar, manter acessos calibrosos e reavaliar.' }],
        text: `Transfusão maciça: ABC ${abc}/4${ger ? ' + gatilho clínico' : ''}; ${ativ ? 'ATIVAR protocolo' : 'sem ativação'}. Proporção 1:1:1 (${un} CH : ${un} PFC : ${Math.max(1, Math.round(un / 6))} pool de plaquetas), ácido tranexâmico 1 g + 1 g.` };
    }
  };

  /* ---------- Revised Trauma Score ---------- */
  const rts = {
    id: 'rts', g: 'cir', title: 'Escore de Trauma Revisado (RTS)', desc: 'Triagem (0 a 12) e RTS ponderado a partir de Glasgow, PA sistólica e FR',
    kw: 'trauma rts revised trauma score triagem gravidade glasgow pressao frequencia respiratoria',
    fields: [F.N('gcs', 'Escala de Coma de Glasgow', { ph: '3 a 15' }), F.N('pas', 'PA sistólica', { unit: 'mmHg' }), F.N('fr', 'Frequência respiratória', { unit: 'irpm' })],
    calc: v => {
      if (![v.gcs, v.pas, v.fr].every(isFinite)) return null;
      const g = v.gcs >= 13 ? 4 : v.gcs >= 9 ? 3 : v.gcs >= 6 ? 2 : v.gcs >= 4 ? 1 : 0;
      const p = v.pas > 89 ? 4 : v.pas >= 76 ? 3 : v.pas >= 50 ? 2 : v.pas >= 1 ? 1 : 0;
      const r = v.fr >= 10 && v.fr <= 29 ? 4 : v.fr > 29 ? 3 : v.fr >= 6 ? 2 : v.fr >= 1 ? 1 : 0;
      const tri = g + p + r, w = 0.9368 * g + 0.7326 * p + 0.2908 * r;
      return { main: { label: 'RTS (triagem)', value: String(tri), unit: 'de 12' }, sub: tri < 12 ? 'Encaminhar a centro de trauma' : 'Sem critério fisiológico de gravidade',
        rows: [['Pontos: Glasgow / PAS / FR', `${g} / ${p} / ${r}`], ['RTS ponderado (0 a 7,84)', fmt(w, 2)]],
        alerts: tri <= 10 ? [{ lvl: 'crit', text: 'RTS ≤ 10 ou triagem < 12: paciente crítico, priorizar atendimento e transferência para centro de trauma.' }] : tri < 12 ? [{ lvl: 'warn', text: 'RTS < 12 sugere necessidade de centro de trauma.' }] : [],
        text: `RTS: Glasgow ${v.gcs} (${g}), PAS ${v.pas} (${p}), FR ${v.fr} (${r}). Triagem ${tri}/12; ponderado ${fmt(w, 2)}.` };
    }
  };

  /* ---------- Kits de prescrição pós-operatória ---------- */
  const posop = {
    id: 'posop', g: 'cir', title: 'Prescrição pós-operatória (kits)', desc: 'Modelos por porte cirúrgico: dieta, hidratação, analgesia em degraus, antieméticos e profilaxias',
    kw: 'pos operatorio prescricao kit analgesia dipirona cetoprofeno tramadol morfina ondansetrona bromoprida hidratacao dieta enoxaparina cirurgia porte',
    disc: 'Modelo para adulto sem contraindicações. Adapte a alergias, função renal/hepática, comorbidades e protocolo ERAS do serviço. Confira cada prescrição antes de assinar.',
    fields: [F.SEG('porte', 'Porte cirúrgico', [['p', 'Pequeno'], ['m', 'Médio'], ['g', 'Grande']], { def: 'm' }), F.KG(), F.SEL('anal', 'Último degrau de analgesia', [['1', 'Degrau 1: dipirona'], ['2', 'Degrau 2: + cetoprofeno'], ['3t', 'Degrau 3: + tramadol'], ['3m', 'Degrau 3: + morfina']], { def: '2' }),
      F.CHK('dipalerg', 'Alergia/intolerância a dipirona (usar paracetamol)', null), F.CHK('ains', 'Contraindicação a AINE (DRC, úlcera, sangramento, anticoagulado)', null), F.CHK('dm', 'Diabetes (glicemia capilar e correção)', null), F.CHK('clr', 'Clearance de creatinina < 30 mL/min', null)],
    calc: v => {
      const kg = v.kg > 0 ? v.kg : 70, p = v.porte, items = [], al = [];
      const vol = Math.min(Math.round(30 * kg / 100) * 100, 3000), mlh = Math.round(vol / 24);
      const k = Math.round(0.75 * kg);
      const dieta = p === 'p' ? 'Dieta livre após recuperação anestésica, quando acordado, com náuseas ausentes (4 a 6 h)' : p === 'm' ? 'Jejum até retorno do trânsito/ruídos; iniciar dieta líquida e progredir conforme aceitação (alvo 24 h)' : 'Jejum; iniciar dieta precoce (líquida) em 24 h se sem íleo, náuseas ou distensão, conforme cirurgia; avaliar nutrição enteral/parenteral se jejum prolongado';
      items.push(['Dieta', dieta], ['Hidratação basal', `SG 5% ${fmt(vol / 2, 0)} mL + SF 0,9% ${fmt(vol / 2, 0)} mL (${fmt(vol, 0)} mL em 24 h = ${fmt(mlh, 0)} mL/h), com KCl 19,1% ${fmt(Math.round(k / 2.56), 0)} mL (~${k} mEq de K⁺) por dia, se diurese presente e K⁺ normal. Suspender quando a dieta oral for adequada`]);
      const dip = v.dipalerg ? 'Paracetamol 750 mg a 1 g VO/IV, 6/6 h' : 'Dipirona 1 g IV, 6/6 h (programada por 48 a 72 h)';
      items.push(['Analgesia: degrau 1', dip]);
      if (v.anal !== '1') items.push(['Analgesia: degrau 2', v.ains ? 'AINE contraindicado: pular para o degrau 3 se dor moderada a intensa' : 'Cetoprofeno 100 mg IV, 12/12 h por até 48 h (ou 8/8 h), diluído em 100 mL de SF 0,9%']);
      if (v.anal === '3t') items.push(['Analgesia: degrau 3', 'Tramadol 50 a 100 mg IV diluído, lento, 6/6 h se dor intensa (SOS)']);
      if (v.anal === '3m') items.push(['Analgesia: degrau 3', `Morfina 2 a 4 mg IV, a cada 4 h se dor intensa (SOS)${v.clr ? '; reduzir a dose e o intervalo (insuficiência renal)' : ''}`]);
      items.push(['Antieméticos (SOS)', 'Bromoprida 10 mg IV, 8/8 h, se náuseas ou vômitos' + (v.anal === '3t' ? '' : '; Ondansetrona 4 mg IV, 8/8 h, se persistir')]);
      if (v.anal === '3t') al.push({ lvl: 'warn', text: 'Tramadol + ondansetrona: evitar a associação (risco de síndrome serotoninérgica e redução do efeito antiemético). Por isso o kit usa apenas bromoprida com tramadol. Se precisar de ondansetrona, troque o degrau 3 para morfina.' });
      if (v.clr) al.push({ lvl: 'warn', text: 'Clearance < 30 mL/min: evite cetoprofeno e ajuste morfina/enoxaparina (usar heparina não fracionada 5.000 U SC 8/8 h).' });
      if (p !== 'p') { items.push(['Profilaxia de TEV', v.clr ? 'Heparina não fracionada 5.000 U SC, 8/8 h' : 'Enoxaparina 40 mg SC, 1x/dia (iniciar 6 a 12 h após a cirurgia)'], ['Protetor gástrico', 'Pantoprazol 40 mg IV, 1x/dia (enquanto em jejum)']); }
      if (p === 'p') items.push(['Profilaxia de TEV', 'Deambulação precoce; farmacológica conforme risco individual (escore de Caprini)']);
      if (v.dm) items.push(['Glicemia', 'Glicemia capilar de 6/6 h com insulina regular de correção conforme esquema do hospital']);
      items.push(['Cuidados', p === 'p' ? 'Sinais vitais 6/6 h; curativo; deambulação precoce; retornar se febre, sangramento ou dor intensa' : 'Sinais vitais 4/4 h nas primeiras 24 h; cabeceira elevada 30°; deambulação precoce e fisioterapia respiratória; controle de diurese; curativo e drenos com débito; orientar sinais de alarme']);
      const txt = 'Prescrição pós-operatória (' + { p: 'pequeno', m: 'médio', g: 'grande' }[p] + ' porte, ' + fmt(kg, 0) + ' kg): ' + items.map(i => i[0] + ': ' + i[1]).join('. ') + '.';
      if (!(v.kg > 0)) al.push({ lvl: 'info', text: 'Peso não informado: volumes calculados para 70 kg.' });
      const P = D.S.patient, ag = u.num(P.age), ay = isFinite(ag) ? (P.ageU === 'm' ? ag / 12 : P.ageU === 'd' ? ag / 365 : ag) : NaN;
      if (ay < 18 || (v.kg > 0 && v.kg < 35)) al.unshift({ lvl: 'crit', text: 'Kit montado para adulto. Em criança, a hidratação deve seguir o Holliday-Segar com solução isotônica (ferramenta Soro de manutenção, modo Criança) e as doses dos medicamentos devem ser calculadas por peso.' });
      al.push({ lvl: 'info', text: 'Outros esquemas de soro (volume reduzido em idoso, ICC ou DRC, sem potássio, só SG com NaCl) estão na ferramenta Soro de manutenção (dieta zero).' });
      return { main: { label: 'Kit', value: { p: 'Pequeno porte', m: 'Médio porte', g: 'Grande porte' }[p], small: true }, rows: items, alerts: al, text: txt };
    }
  };

  D.add(toquio, ranson, bisap, profilaxia, choque, tmt, rts, posop);
})();
