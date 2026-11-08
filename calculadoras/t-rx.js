/* Receitas prontas: modelos de prescrição ambulatorial (adulto e pediatria) no formato do receituário */
(function () {
  'use strict';
  const D = window.DRB, u = D.u;

  /* ---------- auxiliares de dose pediátrica ---------- */
  const B = '___';
  const br = n => String(n).replace('.', ',');
  const r05 = v => v >= 3 ? Math.round(v * 2) / 2 : Math.round(v * 10) / 10;
  const gt = (perKg, max) => c => c.kg > 0 ? String(Math.max(1, Math.round(Math.min(c.kg * perKg, max)))) : B;
  const ml = (perKg, max) => c => c.kg > 0 ? br(r05(Math.min(c.kg * perKg, max))) : B;
  const byAge = (bands, minTxt) => c => {
    if (!isFinite(c.age)) return B;
    for (const [lim, txt] of bands) if (c.age < lim) return txt;
    return minTxt || bands[bands.length - 1][1];
  };

  /* ---------- itens: [via, nome, quantidade, posologia, opcional] ---------- */
  const I = (v, n, q, p) => ({ v, n, q, p });
  const O = (v, n, q, p) => ({ v, n, q, p, opt: true });
  const VIA = { ORAL: 'USO ORAL', TOP: 'USO TÓPICO', OFT: 'USO OFTALMOLÓGICO', OTO: 'USO OTOLÓGICO', NAS: 'USO NASAL', INAL: 'USO INALATÓRIO', IM: 'USO INTRAMUSCULAR', VAG: 'USO VAGINAL', RET: 'USO RETAL', BUC: 'USO BUCAL' };

  const DIP = I('ORAL', 'DIPIRONA 500MG', '20 CP', '01 A 02 CP VO DE 6/6H SE DOR OU FEBRE');
  const PARA = O('ORAL', 'PARACETAMOL 500MG', '20 CP', '01 CP VO DE 6/6H SE DOR OU FEBRE');
  const BROMO = I('ORAL', 'BROMOPRIDA 10MG', '20 CP', '01 CP VO DE 8/8H SE NÁUSEA OU VÔMITOS');
  const SRO = I('ORAL', 'SORO DE REIDRATAÇÃO ORAL', '05 SACHÊS', 'DILUIR 01 SACHÊ EM 01 LITRO DE ÁGUA FILTRADA E TOMAR 01 COPO A CADA PERDA (EVACUAÇÃO OU VÔMITO) OU DE 2/2H');
  const IBU600 = I('ORAL', 'IBUPROFENO 600MG', '15 CP', '01 CP VO DE 8/8H POR 05 DIAS, APÓS AS REFEIÇÕES');
  const LORA = I('ORAL', 'LORATADINA 10MG', '07 CP', '01 CP VO 1X AO DIA, À NOITE, POR 07 DIAS');
  const SFN = I('NAS', 'SORO FISIOLÓGICO 0,9%', '01 FR', 'LAVAR AS NARINAS ABUNDANTEMENTE 3 A 4X AO DIA');

  // pediatria
  const pDIP = I('ORAL', 'DIPIRONA GOTAS 500MG/ML', '01 FR', c => `${gt(1, 40)(c)} GOTAS VO DE 6/6H SE DOR OU FEBRE`);
  const pPARA = O('ORAL', 'PARACETAMOL GOTAS 200MG/ML', '01 FR', c => `${gt(1, 50)(c)} GOTAS VO DE 6/6H SE DOR OU FEBRE`);
  const pIBU = I('ORAL', 'IBUPROFENO GOTAS 50MG/ML', '01 FR', c => `${gt(2, 40)(c)} GOTAS VO DE 8/8H POR 03 A 05 DIAS, APÓS ALIMENTAÇÃO`);
  const pBROMO = I('ORAL', 'BROMOPRIDA GOTAS 4MG/ML', '01 FR', c => `${gt(1, 30)(c)} GOTAS VO DE 8/8H SE NÁUSEA OU VÔMITOS`);
  const pDESLO = I('ORAL', 'DESLORATADINA 0,5MG/ML', '01 FR', c => `${byAge([[1, '2 ML'], [6, '2,5 ML'], [12, '5 ML']], '10 ML')(c)} VO 1X AO DIA POR 07 DIAS`);
  const pAMBROX = I('ORAL', 'AMBROXOL XAROPE PEDIÁTRICO 15MG/5ML', '01 FR', c => `${byAge([[2, '2,5 ML VO DE 12/12H'], [6, '2,5 ML VO DE 8/8H'], [12, '5 ML VO DE 8/8H']], '10 ML VO DE 8/8H')(c)} POR 05 DIAS`);
  const pDEXCL = I('ORAL', 'DEXCLORFENIRAMINA 2MG/5ML', '01 FR', c => `${byAge([[2, B + ' (NÃO USAR ABAIXO DE 2 ANOS)'], [6, '1,25 ML'], [12, '2,5 ML']], '5 ML')(c)} VO DE 8/8H POR 05 DIAS SE COCEIRA`);
  const pPRED = I('ORAL', 'PREDNISOLONA 3MG/ML', '01 FR', c => `${ml(1 / 3, 13)(c)} ML VO 1X AO DIA, PELA MANHÃ, POR 05 DIAS`);
  const pSFN = I('NAS', 'SORO FISIOLÓGICO 0,9%', '01 FR', 'LAVAR ABUNDANTEMENTE AS NARINAS 3 A 4X AO DIA');

  const ORI_OLHO = 'NÃO COÇAR OS OLHOS. LAVAR AS MÃOS SEMPRE QUE TOCAR OS OLHOS. TOALHAS E FRONHAS DE USO INDIVIDUAL. NÃO USAR LENTE DE CONTATO DURANTE O TRATAMENTO. PROCURAR OFTALMOLOGISTA SE DOR FORTE, PIORA DA VISÃO, SENSIBILIDADE À LUZ OU SEM MELHORA EM 48 A 72H.';
  const ORI_FEBRE = 'RETORNAR SE FEBRE PERSISTENTE POR MAIS DE 72H, FALTA DE AR, PROSTRAÇÃO, VÔMITOS QUE IMPEDEM A ALIMENTAÇÃO OU PIORA DO ESTADO GERAL.';
  const ORI_DIARREIA = 'MANTER ALIMENTAÇÃO LEVE E FRACIONADA, OFERECER LÍQUIDOS COM FREQUÊNCIA. RETORNAR SE SANGUE NAS FEZES, VÔMITOS QUE IMPEDEM A HIDRATAÇÃO, POUCA URINA, SONOLÊNCIA OU FEBRE ALTA.';

  /* ---------- categorias ---------- */
  const CATS = [
    ['olho', 'Olhos', 'Conjuntivites, hordéolo, hiposfagma, olho seco'],
    ['orl', 'Ouvido, nariz e garganta', 'IVAS, gripe, amigdalite, otite, sinusite, rinite, cerume, afta'],
    ['resp', 'Respiratório e alergia', 'Alergia, urticária, asma, pneumonia, tosse'],
    ['gi', 'Gastrointestinal', 'GECA, diarreia, gastrite, DRGE, constipação, hemorroida, vômitos'],
    ['gu', 'Urinário, genital e IST', 'Cistite, pielonefrite, gestante, candidíase, vaginose, uretrite, cólica renal'],
    ['pele', 'Pele', 'Impetigo, erisipela, furúnculo, escabiose, herpes, micoses, queimadura, sutura'],
    ['dor', 'Dor e musculoesquelético', 'Lombalgia, mialgia, cefaleia, enxaqueca, gota, entorse'],
    ['out', 'Outros', 'Dengue, labirintite, anemia, paralisia de Bell, verminose']
  ];

  /* ---------- receitas ---------- */
  const R = [
    /* ===== OLHOS ===== */
    { id: 'conj-bac', t: 'Conjuntivite bacteriana', c: 'olho', kw: 'olho vermelho secreção purulenta colírio tobramicina ciprofloxacino', it: [
      I('OFT', 'TOBRAMICINA 0,3% COLÍRIO', '01 FR', 'PINGAR 01 GOTA NO(S) OLHO(S) ACOMETIDO(S) DE 6/6H POR 07 DIAS'),
      I('OFT', 'SORO FISIOLÓGICO 0,9%', '01 FR', 'LIMPAR AS SECREÇÕES COM GAZE E SORO ANTES DE PINGAR O COLÍRIO'),
      O('OFT', 'CIPROFLOXACINO 0,3% COLÍRIO', '01 FR', 'PINGAR 01 GOTA NO(S) OLHO(S) ACOMETIDO(S) 4 A 6X AO DIA POR 07 DIAS'),
      O('OFT', 'OFLOXACINO 0,3% COLÍRIO', '01 FR', 'PINGAR 01 GOTA NO(S) OLHO(S) ACOMETIDO(S) DE 6/6H POR 07 DIAS'),
      O('OFT', 'TOBRAMICINA + DEXAMETASONA COLÍRIO', '01 FR', 'PINGAR 01 GOTA NO(S) OLHO(S) ACOMETIDO(S) DE 6/6H POR 07 DIAS')],
      ori: ['COMPRESSAS FRIAS 4X AO DIA POR 15 MINUTOS. ' + ORI_OLHO],
      nota: 'Escolha um antibiótico. Colírio com corticoide (tobramicina + dexametasona) sem avaliação oftalmológica pode mascarar ceratite herpética ou úlcera e elevar a pressão intraocular. Secreção hiperpurulenta ou suspeita de IST: ver conjuntivite gonocócica.' },
    { id: 'conj-vir', t: 'Conjuntivite viral', c: 'olho', kw: 'olho vermelho adenovírus secreção aquosa lacrimejamento', it: [
      I('OFT', 'SORO FISIOLÓGICO 0,9% GELADO', '01 FR', 'LAVAR O(S) OLHO(S) ACOMETIDO(S) 4 A 6X AO DIA'),
      I('OFT', 'COLÍRIO LUBRIFICANTE (CARMELOSE 0,5%)', '01 FR', 'PINGAR 01 GOTA EM CADA OLHO 4 A 6X AO DIA (MANTER NA GELADEIRA)'),
      O('ORAL', 'LORATADINA 10MG', '07 CP', '01 CP VO 1X AO DIA POR 07 DIAS')],
      ori: ['COMPRESSAS GELADAS 4X AO DIA POR 15 MINUTOS. A CONJUNTIVITE VIRAL É CONTAGIOSA E DURA DE 7 A 21 DIAS. ' + ORI_OLHO],
      nota: 'Antibiótico não é necessário. Pseudomembranas, baixa visual ou dor intensa: avaliação oftalmológica.' },
    { id: 'conj-ale', t: 'Conjuntivite alérgica', c: 'olho', kw: 'olho coceira prurido bilateral alergia cetotifeno', it: [
      I('OFT', 'CETOTIFENO 0,025% COLÍRIO', '01 FR', 'PINGAR 01 GOTA EM CADA OLHO DE 12/12H POR 14 DIAS'),
      I('OFT', 'COLÍRIO LUBRIFICANTE (CARMELOSE 0,5%)', '01 FR', 'PINGAR 01 GOTA EM CADA OLHO 4X AO DIA (MANTER NA GELADEIRA)'),
      LORA,
      O('OFT', 'OLOPATADINA 0,1% COLÍRIO', '01 FR', 'PINGAR 01 GOTA EM CADA OLHO DE 12/12H POR 14 DIAS')],
      ori: ['COMPRESSAS GELADAS 4X AO DIA POR 15 MINUTOS. EVITAR O FATOR DESENCADEANTE (POEIRA, PELOS, FUMAÇA). ' + ORI_OLHO],
      nota: 'Casos graves podem precisar de corticoide tópico, mas com acompanhamento oftalmológico.' },
    { id: 'conj-gono', t: 'Conjuntivite gonocócica ou por clamídia (adulto)', c: 'olho', kw: 'conjuntivite hiperaguda purulenta ist gonorreia clamídia ceftriaxona', it: [
      I('IM', 'CEFTRIAXONA 500MG', '01 FA', 'APLICAR 01 FA IM DOSE ÚNICA (ADMINISTRAR NA UNIDADE)'),
      I('ORAL', 'AZITROMICINA 500MG', '02 CP', 'TOMAR 02 CP VO EM DOSE ÚNICA'),
      I('OFT', 'CIPROFLOXACINO 0,3% COLÍRIO', '01 FR', 'PINGAR 01 GOTA NO OLHO ACOMETIDO DE 2/2H NAS PRIMEIRAS 48H E DEPOIS DE 4/4H POR 07 DIAS'),
      I('OFT', 'SORO FISIOLÓGICO 0,9%', '01 FR', 'LAVAR O OLHO ACOMETIDO VÁRIAS VEZES AO DIA')],
      ori: ['TRATAR PARCERIAS SEXUAIS. RETORNO DIÁRIO ATÉ A MELHORA. PROCURAR OFTALMOLOGISTA COM URGÊNCIA.'],
      nota: 'Encaminhar ao oftalmologista: risco de perfuração da córnea. Acometimento de córnea exige internação e ceftriaxona EV. Em criança, considerar abuso sexual.' },
    { id: 'hordeolo', t: 'Hordéolo (terçol)', c: 'olho', kw: 'terçol calázio pálpebra tobramicina pomada compressa morna', it: [
      I('OFT', 'TOBRAMICINA 0,3% POMADA OFTÁLMICA', '01 TB', 'APLICAR NA PÁLPEBRA ACOMETIDA 2 A 3X AO DIA POR 05 A 07 DIAS'),
      O('OFT', 'OFLOXACINO 0,3% COLÍRIO', '01 FR', 'PINGAR 02 GOTAS NO OLHO ACOMETIDO DE 6/6H POR 07 DIAS'),
      O('OFT', 'DEXAMETASONA + NEOMICINA + POLIMIXINA B (MAXITROL) COLÍRIO', '01 FR', 'PINGAR 02 GOTAS NO OLHO ACOMETIDO DE 6/6H POR 07 DIAS')],
      ori: ['COMPRESSAS MORNAS SOBRE A PÁLPEBRA POR 10 MINUTOS, 4X AO DIA. NÃO ESPREMER. PROCURAR OFTALMOLOGISTA SE NÃO MELHORAR EM 1 A 2 SEMANAS.'] },
    { id: 'hiposfagma', t: 'Hemorragia subconjuntival (hiposfagma)', c: 'olho', kw: 'sangue no olho hiposfagma derrame', it: [
      I('OFT', 'COLÍRIO LUBRIFICANTE (CARMELOSE 0,5%)', '01 FR', 'PINGAR 01 GOTA NO OLHO ACOMETIDO 4X AO DIA SE DESCONFORTO')],
      ori: ['A MANCHA DESAPARECE SOZINHA EM 1 A 3 SEMANAS, MUDANDO DE COR. MEDIR A PRESSÃO ARTERIAL. PROCURAR ATENDIMENTO SE DOR, PIORA DA VISÃO OU SANGRAMENTOS EM OUTROS LOCAIS.'],
      nota: 'Conduta expectante. Investigar se recorrente, uso de anticoagulante ou trauma com baixa visual.' },
    { id: 'olho-seco', t: 'Olho seco e irritação ocular', c: 'olho', kw: 'lubrificante lacrima colírio ressecamento', it: [
      I('OFT', 'COLÍRIO LUBRIFICANTE (CARMELOSE 0,5%)', '01 FR', 'PINGAR 01 GOTA EM CADA OLHO DE 2/2H A 4/4H, CONFORME NECESSIDADE')],
      ori: ['FAZER PAUSAS EM TELAS, PISCAR COM FREQUÊNCIA, EVITAR AR-CONDICIONADO DIRETO NOS OLHOS.'] },

    /* ===== OUVIDO, NARIZ E GARGANTA ===== */
    { id: 'ivas', t: 'IVAS / resfriado comum', c: 'orl', kw: 'resfriado coriza nariz entupido dor de garganta tosse gripe', it: [
      DIP, I('ORAL', 'IBUPROFENO 600MG', '09 CP', '01 CP VO DE 8/8H POR 03 DIAS, APÓS AS REFEIÇÕES'),
      I('ORAL', 'DESLORATADINA 5MG', '07 CP', '01 CP VO AO DIA POR 07 DIAS'),
      I('ORAL', 'AMBROXOL XAROPE ADULTO 30MG/5ML', '01 FR', '05 ML VO DE 8/8H POR 05 DIAS'), SFN],
      ori: [ORI_FEBRE] },
    { id: 'gripe', t: 'Síndrome gripal (influenza)', c: 'orl', kw: 'gripe influenza oseltamivir tamiflu febre mialgia', it: [
      DIP, LORA, I('ORAL', 'OSELTAMIVIR 75MG', '10 CP', '01 CP VO DE 12/12H POR 05 DIAS'), SFN,
      O('ORAL', 'ACETILCISTEÍNA 600MG ENVELOPE', '05 ENV', 'DILUIR 01 ENVELOPE EM MEIO COPO DE ÁGUA E TOMAR 1X AO DIA POR 05 DIAS')],
      ori: ['REPOUSO E HIDRATAÇÃO. ISOLAMENTO ENQUANTO HOUVER FEBRE. ' + ORI_FEBRE],
      nota: 'Oseltamivir: indicado em síndrome gripal com fator de risco para complicação (idade ≥ 60 anos, gestante, puérpera, doença crônica, imunossupressão) ou SRAG, idealmente em até 48 h. Ajustar na disfunção renal.' },
    { id: 'amig-bac', t: 'Amigdalite bacteriana', c: 'orl', kw: 'faringoamigdalite estreptocócica placa pus garganta amoxicilina benzetacil', it: [
      I('ORAL', 'AMOXICILINA 500MG', '30 CP', '01 CP VO DE 8/8H POR 10 DIAS'),
      IBU600, DIP,
      O('IM', 'PENICILINA G BENZATINA 1.200.000 UI', '01 FA', 'APLICAR 01 FA IM DOSE ÚNICA (NA UNIDADE)'),
      O('ORAL', 'AZITROMICINA 500MG', '05 CP', '01 CP VO 1X AO DIA POR 05 DIAS (SE ALERGIA À PENICILINA)'),
      O('ORAL', 'AMOXICILINA + CLAVULANATO 875 + 125MG', '20 CP', '01 CP VO DE 12/12H POR 10 DIAS')],
      ori: ['COMPLETAR TODO O ANTIBIÓTICO MESMO COM MELHORA. ' + ORI_FEBRE],
      nota: 'Escolha um antibiótico. 10 dias de amoxicilina (ou benzatina dose única) previnem febre reumática.' },
    { id: 'amig-vir', t: 'Faringite / amigdalite viral', c: 'orl', kw: 'dor de garganta viral faringite', it: [
      I('ORAL', 'IBUPROFENO 300MG', '30 CP', '02 CP VO DE 8/8H POR 05 DIAS, APÓS AS REFEIÇÕES'), DIP,
      O('ORAL', 'LORATADINA 10MG', '05 CP', '01 CP VO 1X AO DIA POR 05 DIAS'),
      O('BUC', 'BENZIDAMINA SOLUÇÃO (COLUTÓRIO)', '01 FR', 'FAZER GARGAREJO COM 15 ML 3X AO DIA, SEM ENGOLIR')],
      ori: ['GARGAREJO COM ÁGUA MORNA E SAL. ' + ORI_FEBRE] },
    { id: 'oma', t: 'Otite média aguda', c: 'orl', kw: 'otalgia dor de ouvido oma amoxicilina', it: [
      I('ORAL', 'AMOXICILINA 500MG', '30 CP', '01 CP VO DE 8/8H POR 10 DIAS'), IBU600, DIP,
      O('ORAL', 'AMOXICILINA + CLAVULANATO 875 + 125MG', '20 CP', '01 CP VO DE 12/12H POR 10 DIAS')],
      ori: ['NÃO INTRODUZIR OBJETOS NO OUVIDO. RETORNAR SE SECREÇÃO NO OUVIDO, INCHAÇO ATRÁS DA ORELHA OU FEBRE PERSISTENTE.'],
      nota: 'Amoxicilina-clavulanato se uso de amoxicilina nos últimos 30 dias ou falha terapêutica em 48 a 72 h.' },
    { id: 'otite-ext', t: 'Otite externa', c: 'orl', kw: 'ouvido de nadador otosporin otociriax conduto', it: [
      I('OTO', 'HIDROCORTISONA + NEOMICINA + POLIMIXINA B (OTOSPORIN)', '01 FR', 'APLICAR 03 GOTAS NO OUVIDO AFETADO, 3X AO DIA, POR 07 DIAS'),
      O('OTO', 'CIPROFLOXACINO + HIDROCORTISONA (OTOCIRIAX)', '01 FR', 'APLICAR 03 GOTAS NO OUVIDO AFETADO DE 12/12H POR 07 DIAS'),
      DIP, O('ORAL', 'IBUPROFENO 600MG', '15 CP', '01 CP VO DE 8/8H POR 05 DIAS, APÓS AS REFEIÇÕES')],
      ori: ['NÃO MOLHAR O OUVIDO DURANTE O TRATAMENTO (PROTEGER COM ALGODÃO E VASELINA NO BANHO). NÃO USAR COTONETE.'],
      nota: 'Escolha uma solução otológica. Com perfuração timpânica, preferir quinolona (Otociriax); evitar aminoglicosídeo.' },
    { id: 'cerume', t: 'Cerume impactado (rolha)', c: 'orl', kw: 'cera cerumin ouvido tampado', it: [
      I('OTO', 'CERUMIN', '01 FR', 'APLICAR 05 GOTAS NO OUVIDO ACOMETIDO, 3X AO DIA, POR 03 A 05 DIAS')],
      ori: ['APLICAR DEITADO, COM O OUVIDO AFETADO PARA CIMA, E MANTER A POSIÇÃO POR 5 MINUTOS. A SAÍDA DE PARTE DO LÍQUIDO É NORMAL. RETORNAR APÓS O TRATAMENTO PARA LAVAGEM, SE NECESSÁRIO.'] },
    { id: 'sinusite', t: 'Rinossinusite bacteriana', c: 'orl', kw: 'sinusite secreção purulenta dor facial amoxicilina clavulanato', it: [
      I('ORAL', 'AMOXICILINA + CLAVULANATO 875 + 125MG', '20 CP', '01 CP VO DE 12/12H POR 10 DIAS'),
      I('NAS', 'BUDESONIDA SPRAY NASAL 32MCG/JATO', '01 FR', 'APLICAR 02 JATOS EM CADA NARINA PELA MANHÃ POR 30 DIAS'),
      SFN, DIP,
      O('ORAL', 'AZITROMICINA 500MG', '05 CP', '01 CP VO 1X AO DIA POR 05 DIAS (SE ALERGIA À PENICILINA)'),
      O('ORAL', 'IBUPROFENO 300MG', '20 CP', '02 CP VO DE 8/8H SE DOR, APÓS AS REFEIÇÕES')],
      ori: ['LAVAGEM NASAL COM SORO FREQUENTE. ' + ORI_FEBRE],
      nota: 'Antibiótico se sintomas > 10 dias, piora após melhora inicial ou febre alta com secreção purulenta por 3 a 4 dias.' },
    { id: 'rinite', t: 'Rinite alérgica', c: 'orl', kw: 'espirro coriza coceira nariz budesonida loratadina', it: [
      LORA, I('NAS', 'BUDESONIDA SPRAY NASAL 32MCG/JATO', '01 FR', 'APLICAR 02 JATOS EM CADA NARINA PELA MANHÃ POR 30 DIAS OU ATÉ ACABAR O FRASCO'), SFN,
      O('ORAL', 'DESLORATADINA 5MG', '07 CP', '01 CP VO 1X AO DIA POR 07 DIAS'),
      O('ORAL', 'HIDROXIZINA 25MG', '10 CP', '01 CP VO À NOITE POR 05 A 10 DIAS (CAUSA SONOLÊNCIA)')],
      ori: ['EVITAR POEIRA, MOFO, FUMAÇA E PERFUMES. LAVAR ROUPAS DE CAMA SEMANALMENTE.'] },
    { id: 'afta', t: 'Estomatite aftosa (afta)', c: 'orl', kw: 'afta boca úlcera oral omcilon orabase benzidamina', it: [
      I('BUC', 'TRIANCINOLONA ORABASE (OMCILON-A ORABASE)', '01 TB', 'APLICAR FINA CAMADA NAS LESÕES DE 8/8H POR 07 DIAS'),
      I('BUC', 'BENZIDAMINA SOLUÇÃO (COLUTÓRIO)', '01 FR', 'FAZER BOCHECHO E GARGAREJO COM 15 ML 2 A 3X AO DIA, SEM ENGOLIR')],
      ori: ['EVITAR ALIMENTOS ÁCIDOS, APIMENTADOS E MUITO QUENTES. PROCURAR DENTISTA OU MÉDICO SE LESÃO DURAR MAIS DE 2 SEMANAS.'] },

    /* ===== RESPIRATÓRIO E ALERGIA ===== */
    { id: 'alergia', t: 'Alergia / urticária', c: 'resp', kw: 'urticária coceira placas alergia prednisona loratadina dexclorfeniramina', it: [
      LORA, I('ORAL', 'PREDNISONA 20MG', '10 CP', '01 CP VO DE 12/12H POR 05 DIAS'),
      O('ORAL', 'DEXCLORFENIRAMINA 2MG', '15 CP', '01 CP VO DE 8/8H POR 05 DIAS'),
      O('ORAL', 'HIDROXIZINA 25MG', '10 CP', '01 CP VO À NOITE POR 05 DIAS (CAUSA SONOLÊNCIA)')],
      ori: ['EVITAR CONTATO COM O FATOR DESENCADEANTE E NÃO USAR ANTI-INFLAMATÓRIOS (AINES) ATÉ A MELHORA. PROCURAR ATENDIMENTO IMEDIATO SE INCHAÇO NA BOCA OU LÍNGUA, FALTA DE AR OU DESMAIO.'] },
    { id: 'asma', t: 'Asma: alta após crise', c: 'resp', kw: 'asma broncoespasmo sibilância salbutamol beclometasona clenil prednisona', it: [
      I('ORAL', 'PREDNISONA 20MG', '10 CP', '02 CP VO 1X AO DIA, PELA MANHÃ, POR 05 DIAS'),
      I('INAL', 'SALBUTAMOL 100MCG/DOSE SPRAY', '01 FR', '02 A 04 JATOS COM ESPAÇADOR DE 4/4H SE FALTA DE AR OU CHIADO'),
      I('INAL', 'BECLOMETASONA 250MCG/DOSE (CLENIL) SPRAY', '01 FR', '01 JATO DE 12/12H, USO CONTÍNUO. ENXAGUAR A BOCA APÓS O USO')],
      ori: ['USAR AS BOMBINHAS COM ESPAÇADOR. EVITAR FUMAÇA, POEIRA E ANTI-INFLAMATÓRIOS. PROCURAR A UBS PARA ACOMPANHAMENTO. RETORNAR SE FALTA DE AR QUE NÃO MELHORA COM O SALBUTAMOL, LÁBIOS ROXOS OU DIFICULDADE PARA FALAR.'] },
    { id: 'broncoesp', t: 'Broncoespasmo: inalação em casa', c: 'resp', kw: 'inalação nebulização salbutamol gotas fenoterol', it: [
      I('INAL', 'SALBUTAMOL 5MG/ML SOLUÇÃO PARA NEBULIZAÇÃO', '01 FR', 'REALIZAR INALAÇÃO COM 10 GOTAS EM 05 ML DE SF 0,9% DE 6/6H POR 05 DIAS'),
      I('INAL', 'SORO FISIOLÓGICO 0,9%', '01 FR', 'USAR 05 ML EM CADA INALAÇÃO'),
      O('ORAL', 'PREDNISONA 20MG', '10 CP', '02 CP VO 1X AO DIA, PELA MANHÃ, POR 05 DIAS')],
      ori: ['RETORNAR SE FALTA DE AR PERSISTENTE, CANSAÇO PARA FALAR OU LÁBIOS ROXOS.'],
      nota: 'Salbutamol 5 mg/mL: 1 gota ≈ 0,25 mg; 10 gotas = 2,5 mg (dose adulta usual de 2,5 a 5 mg).' },
    { id: 'pac', t: 'Pneumonia comunitária (ambulatorial)', c: 'resp', kw: 'pneumonia pnm pac amoxicilina clavulanato azitromicina levofloxacino', it: [
      I('ORAL', 'AMOXICILINA + CLAVULANATO 875 + 125MG', '14 CP', '01 CP VO DE 12/12H POR 07 DIAS'),
      O('ORAL', 'AZITROMICINA 500MG', '05 CP', '01 CP VO 1X AO DIA POR 05 DIAS'),
      O('ORAL', 'LEVOFLOXACINO 750MG', '05 CP', '01 CP VO 1X AO DIA POR 05 DIAS'),
      DIP,
      I('ORAL', 'ACEBROFILINA XAROPE ADULTO 50MG/5ML', '01 FR', '10 ML VO DE 12/12H POR 05 DIAS'),
      O('ORAL', 'PREDNISONA 20MG', '10 CP', '01 CP VO DE 12/12H POR 05 DIAS')],
      ori: ['RETORNO EM 48 A 72H PARA REAVALIAÇÃO. ' + ORI_FEBRE],
      nota: 'Sem comorbidade: amoxicilina (ou amoxicilina-clavulanato) isolada. Com comorbidade: betalactâmico + azitromicina, ou levofloxacino isolado. Corticoide na PAC ambulatorial não tem benefício comprovado; usar só se broncoespasmo associado. Calcule o CURB-65.' },
    { id: 'tosse-prod', t: 'Tosse produtiva', c: 'resp', kw: 'mucolítico catarro expectorante acetilcisteína ambroxol', it: [
      I('ORAL', 'ACETILCISTEÍNA 600MG ENVELOPE', '05 ENV', 'DILUIR 01 ENVELOPE EM MEIO COPO DE ÁGUA E TOMAR 1X AO DIA POR 05 DIAS'),
      O('ORAL', 'AMBROXOL XAROPE ADULTO 30MG/5ML', '01 FR', '05 ML VO DE 8/8H POR 05 DIAS'), DIP],
      ori: ['BEBER BASTANTE ÁGUA. ' + ORI_FEBRE] },
    { id: 'tosse-seca', t: 'Tosse seca', c: 'resp', kw: 'tosse irritativa cloperastina seki dropropizina', it: [
      I('ORAL', 'CLOPERASTINA XAROPE 3,54MG/ML (SEKI)', '01 FR', '10 ML VO DE 8/8H POR 05 DIAS'),
      O('ORAL', 'DROPROPIZINA XAROPE ADULTO 30MG/10ML', '01 FR', '10 ML VO DE 6/6H POR 05 DIAS'), LORA],
      ori: ['MEL COM LIMÃO E HIDRATAÇÃO AJUDAM. RETORNAR SE TOSSE POR MAIS DE 3 SEMANAS, FALTA DE AR OU SANGUE NO ESCARRO.'] },

    /* ===== GASTROINTESTINAL ===== */
    { id: 'geca', t: 'Gastroenterite aguda (GECA)', c: 'gi', kw: 'diarreia vômito cólica floratil sro buscopan', it: [
      I('ORAL', 'BUSCOPAN COMPOSTO', '20 CP', '01 CP VO DE 8/8H ATÉ DE 6/6H SE CÓLICA'), BROMO,
      I('ORAL', 'SACCHAROMYCES BOULARDII (FLORATIL) 200MG', '10 CP', '01 CP VO DE 12/12H POR 05 DIAS'), SRO],
      ori: [ORI_DIARREIA] },
    { id: 'diarreia', t: 'Diarreia aguda sem sinais de alarme', c: 'gi', kw: 'diarreia loperamida imosec cortar', it: [
      I('ORAL', 'LOPERAMIDA 2MG (IMOSEC)', '12 CP', 'TOMAR 02 CP APÓS A PRIMEIRA EVACUAÇÃO LÍQUIDA E 01 CP APÓS CADA NOVA EVACUAÇÃO LÍQUIDA, MÁXIMO 08 CP AO DIA, ATÉ EVACUAÇÃO SÓLIDA'),
      SRO, I('ORAL', 'SACCHAROMYCES BOULARDII (FLORATIL) 200MG', '10 CP', '01 CP VO DE 12/12H POR 05 DIAS')],
      ori: ['SUSPENDER A LOPERAMIDA SE FEBRE, SANGUE NAS FEZES OU DOR ABDOMINAL FORTE. ' + ORI_DIARREIA],
      nota: 'Não usar loperamida com febre, disenteria (sangue/muco) ou em crianças.' },
    { id: 'gastrite', t: 'Gastrite / dispepsia', c: 'gi', kw: 'epigastralgia azia queimação omeprazol', it: [
      I('ORAL', 'OMEPRAZOL 20MG', '30 CP', '01 CP VO EM JEJUM, 30 MIN ANTES DO CAFÉ DA MANHÃ, POR 30 DIAS'),
      I('ORAL', 'BUSCOPAN COMPOSTO', '20 CP', '01 CP VO DE 8/8H SE DOR'), BROMO,
      O('ORAL', 'HIDRÓXIDO DE ALUMÍNIO SUSPENSÃO', '01 FR', '10 ML VO 1H APÓS AS REFEIÇÕES E AO DEITAR, SE QUEIMAÇÃO')],
      ori: ['EVITAR ÁLCOOL, CAFÉ, FRITURAS, PIMENTA E ANTI-INFLAMATÓRIOS. FAZER REFEIÇÕES MENORES E MAIS FREQUENTES. RETORNAR SE VÔMITO COM SANGUE OU FEZES ESCURAS.'] },
    { id: 'drge', t: 'Doença do refluxo (DRGE)', c: 'gi', kw: 'refluxo azia pirose omeprazol domperidona', it: [
      I('ORAL', 'OMEPRAZOL 20MG', '30 CP', '01 CP VO EM JEJUM, 30 MIN ANTES DO CAFÉ DA MANHÃ, POR 30 DIAS'),
      I('ORAL', 'DOMPERIDONA 10MG', '21 CP', '01 CP VO 15 MIN ANTES DAS REFEIÇÕES, 3X AO DIA, POR 07 DIAS')],
      ori: ['ELEVAR A CABECEIRA DA CAMA (15 CM). NÃO DEITAR NAS 2 HORAS APÓS AS REFEIÇÕES. EVITAR REFEIÇÕES GRANDES, GORDURA, CAFÉ, CHOCOLATE, MENTA, ÁLCOOL, REFRIGERANTE E CIGARRO. REDUZIR O PESO SE SOBREPESO.'] },
    { id: 'constip', t: 'Constipação intestinal (adulto)', c: 'gi', kw: 'intestino preso lactulose óleo mineral supositório', it: [
      I('ORAL', 'LACTULOSE XAROPE 667MG/ML', '01 FR', '20 ML VO DE 12/12H SE CONSTIPAÇÃO (REDUZIR SE DIARREIA)'),
      O('ORAL', 'POLIETILENOGLICOL 4000 (MACROGOL) SACHÊ', '10 SACHÊS', 'DILUIR 01 SACHÊ (10 A 17G) EM 200 ML DE ÁGUA E TOMAR 1X AO DIA'),
      O('ORAL', 'ÓLEO MINERAL', '01 FR', '15 ML VO DE 12/12H (NÃO TOMAR DEITADO)'),
      O('RET', 'SUPOSITÓRIO DE GLICERINA ADULTO', '05 UN', 'INTRODUZIR 01 SUPOSITÓRIO VIA RETAL SE NÃO EVACUAR EM 3 DIAS'),
      O('ORAL', 'SIMETICONA 125MG', '20 CP', '01 CP VO DE 8/8H SE GASES')],
      ori: ['AUMENTAR A INGESTÃO DE ÁGUA (2 LITROS POR DIA), FRUTAS, VERDURAS E FIBRAS. CAMINHAR DIARIAMENTE. NÃO SEGURAR A VONTADE DE EVACUAR.'] },
    { id: 'hemorroida', t: 'Doença hemorroidária', c: 'gi', kw: 'hemorroida diosmina daflon proctyl banho de assento', it: [
      I('ORAL', 'DIOSMINA + HESPERIDINA 450 + 50MG', '30 CP', '01 CP VO DE 12/12H POR 15 DIAS'),
      I('TOP', 'PROCTYL POMADA', '01 TB', 'APLICAR NA REGIÃO ANAL DE 8/8H POR 10 DIAS'), IBU600, DIP],
      ori: ['BANHO DE ASSENTO COM ÁGUA MORNA 3X AO DIA POR 15 MINUTOS. DIETA RICA EM FIBRAS E ÁGUA. EVITAR ESFORÇO PARA EVACUAR E PAPEL HIGIÊNICO (PREFERIR LAVAR).'] },
    { id: 'vomito-gest', t: 'Náuseas e vômitos na gestação', c: 'gi', kw: 'gestante enjoo grávida ondansetrona dramin b6', it: [
      I('ORAL', 'DIMENIDRINATO + PIRIDOXINA (DRAMIN B6) 50 + 10MG', '15 CP', '01 CP VO DE 8/8H SE ENJOO OU VÔMITOS, POR ATÉ 05 DIAS'),
      O('ORAL', 'ONDANSETRONA 4MG', '15 CP', '01 CP VO DE 8/8H SE ENJOO OU VÔMITOS, POR ATÉ 05 DIAS'),
      O('ORAL', 'METOCLOPRAMIDA 10MG', '15 CP', '01 CP VO DE 8/8H SE ENJOO OU VÔMITOS, POR ATÉ 05 DIAS')],
      ori: ['FRACIONAR AS REFEIÇÕES (PEQUENAS QUANTIDADES A CADA 2 A 3H). EVITAR JEJUM PROLONGADO E ALIMENTOS GORDUROSOS. RETORNAR SE NÃO CONSEGUIR INGERIR LÍQUIDOS, URINA ESCURA OU PERDA DE PESO.'] },

    /* ===== URINÁRIO, GENITAL E IST ===== */
    { id: 'cistite', t: 'Cistite (ITU baixa)', c: 'gu', kw: 'itu infecção urinária disúria nitrofurantoína fosfomicina pyridium', it: [
      I('ORAL', 'NITROFURANTOÍNA 100MG', '28 CP', '01 CP VO DE 6/6H POR 07 DIAS'),
      I('ORAL', 'FENAZOPIRIDINA 200MG (PYRIDIUM)', '09 CP', '01 CP VO DE 8/8H POR 03 DIAS (DEIXA A URINA ALARANJADA)'),
      O('ORAL', 'FOSFOMICINA 3G (MONURIL) SACHÊ', '01 ENV', 'DILUIR 01 ENVELOPE EM ÁGUA E TOMAR EM DOSE ÚNICA, À NOITE, COM A BEXIGA VAZIA'),
      O('ORAL', 'SULFAMETOXAZOL + TRIMETOPRIMA 400 + 80MG', '12 CP', '02 CP VO DE 12/12H POR 03 DIAS'),
      O('ORAL', 'BUSCOPAN COMPOSTO', '20 CP', '01 CP VO DE 8/8H SE DOR')],
      ori: ['BEBER BASTANTE ÁGUA. NÃO SEGURAR A URINA. RETORNAR SE FEBRE, DOR NAS COSTAS, VÔMITOS OU SANGUE NA URINA.'],
      nota: 'Escolha um antibiótico. Quinolona fica reservada para pielonefrite.' },
    { id: 'pielo', t: 'Pielonefrite (ambulatorial)', c: 'gu', kw: 'itu alta febre lombar ciprofloxacino', it: [
      I('ORAL', 'CIPROFLOXACINO 500MG', '14 CP', '01 CP VO DE 12/12H POR 07 DIAS'), DIP, BROMO],
      ori: ['RETORNO EM 48 A 72H. RETORNAR ANTES SE FEBRE PERSISTENTE, VÔMITOS QUE IMPEDEM A MEDICAÇÃO OU PIORA DA DOR.'],
      nota: 'Considerar dose inicial de ceftriaxona 1 g EV/IM na unidade. Colher urocultura antes do antibiótico. Gestante, sinais de sepse ou vômitos: internação.' },
    { id: 'itu-gest', t: 'ITU na gestante', c: 'gu', kw: 'gestante grávida infecção urinária cefalexina', it: [
      I('ORAL', 'CEFALEXINA 500MG', '28 CP', '01 CP VO DE 6/6H POR 07 DIAS'), I('ORAL', 'PARACETAMOL 500MG', '20 CP', '01 CP VO DE 6/6H SE DOR OU FEBRE'),
      O('ORAL', 'AMOXICILINA + CLAVULANATO 500 + 125MG', '21 CP', '01 CP VO DE 8/8H POR 07 DIAS'),
      O('ORAL', 'NITROFURANTOÍNA 100MG', '28 CP', '01 CP VO DE 6/6H POR 07 DIAS (EVITAR NO FINAL DA GESTAÇÃO)')],
      ori: ['COLHER UROCULTURA DE CONTROLE APÓS O TRATAMENTO. RETORNAR SE FEBRE, DOR NAS COSTAS, CONTRAÇÕES OU PERDA DE LÍQUIDO.'],
      nota: 'Pielonefrite na gestante: internação.' },
    { id: 'candida', t: 'Candidíase vulvovaginal', c: 'gu', kw: 'corrimento branco coceira vaginal fluconazol miconazol', it: [
      I('ORAL', 'FLUCONAZOL 150MG', '01 CP', '01 CP VO EM DOSE ÚNICA'),
      I('VAG', 'MICONAZOL CREME VAGINAL 2%', '01 TB', 'APLICAR 01 APLICADOR VIA VAGINAL À NOITE, AO DEITAR, POR 07 DIAS')],
      ori: ['USAR ROUPAS ÍNTIMAS DE ALGODÃO. EVITAR DUCHAS VAGINAIS.'],
      nota: 'Gestante: apenas o creme vaginal (miconazol ou nistatina), sem fluconazol.' },
    { id: 'vaginose', t: 'Vaginose bacteriana / tricomoníase', c: 'gu', kw: 'corrimento odor metronidazol', it: [
      I('ORAL', 'METRONIDAZOL 250MG', '28 CP', '02 CP VO DE 12/12H POR 07 DIAS'),
      O('VAG', 'METRONIDAZOL GEL VAGINAL 100MG/G', '01 TB', 'APLICAR 01 APLICADOR VIA VAGINAL À NOITE POR 05 DIAS')],
      ori: ['NÃO INGERIR BEBIDA ALCOÓLICA DURANTE E ATÉ 24H APÓS O TRATAMENTO. TRICOMONÍASE: TRATAR A PARCERIA SEXUAL.'] },
    { id: 'uretrite', t: 'Corrimento uretral (gonorreia e clamídia)', c: 'gu', kw: 'uretrite ist dst corrimento ceftriaxona azitromicina', it: [
      I('IM', 'CEFTRIAXONA 500MG', '01 FA', 'APLICAR 01 FA IM DOSE ÚNICA (NA UNIDADE)'),
      I('ORAL', 'AZITROMICINA 500MG', '02 CP', '02 CP VO EM DOSE ÚNICA')],
      ori: ['ABSTINÊNCIA SEXUAL ATÉ 7 DIAS APÓS O TRATAMENTO E O DA PARCERIA. USAR PRESERVATIVO. REALIZAR TESTES PARA HIV, SÍFILIS E HEPATITES B E C.'],
      nota: 'Esquema do PCDT-IST. Notificar e tratar parcerias.' },
    { id: 'colica-renal', t: 'Cólica renal / nefrolitíase', c: 'gu', kw: 'cálculo renal pedra nos rins tansulosina', it: [
      I('ORAL', 'TANSULOSINA 0,4MG', '14 CP', '01 CP VO 1X AO DIA POR 14 DIAS'),
      I('ORAL', 'CETOPROFENO 100MG', '10 CP', '01 CP VO DE 12/12H POR 05 DIAS, APÓS AS REFEIÇÕES'),
      I('ORAL', 'BUSCOPAN COMPOSTO', '20 CP', '01 CP VO DE 8/8H SE DOR'), O('ORAL', 'BROMOPRIDA 10MG', '20 CP', '01 CP VO DE 8/8H SE NÁUSEA OU VÔMITOS')],
      ori: ['BEBER 2 A 3 LITROS DE ÁGUA POR DIA. RETORNAR SE FEBRE, DOR QUE NÃO MELHORA, VÔMITOS OU SE PARAR DE URINAR. LEVAR O CÁLCULO SE ELIMINADO.'] },

    /* ===== PELE ===== */
    { id: 'impetigo', t: 'Impetigo / piodermite', c: 'pele', kw: 'crosta melicérica impetigo mupirocina cefalexina', it: [
      I('TOP', 'MUPIROCINA 2% POMADA', '01 TB', 'APLICAR NAS LESÕES 3X AO DIA POR 07 A 10 DIAS, APÓS REMOVER AS CROSTAS COM ÁGUA E SABÃO'),
      O('ORAL', 'CEFALEXINA 500MG', '28 CP', '01 CP VO DE 6/6H POR 07 DIAS'),
      O('ORAL', 'SULFAMETOXAZOL + TRIMETOPRIMA 400 + 80MG', '28 CP', '02 CP VO DE 12/12H POR 07 DIAS')],
      ori: ['MUITO CONTAGIOSO: LAVAR AS LESÕES COM ÁGUA E SABÃO 2 A 3X AO DIA, CORTAR AS UNHAS, NÃO COMPARTILHAR TOALHAS.'],
      nota: 'Antibiótico oral se lesões extensas ou múltiplas.' },
    { id: 'erisipela', t: 'Erisipela', c: 'pele', kw: 'erisipela placa vermelha perna cefalexina', it: [
      I('ORAL', 'CEFALEXINA 500MG', '40 CP', '01 CP VO DE 6/6H POR 10 DIAS'), IBU600, DIP,
      O('ORAL', 'AMOXICILINA + CLAVULANATO 875 + 125MG', '20 CP', '01 CP VO DE 12/12H POR 10 DIAS')],
      ori: ['MANTER O MEMBRO ELEVADO. TRATAR FRIEIRA ENTRE OS DEDOS. MARCAR COM CANETA A BORDA DA LESÃO E RETORNAR SE AUMENTAR, FEBRE PERSISTENTE OU BOLHAS ESCURAS.'],
      nota: 'Celulite purulenta, toxemia ou falha: internação e antibiótico EV.' },
    { id: 'furunculo', t: 'Furúnculo / foliculite', c: 'pele', kw: 'furúnculo abscesso pequeno foliculite mupirocina', it: [
      I('TOP', 'MUPIROCINA 2% POMADA', '01 TB', 'APLICAR NA LESÃO 3X AO DIA POR 07 DIAS'),
      O('ORAL', 'CEFALEXINA 500MG', '28 CP', '01 CP VO DE 6/6H POR 07 DIAS'),
      O('TOP', 'TRICLOSANO 1% SABONETE', '01 UN', 'USAR NO BANHO DIARIAMENTE POR 07 DIAS')],
      ori: ['COMPRESSAS MORNAS 3 A 4X AO DIA PARA DRENAGEM. NÃO ESPREMER. RETORNAR SE AUMENTAR, FEBRE OU VERMELHIDÃO AO REDOR.'] },
    { id: 'escabiose', t: 'Escabiose (sarna)', c: 'pele', kw: 'sarna coceira noturna permetrina ivermectina', need: 'kg', it: [
      I('TOP', 'PERMETRINA 5% LOÇÃO', '01 FR', 'APLICAR EM TODO O CORPO, DO PESCOÇO PARA BAIXO, À NOITE APÓS O BANHO, E RETIRAR NA MANHÃ SEGUINTE. REPETIR APÓS 07 DIAS'),
      O('ORAL', 'IVERMECTINA 6MG', '06 CP', c => `TOMAR ${ivm(c)} VO EM DOSE ÚNICA E REPETIR APÓS 07 DIAS`),
      I('ORAL', 'HIDROXIZINA 25MG', '10 CP', '01 CP VO À NOITE SE COCEIRA, POR 07 A 10 DIAS')],
      ori: ['TRATAR TODOS QUE MORAM NA CASA AO MESMO TEMPO. LAVAR ROUPAS, TOALHAS E ROUPAS DE CAMA EM ÁGUA QUENTE E PASSAR A FERRO. A COCEIRA PODE DURAR ATÉ 2 SEMANAS APÓS O TRATAMENTO.'],
      nota: 'Ivermectina: 200 mcg/kg (a partir de 15 kg e 5 anos; não usar em gestante e lactante). Dose calculada pelo peso do paciente.' },
    { id: 'zoster', t: 'Herpes zoster', c: 'pele', kw: 'cobreiro zoster aciclovir dermátomo', it: [
      I('ORAL', 'ACICLOVIR 400MG', '70 CP', '02 CP VO DE 4/4H, PULANDO A DOSE DA MADRUGADA (5X AO DIA: 06H, 10H, 14H, 18H E 22H), POR 07 DIAS'),
      DIP, I('ORAL', 'PARACETAMOL + CODEÍNA 500 + 30MG', '20 CP', '01 CP VO DE 6/6H SE DOR FORTE'),
      O('ORAL', 'VALACICLOVIR 500MG', '42 CP', '02 CP VO DE 8/8H POR 07 DIAS'),
      O('ORAL', 'PREDNISONA 20MG', '15 CP', '02 CP VO 1X AO DIA, PELA MANHÃ, POR 07 DIAS')],
      ori: ['MANTER AS LESÕES LIMPAS E SECAS. EVITAR CONTATO COM GESTANTES, BEBÊS E IMUNOSSUPRIMIDOS ATÉ AS CROSTAS SECAREM.'],
      nota: 'Aciclovir para zoster é 800 mg 5x/dia (2 cp de 400 mg), iniciado em até 72 h. Acometimento oftálmico (ramo V1, sinal de Hutchinson): avaliação hospitalar/oftalmológica.' },
    { id: 'herpes', t: 'Herpes simples (labial ou genital)', c: 'pele', kw: 'herpes labial genital aciclovir', it: [
      I('ORAL', 'ACICLOVIR 400MG', '21 CP', '01 CP VO DE 8/8H POR 07 DIAS (RECORRÊNCIA: 05 DIAS)'),
      I('TOP', 'ACICLOVIR CREME 5%', '01 TB', 'APLICAR NAS LESÕES 5X AO DIA POR 05 DIAS'), DIP],
      ori: ['EVITAR CONTATO DIRETO COM AS LESÕES E BEIJO OU RELAÇÃO SEXUAL ATÉ A CICATRIZAÇÃO.'] },
    { id: 'dermatite', t: 'Dermatite de contato / eczema', c: 'pele', kw: 'eczema alergia de pele dexametasona creme', it: [
      I('TOP', 'DEXAMETASONA 0,1% CREME', '01 TB', 'APLICAR FINA CAMADA NAS LESÕES 2X AO DIA POR 07 DIAS (NÃO USAR NO ROSTO POR MAIS DE 5 DIAS)'), LORA,
      O('ORAL', 'PREDNISONA 20MG', '10 CP', '02 CP VO 1X AO DIA, PELA MANHÃ, POR 05 DIAS (SE EXTENSO)')],
      ori: ['AFASTAR O AGENTE CAUSADOR (BIJUTERIA, COSMÉTICO, PRODUTO DE LIMPEZA). HIDRATAR A PELE. BANHOS RÁPIDOS E MORNOS.'] },
    { id: 'estrofulo', t: 'Estrófulo / picada de inseto', c: 'pele', kw: 'picada inseto prurigo coceira', it: [
      LORA, I('TOP', 'DEXAMETASONA 0,1% CREME', '01 TB', 'APLICAR NAS LESÕES 2X AO DIA POR 05 DIAS')],
      ori: ['USAR REPELENTE E TELAS. CORTAR AS UNHAS PARA EVITAR INFECÇÃO PELO COÇAR.'] },
    { id: 'tinea', t: 'Micose de pele (tinea corporis)', c: 'pele', kw: 'micose impinge tinea cetoconazol isoconazol fluconazol', it: [
      I('TOP', 'CETOCONAZOL 2% CREME', '01 TB', 'APLICAR NAS LESÕES E 2 CM AO REDOR, 2X AO DIA, POR 04 SEMANAS'),
      O('TOP', 'ISOCONAZOL 1% CREME', '01 TB', 'APLICAR NAS LESÕES 2X AO DIA POR 04 SEMANAS'),
      O('ORAL', 'FLUCONAZOL 150MG', '04 CP', '01 CP VO 1X POR SEMANA POR 04 SEMANAS')],
      ori: ['MANTER A PELE SECA. NÃO COMPARTILHAR TOALHAS. CONTINUAR O CREME POR 1 SEMANA APÓS O SUMIÇO DAS LESÕES.'] },
    { id: 'tinea-pedis', t: 'Micose dos pés (tinea pedis)', c: 'pele', kw: 'pé de atleta frieira', it: [
      I('TOP', 'ISOCONAZOL 1% CREME', '01 TB', 'APLICAR ENTRE OS DEDOS E NA PLANTA DOS PÉS 2X AO DIA POR 04 SEMANAS'),
      O('ORAL', 'FLUCONAZOL 150MG', '04 CP', '01 CP VO 1X POR SEMANA POR 04 SEMANAS')],
      ori: ['SECAR BEM ENTRE OS DEDOS. USAR MEIAS DE ALGODÃO E CHINELO EM BANHEIROS COLETIVOS. APLICAR TALCO ANTIFÚNGICO NOS CALÇADOS.'] },
    { id: 'pitiriase', t: 'Pitiríase versicolor (pano branco)', c: 'pele', kw: 'pano branco manchas cetoconazol shampoo', it: [
      I('TOP', 'CETOCONAZOL 2% SHAMPOO', '01 FR', 'APLICAR NAS LESÕES NO BANHO, DEIXAR AGIR 10 MINUTOS E ENXAGUAR, 2X POR SEMANA POR 04 SEMANAS')],
      ori: ['AS MANCHAS PODEM DEMORAR MESES PARA RECUPERAR A COR, MESMO COM A CURA.'] },
    { id: 'larva', t: 'Larva migrans (bicho geográfico)', c: 'pele', kw: 'bicho geográfico albendazol tiabendazol', it: [
      I('ORAL', 'ALBENDAZOL 400MG', '03 CP', '01 CP VO 1X AO DIA POR 03 DIAS'),
      O('TOP', 'TIABENDAZOL 5% POMADA', '01 TB', 'APLICAR NA LESÃO DE 8/8H POR 07 DIAS (LESÃO ÚNICA)'), LORA],
      ori: ['EVITAR ANDAR DESCALÇO EM AREIA OU TERRA.'] },
    { id: 'queimadura', t: 'Queimadura de 1º e 2º grau', c: 'pele', kw: 'queimadura sulfadiazina de prata curativo', it: [
      I('TOP', 'SULFADIAZINA DE PRATA 1% CREME', '01 TB', 'APLICAR CAMADA FINA SOBRE A LESÃO APÓS LIMPEZA COM ÁGUA E SABÃO, 1 A 2X AO DIA, MANTENDO COBERTA COM GAZE, ATÉ CICATRIZAR'),
      DIP, O('ORAL', 'CEFALEXINA 500MG', '28 CP', '01 CP VO DE 6/6H POR 07 DIAS (SE SINAIS DE INFECÇÃO)')],
      ori: ['NÃO ESTOURAR AS BOLHAS. NÃO PASSAR PASTA DE DENTE, MANTEIGA OU PÓ DE CAFÉ. BEBER BASTANTE LÍQUIDO. CURATIVO NA UBS. VERIFICAR VACINA ANTITETÂNICA.'] },
    { id: 'sutura', t: 'Sutura / ferimento', c: 'pele', kw: 'pontos corte ferida laceração curativo cefalexina', it: [
      DIP, O('ORAL', 'CEFALEXINA 500MG', '28 CP', '01 CP VO DE 6/6H POR 07 DIAS')],
      ori: ['MANTER O CURATIVO LIMPO E SECO NAS PRIMEIRAS 24H; DEPOIS LAVAR COM ÁGUA E SABÃO. A UBS: VERIFICAR CALENDÁRIO VACINAL (ANTITETÂNICA). RETIRADA DE PONTOS EM 7 A 10 DIAS (ROSTO: 5 DIAS; ARTICULAÇÕES E PÉS: 10 A 14 DIAS). RETORNAR SE VERMELHIDÃO, PUS OU FEBRE.'],
      nota: 'Antibiótico só se ferida contaminada, mordedura, extremidades com esmagamento ou imunossupressão.' },
    { id: 'mordedura', t: 'Mordedura de animal', c: 'pele', kw: 'mordida cão gato raiva amoxicilina clavulanato', it: [
      I('ORAL', 'AMOXICILINA + CLAVULANATO 875 + 125MG', '10 CP', '01 CP VO DE 12/12H POR 05 DIAS'), DIP],
      ori: ['LAVAR O FERIMENTO COM ÁGUA E SABÃO. SEGUIR O ESQUEMA DE PROFILAXIA DA RAIVA E DO TÉTANO CONFORME A UBS. OBSERVAR O ANIMAL (CÃO OU GATO) POR 10 DIAS. RETORNAR SE VERMELHIDÃO, PUS OU FEBRE.'],
      nota: 'Notificar e preencher a ficha de atendimento antirrábico.' },
    { id: 'varicela', t: 'Varicela (catapora): adolescente e adulto', c: 'pele', kw: 'catapora varicela aciclovir', it: [
      I('ORAL', 'ACICLOVIR 400MG', '70 CP', '02 CP VO DE 4/4H, PULANDO A DOSE DA MADRUGADA (5X AO DIA), POR 07 DIAS'),
      LORA, I('ORAL', 'PARACETAMOL 500MG', '20 CP', '01 CP VO DE 6/6H SE DOR OU FEBRE')],
      ori: ['NÃO USAR AAS NEM ANTI-INFLAMATÓRIOS. CORTAR AS UNHAS. AFASTAMENTO ATÉ TODAS AS LESÕES VIRAREM CROSTA. RETORNAR SE FALTA DE AR, LESÕES COM PUS OU SONOLÊNCIA.'],
      nota: 'Aciclovir indicado a partir dos 13 anos ou com fator de risco, idealmente em até 24 h do exantema.' },

    /* ===== DOR ===== */
    { id: 'lombalgia', t: 'Lombalgia / lombociatalgia', c: 'dor', kw: 'dor nas costas lombar ciático cetoprofeno ciclobenzaprina paco', it: [
      DIP, I('ORAL', 'CETOPROFENO 150MG', '10 CP', '01 CP VO DE 12/12H POR 05 DIAS, APÓS AS REFEIÇÕES'),
      I('ORAL', 'CICLOBENZAPRINA 10MG', '07 CP', '01 CP VO ANTES DE DORMIR POR 07 DIAS'),
      I('ORAL', 'PARACETAMOL + CODEÍNA 500 + 30MG (PACO)', '20 CP', '01 CP VO DE 6/6H SE DOR INTENSA')],
      ori: ['MANTER-SE ATIVO DENTRO DO LIMITE DA DOR; EVITAR REPOUSO PROLONGADO NA CAMA. COMPRESSAS MORNAS. RETORNAR SE FRAQUEZA NAS PERNAS, PERDA DE CONTROLE DA URINA OU FEZES, FEBRE OU DOR QUE NÃO MELHORA.'] },
    { id: 'mialgia', t: 'Dor muscular / contratura', c: 'dor', kw: 'mialgia torcicolo contratura nimesulida ciclobenzaprina', it: [
      DIP, I('ORAL', 'NIMESULIDA 100MG', '10 CP', '01 CP VO DE 12/12H POR 05 DIAS, APÓS AS REFEIÇÕES'),
      I('ORAL', 'CICLOBENZAPRINA 5MG', '10 CP', '01 CP VO À NOITE POR 05 A 10 DIAS'),
      O('ORAL', 'DIPIRONA + ORFENADRINA + CAFEÍNA (DORFLEX)', '20 CP', '01 CP VO DE 8/8H SE DOR')],
      ori: ['COMPRESSAS MORNAS E ALONGAMENTO LEVE.'] },
    { id: 'cefaleia', t: 'Cefaleia tensional', c: 'dor', kw: 'dor de cabeça cefaleia naproxeno dipirona', it: [
      DIP, I('ORAL', 'NAPROXENO 500MG', '10 CP', '01 CP VO DE 12/12H POR 05 DIAS, APÓS AS REFEIÇÕES')],
      ori: ['DORMIR BEM, HIDRATAR-SE, EVITAR JEJUM PROLONGADO. EVITAR ANALGÉSICOS MAIS DE 10 DIAS POR MÊS. RETORNAR SE A PIOR DOR DA VIDA, FEBRE COM RIGIDEZ DE NUCA, ALTERAÇÃO DA FALA, FORÇA OU VISÃO.'] },
    { id: 'enxaqueca', t: 'Enxaqueca (migrânea)', c: 'dor', kw: 'migrânea triptano naratriptana cefalium', it: [
      I('ORAL', 'NARATRIPTANA 2,5MG (NARAMIG)', '04 CP', '01 CP VO NO INÍCIO DA CRISE. SE A DOR VOLTAR, PODE REPETIR APÓS 4H (MÁXIMO 02 CP AO DIA)'),
      I('ORAL', 'IBUPROFENO 600MG', '09 CP', '01 CP VO DE 8/8H POR 03 DIAS, APÓS AS REFEIÇÕES'), BROMO,
      O('ORAL', 'CEFALIUM', '10 CP', '01 CP VO NO INÍCIO DA CRISE, PODENDO REPETIR APÓS 30 MIN, MÁXIMO 04 CP AO DIA')],
      ori: ['REPOUSO EM AMBIENTE ESCURO E SILENCIOSO. ANOTAR AS CRISES E OS GATILHOS (JEJUM, SONO, ÁLCOOL). PROCURAR A UBS SE MAIS DE 4 CRISES POR MÊS (AVALIAR PROFILAXIA).'],
      nota: 'Triptanos: contraindicados em doença coronariana, HAS não controlada e gestação.' },
    { id: 'gota', t: 'Gota (crise)', c: 'dor', kw: 'ácido úrico podagra colchicina diclofenaco', it: [
      I('ORAL', 'COLCHICINA 0,5MG', '60 CP', '01 CP VO DE 12/12H POR 3 MESES'),
      I('ORAL', 'DICLOFENACO SÓDICO 50MG', '15 CP', '01 CP VO DE 8/8H POR 05 DIAS, APÓS AS REFEIÇÕES'),
      O('ORAL', 'PREDNISONA 20MG', '10 CP', '02 CP VO 1X AO DIA POR 05 DIAS (SE CONTRAINDICAÇÃO A AINE)')],
      ori: ['REPOUSO E GELO NA ARTICULAÇÃO. EVITAR ÁLCOOL (PRINCIPALMENTE CERVEJA), CARNE VERMELHA, VÍSCERAS, FRUTOS DO MAR E REFRIGERANTE. NÃO INICIAR NEM SUSPENDER ALOPURINOL DURANTE A CRISE. PROCURAR A UBS.'],
      nota: 'Colchicina: reduzir a dose na DRC e com interações (claritromicina, ciclosporina).' },
    { id: 'entorse', t: 'Entorse / contusão', c: 'dor', kw: 'torção tornozelo pancada hematoma gelo', it: [
      IBU600, DIP, O('TOP', 'HEPARINOIDE GEL (HIRUDOID)', '01 TB', 'APLICAR NO LOCAL 3X AO DIA POR 07 DIAS')],
      ori: ['REPOUSO, GELO (20 MINUTOS 4X AO DIA), COMPRESSÃO COM FAIXA E ELEVAÇÃO DO MEMBRO NAS PRIMEIRAS 72H. RETORNAR SE NÃO CONSEGUIR APOIAR O PÉ OU PIORA DO INCHAÇO.'] },

    /* ===== OUTROS ===== */
    { id: 'dengue', t: 'Dengue (grupo A)', c: 'out', kw: 'dengue arbovirose chikungunya zika hidratação', need: 'kg', it: [
      DIP, O('ORAL', 'PARACETAMOL 500MG', '20 CP', '01 CP VO DE 6/6H SE DOR OU FEBRE'), BROMO,
      I('ORAL', 'SORO DE REIDRATAÇÃO ORAL', '05 SACHÊS', c => `INGERIR ${c.kg > 0 ? (Math.round(c.kg * 60 / 100) / 10).toString().replace('.', ',') + ' LITROS' : B} DE LÍQUIDO POR DIA (60 ML/KG), SENDO 1/3 COM SORO DE REIDRATAÇÃO ORAL E O RESTANTE COM ÁGUA, SUCOS E CHÁS. METADE NAS PRIMEIRAS HORAS DO DIA`)],
      ori: ['NÃO USAR AAS NEM ANTI-INFLAMATÓRIOS (IBUPROFENO, DICLOFENACO, NIMESULIDA). RETORNAR IMEDIATAMENTE SE DOR NA BARRIGA FORTE, VÔMITOS PERSISTENTES, SANGRAMENTO, TONTURA AO LEVANTAR, SONOLÊNCIA OU IRRITABILIDADE, OU DIMINUIÇÃO DA URINA, PRINCIPALMENTE QUANDO A FEBRE BAIXAR. REAVALIAÇÃO NO 5º DIA OU NO DIA DE QUEDA DA FEBRE.'],
      nota: 'Volume pelo peso do paciente (adulto 60 mL/kg/dia).' },
    { id: 'labirintite', t: 'Vertigem / labirintopatia', c: 'out', kw: 'tontura vertigem labirintite flunarizina dramin betaistina', it: [
      I('ORAL', 'DIMENIDRINATO + PIRIDOXINA (DRAMIN B6) 50 + 10MG', '15 CP', '01 CP VO DE 8/8H SE TONTURA OU NÁUSEA, POR ATÉ 05 DIAS'),
      O('ORAL', 'BETAISTINA 24MG', '14 CP', '01 CP VO DE 12/12H POR 07 DIAS'),
      O('ORAL', 'FLUNARIZINA 10MG', '07 CP', '01 CP VO À NOITE POR 07 DIAS')],
      ori: ['LEVANTAR DEVAGAR. EVITAR DIRIGIR E LOCAIS ALTOS DURANTE A TONTURA. RETORNAR SE DIFICULDADE PARA FALAR, ANDAR, ENXERGAR, FRAQUEZA EM UM LADO DO CORPO OU DOR DE CABEÇA FORTE.'],
      nota: 'Uso prolongado de supressor vestibular atrasa a compensação; preferir curto prazo. Afastar causa central (HINTS).' },
    { id: 'anemia', t: 'Anemia ferropriva', c: 'out', kw: 'anemia ferro sulfato ferroso ácido fólico', it: [
      I('ORAL', 'SULFATO FERROSO 40MG DE FERRO ELEMENTAR', '60 CP', '01 CP VO 1X AO DIA, 1H ANTES DO ALMOÇO, COM SUCO DE LARANJA, POR 60 DIAS'),
      O('ORAL', 'ÁCIDO FÓLICO 5MG', '30 CP', '01 CP VO 1X AO DIA POR 30 DIAS')],
      ori: ['NÃO TOMAR O FERRO COM LEITE, CAFÉ OU CHÁ. AS FEZES PODEM FICAR ESCURAS. PROCURAR A UBS PARA INVESTIGAR A CAUSA DA ANEMIA.'] },
    { id: 'bell', t: 'Paralisia facial periférica (Bell)', c: 'out', kw: 'paralisia de bell facial prednisona valaciclovir', it: [
      I('ORAL', 'PREDNISONA 20MG', '21 CP', '03 CP VO 1X AO DIA, PELA MANHÃ, POR 07 DIAS'),
      O('ORAL', 'VALACICLOVIR 500MG', '42 CP', '02 CP VO DE 8/8H POR 07 DIAS'),
      I('OFT', 'COLÍRIO LUBRIFICANTE (CARMELOSE 0,5%)', '01 FR', 'PINGAR 01 GOTA NO OLHO AFETADO DE 2/2H DURANTE O DIA'),
      I('OFT', 'POMADA OFTÁLMICA LUBRIFICANTE (EPITEZAN)', '01 TB', 'APLICAR NO OLHO AFETADO AO DEITAR E OCLUIR O OLHO PARA DORMIR')],
      ori: ['PROTEGER O OLHO DO VENTO E DA POEIRA (ÓCULOS). PROCURAR A UBS E FISIOTERAPIA. RETORNAR SE FRAQUEZA EM BRAÇO OU PERNA, ALTERAÇÃO DA FALA OU OUTROS SINTOMAS.'],
      nota: 'Corticoide em até 72 h. Antiviral associado em casos graves. Excluir AVC (testa poupada sugere lesão central).' },
    { id: 'verminose', t: 'Verminose (adulto)', c: 'out', kw: 'verme parasitose albendazol', it: [
      I('ORAL', 'ALBENDAZOL 400MG', '01 CP', '01 CP VO EM DOSE ÚNICA (ESTRONGILOIDÍASE OU TENÍASE: 1X AO DIA POR 03 DIAS)')],
      ori: ['LAVAR AS MÃOS ANTES DAS REFEIÇÕES E APÓS IR AO BANHEIRO. LAVAR BEM FRUTAS E VERDURAS. TRATAR AS PESSOAS DA CASA.'] },

    /* ===== PEDIATRIA (dose pelo peso e idade do paciente) ===== */
    { id: 'p-ivas', ped: 1, t: 'IVAS / resfriado (criança)', c: 'orl', kw: 'criança resfriado coriza febre gotas', need: 'kg age', it: [pDIP, pIBU, pDESLO, pAMBROX, pSFN, pPARA],
      ori: ['OFERECER LÍQUIDOS COM FREQUÊNCIA. ' + ORI_FEBRE + ' RETORNAR TAMBÉM SE GEMÊNCIA, RESPIRAÇÃO RÁPIDA OU RECUSA ALIMENTAR.'],
      nota: 'Ibuprofeno acima de 6 meses; desloratadina acima de 6 meses; ambroxol não recomendado abaixo de 2 anos sem avaliação.' },
    { id: 'p-febre', ped: 1, t: 'Febre e dor (criança)', c: 'orl', kw: 'criança febre antitérmico gotas', need: 'kg', it: [pDIP, pPARA, O('ORAL', 'IBUPROFENO GOTAS 50MG/ML', '01 FR', c => `${gt(2, 40)(c)} GOTAS VO DE 8/8H SE FEBRE PERSISTENTE, APÓS ALIMENTAÇÃO`)],
      ori: ['MEDIR A TEMPERATURA ANTES DE DAR O REMÉDIO (FEBRE: 37,8 °C OU MAIS). ROUPAS LEVES E LÍQUIDOS. ' + ORI_FEBRE],
      nota: 'Dipirona acima de 3 meses; ibuprofeno acima de 6 meses. Menor de 3 meses com febre: avaliação médica obrigatória.' },
    { id: 'p-geca', ped: 1, t: 'GECA / diarreia (criança)', c: 'gi', kw: 'criança diarreia vômito sro zinco enterogermina', need: 'kg age', it: [
      I('ORAL', 'SORO DE REIDRATAÇÃO ORAL', '05 SACHÊS', c => `DILUIR 01 SACHÊ EM 01 LITRO DE ÁGUA FILTRADA E OFERECER ${byAge([[1, '50 A 100 ML'], [10, '100 A 200 ML']], 'À VONTADE')(c)} APÓS CADA EVACUAÇÃO LÍQUIDA OU VÔMITO`),
      I('ORAL', 'SULFATO DE ZINCO 4MG/ML', '01 FR', c => `${byAge([[0.5, '2,5 ML (10 MG)']], '5 ML (20 MG)')(c)} VO 1X AO DIA POR 10 A 14 DIAS`),
      pBROMO, I('ORAL', 'SACCHAROMYCES BOULARDII (ENTEROGERMINA OU FLORATIL)', '10 FLACONETES', '01 FLACONETE VO DE 12/12H POR 05 DIAS'),
      O('ORAL', 'ESCOPOLAMINA GOTAS 10MG/ML (BUSCOPAN)', '01 FR', c => `${byAge([[1, B + ' (NÃO USAR ABAIXO DE 1 ANO)'], [6, '05 A 10 GOTAS'], [200, '10 A 20 GOTAS']])(c)} VO DE 8/8H SE CÓLICA`), pDIP],
      ori: ['MANTER O ALEITAMENTO MATERNO E A ALIMENTAÇÃO HABITUAL. ' + ORI_DIARREIA],
      nota: 'Plano A do Ministério da Saúde. Não usar loperamida em crianças.' },
    { id: 'p-amox', ped: 1, t: 'Amoxicilina (amigdalite, OMA, sinusite: criança)', c: 'orl', kw: 'criança antibiótico amoxicilina suspensão otite amigdalite', need: 'kg', it: [
      I('ORAL', 'AMOXICILINA 250MG/5ML', '01 FR', c => `${ml(1 / 3, 10)(c)} ML VO DE 8/8H POR 10 DIAS`), pDIP, pIBU],
      ori: ['COMPLETAR TODO O ANTIBIÓTICO MESMO COM MELHORA. AGITAR O FRASCO ANTES DE USAR E GUARDAR NA GELADEIRA. ' + ORI_FEBRE],
      nota: '50 mg/kg/dia (máx. 500 mg/dose). OMA com uso recente de amoxicilina ou falha: amoxicilina-clavulanato ou dose alta (80 a 90 mg/kg/dia). Amigdalite estreptocócica: 10 dias.' },
    { id: 'p-clav', ped: 1, t: 'Amoxicilina + clavulanato (criança)', c: 'orl', kw: 'criança clavulin antibiótico', need: 'kg', it: [
      I('ORAL', 'AMOXICILINA + CLAVULANATO 250 + 62,5MG/5ML', '01 FR', c => `${ml(1 / 3, 10)(c)} ML VO DE 8/8H POR 07 A 10 DIAS`), pDIP],
      ori: ['TOMAR NO INÍCIO DAS REFEIÇÕES. GUARDAR NA GELADEIRA. ' + ORI_FEBRE], nota: '50 mg/kg/dia de amoxicilina.' },
    { id: 'p-azitro', ped: 1, t: 'Azitromicina (criança)', c: 'resp', kw: 'criança azitromicina alergia penicilina', need: 'kg', it: [
      I('ORAL', 'AZITROMICINA 200MG/5ML', '01 FR', c => `${ml(1 / 4, 12.5)(c)} ML VO 1X AO DIA POR 05 DIAS`), pDIP],
      ori: [ORI_FEBRE], nota: '10 mg/kg/dia (máx. 500 mg). Esquema alternativo: 10 mg/kg no 1º dia e 5 mg/kg do 2º ao 5º.' },
    { id: 'p-cefalex', ped: 1, t: 'Cefalexina (pele e ITU: criança)', c: 'pele', kw: 'criança cefalexina impetigo itu infecção de pele', need: 'kg', it: [
      I('ORAL', 'CEFALEXINA 250MG/5ML', '01 FR', c => `${ml(1 / 4, 10)(c)} ML VO DE 6/6H POR 07 DIAS`), pDIP],
      ori: ['GUARDAR NA GELADEIRA E AGITAR ANTES DE USAR. ' + ORI_FEBRE], nota: '50 mg/kg/dia (máx. 500 mg/dose). ITU febril/pielonefrite: 10 dias.' },
    { id: 'p-alergia', ped: 1, t: 'Alergia / urticária (criança)', c: 'resp', kw: 'criança alergia urticária prednisolona antialérgico', need: 'kg age', it: [pPRED, pDESLO, O('ORAL', 'DEXCLORFENIRAMINA 2MG/5ML', '01 FR', pDEXCL.p)],
      ori: ['EVITAR O FATOR DESENCADEANTE. PROCURAR ATENDIMENTO IMEDIATO SE INCHAÇO DOS LÁBIOS OU LÍNGUA, FALTA DE AR OU VÔMITOS REPETIDOS.'],
      nota: 'Prednisolona 1 mg/kg/dia (máx. 40 mg). Anti-histamínicos pela faixa etária da bula.' },
    { id: 'p-asma', ped: 1, t: 'Asma / sibilância: alta (criança)', c: 'resp', kw: 'criança asma bronquite chiado salbutamol espaçador prednisolona', need: 'kg', it: [
      I('ORAL', 'PREDNISOLONA 3MG/ML', '01 FR', c => `${ml(1 / 3, 13)(c)} ML VO 1X AO DIA, PELA MANHÃ, POR 03 A 05 DIAS`),
      I('INAL', 'SALBUTAMOL 100MCG/DOSE SPRAY', '01 FR', '02 A 04 JATOS COM ESPAÇADOR E MÁSCARA DE 4/4H SE FALTA DE AR OU CHIADO, POR 05 DIAS'),
      I('INAL', 'ESPAÇADOR COM MÁSCARA', '01 UN', 'USAR COM O SPRAY: 1 JATO POR VEZ, 5 A 6 RESPIRAÇÕES ENTRE OS JATOS')],
      ori: ['RETORNAR SE RESPIRAÇÃO RÁPIDA, BARRIGA AFUNDANDO AO RESPIRAR, LÁBIOS ROXOS OU SE O SPRAY NÃO ALIVIAR. EVITAR FUMAÇA DE CIGARRO EM CASA. ACOMPANHAMENTO NA UBS.'],
      nota: 'Prednisolona 1 mg/kg/dia (máx. 40 mg).' },
    { id: 'p-conj', ped: 1, t: 'Conjuntivite bacteriana (criança)', c: 'olho', kw: 'criança conjuntivite colírio tobramicina', it: [
      I('OFT', 'TOBRAMICINA 0,3% COLÍRIO', '01 FR', 'PINGAR 01 GOTA NO(S) OLHO(S) ACOMETIDO(S) DE 6/6H POR 07 DIAS'),
      I('OFT', 'SORO FISIOLÓGICO 0,9%', '01 FR', 'LIMPAR AS SECREÇÕES COM GAZE E SORO ANTES DE PINGAR O COLÍRIO')],
      ori: ['LAVAR AS MÃOS ANTES E DEPOIS DE PINGAR. AFASTAR DA CRECHE OU ESCOLA ATÉ 24H APÓS O INÍCIO DO COLÍRIO. ' + ORI_OLHO],
      nota: 'Em crianças, preferir tobramicina. Recém-nascido com conjuntivite: avaliação especializada (gonococo e clamídia).' },
    { id: 'p-otite-ext', ped: 1, t: 'Otite externa (criança)', c: 'orl', kw: 'criança otosporin ouvido piscina', need: 'kg', it: [
      I('OTO', 'HIDROCORTISONA + NEOMICINA + POLIMIXINA B (OTOSPORIN)', '01 FR', 'APLICAR 02 GOTAS NO OUVIDO AFETADO, 3X AO DIA, POR 07 DIAS'), pDIP],
      ori: ['NÃO MOLHAR O OUVIDO DURANTE O TRATAMENTO. NÃO USAR COTONETE.'] },
    { id: 'p-escabiose', ped: 1, t: 'Escabiose (criança)', c: 'pele', kw: 'criança sarna permetrina ivermectina', need: 'kg age', it: [
      I('TOP', 'PERMETRINA 5% LOÇÃO', '01 FR', 'APLICAR EM TODO O CORPO (INCLUSIVE COURO CABELUDO E ROSTO EM MENORES DE 2 ANOS, POUPANDO OLHOS E BOCA) À NOITE E RETIRAR NO BANHO DA MANHÃ. REPETIR APÓS 07 DIAS'),
      O('ORAL', 'IVERMECTINA 6MG', '04 CP', c => `TOMAR ${ivm(c)} VO EM DOSE ÚNICA E REPETIR APÓS 07 DIAS`), pDEXCL],
      ori: ['TRATAR TODOS QUE MORAM NA CASA AO MESMO TEMPO. LAVAR ROUPAS E ROUPAS DE CAMA EM ÁGUA QUENTE. CORTAR AS UNHAS.'],
      nota: 'Permetrina acima de 2 meses (abaixo disso, enxofre precipitado 5 a 10%). Ivermectina só a partir de 15 kg e 5 anos.' },
    { id: 'p-impetigo', ped: 1, t: 'Impetigo (criança)', c: 'pele', kw: 'criança impetigo crosta mupirocina', need: 'kg', it: [
      I('TOP', 'MUPIROCINA 2% POMADA', '01 TB', 'APLICAR NAS LESÕES 3X AO DIA POR 07 A 10 DIAS, APÓS REMOVER AS CROSTAS COM ÁGUA E SABÃO'),
      O('ORAL', 'CEFALEXINA 250MG/5ML', '01 FR', c => `${ml(1 / 4, 10)(c)} ML VO DE 6/6H POR 07 DIAS`)],
      ori: ['MUITO CONTAGIOSO: AFASTAR DA ESCOLA ATÉ 24H APÓS O INÍCIO DO ANTIBIÓTICO. CORTAR AS UNHAS. TOALHAS INDIVIDUAIS.'] },
    { id: 'p-constip', ped: 1, t: 'Constipação (criança)', c: 'gi', kw: 'criança intestino preso lactulose supositório', need: 'age', it: [
      I('ORAL', 'LACTULOSE XAROPE 667MG/ML', '01 FR', c => `${byAge([[1, '2,5 ML'], [6, '5 ML'], [12, '10 ML']], '15 ML')(c)} VO 1 A 2X AO DIA (AJUSTAR ATÉ FEZES PASTOSAS)`),
      I('RET', 'SUPOSITÓRIO INFANTIL GLICERINADO', '05 UN', 'APLICAR 01 VIA RETAL DE 12/12H SE CONSTIPAÇÃO (NÃO USAR DE ROTINA)')],
      ori: ['OFERECER ÁGUA, FRUTAS (MAMÃO, AMEIXA, LARANJA COM BAGAÇO) E VERDURAS. SENTAR NO VASO APÓS AS REFEIÇÕES POR 5 MINUTOS.'] },
    { id: 'p-verminose', ped: 1, t: 'Verminose (criança)', c: 'out', kw: 'criança verme albendazol', need: 'age', it: [
      I('ORAL', 'ALBENDAZOL 400MG/10ML SUSPENSÃO', '01 FR', c => `${byAge([[1, B + ' (NÃO USAR ABAIXO DE 1 ANO)'], [2, '5 ML (200 MG)']], '10 ML (400 MG)')(c)} VO EM DOSE ÚNICA`)],
      ori: ['LAVAR AS MÃOS ANTES DAS REFEIÇÕES E APÓS IR AO BANHEIRO. CORTAR AS UNHAS. TRATAR AS PESSOAS DA CASA.'] },
    { id: 'p-sapinho', ped: 1, t: 'Candidíase oral (sapinho)', c: 'orl', kw: 'criança lactente monilíase sapinho nistatina boca', need: 'age', it: [
      I('BUC', 'NISTATINA SUSPENSÃO ORAL 100.000 UI/ML', '01 FR', c => `${byAge([[1, '1 ML (0,5 ML EM CADA LADO DA BOCA)']], '2 A 3 ML (BOCHECHAR E ENGOLIR)')(c)} DE 6/6H POR 07 A 14 DIAS, CONTINUANDO ATÉ 2 DIAS APÓS SUMIREM AS PLACAS`)],
      ori: ['APLICAR APÓS AS MAMADAS. FERVER BICOS E CHUPETAS. EM ALEITAMENTO MATERNO, TRATAR TAMBÉM OS MAMILOS DA MÃE.'] },
    { id: 'p-fralda', ped: 1, t: 'Dermatite de fraldas', c: 'pele', kw: 'assadura fralda óxido de zinco nistatina candida', it: [
      I('TOP', 'ÓXIDO DE ZINCO POMADA (CREME BARREIRA)', '01 TB', 'APLICAR CAMADA GROSSA A CADA TROCA DE FRALDA'),
      O('TOP', 'NISTATINA + ÓXIDO DE ZINCO CREME', '01 TB', 'APLICAR A CADA TROCA DE FRALDA POR 07 A 14 DIAS (SE LESÕES SATÉLITES, SUGERINDO CANDIDA)')],
      ori: ['TROCAR A FRALDA COM FREQUÊNCIA. LIMPAR COM ÁGUA MORNA E ALGODÃO (EVITAR LENÇOS UMEDECIDOS). DEIXAR A PELE SECAR E FICAR SEM FRALDA ALGUNS MINUTOS POR DIA.'] },
    { id: 'p-dengue', ped: 1, t: 'Dengue (criança, grupo A)', c: 'out', kw: 'criança dengue hidratação', need: 'kg', it: [
      pDIP, pPARA,
      I('ORAL', 'SORO DE REIDRATAÇÃO ORAL', '05 SACHÊS', c => {
        if (!(c.kg > 0)) return `OFERECER ${B} ML DE LÍQUIDO POR DIA, SENDO 1/3 COM SORO DE REIDRATAÇÃO ORAL`;
        const v = c.kg <= 10 ? 130 * c.kg : c.kg <= 20 ? 100 * c.kg : 80 * c.kg;
        return `OFERECER ${Math.round(v / 10) * 10} ML DE LÍQUIDO POR DIA, SENDO 1/3 (${Math.round(v / 30) * 10} ML) COM SORO DE REIDRATAÇÃO ORAL E O RESTANTE COM ÁGUA, SUCOS E LEITE`;
      })],
      ori: ['NÃO DAR AAS NEM IBUPROFENO. RETORNAR IMEDIATAMENTE SE DOR NA BARRIGA, VÔMITOS, SANGRAMENTO, SONOLÊNCIA OU IRRITABILIDADE, MÃOS E PÉS FRIOS OU POUCA URINA, PRINCIPALMENTE QUANDO A FEBRE BAIXAR.'],
      nota: 'Volume do Ministério da Saúde: até 10 kg 130 mL/kg/dia; 10 a 20 kg 100 mL/kg/dia; acima de 20 kg 80 mL/kg/dia.' }
  ];

  // ivermectina por peso (tabela do receituário)
  function ivm(c) {
    const kg = c.kg; if (!(kg > 0)) return B + ' CP';
    if (kg < 15) return 'NÃO INDICADA ABAIXO DE 15 KG';
    const n = kg < 25 ? '1/2 CP' : kg < 36 ? '01 CP' : kg < 51 ? '1 E 1/2 CP' : kg < 66 ? '02 CP' : kg < 80 ? '2 E 1/2 CP' : '03 CP';
    return n;
  }

  /* ---------- montagem do texto ---------- */
  const CTX = () => {
    const p = D.S.patient, a = u.num(p.age), un = p.ageU || 'a';
    return { kg: u.num(p.kg), age: isFinite(a) ? (un === 'a' ? a : un === 'm' ? a / 12 : a / 365.25) : NaN };
  };
  const val = (x, c) => typeof x === 'function' ? x(c) : x;
  const line = (n, q) => { const w = 54, d = Math.max(4, w - n.length - (q ? q.length : 0) - 2); return n + ' ' + '-'.repeat(d) + (q ? ' ' + q : ''); };

  function compose(sel, inc, c) {
    const groups = [], seen = new Set(), ori = [];
    sel.forEach(rid => {
      const r = R.find(x => x.id === rid); if (!r) return;
      r.it.forEach((it, i) => {
        const key = rid + ':' + i; if (!inc(key, it)) return;
        const nm = val(it.n, c), sig = nm + '|' + val(it.p, c); if (seen.has(sig)) return; seen.add(sig);
        let g = groups.find(x => x.v === it.v); if (!g) { g = { v: it.v, items: [] }; groups.push(g); }
        g.items.push({ n: nm, q: val(it.q, c), p: val(it.p, c), key, it, rid });
      });
      (r.ori || []).forEach(o => o.split(/(?<=\.)\s+/).forEach(f => { f = f.trim(); if (f && !ori.includes(f)) ori.push(f); }));
    });
    return { groups, ori };
  }
  function toText(comp) {
    const out = [];
    comp.groups.forEach(g => {
      out.push(VIA[g.v] + ':', '');
      g.items.forEach((x, i) => out.push(`${i + 1}. ${line(x.n, x.q)}`, x.p, ''));
    });
    if (comp.ori.length) out.push('ORIENTAÇÕES: ' + comp.ori.join(' '));
    return out.join('\n').trim();
  }

  /* ---------- tela ---------- */
  const tool = {
    id: 'receitas', g: 'rx', title: 'Todas as receitas', desc: 'Modelos de receita por diagnóstico, adulto e pediatria, com dose pelo peso. Marque os itens, some receitas e copie',
    kw: 'receita receituário prescrição alta para casa modelo pronto conjuntivite ivas otite itu sarna dengue',
    disc: 'Modelos de apoio. Revise alergias, gestação, função renal, interações e a disponibilidade no SUS antes de entregar a receita.',
    render: (h, u2, sub) => {
      const st = { q: '', pop: '', cat: '', sel: [], inc: {}, edit: null };
      if (sub && sub.indexOf('c:') === 0) st.cat = sub.slice(2);
      else if (sub && R.find(r => r.id === sub)) st.sel = [sub];
      const root = h('div', { class: 'rx' });
      const side = h('section', { class: 'rx-l' }), doc = h('section', { class: 'rx-r', id: 'rxdoc' });
      root.append(side, doc);
      const search = h('input', { type: 'search', class: 'rx-q', placeholder: 'Filtrar: conjuntivite, otite, criança…', 'aria-label': 'Filtrar receitas', oninput: e => { st.q = e.target.value; list(); } });
      const popSeg = h('div', { class: 'seg rx-pop', role: 'group', 'aria-label': 'Público' });
      const catBox = h('div', { class: 'rx-cats' });
      const ul = h('ul', { class: 'rx-list' });
      side.append(h('label', { class: 'gs rx-search' }, u.icon('search'), search), popSeg, catBox, ul);

      const setUrl = () => { try { const s = st.sel.length === 1 ? '/' + st.sel[0] : st.cat ? '/c:' + st.cat : ''; history.replaceState(null, '', '#/receitas' + s); } catch (e) { } };
      function chips() {
        popSeg.innerHTML = '';
        [['', 'Todos'], ['a', 'Adulto'], ['c', 'Criança']].forEach(([v, l]) => popSeg.append(h('button', { type: 'button', class: st.pop === v ? 'on' : '', 'aria-pressed': st.pop === v ? 'true' : 'false', onclick: () => { st.pop = v; chips(); list(); } }, l)));
        catBox.innerHTML = '';
        [['', 'Todas']].concat(CATS.map(c => [c[0], c[1]])).forEach(([v, l]) => catBox.append(h('button', { type: 'button', class: 'rx-cat' + (st.cat === v ? ' on' : ''), 'aria-pressed': st.cat === v ? 'true' : 'false', onclick: () => { st.cat = v; chips(); list(); setUrl(); } }, l)));
      }
      function list() {
        ul.innerHTML = '';
        const q = u.norm(st.q.trim()), parts = q ? q.split(/\s+/) : [];
        const rs = R.filter(r => (!st.pop || (st.pop === 'c' ? r.ped : !r.ped)) && (!st.cat || r.c === st.cat) &&
          (!parts.length || parts.every(p => u.norm(r.t + ' ' + r.kw + ' ' + (r.ped ? 'criança pediatria' : 'adulto')).includes(p))));
        if (!rs.length) { ul.append(h('li', { class: 'rx-empty' }, 'Nenhuma receita encontrada. Tente outro termo ou limpe os filtros.')); return; }
        let lastCat = null;
        rs.forEach(r => {
          if (!st.cat && r.c !== lastCat) { lastCat = r.c; ul.append(h('li', { class: 'rx-h' }, CATS.find(c => c[0] === r.c)[1])); }
          const on = st.sel.includes(r.id);
          ul.append(h('li', { class: 'rx-item' + (on ? ' on' : '') },
            h('button', { type: 'button', class: 'rx-open', onclick: () => { st.sel = [r.id]; st.edit = null; list(); render(); setUrl(); if (window.innerWidth < 1000) doc.scrollIntoView({ behavior: 'smooth', block: 'start' }); } },
              h('span', { class: 'rx-t' }, r.t), r.ped && h('span', { class: 'rx-tag' }, 'criança')),
            h('button', { type: 'button', class: 'rx-add', title: on ? 'Remover da receita' : 'Somar à receita aberta', 'aria-label': (on ? 'Remover ' : 'Somar ') + r.t,
              onclick: () => { st.sel = on ? st.sel.filter(x => x !== r.id) : st.sel.concat(r.id); st.edit = null; list(); render(); setUrl(); } }, on ? '−' : '+')));
        });
      }
      const isInc = (key, it) => st.inc[key] != null ? st.inc[key] : !it.opt;
      function render() {
        doc.innerHTML = '';
        if (!st.sel.length) {
          doc.append(h('div', { class: 'rx-blank' }, h('h2', null, 'Escolha um diagnóstico'),
            h('p', null, 'Toque em uma receita para abrir. Use o botão + para somar outra (por exemplo, IVAS + amoxicilina). Itens marcados como opção ficam desmarcados até você incluir.')));
          return;
        }
        const c = CTX(), rs = st.sel.map(id => R.find(r => r.id === id));
        const needKg = rs.some(r => (r.need || '').includes('kg')), needAge = rs.some(r => (r.need || '').includes('age'));
        // cabeçalho com receitas selecionadas
        doc.append(h('div', { class: 'rx-sel' }, rs.map(r => h('span', { class: 'rx-chip' }, r.t,
          st.sel.length > 1 && h('button', { type: 'button', 'aria-label': 'Remover ' + r.t, onclick: () => { st.sel = st.sel.filter(x => x !== r.id); st.edit = null; list(); render(); setUrl(); } }, '×')))));
        if (needKg || needAge) {
          const p = D.S.patient;
          const fk = h('label', { class: 'pf' }, h('span', null, 'Peso'), h('span', { class: 'pfin' }, h('input', { inputmode: 'decimal', value: p.kg || '', 'aria-label': 'Peso', oninput: e => { p.kg = e.target.value; D.S.vals = {}; D.savePatient(); paper(); } }), h('span', { class: 'u' }, 'kg')));
          const su = h('select', { 'aria-label': 'Unidade da idade', onchange: e => { p.ageU = e.target.value; D.savePatient(); paper(); } }, [['a', 'anos'], ['m', 'meses']].map(([v, l]) => h('option', { value: v }, l)));
          su.value = p.ageU === 'm' ? 'm' : 'a';
          const fa = h('label', { class: 'pf' }, h('span', null, 'Idade'), h('span', { class: 'pfin' }, h('input', { inputmode: 'decimal', value: p.age || '', 'aria-label': 'Idade', oninput: e => { p.age = e.target.value; D.savePatient(); paper(); } }), su));
          doc.append(h('div', { class: 'rx-pt' }, needKg && fk, needAge && fa));
        }
        const paperBox = h('div', { class: 'rx-paper-wrap' });
        const tools = h('div', { class: 'rx-actions' });
        const notes = h('div', { class: 'rx-notes' });
        doc.append(paperBox, tools, notes);
        rs.forEach(r => { if (r.nota) notes.append(h('div', { class: 'alert info' }, u.icon('alert'), h('span', null, (rs.length > 1 ? r.t + ': ' : '') + r.nota))); });

        function paper() {
          const c2 = CTX(), comp = compose(st.sel, isInc, c2);
          paperBox.innerHTML = ''; tools.innerHTML = '';
          const miss = (needKg && !(c2.kg > 0)) || (needAge && !isFinite(c2.age));
          if (st.edit != null) {
            const ta = h('textarea', { class: 'rx-edit', 'aria-label': 'Texto da receita', oninput: e => { st.edit = e.target.value; } });
            ta.value = st.edit; paperBox.append(ta);
          } else {
            const pp = h('div', { class: 'rx-paper' });
            // todos os itens (incluídos e opções), agrupados por via, com caixa de seleção
            const all = []; const seen = new Set();
            st.sel.forEach(rid => { const r = R.find(x => x.id === rid); r.it.forEach((it, i) => { const sig = val(it.n, c2) + '|' + val(it.p, c2); if (seen.has(sig)) return; seen.add(sig); all.push({ it, key: rid + ':' + i }); }); });
            const vias = []; all.forEach(x => { if (!vias.includes(x.it.v)) vias.push(x.it.v); });
            vias.forEach(v => {
              pp.append(h('div', { class: 'rx-via' }, VIA[v] + ':'));
              let n = 0;
              all.filter(x => x.it.v === v).forEach(x => {
                const on = isInc(x.key, x.it); if (on) n++;
                const cb = h('input', { type: 'checkbox', 'aria-label': 'Incluir ' + val(x.it.n, c2), onchange: e => { st.inc[x.key] = e.target.checked; paper(); } }); cb.checked = on;
                pp.append(h('label', { class: 'rx-it' + (on ? '' : ' off') }, cb,
                  h('span', { class: 'rx-num' }, on ? n + '.' : ''),
                  h('span', { class: 'rx-body' }, h('span', { class: 'rx-n' }, val(x.it.n, c2), h('span', { class: 'rx-qt' }, val(x.it.q, c2)), x.it.opt && h('span', { class: 'rx-opt' }, 'opção')),
                    h('span', { class: 'rx-p' }, val(x.it.p, c2)))));
              });
            });
            if (comp.ori.length) pp.append(h('div', { class: 'rx-ori' }, h('b', null, 'ORIENTAÇÕES: '), comp.ori.join(' ')));
            paperBox.append(pp);
          }
          const text = st.edit != null ? st.edit : toText(comp);
          const copyB = h('button', { type: 'button', class: 'copy rx-copy' }, u.icon('copy'), 'Copiar receita');
          copyB.onclick = () => {
            const t = st.edit != null ? st.edit : toText(compose(st.sel, isInc, CTX()));
            const done = () => { copyB.lastChild.textContent = 'Copiada'; setTimeout(() => { copyB.lastChild.textContent = 'Copiar receita'; }, 1600); };
            if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(t).then(done, () => fb(t, done)); else fb(t, done);
          };
          const editB = h('button', { type: 'button', class: 'rx-btn', onclick: () => { st.edit = st.edit != null ? null : text; paper(); } }, st.edit != null ? 'Voltar aos itens' : 'Editar texto');
          tools.append(copyB, editB);
          if (miss) tools.prepend(h('div', { class: 'alert' }, u.icon('alert'), h('span', null, 'Informe ' + [needKg && !(c2.kg > 0) && 'o peso', needAge && !isFinite(c2.age) && 'a idade'].filter(Boolean).join(' e ') + ' para calcular as doses (aparecem como ___).')));
        }
        function fb(t, done) { const ta = h('textarea', { style: 'position:fixed;opacity:0' }); ta.value = t; document.body.append(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (e) { } ta.remove(); }
        paper();
      }
      chips(); list(); render();
      return root;
    }
  };

  const links = CATS.map(([id, t, d]) => ({ id: 'rx-' + id, g: 'rx', title: t, desc: d, kw: 'receita ' + d, href: '#/receitas/c:' + id }));
  D.add(tool, ...links);
  R.forEach(r => D.links.push({ id: 'rxl-' + r.id, g: 'rx', title: 'Receita: ' + r.t, desc: r.ped ? 'Receita pediátrica com dose pelo peso' : 'Receita pronta para copiar', kw: 'receita ' + r.kw, href: '#/receitas/' + r.id }));
  D.rx = { R, compose, toText, CTX };
})();
