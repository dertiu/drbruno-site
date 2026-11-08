/* Pediatria e emergência, fluidos */
(function () {
  'use strict';
  const D = window.DRB, u = D.u, F = D.f, fmt = u.fmt;

  /* ---------- Kit de reanimação pediátrica ---------- */
  const kit = {
    id: 'pedkit', g: 'ped', title: 'Reanimação pediátrica: doses por peso', desc: 'Adrenalina, amiodarona, atropina, adenosina, choques, volume, glicose, bicarbonato, cálcio e anticonvulsivantes',
    kw: 'pcr parada reanimacao pediatrica pals adrenalina choque desfibrilacao cardioversao bolus glicose bicarbonato crianca emergencia pediatria',
    disc: 'Doses de referência do PALS/AHA e diretrizes brasileiras. Confira a diretriz vigente e use fita/tabela de peso quando o peso for estimado.',
    fields: [F.KG(), F.AGE()],
    calc: v => {
      const kg = v.kg; if (!(kg > 0)) return { alerts: [{ lvl: 'warn', text: 'Informe o peso (ou estime pela idade na ferramenta “Parâmetros pediátricos”).' }] };
      const mn = (a, b) => Math.min(a, b), mx = (a, b) => Math.max(a, b), a = x => u.auto(x);
      const R = [
        { sec: 'Parada cardiorrespiratória' },
        ['Adrenalina IV/IO (0,01 mg/kg)', `${a(mn(0.01 * kg, 1))} mg`, `${a(mn(0.1 * kg, 10))} mL de 0,1 mg/mL; a cada 3 a 5 min`],
        ['Amiodarona (5 mg/kg)', `${a(mn(5 * kg, 300))} mg`, `${a(mn(5 * kg, 300) / 50)} mL de 50 mg/mL; FV/TV sem pulso`],
        ['Lidocaína (1 mg/kg)', `${a(mn(1 * kg, 100))} mg`, `${a(mn(1 * kg, 100) / 20)} mL de 2%; alternativa à amiodarona`],
        ['Desfibrilação (FV/TV sem pulso)', `${a(2 * kg)} J`, `1º choque 2 J/kg; 2º 4 J/kg; seguintes ≥ 4 J/kg (máx. 10 J/kg ou dose adulta)`],
        { sec: 'Arritmias com pulso' },
        ['Adenosina (0,1 mg/kg, depois 0,2 mg/kg)', `${a(mn(0.1 * kg, 6))} mg → ${a(mn(0.2 * kg, 12))} mg`, `${a(mn(0.1 * kg, 6) / 3)} mL → ${a(mn(0.2 * kg, 12) / 3)} mL de 3 mg/mL; bolus rápido + flush`],
        ['Cardioversão sincronizada', `${a(0.5 * kg)} a ${a(kg)} J`, `1ª carga 0,5 a 1 J/kg; seguintes 2 J/kg`],
        ['Atropina (0,02 mg/kg)', `${a(mn(mx(0.02 * kg, 0.1), 0.5))} mg`, `${a(mn(mx(0.02 * kg, 0.1), 0.5) / 0.25)} mL de 0,25 mg/mL; mín. 0,1 mg e máx. 0,5 mg`],
        { sec: 'Volume e metabólico' },
        ['Bolus de cristaloide (20 mL/kg)', `${a(20 * kg)} mL`, 'SF 0,9% ou Ringer em 5 a 20 min; reavaliar a cada bolus'],
        ['Glicose (0,5 a 1 g/kg)', `${a(0.5 * kg)} a ${a(kg)} g`, `${a(5 * kg)} a ${a(10 * kg)} mL de glicose 10%`],
        ['Bicarbonato de sódio (1 mEq/kg)', `${a(kg)} mEq`, `${a(kg)} mL de 8,4% (diluir 1:1 em lactentes)`],
        ['Gluconato de cálcio 10% (50 a 100 mg/kg)', `${a(mn(50 * kg, 2000))} a ${a(mn(100 * kg, 2000))} mg`, `${a(mn(0.5 * kg, 20))} a ${a(mn(kg, 20))} mL em 10 min`],
        { sec: 'Convulsão e antídotos' },
        ['Midazolam (0,1 a 0,2 mg/kg)', `${a(mn(0.1 * kg, 10))} a ${a(mn(0.2 * kg, 10))} mg`, `${a(mn(0.1 * kg, 10) / 5)} a ${a(mn(0.2 * kg, 10) / 5)} mL de 5 mg/mL; IM/IN 0,2 mg/kg`],
        ['Diazepam (0,2 a 0,5 mg/kg)', `${a(mn(0.2 * kg, 10))} a ${a(mn(0.5 * kg, 10))} mg`, `${a(mn(0.2 * kg, 10) / 5)} a ${a(mn(0.5 * kg, 10) / 5)} mL de 5 mg/mL`],
        ['Levetiracetam (40 a 60 mg/kg)', `${a(mn(40 * kg, 4500))} a ${a(mn(60 * kg, 4500))} mg`, `${a(mn(40 * kg, 4500) / 100)} a ${a(mn(60 * kg, 4500) / 100)} mL de 100 mg/mL`],
        ['Naloxona (0,1 mg/kg)', `${a(mn(0.1 * kg, 2))} mg`, `${a(mn(0.1 * kg, 2) / 0.4)} mL de 0,4 mg/mL (depressão respiratória: iniciar com 0,01 mg/kg)`]
      ];
      const txt = `Peso ${fmt(kg, 1)} kg: adrenalina ${a(mn(0.01 * kg, 1))} mg (${a(mn(0.1 * kg, 10))} mL de 0,1 mg/mL); amiodarona ${a(mn(5 * kg, 300))} mg; choque ${a(2 * kg)} J; bolus ${a(20 * kg)} mL.`;
      return { main: { label: 'Peso utilizado', value: fmt(kg, 1), unit: 'kg' }, table: { head: ['Item', 'Dose', 'Volume / observação'], rows: R }, text: txt };
    }
  };

  /* ---------- Parâmetros pediátricos ---------- */
  const BANDS = [[1, '< 1 ano', '110 a 160', '30 a 40', '70 a 90'], [2, '1 a 2 anos', '100 a 150', '25 a 35', '80 a 95'], [5, '2 a 5 anos', '95 a 140', '25 a 30', '80 a 100'],
    [12, '5 a 12 anos', '80 a 120', '20 a 25', '90 a 110'], [200, '> 12 anos', '60 a 100', '15 a 20', '100 a 120']];
  const LMA = [[5, '1'], [10, '1,5'], [20, '2'], [30, '2,5'], [50, '3'], [70, '4'], [100, '5'], [1000, '6']];
  const vit = {
    id: 'pedvit', g: 'ped', title: 'Parâmetros pediátricos por idade', desc: 'Sinais vitais esperados, limite de hipotensão, peso estimado, tubo orotraqueal e máscara laríngea',
    kw: 'pediatria sinais vitais frequencia cardiaca respiratoria pressao hipotensao peso estimado tubo orotraqueal tot cuff mascara laringea crianca idade',
    fields: [F.AGE(), F.KG({ hint: 'Opcional: usado para o tamanho da máscara laríngea' })],
    calc: v => {
      const y = v.age; if (!isFinite(y)) return null;
      const m = y * 12, rows = [], al = [];
      const b = BANDS.find(x => y < x[0]) || BANDS[4];
      rows.push(['Frequência cardíaca (acordado)', `${b[2]} bpm`], ['Frequência respiratória', `${b[3]} irpm`], ['Pressão sistólica esperada', `${b[4]} mmHg`]);
      const hipo = m < 1 ? 60 : y < 1 ? 70 : y <= 10 ? 70 + 2 * y : 90;
      rows.push(['Hipotensão (PAS menor que)', `${fmt(hipo, 0)} mmHg`]);
      const est = y < 1 ? 0.5 * m + 4 : y <= 5 ? 2 * y + 8 : y <= 12 ? 3 * y + 7 : null;
      if (est != null) rows.push(['Peso estimado (APLS)', `${fmt(est, 1)} kg`]);
      if (y >= 1) { rows.push(['Tubo orotraqueal com cuff', `${fmt(y / 4 + 3.5, 1)} mm`], ['Tubo sem cuff', `${fmt(y / 4 + 4, 1)} mm`], ['Fixação oral (3 × diâmetro do tubo)', `${fmt(3 * (y / 4 + 3.5), 1)} cm na rima labial`]); }
      else rows.push(['Tubo orotraqueal', m < 1 ? '3,0 a 3,5 mm (RN a termo)' : '3,5 mm (com cuff 3,0 a 3,5)'], ['Fixação oral', m < 1 ? '9 a 10,5 cm na rima labial (≈ peso + 6)' : '10,5 cm na rima labial']);
      const kg = isFinite(v.kg) ? v.kg : est;
      if (kg > 0) { const l = LMA.find(x => kg < x[0]); rows.push([`Máscara laríngea (${fmt(kg, 0)} kg)`, `tamanho ${l ? l[1] : '6'}`]); }
      al.push({ lvl: 'info', text: 'Tamanhos de tubo e valores vitais são referências: confirme com laringoscopia e capnografia e tenha um tubo 0,5 mm menor e outro maior disponíveis. Em RN e lactentes jovens, valores de FC e FR variam com o estado de vigília.' });
      return { main: { label: 'Faixa etária', value: b[1], small: true }, rows, alerts: al, text: `Idade ${fmt(y, 2)} anos: FC ${b[2]}, FR ${b[3]}, hipotensão PAS < ${fmt(hipo, 0)} mmHg${est != null ? ', peso estimado ' + fmt(est, 1) + ' kg' : ''}.` };
    }
  };

  /* ---------- Fluidos ---------- */
  const fluid = {
    id: 'fluid', g: 'vent', title: 'Fluidos: manutenção, desidratação e queimados', desc: 'Holliday-Segar, déficit de água, bolus de ressuscitação e fórmula de Parkland',
    kw: 'fluidos manutencao holliday segar hidratacao desidratacao bolus ressuscitacao parkland queimado queimadura superficie corporal queimada volume soro',
    fields: v => {
      const m = v.mode || 'man';
      const out = [F.SEG('mode', '', [['man', 'Manutenção'], ['des', 'Desidratação'], ['bol', 'Bolus'], ['que', 'Queimadura']], { def: 'man' }), F.KG()];
      if (m === 'des') out.push(F.SEL('pct', 'Grau de desidratação', [['5', 'Leve (~5%)'], ['10', 'Moderada (~10%)'], ['15', 'Grave (~15%)']], { def: '5' }));
      if (m === 'bol') out.push(F.SEL('mlkg', 'Volume do bolus', [['20', '20 mL/kg (padrão)'], ['10', '10 mL/kg (cardiopatia, desnutrição grave, choque cardiogênico)'], ['30', '30 mL/kg (sepse do adulto)']], { def: '20' }));
      if (m === 'que') out.push(F.N('sc', 'Superfície corporal queimada (2º e 3º graus)', { unit: '%', full: true }), F.SEL('faixa', 'Paciente', [['a', 'Adulto (4 mL/kg/%)'], ['c', 'Criança (3 mL/kg/% + manutenção)']], { def: 'a' }), F.N('t', 'Horas desde a queimadura', { unit: 'h', def: 0, full: true }));
      return out;
    },
    calc: v => {
      const kg = v.kg, m = v.mode || 'man'; if (!(kg > 0)) return { alerts: [{ lvl: 'warn', text: 'Informe o peso.' }] };
      if (m === 'man') {
        const dia = kg <= 10 ? 100 * kg : kg <= 20 ? 1000 + 50 * (kg - 10) : 1500 + 20 * (kg - 20), h = kg <= 10 ? 4 * kg : kg <= 20 ? 40 + 2 * (kg - 10) : 60 + (kg - 20);
        return { main: { label: 'Manutenção (Holliday-Segar)', value: fmt(dia, 0), unit: 'mL/dia' }, rows: [['Vazão pela regra 4-2-1', `${fmt(h, 1)} mL/h`], ['Regra 4-2-1', '4 mL/kg/h (10 kg) + 2 mL/kg/h (10 a 20 kg) + 1 mL/kg/h (> 20 kg)'], ['Eletrólitos (por 100 mL)', 'Na⁺ 3 mEq e K⁺ 2 mEq']],
          alerts: [{ lvl: 'info', text: 'Em crianças hospitalizadas, preferir soluções isotônicas (SF 0,9% com glicose e potássio) para reduzir o risco de hiponatremia. Adultos: ~25 a 30 mL/kg/dia.' }], text: `Manutenção ${fmt(dia, 0)} mL/dia (${fmt(h, 1)} mL/h) para ${fmt(kg, 1)} kg.` };
      }
      if (m === 'des') {
        const p = Number(v.pct), def = kg * p * 10, dia = kg <= 10 ? 100 * kg : kg <= 20 ? 1000 + 50 * (kg - 10) : 1500 + 20 * (kg - 20);
        return { main: { label: 'Déficit estimado', value: fmt(def, 0), unit: 'mL' }, rows: [['Manutenção em 24 h', `${fmt(dia, 0)} mL`], ['Total em 24 h (déficit + manutenção)', `${fmt(def + dia, 0)} mL`], ['Vazão média em 24 h', `${fmt((def + dia) / 24, 0)} mL/h`]],
          alerts: [{ lvl: 'info', text: 'Plano B (desidratação leve a moderada): SRO 50 a 100 mL/kg em 4 a 6 h. Plano C (grave): SF ou Ringer 20 mL/kg em bolus repetido até perfusão adequada, depois reposição conforme protocolo.' }], text: `Desidratação ~${p}%: déficit ${fmt(def, 0)} mL; total em 24 h ${fmt(def + dia, 0)} mL.` };
      }
      if (m === 'bol') {
        const k = Number(v.mlkg), vol = k * kg;
        return { main: { label: 'Bolus', value: fmt(vol, 0), unit: 'mL' }, rows: [['Dose', `${k} mL/kg`]], alerts: [{ lvl: 'info', text: 'Cristaloide balanceado ou SF 0,9% em 5 a 20 min (mais lento em suspeita de cardiopatia). Reavaliar perfusão, FC, PA, hepatomegalia e ausculta pulmonar após cada bolus.' }], text: `Bolus de cristaloide ${fmt(vol, 0)} mL (${k} mL/kg).` };
      }
      const sc = v.sc; if (!(sc > 0)) return { alerts: [{ lvl: 'info', text: 'Informe a superfície corporal queimada.' }] };
      const f = v.faixa === 'c' ? 3 : 4, tot = f * kg * sc, t = isFinite(v.t) ? v.t : 0, rem = Math.max(0.5, 8 - t);
      const man = kg <= 10 ? 100 * kg : kg <= 20 ? 1000 + 50 * (kg - 10) : 1500 + 20 * (kg - 20);
      const rows = [['Primeiras 8 h (50%)', `${fmt(tot / 2, 0)} mL`], ['Vazão nas primeiras 8 h', `${fmt(tot / 2 / 8, 0)} mL/h`], ['Próximas 16 h (50%)', `${fmt(tot / 2, 0)} mL`], ['Vazão nas 16 h seguintes', `${fmt(tot / 2 / 16, 0)} mL/h`]];
      if (t > 0 && t < 8) rows.push(['Ajuste pelo atraso: restante da 1ª metade', `${fmt(tot / 2, 0)} mL em ${fmt(rem, 1)} h (${fmt(tot / 2 / rem, 0)} mL/h)`]);
      if (v.faixa === 'c') rows.push(['Manutenção adicional (criança)', `${fmt(man, 0)} mL/dia com glicose`]);
      return { main: { label: 'Parkland: volume em 24 h', value: fmt(tot, 0), unit: 'mL' }, rows,
        alerts: [{ lvl: 'info', text: 'Ringer lactato. Contar as 8 h a partir do momento da queimadura. Titular pela diurese: adulto 0,5 mL/kg/h; criança 1 mL/kg/h. Regra dos 9 (adulto): cabeça 9%, cada braço 9%, tronco anterior 18%, posterior 18%, cada perna 18%, genitais 1%. Palma da mão do paciente ≈ 1%.' }],
        text: `Parkland: ${f} mL × ${fmt(kg, 1)} kg × ${fmt(sc, 0)}% = ${fmt(tot, 0)} mL em 24 h (metade nas primeiras 8 h).` };
    }
  };

  /* ---------- Painel One-Click por peso ---------- */
  const ONE = [
    { sec: 'Analgésicos e antitérmicos' },
    { n: 'Dipirona gotas 500 mg/mL', f: kg => `${fmt(Math.min(kg, 40), 0)} gotas`, i: '6/6 h; máx. 40 gotas; acima de 3 meses', min: 0.25 },
    { n: 'Dipirona xarope 50 mg/mL', f: kg => `${a(Math.min(kg * 0.4, 20))} mL`, i: '6/6 h; máx. 20 mL; acima de 3 meses', min: 0.25 },
    { n: 'Dipirona injetável 500 mg/mL', f: kg => `${a(Math.min(kg / 20, 2))} mL IV`, i: 'Diluir; máx. 2 mL (1 g)', min: 0.25 },
    { n: 'Paracetamol gotas 200 mg/mL', f: kg => `${fmt(Math.min(kg, 50), 0)} gotas`, i: '6/6 h (10 mg/kg); máx. 50 gotas' },
    { n: 'Ibuprofeno gotas 50 mg/mL', f: kg => `${fmt(Math.min(2 * kg, 40), 0)} gotas`, i: '6/8 h; 2 gotas/kg; máx. 40 gotas; acima de 6 meses', min: 0.5 },
    { n: 'Ibuprofeno gotas 100 mg/mL', f: kg => `${fmt(Math.min(kg, 40), 0)} gotas`, i: '6/8 h; 1 gota/kg; máx. 40 gotas; acima de 6 meses', min: 0.5 },
    { sec: 'Antibióticos' },
    { n: 'Amoxicilina 250 mg/5 mL', f: kg => `${a(Math.min(kg / 3, 10))} mL`, i: '8/8 h; máx. 10 mL/dose (50 mg/kg/dia)' },
    { n: 'Amoxicilina + clavulanato (250 + 62,5 mg/5 mL)', f: kg => `${a(kg / 3)} mL`, i: '8/8 h' },
    { n: 'Azitromicina 200 mg/5 mL', f: kg => `${a(kg / 4)} mL`, i: '1x/dia (10 mg/kg), 3 a 5 dias' },
    { n: 'Cefalexina 250 mg/5 mL', f: kg => `${a(kg / 4)} mL`, i: '6/6 h (50 mg/kg/dia)' },
    { n: 'Ceftriaxona IV', f: kg => `${a(Math.min(50 * kg, 1000))} mg`, i: '50 mg/kg; máx. 1 g' },
    { sec: 'Corticoides e antialérgicos' },
    { n: 'Prednisolona 3 mg/mL', f: kg => `${a(Math.min(kg / 6, 10))} mL`, i: '12/12 h (1 mg/kg/dia); máx. 20 mL/dia' },
    { n: 'Dexametasona injetável (4 mg/mL)', f: kg => `${a(Math.min(0.3 * kg, 4) / 4)} mL (${a(Math.min(0.3 * kg, 4))} mg)`, i: '0,3 mg/kg; máx. 4 mg' },
    { n: 'Hidrocortisona IV', f: kg => `${a(5 * kg)} mg (asma) ou ${a(10 * kg)} mg (alergia grave)`, i: '5 mg/kg na asma; 10 mg/kg na reação alérgica' },
    { n: 'Dexclorfeniramina 2 mg/5 mL', f: (kg, y) => !isFinite(y) ? '1,25 mL (2 a 6 anos); 2,5 mL (6 a 12); 5 mL (≥ 12)' : y < 6 ? '1,25 mL' : y < 12 ? '2,5 mL' : '5 mL', i: '8/8 h, pela faixa etária da bula; acima de 2 anos', min: 2 },
    { sec: 'Antieméticos' },
    { n: 'Ondansetrona injetável (2 mg/mL)', f: kg => `${a(0.075 * kg)} mL (${a(0.15 * kg)} mg)`, i: '0,15 mg/kg IV lento; máx. 4 mg' },
    { n: 'Bromoprida gotas 4 mg/mL', f: kg => `${fmt(Math.min(kg, 30), 0)} gotas`, i: '8/8 h; máx. 30 gotas' }
  ];
  const a = x => u.auto(x);
  const one = {
    id: 'pedone', g: 'ped', title: 'Painel one-click por peso', desc: 'Digite só o peso: dipirona, ibuprofeno, paracetamol, antibióticos e corticoides em gotas e mL',
    kw: 'pediatria peso one click gotas xarope dipirona ibuprofeno paracetamol amoxicilina azitromicina prednisolona dexclorfeniramina cefalexina ceftriaxona ondansetrona bromoprida dexametasona hidrocortisona',
    disc: 'Fórmulas rápidas conforme o material de doses pediátricas do hospital. Confirme a concentração do frasco disponível, o intervalo e as contraindicações antes de prescrever.',
    fields: [F.KG(), F.AGE({ hint: 'Opcional: sinaliza fármacos com idade mínima' })],
    calc: v => {
      const kg = v.kg; if (!(kg > 0)) return { alerts: [{ lvl: 'warn', text: 'Digite o peso da criança.' }] };
      const age = v.age, rows = [], txt = [], al = [];
      ONE.forEach(o => {
        if (o.sec) { rows.push({ sec: o.sec }); return; }
        const dose = o.f(kg, age), blocked = isFinite(age) && o.min && age < o.min;
        rows.push([o.n + (blocked ? ' (idade abaixo da mínima)' : ''), blocked ? 'não usar' : dose, o.i]);
        if (!blocked) txt.push(`${o.n}: ${dose}`);
        else al.push({ lvl: 'warn', text: `${o.n}: não recomendado para esta idade.` });
      });
      if (kg < 5 || (isFinite(age) && age < 0.25)) al.unshift({ lvl: 'warn', text: 'Lactente pequeno: confirme cada dose, evite dipirona e ibuprofeno abaixo da idade mínima e avalie sinais de gravidade.' });
      return { main: { label: 'Peso', value: fmt(kg, 1), unit: 'kg' }, table: { head: ['Medicamento', 'Dose', 'Intervalo / observação'], rows }, alerts: al, text: `Doses pediátricas para ${fmt(kg, 1)} kg: ` + txt.join('; ') + '.' };
    }
  };

  /* ---------- Hidratação venosa pediátrica completa ---------- */
  const hid = {
    id: 'pedhid', g: 'ped', title: 'Hidratação venosa pediátrica completa', desc: 'Expansão, manutenção de Holliday-Segar, déficit, velocidade de infusão de glicose e eletrólitos',
    kw: 'hidratacao venosa pediatrica expansao holliday segar manutencao tig glicose sodio potassio meq 100 ml soro desidratacao crianca',
    disc: 'Em crianças hospitalizadas prefira solução isotônica (SF 0,9% com glicose 5% e potássio) para reduzir o risco de hiponatremia. Reavalie sempre, e ajuste ao sódio e à glicemia.',
    fields: v => [F.KG(), F.SEL('def', 'Déficit (desidratação)', [['0', 'Sem déficit'], ['5', 'Leve (5%)'], ['10', 'Moderada (10%)'], ['15', 'Grave (15%)']], { def: '0' }),
      F.SEL('exp', 'Fase rápida de expansão', [['0', 'Não necessária'], ['1', '1 bolus de 20 mL/kg'], ['2', '2 bolus de 20 mL/kg'], ['3', '3 bolus de 20 mL/kg']], { def: '0' }),
      F.SEL('gl', 'Glicose da solução de manutenção', [['5', 'Glicose 5%'], ['10', 'Glicose 10%']], { def: '5' })],
    calc: v => {
      const kg = v.kg; if (!(kg > 0)) return { alerts: [{ lvl: 'warn', text: 'Informe o peso.' }] };
      const man = kg <= 10 ? 100 * kg : kg <= 20 ? 1000 + 50 * (kg - 10) : 1500 + 20 * (kg - 20), mh = man / 24;
      const dpct = Number(v.def), defv = kg * dpct * 10, exp = Number(v.exp), expv = exp * 20 * kg;
      const gl = Number(v.gl), tig = gl * 10 * mh / 60 / kg; // mg/kg/min
      const na = 3 * man / 100, k = 2 * man / 100;
      const nacl = na / 3.4, kcl = k / 2.56;
      const rows = [];
      if (exp) rows.push(['Fase rápida', `${fmt(expv, 0)} mL de SF 0,9% ou Ringer (${exp} × 20 mL/kg), cada bolus em 10 a 20 min, reavaliando após cada um`]);
      rows.push(['Manutenção (Holliday-Segar)', `${fmt(man, 0)} mL/24 h = ${fmt(mh, 1)} mL/h`]);
      if (defv) rows.push(['Déficit (' + dpct + '%)', `${fmt(defv, 0)} mL: metade em 8 h e metade nas 16 h seguintes`], ['Manutenção + déficit', `${fmt(man + defv, 0)} mL em 24 h (${fmt((man + defv) / 24, 0)} mL/h em média)`]);
      rows.push(['Sódio (3 mEq/100 mL)', `${fmt(na, 0)} mEq/dia = ${fmt(nacl, 1)} mL de NaCl 20%`], ['Potássio (2 mEq/100 mL)', `${fmt(k, 0)} mEq/dia = ${fmt(kcl, 1)} mL de KCl 19,1%`],
        ['Taxa de infusão de glicose (TIG)', `${fmt(tig, 1)} mg/kg/min (manutenção com glicose ${gl}%)`]);
      const al = [];
      if (tig < 4) al.push({ lvl: 'info', text: 'TIG abaixo de 4 mg/kg/min: aceitável em crianças maiores com manutenção; em lactentes jovens ou risco de hipoglicemia, prefira glicose 10% ou monitore a glicemia.' });
      if (tig > 8) al.push({ lvl: 'warn', text: 'TIG acima de 8 mg/kg/min: risco de hiperglicemia; revisar a concentração de glicose.' });
      al.push({ lvl: 'info', text: 'Sugestão prática isotônica por 500 mL: SG 5% 500 mL + NaCl 20% 22 mL + KCl 19,1% ' + fmt(kcl / (man / 500), 1) + ' mL (Na⁺ cerca de 143 mEq/L e K⁺ cerca de 20 mEq/L). A mistura SG 5% + SF 0,9% meio a meio é hipotônica (equivale a NaCl 0,45%): evite em crianças internadas. Confira o Na⁺ sérico.' });
      al.push({ lvl: 'info', text: 'Só inclua potássio após diurese presente e K⁺ sérico conhecido.' });
      return { main: { label: 'Manutenção em 24 h', value: fmt(man, 0), unit: 'mL' }, rows, alerts: al,
        text: `Hidratação pediátrica (${fmt(kg, 1)} kg): manutenção ${fmt(man, 0)} mL/24 h (${fmt(mh, 1)} mL/h)${exp ? '; expansão ' + fmt(expv, 0) + ' mL' : ''}${defv ? '; déficit ' + fmt(defv, 0) + ' mL' : ''}; Na ${fmt(na, 0)} mEq/dia, K ${fmt(k, 0)} mEq/dia; TIG ${fmt(tig, 1)} mg/kg/min.` };
    }
  };

  /* ---------- Sinais vitais por idade (gráfico) ---------- */
  const VIT = [ // até idade (anos): [FC min, max], [FR min, max], PAS [min, hipotensão]
    [0.0833, [100, 205], [30, 60], [60, 90]], [0.25, [100, 190], [30, 60], [70, 100]], [1, [100, 180], [25, 50], [70, 105]], [3, [90, 150], [22, 40], [75, 110]],
    [6, [80, 140], [20, 34], [80, 115]], [12, [70, 120], [18, 30], [90, 120]], [200, [60, 100], [12, 20], [90, 125]]
  ];
  const zon = (lo, hi, mn, mx) => [[mn, lo * 0.85, 'crit'], [lo * 0.85, lo, 'warn'], [lo, hi, 'ok'], [hi, hi * 1.15, 'warn'], [hi * 1.15, mx, 'crit']];
  const sv = {
    id: 'pedsv', g: 'ped', title: 'Sinais vitais por idade (visual)', desc: 'Compare FC, FR e PA da criança com a faixa esperada para os meses ou anos de vida',
    kw: 'sinais vitais pediatricos faixa normal idade frequencia cardiaca respiratoria pressao arterial hipotensao crianca grafico saturacao taquicardia',
    disc: 'Faixas aproximadas (PALS/APLS) para criança acordada e sem febre/choro. Interprete no contexto: dor, febre e choro elevam FC e FR.',
    fields: [F.AGE(), F.N('fc', 'Frequência cardíaca', { unit: 'bpm' }), F.N('fr', 'Frequência respiratória', { unit: 'irpm' }), F.N('pas', 'PA sistólica', { unit: 'mmHg' }), F.N('sat', 'SpO₂', { unit: '%' })],
    calc: v => {
      const y = v.age; if (!isFinite(y)) return null;
      const b = VIT.find(x => y < x[0]) || VIT[6];
      const hipo = y * 12 < 1 ? 60 : y < 1 ? 70 : y <= 10 ? 70 + 2 * y : 90;
      const gauges = [], al = [], rows = [];
      const add = (lab, val, rng, mn, mx, un) => {
        rows.push([lab + ' esperada', `${rng[0]} a ${rng[1]} ${un}`]);
        if (!isFinite(val)) return;
        const lv = val < rng[0] * 0.85 || val > rng[1] * 1.15 ? 'crit' : val < rng[0] || val > rng[1] ? 'warn' : 'ok';
        gauges.push({ label: lab, min: mn, max: mx, value: Math.max(mn, Math.min(mx, val)), zones: zon(rng[0], rng[1], mn, mx), lvl: lv,
          text: `${fmt(val, 0)} ${un}: ${lv === 'ok' ? 'dentro da faixa' : val < rng[0] ? 'abaixo da faixa' : 'acima da faixa'}`, ticks: [String(mn), `${rng[0]}`, `${rng[1]}`, String(mx)] });
        if (lv === 'crit') al.push({ lvl: 'crit', text: `${lab} muito fora da faixa para a idade: reavaliar a criança e considerar gravidade.` });
      };
      add('Frequência cardíaca', v.fc, b[1], 40, 260, 'bpm');
      add('Frequência respiratória', v.fr, b[2], 5, 80, 'irpm');
      add('PA sistólica', v.pas, [hipo, b[3][1]], 30, 170, 'mmHg');
      if (isFinite(v.pas) && v.pas < hipo) al.unshift({ lvl: 'crit', text: `Hipotensão para a idade (PAS < ${fmt(hipo, 0)} mmHg): sinal tardio de choque. Iniciar ressuscitação.` });
      if (isFinite(v.sat) && v.sat < 92) al.push({ lvl: v.sat < 90 ? 'crit' : 'warn', text: `SpO₂ ${fmt(v.sat, 0)}%: ofertar oxigênio e reavaliar.` });
      rows.push(['Limite de hipotensão (PAS menor que)', `${fmt(hipo, 0)} mmHg`]);
      const bandName = y * 12 < 1 ? 'Recém-nascido' : y < 0.25 ? '1 a 3 meses' : y < 1 ? '3 a 12 meses' : y < 3 ? '1 a 3 anos' : y < 6 ? '3 a 6 anos' : y < 12 ? '6 a 12 anos' : 'Adolescente';
      return { main: { label: 'Faixa etária', value: bandName, small: true }, gauges, rows, alerts: al,
        text: `Sinais vitais (${fmt(y, 2)} anos): ${[['FC', v.fc, 'bpm'], ['FR', v.fr, 'irpm'], ['PAS', v.pas, 'mmHg'], ['SpO2', v.sat, '%']].filter(x => isFinite(x[1])).map(x => x[0] + ' ' + x[1] + ' ' + x[2]).join(', ')}. Hipotensão se PAS < ${fmt(hipo, 0)}.` };
    }
  };

  D.add(kit, vit, fluid, one, hid, sv);
})();
