/* Escores clínicos */
(function () {
  'use strict';
  const D = window.DRB, u = D.u, F = D.f, fmt = u.fmt;
  const A = (id, label, opts, o) => Object.assign({ id, label, opts }, o);
  const C = (id, label, pts, short) => ({ id, label, chk: pts, short });
  const SEC = sec => ({ sec });

  /* ---------- NIHSS ---------- */
  const nihss = F.score({
    id: 'nihss', title: 'NIHSS', max: 42, desc: 'Escala de AVC do NIH com texto pronto para o prontuário',
    kw: 'avc stroke neurologico trombolise nih deficit', items: [
      A('a1a', '1a. Nível de consciência', [[0, 'alerta'], [1, 'sonolento'], [2, 'estuporoso'], [3, 'coma']], { short: 'Consciência' }),
      A('a1b', '1b. Perguntas (mês e idade)', [[0, 'ambas corretas'], [1, 'uma correta'], [2, 'nenhuma correta']], { short: 'Perguntas' }),
      A('a1c', '1c. Comandos (abrir/fechar olhos, apertar a mão)', [[0, 'ambos corretos'], [1, 'um correto'], [2, 'nenhum correto']], { short: 'Comandos' }),
      A('a2', '2. Olhar conjugado', [[0, 'normal'], [1, 'paralisia parcial'], [2, 'desvio forçado']], { short: 'Olhar' }),
      A('a3', '3. Campo visual', [[0, 'normal'], [1, 'hemianopsia parcial'], [2, 'hemianopsia completa'], [3, 'cegueira bilateral/cortical']], { short: 'Campo visual' }),
      A('a4', '4. Paresia facial', [[0, 'normal'], [1, 'leve'], [2, 'parcial'], [3, 'completa']], { short: 'Face' }),
      A('a5a', '5a. Motor: braço esquerdo', [[0, 'sem queda (10 s)'], [1, 'queda antes de 10 s'], [2, 'algum esforço contra a gravidade'], [3, 'nenhum esforço contra a gravidade'], [4, 'sem movimento']], { short: 'Braço E' }),
      A('a5b', '5b. Motor: braço direito', [[0, 'sem queda (10 s)'], [1, 'queda antes de 10 s'], [2, 'algum esforço contra a gravidade'], [3, 'nenhum esforço contra a gravidade'], [4, 'sem movimento']], { short: 'Braço D' }),
      A('a6a', '6a. Motor: perna esquerda', [[0, 'sem queda (5 s)'], [1, 'queda antes de 5 s'], [2, 'algum esforço contra a gravidade'], [3, 'nenhum esforço contra a gravidade'], [4, 'sem movimento']], { short: 'Perna E' }),
      A('a6b', '6b. Motor: perna direita', [[0, 'sem queda (5 s)'], [1, 'queda antes de 5 s'], [2, 'algum esforço contra a gravidade'], [3, 'nenhum esforço contra a gravidade'], [4, 'sem movimento']], { short: 'Perna D' }),
      A('a7', '7. Ataxia de membros', [[0, 'ausente'], [1, 'em um membro'], [2, 'em dois membros']], { short: 'Ataxia' }),
      A('a8', '8. Sensibilidade', [[0, 'normal'], [1, 'perda leve a moderada'], [2, 'perda grave ou total']], { short: 'Sensibilidade' }),
      A('a9', '9. Linguagem', [[0, 'normal'], [1, 'afasia leve a moderada'], [2, 'afasia grave'], [3, 'mudo/afasia global']], { short: 'Linguagem' }),
      A('a10', '10. Disartria', [[0, 'normal'], [1, 'leve a moderada'], [2, 'grave/anártrico']], { short: 'Disartria' }),
      A('a11', '11. Extinção/negligência', [[0, 'ausente'], [1, 'em uma modalidade'], [2, 'profunda ou em mais de uma modalidade']], { short: 'Negligência' })
    ],
    interp: t => {
      const c = t === 0 ? 'Sem déficit' : t <= 4 ? 'AVC leve' : t <= 15 ? 'AVC moderado' : t <= 20 ? 'AVC moderado a grave' : 'AVC grave';
      return { title: c, text: 'O NIHSS isolado não define a indicação de trombólise: déficits incapacitantes (afasia, hemianopsia, negligência) justificam tratamento mesmo com pontuação baixa.' };
    }
  });

  /* ---------- Glasgow ---------- */
  const gcs = {
    id: 'gcs', g: 'esc', title: 'Escala de coma de Glasgow', desc: 'Adulto e pediátrico (< 2 anos), com reatividade pupilar (GCS-P)',
    kw: 'glasgow gcs coma consciencia tce neurologico pupila',
    fields: v => {
      const ped = v.ped === '1';
      return [F.SEG('ped', '', [['0', 'Adulto / criança ≥ 2 anos'], ['1', 'Lactente < 2 anos']], { def: '0' }),
        F.SEL('o', 'Abertura ocular', [['4', '4: espontânea'], ['3', '3: ao estímulo verbal'], ['2', '2: à dor'], ['1', '1: nenhuma']], { def: '4' }),
        F.SEL('v', 'Resposta verbal', ped
          ? [['5', '5: sorri, orienta-se ao som, segue objetos'], ['4', '4: choro consolável'], ['3', '3: choro persistente, irritado'], ['2', '2: geme, inquieto'], ['1', '1: nenhuma']]
          : [['5', '5: orientado'], ['4', '4: confuso'], ['3', '3: palavras inapropriadas'], ['2', '2: sons incompreensíveis'], ['1', '1: nenhuma (ou 1T: tubo orotraqueal)']], { def: '5' }),
        F.SEL('m', 'Resposta motora', [['6', ped ? '6: movimentos espontâneos normais' : '6: obedece comandos'], ['5', '5: localiza a dor'], ['4', '4: retirada inespecífica'], ['3', '3: flexão anormal (decorticação)'], ['2', '2: extensão (descerebração)'], ['1', '1: nenhuma']], { def: '6' }),
        F.SEL('pup', 'Reatividade pupilar (GCS-P)', [['0', 'Ambas reagem à luz'], ['1', 'Uma pupila não reage'], ['2', 'Nenhuma pupila reage']], { def: '0' })];
    },
    calc: v => {
      const o = +v.o, vb = +v.v, m = +v.m, pp = +v.pup, t = o + vb + m;
      const c = t >= 13 ? 'Leve' : t >= 9 ? 'Moderado' : 'Grave';
      const al = [];
      if (t <= 8) al.push({ lvl: 'crit', text: 'Glasgow ≤ 8: considerar via aérea definitiva conforme o quadro clínico.' });
      return { main: { label: 'Glasgow', value: String(t), unit: 'de 15' }, sub: `O${o} V${vb} M${m}: trauma craniano/alteração de consciência ${c.toLowerCase()}`,
        rows: [['GCS-P (Glasgow − reatividade pupilar)', String(t - pp)]], alerts: al,
        text: `Glasgow ${t} (O${o} V${vb} M${m}); GCS-P ${t - pp}.` };
    }
  };

  /* ---------- Wells TEP ---------- */
  const wellsTep = F.score({
    id: 'wellstep', title: 'Wells: TEP', dec: 1, max: 12.5, desc: 'Probabilidade pré-teste de embolia pulmonar',
    kw: 'tep embolia pulmonar trombose dimero angiotc wells', items: [
      C('a', 'Sinais clínicos de TVP (edema, dor à palpação venosa)', 3, 'Sinais de TVP'),
      C('b', 'TEP é o diagnóstico mais provável ou igualmente provável', 3, 'TEP mais provável'),
      C('c', 'Frequência cardíaca > 100 bpm', 1.5, 'FC > 100'),
      C('d', 'Imobilização ≥ 3 dias ou cirurgia nas últimas 4 semanas', 1.5, 'Imobilização/cirurgia'),
      C('e', 'TVP ou TEP prévios', 1.5, 'TEV prévio'),
      C('f', 'Hemoptise', 1, 'Hemoptise'),
      C('g', 'Câncer ativo (tratamento nos últimos 6 meses ou paliativo)', 1, 'Câncer')
    ],
    interp: t => ({ title: t > 4 ? 'TEP provável' : 'TEP improvável',
      rows: [['Três níveis', t > 6 ? 'Alta (> 6)' : t >= 2 ? 'Moderada (2 a 6)' : 'Baixa (< 2)']],
      text: t > 4 ? 'Provável (> 4): solicitar angiotomografia de tórax; considerar anticoagulação empírica enquanto aguarda se não houver contraindicação.' : 'Improvável (≤ 4): dosar D-dímero; se negativo (ajustado à idade), exclui TEP.' })
  });

  /* ---------- Wells TVP ---------- */
  const wellsTvp = F.score({
    id: 'wellstvp', title: 'Wells: TVP', max: 9, desc: 'Probabilidade pré-teste de trombose venosa profunda',
    kw: 'tvp trombose venosa profunda dimero doppler wells perna', items: [
      C('a', 'Câncer ativo', 1, 'Câncer ativo'),
      C('b', 'Paralisia, paresia ou imobilização recente de membro inferior', 1, 'Paresia/imobilização'),
      C('c', 'Acamado ≥ 3 dias ou cirurgia maior nas últimas 12 semanas', 1, 'Acamado/cirurgia'),
      C('d', 'Dor à palpação ao longo do sistema venoso profundo', 1, 'Dor venosa profunda'),
      C('e', 'Edema de todo o membro inferior', 1, 'Edema do membro todo'),
      C('f', 'Panturrilha > 3 cm maior que a contralateral', 1, 'Panturrilha > 3 cm'),
      C('g', 'Edema com cacifo restrito ao membro sintomático', 1, 'Edema com cacifo'),
      C('h', 'Veias colaterais superficiais (não varicosas)', 1, 'Colaterais superficiais'),
      C('i', 'TVP prévia documentada', 1, 'TVP prévia'),
      C('j', 'Diagnóstico alternativo tão ou mais provável que TVP', -2, 'Diagnóstico alternativo')
    ],
    interp: t => ({ title: t >= 2 ? 'TVP provável' : 'TVP improvável',
      rows: [['Três níveis', t >= 3 ? 'Alta (≥ 3)' : t >= 1 ? 'Moderada (1 a 2)' : 'Baixa (≤ 0)']],
      text: t >= 2 ? 'Provável (≥ 2): ultrassonografia com Doppler; considerar anticoagulação empírica se houver demora.' : 'Improvável (< 2): dosar D-dímero; se negativo, exclui TVP.' })
  });

  /* ---------- PERC ---------- */
  const perc = {
    id: 'perc', g: 'esc', title: 'PERC: regra de exclusão de TEP', desc: 'Marque os critérios presentes. Aplicável apenas se a probabilidade clínica for baixa (< 15%)',
    kw: 'tep embolia pulmonar perc exclusao dimero baixo risco',
    fields: [F.CHK('a', 'Idade ≥ 50 anos'), F.CHK('b', 'Frequência cardíaca ≥ 100 bpm'), F.CHK('c', 'SpO₂ < 95% em ar ambiente'), F.CHK('d', 'Hemoptise'),
      F.CHK('e', 'Uso de estrogênio'), F.CHK('f', 'TVP ou TEP prévios'), F.CHK('g', 'Edema unilateral de perna'), F.CHK('h', 'Cirurgia ou trauma com anestesia geral nas últimas 4 semanas')],
    calc: v => {
      const n = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].filter(k => v[k]).length;
      return n === 0 ? { main: { label: 'PERC', value: 'Negativo', unit: '' }, alerts: [{ lvl: 'ok', text: 'Nenhum critério presente: TEP pode ser excluído sem D-dímero (se a probabilidade pré-teste for baixa).' }], text: 'PERC negativo (nenhum critério presente).' }
        : { main: { label: 'PERC', value: 'Positivo', unit: `${n} critério(s)` }, alerts: [{ lvl: 'warn', text: 'Não é possível excluir TEP pelo PERC. Prosseguir com D-dímero ou imagem conforme a probabilidade clínica (Wells).' }], text: `PERC positivo (${n} critério(s) presente(s)).` };
    }
  };

  /* ---------- HEART ---------- */
  const heart = F.score({
    id: 'heart', title: 'HEART score', max: 10, desc: 'Estratificação de risco na dor torácica',
    kw: 'dor toracica sca iam troponina sindrome coronariana heart', items: [
      A('h', 'História', [[0, 'pouco suspeita'], [1, 'moderadamente suspeita'], [2, 'altamente suspeita']], { short: 'História' }),
      A('e', 'ECG', [[0, 'normal'], [1, 'alteração inespecífica de repolarização, BRE, marca-passo'], [2, 'desvio significativo de ST']], { short: 'ECG' }),
      A('a', 'Idade', [[0, '< 45 anos'], [1, '45 a 64 anos'], [2, '≥ 65 anos']], { short: 'Idade' }),
      A('r', 'Fatores de risco (HAS, DM, dislipidemia, tabagismo, obesidade, história familiar)', [[0, 'nenhum'], [1, '1 a 2 fatores'], [2, '≥ 3 fatores ou doença aterosclerótica conhecida']], { short: 'Fatores de risco' }),
      A('t', 'Troponina', [[0, '≤ limite normal'], [1, '1 a 3 × o limite'], [2, '> 3 × o limite']], { short: 'Troponina' })
    ],
    interp: t => t <= 3 ? { title: 'Baixo risco', text: 'Risco de evento cardíaco maior em 6 semanas de cerca de 0,9 a 1,7%. Considerar alta com seguimento ambulatorial.' }
      : t <= 6 ? { title: 'Risco intermediário', text: 'Risco de cerca de 12 a 17%. Observação, troponina seriada e investigação adicional.', lvl: 'warn' }
        : { title: 'Alto risco', text: 'Risco de cerca de 50 a 65%. Internação e estratégia invasiva precoce conforme protocolo.', lvl: 'crit' }
  });

  /* ---------- CHA2DS2-VASc ---------- */
  const cha = F.score({
    id: 'cha', title: 'CHA₂DS₂-VASc', max: 9, desc: 'Risco embólico na fibrilação atrial',
    kw: 'fibrilacao atrial fa anticoagulacao avc risco cha2ds2vasc embolico', pre: [F.AGE(), F.SEX()],
    items: [C('c', 'Insuficiência cardíaca ou disfunção ventricular', 1, 'ICC'), C('h', 'Hipertensão arterial', 1, 'HAS'), C('d', 'Diabetes mellitus', 1, 'DM'),
      C('s', 'AVC, AIT ou tromboembolismo prévio', 2, 'AVC/AIT/TE'), C('v', 'Doença vascular (IAM prévio, DAP, placa aórtica)', 1, 'Doença vascular')],
    extra: v => {
      const pts = [], parts = []; let s = 0;
      if (v.age >= 75) { s += 2; parts.push('Idade ≥ 75'); } else if (v.age >= 65) { s += 1; parts.push('Idade 65 a 74'); }
      if (v.sex === 'F') { s += 1; parts.push('Sexo feminino'); }
      return { pts: s, parts };
    },
    interp: (t, v) => {
      const f = v.sex === 'F', lim = f ? 1 : 0;
      const need = !isFinite(v.age) || !v.sex ? 'Informe idade e sexo para pontuar esses itens. ' : '';
      const sc = f ? t - 1 : t;
      const rec = sc === 0 ? 'Baixo risco: anticoagulação não indicada.' : sc === 1 ? 'Risco intermediário: anticoagulação oral deve ser considerada.' : 'Alto risco: anticoagulação oral recomendada.';
      return { title: sc === 0 ? 'Baixo risco' : sc === 1 ? 'Risco intermediário' : 'Alto risco', text: need + rec + ' (Pontuação sem o ponto do sexo feminino: ' + sc + '.) Avalie também o risco de sangramento (HAS-BLED).', lvl: sc >= 2 ? 'warn' : 'info' };
    }
  });

  /* ---------- HAS-BLED ---------- */
  const hasbled = F.score({
    id: 'hasbled', title: 'HAS-BLED', max: 9, desc: 'Risco de sangramento em pacientes anticoagulados',
    kw: 'sangramento anticoagulacao fibrilacao atrial hemorragia risco hasbled',
    items: [C('h', 'Hipertensão não controlada (PAS > 160 mmHg)', 1, 'HAS'), C('a1', 'Disfunção renal (diálise, transplante ou creatinina > 2,26 mg/dL)', 1, 'Renal'),
      C('a2', 'Disfunção hepática (cirrose, bilirrubina > 2× e AST/ALT > 3× o normal)', 1, 'Hepática'), C('s', 'AVC prévio', 1, 'AVC'),
      C('b', 'Sangramento prévio ou predisposição (anemia, trombocitopenia)', 1, 'Sangramento'), C('l', 'INR lábil (TTR < 60%)', 1, 'INR lábil'),
      C('e', 'Idade > 65 anos', 1, 'Idade'), C('d1', 'Uso de antiagregante ou AINE', 1, 'Drogas'), C('d2', 'Etilismo (≥ 8 doses/semana)', 1, 'Álcool')],
    interp: t => ({ title: t >= 3 ? 'Alto risco de sangramento' : 'Risco baixo a moderado', lvl: t >= 3 ? 'warn' : 'info',
      text: 'Pontuação ≥ 3 indica atenção e correção dos fatores modificáveis; não contraindica por si só a anticoagulação.' })
  });

  /* ---------- CURB-65 ---------- */
  const curb = F.score({
    id: 'curb', title: 'CURB-65', max: 5, desc: 'Gravidade da pneumonia comunitária e local de tratamento',
    kw: 'pneumonia pac gravidade internacao curb65 curb',
    items: [C('c', 'Confusão mental nova', 1, 'Confusão'), C('u', 'Ureia > 50 mg/dL', 1, 'Ureia'), C('r', 'Frequência respiratória ≥ 30 irpm', 1, 'FR ≥ 30'),
      C('b', 'PAS < 90 ou PAD ≤ 60 mmHg', 1, 'Hipotensão'), C('a', 'Idade ≥ 65 anos', 1, 'Idade')],
    interp: t => {
      const mort = [0.6, 2.7, 6.8, 14, 27.8, 27.8][t];
      return { title: t <= 1 ? 'Baixo risco' : t === 2 ? 'Risco intermediário' : 'Alto risco', lvl: t >= 3 ? 'crit' : t === 2 ? 'warn' : 'info',
        rows: [['Mortalidade em 30 dias', `~${fmt(mort, 1)}%`]],
        text: t <= 1 ? 'Considerar tratamento ambulatorial.' : t === 2 ? 'Considerar internação.' : 'Pneumonia grave: internação, avaliar UTI se ≥ 4 ou outros critérios de gravidade.' };
    }
  });

  /* ---------- qSOFA ---------- */
  const qsofa = F.score({
    id: 'qsofa', title: 'qSOFA', max: 3, desc: 'Triagem rápida de risco de desfecho grave na suspeita de sepse',
    kw: 'sepse choque septico triagem qsofa infeccao',
    items: [C('r', 'Frequência respiratória ≥ 22 irpm', 1, 'FR ≥ 22'), C('m', 'Alteração do nível de consciência (Glasgow < 15)', 1, 'Alteração mental'), C('p', 'Pressão arterial sistólica ≤ 100 mmHg', 1, 'PAS ≤ 100')],
    interp: t => ({ title: t >= 2 ? 'Alto risco' : 'Baixo risco', lvl: t >= 2 ? 'crit' : 'info',
      text: t >= 2 ? 'qSOFA ≥ 2: risco aumentado de mortalidade. Avaliar disfunção orgânica (SOFA), lactato, culturas e iniciar antibiótico e volume conforme protocolo de sepse.' : 'qSOFA < 2 não exclui sepse. Manter a suspeita clínica e reavaliar.' })
  });

  /* ---------- SIRS ---------- */
  const sirs = F.score({
    id: 'sirs', title: 'SIRS', max: 4, desc: 'Critérios da síndrome da resposta inflamatória sistêmica',
    kw: 'sirs sepse inflamatoria resposta sistemica infeccao',
    items: [C('t', 'Temperatura > 38 °C ou < 36 °C', 1, 'Temperatura'), C('f', 'Frequência cardíaca > 90 bpm', 1, 'FC > 90'),
      C('r', 'FR > 20 irpm ou PaCO₂ < 32 mmHg', 1, 'FR > 20'), C('l', 'Leucócitos > 12.000 ou < 4.000/mm³ ou > 10% de bastões', 1, 'Leucograma')],
    interp: t => ({ title: t >= 2 ? 'SIRS presente (≥ 2 critérios)' : 'SIRS ausente', text: 'Os critérios de SIRS são inespecíficos. Na suspeita de sepse, avalie disfunção orgânica pelo SOFA.' })
  });

  /* ---------- SOFA ---------- */
  const sofa = F.score({
    id: 'sofa', title: 'SOFA', max: 24, desc: 'Disfunção orgânica sequencial. Aumento ≥ 2 pontos define sepse na infecção',
    kw: 'sepse sofa disfuncao organica uti choque septico',
    items: [
      A('r', 'Respiratório (PaO₂/FiO₂)', [[0, '≥ 400'], [1, '< 400'], [2, '< 300'], [3, '< 200 com suporte ventilatório'], [4, '< 100 com suporte ventilatório']], { short: 'Respiratório' }),
      A('c', 'Coagulação (plaquetas, ×10³/mm³)', [[0, '≥ 150'], [1, '< 150'], [2, '< 100'], [3, '< 50'], [4, '< 20']], { short: 'Coagulação' }),
      A('f', 'Fígado (bilirrubina, mg/dL)', [[0, '< 1,2'], [1, '1,2 a 1,9'], [2, '2,0 a 5,9'], [3, '6,0 a 11,9'], [4, '≥ 12']], { short: 'Fígado' }),
      A('v', 'Cardiovascular', [[0, 'PAM ≥ 70 mmHg'], [1, 'PAM < 70 mmHg'], [2, 'dopamina ≤ 5 ou dobutamina'], [3, 'dopamina > 5, adrenalina ≤ 0,1 ou noradrenalina ≤ 0,1'], [4, 'dopamina > 15, adrenalina > 0,1 ou noradrenalina > 0,1']], { short: 'Cardiovascular' }),
      A('n', 'Neurológico (Glasgow)', [[0, '15'], [1, '13 a 14'], [2, '10 a 12'], [3, '6 a 9'], [4, '< 6']], { short: 'Neurológico' }),
      A('k', 'Renal (creatinina mg/dL ou diurese)', [[0, '< 1,2'], [1, '1,2 a 1,9'], [2, '2,0 a 3,4'], [3, '3,5 a 4,9 ou diurese < 500 mL/dia'], [4, '≥ 5,0 ou diurese < 200 mL/dia']], { short: 'Renal' })
    ],
    interp: t => ({ title: t >= 2 ? 'Disfunção orgânica presente' : 'Sem disfunção significativa', lvl: t >= 2 ? 'warn' : 'info',
      text: 'Compare com o SOFA basal do paciente: aumento agudo de 2 ou mais pontos na vigência de infecção define sepse. Doses de catecolaminas em mcg/kg/min.' })
  });

  /* ---------- NEWS2 ---------- */
  const newsPts = (x, bands) => { for (const b of bands) if (x <= b[0]) return b[1]; return bands[bands.length - 1][1]; };
  const news2 = {
    id: 'news2', g: 'esc', title: 'NEWS2', desc: 'Escore de alerta precoce de deterioração clínica',
    kw: 'news2 news deterioracao sinais vitais alerta precoce enfermaria',
    fields: [F.N('fr', 'Frequência respiratória', { unit: 'irpm' }), F.N('sat', 'SpO₂', { unit: '%' }), F.CHK('o2', 'Em oxigênio suplementar', 2),
      F.N('pas', 'PA sistólica', { unit: 'mmHg' }), F.N('fc', 'Frequência cardíaca', { unit: 'bpm' }), F.N('t', 'Temperatura', { unit: '°C' }),
      F.CHK('cons', 'Consciência alterada (confusão nova, V, P ou U)', 3)],
    calc: v => {
      const need = ['fr', 'sat', 'pas', 'fc', 't'].filter(k => !isFinite(v[k]));
      if (need.length) return { alerts: [{ lvl: 'info', text: 'Preencha todos os sinais vitais para pontuar.' }] };
      const fr = v.fr <= 8 ? 3 : v.fr <= 11 ? 1 : v.fr <= 20 ? 0 : v.fr <= 24 ? 2 : 3;
      const sat = v.sat <= 91 ? 3 : v.sat <= 93 ? 2 : v.sat <= 95 ? 1 : 0;
      const o2 = v.o2 ? 2 : 0;
      const pas = v.pas <= 90 ? 3 : v.pas <= 100 ? 2 : v.pas <= 110 ? 1 : v.pas <= 219 ? 0 : 3;
      const fc = v.fc <= 40 ? 3 : v.fc <= 50 ? 1 : v.fc <= 90 ? 0 : v.fc <= 110 ? 1 : v.fc <= 130 ? 2 : 3;
      const t = v.t <= 35 ? 3 : v.t <= 36 ? 1 : v.t <= 38 ? 0 : v.t <= 39 ? 1 : 2;
      const c = v.cons ? 3 : 0;
      const arr = [fr, sat, o2, pas, fc, t, c], tot = arr.reduce((a, b) => a + b, 0);
      const red = arr.some((x, i) => x === 3 && i !== 2);
      const lvl = tot >= 7 ? 'Risco alto' : tot >= 5 ? 'Risco médio' : red ? 'Risco baixo-médio' : 'Risco baixo';
      const txt = tot >= 7 ? 'Resposta emergencial: avaliação imediata por equipe com competência em cuidados críticos; considerar transferência para UTI.'
        : tot >= 5 ? 'Resposta urgente: avaliação médica urgente, monitorização contínua.'
          : red ? 'Um parâmetro isolado com 3 pontos: avaliação médica urgente.' : tot >= 1 ? 'Monitorização a cada 4 a 6 h.' : 'Monitorização mínima a cada 12 h.';
      return { main: { label: 'NEWS2', value: String(tot), unit: 'pontos' }, sub: lvl, alerts: [{ lvl: tot >= 7 ? 'crit' : tot >= 5 || red ? 'warn' : 'info', text: txt }],
        rows: [['FR', fr], ['SpO₂ (escala 1)', sat], ['Oxigênio', o2], ['PA sistólica', pas], ['FC', fc], ['Temperatura', t], ['Consciência', c]].map(r => [r[0], r[1] + ' pt']),
        notes: ['SpO₂ pela escala 1. Em pacientes com insuficiência respiratória hipercápnica, use a escala 2 do NEWS2 (alvo 88 a 92%).'],
        text: `NEWS2 ${tot} (${lvl}). FR ${fr}, SpO₂ ${sat}, O₂ ${o2}, PAS ${pas}, FC ${fc}, T ${t}, consciência ${c}.` };
    }
  };

  /* ---------- Alvarado ---------- */
  const alvarado = F.score({
    id: 'alvarado', g: 'cir', title: 'Alvarado (MANTRELS)', max: 10, desc: 'Probabilidade de apendicite aguda',
    kw: 'apendicite abdome agudo dor fid alvarado mantrels',
    items: [C('m', 'Migração da dor para a fossa ilíaca direita', 1, 'Migração'), C('a', 'Anorexia', 1, 'Anorexia'), C('n', 'Náuseas ou vômitos', 1, 'Náuseas/vômitos'),
      C('t', 'Dor à palpação na fossa ilíaca direita', 2, 'Dor FID'), C('r', 'Descompressão brusca dolorosa (Blumberg)', 1, 'Blumberg'),
      C('e', 'Elevação da temperatura (≥ 37,3 °C)', 1, 'Febre'), C('l', 'Leucocitose (> 10.000/mm³)', 2, 'Leucocitose'), C('s', 'Desvio à esquerda (neutrófilos > 75%)', 1, 'Desvio à esquerda')],
    interp: t => t <= 4 ? { title: 'Apendicite improvável', lvl: 'ok', text: 'Conduta sugerida: ALTA com orientação de retorno se piora. Considerar outros diagnósticos (ginecológico, urinário, gastroenterite).' }
      : t <= 6 ? { title: 'Apendicite possível', lvl: 'warn', text: 'Conduta sugerida: OBSERVAÇÃO (6 a 12 h) com reavaliação seriada e exame de imagem (ultrassonografia ou tomografia). Operar se confirmar ou se piora clínica.' }
        : { title: t <= 8 ? 'Apendicite provável' : 'Apendicite muito provável', lvl: 'crit', text: t <= 8 ? 'Conduta sugerida: AVALIAÇÃO CIRÚRGICA; imagem se dúvida diagnóstica (mulheres em idade fértil, idosos).' : 'Conduta sugerida: CIRURGIA (apendicectomia), sem necessidade de imagem se quadro clássico.' }
  });

  /* ---------- Glasgow-Blatchford ---------- */
  const blatch = F.score({
    id: 'blatch', title: 'Glasgow-Blatchford', max: 23, desc: 'Risco na hemorragia digestiva alta e necessidade de intervenção',
    kw: 'hda hemorragia digestiva alta sangramento melena blatchford gi', pre: [F.N('ur', 'Ureia', { unit: 'mg/dL' }), F.N('hb', 'Hemoglobina', { unit: 'g/dL' }), F.SEX(), F.N('pas', 'PA sistólica', { unit: 'mmHg' }), F.N('fc', 'Frequência cardíaca', { unit: 'bpm' })],
    items: [C('mel', 'Melena', 1, 'Melena'), C('sin', 'Síncope', 2, 'Síncope'), C('hep', 'Hepatopatia', 2, 'Hepatopatia'), C('icc', 'Insuficiência cardíaca', 2, 'ICC')],
    extra: v => {
      let s = 0; const parts = [];
      if (isFinite(v.ur)) { const b = v.ur / 2.14; const p = b >= 70 ? 6 : b >= 28 ? 4 : b >= 22.4 ? 3 : b >= 18.2 ? 2 : 0; if (p) { s += p; parts.push('Ureia ' + fmt(v.ur, 0)); } }
      if (isFinite(v.hb) && v.sex) {
        const m = v.sex === 'M'; const p = m ? (v.hb < 10 ? 6 : v.hb < 12 ? 3 : v.hb < 13 ? 1 : 0) : (v.hb < 10 ? 6 : v.hb < 12 ? 1 : 0); if (p) { s += p; parts.push('Hemoglobina ' + fmt(v.hb, 1)); }
      }
      if (isFinite(v.pas)) { const p = v.pas < 90 ? 3 : v.pas < 100 ? 2 : v.pas < 110 ? 1 : 0; if (p) { s += p; parts.push('PAS ' + fmt(v.pas, 0)); } }
      if (isFinite(v.fc) && v.fc >= 100) { s += 1; parts.push('FC ≥ 100'); }
      return { pts: s, parts };
    },
    interp: (t, v) => ({ title: t === 0 ? 'Risco muito baixo' : t <= 1 ? 'Risco baixo' : 'Necessita avaliação hospitalar', lvl: t >= 2 ? 'warn' : 'info',
      text: (!v.sex || !isFinite(v.hb) ? 'Informe hemoglobina e sexo para pontuar a hemoglobina. ' : '') + 'Pontuação 0 a 1: pode-se considerar manejo ambulatorial. Acima disso, internação e endoscopia conforme protocolo. A ureia é convertida em BUN (÷ 2,14).' })
  });

  /* ---------- Centor / McIsaac ---------- */
  const centor = F.score({
    id: 'centor', title: 'Centor / McIsaac', max: 5, desc: 'Probabilidade de faringoamigdalite estreptocócica',
    kw: 'faringite amigdalite estreptococo garganta centor mcisaac odinofagia', pre: [F.AGE()],
    items: [C('f', 'Febre (> 38 °C)', 1, 'Febre'), C('t', 'Ausência de tosse', 1, 'Sem tosse'), C('a', 'Adenopatia cervical anterior dolorosa', 1, 'Adenopatia'), C('e', 'Exsudato ou edema amigdaliano', 1, 'Exsudato')],
    extra: v => { if (v.age >= 3 && v.age < 15) return { pts: 1, parts: ['Idade 3 a 14'] }; if (v.age >= 45) return { pts: -1, parts: ['Idade ≥ 45'] }; return { pts: 0, parts: [] }; },
    interp: t => t <= 1 ? { title: 'Baixa probabilidade', text: 'Sem necessidade de teste ou antibiótico.' }
      : t <= 3 ? { title: 'Probabilidade intermediária', lvl: 'warn', text: 'Teste rápido ou cultura de orofaringe; tratar se positivo.' }
        : { title: 'Alta probabilidade', lvl: 'warn', text: 'Considerar teste e tratar empiricamente conforme protocolo.' }
  });

  /* ---------- Child-Pugh ---------- */
  const child = F.score({
    id: 'child', title: 'Child-Pugh', max: 15, desc: 'Gravidade da cirrose hepática', kw: 'cirrose hepatopatia child pugh figado',
    items: [
      A('b', 'Bilirrubina total (mg/dL)', [[1, '< 2'], [2, '2 a 3'], [3, '> 3']], { short: 'Bilirrubina' }),
      A('a', 'Albumina (g/dL)', [[1, '> 3,5'], [2, '2,8 a 3,5'], [3, '< 2,8']], { short: 'Albumina' }),
      A('i', 'INR', [[1, '< 1,7'], [2, '1,7 a 2,3'], [3, '> 2,3']], { short: 'INR' }),
      A('s', 'Ascite', [[1, 'ausente'], [2, 'leve ou controlada'], [3, 'moderada a grave']], { short: 'Ascite' }),
      A('e', 'Encefalopatia', [[1, 'ausente'], [2, 'grau 1 a 2'], [3, 'grau 3 a 4']], { short: 'Encefalopatia' })
    ],
    interp: t => t <= 6 ? { title: 'Classe A', rows: [['Sobrevida em 1 ano', '~100%']] } : t <= 9 ? { title: 'Classe B', rows: [['Sobrevida em 1 ano', '~80%']], lvl: 'warn' } : { title: 'Classe C', rows: [['Sobrevida em 1 ano', '~45%']], lvl: 'crit' }
  });
  // Child-Pugh começa em 5 pontos (todos os itens valem ≥ 1)

  /* ---------- MELD ---------- */
  const meld = {
    id: 'meld', g: 'esc', title: 'MELD, MELD-Na e MELD 3.0', desc: 'Gravidade da hepatopatia e prioridade de transplante',
    kw: 'meld meld-na meld3 cirrose hepatopatia transplante figado bilirrubina inr',
    fields: [F.N('bili', 'Bilirrubina total', { unit: 'mg/dL' }), F.N('inr', 'INR'), F.N('cr', 'Creatinina', { unit: 'mg/dL' }), F.N('na', 'Sódio', { unit: 'mEq/L' }), F.N('alb', 'Albumina', { unit: 'g/dL' }),
      F.SEX(), F.CHK('dial', 'Diálise ≥ 2 vezes na última semana')],
    calc: v => {
      if (!['bili', 'inr', 'cr'].every(k => isFinite(v[k]))) return { alerts: [{ lvl: 'info', text: 'Informe bilirrubina, INR e creatinina. Sódio e albumina completam o MELD-Na e o MELD 3.0.' }] };
      const cl = (x, a, b) => Math.min(b, Math.max(a, x));
      const bi = Math.max(1, v.bili), inr = Math.max(1, v.inr), cr = v.dial ? 4 : cl(v.cr, 1, 4);
      const m = Math.round(10 * (0.957 * Math.log(cr) + 0.378 * Math.log(bi) + 1.12 * Math.log(inr) + 0.643));
      const rows = [['MELD', String(m)]]; let mainV = m, lab = 'MELD'; const txt = [`MELD ${m}`];
      if (isFinite(v.na)) {
        const na = cl(v.na, 125, 137); const mn = m > 11 ? Math.round(m + 1.32 * (137 - na) - 0.033 * m * (137 - na)) : m;
        rows.push(['MELD-Na', String(mn)]); mainV = mn; lab = 'MELD-Na'; txt.push(`MELD-Na ${mn}`);
        if (isFinite(v.alb) && v.sex) {
          const alb = cl(v.alb, 1.5, 3.5), c3 = v.dial ? 3 : cl(v.cr, 1, 3);
          let m3 = (v.sex === 'F' ? 1.33 : 0) + 4.56 * Math.log(bi) + 0.82 * (137 - na) - 0.24 * (137 - na) * Math.log(bi) + 9.09 * Math.log(inr) + 11.14 * Math.log(c3) + 1.85 * (3.5 - alb) - 1.83 * (3.5 - alb) * Math.log(c3) + 6;
          m3 = Math.min(40, Math.round(m3)); rows.push(['MELD 3.0', String(m3)]); mainV = m3; lab = 'MELD 3.0'; txt.push(`MELD 3.0 ${m3}`);
        }
      }
      return { main: { label: lab, value: String(mainV), unit: 'pontos' }, rows,
        alerts: [{ lvl: 'info', text: 'Valores mínimos de 1,0 aplicados a bilirrubina, INR e creatinina (creatinina máx. 4,0; 3,0 no MELD 3.0). Sódio limitado a 125 a 137. O MELD 3.0 exige sódio, albumina e sexo.' }], text: txt.join('; ') + '.' };
    }
  };

  /* ---------- RCRI ---------- */
  const rcri = F.score({
    id: 'rcri', title: 'RCRI (Lee): risco cardíaco perioperatório', max: 6, desc: 'Risco de complicação cardíaca em cirurgia não cardíaca',
    kw: 'risco cirurgico pre operatorio rcri lee cardiaco cirurgia',
    items: [C('a', 'Cirurgia de alto risco (intraperitoneal, intratorácica ou vascular suprainguinal)', 1, 'Cirurgia alto risco'), C('b', 'Doença arterial coronariana (IAM prévio, angina, nitrato, onda Q)', 1, 'DAC'),
      C('c', 'Insuficiência cardíaca', 1, 'ICC'), C('d', 'AVC ou AIT prévio', 1, 'AVC/AIT'), C('e', 'Diabetes em uso de insulina', 1, 'DM insulinodependente'), C('f', 'Creatinina > 2 mg/dL', 1, 'Creatinina > 2')],
    interp: t => { const r = [3.9, 6.0, 10.1, 15.0][Math.min(3, t)]; return { title: t === 0 ? 'Risco baixo' : t === 1 ? 'Risco baixo a intermediário' : 'Risco elevado', lvl: t >= 2 ? 'warn' : 'info', rows: [['Evento cardíaco maior em 30 dias', `~${fmt(r, 1)}%`]], text: 'Taxas atualizadas (Duceppe 2017). Escore ≥ 1 (≥ 2 em alguns protocolos) indica considerar biomarcadores e avaliação específica.' }; }
  });

  /* ---------- ABCD2 ---------- */
  const abcd2 = F.score({
    id: 'abcd2', title: 'ABCD²', max: 7, desc: 'Risco de AVC nos primeiros dias após um AIT', kw: 'ait avc isquemico transitorio abcd2 risco',
    items: [C('a', 'Idade ≥ 60 anos', 1, 'Idade'), C('b', 'PA ≥ 140/90 mmHg na admissão', 1, 'PA'),
      A('c', 'Características clínicas', [[0, 'outras'], [1, 'distúrbio da fala sem fraqueza'], [2, 'fraqueza unilateral']], { short: 'Clínica' }),
      A('d', 'Duração dos sintomas', [[0, '< 10 min'], [1, '10 a 59 min'], [2, '≥ 60 min']], { short: 'Duração' }), C('e', 'Diabetes mellitus', 1, 'DM')],
    interp: t => t <= 3 ? { title: 'Baixo risco', rows: [['AVC em 2 dias', '~1,0%']] } : t <= 5 ? { title: 'Risco moderado', lvl: 'warn', rows: [['AVC em 2 dias', '~4,1%']] } : { title: 'Alto risco', lvl: 'crit', rows: [['AVC em 2 dias', '~8,1%']], text: 'Considerar internação e investigação urgente (neuroimagem, vasos, ECG).' }
  });

  /* ---------- Westley (crupe) ---------- */
  const westley = F.score({
    id: 'westley', g: 'ped', title: 'Westley: gravidade do crupe', max: 17, desc: 'Escore de gravidade da laringotraqueíte (crupe) em crianças',
    kw: 'crupe laringite laringotraqueite estridor westley pediatria',
    items: [
      A('e', 'Estridor', [[0, 'ausente'], [1, 'ao agitar-se'], [2, 'em repouso']], { short: 'Estridor' }),
      A('r', 'Retração', [[0, 'ausente'], [1, 'leve'], [2, 'moderada'], [3, 'grave']], { short: 'Retração' }),
      A('a', 'Entrada de ar', [[0, 'normal'], [1, 'diminuída'], [2, 'muito diminuída']], { short: 'Entrada de ar' }),
      A('c', 'Cianose', [[0, 'ausente'], [4, 'ao agitar-se'], [5, 'em repouso']], { short: 'Cianose' }),
      A('n', 'Nível de consciência', [[0, 'normal'], [5, 'alterado/desorientado']], { short: 'Consciência' })
    ],
    interp: t => t <= 2 ? { title: 'Crupe leve', text: 'Dexametasona 0,15 a 0,6 mg/kg em dose única; orientar retorno.' }
      : t <= 5 ? { title: 'Crupe moderado', lvl: 'warn', text: 'Dexametasona e nebulização com adrenalina conforme protocolo; observar.' }
        : t <= 11 ? { title: 'Crupe grave', lvl: 'crit', text: 'Nebulização com adrenalina, dexametasona, monitorização e internação.' } : { title: 'Falência respiratória iminente', lvl: 'crit', text: 'Via aérea avançada em ambiente com equipe experiente.' }
  });

  /* ---------- APGAR ---------- */
  const apgar = F.score({
    id: 'apgar', g: 'ped', title: 'Apgar', max: 10, desc: 'Vitalidade do recém-nascido ao 1º e 5º minutos', kw: 'apgar recem nascido neonato parto rn',
    items: [
      A('f', 'Frequência cardíaca', [[0, 'ausente'], [1, '< 100 bpm'], [2, '≥ 100 bpm']], { short: 'FC' }),
      A('r', 'Respiração', [[0, 'ausente'], [1, 'irregular ou choro fraco'], [2, 'choro forte']], { short: 'Respiração' }),
      A('t', 'Tônus muscular', [[0, 'flácido'], [1, 'alguma flexão'], [2, 'movimentos ativos']], { short: 'Tônus' }),
      A('i', 'Irritabilidade reflexa', [[0, 'sem resposta'], [1, 'careta'], [2, 'choro, tosse ou espirro']], { short: 'Irritabilidade' }),
      A('c', 'Cor da pele', [[0, 'cianose ou palidez generalizada'], [1, 'corpo róseo e extremidades cianóticas'], [2, 'totalmente rósea']], { short: 'Cor' })
    ],
    interp: t => t >= 7 ? { title: 'Normal' } : t >= 4 ? { title: 'Asfixia moderada', lvl: 'warn', text: 'Reavaliar conforme fluxograma de reanimação neonatal.' } : { title: 'Asfixia grave', lvl: 'crit', text: 'Reanimação neonatal conforme protocolo.' }
  });

  /* ---------- RASS ---------- */
  const RASS = [[4, 'Combativo', 'Violento, perigo imediato para a equipe'], [3, 'Muito agitado', 'Puxa ou remove tubos e cateteres; agressivo'], [2, 'Agitado', 'Movimentos não intencionais frequentes; briga com o ventilador'],
    [1, 'Inquieto', 'Ansioso, mas sem movimentos agressivos'], [0, 'Alerta e calmo', ''], [-1, 'Sonolento', 'Não totalmente alerta; mantém contato visual por mais de 10 s ao chamado'],
    [-2, 'Sedação leve', 'Acorda por menos de 10 s com contato visual ao chamado'], [-3, 'Sedação moderada', 'Movimento ou abertura ocular ao chamado, sem contato visual'],
    [-4, 'Sedação profunda', 'Sem resposta ao chamado; movimento ou abertura ocular ao estímulo físico'], [-5, 'Sem resposta', 'Não responde a voz nem a estímulo físico']];
  const rass = {
    id: 'rass', g: 'esc', title: 'RASS: sedação e agitação', desc: 'Escala de agitação e sedação de Richmond (RASS) com a descrição de cada nível',
    kw: 'rass sedacao agitacao uti ramsay richmond delirium',
    fields: [F.SEL('n', 'Nível observado', RASS.map(r => [String(r[0]), (r[0] > 0 ? '+' : '') + r[0] + ': ' + r[1]]), { def: '0' })],
    calc: v => {
      const r = RASS.find(x => String(x[0]) === v.n) || RASS[4];
      return { main: { label: 'RASS', value: (r[0] > 0 ? '+' : '') + r[0], unit: r[1] }, sub: r[2] || 'Sem agitação nem sedação.',
        alerts: [{ lvl: 'info', text: 'Meta habitual de sedação: RASS entre −2 e 0 (sedação leve), salvo indicação específica.' }], text: `RASS ${(r[0] > 0 ? '+' : '') + r[0]} (${r[1]}).` };
    }
  };

  D.add(nihss, gcs, wellsTep, wellsTvp, perc, heart, cha, hasbled, curb, qsofa, sirs, sofa, news2, alvarado, blatch, centor, child, meld, rcri, abcd2, rass, westley, apgar);
})();
