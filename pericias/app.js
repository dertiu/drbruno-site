(function () {
'use strict';

/* ================================================================
   FUNÇÕES PURAS (sem tela; testadas no Node)
   ================================================================ */
function chave(v) { return String(v == null ? '' : v).normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toUpperCase(); }
function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function digitos(v) { return String(v == null ? '' : v).replace(/\D/g, ''); }
function pad2(n) { return ('0' + n).slice(-2); }
function abreviar(s, max) { s = String(s || ''); return s.length > max ? s.slice(0, max - 1) + '…' : s; }

function formatarCNJ(v) {
  const d = digitos(v);
  if (d.length !== 20) return String(v == null ? '' : v).trim();
  return d.slice(0, 7) + '-' + d.slice(7, 9) + '.' + d.slice(9, 13) + '.' + d[13] + '.' + d.slice(14, 16) + '.' + d.slice(16);
}

function parseData(txt) {
  const m = String(txt || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!m) return null;
  let a = +m[3]; if (a < 100) a += 2000;
  const d = new Date(a, +m[2] - 1, +m[1]);
  return isNaN(d) ? null : d;
}
function zeroHoje() { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function somaDias(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function diasAte(d) { return Math.round((d - zeroHoje()) / 86400000); }
function fmtData(d) { return pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1) + '/' + d.getFullYear(); }
function fmtCurto(d) { return pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1); }
function mesmoDia(a, b) { return a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
const DIAS_SEM = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const DIAS_LONGO = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
function fmtExtenso(d) { return DIAS_LONGO[d.getDay()] + ', ' + d.getDate() + ' de ' + MESES[d.getMonth()]; }
function txtDias(n) {
  if (n === 0) return 'hoje';
  if (n === 1) return 'amanhã';
  if (n === -1) return 'venceu ontem';
  if (n < 0) return 'vencido há ' + (-n) + ' dias';
  return 'em ' + n + ' dias';
}
function isoParaBr(iso) { const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? m[3] + '/' + m[2] + '/' + m[1] : ''; }
function brParaIso(br) { const d = parseData(br); return d ? d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) : ''; }
function somaMinutos(hhmm, min) {
  const m = String(hhmm || '').match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return '08:00';
  const t = (+m[1]) * 60 + (+m[2]) + min;
  return pad2(Math.floor(t / 60) % 24) + ':' + pad2(t % 60);
}

// mapa CABEÇALHO NORMALIZADO -> valor
function linhaMapa(cab, v) {
  const m = {};
  cab.forEach((h, i) => { m[chave(h)] = v[i] == null ? '' : String(v[i]); });
  return m;
}

// mesma regra do script do Discord: quem faz o quê
function classificar(m) {
  const passo = chave(m['PROXIMO PASSO']), obs = chave(m['OBSERVACAO']), pago = chave(m['PAGO']);
  const r = (quem, acao) => ({ quem: quem, acao: acao });
  if (pago === 'PAGO' && (passo === 'PAGAMENTO' || !passo)) return r(null, 'Concluído');
  switch (passo) {
    case 'ACEITE': return r('assistente', 'Peticionar o aceite');
    case 'AGENDAMENTO': return r('assistente', 'Agendar a perícia e intimar as partes');
    case 'PETICAO': return r('assistente', 'Peticionar');
    case 'RENUNCIAR': return r('assistente', 'Peticionar a renúncia');
    case 'LAUDO':
      if (/PRONTO|PETICION|PROTOCOL/.test(obs)) return r('perito', 'Protocolar o laudo');
      return r('perito', 'Fazer o laudo');
    case 'PERICIA': return r('perito', 'Realizar a perícia');
    case 'ESCLARECIMENTO':
    case 'ESCLARECIMENTOS': return r('perito', 'Responder os esclarecimentos');
    case 'DECISAO':
      if (/ESCLAREC/.test(obs) && !/\b(FIZ|ENVIEI|ENVIAD|FEIT|RESPONDI|PROTOCOLEI)/.test(obs)) return r('perito', 'Responder os esclarecimentos');
      return r('acompanhar', 'Aguardar decisão do Juízo');
    case 'RESERVA': return r('acompanhar', 'Aguardar depósito dos honorários');
    case 'PAGAMENTO':
      if (/\b(FAZER|PETICIONAR|SOLICITAR|PEDIR)\b/.test(obs)) return r('assistente', 'Peticionar o pagamento (MLE)');
      if (pago === 'MLE') return r('acompanhar', 'MLE peticionado: aguardar pagamento');
      if (pago === 'OFICIO') return r('acompanhar', 'Ofício expedido: só aguardar');
      if (pago === 'PARCIAL') return r('acompanhar', 'Recebido em parte: aguardar o restante');
      return r('acompanhar', 'Aguardar pagamento');
  }
  if (passo) return r('perito', 'Passo novo, sem regra: ' + m['PROXIMO PASSO']);
  return r(null, '');
}
const QUEM_ROT = { perito: 'Perito', assistente: 'Assistente', acompanhar: 'Acompanhar' };

const PAGO_LIBERA = ['RESERVADO', 'MLE', 'OFICIO', 'PARCIAL', 'PAGO'];
function semReserva(m) {
  const passo = chave(m['PROXIMO PASSO']);
  return (passo === 'AGENDAMENTO' || passo === 'PERICIA') && PAGO_LIBERA.indexOf(chave(m['PAGO'])) < 0;
}

// honorários: "15 UFESP", "R$ 5.800,00", "5800"
function numBR(s) {
  s = String(s || '').trim();
  if (!s) return 0;
  if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}
function valorHonorarios(txt, ufesp) {
  const s = String(txt || '').trim();
  if (!s) return 0;
  const u = s.match(/^([\d.,]+)\s*UFESPS?$/i);
  if (u) return Math.round(numBR(u[1]) * (ufesp || 0) * 100) / 100;
  if (/UFESP/i.test(s)) return 0;
  return numBR(s.replace(/[^\d.,]/g, ''));
}
function fmtBRL(v) {
  const p = (Math.round((v || 0) * 100) / 100).toFixed(2).split('.');
  return 'R$ ' + p[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + p[1];
}
function fmtBRLcurto(v) {
  if (v >= 1000) return 'R$ ' + (v / 1000).toFixed(v >= 10000 ? 0 : 1).replace('.', ',') + ' mil';
  return fmtBRL(v);
}

// etapas = valores de PRÓXIMO PASSO, na ordem do fluxo
const ETAPAS = [
  { k: 'ACEITE', rot: 'Aceite', val: 'ACEITE' },
  { k: 'RESERVA', rot: 'Reserva', val: 'RESERVA' },
  { k: 'AGENDAMENTO', rot: 'Agendamento', val: 'AGENDAMENTO' },
  { k: 'PERICIA', rot: 'Perícia', val: 'PERICIA' },
  { k: 'LAUDO', rot: 'Laudo', val: 'LAUDO' },
  { k: 'ESCLARECIMENTOS', rot: 'Esclarecimentos', val: 'ESCLARECIMENTOS' },
  { k: 'PETICAO', rot: 'Petição', val: 'PETIÇÃO' },
  { k: 'DECISAO', rot: 'Decisão', val: 'DECISÃO' },
  { k: 'PAGAMENTO', rot: 'Pagamento', val: 'PAGAMENTO' },
  { k: 'RENUNCIAR', rot: 'Renunciar', val: 'RENUNCIAR' }
];
function etapaDe(m) {
  let k = chave(m['PROXIMO PASSO']);
  if (k === 'ESCLARECIMENTO') k = 'ESCLARECIMENTOS';
  if (!k) return 'SEM';
  return ETAPAS.some(e => e.k === k) ? k : 'OUTROS';
}
function rotEtapa(k) { const e = ETAPAS.find(x => x.k === k); return e ? e.rot : (k === 'SEM' ? 'Sem etapa' : 'Outros'); }

const TRILHA = ['Aceite', 'Reserva', 'Agendamento', 'Perícia', 'Laudo', 'Decisão', 'Pagamento', 'Concluído'];
function posTrilha(m) {
  const e = etapaDe(m);
  if (chave(m['PAGO']) === 'PAGO' && (e === 'PAGAMENTO' || e === 'SEM')) return 7;
  const p = { ACEITE: 0, RESERVA: 1, AGENDAMENTO: 2, PERICIA: 3, LAUDO: 4, ESCLARECIMENTOS: 5, PETICAO: 5, DECISAO: 5, PAGAMENTO: 6 }[e];
  return p == null ? -1 : p;
}

function prazoDe(m) { return parseData(m['PRAZOS'] || m['PRAZO']); }
function nivelPrazo(n) { return n < 0 ? 'vencido' : n <= 2 ? 'critico' : n <= 5 ? 'alerta' : n <= 10 ? 'atencao' : 'ok'; }

// atalhos do fluxo: cada um diz exatamente quais colunas mudam (chaves normalizadas)
function acoesRapidas(m) {
  const e = etapaDe(m), pago = chave(m['PAGO']), obs = chave(m['OBSERVACAO']);
  const c = classificar(m);
  const A = [];
  if (e === 'ACEITE') A.push({ id: 'aceite', rot: 'Aceite peticionado', dados: { 'STATUS': 'ACEITE', 'PROXIMO PASSO': PAGO_LIBERA.indexOf(pago) >= 0 ? 'AGENDAMENTO' : 'RESERVA' } });
  if (e === 'RESERVA' || (e === 'AGENDAMENTO' && PAGO_LIBERA.indexOf(pago) < 0)) A.push({ id: 'reserva', rot: 'Honorários reservados', dados: { 'PAGO': 'RESERVADO', 'PROXIMO PASSO': 'AGENDAMENTO' } });
  if (e === 'AGENDAMENTO') A.push({ id: 'agendar', rot: 'Agendar perícia', especial: 'agendar', destaque: true });
  if (e === 'PERICIA') {
    A.push({ id: 'realizada', rot: 'Perícia realizada', dados: { 'PROXIMO PASSO': 'LAUDO', 'LAUDO': 'PRODUÇÃO' }, destaque: true });
    A.push({ id: 'faltou', rot: 'Não compareceu', dados: { 'PROXIMO PASSO': 'DECISÃO', 'OBSERVACAO': 'NÃO COMPARECEU' } });
  }
  if (e === 'LAUDO' && !/PRONTO|PETICION|PROTOCOL/.test(obs)) A.push({ id: 'pronto', rot: 'Laudo pronto (falta protocolar)', dados: { 'OBSERVACAO': 'LAUDO PRONTO / PETICIONAR' } });
  if (e === 'LAUDO') A.push({ id: 'protocolado', rot: 'Laudo protocolado', dados: { 'PROXIMO PASSO': 'DECISÃO', 'LAUDO': 'ENTREGUE', 'OBSERVACAO': '', 'PRAZOS': '' }, destaque: true });
  if (e === 'ESCLARECIMENTOS' || (e === 'DECISAO' && c.quem === 'perito')) A.push({ id: 'esclarecimentos', rot: 'Esclarecimentos enviados', dados: { 'PROXIMO PASSO': 'DECISÃO', 'OBSERVACAO': 'ENVIEI OS ESCLARECIMENTOS', 'PRAZOS': '' }, destaque: true });
  if (e === 'DECISAO') A.push({ id: 'liberado', rot: 'Pagamento liberado: fazer MLE', dados: { 'PROXIMO PASSO': 'PAGAMENTO', 'OBSERVACAO': 'FAZER MLE' } });
  if (e === 'PAGAMENTO' && /\b(FAZER|PETICIONAR|SOLICITAR|PEDIR)\b/.test(obs)) A.push({ id: 'mle', rot: 'MLE peticionado', dados: { 'PAGO': 'MLE', 'OBSERVACAO': 'MLE PETICIONADO' }, destaque: true });
  if ((e === 'PAGAMENTO' || e === 'DECISAO') && pago !== 'PAGO') A.push({ id: 'recebido', rot: 'Honorários recebidos', dados: { 'PAGO': 'PAGO', 'PROXIMO PASSO': 'PAGAMENTO' } });
  if (e === 'RENUNCIAR') A.push({ id: 'renuncia', rot: 'Renúncia peticionada', mover: 'RENUNCIAS', destaque: true });
  if (pago === 'PAGO' && e !== 'RENUNCIAR') A.push({ id: 'concluir', rot: 'Arquivar em Concluídos', mover: 'CONCLUSOS', destaque: true });
  return A;
}

// mesmo critério do script do Discord para abreviar nomes de pessoas
function nomeCurto(n) {
  if (!n) return '';
  const p = String(n).trim().split(/\s+/);
  if (/LTDA|S\/A|S\.A|INSTITUTO|UNIMED|MINISTERIO|PREFEITURA|FAZENDA|SANTA CASA|CENTRO|CLINICA|HOSPITAL/i.test(chave(n))) return abreviar(n, 40);
  return p[0] + (p.length > 1 ? ' ' + p.slice(1).filter(x => ['DA', 'DE', 'DO', 'DAS', 'DOS', 'E'].indexOf(x.toUpperCase()) < 0).map(x => x[0].toUpperCase() + '.').join(' ') : '');
}
function ehInstituicao(n) { return /LTDA|S\/A|S\.A\b|INSTITUTO|UNIMED|MINISTERIO|PREFEITURA|FAZENDA|SANTA CASA|CENTRO|CLINICA|HOSPITAL|ASSOCIACAO|MUNICIPIO|SAUDE|SEGURO|CAIXA|BANCO|COOPERATIVA|ODONTOLOGIA/.test(chave(n)); }
function ehInterdicao(m) { return /INTERDI|CURATELA/.test(chave(m['TIPO'])) || /FAMILIA/.test(chave(m['FORUM'])); }
// quem é examinado: na interdição costuma ser a parte requerida
function periciadoDe(m) {
  if (ehInterdicao(m) && m['REQUERIDA'] && !ehInstituicao(m['REQUERIDA'])) return m['REQUERIDA'];
  return m['REQUERENTE'] || m['REQUERIDA'] || '';
}
function tipoAgendaDe(m) {
  const t = chave(m['TIPO']), r = chave(m['REQUERIDA']);
  if (/INSS/.test(r) || /ACIDENT/.test(t)) return 'INSS';
  if (ehInterdicao(m)) return 'INTERDIÇÃO';
  if (/ERRO/.test(t)) return 'ERRO MÉDICO';
  if (/DANO/.test(t)) return 'DANOS MORAIS';
  return 'OUTROS';
}

// eventos do calendário: horários da agenda, datas de perícia dos processos e prazos
function montarEventos(pericias, agenda) {
  const ev = [];
  const naAgenda = new Set();
  (agenda || []).forEach(a => {
    const d = parseData(a.data);
    if (!d) return;
    naAgenda.add(d.getTime() + '|' + chave(a.nome));
    ev.push({ tipo: 'pericia', d: d, hora: a.hora, titulo: a.nome, sub: [a.tipo, a.local].filter(Boolean).join(' · '), status: a.status, slot: a });
  });
  (pericias || []).forEach(it => {
    const pd = parseData(it.m['PERICIA']);
    if (pd && !naAgenda.has(pd.getTime() + '|' + chave(it.m['REQUERENTE'])) && !naAgenda.has(pd.getTime() + '|' + chave(it.m['REQUERIDA']))) {
      ev.push({ tipo: 'pericia', d: pd, hora: '', titulo: periciadoDe(it.m), sub: 'Data da perícia no processo', it: it });
    }
    const pz = prazoDe(it.m);
    if (pz && it.c.quem && it.c.quem !== 'acompanhar') {
      ev.push({ tipo: 'prazo', d: pz, hora: '', titulo: it.c.acao, sub: it.m['REQUERENTE'], it: it, nivel: nivelPrazo(diasAte(pz)) });
    }
  });
  return ev.sort((a, b) => a.d - b.d || (a.tipo === b.tipo ? 0 : a.tipo === 'prazo' ? -1 : 1) || String(a.hora || '99').localeCompare(String(b.hora || '99')));
}

function porMes(listaM, ini, n) {
  const out = [];
  for (let i = 0; i < n; i++) { const d = new Date(ini.getFullYear(), ini.getMonth() + i, 1); out.push({ ano: d.getFullYear(), mes: d.getMonth(), n: 0 }); }
  listaM.forEach(m => {
    const d = parseData(m['PERICIA']);
    if (!d) return;
    const o = out.find(x => x.ano === d.getFullYear() && x.mes === d.getMonth());
    if (o) o.n++;
  });
  return out;
}

function gcalLink(ev) {
  const ymd = d => d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate());
  let datas;
  const h = String(ev.hora || '').match(/^(\d{1,2}):(\d{2})$/);
  if (h) {
    const fim = somaMinutos(ev.hora, 30).replace(':', '');
    datas = ymd(ev.d) + 'T' + pad2(+h[1]) + h[2] + '00/' + ymd(ev.d) + 'T' + fim + '00';
  } else {
    datas = ymd(ev.d) + '/' + ymd(somaDias(ev.d, 1));
  }
  const proc = ev.it ? ev.it.m['PROCESSO'] : '';
  const titulo = (ev.tipo === 'prazo' ? 'Prazo: ' : 'Perícia: ') + ev.titulo + (ev.tipo === 'prazo' && ev.sub ? ' (' + nomeCurto(ev.sub) + ')' : '');
  const det = [ev.sub, proc ? 'Processo ' + formatarCNJ(proc) : ''].filter(Boolean).join('\n');
  return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(titulo) +
    '&dates=' + datas + '&ctz=America/Sao_Paulo&details=' + encodeURIComponent(det) +
    (ev.slot && ev.slot.local ? '&location=' + encodeURIComponent(ev.slot.local) : '');
}

function linkEsaj(proc) {
  const d = digitos(proc);
  if (d.length !== 20) return '';
  const cnj = formatarCNJ(d);
  return 'https://esaj.tjsp.jus.br/cpopg/search.do?conversationId=&cbPesquisa=NUMPROC&numeroDigitoAnoUnificado=' + encodeURIComponent(d.slice(0, 7) + '-' + d.slice(7, 9) + '.' + d.slice(9, 13)) +
    '&foroNumeroUnificado=' + d.slice(16) + '&dadosConsulta.valorConsultaNuUnificado=' + encodeURIComponent(cnj) +
    '&dadosConsulta.valorConsultaNuUnificado=UNIFICADO&dadosConsulta.valorConsulta=&dadosConsulta.tipoNuProcesso=UNIFICADO';
}

// pré-visualização do markdown do Discord (negrito e código)
function mdDiscord(s) { return esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\n/g, '<br>'); }

// ---------- textos prontos para o Discord ----------
function linhaTarefa(it) {
  const pz = prazoDe(it.m);
  return '• `' + it.m['PROCESSO'] + '` · ' + nomeCurto(it.m['REQUERENTE']) +
    (pz ? ' · prazo ' + fmtCurto(pz) + (diasAte(pz) < 0 ? ' 🔴' : diasAte(pz) <= 2 ? ' 🟠' : '') : '') +
    (it.m['OBSERVACAO'] ? ' · ' + abreviar(it.m['OBSERVACAO'], 50) : '') + (semReserva(it.m) ? ' ⚠️ sem reserva' : '');
}
function agruparPorAcao(lista) {
  const g = {};
  lista.forEach(it => { (g[it.c.acao] = g[it.c.acao] || []).push(it); });
  const L = [];
  Object.keys(g).sort((a, b) => g[b].length - g[a].length).forEach(acao => {
    L.push('**' + acao + ' (' + g[acao].length + ')**');
    g[acao].sort((a, b) => (prazoDe(a.m) || 9e15) - (prazoDe(b.m) || 9e15)).forEach(it => L.push(linhaTarefa(it)));
    L.push('');
  });
  return L.join('\n').trim();
}
function gerarTarefas(itens, quem) {
  const lista = itens.filter(it => it.c.quem === quem);
  return lista.length ? agruparPorAcao(lista) : '✅ Nada pendente.';
}
function gerarPauta(slots, dia) {
  if (!slots.length) return 'Nenhuma perícia marcada em ' + fmtData(dia) + '.';
  const L = ['📅 **' + slots.length + ' perícia(s) em ' + fmtExtenso(dia) + '**', ''];
  slots.slice().sort((a, b) => a.hora.localeCompare(b.hora)).forEach(a => {
    L.push('• **' + a.hora + '**  ' + nomeCurto(a.nome) + (a.tipo ? ' · ' + a.tipo : '') + (a.local ? ' · ' + abreviar(a.local, 60) : '') + (chave(a.status) !== 'OK' ? ' ⚠️ ' + a.status : ''));
  });
  return L.join('\n');
}
function gerarPrazos(itens, dias) {
  const lista = itens.filter(it => it.c.quem && it.c.quem !== 'acompanhar' && prazoDe(it.m) && diasAte(prazoDe(it.m)) <= dias)
    .sort((a, b) => prazoDe(a.m) - prazoDe(b.m));
  if (!lista.length) return '✅ Nenhum prazo nos próximos ' + dias + ' dias.';
  return lista.map(it => {
    const pz = prazoDe(it.m), n = diasAte(pz);
    return (n < 0 ? '🔴' : n <= 2 ? '🟠' : '🟡') + ' **' + fmtCurto(pz) + '** (' + txtDias(n) + ') · ' + (it.c.quem === 'perito' ? '👨‍⚕️ ' : '🧑‍💼 ') + it.c.acao + ' · `' + it.m['PROCESSO'] + '`';
  }).join('\n');
}
// vai para #honorários-e-mle, que o assistente também lê: só quantidades e processos, nunca somas
function gerarFinanceiro(itens) {
  const ativos = itens.filter(it => chave(it.m['PAGO']) !== 'PAGO');
  const grupos = [['MLE', '📝 MLE peticionado'], ['OFICIO', '📨 Ofício expedido'], ['PARCIAL', '🧩 Recebido em parte'], ['RESERVADO', '🏦 Reservado no processo']];
  const L = [];
  const mle = itens.filter(it => it.c.acao === 'Peticionar o pagamento (MLE)');
  if (mle.length) { L.push('**✍️ Falta peticionar o MLE: ' + mle.length + '**'); mle.forEach(it => L.push('• `' + it.m['PROCESSO'] + '` · ' + nomeCurto(it.m['REQUERENTE']))); L.push(''); }
  grupos.forEach(([k, t]) => {
    const g = ativos.filter(it => chave(it.m['PAGO']) === k);
    if (!g.length) return;
    L.push('**' + t + ': ' + g.length + '**');
    if (k !== 'RESERVADO') g.forEach(it => L.push('• `' + it.m['PROCESSO'] + '` · ' + nomeCurto(it.m['REQUERENTE']) + (it.m['OBSERVACAO'] ? ' · ' + abreviar(it.m['OBSERVACAO'], 50) : '')));
    L.push('');
  });
  return L.join('\n').trim() || 'Nenhum pagamento pendente.';
}
function gerarFilaAgendamento(itens) {
  const lista = itens.filter(it => etapaDe(it.m) === 'AGENDAMENTO');
  if (!lista.length) return '✅ Nenhum processo aguardando agendamento.';
  const ok = lista.filter(it => !semReserva(it.m)), sem = lista.filter(it => semReserva(it.m));
  const L = [];
  if (ok.length) { L.push('**✅ Pode agendar (' + ok.length + ')**'); ok.forEach(it => L.push('• `' + it.m['PROCESSO'] + '` · ' + nomeCurto(periciadoDe(it.m)) + ' · ' + (it.m['CIDADE'] || ''))); L.push(''); }
  if (sem.length) { L.push('**⚠️ Aguardando reserva de honorários (' + sem.length + ')**'); sem.forEach(it => L.push('• `' + it.m['PROCESSO'] + '` · ' + nomeCurto(periciadoDe(it.m)))); }
  return L.join('\n').trim();
}

// ---------- documentos (Drive) ----------
function ehIntegra(nome) { return /INTEGRA|AUTOS|PROCESSO COMPLETO|COPIA INTEGRAL|CAPA/.test(chave(nome)); }
function tipoArquivo(mime, nome) {
  if (mime === 'application/vnd.google-apps.folder') return { k: 'pasta', r: 'PASTA' };
  if (mime === 'application/vnd.google-apps.document') return { k: 'doc', r: 'DOCS' };
  if (mime === 'application/vnd.google-apps.spreadsheet') return { k: 'planilha', r: 'PLAN' };
  if (mime === 'application/pdf') return { k: 'pdf', r: 'PDF' };
  if (/^image\//.test(mime || '')) return { k: 'img', r: 'FOTO' };
  if (/word/.test(mime || '')) return { k: 'doc', r: 'WORD' };
  const ext = (String(nome || '').match(/\.([a-z0-9]{2,5})$/i) || [])[1];
  return { k: 'outro', r: ext ? ext.toUpperCase() : 'ARQ' };
}
function urlPrevia(f) {
  if (f.mime === 'application/vnd.google-apps.document') return 'https://docs.google.com/document/d/' + f.id + '/preview';
  if (f.mime === 'application/vnd.google-apps.spreadsheet') return 'https://docs.google.com/spreadsheets/d/' + f.id + '/preview';
  if (f.mime === 'application/vnd.google-apps.presentation') return 'https://docs.google.com/presentation/d/' + f.id + '/preview';
  return 'https://drive.google.com/file/d/' + f.id + '/preview';
}
function fmtTamanho(b) {
  if (!b) return '';
  if (b < 1024 * 1024) return Math.max(1, Math.round(b / 1024)) + ' KB';
  return (b / 1024 / 1024).toFixed(1).replace('.', ',') + ' MB';
}
// modelos sugeridos para a etapa do processo
function sugerirModelos(modelos, m) {
  const e = etapaDe(m), obs = chave(m['OBSERVACAO']), tipo = chave(m['TIPO']);
  const nuc = /NUCLEO/.test(chave(m['CIDADE'])) || /NUCLEO/.test(chave(m['FORUM']));
  const chaves = {
    ACEITE: ['ACEITE'], RESERVA: ['ACEITE COM AGENDAMENTO', 'AGENDAMENTO'], AGENDAMENTO: ['AGENDAMENTO'],
    PERICIA: ['DECLARACAO COMPARECIMENTO', 'AUTORIZACAO FOTOGRAFIA'], LAUDO: ['LAUDO'], ESCLARECIMENTOS: ['ESCLARECIMENTO'],
    DECISAO: /COMPARECEU/.test(obs) ? ['NAO COMPARECIMENTO'] : [], PETICAO: ['PETICAO'],
    PAGAMENTO: ['MLE', 'HONORARIOS', 'FORMULARIO'], RENUNCIAR: ['RENUNCIA']
  }[e] || [];
  return modelos.map(md => {
    const t = chave(md.nome).replace(/[^A-Z0-9 ]/g, ' ');
    let s = 0;
    chaves.forEach((k, i) => { if (t.indexOf(k) >= 0) s = Math.max(s, 4 - Math.min(i, 2)); });
    if (!s) return { md: md, s: 0 };
    if (/\bN40\b/.test(t)) { if (!nuc) return { md: md, s: 0 }; s += 2; } else if (nuc) s -= 1;
    if (/INTERDICAO/.test(t)) s += /INTERDI|CURATELA/.test(tipo) ? 2 : -9;
    if (/HOMECARE/.test(t)) s += /HOMECARE/.test(tipo) ? 2 : -9;
    return { md: md, s: s };
  }).filter(x => x.s > 0).sort((a, b) => b.s - a.s || a.md.nome.length - b.md.nome.length).slice(0, 4).map(x => x.md);
}

// ---------- gestão (perfil perito) ----------
const ESTAGIOS_RECEB = [
  { k: 'pedido', rot: 'Já pedido', desc: 'MLE peticionado, ofício expedido ou recebido em parte', cor: '#1baf7a' },
  { k: 'pronto', rot: 'Pronto para pedir', desc: 'Valor reservado e laudo entregue', cor: '#2a78d6' },
  { k: 'andamento', rot: 'Em andamento', desc: 'Valor reservado, perícia ou laudo por fazer', cor: '#6250d6' },
  { k: 'incerto', rot: 'Sem reserva', desc: 'Honorários ainda não depositados', cor: '#8a94a3' }
];
function estagioRecebimento(m) {
  const pago = chave(m['PAGO']), e = etapaDe(m);
  if (pago === 'PAGO') return null;
  if (pago === 'MLE' || pago === 'OFICIO' || pago === 'PARCIAL') return 'pedido';
  if (pago === 'RESERVADO') return (['DECISAO', 'ESCLARECIMENTOS', 'PETICAO', 'PAGAMENTO'].indexOf(e) >= 0 || chave(m['LAUDO']) === 'ENTREGUE') ? 'pronto' : 'andamento';
  return 'incerto';
}
// linhas antigas de CONCLUSOS têm colunas deslocadas: procura o valor e o PAGO em qualquer célula
function valorLinha(v, ufesp) {
  for (const c of v) {
    const s = String(c || '').trim();
    if (/^R\$\s?[\d.]+,\d{2}$/.test(s) || /^[\d.,]+\s*UFESPS?$/i.test(s)) return valorHonorarios(s, ufesp);
  }
  return 0;
}
function pagoLinha(v) { return v.some(c => chave(c) === 'PAGO'); }
function somarPor(lista, fn, ufesp) {
  const g = {};
  lista.forEach(it => {
    const k = (fn(it) || '').trim() || 'Sem informação';
    const v = valorHonorarios(it.m['HONORARIOS'], ufesp);
    const o = g[k] = g[k] || { k: k, n: 0, soma: 0, comValor: 0 };
    o.n++;
    if (v) { o.soma += v; o.comValor++; }
  });
  return Object.keys(g).map(k => Object.assign(g[k], { media: g[k].comValor ? g[k].soma / g[k].comValor : 0 })).sort((a, b) => b.soma - a.soma || b.n - a.n);
}
function laudosPendentes(itens) {
  return itens.filter(it => etapaDe(it.m) === 'LAUDO').map(it => {
    const d = parseData(it.m['PERICIA']);
    return { it: it, dias: d ? -diasAte(d) : null };
  }).sort((a, b) => (b.dias == null ? -1 : b.dias) - (a.dias == null ? -1 : a.dias));
}
function gerarCSV(linhas) {
  const q = v => { const s = String(v == null ? '' : v); return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  return '﻿' + linhas.map(l => l.map(q).join(';')).join('\r\n');
}

if (typeof document === 'undefined') {
  if (typeof module !== 'undefined') module.exports = {
    estagioRecebimento, valorLinha, pagoLinha, somarPor, laudosPendentes, gerarCSV,
    ehIntegra, tipoArquivo, urlPrevia, fmtTamanho, sugerirModelos,
    chave, esc, digitos, formatarCNJ, parseData, zeroHoje, diasAte, linhaMapa, classificar, semReserva, somaMinutos, isoParaBr, brParaIso,
    numBR, valorHonorarios, fmtBRL, fmtBRLcurto, etapaDe, posTrilha, nivelPrazo, acoesRapidas, nomeCurto, periciadoDe, tipoAgendaDe,
    montarEventos, porMes, gcalLink, linkEsaj, mdDiscord, gerarTarefas, gerarPauta, gerarPrazos, gerarFinanceiro, gerarFilaAgendamento, txtDias
  };
  return;
}

/* ================================================================
   APLICATIVO
   ================================================================ */
const CFG = window.PERICIAS_CONFIG || {};
const API = CFG.API || '';
const UFESP = Number(CFG.UFESP) || 0;
const $ = s => document.querySelector(s);
const ABAS_PLANILHA = ['PERICIAS', 'CONCLUSOS', 'RENUNCIAS'];
const TITULO_ABA = { PERICIAS: 'Perícias', CONCLUSOS: 'Concluídos', RENUNCIAS: 'Renúncias' };
const MSG_CONFLITO = 'A planilha foi alterada por outra pessoa. Atualize e tente de novo.';

const ICONES = {
  painel: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  processos: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  calendario: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  agenda: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  financeiro: '<path d="M12 3v18M16.5 7.5C16.5 6 14.5 5 12 5S7.5 6 7.5 7.8 9.5 10.4 12 11s4.5 1.5 4.5 3.3S14.5 19 12 19s-4.5-1-4.5-2.6"/>',
  discord: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/><path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01"/>',
  arquivo: '<rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9M10 13h4"/>',
  atualizar: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>',
  sair: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H4"/>',
  copiar: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/>',
  fechar: '<path d="M6 6l12 12M18 6 6 18"/>',
  externo: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  gestao: '<path d="M4 20V11M10 20V5M16 20v-8M21 20H3"/>'
};
function ic(nome) { return '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">' + (ICONES[nome] || '') + '</svg>'; }

// o perito vê "Gestão" (totais e projeção); o assistente vê "Pagamentos" (só o operacional)
function views() {
  const perito = state.papel === 'perito';
  return [
    { id: 'painel', rot: 'Painel' },
    { id: 'processos', rot: 'Processos' },
    { id: 'calendario', rot: 'Calendário' },
    { id: 'agenda', rot: 'Agenda' },
    perito ? { id: 'gestao', rot: 'Gestão', icone: 'gestao' } : { id: 'pagamentos', rot: 'Pagamentos', icone: 'financeiro' },
    { id: 'discord', rot: 'Discord' },
    { id: 'arquivo', rot: 'Arquivo' }
  ];
}

function ler(k, padrao) { try { const v = localStorage.getItem(k); return v == null ? padrao : v; } catch (e) { return padrao; } }
function gravar(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
function apagar(k) { try { localStorage.removeItem(k); } catch (e) {} }

const filtroVazio = () => ({ q: '', quem: '', etapa: '', tipo: '', cidade: '' });
const state = {
  token: ler('pericias_token', ''),
  user: '',
  papel: 'assistente',
  gestao: null,
  gFiltro: '',
  view: 'painel',
  dados: {},
  agenda: [],
  atividade: [],
  canais: [],
  hora: '',
  filtro: filtroVazio(),
  modoProc: ler('pericias_modo', 'lista'),
  cal: (() => { const h = zeroHoje(); return { ano: h.getFullYear(), mes: h.getMonth(), sel: h.getTime(), f: { pericia: true, prazo: true } }; })(),
  arquivo: 'CONCLUSOS',
  arqQ: '',
  verPassadas: false,
  dc: { modelo: 0, canal: '', titulo: '', texto: '', processo: '' },
  ficha: null,
  docs: {},
  modelos: null,
  modelosUrl: '',
  ultimoDoc: null
};

/* ---------- API ---------- */
async function api(acao, extra) {
  if (!API || API.indexOf('COLE_AQUI') === 0) throw new Error('Falta colar a URL do Apps Script em config.js');
  let r;
  try {
    r = await fetch(API, { method: 'POST', redirect: 'follow', body: JSON.stringify(Object.assign({ acao: acao, token: state.token }, extra || {})) });
  } catch (e) { throw new Error('Sem conexão com o servidor.'); }
  let j;
  try { j = await r.json(); } catch (e) { throw new Error('Resposta inválida do servidor.'); }
  if (j && j.erro === 'SESSAO') { sair(false); throw new Error('Sessão expirada. Entre novamente.'); }
  return j;
}

function toast(msg, op) {
  op = op || {};
  const t = $('#toast');
  t.innerHTML = '<span>' + esc(msg) + '</span>' + (op.acao ? '<button type="button">' + esc(op.acao.rot) + '</button>' : '');
  t.className = 'toast' + (op.erro ? ' erro' : '');
  t.hidden = false;
  if (op.acao) t.querySelector('button').onclick = () => { t.hidden = true; op.acao.fn(); };
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { t.hidden = true; }, op.acao ? 7000 : op.erro ? 6000 : 2800);
}

/* ---------- LOGIN ---------- */
function mostrarLogin() { $('#tela-app').hidden = true; $('#tela-login').hidden = false; }
function mostrarApp() { $('#tela-login').hidden = true; $('#tela-app').hidden = false; $('#nav-user').textContent = state.user; }

function sair(avisarServidor) {
  if (avisarServidor && state.token) api('logout').catch(() => {});
  state.token = ''; state.dados = {}; state.agenda = []; state.papel = 'assistente'; state.gestao = null; state.docs = {};
  apagar('pericias_token');
  fecharFicha();
  mostrarLogin();
}

$('#form-login').addEventListener('submit', async ev => {
  ev.preventDefault();
  const btn = $('#lg-btn'), msg = $('#lg-msg');
  msg.textContent = ''; btn.disabled = true; btn.textContent = 'Entrando...';
  try {
    const j = await api('login', { usuario: $('#lg-user').value, senha: $('#lg-pass').value, token: '' });
    if (!j.ok) { msg.textContent = j.erro || 'Não foi possível entrar.'; return; }
    state.token = j.token; state.user = j.usuario; state.papel = j.papel || 'assistente'; state.gestao = null;
    gravar('pericias_token', j.token);
    $('#lg-pass').value = '';
    mostrarApp();
    await recarregar(false);
  } catch (e) {
    msg.textContent = e.message;
  } finally {
    btn.disabled = false; btn.textContent = 'Entrar';
  }
});

/* ---------- CARGA ---------- */
let carregando = null;
async function recarregar(silencioso) {
  if (carregando) return carregando;
  if (!silencioso) $('#conteudo').innerHTML = '<p class="carregando">Carregando...</p>';
  $('#sync').textContent = 'Atualizando...';
  carregando = (async () => {
    try {
      const j = await api('inicial');
      if (!j.ok && j.erro === 'Ação desconhecida') throw new Error('O backend no Apps Script está desatualizado. Cole o AppPericias.gs novo e publique uma Nova versão em Implantar > Gerenciar implantações.');
      if (!j.ok) throw new Error(j.erro || 'Erro ao carregar');
      state.user = j.usuario || state.user;
      state.papel = j.papel || 'assistente';
      ABAS_PLANILHA.forEach(a => { if (j.abas && j.abas[a]) state.dados[a] = j.abas[a]; });
      state.agenda = j.agenda || [];
      state.atividade = j.atividade || [];
      state.canais = j.canais || [];
      state.hora = j.hora || '';
      $('#nav-user').textContent = state.user;
      $('#sync').textContent = state.hora ? 'Atualizado às ' + state.hora : '';
      render();
    } catch (e) {
      $('#sync').textContent = '';
      toast(e.message, { erro: true });
      if (!silencioso) $('#conteudo').innerHTML = '<p class="carregando">Não consegui carregar os dados. ' + esc(e.message) + '</p>';
    } finally { carregando = null; }
  })();
  return carregando;
}

/* ---------- DADOS ---------- */
function itens(aba) {
  const d = state.dados[aba];
  if (!d) return [];
  return d.linhas.map(l => {
    const m = linhaMapa(d.cabecalho, l.v);
    return { aba: aba, linha: l.linha, v: l.v, m: m, c: aba === 'PERICIAS' ? classificar(m) : { quem: null, acao: '' } };
  });
}
function ativos() { return itens('PERICIAS').filter(it => chave(it.m['STATUS']) !== 'RENUNCIA'); }
function acharItem(aba, linha) { return itens(aba).find(i => String(i.linha) === String(linha)); }
function cabDe(aba, norm) {
  const d = state.dados[aba];
  if (!d) return null;
  const h = d.cabecalho.find(x => chave(x) === norm);
  if (h) return h;
  if (norm === 'PRAZOS') return d.cabecalho.find(x => chave(x) === 'PRAZO') || null;
  return null;
}
function processoDoSlot(a) {
  const n = chave(a.nome);
  return ativos().find(it => chave(it.m['REQUERENTE']) === n || chave(it.m['REQUERIDA']) === n);
}

/* ---------- NAVEGAÇÃO ---------- */
function renderNav() {
  const urgentes = ativos().filter(it => it.c.quem && it.c.quem !== 'acompanhar' && prazoDe(it.m) && diasAte(prazoDe(it.m)) <= 2).length;
  $('#nav-itens').innerHTML = views().map(v => '<button type="button" data-acao="ir" data-view="' + v.id + '" class="' + (state.view === v.id ? 'ativa' : '') + '"' + (state.view === v.id ? ' aria-current="page"' : '') + '>' +
    ic(v.icone || v.id) + '<span>' + v.rot + '</span>' + (v.id === 'painel' && urgentes ? '<span class="badge" title="Prazos vencidos ou em até 2 dias">' + urgentes + '</span>' : '') + '</button>').join('');
}

// endereço antigo (#financeiro) ou de outro perfil cai na tela equivalente
function viewValida(view) {
  if (['financeiro', 'gestao', 'pagamentos'].indexOf(view) >= 0) return state.papel === 'perito' ? 'gestao' : 'pagamentos';
  return views().some(v => v.id === view) ? view : 'painel';
}

function ir(view) {
  view = viewValida(view);
  state.view = view;
  if (location.hash !== '#' + view) history.replaceState(null, '', '#' + view);
  render();
  window.scrollTo(0, 0);
}

function render() {
  const ativo = document.activeElement;
  const foco = ativo && ativo.id && $('#conteudo').contains(ativo) ? { id: ativo.id, s: ativo.selectionStart, e: ativo.selectionEnd } : null;
  state.view = viewValida(state.view);
  renderNav();
  $('#titulo').textContent = (views().find(v => v.id === state.view) || views()[0]).rot;
  $('#btn-novo').textContent = (state.view === 'agenda' || state.view === 'calendario') ? '+ Horário' : '+ Processo';
  $('#btn-novo').hidden = state.view === 'discord' || state.view === 'gestao';
  if (!state.dados.PERICIAS) return;
  ({ painel: renderPainel, processos: renderProcessos, calendario: renderCalendario, agenda: renderAgenda,
     gestao: renderGestao, pagamentos: renderPagamentos, discord: renderDiscord, arquivo: renderArquivo })[state.view]();
  if (foco) {
    const el = document.getElementById(foco.id);
    if (el) { el.focus(); try { if (foco.s != null) el.setSelectionRange(foco.s, foco.e); } catch (e) {} }
  }
}

/* ---------- PEÇAS DE TELA ---------- */
function chipPrazo(m, curto) {
  const d = prazoDe(m);
  if (!d) return '';
  const n = diasAte(d), nv = nivelPrazo(n);
  return '<span class="chip ' + nv + '">' + (curto ? '' : 'Prazo ') + fmtCurto(d) + ' · ' + txtDias(n) + '</span>';
}
function chipPago(m) {
  const p = m['PAGO'];
  if (!p) return '';
  return '<span class="chip ' + (chave(p) === 'PAGO' ? 'ok' : 'dinheiro') + '">' + esc(p) + '</span>';
}

function cardProcesso(it) {
  const m = it.m, c = it.c;
  const cls = it.aba === 'PERICIAS' ? (c.quem || 'concluido') : 'concluido';
  const chips = [];
  if (it.aba === 'PERICIAS') {
    if (c.quem) chips.push('<span class="chip ' + c.quem + '">' + QUEM_ROT[c.quem] + '</span>');
    chips.push('<span class="chip etapa">' + esc(m['PROXIMO PASSO'] || 'Sem etapa') + '</span>');
    chips.push(chipPrazo(m));
  } else if (m['STATUS']) chips.push('<span class="chip etapa">' + esc(m['STATUS']) + '</span>');
  const pd = parseData(m['PERICIA']);
  if (pd) chips.push('<span class="chip pericia">Perícia ' + fmtCurto(pd) + '</span>');
  else if (m['PERICIA']) chips.push('<span class="chip pericia">' + esc(m['PERICIA']) + '</span>');
  chips.push(chipPago(m));
  if (m['HONORARIOS']) chips.push('<span class="chip">' + esc(m['HONORARIOS']) + '</span>');
  if (it.aba === 'PERICIAS' && semReserva(m)) chips.push('<span class="chip critico">⚠ Sem reserva</span>');
  return '<button type="button" class="pcard ' + cls + '" data-acao="ficha" data-aba="' + it.aba + '" data-linha="' + it.linha + '">' +
    '<h3><span>' + esc(m['REQUERENTE'] || formatarCNJ(m['PROCESSO']) || '(sem nome)') + '</span>' + (m['TIPO'] ? '<small class="chip">' + esc(abreviar(m['TIPO'], 22)) + '</small>' : '') + '</h3>' +
    '<div class="proc">' + esc(formatarCNJ(m['PROCESSO'])) + (m['CIDADE'] ? ' · ' + esc(m['CIDADE']) : '') + '</div>' +
    (it.aba === 'PERICIAS' && c.acao ? '<div class="acao">' + esc(c.acao) + '</div>' : '') +
    '<div class="chips">' + chips.filter(Boolean).join('') + '</div>' +
    (m['OBSERVACAO'] ? '<div class="obs">' + esc(m['OBSERVACAO']) + '</div>' : '') +
    '</button>';
}

function barras(lista, opt) {
  opt = opt || {};
  const max = Math.max(1, ...lista.map(x => x.val));
  if (!lista.length) return '<p class="vazio">Sem dados.</p>';
  return '<div class="barras">' + lista.map(x =>
    '<button type="button" class="barra" ' + (x.attrs || '') + ' title="' + esc(x.rot + ': ' + (x.txt || x.val)) + '">' +
    '<span class="rot">' + esc(x.rot) + '</span><span class="trilho"><span class="fill" style="width:' + Math.max(1.5, x.val / max * 100).toFixed(1) + '%;' + (x.cor ? 'background:' + x.cor : '') + '"></span></span>' +
    '<span class="v">' + esc(x.txt || x.val) + '</span></button>').join('') + '</div>';
}

/* ================= PAINEL ================= */
function renderPainel() {
  const lista = ativos();
  const hoje = zeroHoje();
  const por = q => lista.filter(i => i.c.quem === q);
  const perito = por('perito'), assist = por('assistente'), acomp = por('acompanhar');
  const comPrazo = lista.filter(i => i.c.quem && i.c.quem !== 'acompanhar' && prazoDe(i.m)).sort((a, b) => prazoDe(a.m) - prazoDe(b.m));
  const vencidos = comPrazo.filter(i => diasAte(prazoDe(i.m)) < 0);
  const prox7 = comPrazo.filter(i => { const n = diasAte(prazoDe(i.m)); return n >= 0 && n <= 7; });
  const agenda = state.agenda.map(a => Object.assign({ d: parseData(a.data) }, a)).filter(a => a.d);
  const agHoje = agenda.filter(a => mesmoDia(a.d, hoje)).sort((a, b) => a.hora.localeCompare(b.hora));
  const ag14 = agenda.filter(a => { const n = diasAte(a.d); return n > 0 && n <= 14; }).sort((a, b) => a.d - b.d || a.hora.localeCompare(b.hora));
  const aReceber = lista.filter(i => chave(i.m['PAGO']) !== 'PAGO');
  const totalReceber = aReceber.reduce((s, i) => s + valorHonorarios(i.m['HONORARIOS'], UFESP), 0);
  const reservado = aReceber.filter(i => PAGO_LIBERA.indexOf(chave(i.m['PAGO'])) >= 0).reduce((s, i) => s + valorHonorarios(i.m['HONORARIOS'], UFESP), 0);
  const prazosHoje = comPrazo.filter(i => diasAte(prazoDe(i.m)) === 0);

  const hr = new Date().getHours();
  let h = '<div class="saudacao"><div><h2>' + (hr < 12 ? 'Bom dia' : hr < 18 ? 'Boa tarde' : 'Boa noite') + ', ' + esc(state.user) + '</h2><p>' + esc(fmtExtenso(hoje)) + '</p></div></div>';

  h += '<section class="kpis">' +
    '<button type="button" class="kpi" style="--k:var(--navy)" data-acao="filtrar" data-quem=""><span class="rot">Processos ativos</span><span class="val">' + lista.length + '</span><span class="sub">' + perito.length + ' perito · ' + assist.length + ' assistente · ' + acomp.length + ' aguardando</span></button>' +
    '<button type="button" class="kpi" style="--k:' + (vencidos.length ? 'var(--vencido)' : 'var(--alerta)') + '" data-acao="ir" data-view="calendario"><span class="rot">Prazos em 7 dias</span><span class="val">' + prox7.length + '</span><span class="sub">' + (vencidos.length ? '<b style="color:var(--vencido)">' + vencidos.length + ' vencido(s)</b>' : 'nenhum vencido') + '</span></button>' +
    '<button type="button" class="kpi" style="--k:var(--pericia)" data-acao="ir" data-view="agenda"><span class="rot">Perícias em 14 dias</span><span class="val">' + ag14.length + '</span><span class="sub">' + (agHoje.length ? agHoje.length + ' hoje' : ag14.length ? 'próxima ' + fmtCurto(ag14[0].d) : 'nada agendado') + '</span></button>' +
    (state.papel === 'perito'
      ? '<button type="button" class="kpi" style="--k:var(--gold)" data-acao="ir" data-view="gestao"><span class="rot">A receber</span><span class="val">' + fmtBRLcurto(totalReceber) + '</span><span class="sub">' + fmtBRLcurto(reservado) + ' já reservado ou pedido</span></button>'
      : '<button type="button" class="kpi" style="--k:var(--assist)" data-acao="ir" data-view="pagamentos"><span class="rot">MLE a peticionar</span><span class="val">' + lista.filter(i => i.c.acao === 'Peticionar o pagamento (MLE)').length + '</span><span class="sub">' + lista.filter(i => ['MLE', 'OFICIO', 'PARCIAL'].indexOf(chave(i.m['PAGO'])) >= 0).length + ' aguardando pagamento</span></button>') +
    '</section>';

  h += '<div class="grid">';
  // hoje
  h += '<section class="cartao c5"><h2>Hoje</h2>';
  if (!agHoje.length && !prazosHoje.length) h += '<p class="vazio">Sem perícias nem prazos para hoje.</p>';
  if (agHoje.length) h += '<div class="lista-linhas">' + agHoje.map(slotLinha).join('') + '</div>';
  if (prazosHoje.length) h += '<div class="lista-linhas" style="margin-top:8px">' + prazosHoje.map(linhaPrazo).join('') + '</div>';
  if (ag14.length) {
    h += '<h2 style="margin-top:16px">Próximas perícias</h2><div class="lista-linhas">' +
      ag14.slice(0, 6).map(a => '<button type="button" class="linha-item" data-acao="slot" data-linha="' + a.linha + '"><span class="hora">' + fmtCurto(a.d) + '</span><span class="meio"><b>' + esc(a.hora + '  ' + a.nome) + '</b><small>' + esc([a.tipo, a.local].filter(Boolean).join(' · ')) + '</small></span></button>').join('') +
      (ag14.length > 6 ? '<button type="button" class="link" data-acao="ir" data-view="agenda" style="margin-top:6px">Ver todas (' + ag14.length + ')</button>' : '') + '</div>';
  }
  h += '</section>';

  // prazos (semáforo) e atenção, empilhados ao lado de "Hoje"
  h += '<div class="c7 pilha"><section class="cartao"><div class="cartao-topo"><h2>Prazos</h2><span class="legenda" style="margin:0"><span><i style="background:var(--vencido)"></i>vencido</span><span><i style="background:var(--critico)"></i>até 2 dias</span><span><i style="background:var(--alerta)"></i>até 5</span><span><i style="background:var(--atencao)"></i>até 10</span></span></div>';
  const pzLista = comPrazo.filter(i => diasAte(prazoDe(i.m)) <= 15).slice(0, 9);
  h += pzLista.length ? '<div class="lista-linhas">' + pzLista.map(linhaPrazo).join('') + '</div>' : '<p class="vazio">Nenhum prazo nos próximos 15 dias.</p>';
  if (comPrazo.length > pzLista.length) h += '<button type="button" class="link" data-acao="ir" data-view="calendario" style="margin-top:8px">Ver no calendário</button>';
  h += '</section>';

  // atenção
  h += '<section class="cartao"><h2>Atenção</h2>';
  const alertas = [];
  const semRes = lista.filter(i => semReserva(i.m));
  if (vencidos.length) alertas.push('<button type="button" class="alerta-box vermelho" data-acao="ir" data-view="calendario"><span>🔴</span><span><b>' + vencidos.length + '</b> prazo(s) vencido(s). Confira e atualize a data ou a etapa.</span></button>');
  if (semRes.length) alertas.push('<button type="button" class="alerta-box" data-acao="filtrar" data-etapa="AGENDAMENTO"><span>⚠️</span><span><b>' + semRes.length + '</b> com agendamento ou perícia sem honorários reservados. Não agendar antes do depósito.</span></button>');
  const periciaPassada = lista.filter(i => etapaDe(i.m) === 'PERICIA' && parseData(i.m['PERICIA']) && diasAte(parseData(i.m['PERICIA'])) < 0);
  if (periciaPassada.length) alertas.push('<button type="button" class="alerta-box azul" data-acao="filtrar" data-etapa="PERICIA"><span>🩺</span><span><b>' + periciaPassada.length + '</b> perícia(s) com data já passada e etapa ainda em PERÍCIA. Atualize para laudo ou não comparecimento.</span></button>');
  const aConfirmar = agenda.filter(a => diasAte(a.d) >= 0 && chave(a.status) !== 'OK');
  if (aConfirmar.length) alertas.push('<button type="button" class="alerta-box" data-acao="ir" data-view="agenda"><span>📅</span><span><b>' + aConfirmar.length + '</b> horário(s) da agenda ainda sem status OK.</span></button>');
  const mle = lista.filter(i => i.c.acao === 'Peticionar o pagamento (MLE)');
  if (mle.length) alertas.push('<button type="button" class="alerta-box azul" data-acao="filtrar" data-etapa="PAGAMENTO"><span>💰</span><span><b>' + mle.length + '</b> pagamento(s) liberado(s) aguardando o MLE.</span></button>');
  const semPrazo = lista.filter(i => i.c.quem && i.c.quem !== 'acompanhar' && !prazoDe(i.m)).length;
  if (semPrazo) alertas.push('<button type="button" class="alerta-box azul" data-acao="ir" data-view="processos"><span>🗓️</span><span><b>' + semPrazo + '</b> tarefa(s) do perito ou do assistente sem prazo cadastrado.</span></button>');
  h += alertas.length ? alertas.join('') : '<p class="vazio">Tudo em ordem.</p>';
  h += '</section></div>';

  // funil por etapa
  const etapas = ETAPAS.concat([{ k: 'OUTROS', rot: 'Outros' }, { k: 'SEM', rot: 'Sem etapa' }])
    .map(e => ({ e: e, n: lista.filter(i => etapaDe(i.m) === e.k).length })).filter(x => x.n);
  h += '<section class="cartao c6"><h2>Processos por etapa</h2><p class="dica">Toque numa etapa para ver os processos</p>' +
    barras(etapas.map(x => ({ rot: x.e.rot, val: x.n, attrs: 'data-acao="filtrar" data-etapa="' + x.e.k + '"' }))) + '</section>';

  // perícias por mês
  const ini = new Date(hoje.getFullYear(), hoje.getMonth() - 6, 1);
  const meses = porMes(itens('PERICIAS').concat(itens('CONCLUSOS')).map(i => i.m), ini, 9);
  const maxM = Math.max(1, ...meses.map(x => x.n));
  h += '<section class="cartao c6"><h2>Perícias por mês</h2><div class="colunas" role="img" aria-label="Perícias por mês">' + meses.map(x => {
    const atual = x.ano === hoje.getFullYear() && x.mes === hoje.getMonth();
    const futuro = new Date(x.ano, x.mes, 1) > hoje;
    return '<div class="col' + (atual ? ' atual' : futuro ? ' futuro' : '') + '" title="' + MESES[x.mes] + ' de ' + x.ano + ': ' + x.n + ' perícia(s)"><div class="area"><span class="v">' + x.n + '</span><span class="b" style="height:' + (x.n / maxM * 100).toFixed(1) + '%"></span></div><span class="r">' + MESES[x.mes].slice(0, 3) + '</span></div>';
  }).join('') + '</div><div class="legenda"><span><i style="background:var(--serie)"></i>realizadas</span><span><i style="background:var(--gold)"></i>mês atual</span><span><i style="background:#9cc2ee"></i>agendadas</span></div></section>';

  // por tipo
  const tipos = {};
  lista.forEach(i => { const t = (i.m['TIPO'] || 'Sem tipo').trim(); tipos[t] = (tipos[t] || 0) + 1; });
  const topTipos = Object.keys(tipos).map(k => ({ rot: k, val: tipos[k] })).sort((a, b) => b.val - a.val);
  const resto = topTipos.slice(6).reduce((s, x) => s + x.val, 0);
  const tl = topTipos.slice(0, 6).map(x => ({ rot: x.rot, val: x.val, attrs: 'data-acao="filtrar" data-tipo="' + esc(x.rot) + '"' }));
  if (resto) tl.push({ rot: 'Outros tipos', val: resto });
  h += '<section class="cartao c6"><h2>Processos ativos por tipo</h2>' + barras(tl) + '</section>';

  // atividade recente
  h += '<section class="cartao c6"><h2>Atividade recente no app</h2>';
  h += state.atividade.length ? '<div class="lista-linhas">' + state.atividade.slice(0, 7).map(a =>
    '<div class="linha-item" style="cursor:default"><span class="ponto ' + (/Discord/.test(a.acao) ? 'pericia' : 'ok') + '"></span><span class="meio"><b>' + esc(a.acao) + (a.processo ? ' · ' + esc(formatarCNJ(a.processo)) : '') + '</b><small>' + esc(a.data + ' · ' + a.usuario + (a.detalhe ? ' · ' + a.detalhe : '')) + '</small></span></div>').join('') + '</div>'
    : '<p class="vazio">As alterações feitas pelo app aparecem aqui (quem fez, quando e o quê).</p>';
  h += '</section></div>';
  $('#conteudo').innerHTML = h;
}

function slotLinha(a) {
  const ok = chave(a.status) === 'OK';
  return '<button type="button" class="linha-item" data-acao="slot" data-linha="' + a.linha + '"><span class="hora">' + esc(a.hora) + '</span><span class="meio"><b>' + esc(a.nome) + '</b><small>' + esc([a.tipo, a.local].filter(Boolean).join(' · ')) + '</small></span><span class="chip ' + (ok ? 'ok' : 'alerta') + '">' + esc(a.status || 'sem status') + '</span></button>';
}
function linhaPrazo(it) {
  const d = prazoDe(it.m), n = diasAte(d), nv = nivelPrazo(n);
  return '<button type="button" class="linha-item" data-acao="ficha" data-aba="PERICIAS" data-linha="' + it.linha + '"><span class="ponto ' + nv + '"></span><span class="meio"><b>' + esc(it.c.acao) + '</b><small>' + esc((it.m['REQUERENTE'] || '') + ' · ' + formatarCNJ(it.m['PROCESSO'])) + '</small></span>' +
    '<span class="chip ' + it.c.quem + '">' + QUEM_ROT[it.c.quem] + '</span><span class="chip ' + nv + '">' + fmtCurto(d) + ' · ' + txtDias(n) + '</span></button>';
}

/* ================= PROCESSOS ================= */
function filtrarProcessos() {
  const f = state.filtro, q = chave(f.q);
  return ativos().filter(it => {
    if (f.quem && (it.c.quem || 'concluido') !== f.quem) return false;
    if (f.etapa && etapaDe(it.m) !== f.etapa) return false;
    if (f.tipo && (it.m['TIPO'] || 'Sem tipo').trim() !== f.tipo) return false;
    if (f.cidade && it.m['CIDADE'] !== f.cidade) return false;
    if (q && chave(it.v.join(' ') + ' ' + formatarCNJ(it.m['PROCESSO'])).indexOf(q) < 0 && digitos(it.m['PROCESSO']).indexOf(q.replace(/\D/g, '') || '§') < 0) return false;
    return true;
  });
}

function renderProcessos() {
  const todos = ativos();
  const f = state.filtro;
  const lista = filtrarProcessos().sort((a, b) => (prazoDe(a.m) || 9e15) - (prazoDe(b.m) || 9e15) || posTrilha(a.m) - posTrilha(b.m) || a.linha - b.linha);
  const tipos = Array.from(new Set(todos.map(i => (i.m['TIPO'] || 'Sem tipo').trim()))).sort();
  const cidades = Array.from(new Set(todos.map(i => i.m['CIDADE']).filter(Boolean))).sort();
  const opt = (v, r, sel) => '<option value="' + esc(v) + '"' + (sel === v ? ' selected' : '') + '>' + esc(r) + '</option>';
  let h = '<div class="ferramentas">' +
    '<input type="search" id="f-q" placeholder="Buscar nome, número, cidade, observação..." value="' + esc(f.q) + '" autocomplete="off">' +
    '<select id="f-quem">' + opt('', 'Todos os responsáveis', f.quem) + opt('perito', 'Perito', f.quem) + opt('assistente', 'Assistente', f.quem) + opt('acompanhar', 'Aguardando (acompanhar)', f.quem) + opt('concluido', 'Sem pendência', f.quem) + '</select>' +
    '<select id="f-etapa">' + opt('', 'Todas as etapas', f.etapa) + ETAPAS.map(e => opt(e.k, e.rot, f.etapa)).join('') + opt('OUTROS', 'Outros', f.etapa) + opt('SEM', 'Sem etapa', f.etapa) + '</select>' +
    '<select id="f-tipo">' + opt('', 'Todos os tipos', f.tipo) + tipos.map(t => opt(t, t, f.tipo)).join('') + '</select>' +
    '<select id="f-cidade">' + opt('', 'Todas as cidades', f.cidade) + cidades.map(t => opt(t, t, f.cidade)).join('') + '</select>' +
    '<span class="alternar" role="group" aria-label="Modo de exibição"><button type="button" data-acao="modo" data-modo="lista" class="' + (state.modoProc === 'lista' ? 'ativa' : '') + '">Lista</button><button type="button" data-acao="modo" data-modo="quadro" class="' + (state.modoProc === 'quadro' ? 'ativa' : '') + '">Quadro</button></span>' +
    '</div>';
  const filtrando = f.q || f.quem || f.etapa || f.tipo || f.cidade;
  h += '<p class="contagem">' + lista.length + ' de ' + todos.length + ' processos' + (filtrando ? ' · <button type="button" class="link" data-acao="limpar-filtros">limpar filtros</button>' : '') + '</p>';

  if (state.modoProc === 'quadro') {
    h += '<p class="dica-quadro">Arraste um cartão para outra coluna para mudar a etapa (no computador). No celular, toque no cartão e use "Mudar etapa".</p>';
    const cols = ETAPAS.concat([{ k: 'OUTROS', rot: 'Outros' }, { k: 'SEM', rot: 'Sem etapa' }]);
    h += '<div class="quadro">' + cols.map(e => {
      const cards = lista.filter(it => etapaDe(it.m) === e.k);
      if (!cards.length && (e.k === 'OUTROS' || e.k === 'SEM')) return '';
      return '<div class="coluna" data-etapa="' + e.k + '"><h3>' + esc(e.rot) + '<span>' + cards.length + '</span></h3>' + cards.map(it =>
        '<div class="kcard ' + (it.c.quem || '') + '" draggable="true" role="button" tabindex="0" data-acao="ficha" data-aba="PERICIAS" data-linha="' + it.linha + '">' +
        '<b>' + esc(it.m['REQUERENTE'] || '(sem nome)') + '</b><small>' + esc(formatarCNJ(it.m['PROCESSO'])) + '</small>' +
        '<span class="chips">' + chipPrazo(it.m, true) + (parseData(it.m['PERICIA']) ? '<span class="chip pericia">Perícia ' + fmtCurto(parseData(it.m['PERICIA'])) + '</span>' : '') + chipPago(it.m) + (semReserva(it.m) ? '<span class="chip critico">⚠ Sem reserva</span>' : '') + '</span></div>').join('') + '</div>';
    }).join('') + '</div>';
  } else {
    h += lista.length ? '<div class="pgrade">' + lista.map(cardProcesso).join('') + '</div>' : '<p class="vazio">Nada encontrado com esses filtros.</p>';
  }
  $('#conteudo').innerHTML = h;

  $('#f-q').addEventListener('input', e => { state.filtro.q = e.target.value; render(); });
  [['#f-quem', 'quem'], ['#f-etapa', 'etapa'], ['#f-tipo', 'tipo'], ['#f-cidade', 'cidade']].forEach(([s, k]) => $(s).addEventListener('change', e => { state.filtro[k] = e.target.value; render(); }));
  if (state.modoProc === 'quadro') ligarArrastar();
}

function ligarArrastar() {
  let arrastando = null;
  document.querySelectorAll('.kcard').forEach(k => {
    k.addEventListener('dragstart', e => { arrastando = k.dataset.linha; k.classList.add('arrastando'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', k.dataset.linha); });
    k.addEventListener('dragend', () => { k.classList.remove('arrastando'); document.querySelectorAll('.coluna.sobre').forEach(c => c.classList.remove('sobre')); });
  });
  document.querySelectorAll('.coluna').forEach(col => {
    col.addEventListener('dragover', e => { e.preventDefault(); col.classList.add('sobre'); });
    col.addEventListener('dragleave', () => col.classList.remove('sobre'));
    col.addEventListener('drop', e => {
      e.preventDefault(); col.classList.remove('sobre');
      const linha = e.dataTransfer.getData('text/plain') || arrastando;
      const it = acharItem('PERICIAS', linha);
      const et = ETAPAS.find(x => x.k === col.dataset.etapa);
      if (!it || !et || etapaDe(it.m) === et.k) return;
      aplicar('PERICIAS', it, { 'PROXIMO PASSO': et.val }, 'Etapa: ' + et.rot);
    });
  });
}

/* ================= GRAVAÇÃO COM DESFAZER ================= */
async function aplicar(aba, it, dadosNorm, motivo, op) {
  op = op || {};
  const d = state.dados[aba];
  const dados = {}, antes = {};
  Object.keys(dadosNorm).forEach(k => {
    const hdr = cabDe(aba, k);
    if (!hdr) return;
    const atual = it.v[d.cabecalho.indexOf(hdr)] || '';
    if (String(atual).trim() === String(dadosNorm[k]).trim()) return;
    dados[hdr] = dadosNorm[k]; antes[hdr] = atual;
  });
  if (!Object.keys(dados).length) { toast('Nada para mudar.'); return false; }
  return gravarHeaders(aba, it.linha, it.m['PROCESSO'], dados, antes, motivo, op);
}

async function gravarHeaders(aba, linha, processo, dados, antes, motivo, op) {
  op = op || {};
  const d = state.dados[aba];
  const reg = d.linhas.find(l => l.linha === linha);
  const backup = reg ? reg.v.slice() : null;
  if (reg) Object.keys(dados).forEach(hdr => { reg.v[d.cabecalho.indexOf(hdr)] = dados[hdr]; });
  render(); atualizarFichaAberta();
  try {
    const j = await api('salvar', { aba: aba, linha: linha, processoEsperado: processo, dados: dados, motivo: motivo });
    if (!j.ok) throw new Error(j.erro === 'CONFLITO' ? MSG_CONFLITO : (j.erro || 'Erro ao salvar'));
    const hProc = cabDe(aba, 'PROCESSO');
    const procDepois = Object.prototype.hasOwnProperty.call(dados, hProc) ? dados[hProc] : processo;
    if (!op.semDesfazer && antes) toast(motivo + ': salvo', { acao: { rot: 'Desfazer', fn: () => gravarHeaders(aba, linha, procDepois, antes, null, 'Desfeito', { semDesfazer: true }) } });
    else toast(motivo);
    recarregar(true);
    return true;
  } catch (e) {
    if (reg && backup) reg.v = backup;
    render(); atualizarFichaAberta();
    toast(e.message, { erro: true });
    return false;
  }
}

async function mover(aba, it, para, extraNorm) {
  const extra = {};
  Object.keys(extraNorm || {}).forEach(k => { const h = (state.dados[para] && state.dados[para].cabecalho.find(x => chave(x) === k)); if (h) extra[h] = extraNorm[k]; });
  try {
    const j = await api('mover', { de: aba, para: para, linha: it.linha, processoEsperado: it.m['PROCESSO'], extra: extra });
    if (!j.ok) throw new Error(j.erro === 'CONFLITO' ? MSG_CONFLITO : (j.erro || 'Erro ao mover'));
    fecharFicha();
    toast('Movido para ' + TITULO_ABA[para]);
    await recarregar(true);
  } catch (e) { toast(e.message, { erro: true }); }
}

/* ================= FICHA DO PROCESSO ================= */
function abrirFicha(aba, linha, aba2) {
  state.ficha = { aba: aba, linha: Number(linha), aba2: aba2 || 'acoes', confirma: null, hist: null };
  $('#drawer').hidden = false;
  document.body.style.overflow = 'hidden';
  renderFicha();
}
function fecharFicha() { state.ficha = null; $('#drawer').hidden = true; document.body.style.overflow = ''; }
function atualizarFichaAberta() { if (state.ficha && state.ficha.aba2 !== 'dados') renderFicha(); }

function renderFicha() {
  const f = state.ficha;
  if (!f) return;
  const it = acharItem(f.aba, f.linha);
  if (!it) { fecharFicha(); return; }
  const m = it.m, c = it.c, proc = m['PROCESSO'];
  const valor = valorHonorarios(m['HONORARIOS'], UFESP);
  let h = '<header class="ficha-topo"><div class="linha1"><h2 id="ficha-nome">' + esc(m['REQUERENTE'] || '(sem nome)') + '</h2><button type="button" class="btn icone" data-acao="fechar-ficha" aria-label="Fechar">' + ic('fechar') + '</button></div>' +
    (m['REQUERIDA'] ? '<p class="contra">x ' + esc(m['REQUERIDA']) + '</p>' : '') +
    '<div class="proc"><span>' + esc(formatarCNJ(proc)) + '</span><button type="button" class="btn pequeno" data-acao="copiar" data-txt="' + esc(formatarCNJ(proc)) + '">' + ic('copiar') + 'Copiar nº</button>' +
    (chave(m['SISTEMA']) === 'ESAJ' && linkEsaj(proc) ? '<a class="btn pequeno" target="_blank" rel="noopener" href="' + esc(linkEsaj(proc)) + '">' + ic('externo') + 'e-SAJ</a>' : '') + '</div>' +
    '<div class="chips">' + [m['SISTEMA'], [m['CIDADE'], m['FORUM']].filter(Boolean).join(' · '), m['TIPO']].filter(Boolean).map(x => '<span class="chip">' + esc(x) + '</span>').join('') +
    (m['HONORARIOS'] ? '<span class="chip dinheiro">' + esc(m['HONORARIOS']) + (valor && /UFESP/i.test(m['HONORARIOS']) ? ' ≈ ' + fmtBRL(valor) : '') + '</span>' : '') + chipPago(m) + '</div></header>';

  h += '<div class="ficha-corpo">';
  if (f.aba === 'PERICIAS') {
    const pos = posTrilha(m);
    h += '<div class="trilha" aria-label="Etapa do processo">' + TRILHA.map((t, i) => '<div class="passo' + (i < pos ? ' feito' : i === pos ? ' atual' : '') + '"><i></i><span>' + t + '</span></div>').join('') + '</div>';
    h += '<div class="prox"><span class="ponto ' + (c.quem || 'ok') + '" style="width:12px;height:12px"></span><div class="meio"><small>Próxima ação' + (c.quem ? ' · ' + QUEM_ROT[c.quem] : '') + '</small><b>' + esc(c.acao || 'Nenhuma pendência') + '</b>' +
      (m['OBSERVACAO'] ? '<div style="font-size:.85rem;color:var(--texto2);margin-top:2px">' + esc(m['OBSERVACAO']) + '</div>' : '') + '</div>' + chipPrazo(m) + '</div>';
    if (semReserva(m)) h += '<div class="alerta-box vermelho" style="cursor:default"><span>⚠️</span><span>Honorários ainda não reservados: não agendar nem realizar a perícia antes do depósito.</span></div>';
  }

  h += '<div class="subabas" role="tablist">' + [['acoes', 'Ações'], ['dados', 'Dados'], ['hist', 'Histórico']].map(([k, r]) => '<button type="button" role="tab" data-acao="ficha-aba" data-k="' + k + '" class="' + (f.aba2 === k ? 'ativa' : '') + '" aria-selected="' + (f.aba2 === k) + '">' + r + '</button>').join('') + '</div>';

  if (f.aba2 === 'acoes') {
    if (f.aba === 'PERICIAS') {
      const acs = acoesRapidas(m);
      h += acs.length ? '<div class="acoes">' + acs.map(a => '<button type="button" class="btn' + (a.destaque ? ' primario' : '') + '" data-acao="rapida" data-id="' + a.id + '">' + esc(a.rot) + '</button>').join('') + '</div>' : '';
      h += '<div class="campo" style="margin-top:14px;max-width:320px"><label for="f-etapa-mudar">Mudar etapa (próximo passo)</label><select id="f-etapa-mudar"><option value="">Escolha...</option>' + ETAPAS.map(e => '<option value="' + e.k + '"' + (etapaDe(m) === e.k ? ' disabled' : '') + '>' + e.rot + '</option>').join('') + '</select></div>';
    } else {
      h += '<p class="vazio">Processo em ' + TITULO_ABA[f.aba] + '.</p><div class="acoes"><button type="button" class="btn primario" data-acao="mover" data-para="PERICIAS">Voltar para Perícias</button></div>';
    }
    if (f.confirma) {
      h += '<div class="confirma"><b>' + esc(f.confirma.titulo) + '</b><ul>' + f.confirma.linhas.map(l => '<li>' + l + '</li>').join('') + '</ul><div class="acoes"><button type="button" class="btn primario" data-acao="confirmar">Confirmar</button><button type="button" class="btn" data-acao="cancelar-confirma">Cancelar</button></div></div>';
    }
    h += '<section class="docs" id="docs-bloco"></section>';
  } else if (f.aba2 === 'dados') {
    h += '<div class="form-grid" id="ficha-form">' + camposForm(f.aba, it) + '</div><div class="acoes" style="margin-top:14px"><button type="button" class="btn primario" data-acao="salvar-dados">Salvar alterações</button></div>';
  } else {
    if (!f.hist) h += '<p class="vazio">Carregando histórico...</p>';
    else if (!f.hist.length) h += '<p class="vazio">Nenhuma alteração registrada pelo app ainda. As próximas mudanças (etapa, pagamento, agenda, Discord) aparecem aqui com data e autor.</p>';
    else h += '<ul class="hist">' + f.hist.map(x => '<li><time>' + esc(x.data + ' · ' + x.usuario) + '</time><b>' + esc(x.acao) + '</b>' + (x.detalhe ? '<p>' + esc(x.detalhe) + '</p>' : '') + '</li>').join('') + '</ul>';
  }
  h += '</div>';

  h += '<footer class="ficha-rodape"><button type="button" class="btn discord" data-acao="ficha-discord">' + ic('discord') + 'Enviar ao Discord</button><span class="esp"></span>';
  if (f.aba === 'PERICIAS') h += '<button type="button" class="btn" data-acao="mover" data-para="CONCLUSOS">Concluídos</button><button type="button" class="btn perigo" data-acao="mover" data-para="RENUNCIAS">Renunciei</button>';
  h += '</footer>';
  $('#ficha').innerHTML = h;

  const sel = $('#f-etapa-mudar');
  if (sel) sel.addEventListener('change', () => {
    const et = ETAPAS.find(x => x.k === sel.value);
    if (et) pedirConfirmacao(it, 'Mudar etapa para ' + et.rot, { 'PROXIMO PASSO': et.val }, 'Etapa: ' + et.rot);
  });
  if (f.aba2 === 'dados') ligarForm($('#ficha-form'), f.aba, it);
  if (f.aba2 === 'hist' && !f.hist) carregarHistorico(proc);
  if (f.aba2 === 'acoes') renderDocsBloco(it);
}

/* ================= DOCUMENTOS (DRIVE) ================= */
function fichaItem() { return state.ficha ? acharItem(state.ficha.aba, state.ficha.linha) : null; }
function chaveDocs(it) { return digitos(it.m['PROCESSO']) || it.aba + ':' + it.linha; }
function fmtDataHora(ms) { const d = new Date(ms); return fmtData(d) + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()); }
function erroApi(j, padrao) { return j.erro === 'CONFLITO' ? MSG_CONFLITO : (j.erro || padrao); }

async function carregarDocs(it, forcar) {
  const k = chaveDocs(it);
  if (!forcar && state.docs[k] && !state.docs[k].erro && !state.docs[k].carregando) return;
  state.docs[k] = { carregando: true };
  renderDocsBloco(it);
  try {
    const j = await api('docs', { aba: it.aba, linha: it.linha, processoEsperado: it.m['PROCESSO'] });
    state.docs[k] = j.ok ? j : { erro: erroApi(j, 'Erro ao ler o Drive') };
  } catch (e) { state.docs[k] = { erro: e.message }; }
  const atual = fichaItem();
  if (atual && chaveDocs(atual) === k) renderDocsBloco(atual);
}

function renderDocsBloco(it) {
  const el = $('#docs-bloco');
  if (!el) return;
  const d = state.docs[chaveDocs(it)];
  if (!d) { carregarDocs(it); return; }
  let h = '<div class="docs-topo"><div><h3>Documentos</h3>' + (d.pasta ? '<small>📁 ' + esc(d.pasta.caminho) + '</small>' : '') + '</div>';
  if (d.pasta) h += '<div class="acoes"><button type="button" class="btn pequeno primario" data-acao="doc-gerar">Gerar documento</button><button type="button" class="btn pequeno" data-acao="doc-enviar">Enviar arquivo</button>' +
    '<a class="btn pequeno" href="' + esc(d.pasta.url) + '" target="_blank" rel="noopener">' + ic('externo') + 'Abrir pasta</a>' +
    '<button type="button" class="btn pequeno icone" data-acao="doc-atualizar" title="Atualizar lista" aria-label="Atualizar lista">' + ic('atualizar') + '</button></div>';
  h += '</div>';
  if (d.carregando) h += '<p class="vazio">Procurando a pasta no Drive...</p>';
  else if (d.erro) h += '<div class="alerta-box vermelho" style="cursor:default"><span>⚠️</span><span>' + esc(d.erro) + '</span></div><button type="button" class="btn pequeno" data-acao="doc-atualizar">Tentar de novo</button>';
  else if (d.pasta) {
    const arqs = d.arquivos.slice().sort((a, b) => (ehIntegra(b.nome) - ehIntegra(a.nome)) || b.mod - a.mod);
    h += arqs.length ? '<div class="arquivos">' + arqs.map(f => {
      const t = tipoArquivo(f.mime, f.nome);
      return '<button type="button" class="arq" data-acao="doc-ver" data-id="' + esc(f.id) + '"><span class="tipo-arq ' + t.k + '">' + t.r + '</span><span class="meio"><b>' + esc(f.nome) + '</b><small>' + esc(fmtDataHora(f.mod) + (f.tam ? ' · ' + fmtTamanho(f.tam) : '')) + '</small></span>' +
        (ehIntegra(f.nome) ? '<span class="chip pericia">Íntegra</span>' : '') + '</button>';
    }).join('') + '</div>' : '<p class="vazio">Pasta vazia. Envie a íntegra do processo pelo botão "Enviar arquivo" (até 15 MB) ou direto no Drive.</p>';
  } else {
    const s = d.sugestao || {};
    h += '<div class="alerta-box azul" style="cursor:default"><span>📁</span><span>Não achei a pasta deste periciado em <b>PERICIAS / ' + esc(s.cidade || '?') + '</b>' + (s.cidadeExiste ? '' : ' (a pasta da cidade também será criada)') + '.</span></div>' +
      '<div class="linha-form"><div class="campo"><label for="pasta-nome">Nome da pasta</label><input id="pasta-nome" value="' + esc(s.nome || '') + '"></div><button type="button" class="btn primario" data-acao="pasta-criar">Criar pasta</button></div>';
    if (d.candidatas && d.candidatas.length) h += '<div class="linha-form"><div class="campo"><label for="pasta-vinc">Ou vincular a uma pasta que já existe em ' + esc(s.cidade) + '</label><select id="pasta-vinc"><option value="">Escolha...</option>' +
      d.candidatas.map(c => '<option value="' + esc(c.id) + '">' + esc(c.nome) + '</option>').join('') + '</select></div><button type="button" class="btn" data-acao="pasta-vincular">Vincular</button></div>';
  }
  h += '<input type="file" id="docs-file" multiple hidden>';
  el.innerHTML = h;
  const inp = $('#docs-file');
  inp.addEventListener('change', () => { enviarArquivos(it, inp.files); });
}

async function acaoPasta(it, acao, extra, msgOk) {
  try {
    const j = await api(acao, Object.assign({ aba: it.aba, linha: it.linha, processoEsperado: it.m['PROCESSO'] }, extra));
    if (!j.ok) throw new Error(erroApi(j, 'Erro no Drive'));
    state.docs[chaveDocs(it)] = j;
    renderDocsBloco(it);
    toast(msgOk);
  } catch (e) { toast(e.message, { erro: true }); }
}

async function enviarArquivos(it, files) {
  const lista = Array.from(files || []);
  for (const f of lista) {
    if (f.size > 15 * 1024 * 1024) { toast(f.name + ' tem mais de 15 MB. Envie pelo Drive (botão Abrir pasta).', { erro: true }); continue; }
    toast('Enviando ' + f.name + '...');
    try {
      const b64 = await new Promise((ok, falha) => {
        const r = new FileReader();
        r.onload = () => ok(String(r.result).split(',')[1] || '');
        r.onerror = () => falha(new Error('Não consegui ler o arquivo.'));
        r.readAsDataURL(f);
      });
      const j = await api('upload', { aba: it.aba, linha: it.linha, processoEsperado: it.m['PROCESSO'], nome: f.name, mime: f.type, dados: b64 });
      if (!j.ok) throw new Error(erroApi(j, 'Erro ao enviar'));
      toast(f.name + ': enviado');
    } catch (e) { toast(e.message, { erro: true }); }
  }
  if (lista.length) carregarDocs(it, true);
}

function abrirPrevia(f) {
  if (f.mime === 'application/vnd.google-apps.folder') { window.open(f.url, '_blank', 'noopener'); return; }
  modal.classList.add('grande');
  $('#modal-titulo').textContent = f.nome;
  $('#modal-corpo').innerHTML = '<iframe class="previa" src="' + esc(urlPrevia(f)) + '" title="' + esc(f.nome) + '"></iframe>' +
    '<p class="dica-previa">Se a prévia não aparecer, entre na sua conta Google neste navegador ou use "Abrir no Drive".</p>';
  $('#modal-rodape').innerHTML = '<a class="btn primario" href="' + esc(f.url) + '" target="_blank" rel="noopener">' + ic('externo') + 'Abrir no Drive</a>';
  if (!modal.open) modal.showModal();
}

async function abrirGerador(it) {
  modal.classList.remove('grande');
  $('#modal-titulo').textContent = 'Gerar documento';
  $('#modal-corpo').innerHTML = '<p class="carregando">Carregando modelos...</p>';
  $('#modal-rodape').innerHTML = '';
  if (!modal.open) modal.showModal();
  if (!state.modelos) {
    try {
      const j = await api('modelos');
      if (!j.ok) throw new Error(j.erro || 'Erro ao ler os modelos');
      state.modelos = j.modelos; state.modelosUrl = j.url || '';
    } catch (e) { $('#modal-corpo').innerHTML = '<p class="vazio">' + esc(e.message) + '</p>'; return; }
  }
  renderGerador(it, '');
}

function renderGerador(it, q) {
  const d = state.docs[chaveDocs(it)] || {};
  const sug = sugerirModelos(state.modelos, it.m);
  const qq = chave(q);
  const todos = state.modelos.filter(md => !qq || chave(md.nome).indexOf(qq) >= 0);
  const item = md => '<button type="button" class="arq" data-acao="modelo-gerar" data-id="' + esc(md.id) + '"><span class="tipo-arq doc">DOCS</span><span class="meio"><b>' + esc(md.nome) + '</b></span></button>';
  let h = '<p class="dica-gerador">Escolha o modelo. O app faz uma cópia na pasta <b>' + esc(d.pasta ? d.pasta.caminho : '') + '</b> e preenche número do processo, partes, juízo, data de hoje e o agendamento. O que ele não sabe (valores, número de evento, folhas) fica marcado em amarelo.</p>';
  if (sug.length && !qq) h += '<h3 class="sub">Sugeridos para a etapa ' + esc(rotEtapa(etapaDe(it.m))) + '</h3><div class="arquivos">' + sug.map(item).join('') + '</div>';
  h += '<h3 class="sub">Todos os modelos (' + state.modelos.length + ')</h3><input type="search" id="modelo-q" class="busca-modelo" placeholder="Buscar modelo..." value="' + esc(q) + '" autocomplete="off">' +
    '<div class="arquivos">' + (todos.length ? todos.map(item).join('') : '<p class="vazio">Nenhum modelo com esse nome.</p>') + '</div>';
  $('#modal-corpo').innerHTML = h;
  $('#modal-rodape').innerHTML = state.modelosUrl ? '<a class="btn pequeno" href="' + esc(state.modelosUrl) + '" target="_blank" rel="noopener">' + ic('externo') + 'Abrir a pasta de modelos</a>' : '';
  const inp = $('#modelo-q');
  inp.addEventListener('input', () => { renderGerador(it, inp.value); const n = $('#modelo-q'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); });
}

async function gerarDocumento(it, id) {
  const md = state.modelos.find(x => x.id === id);
  if (!md) return;
  $('#modal-corpo').innerHTML = '<p class="carregando">Gerando "' + esc(md.nome) + '"... pode levar alguns segundos.</p>';
  $('#modal-rodape').innerHTML = '';
  try {
    const j = await api('gerarDoc', { aba: it.aba, linha: it.linha, processoEsperado: it.m['PROCESSO'], modeloId: id });
    if (!j.ok) throw new Error(erroApi(j, 'Erro ao gerar o documento'));
    state.ultimoDoc = { id: j.doc.id, nome: j.doc.nome, url: j.doc.url, mime: 'application/vnd.google-apps.document' };
    $('#modal-corpo').innerHTML = '<div class="gerado"><span class="tipo-arq doc">DOCS</span><div><b>' + esc(j.doc.nome) + '</b><small>Salvo na pasta do periciado</small></div></div>' +
      (j.conferir && j.conferir.length ? '<div class="alerta-box" style="cursor:default"><span>🖍️</span><span>Confira antes de protocolar: <b>' + esc(j.conferir.join(', ')) + '</b>. Esses trechos estão marcados em amarelo no documento; tire o realce depois de conferir.</span></div>'
        : '<p class="vazio">Preenchido. Revise e baixe em PDF pelo Docs (Arquivo > Fazer download > PDF).</p>');
    $('#modal-rodape').innerHTML = '<a class="btn primario" href="' + esc(j.doc.url) + '" target="_blank" rel="noopener">' + ic('externo') + 'Abrir no Docs para editar</a><button type="button" class="btn" data-acao="doc-ver-ultimo">Visualizar aqui</button>';
    carregarDocs(it, true);
  } catch (e) {
    $('#modal-corpo').innerHTML = '<div class="alerta-box vermelho" style="cursor:default"><span>⚠️</span><span>' + esc(e.message) + '</span></div>';
    $('#modal-rodape').innerHTML = '<button type="button" class="btn" data-acao="doc-gerar">Voltar aos modelos</button>';
  }
}

async function carregarHistorico(proc) {
  try {
    const j = await api('historico', { processo: proc });
    if (state.ficha) { state.ficha.hist = j.ok ? j.itens : []; renderFicha(); }
  } catch (e) { if (state.ficha) { state.ficha.hist = []; renderFicha(); } toast(e.message, { erro: true }); }
}

function pedirConfirmacao(it, titulo, dadosNorm, motivo) {
  const linhas = [];
  Object.keys(dadosNorm).forEach(k => {
    const hdr = cabDe(it.aba, k);
    if (!hdr) return;
    const atual = it.m[k] || '';
    if (String(atual).trim() === String(dadosNorm[k]).trim()) return;
    linhas.push('<b>' + esc(hdr) + '</b>: ' + esc(atual || 'vazio') + ' → ' + esc(dadosNorm[k] || 'vazio'));
  });
  if (!linhas.length) { toast('Já está assim.'); return; }
  state.ficha.confirma = { titulo: titulo, linhas: linhas, fn: () => aplicar(it.aba, it, dadosNorm, motivo) };
  renderFicha();
}

function acaoRapida(id) {
  const it = acharItem(state.ficha.aba, state.ficha.linha);
  const a = acoesRapidas(it.m).find(x => x.id === id);
  if (!a) return;
  if (a.especial === 'agendar') { abrirSlot(null, '', { vincular: it }); return; }
  if (a.mover) {
    state.ficha.confirma = { titulo: a.rot, linhas: ['O processo sai de Perícias e vai para <b>' + TITULO_ABA[a.mover] + '</b>.'], fn: () => mover('PERICIAS', it, a.mover, a.mover === 'RENUNCIAS' ? { 'STATUS': 'RENUNCIA', 'PROXIMO PASSO': 'RENUNCIEI' } : {}) };
    renderFicha();
    return;
  }
  pedirConfirmacao(it, a.rot, a.dados, a.rot);
}

/* ---------- formulário de dados ---------- */
const OPCOES = {
  SISTEMA: ['ESAJ', 'EPROC'],
  STATUS: ['AGUARDANDO', 'ACEITE', 'RENUNCIA'],
  PAGO: ['RESERVADO', 'MLE', 'OFÍCIO', 'PARCIAL', 'PAGO'],
  'PROXIMO PASSO': ETAPAS.map(e => e.val),
  LAUDO: ['PRODUÇÃO', 'ENTREGUE'],
  PERICIA: ['INDIRETA']
};
const LISTAS = ['SISTEMA', 'STATUS', 'PAGO', 'PROXIMO PASSO', 'LAUDO', 'TIPO', 'PERICIA', 'CIDADE', 'FORUM'];
const LARGOS = ['REQUERENTE', 'REQUERIDA', 'OBSERVACAO', 'FORUM'];
function opcoesCampo(aba, norm) {
  if (LISTAS.indexOf(norm) < 0) return null;
  const base = (OPCOES[norm] || []).slice();
  ABAS_PLANILHA.forEach(a => {
    const d = state.dados[a];
    if (!d) return;
    const i = d.cabecalho.findIndex(h => chave(h) === norm);
    if (i >= 0) d.linhas.forEach(l => {
      const v = (l.v[i] || '').trim();
      if (!v || v.length > 60 || (norm === 'PERICIA' && parseData(v))) return;
      if (base.map(chave).indexOf(chave(v)) < 0) base.push(v);
    });
  });
  return base.slice(0, 80);
}
function camposForm(aba, it, padrao) {
  const d = state.dados[aba];
  return d.cabecalho.map((hdr, idx) => {
    const n = chave(hdr);
    const val = it ? (it.v[idx] || '') : ((padrao || {})[n] || '');
    const ops = opcoesCampo(aba, n);
    const id = 'cp-' + idx;
    let ctl;
    if (n === 'OBSERVACAO') ctl = '<textarea id="' + id + '" data-h="' + esc(hdr) + '" data-orig="' + esc(val) + '">' + esc(val) + '</textarea>';
    else ctl = '<input id="' + id + '" data-h="' + esc(hdr) + '" data-orig="' + esc(val) + '" value="' + esc(val) + '"' + (ops ? ' list="dl-' + idx + '"' : '') +
      (/^(PRAZOS?|INTIMACAO)$/.test(n) ? ' placeholder="dd/mm/aaaa" inputmode="numeric"' : '') +
      (n === 'PERICIA' ? ' placeholder="dd/mm/aaaa ou INDIRETA"' : '') +
      (n === 'PROCESSO' ? ' inputmode="numeric" placeholder="0000000-00.0000.8.26.0000" data-cnj="1"' : '') + ' autocomplete="off">';
    if (ops) ctl += '<datalist id="dl-' + idx + '">' + ops.map(o => '<option value="' + esc(o) + '">').join('') + '</datalist>';
    return '<div class="campo' + (LARGOS.indexOf(n) >= 0 ? ' largo' : '') + '"><label for="' + id + '">' + esc(hdr) + '</label>' + ctl + '</div>';
  }).join('');
}
function ligarForm(root) {
  root.addEventListener('input', e => {
    const el = e.target.closest('[data-h]');
    if (el) el.closest('.campo').classList.toggle('mudou', el.value !== el.dataset.orig);
  });
  root.querySelectorAll('[data-cnj]').forEach(el => el.addEventListener('blur', () => {
    if (digitos(el.value).length === 20) { el.value = formatarCNJ(el.value); el.closest('.campo').classList.toggle('mudou', el.value !== el.dataset.orig); }
  }));
}
function lerForm(root, soMudados) {
  const o = {};
  root.querySelectorAll('[data-h]').forEach(el => {
    const v = el.value.trim();
    if (soMudados ? v !== el.dataset.orig.trim() : v) o[el.dataset.h] = v;
  });
  return o;
}

async function salvarDadosFicha() {
  const f = state.ficha, it = acharItem(f.aba, f.linha);
  const dados = lerForm($('#ficha-form'), true);
  if (!Object.keys(dados).length) { toast('Nada mudou.'); return; }
  const antes = {};
  Object.keys(dados).forEach(h => { antes[h] = it.v[state.dados[f.aba].cabecalho.indexOf(h)] || ''; });
  f.aba2 = 'acoes';
  await gravarHeaders(f.aba, it.linha, it.m['PROCESSO'], dados, antes, 'Dados editados');
}

/* ---------- novo processo ---------- */
const modal = $('#modal');
$('#modal-fechar').addEventListener('click', () => modal.close());
modal.addEventListener('click', ev => { if (ev.target === modal) modal.close(); });
modal.addEventListener('close', () => { if (modal.classList.contains('grande')) { modal.classList.remove('grande'); $('#modal-corpo').innerHTML = ''; } });
$('#modal-form').addEventListener('submit', ev => ev.preventDefault());

function abrirNovoProcesso() {
  $('#modal-titulo').textContent = 'Novo processo';
  $('#modal-corpo').innerHTML = '<div class="form-grid" id="novo-form">' + camposForm('PERICIAS', null, { 'STATUS': 'AGUARDANDO', 'PROXIMO PASSO': 'ACEITE', 'SISTEMA': 'ESAJ' }) + '</div>' +
    '<label class="check" style="margin-top:14px"><input type="checkbox" id="novo-pasta" checked> Criar a pasta do periciado no Drive (PERICIAS / CIDADE / Nome)</label>';
  $('#modal-rodape').innerHTML = '<button type="button" class="btn primario" id="novo-salvar">Cadastrar</button><span class="esp"></span><small style="color:var(--suave);align-self:center">O processo entra na aba PERICIAS</small>';
  ligarForm($('#novo-form'));
  $('#novo-salvar').onclick = async ev => {
    const btn = ev.target;
    const dados = lerForm($('#novo-form'), false);
    const hProc = cabDe('PERICIAS', 'PROCESSO');
    if (!dados[hProc]) { toast('Informe o número do processo.', { erro: true }); return; }
    btn.disabled = true;
    try {
      const req = { aba: 'PERICIAS', dados: dados };
      let j = await api('salvar', req);
      if (!j.ok && j.erro === 'DUPLICADO') {
        if (!confirm('Esse processo já está cadastrado em ' + TITULO_ABA[j.onde] + '. Cadastrar mesmo assim?')) { btn.disabled = false; return; }
        req.forcar = true;
        j = await api('salvar', req);
      }
      if (!j.ok) throw new Error(j.erro || 'Erro ao salvar');
      const criarPasta = $('#novo-pasta') && $('#novo-pasta').checked;
      modal.close();
      toast('Processo cadastrado');
      if (criarPasta) {
        const m = linhaMapa(Object.keys(dados), Object.keys(dados).map(k => dados[k]));
        api('pastaCriar', { aba: 'PERICIAS', linha: j.linha, processoEsperado: dados[hProc], nome: periciadoDe(m) })
          .then(r => toast(r.ok && r.pasta ? 'Pasta criada: ' + r.pasta.caminho : 'Processo cadastrado, mas a pasta não foi criada: ' + erroApi(r, ''), { erro: !(r.ok && r.pasta) }))
          .catch(e => toast('Processo cadastrado, mas a pasta não foi criada: ' + e.message, { erro: true }));
      }
      await recarregar(true);
    } catch (e) { toast(e.message, { erro: true }); btn.disabled = false; }
  };
  modal.showModal();
}

/* ================= CALENDÁRIO ================= */
function renderCalendario() {
  const cal = state.cal;
  const todos = montarEventos(ativos(), state.agenda).filter(e => cal.f[e.tipo]);
  const porDia = {};
  todos.forEach(e => { const k = e.d.getTime(); (porDia[k] = porDia[k] || []).push(e); });
  const primeiro = new Date(cal.ano, cal.mes, 1);
  const inicio = somaDias(primeiro, -primeiro.getDay());
  const hoje = zeroHoje();
  const doMes = todos.filter(e => e.d.getMonth() === cal.mes && e.d.getFullYear() === cal.ano);
  let h = '<div class="cal-cab"><button type="button" class="btn icone" data-acao="cal-mes" data-d="-1" aria-label="Mês anterior">‹</button><h2>' + MESES[cal.mes] + ' ' + cal.ano + '</h2><button type="button" class="btn icone" data-acao="cal-mes" data-d="1" aria-label="Próximo mês">›</button>' +
    '<button type="button" class="btn pequeno" data-acao="cal-hoje">Hoje</button><span class="esp"></span>' +
    '<button type="button" class="filtro-chip" data-acao="cal-f" data-t="pericia" aria-pressed="' + cal.f.pericia + '"><span class="ponto pericia"></span>Perícias (' + doMes.filter(e => e.tipo === 'pericia').length + ')</button>' +
    '<button type="button" class="filtro-chip" data-acao="cal-f" data-t="prazo" aria-pressed="' + cal.f.prazo + '"><span class="ponto prazo"></span>Prazos (' + doMes.filter(e => e.tipo === 'prazo').length + ')</button></div>';
  h += '<div class="grid"><div class="c8"><div class="cal-grid">' + DIAS_SEM.map(d => '<div class="cal-sem">' + d + '</div>').join('');
  for (let i = 0; i < 42; i++) {
    const d = somaDias(inicio, i);
    if ((i === 28 || i === 35) && d.getMonth() !== cal.mes && d > primeiro) break;
    const evs = porDia[d.getTime()] || [];
    const cls = ['cal-dia'];
    if (d.getMonth() !== cal.mes) cls.push('fora');
    if (d.getDay() === 0 || d.getDay() === 6) cls.push('fds');
    if (mesmoDia(d, hoje)) cls.push('hoje');
    if (d.getTime() === cal.sel) cls.push('sel');
    const rotulo = d.getDate() + ' de ' + MESES[d.getMonth()] + (evs.length ? ': ' + evs.length + ' evento(s)' : '');
    h += '<button type="button" class="' + cls.join(' ') + '" data-acao="cal-dia" data-t="' + d.getTime() + '" aria-label="' + esc(rotulo) + '"><span class="n">' + d.getDate() + '</span>' +
      evs.slice(0, 3).map(e => '<span class="ev ' + e.tipo + (e.nivel === 'vencido' ? ' vencido' : '') + '">' + esc((e.hora ? e.hora + ' ' : '') + (e.tipo === 'prazo' ? 'Prazo · ' + nomeCurto(e.sub) : nomeCurto(e.titulo))) + '</span>').join('') +
      (evs.length > 3 ? '<span class="mais">+' + (evs.length - 3) + '</span>' : '') +
      '<span class="dots">' + evs.slice(0, 4).map(e => '<span class="ponto ' + e.tipo + '"></span>').join('') + '</span></button>';
  }
  h += '</div></div>';
  const sel = new Date(cal.sel);
  const evSel = porDia[cal.sel] || [];
  h += '<section class="cartao c4 dia-lista"><h3>' + esc(fmtExtenso(sel)) + '</h3>';
  h += evSel.length ? evSel.map((e, i) => eventoHtml(e, i)).join('') : '<p class="vazio">Nada neste dia.</p>';
  h += '<div class="acoes" style="margin-top:12px"><button type="button" class="btn pequeno" data-acao="novo-slot-dia" data-dia="' + fmtData(sel) + '">+ Horário neste dia</button></div></section></div>';
  $('#conteudo').innerHTML = h;
}
function eventoHtml(e, i) {
  const proc = e.it || (e.slot && processoDoSlot(e.slot));
  return '<div class="ev-item ' + e.tipo + '"><span class="barra-cor"></span><div class="meio"><b>' + esc((e.hora ? e.hora + ' · ' : '') + (e.tipo === 'prazo' ? 'Prazo: ' + e.titulo : e.titulo)) + '</b>' +
    '<small>' + esc(e.sub || '') + (e.tipo === 'prazo' ? ' · ' + txtDias(diasAte(e.d)) : '') + '</small><div class="acoes-ev">' +
    (e.slot ? '<button type="button" class="link" data-acao="slot" data-linha="' + e.slot.linha + '">Editar horário</button>' : '') +
    (proc ? '<button type="button" class="link" data-acao="ficha" data-aba="PERICIAS" data-linha="' + proc.linha + '">Abrir processo</button>' : '') +
    '<a href="' + esc(gcalLink(e)) + '" target="_blank" rel="noopener">Google Agenda</a></div></div></div>';
}

/* ================= AGENDA ================= */
function renderAgenda() {
  const todos = state.agenda.filter(a => parseData(a.data));
  const futuros = todos.filter(a => diasAte(parseData(a.data)) >= 0);
  const passados = todos.filter(a => diasAte(parseData(a.data)) < 0);
  const fila = ativos().filter(it => etapaDe(it.m) === 'AGENDAMENTO');
  let h = '<div class="ferramentas"><button type="button" class="btn ouro" data-acao="novo-slot">+ Novo horário</button>' +
    '<button type="button" class="btn" data-acao="passadas">' + (state.verPassadas ? 'Ocultar' : 'Ver') + ' passadas (' + passados.length + ')</button></div>';
  h += '<div class="grid"><div class="c8">';
  h += futuros.length ? diasAgenda(futuros, false) : '<p class="vazio">Nenhuma perícia agendada daqui para frente.</p>';
  if (state.verPassadas && passados.length) h += '<h2 class="secao" style="font-size:1rem;margin:20px 0 10px">Passadas</h2>' + diasAgenda(passados, true);
  h += '</div><section class="cartao c4"><h2>Fila para agendar (' + fila.length + ')</h2><p class="dica">Processos com próximo passo AGENDAMENTO</p>';
  h += fila.length ? '<div class="lista-linhas">' + fila.map(it => '<button type="button" class="linha-item" data-acao="agendar-proc" data-linha="' + it.linha + '"><span class="ponto ' + (semReserva(it.m) ? 'critico' : 'ok') + '"></span><span class="meio"><b>' + esc(periciadoDe(it.m)) + '</b><small>' + esc(formatarCNJ(it.m['PROCESSO']) + ' · ' + (it.m['CIDADE'] || '')) + '</small></span>' + (semReserva(it.m) ? '<span class="chip critico">sem reserva</span>' : '<span class="chip ok">agendar</span>') + '</button>').join('') + '</div>' : '<p class="vazio">Ninguém aguardando agendamento.</p>';
  h += '</section></div>';
  $('#conteudo').innerHTML = h;
}
function diasAgenda(lista, desc) {
  const g = {};
  lista.forEach(a => { (g[a.data] = g[a.data] || []).push(a); });
  const dias = Object.keys(g).sort((x, y) => parseData(x) - parseData(y));
  if (desc) dias.reverse();
  return dias.map(dia => {
    const d = parseData(dia), n = diasAte(d);
    const slots = g[dia].sort((a, b) => a.hora.localeCompare(b.hora));
    return '<div class="dia' + (n === 0 ? ' hoje' : '') + '"><h3><span>' + esc(fmtExtenso(d)) + ' · ' + slots.length + (n > 0 ? ' · ' + txtDias(n) : '') + '</span>' +
      '<button type="button" class="btn pequeno" data-acao="novo-slot-dia" data-dia="' + esc(dia) + '">+ horário</button></h3>' + slots.map(slotLinha).join('') + '</div>';
  }).join('');
}

function abrirSlot(a, diaPadrao, op) {
  op = op || {};
  const vinc = op.vincular;
  const novo = !a;
  const lista = state.agenda;
  let dia = novo ? (diaPadrao || '') : a.data;
  const tipoVinc = vinc ? tipoAgendaDe(vinc.m) : '';
  if (novo && !dia) {
    // sugere o próximo dia que já tem perícias do mesmo tipo (ex.: mutirão do INSS); senão o próximo dia com agenda
    const futuros = lista.filter(x => parseData(x.data) && diasAte(parseData(x.data)) >= 0).sort((x, y) => parseData(x.data) - parseData(y.data));
    const prox = (tipoVinc && futuros.find(x => chave(x.tipo) === chave(tipoVinc))) || futuros[0];
    dia = prox ? prox.data : fmtData(zeroHoje());
  }
  const doDia = lista.filter(x => x.data === dia).sort((x, y) => x.hora.localeCompare(y.hora));
  const ult = doDia[doDia.length - 1];
  const base = novo ? {
    hora: ult ? somaMinutos(ult.hora, 15) : '08:00',
    nome: vinc ? periciadoDe(vinc.m) : '',
    tipo: vinc ? tipoVinc : (ult ? ult.tipo : 'INSS'),
    status: 'OK',
    local: 'CONSULTORIO'
  } : a;
  const ligado = vinc || (a && processoDoSlot(a));
  const fila = ativos().filter(it => etapaDe(it.m) === 'AGENDAMENTO');
  const nomes = Array.from(new Set(fila.map(it => periciadoDe(it.m)).concat(vinc ? [vinc.m['REQUERENTE'], vinc.m['REQUERIDA']] : []).filter(Boolean)));
  const temAgenda = state.canais.some(c => c.k === 'AGENDA');

  $('#modal-titulo').textContent = vinc ? 'Agendar perícia' : novo ? 'Novo horário' : 'Horário de ' + a.nome;
  $('#modal-corpo').innerHTML =
    (vinc ? '<p style="margin:0 0 12px;font-size:.88rem;color:var(--texto2)">Processo <b>' + esc(formatarCNJ(vinc.m['PROCESSO'])) + '</b>. Ao salvar, o horário entra na aba AGENDAMENTOS e o processo passa para a etapa PERÍCIA com a data preenchida.</p>' : '') +
    (vinc && semReserva(vinc.m) ? '<div class="alerta-box vermelho" style="cursor:default"><span>⚠️</span><span>Honorários ainda não reservados neste processo.</span></div>' : '') +
    '<div class="form-grid">' +
    '<div class="campo"><label for="ag-data">Data</label>' + (novo ? '<input id="ag-data" type="date" value="' + brParaIso(dia) + '">' : '<input id="ag-data" value="' + esc(dia) + '" disabled>') + '</div>' +
    '<div class="campo"><label for="ag-hora">Hora</label><input id="ag-hora" value="' + esc(base.hora) + '" placeholder="08:00" inputmode="numeric"></div>' +
    '<div class="campo largo"><label for="ag-nome">Periciando</label><input id="ag-nome" value="' + esc(base.nome) + '" list="dl-ag" autocomplete="off"><datalist id="dl-ag">' + nomes.map(n => '<option value="' + esc(n) + '">').join('') + '</datalist></div>' +
    '<div class="campo"><label for="ag-tipo">Tipo</label><input id="ag-tipo" value="' + esc(base.tipo) + '" list="dl-tipo"><datalist id="dl-tipo">' + ['INSS', 'ERRO MÉDICO', 'INTERDIÇÃO', 'DANOS MORAIS', 'OUTROS'].map(o => '<option value="' + o + '">').join('') + '</datalist></div>' +
    '<div class="campo"><label for="ag-status">Status</label><input id="ag-status" value="' + esc(base.status) + '" list="dl-st"><datalist id="dl-st"><option value="OK"><option value="AGENDAR"><option value="CONFIRMAR"></datalist></div>' +
    '<div class="campo largo"><label for="ag-local">Local</label><input id="ag-local" value="' + esc(base.local) + '" placeholder="CONSULTORIO ou endereço completo" list="dl-local"><datalist id="dl-local"><option value="CONSULTORIO"></datalist></div>' +
    (novo && temAgenda ? '<label class="check"><input type="checkbox" id="ag-discord" checked> Avisar no #agenda do Discord</label>' : '') +
    '</div><p id="ag-ocupado" style="font-size:.82rem;color:var(--suave);margin:10px 0 0"></p>';
  $('#modal-rodape').innerHTML = '<button type="button" class="btn primario" id="ag-salvar">' + (vinc ? 'Agendar' : 'Salvar') + '</button>' +
    (ligado && !vinc ? '<button type="button" class="btn" id="ag-abrir">Abrir processo</button>' : '');

  const mostrarOcupados = br => {
    const dd = lista.filter(x => x.data === br).sort((x, y) => x.hora.localeCompare(y.hora));
    $('#ag-ocupado').textContent = dd.length ? 'Já marcados neste dia: ' + dd.map(x => x.hora).join(', ') : 'Dia livre.';
  };
  mostrarOcupados(dia);
  if (novo) $('#ag-data').addEventListener('change', e => {
    const br = isoParaBr(e.target.value);
    const dd = lista.filter(x => x.data === br).sort((x, y) => x.hora.localeCompare(y.hora));
    $('#ag-hora').value = dd.length ? somaMinutos(dd[dd.length - 1].hora, 15) : '08:00';
    mostrarOcupados(br);
  });
  if ($('#ag-abrir')) $('#ag-abrir').onclick = () => { modal.close(); abrirFicha('PERICIAS', ligado.linha); };

  $('#ag-salvar').onclick = async ev => {
    const btn = ev.target;
    const hora = $('#ag-hora').value.trim();
    if (!/^\d{1,2}:\d{2}$/.test(hora)) { toast('Hora no formato 08:00', { erro: true }); return; }
    const dados = { hora: pad2(+hora.split(':')[0]) + ':' + hora.split(':')[1], nome: $('#ag-nome').value.trim(), tipo: $('#ag-tipo').value.trim(), status: $('#ag-status').value.trim(), local: $('#ag-local').value.trim() };
    if (!dados.nome) { toast('Informe o periciando', { erro: true }); return; }
    if (novo) {
      dados.data = isoParaBr($('#ag-data').value);
      if (!dados.data) { toast('Escolha a data', { erro: true }); return; }
      if (lista.some(x => x.data === dados.data && x.hora === dados.hora) && !confirm('Já existe alguém às ' + dados.hora + ' nesse dia. Marcar mesmo assim?')) return;
    }
    const avisar = $('#ag-discord') && $('#ag-discord').checked;
    btn.disabled = true;
    try {
      let j;
      if (vinc) {
        const dp = {};
        const hP = cabDe('PERICIAS', 'PERICIA'), hPasso = cabDe('PERICIAS', 'PROXIMO PASSO');
        if (hP) dp[hP] = dados.data;
        if (hPasso) dp[hPasso] = 'PERICIA';
        j = await api('agendar', { slot: dados, linha: vinc.linha, processoEsperado: vinc.m['PROCESSO'], dadosProcesso: dp });
      } else {
        const req = { dados: dados };
        if (!novo) { req.linha = a.linha; req.nomeEsperado = a.nome; }
        if (ligado) req.processo = ligado.m['PROCESSO'];
        j = await api('agendaSalvar', req);
      }
      if (!j.ok) throw new Error(j.erro === 'CONFLITO' ? 'A agenda foi alterada. Atualize e tente de novo.' : (j.erro || 'Erro ao salvar'));
      modal.close();
      fecharFicha();
      toast(vinc ? 'Perícia agendada' : 'Agenda atualizada');
      if (avisar) {
        const d = parseData(dados.data);
        api('discordEnviar', { canal: 'AGENDA', titulo: '📅 Perícia agendada', texto: 'Data: ' + fmtExtenso(d) + ' (' + dados.data + ') às ' + dados.hora + '\nPericiando: ' + nomeCurto(dados.nome) + '\nTipo: ' + dados.tipo + '\nLocal: ' + dados.local, processo: vinc ? vinc.m['PROCESSO'] : (ligado ? ligado.m['PROCESSO'] : '') })
          .then(r => { if (!r.ok) toast('Agendado, mas o Discord recusou: ' + (r.erro || ''), { erro: true }); })
          .catch(e => toast('Agendado, mas não consegui avisar o Discord: ' + e.message, { erro: true }));
      }
      await recarregar(true);
    } catch (e) { toast(e.message, { erro: true }); btn.disabled = false; }
  };
  modal.showModal();
}

/* ================= GESTÃO (só perito) ================= */
async function carregarGestao(forcar) {
  if (state.papel !== 'perito') return;
  if (!forcar && state.gestao && (state.gestao.carregando || Date.now() - state.gestao.t < 3 * 60 * 1000)) return;
  state.gestao = Object.assign({}, state.gestao || {}, { carregando: true, t: Date.now() });
  try {
    const j = await api('gestao');
    state.gestao = j.ok ? Object.assign(j, { t: Date.now() }) : { erro: j.erro || 'Erro ao ler a gestão', t: Date.now() };
  } catch (e) { state.gestao = { erro: e.message, t: Date.now() }; }
  if (state.view === 'gestao') render();
}

function itensFinanceiros() {
  return ativos().map(it => Object.assign({ valor: valorHonorarios(it.m['HONORARIOS'], UFESP), est: estagioRecebimento(it.m) }, it));
}

function renderGestao() {
  if (state.papel !== 'perito') { ir('pagamentos'); return; }
  carregarGestao(false);
  const lista = itensFinanceiros();
  const pend = lista.filter(i => i.est);
  const soma = arr => arr.reduce((s, i) => s + i.valor, 0);
  const total = soma(pend);
  const est = ESTAGIOS_RECEB.map(e => { const its = pend.filter(i => i.est === e.k); return Object.assign({ its: its, soma: soma(its) }, e); });
  const conc = itens('CONCLUSOS');
  const recebidos = conc.filter(i => pagoLinha(i.v));
  const totRec = recebidos.reduce((s, i) => s + valorLinha(i.v, UFESP), 0);
  const comValor = lista.filter(i => i.valor);
  const media = comValor.length ? soma(comValor) / comValor.length : 0;
  const laudos = laudosPendentes(lista);
  const atrasados = laudos.filter(x => x.dias != null && x.dias > 20);
  const hoje = zeroHoje();

  let h = '<div class="saudacao"><div><h2>Gestão</h2><p>Só o perfil perito vê esta página. O assistente vê apenas a tela Pagamentos, sem totais.</p></div>' +
    '<div class="acoes"><button type="button" class="btn" data-acao="csv">Exportar honorários (CSV)</button><button type="button" class="btn icone" data-acao="gestao-atualizar" title="Atualizar" aria-label="Atualizar">' + ic('atualizar') + '</button></div></div>';

  h += '<section class="kpis">' +
    '<div class="kpi" style="--k:var(--gold);cursor:default"><span class="rot">A receber</span><span class="val">' + fmtBRLcurto(total) + '</span><span class="sub">' + pend.length + ' processos · ' + fmtBRLcurto(est[0].soma + est[1].soma) + ' pedido ou pronto para pedir</span></div>' +
    '<div class="kpi" style="--k:var(--assist);cursor:default"><span class="rot">Recebido (concluídos)</span><span class="val">' + fmtBRLcurto(totRec) + '</span><span class="sub">' + recebidos.length + ' processos pagos na aba Concluídos</span></div>' +
    '<div class="kpi" style="--k:var(--perito);cursor:default"><span class="rot">Valor médio</span><span class="val">' + fmtBRLcurto(media) + '</span><span class="sub">por processo ativo com honorários</span></div>' +
    '<button type="button" class="kpi" style="--k:' + (atrasados.length ? 'var(--critico)' : 'var(--pericia)') + '" data-acao="filtrar" data-etapa="LAUDO"><span class="rot">Laudos pendentes</span><span class="val">' + laudos.length + '</span><span class="sub">' + (atrasados.length ? '<b style="color:var(--vencido)">' + atrasados.length + ' com perícia há mais de 20 dias</b>' : 'nenhum atrasado') + '</span></button></section>';

  h += '<div class="grid">';
  // projeção por estágio
  h += '<section class="cartao c7"><h2>Projeção de recebimento</h2><p class="dica">Do mais perto de entrar no caixa ao mais distante. Toque para filtrar a tabela.</p>' +
    barras(est.map(e => ({ rot: e.rot, val: e.soma, txt: fmtBRLcurto(e.soma), cor: e.cor, attrs: 'data-acao="g-filtro" data-k="' + e.k + '"' }))) +
    '<div class="estagios">' + est.map(e => '<div><span class="ponto" style="background:' + e.cor + '"></span><b>' + esc(e.rot) + '</b> · ' + e.its.length + ' processo(s)<small>' + esc(e.desc) + '</small></div>').join('') + '</div>' +
    '<p class="dica" style="margin:10px 0 0">UFESP a ' + fmtBRL(UFESP) + '. Recebimento parcial conta pelo valor cheio. ' + (pend.length - pend.filter(i => i.valor).length ? (pend.length - pend.filter(i => i.valor).length) + ' processo(s) sem honorários informados ficam de fora das somas.' : '') + '</p></section>';

  // equipe
  const g = state.gestao || {};
  const abertasA = lista.filter(i => i.c.quem === 'assistente'), abertasP = lista.filter(i => i.c.quem === 'perito');
  const venc = arr => arr.filter(i => prazoDe(i.m) && diasAte(prazoDe(i.m)) < 0).length;
  h += '<section class="cartao c5"><h2>Equipe</h2>' +
    '<div class="mini-kpis"><div><b>' + abertasA.length + '</b><span>tarefas do assistente' + (venc(abertasA) ? ' · <em>' + venc(abertasA) + ' vencida(s)</em>' : '') + '</span></div><div><b>' + abertasP.length + '</b><span>suas pendências' + (venc(abertasP) ? ' · <em>' + venc(abertasP) + ' vencida(s)</em>' : '') + '</span></div></div>';
  if (g.carregando && !g.equipe) h += '<p class="vazio">Carregando atividade...</p>';
  else if (g.erro) h += '<p class="vazio">' + esc(g.erro) + '</p>';
  else if (g.equipe && g.equipe.length) {
    h += '<table class="tabela compacta"><thead><tr><th>Usuário</th><th class="num">7 dias</th><th class="num">30 dias</th><th>Última ação</th></tr></thead><tbody>' +
      g.equipe.map(u => '<tr style="cursor:default"><td><b>' + esc(u.usuario) + '</b> <span class="chip ' + (u.papel === 'perito' ? 'perito' : 'assistente') + '">' + (u.papel === 'perito' ? 'perito' : 'assistente') + '</span></td><td class="num">' + u.d7 + '</td><td class="num">' + u.d30 + '</td><td><small>' + esc(u.ultima ? fmtDataHora(u.ultima) + ' · ' + u.ultimaAcao : '') + '</small></td></tr>').join('') + '</tbody></table>';
    if (g.acoes && g.acoes.length) h += '<p class="dica" style="margin:12px 0 6px">O que mais foi feito nos últimos 30 dias</p><div class="chips-linha">' + g.acoes.slice(0, 6).map(a => '<span class="chip">' + esc(a.acao) + ' · ' + a.n + '</span>').join('') + '</div>';
    h += '<p class="dica" style="margin:10px 0 0">Conta só o que foi feito pelo app' + (g.desde ? ' (desde ' + esc(String(g.desde).slice(0, 10)) + ')' : '') + '. Edições feitas direto na planilha não entram.</p>';
  } else h += '<p class="vazio">Ainda não há atividade registrada pelo app.</p>';
  h += '</section>';

  // valor por tipo e por comarca
  const porTipo = somarPor(pend, i => i.m['TIPO'], UFESP).filter(x => x.soma);
  const porCidade = somarPor(pend, i => /NUCLEO/.test(chave(i.m['CIDADE'])) ? 'Núcleo 4.0 (acidentário)' : i.m['CIDADE'], UFESP).filter(x => x.soma);
  const linhaGrupo = x => ({ rot: x.k, val: x.soma, txt: fmtBRLcurto(x.soma) + ' · ' + x.n });
  h += '<section class="cartao c6"><h2>A receber por tipo de perícia</h2><p class="dica">Total · quantidade de processos. Valor médio ao passar o mouse.</p>' +
    barras(porTipo.slice(0, 8).map(x => Object.assign(linhaGrupo(x), { attrs: 'title="' + esc(x.k + ': média ' + fmtBRL(x.media) + ' por processo') + '"' }))) + '</section>';
  h += '<section class="cartao c6"><h2>A receber por comarca</h2><p class="dica">Total · quantidade de processos</p>' +
    barras(porCidade.slice(0, 8).map(x => Object.assign(linhaGrupo(x), { attrs: 'title="' + esc(x.k + ': média ' + fmtBRL(x.media) + ' por processo') + '"' }))) + '</section>';

  // laudos pendentes
  h += '<section class="cartao c6"><h2>Laudos pendentes</h2>' + (laudos.length ? '<div class="lista-linhas">' + laudos.map(x =>
    '<button type="button" class="linha-item" data-acao="ficha" data-aba="PERICIAS" data-linha="' + x.it.linha + '"><span class="ponto ' + (x.dias == null ? 'acompanhar' : x.dias > 30 ? 'vencido' : x.dias > 20 ? 'alerta' : 'ok') + '"></span><span class="meio"><b>' + esc(x.it.m['REQUERENTE']) + '</b><small>' + esc(x.it.c.acao + ' · ' + (x.it.m['TIPO'] || formatarCNJ(x.it.m['PROCESSO']))) + '</small></span>' +
    '<span class="chip ' + (x.dias > 20 ? 'alerta' : '') + '">' + (x.dias == null ? esc(x.it.m['PERICIA'] || 'sem data') : 'perícia há ' + x.dias + ' dias') + '</span>' + chipPrazo(x.it.m, true) + '</button>').join('') + '</div>' : '<p class="vazio">Nenhum laudo pendente.</p>') + '</section>';

  // indicadores
  const todosM = lista.map(i => i.m).concat(itens('CONCLUSOS').map(i => i.m));
  const passadas = lista.filter(i => parseData(i.m['PERICIA']) && diasAte(parseData(i.m['PERICIA'])) < 0);
  const faltas = lista.filter(i => /NAO COMPARECEU/.test(chave(i.m['OBSERVACAO'])));
  const ult30 = todosM.filter(m => { const d = parseData(m['PERICIA']); return d && diasAte(d) < 0 && diasAte(d) >= -30; }).length;
  const prox30 = state.agenda.filter(a => { const d = parseData(a.data); return d && diasAte(d) >= 0 && diasAte(d) <= 30; }).length;
  const ind = [
    ['Não comparecimento', faltas.length + ' de ' + passadas.length + ' perícias já ocorridas' + (passadas.length ? ' (' + Math.round(faltas.length / passadas.length * 100) + '%)' : '')],
    ['Perícias nos últimos 30 dias', String(ult30)],
    ['Agendadas nos próximos 30 dias', String(prox30)],
    ['Aguardando reserva para agendar', String(lista.filter(i => semReserva(i.m)).length)],
    ['Renúncias registradas', String(itens('RENUNCIAS').length)],
    ['Processos ativos sem tipo', String(lista.filter(i => !i.m['TIPO']).length)],
    ['Sem honorários informados', String(lista.filter(i => !i.m['HONORARIOS']).length)],
    ['Tarefas sem prazo cadastrado', String(lista.filter(i => i.c.quem && i.c.quem !== 'acompanhar' && !prazoDe(i.m)).length)]
  ];
  h += '<section class="cartao c6"><h2>Indicadores</h2><dl class="indicadores">' + ind.map(([k, v]) => '<div><dt>' + esc(k) + '</dt><dd>' + esc(v) + '</dd></div>').join('') + '</dl></section>';

  // tabela
  const filtro = state.gFiltro;
  const ordemEst = { pedido: 0, pronto: 1, andamento: 2, incerto: 3 };
  const tab = pend.filter(i => !filtro || i.est === filtro).sort((a, b) => ordemEst[a.est] - ordemEst[b.est] || b.valor - a.valor);
  h += '<section class="cartao c12"><div class="cartao-topo"><h2>Honorários pendentes</h2><span class="alternar" role="group">' +
    [['', 'Todos']].concat(ESTAGIOS_RECEB.map(e => [e.k, e.rot])).map(([k, r]) => '<button type="button" data-acao="g-filtro" data-k="' + k + '" class="' + (filtro === k ? 'ativa' : '') + '">' + esc(r) + '</button>').join('') + '</span></div>' +
    '<div class="tabela-wrap"><table class="tabela"><thead><tr><th>Parte</th><th>Processo</th><th>Etapa</th><th>Situação</th><th>Honorários</th><th class="num">Estimado</th></tr></thead><tbody>' +
    tab.map(i => '<tr data-acao="ficha" data-aba="PERICIAS" data-linha="' + i.linha + '"><td>' + esc(i.m['REQUERENTE']) + '<br><small style="color:var(--suave)">' + esc(i.m['CIDADE'] || '') + '</small></td><td style="white-space:nowrap">' + esc(formatarCNJ(i.m['PROCESSO'])) + '</td><td>' + esc(i.m['PROXIMO PASSO']) + '</td><td>' + (i.m['PAGO'] ? chipPago(i.m) : '<span class="chip">sem reserva</span>') + '</td><td>' + esc(i.m['HONORARIOS']) + '</td><td class="num">' + (i.valor ? fmtBRL(i.valor) : '') + '</td></tr>').join('') +
    '</tbody><tfoot><tr><td colspan="5">Total (' + tab.length + ')</td><td class="num">' + fmtBRL(soma(tab)) + '</td></tr></tfoot></table></div></section></div>';
  $('#conteudo').innerHTML = h;
}

function exportarCSV() {
  const est = k => (ESTAGIOS_RECEB.find(e => e.k === k) || {}).rot || '';
  const linhas = [['Processo', 'Requerente', 'Requerida', 'Cidade', 'Tipo', 'Próximo passo', 'Pago', 'Honorários', 'Valor estimado (R$)', 'Estágio']];
  itensFinanceiros().filter(i => i.est).forEach(i => linhas.push([formatarCNJ(i.m['PROCESSO']), i.m['REQUERENTE'], i.m['REQUERIDA'], i.m['CIDADE'], i.m['TIPO'], i.m['PROXIMO PASSO'], i.m['PAGO'], i.m['HONORARIOS'], i.valor ? i.valor.toFixed(2).replace('.', ',') : '', est(i.est)]));
  const url = URL.createObjectURL(new Blob([gerarCSV(linhas)], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url; a.download = 'honorarios-pendentes-' + brParaIso(fmtData(zeroHoje())) + '.csv';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/* ================= PAGAMENTOS (assistente: só o operacional, sem totais) ================= */
function renderPagamentos() {
  const lista = ativos();
  const mle = lista.filter(i => i.c.acao === 'Peticionar o pagamento (MLE)');
  const aguard = lista.filter(i => ['MLE', 'OFICIO', 'PARCIAL'].indexOf(chave(i.m['PAGO'])) >= 0);
  const travados = lista.filter(i => semReserva(i.m));
  const reserva = lista.filter(i => etapaDe(i.m) === 'RESERVA');
  const linha = (i, ponto) => '<button type="button" class="linha-item" data-acao="ficha" data-aba="PERICIAS" data-linha="' + i.linha + '"><span class="ponto ' + ponto + '"></span><span class="meio"><b>' + esc(i.m['REQUERENTE']) + '</b><small>' + esc(formatarCNJ(i.m['PROCESSO']) + (i.m['OBSERVACAO'] ? ' · ' + i.m['OBSERVACAO'] : '')) + '</small></span>' +
    (i.m['HONORARIOS'] ? '<span class="chip">' + esc(i.m['HONORARIOS']) + '</span>' : '') + chipPago(i.m) + '</button>';
  const bloco = (titulo, dica, arr, ponto, vazio, cls) => '<section class="cartao ' + cls + '"><h2>' + esc(titulo) + ' (' + arr.length + ')</h2><p class="dica">' + esc(dica) + '</p>' +
    (arr.length ? '<div class="lista-linhas">' + arr.map(i => linha(i, ponto)).join('') + '</div>' : '<p class="vazio">' + esc(vazio) + '</p>') + '</section>';
  let h = '<div class="grid">';
  h += bloco('Peticionar o MLE', 'Pagamento liberado: gerar a petição e o formulário do MLE na ficha do processo.', mle, 'assistente', 'Nenhum MLE para peticionar.', 'c6');
  h += bloco('Aguardando pagamento', 'MLE peticionado, ofício expedido ou recebido em parte. Conferir nos autos se saiu o pagamento.', aguard, 'acompanhar', 'Nada aguardando pagamento.', 'c6');
  h += bloco('Agendamento travado por falta de reserva', 'Não agendar nem realizar a perícia antes do depósito dos honorários.', travados, 'critico', 'Nenhum processo travado.', 'c6');
  h += bloco('Aguardando depósito', 'Etapa RESERVA: acompanhar nos autos o depósito dos honorários.', reserva, 'atencao', 'Nenhum aguardando depósito.', 'c6');
  h += '</div>';
  $('#conteudo').innerHTML = h;
}

/* ================= DISCORD ================= */
const CANAIS_PADRAO = [{ k: 'AGENDA', n: '#agenda' }, { k: 'PRAZOS', n: '#prazos' }, { k: 'DECISOES', n: '#para-o-perito' }, { k: 'HONORARIOS', n: '#honorários-e-mle' }, { k: 'ASSISTENTE', n: '#tarefas-assistente' }];
const COR_CANAL = { AGENDA: '#9b59b6', PRAZOS: '#e67e22', DECISOES: '#3498db', HONORARIOS: '#f1c40f', ASSISTENTE: '#2ecc71' };
const MODELOS = [
  { n: 'Livre', c: '', t: '', x: '' },
  { n: 'Tarefa para o assistente', c: 'ASSISTENTE', t: '📌 Tarefa', x: 'O que fazer: \nPrazo: ' },
  { n: 'Recado para o perito', c: 'DECISOES', t: '👨‍⚕️ Para o perito', x: '' },
  { n: 'Perícia agendada', c: 'AGENDA', t: '📅 Perícia agendada', x: 'Data: __/__ às __:__\nLocal: \nPartes intimadas: sim' },
  { n: 'Laudo protocolado', c: 'ASSISTENTE', t: '📄 Laudo protocolado', x: 'Protocolado em __/__. Acompanhar manifestação das partes e decisão.' },
  { n: 'MLE peticionado', c: 'HONORARIOS', t: '📝 MLE peticionado', x: 'Petição de levantamento protocolada em __/__.' },
  { n: 'Honorários recebidos', c: 'HONORARIOS', t: '💰 Honorários recebidos', x: 'Valor: R$ \nData: __/__' },
  { n: 'Faltou à perícia', c: 'ASSISTENTE', t: '🚫 Periciando não compareceu', x: 'Não compareceu em __/__. Peticionar informando a ausência.' },
  { n: 'Aviso de prazo', c: 'PRAZOS', t: '⏰ Prazo', x: 'Vence em __/__: ' }
];
const GERADORES = [
  { id: 'pauta', rot: 'Pauta de perícias', desc: 'Horários do próximo dia com perícia marcada', canal: 'AGENDA' },
  { id: 'fila', rot: 'Fila de agendamento', desc: 'Quem pode ser agendado e quem espera reserva', canal: 'ASSISTENTE' },
  { id: 'assist', rot: 'Tarefas do assistente', desc: 'Tudo que está com o assistente, por ação', canal: 'ASSISTENTE' },
  { id: 'perito', rot: 'Pendências do perito', desc: 'Laudos, perícias e esclarecimentos', canal: 'DECISOES' },
  { id: 'prazos', rot: 'Prazos dos próximos 10 dias', desc: 'Com semáforo e responsável', canal: 'PRAZOS' },
  { id: 'fin', rot: 'Situação dos pagamentos', desc: 'Processos por situação (sem totais em R$)', canal: 'HONORARIOS' }
];
const ROTINAS = [
  { id: 'dia', rot: 'Resumo do dia', desc: 'Agenda de hoje, prazos e pendências em #agenda (troca o resumo anterior). Automático às 7h.' },
  { id: 'prazos', rot: 'Alertas de prazo', desc: 'Prazos a 10, 5, 1 dia e no dia em #prazos. Automático às 7h15.' },
  { id: 'semana', rot: 'Resumo semanal', desc: '#agenda, #tarefas-assistente e #honorários-e-mle. Automático às segundas, 7h05.' },
  { id: 'paineis', rot: 'Painéis de pendências', desc: 'Recria os painéis no fim de #para-o-perito e #tarefas-assistente.' },
  { id: 'mudancas', rot: 'Avisar mudanças agora', desc: 'Envia já o que mudou na planilha (normalmente a cada 10 minutos).' }
];

function renderDiscord() {
  const dc = state.dc;
  const canais = state.canais.length ? state.canais : CANAIS_PADRAO;
  if (!dc.canal) dc.canal = canais[0].k;
  const procs = ativos();
  let h = '';
  if (!state.canais.length) h += '<div class="alerta-box" style="cursor:default"><span>⚠️</span><span>Não consegui ler os canais ligados no script do Discord. O envio pode falhar até os webhooks estarem configurados na planilha.</span></div>';
  h += '<div class="grid"><section class="cartao c7"><h2>Nova mensagem</h2><div class="form-grid">' +
    '<div class="campo"><label for="dc-modelo">Modelo</label><select id="dc-modelo">' + MODELOS.map((m, i) => '<option value="' + i + '"' + (+dc.modelo === i ? ' selected' : '') + '>' + esc(m.n) + '</option>').join('') + '</select></div>' +
    '<div class="campo"><label for="dc-canal">Canal</label><select id="dc-canal">' + canais.map(c => '<option value="' + c.k + '"' + (dc.canal === c.k ? ' selected' : '') + '>' + esc(c.n) + '</option>').join('') + '</select></div>' +
    '<div class="campo largo"><label for="dc-titulo">Título</label><input id="dc-titulo" value="' + esc(dc.titulo) + '" placeholder="Ex.: Tarefa, Aviso, Perícia agendada"></div>' +
    '<div class="campo largo"><label for="dc-proc">Processo (opcional: anexa os dados da planilha)</label><input id="dc-proc" value="' + esc(dc.processo) + '" list="dl-dc-proc" autocomplete="off" placeholder="Digite número ou nome"><datalist id="dl-dc-proc">' + procs.map(it => '<option value="' + esc(it.m['PROCESSO']) + '" label="' + esc(it.m['REQUERENTE'] + ' · ' + (it.m['PROXIMO PASSO'] || '')) + '">').join('') + '</datalist></div>' +
    '<div class="campo largo"><label for="dc-texto">Mensagem</label><textarea id="dc-texto" style="min-height:150px">' + esc(dc.texto) + '</textarea></div></div>' +
    '<div class="acoes" style="margin-top:12px"><button type="button" class="btn discord" data-acao="dc-enviar">' + ic('discord') + 'Enviar</button><button type="button" class="btn" data-acao="dc-limpar">Limpar</button></div></section>';
  h += '<section class="c5"><div class="cartao"><h2>Como vai aparecer</h2><div class="dc-prev" id="dc-prev"></div></div></section>';
  h += '<section class="cartao c12"><h2>Gerar a partir dos dados</h2><p class="dica">Monta a mensagem com os dados atuais. Você revisa antes de enviar.</p><div class="geradores">' +
    GERADORES.map(g => '<button type="button" class="gerador" data-acao="dc-gerar" data-id="' + g.id + '"><b>' + esc(g.rot) + '</b><small>' + esc(g.desc) + '</small><span class="canal">' + esc((CANAIS_PADRAO.find(c => c.k === g.canal) || {}).n || '') + '</span></button>').join('') + '</div></section>';
  h += '<section class="cartao c12"><h2>Rotinas automáticas</h2><p class="dica">Já rodam sozinhas no horário. Use para mandar agora.</p>' +
    ROTINAS.map(r => '<div class="rotina"><div class="meio"><b>' + esc(r.rot) + '</b><small>' + esc(r.desc) + '</small></div><button type="button" class="btn pequeno" data-acao="dc-rotina" data-id="' + r.id + '">Enviar agora</button></div>').join('') + '</section></div>';
  $('#conteudo').innerHTML = h;

  const lerCampos = () => { dc.canal = $('#dc-canal').value; dc.titulo = $('#dc-titulo').value; dc.texto = $('#dc-texto').value; dc.processo = $('#dc-proc').value.trim(); previewDiscord(); };
  ['#dc-canal', '#dc-titulo', '#dc-texto', '#dc-proc'].forEach(s => $(s).addEventListener('input', lerCampos));
  $('#dc-modelo').addEventListener('change', e => {
    const m = MODELOS[+e.target.value]; dc.modelo = +e.target.value;
    if (m.c && canais.some(c => c.k === m.c)) dc.canal = m.c;
    dc.titulo = m.t; dc.texto = m.x;
    renderDiscord();
  });
  previewDiscord();
}

function previewDiscord() {
  const dc = state.dc;
  const canal = (state.canais.concat(CANAIS_PADRAO)).find(c => c.k === dc.canal) || CANAIS_PADRAO[0];
  const it = dc.processo ? ativos().find(x => x.m['PROCESSO'] === dc.processo) : null;
  let corpo = dc.texto ? mdDiscord(dc.texto) : '';
  if (it) {
    const m = it.m, L = [];
    L.push('**Processo:** `' + m['PROCESSO'] + '`' + (m['SISTEMA'] ? ' (' + m['SISTEMA'] + ')' : ''));
    L.push('**Parte:** ' + nomeCurto(m['REQUERENTE']) + ([m['CIDADE'], m['FORUM']].filter(Boolean).length ? ' · ' + abreviar([m['CIDADE'], m['FORUM']].filter(Boolean).join(' / '), 60) : ''));
    const ex = [m['TIPO'] ? '**Tipo:** ' + m['TIPO'] : '', m['HONORARIOS'] ? '**Honorários:** ' + m['HONORARIOS'] : '', m['PAGO'] ? '**Pago:** ' + m['PAGO'] : ''].filter(Boolean);
    if (ex.length) L.push(ex.join(' · '));
    if (prazoDe(m)) L.push('**Prazo:** ' + fmtCurto(prazoDe(m)) + ' (' + txtDias(diasAte(prazoDe(m))) + ')');
    if (parseData(m['PERICIA'])) L.push('**Perícia:** ' + fmtCurto(parseData(m['PERICIA'])));
    if (m['OBSERVACAO']) L.push('**Obs.:** ' + m['OBSERVACAO']);
    corpo += (corpo ? '<br><br>───────────<br>' : '') + mdDiscord(L.join('\n'));
  } else if (dc.processo) {
    corpo += (corpo ? '<br><br>' : '') + '<span style="color:#f0b232">Processo não encontrado entre os ativos. Escolha da lista.</span>';
  }
  $('#dc-prev').innerHTML = '<div class="dc-autor"><span class="dc-avatar">P</span><div><b>Perícias</b><span class="dc-bot">APP</span><div class="dc-canal">' + esc(canal.n) + '</div></div></div>' +
    '<div class="dc-embed" style="--c:' + (COR_CANAL[canal.k] || '#5865f2') + '"><div class="t">' + esc(dc.titulo || '✉️ Mensagem') + '</div>' + (corpo || '<span style="color:#949ba4">Escreva a mensagem ou escolha um processo.</span>') + '</div>';
}

function gerarDiscord(id) {
  const dc = state.dc, procs = ativos();
  const g = GERADORES.find(x => x.id === id);
  dc.modelo = 0; dc.processo = ''; dc.canal = g.canal;
  if (id === 'pauta') {
    const futuros = state.agenda.map(a => Object.assign({ d: parseData(a.data) }, a)).filter(a => a.d && diasAte(a.d) >= 0).sort((a, b) => a.d - b.d);
    const dia = futuros.length ? futuros[0].d : zeroHoje();
    dc.titulo = '📅 Pauta de ' + fmtData(dia);
    dc.texto = gerarPauta(futuros.filter(a => mesmoDia(a.d, dia)), dia);
  } else if (id === 'fila') { dc.titulo = '🗂️ Fila de agendamento'; dc.texto = gerarFilaAgendamento(procs); }
  else if (id === 'assist') { dc.titulo = '🧑‍💼 Tarefas do assistente: ' + procs.filter(i => i.c.quem === 'assistente').length; dc.texto = gerarTarefas(procs, 'assistente'); }
  else if (id === 'perito') { dc.titulo = '👨‍⚕️ Pendências do perito: ' + procs.filter(i => i.c.quem === 'perito').length; dc.texto = gerarTarefas(procs, 'perito'); }
  else if (id === 'prazos') { dc.titulo = '⏰ Prazos até ' + fmtCurto(somaDias(zeroHoje(), 10)); dc.texto = gerarPrazos(procs, 10); }
  else if (id === 'fin') { dc.titulo = '💰 Situação dos pagamentos'; dc.texto = gerarFinanceiro(procs); }
  if (!state.canais.some(c => c.k === dc.canal) && state.canais.length) dc.canal = state.canais[0].k;
  renderDiscord();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  toast('Mensagem montada. Revise e envie.');
}

async function enviarDiscord(btn) {
  const dc = state.dc;
  if (!dc.texto.trim() && !dc.processo) { toast('Escreva a mensagem ou escolha um processo.', { erro: true }); return; }
  if (dc.processo && !ativos().some(x => x.m['PROCESSO'] === dc.processo)) { toast('Processo não encontrado. Escolha da lista.', { erro: true }); return; }
  btn.disabled = true;
  try {
    const j = await api('discordEnviar', { canal: dc.canal, titulo: dc.titulo, texto: dc.texto, processo: dc.processo });
    if (!j.ok) throw new Error(j.erro || 'O Discord recusou a mensagem.');
    toast(j.msg || 'Enviado');
    state.dc = { modelo: 0, canal: dc.canal, titulo: '', texto: '', processo: '' };
    renderDiscord();
  } catch (e) { toast(e.message, { erro: true }); btn.disabled = false; }
}

/* ================= ARQUIVO ================= */
function renderArquivo() {
  const aba = state.arquivo;
  const q = chave(state.arqQ);
  const lista = itens(aba).filter(it => !q || chave(it.v.join(' ')).indexOf(q) >= 0).sort((a, b) => b.linha - a.linha);
  let h = '<div class="ferramentas"><span class="alternar" role="group"><button type="button" data-acao="arq" data-aba="CONCLUSOS" class="' + (aba === 'CONCLUSOS' ? 'ativa' : '') + '">Concluídos (' + itens('CONCLUSOS').length + ')</button><button type="button" data-acao="arq" data-aba="RENUNCIAS" class="' + (aba === 'RENUNCIAS' ? 'ativa' : '') + '">Renúncias (' + itens('RENUNCIAS').length + ')</button></span>' +
    '<input type="search" id="arq-q" placeholder="Buscar..." value="' + esc(state.arqQ) + '" autocomplete="off"></div>';
  h += lista.length ? '<div class="pgrade">' + lista.map(cardProcesso).join('') + '</div>' : '<p class="vazio">Nada encontrado.</p>';
  $('#conteudo').innerHTML = h;
  $('#arq-q').addEventListener('input', e => { state.arqQ = e.target.value; render(); });
}

/* ================= EVENTOS GLOBAIS ================= */
document.addEventListener('click', ev => {
  const el = ev.target.closest('[data-acao]');
  if (!el) return;
  const a = el.dataset.acao, ds = el.dataset;
  switch (a) {
    case 'ir': ir(ds.view); break;
    case 'ficha': abrirFicha(ds.aba || 'PERICIAS', ds.linha); break;
    case 'fechar-ficha': fecharFicha(); break;
    case 'ficha-aba': state.ficha.aba2 = ds.k; state.ficha.confirma = null; if (ds.k === 'hist') state.ficha.hist = null; renderFicha(); break;
    case 'rapida': acaoRapida(ds.id); break;
    case 'confirmar': { const fn = state.ficha.confirma.fn; state.ficha.confirma = null; fn(); break; }
    case 'cancelar-confirma': state.ficha.confirma = null; renderFicha(); break;
    case 'salvar-dados': salvarDadosFicha(); break;
    case 'mover': {
      const it = acharItem(state.ficha.aba, state.ficha.linha);
      const para = ds.para;
      state.ficha.aba2 = 'acoes';
      state.ficha.confirma = { titulo: para === 'RENUNCIAS' ? 'Registrar renúncia' : 'Mover para ' + TITULO_ABA[para], linhas: ['O processo sai de ' + TITULO_ABA[state.ficha.aba] + ' e vai para <b>' + TITULO_ABA[para] + '</b>.'],
        fn: () => mover(state.ficha.aba, it, para, para === 'RENUNCIAS' ? { 'STATUS': 'RENUNCIA', 'PROXIMO PASSO': 'RENUNCIEI' } : {}) };
      renderFicha();
      break;
    }
    case 'ficha-discord': {
      const it = acharItem(state.ficha.aba, state.ficha.linha);
      state.dc = { modelo: 0, canal: it.c.quem === 'perito' ? 'DECISOES' : 'ASSISTENTE', titulo: it.c.acao ? '📌 ' + it.c.acao : '✉️ Mensagem', texto: '', processo: it.aba === 'PERICIAS' ? it.m['PROCESSO'] : '' };
      fecharFicha(); ir('discord');
      break;
    }
    case 'copiar':
      if (navigator.clipboard) navigator.clipboard.writeText(ds.txt).then(() => toast('Número copiado'), () => toast(ds.txt));
      else toast(ds.txt);
      break;
    case 'filtrar':
      state.filtro = Object.assign(filtroVazio(), { quem: ds.quem || '', etapa: ds.etapa || '', tipo: ds.tipo || '' });
      ir('processos'); break;
    case 'limpar-filtros': state.filtro = filtroVazio(); render(); break;
    case 'modo': state.modoProc = ds.modo; gravar('pericias_modo', ds.modo); render(); break;
    case 'slot': { const s = state.agenda.find(x => String(x.linha) === ds.linha); if (s) abrirSlot(s); break; }
    case 'novo-slot': abrirSlot(null, ''); break;
    case 'novo-slot-dia': abrirSlot(null, ds.dia); break;
    case 'agendar-proc': { const it = acharItem('PERICIAS', ds.linha); if (it) abrirSlot(null, '', { vincular: it }); break; }
    case 'passadas': state.verPassadas = !state.verPassadas; render(); break;
    case 'cal-mes': { const d = new Date(state.cal.ano, state.cal.mes + Number(ds.d), 1); state.cal.ano = d.getFullYear(); state.cal.mes = d.getMonth(); state.cal.sel = d.getTime(); render(); break; }
    case 'cal-hoje': { const h = zeroHoje(); state.cal.ano = h.getFullYear(); state.cal.mes = h.getMonth(); state.cal.sel = h.getTime(); render(); break; }
    case 'cal-dia': { const d = new Date(Number(ds.t)); state.cal.sel = d.getTime(); if (d.getMonth() !== state.cal.mes) { state.cal.mes = d.getMonth(); state.cal.ano = d.getFullYear(); } render(); if (window.innerWidth < 900) { const l = document.querySelector('.dia-lista'); if (l) l.scrollIntoView({ behavior: 'smooth', block: 'start' }); } break; }
    case 'cal-f': state.cal.f[ds.t] = !state.cal.f[ds.t]; render(); break;
    case 'arq': state.arquivo = ds.aba; render(); break;
    case 'g-filtro': state.gFiltro = state.gFiltro === ds.k ? '' : ds.k; render(); { const t = document.querySelector('.tabela-wrap'); if (t && ds.k) t.scrollIntoView({ behavior: 'smooth', block: 'center' }); } break;
    case 'gestao-atualizar': carregarGestao(true); recarregar(true); break;
    case 'csv': exportarCSV(); break;
    case 'doc-ver': {
      const it = fichaItem(), d = it && state.docs[chaveDocs(it)];
      const f = d && d.arquivos && d.arquivos.find(x => x.id === ds.id);
      if (f) abrirPrevia(f);
      break;
    }
    case 'doc-ver-ultimo': if (state.ultimoDoc) abrirPrevia(state.ultimoDoc); break;
    case 'doc-atualizar': { const it = fichaItem(); if (it) carregarDocs(it, true); break; }
    case 'doc-enviar': { const inp = $('#docs-file'); if (inp) inp.click(); break; }
    case 'doc-gerar': { const it = fichaItem(); if (it) abrirGerador(it); break; }
    case 'modelo-gerar': { const it = fichaItem(); if (it) gerarDocumento(it, ds.id); break; }
    case 'pasta-criar': {
      const it = fichaItem(), nome = ($('#pasta-nome') || {}).value || '';
      if (!nome.trim()) { toast('Informe o nome da pasta.', { erro: true }); break; }
      el.disabled = true;
      acaoPasta(it, 'pastaCriar', { nome: nome.trim() }, 'Pasta criada no Drive').finally(() => { el.disabled = false; });
      break;
    }
    case 'pasta-vincular': {
      const it = fichaItem(), id = ($('#pasta-vinc') || {}).value;
      if (!id) { toast('Escolha a pasta.', { erro: true }); break; }
      acaoPasta(it, 'pastaVincular', { pastaId: id }, 'Pasta vinculada');
      break;
    }
    case 'dc-gerar': gerarDiscord(ds.id); break;
    case 'dc-enviar': enviarDiscord(el); break;
    case 'dc-limpar': state.dc = { modelo: 0, canal: state.dc.canal, titulo: '', texto: '', processo: '' }; renderDiscord(); break;
    case 'dc-rotina': {
      const r = ROTINAS.find(x => x.id === ds.id);
      if (!confirm('Enviar agora: ' + r.rot + '?')) break;
      el.disabled = true; el.textContent = 'Enviando...';
      api('discordRotina', { rotina: ds.id }).then(j => { toast(j.ok ? r.rot + ': enviado' : (j.erro || 'Erro'), { erro: !j.ok }); })
        .catch(e => toast(e.message, { erro: true })).finally(() => { el.disabled = false; el.textContent = 'Enviar agora'; });
      break;
    }
  }
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && state.ficha && !modal.open) fecharFicha();
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[role=button][data-acao]')) { e.preventDefault(); e.target.click(); }
});
window.addEventListener('hashchange', () => { const v = location.hash.slice(1); if (v && v !== state.view) ir(v); });

$('#btn-sair').addEventListener('click', () => sair(true));
$('#btn-sair-m').addEventListener('click', () => sair(true));
$('#btn-sair-m').innerHTML = ic('sair');
$('#btn-atualizar').innerHTML = ic('atualizar');
$('#btn-atualizar').addEventListener('click', () => recarregar(true).then(() => toast('Dados atualizados')));
$('#btn-novo').addEventListener('click', () => { if (state.view === 'agenda' || state.view === 'calendario') abrirSlot(null, state.view === 'calendario' ? fmtData(new Date(state.cal.sel)) : ''); else abrirNovoProcesso(); });
$('#busca-global').addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  state.filtro = Object.assign(filtroVazio(), { q: e.target.value });
  e.target.value = '';
  ir('processos');
});

// atualiza sozinho a cada 5 minutos se ninguém estiver editando
setInterval(() => {
  if (!state.token || document.visibilityState !== 'visible' || modal.open || state.ficha) return;
  const a = document.activeElement;
  if (a && /INPUT|TEXTAREA|SELECT/.test(a.tagName)) return;
  recarregar(true);
}, 5 * 60 * 1000);

/* ================= INÍCIO ================= */
async function iniciar() {
  const v = location.hash.slice(1);
  if (v) state.view = v;
  if (!state.token) { mostrarLogin(); return; }
  mostrarApp();
  renderNav();
  await recarregar(false);
  if (!state.token) $('#lg-msg').textContent = 'Sessão expirada. Entre novamente.';
}
iniciar();

})();
