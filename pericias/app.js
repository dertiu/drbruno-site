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
// ctx.slot: horário da agenda já reservado para o periciado (status AGENDAR enquanto falta peticionar)
function acoesRapidas(m, ctx) {
  const e = etapaDe(m), pago = chave(m['PAGO']), obs = chave(m['OBSERVACAO']);
  const slot = ctx && ctx.slot;
  const c = classificar(m);
  const A = [];
  if (e === 'ACEITE') A.push({ id: 'aceite', rot: 'Aceite peticionado', dados: { 'STATUS': 'ACEITE', 'PROXIMO PASSO': PAGO_LIBERA.indexOf(pago) >= 0 ? 'AGENDAMENTO' : 'RESERVA' } });
  if (e === 'RESERVA' || (e === 'AGENDAMENTO' && PAGO_LIBERA.indexOf(pago) < 0)) A.push({ id: 'reserva', rot: 'Honorários reservados', dados: { 'PAGO': 'RESERVADO', 'PROXIMO PASSO': 'AGENDAMENTO' } });
  if (e === 'AGENDAMENTO' && slot) {
    A.push({ id: 'confirmar-ag', rot: 'Agendamento peticionado', especial: 'confirmar-ag', destaque: true });
    A.push({ id: 'agendar', rot: 'Trocar horário', especial: 'agendar' });
  } else if (e === 'AGENDAMENTO') A.push({ id: 'agendar', rot: 'Agendar perícia', especial: 'agendar', destaque: true });
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
  if (e === 'PETICAO') A.push({ id: 'peticao', rot: 'Petição protocolada', dados: { 'PROXIMO PASSO': 'DECISÃO' }, destaque: true });
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

// escala do eixo dos gráficos: passo de 1, 2 ou 5 x 10^n (contagens: passo inteiro)
function escalaBonita(max, partes) {
  partes = partes || 4;
  if (!(max > 0)) return { topo: partes, passo: 1 };
  const bruto = max / partes, pot = Math.pow(10, Math.floor(Math.log10(bruto)));
  const passo = Math.max(1, Math.round([1, 2, 5, 10].map(f => f * pot).find(p => p >= bruto)));
  return { topo: Math.ceil(max / passo) * passo, passo: passo };
}
// quantas datas caem em cada semana (segunda a domingo), a partir da semana de "base"
function porSemana(datas, base, n) {
  const seg = new Date(base.getFullYear(), base.getMonth(), base.getDate() - ((base.getDay() + 6) % 7));
  const out = [];
  for (let i = 0; i < n; i++) out.push({ ini: new Date(seg.getFullYear(), seg.getMonth(), seg.getDate() + i * 7), n: 0 });
  datas.forEach(d => {
    if (!d) return;
    const k = Math.floor((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - seg) / 864e5 / 7);
    if (k >= 0 && k < n) out[k].n++;
  });
  return out;
}
// contagem por grupo, os "n" maiores e o resto em "Outros"
function contarTop(lista, fn, n, rotOutros) {
  const g = {};
  lista.forEach(x => { const k = String(fn(x) || '').trim() || 'Sem informação'; g[k] = (g[k] || 0) + 1; });
  const ord = Object.keys(g).map(k => ({ k: k, n: g[k] })).sort((a, b) => b.n - a.n || a.k.localeCompare(b.k));
  const resto = ord.slice(n).reduce((s, x) => s + x.n, 0);
  return ord.slice(0, n).concat(resto ? [{ k: rotOutros || 'Outros', n: resto, outros: true }] : []);
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

// eproc do TJSP: não aceita link direto para o processo (o link precisa de assinatura gerada pelo próprio eproc).
// O app abre a base certa com #pericias=<número> e copia o número. Com o atalho (eproc-atalho.user.js,
// instalado no Tampermonkey) o eproc preenche a busca rápida sozinho e abre o processo.
const EPROC_BASES = { '1G': 'https://eproc1g.tjsp.jus.br/eproc/', 'EF': 'https://eproc1g-ef.tjsp.jus.br/eproc/' };
function baseEproc(m) {
  const t = String((m && (m['FORUM'] || '')) + ' ' + (m && (m['CIDADE'] || ''))).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  return /FAZENDA|FISCAL/.test(t) ? 'EF' : '1G';
}
function linkEproc(proc, m) {
  if (digitos(proc).length !== 20) return '';
  return EPROC_BASES[baseEproc(m)] + '#pericias=' + digitos(proc);
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
function linkPdf(id) { return 'https://docs.google.com/document/d/' + encodeURIComponent(id) + '/export?format=pdf'; }
// campos que podem ser escritos nos modelos e são trocados ao gerar
const CAMPOS_DOC = [
  ['PROCESSO', 'Número do processo (formato CNJ)'], ['REQUERENTE', 'Parte requerente'], ['REQUERIDA', 'Parte requerida'],
  ['PERICIADO', 'Quem será periciado (na interdição, a parte requerida)'], ['VARA', 'Vara (coluna FORUM)'], ['CIDADE', 'Comarca'],
  ['TIPO', 'Tipo da perícia'], ['HONORARIOS', 'Honorários como estão na planilha'], ['DATA_PERICIA', 'Data da perícia (agenda ou planilha)'],
  ['DIA_SEMANA', 'Dia da semana da perícia'], ['HORA_PERICIA', 'Horário marcado na aba AGENDAMENTOS'], ['LOCAL_PERICIA', 'Local (consultório vira o endereço completo da Compart Clinic)'],
  ['HOJE', 'Data de hoje por extenso']
];
function fmtTamanho(b) {
  if (!b) return '';
  if (b < 1024 * 1024) return Math.max(1, Math.round(b / 1024)) + ' KB';
  return (b / 1024 / 1024).toFixed(1).replace('.', ',') + ' MB';
}
// ---------- regras de sugestão configuradas em cada modelo ----------
const FILTROS_MODELO = [['', 'Todos os processos'], ['nucleo', 'Só Núcleo 4.0 (acidentário)'], ['comum', 'Só varas comuns (fora do Núcleo)'], ['interdicao', 'Só interdição/curatela'], ['homecare', 'Só homecare'], ['bariatrica', 'Só pós-bariátrica'], ['erro', 'Só erro médico']];
function ehNucleoM(m) { return /NUCLEO/.test(chave(m['CIDADE'])) || /NUCLEO/.test(chave(m['FORUM'])); }
function filtroOk(filtro, m) {
  const t = chave(m['TIPO']);
  switch (filtro) {
    case 'nucleo': return ehNucleoM(m);
    case 'comum': return !ehNucleoM(m);
    case 'interdicao': return /INTERDI|CURATELA/.test(t) || /FAMILIA/.test(chave(m['FORUM']));
    case 'homecare': return /HOMECARE/.test(t);
    case 'bariatrica': return /BARIATR/.test(t);
    case 'erro': return /ERRO/.test(t);
    default: return true;
  }
}
function regraModelo(md) { const c = md && md.cfg; return c && ((c.etapas && c.etapas.length) || c.obs) ? c : null; }
function modeloServe(md, m) {
  const r = regraModelo(md);
  if (!r) return false;
  return (!r.etapas.length || r.etapas.indexOf(etapaDe(m)) >= 0) && (!r.obs || chave(m['OBSERVACAO']).indexOf(chave(r.obs)) >= 0) && filtroOk(r.filtro, m);
}
function modelosVisiveis(modelos) { return (modelos || []).filter(md => !(md.cfg && md.cfg.oculto)); }
function resumoRegra(md) {
  const r = md.cfg || {};
  const partes = [];
  if (r.etapas && r.etapas.length) partes.push('etapa ' + r.etapas.map(rotEtapa).join(', '));
  if (r.obs) partes.push('observação com "' + r.obs + '"');
  if (r.filtro) partes.push((FILTROS_MODELO.find(f => f[0] === r.filtro) || ['', ''])[1].replace(/^Só /, 'só '));
  return partes.length ? 'Sugerido em ' + partes.join(' · ') : 'Sugestão automática pelo nome';
}

// modelos sugeridos para o processo: primeiro os que têm regra configurada, depois os reconhecidos pelo nome
function sugerirModelos(modelos, m) {
  const vis = modelosVisiveis(modelos);
  const porRegra = vis.filter(md => modeloServe(md, m));
  const semRegra = vis.filter(md => !regraModelo(md) && (!md.cfg || !md.cfg.filtro || filtroOk(md.cfg.filtro, m)));
  return porRegra.concat(sugerirPorNome(semRegra, m).filter(md => porRegra.indexOf(md) < 0)).slice(0, 4);
}
function sugerirPorNome(modelos, m) {
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
  { k: 'pedido', rot: 'Já pedido', desc: 'MLE peticionado, ofício expedido ou recebido em parte', cor: 'var(--g-est1)' },
  { k: 'pronto', rot: 'Pronto para pedir', desc: 'Valor reservado e laudo entregue', cor: 'var(--g-est2)' },
  { k: 'andamento', rot: 'Em andamento', desc: 'Valor reservado, perícia ou laudo por fazer', cor: 'var(--g-est3)' },
  { k: 'incerto', rot: 'Sem reserva', desc: 'Honorários ainda não depositados', cor: 'var(--g-est4)' }
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

// ---------- tarefas ----------
function principalAcao(m, ctx) { const a = acoesRapidas(m, ctx); return a.find(x => x.destaque) || a[0] || null; }

// ---------- agenda: horário reservado do processo e horários livres ----------
// horário de hoje em diante com o nome do periciado (o que ainda não está OK vem primeiro)
function slotDoProcesso(m, agenda) {
  const nomes = [periciadoDe(m), m['REQUERENTE'], m['REQUERIDA']].map(chave).filter(n => n.split(' ').length >= 2);
  if (!nomes.length) return null;
  const casa = n => { n = chave(n); return n && nomes.some(x => x === n || (n.split(' ').length >= 2 && x.indexOf(n + ' ') === 0)); };
  const c = (agenda || []).filter(a => casa(a.nome)).map(a => Object.assign({ d: parseData(a.data) }, a))
    .filter(a => a.d && diasAte(a.d) >= 0).sort((a, b) => a.d - b.d || String(a.hora).localeCompare(String(b.hora)));
  return c.find(a => chave(a.status) !== 'OK') || null;
}
// horas de "ini" a "fim" (inclusive) a cada "passo" minutos
function horariosIntervalo(ini, fim, passo) {
  const min = h => { const m = String(h || '').match(/^(\d{1,2}):(\d{2})$/); return m ? +m[1] * 60 + +m[2] : null; };
  const a = min(ini), b = min(fim), p = Math.round(Number(passo));
  if (a == null || b == null || !(p >= 5) || b < a) return [];
  const out = [];
  for (let t = a; t <= b && out.length < 60; t += p) out.push(pad2(Math.floor(t / 60)) + ':' + pad2(t % 60));
  return out;
}
// horários livres de hoje em diante, em ordem
function livresFuturos(livres) {
  return (livres || []).map(a => Object.assign({ d: parseData(a.data) }, a)).filter(a => a.d && diasAte(a.d) >= 0)
    .sort((a, b) => a.d - b.d || String(a.hora).localeCompare(String(b.hora)));
}
function grupoPrazo(d) {
  if (!d) return 'sem';
  const n = diasAte(d);
  return n < 0 ? 'atrasadas' : n === 0 ? 'hoje' : n <= 7 ? 'semana' : 'depois';
}
// conferência nos autos dos processos que só aguardam (decisão, depósito, pagamento)
// meta: conferir a cada "meta" dias (7); limite: nunca passar de "limite" dias (15)
// nivel: 'ok' (conferido há menos que a meta), 'semana' (passou da meta), 'vencido' (chegou ao limite ou nunca conferido)
function situacaoConferencia(itens, verificados, meta, limite) {
  limite = limite || meta * 2;
  const chaveData = v => String(v.quando).replace(/^(\d\d)\/(\d\d)\/(\d{4})/, '$3$2$1');
  const todos = itens.filter(it => it.c.quem === 'acompanhar').map(it => {
    const v = (verificados || {})[digitos(it.m['PROCESSO'])] || null;
    const d = v ? parseData(String(v.quando).slice(0, 10)) : null;
    const dias = d ? -diasAte(d) : null;
    return { it: it, v: v, d: d, dias: dias, nivel: dias == null || dias >= limite ? 'vencido' : dias >= meta ? 'semana' : 'ok' };
  });
  const pendentes = todos.filter(x => x.nivel !== 'ok')
    .sort((a, b) => (b.dias == null ? 9999 : b.dias) - (a.dias == null ? 9999 : a.dias)); // nunca conferidos e mais antigos primeiro
  const recentes = todos.filter(x => x.nivel === 'ok').sort((a, b) => chaveData(b.v).localeCompare(chaveData(a.v)));
  return { total: todos.length, pendentes: pendentes, recentes: recentes, vencidos: pendentes.filter(x => x.nivel === 'vencido').length, semana: pendentes.filter(x => x.nivel === 'semana').length };
}
// texto do prazo de cada processo da conferência
function prazoConferencia(x, meta, limite) {
  if (!x.v) return 'nunca conferido pelo app';
  const ha = 'há ' + x.dias + ' dia' + (x.dias === 1 ? '' : 's');
  if (x.nivel === 'vencido') return ha + (x.dias === limite ? ', chegou ao limite de ' + limite : ', passou do limite de ' + limite);
  if (x.nivel === 'semana') { const f = limite - x.dias; return ha + ' · limite ' + (f === 1 ? 'amanhã' : 'em ' + f + ' dias'); }
  const prox = new Date(x.d.getTime()); prox.setDate(prox.getDate() + meta);
  return 'próxima até ' + String(prox.getDate()).padStart(2, '0') + '/' + String(prox.getMonth() + 1).padStart(2, '0');
}
// "01/11/2026 15:24" + "daian" -> "01/11/2026 às 15:24 por daian"
function txtConferencia(v) {
  if (!v) return 'Nunca conferido pelo app';
  const m = String(v.quando).match(/^(\d{1,2}\/\d{1,2}\/\d{4})(?:\s+(\d{1,2}:\d{2}))?/);
  return (m ? m[1] + (m[2] ? ' às ' + m[2] : '') : String(v.quando)) + (v.por ? ' por ' + v.por : '') + (v.tipo === 'atualizado' ? ' (processo atualizado)' : '');
}

// escopo: 'assistente' (tudo do assistente), 'minhas' (do usuário logado) ou 'todas'
function montarTarefas(itens, manuais, usuario, papel, escopo, usuarios) {
  const papelDe = u => u === 'assistentes' ? 'assistente' : ((usuarios || []).find(x => x.u === u) || {}).papel || 'assistente';
  const meuPapel = papel === 'perito' ? 'perito' : 'assistente';
  const out = [];
  itens.forEach(it => {
    const q = it.c.quem;
    if (!q || q === 'acompanhar') return;
    if (escopo === 'todas' || (escopo === 'assistente' && q === 'assistente') || (escopo === 'minhas' && q === meuPapel)) {
      out.push({ tipo: 'fluxo', id: 'f' + it.linha, titulo: it.c.acao, quem: q, prazo: prazoDe(it.m), it: it });
    }
  });
  (manuais || []).filter(t => t.status !== 'FEITA').forEach(t => {
    const alvo = papelDe(t.para);
    const ok = escopo === 'todas' || (escopo === 'assistente' && alvo === 'assistente') ||
      (escopo === 'minhas' && (t.para === usuario || (meuPapel === 'assistente' && t.para === 'assistentes')));
    if (ok) out.push({ tipo: 'manual', id: t.id, titulo: t.tarefa, quem: alvo, prazo: parseData(t.prazo), t: t });
  });
  return out.sort((a, b) => (a.prazo || 9e15) - (b.prazo || 9e15) || (a.tipo === b.tipo ? 0 : a.tipo === 'manual' ? -1 : 1));
}

// ---------- gerador de documentos ----------
const GRUPOS_MODELO = ['Aceite', 'Agendamento', 'Perícia', 'Laudo e esclarecimentos', 'Pagamento (MLE)', 'Renúncia', 'Outros'];
function grupoModelo(md) {
  if (md && typeof md === 'object' && md.cfg && md.cfg.grupo && GRUPOS_MODELO.indexOf(md.cfg.grupo) >= 0) return md.cfg.grupo;
  const t = chave(typeof md === 'object' ? md.nome : md);
  if (/ESCLARECIMENTO|LAUDO|PRORROGACAO/.test(t)) return 'Laudo e esclarecimentos';
  if (/NAO COMPARECIMENTO|DECLARACAO|AUTORIZACAO|COMPARECIMENTO/.test(t)) return 'Perícia';
  if (/ACEITE/.test(t)) return 'Aceite';
  if (/AGENDAMENTO/.test(t)) return 'Agendamento';
  if (/MLE|HONORARIOS|FORMULARIO/.test(t)) return 'Pagamento (MLE)';
  if (/RENUNCIA/.test(t)) return 'Renúncia';
  return 'Outros';
}
// processos que normalmente precisam deste modelo agora (regra configurada ou pelo nome do modelo)
function processosParaModelo(md, itens) {
  if (typeof md === 'string') md = { nome: md };
  if (regraModelo(md)) return itens.filter(it => modeloServe(md, it.m)).sort((a, b) => (parseData(a.m['PERICIA']) || 9e15) - (parseData(b.m['PERICIA']) || 9e15));
  const filtro = md.cfg && md.cfg.filtro;
  return processosPeloNome(md.nome, itens).filter(it => !filtro || filtroOk(filtro, it.m));
}
function processosPeloNome(nome, itens) {
  const t = chave(nome).replace(/[^A-Z0-9 ]/g, ' ');
  const nuc = it => /NUCLEO/.test(chave(it.m['CIDADE'])) || /NUCLEO/.test(chave(it.m['FORUM']));
  const futura = (it, max) => { const d = parseData(it.m['PERICIA']); return d && diasAte(d) >= 0 && (max == null || diasAte(d) <= max); };
  let f;
  if (/NAO COMPARECIMENTO/.test(t)) f = it => /COMPARECEU/.test(chave(it.m['OBSERVACAO'])) && etapaDe(it.m) === 'DECISAO';
  else if (/RENUNCIA/.test(t)) f = it => etapaDe(it.m) === 'RENUNCIAR';
  else if (/MLE|HONORARIOS|FORMULARIO/.test(t)) f = it => it.c.acao === 'Peticionar o pagamento (MLE)';
  else if (/ACEITE/.test(t)) f = it => etapaDe(it.m) === 'ACEITE';
  else if (/AGENDAMENTO/.test(t)) f = it => futura(it);
  else if (/COMPARECIMENTO|AUTORIZACAO|FOTOGRAFIA/.test(t)) f = it => futura(it, 7);
  else if (/LAUDO/.test(t)) f = it => etapaDe(it.m) === 'LAUDO';
  else return [];
  return itens.filter(f)
    .filter(it => /\bN40\b/.test(t) ? nuc(it) : true)
    .filter(it => /INTERDICAO/.test(t) ? (/INTERDI|CURATELA/.test(chave(it.m['TIPO'])) || /FAMILIA/.test(chave(it.m['FORUM']))) : true)
    .filter(it => /HOMECARE/.test(t) ? /HOMECARE/.test(chave(it.m['TIPO'])) : true)
    .sort((a, b) => (parseData(a.m['PERICIA']) || 9e15) - (parseData(b.m['PERICIA']) || 9e15));
}

if (typeof document === 'undefined') {
  if (typeof module !== 'undefined') module.exports = {
    principalAcao, slotDoProcesso, horariosIntervalo, livresFuturos, grupoPrazo, montarTarefas, situacaoConferencia, prazoConferencia, txtConferencia, grupoModelo, processosParaModelo, filtroOk, modeloServe, resumoRegra,
    estagioRecebimento, valorLinha, pagoLinha, somarPor, laudosPendentes, gerarCSV,
    ehIntegra, tipoArquivo, urlPrevia, fmtTamanho, sugerirModelos, linkPdf, CAMPOS_DOC, modelosVisiveis,
    chave, esc, digitos, formatarCNJ, parseData, zeroHoje, diasAte, linhaMapa, classificar, semReserva, somaMinutos, isoParaBr, brParaIso,
    numBR, valorHonorarios, fmtBRL, fmtBRLcurto, etapaDe, posTrilha, nivelPrazo, acoesRapidas, nomeCurto, periciadoDe, tipoAgendaDe,
    montarEventos, porMes, escalaBonita, porSemana, contarTop, gcalLink, linkEsaj, linkEproc, baseEproc, mdDiscord, gerarTarefas, gerarPauta, gerarPrazos, gerarFinanceiro, gerarFilaAgendamento, txtDias
  };
  return;
}

/* ================================================================
   APLICATIVO
   ================================================================ */
const CFG = window.PERICIAS_CONFIG || {};
const API = CFG.API || '';
const UFESP = Number(CFG.UFESP) || 0;
const CONFERIR_DIAS = Math.max(1, Math.round(Number(CFG.CONFERIR_DIAS) || 7)); // meta: conferir nos autos a cada N dias
const CONFERIR_LIMITE = Math.max(CONFERIR_DIAS + 1, Math.round(Number(CFG.CONFERIR_LIMITE) || 15)); // nunca passar de N dias sem conferir
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
  gestao: '<path d="M4 20V11M10 20V5M16 20v-8M21 20H3"/>',
  tarefas: '<path d="M10 6h10M10 12h10M10 18h10"/><path d="m3.5 6 1.5 1.5L7.5 5M3.5 12l1.5 1.5L7.5 11M3.5 18l1.5 1.5L7.5 17"/>',
  documentos: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
  mais: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
  sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  lua: '<path d="M20.5 14.2A8.5 8.5 0 1 1 9.8 3.5a6.8 6.8 0 0 0 10.7 10.7z"/>'
};
function ic(nome) { return '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">' + (ICONES[nome] || '') + '</svg>'; }

// o perito vê "Gestão" (totais e projeção); o assistente vê "Pagamentos" (só o operacional)
function views() {
  const perito = state.papel === 'perito';
  return [
    { id: 'painel', rot: 'Painel' },
    { id: 'tarefas', rot: 'Tarefas' },
    { id: 'processos', rot: 'Processos' },
    { id: 'agenda', rot: 'Agenda' },
    { id: 'calendario', rot: 'Calendário' },
    { id: 'documentos', rot: 'Documentos' },
    perito ? { id: 'gestao', rot: 'Financeiro', icone: 'gestao' } : { id: 'pagamentos', rot: 'Pagamentos', icone: 'financeiro' },
    { id: 'discord', rot: 'Discord' },
    { id: 'arquivo', rot: 'Arquivo' }
  ];
}
const NAV_PRINCIPAIS = ['painel', 'tarefas', 'processos', 'agenda']; // no celular, o resto fica em "Mais"

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
  tarefas: [],
  verificados: {},
  usuarios: [],
  tEscopo: '',
  verFeitas: false,
  verTodasConf: false,
  verConfRecentes: false,
  gd: { modeloId: '', q: '', pq: '', sel: {}, criarPasta: true, resultados: [], rodando: false },
  view: 'painel',
  dados: {},
  agenda: [],
  livres: [],
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
  modelosSug: [],
  docTab: 'gerar',
  mdQ: '',
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
  toast._t = setTimeout(() => { t.hidden = true; }, op.tempo || (op.acao ? 7000 : op.erro ? 6000 : 2800));
}

/* ---------- LOGIN ---------- */
function mostrarLogin() { $('#tela-app').hidden = true; $('#tela-login').hidden = false; }
function mostrarApp() { $('#tela-login').hidden = true; $('#tela-app').hidden = false; $('#nav-user').textContent = state.user; }

function sair(avisarServidor) {
  if (avisarServidor && state.token) api('logout').catch(() => {});
  state.token = ''; state.dados = {}; state.agenda = []; state.livres = []; state.papel = 'assistente'; state.gestao = null; state.docs = {};
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
      state.livres = j.livres || [];
      state.atividade = j.atividade || [];
      state.canais = j.canais || [];
      state.tarefas = j.tarefas || [];
      state.verificados = j.verificados || {};
      state.usuarios = j.usuarios || [];
      state.hora = j.hora || '';
      $('#nav-user').textContent = state.user;
      $('#sync').textContent = state.hora ? 'Atualizado às ' + state.hora : '';
      render();
      atualizarFichaAberta();
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
function slotDe(it) { return it && it.aba === 'PERICIAS' ? slotDoProcesso(it.m, state.agenda) : null; }
function acoesDe(it) { return acoesRapidas(it.m, { slot: slotDe(it) }); }
function hn(h) { const m = String(h || '').trim().match(/^(\d{1,2}):(\d{2})$/); return m ? pad2(+m[1]) + ':' + m[2] : String(h || '').trim(); }
function txtSlot(sl) { const d = parseData(sl.data); return (d ? DIAS_SEM[d.getDay()] + ' ' + fmtCurto(d) : sl.data) + ' às ' + sl.hora; }
function processoDoSlot(a) {
  const n = chave(a.nome);
  return ativos().find(it => chave(it.m['REQUERENTE']) === n || chave(it.m['REQUERIDA']) === n);
}

/* ---------- NAVEGAÇÃO ---------- */
function renderNav() {
  const urgentes = ativos().filter(it => it.c.quem && it.c.quem !== 'acompanhar' && prazoDe(it.m) && diasAte(prazoDe(it.m)) <= 2).length;
  const minhas = montarTarefas(ativos(), state.tarefas, state.user, state.papel, escopoTarefas(), state.usuarios)
    .filter(t => ['atrasadas', 'hoje'].indexOf(grupoPrazo(t.prazo)) >= 0).length;
  const badge = v => v.id === 'painel' && urgentes ? '<span class="badge" title="Prazos vencidos ou em até 2 dias">' + urgentes + '</span>'
    : v.id === 'tarefas' && minhas ? '<span class="badge" title="Tarefas atrasadas ou para hoje">' + minhas + '</span>' : '';
  const btn = (v, extra) => '<button type="button" data-acao="ir" data-view="' + v.id + '" class="' + (state.view === v.id ? 'ativa' : '') + (extra ? ' extra' : '') + '"' + (state.view === v.id ? ' aria-current="page"' : '') + '>' +
    ic(v.icone || v.id) + '<span>' + v.rot + '</span>' + badge(v) + '</button>';
  const vs = views();
  const noMais = NAV_PRINCIPAIS.indexOf(state.view) < 0;
  $('#nav-itens').innerHTML = vs.map(v => btn(v, NAV_PRINCIPAIS.indexOf(v.id) < 0)).join('') +
    '<button type="button" class="mais-btn' + (noMais ? ' ativa' : '') + '" data-acao="nav-mais" aria-haspopup="true">' + ic('mais') + '<span>' + (noMais ? esc((vs.find(v => v.id === state.view) || {}).rot || 'Mais') : 'Mais') + '</span></button>';
  $('#nav-mais').innerHTML = vs.filter(v => NAV_PRINCIPAIS.indexOf(v.id) < 0).map(v => btn(v, false)).join('') +
    '<button type="button" class="item-tema" data-acao="tema">' + ic(temaAtual() === 'escuro' ? 'sol' : 'lua') + '<span>' + (temaAtual() === 'escuro' ? 'Usar tema claro' : 'Usar tema escuro') + '</span></button>';
  atualizarBotaoTema();
}

/* ---------- tema (escuro é o padrão; a escolha fica salva neste aparelho) ---------- */
function temaAtual() { return document.documentElement.dataset.tema === 'claro' ? 'claro' : 'escuro'; }
function aplicarTema(t) {
  document.documentElement.dataset.tema = t;
  gravar('pericias_tema', t);
  const m = document.querySelector('meta[name=theme-color]');
  if (m) m.content = t === 'claro' ? '#0d1b2a' : '#08101a';
  renderNav();
}
function atualizarBotaoTema() {
  const b = $('#btn-tema');
  if (!b) return;
  const escuro = temaAtual() === 'escuro';
  b.innerHTML = ic(escuro ? 'sol' : 'lua') + '<span>' + (escuro ? 'Usar tema claro' : 'Usar tema escuro') + '</span>';
}
function escopoTarefas() { return state.tEscopo || (state.papel === 'perito' ? 'assistente' : 'minhas'); }

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
  $('#btn-novo').textContent = (state.view === 'agenda' || state.view === 'calendario') ? '+ Horário' : state.view === 'tarefas' ? '+ Tarefa' : '+ Processo';
  $('#btn-novo').hidden = ['discord', 'gestao', 'documentos'].indexOf(state.view) >= 0;
  if (!state.dados.PERICIAS) return;
  ({ painel: renderPainel, tarefas: renderTarefas, processos: renderProcessos, calendario: renderCalendario, agenda: renderAgenda,
     documentos: renderDocumentos, gestao: renderGestao, pagamentos: renderPagamentos, discord: renderDiscord, arquivo: renderArquivo })[state.view]();
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

/* ---------- gráficos (HTML e CSS; valores no passar do mouse, no toque ou no foco) ---------- */
function dicaAttr(valor, rotulo) { return ' data-dica-v="' + esc(valor) + '" data-dica-r="' + esc(rotulo || '') + '"'; }

// barras horizontais (uma série, uma cor); x: { rot, val, txt, dica, cor, attrs }
function barras(lista) {
  const max = Math.max(1, ...lista.map(x => x.val));
  if (!lista.length) return '<p class="vazio">Sem dados.</p>';
  return '<div class="barras">' + lista.map(x =>
    '<button type="button" class="barra" ' + (x.attrs || '') + dicaAttr(x.dica || x.txt || x.val, x.rot) + '>' +
    '<span class="rot">' + esc(x.rot) + '</span><span class="trilho"><span class="fill" style="width:' + Math.max(1.5, x.val / max * 100).toFixed(1) + '%;' + (x.cor ? 'background:' + x.cor : '') + '"></span></span>' +
    '<span class="v">' + esc(x.txt || x.val) + '</span></button>').join('') + '</div>';
}

// colunas com eixo; d: { rot, val, cls ('atual' | 'futuro'), dica, dicaR, rotulo (mostra o valor no topo) }
function colunas(dados, opt) {
  opt = opt || {};
  const esc2 = escalaBonita(Math.max(0, ...dados.map(x => x.val)), 4);
  const ticks = [];
  for (let v = 0; v <= esc2.topo; v += esc2.passo) ticks.push(v);
  const pct = v => (v / esc2.topo * 100).toFixed(2);
  return '<div class="gcol" style="--h:' + (opt.altura || 150) + 'px" role="img" aria-label="' + esc((opt.titulo || '') + ': ' + dados.map(x => x.rot + ' ' + x.val).join(', ')) + '">' +
    '<div class="gcol-eixo">' + ticks.map(t => '<span style="bottom:' + pct(t) + '%">' + t + '</span>').join('') + '</div>' +
    '<div class="gcol-plot">' + ticks.slice(1).map(t => '<i class="gcol-grade" style="bottom:' + pct(t) + '%"></i>').join('') +
    dados.map(x => '<div class="gcol-item ' + (x.cls || '') + (x.val ? '' : ' zero') + '" tabindex="0"' + dicaAttr(x.dica || x.val, x.dicaR || x.rot) + '>' +
      (x.rotulo && x.val ? '<span class="gcol-v" style="bottom:calc(' + pct(x.val) + '% + 4px)">' + x.val + '</span>' : '') +
      '<span class="gcol-b" style="height:' + pct(x.val) + '%"></span></div>').join('') + '</div>' +
    '<div class="gcol-rots">' + dados.map(x => '<span>' + esc(x.rot) + '</span>').join('') + '</div></div>';
}

// colunas empilhadas; series: [{ k, rot, cor }], d: { rot, partes: { k: n }, dicaR }
function colunasPilha(dados, series, opt) {
  opt = opt || {};
  const tot = d => series.reduce((s, x) => s + (d.partes[x.k] || 0), 0);
  const esc2 = escalaBonita(Math.max(0, ...dados.map(tot)), 4);
  const ticks = [];
  for (let v = 0; v <= esc2.topo; v += esc2.passo) ticks.push(v);
  const pct = v => (v / esc2.topo * 100).toFixed(2);
  return '<div class="gcol" style="--h:' + (opt.altura || 130) + 'px" role="img" aria-label="' + esc(opt.titulo || '') + '">' +
    '<div class="gcol-eixo">' + ticks.map(t => '<span style="bottom:' + pct(t) + '%">' + t + '</span>').join('') + '</div>' +
    '<div class="gcol-plot">' + ticks.slice(1).map(t => '<i class="gcol-grade" style="bottom:' + pct(t) + '%"></i>').join('') +
    dados.map(d => '<div class="gcol-item" tabindex="0"' + dicaAttr(tot(d) + ' ações', (d.dicaR || d.rot) + ' · ' + series.map(x => x.rot + ' ' + (d.partes[x.k] || 0)).join(', ')) + '>' +
      '<span class="gcol-pilha" style="height:' + pct(tot(d)) + '%">' + series.filter(x => d.partes[x.k]).map(x => '<span style="flex:' + d.partes[x.k] + ' 1 0;background:' + x.cor + '"></span>').join('') + '</span></div>').join('') + '</div>' +
    '<div class="gcol-rots">' + dados.map(d => '<span>' + esc(d.rot) + '</span>').join('') + '</div></div>';
}

// barra segmentada fina (parte do todo) + lista com nome, valor e participação
// p: { rot, val, txt, cor, desc, attrs, ativa }
function segmentos(partes, opt) {
  opt = opt || {};
  const total = partes.reduce((s, p) => s + p.val, 0);
  if (!total) return '<p class="vazio">Sem dados.</p>';
  const pc = v => Math.round(v / total * 100) + '%';
  let h = '<div class="gseg" role="img" aria-label="' + esc((opt.titulo || '') + ': ' + partes.map(p => p.rot + ' ' + (p.txt || p.val) + ' (' + pc(p.val) + ')').join(', ')) + '">' +
    partes.filter(p => p.val > 0).map(p => '<span' + (opt.semFoco ? '' : ' tabindex="0"') + ' style="flex:' + p.val + ' 1 0;background:' + p.cor + '"' + dicaAttr(p.txt || p.val, p.rot + ' · ' + pc(p.val)) + '></span>').join('') + '</div>';
  if (opt.semLista) return h;
  return h + '<div class="gseg-lista">' + partes.map(p => {
    const tag = p.attrs ? 'button type="button"' : 'div';
    return '<' + tag + ' class="gseg-linha' + (p.ativa ? ' ativa' : '') + '" ' + (p.attrs || '') + '><span class="sw" style="background:' + p.cor + '"></span><span>' + esc(p.rot) + (p.desc ? '<small>' + esc(p.desc) + '</small>' : '') + '</span>' +
      '<b>' + esc(p.txt || p.val) + '</b><span class="pct">' + pc(p.val) + '</span></' + tag.split(' ')[0] + '>';
  }).join('') + '</div>';
}

// colunas pequenas para os indicadores do topo; d: { n, rot, cls }
function miniColunas(dados) {
  const max = Math.max(1, ...dados.map(x => x.n));
  return '<div class="mini-cols" aria-hidden="true">' + dados.map(x => '<span class="' + (x.cls || '') + (x.n ? '' : ' zero') + '" style="height:' + Math.max(6, x.n / max * 100).toFixed(1) + '%"' + dicaAttr(x.n, x.rot) + '></span>').join('') + '</div>';
}

// dica flutuante dos gráficos (texto inserido com textContent)
const dicaGraf = document.createElement('div');
dicaGraf.className = 'dica-graf';
dicaGraf.hidden = true;
dicaGraf.setAttribute('role', 'status');
document.body.appendChild(dicaGraf);
function mostrarDica(el, x, y) {
  dicaGraf.textContent = '';
  const v = document.createElement('b'); v.textContent = el.dataset.dicaV;
  const r = document.createElement('span'); r.textContent = el.dataset.dicaR;
  dicaGraf.append(v, r);
  dicaGraf.hidden = false;
  if (x == null) { const b = el.getBoundingClientRect(); x = b.left + b.width / 2; y = b.top; }
  const w = dicaGraf.offsetWidth, hh = dicaGraf.offsetHeight;
  dicaGraf.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, x - w / 2)) + 'px';
  dicaGraf.style.top = (y - hh - 12 < 8 ? y + 18 : y - hh - 12) + 'px';
}
document.addEventListener('pointermove', e => {
  const el = e.target.closest && e.target.closest('[data-dica-v]');
  if (el) mostrarDica(el, e.clientX, e.clientY); else if (!dicaGraf.hidden) dicaGraf.hidden = true;
});
document.addEventListener('pointerdown', e => { const el = e.target.closest && e.target.closest('[data-dica-v]'); if (el && e.pointerType !== 'mouse') mostrarDica(el, e.clientX, e.clientY); });
document.addEventListener('focusin', e => { const el = e.target.closest && e.target.closest('[data-dica-v]'); if (el) mostrarDica(el); });
document.addEventListener('focusout', () => { dicaGraf.hidden = true; });
window.addEventListener('scroll', () => { dicaGraf.hidden = true; }, true);

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
  const prazosHoje = comPrazo.filter(i => diasAte(prazoDe(i.m)) === 0);
  const pl = (n, um, varios) => n + ' ' + (n === 1 ? um : varios);

  const hr = new Date().getHours();
  const resumo = [agHoje.length ? pl(agHoje.length, 'perícia hoje', 'perícias hoje') : 'nenhuma perícia hoje', prox7.length ? pl(prox7.length, 'prazo nos próximos 7 dias', 'prazos nos próximos 7 dias') : 'nenhum prazo nos próximos 7 dias'];
  let h = '<div class="saudacao"><div><h2>' + (hr < 12 ? 'Bom dia' : hr < 18 ? 'Boa tarde' : 'Boa noite') + ', ' + esc(state.user) + '</h2><p>' + esc(fmtExtenso(hoje)) + ' · ' + esc(resumo.join(' e ')) + '</p></div></div>';

  // indicadores do topo (sem valores em dinheiro: os totais ficam só no Financeiro)
  const diasPrazo = [];
  for (let i = 0; i < 7; i++) { const d = somaDias(hoje, i); diasPrazo.push({ n: comPrazo.filter(it => mesmoDia(prazoDe(it.m), d)).length, rot: i === 0 ? 'hoje' : DIAS_SEM[d.getDay()] + ' ' + fmtCurto(d), cls: i === 0 ? 'agora' : '' }); }
  const semanas = porSemana(agenda.map(a => a.d), hoje, 6).map((w, i) => ({ n: w.n, rot: 'semana de ' + fmtCurto(w.ini), cls: i === 0 ? 'agora' : '' }));
  const laudos = laudosPendentes(lista), laudosAtras = laudos.filter(x => x.dias != null && x.dias > 20);
  const mleN = lista.filter(i => i.c.acao === 'Peticionar o pagamento (MLE)').length;
  const aguardPag = lista.filter(i => ['MLE', 'OFICIO', 'PARCIAL'].indexOf(chave(i.m['PAGO'])) >= 0).length;
  h += '<section class="kpis">' +
    '<button type="button" class="kpi" style="--k:var(--kpi-neutro)" data-acao="filtrar" data-quem=""><span class="ic-kpi">' + ic('processos') + '</span><span class="rot">Processos ativos</span><span class="val">' + lista.length + '</span>' +
      '<div class="kpi-graf">' + segmentos([{ rot: 'Com o perito', val: perito.length, cor: 'var(--g-perito)' }, { rot: 'Com o assistente', val: assist.length, cor: 'var(--g-assist)' }, { rot: 'Aguardando Juízo ou pagamento', val: acomp.length, cor: 'var(--g-neutro)' }], { semLista: true, semFoco: true, titulo: 'Processos por responsável' }) +
      '<div class="kpi-leg"><span><i style="background:var(--g-perito)"></i>' + perito.length + ' perito</span><span><i style="background:var(--g-assist)"></i>' + assist.length + ' assistente</span><span><i style="background:var(--g-neutro)"></i>' + acomp.length + ' aguardando</span></div></div></button>' +
    '<button type="button" class="kpi" style="--k:' + (vencidos.length ? 'var(--vencido)' : 'var(--alerta)') + '" data-acao="ir" data-view="calendario"><span class="ic-kpi">' + ic('calendario') + '</span><span class="rot">Prazos em 7 dias</span><span class="val">' + prox7.length + '</span><span class="sub">' + (vencidos.length ? '<b style="color:var(--vencido)">' + pl(vencidos.length, 'vencido', 'vencidos') + '</b>' : 'nenhum vencido') + '</span>' + miniColunas(diasPrazo) + '</button>' +
    '<button type="button" class="kpi" style="--k:var(--pericia)" data-acao="ir" data-view="agenda"><span class="ic-kpi">' + ic('agenda') + '</span><span class="rot">Perícias em 14 dias</span><span class="val">' + ag14.length + '</span><span class="sub">' + (agHoje.length ? agHoje.length + ' hoje' : ag14.length ? 'próxima ' + fmtCurto(ag14[0].d) : 'nada agendado') + ' · próximas 6 semanas</span>' + miniColunas(semanas) + '</button>' +
    (state.papel === 'perito'
      ? '<button type="button" class="kpi" style="--k:' + (laudosAtras.length ? 'var(--critico)' : 'var(--pericia)') + '" data-acao="filtrar" data-etapa="LAUDO"><span class="ic-kpi">' + ic('documentos') + '</span><span class="rot">Laudos a fazer</span><span class="val">' + laudos.length + '</span><span class="sub">' + (laudosAtras.length ? '<b style="color:var(--vencido)">' + laudosAtras.length + ' com perícia há mais de 20 dias</b>' : 'nenhum atrasado') + '</span></button>'
      : '<button type="button" class="kpi" style="--k:var(--assist)" data-acao="ir" data-view="pagamentos"><span class="ic-kpi">' + ic('financeiro') + '</span><span class="rot">MLE a peticionar</span><span class="val">' + mleN + '</span><span class="sub">' + aguardPag + ' aguardando pagamento</span></button>') +
    '</section>';

  h += '<div class="grid alto-livre">';
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
  if (aConfirmar.length) alertas.push('<button type="button" class="alerta-box" data-acao="ir" data-view="agenda"><span>📅</span><span><b>' + aConfirmar.length + '</b> horário(s) reservado(s) ainda sem status OK: falta peticionar o agendamento e confirmar.</span></button>');
  if (mleN) alertas.push('<button type="button" class="alerta-box azul" data-acao="filtrar" data-etapa="PAGAMENTO"><span>💰</span><span><b>' + mleN + '</b> pagamento(s) liberado(s) aguardando o MLE.</span></button>');
  const scP = situacaoConferencia(lista, state.verificados, CONFERIR_DIAS, CONFERIR_LIMITE);
  if (scP.vencidos) alertas.push('<button type="button" class="alerta-box" data-acao="ir" data-view="tarefas"><span>🔎</span><span><b>' + scP.vencidos + '</b> processo(s) aguardando sem conferir nos autos há ' + CONFERIR_LIMITE + ' dias ou mais (ou nunca conferidos pelo app).</span></button>');
  const semPrazo = lista.filter(i => i.c.quem && i.c.quem !== 'acompanhar' && !prazoDe(i.m)).length;
  if (semPrazo) alertas.push('<button type="button" class="alerta-box azul" data-acao="ir" data-view="processos"><span>🗓️</span><span><b>' + semPrazo + '</b> tarefa(s) do perito ou do assistente sem prazo cadastrado.</span></button>');
  h += alertas.length ? alertas.join('') : '<p class="vazio">Tudo em ordem.</p>';
  h += '</section></div>';

  // fluxo por etapa (na ordem do trabalho)
  const etapas = ETAPAS.concat([{ k: 'OUTROS', rot: 'Outros' }, { k: 'SEM', rot: 'Sem etapa' }])
    .map(e => ({ e: e, n: lista.filter(i => etapaDe(i.m) === e.k).length })).filter(x => x.n);
  h += '<section class="cartao c7"><div class="cartao-topo"><h2>Fluxo dos processos</h2><button type="button" class="link" data-acao="ir" data-view="processos">Ver quadro</button></div><p class="cartao-sub">Quantos processos estão em cada etapa, na ordem do trabalho. Toque para ver a lista.</p>' +
    barras(etapas.map(x => ({ rot: x.e.rot, val: x.n, dica: pl(x.n, 'processo', 'processos'), attrs: 'data-acao="filtrar" data-etapa="' + x.e.k + '"' }))) + '</section>';

  // conferência nos autos
  h += '<section class="cartao c5"><div class="cartao-topo"><h2>Conferência nos autos</h2><button type="button" class="link" data-acao="ir" data-view="tarefas">Abrir</button></div><p class="cartao-sub">Processos aguardando decisão, depósito ou pagamento (' + scP.total + '). Meta: conferir toda semana, sem passar de ' + CONFERIR_LIMITE + ' dias.</p>' +
    segmentos([
      { rot: '✓ Em dia', desc: 'conferidos nos últimos ' + CONFERIR_DIAS + ' dias', val: scP.recentes.length, cor: 'var(--g-bom)', attrs: 'data-acao="ir" data-view="tarefas"' },
      { rot: '! Conferir esta semana', desc: 'de ' + CONFERIR_DIAS + ' a ' + (CONFERIR_LIMITE - 1) + ' dias sem conferir', val: scP.semana, cor: 'var(--g-aviso)', attrs: 'data-acao="ir" data-view="tarefas"' },
      { rot: '× No limite', desc: CONFERIR_LIMITE + ' dias ou mais, ou nunca conferidos', val: scP.vencidos, cor: 'var(--g-critico)', attrs: 'data-acao="ir" data-view="tarefas"' }
    ], { titulo: 'Conferência nos autos' }) + '</section>';

  // perícias por mês: 6 meses para trás, o atual e 2 para frente
  const ini = new Date(hoje.getFullYear(), hoje.getMonth() - 6, 1);
  const meses = porMes(itens('PERICIAS').concat(itens('CONCLUSOS')).map(i => i.m), ini, 9);
  const totPassado = meses.filter(x => new Date(x.ano, x.mes + 1, 1) <= hoje).reduce((s, x) => s + x.n, 0);
  h += '<section class="cartao c7"><div class="cartao-topo"><h2>Perícias por mês</h2><span class="legenda" style="margin:0"><span><i style="background:var(--g-serie)"></i>realizadas</span><span><i style="background:var(--g-destaque)"></i>mês atual</span><span><i style="background:var(--g-futuro)"></i>agendadas</span></span></div>' +
    '<p class="cartao-sub">' + totPassado + ' perícias nos últimos 6 meses (pela data da perícia na planilha, ativos e concluídos)</p>' +
    colunas(meses.map(x => {
      const atual = x.ano === hoje.getFullYear() && x.mes === hoje.getMonth();
      const futuro = new Date(x.ano, x.mes, 1) > hoje;
      return { rot: MESES[x.mes].slice(0, 3), val: x.n, cls: atual ? 'atual' : futuro ? 'futuro' : '', rotulo: atual, dica: pl(x.n, 'perícia', 'perícias'), dicaR: MESES[x.mes] + ' de ' + x.ano + (futuro ? ' (agendadas)' : atual ? ' (mês atual)' : '') };
    }), { titulo: 'Perícias por mês', altura: 160 }) + '</section>';

  // por tipo
  const tl = contarTop(lista, i => i.m['TIPO'] || 'Sem tipo', 6, 'Outros tipos').map(x => ({ rot: x.k, val: x.n, dica: pl(x.n, 'processo', 'processos'), attrs: x.outros ? '' : 'data-acao="filtrar" data-tipo="' + esc(x.k) + '"' }));
  h += '<section class="cartao c5"><h2>Processos ativos por tipo</h2>' + barras(tl) + '</section>';

  // por comarca
  const cl = contarTop(lista, i => /NUCLEO/.test(chave(i.m['CIDADE'])) ? 'Núcleo 4.0 (acidentário)' : i.m['CIDADE'], 7, 'Outras comarcas').map(x => ({ rot: x.k, val: x.n, dica: pl(x.n, 'processo', 'processos') }));
  h += '<section class="cartao c6"><h2>Processos ativos por comarca</h2>' + barras(cl) + '</section>';

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
    const original = {};
    (state.dados[aba] ? state.dados[aba].cabecalho : []).forEach((h, i) => { original[h] = it.v[i] == null ? '' : String(it.v[i]); });
    toast('Movido para ' + TITULO_ABA[para], { acao: { rot: 'Desfazer', fn: () => desfazerMover(para, j.linha, it.m['PROCESSO'], aba, original) } });
    await recarregar(true);
  } catch (e) { toast(e.message, { erro: true }); }
}
async function desfazerMover(de, linha, proc, para, original) {
  try {
    const j = await api('mover', { de: de, para: para, linha: linha, processoEsperado: proc, extra: original });
    if (!j.ok) throw new Error(j.erro === 'CONFLITO' ? 'O processo já foi alterado. Abra o Arquivo para trazê-lo de volta.' : (j.erro || 'Erro ao desfazer'));
    toast('Desfeito: o processo voltou para ' + TITULO_ABA[para]);
    await recarregar(true);
    if (j.linha) abrirFicha(para, j.linha);
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

function htmlConfirma(c) {
  return '<div class="confirma' + (c.perigo ? ' perigo' : '') + '" id="confirma"><b>' + esc(c.titulo) + '</b><ul>' + c.linhas.map(l => '<li>' + l + '</li>').join('') + '</ul>' +
    '<div class="acoes"><button type="button" class="btn ' + (c.perigo ? 'perigo-forte' : 'primario') + '" data-acao="confirmar">' + esc(c.botao || 'Confirmar') + '</button><button type="button" class="btn" data-acao="cancelar-confirma">Cancelar</button></div></div>';
}
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
    (chave(m['SISTEMA']) === 'ESAJ' && linkEsaj(proc) ? '<a class="btn pequeno" target="_blank" rel="noopener" href="' + esc(linkEsaj(proc)) + '">' + ic('externo') + 'e-SAJ</a>' : '') +
    (chave(m['SISTEMA']) === 'EPROC' && linkEproc(proc, m) ? '<a class="btn pequeno" target="_blank" rel="noopener" data-acao="abrir-eproc" data-txt="' + esc(formatarCNJ(proc)) + '" href="' + esc(linkEproc(proc, m)) + '" title="Abre o eproc e copia o número para colar na busca">' + ic('externo') + 'eproc</a>' + (document.documentElement.hasAttribute('data-eproc-atalho') ? '' : '<button type="button" class="btn pequeno so-desk" data-acao="ajuda-eproc" title="Como abrir o processo direto no eproc">Abrir direto?</button>') : '') + '</div>' +
    '<div class="chips">' + [m['SISTEMA'], [m['CIDADE'], m['FORUM']].filter(Boolean).join(' · '), m['TIPO']].filter(Boolean).map(x => '<span class="chip">' + esc(x) + '</span>').join('') +
    (m['HONORARIOS'] ? '<span class="chip dinheiro">' + esc(m['HONORARIOS']) + (valor && /UFESP/i.test(m['HONORARIOS']) ? ' ≈ ' + fmtBRL(valor) : '') + '</span>' : '') + chipPago(m) + '</div></header>';

  h += '<div class="ficha-corpo">';
  if (f.aba === 'PERICIAS') {
    const pos = posTrilha(m);
    h += '<div class="trilha" aria-label="Etapa do processo">' + TRILHA.map((t, i) => '<div class="passo' + (i < pos ? ' feito' : i === pos ? ' atual' : '') + '"><i></i><span>' + t + '</span></div>').join('') + '</div>';
    h += '<div class="prox"><span class="ponto ' + (c.quem || 'ok') + '" style="width:12px;height:12px"></span><div class="meio"><small>Próxima ação' + (c.quem ? ' · ' + QUEM_ROT[c.quem] : '') + '</small><b>' + esc(c.acao || 'Nenhuma pendência') + '</b>' +
      (m['OBSERVACAO'] ? '<div style="font-size:.85rem;color:var(--texto2);margin-top:2px">' + esc(m['OBSERVACAO']) + '</div>' : '') + '</div>' + chipPrazo(m) + '</div>';
    if (c.quem === 'acompanhar') {
      const sc = situacaoConferencia([it], state.verificados, CONFERIR_DIAS, CONFERIR_LIMITE), x = sc.pendentes[0] || sc.recentes[0];
      h += '<div class="conf-ficha ' + x.nivel + '"><span>🔎 ' + esc(x.v ? 'Última conferência nos autos: ' + txtConferencia(x.v) + ' (' + prazoConferencia(x, CONFERIR_DIAS, CONFERIR_LIMITE) + ')' : 'Ainda não conferido nos autos pelo app') + '</span>' +
        '<button type="button" class="btn pequeno" data-acao="ficha-verificado" data-proc="' + esc(proc) + '" title="Conferi nos autos e não mudou nada">✓ Sem novidade</button></div>';
    }
    if (semReserva(m)) h += '<div class="alerta-box vermelho" style="cursor:default"><span>⚠️</span><span>Honorários ainda não reservados: não agendar nem realizar a perícia antes do depósito.</span></div>';
    if (etapaDe(m) === 'AGENDAMENTO') {
      const sl = slotDe(it);
      if (sl) h += '<div class="ag-ficha reservado"><div class="meio"><b>📅 Horário reservado: ' + esc(fmtExtenso(parseData(sl.data))) + ' às ' + esc(sl.hora) + '</b><small>' + esc([sl.local, 'status ' + (sl.status || 'sem status') + ' na aba AGENDAMENTOS'].filter(Boolean).join(' · ')) + '. Gere a petição de agendamento, protocole e depois toque em "Agendamento peticionado".</small></div>' +
        '<button type="button" class="btn pequeno" data-acao="doc-gerar">' + ic('documentos') + 'Gerar petição</button></div>';
      else {
        const lv = livresFuturos(state.livres).slice(0, 4);
        h += '<div class="ag-ficha"><div class="meio"><b>📅 Ainda sem horário na agenda</b><small>' + (lv.length ? 'Próximos horários livres (toque para reservar):' : 'Nenhum horário livre cadastrado. Cadastre em Agenda > Horários livres ou use "Agendar perícia".') + '</small>' +
          (lv.length ? '<div class="chips-linha" style="margin-top:6px">' + lv.map(x => '<button type="button" class="filtro-chip" data-acao="ficha-agendar" data-livre="' + x.linha + '">' + esc(txtSlot(x)) + '</button>').join('') + '</div>' : '') + '</div></div>';
      }
    }
  }

  h += '<div class="subabas" role="tablist">' + [['acoes', 'Ações'], ['dados', 'Dados'], ['hist', 'Histórico']].map(([k, r]) => '<button type="button" role="tab" data-acao="ficha-aba" data-k="' + k + '" class="' + (f.aba2 === k ? 'ativa' : '') + '" aria-selected="' + (f.aba2 === k) + '">' + r + '</button>').join('') + '</div>';

  if (f.aba2 === 'acoes') {
    if (f.aba === 'PERICIAS') {
      const acs = acoesDe(it);
      h += acs.length ? '<div class="acoes">' + acs.map(a => '<button type="button" class="btn' + (a.destaque ? ' primario' : '') + '" data-acao="rapida" data-id="' + a.id + '">' + esc(a.rot) + '</button>').join('') + '</div>' : '';
      h += '<div class="sug-doc" id="sug-doc"></div>';
      h += '<div class="campo" style="margin-top:14px;max-width:320px"><label for="f-etapa-mudar">Mudar etapa (próximo passo)</label><select id="f-etapa-mudar"><option value="">Escolha...</option>' + ETAPAS.map(e => '<option value="' + e.k + '"' + (etapaDe(m) === e.k ? ' disabled' : '') + '>' + e.rot + '</option>').join('') + '</select></div>';
    } else {
      h += '<p class="vazio">Processo em ' + TITULO_ABA[f.aba] + '.</p><div class="acoes"><button type="button" class="btn primario" data-acao="mover" data-para="PERICIAS">Voltar para Perícias</button></div>';
    }
    if (f.confirma && f.confirma.local !== 'encerrar') h += htmlConfirma(f.confirma);
    h += '<section class="docs" id="docs-bloco"></section>';
    if (f.aba === 'PERICIAS') {
      const aberto = f.confirma && f.confirma.local === 'encerrar';
      h += '<details class="encerrar" id="encerrar"' + (aberto ? ' open' : '') + '><summary>Encerrar este processo</summary>' +
        '<p>Use só quando o processo terminou (vai para <b>Concluídos</b>) ou quando você renunciou à nomeação (vai para <b>Renúncias</b>). Ele sai das Tarefas, do Painel e da Agenda, mas continua no Arquivo e pode voltar.</p>' +
        '<div class="acoes"><button type="button" class="btn" data-acao="mover" data-para="CONCLUSOS">Mover para Concluídos</button><button type="button" class="btn perigo" data-acao="mover" data-para="RENUNCIAS">Registrar renúncia</button></div>' +
        (aberto ? htmlConfirma(f.confirma) : '') + '</details>';
    }
  } else if (f.aba2 === 'dados') {
    h += '<div class="form-grid" id="ficha-form">' + camposForm(f.aba, it) + '</div>';
  } else {
    if (!f.hist) h += '<p class="vazio">Carregando histórico...</p>';
    else if (!f.hist.length) h += '<p class="vazio">Nenhuma alteração registrada pelo app ainda. As próximas mudanças (etapa, pagamento, agenda, Discord) aparecem aqui com data e autor.</p>';
    else h += '<ul class="hist">' + f.hist.map(x => '<li><time>' + esc(x.data + ' · ' + x.usuario) + '</time><b>' + esc(x.acao) + '</b>' + (x.detalhe ? '<p>' + esc(x.detalhe) + '</p>' : '') + '</li>').join('') + '</ul>';
  }
  h += '</div>';

  // rodapé: na aba Dados só Salvar e Descartar; nas outras, Discord e Tarefa (encerrar fica no fim das Ações)
  if (f.aba2 === 'dados') h += '<footer class="ficha-rodape"><button type="button" class="btn primario" data-acao="salvar-dados">Salvar alterações</button><button type="button" class="btn" data-acao="dados-descartar">Descartar</button></footer>';
  else h += '<footer class="ficha-rodape"><button type="button" class="btn discord" data-acao="ficha-discord">' + ic('discord') + 'Discord</button><button type="button" class="btn" data-acao="ficha-tarefa">' + ic('tarefas') + 'Tarefa</button></footer>';
  $('#ficha').innerHTML = h;

  const sel = $('#f-etapa-mudar');
  if (sel) sel.addEventListener('change', () => {
    const et = ETAPAS.find(x => x.k === sel.value);
    if (et) pedirConfirmacao(it, 'Mudar etapa para ' + et.rot, { 'PROXIMO PASSO': et.val }, 'Etapa: ' + et.rot);
  });
  if (f.aba2 === 'dados') ligarForm($('#ficha-form'), f.aba, it);
  if (f.aba2 === 'hist' && !f.hist) carregarHistorico(proc);
  if (f.aba2 === 'acoes') { renderSugDoc(it); renderDocsBloco(it); }
}

// faixa "Documento para esta etapa" logo abaixo dos botões do fluxo
function renderSugDoc(it) {
  const el = $('#sug-doc');
  if (!el) return;
  if (!state.modelos) {
    el.innerHTML = '';
    garantirModelos(true).then(ok => { const a = fichaItem(); if (ok && a && chaveDocs(a) === chaveDocs(it)) renderSugDoc(a); });
    return;
  }
  const sug = sugerirModelos(state.modelos, it.m).slice(0, 3);
  if (!sug.length) { el.innerHTML = ''; return; }
  el.innerHTML = '<span class="rot">📄 Documento para esta etapa</span><div class="sug-botoes">' +
    sug.map(md => '<button type="button" class="btn pequeno" data-acao="ficha-sug" data-id="' + esc(md.id) + '" title="' + esc((md.cfg && md.cfg.desc) || 'Gerar na pasta do periciado') + '">' + ic('documentos') + esc(nomeModeloCurto(md.nome)) + '</button>').join('') +
    '<button type="button" class="link" data-acao="doc-gerar">outros modelos</button></div>';
}
function nomeModeloCurto(n) { return String(n || '').replace(/^MODELO\s+(DE\s+)?/i, '').trim() || n; }

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
  modelosFalhouEm = 0;
  if (!(await garantirModelos(true))) { $('#modal-corpo').innerHTML = '<p class="vazio">Não consegui ler a pasta de modelos. Confira se o backend novo foi publicado e se o Drive foi autorizado.</p>'; return; }
  renderGerador(it, '');
}

function renderGerador(it, q) {
  const d = state.docs[chaveDocs(it)] || {};
  const sug = sugerirModelos(state.modelos, it.m);
  const qq = chave(q);
  const vis = modelosVisiveis(state.modelos);
  const todos = vis.filter(md => !qq || chave(md.nome).indexOf(qq) >= 0);
  const item = md => '<button type="button" class="arq" data-acao="modelo-gerar" data-id="' + esc(md.id) + '"><span class="tipo-arq doc">DOCS</span><span class="meio"><b>' + esc(md.nome) + '</b>' + (md.cfg && md.cfg.desc ? '<small>' + esc(md.cfg.desc) + '</small>' : '') + '</span></button>';
  let h = '<p class="dica-gerador">Escolha o modelo. O app faz uma cópia na pasta <b>' + esc(d.pasta ? d.pasta.caminho : 'do periciado') + '</b> e preenche número do processo, partes, juízo, data de hoje e o agendamento. O que ele não sabe (valores, número de evento, folhas, trechos entre [[ ]]) fica marcado em amarelo.</p>';
  if (sug.length && !qq) h += '<h3 class="sub">Sugeridos para a etapa ' + esc(rotEtapa(etapaDe(it.m))) + '</h3><div class="arquivos">' + sug.map(item).join('') + '</div>';
  h += '<h3 class="sub">Todos os modelos (' + vis.length + ')</h3><input type="search" id="modelo-q" class="busca-modelo" placeholder="Buscar modelo..." value="' + esc(q) + '" autocomplete="off">' +
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
    const j = await api('gerarDoc', { aba: it.aba, linha: it.linha, processoEsperado: it.m['PROCESSO'], modeloId: id, criarPasta: true });
    if (!j.ok) throw new Error(erroApi(j, 'Erro ao gerar o documento'));
    state.ultimoDoc = { id: j.doc.id, nome: j.doc.nome, url: j.doc.url, mime: 'application/vnd.google-apps.document' };
    $('#modal-corpo').innerHTML = '<div class="gerado"><span class="tipo-arq doc">DOCS</span><div><b>' + esc(j.doc.nome) + '</b><small>Salvo na pasta do periciado</small></div></div>' +
      (j.conferir && j.conferir.length ? '<div class="alerta-box" style="cursor:default"><span>🖍️</span><span>Confira antes de protocolar: <b>' + esc(j.conferir.join(', ')) + '</b>. Esses trechos estão marcados em amarelo no documento; tire o realce depois de conferir.</span></div>'
        : '<p class="vazio">Preenchido. Revise no Docs e baixe em PDF.</p>');
    $('#modal-rodape').innerHTML = '<a class="btn primario" href="' + esc(j.doc.url) + '" target="_blank" rel="noopener">' + ic('externo') + 'Abrir no Docs</a><a class="btn" href="' + esc(linkPdf(j.doc.id)) + '" target="_blank" rel="noopener">PDF</a><button type="button" class="btn" data-acao="doc-ver-ultimo">Visualizar aqui</button><span class="esp"></span><button type="button" class="btn pequeno" data-acao="doc-gerar">Gerar outro</button>';
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

function avisarAgendaDiscord(sl, it) {
  const d = parseData(sl.data);
  api('discordEnviar', { canal: 'AGENDA', titulo: '📅 Perícia agendada', texto: 'Data: ' + fmtExtenso(d) + ' (' + sl.data + ') às ' + sl.hora + '\nPericiando: ' + nomeCurto(sl.nome) + '\nTipo: ' + (sl.tipo || '') + '\nLocal: ' + (sl.local || ''), processo: it ? it.m['PROCESSO'] : '' })
    .then(r => { if (!r.ok) toast('Agendado, mas o Discord recusou: ' + (r.erro || ''), { erro: true }); })
    .catch(e => toast('Agendado, mas não consegui avisar o Discord: ' + e.message, { erro: true }));
}
function pedirConfirmacaoAgenda(it) {
  const sl = slotDe(it);
  if (!sl) { toast('Não achei o horário reservado na agenda. Atualize a tela.', { erro: true }); return; }
  const temAgenda = state.canais.some(c => c.k === 'AGENDA');
  state.ficha.aba2 = 'acoes';
  state.ficha.confirma = { titulo: 'Agendamento peticionado', linhas: [
    'Na aba AGENDAMENTOS, o horário de <b>' + esc(txtSlot(sl)) + '</b> passa de ' + esc(sl.status || 'sem status') + ' para <b>OK</b>.',
    'O processo passa para a etapa <b>PERÍCIA</b>, com a data ' + esc(sl.data) + '.'
  ].concat(temAgenda ? ['<label class="check"><input type="checkbox" id="cf-discord" checked> Avisar no #agenda do Discord</label>'] : []),
    fn: () => confirmarAgendamento(it, sl, !!($('#cf-discord') && $('#cf-discord').checked)) };
  renderFicha();
}
async function confirmarAgendamento(it, sl, avisar) {
  const dp = {}, hP = cabDe('PERICIAS', 'PERICIA'), hPasso = cabDe('PERICIAS', 'PROXIMO PASSO');
  if (hP) dp[hP] = sl.data;
  if (hPasso) dp[hPasso] = 'PERICIA';
  try {
    const j = await api('agendaConfirmar', { linhaSlot: sl.linha, nomeEsperado: sl.nome, aba: 'PERICIAS', linha: it.linha, processoEsperado: it.m['PROCESSO'], dadosProcesso: dp });
    if (!j.ok) throw new Error(erroApi(j, 'Erro ao confirmar o agendamento'));
    toast('Agendamento confirmado: ' + txtSlot(sl));
    if (avisar) avisarAgendaDiscord(sl, it);
    await recarregar(true);
    if (state.ficha) renderFicha();
    return true;
  } catch (e) { toast(e.message, { erro: true }); if (state.ficha) renderFicha(); return false; }
}

function acaoRapida(id) {
  const it = acharItem(state.ficha.aba, state.ficha.linha);
  const a = acoesDe(it).find(x => x.id === id);
  if (!a) return;
  if (a.especial === 'agendar') { abrirSlot(null, '', { vincular: it }); return; }
  if (a.especial === 'confirmar-ag') { pedirConfirmacaoAgenda(it); return; }
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

function abrirAjudaEproc() {
  const inst = document.documentElement.hasAttribute('data-eproc-atalho');
  $('#modal-titulo').textContent = 'Abrir o processo direto no eproc';
  $('#modal-corpo').innerHTML = (inst ? '<p class="ok-msg">✓ O atalho já está instalado neste navegador. O botão eproc abre direto o processo.</p>' : '') +
    '<p>O eproc não aceita link direto para um processo. Com um pequeno atalho instalado no Chrome do computador, o botão <b>eproc</b> da ficha abre o eproc já na página do processo (se você estiver logado; se não, abre depois do login).</p>' +
    '<ol class="passos-ag">' +
    '<li>Instale a extensão <b>Tampermonkey</b> no Chrome: <a href="https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo" target="_blank" rel="noopener">abrir na Chrome Web Store</a>.</li>' +
    '<li>Em <b>chrome://extensions</b>, abra <b>Detalhes</b> do Tampermonkey e ligue <b>Permitir scripts de usuário</b> (e o <b>Modo do desenvolvedor</b>, se o Chrome pedir).</li>' +
    '<li>Toque em <a href="eproc-atalho.user.js" target="_blank" rel="noopener"><b>Instalar o atalho do eproc</b></a> e confirme em <b>Instalar</b> (ou <b>Atualizar</b>, se já tiver uma versão anterior) na tela do Tampermonkey.</li>' +
    '<li>Atualize esta página. Pronto: o botão eproc passa a abrir o processo direto.</li></ol>' +
    '<p class="dica">Vale para cada computador e navegador onde o app é usado. No celular o Chrome não aceita extensões: lá o botão abre o eproc e copia o número para colar na busca.</p>';
  $('#modal-rodape').innerHTML = '<button type="button" class="btn" id="aj-eproc-ok">Fechar</button>';
  $('#aj-eproc-ok').onclick = () => modal.close();
  if (!modal.open) modal.showModal();
}

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
      const m = linhaMapa(Object.keys(dados), Object.keys(dados).map(k => dados[k]));
      const pastaPronta = criarPasta
        ? api('pastaCriar', { aba: 'PERICIAS', linha: j.linha, processoEsperado: dados[hProc], nome: periciadoDe(m) }).catch(e => ({ ok: false, erro: e.message }))
        : Promise.resolve(null);
      toast('Processo cadastrado');
      const recarga = recarregar(true);
      mostrarCadastrado(j.linha, dados[hProc], m, pastaPronta, recarga, criarPasta);
    } catch (e) { toast(e.message, { erro: true }); btn.disabled = false; }
  };
  modal.showModal();
}

// depois do cadastro: pasta, documentos sugeridos para a etapa e atalhos
async function mostrarCadastrado(linha, proc, m, pastaPronta, recarga, criando) {
  $('#modal-titulo').textContent = 'Processo cadastrado';
  $('#modal-corpo').innerHTML = '<div class="gerado"><span class="tipo-arq img">OK</span><div><b>' + esc(m['REQUERENTE'] || formatarCNJ(proc)) + '</b><small>' + esc(formatarCNJ(proc) + ' · entrou em Perícias na etapa ' + rotEtapa(etapaDe(m))) + '</small></div></div>' +
    '<p class="status-pasta" id="cad-pasta">' + ic('arquivo') + '<span>' + (criando ? 'Criando a pasta no Drive...' : '') + '</span></p>' +
    '<div id="cad-docs"><p class="vazio">Procurando modelos para esta etapa...</p></div>';
  $('#modal-rodape').innerHTML = '<button type="button" class="btn primario" id="cad-abrir">Abrir o processo</button><button type="button" class="btn" id="cad-tarefa">' + ic('tarefas') + 'Criar tarefa</button><span class="esp"></span><button type="button" class="btn" id="cad-fechar">Fechar</button>';
  $('#cad-abrir').onclick = async () => {
    modal.close();
    await recarga;
    const alvo = itens('PERICIAS').find(i => digitos(i.m['PROCESSO']) === digitos(proc)) || acharItem('PERICIAS', linha);
    if (alvo) abrirFicha('PERICIAS', alvo.linha);
    else toast('Processo cadastrado. Toque em atualizar para vê-lo na lista.');
  };
  $('#cad-tarefa').onclick = () => abrirNovaTarefa(proc);
  $('#cad-fechar').onclick = () => modal.close();
  pastaPronta.then(r => {
    const el = $('#cad-pasta span');
    if (!el) return;
    if (!r) el.textContent = 'Pasta não criada agora. Dá para criar pela ficha do processo, ou ela é criada ao gerar o primeiro documento.';
    else if (r.ok && r.pasta) el.innerHTML = 'Pasta no Drive: <b>' + esc(r.pasta.caminho) + '</b>';
    else el.textContent = 'A pasta não foi criada: ' + erroApi(r, 'erro no Drive') + '. Tente pela ficha do processo.';
  });
  painelDocsSugeridos($('#cad-docs'), { linha: linha, proc: proc, m: m }, 'Documentos sugeridos para começar', pastaPronta);
}

// lista de modelos sugeridos com botão Gerar (usado depois do cadastro e depois de reservar um horário)
async function painelDocsSugeridos(box, ref, titulo, antes) {
  if (!box) return;
  box.innerHTML = '<p class="vazio">Procurando modelos para esta etapa...</p>';
  const ok = await garantirModelos(true);
  if (!box.isConnected) return;
  const sug = ok ? sugerirModelos(state.modelos, ref.m) : [];
  if (!sug.length) {
    box.innerHTML = ok ? '<p class="vazio">Nenhum modelo configurado para a etapa ' + esc(rotEtapa(etapaDe(ref.m))) + '. Dá para definir isso em Documentos > Modelos.</p>' : '';
    return;
  }
  box.innerHTML = '<h3 class="sub">' + esc(titulo) + '</h3><div class="arquivos">' + sug.map(md =>
    '<div class="arq" style="cursor:default"><span class="tipo-arq doc">DOCS</span><span class="meio"><b class="quebra">' + esc(nomeModeloCurto(md.nome)) + '</b><small data-cad-info>' + esc((md.cfg && md.cfg.desc) || 'Gera na pasta do periciado, já preenchido') + '</small></span>' +
    '<span class="acoes-md"><button type="button" class="btn pequeno primario" data-cad-gerar="' + esc(md.id) + '">Gerar</button></span></div>').join('') + '</div>';
  box.querySelectorAll('[data-cad-gerar]').forEach(b => { b.onclick = async () => {
    const linhaEl = b.closest('.arq'), alvo = b.parentNode;
    b.disabled = true; b.textContent = 'Gerando...';
    try {
      if (antes) await antes;
      const r = await api('gerarDoc', { aba: 'PERICIAS', linha: ref.linha, processoEsperado: ref.proc, modeloId: b.dataset.cadGerar, criarPasta: true });
      if (!r.ok) throw new Error(erroApi(r, 'Erro ao gerar'));
      delete state.docs[digitos(ref.proc)];
      linhaEl.querySelector('[data-cad-info]').textContent = r.conferir && r.conferir.length ? 'Gerado. Conferir: ' + r.conferir.join(', ') : 'Gerado e preenchido';
      alvo.innerHTML = '<a class="btn pequeno primario" href="' + esc(r.doc.url) + '" target="_blank" rel="noopener">Abrir</a><a class="btn pequeno" href="' + esc(linkPdf(r.doc.id)) + '" target="_blank" rel="noopener">PDF</a>';
    } catch (e) { b.disabled = false; b.textContent = 'Tentar de novo'; toast(e.message, { erro: true }); }
  }; });
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
  const livresDia = state.livres.filter(x => x.data === fmtData(sel)).sort((a, b) => hn(a.hora).localeCompare(hn(b.hora)));
  if (livresDia.length) h += '<p class="livres-cal"><b>Horários livres:</b> ' + livresDia.map(x => '<button type="button" class="hora-chip sel" data-acao="livre-usar" data-linha="' + x.linha + '">' + esc(x.hora) + '</button>').join(' ') + '</p>';
  h += '<div class="acoes" style="margin-top:12px"><button type="button" class="btn pequeno" data-acao="novo-livres" data-dia="' + fmtData(sel) + '">+ Horários livres</button><button type="button" class="btn pequeno" data-acao="novo-slot-dia" data-dia="' + fmtData(sel) + '">+ Horário neste dia</button></div></section></div>';
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
  const livres = livresFuturos(state.livres);
  const fila = ativos().filter(it => etapaDe(it.m) === 'AGENDAMENTO');
  let h = '<div class="ferramentas"><button type="button" class="btn ouro" data-acao="novo-livres">+ Horários livres</button><button type="button" class="btn" data-acao="novo-slot">+ Horário com periciado</button>' +
    '<button type="button" class="btn" data-acao="passadas">' + (state.verPassadas ? 'Ocultar' : 'Ver') + ' passadas (' + passados.length + ')</button>' +
    '<span class="contagem" style="margin:0 0 0 auto">' + livres.length + ' horário(s) livre(s) daqui para frente</span></div>';
  h += '<div class="grid alto-livre"><div class="c8">';
  h += futuros.length || livres.length ? diasAgenda(futuros, false, livres) : '<p class="vazio">Nenhuma perícia nem horário livre daqui para frente. Use "+ Horários livres" para abrir a agenda.</p>';
  if (state.verPassadas && passados.length) h += '<h2 class="secao" style="font-size:1rem;margin:20px 0 10px">Passadas</h2>' + diasAgenda(passados, true, []);
  h += '</div><section class="cartao c4"><h2>Fila para agendar (' + fila.length + ')</h2><p class="dica">Processos com próximo passo AGENDAMENTO</p>';
  h += fila.length ? '<div class="lista-linhas">' + fila.map(it => {
    const sl = slotDe(it);
    if (sl) return '<button type="button" class="linha-item" data-acao="ficha" data-aba="PERICIAS" data-linha="' + it.linha + '"><span class="ponto alerta"></span><span class="meio"><b>' + esc(periciadoDe(it.m)) + '</b><small>' + esc('Reservado ' + txtSlot(sl) + ' · falta peticionar') + '</small></span><span class="chip alerta">peticionar</span></button>';
    return '<button type="button" class="linha-item" data-acao="agendar-proc" data-linha="' + it.linha + '"><span class="ponto ' + (semReserva(it.m) ? 'critico' : 'ok') + '"></span><span class="meio"><b>' + esc(periciadoDe(it.m)) + '</b><small>' + esc(formatarCNJ(it.m['PROCESSO']) + ' · ' + (it.m['CIDADE'] || '')) + '</small></span>' + (semReserva(it.m) ? '<span class="chip critico">sem reserva</span>' : '<span class="chip ok">agendar</span>') + '</button>';
  }).join('') + '</div>' : '<p class="vazio">Ninguém aguardando agendamento.</p>';
  h += '</section></div>';
  $('#conteudo').innerHTML = h;
}
function livreLinha(a) {
  return '<div class="linha-item livre"><span class="hora">' + esc(a.hora) + '</span><span class="meio"><b>Horário livre</b><small>' + esc([a.tipo, a.local].filter(Boolean).join(' · ') || 'status AGENDAR, sem periciado') + '</small></span>' +
    '<button type="button" class="btn pequeno primario" data-acao="livre-usar" data-linha="' + a.linha + '">Agendar</button>' +
    '<button type="button" class="btn pequeno icone" data-acao="livre-remover" data-linha="' + a.linha + '" title="Apagar horário livre" aria-label="Apagar horário livre">' + ic('fechar') + '</button></div>';
}
function diasAgenda(lista, desc, livres) {
  const g = {}, gl = {};
  lista.forEach(a => { (g[a.data] = g[a.data] || []).push(a); });
  (livres || []).forEach(a => { (gl[a.data] = gl[a.data] || []).push(a); });
  const dias = Array.from(new Set(Object.keys(g).concat(Object.keys(gl)))).sort((x, y) => parseData(x) - parseData(y));
  if (desc) dias.reverse();
  return dias.map(dia => {
    const d = parseData(dia), n = diasAte(d);
    const linhas = (g[dia] || []).map(a => ({ a: a, livre: false })).concat((gl[dia] || []).map(a => ({ a: a, livre: true })))
      .sort((x, y) => hn(x.a.hora).localeCompare(hn(y.a.hora)));
    const nM = (g[dia] || []).length, nL = (gl[dia] || []).length;
    return '<div class="dia' + (n === 0 ? ' hoje' : '') + '"><h3><span>' + esc(fmtExtenso(d)) + ' · ' + nM + ' marcado' + (nM === 1 ? '' : 's') + (nL ? ' · ' + nL + ' livre' + (nL === 1 ? '' : 's') : '') + (n > 0 ? ' · ' + txtDias(n) : '') + '</span>' +
      '<span class="acoes-dia"><button type="button" class="btn pequeno" data-acao="novo-livres" data-dia="' + esc(dia) + '">+ livres</button><button type="button" class="btn pequeno" data-acao="novo-slot-dia" data-dia="' + esc(dia) + '">+ horário</button></span></h3>' +
      linhas.map(x => x.livre ? livreLinha(x.a) : slotLinha(x.a)).join('') + '</div>';
  }).join('');
}

function abrirSlot(a, diaPadrao, op) {
  op = op || {};
  modal.classList.remove('grande');
  const vinc = op.vincular;
  const novo = !a;
  const lista = state.agenda;
  const livres = livresFuturos(state.livres);
  let selLivre = op.livre || null;
  let dia = novo ? (selLivre ? selLivre.data : (diaPadrao || '')) : a.data;
  const tipoVinc = vinc ? tipoAgendaDe(vinc.m) : '';
  if (novo && !dia) {
    // primeiro horário livre; senão o próximo dia que já tem perícias do mesmo tipo (ex.: mutirão do INSS); senão o próximo dia com agenda
    const futuros = lista.filter(x => parseData(x.data) && diasAte(parseData(x.data)) >= 0).sort((x, y) => parseData(x.data) - parseData(y.data));
    const prox = (tipoVinc && futuros.find(x => chave(x.tipo) === chave(tipoVinc))) || futuros[0];
    dia = livres.length ? livres[0].data : prox ? prox.data : fmtData(zeroHoje());
  }
  const doDia = lista.filter(x => x.data === dia).sort((x, y) => x.hora.localeCompare(y.hora));
  const ult = doDia[doDia.length - 1];
  const base = novo ? {
    hora: selLivre ? selLivre.hora : ult ? somaMinutos(ult.hora, 15) : '08:00',
    nome: vinc ? periciadoDe(vinc.m) : '',
    tipo: vinc ? tipoVinc : (selLivre && selLivre.tipo) || (ult ? ult.tipo : 'INSS'),
    status: vinc ? 'AGENDAR' : 'OK',
    local: (selLivre && selLivre.local) || 'CONSULTORIO'
  } : a;
  const ligado = vinc || (a && processoDoSlot(a));
  const fila = ativos().filter(it => etapaDe(it.m) === 'AGENDAMENTO');
  const nomes = Array.from(new Set(fila.map(it => periciadoDe(it.m)).concat(vinc ? [vinc.m['REQUERENTE'], vinc.m['REQUERIDA']] : []).filter(Boolean)));
  const temAgenda = state.canais.some(c => c.k === 'AGENDA');

  const chipsLivres = () => {
    const ls = livres.slice(0, 30);
    if (!ls.length) return '<p class="dica-gerador" style="margin:0 0 12px">Nenhum horário livre cadastrado. Marque abaixo um horário novo ou cadastre horários livres em Agenda.</p>';
    const g = {};
    ls.forEach(x => { (g[x.data] = g[x.data] || []).push(x); });
    return '<h3 class="sub" style="margin-top:0">Horários livres</h3><div class="livres-escolha">' + Object.keys(g).map(d => '<div class="livres-dia"><span>' + esc(DIAS_SEM[parseData(d).getDay()] + ' ' + fmtCurto(parseData(d))) + '</span>' +
      g[d].map(x => '<button type="button" class="hora-chip' + (selLivre && selLivre.linha === x.linha ? ' sel' : '') + '" data-livre-sel="' + x.linha + '" title="' + esc([x.tipo, x.local].filter(Boolean).join(' · ')) + '">' + esc(x.hora) + '</button>').join('') + '</div>').join('') + '</div>';
  };

  $('#modal-titulo').textContent = vinc ? 'Agendar perícia' : novo ? 'Novo horário' : 'Horário de ' + a.nome;
  $('#modal-corpo').innerHTML =
    (vinc ? '<p style="margin:0 0 12px;font-size:.88rem;color:var(--texto2)">Processo <b>' + esc(formatarCNJ(vinc.m['PROCESSO'])) + '</b>. Com status <b>AGENDAR</b> o horário fica reservado e o processo continua em AGENDAMENTO até a petição ser protocolada. Com <b>OK</b> o processo já passa para PERÍCIA.</p>' : '') +
    (vinc && semReserva(vinc.m) ? '<div class="alerta-box vermelho" style="cursor:default"><span>⚠️</span><span>Honorários ainda não reservados neste processo.</span></div>' : '') +
    (novo ? '<div id="ag-livres">' + chipsLivres() + '</div>' : '') +
    '<div class="form-grid">' +
    '<div class="campo"><label for="ag-data">Data</label>' + (novo ? '<input id="ag-data" type="date" value="' + brParaIso(dia) + '">' : '<input id="ag-data" value="' + esc(dia) + '" disabled>') + '</div>' +
    '<div class="campo"><label for="ag-hora">Hora</label><input id="ag-hora" value="' + esc(base.hora) + '" placeholder="08:00" inputmode="numeric"></div>' +
    '<div class="campo largo"><label for="ag-nome">Periciando</label><input id="ag-nome" value="' + esc(base.nome) + '" list="dl-ag" autocomplete="off"><datalist id="dl-ag">' + nomes.map(n => '<option value="' + esc(n) + '">').join('') + '</datalist></div>' +
    '<div class="campo"><label for="ag-tipo">Tipo</label><input id="ag-tipo" value="' + esc(base.tipo) + '" list="dl-tipo"><datalist id="dl-tipo">' + ['INSS', 'ERRO MÉDICO', 'INTERDIÇÃO', 'DANOS MORAIS', 'OUTROS'].map(o => '<option value="' + o + '">').join('') + '</datalist></div>' +
    '<div class="campo"><label for="ag-status">Status</label><select id="ag-status">' + Array.from(new Set(['AGENDAR', 'OK', String(base.status || '').toUpperCase()].filter(Boolean))).map(o => '<option' + (chave(o) === chave(base.status) ? ' selected' : '') + '>' + esc(o) + '</option>').join('') + '</select></div>' +
    '<div class="campo largo"><label for="ag-local">Local</label><input id="ag-local" value="' + esc(base.local) + '" placeholder="CONSULTORIO ou endereço completo" list="dl-local"><datalist id="dl-local"><option value="CONSULTORIO"></datalist></div>' +
    (novo && temAgenda ? '<label class="check"><input type="checkbox" id="ag-discord" checked> Avisar no #agenda do Discord (quando o agendamento estiver OK)</label>' : '') +
    '</div><p id="ag-ocupado" style="font-size:.82rem;color:var(--suave);margin:10px 0 0"></p>';
  $('#modal-rodape').innerHTML = '<button type="button" class="btn primario" id="ag-salvar">' + (vinc ? 'Reservar horário' : 'Salvar') + '</button>' +
    (ligado && !vinc ? '<button type="button" class="btn" id="ag-abrir">Abrir processo</button>' : '');
  const atualizarBotao = () => { if (vinc) $('#ag-salvar').textContent = chave($('#ag-status').value) === 'OK' ? 'Agendar (já peticionado)' : 'Reservar horário'; };
  if (vinc) { $('#ag-status').addEventListener('change', atualizarBotao); atualizarBotao(); }

  const mostrarOcupados = br => {
    const dd = lista.filter(x => x.data === br).sort((x, y) => x.hora.localeCompare(y.hora));
    const lv = livres.filter(x => x.data === br);
    $('#ag-ocupado').textContent = (dd.length ? 'Já marcados neste dia: ' + dd.map(x => x.hora).join(', ') : 'Nenhuma perícia marcada neste dia.') + (lv.length ? ' · Livres: ' + lv.map(x => x.hora).join(', ') : '');
  };
  mostrarOcupados(dia);
  let dataAntes = novo ? $('#ag-data').value : '';
  if (novo) $('#ag-livres').addEventListener('click', e => {
    const b = e.target.closest('[data-livre-sel]');
    if (!b) return;
    const x = livres.find(l => String(l.linha) === b.dataset.livreSel);
    if (!x) return;
    selLivre = selLivre && selLivre.linha === x.linha ? null : x;
    if (selLivre) {
      $('#ag-data').value = brParaIso(x.data); dataAntes = $('#ag-data').value; $('#ag-hora').value = x.hora;
      if (x.local) $('#ag-local').value = x.local;
      if (x.tipo && !vinc) $('#ag-tipo').value = x.tipo;
      mostrarOcupados(x.data);
    }
    $('#ag-livres').innerHTML = chipsLivres();
  });
  if (novo) {
    $('#ag-data').addEventListener('change', e => {
      if (e.target.value === dataAntes) return;
      dataAntes = e.target.value;
      const br = isoParaBr(e.target.value);
      const lv = livres.filter(x => x.data === br);
      const dd = lista.filter(x => x.data === br).sort((x, y) => x.hora.localeCompare(y.hora));
      $('#ag-hora').value = lv.length ? lv[0].hora : dd.length ? somaMinutos(dd[dd.length - 1].hora, 15) : '08:00';
      selLivre = lv[0] || null;
      $('#ag-livres').innerHTML = chipsLivres();
      mostrarOcupados(br);
    });
  }
  if ($('#ag-abrir')) $('#ag-abrir').onclick = () => { modal.close(); abrirFicha('PERICIAS', ligado.linha); };

  $('#ag-salvar').onclick = async ev => {
    const btn = ev.target;
    const hora = $('#ag-hora').value.trim();
    if (!/^\d{1,2}:\d{2}$/.test(hora)) { toast('Hora no formato 08:00', { erro: true }); return; }
    const dados = { hora: pad2(+hora.split(':')[0]) + ':' + hora.split(':')[1], nome: $('#ag-nome').value.trim(), tipo: $('#ag-tipo').value.trim(), status: $('#ag-status').value.trim(), local: $('#ag-local').value.trim() };
    if (!dados.nome) { toast('Informe o periciando', { erro: true }); return; }
    let livre = null;
    if (novo) {
      dados.data = isoParaBr($('#ag-data').value);
      if (!dados.data) { toast('Escolha a data', { erro: true }); return; }
      // usa o horário livre com a mesma data e hora, se houver (em vez de criar outra linha)
      livre = livres.find(x => x.data === dados.data && hn(x.hora) === dados.hora) || null;
      if (!livre && lista.some(x => x.data === dados.data && hn(x.hora) === dados.hora) && !confirm('Já existe alguém às ' + dados.hora + ' nesse dia. Marcar mesmo assim?')) return;
    }
    const ok = chave(dados.status) === 'OK';
    const avisar = $('#ag-discord') && $('#ag-discord').checked;
    btn.disabled = true;
    try {
      let j;
      if (vinc) {
        const dp = {};
        const hP = cabDe('PERICIAS', 'PERICIA'), hPasso = cabDe('PERICIAS', 'PROXIMO PASSO');
        if (hP) dp[hP] = dados.data;
        if (hPasso && ok) dp[hPasso] = 'PERICIA';
        const req = { slot: dados, linha: vinc.linha, processoEsperado: vinc.m['PROCESSO'], dadosProcesso: dp };
        if (livre) { req.linhaLivre = livre.linha; req.horaLivre = livre.hora; }
        j = await api('agendar', req);
      } else {
        const req = { dados: dados };
        if (!novo) { req.linha = a.linha; req.nomeEsperado = a.nome; }
        else if (livre) { req.linha = livre.linha; req.nomeEsperado = ''; req.horaEsperada = livre.hora; }
        if (ligado) req.processo = ligado.m['PROCESSO'];
        j = await api('agendaSalvar', req);
      }
      if (!j.ok) throw new Error(j.erro === 'CONFLITO' ? 'A agenda foi alterada. Atualize e tente de novo.' : (j.erro || 'Erro ao salvar'));
      if (avisar && novo && ok) avisarAgendaDiscord(dados, vinc || ligado);
      if (vinc && !ok) { mostrarReservado(vinc, dados, recarregar(true), !!avisar); return; }
      modal.close();
      if (vinc) fecharFicha();
      toast(vinc ? 'Perícia agendada' : 'Agenda atualizada');
      await recarregar(true);
    } catch (e) { toast(e.message, { erro: true }); btn.disabled = false; }
  };
  if (!modal.open) modal.showModal();
}

// depois de reservar: gerar a petição de agendamento e confirmar quando protocolar
function mostrarReservado(vinc, dados, recarga, avisar) {
  const temAgenda = state.canais.some(c => c.k === 'AGENDA');
  const m = Object.assign({}, vinc.m, { 'PERICIA': dados.data });
  $('#modal-titulo').textContent = 'Horário reservado';
  $('#modal-corpo').innerHTML = '<div class="gerado"><span class="tipo-arq img">📅</span><div><b>' + esc(fmtExtenso(parseData(dados.data)) + ' às ' + dados.hora) + '</b><small>' + esc(dados.nome + ' · ' + (dados.local || '') + ' · status AGENDAR na aba AGENDAMENTOS') + '</small></div></div>' +
    '<ol class="passos-ag"><li>Gere a petição de agendamento abaixo e confira os trechos em amarelo.</li><li>Protocole no ' + esc(chave(vinc.m['SISTEMA']) === 'EPROC' ? 'eproc' : 'e-SAJ') + '.</li><li>Toque em <b>Já protocolei</b>: o horário passa para OK e o processo para PERÍCIA. Dá para fazer isso depois, pela ficha ou pelas Tarefas.</li></ol>' +
    '<div id="ag-docs"></div>' +
    (temAgenda ? '<label class="check" style="margin-top:12px"><input type="checkbox" id="ag-discord2"' + (avisar ? ' checked' : '') + '> Avisar no #agenda do Discord ao confirmar</label>' : '');
  $('#modal-rodape').innerHTML = '<button type="button" class="btn primario" id="ag-confirmar">Já protocolei: confirmar agendamento</button><span class="esp"></span><button type="button" class="btn" id="ag-depois">Fazer depois</button>';
  painelDocsSugeridos($('#ag-docs'), { linha: vinc.linha, proc: vinc.m['PROCESSO'], m: m }, 'Petição de agendamento', recarga);
  $('#ag-depois').onclick = () => { modal.close(); toast('Horário reservado. Falta peticionar o agendamento.'); };
  $('#ag-confirmar').onclick = async ev => {
    const btn = ev.target, av = !!($('#ag-discord2') && $('#ag-discord2').checked);
    btn.disabled = true; btn.textContent = 'Confirmando...';
    await recarga;
    const it = itens('PERICIAS').find(i => digitos(i.m['PROCESSO']) === digitos(vinc.m['PROCESSO'])) || vinc;
    const sl = slotDe(it);
    if (!sl) { toast('Não achei o horário reservado na agenda. Atualize a tela.', { erro: true }); btn.disabled = false; btn.textContent = 'Já protocolei: confirmar agendamento'; return; }
    if (await confirmarAgendamento(it, sl, av)) modal.close();
    else { btn.disabled = false; btn.textContent = 'Já protocolei: confirmar agendamento'; }
  };
}

// horários livres: cadastro em lote
function abrirLivres(diaPadrao) {
  modal.classList.remove('grande');
  const hojeIso = brParaIso(fmtData(zeroHoje()));
  let excluidas = {}, ultimo = '';
  $('#modal-titulo').textContent = 'Horários livres';
  $('#modal-corpo').innerHTML = '<p class="dica-gerador">Os horários entram na aba AGENDAMENTOS só com data, hora e status <b>AGENDAR</b>, sem periciado. Na hora de agendar, é só escolher um deles.</p>' +
    '<div class="form-grid"><div class="campo"><label for="lv-data">Data</label><input id="lv-data" type="date" min="' + hojeIso + '" value="' + (diaPadrao ? brParaIso(diaPadrao) : '') + '"></div>' +
    '<div class="campo"><label for="lv-passo">De quanto em quanto tempo</label><select id="lv-passo">' + [10, 15, 20, 30, 45, 60].map(n => '<option value="' + n + '"' + (n === 15 ? ' selected' : '') + '>' + n + ' minutos</option>').join('') + '</select></div>' +
    '<div class="campo"><label for="lv-ini">Primeiro horário</label><input id="lv-ini" value="08:00" inputmode="numeric"></div>' +
    '<div class="campo"><label for="lv-fim">Último horário</label><input id="lv-fim" value="11:45" inputmode="numeric"></div>' +
    '<div class="campo"><label for="lv-local">Local</label><input id="lv-local" value="CONSULTORIO" list="dl-local2"><datalist id="dl-local2"><option value="CONSULTORIO"></datalist></div>' +
    '<div class="campo"><label for="lv-tipo">Tipo (opcional)</label><input id="lv-tipo" placeholder="ex.: INSS" list="dl-tipo2"><datalist id="dl-tipo2">' + ['INSS', 'ERRO MÉDICO', 'INTERDIÇÃO', 'DANOS MORAIS'].map(o => '<option value="' + o + '">').join('') + '</datalist></div></div>' +
    '<h3 class="sub">Horários que serão criados <small style="text-transform:none;letter-spacing:0">(toque para tirar ou pôr de volta)</small></h3><div id="lv-previa" class="livres-dia" style="flex-wrap:wrap"></div><p id="lv-info" class="dica" style="margin:8px 0 0"></p>';
  $('#modal-rodape').innerHTML = '<button type="button" class="btn primario" id="lv-criar">Criar horários</button>';
  const horas = () => horariosIntervalo($('#lv-ini').value.trim(), $('#lv-fim').value.trim(), $('#lv-passo').value);
  const prev = () => {
    const br = isoParaBr($('#lv-data').value);
    const ocup = state.agenda.filter(x => x.data === br).map(x => hn(x.hora)), liv = state.livres.filter(x => x.data === br).map(x => hn(x.hora));
    const hs = horas();
    const n = hs.filter(h => !excluidas[h] && ocup.indexOf(h) < 0 && liv.indexOf(h) < 0).length;
    const html = hs.length ? hs.map(h => {
      const ja = ocup.indexOf(h) >= 0 ? 'marcado' : liv.indexOf(h) >= 0 ? 'já livre' : '';
      return '<button type="button" class="hora-chip' + (ja ? ' ja' : excluidas[h] ? ' fora' : ' sel') + '" data-h="' + h + '"' + (ja ? ' disabled title="' + ja + '"' : '') + '>' + h + (ja ? ' · ' + ja : '') + '</button>';
    }).join('') : '<span class="vazio">Confira o primeiro e o último horário (formato 08:00).</span>';
    if (html !== ultimo) { ultimo = html; $('#lv-previa').innerHTML = html; }
    $('#lv-info').textContent = br ? (n ? n + ' horário(s) novo(s) em ' + fmtExtenso(parseData(br)) + '.' : 'Nenhum horário novo para criar nesse dia.') : 'Escolha a data.';
    $('#lv-criar').textContent = n ? 'Criar ' + n + ' horário' + (n === 1 ? '' : 's') : 'Criar horários';
    $('#lv-criar').disabled = !br || !n;
  };
  $('#lv-previa').addEventListener('click', e => { const b = e.target.closest('[data-h]'); if (!b || b.disabled) return; excluidas[b.dataset.h] = !excluidas[b.dataset.h]; prev(); });
  ['lv-data', 'lv-ini', 'lv-fim', 'lv-passo'].forEach(id => { $('#' + id).addEventListener('input', () => { excluidas = {}; prev(); }); $('#' + id).addEventListener('change', prev); });
  prev();
  $('#lv-criar').onclick = async ev => {
    const btn = ev.target, br = isoParaBr($('#lv-data').value);
    const hs = horas().filter(h => !excluidas[h]);
    btn.disabled = true; btn.textContent = 'Criando...';
    try {
      const j = await api('agendaLivres', { data: br, horas: hs, local: $('#lv-local').value.trim(), tipo: $('#lv-tipo').value.trim() });
      if (!j.ok) throw new Error(j.erro || 'Erro ao criar os horários');
      state.agenda = j.itens || state.agenda; state.livres = j.livres || state.livres;
      modal.close();
      render();
      toast(j.criados.length + ' horário(s) livre(s) criado(s) em ' + br + (j.ignorados && j.ignorados.length ? ' · ' + j.ignorados.length + ' já existiam' : ''));
    } catch (e) { toast(e.message, { erro: true }); btn.disabled = false; prev(); }
  };
  if (!modal.open) modal.showModal();
}

// horário livre escolhido na Agenda: qual processo vai nele
function escolherProcessoParaLivre(lv) {
  modal.classList.remove('grande');
  const fila = ativos().filter(it => etapaDe(it.m) === 'AGENDAMENTO' && !slotDe(it));
  $('#modal-titulo').textContent = 'Agendar em ' + txtSlot(lv);
  $('#modal-corpo').innerHTML = '<p class="dica-gerador">Escolha o processo. Os que estão sem honorários reservados aparecem marcados.</p>' +
    (fila.length ? '<div class="arquivos">' + fila.map(it => '<button type="button" class="arq" data-fila="' + it.linha + '"><span class="meio"><b>' + esc(periciadoDe(it.m)) + '</b><small>' + esc(formatarCNJ(it.m['PROCESSO']) + ' · ' + (it.m['CIDADE'] || '') + (it.m['TIPO'] ? ' · ' + it.m['TIPO'] : '')) + '</small></span>' + (semReserva(it.m) ? '<span class="chip critico">sem reserva</span>' : '<span class="chip ok">agendar</span>') + '</button>').join('') + '</div>'
      : '<p class="vazio">Nenhum processo aguardando agendamento sem horário reservado.</p>');
  $('#modal-rodape').innerHTML = '<button type="button" class="btn" id="lv-outro">Marcar outra pessoa (sem processo)</button>';
  document.querySelectorAll('[data-fila]').forEach(b => b.addEventListener('click', () => { const it = acharItem('PERICIAS', b.dataset.fila); if (it) abrirSlot(null, '', { vincular: it, livre: lv }); }));
  $('#lv-outro').onclick = () => abrirSlot(null, lv.data, { livre: lv });
  if (!modal.open) modal.showModal();
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

  const pl = (n, um, varios) => n + ' ' + (n === 1 ? um : varios);
  let h = '<div class="saudacao"><div><h2>Financeiro</h2><p>Só o perfil perito vê esta página. O assistente vê apenas a tela Pagamentos, sem totais.</p></div>' +
    '<div class="acoes"><button type="button" class="btn" data-acao="csv">Exportar honorários (CSV)</button><button type="button" class="btn icone" data-acao="gestao-atualizar" title="Atualizar" aria-label="Atualizar">' + ic('atualizar') + '</button></div></div>';

  h += '<div class="grid alto-livre">';
  // número principal e projeção por estágio
  const semValor = pend.length - pend.filter(i => i.valor).length;
  h += '<section class="cartao c8"><span class="hero-rot">A receber</span><span class="hero-num">' + fmtBRLcurto(total) + '</span>' +
    '<p class="hero-sub">' + fmtBRL(total) + ' em ' + pl(pend.length, 'processo', 'processos') + ' · ' + fmtBRLcurto(est[0].soma + est[1].soma) + ' já pedido ou pronto para pedir</p>' +
    segmentos(est.map(e => ({ rot: e.rot, desc: e.desc + ' · ' + pl(e.its.length, 'processo', 'processos'), val: e.soma, txt: fmtBRLcurto(e.soma), cor: e.cor, ativa: state.gFiltro === e.k, attrs: 'data-acao="g-filtro" data-k="' + e.k + '"' })), { titulo: 'Projeção de recebimento' }) +
    '<p class="dica" style="margin:10px 0 0">Do mais perto de entrar no caixa ao mais distante. Toque num estágio para filtrar a tabela. UFESP a ' + fmtBRL(UFESP) + '; recebimento parcial conta pelo valor cheio.' + (semValor ? ' ' + pl(semValor, 'processo sem honorários informados fica', 'processos sem honorários informados ficam') + ' de fora das somas.' : '') + '</p></section>';

  h += '<div class="c4 pilha">' +
    '<div class="kpi" style="--k:var(--assist);cursor:default"><span class="ic-kpi">' + ic('financeiro') + '</span><span class="rot">Recebido (concluídos)</span><span class="val">' + fmtBRLcurto(totRec) + '</span><span class="sub">' + pl(recebidos.length, 'processo pago', 'processos pagos') + ' na aba Concluídos</span></div>' +
    '<div class="kpi" style="--k:var(--perito);cursor:default"><span class="ic-kpi">' + ic('gestao') + '</span><span class="rot">Valor médio</span><span class="val">' + fmtBRLcurto(media) + '</span><span class="sub">por processo ativo com honorários</span></div>' +
    '<button type="button" class="kpi" style="--k:' + (atrasados.length ? 'var(--critico)' : 'var(--pericia)') + '" data-acao="filtrar" data-etapa="LAUDO"><span class="ic-kpi">' + ic('documentos') + '</span><span class="rot">Laudos a fazer</span><span class="val">' + laudos.length + '</span><span class="sub">' + (atrasados.length ? '<b style="color:var(--vencido)">' + atrasados.length + ' com perícia há mais de 20 dias</b>' : 'nenhum atrasado') + '</span></button></div>';

  // valor por tipo e por comarca
  const porTipo = somarPor(pend, i => i.m['TIPO'], UFESP).filter(x => x.soma);
  const porCidade = somarPor(pend, i => /NUCLEO/.test(chave(i.m['CIDADE'])) ? 'Núcleo 4.0 (acidentário)' : i.m['CIDADE'], UFESP).filter(x => x.soma);
  const linhaGrupo = x => ({ rot: x.k, val: x.soma, txt: fmtBRLcurto(x.soma), dica: fmtBRL(x.soma) + ' · ' + pl(x.n, 'processo', 'processos') + ' · média ' + fmtBRLcurto(x.media) });
  h += '<section class="cartao c6"><h2>A receber por tipo de perícia</h2><p class="cartao-sub">Ao passar o mouse: total, quantidade e valor médio por processo</p>' +
    barras(porTipo.slice(0, 8).map(linhaGrupo)) + '</section>';
  h += '<section class="cartao c6"><h2>A receber por comarca</h2><p class="cartao-sub">Ao passar o mouse: total, quantidade e valor médio por processo</p>' +
    barras(porCidade.slice(0, 8).map(linhaGrupo)) + '</section>';

  // equipe: atividade no app por semana
  const g = state.gestao || {};
  const abertasA = lista.filter(i => i.c.quem === 'assistente'), abertasP = lista.filter(i => i.c.quem === 'perito');
  const venc = arr => arr.filter(i => prazoDe(i.m) && diasAte(prazoDe(i.m)) < 0).length;
  h += '<section class="cartao c7"><h2>Equipe</h2>' +
    '<div class="mini-kpis"><div><b>' + abertasA.length + '</b><span>tarefas do assistente' + (venc(abertasA) ? ' · <em>' + venc(abertasA) + ' vencida(s)</em>' : '') + '</span></div><div><b>' + abertasP.length + '</b><span>suas pendências' + (venc(abertasP) ? ' · <em>' + venc(abertasP) + ' vencida(s)</em>' : '') + '</span></div></div>';
  if (g.carregando && !g.equipe) h += '<p class="vazio">Carregando atividade...</p>';
  else if (g.erro) h += '<p class="vazio">' + esc(g.erro) + '</p>';
  else if (g.equipe && g.equipe.length) {
    if (g.semanas && g.semanas.length) {
      let nAssist = 0;
      const series = g.equipe.slice(0, 3).map(u => ({ k: u.usuario, rot: u.usuario, cor: u.papel === 'perito' ? 'var(--g-perito)' : (nAssist++ === 0 ? 'var(--g-assist)' : 'var(--g-neutro)') }));
      h += '<div class="cartao-topo" style="margin:4px 0 0"><h2 style="font-size:.85rem">Ações no app por semana</h2><span class="legenda" style="margin:0">' + series.map(x => '<span><i style="background:' + x.cor + '"></i>' + esc(x.rot) + '</span>').join('') + '</span></div>' +
        colunasPilha(g.semanas.map(w => { const f = new Date(w.fim); return { rot: fmtCurto(f), dicaR: 'semana até ' + fmtCurto(f), partes: w.porUsuario || {} }; }), series, { titulo: 'Ações no app por semana', altura: 120 });
    }
    h += '<table class="tabela compacta" style="margin-top:12px"><thead><tr><th>Usuário</th><th class="num">7 dias</th><th class="num">30 dias</th><th>Última ação</th></tr></thead><tbody>' +
      g.equipe.map(u => '<tr style="cursor:default"><td><b>' + esc(u.usuario) + '</b> <span class="chip ' + (u.papel === 'perito' ? 'perito' : 'assistente') + '">' + (u.papel === 'perito' ? 'perito' : 'assistente') + '</span></td><td class="num">' + u.d7 + '</td><td class="num">' + u.d30 + '</td><td><small>' + esc(u.ultima ? fmtDataHora(u.ultima) + ' · ' + u.ultimaAcao : '') + '</small></td></tr>').join('') + '</tbody></table>';
    if (g.acoes && g.acoes.length) h += '<p class="dica" style="margin:12px 0 6px">O que mais foi feito nos últimos 30 dias</p><div class="chips-linha">' + g.acoes.slice(0, 6).map(a => '<span class="chip">' + esc(a.acao) + ' · ' + a.n + '</span>').join('') + '</div>';
    h += '<p class="dica" style="margin:10px 0 0">Conta só o que foi feito pelo app' + (g.desde ? ' (desde ' + esc(String(g.desde).slice(0, 10)) + ')' : '') + '. Edições feitas direto na planilha não entram.</p>';
  } else h += '<p class="vazio">Ainda não há atividade registrada pelo app.</p>';
  h += '</section><div class="c5 pilha">';

  // laudos pendentes
  h += '<section class="cartao"><h2>Laudos a fazer</h2>' + (laudos.length ? '<div class="lista-linhas">' + laudos.map(x =>
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
  h += '<section class="cartao"><h2>Indicadores</h2><dl class="indicadores">' + ind.map(([k, v]) => '<div><dt>' + esc(k) + '</dt><dd>' + esc(v) + '</dd></div>').join('') + '</dl></section></div>';

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

/* ================= TAREFAS ================= */
const GRUPOS_PRAZO = [
  { k: 'atrasadas', rot: 'Atrasadas', cls: 'vencido' },
  { k: 'hoje', rot: 'Hoje', cls: 'critico' },
  { k: 'semana', rot: 'Próximos 7 dias', cls: 'alerta' },
  { k: 'depois', rot: 'Mais adiante', cls: 'ok' },
  { k: 'sem', rot: 'Sem prazo', cls: 'acompanhar' }
];

function renderTarefas() {
  const escopo = escopoTarefas();
  const perito = state.papel === 'perito';
  const lista = ativos();
  const tarefas = montarTarefas(lista, state.tarefas, state.user, state.papel, escopo, state.usuarios);
  const escopos = perito ? [['assistente', 'Do assistente'], ['minhas', 'Minhas'], ['todas', 'Todas']] : [['minhas', 'Minhas'], ['todas', 'Todas']];
  let h = '<div class="ferramentas"><button type="button" class="btn ouro" data-acao="t-nova">+ Nova tarefa</button>' +
    '<span class="alternar" role="group" aria-label="Quais tarefas">' + escopos.map(([k, r]) => '<button type="button" data-acao="t-escopo" data-k="' + k + '" class="' + (escopo === k ? 'ativa' : '') + '">' + r + '</button>').join('') + '</span>' +
    '<span class="contagem" style="margin:0 0 0 auto">' + tarefas.length + ' tarefa(s) em aberto</span></div>';

  h += '<div class="grid"><div class="c8">';
  if (!tarefas.length) h += '<section class="cartao"><p class="vazio">✅ Nenhuma tarefa em aberto.</p></section>';
  GRUPOS_PRAZO.forEach(g => {
    const doGrupo = tarefas.filter(t => grupoPrazo(t.prazo) === g.k);
    if (!doGrupo.length) return;
    h += '<section class="cartao grupo-tarefas"><h2><span><span class="ponto ' + g.cls + '"></span> ' + g.rot + '</span><span class="chip">' + doGrupo.length + '</span></h2><div class="lista-tarefas">' + doGrupo.map(tarefaHtml).join('') + '</div></section>';
  });
  h += '</div><div class="c4 pilha">';

  // conferência nos autos (processos que só dependem do Juízo ou de pagamento)
  const mostraConf = escopo !== 'minhas' || !perito;
  if (mostraConf) {
    const sc = situacaoConferencia(lista, state.verificados, CONFERIR_DIAS, CONFERIR_LIMITE);
    const pend = state.verTodasConf ? sc.pendentes : sc.pendentes.slice(0, 12);
    const rec = state.verConfRecentes ? sc.recentes : sc.recentes.slice(0, 5);
    const resumo = (sc.vencidos ? '<span class="chip critico" title="Nunca conferidos ou ' + CONFERIR_LIMITE + ' dias ou mais sem conferir">' + sc.vencidos + ' no limite</span>' : '') +
      (sc.semana ? '<span class="chip alerta" title="Passaram de ' + CONFERIR_DIAS + ' dias">' + sc.semana + ' esta semana</span>' : '') +
      (!sc.pendentes.length ? '<span class="chip ok">em dia</span>' : '');
    h += '<section class="cartao"><h2><span>Conferir nos autos</span><span class="chips-linha">' + resumo + '</span></h2>' +
      '<p class="dica">Processos aguardando decisão, depósito ou pagamento (' + sc.total + '). Confira no e-SAJ/eproc uma vez por semana e nunca deixe passar de ' + CONFERIR_LIMITE + ' dias. Se mudou algo, abra o processo e atualize.</p>' +
      (pend.length ? '<div class="lista-linhas">' + pend.map(x => '<div class="linha-item conf"><span class="ponto ' + (x.nivel === 'vencido' ? 'critico' : 'alerta') + '"></span>' +
        '<button type="button" class="meio link-sem" data-acao="ficha" data-aba="PERICIAS" data-linha="' + x.it.linha + '"><b>' + esc(x.it.m['REQUERENTE']) + '</b><small>' + esc(x.it.c.acao) + '</small>' +
        '<small class="ult-conf ' + x.nivel + '">' + esc((x.v ? 'Conferido em ' + txtConferencia(x.v) + ' · ' : '') + prazoConferencia(x, CONFERIR_DIAS, CONFERIR_LIMITE)).replace(/^nunca/, 'Nunca') + '</small></button>' +
        '<button type="button" class="btn pequeno" data-acao="t-verificado" data-proc="' + esc(x.it.m['PROCESSO']) + '" title="Conferi e não mudou nada">✓ Sem novidade</button></div>').join('') + '</div>'
        : '<p class="vazio">✅ Todos conferidos nos últimos ' + CONFERIR_DIAS + ' dias.</p>') +
      (sc.pendentes.length > 12 ? '<button type="button" class="link" data-acao="t-conf-todos" style="margin-top:8px">' + (state.verTodasConf ? 'Mostrar só os 12 primeiros' : 'Ver todos os pendentes (' + sc.pendentes.length + ')') + '</button>' : '');
    if (sc.recentes.length) {
      h += '<h3 class="sub">Conferidos nos últimos ' + CONFERIR_DIAS + ' dias (' + sc.recentes.length + ')</h3><div class="lista-linhas">' + rec.map(x =>
        '<button type="button" class="linha-item conf feito" data-acao="ficha" data-aba="PERICIAS" data-linha="' + x.it.linha + '"><span class="ponto ok"></span><span class="meio"><b>' + esc(x.it.m['REQUERENTE']) + '</b>' +
        '<small class="ult-conf">✓ ' + esc(txtConferencia(x.v) + ' · ' + prazoConferencia(x, CONFERIR_DIAS, CONFERIR_LIMITE)) + '</small></span></button>').join('') + '</div>' +
        (sc.recentes.length > 5 ? '<button type="button" class="link" data-acao="t-conf-recentes" style="margin-top:8px">' + (state.verConfRecentes ? 'Mostrar menos' : 'Ver todos os conferidos (' + sc.recentes.length + ')') + '</button>' : '');
    }
    h += '</section>';
  }

  // concluídas recentemente
  const feitas = state.tarefas.filter(t => t.status === 'FEITA');
  h += '<section class="cartao"><h2>Concluídas (14 dias) <span class="chip">' + feitas.length + '</span></h2>' +
    (feitas.length ? (state.verFeitas ? '<div class="lista-linhas">' + feitas.map(t => '<div class="linha-item"><span class="ponto ok"></span><span class="meio"><b style="text-decoration:line-through;color:var(--suave)">' + esc(t.tarefa) + '</b><small>' + esc((t.feitaPor || '') + ' · ' + (t.feitaEm || '')) + '</small></span><button type="button" class="btn pequeno" data-acao="t-reabrir" data-id="' + esc(t.id) + '">Reabrir</button></div>').join('') + '</div>' : '') +
      '<button type="button" class="link" data-acao="t-ver-feitas">' + (state.verFeitas ? 'Ocultar' : 'Mostrar') + '</button>' : '<p class="vazio">Nenhuma tarefa atribuída foi concluída nos últimos 14 dias.</p>') + '</section>';
  h += '</div></div>';
  $('#conteudo').innerHTML = h;
}

function tarefaHtml(t) {
  const pz = t.prazo ? '<span class="chip ' + nivelPrazo(diasAte(t.prazo)) + '">' + fmtCurto(t.prazo) + ' · ' + txtDias(diasAte(t.prazo)) + '</span>' : '';
  const quem = '<span class="chip ' + t.quem + '">' + QUEM_ROT[t.quem] + '</span>';
  if (t.tipo === 'fluxo') {
    const it = t.it, sl = slotDe(it), ac = principalAcao(it.m, { slot: sl });
    const reservado = sl && etapaDe(it.m) === 'AGENDAMENTO';
    return '<div class="tarefa"><span class="marca-fluxo" title="Vem do andamento do processo">' + ic('processos') + '</span><div class="meio">' +
      '<b>' + esc(reservado ? 'Peticionar o agendamento e intimar as partes' : t.titulo) + '</b><small>' + esc((it.m['REQUERENTE'] || '') + ' · ' + formatarCNJ(it.m['PROCESSO'])) + (it.m['OBSERVACAO'] ? ' · ' + esc(abreviar(it.m['OBSERVACAO'], 60)) : '') + '</small>' +
      '<div class="chips">' + pz + quem + (reservado ? '<span class="chip pericia">📅 Reservado ' + esc(txtSlot(sl)) + '</span>' : '') + (semReserva(it.m) ? '<span class="chip critico">⚠ Sem reserva</span>' : '') + '</div></div>' +
      '<div class="acoes-t">' + (reservado ? '<button type="button" class="btn pequeno" data-acao="t-gerar" data-linha="' + it.linha + '">' + ic('documentos') + 'Gerar petição</button>' : '') +
      (ac ? '<button type="button" class="btn pequeno primario" data-acao="t-concluir" data-linha="' + it.linha + '" data-id="' + ac.id + '">' + esc(ac.rot) + '</button>' : '') +
      '<button type="button" class="btn pequeno" data-acao="ficha" data-aba="PERICIAS" data-linha="' + it.linha + '">Abrir</button></div></div>';
  }
  const x = t.t;
  const proc = x.processo ? ativos().find(i => digitos(i.m['PROCESSO']) === digitos(x.processo)) : null;
  const podeExcluir = x.por === state.user || state.papel === 'perito';
  return '<div class="tarefa"><button type="button" class="check-t" data-acao="t-feita" data-id="' + esc(x.id) + '" aria-label="Marcar como feita" title="Marcar como feita"></button><div class="meio">' +
    '<b>' + esc(t.titulo) + '</b><small>' + (proc ? esc(proc.m['REQUERENTE'] + ' · ' + formatarCNJ(proc.m['PROCESSO']) + ' · ') : (x.processo ? esc(x.processo + ' · ') : '')) + 'de ' + esc(x.por) + ' para ' + esc(x.para === 'assistentes' ? 'assistentes' : x.para) + ' · ' + esc(String(x.criada).slice(0, 10)) + '</small>' +
    '<div class="chips">' + pz + quem + '<span class="chip">Atribuída</span></div></div>' +
    '<div class="acoes-t">' + (proc ? '<button type="button" class="btn pequeno" data-acao="ficha" data-aba="PERICIAS" data-linha="' + proc.linha + '">Abrir</button>' : '') +
    (podeExcluir ? '<button type="button" class="btn pequeno icone perigo" data-acao="t-excluir" data-id="' + esc(x.id) + '" title="Excluir tarefa" aria-label="Excluir tarefa">' + ic('fechar') + '</button>' : '') + '</div></div>';
}

function abrirNovaTarefa(processo) {
  modal.classList.remove('grande');
  const temCanal = state.canais.some(c => c.k === 'ASSISTENTE');
  const outros = state.usuarios.filter(u => u.u !== state.user || state.papel === 'perito');
  $('#modal-titulo').textContent = 'Nova tarefa';
  $('#modal-corpo').innerHTML = '<div class="form-grid">' +
    '<div class="campo largo"><label for="nt-texto">O que fazer</label><textarea id="nt-texto" placeholder="Ex.: Ligar para o periciando e confirmar o endereço da perícia domiciliar"></textarea></div>' +
    '<div class="campo"><label for="nt-para">Para</label><select id="nt-para"><option value="assistentes">Assistentes (qualquer um)</option>' + outros.map(u => '<option value="' + esc(u.u) + '"' + (u.u === state.user ? '' : '') + '>' + esc(u.u) + ' (' + u.papel + ')</option>').join('') + '</select></div>' +
    '<div class="campo"><label for="nt-prazo">Prazo</label><input id="nt-prazo" type="date"></div>' +
    '<div class="campo largo"><label for="nt-proc">Processo (opcional)</label><input id="nt-proc" list="dl-nt-proc" autocomplete="off" value="' + esc(processo || '') + '" placeholder="Digite número ou nome"><datalist id="dl-nt-proc">' + ativos().map(it => '<option value="' + esc(it.m['PROCESSO']) + '" label="' + esc(it.m['REQUERENTE']) + '">').join('') + '</datalist></div>' +
    (temCanal ? '<label class="check"><input type="checkbox" id="nt-avisar" checked> Avisar no #tarefas-assistente do Discord</label>' : '') + '</div>';
  $('#modal-rodape').innerHTML = '<button type="button" class="btn primario" id="nt-salvar">Criar tarefa</button>';
  $('#nt-salvar').onclick = async ev => {
    const btn = ev.target, texto = $('#nt-texto').value.trim();
    if (!texto) { toast('Descreva a tarefa.', { erro: true }); return; }
    btn.disabled = true;
    try {
      const j = await api('tarefaCriar', { tarefa: texto, para: $('#nt-para').value, prazo: isoParaBr($('#nt-prazo').value), processo: $('#nt-proc').value.trim(), avisar: !!($('#nt-avisar') && $('#nt-avisar').checked) });
      if (!j.ok) throw new Error(j.erro || 'Erro ao criar a tarefa');
      state.tarefas = j.tarefas;
      modal.close();
      toast(j.aviso || 'Tarefa criada', { erro: !!j.aviso });
      render();
    } catch (e) { toast(e.message, { erro: true }); btn.disabled = false; }
  };
  if (!modal.open) modal.showModal();
  setTimeout(() => $('#nt-texto').focus(), 50);
}

async function mudarTarefa(acao, extra, msg) {
  try {
    const j = await api(acao, extra);
    if (!j.ok) throw new Error(j.erro || 'Erro');
    state.tarefas = j.tarefas;
    render();
    if (msg) toast(msg);
  } catch (e) { toast(e.message, { erro: true }); }
}

/* ================= DOCUMENTOS (gerador) ================= */
function aplicarModelos(j) {
  state.modelos = j.modelos || [];
  state.modelosUrl = j.url || '';
  state.modelosSug = j.sugeridos || [];
}
let carregandoModelos = null, modelosFalhouEm = 0;
function garantirModelos(silencioso) {
  if (state.modelos) return Promise.resolve(true);
  // em segundo plano (ficha), não insiste se acabou de falhar
  if (silencioso && Date.now() - modelosFalhouEm < 120000) return Promise.resolve(false);
  if (!carregandoModelos) {
    carregandoModelos = api('modelos').then(j => {
      if (!j.ok) throw new Error(j.erro || 'Erro ao ler os modelos');
      aplicarModelos(j);
      return true;
    }).catch(e => { modelosFalhouEm = Date.now(); if (!silencioso) toast(e.message, { erro: true }); return false; })
      .finally(() => { carregandoModelos = null; });
  }
  return carregandoModelos;
}

function abasDocumentos() {
  const n = state.modelos ? state.modelos.length : 0;
  return '<div class="ferramentas"><span class="alternar" role="tablist" aria-label="Documentos">' +
    '<button type="button" role="tab" data-acao="doc-tab" data-k="gerar" class="' + (state.docTab === 'gerar' ? 'ativa' : '') + '" aria-selected="' + (state.docTab === 'gerar') + '">Gerar documentos</button>' +
    '<button type="button" role="tab" data-acao="doc-tab" data-k="modelos" class="' + (state.docTab === 'modelos' ? 'ativa' : '') + '" aria-selected="' + (state.docTab === 'modelos') + '">Modelos (' + n + ')</button></span>' +
    '<span class="esp"></span>' + (state.modelosUrl ? '<a class="btn pequeno" href="' + esc(state.modelosUrl) + '" target="_blank" rel="noopener">' + ic('externo') + 'Pasta Arquivos base</a>' : '') + '</div>';
}

function renderDocumentos() {
  const gd = state.gd;
  if (!state.modelos) {
    $('#conteudo').innerHTML = '<p class="carregando">Carregando os modelos do Drive...</p>';
    garantirModelos().then(ok => { if (ok && state.view === 'documentos') render(); else if (!ok) $('#conteudo').innerHTML = '<p class="carregando">Não consegui ler a pasta de modelos. Confira se o backend novo foi publicado e se o Drive foi autorizado.</p>'; });
    return;
  }
  if (state.docTab === 'modelos') { renderModelos(); return; }
  const lista = ativos();
  const q = chave(gd.q);
  const vis = modelosVisiveis(state.modelos);
  const modelos = vis.filter(md => !q || chave(md.nome).indexOf(q) >= 0);
  const modelo = state.modelos.find(md => md.id === gd.modeloId);
  const precisa = {};
  vis.forEach(md => { precisa[md.id] = processosParaModelo(md, lista).length; });
  const agora = vis.filter(md => precisa[md.id] > 0).sort((a, b) => precisa[b.id] - precisa[a.id]).slice(0, 5);
  let h = abasDocumentos() + '<div class="grid alto-livre"><section class="cartao c5"><h2>1. Modelo</h2>';
  if (agora.length && !q) {
    h += '<h3 class="sub" style="margin-top:0">Para gerar agora</h3><div class="agora-docs">' + agora.map(md => '<button type="button" class="agora-doc' + (md.id === gd.modeloId ? ' sel' : '') + '" data-acao="gd-modelo" data-id="' + esc(md.id) + '"><b>' + precisa[md.id] + '</b><span>' + esc(nomeModeloCurto(md.nome)) + '</span></button>').join('') + '</div>';
  }
  h += '<input type="search" id="gd-q" class="busca-modelo" style="margin-top:12px" placeholder="Buscar modelo..." value="' + esc(gd.q) + '" autocomplete="off">';
  GRUPOS_MODELO.forEach(g => {
    const doGrupo = modelos.filter(md => grupoModelo(md) === g);
    if (!doGrupo.length) return;
    h += '<h3 class="sub">' + esc(g) + '</h3><div class="arquivos">' + doGrupo.map(md => '<button type="button" class="arq' + (md.id === gd.modeloId ? ' sel' : '') + '" data-acao="gd-modelo" data-id="' + esc(md.id) + '"><span class="tipo-arq doc">DOCS</span><span class="meio"><b>' + esc(md.nome) + '</b>' + (md.cfg && md.cfg.desc ? '<small>' + esc(md.cfg.desc) + '</small>' : '') + '</span>' +
      (md.id === gd.modeloId ? '<span class="chip ok">escolhido</span>' : precisa[md.id] ? '<span class="chip pericia" title="Processos que precisam deste modelo agora">' + precisa[md.id] + '</span>' : '') + '</button>').join('') + '</div>';
  });
  if (!modelos.length) h += '<p class="vazio">Nenhum modelo com esse nome.</p>';
  h += '<p class="dica" style="margin:12px 0 0">Falta algum modelo? Crie, configure ou use um dos sugeridos na aba <button type="button" class="link" data-acao="doc-tab" data-k="modelos">Modelos</button>.</p>';
  h += '</section><section class="cartao c7"><h2>2. Processos</h2>';
  if (!modelo) h += '<p class="vazio">Escolha um modelo ao lado. O app sugere os processos que precisam dele agora (por exemplo: todos com MLE a peticionar, ou todas as perícias agendadas do Núcleo).</p>';
  else {
    const sug = processosParaModelo(modelo, lista);
    const linhaSel = it => {
      const d = parseData(it.m['PERICIA']);
      return '<label class="sel-proc"><input type="checkbox" data-gd-linha="' + it.linha + '"' + (gd.sel[it.linha] ? ' checked' : '') + '><span class="meio"><b>' + esc(it.m['REQUERENTE']) + '</b><small>' + esc(formatarCNJ(it.m['PROCESSO']) + ' · ' + (it.m['CIDADE'] || '') + ' · ' + (it.m['PROXIMO PASSO'] || '')) + '</small></span>' + (d ? '<span class="chip pericia">Perícia ' + fmtCurto(d) + '</span>' : '') + '</label>';
    };
    h += '<div class="modelo-escolhido"><b>' + esc(modelo.nome) + '</b><small>' + esc(resumoRegra(modelo)) + (modelo.cfg && modelo.cfg.desc ? ' · ' + esc(modelo.cfg.desc) : '') + '</small>' +
      '<span class="acoes-md"><a class="link" href="' + esc(modelo.url || ('https://docs.google.com/document/d/' + modelo.id + '/edit')) + '" target="_blank" rel="noopener">ver o modelo</a> · <button type="button" class="link" data-acao="md-config" data-id="' + esc(modelo.id) + '">ajustar a regra</button></span></div>';
    h += '<h3 class="sub">Sugeridos (' + sug.length + ')' + (sug.length ? ' · <button type="button" class="link" data-acao="gd-todos">marcar todos</button> · <button type="button" class="link" data-acao="gd-nenhum">desmarcar</button>' : '') + '</h3>';
    h += sug.length ? '<div class="arquivos">' + sug.map(linhaSel).join('') + '</div>' : '<p class="vazio">Nenhum processo precisa deste modelo agora. Busque abaixo.</p>';
    const pq = chave(gd.pq);
    const outros = pq ? lista.filter(it => sug.indexOf(it) < 0 && chave(it.v.join(' ') + ' ' + formatarCNJ(it.m['PROCESSO'])).indexOf(pq) >= 0).slice(0, 15) : [];
    const marcadosFora = lista.filter(it => gd.sel[it.linha] && sug.indexOf(it) < 0 && outros.indexOf(it) < 0);
    h += '<h3 class="sub">Outros processos</h3><input type="search" id="gd-pq" class="busca-modelo" placeholder="Buscar por nome ou número para incluir..." value="' + esc(gd.pq) + '" autocomplete="off">' +
      (outros.length || marcadosFora.length ? '<div class="arquivos">' + marcadosFora.concat(outros).map(linhaSel).join('') + '</div>' : '');
    const n = Object.keys(gd.sel).filter(k => gd.sel[k]).length;
    h += '<label class="check" style="margin-top:14px"><input type="checkbox" id="gd-pasta"' + (gd.criarPasta ? ' checked' : '') + '> Criar a pasta do periciado no Drive se ainda não existir</label>' +
      '<div class="acoes" style="margin-top:12px"><button type="button" class="btn primario" data-acao="gd-gerar"' + (n && !gd.rodando ? '' : ' disabled') + '>' + (gd.rodando ? 'Gerando...' : 'Gerar ' + n + ' documento' + (n === 1 ? '' : 's')) + '</button></div>';
  }
  h += '</section><section class="cartao c12" id="gd-resultados"' + (gd.resultados.length ? '' : ' hidden') + '></section></div>';
  $('#conteudo').innerHTML = h;
  renderResultadosGd();
  const q1 = $('#gd-q');
  q1.addEventListener('input', () => { gd.q = q1.value; render(); });
  const q2 = $('#gd-pq');
  if (q2) q2.addEventListener('input', () => { gd.pq = q2.value; render(); });
  const cp = $('#gd-pasta');
  if (cp) cp.addEventListener('change', () => { gd.criarPasta = cp.checked; });
  document.querySelectorAll('[data-gd-linha]').forEach(cb => cb.addEventListener('change', () => { gd.sel[cb.dataset.gdLinha] = cb.checked; render(); }));
}

function renderResultadosGd() {
  const el = $('#gd-resultados');
  if (!el) return;
  const r = state.gd.resultados;
  el.hidden = !r.length;
  if (!r.length) return;
  const feitos = r.filter(x => x.status === 'ok').length;
  el.innerHTML = '<h2>Resultado <span class="chip ' + (feitos === r.length ? 'ok' : '') + '">' + feitos + ' de ' + r.length + '</span></h2><div class="arquivos">' + r.map(x =>
    '<div class="arq" style="cursor:default"><span class="tipo-arq ' + (x.status === 'ok' ? 'doc' : x.status === 'erro' ? 'pdf' : '') + '">' + (x.status === 'ok' ? 'OK' : x.status === 'erro' ? 'ERRO' : x.status === 'gerando' ? '...' : 'FILA') + '</span>' +
    '<span class="meio"><b>' + esc(x.doc ? x.doc.nome : x.nome) + '</b><small>' + esc(x.status === 'erro' ? x.erro : x.status === 'gerando' ? 'Gerando...' : x.status === 'fila' ? 'Na fila' : (x.conferir && x.conferir.length ? 'Conferir: ' + x.conferir.join(', ') : 'Preenchido')) + '</small></span>' +
    (x.doc ? '<a class="btn pequeno primario" href="' + esc(x.doc.url) + '" target="_blank" rel="noopener">Abrir</a><a class="btn pequeno" href="' + esc(linkPdf(x.doc.id)) + '" target="_blank" rel="noopener">PDF</a>' : '') + '</div>').join('') + '</div>' +
    (state.gd.rodando ? '' : '<p class="dica" style="margin:10px 0 0">Os documentos ficam na pasta de cada periciado. Trechos em amarelo precisam de conferência; tire o realce antes de protocolar.</p>');
}

async function gerarLote() {
  const gd = state.gd;
  const lista = ativos().filter(it => gd.sel[it.linha]);
  if (!lista.length || gd.rodando) return;
  gd.rodando = true;
  gd.resultados = lista.map(it => ({ it: it, nome: it.m['REQUERENTE'] + ' · ' + formatarCNJ(it.m['PROCESSO']), status: 'fila' }));
  render();
  for (const x of gd.resultados) {
    x.status = 'gerando'; renderResultadosGd();
    try {
      const j = await api('gerarDoc', { aba: 'PERICIAS', linha: x.it.linha, processoEsperado: x.it.m['PROCESSO'], modeloId: gd.modeloId, criarPasta: gd.criarPasta });
      if (!j.ok) throw new Error(erroApi(j, 'Erro ao gerar'));
      x.status = 'ok'; x.doc = j.doc; x.conferir = j.conferir || [];
      delete state.docs[chaveDocs(x.it)];
    } catch (e) { x.status = 'erro'; x.erro = e.message; }
    renderResultadosGd();
  }
  gd.rodando = false;
  gd.sel = {};
  const ok = gd.resultados.filter(x => x.status === 'ok').length;
  toast(ok + ' de ' + gd.resultados.length + ' documento(s) gerado(s)', { erro: ok < gd.resultados.length });
  if (state.view === 'documentos') render();
}

/* ---------- Modelos: lista, regras, criação ---------- */
function urlModelo(md) { return md.url || ('https://docs.google.com/document/d/' + md.id + '/edit'); }

function renderModelos() {
  const lista = ativos();
  const q = chave(state.mdQ);
  const mods = state.modelos.filter(md => !q || chave(md.nome).indexOf(q) >= 0);
  const perito = state.papel === 'perito';
  let h = abasDocumentos() + '<div class="grid alto-livre"><section class="cartao c8"><div class="cartao-topo"><h2>Modelos da pasta Arquivos base</h2><button type="button" class="btn pequeno primario" data-acao="md-novo">+ Criar modelo</button></div>' +
    '<p class="dica">Cada modelo pode ter uma regra que diz quando ele aparece como sugestão: etapa do processo, tipo de processo e uma palavra da observação. Sem regra, o app reconhece pelo nome do arquivo.</p>' +
    '<input type="search" id="md-q" class="busca-modelo" placeholder="Buscar modelo..." value="' + esc(state.mdQ) + '" autocomplete="off">';
  GRUPOS_MODELO.forEach(g => {
    const doGrupo = mods.filter(md => grupoModelo(md) === g);
    if (!doGrupo.length) return;
    h += '<h3 class="sub">' + esc(g) + ' (' + doGrupo.length + ')</h3><div class="arquivos">' + doGrupo.map(md => {
      const oculto = !!(md.cfg && md.cfg.oculto);
      const n = oculto ? 0 : processosParaModelo(md, lista).length;
      return '<div class="modelo-linha' + (oculto ? ' oculto' : '') + '"><span class="tipo-arq doc">DOCS</span><div class="meio"><b>' + esc(md.nome) + '</b>' +
        '<small>' + (oculto ? 'Escondido do gerador e das sugestões' : esc(resumoRegra(md))) + (n ? ' · <b class="n">' + n + ' processo' + (n === 1 ? '' : 's') + ' agora</b>' : '') + '</small>' +
        (md.cfg && md.cfg.desc ? '<small class="desc">' + esc(md.cfg.desc) + '</small>' : '') + '</div>' +
        '<div class="acoes-md"><button type="button" class="btn pequeno" data-acao="md-config" data-id="' + esc(md.id) + '">Configurar</button>' +
        '<a class="btn pequeno" href="' + esc(urlModelo(md)) + '" target="_blank" rel="noopener">' + ic('externo') + 'Texto</a>' +
        '<button type="button" class="btn pequeno" data-acao="md-duplicar" data-id="' + esc(md.id) + '">Duplicar</button>' +
        (perito ? '<button type="button" class="btn pequeno perigo" data-acao="md-excluir" data-id="' + esc(md.id) + '">Excluir</button>' : '') + '</div></div>';
    }).join('') + '</div>';
  });
  if (!mods.length) h += '<p class="vazio">Nenhum modelo com esse nome.</p>';
  h += '</section><div class="c4 pilha col-lateral">';
  h += '<section class="cartao"><h2>Modelos sugeridos</h2><p class="dica">Petições comuns na rotina da perícia que ainda não estão na pasta. O texto vem no seu padrão (objetivo, em primeira pessoa, sem citar folhas, prazos a critério do Juízo) e pode ser ajustado no Docs depois.</p>';
  h += state.modelosSug.length ? '<div class="arquivos">' + state.modelosSug.map(s => '<div class="modelo-linha"><div class="meio"><b>' + esc(nomeModeloCurto(s.nome)) + '</b><small>' + esc(s.grupo + ' · ' + s.desc) + '</small></div>' +
    (s.existe ? '<span class="chip ok">na pasta</span>' : '<button type="button" class="btn pequeno primario" data-acao="md-sugestao" data-k="' + esc(s.chave) + '">Criar</button>') + '</div>').join('') + '</div>'
    : '<p class="vazio">As sugestões aparecem depois de publicar a versão nova do backend.</p>';
  h += '</section><section class="cartao"><h2>Campos automáticos</h2><p class="dica">Escreva no modelo exatamente assim; ao gerar, o app troca pelo dado do processo. Campo sem dado na planilha fica amarelo.</p><dl class="campos-doc">' +
    CAMPOS_DOC.map(c => '<div><dt><code>{{' + c[0] + '}}</code></dt><dd>' + esc(c[1]) + '</dd></div>').join('') + '</dl>' +
    '<p class="dica" style="margin:12px 0 0">Texto entre <code>[[ ]]</code> fica amarelo para completar à mão. Mesmo sem campos, o app já troca a tabela Processo/Requerente/Requerida, o juízo do endereçamento, a data de assinatura e a linha "Data: ...; Horário: ... horas".</p></section>';
  h += '</div></div>';
  $('#conteudo').innerHTML = h;
  const inp = $('#md-q');
  inp.addEventListener('input', () => { state.mdQ = inp.value; render(); });
}

function camposRegraHtml(cfg, nomeAtual) {
  cfg = cfg || {};
  const et = cfg.etapas || [];
  return '<div class="campo largo"><label for="md-grupo">Grupo na lista</label><select id="md-grupo"><option value="">Automático pelo nome' + (nomeAtual ? ' (' + esc(grupoModelo(nomeAtual)) + ')' : '') + '</option>' +
    GRUPOS_MODELO.map(g => '<option' + (cfg.grupo === g ? ' selected' : '') + '>' + esc(g) + '</option>').join('') + '</select></div>' +
    '<fieldset class="cfg-etapas campo largo"><legend>Sugerir quando o próximo passo for</legend>' +
    ETAPAS.map(e => '<label class="check"><input type="checkbox" data-md-etapa="' + e.k + '"' + (et.indexOf(e.k) >= 0 ? ' checked' : '') + '> ' + esc(e.rot) + '</label>').join('') + '</fieldset>' +
    '<div class="campo"><label for="md-filtro">Para quais processos</label><select id="md-filtro">' + FILTROS_MODELO.map(f => '<option value="' + f[0] + '"' + ((cfg.filtro || '') === f[0] ? ' selected' : '') + '>' + esc(f[1]) + '</option>').join('') + '</select></div>' +
    '<div class="campo"><label for="md-obs">Observação contém (opcional)</label><input id="md-obs" value="' + esc(cfg.obs || '') + '" placeholder="ex.: não compareceu" autocomplete="off"></div>' +
    '<div class="campo largo"><label for="md-desc">Para que serve (aparece na lista)</label><textarea id="md-desc" rows="2" maxlength="300">' + esc(cfg.desc || '') + '</textarea></div>';
}
function lerRegra() {
  return {
    grupo: $('#md-grupo').value,
    etapas: Array.from(document.querySelectorAll('[data-md-etapa]')).filter(c => c.checked).map(c => c.dataset.mdEtapa),
    filtro: $('#md-filtro').value,
    obs: $('#md-obs').value.trim(),
    desc: $('#md-desc').value.trim(),
    oculto: !!($('#md-oculto') && $('#md-oculto').checked)
  };
}
function ligarPreviaRegra(nomeFixo) {
  const atualizar = () => {
    const el = $('#md-previa');
    if (!el) return;
    const r = lerRegra();
    const nome = ($('#md-nome') && $('#md-nome').value) || nomeFixo || '';
    if (r.oculto) { el.textContent = 'Escondido: não aparece no gerador nem nas sugestões.'; return; }
    const lista = processosParaModelo({ nome: nome, cfg: r }, ativos());
    const semRegra = !r.etapas.length && !r.obs;
    el.innerHTML = (semRegra ? 'Sem etapa marcada, o app sugere pelo nome do arquivo. Hoje' : 'Com esta regra, hoje') + ' ele seria sugerido para <b>' + lista.length + ' processo' + (lista.length === 1 ? '' : 's') + '</b>' +
      (lista.length ? ': ' + esc(lista.slice(0, 3).map(it => nomeCurto(it.m['REQUERENTE'])).join(', ')) + (lista.length > 3 ? ' e outros' : '') : '') + '.';
  };
  $('#modal-corpo').querySelectorAll('input,select,textarea').forEach(x => { x.addEventListener('input', atualizar); x.addEventListener('change', atualizar); });
  atualizar();
}
function enterAciona(inp, btn) { inp.addEventListener('keydown', e => { if (e.key === 'Enter' && inp.tagName !== 'TEXTAREA') { e.preventDefault(); btn.click(); } }); }

function abrirConfigModelo(id) {
  const md = (state.modelos || []).find(x => x.id === id);
  if (!md) return;
  modal.classList.remove('grande');
  $('#modal-titulo').textContent = 'Configurar modelo';
  $('#modal-corpo').innerHTML = '<div class="form-grid" id="md-form"><div class="campo largo"><label for="md-nome">Nome do arquivo</label><input id="md-nome" value="' + esc(md.nome) + '" autocomplete="off"></div>' +
    camposRegraHtml(md.cfg, md.nome) +
    '<label class="check"><input type="checkbox" id="md-oculto"' + (md.cfg && md.cfg.oculto ? ' checked' : '') + '> Esconder do gerador e das sugestões (o arquivo continua na pasta)</label></div>' +
    '<p class="previa-regra" id="md-previa"></p>';
  $('#modal-rodape').innerHTML = '<button type="button" class="btn primario" id="md-salvar">Salvar</button><a class="btn" href="' + esc(urlModelo(md)) + '" target="_blank" rel="noopener">' + ic('externo') + 'Editar o texto no Docs</a>';
  ligarPreviaRegra(md.nome);
  const btn = $('#md-salvar');
  enterAciona($('#md-nome'), btn); enterAciona($('#md-obs'), btn);
  btn.onclick = async () => {
    const nome = $('#md-nome').value.trim();
    if (!nome) { toast('Dê um nome ao modelo.', { erro: true }); return; }
    if (/^c[oó]pia de /i.test(nome)) { toast('Nomes que começam com "Cópia de" ficam fora da lista. Escolha outro.', { erro: true }); return; }
    btn.disabled = true;
    try {
      const j = await api('modeloSalvar', { id: md.id, nome: nome, cfg: lerRegra() });
      if (!j.ok) throw new Error(j.erro || 'Erro ao salvar o modelo');
      aplicarModelos(j);
      modal.close();
      toast('Modelo salvo');
      render();
    } catch (e) { toast(e.message, { erro: true }); btn.disabled = false; }
  };
  if (!modal.open) modal.showModal();
}

function abrirNovoModelo() {
  const bases = modelosVisiveis(state.modelos);
  modal.classList.remove('grande');
  $('#modal-titulo').textContent = 'Criar modelo';
  $('#modal-corpo').innerHTML = '<p class="dica-gerador">O app cria um documento novo em Arquivos base com o cabeçalho e as margens do modelo escolhido, o endereçamento, a tabela Processo/Requerente/Requerida, um parágrafo para você escrever e a assinatura. Depois é só escrever o texto no Docs, usando os campos automáticos.</p>' +
    '<div class="form-grid" id="md-form"><div class="campo largo"><label for="md-nome">Nome</label><input id="md-nome" placeholder="ex.: JUNTADA DE DOCUMENTOS" autocomplete="off"></div>' +
    '<div class="campo largo"><label for="md-base">Copiar cabeçalho e formatação de</label><select id="md-base"><option value="">Automático (um ACEITE N40)</option>' +
    bases.map(md => '<option value="' + esc(md.id) + '">' + esc(md.nome) + '</option>').join('') + '</select></div>' +
    camposRegraHtml({}, '') + '</div><p class="previa-regra" id="md-previa"></p>';
  $('#modal-rodape').innerHTML = '<button type="button" class="btn primario" id="md-criar">Criar no Drive</button><small style="color:var(--suave);align-self:center">O nome ganha "MODELO" na frente</small>';
  ligarPreviaRegra('');
  const btn = $('#md-criar');
  enterAciona($('#md-nome'), btn);
  btn.onclick = async () => {
    const nome = $('#md-nome').value.trim();
    if (!nome) { toast('Dê um nome ao modelo.', { erro: true }); return; }
    btn.disabled = true; btn.textContent = 'Criando...';
    try {
      const j = await api('modeloCriar', { nome: nome, baseId: $('#md-base').value, cfg: lerRegra() });
      if (!j.ok) throw new Error(j.erro || 'Erro ao criar o modelo');
      aplicarModelos(j);
      render();
      mostrarModeloCriado(j.novo, 'Modelo criado');
    } catch (e) { toast(e.message, { erro: true }); btn.disabled = false; btn.textContent = 'Criar no Drive'; }
  };
  if (!modal.open) modal.showModal();
}

function abrirDuplicarModelo(id) {
  const md = (state.modelos || []).find(x => x.id === id);
  if (!md) return;
  modal.classList.remove('grande');
  $('#modal-titulo').textContent = 'Duplicar modelo';
  $('#modal-corpo').innerHTML = '<p class="dica-gerador">Faz uma cópia com o mesmo texto e a mesma regra, para criar uma variação (outra vara, outro tipo de perícia).</p>' +
    '<div class="campo"><label for="md-nome">Nome da cópia</label><input id="md-nome" value="' + esc(md.nome + ' 2') + '" autocomplete="off"></div>';
  $('#modal-rodape').innerHTML = '<button type="button" class="btn primario" id="md-dup">Duplicar</button>';
  const btn = $('#md-dup');
  enterAciona($('#md-nome'), btn);
  btn.onclick = async () => {
    const nome = $('#md-nome').value.trim();
    if (!nome) { toast('Dê um nome à cópia.', { erro: true }); return; }
    btn.disabled = true; btn.textContent = 'Duplicando...';
    try {
      const j = await api('modeloDuplicar', { id: md.id, nome: nome });
      if (!j.ok) throw new Error(j.erro || 'Erro ao duplicar');
      aplicarModelos(j);
      render();
      mostrarModeloCriado(j.novo, 'Cópia criada');
    } catch (e) { toast(e.message, { erro: true }); btn.disabled = false; btn.textContent = 'Duplicar'; }
  };
  if (!modal.open) modal.showModal();
}

function mostrarModeloCriado(novo, titulo) {
  modal.classList.remove('grande');
  $('#modal-titulo').textContent = titulo;
  $('#modal-corpo').innerHTML = '<div class="gerado"><span class="tipo-arq doc">DOCS</span><div><b>' + esc(novo.nome) + '</b><small>Na pasta Arquivos base</small></div></div>' +
    '<p class="dica-gerador">Abra no Docs para escrever ou revisar o texto. Os trechos entre [[ ]] ficam amarelos em cada documento gerado, para lembrar de completar.</p>';
  $('#modal-rodape').innerHTML = '<a class="btn primario" href="' + esc(novo.url) + '" target="_blank" rel="noopener">' + ic('externo') + 'Abrir no Docs</a><button type="button" class="btn" data-acao="md-config" data-id="' + esc(novo.id) + '">Ajustar a regra</button><span class="esp"></span><button type="button" class="btn" id="md-ok">Fechar</button>';
  $('#md-ok').onclick = () => modal.close();
  if (!modal.open) modal.showModal();
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
  if (a !== 'nav-mais') { const p = $('#nav-mais'); if (p && !p.hidden) p.hidden = true; }
  switch (a) {
    case 'ir': ir(ds.view); break;
    case 'ficha': abrirFicha(ds.aba || 'PERICIAS', ds.linha); break;
    case 'fechar-ficha': fecharFicha(); break;
    case 'ficha-aba': state.ficha.aba2 = ds.k; state.ficha.confirma = null; if (ds.k === 'hist') state.ficha.hist = null; renderFicha(); break;
    case 'rapida': acaoRapida(ds.id); break;
    case 'confirmar': { const fn = state.ficha.confirma.fn; state.ficha.confirma = null; fn(); break; }
    case 'cancelar-confirma': state.ficha.confirma = null; renderFicha(); break;
    case 'salvar-dados': salvarDadosFicha(); break;
    case 'dados-descartar': renderFicha(); toast('Alterações descartadas'); break;
    case 'mover': {
      const it = acharItem(state.ficha.aba, state.ficha.linha);
      const para = ds.para;
      state.ficha.aba2 = 'acoes';
      const encerrar = para !== 'PERICIAS';
      state.ficha.confirma = { titulo: para === 'RENUNCIAS' ? 'Registrar renúncia deste processo?' : encerrar ? 'Mover este processo para Concluídos?' : 'Voltar para Perícias',
        linhas: ['<b>' + esc(it.m['REQUERENTE'] || '') + '</b> · ' + esc(formatarCNJ(it.m['PROCESSO'])), 'O processo sai de ' + TITULO_ABA[state.ficha.aba] + ' e vai para <b>' + TITULO_ABA[para] + '</b>.']
          .concat(encerrar ? ['Ele deixa de aparecer nas Tarefas, no Painel e na Agenda. Dá para desfazer logo em seguida ou trazer de volta pelo Arquivo.'] : []),
        local: encerrar ? 'encerrar' : '', perigo: encerrar, botao: para === 'RENUNCIAS' ? 'Sim, registrar renúncia' : encerrar ? 'Sim, mover para Concluídos' : 'Confirmar',
        fn: () => mover(state.ficha.aba, it, para, para === 'RENUNCIAS' ? { 'STATUS': 'RENUNCIA', 'PROXIMO PASSO': 'RENUNCIEI' } : {}) };
      renderFicha();
      { const c = $('#confirma'); if (c) c.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
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
    case 'abrir-eproc': { // o link abre normalmente; aqui copia o número e orienta
      const atalho = document.documentElement.hasAttribute('data-eproc-atalho');
      const ajuda = !atalho && !(window.matchMedia && matchMedia('(pointer: coarse)').matches) ? { acao: { rot: 'Abrir direto', fn: abrirAjudaEproc }, tempo: 9000 } : { tempo: 6000 };
      const msg = atalho ? 'Abrindo o processo no eproc' : 'Número copiado: no eproc, é só colar na busca do topo';
      if (navigator.clipboard) navigator.clipboard.writeText(ds.txt).then(() => toast(msg, ajuda), () => toast(atalho ? msg : 'Busque no eproc: ' + ds.txt, ajuda));
      else toast(atalho ? msg : 'Busque no eproc: ' + ds.txt, ajuda);
      break;
    }
    case 'ajuda-eproc': abrirAjudaEproc(); break;
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
    case 'nav-mais': { const p = $('#nav-mais'); p.hidden = !p.hidden; break; }
    case 'tema': aplicarTema(temaAtual() === 'escuro' ? 'claro' : 'escuro'); break;
    case 't-nova': abrirNovaTarefa(''); break;
    case 'ficha-tarefa': { const it = fichaItem(); abrirNovaTarefa(it && it.aba === 'PERICIAS' ? it.m['PROCESSO'] : ''); break; }
    case 't-escopo': state.tEscopo = ds.k; render(); break;
    case 't-concluir': abrirFicha('PERICIAS', ds.linha); acaoRapida(ds.id); break;
    case 't-gerar': { abrirFicha('PERICIAS', ds.linha); const it = fichaItem(); if (it) abrirGerador(it); break; }
    case 'ficha-confirmar-ag': { const it = fichaItem(); if (it) pedirConfirmacaoAgenda(it); break; }
    case 'ficha-agendar': { const it = fichaItem(); const lv = ds.livre ? state.livres.find(x => String(x.linha) === ds.livre) : null; if (it) abrirSlot(null, '', { vincular: it, livre: lv }); break; }
    case 'novo-livres': abrirLivres(ds.dia || ''); break;
    case 'livre-usar': { const lv = state.livres.find(x => String(x.linha) === ds.linha); if (lv) escolherProcessoParaLivre(lv); break; }
    case 'livre-remover': {
      const lv = state.livres.find(x => String(x.linha) === ds.linha);
      if (!lv || !confirm('Apagar o horário livre de ' + lv.data + ' às ' + lv.hora + '?')) break;
      el.disabled = true;
      api('agendaRemover', { linha: lv.linha, horaEsperada: lv.hora }).then(j => {
        if (!j.ok) throw new Error(j.erro || 'Erro ao apagar');
        state.agenda = j.itens || state.agenda; state.livres = j.livres || [];
        render(); toast('Horário livre apagado');
      }).catch(e => { el.disabled = false; toast(e.message, { erro: true }); recarregar(true); });
      break;
    }
    case 't-feita': el.disabled = true; mudarTarefa('tarefaStatus', { id: ds.id, feita: true }, 'Tarefa concluída'); break;
    case 't-reabrir': mudarTarefa('tarefaStatus', { id: ds.id, feita: false }, 'Tarefa reaberta'); break;
    case 't-excluir': if (confirm('Excluir esta tarefa?')) mudarTarefa('tarefaExcluir', { id: ds.id }, 'Tarefa excluída'); break;
    case 't-ver-feitas': state.verFeitas = !state.verFeitas; render(); break;
    case 't-conf-todos': state.verTodasConf = !state.verTodasConf; render(); break;
    case 't-conf-recentes': state.verConfRecentes = !state.verConfRecentes; render(); break;
    case 't-verificado':
    case 'ficha-verificado':
      el.disabled = true;
      api('verificado', { processo: ds.proc }).then(j => {
        if (!j.ok) throw new Error(j.erro || 'Erro');
        const v = { quando: j.quando, por: j.por, nota: 'sem novidade' };
        state.verificados[digitos(ds.proc)] = v;
        render(); atualizarFichaAberta();
        toast('Conferido em ' + txtConferencia(v));
      }).catch(e => { el.disabled = false; toast(e.message, { erro: true }); });
      break;
    case 'gd-modelo': {
      const gd = state.gd;
      if (gd.rodando) break;
      gd.modeloId = ds.id; gd.pq = ''; gd.sel = {}; gd.resultados = [];
      const md = state.modelos.find(x => x.id === ds.id);
      processosParaModelo(md, ativos()).forEach(it => { gd.sel[it.linha] = true; });
      render();
      if (window.innerWidth < 1180) { const s = document.querySelectorAll('#conteudo .cartao')[1]; if (s) s.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      break;
    }
    case 'gd-todos': { const md = state.modelos.find(x => x.id === state.gd.modeloId); if (md) processosParaModelo(md, ativos()).forEach(it => { state.gd.sel[it.linha] = true; }); render(); break; }
    case 'doc-tab': state.docTab = ds.k === 'modelos' ? 'modelos' : 'gerar'; if (modal.open) modal.close(); render(); window.scrollTo(0, 0); break;
    case 'md-novo': abrirNovoModelo(); break;
    case 'md-config': abrirConfigModelo(ds.id); break;
    case 'md-duplicar': abrirDuplicarModelo(ds.id); break;
    case 'md-excluir': {
      const md = (state.modelos || []).find(x => x.id === ds.id);
      if (!md || !confirm('Mover "' + md.nome + '" para a lixeira do Drive? Dá para recuperar pela lixeira em até 30 dias.')) break;
      el.disabled = true;
      api('modeloExcluir', { id: md.id }).then(j => {
        if (!j.ok) throw new Error(j.erro || 'Erro ao excluir');
        aplicarModelos(j);
        if (state.gd.modeloId === md.id) { state.gd.modeloId = ''; state.gd.sel = {}; }
        render(); toast('Modelo enviado para a lixeira do Drive');
      }).catch(e => { el.disabled = false; toast(e.message, { erro: true }); });
      break;
    }
    case 'md-sugestao': {
      el.disabled = true; el.textContent = 'Criando...';
      api('modeloCriar', { sugestao: ds.k }).then(j => {
        if (!j.ok) throw new Error(j.erro || 'Erro ao criar o modelo');
        aplicarModelos(j); render();
        mostrarModeloCriado(j.novo, 'Modelo criado');
      }).catch(e => { el.disabled = false; el.textContent = 'Criar'; toast(e.message, { erro: true }); });
      break;
    }
    case 'ficha-sug': {
      const it = fichaItem();
      if (!it) break;
      const d = state.docs[chaveDocs(it)];
      if (d && !d.carregando && !d.erro && !d.pasta && d.candidatas && d.candidatas.length) {
        toast('Há pastas com nome parecido em ' + ((d.sugestao || {}).cidade || 'a cidade') + '. Vincule ou crie a pasta logo abaixo antes de gerar.', { erro: true });
        const b = $('#docs-bloco'); if (b) b.scrollIntoView({ behavior: 'smooth', block: 'start' });
        break;
      }
      modal.classList.remove('grande');
      $('#modal-titulo').textContent = 'Gerar documento';
      if (!modal.open) modal.showModal();
      gerarDocumento(it, ds.id);
      break;
    }
    case 'gd-nenhum': state.gd.sel = {}; render(); break;
    case 'gd-gerar': gerarLote(); break;
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
$('#btn-novo').addEventListener('click', () => {
  if (state.view === 'agenda' || state.view === 'calendario') abrirSlot(null, state.view === 'calendario' ? fmtData(new Date(state.cal.sel)) : '');
  else if (state.view === 'tarefas') abrirNovaTarefa('');
  else abrirNovoProcesso();
});
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
