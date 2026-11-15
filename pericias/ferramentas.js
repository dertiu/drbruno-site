/* =====================================================================
   FERRAMENTAS DO PERITO
   Escalas, calculadoras, tabelas de referência e checklists usados nas
   perícias (interdição, auxílio-acidente, pós-bariátrica, home care,
   erro médico). Tudo roda no navegador, sem servidor.
   Os valores ficam salvos só neste aparelho (localStorage pericias_ft).
   ===================================================================== */
(function () {
'use strict';

const LS = 'pericias_ft';
let S = carregar();
function carregar() {
  try { const s = JSON.parse(localStorage.getItem(LS) || '{}'); return { atual: s.atual || '', q: '', v: s.v || {} }; }
  catch (e) { return { atual: '', q: '', v: {} }; }
}
function salvar() { try { localStorage.setItem(LS, JSON.stringify({ atual: S.atual, v: S.v })); } catch (e) {} }
function V(id) { return S.v[id] || (S.v[id] = {}); }

/* ---------- utilitários ---------- */
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = s => { if (s == null || String(s).trim() === '') return NaN; return Number(String(s).trim().replace(',', '.')); };
const fmt = (n, d) => Number.isFinite(n) ? n.toLocaleString('pt-BR', { maximumFractionDigits: d == null ? 1 : d }) : '';
const pct = (n, d) => Number.isFinite(n) ? fmt(n * 100, d == null ? 0 : d) + '%' : '';
const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
const soma = a => a.reduce((x, y) => x + y, 0);
function listaE(a) { a = a.filter(Boolean); if (a.length <= 1) return a.join(''); return a.slice(0, -1).join(', ') + ' e ' + a[a.length - 1]; }
function dataISO(s) { if (!s) return null; const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; }
function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function br(d) { return d ? String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear() : ''; }
const DIAS_SEM = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
function addDias(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function difDias(a, b) { return Math.round((b - a) / 86400000); }
function difYMD(a, b) {
  if (!a || !b) return null;
  let neg = false; if (b < a) { const t = a; a = b; b = t; neg = true; }
  let y = b.getFullYear() - a.getFullYear(), m = b.getMonth() - a.getMonth(), d = b.getDate() - a.getDate();
  if (d < 0) { m--; d += new Date(b.getFullYear(), b.getMonth(), 0).getDate(); }
  if (m < 0) { y--; m += 12; }
  return { y, m, d, neg };
}
function txtYMD(o, semDias) {
  if (!o) return '';
  const p = [];
  if (o.y) p.push(o.y + (o.y === 1 ? ' ano' : ' anos'));
  if (o.m) p.push(o.m + (o.m === 1 ? ' mês' : ' meses'));
  if ((o.d && !(semDias && p.length)) || !p.length) p.push(o.d + (o.d === 1 ? ' dia' : ' dias'));
  return listaE(p);
}
function hoje() { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }

/* ---------- peças de formulário ---------- */
function campo(t, k, rot, op) {
  op = op || {};
  const v = V(t)[k] != null ? V(t)[k] : (op.padrao != null ? op.padrao : '');
  const id = 'ft-' + t + '-' + k;
  const extra = (op.re ? ' data-re="1"' : '') + (op.ph ? ' placeholder="' + esc(op.ph) + '"' : '');
  let ctl;
  if (op.tipo === 'select') {
    ctl = '<select id="' + id + '" data-ft="' + t + '" data-k="' + k + '"' + extra + '>' +
      op.ops.map(o => { const val = Array.isArray(o) ? o[0] : o, txt = Array.isArray(o) ? o[1] : o; return '<option value="' + esc(val) + '"' + (String(val) === String(v) ? ' selected' : '') + '>' + esc(txt) + '</option>'; }).join('') + '</select>';
  } else if (op.tipo === 'textarea') {
    ctl = '<textarea id="' + id + '" data-ft="' + t + '" data-k="' + k + '"' + extra + ' rows="' + (op.linhas || 3) + '">' + esc(v) + '</textarea>';
  } else if (op.tipo === 'check') {
    return '<label class="ft-check"><input type="checkbox" id="' + id + '" data-ft="' + t + '" data-k="' + k + '"' + extra + (v === true || v === 'true' ? ' checked' : '') + '><span>' + rot + '</span></label>';
  } else {
    const tp = op.tipo || 'text';
    ctl = '<input id="' + id + '" type="' + tp + '"' + (op.dec ? ' inputmode="decimal"' : '') + ' data-ft="' + t + '" data-k="' + k + '"' + extra + ' value="' + esc(v) + '" autocomplete="off">';
  }
  return '<div class="ft-campo' + (op.cls ? ' ' + op.cls : '') + '"><label for="' + id + '">' + rot + (op.suf ? ' <small>' + esc(op.suf) + '</small>' : '') + '</label>' + ctl + '</div>';
}
function opcoes(t, k, rot, ops, op) {
  op = op || {};
  const v = V(t)[k];
  return '<div class="ft-item"><div class="ft-item-rot">' + rot + (op.sub ? '<small>' + op.sub + '</small>' : '') + '</div><div class="ft-ops' + (op.col ? ' col' : '') + '" role="radiogroup">' +
    ops.map((o, i) => '<label class="ft-op"><input type="radio" name="ft-' + t + '-' + k + '" data-ft="' + t + '" data-k="' + k + '" value="' + i + '"' + (String(v) === String(i) ? ' checked' : '') + (op.re ? ' data-re="1"' : '') + '><span>' + (o[2] != null ? '<b>' + esc(o[2]) + '</b> ' : '') + esc(o[1]) + '</span></label>').join('') +
    '</div></div>';
}
function corresp(a) { a = a.filter((x, i) => a.indexOf(x) === i); return a.length > 1 ? 'às situações descritas nas alíneas ' + listaE(a) : 'à situação descrita na alínea ' + a[0]; }
function alin(a) { a = a.filter((x, i) => a.indexOf(x) === i); return (a.length > 1 ? 'alíneas ' : 'alínea ') + listaE(a); }
function caixa(cls, html) { return '<div class="ft-caixa ' + (cls || '') + '">' + html + '</div>'; }
function tag(cls, t) { return '<span class="ft-tag ' + cls + '">' + esc(t) + '</span>'; }
function grande(valor, rot, cls) { return '<div class="ft-grande ' + (cls || '') + '"><b>' + valor + '</b><span>' + rot + '</span></div>'; }

/* ---------- escala genérica (itens com pontos) ---------- */
function escala(def) {
  return Object.assign({
    form: v => (def.antes ? def.antes(v) : '') + def.itens.map(it => opcoes(def.id, it.k, it.rot, it.ops, { sub: it.sub, col: def.col })).join('') + (def.depois ? def.depois(v) : ''),
    res: v => {
      const resp = def.itens.map(it => v[it.k] != null && v[it.k] !== '' ? it.ops[Number(v[it.k])] : null);
      const feitos = resp.filter(Boolean).length, total = soma(resp.filter(Boolean).map(o => o[0]));
      const faltam = def.itens.length - feitos;
      const r = faltam ? {} : def.interpretar(total, resp, true, v);
      return {
        html: grande(fmt(total, 1), (def.maxTxt || ('de ' + def.max + ' pontos'))) + (faltam ? caixa('aviso', 'Faltam ' + faltam + (faltam === 1 ? ' item' : ' itens') + ' para completar.') : '') + (r.html || ''),
        texto: faltam ? '' : r.texto
      };
    }
  }, def);
}

/* =====================================================================
   FERRAMENTAS
   ===================================================================== */
const GRUPOS = [
  ['interdicao', 'Interdição e curatela', 'Cognição, funcionalidade e exame psíquico'],
  ['acidente', 'Auxílio-acidente', 'Anexo III do Decreto 3.048/1999, goniometria, força, audição e visão'],
  ['bariatrica', 'Pós-bariátrica', 'Dados ponderais, Escala de Pittsburgh e DUT da ANS'],
  ['homecare', 'Home care', 'NEAD, ABEMID e escalas de dependência'],
  ['dano', 'Erro médico e dano corporal', 'Tabela da Lei 6.194/1974, quantum doloris e dano estético'],
  ['geral', 'Rotina do perito', 'Prazos, CPC, ética e checklists do laudo']
];

const T = [];
function add(def) { T.push(def); }

/* ---------------------------------------------------------------------
   INTERDIÇÃO
   --------------------------------------------------------------------- */
const ESCOLARIDADE = [['', 'Selecione'], ['0', 'Analfabeto'], ['1', '1 a 4 anos'], ['5', '5 a 8 anos'], ['9', '9 a 11 anos'], ['12', '12 anos ou mais']];
const MEEM_BRUCKI = { 0: 20, 1: 25, 5: 26.5, 9: 28, 12: 29 };
const MEEM_BERT = { 0: 13, 1: 18, 5: 18, 9: 26, 12: 26 };
const MEEM_DOM = [['ot', 'Orientação temporal', 5], ['oe', 'Orientação espacial', 5], ['reg', 'Memória imediata (registro)', 3], ['at', 'Atenção e cálculo', 5], ['ev', 'Evocação', 3], ['lin', 'Linguagem', 8], ['pc', 'Praxia construtiva (cópia do desenho)', 1]];

add({
  id: 'meem', grupos: ['interdicao'], nome: 'Miniexame do Estado Mental',
  desc: 'Pontuação por domínio, com referência por escolaridade.',
  form: v => '<div class="ft-grid">' + campo('meem', 'esc', 'Escolaridade', { tipo: 'select', ops: ESCOLARIDADE }) + '</div><div class="ft-grid">' +
    MEEM_DOM.map(d => campo('meem', d[0], d[1], { tipo: 'number', suf: '0 a ' + d[2] })).join('') + '</div>',
  res: v => {
    const vals = MEEM_DOM.map(d => num(v[d[0]]));
    const erro = MEEM_DOM.find((d, i) => Number.isFinite(vals[i]) && (vals[i] < 0 || vals[i] > d[2]));
    if (erro) return { html: caixa('erro', 'Valor fora da faixa em ' + erro[1] + ' (máximo ' + erro[2] + ').') };
    const ok = vals.every(Number.isFinite), total = soma(vals.filter(Number.isFinite));
    let h = grande(fmt(total, 1), 'de 30 pontos');
    if (!ok) return { html: h + caixa('aviso', 'Preencha todos os domínios.') };
    const e = v.esc;
    let txt = 'No Miniexame do Estado Mental, obteve ' + total + ' de 30 pontos, assim distribuídos: ' +
      listaE(MEEM_DOM.map((d, i) => d[1].toLowerCase().replace(/ \(.*\)/, '') + ' ' + vals[i] + ' de ' + d[2])) + '.';
    if (e !== '' && e != null) {
      const ref = MEEM_BRUCKI[e], cort = MEEM_BERT[e], abaixo = total < ref, abaixoB = total < cort;
      const faixa = ESCOLARIDADE.find(x => x[0] === e)[1].toLowerCase();
      h += '<table class="ft-tab"><tr><th>Referência</th><th>Valor</th><th></th></tr>' +
        '<tr><td>Mediana de Brucki e cols. (2003), ' + esc(faixa) + '</td><td class="n">' + fmt(ref) + '</td><td>' + (abaixo ? tag('alerta', 'abaixo') : tag('ok', 'igual ou acima')) + '</td></tr>' +
        '<tr><td>Ponto de corte de Bertolucci e cols. (1994)</td><td class="n">' + cort + '</td><td>' + (abaixoB ? tag('alerta', 'abaixo') : tag('ok', 'igual ou acima')) + '</td></tr></table>';
      txt += ' Para a escolaridade informada, ' + (e === '0' ? 'analfabeto' : 'de ' + faixa) + ', o resultado encontra-se ' + (abaixo ? 'abaixo' : 'dentro') + ' dos valores de referência descritos para a população brasileira' + (abaixo ? ', achado compatível com comprometimento cognitivo, a ser interpretado em conjunto com a avaliação clínica e funcional.' : '.');
    } else h += caixa('aviso', 'Informe a escolaridade para comparar com a referência.');
    h += caixa('dica', 'O teste é aplicado com o protocolo habitual; aqui entram só os pontos de cada domínio.');
    return { html: h, texto: txt };
  }
});

add({
  id: 'fluencia', grupos: ['interdicao'], nome: 'Fluência verbal (animais)',
  desc: 'Número de animais em 1 minuto, com ponto de corte por escolaridade.',
  form: v => '<div class="ft-grid">' + campo('fluencia', 'n', 'Animais em 1 minuto', { tipo: 'number' }) +
    campo('fluencia', 'esc', 'Escolaridade', { tipo: 'select', ops: [['', 'Selecione'], ['b', 'Menos de 8 anos'], ['a', '8 anos ou mais']] }) + '</div>',
  res: v => {
    const n = num(v.n);
    if (!Number.isFinite(n) || !v.esc) return { html: caixa('aviso', 'Informe o número e a escolaridade.') };
    const c = v.esc === 'a' ? 13 : 9, ab = n < c;
    return {
      html: grande(n, 'animais') + caixa(ab ? 'alerta' : 'ok', 'Ponto de corte: ' + c + '. Resultado ' + (ab ? 'abaixo' : 'igual ou acima') + ' do esperado.'),
      texto: 'No teste de fluência verbal semântica, categoria animais, evocou ' + n + ' itens em um minuto, valor ' + (ab ? 'abaixo' : 'dentro') + ' do esperado para a escolaridade, considerando-se ponto de corte de ' + c + ' itens.'
    };
  }
});

const PFEFFER_OPS = [[0, 'Normal'], [1, 'Faz com dificuldade'], [2, 'Necessita de ajuda'], [3, 'Não é capaz'], [0, 'Nunca fez, mas poderia fazer agora'], [1, 'Nunca fez e teria dificuldade agora']];
add(escala({
  id: 'pfeffer', grupos: ['interdicao'], nome: 'Questionário de Pfeffer (FAQ)',
  desc: 'Atividades funcionais, respondido pelo informante.', max: 30,
  itens: [
    ['din', 'Manuseia o próprio dinheiro, paga contas'], ['comp', 'Faz compras sozinho(a) (roupas, comida, itens da casa)'], ['fogo', 'Esquenta água e apaga o fogo'],
    ['com', 'Prepara uma refeição'], ['atu', 'Mantém-se em dia com as atualidades e acontecimentos'], ['tv', 'Presta atenção, entende e discute programa de TV, rádio, jornal ou revista'],
    ['lem', 'Lembra compromissos, acontecimentos familiares e feriados'], ['rem', 'Manuseia os próprios remédios'], ['viz', 'Passeia pela vizinhança e encontra o caminho de volta'], ['so', 'Pode ser deixado(a) sozinho(a) em casa com segurança']
  ].map(x => ({ k: x[0], rot: x[1], ops: PFEFFER_OPS })),
  interpretar: (t, r, ok) => {
    const alt = t >= 5;
    return {
      html: caixa(alt ? 'alerta' : 'ok', alt ? 'Pontuação igual ou superior a 5: sugere comprometimento funcional.' : 'Pontuação abaixo de 5: sem comprometimento funcional significativo pelo questionário.'),
      texto: 'No Questionário de Atividades Funcionais de Pfeffer, respondido pelo informante, obteve ' + t + ' de 30 pontos, ' + (alt ? 'resultado compatível com comprometimento funcional, considerando-se alterados escores iguais ou superiores a 5.' : 'resultado sem indicativo de comprometimento funcional significativo.')
    };
  }
}));

const KATZ = [['banho', 'Banho'], ['vestir', 'Vestir-se'], ['banheiro', 'Higiene pessoal (uso do banheiro)'], ['transf', 'Transferência'], ['cont', 'Continência'], ['alim', 'Alimentação']];
add(escala({
  id: 'katz', grupos: ['interdicao', 'homecare'], nome: 'Índice de Katz (AVD básicas)',
  desc: 'Seis atividades básicas, com a classificação por letras.', max: 6, maxTxt: 'atividades independentes',
  itens: KATZ.map(x => ({ k: x[0], rot: x[1], ops: [[1, 'Independente'], [0, 'Dependente']] })),
  interpretar: (t, r, ok) => {
    if (!ok) return {};
    const dep = KATZ.filter((x, i) => r[i][0] === 0).map(x => x[0]);
    const tem = a => a.every(k => dep.indexOf(k) >= 0);
    let L = 'Outro';
    if (!dep.length) L = 'A'; else if (dep.length === 6) L = 'G'; else if (dep.length === 1) L = 'B';
    else if (dep.length === 2 && tem(['banho'])) L = 'C';
    else if (dep.length === 3 && tem(['banho', 'vestir'])) L = 'D';
    else if (dep.length === 4 && tem(['banho', 'vestir', 'banheiro'])) L = 'E';
    else if (dep.length === 5 && tem(['banho', 'vestir', 'banheiro', 'transf'])) L = 'F';
    const nomesDep = KATZ.filter(x => dep.indexOf(x[0]) >= 0).map(x => x[1].toLowerCase().replace(/ \(.*\)/, ''));
    const cls = t === 6 ? 'independente' : t >= 3 ? 'dependência parcial' : 'dependência importante';
    return {
      html: caixa(t === 6 ? 'ok' : 'alerta', 'Classificação de Katz: <b>' + L + '</b>. ' + cap(cls) + '.') +
        caixa('dica', 'A: independente em todas. B: em todas menos uma. C: todas menos banho e mais uma. D: menos banho, vestir e mais uma. E: menos banho, vestir, higiene e mais uma. F: menos banho, vestir, higiene, transferência e mais uma. G: dependente em todas.'),
      texto: 'Pelo Índice de Katz, apresenta independência em ' + t + ' das 6 atividades básicas de vida diária' + (dep.length ? ', com dependência para ' + listaE(nomesDep) : '') + ', classificação ' + L + '.'
    };
  }
}));

add(escala({
  id: 'lawton', grupos: ['interdicao', 'homecare'], nome: 'Escala de Lawton e Brody (AIVD)',
  desc: 'Atividades instrumentais, versão brasileira de 7 itens.', max: 21, maxTxt: 'de 21 pontos (mínimo 7)',
  itens: [['tel', 'Usar o telefone'], ['transp', 'Usar transporte, deslocar-se a locais distantes'], ['comp', 'Fazer compras'], ['ref', 'Preparar as próprias refeições'], ['casa', 'Arrumar a casa, trabalhos domésticos'], ['med', 'Tomar os próprios remédios'], ['din', 'Cuidar das próprias finanças']]
    .map(x => ({ k: x[0], rot: x[1], ops: [[3, 'Sem ajuda'], [2, 'Com ajuda parcial'], [1, 'Não consegue']] })),
  interpretar: t => {
    const c = t === 21 ? 'independência' : t === 7 ? 'dependência total' : 'dependência parcial';
    return { html: caixa(t === 21 ? 'ok' : 'alerta', cap(c) + ' para as atividades instrumentais.'), texto: 'Na Escala de Lawton e Brody para atividades instrumentais de vida diária, obteve ' + t + ' de 21 pontos, compatível com ' + c + '.' };
  }
}));

add(escala({
  id: 'barthel', grupos: ['interdicao', 'homecare'], nome: 'Índice de Barthel',
  desc: 'Dez atividades de autocuidado e mobilidade, de 0 a 100.', max: 100,
  itens: [
    { k: 'alim', rot: 'Alimentação', ops: [[10, 'Independente'], [5, 'Precisa de ajuda (cortar, passar manteiga)'], [0, 'Dependente']] },
    { k: 'banho', rot: 'Banho', ops: [[5, 'Independente'], [0, 'Dependente']] },
    { k: 'hig', rot: 'Higiene pessoal (rosto, dentes, cabelo, barba)', ops: [[5, 'Independente'], [0, 'Precisa de ajuda']] },
    { k: 'vest', rot: 'Vestir-se', ops: [[10, 'Independente'], [5, 'Precisa de ajuda, faz metade sozinho'], [0, 'Dependente']] },
    { k: 'intest', rot: 'Evacuação', ops: [[10, 'Continente'], [5, 'Acidente ocasional'], [0, 'Incontinente']] },
    { k: 'bex', rot: 'Micção', ops: [[10, 'Continente'], [5, 'Acidente ocasional'], [0, 'Incontinente ou sondado sem autonomia']] },
    { k: 'vaso', rot: 'Uso do vaso sanitário', ops: [[10, 'Independente'], [5, 'Precisa de alguma ajuda'], [0, 'Dependente']] },
    { k: 'transf', rot: 'Transferência cama e cadeira', ops: [[15, 'Independente'], [10, 'Pequena ajuda física ou verbal'], [5, 'Grande ajuda, consegue sentar'], [0, 'Incapaz, sem equilíbrio sentado']] },
    { k: 'mob', rot: 'Mobilidade', ops: [[15, 'Caminha 50 m sem ajuda (pode usar bengala)'], [10, 'Caminha com ajuda de uma pessoa'], [5, 'Independente em cadeira de rodas'], [0, 'Imóvel']] },
    { k: 'esc', rot: 'Escadas', ops: [[10, 'Independente'], [5, 'Precisa de ajuda'], [0, 'Incapaz']] }
  ],
  interpretar: t => {
    const c = t === 100 ? 'independência' : t >= 91 ? 'dependência leve' : t >= 61 ? 'dependência moderada' : t >= 21 ? 'dependência grave' : 'dependência total';
    return {
      html: caixa(t === 100 ? 'ok' : 'alerta', cap(c) + '.') + caixa('dica', 'Faixas usuais: 100 independente; 91 a 99 leve; 61 a 90 moderada; 21 a 60 grave; 0 a 20 total.'),
      texto: 'Pelo Índice de Barthel, obteve ' + t + ' de 100 pontos, compatível com ' + c + ' para as atividades de autocuidado e mobilidade.'
    };
  }
}));

const CDR_DOM = [
  ['mem', 'Memória', ['Sem perda, ou esquecimentos leves e inconsistentes', 'Esquecimento leve e consistente, recordação parcial de eventos', 'Perda moderada, maior para fatos recentes, interfere nas atividades diárias', 'Perda grave, retém apenas material muito aprendido', 'Perda grave, restam apenas fragmentos']],
  ['ori', 'Orientação', ['Plenamente orientado', 'Plenamente orientado, leve dificuldade com relações temporais', 'Dificuldade moderada com relações temporais, pode ter desorientação geográfica', 'Dificuldade grave, em geral desorientado no tempo e muitas vezes no espaço', 'Orientado apenas quanto à própria pessoa']],
  ['jul', 'Julgamento e solução de problemas', ['Resolve bem problemas do dia a dia, julgamento adequado', 'Leve comprometimento na solução de problemas, semelhanças e diferenças', 'Dificuldade moderada; julgamento social em geral mantido', 'Comprometimento grave; julgamento social em geral comprometido', 'Incapaz de julgar ou resolver problemas']],
  ['com', 'Assuntos na comunidade', ['Independente em trabalho, compras, negócios, finanças e grupos sociais', 'Leve comprometimento nessas atividades', 'Não funciona de forma independente, embora ainda participe de algumas', 'Sem independência fora de casa, mas parece bem para ser levado a atividades externas', 'Sem independência fora de casa e parece doente demais para atividades externas']],
  ['lar', 'Lar e passatempos', ['Vida doméstica, passatempos e interesses intelectuais mantidos', 'Levemente prejudicados', 'Comprometimento leve, mas definido; tarefas e passatempos mais complexos abandonados', 'Só tarefas simples preservadas, interesses muito limitados', 'Sem função significativa em casa']],
  ['cui', 'Cuidados pessoais', ['Plenamente capaz', null, 'Necessita de estímulo', 'Requer assistência para vestir-se, higiene e cuidados pessoais', 'Requer muita ajuda; incontinência frequente']]
];
const CDR_V = [0, 0.5, 1, 2, 3];
function cdrGlobal(M, Ss) {
  if (M === 0) return Ss.filter(s => s >= 0.5).length >= 2 ? 0.5 : 0;
  if (M === 0.5) return Ss.filter(s => s >= 1).length >= 3 ? 1 : 0.5;
  const eq = Ss.filter(s => s === M).length, gt = Ss.filter(s => s > M), lt = Ss.filter(s => s < M);
  if (eq >= 3) return M;
  if (gt.length >= 3 || lt.length >= 3) {
    const lado = gt.length >= 3 ? gt : lt, outro = gt.length >= 3 ? lt : gt;
    if (lado.length === 3 && outro.length === 2) return M;
    const cont = {}; lado.forEach(s => { cont[s] = (cont[s] || 0) + 1; });
    const max = Math.max.apply(null, Object.values(cont));
    const cand = Object.keys(cont).filter(k => cont[k] === max).map(Number).sort((a, b) => Math.abs(a - M) - Math.abs(b - M));
    const r = cand[0];
    return r === 0 ? 0.5 : r;
  }
  return M;
}
add({
  id: 'cdr', grupos: ['interdicao'], nome: 'Escala Clínica de Demência (CDR)',
  desc: 'Seis domínios, com o escore global pelas regras de Morris e a soma dos domínios.',
  form: v => CDR_DOM.map(d => opcoes('cdr', d[0], d[1], d[2].map((t, i) => t ? [CDR_V[i], t, String(CDR_V[i]).replace('.', ',')] : null).filter(Boolean).map(o => o), { col: true })).join(''),
  res: v => {
    const val = CDR_DOM.map(d => {
      if (v[d[0]] == null) return null;
      const ops = d[2].map((t, i) => t ? CDR_V[i] : null).filter(x => x != null);
      return ops[Number(v[d[0]])];
    });
    const falta = val.filter(x => x == null).length;
    const sb = soma(val.filter(x => x != null));
    if (falta) return { html: grande(fmt(sb, 1), 'soma dos domínios') + caixa('aviso', 'Faltam ' + falta + ' domínio(s).') };
    const g = cdrGlobal(val[0], val.slice(1));
    const est = { 0: 'sem demência', 0.5: 'demência questionável', 1: 'demência leve', 2: 'demência moderada', 3: 'demência grave' }[g];
    const gs = String(g).replace('.', ',');
    return {
      html: '<div class="ft-dupla">' + grande(gs, 'CDR global', g >= 1 ? 'alerta' : '') + grande(fmt(sb, 1), 'soma dos domínios (CDR-SB)') + '</div>' + caixa(g >= 1 ? 'alerta' : 'ok', cap(est) + '.') +
        caixa('dica', 'A memória é o domínio principal. O escore global segue as regras de Morris (1993); confira em casos limítrofes.'),
      texto: 'Na Escala Clínica de Demência (CDR), com base na entrevista com o informante e no exame, obteve escore global ' + gs + ', compatível com ' + est + ', e soma dos domínios de ' + fmt(sb, 1) + ' pontos, com memória ' + String(val[0]).replace('.', ',') + ', orientação ' + String(val[1]).replace('.', ',') + ', julgamento e solução de problemas ' + String(val[2]).replace('.', ',') + ', assuntos na comunidade ' + String(val[3]).replace('.', ',') + ', lar e passatempos ' + String(val[4]).replace('.', ',') + ' e cuidados pessoais ' + String(val[5]).replace('.', ',') + '.'
    };
  }
});

const GDS = [
  ['Sem declínio cognitivo', 'Sem queixas subjetivas e sem déficits ao exame.'],
  ['Declínio cognitivo muito leve', 'Queixas subjetivas de esquecimento, sem déficits objetivos.'],
  ['Declínio cognitivo leve', 'Déficits sutis à entrevista detalhada; queda de desempenho em situações sociais ou de trabalho mais exigentes.'],
  ['Declínio cognitivo moderado', 'Déficits claros; dificuldade com finanças, viagens e tarefas complexas. Corresponde a demência leve.'],
  ['Declínio cognitivo moderadamente grave', 'Precisa de ajuda para escolher a roupa adequada; não recorda dados importantes, como endereço ou telefone. Corresponde a demência moderada.'],
  ['Declínio cognitivo grave', 'Precisa de ajuda para vestir-se, banho e higiene; pode surgir incontinência; esquece nomes de familiares. Corresponde a demência moderadamente grave.'],
  ['Declínio cognitivo muito grave', 'Perda progressiva da fala e das habilidades motoras; dependência total. Corresponde a demência grave.']
];
add({
  id: 'gds', grupos: ['interdicao'], nome: 'Escala de Deterioração Global (Reisberg)',
  desc: 'Estadiamento clínico de 1 a 7.',
  form: v => opcoes('gds', 'e', 'Estágio', GDS.map((g, i) => [i + 1, g[0] + ': ' + g[1], i + 1]), { col: true }),
  res: v => {
    if (v.e == null) return { html: caixa('aviso', 'Escolha o estágio.') };
    const i = Number(v.e), g = GDS[i];
    return { html: grande(i + 1, g[0], i >= 3 ? 'alerta' : ''), texto: 'Pela Escala de Deterioração Global de Reisberg, encontra-se no estágio ' + (i + 1) + ', ' + g[0].toLowerCase() + ': ' + g[1].charAt(0).toLowerCase() + g[1].slice(1) };
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
  ['critica', 'Crítica do quadro', ['com crítica sobre o próprio quadro', 'com crítica parcial sobre o próprio quadro', 'sem crítica sobre o próprio quadro']]
];
add({
  id: 'psiquico', grupos: ['interdicao'], nome: 'Exame psíquico (gerador de texto)',
  desc: 'Marque os achados e copie o parágrafo pronto para o laudo.',
  form: v => '<div class="ft-grid">' + campo('psiquico', 'sexo', 'Periciando(a)', { tipo: 'select', ops: [['m', 'Masculino'], ['f', 'Feminino']] }) + '</div><div class="ft-grid">' +
    PSI.map(p => campo('psiquico', p[0], p[1], { tipo: 'select', ops: [['', 'Selecione']].concat(p[2].map((o, i) => [String(i), o.replace(/\{o\}/g, 'o')])) })).join('') + '</div>' +
    campo('psiquico', 'obs', 'Observações a acrescentar', { tipo: 'textarea', cls: 'largo' }),
  res: v => {
    const g = s => s.replace(/\{o\}/g, v.sexo === 'f' ? 'a' : 'o');
    const p = {}; let falta = 0;
    PSI.forEach(x => { if (v[x[0]] === '' || v[x[0]] == null) { falta++; p[x[0]] = ''; } else p[x[0]] = g(x[2][Number(v[x[0]])]); });
    if (falta) return { html: caixa('aviso', 'Faltam ' + falta + ' campo(s). O texto aparece quando todos estiverem marcados.') };
    let t = 'Ao exame psíquico, apresentava-se ' + p.apres + ', ' + p.consc + ', ' + p.atit + ' e ' + p.ori + '. ' +
      cap(p.aten) + ' e ' + p.mem + '. ' + cap(p.pens) + ', ' + p.senso + '. ' + cap(p.humor) + ' e ' + p.afeto + '. ' +
      cap(p.ling) + ' e ' + p.psico + '. ' + cap(p.intel) + '. ' + cap(p.juizo) + ', ' + p.critica + '.';
    if (v.obs && v.obs.trim()) t += ' ' + v.obs.trim();
    return { html: '<div class="ft-texto">' + esc(t) + '</div>', texto: t };
  }
});

/* ---------------------------------------------------------------------
   AUXÍLIO-ACIDENTE
   --------------------------------------------------------------------- */
const MOV = [
  ['Ombro', [['omb_flex', 'Flexão', 180], ['omb_ext', 'Extensão', 60], ['omb_abd', 'Abdução', 180], ['omb_ri', 'Rotação interna', 70], ['omb_re', 'Rotação externa', 90]]],
  ['Cotovelo', [['cot_flex', 'Flexão', 150]]],
  ['Antebraço', [['ant_pro', 'Pronação', 80], ['ant_sup', 'Supinação', 80]]],
  ['Punho', [['pun_flex', 'Flexão', 80], ['pun_ext', 'Extensão', 70], ['pun_rad', 'Desvio radial', 20], ['pun_uln', 'Desvio ulnar', 30]]],
  ['Mão', [['mcf_flex', 'Flexão metacarpofalângica', 90], ['ifp_flex', 'Flexão interfalângica proximal', 100], ['ifd_flex', 'Flexão interfalângica distal', 90], ['pol_mcf', 'Polegar, flexão metacarpofalângica', 50], ['pol_if', 'Polegar, flexão interfalângica', 80]]],
  ['Quadril', [['qua_flex', 'Flexão', 120], ['qua_ext', 'Extensão', 30], ['qua_abd', 'Abdução', 45], ['qua_adu', 'Adução', 30], ['qua_ri', 'Rotação interna', 45], ['qua_re', 'Rotação externa', 45]]],
  ['Joelho', [['joe_flex', 'Flexão', 135]]],
  ['Tornozelo', [['tor_dor', 'Dorsiflexão', 20], ['tor_pla', 'Flexão plantar', 50], ['tor_inv', 'Inversão', 35], ['tor_eve', 'Eversão', 15]]],
  ['Coluna cervical', [['cer_flex', 'Flexão', 45], ['cer_ext', 'Extensão', 45], ['cer_inc', 'Inclinação lateral', 45], ['cer_rot', 'Rotação', 60]]],
  ['Coluna toracolombar', [['lom_flex', 'Flexão', 80], ['lom_ext', 'Extensão', 25], ['lom_inc', 'Inclinação lateral', 35], ['lom_rot', 'Rotação', 45]]]
];
const MOVI = {}; MOV.forEach(g => g[1].forEach(m => { MOVI[m[0]] = { art: g[0], nome: m[1], ref: m[2] }; }));
const LADOS = [['D', 'direito'], ['E', 'esquerdo'], ['', 'sem lado']];
function grauA3(red) { if (!Number.isFinite(red)) return ''; if (red <= 0) return 'sem redução'; if (red <= 1 / 3) return 'grau mínimo'; if (red <= 2 / 3) return 'grau médio'; return 'grau máximo'; }
function ladoTxt(art, l) { const lt = (LADOS.find(x => x[0] === l) || LADOS[2])[1]; if (/Coluna/.test(art) || !l) return art.toLowerCase(); const fem = /Mão|Coluna/.test(art); return art.toLowerCase() + ' ' + (fem ? lt.replace(/o$/, 'a') : lt); }

add({
  id: 'gonio', grupos: ['acidente', 'dano'], nome: 'Goniometria',
  desc: 'Arco medido, comparado à referência e ao lado oposto, com o grau da Nota 1 do Quadro 6 do Anexo III.',
  form: v => {
    const L = v.linhas || (v.linhas = []);
    let h = '<div class="ft-grid">' + campo('gonio', 'base', 'Calcular a redução sobre', { tipo: 'select', ops: [['ref', 'Valor de referência'], ['contra', 'Lado contralateral (quando informado)']] }) + '</div>';
    h += '<div class="ft-add"><select id="ft-gonio-art" aria-label="Articulação"><option value="">+ Articulação inteira...</option>' + MOV.map((g, i) => '<option value="' + i + '">' + esc(g[0]) + '</option>').join('') + '</select>' +
      '<select id="ft-gonio-novo" aria-label="Movimento"><option value="">+ Um movimento...</option>' +
      MOV.map(g => '<optgroup label="' + esc(g[0]) + '">' + g[1].map(m => '<option value="' + m[0] + '">' + esc(g[0] + ', ' + m[1].toLowerCase()) + '</option>').join('') + '</optgroup>').join('') +
      '</select></div>';
    if (!L.length) return h + '<p class="ft-vazio">Escolha um movimento acima para começar.</p>';
    h += '<div class="ft-linhas">' + L.map((r, i) => {
      const m = MOVI[r.mov];
      return '<div class="ft-linha"><div class="ft-linha-rot"><b>' + esc(m.art) + '</b> ' + esc(m.nome.toLowerCase()) + '</div>' +
        '<select id="ft-g-' + i + '-lado" data-ftg="' + i + '" data-c="lado" aria-label="Lado">' + LADOS.map(l => '<option value="' + l[0] + '"' + (r.lado === l[0] ? ' selected' : '') + '>' + (l[0] ? 'Lado ' + l[1] : 'Sem lado') + '</option>').join('') + '</select>' +
        '<label>Medido<input id="ft-g-' + i + '-med" data-ftg="' + i + '" data-c="med" inputmode="decimal" value="' + esc(r.med || '') + '"></label>' +
        '<label>Oposto<input id="ft-g-' + i + '-contra" data-ftg="' + i + '" data-c="contra" inputmode="decimal" value="' + esc(r.contra || '') + '"></label>' +
        '<label>Referência<input id="ft-g-' + i + '-ref" data-ftg="' + i + '" data-c="ref" inputmode="decimal" value="' + esc(r.ref != null && r.ref !== '' ? r.ref : m.ref) + '"></label>' +
        '<button type="button" class="btn pequeno" data-ftacao="gonio-del" data-i="' + i + '" aria-label="Remover">✕</button></div>';
    }).join('') + '</div>';
    return h + caixa('dica', 'Valores em graus, a partir da posição neutra. Referências da AAOS, editáveis em cada linha.');
  },
  res: v => {
    const L = v.linhas || [];
    if (!L.length) return { html: caixa('aviso', 'Nenhum movimento adicionado.') };
    const rows = [], frases = {};
    L.forEach(r => {
      const m = MOVI[r.mov], med = num(r.med), con = num(r.contra), ref = num(r.ref != null && r.ref !== '' ? r.ref : m.ref);
      if (!Number.isFinite(med)) { rows.push('<tr><td>' + esc(cap(ladoTxt(m.art, r.lado)) + ', ' + m.nome.toLowerCase()) + '</td><td colspan="4" class="suave">sem valor</td></tr>'); return; }
      const baseV = v.base === 'contra' && Number.isFinite(con) && con > 0 ? con : ref;
      const red = baseV > 0 ? Math.max(0, 1 - med / baseV) : NaN;
      const gr = grauA3(red);
      rows.push('<tr><td>' + esc(cap(ladoTxt(m.art, r.lado))) + ', ' + esc(m.nome.toLowerCase()) + '</td><td class="n">' + fmt(med, 0) + '°</td><td class="n">' + (Number.isFinite(con) ? fmt(con, 0) + '°' : '') + '</td><td class="n">' + pct(red) + '</td><td>' + tag(red > 1 / 3 ? 'alerta' : 'ok', gr) + '</td></tr>');
      const chave = (/Mão|Coluna/.test(m.art) ? 'na ' : 'no ') + ladoTxt(m.art, r.lado);
      const compar = baseV === ref ? 'ao arco de referência de ' + fmt(ref, 0) + ' graus' : 'ao lado oposto';
      (frases[chave] = frases[chave] || []).push(m.nome.toLowerCase() + ' de 0 a ' + fmt(med, 0) + ' graus' + (Number.isFinite(con) ? ', contra 0 a ' + fmt(con, 0) + ' graus no lado oposto' : '') + (red > 0 ? ', redução de ' + pct(red) + ' em relação ' + compar + ', ' + gr : ', sem redução em relação ' + compar));
    });
    const html = '<div class="ft-tabwrap"><table class="ft-tab"><tr><th>Movimento</th><th>Medido</th><th>Oposto</th><th>Redução</th><th>Anexo III</th></tr>' + rows.join('') + '</table></div>' +
      caixa('dica', 'Nota 1 do Quadro 6: grau mínimo, redução de até 1/3 da amplitude normal; grau médio, mais de 1/3 até 2/3; grau máximo, acima de 2/3.');
    const partes = Object.keys(frases).map(k => k + ', ' + frases[k].join('; '));
    const texto = partes.length ? 'À goniometria, ' + partes.map((x, i) => i ? cap(x) : x).join('. ') + '. A graduação da redução segue a Nota 1 do Quadro 6 do Anexo III do Decreto 3.048/1999.' : '';
    return { html, texto };
  },
  acao: (a, ds, v) => {
    if (a === 'gonio-del') { v.linhas.splice(Number(ds.i), 1); return true; }
  }
});

const FORCA_SEG = [
  ['Membro superior', [['abd_omb', 'Abdução do ombro'], ['flex_cot', 'Flexão do cotovelo'], ['ext_cot', 'Extensão do cotovelo'], ['ext_pun', 'Extensão do punho'], ['flex_ded', 'Flexão dos dedos (preensão)'], ['opo_pol', 'Oponência do polegar']]],
  ['Membro inferior', [['flex_qua', 'Flexão do quadril'], ['ext_joe', 'Extensão do joelho'], ['flex_joe', 'Flexão do joelho'], ['dor_tor', 'Dorsiflexão do tornozelo'], ['pla_tor', 'Flexão plantar'], ['ext_hal', 'Extensão do hálux']]]
];
const FORCA_GR = [['5', 'Normal', '100%', 'amplitude completa contra a gravidade e contra grande resistência'], ['4', 'Bom', '75%', 'amplitude completa contra a gravidade e contra alguma resistência'], ['3', 'Sofrível', '50%', 'amplitude completa contra a gravidade, sem resistência'], ['2', 'Pobre', '25%', 'amplitude completa com a gravidade eliminada'], ['1', 'Traços', '10%', 'leve contração, sem movimento articular'], ['0', 'Zero', '0%', 'nenhuma contração']];
add({
  id: 'forca', grupos: ['acidente'], nome: 'Força muscular (Quadro 8)',
  desc: 'Graus de 0 a 5 da carta de desempenho muscular adotada no Anexo III.',
  form: v => FORCA_SEG.map(g => '<h3 class="ft-sub">' + g[0] + '</h3><div class="ft-forca"><span></span><b>Direito</b><b>Esquerdo</b>' + g[1].map(s => '<span>' + esc(s[1]) + '</span>' +
    ['D', 'E'].map(l => { const k = s[0] + '_' + l, val = V('forca')[k] || ''; return '<select id="ft-forca-' + k + '" data-ft="forca" data-k="' + k + '" aria-label="' + esc(s[1] + ' ' + l) + '"><option value="">-</option>' + FORCA_GR.map(gr => '<option value="' + gr[0] + '"' + (val === gr[0] ? ' selected' : '') + '>' + gr[0] + '</option>').join('') + '</select>'; }).join('')).join('') + '</div>').join('') +
    '<table class="ft-tab ft-ref"><tr><th>Grau</th><th></th><th></th><th>Descrição</th></tr>' + FORCA_GR.map(g => '<tr><td>' + g[0] + '</td><td>' + g[1] + '</td><td>' + g[2] + '</td><td>' + g[3] + '</td></tr>').join('') + '</table>',
  res: v => {
    const itens = [];
    FORCA_SEG.forEach(g => g[1].forEach(s => ['D', 'E'].forEach(l => { const x = v[s[0] + '_' + l]; if (x !== '' && x != null) itens.push({ s: s[1], l, g: Number(x) }); })));
    if (!itens.length) return { html: caixa('aviso', 'Marque o grau de pelo menos um grupo muscular.') };
    const red = itens.filter(i => i.g < 5), sof = itens.filter(i => i.g <= 3);
    const html = (sof.length ? caixa('alerta', sof.length + ' grupo(s) em grau sofrível ou inferior: situação descrita no Quadro 8.') : caixa('ok', 'Nenhum grupo em grau sofrível ou inferior.')) +
      caixa('dica', 'O Quadro 8 vale para comprometimento muscular ou neurológico. Lesões articulares e perdas anatômicas seguem os quadros próprios.');
    const desc = i => i.s.toLowerCase() + ' ' + (i.l === 'D' ? 'à direita' : 'à esquerda') + ' grau ' + i.g;
    const texto = red.length ? 'Ao exame da força muscular, graduada de 0 a 5, observou-se ' + listaE(red.map(desc)) + ', com os demais grupos avaliados em grau 5.' + (sof.length ? ' Há redução em grau sofrível ou inferior da classificação de desempenho muscular referida no Quadro 8 do Anexo III do Decreto 3.048/1999.' : '') : 'Força muscular grau 5 em todos os grupos avaliados.';
    return { html, texto };
  }
});

const FREQ = ['500', '1000', '2000', '3000'];
function grauAud(m) { if (!Number.isFinite(m)) return ''; if (m <= 25) return 'audição normal'; if (m <= 40) return 'redução em grau mínimo'; if (m <= 70) return 'redução em grau médio'; if (m <= 90) return 'redução em grau máximo'; return 'perda da audição'; }
add({
  id: 'audio', grupos: ['acidente'], nome: 'Audiometria (Quadro 2)',
  desc: 'Média de 500, 1.000, 2.000 e 3.000 Hz por via aérea e enquadramento do Quadro 2.',
  form: v => '<div class="ft-audio"><span></span>' + FREQ.map(f => '<b>' + f + ' Hz</b>').join('') + '<b>4000 Hz</b>' +
    ['od', 'oe'].map(o => '<span>' + (o === 'od' ? 'Orelha direita' : 'Orelha esquerda') + '</span>' + FREQ.concat(['4000']).map(f => { const k = o + f; return '<input id="ft-audio-' + k + '" data-ft="audio" data-k="' + k + '" inputmode="decimal" value="' + esc(V('audio')[k] || '') + '" aria-label="' + o + ' ' + f + '">'; }).join('')).join('') + '</div>' +
    '<div class="ft-grid">' + campo('audio', 'acid', 'Orelha acidentada', { tipo: 'select', ops: [['', 'Selecione'], ['od', 'Direita'], ['oe', 'Esquerda'], ['ambas', 'Ambas']] }) + '</div>' +
    caixa('dica', 'Limiares em dB, via aérea. 4.000 Hz entra só como registro, fora da média do Anexo III.'),
  res: v => {
    const med = o => { const a = FREQ.map(f => num(v[o + f])); return a.every(Number.isFinite) ? soma(a) / 4 : NaN; };
    const md = med('od'), me = med('oe');
    if (!Number.isFinite(md) && !Number.isFinite(me)) return { html: caixa('aviso', 'Preencha as quatro frequências de pelo menos uma orelha.') };
    let html = '<div class="ft-dupla">' + grande(Number.isFinite(md) ? fmt(md, 1) + ' dB' : '-', 'OD: ' + (grauAud(md) || 'sem dados')) + grande(Number.isFinite(me) ? fmt(me, 1) + ' dB' : '-', 'OE: ' + (grauAud(me) || 'sem dados')) + '</div>';
    html += '<table class="ft-tab ft-ref"><tr><th>Média</th><th>Classificação do Anexo III</th></tr><tr><td>até 25 dB</td><td>normal</td></tr><tr><td>26 a 40 dB</td><td>grau mínimo</td></tr><tr><td>41 a 70 dB</td><td>grau médio</td></tr><tr><td>71 a 90 dB</td><td>grau máximo</td></tr><tr><td>acima de 90 dB</td><td>perda da audição</td></tr></table>';
    const ac = v.acid; let enq = [];
    const medOu = o => o === 'od' ? md : me, outra = o => o === 'od' ? 'oe' : 'od';
    if (ac === 'ambas') { if (md > 90) enq.push('a (orelha direita)'); if (me > 90) enq.push('a (orelha esquerda)'); if (md > 40 && me > 40) enq.push('b'); }
    else if (ac) { if (medOu(ac) > 90) enq.push('a'); if (medOu(ac) > 40 && medOu(outra(ac)) > 40) enq.push('c'); }
    const faltaOutra = ac && ac !== 'ambas' && medOu(ac) > 40 && !Number.isFinite(medOu(outra(ac)));
    if (ac === 'ambas' && (!Number.isFinite(md) || !Number.isFinite(me))) html += caixa('aviso', 'Preencha as duas orelhas.');
    else if (faltaOutra && !enq.length) html += caixa('aviso', 'Preencha a outra orelha para avaliar a alínea c.');
    else if (ac) html += caixa(enq.length ? 'alerta' : 'ok', enq.length ? 'Situação descrita no Quadro 2, ' + alin(enq) + '.' : 'Os valores não correspondem às situações listadas no Quadro 2.');
    html += caixa('dica', 'Quadro 2: a) perda da audição na orelha acidentada; b) redução em grau médio ou superior nas duas, quando ambas acidentadas; c) redução em grau médio ou superior na acidentada, com a outra também em grau médio ou superior.');
    const fr = (o, m) => Number.isFinite(m) ? 'à ' + (o === 'od' ? 'direita' : 'esquerda') + ', média de ' + fmt(m, 1) + ' dB, ' + grauAud(m) : '';
    const texto = 'A audiometria tonal, por via aérea, nas frequências de 500, 1.000, 2.000 e 3.000 Hz, evidencia ' + [fr('od', md), fr('oe', me)].filter(Boolean).join('; ') + ', segundo a graduação do Quadro 2 do Anexo III do Decreto 3.048/1999.' + (ac && enq.length ? ' O achado corresponde ' + corresp(enq) + ' do referido quadro.' : '');
    return { html, texto };
  }
});

function av(s) { if (s == null || String(s).trim() === '') return NaN; s = String(s).trim().replace(',', '.'); const m = /^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/.exec(s); if (m) return Number(m[1]) / Number(m[2]); return Number(s); }
add({
  id: 'visao', grupos: ['acidente'], nome: 'Acuidade visual (Quadro 1)',
  desc: 'Acuidade corrigida em decimal ou Snellen (20/100) e enquadramento do Quadro 1.',
  form: v => '<div class="ft-grid">' + campo('visao', 'od', 'Olho direito, corrigida', { ph: '0,2 ou 20/100' }) + campo('visao', 'oe', 'Olho esquerdo, corrigida', { ph: '0,8 ou 20/25' }) +
    campo('visao', 'acid', 'Olho acidentado', { tipo: 'select', ops: [['', 'Selecione'], ['od', 'Direito'], ['oe', 'Esquerdo'], ['ambos', 'Ambos']] }) + '</div>' +
    campo('visao', 'musc', 'Lesão da musculatura extrínseca, com paresia ou paralisia', { tipo: 'check' }) + campo('visao', 'lacr', 'Lesão bilateral das vias lacrimais, ou unilateral com fístula', { tipo: 'check' }),
  res: v => {
    const d = av(v.od), e = av(v.oe);
    let html = '<div class="ft-dupla">' + grande(Number.isFinite(d) ? fmt(d, 2) : '-', 'OD, decimal') + grande(Number.isFinite(e) ? fmt(e, 2) : '-', 'OE, decimal') + '</div>';
    const enq = [], ac = v.acid;
    const va = o => o === 'od' ? d : e, out = o => o === 'od' ? 'oe' : 'od';
    if (ac === 'ambos') { if (d <= 0.2) enq.push('a (olho direito)'); if (e <= 0.2) enq.push('a (olho esquerdo)'); if (d <= 0.5 && e <= 0.5) enq.push('b'); }
    else if (ac) { if (va(ac) <= 0.2) enq.push('a'); if (va(ac) <= 0.5 && va(out(ac)) <= 0.5) enq.push('c'); }
    if (v.musc === true) enq.push('d'); if (v.lacr === true) enq.push('e');
    if (ac || enq.length) html += caixa(enq.length ? 'alerta' : 'ok', enq.length ? 'Situação descrita no Quadro 1, ' + alin(enq) + '.' : 'Sem correspondência com as situações do Quadro 1.');
    html += caixa('dica', 'Quadro 1: a) acuidade corrigida até 0,2 no olho acidentado; b) até 0,5 em ambos, quando ambos acidentados; c) até 0,5 no acidentado com o outro também até 0,5; d) musculatura extrínseca; e) vias lacrimais. Escala de Wecker, em décimos, após correção.');
    const t = [];
    if (Number.isFinite(d)) t.push('olho direito ' + fmt(d, 2));
    if (Number.isFinite(e)) t.push('olho esquerdo ' + fmt(e, 2));
    const texto = t.length ? 'A acuidade visual com a melhor correção é de ' + listaE(t) + ', em escala decimal.' + (enq.length ? ' O achado corresponde ' + corresp(enq) + ' do Quadro 1 do Anexo III do Decreto 3.048/1999.' : '') : '';
    return { html, texto };
  }
});

add({
  id: 'encurt', grupos: ['acidente', 'dano'], nome: 'Encurtamento de membro inferior (Quadro 7)',
  desc: 'Comprimento real, da espinha ilíaca anterossuperior ao maléolo medial.',
  form: v => '<div class="ft-grid">' + campo('encurt', 'd', 'Membro inferior direito', { dec: true, suf: 'cm' }) + campo('encurt', 'e', 'Membro inferior esquerdo', { dec: true, suf: 'cm' }) + '</div>' +
    campo('encurt', 'bacia', 'Há lesão prévia de bacia a considerar', { tipo: 'check' }),
  res: v => {
    const d = num(v.d), e = num(v.e);
    if (!Number.isFinite(d) || !Number.isFinite(e)) return { html: caixa('aviso', 'Informe as duas medidas.') };
    const dif = Math.abs(d - e), lado = d < e ? 'direito' : 'esquerdo';
    const sit = dif > 4;
    return {
      html: grande(fmt(dif, 1) + ' cm', dif ? 'encurtamento do membro ' + lado : 'sem diferença', sit ? 'alerta' : '') + caixa(sit ? 'alerta' : 'ok', sit ? 'Acima de 4 cm: situação descrita no Quadro 7.' : 'Até 4 cm: abaixo do limite do Quadro 7.') + (v.bacia === true ? caixa('aviso', 'A Nota do Quadro 7 manda considerar a lesão prévia de bacia na avaliação.') : ''),
      texto: 'A mensuração do comprimento real dos membros inferiores, da espinha ilíaca anterossuperior ao maléolo medial, foi de ' + fmt(d, 1) + ' cm à direita e ' + fmt(e, 1) + ' cm à esquerda' + (dif ? ', com encurtamento de ' + fmt(dif, 1) + ' cm do membro inferior ' + lado : ', sem discrepância') + '.' + (sit ? ' O encurtamento é superior a 4 cm, situação descrita no Quadro 7 do Anexo III do Decreto 3.048/1999.' : '')
    };
  }
});

const ANEXO3 = [
  ['1', 'Aparelho visual', ['a) acuidade visual, após correção, igual ou inferior a 0,2 no olho acidentado;', 'b) acuidade visual, após correção, igual ou inferior a 0,5 em ambos os olhos, quando ambos tiverem sido acidentados;', 'c) acuidade visual, após correção, igual ou inferior a 0,5 no olho acidentado, quando a do outro olho for igual a 0,5 ou menos, após correção;', 'd) lesão da musculatura extrínseca do olho, acarretando paresia ou paralisia;', 'e) lesão bilateral das vias lacrimais, com ou sem fístulas, ou unilateral com fístula.'],
    ['Nota 1: a acuidade visual restante é avaliada pela escala de Wecker, em décimos, e após a correção por lentes.', 'Nota 2: a nubécula e o leucoma são analisados em função da redução da acuidade ou do prejuízo estético que acarretam, de acordo com os quadros respectivos.']],
  ['2', 'Aparelho auditivo (trauma acústico)', ['a) perda da audição no ouvido acidentado;', 'b) redução da audição em grau médio ou superior em ambos os ouvidos, quando os dois tiverem sido acidentados;', 'c) redução da audição, em grau médio ou superior, no ouvido acidentado, quando a audição do outro estiver também reduzida em grau médio ou superior.'],
    ['Nota: audiometria por via aérea, nas frequências de 500, 1.000, 2.000 e 3.000 Hz; a redução em cada ouvido é a média aritmética dos valores em decibéis nessas frequências.', 'Audição normal até 25 dB; grau mínimo de 26 a 40 dB; grau médio de 41 a 70 dB; grau máximo de 71 a 90 dB; perda da audição acima de 90 dB.']],
  ['3', 'Aparelho da fonação', ['Perturbação da palavra em grau médio ou máximo, desde que comprovada por métodos clínicos objetivos.'], []],
  ['4', 'Prejuízo estético', ['Prejuízo estético em grau médio ou máximo, quando atingidos crânio e/ou face e/ou pescoço, ou perda de dentes quando houver também deformação da arcada dentária que impeça o uso de prótese.'],
    ['Nota 1: só é considerada a lesão que acarreta modificação estética apreciável e desagradável do segmento atingido, levando em conta sexo, idade e profissão.', 'Nota 2: perda anatômica de membro, redução de movimentos articulares ou alteração da capacidade funcional de membro não são prejuízo estético, podendo ser enquadradas nos quadros respectivos.']],
  ['5', 'Perdas de segmentos de membros', ['a) perda de segmento ao nível ou acima do carpo;', 'b) perda de segmento do primeiro quirodáctilo, desde que atingida a falange proximal;', 'c) perda de segmentos de dois quirodáctilos, desde que atingida a falange proximal em pelo menos um deles;', 'd) perda de segmento do segundo quirodáctilo, desde que atingida a falange proximal;', 'e) perda de segmento de três ou mais falanges, de três ou mais quirodáctilos;', 'f) perda de segmento ao nível ou acima do tarso;', 'g) perda de segmento do primeiro pododáctilo, desde que atingida a falange proximal;', 'h) perda de segmento de dois pododáctilos, desde que atingida a falange proximal em ambos;', 'i) perda de segmento de três ou mais falanges, de três ou mais pododáctilos.'],
    ['Nota: para efeito de enquadramento, a perda parcial de parte óssea de um segmento equivale à perda do segmento. A perda parcial de partes moles sem perda de parte óssea não é considerada.']],
  ['6', 'Alterações articulares', ['a) redução em grau médio ou superior dos movimentos da mandíbula;', 'b) redução em grau máximo dos movimentos do segmento cervical da coluna vertebral;', 'c) redução em grau máximo dos movimentos do segmento lombo-sacro da coluna vertebral;', 'd) redução em grau médio ou superior dos movimentos das articulações do ombro ou do cotovelo;', 'e) redução em grau médio ou superior dos movimentos de pronação e/ou de supinação do antebraço;', 'f) redução em grau máximo dos movimentos do primeiro e/ou do segundo quirodáctilo, desde que atingidas as articulações metacarpofalangeana e falange-falangeana;', 'g) redução em grau médio ou superior dos movimentos das articulações coxofemoral e/ou joelho, e/ou tíbio-társica.'],
    ['Nota 1: grau máximo, redução acima de dois terços da amplitude normal do movimento; grau médio, mais de um terço e até dois terços; grau mínimo, até um terço.', 'Nota 2: a redução de movimentos do cotovelo, da pronação e supinação, do punho, do joelho e do tíbio-társico, secundária a fratura de osso longo consolidada em posição viciosa com desvio de eixo, também é enquadrada dentro desses limites.']],
  ['7', 'Encurtamento de membro inferior', ['Encurtamento de mais de 4 cm.'], ['Nota: a preexistência de lesão de bacia deve ser considerada na avaliação do encurtamento.']],
  ['8', 'Redução da força e/ou da capacidade funcional dos membros', ['a) da mão, do punho, do antebraço ou de todo o membro superior, em grau sofrível ou inferior da classificação de desempenho muscular;', 'b) do primeiro quirodáctilo, em grau sofrível ou inferior;', 'c) do pé, da perna ou de todo o membro inferior, em grau sofrível ou inferior.'],
    ['Nota 1: aplica-se a comprometimento muscular ou neurológico; não se aplica a lesões articulares ou perdas anatômicas dos quadros próprios.', 'Nota 2: carta de desempenho muscular da National Foundation for Infantile Paralysis: grau 5 normal 100%; 4 bom 75%; 3 sofrível 50%; 2 pobre 25%; 1 traços 10%; 0 zero; E ou EG espasmo; C ou CG contratura.']],
  ['9', 'Outros aparelhos e sistemas', ['a) segmentectomia pulmonar que acarrete redução em grau médio ou superior da capacidade funcional respiratória, devidamente correlacionada à atividade laborativa;', 'b) perda de segmento do aparelho digestivo cuja localização ou extensão traga repercussões sobre a nutrição e o estado geral.'], []]
];
add({
  id: 'anexo3', grupos: ['acidente'], nome: 'Anexo III do Decreto 3.048/1999',
  desc: 'Os nove quadros de situações, para consulta rápida durante o laudo.',
  form: v => campo('anexo3', 'q', 'Filtrar', { ph: 'ex.: ombro, audição, falange' }),
  res: v => {
    const q = (v.q || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const qs = ANEXO3.filter(x => !q || norm(x[1] + ' ' + x[2].join(' ') + ' ' + x[3].join(' ')).indexOf(q) >= 0);
    return {
      html: '<p class="ft-nota">O art. 104 do Regulamento prevê o auxílio-acidente quando a sequela definitiva, a exemplo das situações do Anexo III, implique redução da capacidade para o trabalho habitual. O anexo traz exemplos, e a análise é sempre do caso concreto.</p>' +
        (qs.length ? qs.map(x => '<div class="ft-quadro"><h3>Quadro ' + x[0] + '. ' + esc(x[1]) + '</h3><ul>' + x[2].map(i => '<li>' + esc(i) + '</li>').join('') + '</ul>' + x[3].map(n => '<p class="ft-nota">' + esc(n) + '</p>').join('') + '</div>').join('') : '<p class="ft-vazio">Nada encontrado.</p>')
    };
  },
  largo: true
});

add({
  id: 'datas', grupos: ['acidente', 'geral', 'dano'], nome: 'Linha do tempo e datas',
  desc: 'Idade, tempo desde o acidente, duração do afastamento e intervalos até a perícia.',
  form: v => '<div class="ft-grid">' + campo('datas', 'nasc', 'Nascimento', { tipo: 'date' }) + campo('datas', 'acid', 'Acidente ou início da doença', { tipo: 'date' }) +
    campo('datas', 'dib', 'Início do afastamento ou benefício', { tipo: 'date' }) + campo('datas', 'dcb', 'Cessação do benefício', { tipo: 'date' }) +
    campo('datas', 'cons', 'Consolidação estimada', { tipo: 'date' }) + campo('datas', 'per', 'Data da perícia', { tipo: 'date', padrao: iso(hoje()) }) + '</div>',
  res: v => {
    const D = k => dataISO(v[k]);
    const nasc = D('nasc'), acid = D('acid'), dib = D('dib'), dcb = D('dcb'), cons = D('cons'), per = D('per') || hoje();
    const lin = [];
    if (nasc) { lin.push(['Idade na perícia', txtYMD(difYMD(nasc, per))]); if (acid) lin.push(['Idade no acidente', txtYMD(difYMD(nasc, acid))]); }
    if (acid) lin.push(['Do acidente até a perícia', txtYMD(difYMD(acid, per))]);
    if (dib && dcb) lin.push(['Duração do afastamento', txtYMD(difYMD(dib, dcb)) + ' (' + (difDias(dib, dcb) + 1) + ' dias)']);
    if (acid && dib) lin.push(['Do acidente ao afastamento', difDias(acid, dib) + ' dias']);
    if (dcb) lin.push(['Da cessação até a perícia', txtYMD(difYMD(dcb, per))]);
    if (acid && cons) lin.push(['Do acidente à consolidação', txtYMD(difYMD(acid, cons))]);
    if (!lin.length) return { html: caixa('aviso', 'Preencha as datas que tiver.') };
    const ev = [[nasc, 'Nascimento'], [acid, 'Acidente'], [dib, 'Início do afastamento'], [dcb, 'Cessação do benefício'], [cons, 'Consolidação'], [per, 'Perícia']].filter(x => x[0]).sort((a, b) => a[0] - b[0]);
    const html = '<table class="ft-tab">' + lin.map(l => '<tr><td>' + l[0] + '</td><td><b>' + l[1] + '</b></td></tr>').join('') + '</table>' +
      '<ol class="ft-linha-tempo">' + ev.map(e => '<li><b>' + br(e[0]) + '</b> ' + e[1] + '</li>').join('') + '</ol>';
    const t = [];
    if (nasc) t.push('idade de ' + difYMD(nasc, per).y + ' anos na data da perícia');
    if (acid) t.push('acidente em ' + br(acid) + ', há ' + txtYMD(difYMD(acid, per), true));
    if (dib && dcb) t.push('afastamento de ' + br(dib) + ' a ' + br(dcb));
    return { html, texto: t.length ? cap(t.join('; ')) + '.' : '' };
  }
});

/* ---------------------------------------------------------------------
   PÓS-BARIÁTRICA
   --------------------------------------------------------------------- */
add({
  id: 'ponderal', grupos: ['bariatrica'], nome: 'Dados ponderais',
  desc: 'IMC, perda total, perda do excesso de peso, reganho e tempo de estabilidade.',
  form: v => '<div class="ft-grid">' + campo('ponderal', 'alt', 'Altura', { dec: true, suf: 'm ou cm' }) + campo('ponderal', 'pre', 'Peso antes da cirurgia', { dec: true, suf: 'kg' }) +
    campo('ponderal', 'min', 'Menor peso após a cirurgia', { dec: true, suf: 'kg' }) + campo('ponderal', 'atual', 'Peso atual (medido)', { dec: true, suf: 'kg' }) +
    campo('ponderal', 'cir', 'Data da bariátrica', { tipo: 'date' }) + campo('ponderal', 'est', 'Peso estável desde', { tipo: 'date' }) +
    campo('ponderal', 'per', 'Data da perícia', { tipo: 'date', padrao: iso(hoje()) }) + campo('ponderal', 'tec', 'Técnica', { tipo: 'select', ops: [['', 'Selecione'], ['bypass gástrico em Y de Roux', 'Bypass em Y de Roux'], ['gastrectomia vertical (sleeve)', 'Gastrectomia vertical'], ['banda gástrica ajustável', 'Banda gástrica'], ['derivação biliopancreática', 'Derivação biliopancreática'], ['outra técnica', 'Outra']] }) + '</div>',
  res: v => {
    let h = num(v.alt); if (h > 3) h = h / 100;
    const pre = num(v.pre), min = num(v.min), at = num(v.atual);
    if (!(h > 0) || !Number.isFinite(pre) || !Number.isFinite(at)) return { html: caixa('aviso', 'Informe altura, peso antes da cirurgia e peso atual.') };
    const imc = p => p / (h * h), ideal = 25 * h * h;
    const perda = pre - at, ptp = perda / pre, pep = perda / (pre - ideal);
    const reg = Number.isFinite(min) && at > min ? at - min : 0, regP = Number.isFinite(min) && pre > min ? reg / (pre - min) : NaN;
    const per = dataISO(v.per) || hoje(), cir = dataISO(v.cir), est = dataISO(v.est);
    let html = '<div class="ft-dupla">' + grande(fmt(imc(pre), 1), 'IMC antes') + grande(fmt(imc(at), 1), 'IMC atual', imc(at) >= 30 ? 'alerta' : '') + '</div>' +
      '<table class="ft-tab"><tr><td>Perda de peso</td><td class="n"><b>' + fmt(perda, 1) + ' kg</b></td></tr>' +
      '<tr><td>Perda total de peso (%PTP)</td><td class="n"><b>' + pct(ptp, 1) + '</b></td></tr>' +
      '<tr><td>Perda do excesso de peso (%PEP), ideal com IMC 25 = ' + fmt(ideal, 1) + ' kg</td><td class="n"><b>' + pct(pep, 1) + '</b></td></tr>' +
      (Number.isFinite(min) ? '<tr><td>IMC no menor peso</td><td class="n">' + fmt(imc(min), 1) + '</td></tr><tr><td>Reganho desde o menor peso</td><td class="n">' + fmt(reg, 1) + ' kg' + (Number.isFinite(regP) && reg ? ', ' + pct(regP, 0) + ' do peso perdido' : '') + '</td></tr>' : '') +
      (cir ? '<tr><td>Tempo desde a cirurgia</td><td class="n">' + txtYMD(difYMD(cir, per)) + '</td></tr>' : '') +
      (est ? '<tr><td>Tempo de estabilidade do peso</td><td class="n">' + txtYMD(difYMD(est, per)) + '</td></tr>' : '') + '</table>';
    html += caixa('dica', 'Perda ponderal maciça costuma ser definida na literatura de contorno corporal como perda de 50% ou mais do excesso de peso. Estabilidade do peso e IMC atual pesam na indicação e no risco cirúrgico.');
    const t = 'Cirurgia bariátrica' + (v.tec ? ', por ' + v.tec + ',' : '') + (cir ? ' realizada em ' + br(cir) : '') + ', com peso prévio referido de ' + fmt(pre, 1) + ' kg e IMC de ' + fmt(imc(pre), 1) + ' kg/m². ' +
      (Number.isFinite(min) ? 'Atingiu o menor peso de ' + fmt(min, 1) + ' kg. ' : '') +
      'Na perícia, pesava ' + fmt(at, 1) + ' kg, com altura de ' + fmt(h, 2) + ' m e IMC de ' + fmt(imc(at), 1) + ' kg/m², o que corresponde a perda de ' + fmt(perda, 1) + ' kg, ' + pct(ptp, 1) + ' do peso inicial e ' + pct(pep, 1) + ' do excesso de peso' + (reg ? ', com reganho de ' + fmt(reg, 1) + ' kg em relação ao menor peso' : '') + '.' +
      (est ? ' Refere peso estável há ' + txtYMD(difYMD(est, per), true) + '.' : '');
    return { html, texto: t };
  }
});

const PITT = [
  ['bra', 'Braços', ['Normal', 'Gordura com boa qualidade de pele', 'Pele flácida e pendente, sem grande volume de gordura', 'Pele flácida com grande volume de gordura']],
  ['mam', 'Mamas', ['Normal', 'Ptose de grau I ou II, ou mamas volumosas', 'Ptose de grau III, perda moderada de volume ou mama constrita', 'Abaulamento lateral importante e/ou perda acentuada de volume com pele flácida']],
  ['dor', 'Dorso', ['Normal', 'Prega única de gordura ou excesso de gordura', 'Múltiplas pregas de pele e gordura', 'Pregas pendentes']],
  ['abd', 'Abdome', ['Normal', 'Pele redundante com rugas finas, ou gordura moderada sem pendência', 'Pendência do abdome inferior (avental)', 'Múltiplas pregas ou plenitude do abdome superior']],
  ['fla', 'Flancos', ['Normal', 'Gordura', 'Pregas', 'Pregas pendentes']],
  ['nad', 'Nádegas', ['Normal', 'Gordura e/ou celulite leve a moderada', 'Gordura e/ou celulite acentuada', 'Pregas de pele']],
  ['mon', 'Monte púbico', ['Normal', 'Excesso de gordura', 'Ptose', 'Pendência importante abaixo da sínfise púbica']],
  ['qua', 'Quadris e face lateral das coxas', ['Normal', 'Gordura e/ou celulite leve a moderada', 'Gordura e/ou celulite acentuada', 'Pregas de pele']],
  ['coxm', 'Face medial das coxas', ['Normal', 'Excesso de gordura', 'Gordura e/ou celulite acentuada', 'Pregas de pele']],
  ['joe', 'Terço inferior das coxas e joelhos', ['Normal', 'Gordura', 'Gordura acentuada', 'Pregas de pele']]
];
const COMPL = [['intert', 'intertrigo ou dermatite nas pregas'], ['fung', 'infecção fúngica de repetição'], ['bact', 'infecção bacteriana ou ulceração'], ['odor', 'odor'], ['func', 'limitação funcional (higiene, marcha, vestuário, atividade física)']];
add({
  id: 'pittsburgh', grupos: ['bariatrica'], nome: 'Escala de Pittsburgh e achados por região',
  desc: 'Graus de 0 a 3 nas dez regiões, com as complicações cutâneas e funcionais encontradas.',
  form: v => PITT.map(r => '<div class="ft-regiao">' + opcoes('pittsburgh', r[0], r[1], r[2].map((d, i) => [i, d, i]), { col: true, re: true }) +
    (Number(V('pittsburgh')[r[0]]) > 0 ? '<div class="ft-compl">' + COMPL.map(c => campo('pittsburgh', r[0] + '_' + c[0], c[1], { tipo: 'check' })).join('') + '</div>' : '') + '</div>').join(''),
  res: v => {
    const marc = PITT.filter(r => v[r[0]] != null);
    if (!marc.length) return { html: caixa('aviso', 'Gradue as regiões examinadas.') };
    const tot = soma(marc.map(r => Number(v[r[0]])));
    const alt = marc.filter(r => Number(v[r[0]]) > 0);
    let html = grande(tot, 'pontos em ' + marc.length + ' de 10 regiões') +
      '<div class="ft-tabwrap"><table class="ft-tab"><tr><th>Região</th><th>Grau</th><th>Complicações</th></tr>' + alt.map(r => {
        const cs = COMPL.filter(c => v[r[0] + '_' + c[0]] === true).map(c => c[1]);
        return '<tr><td>' + r[1] + '</td><td class="n">' + v[r[0]] + '</td><td>' + (cs.length ? esc(cs.join('; ')) : '<span class="suave">nenhuma</span>') + '</td></tr>';
      }).join('') + '</table></div>' + caixa('dica', 'Escala de Pittsburgh (Song e cols., 2005): 0 normal; 1 a 3 deformidade crescente, com indicação cirúrgica correspondente.');
    const frases = alt.map(r => {
      const g = Number(v[r[0]]), cs = COMPL.filter(c => v[r[0] + '_' + c[0]] === true).map(c => c[1]);
      return r[1].toLowerCase() + ', grau ' + g + ', com ' + r[2][g].charAt(0).toLowerCase() + r[2][g].slice(1) + (cs.length ? ', apresentando ' + listaE(cs) : ', sem complicações cutâneas ou funcionais ao exame');
    });
    const sem = marc.filter(r => Number(v[r[0]]) === 0).map(r => r[1].toLowerCase());
    const texto = 'Ao exame, segundo a Escala de Pittsburgh para deformidades após grande perda ponderal: ' + (frases.length ? frases.join('; ') : 'sem deformidades nas regiões avaliadas') + '.' + (sem.length ? ' Sem alterações em ' + listaE(sem) + '.' : '');
    return { html, texto };
  }
});

add({
  id: 'dut', grupos: ['bariatrica'], nome: 'Diretriz da ANS para abdominoplastia',
  desc: 'Texto da DUT nº 18 do Anexo II da RN 465/2021 e pontos a documentar.',
  form: v => '<div class="ft-quadro"><h3>DUT 18. Abdominoplastia</h3><p>1. Cobertura obrigatória em casos de pacientes que apresentem abdome em avental decorrente de grande perda ponderal (em consequência de tratamento clínico para obesidade mórbida ou após cirurgia de redução de estômago).</p>' +
    '<p class="ft-nota">Na RN 465/2021 o procedimento abdominoplastia substituiu a dermolipectomia das normas anteriores. Nas versões anteriores (RN 387/2015 e RN 428/2017), a diretriz exigia também uma ou mais complicações: candidíase de repetição, infecções bacterianas por escoriações de atrito, odor fétido, hérnias. Confira a versão vigente na data do pedido no site da ANS.</p></div>' +
    '<h3 class="ft-sub">Achados a documentar</h3>' +
    [['avental', 'Abdome em avental (pendência do abdome inferior sobre o púbis)'], ['perda', 'Grande perda ponderal documentada (bariátrica ou tratamento clínico)'], ['estavel', 'Peso estável no período recente'], ['intert', 'Intertrigo ou dermatite de repetição'], ['cand', 'Candidíase de repetição'], ['infec', 'Infecções bacterianas por atrito'], ['odor', 'Odor fétido'], ['hernia', 'Hérnia da parede abdominal'], ['func', 'Limitação funcional para higiene, marcha ou vestuário'], ['trat', 'Tratamento clínico das complicações já realizado']]
      .map(x => campo('dut', x[0], x[1], { tipo: 'check' })).join(''),
  res: v => {
    const sim = k => v[k] === true;
    const comp = [['intert', 'intertrigo'], ['cand', 'candidíase de repetição'], ['infec', 'infecções bacterianas por atrito'], ['odor', 'odor fétido'], ['hernia', 'hérnia da parede abdominal']].filter(x => sim(x[0])).map(x => x[1]);
    const base = sim('avental') && sim('perda');
    const html = caixa(base ? 'ok' : 'aviso', base ? 'Os achados centrais da diretriz atual estão presentes: abdome em avental e grande perda ponderal.' : 'Para a diretriz atual, documente abdome em avental e grande perda ponderal.') +
      (comp.length ? caixa('dica', 'Complicações registradas: ' + comp.join(', ') + '.') : '');
    const t = 'Ao exame, ' + (sim('avental') ? 'constatou-se abdome em avental' : 'não se constatou abdome em avental') + ', em contexto de ' + (sim('perda') ? 'grande perda ponderal' : 'perda ponderal') + (sim('estavel') ? ', com peso estável' : '') + '.' +
      (comp.length ? ' Há registro de ' + listaE(comp) + '.' : ' Não foram constatadas complicações cutâneas associadas.') +
      (sim('func') ? ' O excesso cutâneo acarreta limitação funcional para atividades de higiene, marcha ou vestuário.' : '') + (sim('trat') ? ' Há documentação de tratamento clínico prévio das complicações.' : '');
    return { html, texto: t };
  }
});

/* ---------------------------------------------------------------------
   HOME CARE
   --------------------------------------------------------------------- */
add({ id: 'nead', grupos: ['homecare'], nome: 'Tabela NEAD', desc: 'Planejamento de atenção domiciliar (sua calculadora).', iframe: '../nead/index.html' });
add({ id: 'abemid', grupos: ['homecare'], nome: 'Tabela ABEMID', desc: 'Avaliação de complexidade assistencial (sua calculadora).', iframe: '../ABEMID/index.html' });

add(escala({
  id: 'braden', grupos: ['homecare'], nome: 'Escala de Braden',
  desc: 'Risco de lesão por pressão, de 6 a 23 pontos.', max: 23,
  itens: [
    { k: 'per', rot: 'Percepção sensorial', ops: [[1, 'Totalmente limitada'], [2, 'Muito limitada'], [3, 'Levemente limitada'], [4, 'Nenhuma limitação']] },
    { k: 'umi', rot: 'Umidade', ops: [[1, 'Constantemente úmida'], [2, 'Muito úmida'], [3, 'Ocasionalmente úmida'], [4, 'Raramente úmida']] },
    { k: 'ati', rot: 'Atividade', ops: [[1, 'Acamado'], [2, 'Confinado à cadeira'], [3, 'Anda ocasionalmente'], [4, 'Anda frequentemente']] },
    { k: 'mob', rot: 'Mobilidade', ops: [[1, 'Totalmente imóvel'], [2, 'Bastante limitada'], [3, 'Levemente limitada'], [4, 'Nenhuma limitação']] },
    { k: 'nut', rot: 'Nutrição', ops: [[1, 'Muito pobre'], [2, 'Provavelmente inadequada'], [3, 'Adequada'], [4, 'Excelente']] },
    { k: 'fri', rot: 'Fricção e cisalhamento', ops: [[1, 'Problema'], [2, 'Problema em potencial'], [3, 'Nenhum problema aparente']] }
  ],
  interpretar: t => {
    const c = t <= 9 ? 'risco muito alto' : t <= 12 ? 'risco alto' : t <= 14 ? 'risco moderado' : t <= 18 ? 'risco baixo' : 'sem risco';
    return { html: caixa(t <= 14 ? 'alerta' : 'ok', cap(c) + ' para lesão por pressão.') + caixa('dica', 'Faixas: 19 a 23 sem risco; 15 a 18 baixo; 13 e 14 moderado; 10 a 12 alto; até 9 muito alto.'), texto: 'Na Escala de Braden, obteve ' + t + ' pontos, compatível com ' + c + ' para lesão por pressão.' };
  }
}));

const KPS = [[100, 'Normal, sem queixas, sem evidência de doença', 0], [90, 'Capaz de atividade normal; sinais ou sintomas mínimos', 0], [80, 'Atividade normal com esforço; alguns sinais ou sintomas', 1], [70, 'Cuida de si, mas é incapaz de atividade normal ou trabalho', 1], [60, 'Requer assistência ocasional, cuida da maioria das necessidades', 2], [50, 'Requer assistência considerável e cuidados médicos frequentes', 2], [40, 'Incapacitado; requer cuidados e assistência especiais', 3], [30, 'Gravemente incapacitado; hospitalização indicada', 3], [20, 'Muito doente; tratamento de suporte ativo necessário', 4], [10, 'Moribundo', 4]];
add({
  id: 'kps', grupos: ['homecare'], nome: 'Karnofsky e ECOG',
  desc: 'Capacidade funcional global, com a correspondência aproximada para o ECOG.',
  form: v => opcoes('kps', 'k', 'Escala de Karnofsky', KPS.map((x, i) => [x[0], x[1], x[0] + '%']), { col: true }),
  res: v => {
    if (v.k == null) return { html: caixa('aviso', 'Escolha a descrição.') };
    const x = KPS[Number(v.k)];
    return { html: '<div class="ft-dupla">' + grande(x[0] + '%', 'Karnofsky') + grande(x[2], 'ECOG aproximado') + '</div>', texto: 'Apresenta escore de Karnofsky de ' + x[0] + '%, ' + x[1].charAt(0).toLowerCase() + x[1].slice(1) + ', correspondente a ECOG ' + x[2] + '.' };
  }
});

/* ---------------------------------------------------------------------
   ERRO MÉDICO E DANO CORPORAL
   --------------------------------------------------------------------- */
const DPV = [
  ['Danos corporais totais', [
    ['t1', 'Perda anatômica e/ou funcional completa de ambos os membros superiores ou inferiores', 100], ['t2', 'Perda anatômica e/ou funcional completa de ambas as mãos ou de ambos os pés', 100],
    ['t3', 'Perda anatômica e/ou funcional completa de um membro superior e de um membro inferior', 100], ['t4', 'Perda completa da visão em ambos os olhos (cegueira bilateral) ou cegueira legal bilateral', 100],
    ['t5', 'Lesões neurológicas com dano cognitivo-comportamental alienante, impedimento da orientação espacial ou do livre deslocamento, perda completa do controle esfincteriano ou comprometimento de função vital ou autonômica', 100],
    ['t6', 'Lesões de órgãos e estruturas craniofaciais, cervicais, torácicas, abdominais, pélvicas ou retroperitoneais com prejuízos funcionais não compensáveis, com comprometimento de função vital', 100]]],
  ['Danos segmentares, repercussão na íntegra do patrimônio físico', [
    ['s1', 'Perda anatômica e/ou funcional completa de um dos membros superiores e/ou de uma das mãos', 70], ['s2', 'Perda anatômica e/ou funcional completa de um dos membros inferiores', 70],
    ['s3', 'Perda anatômica e/ou funcional completa de um dos pés', 50], ['s4', 'Perda completa da mobilidade de um dos ombros, cotovelos, punhos ou dedo polegar', 25],
    ['s5', 'Perda completa da mobilidade de um quadril, joelho ou tornozelo', 25], ['s6', 'Perda anatômica e/ou funcional completa de qualquer um dentre os outros dedos da mão', 10],
    ['s7', 'Perda anatômica e/ou funcional completa de qualquer um dos dedos do pé', 10]]],
  ['Danos segmentares, outras repercussões em órgãos e estruturas', [
    ['o1', 'Perda auditiva total bilateral (surdez completa) ou da fonação (mudez completa) ou da visão de um olho', 50], ['o2', 'Perda completa da mobilidade de um segmento da coluna vertebral, exceto o sacral', 25],
    ['o3', 'Perda integral (retirada cirúrgica) do baço', 10]]]
];
const DPVI = {}; DPV.forEach(g => g[1].forEach(x => { DPVI[x[0]] = { txt: x[1], p: x[2] }; }));
const REPERC = [['100', 'Completa (100%)'], ['75', 'Intensa (75%)'], ['50', 'Média (50%)'], ['25', 'Leve (25%)'], ['10', 'Residual (10%)']];
const REPERC_TXT = { 100: 'completa', 75: 'de repercussão intensa', 50: 'de média repercussão', 25: 'de leve repercussão', 10: 'residual' };
add({
  id: 'dpvat', grupos: ['dano', 'acidente'], nome: 'Tabela da Lei 6.194/1974 (DPVAT)',
  desc: 'Enquadramento do dano e redução proporcional pela repercussão, com soma das lesões.',
  form: v => {
    const L = v.linhas || (v.linhas = []);
    let h = '<div class="ft-add"><select id="ft-dpv-novo" aria-label="Lesão"><option value="">Adicionar lesão...</option>' +
      DPV.map(g => '<optgroup label="' + esc(g[0]) + '">' + g[1].map(x => '<option value="' + x[0] + '">' + x[2] + '% · ' + esc(x[1]) + '</option>').join('') + '</optgroup>').join('') + '</select></div>';
    h += L.length ? '<div class="ft-linhas">' + L.map((r, i) => '<div class="ft-linha ft-linha-dpv"><div class="ft-linha-rot">' + esc(DPVI[r.id].txt) + ' <b>' + DPVI[r.id].p + '%</b></div>' +
      '<input id="ft-d-' + i + '-seg" data-ftd="' + i + '" data-c="seg" placeholder="Lado ou segmento (ex.: ombro direito)" value="' + esc(r.seg || '') + '">' +
      '<select id="ft-d-' + i + '-rep" data-ftd="' + i + '" data-c="rep" aria-label="Repercussão">' + REPERC.map(x => '<option value="' + x[0] + '"' + (String(r.rep) === x[0] ? ' selected' : '') + '>' + x[1] + '</option>').join('') + '</select>' +
      '<button type="button" class="btn pequeno" data-ftacao="dpv-del" data-i="' + i + '" aria-label="Remover">✕</button></div>').join('') + '</div>' : '<p class="ft-vazio">Escolha uma lesão acima.</p>';
    return h + caixa('dica', 'Art. 3º, § 1º: perda completa vai direto ao percentual da tabela; perda incompleta reduz o percentual em 75% (intensa), 50% (média), 25% (leve) ou 10% (sequela residual). A Lei 6.194/1974 foi revogada pela LC 207/2024; a tabela segue usada como referência para fatos de sua vigência e quando os quesitos a pedem.');
  },
  res: v => {
    const L = v.linhas || [];
    if (!L.length) return { html: caixa('aviso', 'Nenhuma lesão adicionada.') };
    const it = L.map(r => { const b = DPVI[r.id].p, f = Number(r.rep || 100); return { r, b, f, p: b * f / 100 }; });
    const tot = Math.min(100, soma(it.map(x => x.p)));
    const html = grande(fmt(tot, 2) + '%', 'total' + (soma(it.map(x => x.p)) > 100 ? ' (limitado a 100%)' : '')) +
      '<div class="ft-tabwrap"><table class="ft-tab"><tr><th>Lesão</th><th>Tabela</th><th>Repercussão</th><th>Resultado</th></tr>' + it.map(x => '<tr><td>' + esc(x.r.seg || DPVI[x.r.id].txt) + '</td><td class="n">' + x.b + '%</td><td class="n">' + x.f + '%</td><td class="n"><b>' + fmt(x.p, 2) + '%</b></td></tr>').join('') + '</table></div>';
    const frases = it.map(x => (x.r.seg ? x.r.seg.trim() + ', no item ' : 'item ') + '"' + DPVI[x.r.id].txt.charAt(0).toLowerCase() + DPVI[x.r.id].txt.slice(1) + '", ' + REPERC_TXT[x.f] + (x.f === 100 ? ', correspondendo a ' + fmt(x.p, 2) + '%' : ', correspondendo a ' + x.f + '% de ' + x.b + '%, ou seja, ' + fmt(x.p, 2) + '%'));
    const texto = 'Por analogia à tabela anexa à Lei 6.194/1974, o dano corporal enquadra-se em: ' + frases.join('; ') + '.' + (it.length > 1 ? ' Somados, os percentuais totalizam ' + fmt(tot, 2) + '%.' : '');
    return { html, texto };
  },
  acao: (a, ds, v) => {
    if (a === 'dpv-del') { v.linhas.splice(Number(ds.i), 1); return true; }
  }
});

const ESC7 = ['Muito ligeiro', 'Ligeiro', 'Moderado', 'Médio', 'Considerável', 'Importante', 'Muito importante'];
add({
  id: 'quantum', grupos: ['dano'], nome: 'Quantum doloris e dano estético',
  desc: 'Escalas de 7 graus usadas na valoração do dano corporal.',
  form: v => opcoes('quantum', 'qd', 'Quantum doloris', ESC7.map((t, i) => [i + 1, t, i + 1]), { sub: 'Dor física e sofrimento no período de lesão e tratamento: tipo de lesão, internações, cirurgias, procedimentos, tempo de recuperação.' }) +
    campo('quantum', 'qdj', 'Fundamentação do quantum doloris', { tipo: 'textarea', ph: 'ex.: duas cirurgias, 12 dias de internação, fisioterapia por 6 meses' }) +
    opcoes('quantum', 'de', 'Dano estético', [[0, 'Ausente', 0]].concat(ESC7.map((t, i) => [i + 1, t, i + 1])), { sub: 'Alteração da imagem: localização, extensão, visibilidade, cicatrizes, deformidades, marcha.' }) +
    campo('quantum', 'dej', 'Descrição do dano estético', { tipo: 'textarea', ph: 'ex.: cicatriz hipertrófica de 15 cm na face anterior da perna esquerda' }),
  res: v => {
    const t = [];
    let html = '<div class="ft-dupla">' + grande(v.qd != null ? Number(v.qd) + 1 + '/7' : '-', 'Quantum doloris') + grande(v.de != null ? Number(v.de) + '/7' : '-', 'Dano estético') + '</div>';
    if (v.qd != null) { const g = Number(v.qd) + 1; t.push('O quantum doloris é estimado em grau ' + g + ' numa escala de 7 graus, ' + ESC7[g - 1].toLowerCase() + (v.qdj ? ', considerando ' + v.qdj.trim().replace(/\.$/, '') : '') + '.'); }
    if (v.de != null) { const g = Number(v.de); t.push(g === 0 ? 'Não há dano estético.' : 'O dano estético é estimado em grau ' + g + ' numa escala de 7 graus, ' + ESC7[g - 1].toLowerCase() + (v.dej ? ', em razão de ' + v.dej.trim().replace(/\.$/, '') : '') + '.'); }
    if (!t.length) html += caixa('aviso', 'Escolha os graus.');
    return { html, texto: t.join(' ') };
  }
});

/* ---------------------------------------------------------------------
   ROTINA DO PERITO
   --------------------------------------------------------------------- */
function pascoa(a) {
  const b = a % 19, c = Math.floor(a / 100), d = a % 100, e = Math.floor(c / 4), f = c % 4, g = Math.floor((c + 8) / 25), h = Math.floor((c - g + 1) / 3),
    i = (19 * b + c - e - h + 15) % 30, k = Math.floor(d / 4), l = d % 4, m = (32 + 2 * f + 2 * k - i - l) % 7, n = Math.floor((b + 11 * i + 22 * m) / 451),
    mes = Math.floor((i + m - 7 * n + 114) / 31), dia = ((i + m - 7 * n + 114) % 31) + 1;
  return new Date(a, mes - 1, dia);
}
const FER_CACHE = {};
function feriadosAno(a, extras) {
  const key = a + '|' + extras;
  if (FER_CACHE[key]) return FER_CACHE[key];
  const f = {}, red = {};
  const fixo = [['01-01', 'Confraternização Universal'], ['04-21', 'Tiradentes'], ['05-01', 'Dia do Trabalho'], ['07-09', 'Revolução Constitucionalista (SP)'], ['09-07', 'Independência'], ['10-12', 'Nossa Senhora Aparecida'], ['11-02', 'Finados'], ['11-15', 'Proclamação da República'], ['11-20', 'Consciência Negra'], ['12-08', 'Dia da Justiça'], ['12-25', 'Natal']];
  fixo.forEach(x => { f[a + '-' + x[0]] = x[1]; });
  const p = pascoa(a);
  f[iso(addDias(p, -48))] = 'Carnaval'; f[iso(addDias(p, -47))] = 'Carnaval'; f[iso(addDias(p, -2))] = 'Sexta-feira Santa'; f[iso(addDias(p, 60))] = 'Corpus Christi';
  red[iso(addDias(p, -46))] = 'Quarta-feira de Cinzas, expediente a partir das 13h';
  String(extras || '').split(/[\n;]+/).forEach(l => {
    const m = /(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?\s*(.*)/.exec(l.trim()); if (!m) return;
    if (m[3] && Number(m[3]) !== a) return;
    f[a + '-' + String(m[2]).padStart(2, '0') + '-' + String(m[1]).padStart(2, '0')] = (m[4] || 'Feriado informado').trim();
  });
  return (FER_CACHE[key] = { f, red });
}
function infoDia(d, extras) {
  const F = feriadosAno(d.getFullYear(), extras), k = iso(d), md = (d.getMonth() + 1) * 100 + d.getDate();
  if (md >= 1220 || md <= 120) return { util: false, motivo: 'Suspensão de prazos (20/12 a 20/01, art. 220 do CPC)' };
  if (F.f[k]) return { util: false, motivo: F.f[k] };
  if (d.getDay() === 0 || d.getDay() === 6) return { util: false, motivo: '' };
  if (F.red[k]) return { util: true, reduzido: F.red[k] };
  return { util: true };
}
function proxUtil(d, extras, incluir) { let x = incluir ? new Date(d) : addDias(d, 1); while (!infoDia(x, extras).util) x = addDias(x, 1); return x; }
function antUtil(d, extras) { let x = addDias(d, -1); while (!infoDia(x, extras).util) x = addDias(x, -1); return x; }

add({
  id: 'prazos', grupos: ['geral'], nome: 'Prazos processuais',
  desc: 'Contagem em dias úteis (art. 219 do CPC), com feriados nacionais, de SP e do Judiciário.',
  form: v => '<div class="ft-grid">' + campo('prazos', 'modo', 'Tipo de contagem', { tipo: 'select', re: true, ops: [['frente', 'Prazo a partir da intimação'], ['tras', 'Antecedência de um evento (ex.: laudo 20 dias antes da audiência)']] }) +
    (v.modo === 'tras' ? campo('prazos', 'evento', 'Data do evento', { tipo: 'date' }) + campo('prazos', 'n', 'Antecedência', { tipo: 'number', suf: 'dias', padrao: '20' })
      : campo('prazos', 'ini', 'Data', { tipo: 'date' }) + campo('prazos', 'ref', 'A data é', { tipo: 'select', ops: [['ciencia', 'Ciência da intimação (eletrônica ou pessoal)'], ['dje', 'Disponibilização no DJE']] }) + campo('prazos', 'n', 'Prazo', { tipo: 'number', suf: 'dias', padrao: '15' })) +
    campo('prazos', 'tipo', 'Dias', { tipo: 'select', ops: [['uteis', 'Úteis'], ['corridos', 'Corridos']] }) + '</div>' +
    campo('prazos', 'extras', 'Feriados locais e suspensões do expediente', { tipo: 'textarea', linhas: 3, ph: 'Um por linha: 19/03 São José (todo ano) ou 30/10/2026 Dia do Servidor', cls: 'largo' }) +
    caixa('dica', 'Já incluídos: feriados nacionais, 9 de julho, Carnaval, Sexta-feira Santa, Corpus Christi, 8 de dezembro e a suspensão de 20/12 a 20/01. Feriados municipais e pontos facultativos do TJSP entram no campo acima. Confira sempre no calendário oficial.'),
  res: v => {
    const n = Math.floor(num(v.n != null && v.n !== '' ? v.n : (v.modo === 'tras' ? 20 : 15)));
    const ex = v.extras || '', uteis = (v.tipo || 'uteis') === 'uteis';
    if (!(n > 0)) return { html: caixa('aviso', 'Informe o número de dias.') };
    if (v.modo === 'tras') {
      const ev = dataISO(v.evento); if (!ev) return { html: caixa('aviso', 'Informe a data do evento.') };
      let d = ev, c = 0;
      if (uteis) { while (c < n) { d = addDias(d, -1); if (infoDia(d, ex).util) c++; } }
      else { d = addDias(ev, -n); if (!infoDia(d, ex).util) d = antUtil(d, ex); }
      return { html: grande(br(d), 'último dia, ' + DIAS_SEM[d.getDay()]) + caixa('dica', 'Contagem regressiva de ' + n + ' dias ' + (uteis ? 'úteis' : 'corridos') + ' antes de ' + br(ev) + ', sem contar o dia do evento. Para o art. 477 do CPC, protocole o laudo até essa data.'), texto: '' };
    }
    const ini = dataISO(v.ini); if (!ini) return { html: caixa('aviso', 'Informe a data.') };
    let pub = null, comeco;
    if (v.ref === 'dje') { pub = proxUtil(ini, ex); comeco = proxUtil(pub, ex); } else comeco = proxUtil(ini, ex);
    const pulados = [];
    let fim;
    if (uteis) {
      let d = comeco, c = 1;
      while (c < n) { d = addDias(d, 1); const i = infoDia(d, ex); if (i.util) c++; else if (i.motivo) pulados.push([new Date(d), i.motivo]); }
      fim = d;
    } else { fim = addDias(comeco, n - 1); if (!infoDia(fim, ex).util) fim = proxUtil(fim, ex); }
    let obs = '';
    const ri = infoDia(fim, ex);
    if (ri.reduzido) { obs = 'O vencimento cairia em ' + br(fim) + ' (' + ri.reduzido + '); prorrogado para o dia útil seguinte (art. 224, § 1º).'; fim = proxUtil(fim, ex); }
    const unicos = []; pulados.forEach(p => { if (!unicos.some(u => u[1] === p[1] && Math.abs(u[0] - p[0]) < 86400000 * 40 && /Suspens/.test(p[1]))) unicos.push(p); });
    const html = grande(br(fim), 'vence ' + DIAS_SEM[fim.getDay()]) +
      '<table class="ft-tab">' + (pub ? '<tr><td>Publicação</td><td>' + br(pub) + '</td></tr>' : '') + '<tr><td>Primeiro dia da contagem</td><td>' + br(comeco) + '</td></tr><tr><td>Prazo</td><td>' + n + ' dias ' + (uteis ? 'úteis' : 'corridos') + '</td></tr></table>' +
      (obs ? caixa('aviso', esc(obs)) : '') +
      (unicos.length ? '<h3 class="ft-sub">Dias não úteis no período (fora fins de semana)</h3><ul class="ft-lista">' + unicos.map(p => '<li>' + br(p[0]) + ' ' + esc(p[1]) + '</li>').join('') + '</ul>' : '');
    return { html, texto: '' };
  }
});

const CPC = [
  ['Nomeação', [
    ['Art. 157, § 1º', 'Escusa do encargo: 15 dias da intimação, ou do impedimento ou suspeição supervenientes.'],
    ['Art. 465, § 2º', 'Em 5 dias da intimação da nomeação: proposta de honorários, currículo com comprovação de especialização e contatos profissionais, inclusive e-mail.'],
    ['Art. 465, § 1º', 'Partes têm 15 dias para arguir impedimento ou suspeição, indicar assistente técnico e apresentar quesitos.'],
    ['Art. 465, § 3º e § 4º', 'Partes se manifestam sobre a proposta em 5 dias; o juiz pode autorizar até 50% dos honorários no início e o restante após o laudo e os esclarecimentos.']]],
  ['Realização', [
    ['Art. 466, § 1º', 'Assistentes técnicos são de confiança da parte e não se sujeitam a impedimento ou suspeição.'],
    ['Art. 466, § 2º', 'Assegurar aos assistentes acesso e acompanhamento das diligências e exames, com prévia comunicação comprovada, com antecedência mínima de 5 dias.'],
    ['Art. 474', 'As partes terão ciência da data e do local da perícia.'],
    ['Art. 473, § 3º', 'Pode ouvir testemunhas, obter informações, solicitar documentos e instruir o laudo com fotografias e outros elementos.']]],
  ['Laudo', [
    ['Art. 473, I a IV', 'Exposição do objeto; análise técnica ou científica; método utilizado, predominantemente aceito pelos especialistas da área; resposta conclusiva a todos os quesitos.'],
    ['Art. 473, § 1º', 'Fundamentação em linguagem simples e com coerência lógica, indicando como chegou às conclusões.'],
    ['Art. 473, § 2º', 'Vedado ultrapassar os limites da designação e emitir opiniões pessoais que excedam o exame técnico.'],
    ['Art. 476', 'Por motivo justificado, uma única prorrogação, pela metade do prazo original.'],
    ['Art. 477, caput', 'Protocolar o laudo no prazo fixado, pelo menos 20 dias antes da audiência.']]],
  ['Depois do laudo', [
    ['Art. 477, § 1º', 'Partes se manifestam em 15 dias comuns; assistentes técnicos apresentam pareceres no mesmo prazo.'],
    ['Art. 477, § 2º', 'Esclarecimentos sobre divergências ou dúvidas: 15 dias.'],
    ['Art. 477, § 3º e § 4º', 'Comparecimento à audiência, se necessário, com intimação de pelo menos 10 dias de antecedência e quesitos formulados.'],
    ['Art. 468 e art. 158', 'Substituição se faltar conhecimento técnico ou descumprir o prazo sem motivo legítimo; responsabilidade por informações inverídicas, com inabilitação de 2 a 5 anos.']]],
  ['Código de Ética Médica (Cap. XI)', [
    ['Art. 92', 'Vedado assinar laudos periciais sem ter realizado pessoalmente o exame.'],
    ['Art. 93', 'Vedado ser perito do próprio paciente, de familiar ou de pessoa com quem tenha relações capazes de influir no trabalho, ou de empresa em que atue ou tenha atuado.'],
    ['Art. 98', 'Vedado deixar de atuar com absoluta isenção ou ultrapassar os limites das atribuições e da competência.']]]
];
add({
  id: 'cpc', grupos: ['geral'], nome: 'CPC e ética: prazos e deveres do perito',
  desc: 'Resumo dos artigos que mais aparecem na rotina pericial.',
  form: v => CPC.map(g => '<div class="ft-quadro"><h3>' + esc(g[0]) + '</h3><dl class="ft-dl">' + g[1].map(x => '<div><dt>' + esc(x[0]) + '</dt><dd>' + esc(x[1]) + '</dd></div>').join('') + '</dl></div>').join(''),
  res: () => ({ html: '' }), largo: true, semRes: true
});

const CHECK = {
  todo: ['Todo laudo', ['Identificação do processo, das partes e do periciando', 'Comunicação às partes e assistentes com 5 dias de antecedência', 'Data, local e presentes no exame', 'Objeto da perícia, em uma ou duas linhas', 'Metodologia: anamnese, exame físico, análise documental, escalas', 'Anamnese só com o que foi relatado na perícia', 'Exame físico e exames complementares com datas', 'Discussão técnica fundamentada', 'Conclusão objetiva, sem qualificação jurídica', 'Respostas a todos os quesitos, transcritos como formulados', 'Data, assinatura e CRM']],
  interdicao: ['Interdição e curatela', ['Identificação do informante, parentesco e convivência', 'Escolaridade, ocupação anterior e com quem reside', 'História relatada pelo informante e pelo periciando', 'Medicações e acompanhamento atual', 'Exame físico geral e neurológico sumário', 'Exame psíquico completo', 'Teste cognitivo adequado à escolaridade', 'Escala funcional (Katz, Lawton ou Pfeffer)', 'Estadiamento (CDR ou Reisberg) nos quadros demenciais', 'Diagnóstico com CID e caráter (transitório, permanente, progressivo)', 'Repercussão funcional: finanças, bens, atos negociais, tratamento, autocuidado', 'Necessidade de supervisão ou auxílio e para quais atividades', 'Data provável de início, quando for possível estimar', 'Possibilidade de melhora e reavaliação, se cabível']],
  acidente: ['Auxílio-acidente', ['Data, local e mecanismo do acidente; CAT', 'Atividade habitual na época, com as tarefas e exigências físicas', 'Benefícios: espécie, início e cessação', 'Tratamentos: cirurgias, fisioterapia, órteses, com datas', 'Queixas atuais e lado dominante', 'Exame comparativo bilateral: inspeção, cicatrizes, trofismo, perimetria', 'Goniometria em graus, comparando com o lado oposto', 'Força de 0 a 5, testes especiais e exame neurológico', 'Exames complementares com datas', 'Consolidação das lesões e data estimada', 'Nexo causal ou concausal com o acidente', 'Sequela definitiva e repercussão no trabalho habitual: redução, maior esforço ou impossibilidade', 'Correlação com o Anexo III, quando houver', 'Diferenciação entre sequela e doença degenerativa ou preexistente', 'Data de início da redução da capacidade']],
  bariatrica: ['Pós-bariátrica', ['Data e técnica da bariátrica', 'Peso e IMC antes, menor peso e peso atual medido', 'Tempo de estabilidade do peso', 'Comorbidades, tabagismo e estado nutricional', 'Procedimentos pedidos e relatório do médico assistente', 'Exame por região com o grau de Pittsburgh', 'Complicações cutâneas: intertrigo, dermatite, candidíase, infecção, ulceração, odor', 'Limitações funcionais: higiene, marcha, vestuário, atividade física e laboral', 'Tratamentos clínicos prévios das complicações', 'Fotografias com autorização', 'Caráter de cada procedimento, reparador ou estético, por região', 'Correlação com a DUT da ANS, quando questionado', 'Condições clínicas e riscos para a cirurgia']],
  homecare: ['Home care', ['Diagnósticos com CID', 'Internações e situação atual', 'Dispositivos: traqueostomia, ventilação, oxigênio, gastrostomia, sondas, cateteres', 'Aspiração de vias aéreas e frequência', 'Medicações e vias (oral, enteral, subcutânea, endovenosa)', 'Feridas, estágio e frequência de curativos', 'Dependência (Katz ou Barthel) e nível de consciência', 'Tabelas NEAD e ABEMID', 'Enfermagem necessária: 24 h, 12 h, 6 h, visitas ou cuidador', 'Terapias e frequência: fisioterapia, fonoaudiologia, nutrição', 'Materiais, equipamentos e dieta', 'Rede de apoio e condições do domicílio', 'Prognóstico e reavaliação']],
  erro: ['Erro médico', ['Cronologia dos atendimentos a partir do prontuário', 'Profissionais e serviços envolvidos', 'Indicação do procedimento segundo a literatura da época', 'Termo de consentimento e informação de riscos', 'Técnica e intercorrências registradas', 'Diagnóstico e tratamento das complicações, com tempo de resposta', 'Complicação inerente ao procedimento ou desvio da conduta esperada', 'Dano: sequelas atuais, exame físico e funcional', 'Nexo de causalidade entre a conduta e o dano', 'Data de consolidação', 'Quantificação: dano funcional, quantum doloris, dano estético', 'Tratamentos futuros, quando questionado']]
};
add({
  id: 'checklist', grupos: ['geral', 'interdicao', 'acidente', 'bariatrica', 'homecare', 'dano'], nome: 'Checklists do laudo',
  desc: 'O que não pode faltar em cada tipo de perícia. Marque à medida que escreve.',
  form: v => {
    const tipo = v.tipo || 'todo';
    return '<div class="ft-abas" role="tablist">' + Object.keys(CHECK).map(k => '<button type="button" class="' + (k === tipo ? 'ativa' : '') + '" data-ftacao="check-tipo" data-k="' + k + '">' + esc(CHECK[k][0]) + '</button>').join('') + '</div>' +
      '<div class="ft-checklist">' + CHECK[tipo][1].map((t, i) => campo('checklist', tipo + '_' + i, esc(t), { tipo: 'check' })).join('') + '</div>';
  },
  res: v => {
    const tipo = v.tipo || 'todo', L = CHECK[tipo][1], f = L.filter((t, i) => v[tipo + '_' + i] === true).length;
    const faltam = L.filter((t, i) => v[tipo + '_' + i] !== true);
    return { html: grande(f + '/' + L.length, 'itens conferidos', f === L.length ? 'ok' : '') + (faltam.length ? '<h3 class="ft-sub">Faltam</h3><ul class="ft-lista">' + faltam.map(t => '<li>' + esc(t) + '</li>').join('') + '</ul>' : caixa('ok', 'Tudo conferido.')) };
  },
  acao: (a, ds, v) => { if (a === 'check-tipo') { v.tipo = ds.k; return true; } }
});

/* =====================================================================
   TELA
   ===================================================================== */
let raiz = null;
const porId = id => T.find(t => t.id === id);
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

function htmlHub() {
  const q = norm(S.q);
  const vis = t => !q || norm(t.nome + ' ' + t.desc + ' ' + t.grupos.map(g => (GRUPOS.find(x => x[0] === g) || [])[1]).join(' ')).indexOf(q) >= 0;
  let h = '';
  GRUPOS.forEach(g => {
    const ts = T.filter(t => t.grupos[0] === g[0] || (q && t.grupos.indexOf(g[0]) >= 0)).filter(vis);
    const extras = q ? [] : T.filter(t => t.grupos[0] !== g[0] && t.grupos.indexOf(g[0]) >= 0);
    if (!ts.length && !extras.length) return;
    h += '<section class="ft-grupo"><h2>' + esc(g[1]) + '</h2><p>' + esc(g[2]) + '</p><div class="ft-tiles">' +
      ts.map(t => '<button type="button" class="ft-tile" data-ftacao="abrir" data-id="' + t.id + '"><b>' + esc(t.nome) + '</b><span>' + esc(t.desc) + '</span></button>').join('') +
      (extras.length ? '<div class="ft-tambem">Também aqui: ' + extras.map(t => '<button type="button" class="ft-link" data-ftacao="abrir" data-id="' + t.id + '">' + esc(t.nome) + '</button>').join(' · ') + '</div>' : '') +
      '</div></section>';
  });
  return h || '<p class="ft-vazio">Nenhuma ferramenta encontrada.</p>';
}
function renderHub() {
  raiz.innerHTML = '<div class="ft-raiz" id="ft-raiz"><div class="ft-hub-topo"><input type="search" id="ft-q" placeholder="Buscar ferramenta: goniometria, Katz, prazo, Pittsburgh..." value="' + esc(S.q) + '" autocomplete="off" data-fthub="1">' +
    '<span class="ft-hub-nota">Os valores ficam salvos só neste aparelho. Use "Copiar para o laudo" e revise o texto.</span></div><div id="ft-lista">' + htmlHub() + '</div></div>';
}
function resultado(t) {
  if (t.semRes) return '';
  let r;
  try { r = t.res(V(t.id)) || {}; } catch (e) { r = { html: caixa('erro', 'Erro no cálculo: ' + esc(e.message)) }; }
  return (r.html || '') + (r.texto ? '<div class="ft-copiar"><div class="ft-texto" id="ft-texto">' + esc(r.texto) + '</div><button type="button" class="btn primario" data-ftacao="copiar">Copiar para o laudo</button></div>' : '');
}
function renderTool(t) {
  const corpo = t.iframe
    ? '<div class="ft-iframe"><iframe src="' + t.iframe + '" title="' + esc(t.nome) + '" loading="lazy"></iframe></div>'
    : '<div class="ft-corpo' + (t.largo || t.semRes ? ' largo' : '') + '"><div class="ft-form" id="ft-form">' + t.form(V(t.id)) + '</div>' + (t.semRes ? '' : '<aside class="ft-res" id="ft-res" aria-live="polite">' + resultado(t) + '</aside>') + '</div>';
  raiz.innerHTML = '<div class="ft-raiz" id="ft-raiz"><div class="ft-topo"><button type="button" class="btn pequeno" data-ftacao="voltar">← Ferramentas</button>' +
    '<div class="ft-titulo"><h2>' + esc(t.nome) + '</h2><p>' + esc(t.desc) + '</p></div>' +
    (t.iframe ? '<a class="btn pequeno" href="' + t.iframe + '" target="_blank" rel="noopener">Abrir em nova aba</a>' : (t.semRes ? '' : '<button type="button" class="btn pequeno" data-ftacao="limpar">Limpar</button>')) + '</div>' + corpo + '</div>';
}
function render(el) {
  raiz = el;
  const t = S.atual && porId(S.atual);
  if (t) renderTool(t); else renderHub();
}
function atualizarRes() {
  const t = porId(S.atual), box = document.getElementById('ft-res');
  if (t && box) box.innerHTML = resultado(t);
}
function rerender() {
  const a = document.activeElement, id = a && a.id;
  const sx = window.scrollX, sy = window.scrollY;
  render(raiz);
  if (id) { const el = document.getElementById(id); if (el) { el.focus({ preventScroll: true }); } }
  window.scrollTo(sx, sy);
}

function noRaiz(el) { return el && el.closest && el.closest('#ft-raiz'); }
function aoMudar(e) {
  const el = e.target;
  if (!noRaiz(el)) return;
  if (el.dataset.fthub) { S.q = el.value; const l = document.getElementById('ft-lista'); if (l) l.innerHTML = htmlHub(); return; }
  if (el.id === 'ft-gonio-novo' || el.id === 'ft-dpv-novo' || el.id === 'ft-gonio-art') {
    if (e.type !== 'change' || !el.value) return;
    const v = V(S.atual); v.linhas = v.linhas || [];
    if (el.id === 'ft-gonio-art') {
      const g = MOV[Number(el.value)], last = v.linhas[v.linhas.length - 1], lado = /Coluna/.test(g[0]) ? '' : (last && last.lado ? last.lado : 'D');
      g[1].forEach(mm => { if (!v.linhas.some(r => r.mov === mm[0] && r.lado === lado)) v.linhas.push({ mov: mm[0], lado, med: '', contra: '', ref: '' }); });
    } else if (el.id === 'ft-gonio-novo') { const last = v.linhas[v.linhas.length - 1], m = MOVI[el.value]; v.linhas.push({ mov: el.value, lado: /Coluna/.test(m.art) ? '' : (last ? last.lado : 'D'), med: '', contra: '', ref: '' }); }
    else v.linhas.push({ id: el.value, rep: '100', seg: '' });
    salvar(); rerender(); return;
  }
  if (el.dataset.ftg != null || el.dataset.ftd != null) {
    const v = V(S.atual), i = Number(el.dataset.ftg != null ? el.dataset.ftg : el.dataset.ftd);
    if (v.linhas && v.linhas[i]) { v.linhas[i][el.dataset.c] = el.value; salvar(); atualizarRes(); }
    return;
  }
  if (!el.dataset.ft) return;
  if (e.type === 'input' && (el.type === 'radio' || el.type === 'checkbox' || el.tagName === 'SELECT')) return;
  const v = V(el.dataset.ft);
  v[el.dataset.k] = el.type === 'checkbox' ? el.checked : el.value;
  salvar();
  if (el.dataset.re) rerender(); else atualizarRes();
}
document.addEventListener('input', aoMudar);
document.addEventListener('change', aoMudar);

function copiar(txt, btn) {
  const ok = () => { const o = btn.textContent; btn.textContent = 'Copiado ✓'; btn.disabled = true; setTimeout(() => { btn.textContent = o; btn.disabled = false; }, 1600); };
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(txt).then(ok, () => fallback());
  else fallback();
  function fallback() { const ta = document.createElement('textarea'); ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); ok(); } catch (e) {} ta.remove(); }
}
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('[data-ftacao]');
  if (!b || !noRaiz(b)) return;
  const a = b.dataset.ftacao;
  if (a === 'abrir') { S.atual = b.dataset.id; salvar(); render(raiz); window.scrollTo(0, 0); return; }
  if (a === 'voltar') { S.atual = ''; salvar(); render(raiz); window.scrollTo(0, 0); return; }
  if (a === 'copiar') { const t = document.getElementById('ft-texto'); if (t) copiar(t.textContent, b); return; }
  if (a === 'limpar') {
    const t = porId(S.atual); if (!t) return;
    const antes = S.v[t.id]; S.v[t.id] = {}; if (t.id === 'prazos' && antes && antes.extras) S.v.prazos.extras = antes.extras;
    salvar(); rerender(); return;
  }
  const t = porId(S.atual);
  if (t && t.acao && t.acao(a, b.dataset, V(t.id))) { salvar(); rerender(); }
});

window.PericiasFerramentas = { render, total: () => T.length };
})();
