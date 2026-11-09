/* Sedação para procedimentos e análise de líquidos (pleural, ascítico, liquor, sinovial) */
(function () {
  'use strict';
  const D = window.DRB, u = D.u, F = D.f, fmt = u.fmt, h = u.h;
  const r5 = (x, s) => Math.round(x / s) * s;            // arredonda para o passo s
  const mlTxt = (ml, ped) => fmt(ped ? Math.round(ml * 10) / 10 : Math.round(ml * 2) / 2, 1);

  /* ---------- procedimentos ---------- */
  const PROC = {
    dren: { t: 'Drenagem de tórax', esq: 'mf', liq: 'pl' },
    toraco: { t: 'Toracocentese', esq: 'local', liq: 'pl' },
    para: { t: 'Paracentese', esq: 'local', liq: 'as' },
    pl: { t: 'Punção lombar', esq: 'local', liq: 'lcr' },
    artro: { t: 'Artrocentese', esq: 'local', liq: 'sin' },
    red: { t: 'Redução de luxação ou fratura', esq: 'pf', pedEsq: 'ket' },
    cv: { t: 'Cardioversão elétrica sincronizada', esq: 'p' },
    sut: { t: 'Sutura ou limpeza de ferimento', esq: 'local', pedEsq: 'ket' },
    out: { t: 'Outro procedimento', esq: 'mf' }
  };
  const ESQ = [['mf', 'Midazolam + fentanil (sedação moderada)'], ['pf', 'Propofol + fentanil (sedação profunda curta)'], ['p', 'Propofol isolado'], ['ket', 'Cetamina (dissociativa)'], ['local', 'Só anestesia local']];

  const ageY = v => isFinite(v.age) ? v.age : NaN;
  const grupo = v => { const a = ageY(v); return isFinite(a) && a < 18 ? 'ped' : (v.risco === 'r' || (isFinite(a) && a >= 65)) ? 'r' : 'n'; };

  function fentanil(kg, g, so1) {
    // 1 ampola 2 mL (100 mcg) + 8 mL de AD = 10 mL a 10 mcg/mL
    const ped = g === 'ped';
    const ini = ped ? Math.min(kg, 50) : g === 'r' ? Math.max(25, r5(Math.min(0.5 * kg, 50), 25)) : Math.max(25, r5(Math.min(kg, 100), 25));
    const inc = ped ? Math.min(0.5 * kg, 25) : g === 'r' ? 25 : Math.max(25, r5(Math.min(0.5 * kg, 50), 25));
    const max = ped ? Math.min(3 * kg, 100) : g === 'r' ? Math.min(1.5 * kg, 100) : Math.min(3 * kg, 200);
    const d = `Diluir 1 ampola de 2 mL (100 mcg) + 8 mL de água destilada = 10 mL (10 mcg/mL). Fazer ${mlTxt(ini / 10, ped)} mL (${fmt(ini, 0)} mcg) IV em 1 min` +
      (so1 ? ', 2 a 3 min antes do propofol. Em geral uma dose basta.' : `. Repetir ${mlTxt(inc / 10, ped)} mL (${fmt(inc, 0)} mcg) a cada 2 a 3 min até analgesia. Máximo ${mlTxt(max / 10, ped)} mL (${fmt(max, 0)} mcg).`);
    return { t: 'Fentanil', d, tx: `Fentanil 100 mcg (2 mL) + AD 8 mL (10 mcg/mL): ${mlTxt(ini / 10, ped)} mL IV` + (so1 ? '' : `, depois ${mlTxt(inc / 10, ped)} mL a cada 2 a 3 min, máx. ${mlTxt(max / 10, ped)} mL`) };
  }
  function midazolam(kg, g) {
    // 1 ampola 15 mg/3 mL + 12 mL de AD = 15 mL a 1 mg/mL
    const ped = g === 'ped';
    let ini, inc, max;
    if (ped) { ini = Math.min(0.05 * kg, 2); inc = Math.min(0.05 * kg, 1); max = Math.min(0.2 * kg, 5); }
    else if (g === 'r') { ini = 1; inc = 0.5; max = 3; }
    else { ini = kg >= 50 ? 2 : 1; inc = 1; max = 5; }
    const d = `Diluir 1 ampola de 15 mg/3 mL + 12 mL de água destilada = 15 mL (1 mg/mL); a ampola de 5 mg/5 mL já está a 1 mg/mL. Fazer ${mlTxt(ini, ped)} mL (${fmt(ini, ped ? 2 : 1)} mg) IV lento, depois do fentanil. Repetir ${mlTxt(inc, ped)} mL (${fmt(inc, ped ? 2 : 1)} mg) a cada 2 a 3 min até sedação (fala arrastada, ptose, responde ao chamado). Máximo ${mlTxt(max, ped)} mL (${fmt(max, 1)} mg).`;
    return { t: 'Midazolam', d, tx: `Midazolam 15 mg (3 mL) + AD 12 mL (1 mg/mL): ${mlTxt(ini, ped)} mL IV, depois ${mlTxt(inc, ped)} mL a cada 2 a 3 min, máx. ${mlTxt(max, ped)} mL` };
  }
  function propofol(kg, g, comFent, cv) {
    // propofol 1% = 10 mg/mL, sem diluir
    const ped = g === 'ped';
    const [a, b] = ped ? [1, 1] : g === 'r' ? [0.25, 0.5] : comFent ? [0.5, 0.75] : [0.5, 1];
    const rep = ped ? 0.5 : g === 'r' ? 0.25 : 0.5;
    const ini = u.rangeAuto(a * kg / 10, b * kg / 10);
    const d = `Propofol 1% (10 mg/mL), sem diluir. Fazer ${ini} mL (${u.rangeAuto(a * kg, b * kg)} mg) IV em 30 a 60 s. ` +
      (cv ? `Se não dormir em 1 a 2 min, mais ${mlTxt(rep * kg / 10, ped)} mL. Chocar assim que perder o reflexo ciliar.` : `Repetir ${mlTxt(rep * kg / 10, ped)} mL (${fmt(rep * kg, 0)} mg) a cada 3 a 5 min, se o paciente mexer ou acordar. Apneia e hipotensão são frequentes: ventile com bolsa-válvula-máscara se preciso.`);
    return { t: 'Propofol', d, tx: `Propofol 1% (10 mg/mL): ${ini} mL IV em 30 a 60 s` + (cv ? `, mais ${mlTxt(rep * kg / 10, ped)} mL se não dormir em 1 a 2 min` : `, repetir ${mlTxt(rep * kg / 10, ped)} mL a cada 3 a 5 min se necessário`) };
  }
  function cetamina(kg, g) {
    // 2 mL (100 mg) de 50 mg/mL + 8 mL de AD = 10 mL a 10 mg/mL
    const ped = g === 'ped';
    const ivA = ped ? 1 : g === 'r' ? 0.5 : 1, ivB = ped ? 1.5 : g === 'r' ? 0.75 : 1, rep = g === 'r' ? 0.25 : 0.5;
    const imMl = Math.min(4 * kg, 500) / 50;
    const d = `Diluir 2 mL (100 mg) da ampola de 50 mg/mL + 8 mL de água destilada = 10 mL (10 mg/mL). Fazer ${u.rangeAuto(ivA * kg / 10, ivB * kg / 10)} mL (${u.rangeAuto(ivA * kg, ivB * kg)} mg) IV em 1 min; o efeito começa em 1 min e dura de 10 a 15 min. Repetir ${mlTxt(rep * kg / 10, ped)} mL (${fmt(rep * kg, 0)} mg) a cada 5 a 10 min se necessário. Sem acesso venoso: ${mlTxt(imMl, ped)} mL da ampola pura (50 mg/mL; ${fmt(imMl * 50, 0)} mg, 4 mg/kg) IM.`;
    return { t: 'Cetamina', d, tx: `Cetamina 100 mg (2 mL) + AD 8 mL (10 mg/mL): ${u.rangeAuto(ivA * kg / 10, ivB * kg / 10)} mL IV em 1 min, repetir ${mlTxt(rep * kg / 10, ped)} mL a cada 5 a 10 min se necessário` };
  }

  const EXAMES = {
    pl: { t: 'Líquido pleural', rows: [
      ['Bioquímica (tubo seco)', 'Proteína total, LDH e glicose do líquido. Colher no mesmo momento, no sangue, proteína total, LDH e glicose (critérios de Light).'],
      ['pH', 'Seringa de gasometria heparinizada, sem bolha de ar, analisar em até 1 h. Não precisa se o aspecto for de pus.'],
      ['Citologia total e diferencial', 'Tubo roxo (EDTA).'],
      ['Gram e cultura', 'Frascos de hemocultura aeróbio e anaeróbio (5 a 10 mL em cada) e um frasco estéril.'],
      ['Tuberculose', 'ADA, pesquisa de BAAR, teste molecular (GeneXpert) e cultura para micobactérias.'],
      ['Citologia oncótica', 'De 25 a 50 mL em frasco estéril, se suspeita de neoplasia.'],
      ['Conforme a suspeita', 'Triglicerídeos e colesterol (aspecto leitoso, quilotórax); hematócrito do líquido e do sangue (hemotórax se a relação for ≥ 0,5); amilase (pancreatite, ruptura de esôfago); NT-proBNP (insuficiência cardíaca).']] },
    as: { t: 'Líquido ascítico', rows: [
      ['Citologia total e diferencial', 'Tubo roxo (EDTA). Neutrófilos ≥ 250/mm³ definem peritonite bacteriana espontânea.'],
      ['Albumina e proteína total', 'Do líquido, com albumina sérica do mesmo dia (gradiente soro-ascite, GASA).'],
      ['Cultura', 'Inocular 10 mL em cada frasco de hemocultura (aeróbio e anaeróbio) à beira do leito, antes do antibiótico.'],
      ['Gram', 'Frasco estéril.'],
      ['Conforme a suspeita', 'Glicose e LDH (peritonite secundária); amilase (ascite pancreática); triglicerídeos (ascite quilosa); bilirrubina (fístula biliar); citologia oncótica; ADA e BAAR (tuberculose).']] },
    lcr: { t: 'Liquor', rows: [
      ['Pressão de abertura', 'Em decúbito lateral, pernas estendidas, antes de colher. Normal até 20 cmH₂O.'],
      ['Tubo 1: bioquímica', 'Glicose, proteína e lactato. Colher glicemia no mesmo momento.'],
      ['Tubo 2: microbiologia', 'Gram, cultura, látex ou antígenos bacterianos e PCR (painel de meningite e encefalite, herpes, enterovírus).'],
      ['Tubo 3: citologia', 'Citologia total e diferencial (último tubo, menos sangue de acidente de punção).'],
      ['Tubo 4: conforme a suspeita', 'Tinta da China e antígeno criptocócico, BAAR, ADA e GeneXpert, VDRL, citologia oncótica.'],
      ['Volume', 'Adulto de 8 a 15 mL no total; criança cerca de 1 mL por tubo.']] },
    sin: { t: 'Líquido sinovial', rows: [
      ['Citologia total e diferencial', 'Tubo roxo (EDTA).'],
      ['Pesquisa de cristais', 'Microscopia com luz polarizada (urato na gota, pirofosfato de cálcio na pseudogota), tubo com heparina ou seco.'],
      ['Gram e cultura', 'Frasco de hemocultura e frasco estéril. Cristais não excluem artrite séptica.'],
      ['Conforme a suspeita', 'Glicose e lactato; BAAR e cultura para micobactérias em monoartrite crônica.']] }
  };

  function roteiro(p, v, kg, g) {
    const s = [], al = [], rows = [], ped = g === 'ped';
    if (p === 'dren') {
      s.push({ t: 'Local da drenagem', d: 'Triângulo de segurança: borda lateral do peitoral maior, borda anterior do grande dorsal e linha do mamilo (4º ou 5º espaço intercostal), entre as linhas axilares anterior e média. Entrar pela borda superior da costela de baixo, dissecção romba e exploração digital antes de passar o dreno.' });
      rows.push(['Calibre do dreno', ped ? 'Aproximadamente 4 × o diâmetro do tubo orotraqueal da idade, em Fr. Pneumotórax simples aceita cateter fino (pigtail).' : 'Pneumotórax: 14 a 22 Fr ou pigtail de 14 Fr. Hemotórax e empiema: 24 a 32 Fr (o ATLS aceita 14 Fr no hemotórax estável).']);
      rows.push(['Após drenar', 'Selo d\'água de 2 cm, fixação com ponto em U e radiografia de controle. Hemotórax com saída inicial ≥ 1.500 mL ou mais de 200 mL/h por 2 a 4 h: avaliar toracotomia.']);
    }
    if (p === 'toraco') s.push({ t: 'Técnica', d: 'Guiar por ultrassom. Paciente sentado e inclinado para frente, 1 a 2 espaços abaixo do nível do derrame, na linha escapular ou axilar posterior, pela borda superior da costela. Retirar no máximo 1.000 a 1.500 mL por vez e parar se tosse, dor torácica ou dispneia (risco de edema de reexpansão).' });
    if (p === 'para') {
      s.push({ t: 'Técnica', d: 'Quadrante inferior esquerdo, 2 a 4 cm acima e medial à espinha ilíaca anterossuperior, de preferência guiado por ultrassom, com técnica em Z. Coagulopatia da cirrose não contraindica a punção.' });
      if (v.vol > 0) {
        const alb = v.vol > 5 ? 8 * v.vol : 0;
        rows.push(['Reposição de albumina', alb ? `${fmt(v.vol, 1)} L retirados: ${fmt(alb, 0)} g de albumina (8 g por litro), ${fmt(Math.ceil(alb / 10), 0)} frascos de albumina 20% 50 mL, EV após o procedimento.` : 'Retirada de até 5 L: albumina não é obrigatória.']);
      } else rows.push(['Reposição de albumina', 'Acima de 5 L retirados: 6 a 8 g por litro (albumina 20%: cada frasco de 50 mL tem 10 g). Informe o volume para calcular.']);
    }
    if (p === 'pl') s.push({ t: 'Técnica', d: 'Decúbito lateral com flexão máxima ou sentado, espaço L3 e L4 ou L4 e L5 (linha que une as cristas ilíacas). Agulha 22G com mandril, bisel paralelo às fibras da dura. Fazer TC antes se houver déficit focal, papiledema, rebaixamento da consciência, convulsão recente ou imunossupressão, sem atrasar o antibiótico na suspeita de meningite.' });
    if (p === 'artro') s.push({ t: 'Técnica', d: 'Antissepsia rigorosa e, de preferência, guiar por ultrassom. Não puncionar através de pele com celulite. Joelho: acesso suprapatelar lateral com o joelho em extensão.' });
    if (p === 'red') {
      s.push({ t: 'Técnica', d: 'Antes e depois da redução, examinar pulso, perfusão e sensibilidade e fazer radiografia. Luxação anterior de ombro: técnicas como Cunningham e FARES podem dispensar a sedação. Fratura de rádio distal: bloqueio do hematoma com lidocaína 1% sem vasoconstritor, 10 mL, é alternativa à sedação.' });
    }
    if (p === 'cv') {
      rows.push(['Energia (bifásico, sincronizado)', 'Fibrilação atrial: 120 a 200 J. Flutter e outras taquicardias supraventriculares: 50 a 100 J. TV monomórfica com pulso: 100 J. Se não reverter, aumentar a energia.']);
      al.push({ lvl: 'warn', text: 'FA ou flutter com mais de 48 h ou de início desconhecido, sem anticoagulação adequada por 3 semanas: fazer ecocardiograma transesofágico ou anticoagular antes, exceto se instável. Anticoagular após a cardioversão.' });
      al.push({ lvl: 'info', text: 'Paciente hipotenso ou com disfunção ventricular grave: prefira etomidato 0,1 a 0,15 mg/kg (2 mg/mL) ou cetamina em dose baixa no lugar do propofol.' });
    }
    if (p === 'sut' && ped) al.push({ lvl: 'info', text: 'Em criança, a cetamina é a sedação de escolha para sutura ou limpeza de ferimento. Anestésico tópico (lidocaína, epinefrina e tetracaína) reduz a dor da infiltração.' });
    return { s, al, rows };
  }

  const sedproc = {
    id: 'sedproc', g: 'cir', title: 'Sedação para procedimentos', desc: 'Drenagem de tórax, paracentese, punções, redução e cardioversão: diluições prontas de midazolam, fentanil, propofol e cetamina, anestesia local, antídotos e exames do líquido',
    kw: 'sedacao analgesia procedimento drenagem torax dreno toracico toracocentese paracentese puncao lombar liquor artrocentese reducao luxacao fratura cardioversao midazolam fentanil propofol cetamina ketamina diluicao agua destilada lidocaina anestesia local naloxona flumazenil',
    disc: 'Doses de referência para sedação em pronto-socorro (bulas, ACEP e SBA). Sedação exige monitorização contínua, oxigênio, aspirador, material de via aérea e profissional capaz de resgatar uma via aérea. Titule pelo efeito e ajuste ao paciente.',
    fields: v => {
      const P = PROC[v.proc || 'dren'] || PROC.dren, ped = isFinite(v.age) && v.age < 18;
      const out = [F.SEL('proc', 'Procedimento', Object.keys(PROC).map(k => [k, PROC[k].t]), { def: 'dren' }), F.KG(), F.AGE(),
        F.SEL('esq', 'Esquema de sedação', ESQ, { def: (ped && P.pedEsq) || P.esq })];
      if (!ped) out.push(F.SEL('risco', 'Risco', [['n', 'Até 64 anos, ASA I ou II'], ['r', 'Idoso, frágil, ASA III ou IV, DPOC, obeso, hipovolêmico (reduzir doses)']], { def: isFinite(v.age) && v.age >= 65 ? 'r' : 'n' }));
      if ((v.proc || 'dren') === 'para') out.push(F.N('vol', 'Volume a retirar (opcional)', { unit: 'L' }));
      return out;
    },
    calc: v => {
      const kg = v.kg; if (!(kg > 0)) return { alerts: [{ lvl: 'warn', text: 'Informe o peso.' }] };
      const pk = v.proc || 'dren', P = PROC[pk], g = grupo(v), ped = g === 'ped', e = v.esq || P.esq, a = ageY(v);
      const steps = [], al = [], tx = [];
      steps.push({ t: 'Preparar', d: 'Acesso venoso, monitor com oximetria, ECG e PA (capnografia se disponível), oxigênio por cateter, aspirador, bolsa-válvula-máscara, material de intubação e antídotos aspirados. Jejum não é obrigatório na urgência; considere o risco de aspiração.' });
      // anestesia local
      const lid1 = Math.min(4.5 * kg, 300) / 10, lidV = Math.min(7 * kg, 500) / 10;
      if (pk !== 'cv') steps.push({ t: 'Anestesia local', d: `Lidocaína 1% sem vasoconstritor: até ${mlTxt(lid1, ped)} mL (4,5 mg/kg, máx. 300 mg); com vasoconstritor: até ${mlTxt(lidV, ped)} mL (7 mg/kg, máx. 500 mg). Na lidocaína 2%, metade do volume. ${pk === 'dren' ? 'Infiltrar pele, subcutâneo, periósteo da costela e pleura parietal (no adulto, em geral 10 a 20 mL de 1%), aspirando antes de injetar.' : 'Infiltrar por planos, aspirando antes de injetar.'}` });
      if (e === 'mf') { const f = fentanil(kg, g), m = midazolam(kg, g); steps.push(f, m); tx.push(f.tx, m.tx); }
      if (e === 'pf') { const f = fentanil(kg, g, true), p = propofol(kg, g, true, pk === 'cv'); steps.push(f, p); tx.push(f.tx, p.tx); }
      if (e === 'p') { const p = propofol(kg, g, false, pk === 'cv'); steps.push(p); tx.push(p.tx); }
      if (e === 'ket') {
        const k = cetamina(kg, g); steps.push(k); tx.push(k.tx);
        if (isFinite(a) && a < 0.25) al.push({ lvl: 'crit', text: 'Cetamina não é recomendada abaixo de 3 meses de idade.' });
        al.push({ lvl: 'info', text: 'Cetamina mantém o drive respiratório e a pressão arterial. Evitar em psicose e em hipertensão grave ou doença coronariana descompensada. Ondansetrona 0,15 mg/kg (máx. 4 mg) reduz o vômito; no adulto, midazolam 1 mg reduz a agitação ao despertar.' });
      }
      if (e === 'local') {
        steps.push({ t: 'Se ansioso ou com dor', d: `Opcional: fentanil ${ped ? fmt(Math.min(kg, 50), 0) : g === 'r' ? '25' : '25 a 50'} mcg IV (diluído a 10 mcg/mL) e/ou midazolam ${ped ? fmt(Math.min(0.05 * kg, 2), 1) : g === 'r' ? '0,5 a 1' : '1 a 2'} mg IV (1 mg/mL). Para as diluições completas, escolha o esquema Midazolam + fentanil.` });
        tx.push('Anestesia local com lidocaína 1%');
      }
      if (e === 'mf' || e === 'pf' || e === 'p') {
        if (e !== 'mf' && ped && isFinite(a) && a < 3) al.push({ lvl: 'warn', text: 'Propofol para sedação abaixo de 3 anos: uso fora da bula; prefira cetamina.' });
        if (e !== 'mf') al.push({ lvl: 'warn', text: 'Propofol causa sedação profunda, apneia e hipotensão: só com profissional treinado em via aérea, ao lado do paciente durante todo o procedimento.' });
      }
      if (e === 'mf' && pk === 'dren') al.push({ lvl: 'info', text: 'A dor da drenagem é controlada principalmente pela anestesia local bem feita (pleura parietal) e pelo fentanil; o midazolam é o ansiolítico. Cetamina em dose analgésica (0,1 a 0,3 mg/kg IV) é uma alternativa.' });
      if (g === 'r') al.push({ lvl: 'warn', text: 'Paciente de risco: doses iniciais menores e intervalos maiores (o pico do midazolam demora de 3 a 5 min no idoso). A associação de opioide e benzodiazepínico potencializa a depressão respiratória.' });
      const R = roteiro(pk, v, kg, g);
      steps.push(...R.s);
      steps.push({ t: 'Recuperação e alta', d: 'Monitorizar até voltar ao nível de consciência prévio, com sinais vitais estáveis, sem náusea importante e tolerando líquidos. No mínimo 30 min após a última dose de antídoto (a naloxona e o flumazenil duram menos que os sedativos).' });
      const usaAnt = e === 'mf' || e === 'pf' || e === 'local';
      const rows = !usaAnt ? [['Antídoto', e === 'ket' ? 'Cetamina não tem antídoto. Laringoespasmo (raro): reposicionar, ventilar com pressão positiva; se persistir, succinilcolina e intubação.' : 'Propofol não tem antídoto: suporte ventilatório com bolsa-válvula-máscara até o fim do efeito (5 a 10 min).'], ...R.rows] : [
        ['Naloxona (depressão respiratória por opioide)', ped ? `0,01 mg/kg = ${fmt(Math.min(0.01 * kg, 0.4), 2)} mg IV. Ampola 0,4 mg/mL + 9 mL de AD = 0,04 mg/mL: ${mlTxt(Math.min(0.01 * kg, 0.4) / 0.04, true)} mL, repetir a cada 2 min.` : 'Ampola 0,4 mg/1 mL + 9 mL de AD = 10 mL (0,04 mg/mL). Fazer 1 a 2 mL (40 a 80 mcg) IV a cada 2 min até FR adequada, sem reverter a analgesia por completo.'],
        ['Flumazenil (benzodiazepínico)', ped ? `0,01 mg/kg = ${fmt(Math.min(0.01 * kg, 0.2), 2)} mg IV (ampola 0,1 mg/mL: ${mlTxt(Math.min(0.01 * kg, 0.2) / 0.1, true)} mL), repetir a cada 1 min, máx. 1 mg.` : 'Ampola 0,1 mg/mL, sem diluir: 2 mL (0,2 mg) IV em 15 s; depois 1 mL (0,1 mg) a cada 1 min, máx. 10 mL (1 mg). Evitar em usuário crônico de benzodiazepínico e em epilepsia (convulsão).'],
        ...R.rows
      ];
      al.unshift(...R.al);
      let table = null;
      if (P.liq) {
        const E = EXAMES[P.liq];
        table = { title: 'Exames a pedir: ' + E.t.toLowerCase(), head: ['Exame', 'Como colher'], rows: E.rows };
        rows.push(['Interpretar o resultado', h('a', { href: '#/liquidos' }, 'Abrir a ferramenta Análise de líquidos')]);
      }
      const esqT = ESQ.find(x => x[0] === e)[1];
      const text = `${P.t} (${fmt(kg, 1)} kg${isFinite(a) ? ', ' + fmt(a, a < 2 ? 1 : 0) + ' anos' : ''}). Sedação: ${esqT}. ${tx.join('. ')}. Monitorização contínua (SpO₂, ECG, PA), O₂ suplementar, antídotos disponíveis.` +
        (P.liq ? ` Exames do ${EXAMES[P.liq].t.toLowerCase()}: ${EXAMES[P.liq].rows.map(r => r[0]).join(', ')}.` : '');
      return { main: { label: P.t, value: esqT.replace(/ \(.*\)/, ''), small: true }, sub: ped ? 'Doses pediátricas por peso' : g === 'r' ? 'Doses reduzidas (paciente de risco)' : 'Doses de adulto', steps, rows, alerts: al, table, text };
    }
  };

  /* ---------- análise de líquidos ---------- */
  const liquidos = {
    id: 'liquidos', g: 'lab', title: 'Análise de líquidos', desc: 'O que pedir e como interpretar: líquido pleural (Light), ascítico (GASA e PBE), liquor e sinovial',
    kw: 'liquido pleural derrame light exsudato transudato empiema ada ascite ascitico gasa peritonite bacteriana espontanea pbe paracentese liquor lcr meningite puncao lombar sinovial artrite septica cristais toracocentese',
    disc: 'Interpretação de apoio. Correlacione com a clínica, a imagem e os exames microbiológicos.',
    fields: v => {
      const m = v.tipo || 'pl', out = [F.SEG('tipo', '', [['pl', 'Pleural'], ['as', 'Ascítico'], ['lcr', 'Liquor'], ['sin', 'Sinovial']], { def: 'pl' })];
      if (m === 'pl') out.push(F.SEC('Líquido e sangue'), F.N('ptl', 'Proteína do líquido', { unit: 'g/dL' }), F.N('pts', 'Proteína sérica', { unit: 'g/dL' }),
        F.N('ldl', 'LDH do líquido', { unit: 'U/L' }), F.N('lds', 'LDH sérica', { unit: 'U/L' }), F.N('lsn', 'Limite superior normal da LDH sérica', { unit: 'U/L' }),
        F.N('gli', 'Glicose do líquido', { unit: 'mg/dL' }), F.N('ph', 'pH do líquido'), F.N('ada', 'ADA', { unit: 'U/L' }), F.N('tg', 'Triglicerídeos do líquido', { unit: 'mg/dL' }),
        F.N('htl', 'Hematócrito do líquido', { unit: '%' }), F.N('hts', 'Hematócrito do sangue', { unit: '%' }),
        F.SEL('asp', 'Aspecto', [['', 'Não informado'], ['pus', 'Pus franco'], ['turvo', 'Turvo ou sero-hemático'], ['claro', 'Citrino, claro']], { def: '' }));
      if (m === 'as') out.push(F.N('albs', 'Albumina sérica', { unit: 'g/dL' }), F.N('albl', 'Albumina do líquido', { unit: 'g/dL' }), F.N('ptl', 'Proteína total do líquido', { unit: 'g/dL' }),
        F.N('pmn', 'Neutrófilos no líquido', { unit: '/mm³' }), F.N('hem', 'Hemácias no líquido (opcional)', { unit: '/mm³' }),
        F.N('gli', 'Glicose do líquido', { unit: 'mg/dL' }), F.N('ldl', 'LDH do líquido', { unit: 'U/L' }), F.N('lsn', 'Limite superior normal da LDH sérica', { unit: 'U/L' }));
      if (m === 'lcr') out.push(F.N('cel', 'Leucócitos', { unit: '/mm³' }), F.N('neu', 'Neutrófilos', { unit: '%' }), F.N('hem', 'Hemácias (opcional)', { unit: '/mm³' }),
        F.N('ptn', 'Proteína', { unit: 'mg/dL' }), F.N('gli', 'Glicose do liquor', { unit: 'mg/dL' }), F.N('gls', 'Glicemia no momento', { unit: 'mg/dL' }), F.N('lac', 'Lactato', { unit: 'mmol/L' }));
      if (m === 'sin') out.push(F.N('cel', 'Leucócitos', { unit: '/mm³' }), F.N('neu', 'Neutrófilos', { unit: '%' }),
        F.SEL('cri', 'Cristais', [['', 'Não pesquisados'], ['n', 'Ausentes'], ['u', 'Urato monossódico'], ['p', 'Pirofosfato de cálcio']], { def: '' }));
      return out;
    },
    calc: v => {
      const m = v.tipo || 'pl', E = EXAMES[m === 'as' ? 'as' : m], rows = [], al = [], tx = [];
      const has = k => isFinite(v[k]);
      let main = null;
      if (m === 'pl') {
        const c = [];
        if (has('ptl') && has('pts') && v.pts > 0) { const r = v.ptl / v.pts; rows.push(['Proteína líquido/soro', `${fmt(r, 2)} (exsudato se > 0,5)`]); c.push(r > 0.5); }
        if (has('ldl') && has('lds') && v.lds > 0) { const r = v.ldl / v.lds; rows.push(['LDH líquido/soro', `${fmt(r, 2)} (exsudato se > 0,6)`]); c.push(r > 0.6); }
        if (has('ldl') && has('lsn') && v.lsn > 0) { rows.push(['LDH do líquido / LSN sérico', `${fmt(v.ldl / v.lsn * 100, 0)}% (exsudato se > 67%)`]); c.push(v.ldl > 2 / 3 * v.lsn); }
        if (c.length) {
          const ex = c.some(Boolean);
          main = { label: 'Critérios de Light', value: ex ? 'Exsudato' : c.length === 3 ? 'Transudato' : 'Sem critério de exsudato', small: true };
          tx.push(`Light: ${main.value.toLowerCase()} (${c.filter(Boolean).length} de ${c.length} critérios avaliados)`);
          if (!ex && c.length < 3) al.push({ lvl: 'info', text: 'Para afirmar transudato, os três critérios precisam ser avaliados e negativos.' });
          if (ex && has('pts') && has('ptl') && v.pts - v.ptl > 3.1) al.push({ lvl: 'info', text: `Gradiente de proteína soro menos líquido de ${fmt(v.pts - v.ptl, 1)} g/dL (> 3,1): sugere transudato classificado como exsudato pelo uso de diurético (insuficiência cardíaca).` });
          if (ex) al.push({ lvl: 'info', text: 'Exsudato: principais causas são parapneumônico, tuberculose, neoplasia, TEP e doenças autoimunes. Transudato: insuficiência cardíaca, cirrose, síndrome nefrótica, hipoalbuminemia.' });
        }
        const comp = [];
        if (v.asp === 'pus') comp.push('pus franco (empiema)');
        if (has('ph') && v.ph < 7.2) comp.push(`pH ${fmt(v.ph, 2)} < 7,2`);
        if (has('gli') && v.gli < 60) comp.push(`glicose ${fmt(v.gli, 0)} < 60 mg/dL`);
        if (has('ldl') && v.ldl > 1000) comp.push(`LDH ${fmt(v.ldl, 0)} > 1.000 U/L`);
        if (comp.length) { al.unshift({ lvl: 'crit', text: `Derrame parapneumônico complicado ou empiema (${comp.join('; ')}): indicação de drenagem torácica, além do antibiótico.` }); tx.push('Complicado: ' + comp.join(', ')); }
        if (has('ada')) { rows.push(['ADA', `${fmt(v.ada, 0)} U/L`]); if (v.ada > 40) { al.push({ lvl: 'warn', text: 'ADA acima de 40 U/L em exsudato com predomínio de linfócitos: muito sugestivo de tuberculose pleural no Brasil. Também sobe em empiema e linfoma.' }); tx.push('ADA > 40'); } }
        if (has('tg')) { rows.push(['Triglicerídeos', `${fmt(v.tg, 0)} mg/dL`]); if (v.tg > 110) { al.push({ lvl: 'warn', text: 'Triglicerídeos acima de 110 mg/dL: quilotórax.' }); tx.push('quilotórax'); } else if (v.tg < 50) rows.push(['Quilotórax', 'improvável (TG < 50 mg/dL)']); }
        if (has('htl') && has('hts') && v.hts > 0) { const r = v.htl / v.hts; rows.push(['Hematócrito líquido/sangue', fmt(r, 2)]); if (r >= 0.5) { al.unshift({ lvl: 'crit', text: 'Hematócrito do líquido ≥ 50% do sanguíneo: hemotórax. Dreno de grosso calibre e avaliação cirúrgica.' }); tx.push('hemotórax'); } }
      }
      if (m === 'as') {
        if (has('albs') && has('albl')) {
          const gasa = v.albs - v.albl;
          main = { label: 'GASA (soro menos ascite)', value: fmt(gasa, 2), unit: 'g/dL' };
          const port = gasa >= 1.1, alta = has('ptl') && v.ptl >= 2.5;
          rows.push(['Interpretação', port ? (has('ptl') ? (alta ? 'Hipertensão portal com proteína ≥ 2,5: causa cardíaca, Budd-Chiari ou síndrome de obstrução sinusoidal' : 'Hipertensão portal com proteína < 2,5: cirrose (mais comum)') : 'Hipertensão portal (cirrose, insuficiência cardíaca, Budd-Chiari)')
            : 'Sem hipertensão portal: carcinomatose peritoneal, tuberculose, pancreatite, síndrome nefrótica, serosite']);
          tx.push(`GASA ${fmt(gasa, 2)} g/dL (${port ? '≥ 1,1, hipertensão portal' : '< 1,1, sem hipertensão portal'})`);
        }
        if (has('ptl') && v.ptl < 1.5) al.push({ lvl: 'info', text: 'Proteína do líquido abaixo de 1,5 g/dL em cirrótico: considerar profilaxia de PBE, conforme critérios de função hepática e renal.' });
        if (has('pmn')) {
          const corr = has('hem') ? Math.max(0, v.pmn - v.hem / 250) : v.pmn;
          rows.push(['Neutrófilos' + (has('hem') ? ' (corrigidos por hemácias, 1 para cada 250)' : ''), `${fmt(corr, 0)}/mm³`]);
          if (corr >= 250) {
            const sec = [];
            if (has('ptl') && v.ptl > 1) sec.push('proteína > 1 g/dL');
            if (has('gli') && v.gli < 50) sec.push('glicose < 50 mg/dL');
            if (has('ldl') && has('lsn') && v.ldl > v.lsn) sec.push('LDH acima do limite sérico');
            if (sec.length >= 2) al.unshift({ lvl: 'crit', text: `Neutrófilos ≥ 250/mm³ com critérios de Runyon (${sec.join('; ')}): suspeitar de peritonite bacteriana SECUNDÁRIA (perfuração, abscesso). Fazer TC de abdome e avaliar cirurgia.` });
            else al.unshift({ lvl: 'crit', text: 'Neutrófilos ≥ 250/mm³: peritonite bacteriana espontânea. Iniciar ceftriaxona 1 a 2 g/dia (ou cefotaxima 2 g de 8/8 h) após colher a cultura, e albumina 1,5 g/kg no 1º dia e 1 g/kg no 3º dia (indicada principalmente se creatinina > 1 mg/dL, ureia > 60 mg/dL ou bilirrubina > 4 mg/dL).' });
            tx.push('PMN ≥ 250: PBE' + (sec.length >= 2 ? ' (suspeita de secundária)' : ''));
          } else tx.push(`PMN ${fmt(corr, 0)}/mm³ (< 250)`);
          if (!main) main = { label: 'Neutrófilos no líquido', value: fmt(corr, 0), unit: '/mm³' };
        }
      }
      if (m === 'lcr') {
        let cel = v.cel;
        if (has('cel') && has('hem')) { cel = Math.max(0, v.cel - v.hem / 700); rows.push(['Leucócitos corrigidos (acidente de punção)', `${fmt(cel, 0)}/mm³ (desconta 1 para cada 700 hemácias)`]); }
        if (has('gli') && has('gls') && v.gls > 0) rows.push(['Glicose liquor/sangue', `${fmt(v.gli / v.gls, 2)} (normal ≥ 0,6; bacteriana costuma ser < 0,4)`]);
        const bac = [];
        if (has('cel') && cel >= 1000) bac.push('leucócitos ≥ 1.000');
        if (has('neu') && has('cel') && v.neu >= 50 && cel > 5) bac.push('predomínio de neutrófilos');
        if (has('gli') && has('gls') && v.gls > 0 && v.gli / v.gls < 0.4) bac.push('glicose liquor/sangue < 0,4');
        if (has('ptn') && v.ptn > 220) bac.push('proteína > 220 mg/dL');
        if (has('lac') && v.lac > 3.5) bac.push('lactato > 3,5 mmol/L');
        if (has('cel')) {
          main = { label: 'Leucócitos no liquor', value: fmt(cel, 0), unit: '/mm³' };
          if (bac.length) al.unshift({ lvl: 'crit', text: `Padrão sugestivo de meningite bacteriana (${bac.join('; ')}). Não atrasar antibiótico e dexametasona.` });
          else if (cel > 5) al.unshift({ lvl: 'warn', text: 'Pleocitose sem critérios bacterianos: padrão viral é o mais comum (linfócitos, glicose normal, proteína < 100 mg/dL). Glicose baixa com linfócitos e proteína alta sugere tuberculose ou fungo (criptococo).' });
          else rows.push(['Celularidade', 'normal (até 5/mm³ no adulto)']);
          tx.push(`${fmt(cel, 0)} leucócitos/mm³` + (bac.length ? '; padrão bacteriano: ' + bac.join(', ') : ''));
        }
        al.push({ lvl: 'info', text: 'Referência no adulto: até 5 leucócitos/mm³, proteína de 15 a 45 mg/dL, glicose acima de 60% da glicemia. Recém-nascidos têm valores maiores.' });
      }
      if (m === 'sin') {
        if (has('cel')) {
          const c = v.cel, cl = c < 200 ? 'Normal' : c < 2000 ? 'Não inflamatório' : c < 50000 ? 'Inflamatório' : 'Séptico provável';
          main = { label: 'Classificação', value: cl, small: true };
          rows.push(['Leucócitos', `${fmt(c, 0)}/mm³` + (has('neu') ? `, ${fmt(v.neu, 0)}% neutrófilos` : '')]);
          if (c >= 50000 || (has('neu') && v.neu >= 90)) al.unshift({ lvl: 'crit', text: 'Leucócitos ≥ 50.000/mm³ (ou neutrófilos ≥ 90%): tratar como artrite séptica até a cultura, com antibiótico EV e avaliação ortopédica para lavagem.' });
          else if (c >= 2000) al.push({ lvl: 'warn', text: 'Líquido inflamatório (2.000 a 50.000/mm³): gota, pseudogota, artrite reumatoide, espondiloartrites; artrite séptica parcialmente tratada ou gonocócica também pode ficar nessa faixa.' });
          tx.push(`${fmt(c, 0)} leucócitos/mm³ (${cl.toLowerCase()})`);
        }
        if (v.cri === 'u') al.push({ lvl: 'info', text: 'Urato monossódico (agulha, birrefringência negativa): gota. Cristais não excluem infecção concomitante.' });
        if (v.cri === 'p') al.push({ lvl: 'info', text: 'Pirofosfato de cálcio (romboide, birrefringência fraca positiva): pseudogota. Cristais não excluem infecção concomitante.' });
      }
      const table = { title: 'Exames a pedir: ' + E.t.toLowerCase(), head: ['Exame', 'Como colher'], rows: E.rows };
      if (!main) al.unshift({ lvl: 'info', text: 'Preencha os resultados que tiver para a interpretação. Abaixo, o que pedir e como colher.' });
      return { main, rows, alerts: al, table, text: tx.length ? `${E.t}: ${tx.join('; ')}.` : `Exames do ${E.t.toLowerCase()}: ${E.rows.map(r => r[0]).join(', ')}.` };
    }
  };

  D.add(sedproc);
  D.add(liquidos);
})();
