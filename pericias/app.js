(function () {
'use strict';

/* ============ FUNÇÕES PURAS (testáveis) ============ */
function chave(v) { return String(v == null ? '' : v).normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toUpperCase(); }
function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

function parseData(txt) {
  const m = String(txt || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!m) return null;
  let a = +m[3]; if (a < 100) a += 2000;
  return new Date(a, +m[2] - 1, +m[1]);
}
function zeroHoje() { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function diasAte(d) { return Math.round((d - zeroHoje()) / 86400000); }
function fmtData(d) { return ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2) + '/' + d.getFullYear(); }
function fmtCurto(d) { return ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2); }
const DIAS_SEM = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
function txtDias(n) {
  if (n === 0) return 'hoje';
  if (n === 1) return 'amanhã';
  if (n < 0) return 'vencido há ' + (-n) + 'd';
  return 'em ' + n + 'd';
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

const PAGO_LIBERA = ['RESERVADO', 'MLE', 'OFICIO', 'PARCIAL', 'PAGO'];
function semReserva(m) {
  const passo = chave(m['PROXIMO PASSO']);
  return (passo === 'AGENDAMENTO' || passo === 'PERICIA') && PAGO_LIBERA.indexOf(chave(m['PAGO'])) < 0;
}

function somaMinutos(hhmm, min) {
  const m = String(hhmm || '').match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return '08:00';
  const t = (+m[1]) * 60 + (+m[2]) + min;
  return ('0' + Math.floor(t / 60) % 24).slice(-2) + ':' + ('0' + t % 60).slice(-2);
}

function isoParaBr(iso) { const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? m[3] + '/' + m[2] + '/' + m[1] : ''; }
function brParaIso(br) { const d = parseData(br); return d ? d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2) : ''; }

if (typeof document === 'undefined') {
  if (typeof module !== 'undefined') module.exports = { chave, parseData, classificar, semReserva, somaMinutos, isoParaBr, brParaIso, linhaMapa, diasAte, zeroHoje };
  return;
}

/* ============ ESTADO ============ */
const API = (window.PERICIAS_CONFIG || {}).API || '';
const $ = s => document.querySelector(s);
const ABAS_PLANILHA = ['PERICIAS', 'CONCLUSOS', 'RENUNCIAS'];
const TITULOS = { PERICIAS: 'Perícias', CONCLUSOS: 'Concluídos', RENUNCIAS: 'Renúncias' };
const state = {
  token: localStorage.getItem('pericias_token') || '',
  user: '',
  aba: 'painel',
  dados: {},
  agenda: null,
  filtro: { q: '', quem: '', passo: '' },
  verPassadas: false
};

/* ============ API ============ */
async function api(acao, extra) {
  if (!API || API.indexOf('COLE_AQUI') === 0) throw new Error('Falta colar a URL do Apps Script em config.js');
  let r;
  try {
    r = await fetch(API, { method: 'POST', redirect: 'follow', body: JSON.stringify(Object.assign({ acao: acao, token: state.token }, extra || {})) });
  } catch (e) {
    throw new Error('Sem conexão com o servidor.');
  }
  let j;
  try { j = await r.json(); } catch (e) { throw new Error('Resposta inválida do servidor.'); }
  if (j && j.erro === 'SESSAO') { sair(false); throw new Error('Sessão expirada. Entre novamente.'); }
  return j;
}

function toast(msg, erro) {
  const t = $('#aviso');
  t.textContent = msg;
  t.className = 'toast' + (erro ? ' erro' : '');
  t.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { t.hidden = true; }, erro ? 5000 : 2600);
}

/* ============ LOGIN ============ */
function mostrarLogin() { $('#tela-app').hidden = true; $('#tela-login').hidden = false; }
function mostrarApp() { $('#tela-login').hidden = true; $('#tela-app').hidden = false; $('#topo-user').textContent = state.user; }

function sair(avisarServidor) {
  if (avisarServidor && state.token) api('logout').catch(() => {});
  state.token = ''; state.dados = {}; state.agenda = null;
  localStorage.removeItem('pericias_token');
  mostrarLogin();
}

$('#form-login').addEventListener('submit', async ev => {
  ev.preventDefault();
  const btn = $('#lg-btn'), msg = $('#lg-msg');
  msg.textContent = ''; btn.disabled = true; btn.textContent = 'Entrando...';
  try {
    const j = await api('login', { usuario: $('#lg-user').value, senha: $('#lg-pass').value, token: '' });
    if (!j.ok) { msg.textContent = j.erro || 'Não foi possível entrar.'; return; }
    state.token = j.token; state.user = j.usuario;
    localStorage.setItem('pericias_token', j.token);
    $('#lg-pass').value = '';
    mostrarApp();
    await carregarTudo();
    ir('painel');
  } catch (e) {
    msg.textContent = e.message;
  } finally {
    btn.disabled = false; btn.textContent = 'Entrar';
  }
});

$('#btn-sair').addEventListener('click', () => sair(true));
$('#btn-atualizar').addEventListener('click', async () => { await carregarTudo(true); render(); toast('Dados atualizados'); });

/* ============ CARGA ============ */
async function carregarAba(aba) {
  const j = await api('listar', { aba: aba });
  if (!j.ok) throw new Error(j.erro || 'Erro ao ler ' + aba);
  state.dados[aba] = j;
}
async function carregarAgenda() {
  const j = await api('agenda');
  if (!j.ok) throw new Error(j.erro || 'Erro ao ler a agenda');
  state.agenda = j.itens;
}
async function carregarTudo(todas) {
  $('#conteudo').innerHTML = '<p class="carregando">Carregando...</p>';
  try {
    const tarefas = [carregarAba('PERICIAS'), carregarAgenda()];
    if (todas) ['CONCLUSOS', 'RENUNCIAS'].forEach(a => { if (state.dados[a]) tarefas.push(carregarAba(a)); });
    await Promise.all(tarefas);
  } catch (e) { toast(e.message, true); }
}

/* ============ NAVEGAÇÃO ============ */
$('#abas').addEventListener('click', ev => {
  const b = ev.target.closest('button[data-aba]');
  if (b) ir(b.dataset.aba);
});

async function ir(aba) {
  state.aba = aba;
  document.querySelectorAll('#abas button').forEach(b => b.classList.toggle('ativa', b.dataset.aba === aba));
  if (ABAS_PLANILHA.indexOf(aba) >= 0 && !state.dados[aba]) {
    $('#conteudo').innerHTML = '<p class="carregando">Carregando...</p>';
    try { await carregarAba(aba); } catch (e) { toast(e.message, true); }
  }
  render();
  window.scrollTo(0, 0);
}

function render() {
  if (state.aba === 'painel') return renderPainel();
  if (state.aba === 'agenda') return renderAgenda();
  return renderLista(state.aba);
}

/* ============ CARDS ============ */
function itens(aba) {
  const d = state.dados[aba];
  if (!d) return [];
  return d.linhas.map(l => {
    const m = linhaMapa(d.cabecalho, l.v);
    return { linha: l.linha, v: l.v, m: m, c: aba === 'PERICIAS' ? classificar(m) : { quem: null, acao: '' } };
  });
}

function tagPrazo(m) {
  const d = parseData(m['PRAZOS'] || m['PRAZO']);
  if (!d) return '';
  const n = diasAte(d);
  const cls = n < 0 ? 'urgente' : n <= 1 ? 'urgente' : n <= 5 ? 'alerta' : '';
  return '<span class="tag ' + cls + '">Prazo ' + fmtCurto(d) + ' (' + txtDias(n) + ')</span>';
}

function cardHtml(it, aba) {
  const m = it.m, c = it.c;
  const nome = m['REQUERENTE'] || m['PROCESSO'] || '(sem nome)';
  const quemCls = c.quem || (aba === 'PERICIAS' ? 'concluido' : 'concluido');
  const tags = [];
  if (m['PROXIMO PASSO']) tags.push('<span class="tag ' + (c.quem || '') + '">' + esc(m['PROXIMO PASSO']) + '</span>');
  if (c.quem === 'perito') tags.push('<span class="tag perito">Perito</span>');
  if (c.quem === 'assistente') tags.push('<span class="tag assistente">Assistente</span>');
  if (aba === 'PERICIAS') tags.push(tagPrazo(m));
  const pd = parseData(m['PERICIA']);
  if (pd) tags.push('<span class="tag">Perícia ' + fmtCurto(pd) + '</span>');
  else if (m['PERICIA']) tags.push('<span class="tag">' + esc(m['PERICIA']) + '</span>');
  if (m['PAGO']) tags.push('<span class="tag ' + (chave(m['PAGO']) === 'PAGO' ? 'ok' : 'dinheiro') + '">' + esc(m['PAGO']) + '</span>');
  if (m['HONORARIOS']) tags.push('<span class="tag">' + esc(m['HONORARIOS']) + '</span>');
  if (m['TIPO']) tags.push('<span class="tag">' + esc(m['TIPO']) + '</span>');
  if (aba === 'PERICIAS' && semReserva(m)) tags.push('<span class="tag urgente">Sem reserva de honorários</span>');
  return '<div class="card ' + quemCls + '" data-linha="' + it.linha + '">' +
    '<h3>' + esc(nome) + '</h3>' +
    '<div class="proc">' + esc(m['PROCESSO']) + (m['CIDADE'] ? ' · ' + esc(m['CIDADE']) : '') + '</div>' +
    '<div class="linha">' + tags.join('') + '</div>' +
    (m['OBSERVACAO'] ? '<div class="obs">' + esc(m['OBSERVACAO']) + '</div>' : '') +
    '</div>';
}

/* ============ PAINEL ============ */
function renderPainel() {
  const c = $('#conteudo');
  const pericias = itens('PERICIAS').filter(i => chave(i.m['STATUS']) !== 'RENUNCIA');
  const por = q => pericias.filter(i => i.c.quem === q);
  const perito = por('perito'), assist = por('assistente'), acomp = por('acompanhar');
  const hoje = zeroHoje();
  const agenda = (state.agenda || []).map(a => Object.assign({ d: parseData(a.data) }, a)).filter(a => a.d);
  const agendaHoje = agenda.filter(a => a.d.getTime() === hoje.getTime());
  const proximos = agenda.filter(a => { const n = diasAte(a.d); return n > 0 && n <= 14; });
  const prazos = pericias.filter(i => i.c.quem && i.c.quem !== 'acompanhar' && parseData(i.m['PRAZOS'] || i.m['PRAZO']))
    .map(i => Object.assign({ d: parseData(i.m['PRAZOS'] || i.m['PRAZO']) }, i))
    .filter(i => diasAte(i.d) <= 7).sort((a, b) => a.d - b.d);
  const alertas = pericias.filter(i => semReserva(i.m));

  let h = '<div class="kpis">' +
    '<div class="kpi perito" data-kpi="perito"><b>' + perito.length + '</b><span>Perito</span></div>' +
    '<div class="kpi assistente" data-kpi="assistente"><b>' + assist.length + '</b><span>Assistente</span></div>' +
    '<div class="kpi acompanhar" data-kpi="acompanhar"><b>' + acomp.length + '</b><span>Acompanhar</span></div></div>';
  if (alertas.length) h += '<div class="alerta-reserva"><b>' + alertas.length + '</b> com agendamento ou perícia sem honorários reservados. Não agendar antes do depósito.</div>';

  h += '<h2 class="secao">Perícias de hoje (' + agendaHoje.length + ')</h2>';
  h += agendaHoje.length ? agendaHoje.sort((a, b) => a.hora.localeCompare(b.hora)).map(slotHtml).join('') : '<p class="vazio">Nenhuma perícia hoje.</p>';

  h += '<h2 class="secao">Prazos até 7 dias (' + prazos.length + ')</h2>';
  h += prazos.length ? '<div class="grade">' + prazos.map(i => cardHtml(i, 'PERICIAS')).join('') + '</div>' : '<p class="vazio">Nenhum prazo próximo.</p>';

  h += '<h2 class="secao">Próximas perícias (14 dias)</h2>';
  h += proximos.length ? agrupaDias(proximos) : '<p class="vazio">Nada agendado.</p>';
  c.innerHTML = h;
}

function slotHtml(a) {
  const st = chave(a.status);
  return '<div class="slot" data-agenda-linha="' + a.linha + '"><div class="hora">' + esc(a.hora) + '</div><div class="info"><b>' + esc(a.nome) + '</b>' +
    '<small>' + esc(a.tipo) + (a.local ? ' · ' + esc(a.local) : '') + '</small></div>' +
    '<span class="tag ' + (st === 'OK' ? 'ok' : 'alerta') + '">' + esc(a.status || '?') + '</span></div>';
}

function agrupaDias(lista) {
  const g = {};
  lista.forEach(a => { (g[a.data] = g[a.data] || []).push(a); });
  return Object.keys(g).sort((x, y) => parseData(x) - parseData(y)).map(dia => {
    const d = parseData(dia), n = diasAte(d);
    const slots = g[dia].sort((a, b) => a.hora.localeCompare(b.hora));
    return '<div class="dia' + (n === 0 ? ' hoje' : '') + '"><h3><span>' + DIAS_SEM[d.getDay()] + ' ' + esc(dia) + '</span><span>' + slots.length + ' perícia(s)</span></h3>' +
      slots.map(slotHtml).join('') + '</div>';
  }).join('');
}

/* ============ LISTAS ============ */
function renderLista(aba) {
  const c = $('#conteudo');
  const todos = itens(aba);
  if (!state.dados[aba]) { c.innerHTML = '<p class="vazio">Sem dados.</p>'; return; }
  const q = chave(state.filtro.q);
  const passos = Array.from(new Set(todos.map(i => i.m['PROXIMO PASSO']).filter(Boolean))).sort();
  let lista = todos.filter(i => {
    if (aba === 'PERICIAS') {
      if (chave(i.m['STATUS']) === 'RENUNCIA') return false;
      if (state.filtro.quem && (i.c.quem || 'concluido') !== state.filtro.quem) return false;
    }
    if (state.filtro.passo && i.m['PROXIMO PASSO'] !== state.filtro.passo) return false;
    if (q && chave(i.v.join(' ')).indexOf(q) < 0) return false;
    return true;
  });
  if (aba === 'PERICIAS') {
    const key = i => { const d = parseData(i.m['PRAZOS'] || i.m['PRAZO']); return d ? d.getTime() : Infinity; };
    lista.sort((a, b) => key(a) - key(b) || a.linha - b.linha);
  } else {
    lista.sort((a, b) => b.linha - a.linha);
  }

  let h = '<div class="barra"><input type="search" id="f-q" placeholder="Buscar nome, processo, cidade..." value="' + esc(state.filtro.q) + '">';
  if (aba === 'PERICIAS') {
    h += '<select id="f-quem"><option value="">Todos</option>' +
      [['perito', 'Perito'], ['assistente', 'Assistente'], ['acompanhar', 'Acompanhar'], ['concluido', 'Concluído']]
        .map(o => '<option value="' + o[0] + '"' + (state.filtro.quem === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select>';
  }
  h += '<select id="f-passo"><option value="">Todos os passos</option>' +
    passos.map(p => '<option' + (state.filtro.passo === p ? ' selected' : '') + '>' + esc(p) + '</option>').join('') + '</select></div>';
  h += '<p class="vazio" style="margin:0 0 8px">' + lista.length + ' de ' + todos.length + ' registros</p>';
  h += '<div class="grade">' + (lista.length ? lista.map(i => cardHtml(i, aba)).join('') : '<p class="vazio">Nada encontrado.</p>') + '</div>';
  h += '<button class="btn ouro fab" id="btn-novo">+ Novo</button>';
  c.innerHTML = h;

  const q1 = $('#f-q');
  q1.addEventListener('input', () => {
    state.filtro.q = q1.value;
    const pos = q1.selectionStart;
    renderLista(aba);
    const n = $('#f-q'); n.focus(); n.setSelectionRange(pos, pos);
  });
  if ($('#f-quem')) $('#f-quem').addEventListener('change', e => { state.filtro.quem = e.target.value; renderLista(aba); });
  $('#f-passo').addEventListener('change', e => { state.filtro.passo = e.target.value; renderLista(aba); });
  $('#btn-novo').addEventListener('click', () => abrirRegistro(aba, null));
}

$('#conteudo').addEventListener('click', ev => {
  const kpi = ev.target.closest('[data-kpi]');
  if (kpi) { state.filtro = { q: '', quem: kpi.dataset.kpi, passo: '' }; ir('PERICIAS'); return; }
  const slot = ev.target.closest('[data-agenda-linha]');
  if (slot) { const a = (state.agenda || []).find(x => String(x.linha) === slot.dataset.agendaLinha); if (a) abrirSlot(a, null); return; }
  const addDia = ev.target.closest('[data-add-dia]');
  if (addDia) { abrirSlot(null, addDia.dataset.addDia); return; }
  const card = ev.target.closest('.card[data-linha]');
  if (card) {
    const aba = ABAS_PLANILHA.indexOf(state.aba) >= 0 ? state.aba : 'PERICIAS'; // cards do painel são de PERICIAS
    const it = itens(aba).find(i => String(i.linha) === card.dataset.linha);
    if (it) abrirRegistro(aba, it);
  }
});

/* ============ MODAL ============ */
const modal = $('#modal');
$('#modal-fechar').addEventListener('click', () => modal.close());
modal.addEventListener('click', ev => { if (ev.target === modal) modal.close(); });
$('#modal-form').addEventListener('submit', ev => ev.preventDefault());

const OPCOES = {
  SISTEMA: ['ESAJ', 'EPROC'],
  STATUS: ['ACEITE', 'AGUARDANDO', 'RENUNCIA'],
  PAGO: ['RESERVADO', 'MLE', 'OFÍCIO', 'PARCIAL', 'PAGO'],
  'PROXIMO PASSO': ['ACEITE', 'AGENDAMENTO', 'PETIÇÃO', 'RENUNCIAR', 'LAUDO', 'PERICIA', 'ESCLARECIMENTOS', 'DECISÃO', 'RESERVA', 'PAGAMENTO'],
  LAUDO: ['PRODUÇÃO', 'ENTREGUE'],
  PERICIA: ['INDIRETA']
};
const LARGOS = ['REQUERENTE', 'REQUERIDA', 'OBSERVACAO', 'FORUM', 'CIDADE'];

function opcoesCampo(aba, cabNorm) {
  const base = (OPCOES[cabNorm] || []).slice();
  if (['SISTEMA', 'STATUS', 'PAGO', 'PROXIMO PASSO', 'LAUDO', 'TIPO', 'PERICIA'].indexOf(cabNorm) < 0) return null;
  const d = state.dados[aba];
  if (d) {
    const i = d.cabecalho.findIndex(h => chave(h) === cabNorm);
    if (i >= 0) d.linhas.forEach(l => {
      const v = (l.v[i] || '').trim();
      if (!v) return;
      if (cabNorm === 'PERICIA' && parseData(v)) return;
      if (base.map(chave).indexOf(chave(v)) < 0) base.push(v);
    });
  }
  return base;
}

function abrirRegistro(aba, it) {
  const d = state.dados[aba];
  const novo = !it;
  $('#modal-titulo').textContent = (novo ? 'Novo em ' : '') + TITULOS[aba] + (novo ? '' : ': ' + (it.m['REQUERENTE'] || it.m['PROCESSO']));
  const orig = {};
  let corpo = '';
  d.cabecalho.forEach((h, idx) => {
    const n = chave(h);
    const val = novo ? '' : (it.v[idx] || '');
    orig[h] = val;
    const ops = opcoesCampo(aba, n);
    const id = 'cp-' + idx;
    const largo = LARGOS.indexOf(n) >= 0 ? ' largo' : '';
    let ctl;
    if (n === 'OBSERVACAO') ctl = '<textarea id="' + id + '" data-h="' + esc(h) + '">' + esc(val) + '</textarea>';
    else ctl = '<input id="' + id + '" data-h="' + esc(h) + '" value="' + esc(val) + '"' + (ops ? ' list="dl-' + idx + '"' : '') +
      (/^(PRAZOS?|INTIMACAO)$/.test(n) ? ' placeholder="dd/mm/aaaa" inputmode="numeric"' : '') +
      (n === 'PROCESSO' ? ' inputmode="numeric" placeholder="0000000-00.0000.8.26.0000"' : '') + ' autocomplete="off">';
    if (ops) ctl += '<datalist id="dl-' + idx + '">' + ops.map(o => '<option value="' + esc(o) + '">').join('') + '</datalist>';
    corpo += '<div class="campo' + largo + '"><label for="' + id + '">' + esc(h) + '</label>' + ctl + '</div>';
  });
  $('#modal-corpo').innerHTML = corpo;

  const mudancas = () => {
    const mud = {};
    $('#modal-corpo').querySelectorAll('[data-h]').forEach(el => {
      const mudou = el.value !== orig[el.dataset.h];
      el.closest('.campo').classList.toggle('mudou', mudou);
      if (mudou) mud[el.dataset.h] = el.value.trim();
    });
    return mud;
  };
  $('#modal-corpo').oninput = mudancas;

  let rod = '<button type="button" class="btn primario" id="m-salvar">Salvar</button>';
  if (!novo) {
    if (aba === 'PERICIAS') rod += '<span class="esp"></span><button type="button" class="btn" id="m-concluir">Mover para Concluídos</button><button type="button" class="btn perigo" id="m-renunciei">Renunciei</button>';
    else rod += '<span class="esp"></span><button type="button" class="btn" id="m-voltar">Voltar para Perícias</button>';
  }
  $('#modal-rodape').innerHTML = rod;

  $('#m-salvar').onclick = async ev => {
    const btn = ev.target;
    let dados = mudancas();
    if (novo) {
      dados = {};
      $('#modal-corpo').querySelectorAll('[data-h]').forEach(el => { if (el.value.trim()) dados[el.dataset.h] = el.value.trim(); });
    } else if (!Object.keys(dados).length) { modal.close(); return; }
    btn.disabled = true;
    try {
      const req = { aba: aba, dados: dados };
      if (!novo) { req.linha = it.linha; req.processoEsperado = it.m['PROCESSO']; }
      let j = await api('salvar', req);
      if (!j.ok && j.erro === 'DUPLICADO') {
        if (!confirm('Esse processo já está cadastrado em ' + TITULOS[j.onde] + '. Cadastrar mesmo assim?')) { btn.disabled = false; return; }
        req.forcar = true;
        j = await api('salvar', req);
      }
      if (!j.ok) throw new Error(j.erro === 'CONFLITO' ? 'A planilha foi alterada por outra pessoa. Atualize e tente de novo.' : (j.erro || 'Erro ao salvar'));
      modal.close();
      await carregarAba(aba);
      render();
      toast(novo ? 'Registro criado' : 'Alterações salvas');
    } catch (e) { toast(e.message, true); btn.disabled = false; }
  };

  const mover = (para, extra, pergunta) => async () => {
    if (Object.keys(mudancas()).length) { toast('Salve ou desfaça as alterações antes de mover.', true); return; }
    if (!confirm(pergunta)) return;
    try {
      const j = await api('mover', { de: aba, para: para, linha: it.linha, processoEsperado: it.m['PROCESSO'], extra: extra || {} });
      if (!j.ok) throw new Error(j.erro === 'CONFLITO' ? 'A planilha foi alterada. Atualize e tente de novo.' : (j.erro || 'Erro ao mover'));
      modal.close();
      await Promise.all([carregarAba(aba), state.dados[para] ? carregarAba(para) : Promise.resolve()]);
      render();
      toast('Movido para ' + TITULOS[para]);
    } catch (e) { toast(e.message, true); }
  };
  if ($('#m-concluir')) $('#m-concluir').onclick = mover('CONCLUSOS', {}, 'Mover este processo para Concluídos?');
  if ($('#m-renunciei')) $('#m-renunciei').onclick = mover('RENUNCIAS', { STATUS: 'RENUNCIA', 'PRÓXIMO PASSO': 'RENUNCIEI' }, 'Registrar a renúncia e mover este processo para Renúncias?');
  if ($('#m-voltar')) $('#m-voltar').onclick = mover('PERICIAS', {}, 'Voltar este processo para Perícias?');

  modal.showModal();
}

/* ============ AGENDA ============ */
function renderAgenda() {
  const c = $('#conteudo');
  const todos = (state.agenda || []).filter(a => parseData(a.data));
  const futuros = todos.filter(a => diasAte(parseData(a.data)) >= 0);
  const passados = todos.filter(a => diasAte(parseData(a.data)) < 0);
  let h = '<div class="barra"><button class="btn ouro" id="ag-novo">+ Novo horário</button>' +
    '<button class="btn" id="ag-passadas">' + (state.verPassadas ? 'Ocultar' : 'Ver') + ' passadas (' + passados.length + ')</button></div>';
  h += futuros.length ? agrupaDiasComAdd(futuros) : '<p class="vazio">Nenhuma perícia agendada daqui para frente.</p>';
  if (state.verPassadas) h += '<h2 class="secao">Passadas</h2>' + agrupaDiasComAdd(passados.slice().reverse(), true);
  c.innerHTML = h;
  $('#ag-novo').addEventListener('click', () => abrirSlot(null, ''));
  $('#ag-passadas').addEventListener('click', () => { state.verPassadas = !state.verPassadas; renderAgenda(); });
}

function agrupaDiasComAdd(lista, desc) {
  const g = {};
  lista.forEach(a => { (g[a.data] = g[a.data] || []).push(a); });
  let dias = Object.keys(g).sort((x, y) => parseData(x) - parseData(y));
  if (desc) dias.reverse();
  return dias.map(dia => {
    const d = parseData(dia), n = diasAte(d);
    const slots = g[dia].sort((a, b) => a.hora.localeCompare(b.hora));
    return '<div class="dia' + (n === 0 ? ' hoje' : '') + '"><h3><span>' + DIAS_SEM[d.getDay()] + ' ' + esc(dia) + ' · ' + slots.length + '</span>' +
      '<button type="button" class="btn pequeno" data-add-dia="' + esc(dia) + '">+ horário</button></h3>' + slots.map(slotHtml).join('') + '</div>';
  }).join('');
}

function abrirSlot(a, diaPadrao) {
  const novo = !a;
  const lista = state.agenda || [];
  let dia = novo ? (diaPadrao || '') : a.data;
  if (novo && !dia) {
    const prox = lista.filter(x => parseData(x.data) && diasAte(parseData(x.data)) >= 0).sort((x, y) => parseData(x.data) - parseData(y.data))[0];
    dia = prox ? prox.data : fmtData(zeroHoje());
  }
  const doDia = lista.filter(x => x.data === dia).sort((x, y) => x.hora.localeCompare(y.hora));
  const horaPadrao = novo ? (doDia.length ? somaMinutos(doDia[doDia.length - 1].hora, 15) : '08:00') : a.hora;
  const base = novo ? { hora: horaPadrao, nome: '', tipo: doDia.length ? doDia[doDia.length - 1].tipo : 'INSS', status: 'OK', local: doDia.length ? doDia[doDia.length - 1].local : 'CONSULTORIO' } : a;

  const aguardando = itens('PERICIAS').filter(i => chave(i.m['PROXIMO PASSO']) === 'AGENDAMENTO').map(i => i.m['REQUERENTE']).filter(Boolean);
  $('#modal-titulo').textContent = novo ? 'Novo horário' : 'Horário: ' + a.nome;
  $('#modal-corpo').oninput = null;
  $('#modal-corpo').innerHTML =
    '<div class="campo"><label for="ag-data">Data</label>' + (novo ? '<input id="ag-data" type="date" value="' + brParaIso(dia) + '">' : '<input id="ag-data" value="' + esc(dia) + '" disabled>') + '</div>' +
    '<div class="campo"><label for="ag-hora">Hora</label><input id="ag-hora" value="' + esc(base.hora) + '" placeholder="08:00" inputmode="numeric"></div>' +
    '<div class="campo largo"><label for="ag-nome">Periciando</label><input id="ag-nome" value="' + esc(base.nome) + '" list="dl-ag" autocomplete="off"><datalist id="dl-ag">' + aguardando.map(n => '<option value="' + esc(n) + '">').join('') + '</datalist></div>' +
    '<div class="campo"><label for="ag-tipo">Tipo</label><input id="ag-tipo" value="' + esc(base.tipo) + '" list="dl-tipo"><datalist id="dl-tipo">' + ['INSS', 'ERRO MÉDICO', 'INTERDIÇÃO', 'DANOS MORAIS', 'OUTROS'].map(o => '<option value="' + o + '">').join('') + '</datalist></div>' +
    '<div class="campo"><label for="ag-status">Status</label><input id="ag-status" value="' + esc(base.status) + '" list="dl-st"><datalist id="dl-st"><option value="OK"><option value="AGENDAR"></datalist></div>' +
    '<div class="campo largo"><label for="ag-local">Local</label><input id="ag-local" value="' + esc(base.local) + '" placeholder="CONSULTORIO ou endereço"></div>';
  $('#modal-rodape').innerHTML = '<button type="button" class="btn primario" id="ag-salvar">Salvar</button>';
  if (novo && !aguardando.length) { /* sem sugestões */ }

  // ao trocar a data de um novo horário, sugere a próxima hora livre daquele dia
  if (novo) $('#ag-data').addEventListener('change', e => {
    const br = isoParaBr(e.target.value);
    const dd = lista.filter(x => x.data === br).sort((x, y) => x.hora.localeCompare(y.hora));
    $('#ag-hora').value = dd.length ? somaMinutos(dd[dd.length - 1].hora, 15) : '08:00';
  });

  $('#ag-salvar').onclick = async ev => {
    const btn = ev.target;
    const hora = $('#ag-hora').value.trim();
    if (!/^\d{1,2}:\d{2}$/.test(hora)) { toast('Hora no formato 08:00', true); return; }
    const dados = { hora: ('0' + hora).slice(-5), nome: $('#ag-nome').value.trim(), tipo: $('#ag-tipo').value.trim(), status: $('#ag-status').value.trim(), local: $('#ag-local').value.trim() };
    if (!dados.nome) { toast('Informe o periciando', true); return; }
    const req = { dados: dados };
    if (novo) {
      dados.data = isoParaBr($('#ag-data').value);
      if (!dados.data) { toast('Escolha a data', true); return; }
      const jaTem = lista.some(x => x.data === dados.data && x.hora === dados.hora);
      if (jaTem && !confirm('Já existe alguém às ' + dados.hora + ' nesse dia. Adicionar mesmo assim?')) return;
    } else { req.linha = a.linha; req.nomeEsperado = a.nome; }
    btn.disabled = true;
    try {
      const j = await api('agendaSalvar', req);
      if (!j.ok) throw new Error(j.erro === 'CONFLITO' ? 'A agenda foi alterada. Atualize e tente de novo.' : (j.erro || 'Erro ao salvar'));
      modal.close();
      await carregarAgenda();
      render();
      toast('Agenda atualizada');
    } catch (e) { toast(e.message, true); btn.disabled = false; }
  };
  modal.showModal();
}

/* ============ INÍCIO ============ */
async function iniciar() {
  if (!state.token) { mostrarLogin(); return; }
  try {
    const j = await api('me');
    if (!j.ok) { mostrarLogin(); return; }
    state.user = j.usuario;
    mostrarApp();
    await carregarTudo();
    ir('painel');
  } catch (e) {
    mostrarLogin();
    $('#lg-msg').textContent = e.message;
  }
}
iniciar();

})();
