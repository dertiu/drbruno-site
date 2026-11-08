/* Soro de manutenção para pacientes em dieta zero (adulto e criança) */
(function () {
  'use strict';
  const D = window.DRB, u = D.u, F = D.f, fmt = u.fmt;
  const KCL = 2.56, NACL = 3.4, SF_NA = 0.154; // mEq/mL (KCl 19,1%, NaCl 20%) e mEq/mL do SF 0,9%

  const modo = v => v.mode || (isFinite(v.age) && v.age < 18 ? 'ped' : 'ad');

  /* ---------- adulto ---------- */
  function adulto(v) {
    const al = [], kg0 = v.kg;
    if (kg0 < 35) al.push({ lvl: 'warn', text: 'Peso baixo para o modo Adulto. Se o paciente tem menos de 18 anos, selecione Criança.' });
    const kg = Math.min(kg0, 100);
    if (kg0 > 100) al.push({ lvl: 'info', text: 'Peso acima de 100 kg: o cálculo foi limitado a 100 kg. Em obesidade, use o peso ideal ou ajustado.' });
    const perKg = v.cond === 'r' ? 25 : 30, alvoTxt = v.cond === 'r' ? '20 a 25' : '25 a 30', alvo = kg * perKg;
    const bags = Math.max(2, v.cond === 'r' ? Math.floor(alvo / 500) : Math.round(alvo / 500)), vol = bags * 500, rate = vol / 24;
    const comK = v.k !== 'n', est = v.est || 'alt';
    let sf = 0, sg = bags, naMl = 0;
    if (est === 'alt') { sf = Math.max(1, Math.round(bags / 3)); sg = bags - sf; }
    else naMl = Math.max(1, Math.round(1.5 * kg / bags / NACL));
    const kMl = comK ? Math.min(7, Math.max(1, Math.round(kg / bags / KCL))) : 0;
    const naTot = sf * 500 * SF_NA + bags * naMl * NACL, kTot = bags * kMl * KCL, gl = sg * 25;
    const kConc = kMl * KCL * 2; // mEq/L
    const aditivos = [kMl ? `KCl 19,1% ${kMl} mL (${fmt(kMl * KCL, 1)} mEq)` : '', naMl ? `NaCl 20% ${naMl} mL (${fmt(naMl * NACL, 1)} mEq)` : ''].filter(Boolean).join(' + ');
    const comp = [`SG 5% 500 mL × ${sg}`, sf ? `SF 0,9% 500 mL × ${sf}` : ''].filter(Boolean).join(' e ');
    const rows = [
      ['Volume em 24 h', `${fmt(vol, 0)} mL (${fmt(vol / kg, 0)} mL/kg/dia; alvo ${alvoTxt} mL/kg/dia)`],
      ['Vazão', `${fmt(rate, 0)} mL/h (1 bolsa de 500 mL a cada ${fmt(24 / bags, 1)} h)`],
      ['Bolsas em 24 h', `${bags} bolsas: ${comp}`],
      ['Aditivos em cada bolsa', aditivos || 'nenhum'],
      ['Sódio oferecido', `${fmt(naTot, 0)} mEq/dia (${fmt(naTot / kg, 1)} mEq/kg; referência 1 a 2)`],
      ['Potássio oferecido', comK ? `${fmt(kTot, 0)} mEq/dia (${fmt(kTot / kg, 1)} mEq/kg; referência cerca de 1)` : 'não incluído'],
      ['Glicose oferecida', `${fmt(gl, 0)} g/dia (${fmt(gl * 3.4, 0)} kcal; referência de 50 a 100 g/dia para evitar cetose)`]
    ];
    if (comK) al.unshift({ lvl: 'warn', text: 'Potássio só com diurese presente (cerca de 0,5 mL/kg/h) e K⁺ sérico menor que 5. Sem exame ou com DRC/oligúria, prescreva sem potássio.' });
    if (kConc > 40) al.push({ lvl: 'warn', text: `KCl a ${fmt(kConc, 0)} mEq/L: acima de 40 mEq/L em veia periférica. Use acesso central ou reduza o KCl por bolsa.` });
    if (est === 'sg') al.push({ lvl: 'warn', text: 'Esquema só com SG 5% e NaCl 20% é hipotônico: risco de hiponatremia, principalmente em pós-operatório, dor, náuseas e uso de diurético. Dose o Na⁺ em 24 h.' });
    if (v.cond === 'r') al.push({ lvl: 'info', text: 'Volume reduzido (20 a 25 mL/kg/dia) para idoso frágil, ICC, cirrose, DRC ou desnutrição. Reavalie diariamente o balanço hídrico e os sinais de congestão.' });
    if (gl < 50) al.push({ lvl: 'warn', text: `Glicose oferecida de ${fmt(gl, 0)} g/dia, abaixo de 50 g/dia: risco de cetose em jejum prolongado. Considere SG 10% ou iniciar suporte nutricional.` });
    al.push({ lvl: 'info', text: 'Isto é apenas manutenção. Perdas extras (febre, sonda nasogástrica, drenos, diarreia, vômitos) devem ser repostas à parte, volume a volume, com SF 0,9% ou Ringer lactato. Hipovolemia ou choque pedem expansão antes da manutenção.' });
    al.push({ lvl: 'info', text: 'Diabéticos em dieta zero: glicemia capilar de 6 em 6 h e ajuste de insulina; a glicose do soro não substitui o controle glicêmico.' });
    const steps = [
      { t: 'Antes de prescrever', d: 'Confirme que o paciente não está hipovolêmico, veja Na⁺ e K⁺ recentes, creatinina e se há diurese. Corrija déficits antes de manter.' },
      { t: 'Prescrição', d: `${comp}${aditivos ? ', cada bolsa com ' + aditivos : ''}. Infundir ${fmt(rate, 0)} mL/h em bomba, trocando a bolsa a cada ${fmt(24 / bags, 1)} h.` },
      { t: 'Acompanhamento', d: 'Balanço hídrico e diurese a cada turno, peso diário se possível, Na⁺ e K⁺ em 24 h (antes se perdas altas ou hiponatremia), glicemia capilar se diabético ou sepse. Reavalie diariamente se ainda precisa de via venosa.' }
    ];
    const text = `Dieta zero. Hidratação venosa de manutenção (${fmt(kg, 0)} kg): ${comp}${aditivos ? ', cada bolsa com ' + aditivos : ''}. EV a ${fmt(rate, 0)} mL/h (${bags} bolsas em 24 h). Oferta/dia: Na ${fmt(naTot, 0)} mEq, K ${fmt(kTot, 0)} mEq, glicose ${fmt(gl, 0)} g.`;
    return { main: { label: 'Vazão de manutenção', value: fmt(rate, 0), unit: 'mL/h' }, sub: `${fmt(vol, 0)} mL em 24 h`, rows, steps, alerts: al, text };
  }

  /* ---------- criança ---------- */
  function crianca(v) {
    const kg = v.kg, al = [];
    if (isFinite(v.age) && v.age < 28 / 365) return { alerts: [{ lvl: 'crit', text: 'Recém-nascido (menos de 28 dias): a manutenção depende dos dias de vida, da prematuridade e da taxa de infusão de glicose. Use o protocolo neonatal do serviço.' }] };
    const holl = kg <= 10 ? 100 * kg : kg <= 20 ? 1000 + 50 * (kg - 10) : 1500 + 20 * (kg - 20);
    const man = Math.min(holl, 2400), pct = Number(v.rest || 100), vol = man * pct / 100, rate = vol / 24;
    const comK = v.k !== 'n', kMl500 = comK ? 4 : 0;
    // por 100 mL de SG 5%: NaCl 20% 4,4 mL (isotônico) e KCl 19,1% 0,8 mL (cerca de 20 mEq/L)
    const nacl = vol / 100 * 4.4, kcl = comK ? vol / 100 * 0.8 : 0;
    const naTot = nacl * NACL, kTot = kcl * KCL, tig = 50 * rate / 60 / kg;
    const rows = [
      ['Volume em 24 h', `${fmt(vol, 0)} mL (Holliday-Segar${pct < 100 ? ' a ' + pct + '%' : ''}${holl > 2400 ? ', limitado a 2.400 mL' : ''})`],
      ['Vazão', `${fmt(rate, 1)} mL/h`],
      ['Solução por bolsa de 500 mL', `SG 5% 500 mL + NaCl 20% 22 mL${kMl500 ? ' + KCl 19,1% ' + kMl500 + ' mL' : ''}`],
      ['Solução por 100 mL (bureta)', `SG 5% 100 mL + NaCl 20% 4,4 mL${comK ? ' + KCl 19,1% 0,8 mL' : ''}`],
      ['Aditivos em 24 h', `NaCl 20% ${fmt(nacl, 1)} mL${comK ? ' e KCl 19,1% ' + fmt(kcl, 1) + ' mL' : ''}`],
      ['Sódio oferecido', `${fmt(naTot, 0)} mEq/dia (${fmt(naTot / kg, 1)} mEq/kg; solução isotônica, cerca de 143 mEq/L)`],
      ['Potássio oferecido', comK ? `${fmt(kTot, 0)} mEq/dia (${fmt(kTot / kg, 1)} mEq/kg; cerca de 20 mEq/L)` : 'não incluído'],
      ['Taxa de infusão de glicose (TIG)', `${fmt(tig, 1)} mg/kg/min`]
    ];
    if (comK) al.push({ lvl: 'warn', text: 'Potássio só com diurese presente e K⁺ sérico conhecido e menor que 5. Sem exame ou com oligúria, prescreva sem potássio.' });
    al.push({ lvl: 'info', text: 'Solução isotônica (cerca de NaCl 0,9% com glicose 5%) é a recomendada para crianças de 28 dias a 18 anos em manutenção, para reduzir o risco de hiponatremia (diretriz da AAP, 2018). A mistura SG 5% + SF 0,9% meio a meio é hipotônica (equivale a NaCl 0,45%) e deve ser evitada.' });
    if (tig < 4) al.push({ lvl: 'info', text: 'TIG abaixo de 4 mg/kg/min: aceitável em criança maior; em lactente ou risco de hipoglicemia, monitore a glicemia ou aumente a glicose.' });
    if (tig > 8) al.push({ lvl: 'warn', text: 'TIG acima de 8 mg/kg/min: risco de hiperglicemia. Revise a concentração.' });
    if (pct < 100) al.push({ lvl: 'info', text: 'Restrição a 2/3 da manutenção: usada quando há risco de secreção inapropriada de ADH (pós-operatório, pneumonia, bronquiolite, doença do sistema nervoso central). Acompanhe o Na⁺.' });
    al.push({ lvl: 'info', text: 'Isto é apenas manutenção. Desidratação e choque pedem expansão (20 mL/kg) e reposição do déficit antes; veja a ferramenta Hidratação venosa pediátrica completa. Perdas extras são repostas à parte.' });
    const steps = [
      { t: 'Antes de prescrever', d: 'Avalie perfusão e hidratação. Se há desidratação ou choque, trate antes. Dose Na⁺, K⁺ e glicemia se o jejum for prolongado ou a criança estiver grave.' },
      { t: 'Prescrição', d: `SG 5% 500 mL + NaCl 20% 22 mL${kMl500 ? ' + KCl 19,1% ' + kMl500 + ' mL' : ''}, EV a ${fmt(rate, 1)} mL/h em bomba de infusão.` },
      { t: 'Acompanhamento', d: 'Diurese e balanço, peso diário, Na⁺ e glicemia em 24 h (antes se vômitos, diarreia ou Na⁺ em queda). Se Na⁺ cair, reavalie volume e restrinja água livre. Reavalie diariamente a necessidade da via venosa.' }
    ];
    const text = `Dieta zero. Hidratação venosa de manutenção (${fmt(kg, 1)} kg): SG 5% 500 mL + NaCl 20% 22 mL${kMl500 ? ' + KCl 19,1% ' + kMl500 + ' mL' : ''}, EV a ${fmt(rate, 1)} mL/h (${fmt(vol, 0)} mL/24 h). TIG ${fmt(tig, 1)} mg/kg/min.`;
    return { main: { label: 'Vazão de manutenção', value: fmt(rate, 1), unit: 'mL/h' }, sub: `${fmt(vol, 0)} mL em 24 h`, rows, steps, alerts: al, text };
  }

  const mant = {
    id: 'mant', g: 'vent', title: 'Soro de manutenção (dieta zero)', desc: 'Prescrição pronta de hidratação venosa de manutenção para adulto e criança: vazão, bolsas, aditivos, sódio, potássio e glicose',
    kw: 'soro manutencao dieta zero jejum npo hidratacao venosa prescricao sg 5 sf 0,9 kcl cloreto potassio sodio glicose bolsa holliday segar adulto crianca pos operatorio nada via oral',
    disc: 'Referências: adulto 25 a 30 mL/kg/dia, Na⁺ 1 a 2 mEq/kg, K⁺ cerca de 1 mEq/kg e glicose de 50 a 100 g por dia (NICE); criança pelo Holliday-Segar com solução isotônica (AAP 2018). Ajuste ao paciente, aos exames e ao protocolo do serviço.',
    fields: v => {
      const m = modo(v), out = [F.SEG('mode', '', [['ad', 'Adulto'], ['ped', 'Criança']], { def: m }), F.KG(), F.AGE()];
      if (m === 'ad') out.push(
        F.SEL('cond', 'Condição', [['n', 'Sem restrições (30 mL/kg/dia)'], ['r', 'Idoso frágil, ICC, cirrose, DRC ou desnutrido (20 a 25 mL/kg/dia)']], { def: 'n' }),
        F.SEL('est', 'Tipo de soro', [['alt', 'SG 5% e SF 0,9% (2:1) com KCl'], ['sg', 'Só SG 5% com NaCl 20% e KCl (hipotônico)']], { def: 'alt' }));
      else out.push(F.SEL('rest', 'Volume', [['100', '100% da manutenção'], ['67', 'Restrito a 2/3 (risco de ADH aumentado)']], { def: '100' }));
      out.push(F.SEL('k', 'Potássio', [['s', 'Com KCl (diurese presente e K⁺ menor que 5)'], ['n', 'Sem KCl (oligúria, DRC, K⁺ alto ou sem exame)']], { def: 's' }));
      return out;
    },
    calc: v => {
      if (!(v.kg > 0)) return { alerts: [{ lvl: 'warn', text: 'Informe o peso.' }] };
      return modo(v) === 'ped' ? crianca(v) : adulto(v);
    }
  };

  D.add(mant);
})();
