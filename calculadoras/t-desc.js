/* Descrições cirúrgicas: modelos por procedimento e autor, com campos editáveis e cópia no formato do relatório de cirurgia */
(function () {
  'use strict';
  const D = window.DRB, u = D.u;
  const MY = 'drb_desc_my';
  const TIPOS = [['Limpa', 'Limpa'], ['Limpa-contaminada', 'Limpa-contam.'], ['Contaminada', 'Contaminada'], ['Infectada', 'Infectada']];
  const loadMine = () => { try { return JSON.parse(localStorage.getItem(MY) || '[]'); } catch (e) { return []; } };
  const saveMine = l => { try { localStorage.setItem(MY, JSON.stringify(l)); } catch (e) { } };

  // potencial de contaminação sugerido pelo procedimento (o usuário pode trocar)
  function tipoDe(m) {
    const t = u.norm(m.t + ' ' + m.cp + ' ' + (m.s || []).slice(0, 12).join(' '));
    const T = u.norm(m.t);
    if (/abscesso|debrid|desbrid|fournier|peritonite|peritoneostomia|\bf4\b|fase 4|gangren|perfura|purulent|necros/.test(T) || /\bf3\b|fase 3/.test(T)) return 'Infectada';
    if (m.c === 'apend' || m.c === 'colon' || m.c === 'procto' || /enterect|enterorraf|gastrorraf|hartmann|colostom|ileostom|hemorroid|perianal|pilonidal|bridas|retossig/.test(T)) return 'Contaminada';
    if (m.c === 'vb' || /gastrostom|traqueo|esofag|histerect|lobect|segmentect|bulect|glossect|laringect|pelvi|broncosc|nefrect|whipple|duodeno|conizac|exenter|maxilect|jejuno|laparotomia|\ble\b|videolaparosc|ureter/.test(t)) return 'Limpa-contaminada';
    return 'Limpa';
  }
  // apelidos: quem digita CVL, VLP, F1, LE, HU… continua achando
  function ali(m) {
    const t = u.norm(m.t + ' ' + (m.cp || '')); let a = '';
    if (/colecistectomia videolap|videocolecistectomia/.test(t)) a += ' cvl';
    if (/videolap|video/.test(t)) a += ' vlp video vl laparoscopica';
    const f = t.match(/fase (\d)/); if (f) a += ' f' + f[1];
    if (/laparotomia explorad/.test(t)) a += ' le';
    if (/herniorrafia umbilical/.test(t)) a += ' hu hernia umbilical';
    if (/herniorrafia|hernioplastia/.test(t)) a += ' hernia hernioplastia';
    if (/traqueostomia/.test(t)) a += ' tqt';
    if (/via biliar/.test(t)) a += ' vb';
    if (/debridamento/.test(t)) a += ' desbridamento';
    return a;
  }

  /* ---------- itens para marcar e incluir na descrição ---------- */
  // pos: 'ach' logo após o inventário; 'pre' antes do fechamento; 'cur' antes do curativo; at: antes da primeira linha que casar
  const CLOSE = /revis[aã]o (da |de )?hemostasia|contagem de|s[ií]ntese|fechamento d|sutura d[ae] (pele|aponeurose)|desfeito pneumo|retirada dos? (instrumenta|trocat)|curativo/i;
  const O = {
    cultura: { l: 'Coleta para cultura', x: 'Coleta de secreção para cultura e antibiograma', pos: 'pre', skip: /cultura/i },
    anatomo: { l: 'Peça para anatomopatológico', x: 'Peça cirúrgica enviada para estudo anatomopatológico', pos: 'pre', skip: /anatomo?patol|anátomo/i },
    lavagem: { l: 'Lavagem da cavidade', x: 'Lavagem da cavidade com soro fisiológico 0,9% aquecido até retorno límpido', pos: 'pre', skip: /lavagem/i },
    contagem: { l: 'Contagem conferida', x: 'Contagem de compressas, gazes e instrumentais conferida', pos: 'syn', skip: /contagem/i },
    infiltr: { l: 'Anestésico local nas incisões', x: 'Infiltração das incisões com anestésico local', pos: 'cur', skip: /infiltra/i },
    aberta: { l: 'Ferida deixada aberta', x: 'Ferida deixada aberta para cicatrização por segunda intenção', pos: 'cur', skip: /segunda inten/i },
    drSuc: { ax: 'dr', l: 'Dreno de sucção', x: 'Posicionamento de dreno de sucção fechado, exteriorizado por contra-abertura e fixado à pele', pos: 'syn', skip: /\bdrenos?\b/i },
    drCav: { l: 'Dreno na cavidade', x: 'Posicionamento de dreno tubulolaminar em ___, exteriorizado por contra-abertura em ___ e fixado à pele', pos: 'syn', skip: /\bdrenos?\b/i },
    liqLivre: { l: 'Líquido livre', x: 'Presença de líquido livre ___ em cavidade, aproximadamente ___ mL, aspirado', pos: 'ach' },
    invOk: { l: 'Restante da cavidade sem lesões', x: 'Restante do inventário da cavidade sem outras lesões', pos: 'ach', skip: /sem (outras|demais) les/i },
    saco: { l: 'Saco com epíplon viável', x: 'Conteúdo do saco herniário: epíplon viável, reduzido para a cavidade', at: /tela|refor[cç]o|fechamento do anel|aponeurose/i },
    rxTx: { l: 'Radiografia de controle', x: 'Solicitada radiografia de tórax de controle', pos: 'end', skip: /radiografia|raio|\brx\b/i },
    usg: { l: 'Guiado por ultrassom', x: 'Procedimento guiado por ultrassonografia', pos: 'top', skip: /ultrass|ecoguiad|\busg\b/i }
  };
  const OPTS = {
    apend: [
      { ax: 'fase', l: 'Secreção purulenta', x: 'Presença de secreção purulenta em fossa ilíaca direita e pelve, aspirada', pos: 'ach', skip: /purulent/i },
      { ax: 'fase', l: 'Abscesso bloqueado', x: 'Presença de abscesso periapendicular bloqueado por epíplon e alças, desfeito e drenado', pos: 'ach', skip: /abscesso/i },
      { l: 'Base íntegra', x: 'Base apendicular íntegra e viável', pos: 'ach', skip: /base (apendicular )?(íntegra|integra|em boas|vi[áa]vel)/i },
      { l: 'Sepultamento do coto', x: 'Sepultamento do coto apendicular com sutura em bolsa', pos: 'pre', skip: /sepultamento|em bolsa/i },
      'lavagem',
      { l: 'Dreno de Penrose', x: 'Posicionamento de dreno de Penrose em fossa ilíaca direita e pelve, exteriorizado por contra-abertura em flanco direito e fixado à pele', pos: 'syn', skip: /\bdrenos?\b/i },
      'cultura', 'anatomo', 'contagem', 'infiltr'],
    vb: [
      { ax: 'q', l: 'Colecistite aguda', x: 'Vesícula biliar com paredes espessadas e edemaciadas, com aderências de epíplon, compatível com colecistite aguda', pos: 'ach', skip: /colecistite|espessad/i },
      { l: 'Visão crítica de segurança', x: 'Obtida visão crítica de segurança antes da clipagem', at: /clip|ligadura d[oa] (ducto|art[ée]ria|c[ií]stic)/i, skip: /vis[aã]o cr[ií]tica/i },
      { l: 'Colangiografia', x: 'Colangiografia intraoperatória sem falhas de enchimento e com boa passagem de contraste ao duodeno', at: /dissec[cç][aã]o da ves[ií]cula|leito hep[áa]tico/i, skip: /colangiografia/i },
      { l: 'Abertura da vesícula', x: 'Abertura acidental da vesícula durante a dissecção, com extravasamento de bile e cálculos, aspirados e retirados', pos: 'pre', skip: /extravasamento/i },
      { l: 'Retirada em bolsa', x: 'Retirada da vesícula em bolsa extratora pelo portal umbilical', pos: 'pre', skip: /bolsa|endobag/i },
      { l: 'Lavagem do leito', x: 'Lavagem do leito hepático e do espaço sub-hepático com soro fisiológico 0,9%', pos: 'pre', skip: /lavagem/i },
      { ax: 'dr', l: 'Dreno sub-hepático', x: 'Posicionamento de dreno tubulolaminar em leito hepático, exteriorizado por contra-abertura em flanco direito e fixado à pele', pos: 'syn', skip: /\bdrenos?\b/i },
      'anatomo', 'contagem', 'infiltr'],
    hing: [
      { l: 'Hérnia indireta', x: 'Identificada hérnia inguinal indireta, com saco herniário dissecado e tratado por ligadura alta', at: /tela|refor[cç]o/i, skip: /indireta/i },
      { l: 'Hérnia direta', x: 'Identificada hérnia inguinal direta, com saco herniário reduzido e invaginado', at: /tela|refor[cç]o/i, skip: /hernia direta|hérnia direta/i },
      'saco',
      { l: 'Nervo ilioinguinal preservado', x: 'Identificado e preservado o nervo ilioinguinal', at: /tela|refor[cç]o/i, skip: /ilioinguinal/i },
      'drSuc', 'contagem', 'infiltr'],
    parede: [
      { l: 'Tamanho do anel', x: 'Anel herniário de aproximadamente ___ cm', at: /tela|fechamento do anel|aponeurose/i, skip: /anel hern[ií][áa]rio de/i },
      'saco',
      { l: 'Tela onlay', x: 'Fixação de tela de polipropileno em posição onlay com pontos separados de Prolene 2-0', pos: 'pre', skip: /\btela\b/i },
      'drSuc', 'contagem', 'infiltr'],
    abd: ['liqLivre', 'invOk', 'cultura', 'lavagem', 'drCav', 'anatomo', 'contagem'],
    colon: ['liqLivre', 'invOk', 'cultura', 'lavagem', 'drCav', 'anatomo', 'contagem'],
    procto: ['cultura', 'anatomo', 'aberta', 'infiltr'],
    pele: ['cultura', 'anatomo', 'aberta', 'drSuc', 'infiltr'],
    cp: ['anatomo', 'drSuc', 'contagem', 'infiltr'],
    torac: ['anatomo', 'cultura', 'contagem', 'infiltr', 'rxTx'],
    onco: ['anatomo', 'lavagem', 'drCav', 'contagem'],
    proc: ['usg', 'rxTx']
  };
  const optsFor = (c, txt, fm) => (OPTS[c] || []).map((o, i) => Object.assign({ id: c + i }, typeof o === 'string' ? O[o] : o))
    .filter(o => !(o.skip && o.skip.test(txt)) && !(o.ax && fm && FAM[fm] && FAM[fm].ax.some(a => a.k === o.ax || (o.ax === 'fase' && a.k === 'grau'))));

  /* ---------- fichas por procedimento: seletores que trocam o texto ---------- */
  const NOTFIND = /(dissec|isolamento|ligadura|clip|retirad|sec[cç][aã]o|ex[eé]rese|invagina|libera|envi|drenagem|lavagem|colet|passagem|coloca|posiciona|realizad|esvazia|ressec|bolsa)/i;
  function setFinding(lines, isF, text) {
    const k = lines.findIndex(l => isF(l) && !NOTFIND.test(l.replace(/^\s*invent[áa]rio[^:]*:\s*/i, '')));
    if (k >= 0) { const pre = (lines[k].match(/^\s*invent[áa]rio[^:]*:\s*(?=\S)/i) || [''])[0]; lines[k] = pre + text; return k; }
    const iv = lines.findIndex(l => /invent[áa]rio|achados?:/i.test(l));
    const at = iv >= 0 ? iv + 1 : Math.min(4, lines.length);
    lines.splice(at, 0, text); return at;
  }
  const dropIf = (lines, keep, rx) => lines.filter((l, i) => i === keep || !rx.test(l));
  const addOnce = (lines, rx, o) => rx.test(lines.join('\n')) ? lines : insertOpt(lines, o);
  const APF = l => /ap[eê]ndice/i.test(l) && /(identificad|edemac|hiperem|inflam|aument|necros|perfur|fase|grau|compat|supurad|calibre|bloqueio|apendicite)/i.test(l);
  const DESCR = /purulent|\bpus\b|abscesso|bloqueio|necros|perfura|fezes em cavidade|l[ií]quido (livre|claro)|desserosid|fibrina (em|aderida)|presen[cç]a de fibrina/i;
  const ACTION = /^\s*(drenagem|lavagem|colet|passagem|coloca|posiciona|aspira|realizad|isolamento|ligadura|sec[cç]|dissec|retirad|envi|identifica[dç][ao]s? (áreas|[aá]rea) de perfura[cç][aã]o em ceco)/i;
  const LOWRM = /drenagem de abscesso|lavagem|cultura|colet(ad|a)[oa]? (de )?l[ií]quido|\bdrenos?\b|penrose|sulctor|suctor/i;
  const GF = {
    1: 'Identificado apêndice cecal edemaciado e hiperemiado, sem fibrina, necrose ou perfuração, compatível com apendicite aguda fase 1 (edematosa)',
    2: 'Identificado apêndice cecal edemaciado e hiperemiado, com exsudato fibrinoso em sua superfície, sem necrose ou perfuração, compatível com apendicite aguda fase 2 (fibrinosa)',
    3: 'Identificado apêndice cecal com áreas de necrose, sem perfuração, com fibrina e pequena quantidade de líquido seropurulento em fossa ilíaca direita, aspirado, compatível com apendicite aguda fase 3 (necrótica)',
    4: 'Identificado apêndice cecal necrosado e perfurado, bloqueado por epíplon e alças, com secreção purulenta em fossa ilíaca direita e pelve, aspirada, compatível com apendicite aguda fase 4 (perfurada)'
  };
  const GVc = ' da classificação laparoscópica';
  const GV = {
    1: 'Identificado apêndice cecal com hiperemia e edema, sem exsudato fibrinoso, necrose ou coleções, compatível com apendicite aguda grau 1' + GVc,
    2: 'Identificado apêndice cecal hiperemiado e edemaciado, com exsudato fibrinoso, sem necrose ou coleções, compatível com apendicite aguda grau 2' + GVc,
    3: 'Identificado apêndice cecal com necrose segmentar e base apendicular viável, sem coleções, compatível com apendicite aguda grau 3' + GVc,
    '4A': 'Identificado apêndice cecal com abscesso periapendicular bloqueado por epíplon e alças, desfeito e aspirado, compatível com apendicite aguda grau 4A' + GVc,
    '4B': 'Identificado apêndice cecal com peritonite regional, com secreção purulenta em fossa ilíaca direita e pelve, aspirada, compatível com apendicite aguda grau 4B' + GVc,
    '4C': 'Identificado apêndice cecal com necrose da base apendicular, compatível com apendicite aguda grau 4C' + GVc,
    5: 'Identificado apêndice cecal perfurado, com peritonite purulenta difusa em ___ quadrantes, aspirada, compatível com apendicite aguda grau 5' + GVc
  };
  function apendTf(f, v, vl) {
    const hi = vl ? ['4A', '4B', '5'].indexOf(v) >= 0 : v === '4';
    const low = vl ? ['1', '2'].indexOf(v) >= 0 : ['1', '2'].indexOf(v) >= 0;
    let ls = f.s.split('\n').filter(x => tidy(x));
    const k = setFinding(ls, APF, (vl ? GV : GF)[v]);
    ls = ls.map((l, i) => i !== k && DESCR.test(l) && !ACTION.test(l) && /^\s*invent[áa]rio/i.test(l) ? 'Inventário da cavidade' : l).filter((l, i) => i === k || !(DESCR.test(l) && !ACTION.test(l)));
    const k2 = ls.indexOf((vl ? GV : GF)[v]) >= 0 ? ls.indexOf((vl ? GV : GF)[v]) : ls.findIndex(l => l.indexOf((vl ? GV : GF)[v]) >= 0);
    if (low) ls = dropIf(ls, k2, LOWRM);
    if (hi) { ls = addOnce(ls, /lavagem/i, O.lavagem); if (!/cultura/i.test(ls.join(' '))) { const j = ls.findIndex(l => l.indexOf((vl ? GV : GF)[v]) >= 0); ls.splice(j + 1, 0, O.cultura.x); } }
    if (vl && v === '4C' && !/base apendicular necrosada/i.test(ls.join(' '))) { const j = ls.findIndex(l => l.indexOf(GV['4C']) >= 0); ls.splice(j + 1, 0, 'Tratamento da base apendicular necrosada com ___'); }
    f.s = ls.join('\n'); f.tipo = hi ? 'Infectada' : 'Contaminada';
  }
  const VF = l => /ves[ií]cula/i.test(l) && /(parede|leito hep|ader[eê]n|distendid|ingurgit|escleroat|necros|inflamat|espessad|finas|tamanho)/i.test(l);
  const QV = {
    elet: ['Identificada vesícula biliar em leito hepático, normodistendida, com paredes finas e aderências frouxas, sem sinais inflamatórios agudos', 'Colelitíase', 'Limpa-contaminada'],
    aguda: ['Identificada vesícula biliar distendida, com paredes espessadas e edemaciadas e aderências de epíplon, compatível com colecistite aguda', 'Colecistite aguda', 'Contaminada'],
    gang: ['Identificada vesícula biliar ingurgitada, bloqueada por epíplon, com paredes espessadas e áreas de necrose, compatível com colecistite aguda gangrenosa', 'Colecistite aguda gangrenosa', 'Infectada'],
    dif: ['Identificada vesícula biliar escleroatrófica, com paredes espessadas e múltiplas aderências firmes ao duodeno e ao leito hepático, com dissecção trabalhosa do trígono hepatocístico', 'Colelitíase (vesícula escleroatrófica)', 'Limpa-contaminada']
  };
  function cvlTf(f, v) {
    let ls = f.s.split('\n').filter(x => tidy(x));
    const k = setFinding(ls, VF, QV[v][0]);
    if (v === 'elet' || v === 'dif') ls = ls.filter((l, i) => i === k || !(/necros|perfura|purulent|isquemiad|bloqueio/i.test(l) && !ACTION.test(l)));
    f.s = ls.join('\n'); f.dx = QV[v][1]; f.tipo = QV[v][2];
  }
  const DRX = /\bdrenos?\b|penrose|sulctor|suctor/i;
  function drTf(f, v, cat) {
    let ls = f.s.split('\n').filter(x => tidy(x));
    if (v === 'sem') ls = ls.filter(l => !DRX.test(l));
    else if (!DRX.test(ls.join(' '))) ls = insertOpt(ls, cat === 'vb' ? (OPTS.vb.find(o => o.ax === 'dr')) : O.drSuc);
    f.s = ls.join('\n');
  }
  const SEXO = [['H', 'Homem'], ['M', 'Mulher']];
  const FAM = {
    apend: { t: 'Apendicectomia', d: { fase: '1' }, ax: [{ k: 'fase', l: 'Fase', o: [['1', 'Fase 1', 'edematosa'], ['2', 'Fase 2', 'fibrinosa'], ['3', 'Fase 3', 'necrótica'], ['4', 'Fase 4', 'perfurada']], tf: (f, v) => apendTf(f, v, false) }] },
    apendvl: { t: 'Apendicectomia videolaparoscópica', d: { grau: '1' }, ax: [{ k: 'grau', l: 'Grau (classificação laparoscópica)', o: [['1', '1', 'hiperemia e edema'], ['2', '2', 'exsudato fibrinoso'], ['3', '3', 'necrose segmentar'], ['4A', '4A', 'abscesso'], ['4B', '4B', 'peritonite regional'], ['4C', '4C', 'necrose da base'], ['5', '5', 'peritonite difusa']], tf: (f, v) => apendTf(f, v, true) }] },
    cvl: { t: 'Colecistectomia videolaparoscópica', d: { q: 'elet', dr: 'sem' }, ax: [
      { k: 'q', l: 'Achado', o: [['elet', 'Sem inflamação', 'colelitíase, paredes finas'], ['aguda', 'Colecistite aguda', 'paredes espessadas e edemaciadas'], ['gang', 'Gangrenosa', 'necrose de parede'], ['dif', 'Escleroatrófica', 'aderências firmes, dissecção difícil']], tf: cvlTf },
      { k: 'dr', l: 'Dreno', o: [['sem', 'Sem dreno'], ['com', 'Com dreno']], tf: (f, v) => drTf(f, v, 'vb') }] },
    hing: { t: 'Herniorrafia inguinal', d: { ld: 'D', sx: 'H', rec: 'pri', dr: 'sem' }, ax: [
      { k: 'ld', l: 'Lado', o: [['D', 'Direita'], ['E', 'Esquerda'], ['B', 'Bilateral']], can: (a, b) => a !== 'B' && b !== 'B', tf: (f, v, mv) => { if (mv && mv !== v) ['dx', 'cp', 'cr', 's'].forEach(k => { f[k] = swapSide(f[k]); }); else if (!mv) { const w = v === 'D' ? 'direita' : 'esquerda'; f.s = f.s.replace(/___\s*\(\s*(direita|esquerda|indireta)[^)]*\)/gi, m => /^___\s*\(\s*(direita|esquerda)\s*\//i.test(m) ? w : m).replace(/(regi[aã]o inguinal|inguinotomia) ___/gi, '$1 ' + w); } } },
      { k: 'sx', l: 'Paciente', o: SEXO },
      { k: 'rec', l: 'Hérnia', o: [['pri', 'Primária'], ['rec', 'Recidivada']] },
      { k: 'dr', l: 'Dreno', o: [['sem', 'Sem dreno'], ['com', 'Com dreno']], tf: (f, v) => drTf(f, v, 'hing') }] },
    humb: { t: 'Herniorrafia umbilical', d: { tela: 'sem' }, ax: [{ k: 'tela', l: 'Tela', o: [['sem', 'Sem tela'], ['com', 'Com tela']] }] },
    hinc: { t: 'Herniorrafia incisional', d: { tela: 'com' }, ax: [{ k: 'tela', l: 'Tela', o: [['sem', 'Sem tela'], ['com', 'Com tela']] }] },
    hepi: { t: 'Herniorrafia epigástrica', d: {}, ax: [] },
    perit: { t: 'Peritoneostomia', d: {}, ax: [] }
  };
  const axOk = (a, mv, sv) => mv === sv || (a.can ? a.can(mv, sv) && !!a.tf : !!a.tf);
  function cands(fm, sel) {
    const F = FAM[fm], ms = window.DRB_DESC.m.filter(m => m.fm === fm);
    const ex = ms.filter(m => F.ax.every(a => ((m.x || {})[a.k] || '') === sel[a.k]));
    const others = () => ms.filter(m => ex.indexOf(m) < 0 && F.ax.every(a => axOk(a, (m.x || {})[a.k] || '', sel[a.k])));
    const dd = m => F.ax.reduce((t, a) => { const ix = v => a.o.findIndex(o => o[0] === v); const mv = (m.x || {})[a.k] || ''; return t + (mv ? Math.abs(ix(mv) - ix(sel[a.k])) : 1.5); }, 0);
    if (ex.length) return { list: ex, adapted: false, more: others().sort((x, y) => dd(x) - dd(y)) };
    const sc = ms.map(m => ({ m, n: F.ax.filter(a => ((m.x || {})[a.k] || '') !== sel[a.k]).length, ok: F.ax.every(a => axOk(a, (m.x || {})[a.k] || '', sel[a.k])) })).filter(z => z.ok);
    if (!sc.length) return { list: [], adapted: true };
    const min = Math.min(...sc.map(z => z.n));
    const dist = m => F.ax.reduce((t, a) => { const ix = v => a.o.findIndex(o => o[0] === v); const mv = (m.x || {})[a.k] || ''; return t + (mv ? Math.abs(ix(mv) - ix(sel[a.k])) : 1.5); }, 0);
    return { list: sc.filter(z => z.n === min).map(z => z.m).sort((x, y) => dist(x) - dist(y)), adapted: true };
  }
  function insertOpt(lines, o) {
    const n = lines.length; let i = -1;
    const firstClose = () => { for (let k = Math.floor(n / 2); k < n; k++) if (CLOSE.test(lines[k])) return k; return n; };
    if (o.at) { i = lines.findIndex((l, k) => k > 1 && o.at.test(l)); if (i < 0) i = firstClose(); }
    else if (o.pos === 'top') i = Math.min(2, n);
    else if (o.pos === 'end') i = n;
    else if (o.pos === 'cur') { for (let k = n - 1; k >= 0; k--) if (/curativo/i.test(lines[k])) { i = k; break; } if (i < 0) i = n; }
    else if (o.pos === 'syn') { for (let k = Math.floor(n / 2); k < n; k++) if (/s[ií]ntese|fechamento d|sutura d[ae] (pele|aponeurose)|desfeito pneumo/i.test(lines[k])) { i = k; break; } if (i < 0) i = firstClose(); }
    else if (o.pos === 'ach') { const k = lines.findIndex(l => /invent[áa]rio|achados?:/i.test(l)); i = k >= 0 ? Math.min(n, k + 2) : firstClose(); }
    else i = firstClose();
    lines.splice(i, 0, o.x); return lines;
  }
  // troca direita <-> esquerda preservando maiúsculas
  function swapSide(t) {
    return String(t || '').replace(/\b(direit|esquerd)([ao])\b/gi, (all, r, e) => {
      const to = r.toLowerCase() === 'direit' ? 'esquerd' : 'direit';
      const out = r === r.toUpperCase() ? to.toUpperCase() : r[0] === r[0].toUpperCase() ? to[0].toUpperCase() + to.slice(1) : to;
      return out + e;
    });
  }
  const DEST = [['RECO', 'a RECO'], ['RPA', 'a RPA'], ['UTI', 'a UTI'], ['Enfermaria', 'a enfermaria']];

  const UP = t => String(t || '').toLocaleUpperCase('pt-BR');
  const same = (a, b) => UP(tidy(a)) === UP(tidy(b));
  const tidy = s => String(s || '').replace(/\s+/g, ' ').trim();

  function load(cb) {
    if (window.DRB_DESC) return cb();
    const s = document.createElement('script'); s.src = 'descricoes.js'; s.onload = () => cb(); s.onerror = () => cb(new Error('falhou'));
    document.head.append(s);
  }

  const tool = {
    id: 'descricoes', g: 'desc', title: 'Descrições cirúrgicas', desc: 'Modelos de descrição por procedimento e por cirurgião, com campos do relatório de cirurgia para revisar e copiar',
    kw: 'descrição cirúrgica relatório de cirurgia modelo apendicectomia colecistectomia cvl videolaparoscopia hérnia inguinal umbilical incisional laparotomia lise de bridas enterectomia hartmann colectomia retossigmoidectomia hemorroidectomia cisto pilonidal abscesso debridamento lipoma tireoidectomia traqueostomia drenagem de tórax toracocentese paracentese cateter venoso central portocath peritoneostomia ressutura',
    disc: 'Modelos de apoio vindos de descrições reais do serviço. Revise cada passo, lateralidade, fios, achados e intercorrências: a descrição precisa refletir exatamente o que foi feito.',
    render: (h, u2, sub) => {
      const root = h('div', { class: 'rx desc' });
      const side = h('section', { class: 'rx-l' }), doc = h('section', { class: 'rx-r', id: 'descdoc' });
      root.append(side, doc);
      side.append(h('p', { class: 'hint' }, 'Carregando os modelos…'));
      load(err => {
        side.innerHTML = '';
        if (err || !window.DRB_DESC) { side.append(h('div', { class: 'alert crit' }, u.icon('alert'), h('span', null, 'Não foi possível carregar os modelos. Verifique a conexão e recarregue a página.'))); return; }
        build(h, root, side, doc, sub);
      });
      return root;
    }
  };

  function build(h, root, side, doc, sub) {
    const DATA = window.DRB_DESC, CATS = DATA.cats;
    const all = () => loadMine().map(m => Object.assign({ mine: true, c: 'my' }, m)).concat(DATA.m);
    const st = { q: '', cat: '', sel: null, f: null };
    if (sub && sub.indexOf('c:') === 0) st.cat = sub.slice(2);
    else if (sub && sub.indexOf('f:') === 0) st.fam = sub.slice(2);
    else if (sub) st.sel = sub;
    const search = h('input', { type: 'search', class: 'rx-q', placeholder: 'Filtrar: colecistectomia, hérnia, Aryella…', 'aria-label': 'Filtrar descrições', oninput: e => { st.q = e.target.value; list(); } });
    const catBox = h('select', { class: 'rx-catsel', 'aria-label': 'Área', onchange: e => { st.cat = e.target.value; list(); openFirst(); } });
    const ul = h('ul', { class: 'rx-list' });
    const count = h('p', { class: 'hint desc-n' });
    side.append(h('label', { class: 'gs rx-search' }, u.icon('search'), search), catBox, count, ul);
    const setUrl = () => { try { history.replaceState(null, '', '#/descricoes' + (st.sel ? '/' + st.sel : st.cat ? '/c:' + st.cat : '')); } catch (e) { } };
    st.ax = null;
    const catName = id => id === 'my' ? 'Meus modelos' : (CATS.find(c => c.id === id) || {}).t || '';

    function chips() {
      catBox.innerHTML = '';
      const cs = [['', 'Todas as áreas']].concat(loadMine().length ? [['my', 'Meus modelos']] : [], CATS.map(c => [c.id, c.t]));
      cs.forEach(([v, l]) => { const o = h('option', { value: v }, l); if (st.cat === v) o.selected = true; catBox.append(o); });
    }
    const gTitle = m => m.fm && FAM[m.fm] ? FAM[m.fm].t : m.t;
    function groups(cat, q) {
      const parts = q ? u.norm(q.trim()).split(/\s+/).filter(Boolean) : [];
      const ms = all().filter(m => (!cat || m.c === cat) && (!parts.length || parts.every(p => u.norm(m.t + ' ' + m.a + ' ' + m.cp + ' ' + catName(m.c) + ali(m) + (m.fm && FAM[m.fm] ? ' ' + FAM[m.fm].t : '')).includes(p))));
      const gs = [], ix = {};
      ms.forEach(m => { const k = m.mine ? 'my|' + m.id : m.fm ? 'f|' + m.fm : m.c + '|' + m.t; if (!ix[k]) { ix[k] = { k, m, v: [] }; gs.push(ix[k]); } ix[k].v.push(m); });
      return { gs, ms };
    }
    function openGroup(g) { if (g.m.fm && FAM[g.m.fm]) openFam(g.m.fm); else open(g.m.id); }
    function openFirst() { const g = groups(st.cat, '').gs[0]; if (g) openGroup(g); else { st.sel = null; render(); setUrl(); } }
    function list() {
      ul.innerHTML = '';
      const { gs, ms } = groups(st.cat, st.q);
      count.textContent = gs.length + (gs.length === 1 ? ' procedimento' : ' procedimentos') + ' · ' + ms.length + (ms.length === 1 ? ' modelo' : ' modelos');
      if (!ms.length) { ul.append(h('li', { class: 'rx-empty' }, 'Nenhum modelo encontrado. Tente outro termo ou limpe os filtros.')); return; }
      let last = null;
      gs.forEach(g => {
        const m = g.m;
        if (!st.cat && m.c !== last) { last = m.c; ul.append(h('li', { class: 'rx-h' }, catName(m.c))); }
        const on = g.v.some(x => x.id === st.sel);
        ul.append(h('li', { class: 'rx-item' + (on ? ' on' : '') },
          h('button', { type: 'button', class: 'rx-open', onclick: () => { if (on) open(st.sel, st.ax); else openGroup(g); if (window.innerWidth < 1000) window.scrollTo(0, 0); else doc.scrollIntoView({ block: 'nearest' }); } },
            h('span', { class: 'rx-t' }, m.fm && FAM[m.fm] ? FAM[m.fm].t : m.t), g.v.length > 1 ? h('span', { class: 'desc-a desc-k' }, g.v.length + ' modelos') : m.a && h('span', { class: 'desc-a' }, m.a))));
      });
    }
    function open(id, ax) { st.sel = id; st.f = null; st.ax = ax || null; st.more = false; try { localStorage.setItem('drb_desc_last', id); } catch (e) { } list(); render(); setUrl(); const on = ul.querySelector('.rx-item.on'); if (on && window.innerWidth >= 1000) on.scrollIntoView({ block: 'nearest' }); }
    function openFam(fm) { const sel = Object.assign({}, FAM[fm].d); const c = cands(fm, sel); const m0 = c.list[0] || DATA.m.find(x => x.fm === fm); open(m0.id, sel); }
    const mark = () => root.classList.toggle('has-sel', !!st.sel);

    function fresh(m) {
      const up = (m.s || []).length > 2 && (m.s || []).join(' ').replace(/[^A-Za-zÀ-ú]/g, '').replace(/[^a-zà-ú]/g, '').length < 0.05 * (m.s || []).join('').length;
      return { up, an: m.an || '', dx: m.dx || '', cp: m.cp || m.t, cr: m.cr || m.cp || m.t, tipo: m.tipo || tipoDe(m), rel: m.rel || 'Procedimento sem intercorrências.', s: (m.s || []).join('\n'), num: true, ld: m.ld || '', on: {}, base: (m.s || []).join(' ') };
    }
    function render() {
      doc.innerHTML = '';
      const m = st.sel && all().find(x => x.id === st.sel);
      if (!m) st.sel = null;
      mark();
      if (!m) {
        doc.append(h('div', { class: 'rx-blank' }, h('h2', null, 'Escolha um procedimento'),
          h('p', null, 'São ' + DATA.m.length + ' modelos do serviço agrupados por procedimento. Abra um procedimento, escolha a fase, o achado, o lado ou o dreno, depois o modelo do cirurgião, marque o que foi feito e copie no formato do relatório de cirurgia. Você pode guardar a sua versão em Meus modelos, que fica salva neste aparelho.')));
        return;
      }
      const F = m.fm && FAM[m.fm];
      if (F && !st.ax) { st.ax = Object.assign({}, F.d); F.ax.forEach(a => { const v = (m.x || {})[a.k]; if (v) st.ax[a.k] = v; }); }
      if (!st.f) {
        st.f = fresh(m); st.f.ad = [];
        if (F) F.ax.forEach(a => { const mv = (m.x || {})[a.k] || ''; if (mv !== st.ax[a.k] && a.tf) { a.tf(st.f, st.ax[a.k], mv); if (!(a.k === 'ld' && !mv)) st.f.ad.push(a.l.split(' (')[0].toLowerCase()); } });
        if (st.f.up) st.f.s = UP(st.f.s);
        st.f.gen = st.f.s;
      }
      const f = st.f;
      const back = h('button', { type: 'button', class: 'rx-btn desc-back', onclick: () => { st.sel = null; st.f = null; list(); render(); setUrl(); window.scrollTo(0, 0); } }, '‹ Lista');
      const all2 = groups('', '').gs, curK = (all2.find(g => g.v.some(x => x.id === m.id)) || {}).k;
      const psel = h('select', { class: 'desc-psel', 'aria-label': 'Procedimento', onchange: e => { const g = all2.find(x => x.k === e.target.value); if (g) { if (st.f && st.f.s !== st.f.gen && !confirm('Trocar de procedimento descarta as suas edições. Continuar?')) { e.target.value = curK; return; } openGroup(g); } } });
      let lastC = null, og = null;
      all2.forEach(g => { if (g.m.c !== lastC) { lastC = g.m.c; og = h('optgroup', { label: catName(g.m.c) }); psel.append(og); } const o = h('option', { value: g.k }, gTitle(g.m)); if (g.k === curK) o.selected = true; og.append(o); });
      const pickRow = h('div', { class: 'desc-pick' }, back, h('label', { class: 'desc-pl' }, h('span', { class: 'lbl' }, 'Procedimento'), psel));
      const head = h('div', { class: 'desc-head' }, pickRow, h('h2', null, F ? F.t : m.t), h('span', { class: 'desc-meta' }, [catName(m.c), m.a && 'Modelo: ' + m.a + (m.nt ? ' (' + m.nt + ')' : '')].filter(Boolean).join(' · ')));
      // seletores da ficha
      let famBox = '';
      if (F) {
        const pick = (k, v) => {
          if (st.f && st.f.s !== st.f.gen && !confirm('Trocar a opção refaz o texto e descarta as suas edições nos passos. Continuar?')) return;
          const sel = Object.assign({}, st.ax, { [k]: v }); const c = cands(m.fm, sel); if (!c.list.length) return;
          const nx = c.list.find(x => x.a === m.a) || c.list[0];
          st.ax = sel; st.sel = nx.id; st.f = null; st.more = false; list(); render(); setUrl();
        };
        const axes = F.ax.map(a => {
          const cur = a.o.find(o => o[0] === st.ax[a.k]) || a.o[0];
          return h('div', { class: 'fld full desc-ax' }, h('span', { class: 'lbl' }, a.l),
            h('div', { class: 'seg' + (a.o.length > 4 ? ' seg-n' : ''), role: 'group', 'aria-label': a.l }, a.o.map(([v, l]) => {
              const okv = cands(m.fm, Object.assign({}, st.ax, { [a.k]: v })).list.length > 0;
              const on = st.ax[a.k] === v;
              return h('button', { type: 'button', class: on ? 'on' : '', disabled: !okv, title: okv ? '' : 'Sem modelo para esta combinação', 'aria-pressed': on ? 'true' : 'false', onclick: () => { if (!on) pick(a.k, v); } }, l);
            })), cur[2] ? h('span', { class: 'hint' }, cur[1] + ': ' + cur[2]) : '');
        });
        const c = cands(m.fm, st.ax);
        const seen = {}; const vlab = x => { const a = x.a || 'Modelo do serviço'; seen[a] = (seen[a] || 0) + 1; return a + (seen[a] > 1 ? ' ' + seen[a] : ''); };
        const moreU = []; (c.more || []).forEach(x => { if (!moreU.some(y => y.a === x.a)) moreU.push(x); });
        const showMore = st.more || c.list.length < 2 || moreU.some(x => x.id === m.id);
        const pool = c.list.concat(showMore ? moreU : []);
        const chipsM = pool.length > 1 || moreU.length ? h('div', { class: 'fld full' }, h('span', { class: 'lbl' }, 'Modelo do cirurgião'),
          h('div', { class: 'desc-sibl' }, pool.map(x => h('button', { type: 'button', class: 'rx-cat' + (x.id === m.id ? ' on' : '') + (c.list.indexOf(x) < 0 ? ' adp' : ''), title: c.list.indexOf(x) < 0 ? 'Modelo de outra ' + F.ax.map(a => a.l.split(' (')[0].toLowerCase()).join('/') + ', adaptado' : '', 'aria-pressed': x.id === m.id ? 'true' : 'false', onclick: () => { if (x.id === m.id) return; if (st.f.s !== st.f.gen && !confirm('Trocar o modelo descarta as suas edições nos passos. Continuar?')) return; open(x.id, st.ax); } }, vlab(x), x.nt ? h('small', null, ' · ' + x.nt) : '', c.list.indexOf(x) < 0 ? h('small', null, ' · adaptado') : '')),
            !showMore && moreU.length ? h('button', { type: 'button', class: 'rx-cat adp', onclick: () => { st.more = true; render(); } }, '+ ' + moreU.length + ' cirurgiões com o texto adaptado') : '')) : '';
        const note = f.ad.length ? h('div', { class: 'alert warn' }, u.icon('alert'), h('span', null, 'O serviço não tem um modelo exatamente assim. O texto foi montado a partir do modelo de ' + (m.a || 'um cirurgião do serviço') + ', ajustando ' + f.ad.join(' e ') + '. Confira os achados e os passos.')) : '';
        famBox = h('div', { class: 'panel desc-fam' }, h('div', { class: 'fgrid' }, ...axes, chipsM), note);
      }
      const inp = (k, label, ph) => h('label', { class: 'fld full' }, h('span', { class: 'lbl' }, label), h('span', { class: 'inwrap' }, h('input', { value: f[k], 'data-k': k, placeholder: ph || '', autocomplete: 'off', oninput: e => { f[k] = e.target.value; chk(); } })));
      const tipo = h('div', { class: 'fld full' }, h('span', { class: 'lbl' }, 'Cirurgia tipo (potencial de contaminação)'),
        h('div', { class: 'seg desc-tipo', role: 'group', 'aria-label': 'Potencial de contaminação' }, TIPOS.map(([v, l]) => h('button', { type: 'button', class: f.tipo === v ? 'on' : '', 'aria-pressed': f.tipo === v ? 'true' : 'false', onclick: e => { f.tipo = v; e.currentTarget.parentNode.querySelectorAll('button').forEach(b => { const on = b === e.currentTarget; b.className = on ? 'on' : ''; b.setAttribute('aria-pressed', on); }); } }, l))));
      const ta = h('textarea', { class: 'desc-steps', 'aria-label': 'Passos da descrição cirúrgica, um por linha', spellcheck: 'true', oninput: e => { f.s = e.target.value; grow(); chk(); } });
      ta.value = f.s;
      const grow = () => { ta.style.height = 'auto'; ta.style.height = Math.min(2000, ta.scrollHeight + 4) + 'px'; };
      // itens para marcar
      const ops = optsFor(m.bc || m.c, f.base, m.fm);
      const optBox = ops.length && h('div', { class: 'desc-opts' }, h('span', { class: 'lbl' }, 'Marque o que foi feito ou encontrado para incluir na descrição'),
        h('div', { class: 'desc-optl' }, ops.map(o => { const c = h('input', { type: 'checkbox', onchange: e => {
          let ls = f.s.split('\n');
          const ox = f.up ? UP(o.x) : o.x;
          if (e.target.checked) { ls = insertOpt(ls.filter(x => tidy(x)), Object.assign({}, o, { x: ox })); f.on[o.id] = 1; } else { ls = ls.filter(x => !same(x, o.x)); delete f.on[o.id]; }
          f.s = ls.join('\n'); ta.value = f.s; grow(); chk();
          if (e.target.checked) { const p = f.s.indexOf(ox); try { ta.setSelectionRange(p, p + ox.length); } catch (x) { } }
        } }); c.checked = f.s.split('\n').some(x => same(x, o.x)); return h('label', { class: 'desc-opt', title: o.x }, c, h('span', null, o.l)); })));
      const destBox = h('div', { class: 'desc-dest' }, h('span', { class: 'hint' }, 'Destino:'), DEST.map(([l, x]) => h('button', { type: 'button', class: 'rx-cat', onclick: () => { f.rel = 'Procedimento sem intercorrências, paciente encaminhado para ' + x + ' aos cuidados da equipe anestésica.'; relF.querySelector('textarea').value = f.rel; chk(); } }, l)));
      const numB = h('label', { class: 'desc-chk' }, h('input', { type: 'checkbox', onchange: e => { f.num = e.target.checked; } }), 'Numerar os passos ao copiar');
      numB.firstChild.checked = f.num;
      const warn = h('div');
      const relF = h('label', { class: 'fld full' }, h('span', { class: 'lbl' }, 'Relatório da cirurgia (intercorrências e destino)'), h('textarea', { class: 'desc-rel', rows: 3, oninput: e => { f.rel = e.target.value; chk(); } }, f.rel));
      const form = h('div', { class: 'panel desc-form' },
        h('h3', { class: 'sec', style: 'border:0;padding:0;margin:0 0 4px' }, 'Descrição cirúrgica'), optBox || '', h('p', { class: 'hint' }, 'Um passo por linha. Os campos com ___ precisam ser completados (lado, número do dreno, volume…).'), ta, numB, warn);
      const dataP = h('div', { class: 'panel desc-form' }, h('h3', { class: 'sec', style: 'border:0;padding:0;margin:0 0 4px' }, 'Dados do relatório'), h('div', { class: 'fgrid' }, inp('an', 'Tipo de anestesia', 'Geral, raquianestesia, local…'), inp('dx', 'Diagnóstico pré-operatório', 'Ex.: apendicite aguda'), inp('cp', 'Cirurgia proposta'), inp('cr', 'Cirurgia realizada'), tipo, relF, destBox));
      function chk() {
        const n = ((f.s + ' ' + f.cp + ' ' + f.cr + ' ' + f.rel).match(/_{3,}/g) || []).length;
        warn.innerHTML = '';
        if (n) warn.append(h('div', { class: 'alert warn' }, u.icon('alert'), h('span', null, n === 1 ? 'Falta completar 1 campo marcado com ___.' : 'Faltam completar ' + n + ' campos marcados com ___.')));
      }
      const steps = () => f.s.split('\n').map(tidy).filter(Boolean);
      const body = () => steps().map((x, i) => (f.num ? (i + 1) + '. ' : '') + x).join('\n');
      const full = () => [
        f.an && 'Tipo de anestesia: ' + tidy(f.an), f.dx && 'Diagnóstico pré-operatório: ' + tidy(f.dx), f.cp && 'Cirurgia proposta: ' + tidy(f.cp), f.cr && 'Cirurgia realizada: ' + tidy(f.cr),
        'Cirurgia tipo: ' + f.tipo, f.rel && 'Relatório da cirurgia: ' + tidy(f.rel)].filter(Boolean).concat(['', 'Descrição cirúrgica:', body()]).join('\n');
      const copyBtn = (label, get, cls) => {
        const b = h('button', { type: 'button', class: cls || 'copy' }, u.icon('copy'), label);
        b.onclick = () => {
          const t = get(); const done = () => { b.lastChild.textContent = 'Copiado'; setTimeout(() => { b.lastChild.textContent = label; }, 1600); };
          if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(t).then(done, () => fb(t, done)); else fb(t, done);
        };
        return b;
      };
      function fb(t, done) { const x = h('textarea', { style: 'position:fixed;opacity:0' }); x.value = t; document.body.append(x); x.select(); try { document.execCommand('copy'); done(); } catch (e) { } x.remove(); }
      const acts = h('div', { class: 'rx-actions' },
        copyBtn('Copiar relatório', full, 'copy rx-copy'),
        copyBtn('Copiar descrição', body));
      const acts2 = h('div', { class: 'rx-actions desc-more' },
        h('button', { type: 'button', class: 'rx-btn', onclick: () => { st.f = null; render(); } }, 'Restaurar o modelo'),
        h('button', { type: 'button', class: 'rx-btn', onclick: saveMy }, m.mine ? 'Atualizar meu modelo' : 'Salvar em Meus modelos'),
        m.mine && h('button', { type: 'button', class: 'rx-btn adm-del', onclick: () => { if (!confirm('Excluir “' + m.t + '” de Meus modelos?')) return; saveMine(loadMine().filter(x => x.id !== m.id)); st.sel = null; chips(); list(); render(); setUrl(); } }, 'Excluir meu modelo'));
      function saveMy() {
        const l = loadMine();
        const rec = { bc: m.bc || m.c, id: m.mine ? m.id : 'meu-' + Date.now().toString(36), t: m.mine ? m.t : (prompt('Nome do seu modelo:', m.t) || '').trim(), a: 'Meu modelo', base: m.mine ? m.base : m.id, an: f.an, dx: f.dx, cp: f.cp, cr: f.cr, tipo: f.tipo, rel: f.rel, s: steps() };
        if (!rec.t) return;
        const i = l.findIndex(x => x.id === rec.id); if (i >= 0) l[i] = rec; else l.unshift(rec);
        saveMine(l); st.sel = rec.id; st.f = fresh(rec); chips(); list(); render(); setUrl();
      }
      doc.append(head, famBox, form, dataP, acts, acts2);
      requestAnimationFrame(grow); chk();
    }
    chips(); list();
    if (!st.sel && st.fam && FAM[st.fam]) openFam(st.fam);
    else if (!st.sel) {
      let last = null; try { last = localStorage.getItem('drb_desc_last'); } catch (e) { }
      const lm = !st.cat && last && all().find(x => x.id === last);
      if (lm) open(lm.id); else openFirst();
    } else render();
  }

  const links = [
    ['apend', 'Apendicectomia', 'aberta fases 1 a 4 e videolaparoscópica'], ['vb', 'Colecistectomia', 'videolaparoscópica com e sem dreno, convertida, convencional, exploração de via biliar'],
    ['hing', 'Hérnia inguinal', 'uni e bilateral, com e sem dreno, recidivada'], ['parede', 'Hérnias da parede e ressutura', 'umbilical, epigástrica, incisional'],
    ['abd', 'Laparotomia e intestino', 'lise de bridas, enterectomia, peritoneostomia'], ['colon', 'Cólon, reto e estomias', 'colectomias, Hartmann, retossigmoidectomia'],
    ['procto', 'Proctologia', 'hemorroidectomia, abscesso perianal, cisto pilonidal'], ['pele', 'Pele, partes moles e abscessos', 'debridamento, lipoma, drenagem de abscesso'],
    ['cp', 'Cabeça e pescoço', 'tireoidectomia, submandibular, esvaziamento'], ['torac', 'Torácica e via aérea', 'traqueostomia, drenagem, lobectomia'],
    ['onco', 'Oncologia e ginecologia', 'histerectomia, Whipple, exenteração'], ['proc', 'Procedimentos à beira do leito', 'cateter central, PAI, portocath, paracentese, gastrostomia'],
    ['uro', 'Urologia', 'duplo J, ureterolitotripsia, vasectomia, torção testicular, prostatectomia'], ['vasc', 'Vascular e amputações', 'amputações, pé diabético, safenectomia, pseudoaneurisma'],
    ['ped', 'Cirurgia pediátrica', 'piloromiotomia, cateter 4 Fr, drenagem torácica'], ['plast', 'Plástica e face', 'osteossíntese de órbita'], ['tx', 'Transplante e captação', 'captação de fígado']
  ].map(([c, t, d]) => ({ id: 'desc-' + c, g: 'desc', title: t, desc: 'Descrições: ' + d, kw: 'descrição cirúrgica ' + t + ' ' + d, href: '#/descricoes/' + ({ apend: 'f:apend', vb: 'f:cvl', hing: 'f:hing', parede: 'f:humb' }[c] || 'c:' + c) }));
  // a busca do topo também encontra cada modelo (carrega os dados na primeira vez que a busca é usada)
  D.onSearch = (D.onSearch || []).concat(done => load(err => {
    if (err || !window.DRB_DESC) return;
    const cn = {}; window.DRB_DESC.cats.forEach(c => { cn[c.id] = c.t; });
    window.DRB_DESC.m.forEach(m => D.links.push({ id: 'dsl-' + m.id, g: 'desc', title: m.t + (m.a ? ' (' + m.a + ')' : ''), desc: 'Descrição cirúrgica: ' + (cn[m.c] || ''), kw: 'descricao cirurgica ' + (m.cp || '') + ' ' + (cn[m.c] || '') + ali(m), href: '#/descricoes/' + m.id }));
    done();
  }));
  D.add(tool, ...links);
})();
