/* Medicações e infusões */
(function () {
  'use strict';
  const D = window.DRB, u = D.u, F = D.f, fmt = u.fmt, auto = u.auto, dv = u.dv;

  /* ======================= DOSES POR PESO E IDADE ======================= */
  // regras: recebem p = {kg, y (anos), m (meses), adult}; retornam {lo, hi, per, ref, int, maxDose, maxDay, notes}
  const kgd = (lo, hi, o) => p => Object.assign({ lo: lo * p.kg, hi: hi * p.kg, per: [lo, hi] }, o);
  const fix = (lo, hi, o) => () => Object.assign({ lo, hi }, o);
  const G = {
    an: 'Analgesia e antitérmicos', ae: 'Antieméticos', al: 'Alergia, corticoides e respiratório',
    ne: 'Neurologia e sedação', ca: 'Cardiovascular e emergência', ab: 'Antibióticos'
  };
  const RX = [
    { id: 'dipirona', g: G.an, name: 'Dipirona', u: 'mg', route: 'VO ou IV', minM: 3, minTxt: '3 meses de idade',
      pres: [{ l: 'Gotas 500 mg/mL', c: 500 }, { l: 'Ampola 500 mg/mL (2 mL = 1 g)', c: 500 }, { l: 'Solução oral 50 mg/mL', c: 50 }, { l: 'Comprimido 500 mg', c: 500, solid: 1 }],
      ped: kgd(10, 25, { int: '6/6 h', maxDose: 1000, maxDay: '4 doses/dia' }), ad: fix(500, 1000, { int: '6/6 h', maxDay: '4 g/dia' }),
      notes: ['Evitar em menores de 3 meses ou 5 kg. Por via IV, injetar lento (hipotensão).'] },
    { id: 'para', g: G.an, name: 'Paracetamol', u: 'mg', route: 'VO ou IV',
      pres: [{ l: 'Gotas 200 mg/mL', c: 200 }, { l: 'Gotas 100 mg/mL (bebê)', c: 100 }, { l: 'Suspensão 32 mg/mL (160 mg/5 mL)', c: 32 }, { l: 'Comprimido 500 mg', c: 500, solid: 1 }, { l: 'Comprimido 750 mg', c: 750, solid: 1 }, { l: 'Solução IV 10 mg/mL', c: 10 }],
      ped: kgd(10, 15, { int: '4/4 a 6/6 h', maxDose: 1000, maxDay: '75 mg/kg/dia (máx. 4 g)' }),
      ad: fix(500, 1000, { int: '6/6 h', maxDay: '4 g/dia (3 g se hepatopatia ou etilismo)' }),
      notes: ['Em neonatos e lactentes < 3 meses, as doses e intervalos diferem. Consulte referência específica.'] },
    { id: 'ibu', g: G.an, name: 'Ibuprofeno', u: 'mg', route: 'VO', minM: 6, minTxt: '6 meses de idade',
      pres: [{ l: 'Gotas 50 mg/mL', c: 50 }, { l: 'Gotas 100 mg/mL', c: 100 }, { l: 'Suspensão 20 mg/mL (100 mg/5 mL)', c: 20 }, { l: 'Comprimido 400 mg', c: 400, solid: 1 }, { l: 'Comprimido 600 mg', c: 600, solid: 1 }],
      ped: kgd(5, 10, { int: '6/6 a 8/8 h', maxDose: 400, maxDay: '40 mg/kg/dia' }), ad: fix(400, 600, { int: '6/6 a 8/8 h', maxDay: '2,4 g/dia' }),
      notes: ['Evitar em desidratação, nefropatia, úlcera/sangramento digestivo e suspeita de dengue.'] },
    { id: 'cetorolaco', g: G.an, name: 'Cetorolaco', u: 'mg', route: 'IV, IM ou VO', minM: 24, minTxt: '2 anos de idade',
      pres: [{ l: 'Ampola 30 mg/mL', c: 30 }, { l: 'Comprimido 10 mg', c: 10, solid: 1 }],
      ped: kgd(0.5, 0.5, { int: '6/6 h', maxDose: 15, maxDay: 'até 5 dias' }), ad: fix(15, 30, { int: '6/6 h', maxDay: '120 mg/dia (60 mg se > 65 anos ou < 50 kg); até 5 dias' }),
      notes: ['Evitar em nefropatia, hipovolemia, risco de sangramento e gestação.'] },
    { id: 'morfina', g: G.an, name: 'Morfina', u: 'mg', route: 'IV (titulada)',
      pres: [{ l: 'Ampola 10 mg/mL (pura)', c: 10 }, { l: 'Diluída 1 mg/mL (1 ampola + 9 mL de AD)', c: 1 }],
      ped: kgd(0.05, 0.1, { int: 'a cada 2 a 4 h, titulando', maxDose: 10 }), ad: fix(2, 5, { int: 'repetir a cada 5 a 15 min até analgesia' }),
      notes: ['IV lento e diluída. Reduzir a dose em idosos, insuficiência renal ou hepática. Mantenha naloxona disponível.'] },
    { id: 'fentanil', g: G.an, name: 'Fentanil (bolus)', u: 'mcg', route: 'IV lento',
      pres: [{ l: 'Ampola 50 mcg/mL', c: 50 }],
      ped: kgd(0.5, 1, { int: 'repetir a cada 30 a 60 min se necessário' }), ad: fix(25, 100, { int: 'repetir a cada 30 a 60 min se necessário' }),
      notes: ['Infundir em 1 a 2 min ou mais (rigidez torácica com bolus rápido). Monitorizar SpO₂ e ventilação.'] },
    { id: 'tramadol', g: G.an, name: 'Tramadol', u: 'mg', route: 'VO ou IV', minM: 12, minTxt: '1 ano de idade',
      pres: [{ l: 'Ampola 50 mg/mL', c: 50 }, { l: 'Gotas 100 mg/mL', c: 100 }, { l: 'Comprimido 50 mg', c: 50, solid: 1 }],
      ped: kgd(1, 2, { int: '6/6 a 8/8 h', maxDose: 100, maxDay: '8 mg/kg/dia (máx. 400 mg)' }), ad: fix(50, 100, { int: '6/6 a 8/8 h', maxDay: '400 mg/dia' }),
      notes: ['Uso pediátrico restrito: evitar em menores de 12 anos quando houver alternativa. Cuidado com convulsão e serotoninérgicos.'] },

    { id: 'ondansetrona', g: G.ae, name: 'Ondansetrona', u: 'mg', route: 'IV ou VO', minM: 6, minTxt: '6 meses de idade',
      pres: [{ l: 'Ampola 2 mg/mL', c: 2 }, { l: 'Solução oral 0,8 mg/mL (4 mg/5 mL)', c: 0.8 }, { l: 'Comprimido 4 mg', c: 4, solid: 1 }, { l: 'Comprimido 8 mg', c: 8, solid: 1 }],
      ped: kgd(0.1, 0.15, { int: '8/8 h', maxDose: 8 }), ad: fix(4, 8, { int: '8/8 h' }),
      notes: ['Verificar QTc em pacientes com risco de arritmia.'] },
    { id: 'metoclopramida', g: G.ae, name: 'Metoclopramida', u: 'mg', route: 'IV, IM ou VO', minM: 12, minTxt: '1 ano de idade',
      pres: [{ l: 'Ampola 5 mg/mL', c: 5 }, { l: 'Gotas 4 mg/mL', c: 4 }, { l: 'Comprimido 10 mg', c: 10, solid: 1 }],
      ped: kgd(0.1, 0.15, { int: '8/8 h', maxDose: 10, maxDay: '0,5 mg/kg/dia' }), ad: fix(10, 10, { int: '8/8 h', maxDay: '30 mg/dia; até 5 dias' }),
      notes: ['Risco de efeitos extrapiramidais, sobretudo em crianças e jovens. IV lento (≥ 3 min).'] },

    { id: 'adre_im', g: G.al, name: 'Adrenalina IM (anafilaxia)', u: 'mg', route: 'IM, face anterolateral da coxa',
      pres: [{ l: '1 mg/mL (1:1.000), ampola de 1 mL', c: 1 }],
      ped: kgd(0.01, 0.01, { int: 'repetir a cada 5 a 15 min se necessário', maxDose: 0.3 }), ad: fix(0.3, 0.5, { int: 'repetir a cada 5 a 15 min se necessário' }),
      notes: ['Adolescentes ≥ 30 a 40 kg: 0,3 a 0,5 mg. Em seguida: O₂, acesso IV, volume e monitorização.'] },
    { id: 'prometazina', g: G.al, name: 'Prometazina', u: 'mg', route: 'IM profunda ou VO', minM: 24, minTxt: '2 anos de idade',
      pres: [{ l: 'Ampola 25 mg/mL', c: 25 }, { l: 'Comprimido 25 mg', c: 25, solid: 1 }],
      ped: kgd(0.25, 0.5, { int: '6/6 a 8/8 h', maxDose: 25 }), ad: fix(25, 50, { int: '6/6 a 8/8 h' }),
      notes: ['Evitar a via IV (lesão tecidual). Contraindicada em menores de 2 anos (depressão respiratória).'] },
    { id: 'metilpred', g: G.al, name: 'Metilprednisolona', u: 'mg', route: 'IV',
      pres: [{ l: 'Frasco 125 mg/2 mL (62,5 mg/mL)', c: 62.5 }, { l: 'Frasco 40 mg/mL', c: 40 }, { l: 'Frasco 500 mg/8 mL (62,5 mg/mL)', c: 62.5 }],
      ped: kgd(1, 2, { int: '6/6 a 12/12 h conforme indicação', maxDose: 125 }), ad: fix(40, 125, { int: '6/6 a 12/12 h conforme indicação' }),
      notes: ['Conferir a dose e a duração para a condição tratada (asma, anafilaxia, DPOC, etc.).'] },
    { id: 'dexa', g: G.al, name: 'Dexametasona', u: 'mg', route: 'IV, IM ou VO',
      pres: [{ l: 'Ampola 4 mg/mL', c: 4 }, { l: 'Elixir 0,1 mg/mL', c: 0.1 }, { l: 'Comprimido 4 mg', c: 4, solid: 1 }],
      ped: kgd(0.15, 0.6, { int: 'dose única (crupe/asma) ou 6/6 a 12/12 h', maxDose: 16 }), ad: fix(4, 10, { int: 'conforme indicação' }),
      notes: ['Crupe: 0,15 a 0,6 mg/kg em dose única (prática comum: máx. 10 mg). Asma: 0,6 mg/kg (máx. 16 mg), 1 a 2 doses.'] },
    { id: 'predni', g: G.al, name: 'Prednisolona / prednisona', u: 'mg', route: 'VO',
      pres: [{ l: 'Solução oral 3 mg/mL', c: 3 }, { l: 'Solução oral 1 mg/mL', c: 1 }, { l: 'Comprimido 20 mg', c: 20, solid: 1 }, { l: 'Comprimido 5 mg', c: 5, solid: 1 }],
      ped: kgd(1, 2, { int: '1×/dia ou 12/12 h', maxDose: 60, maxDay: '60 mg/dia' }), ad: fix(40, 60, { int: '1×/dia por 5 dias (asma/DPOC)' }) },
    { id: 'salbu', g: G.al, name: 'Salbutamol (nebulização)', u: 'mg', route: 'inalatória',
      pres: [{ l: 'Solução para nebulização 5 mg/mL (0,5%)', c: 5 }],
      ped: p => { const d = Math.min(5, Math.max(2.5, 0.15 * p.kg)); return { lo: d, hi: d, ref: '0,15 mg/kg (mín. 2,5 mg e máx. 5 mg)', int: '20/20 min × 3 na crise; depois 4/4 a 6/6 h' }; },
      ad: fix(2.5, 5, { int: '20/20 min × 3 na crise; depois 4/4 a 6/6 h' }),
      notes: ['Diluir em 3 a 5 mL de SF 0,9% e nebulizar com O₂ a 6 a 8 L/min. Na crise grave, considerar nebulização contínua.'] },
    { id: 'ipra', g: G.al, name: 'Brometo de ipratrópio (nebulização)', u: 'mg', route: 'inalatória',
      pres: [{ l: 'Solução 0,25 mg/mL', c: 0.25 }],
      ped: p => { if (!(p.kg > 0)) return { lo: NaN, hi: NaN }; const d = p.kg < 20 ? 0.25 : 0.5; return { lo: d, hi: d, ref: p.kg < 20 ? '< 20 kg: 0,25 mg' : '≥ 20 kg: 0,5 mg', int: '20/20 min × 3 na crise' }; },
      ad: fix(0.5, 0.5, { int: '20/20 min × 3 na crise; depois 6/6 h' }) },
    { id: 'mgso4', g: G.al, name: 'Sulfato de magnésio (asma grave)', u: 'mg', route: 'IV em 20 min',
      pres: [{ l: 'Sulfato de magnésio 50% (500 mg/mL)', c: 500 }, { l: 'Sulfato de magnésio 10% (100 mg/mL)', c: 100 }],
      ped: kgd(25, 50, { int: 'dose única', maxDose: 2000 }), ad: fix(1200, 2000, { int: 'dose única' }),
      notes: ['Diluir em SF ou SG 5% e infundir em 15 a 20 min. Eclâmpsia e torsades têm esquemas próprios.'] },

    { id: 'diazepam', g: G.ne, name: 'Diazepam (convulsão)', u: 'mg', route: 'IV lento ou retal', minM: 1, minTxt: '1 mês de idade',
      pres: [{ l: 'Ampola 5 mg/mL (10 mg/2 mL)', c: 5 }],
      ped: kgd(0.2, 0.5, { int: 'repetir em 5 a 10 min (máx. 2 doses)', maxDose: 10 }), ad: fix(5, 10, { int: 'repetir em 5 a 10 min (máx. 2 doses)' }),
      notes: ['IV: ≤ 5 mg/min. Via retal: 0,5 mg/kg. Monitorizar ventilação.'] },
    { id: 'midaz', g: G.ne, name: 'Midazolam (convulsão / sedação aguda)', u: 'mg', route: 'IV, IM ou intranasal',
      pres: [{ l: 'Ampola 5 mg/mL', c: 5 }, { l: 'Ampola 1 mg/mL', c: 1 }],
      ped: kgd(0.1, 0.2, { int: 'repetir em 5 a 10 min se necessário', maxDose: 10 }), ad: fix(5, 10, { int: 'IM ou IV; repetir em 5 a 10 min' }),
      notes: ['IM ou intranasal: 0,2 mg/kg (máx. 10 mg). Risco de depressão respiratória: monitorizar.'] },
    { id: 'fenitoina', g: G.ne, name: 'Fenitoína (ataque)', u: 'mg', route: 'IV lento',
      pres: [{ l: 'Ampola 50 mg/mL (250 mg/5 mL)', c: 50 }],
      both: kgd(15, 20, { int: 'dose de ataque única', maxDose: 1500 }),
      notes: ['Diluir somente em SF 0,9%. Velocidade ≤ 1 mg/kg/min (máx. 50 mg/min; 25 mg/min em idosos ou cardiopatas). Monitorizar ECG e PA.'] },
    { id: 'fenobarb', g: G.ne, name: 'Fenobarbital (ataque)', u: 'mg', route: 'IV lento',
      pres: [{ l: 'Ampola 100 mg/mL (200 mg/2 mL)', c: 100 }],
      both: kgd(15, 20, { int: 'dose de ataque única' }),
      notes: ['Infusão lenta (≤ 1 mg/kg/min). Risco de depressão respiratória e hipotensão, sobretudo após benzodiazepínico.'] },
    { id: 'leveti', g: G.ne, name: 'Levetiracetam (ataque)', u: 'mg', route: 'IV em 15 min',
      pres: [{ l: 'Ampola 100 mg/mL (500 mg/5 mL)', c: 100 }],
      both: kgd(40, 60, { int: 'dose única', maxDose: 4500 }),
      notes: ['Diluir em 100 mL de SF 0,9% e infundir em 15 min. Ajustar na doença renal.'] },
    { id: 'halo', g: G.ne, name: 'Haloperidol', u: 'mg', route: 'IM ou VO', adultOnly: true,
      pres: [{ l: 'Ampola 5 mg/mL', c: 5 }, { l: 'Gotas 2 mg/mL', c: 2 }, { l: 'Comprimido 5 mg', c: 5, solid: 1 }],
      ad: fix(2.5, 5, { int: 'repetir em 30 a 60 min se necessário', maxDay: '20 mg/dia' }),
      notes: ['Idosos: iniciar com 0,5 a 1 mg. Verificar QTc. Evitar a via IV.'] },
    { id: 'flumaz', g: G.ne, name: 'Flumazenil', u: 'mg', route: 'IV',
      pres: [{ l: 'Ampola 0,1 mg/mL', c: 0.1 }],
      ped: kgd(0.01, 0.01, { int: 'repetir a cada 1 min (máx. 0,05 mg/kg ou 1 mg)', maxDose: 0.2 }), ad: fix(0.2, 0.2, { int: 'repetir a cada 1 min até 1 mg' }),
      notes: ['Risco de convulsão em dependentes de benzodiazepínico ou intoxicação por tricíclicos.'] },
    { id: 'naloxona', g: G.ne, name: 'Naloxona', u: 'mg', route: 'IV, IM ou intranasal',
      pres: [{ l: 'Ampola 0,4 mg/mL', c: 0.4 }],
      ped: kgd(0.01, 0.1, { int: 'repetir a cada 2 a 3 min', maxDose: 2 }), ad: fix(0.4, 2, { int: 'repetir a cada 2 a 3 min, titulando' }),
      notes: ['Meia-vida curta: observar recorrência da depressão respiratória.'] },

    { id: 'adre_pcr', g: G.ca, name: 'Adrenalina (parada cardiorrespiratória)', u: 'mg', route: 'IV ou IO',
      pres: [{ l: 'Diluída 0,1 mg/mL (1 mg + 9 mL de SF)', c: 0.1 }, { l: 'Pura 1 mg/mL', c: 1 }],
      ped: kgd(0.01, 0.01, { int: 'a cada 3 a 5 min', maxDose: 1 }), ad: fix(1, 1, { int: 'a cada 3 a 5 min' }),
      notes: ['Flush de 5 a 10 mL de SF após cada dose.'] },
    { id: 'amio', g: G.ca, name: 'Amiodarona (bolus)', u: 'mg', route: 'IV ou IO',
      pres: [{ l: 'Ampola 50 mg/mL (150 mg/3 mL)', c: 50 }],
      ped: kgd(5, 5, { int: 'pode repetir (máx. 15 mg/kg/dia)', maxDose: 300 }), ad: fix(300, 300, { int: '1ª dose; 2ª dose de 150 mg' }),
      notes: ['PCR (FV/TV sem pulso): bolus. TV com pulso: diluir em SG 5% e infundir em 20 a 60 min.'] },
    { id: 'lido', g: G.ca, name: 'Lidocaína (arritmia ventricular)', u: 'mg', route: 'IV ou IO',
      pres: [{ l: 'Lidocaína 2% sem vasoconstritor (20 mg/mL)', c: 20 }],
      both: kgd(1, 1.5, { int: 'repetir 0,5 a 0,75 mg/kg a cada 5 a 10 min (máx. 3 mg/kg)', maxDose: 100 }),
      notes: ['Usar apresentação sem vasoconstritor.'] },
    { id: 'atropina', g: G.ca, name: 'Atropina (bradicardia)', u: 'mg', route: 'IV ou IO',
      pres: [{ l: 'Ampola 0,25 mg/mL', c: 0.25 }, { l: 'Ampola 0,5 mg/mL', c: 0.5 }],
      ped: p => { const d = Math.min(0.5, Math.max(0.1, 0.02 * p.kg)); return { lo: d, hi: d, ref: '0,02 mg/kg (mín. 0,1 mg e máx. 0,5 mg)', int: 'pode repetir 1× em 3 a 5 min' }; },
      ad: fix(1, 1, { int: 'a cada 3 a 5 min', maxDay: 'máx. total 3 mg' }) },
    { id: 'adeno', g: G.ca, name: 'Adenosina (TSV)', u: 'mg', route: 'IV rápido',
      pres: [{ l: 'Ampola 3 mg/mL (6 mg/2 mL)', c: 3 }],
      ped: p => ({ lo: Math.min(0.1 * p.kg, 6), hi: Math.min(0.2 * p.kg, 12), ref: '1ª dose 0,1 mg/kg (máx. 6 mg); 2ª dose 0,2 mg/kg (máx. 12 mg)', int: '2ª dose após 1 a 2 min' }),
      ad: fix(6, 12, { ref: '1ª dose 6 mg; 2ª dose 12 mg', int: '2ª dose após 1 a 2 min' }),
      notes: ['O menor valor é a 1ª dose e o maior é a 2ª dose. Bolus rápido em veia calibrosa, seguido de 20 mL de SF. ECG contínuo.'] },
    { id: 'furo', g: G.ca, name: 'Furosemida', u: 'mg', route: 'IV ou VO',
      pres: [{ l: 'Ampola 10 mg/mL', c: 10 }, { l: 'Comprimido 40 mg', c: 40, solid: 1 }],
      ped: kgd(0.5, 2, { int: '6/6 a 12/12 h', maxDose: 80 }), ad: fix(20, 80, { int: 'conforme resposta' }),
      notes: ['IV lento (≤ 4 mg/min). Dose inicial maior em insuficiência renal ou uso crônico.'] },
    { id: 'bic', g: G.ca, name: 'Bicarbonato de sódio', u: 'mEq', route: 'IV lento',
      pres: [{ l: 'NaHCO₃ 8,4% (1 mEq/mL)', c: 1 }, { l: 'NaHCO₃ 4,2% (0,5 mEq/mL)', c: 0.5 }],
      both: kgd(1, 1, { int: 'dose única; repetir conforme gasometria' }),
      notes: ['Indicações restritas (acidose grave, hipercalemia, intoxicações). Em lactentes < 1 ano, usar 4,2% ou diluir 1:1.'] },
    { id: 'caglu', g: G.ca, name: 'Gluconato de cálcio 10%', u: 'mg', route: 'IV lento',
      pres: [{ l: 'Gluconato de cálcio 10% (100 mg/mL)', c: 100 }],
      ped: kgd(50, 100, { int: 'em 10 min; repetir se necessário', maxDose: 2000 }), ad: fix(1000, 2000, { int: 'em 10 min; repetir se necessário' }),
      notes: ['ECG contínuo. Não misturar com bicarbonato. Evitar extravasamento.'] },
    { id: 'glicose', g: G.ca, name: 'Glicose (hipoglicemia)', u: 'g', route: 'IV',
      pres: [{ l: 'Glicose 10% (0,1 g/mL)', c: 0.1 }, { l: 'Glicose 25% (0,25 g/mL)', c: 0.25 }, { l: 'Glicose 50% (0,5 g/mL)', c: 0.5 }],
      ped: kgd(0.5, 1, { int: 'repetir conforme glicemia', maxDose: 25 }), ad: fix(15, 25, { int: 'repetir conforme glicemia' }),
      notes: ['Em neonatos e lactentes, preferir glicose 10%. Reavaliar a glicemia em 15 min.'] },
    { id: 'enox', g: G.ca, name: 'Enoxaparina (dose terapêutica)', u: 'mg', route: 'SC',
      pres: [{ l: 'Seringa 100 mg/mL (20, 40, 60, 80 ou 100 mg)', c: 100 }],
      both: kgd(1, 1, { int: '12/12 h' }),
      notes: ['Alternativa terapêutica: 1,5 mg/kg 1×/dia. Profilaxia: 40 mg 1×/dia. ClCr < 30 mL/min: 1 mg/kg 1×/dia. Arredondar para a seringa disponível.'] },
    { id: 'atx', g: G.ca, name: 'Ácido tranexâmico', u: 'mg', route: 'IV em 10 min',
      pres: [{ l: 'Ampola 50 mg/mL (250 mg/5 mL)', c: 50 }],
      ped: kgd(15, 15, { int: 'dose única', maxDose: 1000 }), ad: fix(1000, 1000, { int: 'seguir com 1 g em 8 h no trauma' }),
      notes: ['Trauma: iniciar em até 3 h do evento.'] },

    { id: 'amox', g: G.ab, name: 'Amoxicilina', u: 'mg', route: 'VO',
      pres: [{ l: 'Suspensão 250 mg/5 mL (50 mg/mL)', c: 50 }, { l: 'Suspensão 400 mg/5 mL (80 mg/mL)', c: 80 }, { l: 'Cápsula/comprimido 500 mg', c: 500, solid: 1 }],
      ped: p => ({ lo: 50 / 3 * p.kg, hi: 50 / 3 * p.kg, ref: '50 mg/kg/dia ÷ 3 doses', int: '8/8 h', maxDose: 1000,
        notes: [`Alta dose (pneumonia, otite média, sinusite): 80 a 90 mg/kg/dia ÷ 2 doses = ${fmt(40 * p.kg, 0)} a ${fmt(45 * p.kg, 0)} mg a cada 12 h.`] }),
      ad: fix(500, 500, { ref: '500 mg 8/8 h ou 875 mg 12/12 h', int: '8/8 h' }) },
    { id: 'amoxclav', g: G.ab, name: 'Amoxicilina + clavulanato', u: 'mg', route: 'VO',
      pres: [{ l: 'Suspensão 250+62,5 mg/5 mL (amoxicilina 50 mg/mL)', c: 50 }, { l: 'Suspensão 400+57 mg/5 mL (amoxicilina 80 mg/mL)', c: 80 }, { l: 'Comprimido 875+125 mg', c: 875, solid: 1 }],
      ped: p => ({ lo: 40 / 3 * p.kg, hi: 50 / 3 * p.kg, ref: '40 a 50 mg/kg/dia de amoxicilina ÷ 3 doses (250/62,5)', int: '8/8 h', maxDose: 875,
        notes: [`Suspensão 400/57: 45 mg/kg/dia ÷ 2 doses = ${fmt(22.5 * p.kg, 0)} mg a cada 12 h (alta dose: 90 mg/kg/dia).`] }),
      ad: fix(875, 875, { int: '12/12 h' }) },
    { id: 'azitro', g: G.ab, name: 'Azitromicina', u: 'mg', route: 'VO ou IV', minM: 6, minTxt: '6 meses de idade',
      pres: [{ l: 'Suspensão 40 mg/mL (200 mg/5 mL)', c: 40 }, { l: 'Comprimido 500 mg', c: 500, solid: 1 }],
      ped: kgd(10, 10, { int: '1×/dia por 3 dias (ou 10 mg/kg no 1º dia + 5 mg/kg por 4 dias)', maxDose: 500 }), ad: fix(500, 500, { int: '1×/dia por 3 a 5 dias' }),
      notes: ['Verificar QTc em pacientes com risco de arritmia.'] },
    { id: 'cefalexina', g: G.ab, name: 'Cefalexina', u: 'mg', route: 'VO',
      pres: [{ l: 'Suspensão 50 mg/mL (250 mg/5 mL)', c: 50 }, { l: 'Comprimido 500 mg', c: 500, solid: 1 }],
      ped: kgd(6.25, 12.5, { ref: '25 a 50 mg/kg/dia ÷ 4 doses', int: '6/6 h', maxDose: 500 }), ad: fix(500, 500, { int: '6/6 h' }) },
    { id: 'benzetacil', g: G.ab, name: 'Penicilina G benzatina', u: 'UI', route: 'IM profunda',
      pres: [{ l: 'Reconstituída: 300.000 UI/mL (frasco com diluente)', c: 300000 }],
      ped: p => { if (!(p.kg > 0)) return { lo: NaN, hi: NaN }; const d = p.kg < 27 ? 600000 : 1200000; return { lo: d, hi: d, ref: p.kg < 27 ? '< 27 kg: 600.000 UI' : '≥ 27 kg: 1.200.000 UI', int: 'dose única (faringite estreptocócica)' }; },
      ad: fix(1200000, 1200000, { int: 'dose única; sífilis: 2.400.000 UI (metade em cada glúteo)' }),
      notes: ['Somente IM profunda. Nunca por via IV.'] },
    { id: 'ceftriaxona', g: G.ab, name: 'Ceftriaxona', u: 'mg', route: 'IV ou IM',
      pres: [{ l: 'IV: 100 mg/mL (1 g em 10 mL)', c: 100 }],
      ped: kgd(50, 50, { int: '24/24 h (grave/meningite: 100 mg/kg/dia ÷ 12/12 h)', maxDose: 2000 }), ad: fix(1000, 2000, { int: '24/24 h (meningite: 2 g 12/12 h)' }),
      notes: ['Evitar em neonatos (hiperbilirrubinemia) e junto de soluções com cálcio IV.'] },
    { id: 'ampicilina', g: G.ab, name: 'Ampicilina', u: 'mg', route: 'IV',
      pres: [{ l: '100 mg/mL (1 g em 10 mL)', c: 100 }],
      ped: kgd(25, 50, { ref: '100 a 200 mg/kg/dia ÷ 4 doses', int: '6/6 h', maxDose: 2000 }), ad: fix(1000, 2000, { int: '4/4 a 6/6 h', maxDay: '12 g/dia' }) },
    { id: 'cefazolina', g: G.ab, name: 'Cefazolina', u: 'mg', route: 'IV',
      pres: [{ l: '100 mg/mL (1 g em 10 mL)', c: 100 }],
      ped: kgd(16.7, 33.3, { ref: '50 a 100 mg/kg/dia ÷ 3 doses', int: '8/8 h', maxDose: 2000 }), ad: fix(1000, 2000, { int: '8/8 h' }),
      notes: ['Profilaxia cirúrgica: 30 mg/kg (máx. 2 g; 3 g se ≥ 120 kg) até 60 min antes da incisão.'] },
    { id: 'clinda', g: G.ab, name: 'Clindamicina', u: 'mg', route: 'IV ou VO',
      pres: [{ l: 'Ampola 150 mg/mL (600 mg/4 mL)', c: 150 }, { l: 'Cápsula 300 mg', c: 300, solid: 1 }],
      ped: kgd(6.7, 13.3, { ref: '20 a 40 mg/kg/dia ÷ 3 doses', int: '8/8 h', maxDose: 900 }), ad: fix(600, 900, { int: '8/8 h', maxDay: '2,7 g/dia' }),
      notes: ['Diluir e infundir em ≥ 20 a 30 min (máx. 30 mg/min).'] },
    { id: 'metro', g: G.ab, name: 'Metronidazol', u: 'mg', route: 'IV ou VO',
      pres: [{ l: 'Bolsa 5 mg/mL (500 mg/100 mL)', c: 5 }, { l: 'Comprimido 250 mg', c: 250, solid: 1 }, { l: 'Comprimido 400 mg', c: 400, solid: 1 }],
      ped: kgd(7.5, 7.5, { ref: '30 mg/kg/dia ÷ 3 doses', int: '8/8 h', maxDose: 500 }), ad: fix(500, 500, { int: '8/8 h' }) },
    { id: 'genta', g: G.ab, name: 'Gentamicina', u: 'mg', route: 'IV ou IM',
      pres: [{ l: 'Ampola 40 mg/mL (80 mg/2 mL)', c: 40 }, { l: 'Ampola 10 mg/mL (20 mg/2 mL)', c: 10 }],
      both: kgd(5, 7, { int: '24/24 h (dose única diária)' }),
      notes: ['Em obesos, usar peso ajustado. Ajustar à função renal e monitorizar níveis séricos e ototoxicidade.'] },
    { id: 'vanco', g: G.ab, name: 'Vancomicina', u: 'mg', route: 'IV lento',
      pres: [{ l: 'Reconstituída 50 mg/mL (500 mg em 10 mL)', c: 50 }],
      ped: kgd(15, 15, { ref: '60 mg/kg/dia ÷ 4 doses', int: '6/6 h', maxDose: 1000 }), ad: kgd(15, 20, { int: '8/8 a 12/12 h', maxDose: 3000 }),
      notes: ['Infundir em ≥ 1 h (máx. 10 mg/min) para evitar a síndrome do homem vermelho. Em graves, dose de ataque de 25 a 30 mg/kg. Ajustar à função renal e ao nível sérico.'] },
    { id: 'mero', g: G.ab, name: 'Meropenem', u: 'mg', route: 'IV',
      pres: [{ l: 'Reconstituído 50 mg/mL (1 g em 20 mL)', c: 50 }],
      ped: kgd(20, 40, { int: '8/8 h (meningite: 40 mg/kg)', maxDose: 2000 }), ad: fix(1000, 2000, { int: '8/8 h (meningite: 2 g)' }),
      notes: ['Ajustar à função renal.'] }
  ];

  const doseTool = {
    id: 'dose', g: 'med', title: 'Doses por peso e idade',
    desc: 'Dose, volume e intervalo de medicações comuns do plantão, conforme peso e faixa etária',
    kw: 'dipirona paracetamol ibuprofeno morfina fentanil tramadol ondansetrona metoclopramida adrenalina prometazina metilprednisolona dexametasona prednisolona salbutamol ipratropio magnesio diazepam midazolam fenitoina fenobarbital levetiracetam haloperidol flumazenil naloxona amiodarona lidocaina atropina adenosina furosemida bicarbonato calcio glicose enoxaparina tranexamico amoxicilina azitromicina cefalexina benzetacil ceftriaxona ampicilina cefazolina clindamicina metronidazol gentamicina vancomicina meropenem pediatrico crianca antibiotico analgesico',
    fields: v => {
      const d = RX.find(x => x.id === v.drug) || RX[0];
      const pres = d.pres.map((p, i) => [String(i), p.l]).concat([['custom', 'Outra concentração…']]);
      const out = [F.SEL('drug', 'Medicamento', RX.map(x => [x.id, x.name, x.g]), { reset: ['pres', 'cc'], def: RX[0].id }), F.KG(), F.AGE(),
        F.SEL('pres', 'Apresentação', pres, { rebuild: true, def: '0' })];
      if (v.pres === 'custom') out.push(F.N('cc', `Concentração (${d.u}/mL)`, { full: true }));
      return out;
    },
    calc: v => {
      const d = RX.find(x => x.id === v.drug) || RX[0];
      const kg = v.kg, y = v.age;
      const adult = isFinite(y) ? y >= 12 : (isFinite(kg) ? kg >= 40 : null);
      if (adult === null) return { alerts: [{ lvl: 'warn', text: 'Informe o peso e/ou a idade do paciente.' }] };
      const p = { kg, y, m: isFinite(y) ? y * 12 : NaN, adult };
      const cat = !isFinite(y) ? (adult ? 'Adulto (idade não informada; peso ≥ 40 kg)' : 'Pediátrico (idade não informada; peso < 40 kg)') : (adult ? 'Adulto (≥ 12 anos)' : 'Pediátrico (< 12 anos)');
      if (!adult && d.adultOnly) return { alerts: [{ lvl: 'crit', text: `${d.name}: dose pediátrica não incluída nesta ferramenta. Consulte referência específica.` }] };
      if (!adult && isFinite(p.m) && d.minM && p.m < d.minM) return { alerts: [{ lvl: 'crit', text: `${d.name}: não recomendado abaixo de ${d.minTxt}.` }] };
      const rule = adult ? (d.ad || d.both) : (d.ped || d.both);
      const r = rule(p);
      if (!isFinite(r.lo) || !isFinite(r.hi)) return { alerts: [{ lvl: 'warn', text: 'Informe o peso do paciente para calcular a dose.' }] };
      let lo = r.lo, hi = r.hi; const al = [];
      if (r.maxDose && hi > r.maxDose + 1e-9) { al.push({ lvl: 'warn', text: `Dose limitada ao máximo por administração (${fmt(r.maxDose, 2)} ${d.u}).` }); hi = r.maxDose; lo = Math.min(lo, hi); }
      if (isFinite(p.m) && p.m < 1) al.push({ lvl: 'crit', text: 'Neonato: doses e intervalos diferem. Consulte referência de neonatologia.' });
      const pr = v.pres === 'custom' ? { l: 'Concentração informada', c: v.cc } : (d.pres[+v.pres] || d.pres[0]);
      const unit = d.u;
      const doseTxt = `${u.rangeAuto(lo, hi)} ${unit}`;
      const ref = r.ref || (r.per ? `${u.range(r.per[0], r.per[1], 3)} ${unit}/kg/dose` : 'dose fixa do adulto');
      const rows = [['Dose por administração', doseTxt], ['Referência', ref]];
      if (r.int) rows.push(['Intervalo', r.int]);
      if (r.maxDay) rows.push(['Máximo diário', r.maxDay]);
      rows.push(['Via', d.route], ['Faixa etária usada', cat]);
      let main, vol = '';
      if (pr.c > 0) {
        if (pr.solid) { main = { label: 'Quantidade por dose', value: u.rangeAuto(lo / pr.c, hi / pr.c), unit: 'comprimido(s)' }; vol = `${u.rangeAuto(lo / pr.c, hi / pr.c)} comprimido(s) de ${fmt(pr.c, 3)} ${unit}`; al.push({ lvl: 'info', text: 'Fracionar comprimido apenas se for sulcado e a dose permitir.' }); }
        else { main = { label: 'Volume por dose', value: u.rangeAuto(lo / pr.c, hi / pr.c), unit: 'mL' }; vol = `${u.rangeAuto(lo / pr.c, hi / pr.c)} mL`; }
        rows.splice(1, 0, ['Apresentação', pr.l]);
      } else {
        main = { label: 'Dose por administração', value: u.rangeAuto(lo, hi), unit };
      }
      (r.notes || []).concat(d.notes || []).forEach(n => al.push({ lvl: 'info', text: n }));
      al.push({ lvl: 'info', text: 'Cálculo para função renal e hepática normais. Ajuste conforme o quadro clínico.' });
      return {
        main, rows, alerts: al,
        text: `${d.name} ${doseTxt}${vol ? ' (' + vol + ')' : ''}, ${d.route}${r.int ? ', ' + r.int : ''}. Peso ${isFinite(kg) ? fmt(kg, 1) + ' kg' : 'não informado'}.`
      };
    }
  };

  /* ======================= INFUSÕES CONTÍNUAS ======================= */
  const IG = { va: 'Vasoativas', se: 'Sedação e analgesia', bn: 'Bloqueadores neuromusculares', ou: 'Outras infusões' };
  // cp = concentração máxima de referência para acesso periférico (unidade do numerador por mL). Acima disso, preferir acesso central.
  const INF = [
    { id: 'nora', g: IG.va, name: 'Noradrenalina', du: 'mcg/kg/min', amtU: 'mg', amt: 20, vol: 200, cp: 0.02, min: 0.01, max: 3, def: 0.1, steps: [0.05, 0.1, 0.2, 0.3, 0.5, 0.75, 1], note: 'Ampola 4 mg/4 mL. Padrão do hospital: 5 ampolas + 180 mL de SG 5% (0,1 mg/mL).' },
    { id: 'adre', g: IG.va, name: 'Adrenalina', du: 'mcg/kg/min', amtU: 'mg', amt: 10, vol: 100, cp: 0.01, min: 0.01, max: 1, def: 0.05, steps: [0.02, 0.05, 0.1, 0.2, 0.3, 0.5], note: 'Ampola 1 mg/mL. Padrão do hospital: 10 ampolas + 90 mL de SG 5% (0,1 mg/mL).' },
    { id: 'adremin', g: IG.va, name: 'Adrenalina (em mcg/min)', du: 'mcg/min', amtU: 'mg', amt: 10, vol: 100, cp: 0.01, min: 2, max: 10, def: 5, steps: [2, 4, 6, 8, 10], note: 'Mesma diluição de 10 ampolas + 90 mL de SG 5%, dose absoluta (2 a 10 mcg/min).' },
    { id: 'dobuta', g: IG.va, name: 'Dobutamina', du: 'mcg/kg/min', amtU: 'mg', amt: 1000, vol: 250, cp: 5, min: 2.5, max: 20, def: 5, steps: [2.5, 5, 7.5, 10, 15, 20], note: 'Ampola 250 mg/20 mL. Padrão do hospital: 4 ampolas + 170 mL de SG 5% (4 mg/mL).' },
    { id: 'dopa', g: IG.va, name: 'Dopamina', du: 'mcg/kg/min', amtU: 'mg', amt: 250, vol: 250, cp: 1.6, min: 2, max: 20, def: 5, steps: [3, 5, 10, 15, 20], note: 'Ampola 50 mg/10 mL. Padrão do hospital: 5 ampolas + 200 mL de SG 5% (1 mg/mL).' },
    { id: 'vaso', g: IG.va, name: 'Vasopressina', du: 'U/min', amtU: 'U', amt: 20, vol: 201, cp: 0.2, min: 0.01, max: 0.04, def: 0.03, steps: [0.01, 0.02, 0.03, 0.04], note: 'Ampola 20 U/mL. Padrão do hospital: 1 ampola + 200 mL de SG 5%.' },
    { id: 'nipride', g: IG.va, name: 'Nitroprussiato', du: 'mcg/kg/min', amtU: 'mg', amt: 50, vol: 250, cp: 0.4, min: 0.3, max: 10, def: 0.5, steps: [0.3, 0.5, 1, 2, 3, 5], note: 'Ampola 50 mg/2 mL. Padrão: 1 ampola + 248 mL de SG 5%. Proteger da luz.' },
    { id: 'tridil', g: IG.va, name: 'Nitroglicerina', du: 'mcg/min', amtU: 'mg', amt: 50, vol: 250, cp: 0.4, min: 5, max: 200, def: 10, steps: [5, 10, 20, 40, 60, 100, 200], note: 'Ampola 5 mg/mL. Padrão: 10 mL + 240 mL de SG 5%. Equipo próprio (sem PVC).' },
    { id: 'milri', g: IG.va, name: 'Milrinona', du: 'mcg/kg/min', amtU: 'mg', amt: 20, vol: 100, cp: 0.4, min: 0.25, max: 0.75, def: 0.375, steps: [0.25, 0.375, 0.5, 0.75], note: 'Ampola 1 mg/mL (20 mL). Padrão: 1 ampola + 80 mL de SG 5% (200 mcg/mL). Reduzir na disfunção renal.' },
    { id: 'levo', g: IG.va, name: 'Levosimendana', du: 'mcg/kg/min', amtU: 'mg', amt: 12.5, vol: 505, cp: 0.025, min: 0.05, max: 0.2, def: 0.1, steps: [0.05, 0.1, 0.15, 0.2], note: 'Ampola 2,5 mg/mL (5 mL). Padrão: 1 ampola + 500 mL de SG 5% (0,025 mg/mL).' },
    { id: 'iso', g: IG.va, name: 'Isoproterenol', du: 'mcg/min', amtU: 'mg', amt: 2, vol: 200, cp: 0.02, min: 2, max: 20, def: 5, steps: [2, 5, 10, 15, 20], note: 'Ampola 0,2 mg/mL (confirme o volume da sua ampola). Padrão: 10 ampolas + 190 mL de SG 5%.' },
    { id: 'mida', g: IG.se, name: 'Midazolam', du: 'mg/kg/h', amtU: 'mg', amt: 125, vol: 255, cp: 1, min: 0.02, max: 0.2, def: 0.05, steps: [0.02, 0.05, 0.1, 0.15, 0.2], note: 'Ampola 5 mg/mL (25 mg/5 mL). Padrão: 5 ampolas + 230 mL de SF 0,9% (~0,5 mg/mL). Confira o tamanho da ampola do seu estoque.' },
    { id: 'fenta', g: IG.se, name: 'Fentanil', du: 'mcg/kg/h', amtU: 'mcg', amt: 2000, vol: 240, cp: 50, min: 0.5, max: 10, def: 1, steps: [0.5, 1, 2, 3, 5, 10], note: 'Ampola 50 mcg/mL (10 mL). Padrão: 4 ampolas + 200 mL de SF 0,9% (~8,3 mcg/mL).' },
    { id: 'morf', g: IG.se, name: 'Morfina', du: 'mg/h', amtU: 'mg', amt: 100, vol: 100, cp: 1, min: 1, max: 10, def: 2, steps: [1, 2, 4, 6, 8, 10], note: 'Ampola 10 mg/mL. Padrão: 10 ampolas + 90 mL de SF 0,9% (1 mg/mL).' },
    { id: 'propo', g: IG.se, name: 'Propofol', du: 'mg/kg/h', amtU: 'mg', amt: 1000, vol: 100, cp: 10, min: 0.3, max: 4, def: 1.5, steps: [0.5, 1, 2, 3, 4], note: 'Frasco 1% (10 mg/mL), infundido puro. Doses altas e prolongadas: risco da síndrome da infusão do propofol (monitorizar triglicerídeos e CPK).' },
    { id: 'dexme', g: IG.se, name: 'Dexmedetomidina', du: 'mcg/kg/h', amtU: 'mcg', amt: 400, vol: 100, cp: 4, min: 0.2, max: 1.4, def: 0.5, steps: [0.2, 0.4, 0.6, 0.8, 1, 1.4], note: 'Ampola 100 mcg/mL (2 mL). Padrão: 2 ampolas + 96 mL de SF 0,9% (4 mcg/mL). Atenção à bradicardia e hipotensão.' },
    { id: 'ceta', g: IG.se, name: 'Cetamina', du: 'mg/kg/h', amtU: 'mg', amt: 500, vol: 250, cp: 5, min: 0.1, max: 2, def: 0.5, steps: [0.1, 0.25, 0.5, 1, 2], note: 'Ampola 50 mg/mL (10 mL). Padrão: 1 ampola + 240 mL de SG 5%. Analgesia 0,1 a 0,5 mg/kg/h; sedação até 1 a 2 mg/kg/h.' },
    { id: 'nalo', g: IG.se, name: 'Naloxona (infusão)', du: 'mcg/kg/h', amtU: 'mg', amt: 0.8, vol: 100, cp: 0.05, min: 1, max: 4, def: 2, steps: [1, 2, 3, 4], note: 'Ampola 0,4 mg/mL. Padrão: 2 ampolas + 98 mL de SF 0,9% (8 mcg/mL). Bolus: 1 ampola + 9 mL de ABD.' },
    { id: 'roc', g: IG.bn, name: 'Rocurônio (infusão)', du: 'mcg/kg/min', amtU: 'mg', amt: 100, vol: 100, cp: 10, min: 5, max: 10, def: 7, steps: [5, 7, 10], note: 'Ampola 10 mg/mL (5 mL). Padrão: 2 ampolas + 90 mL de SG 5% (1 mg/mL).' },
    { id: 'cisa', g: IG.bn, name: 'Cisatracúrio', du: 'mcg/kg/min', amtU: 'mg', amt: 50, vol: 100, cp: 2, min: 1, max: 3, def: 2, steps: [1, 2, 3], note: 'Ampola 2 mg/mL (5 mL). Padrão: 5 ampolas + 75 mL de SG 5% (0,5 mg/mL). Confira o volume da ampola do estoque.' },
    { id: 'amio', g: IG.ou, name: 'Amiodarona', du: 'mg/min', amtU: 'mg', amt: 900, vol: 500, cp: 2, min: 0.5, max: 1, def: 1, steps: [0.5, 1], note: 'Ampola 150 mg/3 mL. Padrão: 6 ampolas + 482 mL de SG 5% = 1,8 mg/mL. Ataque: 150 mg em 10 min; depois 1 mg/min por 6 h e 0,5 mg/min por 18 h. Acima de 2 mg/mL, apenas acesso central.' },
    { id: 'hepa', g: IG.ou, name: 'Heparina não fracionada', du: 'U/kg/h', amtU: 'U', amt: 25000, vol: 250, cp: 200, min: 12, max: 18, def: 18, steps: [12, 14, 16, 18], note: 'Frasco 5.000 U/mL (5 mL). Padrão: 25.000 U em 250 mL = 100 U/mL. Bolus prévio 80 U/kg (TEV) ou 60 U/kg, máx. 4.000 U (SCA). Manutenção: 18 U/kg/h (TEV) ou 12 U/kg/h, máx. 1.000 U/h (SCA). Ajustar por TTPa ou anti-Xa.' },
    { id: 'insu', g: IG.ou, name: 'Insulina regular', du: 'U/h', amtU: 'U', amt: 100, vol: 100, min: 0.5, max: 15, def: 5, steps: [1, 2, 4, 6, 8, 10], note: 'Padrão: 100 U em 100 mL de SF 0,9% (1 U/mL). Na CAD, 0,1 U/kg/h (use a calculadora de insulina). Considere preencher o equipo (priming) conforme protocolo.' },
    { id: 'panto', g: IG.ou, name: 'Pantoprazol (HDA)', du: 'mg/h', amtU: 'mg', amt: 80, vol: 100, min: 4, max: 8, def: 8, steps: [8], note: 'Bolus de 80 mg, depois 8 mg/h. Padrão: 80 mg em 100 mL de SF 0,9% (0,8 mg/mL).' }
  ];
  const parseU = du => { const p = du.split('/'); return p.length === 3 ? { num: p[0], perKg: true, time: p[2] } : { num: p[0], perKg: false, time: p[1] }; };
  const toNum = (amtU, num) => (amtU === num ? 1 : amtU === 'mg' && num === 'mcg' ? 1000 : amtU === 'mcg' && num === 'mg' ? 0.001 : 1);
  const savedDil = id => (u.LS('drb_dil', {}) || {})[id];

  const infTool = {
    id: 'inf', g: 'med', title: 'Drogas vasoativas e infusões (visual)',
    desc: 'Dose ⇄ mL/h com as diluições do hospital e alerta de cor para concentração que exige acesso central',
    kw: 'acesso central periferico levosimendana isoproterenol cetamina morfina naloxona rocuronio cisatracurio bloqueador noradrenalina adrenalina dobutamina dopamina vasopressina nitroprussiato nitroglicerina tridil milrinona midazolam fentanil propofol dexmedetomidina precedex amiodarona heparina insulina pantoprazol bomba infusao choque sedacao bic',
    fields: v => {
      const d = INF.find(x => x.id === v.drug) || INF[0];
      const sv = savedDil(d.id);
      const mode = v.mode || 'dose';
      const out = [F.SEL('drug', 'Droga', INF.map(x => [x.id, x.name, x.g]), { reset: ['amt', 'vol', 'inp'], def: INF[0].id }),
        F.SEC('Diluição'),
        F.N('amt', `Droga (${d.amtU})`, { def: dv(sv ? sv.amt : d.amt) }), F.N('vol', 'Volume total (mL)', { def: dv(sv ? sv.vol : d.vol) }),
        F.NOTE(d.note + (sv ? ' Diluição personalizada salva neste aparelho.' : ' Altere para a do seu hospital: fica salva neste aparelho.')),
        F.BTN('Restaurar diluição padrão', raw => { const all = u.LS('drb_dil', {}) || {}; delete all[d.id]; u.SAVE('drb_dil', all); delete raw.amt; delete raw.vol; })];
      if (parseU(d.du).perKg) out.push(F.KG());
      out.push(F.SEC('Cálculo'),
        F.SEG('mode', '', [['dose', 'Dose → mL/h'], ['rate', 'mL/h → dose']], { reset: ['inp'], def: 'dose' }),
        F.N('inp', mode === 'rate' ? 'Vazão na bomba' : 'Dose desejada', { unit: mode === 'rate' ? 'mL/h' : d.du, full: true, def: mode === 'rate' ? '' : dv(d.def) }));
      return out;
    },
    onInput: (v, id) => {
      if (id !== 'amt' && id !== 'vol') return;
      const d = INF.find(x => x.id === v.drug) || INF[0];
      if (!(v.amt > 0 && v.vol > 0)) return;
      const all = u.LS('drb_dil', {}) || {};
      if (v.amt === d.amt && v.vol === d.vol) delete all[d.id]; else all[d.id] = { amt: v.amt, vol: v.vol };
      u.SAVE('drb_dil', all);
    },
    calc: v => {
      const d = INF.find(x => x.id === v.drug) || INF[0];
      const pu = parseU(d.du), amt = v.amt, vol = v.vol, mode = v.mode || 'dose';
      if (!(amt > 0) || !(vol > 0)) return { alerts: [{ lvl: 'warn', text: 'Informe a quantidade da droga e o volume total da diluição.' }] };
      if (pu.perKg && !(v.kg > 0)) return { alerts: [{ lvl: 'warn', text: 'Informe o peso do paciente.' }] };
      const conc = amt * toNum(d.amtU, pu.num) / vol; // unidade-numerador por mL
      const f = pu.perKg ? v.kg : 1, tf = pu.time === 'min' ? 60 : 1;
      const toMlh = dose => dose * f * tf / conc, toDose = mlh => mlh * conc / tf / f;
      const inp = v.inp; if (!isFinite(inp)) return { alerts: [{ lvl: 'info', text: mode === 'rate' ? 'Informe a vazão da bomba (mL/h).' : 'Informe a dose desejada.' }] };
      const dose = mode === 'dose' ? inp : toDose(inp), mlh = mode === 'dose' ? toMlh(inp) : inp;
      const concTxt = `${fmt(conc, 3)} ${pu.num}/mL`;
      const al = [], gauges = [];
      if (dose < d.min - 1e-9 || dose > d.max + 1e-9) al.push({ lvl: 'warn', text: 'Dose fora da faixa usual. Confira prescrição e diluição.' });
      if (d.cp) {
        const cpn = d.cp * toNum(d.amtU, pu.num), rt = conc / cpn, mx = cpn * 6, lv = rt <= 1 ? 'ok' : rt <= 4 ? 'warn' : 'crit';
        gauges.push({ label: 'Concentração da diluição', min: 0, max: mx, value: Math.min(conc, mx), zones: [[0, cpn, 'ok'], [cpn, 4 * cpn, 'warn'], [4 * cpn, mx, 'crit']], lvl: lv,
          text: lv === 'ok' ? 'Compatível com acesso periférico' : lv === 'warn' ? 'Preferir acesso central' : 'Exige acesso central', ticks: ['0', `${fmt(cpn, 3)} ${pu.num}/mL`, `${fmt(mx, 3)}`] });
        if (lv !== 'ok') al.push({ lvl: lv === 'crit' ? 'crit' : 'warn', text: `Diluição de ${fmt(conc, 3)} ${pu.num}/mL (${fmt(rt, 1)} vez(es) o limite de referência para acesso periférico). Infundir em acesso venoso central; evite extravasamento.` });
      }
      { const mx = d.max * 1.5; gauges.push({ label: 'Dose em relação à faixa usual', min: 0, max: mx, value: Math.min(dose, mx), zones: [[0, d.min, 'low'], [d.min, d.max, 'ok'], [d.max, mx, 'crit']], lvl: dose > d.max + 1e-9 ? 'crit' : dose < d.min - 1e-9 ? 'warn' : 'ok',
        text: dose > d.max + 1e-9 ? 'Acima da faixa usual' : dose < d.min - 1e-9 ? 'Abaixo da faixa usual' : 'Dentro da faixa usual', ticks: ['0', `${fmt(d.min, 3)}`, `${fmt(d.max, 3)} ${d.du}`] }); }
      const summary = `${d.name} ${fmt(amt, 2)} ${d.amtU} em ${fmt(vol, 0)} mL (${concTxt}), ${fmt(dose, 3)} ${d.du}${pu.perKg ? ' (' + fmt(v.kg, 1) + ' kg)' : ''} = ${fmt(mlh, 1)} mL/h`;
      return {
        main: mode === 'dose' ? { label: 'Resultado', value: fmt(mlh, 1), unit: 'mL/h' } : { label: 'Resultado', value: fmt(dose, 3), unit: d.du },
        gauges, rows: [['Concentração', concTxt], ['Faixa usual', `${fmt(d.min, 3)} a ${fmt(d.max, 3)} ${d.du}`]],
        alerts: al, notes: [summary], text: summary,
        table: { title: 'Tabela de titulação', head: [`Dose (${d.du})`, 'Vazão (mL/h)'], cap: 'Toque em uma linha para usar a dose.',
          rows: d.steps.map(s => ({ cells: [fmt(s, 3), fmt(toMlh(s), 1)], set: { mode: 'dose', inp: dv(s) } })) }
      };
    }
  };

  /* ======================= SEQUÊNCIA RÁPIDA DE INTUBAÇÃO ======================= */
  const SRI = [
    { sec: 'Pré-tratamento', n: 'Fentanil', lo: 1, hi: 3, u: 'mcg', c: 50, cu: 'mcg/mL', obs: 'TCE, DAC, dissecção de aorta. 3 min antes.' },
    { n: 'Lidocaína', lo: 1.5, hi: 1.5, u: 'mg', c: 20, cu: 'mg/mL', obs: 'Evidência limitada (TCE/asma).' },
    { n: 'Atropina', lo: 0.02, hi: 0.02, u: 'mg', c: 0.25, cu: 'mg/mL', min: 0.1, max: 0.5, obs: 'Crianças pequenas: mín. 0,1 mg e máx. 0,5 mg.' },
    { sec: 'Indução', n: 'Etomidato', lo: 0.3, hi: 0.3, u: 'mg', c: 2, cu: 'mg/mL', obs: 'Estabilidade hemodinâmica. Supressão adrenal transitória.' },
    { n: 'Cetamina', lo: 1, hi: 2, u: 'mg', c: 50, cu: 'mg/mL', obs: 'Broncoespasmo e choque. Hipertensão e taquicardia.' },
    { n: 'Propofol', lo: 1, hi: 2, u: 'mg', c: 10, cu: 'mg/mL', obs: 'Evitar se instável. Reduzir dose no choque.' },
    { n: 'Midazolam', lo: 0.1, hi: 0.3, u: 'mg', c: 5, cu: 'mg/mL', obs: 'Hipotensão; reduzir em idosos e instáveis.' },
    { sec: 'Bloqueio neuromuscular', n: 'Succinilcolina', lo: 1, hi: 2, u: 'mg', c: 10, cu: 'mg/mL', obs: 'Adulto 1 a 1,5; crianças até 2. Conferir a diluição do seu frasco (100 mg em 10 mL = 10 mg/mL). Contraindicações: hipercalemia, queimadura/esmagamento tardio, doenças neuromusculares.' },
    { n: 'Rocurônio', lo: 0.6, hi: 1.2, u: 'mg', c: 10, cu: 'mg/mL', obs: 'Alternativa se há contraindicação à succinilcolina. 1,2 mg/kg inicia em ~60 s.' }
  ];
  const sriTool = {
    id: 'sri', g: 'med', title: 'Sequência rápida de intubação',
    desc: 'Doses em mg e mL conforme o peso, tamanho do tubo, fixação na rima labial e lâmina',
    kw: 'iot sri intubacao etomidato cetamina propofol midazolam succinilcolina rocuronio fentanil lidocaina atropina via aerea',
    fields: [F.KG(), F.AGE({ hint: 'Opcional: define tubo, fixação e lâmina (criança abaixo de 16 anos)' }), F.SEX(), F.NOTE('Obesidade: succinilcolina por peso real; rocurônio e indutores lipofílicos, em geral, por peso ideal ou ajustado.')],
    calc: v => {
      const kg = v.kg; if (!(kg > 0)) return { alerts: [{ lvl: 'warn', text: 'Informe o peso do paciente.' }] };
      const rows = []; const txt = [];
      SRI.forEach(s => {
        if (s.sec) rows.push({ sec: s.sec });
        let lo = s.lo * kg, hi = s.hi * kg;
        if (s.min) { lo = Math.max(lo, s.min); hi = Math.max(hi, s.min); }
        if (s.max) { lo = Math.min(lo, s.max); hi = Math.min(hi, s.max); }
        const dose = `${u.range(s.lo, s.hi, 2)} ${s.u}/kg`;
        rows.push({ cells: [s.n, dose, `${u.rangeAuto(lo, hi)} ${s.u}`, `${u.rangeAuto(lo / s.c, hi / s.c)} mL`] });
        txt.push(`${s.n} ${u.rangeAuto(lo, hi)} ${s.u} (${u.rangeAuto(lo / s.c, hi / s.c)} mL a ${fmt(s.c, 2)} ${s.cu})`);
      });
      const y = v.age, m = y * 12, ped = isFinite(y) && y < 16, av = [];
      if (ped) {
        const cuf = y >= 1 ? y / 4 + 3.5 : m < 1 ? 3.0 : 3.5, sem = y >= 1 ? y / 4 + 4 : m < 1 ? 3.5 : 4.0;
        const bl = m < 1 ? 'Miller 0 a 1' : y < 1 ? 'Miller 1' : y < 2 ? 'Miller 1,5 a Macintosh 2' : y < 6 ? 'Macintosh 2' : y < 12 ? 'Macintosh 2 a 3' : 'Macintosh 3';
        av.push(['Tubo orotraqueal com cuff', `${fmt(Math.round(cuf * 2) / 2, 1)} mm`], ['Tubo sem cuff', `${fmt(Math.round(sem * 2) / 2, 1)} mm`], ['Fixação na rima labial', `${fmt(3 * Math.round(cuf * 2) / 2, 1)} cm (3 × diâmetro do tubo com cuff)`], ['Lâmina do laringoscópio', bl]);
      } else {
        const fem = v.sex === 'F', mas = v.sex === 'M';
        av.push(['Tubo orotraqueal (adulto)', mas ? '7,5 a 8,0 mm' : fem ? '7,0 a 7,5 mm' : 'Feminino 7,0 a 7,5; masculino 7,5 a 8,0 mm'], ['Fixação na rima labial', mas ? '22 a 23 cm' : fem ? '20 a 21 cm' : 'Feminino 20 a 21 cm; masculino 22 a 23 cm'], ['Lâmina do laringoscópio', 'Macintosh 3 (4 se paciente alto/pescoço longo) ou Miller 3']);
      }
      return {
        main: { label: 'Peso utilizado', value: fmt(kg, 1), unit: 'kg' },
        rows: av,
        table: { head: ['Fármaco', 'Dose/kg', 'Dose', 'Volume'], rows, cap: 'Concentrações usadas: fentanil 50 mcg/mL, lidocaína 2%, atropina 0,25 mg/mL, etomidato 2 mg/mL, cetamina 50 mg/mL, propofol 10 mg/mL, midazolam 5 mg/mL, succinilcolina 10 mg/mL e rocurônio 10 mg/mL.' },
        alerts: [{ lvl: 'info', text: 'Escolha um indutor e um bloqueador. Em choque/hipotensão, reduzir a dose do indutor e preparar vasopressor antes da indução.' }, { lvl: 'info', text: 'Tubo, fixação e lâmina são estimativas: confirme com capnografia e ausculta; ajuste ao paciente (altura, via aérea difícil) e tenha um tubo 0,5 mm menor e outro maior.' }],
        notes: SRI.filter(s => s.obs).map(s => `${s.n}: ${s.obs}`),
        text: 'Sequência rápida de intubação (' + fmt(kg, 1) + ' kg): ' + txt.join('; ') + '. ' + av.map(x => x[0] + ': ' + x[1]).join('; ') + '.'
      };
    }
  };

  /* ======================= TROMBOLÍTICOS ======================= */
  const tromb = {
    id: 'tromb', g: 'med', title: 'Trombolíticos',
    desc: 'Alteplase e tenecteplase: dose total, bolus e infusão para AVC, IAM e TEP',
    kw: 'alteplase tenecteplase tnk rtpa trombolise avc iam tep embolia infarto stroke',
    disc: 'Confirme indicação, janela terapêutica e contraindicações com o protocolo institucional antes de trombolisar.',
    fields: [F.SEL('ind', 'Indicação e fármaco', [['avc_alt', 'AVC isquêmico: alteplase'], ['avc_tnk', 'AVC isquêmico: tenecteplase'], ['iam_tnk', 'IAM com supra de ST: tenecteplase'], ['tep_alt', 'TEP de alto risco: alteplase']], { def: 'avc_alt' }), F.KG()],
    calc: v => {
      const kg = v.kg; if (!(kg > 0)) return { alerts: [{ lvl: 'warn', text: 'Informe o peso do paciente.' }] };
      if (v.ind === 'avc_alt') {
        const tot = Math.min(0.9 * kg, 90), b = 0.1 * tot, inf = tot - b;
        return { main: { label: 'Dose total de alteplase', value: fmt(tot, 1), unit: 'mg' },
          rows: [['Bolus IV em 1 min (10%)', `${fmt(b, 1)} mg`], ['Infusão em 60 min (90%)', `${fmt(inf, 1)} mg`], ['Concentração (50 mg + 50 mL)', '1 mg/mL'], ['Bolus (volume)', `${fmt(b, 1)} mL`], ['Bomba de infusão', `${fmt(inf, 1)} mL/h por 1 h`]],
          alerts: [{ lvl: 'info', text: '0,9 mg/kg, máx. 90 mg. Janela de até 4,5 h do início dos sintomas. PA < 185/110 mmHg antes e < 180/105 mmHg nas 24 h seguintes. Verificar glicemia e contraindicações.' }],
          text: `Alteplase (AVC) ${fmt(tot, 1)} mg: bolus ${fmt(b, 1)} mg em 1 min e ${fmt(inf, 1)} mg em 60 min (${fmt(kg, 1)} kg).` };
      }
      if (v.ind === 'avc_tnk') {
        const d = Math.min(0.25 * kg, 25);
        return { main: { label: 'Dose de tenecteplase', value: fmt(d, 1), unit: 'mg' },
          rows: [['Bolus IV único em ~5 s', `${fmt(d, 1)} mg`], ['Volume (5 mg/mL: 50 mg + 10 mL de AD)', `${fmt(d / 5, 1)} mL`]],
          alerts: [{ lvl: 'info', text: '0,25 mg/kg, máx. 25 mg. Janela e critérios de seleção iguais aos da alteplase no seu protocolo. Sem infusão posterior.' }],
          text: `Tenecteplase (AVC) ${fmt(d, 1)} mg em bolus único (${fmt(kg, 1)} kg).` };
      }
      if (v.ind === 'iam_tnk') {
        const d = kg < 60 ? 30 : kg < 70 ? 35 : kg < 80 ? 40 : kg < 90 ? 45 : 50;
        return { main: { label: 'Dose de tenecteplase', value: fmt(d, 0), unit: 'mg' },
          rows: [['Faixa de peso', kg < 60 ? '< 60 kg' : kg < 90 ? `${Math.floor(kg / 10) * 10} a ${Math.floor(kg / 10) * 10 + 9} kg` : '≥ 90 kg'], ['Bolus IV único em ~5 s', `${fmt(d, 0)} mg`], ['Volume (5 mg/mL)', `${fmt(d / 5, 1)} mL`]],
          alerts: [{ lvl: 'info', text: 'Dose por faixa de peso. Em ≥ 75 anos, muitos protocolos reduzem à metade da dose. Associar AAS, segundo antiagregante e anticoagulação conforme protocolo. Indicado se ICP primária não for possível em até 120 min.' }],
          text: `Tenecteplase (IAMCSST) ${fmt(d, 0)} mg em bolus único (${fmt(kg, 1)} kg).` };
      }
      return { main: { label: 'Dose de alteplase', value: '100', unit: 'mg em 2 h' },
        rows: [['Infusão', '50 mg/h por 2 h'], ['Concentração (50 mg + 50 mL)', '1 mg/mL'], ['Bomba de infusão', '50 mL/h por 2 h']],
        alerts: [{ lvl: 'info', text: 'Esquema de 100 mg em 2 h. Parada cardíaca por TEP: 50 mg em bolus, repetindo 1× em 15 min se necessário. Suspender a heparina durante a infusão e reiniciar após o término conforme protocolo.' }],
        text: 'Alteplase (TEP) 100 mg em 2 h.' };
    }
  };

  /* ======================= INSULINA ======================= */
  const insulina = {
    id: 'ins', g: 'med', title: 'Insulina: correção e cetoacidose',
    desc: 'Fator de sensibilidade, correção de glicemia e infusão na CAD',
    kw: 'insulina cad cetoacidose diabetica hiperglicemia glicemia correcao sensibilidade carboidrato dka hipoglicemia',
    fields: v => {
      const out = [F.SEG('mode', '', [['corr', 'Correção de glicemia'], ['cad', 'CAD: infusão']], { def: 'corr' })];
      if (v.mode === 'cad') {
        out.push(F.KG(), F.AGE(), F.N('gl', 'Glicemia', { unit: 'mg/dL' }), F.N('k', 'Potássio sérico', { unit: 'mEq/L' }));
      } else {
        out.push(F.N('dtd', 'Dose total diária de insulina', { unit: 'U/dia', full: true }),
          F.SEG('tipo', 'Insulina de correção', [['1800', 'Análogo rápido (1800)'], ['1500', 'Regular (1500)']], { def: '1800' }),
          F.N('gl', 'Glicemia atual', { unit: 'mg/dL' }), F.N('alvo', 'Glicemia alvo', { unit: 'mg/dL', def: 120 }),
          F.N('cho', 'Carboidrato da refeição (opcional)', { unit: 'g', full: true }));
      }
      return out;
    },
    calc: v => {
      if (v.mode === 'cad') {
        const kg = v.kg; if (!(kg > 0)) return { alerts: [{ lvl: 'warn', text: 'Informe o peso do paciente.' }] };
        const ped = isFinite(v.age) && v.age < 18;
        const lo = (ped ? 0.05 : 0.1) * kg, hi = 0.1 * kg;
        const al = [];
        if (isFinite(v.k)) {
          if (v.k < 3.3) al.push({ lvl: 'crit', text: 'K⁺ < 3,3 mEq/L: não iniciar insulina até repor potássio (20 a 30 mEq/h) e K⁺ ≥ 3,3.' });
          else if (v.k <= 5.2) al.push({ lvl: 'warn', text: 'K⁺ 3,3 a 5,2 mEq/L: iniciar insulina e adicionar 20 a 30 mEq de KCl por litro de solução.' });
          else al.push({ lvl: 'info', text: 'K⁺ > 5,2 mEq/L: iniciar insulina sem reposição; dosar K⁺ a cada 2 h.' });
        }
        if (isFinite(v.gl) && v.gl <= 250) al.push({ lvl: 'warn', text: 'Glicemia ≤ 250 mg/dL: adicionar glicose (SG 5 a 10%) ao hidratante e manter a insulina até resolver a cetose.' });
        al.push({ lvl: 'info', text: 'Hidratação inicial: SF 0,9% (adulto 15 a 20 mL/kg na 1ª hora; criança 10 mL/kg). Meta de queda da glicemia: 50 a 75 mg/dL/h. Reavaliar glicemia a cada 1 h, eletrólitos e gasometria a cada 2 a 4 h.' });
        return { main: { label: 'Insulina regular IV contínua', value: u.range(lo, hi, 1), unit: 'U/h' },
          rows: [['Dose', ped ? '0,05 a 0,1 U/kg/h' : '0,1 U/kg/h'], ['Bomba (1 U/mL)', `${u.range(lo, hi, 1)} mL/h`]],
          alerts: al, text: `CAD: insulina regular IV contínua ${u.range(lo, hi, 1)} U/h (${fmt(kg, 1)} kg).` };
      }
      const dtd = v.dtd, gl = v.gl, alvo = v.alvo, cho = v.cho;
      if (!(dtd > 0)) return { alerts: [{ lvl: 'warn', text: 'Informe a dose total diária de insulina (basal + bolus).' }] };
      const fs = Number(v.tipo || 1800) / dtd, ric = 500 / dtd;
      const corr = isFinite(gl) && isFinite(alvo) ? Math.max(0, (gl - alvo) / fs) : NaN;
      const ref = isFinite(cho) ? cho / ric : 0;
      const rows = [['Fator de sensibilidade', `1 U reduz ~${fmt(fs, 0)} mg/dL`], ['Relação insulina:carboidrato', `1 U para ${fmt(ric, 0)} g`]];
      if (isFinite(cho)) rows.push(['Insulina da refeição', `${fmt(ref, 1)} U`]);
      if (isFinite(corr)) rows.push(['Insulina de correção', `${fmt(corr, 1)} U`]);
      const tot = (isFinite(corr) ? corr : 0) + ref;
      return { main: isFinite(corr) || isFinite(cho) ? { label: 'Dose total sugerida', value: fmt(tot, 1), unit: 'U' } : { label: 'Fator de sensibilidade', value: fmt(fs, 0), unit: 'mg/dL por U' },
        rows, alerts: [{ lvl: 'info', text: 'Regra dos 1800 (análogos) ou 1500 (regular) e regra dos 500 para carboidrato. Estimativas: individualize e ajuste à sensibilidade do paciente, a insulinoterapia em uso e a função renal.' }],
        text: `Insulina: FS ${fmt(fs, 0)} mg/dL/U; correção ${isFinite(corr) ? fmt(corr, 1) + ' U' : 'não calculada'}.` };
    }
  };

  /* ======================= ELETRÓLITOS mEq ⇄ mL ======================= */
  const SOL = [
    ['kcl', 'Cloreto de potássio 19,1% (2,56 mEq/mL)', 2.56], ['nacl20', 'Cloreto de sódio 20% (3,42 mEq/mL)', 3.42], ['nacl3', 'Cloreto de sódio 3% (0,513 mEq/mL)', 0.513],
    ['nahco3', 'Bicarbonato de sódio 8,4% (1 mEq/mL)', 1], ['caglu', 'Gluconato de cálcio 10% (0,465 mEq/mL)', 0.465],
    ['mg50', 'Sulfato de magnésio 50% (4,06 mEq/mL)', 4.06], ['mg10', 'Sulfato de magnésio 10% (0,81 mEq/mL)', 0.81]
  ];
  const eletro = {
    id: 'eletro', g: 'med', title: 'Eletrólitos: mEq ⇄ mL',
    desc: 'Converta a reposição em mEq para o volume de ampola (KCl, NaCl, bicarbonato, cálcio e magnésio)',
    kw: 'potassio kcl sodio nacl bicarbonato calcio magnesio reposicao ampola meq hipocalemia hipomagnesemia',
    fields: v => [F.SEL('sol', 'Solução concentrada', SOL.map(s => [s[0], s[1]]), { def: 'kcl' }),
      F.SEG('mode', '', [['meq', 'mEq → mL'], ['ml', 'mL → mEq']], { def: 'meq', reset: ['val'] }),
      F.N('val', v.mode === 'ml' ? 'Volume' : 'Quantidade desejada', { unit: v.mode === 'ml' ? 'mL' : 'mEq', full: true })],
    calc: v => {
      const s = SOL.find(x => x[0] === v.sol) || SOL[0], c = s[2], x = v.val;
      if (!isFinite(x)) return null;
      const ml = v.mode === 'ml' ? x : x / c, meq = v.mode === 'ml' ? x * c : x;
      const al = [], rows = [['Concentração', `${fmt(c, 3)} mEq/mL`]];
      if (s[0] === 'kcl') {
        rows.push(['Tempo mínimo (periférico, 10 mEq/h)', `${fmt(meq / 10, 1)} h`], ['Tempo mínimo (central, 20 mEq/h)', `${fmt(meq / 20, 1)} h`], ['Volume final mínimo (≤ 40 mEq/L periférico)', `${fmt(meq / 40 * 1000, 0)} mL`]);
        al.push({ lvl: 'crit', text: 'Potássio nunca em bolus. Diluir sempre; ECG/monitorização em reposição acima de 10 mEq/h ou em acesso central.' });
      }
      if (s[0] === 'nacl20') al.push({ lvl: 'info', text: 'Sempre diluir (adicionar ao soro).' });
      if (s[0] === 'nacl3') al.push({ lvl: 'info', text: 'Hiponatremia grave sintomática: bolus de 100 a 150 mL (ou 2 mL/kg) em 10 min, repetível até 3 vezes, buscando elevação de 4 a 6 mEq/L.' });
      if (s[0] === 'caglu') al.push({ lvl: 'info', text: 'Infundir lentamente (10 min) com monitorização do ECG.' });
      return { main: { label: v.mode === 'ml' ? 'Quantidade' : 'Volume', value: v.mode === 'ml' ? fmt(meq, 2) : u.auto(ml), unit: v.mode === 'ml' ? 'mEq' : 'mL' }, rows, alerts: al,
        text: `${s[1].split(' (')[0]}: ${fmt(meq, 2)} mEq = ${u.auto(ml)} mL.` };
    }
  };

  /* ======================= DOSE POR kg GENÉRICA ======================= */
  const mgkg = {
    id: 'mgkg', g: 'med', title: 'Dose por kg e volume',
    desc: 'Qualquer dose em mg/kg: dose total, volume pela concentração e dose diária',
    kw: 'mg/kg dose peso volume concentracao calcular generica',
    fields: [F.KG(), F.N('dkg', 'Dose por kg', { unit: 'mg/kg' }), F.N('c', 'Concentração', { unit: 'mg/mL' }), F.N('n', 'Doses por dia (opcional)', { unit: '×/dia' }), F.N('mx', 'Dose máxima por dose (opcional)', { unit: 'mg', full: true })],
    calc: v => {
      if (!(v.kg > 0) || !(v.dkg > 0)) return null;
      let dose = v.dkg * v.kg; const al = [];
      if (v.mx > 0 && dose > v.mx) { dose = v.mx; al.push({ lvl: 'warn', text: `Dose limitada ao máximo informado (${fmt(v.mx, 1)} mg).` }); }
      const rows = [['Dose', `${u.auto(dose)} mg`]];
      if (v.c > 0) rows.push(['Volume', `${u.auto(dose / v.c)} mL`]);
      if (v.n > 0) rows.push(['Dose diária', `${u.auto(dose * v.n)} mg (${fmt(dose * v.n / v.kg, 1)} mg/kg/dia)`]);
      return { main: { label: 'Dose', value: u.auto(dose), unit: 'mg' }, rows, alerts: al, text: `${fmt(v.dkg, 2)} mg/kg × ${fmt(v.kg, 1)} kg = ${u.auto(dose)} mg${v.c > 0 ? ' (' + u.auto(dose / v.c) + ' mL)' : ''}.` };
    }
  };

  D.add(doseTool, infTool, sriTool, tromb, insulina, eletro, mgkg);
})();
