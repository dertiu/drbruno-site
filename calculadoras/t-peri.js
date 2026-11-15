/* Perícia médica: interdição, auxílio-acidente, erro médico e dano corporal, pós-bariátrica, home care e rotina do perito.
   Cada ferramenta gera um parágrafo pronto para o laudo ("Copiar para o laudo"). */
(function () {
  'use strict';
  const D = window.DRB, u = D.u, F = D.f, fmt = u.fmt;
  const DISC = 'Ferramenta de apoio à perícia. Revise o texto e a interpretação no contexto do caso antes de usar no laudo.';
  const COPY = 'Copiar para o laudo';
  const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  const lower1 = s => s ? s.charAt(0).toLowerCase() + s.slice(1) : s;
  const soma = a => a.reduce((x, y) => x + y, 0);
  const pct = (n, d) => isFinite(n) ? fmt(n * 100, d == null ? 0 : d) + '%' : 'n/d';
  const dv = n => u.dv(n);
  function listaE(a) { a = a.filter(Boolean); return a.length <= 1 ? a.join('') : a.slice(0, -1).join(', ') + ' e ' + a[a.length - 1]; }
  const parseD = s => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
  const br = d => d ? d.toLocaleDateString('pt-BR') : '';
  const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const addD = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  function ymd(a, b) {
    let y = b.getFullYear() - a.getFullYear(), m = b.getMonth() - a.getMonth(), d = b.getDate() - a.getDate();
    if (d < 0) { m--; d += new Date(b.getFullYear(), b.getMonth(), 0).getDate(); } if (m < 0) { y--; m += 12; } return { y, m, d };
  }
  function txtYM(o) { const p = []; if (o.y) p.push(o.y + (o.y === 1 ? ' ano' : ' anos')); if (o.m) p.push(o.m + (o.m === 1 ? ' mês' : ' meses')); if (!p.length) p.push(o.d + (o.d === 1 ? ' dia' : ' dias')); return listaE(p); }
  const BL = [['', 'Selecione']];
  const P = o => Object.assign({ g: 'peri', disc: DISC, copyLbl: COPY }, o);
  const ask = text => ({ alerts: [{ lvl: 'info', text }] });

  /* Escala genérica: itens com opções [pontos, texto]; nada vem marcado por padrão. */
  function escala(def) {
    return P({
      id: def.id, title: def.title, desc: def.desc, kw: def.kw || '',
      fields: v => (def.pre ? def.pre(v) : []).concat(def.itens.map(it => (it.sec ? [F.SEC(it.sec)] : []).concat([F.SEL(it.k, it.rot, BL.concat(it.ops.map((o, i) => [String(i), (def.semPts ? '' : (o[2] != null ? o[2] : o[0]) + ' · ') + o[1]])), { hint: it.hint })])).flat()),
      calc: v => {
        const resp = def.itens.map(it => v[it.k] === '' || v[it.k] == null ? null : it.ops[+v[it.k]]);
        const faltam = resp.filter(x => !x).length, total = soma(resp.filter(Boolean).map(o => o[0]));
        if (faltam === def.itens.length) return ask('Selecione as respostas de cada item.');
        if (faltam) return { main: { label: 'Pontuação parcial', value: fmt(total, 1), unit: def.unit || '' }, alerts: [{ lvl: 'info', text: 'Faltam ' + faltam + (faltam === 1 ? ' item.' : ' itens.') }], text: false };
        const r = def.interp(total, resp, v) || {};
        return Object.assign({ main: { label: def.mainLbl || 'Pontuação', value: fmt(total, 1), unit: def.unit || '' } }, r);
      }
    });
  }

  /* =============================== INTERDIÇÃO =============================== */
  const ESCOL = [['', 'Selecione'], ['0', 'Analfabeto'], ['1', '1 a 4 anos'], ['5', '5 a 8 anos'], ['9', '9 a 11 anos'], ['12', '12 anos ou mais']];
  const BRUCKI = { 0: 20, 1: 25, 5: 26.5, 9: 28, 12: 29 }, BERT = { 0: 13, 1: 18, 5: 18, 9: 26, 12: 26 };
  const MEEM = [['ot', 'Orientação temporal', 5], ['oe', 'Orientação espacial', 5], ['reg', 'Memória imediata', 3], ['at', 'Atenção e cálculo', 5], ['ev', 'Evocação', 3], ['lin', 'Linguagem', 8], ['pc', 'Praxia construtiva', 1]];
  const meem = P({
    id: 'meem', title: 'Miniexame do Estado Mental', desc: 'Pontos por domínio, com referência por escolaridade (Brucki e Bertolucci)',
    kw: 'meem mini mental folstein cognicao demencia interdicao curatela pericia escolaridade',
    fields: [F.SEL('esc', 'Escolaridade', ESCOL)].concat(MEEM.map(d => F.N(d[0], d[1], { unit: 'de ' + d[2] }))),
    calc: v => {
      const vals = MEEM.map(d => v[d[0]]);
      const bad = MEEM.find((d, i) => isFinite(vals[i]) && (vals[i] < 0 || vals[i] > d[2]));
      if (bad) return { alerts: [{ lvl: 'crit', text: bad[1] + ': máximo de ' + bad[2] + ' pontos.' }] };
      if (!vals.every(isFinite)) return ask('Preencha os pontos de todos os domínios.');
      const tot = soma(vals), rows = [], al = [];
      let txt = 'No Miniexame do Estado Mental, obteve ' + tot + ' de 30 pontos, assim distribuídos: ' + listaE(MEEM.map((d, i) => d[1].toLowerCase() + ' ' + vals[i] + ' de ' + d[2])) + '.';
      if (v.esc !== '') {
        const ref = BRUCKI[v.esc], cort = BERT[v.esc], fx = ESCOL.find(x => x[0] === v.esc)[1].toLowerCase(), ab = tot < ref;
        rows.push(['Mediana de Brucki e cols. (2003)', dv(ref) + (ab ? ', abaixo' : ', atingida')], ['Corte de Bertolucci e cols. (1994)', cort + (tot < cort ? ', abaixo' : ', atingido')]);
        al.push({ lvl: ab ? 'warn' : 'ok', text: ab ? 'Abaixo da referência para a escolaridade.' : 'Dentro da referência para a escolaridade.' });
        txt += ' Para a escolaridade informada, ' + (v.esc === '0' ? 'analfabeto' : 'de ' + fx) + ', o resultado encontra-se ' + (ab ? 'abaixo dos valores de referência descritos para a população brasileira, achado compatível com comprometimento cognitivo, a ser interpretado em conjunto com a avaliação clínica e funcional.' : 'dentro dos valores de referência descritos para a população brasileira.');
      } else al.push({ lvl: 'info', text: 'Informe a escolaridade para comparar com a referência.' });
      return { main: { label: 'MEEM', value: String(tot), unit: 'de 30' }, rows, alerts: al, notes: ['O teste é aplicado pelo protocolo habitual; aqui entram só os pontos de cada domínio.'], text: txt };
    }
  });

  const fluencia = P({
    id: 'fluencia', title: 'Fluência verbal (animais)', desc: 'Animais em 1 minuto, com ponto de corte por escolaridade',
    kw: 'fluencia verbal semantica animais cognicao interdicao pericia',
    fields: [F.N('n', 'Animais em 1 minuto'), F.SEG('esc', 'Escolaridade', [['b', 'Menos de 8 anos'], ['a', '8 anos ou mais']], { def: 'b' })],
    calc: v => {
      if (!isFinite(v.n)) return ask('Informe o número de animais.');
      const c = v.esc === 'a' ? 13 : 9, ab = v.n < c;
      return { main: { label: 'Fluência', value: String(v.n), unit: 'animais' }, alerts: [{ lvl: ab ? 'warn' : 'ok', text: 'Ponto de corte ' + c + ': ' + (ab ? 'abaixo do esperado.' : 'dentro do esperado.') }],
        text: 'No teste de fluência verbal semântica, categoria animais, evocou ' + v.n + ' itens em um minuto, valor ' + (ab ? 'abaixo' : 'dentro') + ' do esperado para a escolaridade, considerando-se ponto de corte de ' + c + ' itens.' };
    }
  });

  const PF = [[0, 'Normal'], [1, 'Faz com dificuldade'], [2, 'Necessita de ajuda'], [3, 'Não é capaz'], [0, 'Nunca fez, mas poderia fazer agora'], [1, 'Nunca fez e teria dificuldade agora']];
  const pfeffer = escala({
    id: 'pfeffer', title: 'Questionário de Pfeffer (FAQ)', desc: 'Atividades funcionais respondidas pelo informante', unit: 'de 30',
    kw: 'pfeffer faq atividades funcionais informante demencia interdicao curatela pericia',
    itens: [['din', 'Manuseia o próprio dinheiro, paga contas'], ['comp', 'Faz compras sozinho(a)'], ['fogo', 'Esquenta água e apaga o fogo'], ['com', 'Prepara uma refeição'], ['atu', 'Mantém-se em dia com as atualidades'], ['tv', 'Acompanha e discute programa de TV, rádio ou jornal'], ['lem', 'Lembra compromissos, eventos familiares e feriados'], ['rem', 'Manuseia os próprios remédios'], ['viz', 'Passeia pela vizinhança e volta para casa'], ['so', 'Pode ficar sozinho(a) em casa com segurança']].map(x => ({ k: x[0], rot: x[1], ops: PF })),
    interp: t => ({ sub: t >= 5 ? 'Sugere comprometimento funcional' : 'Sem comprometimento significativo', alerts: [{ lvl: t >= 5 ? 'warn' : 'ok', text: 'Alterado quando igual ou superior a 5.' }],
      text: 'No Questionário de Atividades Funcionais de Pfeffer, respondido pelo informante, obteve ' + t + ' de 30 pontos, ' + (t >= 5 ? 'resultado compatível com comprometimento funcional, considerando-se alterados escores iguais ou superiores a 5.' : 'resultado sem indicativo de comprometimento funcional significativo.') })
  });

  const lawton = escala({
    id: 'lawton', title: 'Escala de Lawton e Brody (AIVD)', desc: 'Atividades instrumentais, versão brasileira de 7 itens (7 a 21)', unit: 'de 21',
    kw: 'lawton brody aivd atividades instrumentais vida diaria funcionalidade interdicao home care pericia',
    itens: [['tel', 'Usar o telefone'], ['transp', 'Usar transporte, ir a locais distantes'], ['comp', 'Fazer compras'], ['ref', 'Preparar refeições'], ['casa', 'Trabalhos domésticos'], ['med', 'Tomar os próprios remédios'], ['din', 'Cuidar das finanças']].map(x => ({ k: x[0], rot: x[1], ops: [[3, 'Sem ajuda'], [2, 'Com ajuda parcial'], [1, 'Não consegue']] })),
    interp: t => { const c = t === 21 ? 'independência' : t === 7 ? 'dependência total' : 'dependência parcial'; return { sub: cap(c), text: 'Na Escala de Lawton e Brody para atividades instrumentais de vida diária, obteve ' + t + ' de 21 pontos, compatível com ' + c + '.' }; }
  });

  const KATZ = [['banho', 'Banho'], ['vestir', 'Vestir-se'], ['banheiro', 'Uso do banheiro'], ['transf', 'Transferência'], ['cont', 'Continência'], ['alim', 'Alimentação']];
  const katz = escala({
    id: 'katz', title: 'Índice de Katz (AVD básicas)', desc: 'Seis atividades básicas, com a classificação de A a G', unit: 'de 6 independentes', mainLbl: 'Independente em',
    kw: 'katz avd atividades basicas vida diaria dependencia funcionalidade interdicao home care pericia',
    itens: KATZ.map(x => ({ k: x[0], rot: x[1], ops: [[1, 'Independente'], [0, 'Dependente']] })), semPts: true,
    interp: (t, r) => {
      const dep = KATZ.filter((x, i) => r[i][0] === 0).map(x => x[0]), tem = a => a.every(k => dep.includes(k));
      let L = 'outro';
      if (!dep.length) L = 'A'; else if (dep.length === 6) L = 'G'; else if (dep.length === 1) L = 'B';
      else if (dep.length === 2 && tem(['banho'])) L = 'C'; else if (dep.length === 3 && tem(['banho', 'vestir'])) L = 'D';
      else if (dep.length === 4 && tem(['banho', 'vestir', 'banheiro'])) L = 'E'; else if (dep.length === 5 && tem(['banho', 'vestir', 'banheiro', 'transf'])) L = 'F';
      const nomes = KATZ.filter(x => dep.includes(x[0])).map(x => x[1].toLowerCase());
      return { sub: 'Classificação ' + L, notes: ['A: independente em todas. B: todas menos uma. C: menos banho e mais uma. D: menos banho, vestir e mais uma. E: menos banho, vestir, banheiro e mais uma. F: menos banho, vestir, banheiro, transferência e mais uma. G: dependente em todas.'],
        text: 'Pelo Índice de Katz, apresenta independência em ' + t + ' das 6 atividades básicas de vida diária' + (dep.length ? ', com dependência para ' + listaE(nomes) : '') + ', classificação ' + L + '.' };
    }
  });

  const barthel = escala({
    id: 'barthel', title: 'Índice de Barthel', desc: 'Autocuidado e mobilidade, de 0 a 100', unit: 'de 100',
    kw: 'barthel funcionalidade dependencia avd autocuidado mobilidade home care interdicao pericia',
    itens: [
      { k: 'alim', rot: 'Alimentação', ops: [[10, 'Independente'], [5, 'Precisa de ajuda para cortar ou passar'], [0, 'Dependente']] },
      { k: 'banho', rot: 'Banho', ops: [[5, 'Independente'], [0, 'Dependente']] },
      { k: 'hig', rot: 'Higiene pessoal', ops: [[5, 'Independente'], [0, 'Precisa de ajuda']] },
      { k: 'vest', rot: 'Vestir-se', ops: [[10, 'Independente'], [5, 'Faz metade sozinho'], [0, 'Dependente']] },
      { k: 'int', rot: 'Evacuação', ops: [[10, 'Continente'], [5, 'Acidente ocasional'], [0, 'Incontinente']] },
      { k: 'bex', rot: 'Micção', ops: [[10, 'Continente'], [5, 'Acidente ocasional'], [0, 'Incontinente ou sondado sem autonomia']] },
      { k: 'vaso', rot: 'Uso do vaso sanitário', ops: [[10, 'Independente'], [5, 'Precisa de alguma ajuda'], [0, 'Dependente']] },
      { k: 'transf', rot: 'Transferência cama e cadeira', ops: [[15, 'Independente'], [10, 'Pequena ajuda'], [5, 'Grande ajuda, consegue sentar'], [0, 'Incapaz']] },
      { k: 'mob', rot: 'Mobilidade', ops: [[15, 'Caminha 50 m sem ajuda'], [10, 'Caminha com ajuda de uma pessoa'], [5, 'Independente em cadeira de rodas'], [0, 'Imóvel']] },
      { k: 'esc', rot: 'Escadas', ops: [[10, 'Independente'], [5, 'Precisa de ajuda'], [0, 'Incapaz']] }],
    interp: t => { const c = t === 100 ? 'independência' : t >= 91 ? 'dependência leve' : t >= 61 ? 'dependência moderada' : t >= 21 ? 'dependência grave' : 'dependência total';
      return { sub: cap(c), notes: ['Faixas: 100 independente; 91 a 99 leve; 61 a 90 moderada; 21 a 60 grave; 0 a 20 total.'], text: 'Pelo Índice de Barthel, obteve ' + t + ' de 100 pontos, compatível com ' + c + ' para as atividades de autocuidado e mobilidade.' }; }
  });

  const CDR = [
    ['mem', 'Memória', ['Sem perda ou esquecimentos leves inconsistentes', 'Esquecimento leve e consistente', 'Perda moderada, interfere nas atividades', 'Perda grave, retém só o muito aprendido', 'Perda grave, restam fragmentos']],
    ['ori', 'Orientação', ['Plenamente orientado', 'Leve dificuldade com relações temporais', 'Dificuldade moderada com o tempo, pode se perder', 'Em geral desorientado no tempo e no espaço', 'Orientado só quanto à pessoa']],
    ['jul', 'Julgamento e solução de problemas', ['Adequados', 'Leve comprometimento', 'Dificuldade moderada; julgamento social mantido', 'Grave; julgamento social comprometido', 'Incapaz de julgar ou resolver problemas']],
    ['com', 'Assuntos na comunidade', ['Independente', 'Leve comprometimento', 'Não funciona sozinho, ainda participa de algumas', 'Sem independência fora de casa, apresentável', 'Sem independência e sem condições de sair']],
    ['lar', 'Lar e passatempos', ['Mantidos', 'Levemente prejudicados', 'Prejuízo leve e definido', 'Só tarefas simples', 'Sem função significativa em casa']],
    ['cui', 'Cuidados pessoais', ['Plenamente capaz', null, 'Necessita de estímulo', 'Requer assistência', 'Requer muita ajuda, incontinência']]];
  const CV = [0, 0.5, 1, 2, 3];
  function cdrGlobal(M, S) {
    if (M === 0) return S.filter(s => s >= 0.5).length >= 2 ? 0.5 : 0;
    if (M === 0.5) return S.filter(s => s >= 1).length >= 3 ? 1 : 0.5;
    const eq = S.filter(s => s === M).length, gt = S.filter(s => s > M), lt = S.filter(s => s < M);
    if (eq >= 3) return M;
    if (gt.length >= 3 || lt.length >= 3) {
      const lado = gt.length >= 3 ? gt : lt, outro = gt.length >= 3 ? lt : gt;
      if (lado.length === 3 && outro.length === 2) return M;
      const c = {}; lado.forEach(s => { c[s] = (c[s] || 0) + 1; });
      const mx = Math.max(...Object.values(c)), r = Object.keys(c).filter(k => c[k] === mx).map(Number).sort((a, b) => Math.abs(a - M) - Math.abs(b - M))[0];
      return r === 0 ? 0.5 : r;
    }
    return M;
  }
  const cdr = P({
    id: 'cdr', title: 'Escala Clínica de Demência (CDR)', desc: 'Seis domínios, escore global pelas regras de Morris e soma dos domínios',
    kw: 'cdr clinical dementia rating demencia estadiamento interdicao curatela pericia morris',
    fields: CDR.map(d => F.SEL(d[0], d[1], BL.concat(d[2].map((t, i) => t ? [String(CV[i]), dv(CV[i]) + ' · ' + t] : null).filter(Boolean)))),
    calc: v => {
      const val = CDR.map(d => v[d[0]] === '' ? null : Number(v[d[0]]));
      const f = val.filter(x => x == null).length, sb = soma(val.filter(x => x != null));
      if (f === 6) return ask('Selecione o grau de cada domínio.');
      if (f) return { main: { label: 'Soma parcial', value: dv(sb) }, alerts: [{ lvl: 'info', text: 'Faltam ' + f + ' domínio(s).' }], text: false };
      const g = cdrGlobal(val[0], val.slice(1));
      const est = { 0: 'sem demência', 0.5: 'demência questionável', 1: 'demência leve', 2: 'demência moderada', 3: 'demência grave' }[g];
      return { main: { label: 'CDR global', value: dv(g) }, sub: cap(est), rows: [['Soma dos domínios (CDR-SB)', dv(sb)]], notes: ['A memória é o domínio principal; o escore global segue as regras de Morris (1993). Confira em casos limítrofes.'],
        text: 'Na Escala Clínica de Demência (CDR), com base na entrevista com o informante e no exame, obteve escore global ' + dv(g) + ', compatível com ' + est + ', e soma dos domínios de ' + dv(sb) + ' pontos: ' + listaE(CDR.map((d, i) => d[1].toLowerCase() + ' ' + dv(val[i]))) + '.' };
    }
  });

  const GDS = [['Sem declínio cognitivo', 'sem queixas e sem déficits ao exame'], ['Declínio muito leve', 'queixas subjetivas de esquecimento, sem déficits objetivos'], ['Declínio leve', 'déficits sutis à entrevista detalhada, com queda de desempenho em tarefas exigentes'], ['Declínio moderado', 'déficits claros, com dificuldade em finanças, viagens e tarefas complexas; corresponde a demência leve'], ['Declínio moderadamente grave', 'necessita de ajuda para escolher a roupa e não recorda dados importantes; corresponde a demência moderada'], ['Declínio grave', 'necessita de ajuda para vestir-se e para a higiene, pode haver incontinência; corresponde a demência moderadamente grave'], ['Declínio muito grave', 'perda progressiva da fala e das habilidades motoras; corresponde a demência grave']];
  const gds = P({
    id: 'gds', title: 'Escala de Deterioração Global (Reisberg)', desc: 'Estadiamento clínico de 1 a 7',
    kw: 'gds reisberg deterioracao global estadiamento demencia interdicao pericia',
    fields: [F.SEL('e', 'Estágio', BL.concat(GDS.map((g, i) => [String(i), (i + 1) + ' · ' + g[0] + ': ' + g[1]])))],
    calc: v => {
      if (v.e === '') return ask('Selecione o estágio.');
      const i = +v.e, g = GDS[i];
      return { main: { label: 'Estágio', value: String(i + 1), unit: 'de 7' }, sub: g[0], text: 'Pela Escala de Deterioração Global de Reisberg, encontra-se no estágio ' + (i + 1) + ', ' + g[0].toLowerCase() + ': ' + g[1] + '.' };
    }
  });

  const PSI = [
    ['apres', 'Apresentação', ['em adequadas condições de higiene e vestuário', 'com cuidados de higiene e vestuário prejudicados', 'com aparência descuidada']],
    ['consc', 'Consciência', ['vígil e lúcid{o}', 'sonolent{o}, despertando ao chamado', 'com rebaixamento do nível de consciência', 'confus{o}, com flutuação do nível de consciência']],
    ['atit', 'Atitude', ['colaborativ{o} com o exame', 'parcialmente colaborativ{o}', 'pouco colaborativ{o}', 'indiferente ao exame', 'desconfiad{o}', 'hostil']],
    ['ori', 'Orientação', ['orientad{o} no tempo, no espaço e quanto a si', 'desorientad{o} no tempo, orientad{o} no espaço e quanto a si', 'desorientad{o} no tempo e no espaço, orientad{o} quanto a si', 'desorientad{o} no tempo, no espaço e quanto a si', 'sem condições de avaliação da orientação']],
    ['aten', 'Atenção', ['atenção preservada', 'hipoprosexia leve', 'hipoprosexia acentuada', 'atenção dispersa, com distraibilidade']],
    ['mem', 'Memória', ['memória de fixação e de evocação preservadas', 'prejuízo da memória de fixação, com evocação preservada', 'prejuízo da memória de fixação e de evocação', 'prejuízo global da memória', 'memória sem condições de avaliação']],
    ['pens', 'Pensamento', ['pensamento de curso, forma e conteúdo sem alterações', 'pensamento lentificado, sem alterações de forma ou conteúdo', 'pensamento empobrecido, com discurso pouco elaborado', 'pensamento desagregado', 'pensamento com ideias delirantes', 'pensamento acelerado, com fuga de ideias']],
    ['senso', 'Sensopercepção', ['sem alterações de sensopercepção', 'com relato de alucinações auditivas', 'com relato de alucinações visuais', 'aparentemente alucinad{o} durante o exame']],
    ['humor', 'Humor', ['humor eutímico', 'humor deprimido', 'humor ansioso', 'humor irritável', 'humor expansivo']],
    ['afeto', 'Afeto', ['afeto modulado e congruente', 'afeto hipomodulado', 'afeto embotado', 'afeto lábil', 'afeto incongruente']],
    ['ling', 'Linguagem', ['linguagem sem alterações', 'discurso empobrecido', 'disartria', 'afasia de expressão', 'afasia de compreensão', 'afasia mista', 'mutismo']],
    ['psico', 'Psicomotricidade', ['psicomotricidade sem alterações', 'lentificação psicomotora', 'agitação psicomotora']],
    ['intel', 'Inteligência', ['inteligência clinicamente compatível com a escolaridade', 'inteligência clinicamente abaixo do esperado para a escolaridade', 'inteligência sem condições de avaliação clínica']],
    ['juizo', 'Juízo crítico', ['juízo crítico preservado', 'juízo crítico parcialmente prejudicado', 'juízo crítico prejudicado']],
    ['critica', 'Crítica do quadro', ['com crítica sobre o próprio quadro', 'com crítica parcial sobre o próprio quadro', 'sem crítica sobre o próprio quadro']]];
  const psiquico = P({
    id: 'psiquico', title: 'Exame psíquico (texto pronto)', desc: 'Escolha os achados e copie o parágrafo do exame psíquico',
    kw: 'exame psiquico estado mental psiquiatrico interdicao curatela laudo pericia texto',
    fields: [F.SEG('sx', 'Periciando(a)', [['m', 'Masculino'], ['f', 'Feminino']], { def: 'm' })].concat(PSI.map(p => F.SEL(p[0], p[1], BL.concat(p[2].map((o, i) => [String(i), cap(o.replace(/\{o\}/g, 'o'))])))), [F.TXT('obs', 'Acrescentar ao final (opcional)', { full: true })]),
    calc: v => {
      const g = s => s.replace(/\{o\}/g, v.sx === 'f' ? 'a' : 'o'), p = {}; let f = 0;
      PSI.forEach(x => { if (v[x[0]] === '') f++; else p[x[0]] = g(x[2][+v[x[0]]]); });
      if (f === PSI.length) return ask('Selecione os achados de cada item.');
      if (f) return ask('Faltam ' + f + ' item(ns). O texto aparece quando todos estiverem preenchidos.');
      let t = 'Ao exame psíquico, apresentava-se ' + p.apres + ', ' + p.consc + ', ' + p.atit + ' e ' + p.ori + '. ' + cap(p.aten) + ' e ' + p.mem + '. ' + cap(p.pens) + ', ' + p.senso + '. ' +
        cap(p.humor) + ' e ' + p.afeto + '. ' + cap(p.ling) + ' e ' + p.psico + '. ' + cap(p.intel) + '. ' + cap(p.juizo) + ', ' + p.critica + '.';
      if (v.obs && v.obs.trim()) t += ' ' + v.obs.trim();
      return { main: { label: 'Exame psíquico', value: 'Texto pronto', small: true }, text: t };
    }
  });

  /* ============================ AUXÍLIO-ACIDENTE ============================ */
  const ART = [
    ['ombro', 'Ombro', 'm', [['flex', 'Flexão', 180], ['ext', 'Extensão', 60], ['abd', 'Abdução', 180], ['ri', 'Rotação interna', 70], ['re', 'Rotação externa', 90]]],
    ['cotovelo', 'Cotovelo', 'm', [['flex', 'Flexão', 150]]],
    ['antebraco', 'Antebraço', 'm', [['pro', 'Pronação', 80], ['sup', 'Supinação', 80]]],
    ['punho', 'Punho', 'm', [['flex', 'Flexão', 80], ['ext', 'Extensão', 70], ['rad', 'Desvio radial', 20], ['uln', 'Desvio ulnar', 30]]],
    ['dedos', 'Dedos da mão', 'm', [['mcf', 'Flexão metacarpofalângica', 90], ['ifp', 'Flexão interfalângica proximal', 100], ['ifd', 'Flexão interfalângica distal', 90]]],
    ['polegar', 'Polegar', 'm', [['mcf', 'Flexão metacarpofalângica', 50], ['if', 'Flexão interfalângica', 80]]],
    ['quadril', 'Quadril', 'm', [['flex', 'Flexão', 120], ['ext', 'Extensão', 30], ['abd', 'Abdução', 45], ['adu', 'Adução', 30], ['ri', 'Rotação interna', 45], ['re', 'Rotação externa', 45]]],
    ['joelho', 'Joelho', 'm', [['flex', 'Flexão', 135]]],
    ['tornozelo', 'Tornozelo', 'm', [['dor', 'Dorsiflexão', 20], ['pla', 'Flexão plantar', 50], ['inv', 'Inversão', 35], ['eve', 'Eversão', 15]]],
    ['cervical', 'Coluna cervical', 'f', [['flex', 'Flexão', 45], ['ext', 'Extensão', 45], ['incd', 'Inclinação lateral direita', 45], ['ince', 'Inclinação lateral esquerda', 45], ['rotd', 'Rotação direita', 60], ['rote', 'Rotação esquerda', 60]]],
    ['lombar', 'Coluna toracolombar', 'f', [['flex', 'Flexão', 80], ['ext', 'Extensão', 25], ['incd', 'Inclinação lateral direita', 35], ['ince', 'Inclinação lateral esquerda', 35], ['rotd', 'Rotação direita', 45], ['rote', 'Rotação esquerda', 45]]]];
  const grauA3 = r => !isFinite(r) ? '' : r <= 0 ? 'sem redução' : r <= 1 / 3 ? 'grau mínimo' : r <= 2 / 3 ? 'grau médio' : 'grau máximo';
  const gonio = P({
    id: 'gonio', title: 'Goniometria (Quadro 6 do Anexo III)', desc: 'Arco medido contra a referência ou o lado oposto, com o grau mínimo, médio ou máximo',
    kw: 'goniometria amplitude movimento adm articular ombro joelho punho coluna auxilio acidente anexo iii decreto 3048 quadro 6 pericia',
    fields: v => {
      const a = ART.find(x => x[0] === v.art) || ART[0], col = a[0] === 'cervical' || a[0] === 'lombar';
      const out = [F.SEL('art', 'Articulação', ART.map(x => [x[0], x[1]]), { def: 'ombro', rebuild: true })];
      if (!col) out.push(F.SEG('lado', 'Lado examinado', [['D', 'Direito'], ['E', 'Esquerdo']], { def: 'D' }));
      out.push(F.SEG('base', 'Calcular a redução sobre', [['ref', 'Referência (AAOS)'], ['op', 'Lado oposto, se medido']], { def: 'ref' }));
      a[3].forEach(m => { out.push(F.SEC(m[1] + ' · referência ' + m[2] + '°')); out.push(F.N(a[0] + '_' + m[0], 'Medido', { unit: '°' })); if (!col) out.push(F.N(a[0] + '_' + m[0] + '_o', 'Lado oposto', { unit: '°' })); });
      return out;
    },
    calc: v => {
      const a = ART.find(x => x[0] === v.art) || ART[0], col = a[0] === 'cervical' || a[0] === 'lombar';
      const seg = col ? a[1].toLowerCase() : a[1].toLowerCase() + ' ' + (v.lado === 'E' ? (a[2] === 'f' ? 'esquerda' : 'esquerdo') : (a[2] === 'f' ? 'direita' : 'direito'));
      const rows = [], fr = []; let pior = 0;
      a[3].forEach(m => {
        const med = v[a[0] + '_' + m[0]], op = v[a[0] + '_' + m[0] + '_o'];
        if (!isFinite(med)) return;
        const base = v.base === 'op' && isFinite(op) && op > 0 ? op : m[2], red = Math.max(0, 1 - med / base), gr = grauA3(red);
        pior = Math.max(pior, red);
        rows.push([m[1], fmt(med, 0) + '°' + (isFinite(op) ? ' (oposto ' + fmt(op, 0) + '°)' : '') + ' · ' + (red > 0 ? pct(red) + ', ' + gr : 'sem redução')]);
        fr.push(m[1].toLowerCase() + ' de 0 a ' + fmt(med, 0) + ' graus' + (isFinite(op) ? ', contra 0 a ' + fmt(op, 0) + ' graus no lado oposto' : '') + (red > 0 ? ', redução de ' + pct(red) + ' em relação ' + (base === m[2] ? 'à referência de ' + m[2] + ' graus' : 'ao lado oposto') + ', ' + gr : ', sem redução'));
      });
      if (!rows.length) return ask('Informe o arco medido de pelo menos um movimento.');
      return { main: { label: 'Maior redução', value: pct(pior), unit: grauA3(pior) }, rows, alerts: pior > 1 / 3 ? [{ lvl: 'warn', text: 'Redução acima de 1/3 em pelo menos um movimento.' }] : [],
        notes: ['Nota 1 do Quadro 6: grau mínimo, redução de até 1/3 da amplitude normal; médio, mais de 1/3 até 2/3; máximo, acima de 2/3. Referências da AAOS.'],
        text: 'À goniometria ' + (a[2] === 'f' ? 'da ' : 'do ') + seg + ': ' + fr.join('; ') + '. A graduação da redução segue a Nota 1 do Quadro 6 do Anexo III do Decreto 3.048/1999.' };
    }
  });

  const FSEG = [['abd_omb', 'Abdução do ombro'], ['flex_cot', 'Flexão do cotovelo'], ['ext_cot', 'Extensão do cotovelo'], ['ext_pun', 'Extensão do punho'], ['flex_ded', 'Flexão dos dedos (preensão)'], ['opo_pol', 'Oponência do polegar'], ['flex_qua', 'Flexão do quadril'], ['ext_joe', 'Extensão do joelho'], ['flex_joe', 'Flexão do joelho'], ['dor_tor', 'Dorsiflexão do tornozelo'], ['pla_tor', 'Flexão plantar'], ['ext_hal', 'Extensão do hálux']];
  const FGR = [['5', '5 · normal, contra grande resistência'], ['4', '4 · bom, contra alguma resistência'], ['3', '3 · sofrível, vence só a gravidade'], ['2', '2 · pobre, sem a gravidade'], ['1', '1 · traços de contração'], ['0', '0 · nenhuma contração']];
  const forca = P({
    id: 'forca', title: 'Força muscular (Quadro 8 do Anexo III)', desc: 'Graus de 0 a 5 por grupo muscular e lado; grau 3 ou menos é sofrível ou inferior',
    kw: 'forca muscular mrc grau 0 a 5 paresia auxilio acidente anexo iii quadro 8 pericia',
    fields: [F.SEC('Membro superior')].concat(FSEG.slice(0, 6).flatMap(s => [F.SEL(s[0] + '_D', s[1] + ' · direito', [['', 'Não avaliado']].concat(FGR), { full: false }), F.SEL(s[0] + '_E', s[1] + ' · esquerdo', [['', 'Não avaliado']].concat(FGR), { full: false })]),
      [F.SEC('Membro inferior')], FSEG.slice(6).flatMap(s => [F.SEL(s[0] + '_D', s[1] + ' · direito', [['', 'Não avaliado']].concat(FGR), { full: false }), F.SEL(s[0] + '_E', s[1] + ' · esquerdo', [['', 'Não avaliado']].concat(FGR), { full: false })])),
    calc: v => {
      const it = [];
      FSEG.forEach(s => ['D', 'E'].forEach(l => { const x = v[s[0] + '_' + l]; if (x !== '' && x != null) it.push({ s: s[1], l, g: +x }); }));
      if (!it.length) return ask('Selecione o grau de pelo menos um grupo muscular.');
      const red = it.filter(i => i.g < 5), sof = it.filter(i => i.g <= 3);
      const d = i => lower1(i.s) + ' ' + (i.l === 'D' ? 'à direita' : 'à esquerda') + ' grau ' + i.g;
      return { main: { label: 'Grupos em grau 3 ou menos', value: String(sof.length), unit: 'de ' + it.length + ' avaliados' }, rows: red.map(i => [i.s + (i.l === 'D' ? ' D' : ' E'), 'grau ' + i.g + ' (' + ({ 4: '75%', 3: '50%', 2: '25%', 1: '10%', 0: '0%' })[i.g] + ')']),
        alerts: sof.length ? [{ lvl: 'warn', text: 'Grau sofrível ou inferior: situação descrita no Quadro 8.' }] : [], notes: ['O Quadro 8 vale para comprometimento muscular ou neurológico. Lesões articulares e perdas anatômicas seguem os quadros próprios.'],
        text: red.length ? 'Ao exame da força muscular, graduada de 0 a 5, observou-se ' + listaE(red.map(d)) + ', com os demais grupos avaliados em grau 5.' + (sof.length ? ' Há redução em grau sofrível ou inferior da classificação de desempenho muscular referida no Quadro 8 do Anexo III do Decreto 3.048/1999.' : '') : 'Força muscular grau 5 em todos os grupos avaliados.' };
    }
  });

  const HZ = ['500', '1000', '2000', '3000'];
  const gAud = m => !isFinite(m) ? '' : m <= 25 ? 'audição normal' : m <= 40 ? 'redução em grau mínimo' : m <= 70 ? 'redução em grau médio' : m <= 90 ? 'redução em grau máximo' : 'perda da audição';
  const corresp = a => a.length > 1 ? 'às situações descritas nas alíneas ' + listaE(a) : 'à situação descrita na alínea ' + a[0];
  const audio = P({
    id: 'audio', title: 'Audiometria (Quadro 2 do Anexo III)', desc: 'Média de 500, 1.000, 2.000 e 3.000 Hz por via aérea e enquadramento',
    kw: 'audiometria perda auditiva pair ruido disacusia decibeis auxilio acidente anexo iii quadro 2 pericia',
    fields: [F.SEC('Orelha direita (dB)')].concat(HZ.map(f => F.N('od' + f, f + ' Hz', { unit: 'dB' })), [F.SEC('Orelha esquerda (dB)')], HZ.map(f => F.N('oe' + f, f + ' Hz', { unit: 'dB' })),
      [F.SEC('Enquadramento'), F.SEG('ac', 'Orelha acidentada', [['od', 'Direita'], ['oe', 'Esquerda'], ['ambas', 'Ambas']], { def: 'ambas' })]),
    calc: v => {
      const med = o => { const a = HZ.map(f => v[o + f]); return a.every(isFinite) ? soma(a) / 4 : NaN; };
      const md = med('od'), me = med('oe');
      if (!isFinite(md) && !isFinite(me)) return ask('Preencha as quatro frequências de pelo menos uma orelha.');
      const m = o => o === 'od' ? md : me, out = o => o === 'od' ? 'oe' : 'od', enq = [], al = [];
      if (v.ac === 'ambas') { if (md > 90) enq.push('a (orelha direita)'); if (me > 90) enq.push('a (orelha esquerda)'); if (md > 40 && me > 40) enq.push('b'); if (!isFinite(md) || !isFinite(me)) al.push({ lvl: 'info', text: 'Preencha as duas orelhas para avaliar a alínea b.' }); }
      else { if (m(v.ac) > 90) enq.push('a'); if (m(v.ac) > 40 && m(out(v.ac)) > 40) enq.push('c'); if (m(v.ac) > 40 && !isFinite(m(out(v.ac)))) al.push({ lvl: 'info', text: 'Preencha a outra orelha para avaliar a alínea c.' }); }
      al.unshift({ lvl: enq.length ? 'warn' : 'ok', text: enq.length ? 'Corresponde ' + corresp(enq) + ' do Quadro 2.' : 'Sem correspondência com as situações do Quadro 2.' });
      const fr = (o, x) => isFinite(x) ? 'à ' + (o === 'od' ? 'direita' : 'esquerda') + ', média de ' + fmt(x, 1) + ' dB, ' + gAud(x) : '';
      return { main: { label: 'Médias', value: (isFinite(md) ? fmt(md, 1) : '-') + ' / ' + (isFinite(me) ? fmt(me, 1) : '-'), unit: 'dB (OD / OE)', small: true },
        rows: [['Orelha direita', isFinite(md) ? gAud(md) : 'sem dados'], ['Orelha esquerda', isFinite(me) ? gAud(me) : 'sem dados']], alerts: al,
        notes: ['Graus do Quadro 2: normal até 25 dB; mínimo 26 a 40; médio 41 a 70; máximo 71 a 90; perda acima de 90. Alíneas: a) perda na orelha acidentada; b) grau médio ou superior nas duas, ambas acidentadas; c) grau médio ou superior na acidentada, com a outra também em grau médio ou superior.'],
        text: 'A audiometria tonal, por via aérea, nas frequências de 500, 1.000, 2.000 e 3.000 Hz, evidencia ' + [fr('od', md), fr('oe', me)].filter(Boolean).join('; ') + ', segundo a graduação do Quadro 2 do Anexo III do Decreto 3.048/1999.' + (enq.length ? ' O achado corresponde ' + corresp(enq) + ' do referido quadro.' : '') };
    }
  });

  const avN = s => { s = String(s || '').trim().replace(',', '.'); if (!s) return NaN; const m = /^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/.exec(s); return m ? +m[1] / +m[2] : Number(s); };
  const visao = P({
    id: 'visao', title: 'Acuidade visual (Quadro 1 do Anexo III)', desc: 'Acuidade corrigida em decimal ou Snellen (20/100) e enquadramento',
    kw: 'acuidade visual snellen wecker cegueira visao monocular auxilio acidente anexo iii quadro 1 pericia',
    fields: [F.TXT('od', 'Olho direito, com correção', { ph: '0,2 ou 20/100' }), F.TXT('oe', 'Olho esquerdo, com correção', { ph: '0,8 ou 20/25' }), F.SEG('ac', 'Olho acidentado', [['od', 'Direito'], ['oe', 'Esquerdo'], ['ambos', 'Ambos']], { def: 'od' }),
      F.CHK('musc', 'Lesão da musculatura extrínseca, com paresia ou paralisia'), F.CHK('lacr', 'Lesão bilateral das vias lacrimais, ou unilateral com fístula')],
    calc: v => {
      const d = avN(v.od), e = avN(v.oe);
      if (!isFinite(d) && !isFinite(e) && !v.musc && !v.lacr) return ask('Informe a acuidade de pelo menos um olho.');
      const va = o => o === 'od' ? d : e, out = o => o === 'od' ? 'oe' : 'od', enq = [];
      if (v.ac === 'ambos') { if (d <= 0.2) enq.push('a (olho direito)'); if (e <= 0.2) enq.push('a (olho esquerdo)'); if (d <= 0.5 && e <= 0.5) enq.push('b'); }
      else { if (va(v.ac) <= 0.2) enq.push('a'); if (va(v.ac) <= 0.5 && va(out(v.ac)) <= 0.5) enq.push('c'); }
      if (v.musc) enq.push('d'); if (v.lacr) enq.push('e');
      const t = []; if (isFinite(d)) t.push('olho direito ' + fmt(d, 2)); if (isFinite(e)) t.push('olho esquerdo ' + fmt(e, 2));
      return { main: { label: 'Acuidade decimal', value: (isFinite(d) ? fmt(d, 2) : '-') + ' / ' + (isFinite(e) ? fmt(e, 2) : '-'), unit: 'OD / OE', small: true },
        alerts: [{ lvl: enq.length ? 'warn' : 'ok', text: enq.length ? 'Corresponde ' + corresp(enq) + ' do Quadro 1.' : 'Sem correspondência com as situações do Quadro 1.' }],
        notes: ['Quadro 1: a) acuidade corrigida até 0,2 no olho acidentado; b) até 0,5 em ambos, quando ambos acidentados; c) até 0,5 no acidentado com o outro também até 0,5; d) musculatura extrínseca; e) vias lacrimais. Escala de Wecker, em décimos, após correção.'],
        text: (t.length ? 'A acuidade visual com a melhor correção é de ' + listaE(t) + ', em escala decimal.' : '') + (v.musc ? ' Há lesão da musculatura extrínseca ocular, com paresia ou paralisia.' : '') + (v.lacr ? ' Há lesão das vias lacrimais.' : '') + (enq.length ? ' O achado corresponde ' + corresp(enq) + ' do Quadro 1 do Anexo III do Decreto 3.048/1999.' : '') };
    }
  });

  const encurt = P({
    id: 'encurt', title: 'Encurtamento de membro inferior (Quadro 7)', desc: 'Comprimento real, da espinha ilíaca anterossuperior ao maléolo medial',
    kw: 'encurtamento membro inferior discrepancia comprimento auxilio acidente anexo iii quadro 7 pericia',
    fields: [F.N('d', 'Membro inferior direito', { unit: 'cm' }), F.N('e', 'Membro inferior esquerdo', { unit: 'cm' }), F.CHK('bacia', 'Há lesão prévia de bacia a considerar')],
    calc: v => {
      if (!isFinite(v.d) || !isFinite(v.e)) return ask('Informe as duas medidas.');
      const dif = Math.abs(v.d - v.e), lado = v.d < v.e ? 'direito' : 'esquerdo', sit = dif > 4;
      return { main: { label: 'Encurtamento', value: fmt(dif, 1), unit: 'cm' }, sub: dif ? 'Membro inferior ' + lado : 'Sem diferença',
        alerts: [{ lvl: sit ? 'warn' : 'ok', text: sit ? 'Acima de 4 cm: situação do Quadro 7.' : 'Até 4 cm: abaixo do limite do Quadro 7.' }].concat(v.bacia ? [{ lvl: 'info', text: 'A Nota do Quadro 7 manda considerar a lesão prévia de bacia.' }] : []),
        text: 'A mensuração do comprimento real dos membros inferiores, da espinha ilíaca anterossuperior ao maléolo medial, foi de ' + fmt(v.d, 1) + ' cm à direita e ' + fmt(v.e, 1) + ' cm à esquerda' + (dif ? ', com encurtamento de ' + fmt(dif, 1) + ' cm do membro inferior ' + lado : ', sem discrepância') + '.' + (sit ? ' O encurtamento é superior a 4 cm, situação descrita no Quadro 7 do Anexo III do Decreto 3.048/1999.' : '') };
    }
  });

  const ANEXO3 = [
    ['1', 'Aparelho visual', ['a) acuidade visual, após correção, igual ou inferior a 0,2 no olho acidentado;', 'b) acuidade visual, após correção, igual ou inferior a 0,5 em ambos os olhos, quando ambos tiverem sido acidentados;', 'c) acuidade visual, após correção, igual ou inferior a 0,5 no olho acidentado, quando a do outro olho for igual a 0,5 ou menos, após correção;', 'd) lesão da musculatura extrínseca do olho, acarretando paresia ou paralisia;', 'e) lesão bilateral das vias lacrimais, com ou sem fístulas, ou unilateral com fístula.'], ['Nota 1: a acuidade visual restante é avaliada pela escala de Wecker, em décimos, e após a correção por lentes.', 'Nota 2: a nubécula e o leucoma são analisados em função da redução da acuidade ou do prejuízo estético que acarretam.']],
    ['2', 'Aparelho auditivo (trauma acústico)', ['a) perda da audição no ouvido acidentado;', 'b) redução da audição em grau médio ou superior em ambos os ouvidos, quando os dois tiverem sido acidentados;', 'c) redução da audição, em grau médio ou superior, no ouvido acidentado, quando a audição do outro estiver também reduzida em grau médio ou superior.'], ['Audiometria por via aérea em 500, 1.000, 2.000 e 3.000 Hz; a redução em cada ouvido é a média aritmética dessas frequências.', 'Normal até 25 dB; grau mínimo 26 a 40 dB; médio 41 a 70 dB; máximo 71 a 90 dB; perda acima de 90 dB.']],
    ['3', 'Aparelho da fonação', ['Perturbação da palavra em grau médio ou máximo, desde que comprovada por métodos clínicos objetivos.'], []],
    ['4', 'Prejuízo estético', ['Prejuízo estético em grau médio ou máximo, quando atingidos crânio e/ou face e/ou pescoço, ou perda de dentes quando houver também deformação da arcada dentária que impeça o uso de prótese.'], ['Nota 1: só se considera a lesão que acarreta modificação estética apreciável e desagradável do segmento, levando em conta sexo, idade e profissão.', 'Nota 2: perda anatômica de membro, redução de movimentos articulares ou alteração da capacidade funcional de membro não são prejuízo estético, podendo ser enquadradas nos quadros respectivos.']],
    ['5', 'Perdas de segmentos de membros', ['a) perda de segmento ao nível ou acima do carpo;', 'b) perda de segmento do primeiro quirodáctilo, desde que atingida a falange proximal;', 'c) perda de segmentos de dois quirodáctilos, desde que atingida a falange proximal em pelo menos um deles;', 'd) perda de segmento do segundo quirodáctilo, desde que atingida a falange proximal;', 'e) perda de segmento de três ou mais falanges, de três ou mais quirodáctilos;', 'f) perda de segmento ao nível ou acima do tarso;', 'g) perda de segmento do primeiro pododáctilo, desde que atingida a falange proximal;', 'h) perda de segmento de dois pododáctilos, desde que atingida a falange proximal em ambos;', 'i) perda de segmento de três ou mais falanges, de três ou mais pododáctilos.'], ['Nota: a perda parcial de parte óssea de um segmento equivale à perda do segmento; a perda só de partes moles não é considerada.']],
    ['6', 'Alterações articulares', ['a) redução em grau médio ou superior dos movimentos da mandíbula;', 'b) redução em grau máximo dos movimentos do segmento cervical da coluna vertebral;', 'c) redução em grau máximo dos movimentos do segmento lombo-sacro da coluna vertebral;', 'd) redução em grau médio ou superior dos movimentos das articulações do ombro ou do cotovelo;', 'e) redução em grau médio ou superior dos movimentos de pronação e/ou de supinação do antebraço;', 'f) redução em grau máximo dos movimentos do primeiro e/ou do segundo quirodáctilo, desde que atingidas as articulações metacarpofalangeana e falange-falangeana;', 'g) redução em grau médio ou superior dos movimentos das articulações coxofemoral e/ou joelho e/ou tíbio-társica.'], ['Nota 1: grau máximo, redução acima de 2/3 da amplitude normal; médio, mais de 1/3 até 2/3; mínimo, até 1/3.', 'Nota 2: também se enquadra, nesses limites, a redução de movimentos secundária a fratura de osso longo consolidada em posição viciosa com desvio de eixo.']],
    ['7', 'Encurtamento de membro inferior', ['Encurtamento de mais de 4 cm.'], ['Nota: a preexistência de lesão de bacia deve ser considerada.']],
    ['8', 'Redução da força e/ou da capacidade funcional dos membros', ['a) da mão, do punho, do antebraço ou de todo o membro superior, em grau sofrível ou inferior da classificação de desempenho muscular;', 'b) do primeiro quirodáctilo, em grau sofrível ou inferior;', 'c) do pé, da perna ou de todo o membro inferior, em grau sofrível ou inferior.'], ['Nota 1: aplica-se a comprometimento muscular ou neurológico, não a lesões articulares ou perdas anatômicas dos quadros próprios.', 'Nota 2: grau 5 normal 100%; 4 bom 75%; 3 sofrível 50%; 2 pobre 25%; 1 traços 10%; 0 zero; E ou EG espasmo; C ou CG contratura.']],
    ['9', 'Outros aparelhos e sistemas', ['a) segmentectomia pulmonar que acarrete redução em grau médio ou superior da capacidade funcional respiratória, devidamente correlacionada à atividade laborativa;', 'b) perda de segmento do aparelho digestivo cuja localização ou extensão traga repercussões sobre a nutrição e o estado geral.'], []]];
  const anexo3 = P({
    id: 'anexo3', title: 'Anexo III do Decreto 3.048/1999', desc: 'Os nove quadros do auxílio-acidente, com busca',
    kw: 'anexo iii decreto 3048 auxilio acidente quadros situacoes regulamento previdencia pericia inss',
    render: (h) => {
      const root = h('div', { class: 'panel peri-ref' }), q = h('input', { type: 'search', class: 'peri-q', placeholder: 'Filtrar: ombro, audição, falange...', 'aria-label': 'Filtrar' }), box = h('div');
      const draw = () => {
        const s = u.norm(q.value || ''); box.innerHTML = '';
        const l = ANEXO3.filter(x => !s || u.norm(x[1] + ' ' + x[2].join(' ') + ' ' + x[3].join(' ')).includes(s));
        if (!l.length) box.append(h('p', { class: 'hint' }, 'Nada encontrado.'));
        l.forEach(x => box.append(h('section', { class: 'peri-q6' }, h('h2', { class: 'sec' }, 'Quadro ' + x[0] + '. ' + x[1]), h('ul', null, x[2].map(i => h('li', null, i))), x[3].map(n => h('p', { class: 'note' }, n)))));
      };
      q.addEventListener('input', draw);
      root.append(h('p', { class: 'note' }, 'O art. 104 do Regulamento prevê o auxílio-acidente quando a sequela definitiva, a exemplo das situações do Anexo III, implique redução da capacidade para o trabalho habitual. O anexo é exemplificativo; a análise é do caso concreto.'), q, box);
      draw();
      return root;
    }
  });

  /* ======================= ERRO MÉDICO E DANO CORPORAL ====================== */
  const QD = [
    ['Muito ligeiro', 'lesões mínimas, sem internação, tratamento simples e recuperação em poucos dias'],
    ['Ligeiro', 'tratamento ambulatorial ou curativos, com dor por algumas semanas'],
    ['Moderado', 'imobilização ou pequeno procedimento, recuperação em semanas a poucos meses'],
    ['Médio', 'cirurgia com internação curta e reabilitação por meses'],
    ['Considerável', 'múltiplas cirurgias ou internação prolongada, reabilitação longa'],
    ['Importante', 'lesões graves, várias intervenções, terapia intensiva e longo período de sofrimento'],
    ['Muito importante', 'lesões gravíssimas, como grande queimado ou politraumatismo, com tratamentos prolongados e muito dolorosos']];
  const DE = [
    ['Muito ligeiro', 'alteração mínima, perceptível só à observação atenta e próxima'],
    ['Ligeiro', 'cicatriz pequena ou discreta, em área habitualmente coberta ou pouco visível'],
    ['Moderado', 'cicatriz ou deformidade visível em área exposta, sem alterar a harmonia geral'],
    ['Médio', 'cicatrizes extensas ou deformidade evidente à distância social'],
    ['Considerável', 'deformidade que chama a atenção e altera a imagem corporal, como claudicação evidente ou cicatrizes faciais extensas'],
    ['Importante', 'desfiguração grave ou amputação de segmento maior'],
    ['Muito importante', 'desfiguração extrema, como sequelas de grande queimado ou amputações múltiplas']];
  const quantum = P({
    id: 'quantum', title: 'Quantum doloris', desc: 'Dor e sofrimento no período de lesão e tratamento, escala de 7 graus',
    kw: 'quantum doloris dor sofrimento dano corporal erro medico responsabilidade civil indenizacao valoracao pericia',
    fields: [F.SEL('g', 'Grau', BL.concat(QD.map((x, i) => [String(i + 1), (i + 1) + ' · ' + x[0] + ': ' + x[1]]))), F.TXT('j', 'Fundamentação (opcional)', { full: true, ph: 'ex.: duas cirurgias, 12 dias de internação, fisioterapia por 6 meses' })],
    calc: v => {
      if (v.g === '') return ask('Selecione o grau.');
      const g = +v.g, x = QD[g - 1];
      return { main: { label: 'Quantum doloris', value: String(g), unit: 'de 7' }, sub: x[0], notes: ['Considere tipo e número de lesões, procedimentos, internações, imobilizações, tempo de recuperação e reabilitação. Descrições orientativas.'],
        text: 'O quantum doloris é estimado em grau ' + g + ' numa escala de 7 graus, ' + x[0].toLowerCase() + (v.j && v.j.trim() ? ', considerando ' + v.j.trim().replace(/\.$/, '') : '') + '.' };
    }
  });
  const danoest = P({
    id: 'danoest', title: 'Dano estético', desc: 'Prejuízo da imagem corporal, escala de 7 graus, com descrição da lesão',
    kw: 'dano estetico cicatriz deformidade desfiguracao imagem corporal erro medico cirurgia plastica responsabilidade civil pericia',
    fields: [F.SEL('g', 'Grau', [['', 'Selecione'], ['0', '0 · Ausente']].concat(DE.map((x, i) => [String(i + 1), (i + 1) + ' · ' + x[0] + ': ' + x[1]]))),
      F.TXT('desc', 'Descrição das lesões', { full: true, ph: 'ex.: cicatriz hipertrófica de 15 cm na face anterior da perna esquerda' }),
      F.SEC('Fatores considerados'), F.CHK('exp', 'Em área exposta (face, pescoço, mãos, antebraços)'), F.CHK('din', 'Visível também em movimento ou na marcha'), F.CHK('ret', 'Retração ou limitação associada'), F.CHK('cor', 'Discromia ou alteração de textura'), F.CHK('cam', 'Passível de camuflagem com roupa ou maquiagem'), F.CHK('cir', 'Passível de melhora com cirurgia reparadora')],
    calc: v => {
      if (v.g === '') return ask('Selecione o grau.');
      const g = +v.g, f = [['exp', 'localização em área exposta'], ['din', 'visibilidade também em movimento'], ['ret', 'retração associada'], ['cor', 'alteração de cor ou textura']].filter(x => v[x[0]]).map(x => x[1]);
      let t = g === 0 ? 'Não há dano estético.' : 'O dano estético é estimado em grau ' + g + ' numa escala de 7 graus, ' + DE[g - 1][0].toLowerCase() + (v.desc && v.desc.trim() ? ', representado por ' + lower1(v.desc.trim().replace(/\.$/, '')) : '') + (f.length ? ', considerando-se ' + listaE(f) : '') + '.';
      if (g && v.cam) t += ' As lesões são parcialmente dissimuláveis com vestuário ou maquiagem.';
      if (g && v.cir) t += ' Há possibilidade de melhora com cirurgia reparadora, sem garantia de resultado.';
      return { main: { label: 'Dano estético', value: String(g), unit: 'de 7' }, sub: g ? DE[g - 1][0] : 'Ausente', notes: ['A avaliação é estática e dinâmica, considerando localização, extensão, visibilidade e a pessoa examinada. Descrições orientativas; registre fotografias com autorização.'], text: t };
    }
  });

  const vss = escala({
    id: 'vss', title: 'Escala de cicatriz de Vancouver', desc: 'Pigmentação, vascularização, maleabilidade e altura (0 a 13)', unit: 'de 13',
    kw: 'vancouver scar scale vss cicatriz queloide hipertrofica queimadura dano estetico pericia',
    itens: [
      { k: 'pig', rot: 'Pigmentação', ops: [[0, 'Normal'], [1, 'Hipopigmentada'], [2, 'Hiperpigmentada']] },
      { k: 'vas', rot: 'Vascularização', ops: [[0, 'Normal'], [1, 'Rósea'], [2, 'Vermelha'], [3, 'Violácea']] },
      { k: 'mal', rot: 'Maleabilidade', ops: [[0, 'Normal'], [1, 'Flexível'], [2, 'Cede à pressão'], [3, 'Firme'], [4, 'Em cordão (bridas)'], [5, 'Contratura']] },
      { k: 'alt', rot: 'Altura', ops: [[0, 'Plana'], [1, 'Até 2 mm'], [2, 'De 2 a 5 mm'], [3, 'Acima de 5 mm']] }],
    pre: () => [F.TXT('loc', 'Localização da cicatriz', { full: true, ph: 'ex.: face anterior do antebraço direito, 8 cm' })],
    interp: (t, r, v) => ({ sub: t === 0 ? 'Cicatriz de aspecto normal' : t <= 4 ? 'Alterações leves' : t <= 8 ? 'Alterações moderadas' : 'Alterações acentuadas',
      text: 'A cicatriz' + (v.loc && v.loc.trim() ? ' em ' + lower1(v.loc.trim().replace(/\.$/, '')) : '') + ' apresenta ' + listaE(['pigmentação ' + r[0][1].toLowerCase(), 'vascularização ' + r[1][1].toLowerCase(), 'maleabilidade ' + r[2][1].toLowerCase(), 'altura ' + r[3][1].toLowerCase()]) + ', com pontuação de ' + t + ' de 13 na Escala de Vancouver.' })
  });

  const POS_O = [['vas', 'Vascularização'], ['pig', 'Pigmentação'], ['esp', 'Espessura'], ['rel', 'Relevo'], ['mal', 'Maleabilidade'], ['sup', 'Área de superfície']];
  const POS_P = [['dor', 'Dor'], ['pru', 'Prurido'], ['cor', 'Cor diferente da pele normal'], ['rig', 'Rigidez'], ['esp2', 'Espessura'], ['irr', 'Irregularidade']];
  const N10 = [['', '-']].concat([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => [String(n), String(n) + (n === 1 ? ' · como pele normal' : n === 10 ? ' · pior imaginável' : '')]));
  const posas = P({
    id: 'posas', title: 'POSAS (observador e paciente)', desc: 'Patient and Observer Scar Assessment Scale, itens de 1 a 10',
    kw: 'posas cicatriz observador paciente queimadura dano estetico avaliacao pericia',
    fields: [F.SEC('Observador (perito)')].concat(POS_O.map(x => F.SEL('o_' + x[0], x[1], N10, { full: false })), [F.SEL('o_g', 'Opinião geral do observador', N10, { full: false }), F.SEC('Paciente (relato)')], POS_P.map(x => F.SEL('p_' + x[0], x[1], N10, { full: false })), [F.SEL('p_g', 'Opinião geral do paciente', N10, { full: false })]),
    calc: v => {
      const o = POS_O.map(x => +v['o_' + x[0]] || 0), p = POS_P.map(x => +v['p_' + x[0]] || 0);
      const fo = o.filter(x => !x).length, fp = p.filter(x => !x).length;
      if (fo === 6 && fp === 6) return ask('Selecione as notas de 1 a 10.');
      const so = soma(o), sp = soma(p), rows = [];
      if (!fo) rows.push(['Observador', so + ' de 60' + (v.o_g ? ', opinião geral ' + v.o_g : '')]);
      if (!fp) rows.push(['Paciente', sp + ' de 60' + (v.p_g ? ', opinião geral ' + v.p_g : '')]);
      const al = fo || fp ? [{ lvl: 'info', text: 'Complete os seis itens de cada parte para a soma.' }] : [];
      const t = [];
      if (!fo) t.push(so + ' de 60 pontos na avaliação do observador (' + POS_O.map((x, i) => x[1].toLowerCase() + ' ' + o[i]).join(', ') + ')' + (v.o_g ? ', com opinião geral ' + v.o_g + ' de 10' : ''));
      if (!fp) t.push(sp + ' de 60 pontos na avaliação do paciente (' + POS_P.map((x, i) => x[1].toLowerCase() + ' ' + p[i]).join(', ') + ')' + (v.p_g ? ', com opinião geral ' + v.p_g + ' de 10' : ''));
      return { main: { label: 'POSAS', value: (fo ? '-' : so) + ' / ' + (fp ? '-' : sp), unit: 'observador / paciente', small: true }, rows, alerts: al, notes: ['Cada item de 1 (pele normal) a 10 (pior imaginável); soma de 6 a 60 em cada parte. Quanto maior, pior a cicatriz.'],
        text: t.length ? 'Pela escala POSAS, a cicatriz obteve ' + t.join('; ') + '.' : '' };
    }
  });

  const CLAV = [['I', 'Desvio do pós-operatório normal sem tratamento farmacológico, cirúrgico, endoscópico ou radiológico (aceitos antieméticos, antitérmicos, analgésicos, diuréticos, eletrólitos, fisioterapia e abertura de ferida à beira do leito)'], ['II', 'Requer tratamento farmacológico além do grau I, incluindo transfusão e nutrição parenteral'], ['IIIa', 'Requer intervenção cirúrgica, endoscópica ou radiológica sem anestesia geral'], ['IIIb', 'Requer intervenção sob anestesia geral'], ['IVa', 'Complicação com risco de vida que exige terapia intensiva, com disfunção de um órgão (inclui diálise)'], ['IVb', 'Disfunção de múltiplos órgãos'], ['V', 'Óbito']];
  const clavien = P({
    id: 'clavien', title: 'Clavien-Dindo (complicações cirúrgicas)', desc: 'Gravidade da complicação pelo tratamento que ela exigiu',
    kw: 'clavien dindo complicacao cirurgica pos operatorio gravidade erro medico intercorrencia pericia',
    fields: [F.SEL('g', 'Grau', BL.concat(CLAV.map((x, i) => [String(i), x[0] + ' · ' + x[1]]))), F.TXT('comp', 'Complicação', { full: true, ph: 'ex.: fístula do coto apendicular' }), F.TXT('trat', 'Tratamento realizado', { full: true, ph: 'ex.: drenagem percutânea guiada por tomografia' }), F.CHK('d', 'Persistia na alta (sufixo d, incapacidade)')],
    calc: v => {
      if (v.g === '') return ask('Selecione o grau.');
      const x = CLAV[+v.g], g = x[0] + (v.d ? 'd' : '');
      return { main: { label: 'Clavien-Dindo', value: 'Grau ' + g, small: true }, sub: x[1], notes: ['A classificação mede a gravidade pelo tratamento exigido; não define, por si, se houve desvio de conduta.'],
        text: (v.comp && v.comp.trim() ? cap(v.comp.trim().replace(/\.$/, '')) : 'A complicação') + (v.trat && v.trat.trim() ? ', tratada com ' + lower1(v.trat.trim().replace(/\.$/, '')) + ',' : '') + ' corresponde ao grau ' + g + ' da classificação de Clavien-Dindo: ' + lower1(x[1]) + (v.d ? ', persistindo na alta hospitalar' : '') + '.' };
    }
  });

  const PROF = [['0', 'Sem repercussão'], ['1', 'Compatível com a atividade habitual, com esforços acrescidos'], ['2', 'Impeditiva da atividade habitual, compatível com outras da área de preparação técnico-profissional'], ['3', 'Impeditiva de qualquer atividade profissional']];
  const R7 = [['0', '0 · sem repercussão']].concat([1, 2, 3, 4, 5, 6, 7].map(n => [String(n), n + ' · ' + QD[n - 1][0].toLowerCase()]));
  const valdano = P({
    id: 'valdano', title: 'Valoração do dano corporal (parâmetros)', desc: 'Datas, déficits temporários, quantum doloris, dano estético, déficit permanente e repercussões, em um texto',
    kw: 'valoracao dano corporal responsabilidade civil erro medico deficit funcional temporario permanente consolidacao quantum doloris dano estetico repercussao lazer sexual dependencias futuras pericia',
    fields: [F.DATE('ev', 'Data do evento'), F.DATE('cons', 'Data da consolidação'),
      F.SEC('Período temporário (dias)'), F.N('dtt', 'Déficit funcional temporário total', { unit: 'dias', hint: 'Internação ou dependência total' }), F.N('dtp', 'Déficit funcional temporário parcial', { unit: 'dias' }),
      F.N('rpt', 'Afastamento total da atividade profissional', { unit: 'dias' }), F.N('rpp', 'Retorno parcial à atividade profissional', { unit: 'dias' }),
      F.SEC('Parâmetros'), F.SEL('qd', 'Quantum doloris', BL.concat(QD.map((x, i) => [String(i + 1), (i + 1) + ' · ' + x[0]]))), F.SEL('de', 'Dano estético permanente', BL.concat([['0', '0 · ausente']], DE.map((x, i) => [String(i + 1), (i + 1) + ' · ' + x[0]]))),
      F.N('dfp', 'Déficit funcional permanente', { unit: 'pontos', hint: 'Em pontos de 0 a 100 ou percentual da tabela adotada' }), F.SEL('prof', 'Repercussão permanente na atividade profissional', BL.concat(PROF)),
      F.SEL('laz', 'Repercussão nas atividades desportivas e de lazer', BL.concat(R7)), F.SEL('sex', 'Repercussão na atividade sexual', BL.concat(R7)),
      F.SEC('Dependências futuras'), F.CHK('aj', 'Ajudas técnicas (órteses, próteses, cadeira de rodas)'), F.CHK('med', 'Medicação regular'), F.CHK('trt', 'Tratamentos médicos ou de reabilitação regulares'), F.CHK('ter', 'Auxílio de terceira pessoa'), F.CHK('adp', 'Adaptação do domicílio ou do veículo')],
    calc: v => {
      const ev = parseD(v.ev), co = parseD(v.cons), t = [], rows = [];
      if (ev) t.push('O evento ocorreu em ' + br(ev) + '.');
      if (co) { t.push('A data da consolidação das lesões é fixável em ' + br(co) + (ev ? ', ' + txtYM(ymd(ev, co)) + ' após o evento' : '') + '.'); rows.push(['Consolidação', br(co)]); }
      const dd = (n, s) => isFinite(n) && n > 0 ? s + ' de ' + n + (n === 1 ? ' dia' : ' dias') : '';
      const dft = [dd(v.dtt, 'total'), dd(v.dtp, 'parcial')].filter(Boolean), rp = [dd(v.rpt, 'total'), dd(v.rpp, 'parcial')].filter(Boolean);
      if (dft.length) { t.push('Déficit funcional temporário ' + listaE(dft) + '.'); rows.push(['Déficit temporário', dft.join(', ')]); }
      if (rp.length) t.push('Repercussão temporária na atividade profissional ' + listaE(rp) + '.');
      if (v.qd !== '') { t.push('Quantum doloris fixável no grau ' + v.qd + ' numa escala de 7 graus.'); rows.push(['Quantum doloris', v.qd + '/7']); }
      if (v.de !== '') { t.push(v.de === '0' ? 'Sem dano estético permanente.' : 'Dano estético permanente fixável no grau ' + v.de + ' numa escala de 7 graus.'); rows.push(['Dano estético', v.de + '/7']); }
      if (isFinite(v.dfp)) { t.push('Déficit funcional permanente da integridade físico-psíquica fixável em ' + fmt(v.dfp, 1) + ' pontos.'); rows.push(['Déficit permanente', fmt(v.dfp, 1) + ' pontos']); }
      if (v.prof !== '') t.push('Repercussão permanente na atividade profissional: ' + lower1(PROF[+v.prof][1]) + '.');
      if (v.laz !== '') t.push(v.laz === '0' ? 'Sem repercussão permanente nas atividades desportivas e de lazer.' : 'Repercussão permanente nas atividades desportivas e de lazer fixável no grau ' + v.laz + ' numa escala de 7 graus.');
      if (v.sex !== '') t.push(v.sex === '0' ? 'Sem repercussão permanente na atividade sexual.' : 'Repercussão permanente na atividade sexual fixável no grau ' + v.sex + ' numa escala de 7 graus.');
      const dep = [['aj', 'ajudas técnicas'], ['med', 'medicação regular'], ['trt', 'tratamentos médicos ou de reabilitação regulares'], ['ter', 'auxílio de terceira pessoa'], ['adp', 'adaptação do domicílio ou do veículo']].filter(x => v[x[0]]).map(x => x[1]);
      if (dep.length) t.push('Há dependências permanentes de ' + listaE(dep) + '.');
      if (!t.length) return ask('Preencha os parâmetros que se aplicam ao caso.');
      return { main: { label: 'Parâmetros preenchidos', value: String(rows.length), small: true }, rows, notes: ['Modelo de parâmetros do dano corporal em responsabilidade civil (referência metodológica: Tabela de Avaliação de Incapacidades Permanentes em Direito Civil, Anexo II do Decreto-Lei português 352/2007). A quantificação em dinheiro é do Juízo.'], text: t.join(' ') };
    }
  });

  const DPV = [
    ['Danos totais (100%)', [['t1', 'Perda anatômica e/ou funcional completa de ambos os membros superiores ou inferiores', 100], ['t2', 'Perda anatômica e/ou funcional completa de ambas as mãos ou de ambos os pés', 100], ['t3', 'Perda anatômica e/ou funcional completa de um membro superior e de um membro inferior', 100], ['t4', 'Perda completa da visão em ambos os olhos ou cegueira legal bilateral', 100], ['t5', 'Lesões neurológicas com dano cognitivo-comportamental alienante, impedimento da orientação espacial ou do deslocamento, perda do controle esfincteriano ou comprometimento de função vital', 100], ['t6', 'Lesões de órgãos e estruturas com prejuízos funcionais não compensáveis e comprometimento de função vital', 100]]],
    ['Segmentares, repercussão na íntegra do patrimônio físico', [['s1', 'Perda anatômica e/ou funcional completa de um dos membros superiores e/ou de uma das mãos', 70], ['s2', 'Perda anatômica e/ou funcional completa de um dos membros inferiores', 70], ['s3', 'Perda anatômica e/ou funcional completa de um dos pés', 50], ['s4', 'Perda completa da mobilidade de um dos ombros, cotovelos, punhos ou dedo polegar', 25], ['s5', 'Perda completa da mobilidade de um quadril, joelho ou tornozelo', 25], ['s6', 'Perda anatômica e/ou funcional completa de qualquer um dos outros dedos da mão', 10], ['s7', 'Perda anatômica e/ou funcional completa de qualquer um dos dedos do pé', 10]]],
    ['Outras repercussões em órgãos e estruturas', [['o1', 'Perda auditiva total bilateral, da fonação ou da visão de um olho', 50], ['o2', 'Perda completa da mobilidade de um segmento da coluna vertebral, exceto o sacral', 25], ['o3', 'Perda integral (retirada cirúrgica) do baço', 10]]]];
  const DPI = {}; DPV.forEach(g => g[1].forEach(x => { DPI[x[0]] = { t: x[1], p: x[2] }; }));
  const REP = [['100', 'Completa (100%)'], ['75', 'Intensa (75%)'], ['50', 'Média (50%)'], ['25', 'Leve (25%)'], ['10', 'Residual (10%)']];
  const REPT = { 100: 'completa', 75: 'de repercussão intensa', 50: 'de média repercussão', 25: 'de leve repercussão', 10: 'residual' };
  const dpvOpts = BL.concat(DPV.flatMap(g => g[1].map(x => [x[0], x[2] + '% · ' + x[1], g[0]])));
  const dpvat = P({
    id: 'dpvat', title: 'Tabela da Lei 6.194/1974 (DPVAT)', desc: 'Enquadramento por segmento, redução pela repercussão e soma de até 5 lesões',
    kw: 'dpvat spvat tabela lei 6194 invalidez permanente percentual dano corporal susep seguro acidente transito erro medico pericia',
    fields: v => {
      const out = [];
      for (let i = 1; i <= 5; i++) {
        if (i > 1 && !v['l' + (i - 1)]) break;
        out.push(F.SEC('Lesão ' + i), F.SEL('l' + i, 'Item da tabela', dpvOpts, { rebuild: true }));
        if (v['l' + i]) out.push(F.SEL('r' + i, 'Repercussão', REP, { def: '100', full: false }), F.TXT('s' + i, 'Segmento ou lado', { ph: 'ex.: ombro direito', full: false }));
      }
      return out;
    },
    calc: v => {
      const it = []; for (let i = 1; i <= 5; i++) if (v['l' + i]) { const b = DPI[v['l' + i]].p, f = +v['r' + i] || 100; it.push({ i, b, f, p: b * f / 100, s: (v['s' + i] || '').trim(), t: DPI[v['l' + i]].t }); }
      if (!it.length) return ask('Escolha o item da tabela.');
      const raw = soma(it.map(x => x.p)), tot = Math.min(100, raw);
      const fr = it.map(x => (x.s ? lower1(x.s) + ', no item' : 'item') + ' "' + lower1(x.t) + '", ' + REPT[x.f] + ', correspondendo a ' + (x.f === 100 ? '' : x.f + '% de ' + x.b + '%, ou seja, ') + fmt(x.p, 2) + '%');
      return { main: { label: 'Total', value: fmt(tot, 2), unit: '%' }, rows: it.map(x => [x.s || 'Lesão ' + x.i, x.b + '% × ' + x.f + '% = ' + fmt(x.p, 2) + '%']), alerts: raw > 100 ? [{ lvl: 'info', text: 'Soma limitada a 100%.' }] : [],
        notes: ['Art. 3º, § 1º: perda completa vai direto ao percentual; incompleta reduz em 75% (intensa), 50% (média), 25% (leve) ou 10% (residual). A Lei 6.194/1974 foi revogada pela LC 207/2024; a tabela segue como referência para fatos da sua vigência e quando os quesitos a pedem.'],
        text: 'Por analogia à tabela anexa à Lei 6.194/1974, o dano enquadra-se em: ' + fr.join('; ') + '.' + (it.length > 1 ? ' Somados, os percentuais totalizam ' + fmt(tot, 2) + '%.' : '') };
    }
  });

  /* ============================== PÓS-BARIÁTRICA ============================ */
  const ponderal = P({
    id: 'ponderal', title: 'Dados ponderais pós-bariátrica', desc: 'IMC, perda total, perda do excesso de peso, reganho e tempo de estabilidade',
    kw: 'bariatrica pos bariatrica peso imc perda excesso peso pep ptp reganho estabilidade dermolipectomia abdominoplastia plano de saude pericia',
    fields: [F.N('cm', 'Altura', { unit: 'cm', p: 'cm' }), F.N('pre', 'Peso antes da cirurgia', { unit: 'kg' }), F.N('min', 'Menor peso após a cirurgia', { unit: 'kg' }), F.N('at', 'Peso atual (medido)', { unit: 'kg' }),
      F.DATE('cir', 'Data da bariátrica'), F.DATE('est', 'Peso estável desde'), F.DATE('per', 'Data da perícia', { def: u.today() }),
      F.SEL('tec', 'Técnica', [['', 'Não informada'], ['bypass gástrico em Y de Roux', 'Bypass em Y de Roux'], ['gastrectomia vertical', 'Gastrectomia vertical (sleeve)'], ['banda gástrica ajustável', 'Banda gástrica'], ['derivação biliopancreática', 'Derivação biliopancreática']])],
    calc: v => {
      const h = v.cm > 3 ? v.cm / 100 : v.cm;
      if (!(h > 0) || !isFinite(v.pre) || !isFinite(v.at)) return ask('Informe altura, peso antes da cirurgia e peso atual.');
      const imc = p => p / (h * h), ideal = 25 * h * h, perda = v.pre - v.at, ptp = perda / v.pre, pep = perda / (v.pre - ideal);
      const reg = isFinite(v.min) && v.at > v.min ? v.at - v.min : 0;
      const per = parseD(v.per) || new Date(), cir = parseD(v.cir), est = parseD(v.est);
      const rows = [['IMC antes', fmt(imc(v.pre), 1)], ['Perda de peso', fmt(perda, 1) + ' kg'], ['Perda total de peso (%PTP)', pct(ptp, 1)], ['Perda do excesso de peso (%PEP)', pct(pep, 1)], ['Peso ideal (IMC 25)', fmt(ideal, 1) + ' kg']];
      if (isFinite(v.min)) rows.push(['IMC no menor peso', fmt(imc(v.min), 1)], ['Reganho', fmt(reg, 1) + ' kg' + (reg && v.pre > v.min ? ', ' + pct(reg / (v.pre - v.min)) + ' do perdido' : '')]);
      if (cir) rows.push(['Desde a cirurgia', txtYM(ymd(cir, per))]);
      if (est) rows.push(['Peso estável há', txtYM(ymd(est, per))]);
      const t = 'Cirurgia bariátrica' + (v.tec ? ', por ' + v.tec + ',' : '') + (cir ? ' realizada em ' + br(cir) : '') + ', com peso prévio referido de ' + fmt(v.pre, 1) + ' kg e IMC de ' + fmt(imc(v.pre), 1) + ' kg/m². ' + (isFinite(v.min) ? 'Atingiu o menor peso de ' + fmt(v.min, 1) + ' kg. ' : '') +
        'Na perícia, pesava ' + fmt(v.at, 1) + ' kg, com altura de ' + fmt(h, 2) + ' m e IMC de ' + fmt(imc(v.at), 1) + ' kg/m², o que corresponde a perda de ' + fmt(perda, 1) + ' kg, ' + pct(ptp, 1) + ' do peso inicial e ' + pct(pep, 1) + ' do excesso de peso' + (reg ? ', com reganho de ' + fmt(reg, 1) + ' kg em relação ao menor peso' : '') + '.' + (est ? ' Refere peso estável há ' + txtYM(ymd(est, per)) + '.' : '');
      return { main: { label: 'IMC atual', value: fmt(imc(v.at), 1), unit: 'kg/m²' }, rows, notes: ['Perda ponderal maciça costuma ser definida como perda de 50% ou mais do excesso de peso. Estabilidade do peso e IMC atual pesam na indicação e no risco da cirurgia de contorno.'], text: t };
    }
  });

  const PITT = [
    ['bra', 'Braços', ['Gordura com boa qualidade de pele', 'Pele flácida e pendente, sem grande volume de gordura', 'Pele flácida com grande volume de gordura']],
    ['mam', 'Mamas', ['Ptose de grau I ou II, ou mamas volumosas', 'Ptose de grau III, perda moderada de volume ou mama constrita', 'Abaulamento lateral importante e/ou perda acentuada de volume com pele flácida']],
    ['dor', 'Dorso', ['Prega única de gordura ou excesso de gordura', 'Múltiplas pregas de pele e gordura', 'Pregas pendentes']],
    ['abd', 'Abdome', ['Pele redundante com rugas finas, ou gordura moderada sem pendência', 'Pendência do abdome inferior (avental)', 'Múltiplas pregas ou plenitude do abdome superior']],
    ['fla', 'Flancos', ['Gordura', 'Pregas', 'Pregas pendentes']],
    ['nad', 'Nádegas', ['Gordura e/ou celulite leve a moderada', 'Gordura e/ou celulite acentuada', 'Pregas de pele']],
    ['mon', 'Monte púbico', ['Excesso de gordura', 'Ptose', 'Pendência importante abaixo da sínfise púbica']],
    ['qua', 'Quadris e face lateral das coxas', ['Gordura e/ou celulite leve a moderada', 'Gordura e/ou celulite acentuada', 'Pregas de pele']],
    ['coxm', 'Face medial das coxas', ['Excesso de gordura', 'Gordura e/ou celulite acentuada', 'Pregas de pele']],
    ['joe', 'Terço inferior das coxas e joelhos', ['Gordura', 'Gordura acentuada', 'Pregas de pele']]];
  const COMPL = [['it', 'intertrigo ou dermatite nas pregas'], ['fu', 'infecção fúngica de repetição'], ['ba', 'infecção bacteriana ou ulceração'], ['od', 'odor'], ['fn', 'limitação funcional (higiene, marcha, vestuário)']];
  const pittsburgh = P({
    id: 'pittsburgh', title: 'Escala de Pittsburgh e achados por região', desc: 'Graus de 0 a 3 em dez regiões, com complicações cutâneas e funcionais',
    kw: 'pittsburgh rating scale pos bariatrica excesso de pele deformidade contorno corporal abdominoplastia braquioplastia cruroplastia plano de saude pericia',
    fields: v => PITT.flatMap(r => {
      const out = [F.SEL(r[0], r[1], [['', 'Não avaliado'], ['0', '0 · Normal']].concat(r[2].map((d, i) => [String(i + 1), (i + 1) + ' · ' + d])), { rebuild: true })];
      if (+v[r[0]] > 0) COMPL.forEach(c => out.push(F.CHK(r[0] + '_' + c[0], r[1] + ': ' + c[1])));
      return out;
    }),
    calc: v => {
      const m = PITT.filter(r => v[r[0]] !== '' && v[r[0]] != null);
      if (!m.length) return ask('Gradue as regiões examinadas.');
      const alt = m.filter(r => +v[r[0]] > 0), sem = m.filter(r => +v[r[0]] === 0).map(r => r[1].toLowerCase());
      const cs = r => COMPL.filter(c => v[r[0] + '_' + c[0]]).map(c => c[1]);
      const fr = alt.map(r => { const g = +v[r[0]], c = cs(r); return r[1].toLowerCase() + ', grau ' + g + ', com ' + lower1(r[2][g - 1]) + (c.length ? ', apresentando ' + listaE(c) : ', sem complicações cutâneas ou funcionais ao exame'); });
      return { main: { label: 'Soma', value: String(soma(m.map(r => +v[r[0]]))), unit: 'em ' + m.length + ' de 10 regiões' }, rows: alt.map(r => [r[1], 'grau ' + v[r[0]] + (cs(r).length ? ' · ' + cs(r).length + ' complicação(ões)' : '')]),
        notes: ['Escala de Pittsburgh (Song e cols., 2005): 0 normal; 1 a 3 deformidade crescente, com a indicação cirúrgica correspondente.'],
        text: 'Ao exame, segundo a Escala de Pittsburgh para deformidades após grande perda ponderal: ' + (fr.length ? fr.join('; ') : 'sem deformidades nas regiões avaliadas') + '.' + (sem.length && fr.length ? ' Sem alterações em ' + listaE(sem) + '.' : '') };
    }
  });

  const dut = P({
    id: 'dut', title: 'DUT da ANS: abdominoplastia', desc: 'Texto da DUT 18 (RN 465/2021) e achados a documentar no abdome em avental',
    kw: 'dut diretriz utilizacao ans rol abdominoplastia dermolipectomia abdome em avental pos bariatrica plano de saude pericia',
    fields: [F.NOTE('DUT 18 (Anexo II da RN 465/2021): "Cobertura obrigatória em casos de pacientes que apresentem abdome em avental decorrente de grande perda ponderal (em consequência de tratamento clínico para obesidade mórbida ou após cirurgia de redução de estômago)." Nas normas anteriores (dermolipectomia) exigia-se também ao menos uma complicação: candidíase de repetição, infecções bacterianas por atrito, odor fétido ou hérnias. Confira a versão vigente na data do pedido.'),
      F.CHK('av', 'Abdome em avental (pendência sobre o púbis)'), F.CHK('pp', 'Grande perda ponderal documentada'), F.CHK('es', 'Peso estável no período recente'),
      F.SEC('Complicações e repercussões'), F.CHK('it', 'Intertrigo ou dermatite de repetição'), F.CHK('ca', 'Candidíase de repetição'), F.CHK('in', 'Infecções bacterianas por atrito'), F.CHK('od', 'Odor fétido'), F.CHK('he', 'Hérnia da parede abdominal'), F.CHK('fn', 'Limitação para higiene, marcha ou vestuário'), F.CHK('tr', 'Tratamento clínico prévio das complicações documentado')],
    calc: v => {
      const comp = [['it', 'intertrigo'], ['ca', 'candidíase de repetição'], ['in', 'infecções bacterianas por atrito'], ['od', 'odor fétido'], ['he', 'hérnia da parede abdominal']].filter(x => v[x[0]]).map(x => x[1]);
      const base = v.av && v.pp;
      const t = 'Ao exame, ' + (v.av ? 'constatou-se abdome em avental' : 'não se constatou abdome em avental') + ', em contexto de ' + (v.pp ? 'grande perda ponderal' : 'perda ponderal') + (v.es ? ', com peso estável' : '') + '.' + (comp.length ? ' Há registro de ' + listaE(comp) + '.' : ' Não foram constatadas complicações cutâneas associadas.') + (v.fn ? ' O excesso cutâneo acarreta limitação para higiene, marcha ou vestuário.' : '') + (v.tr ? ' Há documentação de tratamento clínico prévio das complicações.' : '');
      return { main: { label: 'Achados centrais da DUT', value: base ? 'Presentes' : 'Incompletos', small: true }, alerts: [{ lvl: base ? 'ok' : 'info', text: base ? 'Abdome em avental e grande perda ponderal documentados.' : 'Documente abdome em avental e grande perda ponderal.' }], rows: comp.length ? [['Complicações', String(comp.length)]] : [], text: t };
    }
  });

  /* ================================ HOME CARE =============================== */
  const braden = escala({
    id: 'braden', title: 'Escala de Braden', desc: 'Risco de lesão por pressão (6 a 23)', unit: 'de 23',
    kw: 'braden lesao por pressao escara ulcera risco home care internacao domiciliar enfermagem pericia',
    itens: [
      { k: 'per', rot: 'Percepção sensorial', ops: [[1, 'Totalmente limitada'], [2, 'Muito limitada'], [3, 'Levemente limitada'], [4, 'Nenhuma limitação']] },
      { k: 'umi', rot: 'Umidade', ops: [[1, 'Constantemente úmida'], [2, 'Muito úmida'], [3, 'Ocasionalmente úmida'], [4, 'Raramente úmida']] },
      { k: 'ati', rot: 'Atividade', ops: [[1, 'Acamado'], [2, 'Confinado à cadeira'], [3, 'Anda ocasionalmente'], [4, 'Anda frequentemente']] },
      { k: 'mob', rot: 'Mobilidade', ops: [[1, 'Totalmente imóvel'], [2, 'Bastante limitada'], [3, 'Levemente limitada'], [4, 'Nenhuma limitação']] },
      { k: 'nut', rot: 'Nutrição', ops: [[1, 'Muito pobre'], [2, 'Provavelmente inadequada'], [3, 'Adequada'], [4, 'Excelente']] },
      { k: 'fri', rot: 'Fricção e cisalhamento', ops: [[1, 'Problema'], [2, 'Problema em potencial'], [3, 'Nenhum problema aparente']] }],
    interp: t => { const c = t <= 9 ? 'risco muito alto' : t <= 12 ? 'risco alto' : t <= 14 ? 'risco moderado' : t <= 18 ? 'risco baixo' : 'sem risco';
      return { sub: cap(c), notes: ['19 a 23 sem risco; 15 a 18 baixo; 13 e 14 moderado; 10 a 12 alto; até 9 muito alto.'], text: 'Na Escala de Braden, obteve ' + t + ' pontos, compatível com ' + c + ' para lesão por pressão.' }; }
  });
  const KPS = [[100, 'Normal, sem queixas', 0], [90, 'Atividade normal, sinais mínimos', 0], [80, 'Atividade normal com esforço', 1], [70, 'Cuida de si, incapaz de trabalhar', 1], [60, 'Assistência ocasional', 2], [50, 'Assistência considerável e cuidados frequentes', 2], [40, 'Incapacitado, requer cuidados especiais', 3], [30, 'Gravemente incapacitado', 3], [20, 'Muito doente, suporte ativo', 4], [10, 'Moribundo', 4]];
  const kps = P({
    id: 'kps', title: 'Karnofsky e ECOG', desc: 'Capacidade funcional global com a correspondência aproximada',
    kw: 'karnofsky kps ecog zubrod performance status funcionalidade oncologia paliativo home care pericia',
    fields: [F.SEL('k', 'Karnofsky', BL.concat(KPS.map((x, i) => [String(i), x[0] + '% · ' + x[1]])))],
    calc: v => { if (v.k === '') return ask('Selecione a descrição.'); const x = KPS[+v.k];
      return { main: { label: 'Karnofsky', value: x[0] + '%' }, rows: [['ECOG aproximado', String(x[2])]], text: 'Apresenta escore de Karnofsky de ' + x[0] + '%, ' + lower1(x[1]) + ', correspondente a ECOG ' + x[2] + '.' }; }
  });

  /* ============================= ROTINA DO PERITO ============================ */
  function pascoa(a) {
    const b = a % 19, c = Math.floor(a / 100), d = a % 100, e = Math.floor(c / 4), f = c % 4, g = Math.floor((c + 8) / 25), hh = Math.floor((c - g + 1) / 3),
      i = (19 * b + c - e - hh + 15) % 30, k = Math.floor(d / 4), l = d % 4, m = (32 + 2 * f + 2 * k - i - l) % 7, n = Math.floor((b + 11 * i + 22 * m) / 451);
    return new Date(a, Math.floor((i + m - 7 * n + 114) / 31) - 1, ((i + m - 7 * n + 114) % 31) + 1);
  }
  function feriados(a, ex) {
    const f = {}, red = {};
    [['01-01', 'Confraternização Universal'], ['04-21', 'Tiradentes'], ['05-01', 'Dia do Trabalho'], ['07-09', 'Revolução Constitucionalista (SP)'], ['09-07', 'Independência'], ['10-12', 'Nossa Senhora Aparecida'], ['11-02', 'Finados'], ['11-15', 'Proclamação da República'], ['11-20', 'Consciência Negra'], ['12-08', 'Dia da Justiça'], ['12-25', 'Natal']].forEach(x => { f[a + '-' + x[0]] = x[1]; });
    const p = pascoa(a);
    f[iso(addD(p, -48))] = 'Carnaval'; f[iso(addD(p, -47))] = 'Carnaval'; f[iso(addD(p, -2))] = 'Sexta-feira Santa'; f[iso(addD(p, 60))] = 'Corpus Christi';
    red[iso(addD(p, -46))] = 'Quarta-feira de Cinzas, expediente a partir das 13h';
    String(ex || '').split(/[;,]+/).forEach(l => { const m = /(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?/.exec(l.trim()); if (!m || (m[3] && +m[3] !== a)) return; f[a + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0')] = 'Feriado informado'; });
    return { f, red };
  }
  function dia(d, ex) {
    const F2 = feriados(d.getFullYear(), ex), k = iso(d), md = (d.getMonth() + 1) * 100 + d.getDate();
    if (md >= 1220 || md <= 120) return { util: false, m: 'Suspensão de prazos (20/12 a 20/01, art. 220 do CPC)' };
    if (F2.f[k]) return { util: false, m: F2.f[k] };
    if (d.getDay() === 0 || d.getDay() === 6) return { util: false };
    return { util: true, red: F2.red[k] };
  }
  const prox = (d, ex) => { let x = addD(d, 1); while (!dia(x, ex).util) x = addD(x, 1); return x; };
  const prazos = P({
    id: 'prazos', title: 'Prazos processuais (dias úteis)', desc: 'Prazo a partir da intimação ou antecedência de um evento, com feriados e recesso forense',
    kw: 'prazo processual dias uteis cpc 219 220 intimacao dje feriado recesso laudo esclarecimentos audiencia 477 perito pericia',
    fields: v => (v.modo === 'tras'
      ? [F.SEG('modo', '', [['frente', 'A partir da intimação'], ['tras', 'Antes de um evento']], { def: 'frente', rebuild: true }), F.DATE('ev', 'Data do evento (ex.: audiência)'), F.N('n', 'Antecedência', { unit: 'dias', def: '20' })]
      : [F.SEG('modo', '', [['frente', 'A partir da intimação'], ['tras', 'Antes de um evento']], { def: 'frente', rebuild: true }), F.DATE('ini', 'Data'), F.SEL('ref', 'A data é', [['ci', 'Ciência da intimação'], ['dje', 'Disponibilização no DJE']], { full: false }), F.N('n', 'Prazo', { unit: 'dias', def: '15' })])
      .concat([F.SEG('tipo', 'Contagem', [['u', 'Dias úteis'], ['c', 'Dias corridos']], { def: 'u' }), F.TXT('ex', 'Feriados locais (dd/mm ou dd/mm/aaaa, separados por vírgula)', { full: true, ph: '19/03, 30/10/2026' }),
        F.NOTE('Já incluídos: feriados nacionais, 9 de julho, Carnaval, Sexta-feira Santa, Corpus Christi, 8 de dezembro e a suspensão de 20/12 a 20/01. Confira sempre no calendário oficial do tribunal.')]),
    calc: v => {
      const n = Math.floor(v.n), ex = v.ex || '', ut = v.tipo !== 'c', fmD = d => br(d) + ', ' + d.toLocaleDateString('pt-BR', { weekday: 'long' });
      if (!(n > 0)) return ask('Informe o número de dias.');
      if (v.modo === 'tras') {
        const ev = parseD(v.ev); if (!ev) return ask('Informe a data do evento.');
        let d = ev, c = 0;
        if (ut) while (c < n) { d = addD(d, -1); if (dia(d, ex).util) c++; } else { d = addD(ev, -n); while (!dia(d, ex).util) d = addD(d, -1); }
        return { main: { label: 'Último dia', value: br(d), small: true }, sub: d.toLocaleDateString('pt-BR', { weekday: 'long' }), notes: [n + ' dias ' + (ut ? 'úteis' : 'corridos') + ' antes de ' + br(ev) + ', sem contar o dia do evento. Art. 477 do CPC: laudo pelo menos 20 dias antes da audiência.'], text: 'Data limite: ' + fmD(d) + '.' };
      }
      const ini = parseD(v.ini); if (!ini) return ask('Informe a data.');
      const pub = v.ref === 'dje' ? prox(ini, ex) : null, com = prox(pub || ini, ex), pul = [];
      let fim;
      if (ut) { let d = com, c = 1; while (c < n) { d = addD(d, 1); const i = dia(d, ex); if (i.util) c++; else if (i.m && !pul.some(p => p[1] === i.m && /Suspens/.test(i.m))) pul.push([new Date(d), i.m]); } fim = d; }
      else { fim = addD(com, n - 1); if (!dia(fim, ex).util) fim = prox(fim, ex); }
      const al = [];
      if (dia(fim, ex).red) { al.push({ lvl: 'warn', text: 'O vencimento cairia em ' + br(fim) + ' (' + dia(fim, ex).red + '); prorrogado para o dia útil seguinte (art. 224, § 1º).' }); fim = prox(fim, ex); }
      const rows = (pub ? [['Publicação', br(pub)]] : []).concat([['Primeiro dia da contagem', br(com)], ['Prazo', n + ' dias ' + (ut ? 'úteis' : 'corridos')]], pul.map(p => [br(p[0]), p[1]]));
      return { main: { label: 'Vencimento', value: br(fim), small: true }, sub: fim.toLocaleDateString('pt-BR', { weekday: 'long' }), rows, alerts: al, text: 'Prazo de ' + n + ' dias ' + (ut ? 'úteis' : 'corridos') + ' iniciado em ' + br(com) + ', com vencimento em ' + fmD(fim) + '.' };
    }
  });

  const CPC = [
    ['Nomeação', [['Art. 157, § 1º', 'Escusa do encargo em 15 dias da intimação, ou do impedimento ou suspeição supervenientes.'], ['Art. 465, § 2º', 'Em 5 dias: proposta de honorários, currículo com comprovação de especialização e contatos profissionais, inclusive e-mail.'], ['Art. 465, § 1º', 'Partes têm 15 dias para arguir impedimento ou suspeição, indicar assistente técnico e apresentar quesitos.'], ['Art. 465, § 3º e § 4º', 'Partes se manifestam sobre a proposta em 5 dias; o juiz pode autorizar até 50% dos honorários no início e o restante após o laudo e os esclarecimentos.']]],
    ['Realização', [['Art. 466, § 2º', 'Assegurar aos assistentes técnicos acesso e acompanhamento das diligências, com comunicação comprovada e antecedência mínima de 5 dias.'], ['Art. 474', 'As partes terão ciência da data e do local da perícia.'], ['Art. 473, § 3º', 'Pode ouvir testemunhas, obter informações, solicitar documentos e instruir o laudo com fotografias e outros elementos.']]],
    ['Laudo', [['Art. 473, I a IV', 'Exposição do objeto; análise técnica ou científica; método utilizado, predominantemente aceito pelos especialistas; resposta conclusiva a todos os quesitos.'], ['Art. 473, § 1º', 'Linguagem simples e coerência lógica, indicando como chegou às conclusões.'], ['Art. 473, § 2º', 'Vedado ultrapassar os limites da designação e emitir opiniões pessoais que excedam o exame técnico.'], ['Art. 476', 'Por motivo justificado, uma única prorrogação, pela metade do prazo original.'], ['Art. 477', 'Laudo protocolado no prazo fixado, pelo menos 20 dias antes da audiência.']]],
    ['Depois do laudo', [['Art. 477, § 1º', 'Partes e assistentes técnicos se manifestam em 15 dias comuns.'], ['Art. 477, § 2º', 'Esclarecimentos sobre divergências ou dúvidas em 15 dias.'], ['Art. 477, § 3º e § 4º', 'Comparecimento à audiência, se necessário, com intimação de pelo menos 10 dias de antecedência.'], ['Arts. 468 e 158', 'Substituição por falta de conhecimento técnico ou descumprimento do prazo; responsabilidade por informações inverídicas, com inabilitação de 2 a 5 anos.']]],
    ['Código de Ética Médica, Capítulo XI', [['Art. 92', 'Vedado assinar laudo pericial sem ter realizado pessoalmente o exame.'], ['Art. 93', 'Vedado ser perito do próprio paciente, de familiar ou de pessoa com quem tenha relações capazes de influir no trabalho, ou de empresa em que atue ou tenha atuado.'], ['Art. 98', 'Vedado deixar de atuar com absoluta isenção ou ultrapassar os limites das atribuições e da competência.']]]];
  const cpc = P({
    id: 'cpc', title: 'CPC e ética: prazos e deveres do perito', desc: 'Resumo dos artigos que mais aparecem na rotina pericial',
    kw: 'cpc codigo processo civil perito prazos deveres honorarios 465 466 473 477 etica medica pericia',
    render: h => h('div', { class: 'panel peri-ref' }, CPC.map(g => h('section', { class: 'peri-q6' }, h('h2', { class: 'sec' }, g[0]), h('dl', { class: 'rows peri-dl' }, g[1].map(x => h('div', { class: 'r' }, h('dt', null, x[0]), h('dd', null, x[1])))))))
  });

  const CHECK = {
    todo: ['Todo laudo', ['Identificação do processo, das partes e do periciando', 'Comunicação às partes e assistentes com 5 dias de antecedência', 'Data, local e presentes no exame', 'Objeto da perícia, curto', 'Metodologia: anamnese, exame físico, análise documental, escalas', 'Anamnese só com o que foi relatado', 'Exame físico e exames complementares com datas', 'Discussão técnica fundamentada', 'Conclusão objetiva, sem qualificação jurídica', 'Respostas a todos os quesitos, transcritos como formulados', 'Data, assinatura e CRM']],
    interdicao: ['Interdição', ['Informante: parentesco e convivência', 'Escolaridade, ocupação anterior e com quem reside', 'História relatada pelo informante e pelo periciando', 'Medicações e acompanhamento atual', 'Exame físico geral e neurológico sumário', 'Exame psíquico completo', 'Teste cognitivo adequado à escolaridade', 'Escala funcional (Katz, Lawton ou Pfeffer)', 'Estadiamento (CDR ou Reisberg) se demência', 'Diagnóstico com CID e caráter (transitório, permanente, progressivo)', 'Repercussão funcional: finanças, bens, atos negociais, tratamento, autocuidado', 'Necessidade de supervisão ou auxílio e em quê', 'Data provável de início, se possível', 'Possibilidade de melhora e reavaliação']],
    acidente: ['Auxílio-acidente', ['Data, local e mecanismo do acidente; CAT', 'Atividade habitual na época, com as exigências físicas', 'Benefícios: espécie, início e cessação', 'Tratamentos com datas', 'Queixas atuais e lado dominante', 'Exame comparativo bilateral, cicatrizes, trofismo, perimetria', 'Goniometria em graus, com o lado oposto', 'Força de 0 a 5, testes especiais, exame neurológico', 'Exames complementares com datas', 'Consolidação das lesões', 'Nexo causal ou concausal', 'Repercussão no trabalho habitual: redução, maior esforço ou impossibilidade', 'Correlação com o Anexo III', 'Diferenciação de doença degenerativa ou preexistente', 'Data de início da redução da capacidade']],
    erro: ['Erro médico', ['Cronologia dos atendimentos a partir do prontuário', 'Profissionais e serviços envolvidos', 'Indicação do procedimento pela literatura da época', 'Termo de consentimento e informação de riscos', 'Técnica e intercorrências registradas', 'Diagnóstico e tratamento das complicações, com tempo de resposta', 'Complicação inerente ou desvio da conduta esperada', 'Classificação da complicação (Clavien-Dindo)', 'Dano: sequelas, exame físico e funcional', 'Nexo de causalidade entre conduta e dano', 'Data de consolidação', 'Quantum doloris, dano estético, déficit permanente e repercussões', 'Tratamentos futuros, se questionado']],
    bariatrica: ['Pós-bariátrica', ['Data e técnica da bariátrica', 'Peso e IMC antes, menor peso e peso atual medido', 'Tempo de estabilidade do peso', 'Comorbidades, tabagismo e estado nutricional', 'Procedimentos pedidos e relatório do assistente', 'Grau de Pittsburgh por região', 'Complicações cutâneas', 'Limitações funcionais', 'Tratamentos clínicos prévios', 'Fotografias com autorização', 'Caráter reparador ou estético por procedimento', 'Correlação com a DUT, se questionado', 'Condições clínicas para a cirurgia']],
    homecare: ['Home care', ['Diagnósticos com CID', 'Internações e situação atual', 'Dispositivos: traqueostomia, ventilação, oxigênio, gastrostomia, sondas', 'Aspiração de vias aéreas e frequência', 'Medicações e vias', 'Feridas e curativos', 'Dependência (Katz ou Barthel) e consciência', 'Tabelas NEAD e ABEMID', 'Enfermagem necessária: 24 h, 12 h, 6 h, visitas ou cuidador', 'Terapias e frequência', 'Materiais, equipamentos e dieta', 'Rede de apoio e domicílio', 'Prognóstico e reavaliação']]
  };
  const checklist = P({
    id: 'checklist', title: 'Checklists do laudo', desc: 'O que não pode faltar em cada tipo de perícia', copyLbl: 'Copiar pendências', prev: false,
    kw: 'checklist laudo pericial requisitos quesitos o que nao pode faltar pericia interdicao acidente erro medico bariatrica home care',
    fields: v => [F.SEL('tipo', 'Tipo de perícia', Object.keys(CHECK).map(k => [k, CHECK[k][0]]), { def: 'todo', rebuild: true })].concat(CHECK[v.tipo || 'todo'][1].map((t, i) => F.CHK((v.tipo || 'todo') + '_' + i, t))),
    calc: v => {
      const k = v.tipo || 'todo', L = CHECK[k][1], f = L.filter((t, i) => !v[k + '_' + i]);
      return { main: { label: 'Conferidos', value: (L.length - f.length) + '/' + L.length }, alerts: [{ lvl: f.length ? 'info' : 'ok', text: f.length ? 'Faltam ' + f.length + '.' : 'Tudo conferido.' }], notes: f.length ? ['Faltam: ' + f.join('; ') + '.'] : [], text: f.length ? 'Pendências (' + CHECK[k][0] + '): ' + f.join('; ') + '.' : false };
    }
  });

  const queimLink = { id: 'queimados-p', g: 'peri', title: 'Superfície corporal queimada', desc: 'Boneco para pintar as áreas queimadas, Lund-Browder e reposição volêmica', kw: 'queimadura queimado superficie corporal sqc lund browder regra dos nove dano estetico', href: '#/queimados' };
  D.links.push(queimLink);

  D.add(meem, fluencia, pfeffer, lawton, katz, barthel, cdr, gds, psiquico, gonio, forca, audio, visao, encurt, anexo3, valdano, quantum, danoest, vss, posas, clavien, dpvat, queimLink, ponderal, pittsburgh, dut, braden, kps, prazos, cpc, checklist);
})();
