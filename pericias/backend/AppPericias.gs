/**
 * APP PERÍCIAS: backend (Google Apps Script)
 *
 * Fica no MESMO projeto do script do Discord (planilha PERICIAS), como um arquivo separado.
 * Não altera o script do Discord: lê e grava nas abas pelo nome das colunas e reaproveita
 * as funções de envio que já existem lá (enviarMensagemManual, resumoDiario etc.).
 *
 * Segurança:
 *  - Usuários e senhas ficam em Propriedades do Script (senha só como hash com sal), nunca no código.
 *  - Todo acesso a dados exige uma sessão válida (token). Sem login, nada é devolvido.
 *  - 5 senhas erradas seguidas bloqueiam o usuário por 15 minutos.
 *
 * Histórico: cada alteração feita pelo app é registrada na aba HISTORICO (criada sozinha).
 */

const APP_ABAS = ['PERICIAS', 'CONCLUSOS', 'RENUNCIAS'];
const APP_ABA_AGENDA = 'AGENDAMENTOS';
const APP_ABA_LOG = 'HISTORICO';
// Usuários com perfil de PERITO: veem a página Gestão (valores totais, projeção e equipe).
// Todos os outros entram como ASSISTENTE (operacional, sem totais).
const APP_ADMINS = ['bruno'];
const APP_SESSAO_DIAS = 14;
const APP_MAX_ERROS = 5;
const APP_ITER_HASH = 500;

// -------------------- ENTRADA --------------------
function doGet() {
  return ContentService.createTextOutput('App Perícias: ok');
}

function doPost(e) {
  let saida;
  try {
    const req = JSON.parse(e.postData.contents);
    saida = appRotear_(req);
  } catch (err) {
    saida = { ok: false, erro: String(err && err.message ? err.message : err) };
  }
  return ContentService.createTextOutput(JSON.stringify(saida)).setMimeType(ContentService.MimeType.JSON);
}

function appRotear_(req) {
  if (req.acao === 'login') return appLogin_(req.usuario, req.senha);
  const usuario = appValidarSessao_(req.token);
  if (!usuario) return { ok: false, erro: 'SESSAO' };
  switch (req.acao) {
    case 'me': return { ok: true, usuario: usuario, papel: appPapel_(usuario) };
    case 'logout': appEncerrarSessao_(req.token); return { ok: true };
    case 'inicial': return appInicial_(usuario);
    case 'gestao': return appPapel_(usuario) === 'perito' ? appGestao_() : { ok: false, erro: 'Sem permissão para a Gestão.' };
    case 'listar': return appListar_(req.aba);
    case 'salvar': return appComTrava_(() => appSalvar_(req, usuario));
    case 'mover': return appComTrava_(() => appMover_(req, usuario));
    case 'agenda': return appAgenda_();
    case 'agendaSalvar': return appComTrava_(() => appAgendaSalvar_(req, usuario));
    case 'agendar': return appComTrava_(() => appAgendar_(req, usuario));
    case 'historico': return appHistorico_(req.processo);
    case 'atividade': return { ok: true, itens: appAtividade_(60) };
    case 'discordCanais': return { ok: true, canais: appDiscordCanais_() };
    case 'discordEnviar': return appDiscordEnviar_(req, usuario);
    case 'discordRotina': return appDiscordRotina_(req.rotina, usuario);
    case 'tarefaCriar': return appComTrava_(() => appTarefaCriar_(req, usuario));
    case 'tarefaStatus': return appComTrava_(() => appTarefaStatus_(req, usuario));
    case 'tarefaExcluir': return appComTrava_(() => appTarefaExcluir_(req, usuario));
    case 'verificado': return appVerificado_(req, usuario);
    case 'docs': return appDocs_(req);
    case 'pastaVincular': return appComTrava_(() => appPastaVincular_(req, usuario));
    case 'pastaCriar': return appComTrava_(() => appPastaCriar_(req, usuario));
    case 'modelos': return appModelos_();
    case 'modeloSalvar': return appComTrava_(() => appModeloSalvar_(req, usuario));
    case 'modeloDuplicar': return appComTrava_(() => appModeloDuplicar_(req, usuario));
    case 'modeloCriar': return appComTrava_(() => appModeloCriar_(req, usuario));
    case 'modeloExcluir': return appPapel_(usuario) === 'perito' ? appComTrava_(() => appModeloExcluir_(req, usuario)) : { ok: false, erro: 'Só o perito pode excluir modelos.' };
    case 'gerarDoc': return appGerarDoc_(req, usuario);
    case 'upload': return appUpload_(req, usuario);
    default: return { ok: false, erro: 'Ação desconhecida' };
  }
}

function appComTrava_(fn) {
  const trava = LockService.getScriptLock();
  if (!trava.tryLock(30000)) return { ok: false, erro: 'Planilha ocupada, tente de novo em instantes.' };
  try { return fn(); } finally { trava.releaseLock(); }
}

// tudo que a tela precisa ao abrir, numa chamada só
function appInicial_(usuario) {
  const abas = {};
  APP_ABAS.forEach(n => { abas[n] = appListar_(n); });
  let canais = [];
  try { canais = appDiscordCanais_(); } catch (e) {}
  return {
    ok: true,
    usuario: usuario,
    papel: appPapel_(usuario),
    abas: abas,
    agenda: appAgenda_().itens,
    atividade: appAtividade_(60),
    tarefas: appTarefas_(),
    verificados: appVerificados_(),
    usuarios: appUsuarios_(),
    canais: canais,
    hora: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'HH:mm')
  };
}

// -------------------- USUÁRIOS E SESSÃO --------------------
// Rode pelo menu da planilha (item "App: criar ou trocar senha de usuário").
function appCriarUsuarioDialogo() {
  const ui = SpreadsheetApp.getUi();
  const u = ui.prompt('Usuário', 'Nome de usuário (sem espaços), por exemplo: bruno', ui.ButtonSet.OK_CANCEL);
  if (u.getSelectedButton() !== ui.Button.OK) return;
  const usuario = u.getResponseText().trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,30}$/.test(usuario)) { ui.alert('Use de 3 a 30 letras minúsculas, números, ponto, hífen ou sublinhado.'); return; }
  const s = ui.prompt('Senha de ' + usuario, 'Mínimo de 8 caracteres. Se o usuário já existe, a senha é trocada.', ui.ButtonSet.OK_CANCEL);
  if (s.getSelectedButton() !== ui.Button.OK) return;
  const senha = s.getResponseText();
  if (senha.length < 8) { ui.alert('Senha curta demais. Nada foi salvo.'); return; }
  const sal = Utilities.getUuid();
  PropertiesService.getScriptProperties().setProperty('USR_' + usuario, JSON.stringify({ sal: sal, hash: appHash_(senha, sal) }));
  ui.alert('Usuário "' + usuario + '" salvo.');
}

function appHash_(senha, sal) {
  let h = sal + ':' + senha;
  for (let i = 0; i < APP_ITER_HASH; i++) {
    h = appHex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, h + sal, Utilities.Charset.UTF_8));
  }
  return h;
}

function appHex_(bytes) {
  return bytes.map(b => ('0' + (b < 0 ? b + 256 : b).toString(16)).slice(-2)).join('');
}

function appLogin_(usuario, senha) {
  usuario = String(usuario || '').trim().toLowerCase();
  senha = String(senha || '');
  const cache = CacheService.getScriptCache();
  const chaveErros = 'ERR_' + usuario;
  const erros = Number(cache.get(chaveErros) || 0);
  if (erros >= APP_MAX_ERROS) return { ok: false, erro: 'Muitas tentativas. Aguarde 15 minutos.' };

  const props = PropertiesService.getScriptProperties();
  const reg = props.getProperty('USR_' + usuario);
  let valido = false;
  if (reg) {
    const r = JSON.parse(reg);
    valido = appHash_(senha, r.sal) === r.hash;
  } else {
    appHash_(senha, 'x'); // mesmo tempo de resposta quando o usuário não existe
  }
  if (!valido) {
    cache.put(chaveErros, String(erros + 1), 900);
    return { ok: false, erro: 'Usuário ou senha incorretos.' };
  }
  cache.remove(chaveErros);
  appLimparSessoes_();
  const token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  const exp = Date.now() + APP_SESSAO_DIAS * 86400000;
  props.setProperty('S_' + token, JSON.stringify({ u: usuario, exp: exp }));
  return { ok: true, token: token, usuario: usuario, papel: appPapel_(usuario) };
}

function appPapel_(usuario) { return APP_ADMINS.indexOf(String(usuario || '').toLowerCase()) >= 0 ? 'perito' : 'assistente'; }

// -------------------- GESTÃO (só perito): atividade da equipe a partir do HISTORICO --------------------
function appGestao_() {
  const log = appLerLog_();
  const agora = Date.now(), DIA = 86400000;
  const quando = s => { const m = String(s).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?: (\d{1,2}):(\d{2}))?/); return m ? new Date(+m[3], +m[2] - 1, +m[1], +(m[4] || 0), +(m[5] || 0)).getTime() : 0; };
  const equipe = {}, acoes = {}, semanas = [];
  for (let i = 7; i >= 0; i--) semanas.push({ ini: agora - (i + 1) * 7 * DIA, fim: agora - i * 7 * DIA, n: 0, porUsuario: {} });
  log.forEach(x => {
    const t = quando(x.data), u = x.usuario || '?';
    const o = equipe[u] = equipe[u] || { usuario: u, papel: appPapel_(u), d7: 0, d30: 0, total: 0, ultima: 0, ultimaAcao: '' };
    o.total++;
    if (agora - t <= 7 * DIA) o.d7++;
    if (agora - t <= 30 * DIA) {
      o.d30++;
      const k = String(x.acao).replace(/\s*\(.*\)$/, '').replace(/^Etapa: .*/, 'Mudança de etapa');
      acoes[k] = (acoes[k] || 0) + 1;
    }
    if (t >= o.ultima) { o.ultima = t; o.ultimaAcao = x.acao; }
    semanas.forEach(s => { if (t > s.ini && t <= s.fim) { s.n++; s.porUsuario[u] = (s.porUsuario[u] || 0) + 1; } });
  });
  return {
    ok: true,
    equipe: Object.keys(equipe).map(k => equipe[k]).sort((a, b) => b.d30 - a.d30),
    acoes: Object.keys(acoes).map(k => ({ acao: k, n: acoes[k] })).sort((a, b) => b.n - a.n),
    semanas: semanas.map(s => ({ fim: s.fim, n: s.n, porUsuario: s.porUsuario })),
    desde: log.length ? log[0].data : ''
  };
}

function appValidarSessao_(token) {
  if (!token || typeof token !== 'string' || token.length < 32) return null;
  const v = PropertiesService.getScriptProperties().getProperty('S_' + token);
  if (!v) return null;
  const s = JSON.parse(v);
  if (s.exp < Date.now()) { appEncerrarSessao_(token); return null; }
  return s.u;
}

function appEncerrarSessao_(token) {
  if (token) PropertiesService.getScriptProperties().deleteProperty('S_' + token);
}

function appLimparSessoes_() {
  const props = PropertiesService.getScriptProperties();
  const todas = props.getProperties();
  Object.keys(todas).forEach(k => {
    if (k.indexOf('S_') !== 0) return;
    try { if (JSON.parse(todas[k]).exp < Date.now()) props.deleteProperty(k); } catch (e) { props.deleteProperty(k); }
  });
}

// -------------------- LEITURA --------------------
function appChave_(v) { return String(v == null ? '' : v).normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toUpperCase(); }
function appTem_(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }

function appAba_(nome) {
  if (APP_ABAS.indexOf(nome) < 0) throw new Error('Aba inválida');
  const aba = SpreadsheetApp.getActive().getSheetByName(nome);
  if (!aba) throw new Error('Aba não encontrada: ' + nome);
  return aba;
}

// cabeçalho = células preenchidas da linha 1 (ignora colunas vazias do fim)
function appCabecalho_(aba) {
  const l = aba.getRange(1, 1, 1, aba.getLastColumn()).getDisplayValues()[0];
  let n = l.length;
  while (n > 0 && !String(l[n - 1]).trim()) n--;
  return l.slice(0, n).map(x => String(x).trim());
}

function appListar_(nome) {
  const aba = appAba_(nome);
  const cab = appCabecalho_(aba);
  const ult = aba.getLastRow();
  const linhas = [];
  if (ult > 1) {
    const dados = aba.getRange(2, 1, ult - 1, cab.length).getDisplayValues();
    dados.forEach((l, i) => {
      if (l.every(c => !String(c).trim())) return;
      linhas.push({ linha: i + 2, v: l.map(c => String(c)) });
    });
  }
  return { ok: true, aba: nome, cabecalho: cab, linhas: linhas };
}

// -------------------- GRAVAÇÃO --------------------
// números longos só com dígitos (ex.: processo sem máscara) ficam como texto, para o Sheets não estragar
function appLongoNumerico_(v) { return /^\d{9,}$/.test(String(v == null ? '' : v).trim()); }

function appEscrever_(rg, v) {
  const s = String(v == null ? '' : v);
  if (appLongoNumerico_(s)) rg.setNumberFormat('@');
  rg.setValue(s);
}

function appIndiceProcesso_(cab) {
  const i = cab.map(appChave_).indexOf('PROCESSO');
  if (i < 0) throw new Error('Coluna PROCESSO não encontrada');
  return i;
}

function appProcessoExiste_(numero) {
  const alvo = String(numero).replace(/\D/g, '');
  if (!alvo) return null;
  for (const nome of APP_ABAS) {
    const aba = SpreadsheetApp.getActive().getSheetByName(nome);
    if (!aba || aba.getLastRow() < 2) continue;
    const cab = appCabecalho_(aba);
    const col = appIndiceProcesso_(cab) + 1;
    const vals = aba.getRange(2, col, aba.getLastRow() - 1, 1).getDisplayValues();
    for (let i = 0; i < vals.length; i++) if (String(vals[i][0]).replace(/\D/g, '') === alvo) return nome;
  }
  return null;
}

function appSalvar_(req, usuario) {
  const aba = appAba_(req.aba);
  const cab = appCabecalho_(aba);
  const dados = req.dados || {};
  const iProc = appIndiceProcesso_(cab);

  if (req.linha) { // editar
    const linha = Number(req.linha);
    if (linha < 2 || linha > aba.getLastRow()) return { ok: false, erro: 'CONFLITO' };
    const antes = aba.getRange(linha, 1, 1, cab.length).getDisplayValues()[0];
    const atual = String(antes[iProc]).trim();
    if (atual !== String(req.processoEsperado || '').trim()) return { ok: false, erro: 'CONFLITO' };
    const mud = [];
    cab.forEach((nome, i) => {
      if (!appTem_(dados, nome)) return;
      const novo = String(dados[nome] == null ? '' : dados[nome]).trim();
      if (novo === String(antes[i]).trim()) return;
      appEscrever_(aba.getRange(linha, i + 1), novo);
      mud.push(nome + ': ' + (String(antes[i]).trim() || 'vazio') + ' → ' + (novo || 'vazio'));
    });
    if (mud.length) appLog_(usuario, atual, req.motivo || 'Edição (' + req.aba + ')', mud.join('; '));
    return { ok: true, linha: linha, mudancas: mud.length };
  }

  // criar
  const proc = String(dados[cab[iProc]] || '').trim();
  if (!proc) return { ok: false, erro: 'Informe o número do processo.' };
  if (!req.forcar) {
    const onde = appProcessoExiste_(proc);
    if (onde) return { ok: false, erro: 'DUPLICADO', onde: onde };
  }
  const linhaNova = aba.getLastRow() + 1;
  const valores = cab.map(nome => appTem_(dados, nome) ? String(dados[nome] == null ? '' : dados[nome]).trim() : '');
  valores.forEach((v, i) => { if (appLongoNumerico_(v)) aba.getRange(linhaNova, i + 1).setNumberFormat('@'); });
  aba.getRange(linhaNova, 1, 1, cab.length).setValues([valores]);
  appLog_(usuario, proc, 'Cadastro (' + req.aba + ')', cab.filter((n, i) => valores[i]).map((n, i) => n).join(', '));
  return { ok: true, linha: linhaNova };
}

// copia a linha para a aba de destino pelos nomes das colunas e remove da origem
function appMover_(req, usuario) {
  if (req.de === req.para) return { ok: false, erro: 'Origem e destino iguais.' };
  const de = appAba_(req.de), para = appAba_(req.para);
  const cabDe = appCabecalho_(de), cabPara = appCabecalho_(para);
  const linha = Number(req.linha);
  if (linha < 2 || linha > de.getLastRow()) return { ok: false, erro: 'CONFLITO' };
  const origem = de.getRange(linha, 1, 1, cabDe.length).getValues()[0];
  const proc = String(de.getRange(linha, appIndiceProcesso_(cabDe) + 1).getDisplayValue()).trim();
  if (proc !== String(req.processoEsperado || '').trim()) return { ok: false, erro: 'CONFLITO' };

  const mapa = {};
  cabDe.forEach((nome, i) => { mapa[appChave_(nome)] = origem[i]; });
  const extra = req.extra || {};
  const destino = cabPara.map(nome => {
    if (appTem_(extra, nome)) return extra[nome];
    const k = appChave_(nome);
    if (k === 'INTIMACAO' || k === 'PRAZOS' || k === 'PRAZO') return '';
    return appTem_(mapa, k) ? mapa[k] : '';
  });
  const linhaNova = para.getLastRow() + 1;
  destino.forEach((v, i) => { if (typeof v === 'string' && appLongoNumerico_(v)) para.getRange(linhaNova, i + 1).setNumberFormat('@'); });
  para.getRange(linhaNova, 1, 1, cabPara.length).setValues([destino]);
  de.deleteRow(linha);
  appLog_(usuario, proc, 'Movido', req.de + ' → ' + req.para + (Object.keys(extra).length ? ' (' + Object.keys(extra).map(k => k + ': ' + extra[k]).join('; ') + ')' : ''));
  return { ok: true, linha: linhaNova };
}

// -------------------- AGENDA (formato em blocos por dia, igual ao script do Discord) --------------------
// Colunas fixas: A hora, B periciado, C tipo, D status, E local
function appAgendaAba_() {
  const aba = SpreadsheetApp.getActive().getSheetByName(APP_ABA_AGENDA);
  if (!aba) throw new Error('Aba AGENDAMENTOS não encontrada');
  return aba;
}

function appData_(txt) {
  const m = String(txt || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return m ? m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2) : null;
}

function appAgenda_() {
  const aba = appAgendaAba_();
  const dados = aba.getDataRange().getDisplayValues();
  const itens = [];
  let dia = null;
  dados.forEach((l, i) => {
    const a = String(l[0] || '').trim(), b = String(l[1] || '').trim();
    if (appData_(a) && !b) { dia = a; return; }
    if (appChave_(a) === 'HORA') return;
    if (dia && b) itens.push({ linha: i + 1, data: dia, hora: a, nome: b, tipo: String(l[2] || '').trim(), status: String(l[3] || '').trim(), local: String(l[4] || '').trim() });
  });
  return { ok: true, itens: itens };
}

function appAgendaSalvar_(req, usuario) {
  const aba = appAgendaAba_();
  const d = req.dados || {};
  const vals = [String(d.hora || '').trim(), String(d.nome || '').trim(), String(d.tipo || '').trim(), String(d.status || '').trim(), String(d.local || '').trim()];
  if (!vals[0] || !vals[1]) return { ok: false, erro: 'Informe hora e nome do periciando.' };

  if (req.linha) { // editar um horário existente
    const linha = Number(req.linha);
    if (linha < 1 || linha > aba.getLastRow()) return { ok: false, erro: 'CONFLITO' };
    const antes = aba.getRange(linha, 1, 1, 5).getDisplayValues()[0];
    if (String(antes[1]).trim() !== String(req.nomeEsperado || '').trim()) return { ok: false, erro: 'CONFLITO' };
    aba.getRange(linha, 1, 1, 5).setNumberFormat('@').setValues([vals]);
    appLog_(usuario, req.processo || '', 'Agenda: horário editado', antes.join(' | ') + ' → ' + vals.join(' | '));
    return { ok: true, linha: linha };
  }

  const dia = String(d.data || '').trim();
  if (!appData_(dia)) return { ok: false, erro: 'Data inválida. Use dd/mm/aaaa.' };
  const dados = aba.getDataRange().getDisplayValues();
  let linhaDia = -1;
  for (let i = 0; i < dados.length; i++) {
    if (String(dados[i][0]).trim() === dia && !String(dados[i][1]).trim()) { linhaDia = i + 1; break; }
  }
  let linhaNova;
  if (linhaDia < 0) { // dia novo: cria bloco no fim
    const base = aba.getLastRow() + 2;
    aba.getRange(base, 1).setNumberFormat('@').setValue(dia);
    aba.getRange(base, 4, 1, 2).setValues([['STATUS', 'LOCAL']]);
    aba.getRange(base + 1, 1, 1, 3).setValues([['HORA', 'PERICIADO', 'TIPO']]);
    aba.getRange(base + 2, 1, 1, 5).setNumberFormat('@').setValues([vals]);
    linhaNova = base + 2;
  } else { // dia existente: insere depois da última linha do bloco
    let ultima = linhaDia + 1; // pula a linha de cabeçalho HORA/PERICIADO/TIPO
    for (let r = linhaDia + 2; r <= dados.length; r++) {
      const a = String(dados[r - 1][0]).trim(), b = String(dados[r - 1][1]).trim();
      if (!a && !b) break;
      if (appData_(a) && !b) break;
      ultima = r;
    }
    aba.insertRowAfter(ultima);
    aba.getRange(ultima + 1, 1, 1, 5).setNumberFormat('@').setValues([vals]);
    linhaNova = ultima + 1;
  }
  appLog_(usuario, req.processo || '', 'Agenda: perícia marcada', dia + ' ' + vals[0] + ' · ' + vals[1] + (vals[4] ? ' · ' + vals[4] : ''));
  return { ok: true, linha: linhaNova };
}

// cria o horário na agenda e atualiza o processo (data da perícia e próximo passo) de uma vez
function appAgendar_(req, usuario) {
  const r1 = appAgendaSalvar_({ dados: req.slot, processo: req.processoEsperado }, usuario);
  if (!r1.ok) return r1;
  const r2 = appSalvar_({ aba: 'PERICIAS', linha: req.linha, processoEsperado: req.processoEsperado, dados: req.dadosProcesso || {}, motivo: 'Perícia agendada' }, usuario);
  if (!r2.ok) return { ok: false, erro: 'O horário foi criado na agenda, mas não consegui atualizar o processo (' + r2.erro + '). Atualize a tela e ajuste o processo.' };
  return { ok: true };
}

// -------------------- HISTÓRICO --------------------
function appLogAba_() {
  const ss = SpreadsheetApp.getActive();
  let aba = ss.getSheetByName(APP_ABA_LOG);
  if (!aba) {
    aba = ss.insertSheet(APP_ABA_LOG, ss.getSheets().length);
    aba.getRange(1, 1, 1, 5).setValues([['DATA', 'USUÁRIO', 'PROCESSO', 'AÇÃO', 'DETALHE']]).setFontWeight('bold');
    aba.setFrozenRows(1);
    aba.getRange('A:A').setNumberFormat('dd/MM/yyyy HH:mm');
    aba.getRange('C:C').setNumberFormat('@');
    aba.setColumnWidth(5, 600);
  }
  return aba;
}

function appLog_(usuario, processo, acao, detalhe) {
  try {
    const aba = appLogAba_();
    const n = aba.getLastRow() + 1;
    aba.getRange(n, 2, 1, 4).setNumberFormat('@'); // texto puro: número de processo sem máscara não vira número
    aba.getRange(n, 1, 1, 5).setValues([[new Date(), usuario || '', String(processo || ''), acao, String(detalhe || '').slice(0, 1500)]]);
  } catch (e) {}
}

function appLerLog_() {
  const aba = SpreadsheetApp.getActive().getSheetByName(APP_ABA_LOG);
  if (!aba || aba.getLastRow() < 2) return [];
  return aba.getRange(2, 1, aba.getLastRow() - 1, 5).getDisplayValues()
    .map(l => ({ data: l[0], usuario: l[1], processo: l[2], acao: l[3], detalhe: l[4] }));
}

function appAtividade_(n) {
  const aba = SpreadsheetApp.getActive().getSheetByName(APP_ABA_LOG);
  if (!aba || aba.getLastRow() < 2) return [];
  const ult = aba.getLastRow();
  const ini = Math.max(2, ult - n + 1);
  return aba.getRange(ini, 1, ult - ini + 1, 5).getDisplayValues()
    .map(l => ({ data: l[0], usuario: l[1], processo: l[2], acao: l[3], detalhe: l[4] })).reverse();
}

function appHistorico_(processo) {
  const alvo = String(processo || '').replace(/\D/g, '');
  if (!alvo) return { ok: true, itens: [] };
  const itens = appLerLog_().filter(x => String(x.processo).replace(/\D/g, '') === alvo).reverse().slice(0, 200);
  return { ok: true, itens: itens };
}

// -------------------- TAREFAS (aba TAREFAS, criada sozinha) --------------------
const APP_ABA_TAREFAS = 'TAREFAS';
const APP_CAB_TAREFAS = ['ID', 'CRIADA EM', 'CRIADA POR', 'PARA', 'PROCESSO', 'TAREFA', 'PRAZO', 'STATUS', 'CONCLUÍDA EM', 'CONCLUÍDA POR'];

function appAgoraTxt_() { return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm'); }

function appTarefasAba_(criar) {
  const ss = SpreadsheetApp.getActive();
  let aba = ss.getSheetByName(APP_ABA_TAREFAS);
  if (!aba && criar) {
    aba = ss.insertSheet(APP_ABA_TAREFAS, ss.getSheets().length);
    aba.getRange('A:J').setNumberFormat('@');
    aba.getRange(1, 1, 1, APP_CAB_TAREFAS.length).setValues([APP_CAB_TAREFAS]).setFontWeight('bold');
    aba.setFrozenRows(1);
    aba.setColumnWidth(6, 420);
  }
  return aba;
}

function appTarefas_() {
  const aba = appTarefasAba_(false);
  if (!aba || aba.getLastRow() < 2) return [];
  const limite = Date.now() - 14 * 86400000;
  const quando = s => { const m = String(s).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/); return m ? new Date(+m[3], +m[2] - 1, +m[1]).getTime() : 0; };
  return aba.getRange(2, 1, aba.getLastRow() - 1, APP_CAB_TAREFAS.length).getDisplayValues()
    .map(l => ({ id: l[0], criada: l[1], por: l[2], para: l[3], processo: l[4], tarefa: l[5], prazo: l[6], status: l[7], feitaEm: l[8], feitaPor: l[9] }))
    .filter(t => t.id && (t.status !== 'FEITA' || quando(t.feitaEm) >= limite));
}

function appLinhaTarefa_(aba, id) {
  if (!id || aba.getLastRow() < 2) return -1;
  const ids = aba.getRange(2, 1, aba.getLastRow() - 1, 1).getDisplayValues();
  for (let i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(id)) return i + 2;
  return -1;
}

function appTarefaCriar_(req, usuario) {
  const texto = String(req.tarefa || '').trim();
  if (!texto) return { ok: false, erro: 'Descreva a tarefa.' };
  const para = String(req.para || 'assistentes').trim().toLowerCase();
  const prazo = String(req.prazo || '').trim();
  if (prazo && !appData_(prazo)) return { ok: false, erro: 'Prazo inválido. Use dd/mm/aaaa.' };
  const aba = appTarefasAba_(true);
  const id = Utilities.getUuid().replace(/-/g, '').slice(0, 10);
  const n = aba.getLastRow() + 1;
  aba.getRange(n, 1, 1, APP_CAB_TAREFAS.length).setNumberFormat('@')
    .setValues([[id, appAgoraTxt_(), usuario, para, String(req.processo || '').trim(), texto.slice(0, 1000), prazo, 'ABERTA', '', '']]);
  appLog_(usuario, req.processo || '', 'Tarefa criada', texto.slice(0, 200) + ' · para ' + para + (prazo ? ' · prazo ' + prazo : ''));
  let aviso = '';
  if (req.avisar) {
    try {
      appDiscordCheck_();
      enviarMensagemManual({ canal: 'ASSISTENTE', titulo: '📌 Nova tarefa' + (para !== 'assistentes' ? ' para ' + para : ''),
        texto: texto + (prazo ? '\nPrazo: ' + prazo : '') + '\n\n_criada por ' + usuario + ' no app_', processo: req.processo || '' });
    } catch (e) { aviso = 'Tarefa criada, mas o Discord não recebeu o aviso: ' + e.message; }
  }
  return { ok: true, tarefas: appTarefas_(), aviso: aviso };
}

function appTarefaStatus_(req, usuario) {
  const aba = appTarefasAba_(false);
  const linha = aba ? appLinhaTarefa_(aba, req.id) : -1;
  if (linha < 0) return { ok: false, erro: 'Tarefa não encontrada. Atualize a tela.' };
  const feita = !!req.feita;
  aba.getRange(linha, 8, 1, 3).setNumberFormat('@').setValues([[feita ? 'FEITA' : 'ABERTA', feita ? appAgoraTxt_() : '', feita ? usuario : '']]);
  const v = aba.getRange(linha, 1, 1, APP_CAB_TAREFAS.length).getDisplayValues()[0];
  appLog_(usuario, v[4], feita ? 'Tarefa concluída' : 'Tarefa reaberta', String(v[5]).slice(0, 200));
  return { ok: true, tarefas: appTarefas_() };
}

function appTarefaExcluir_(req, usuario) {
  const aba = appTarefasAba_(false);
  const linha = aba ? appLinhaTarefa_(aba, req.id) : -1;
  if (linha < 0) return { ok: false, erro: 'Tarefa não encontrada. Atualize a tela.' };
  const v = aba.getRange(linha, 1, 1, APP_CAB_TAREFAS.length).getDisplayValues()[0];
  if (v[2] !== usuario && appPapel_(usuario) !== 'perito') return { ok: false, erro: 'Só quem criou a tarefa (ou o perito) pode excluí-la.' };
  aba.deleteRow(linha);
  appLog_(usuario, v[4], 'Tarefa excluída', String(v[5]).slice(0, 200));
  return { ok: true, tarefas: appTarefas_() };
}

// conferência semanal nos autos (processos aguardando decisão, depósito ou pagamento)
function appVerificado_(req, usuario) {
  if (!req.processo) return { ok: false, erro: 'Processo não informado.' };
  appLog_(usuario, req.processo, 'Verificado nos autos', String(req.nota || 'sem novidade').slice(0, 300));
  return { ok: true, quando: appAgoraTxt_(), por: usuario };
}

function appVerificados_() {
  const out = {};
  appLerLog_().forEach(x => {
    if (x.acao !== 'Verificado nos autos') return;
    out[String(x.processo).replace(/\D/g, '')] = { quando: x.data, por: x.usuario, nota: x.detalhe };
  });
  return out;
}

function appUsuarios_() {
  return Object.keys(PropertiesService.getScriptProperties().getProperties())
    .filter(k => k.indexOf('USR_') === 0).map(k => k.slice(4)).sort()
    .map(u => ({ u: u, papel: appPapel_(u) }));
}

// -------------------- DISCORD (usa o script do Discord deste mesmo projeto) --------------------
const APP_ROTINAS = { dia: 'Resumo do dia', semana: 'Resumo semanal', prazos: 'Alertas de prazo', paineis: 'Painéis de pendências', mudancas: 'Verificar mudanças' };

function appDiscordCheck_() {
  if (typeof CANAIS === 'undefined' || typeof enviarMensagemManual !== 'function') throw new Error('Script do Discord não encontrado neste projeto.');
}

function appDiscordCanais_() {
  appDiscordCheck_();
  const props = PropertiesService.getScriptProperties();
  return Object.keys(CANAIS).filter(k => props.getProperty('WEBHOOK_' + k)).map(k => ({ k: k, n: CANAIS[k] }));
}

function appDiscordEnviar_(req, usuario) {
  appDiscordCheck_();
  const texto = String(req.texto || '').trim();
  const msg = enviarMensagemManual({
    canal: req.canal,
    titulo: req.titulo,
    texto: texto ? texto + '\n\n_enviado pelo app por ' + usuario + '_' : '',
    processo: req.processo || ''
  });
  appLog_(usuario, req.processo || '', 'Discord', (CANAIS[req.canal] || req.canal) + ': ' + (String(req.titulo || '').trim() || 'mensagem'));
  return { ok: true, msg: msg };
}

function appDiscordRotina_(rotina, usuario) {
  appDiscordCheck_();
  const fn = {
    dia: () => resumoDiario(),
    semana: () => resumoSemanal(),
    prazos: () => rotinaAlertas(),
    paineis: () => atualizarPaineisAgora(),
    mudancas: () => verificarMudancas()
  }[rotina];
  if (!fn) return { ok: false, erro: 'Rotina desconhecida' };
  fn();
  appLog_(usuario, '', 'Discord', 'Rotina enviada: ' + APP_ROTINAS[rotina]);
  return { ok: true };
}

// -------------------- DRIVE: pastas dos periciados e documentos --------------------
// Estrutura do Drive: PERICIAS / CIDADE / Nome do periciado   (Núcleo 4.0 fica em "NUCLEO 4")
const APP_PASTA_RAIZ = '1XMa_9GO2LV02XeFVZMEZORl-Jtv0h7yP';    // pasta PERICIAS
const APP_PASTA_MODELOS = '1NVoquMrH-gGho87OkF7XgaWTrLPjRwqi'; // pasta Arquivos base
const APP_UPLOAD_MAX = 15 * 1024 * 1024;
const APP_MIME_PASTA = 'application/vnd.google-apps.folder';
const APP_MIME_DOC = 'application/vnd.google-apps.document';

// Rode UMA vez no editor (Executar) para autorizar o acesso ao Drive e ao Docs.
function appAutorizarDrive() {
  const raiz = DriveApp.getFolderById(APP_PASTA_RAIZ).getName();
  const modelos = DriveApp.getFolderById(APP_PASTA_MODELOS).getName();
  const doc = DocumentApp.create('teste de autorização (pode apagar)');
  DriveApp.getFileById(doc.getId()).setTrashed(true);
  Logger.log('Drive e Docs autorizados: ' + raiz + ' / ' + modelos);
}

function appNorm_(s) { return appChave_(s).replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim(); }
function appEhInstituicao_(n) { return /LTDA|S\/A|S\.A\b|INSTITUTO|UNIMED|MINISTERIO|PREFEITURA|FAZENDA|SANTA CASA|CENTRO|CLINICA|HOSPITAL|ASSOCIACAO|MUNICIPIO|SAUDE|SEGURO|CAIXA|BANCO|COOPERATIVA|ODONTOLOGIA/.test(appChave_(n)); }
function appEhNucleo_(m) { return /NUCLEO/.test(appChave_(m['CIDADE'])) || /NUCLEO/.test(appChave_(m['FORUM'])); }
// quem é examinado: na interdição costuma ser a parte requerida
function appPericiado_(m) {
  const interd = /INTERDI|CURATELA/.test(appChave_(m['TIPO'])) || /FAMILIA/.test(appChave_(m['FORUM']));
  if (interd && m['REQUERIDA'] && !appEhInstituicao_(m['REQUERIDA'])) return m['REQUERIDA'];
  return m['REQUERENTE'] || m['REQUERIDA'] || '';
}
function appCNJ_(v) {
  const d = String(v || '').replace(/\D/g, '');
  if (d.length !== 20) return String(v || '').trim();
  return d.slice(0, 7) + '-' + d.slice(7, 9) + '.' + d.slice(9, 13) + '.' + d[13] + '.' + d.slice(14, 16) + '.' + d.slice(16);
}

// lê a linha do processo e confere se ainda é o mesmo
function appLinhaMapa_(req) {
  const sh = appAba_(req.aba || 'PERICIAS');
  const cab = appCabecalho_(sh);
  const linha = Number(req.linha);
  if (!(linha >= 2 && linha <= sh.getLastRow())) throw new Error('CONFLITO');
  const v = sh.getRange(linha, 1, 1, cab.length).getDisplayValues()[0];
  const m = {};
  cab.forEach((h, i) => { m[appChave_(h)] = String(v[i]).trim(); });
  if (m['PROCESSO'] !== String(req.processoEsperado || '').trim()) throw new Error('CONFLITO');
  return m;
}

function appNomePastaCidade_(cidade) {
  const k = appNorm_(cidade);
  if (/^NUCLEO/.test(k)) return 'NUCLEO 4';
  return k;
}

function appPastaCidade_(cidade, criar) {
  const alvo = appNomePastaCidade_(cidade);
  if (!alvo) return null;
  const raiz = DriveApp.getFolderById(APP_PASTA_RAIZ);
  const it = raiz.getFolders();
  let parcial = null;
  while (it.hasNext()) {
    const f = it.next();
    const k = appNorm_(f.getName());
    if (k === alvo) return f;
    if (!parcial && k.length >= 5 && alvo.length >= 5 && (k.indexOf(alvo) === 0 || alvo.indexOf(k) === 0)) parcial = f;
  }
  if (parcial) return parcial;
  return criar ? raiz.createFolder(alvo) : null;
}

// 3 = nome igual; 2 = mesmo primeiro e último nome; 1 = pasta com um só nome igual ao primeiro nome
function appNotaNome_(nomePasta, nomes) {
  const k = appNorm_(nomePasta), pk = k.split(' ');
  let nota = 0;
  nomes.forEach(n => {
    const a = appNorm_(n), pa = a.split(' ');
    if (!a) return;
    if (a === k) nota = Math.max(nota, 3);
    else if (pa.length > 1 && pk.length > 1 && pa[0] === pk[0] && pa[pa.length - 1] === pk[pk.length - 1]) nota = Math.max(nota, 2);
    else if (pk.length === 1 && pk[0].length >= 4 && pk[0] === pa[0]) nota = Math.max(nota, 1);
  });
  return nota;
}

function appDentroDaRaiz_(f) {
  let atual = [f];
  for (let nivel = 0; nivel < 4; nivel++) {
    const prox = [];
    for (const x of atual) {
      const it = x.getParents();
      while (it.hasNext()) { const p = it.next(); if (p.getId() === APP_PASTA_RAIZ) return true; prox.push(p); }
    }
    if (!prox.length) return false;
    atual = prox;
  }
  return false;
}

function appNomesDoProcesso_(m) {
  return [appPericiado_(m), m['REQUERENTE'], m['REQUERIDA']].filter(n => n && !appEhInstituicao_(n));
}

function appEncontrarPasta_(m) {
  const props = PropertiesService.getScriptProperties();
  const chaveProp = 'PASTA_' + String(m['PROCESSO']).replace(/\D/g, '');
  const salvo = props.getProperty(chaveProp);
  if (salvo) {
    try { const f = DriveApp.getFolderById(salvo); if (!f.isTrashed()) return { pasta: f }; } catch (e) {}
    props.deleteProperty(chaveProp);
  }
  const nomes = appNomesDoProcesso_(m);
  const cidade = appPastaCidade_(m['CIDADE'], false);
  const candidatas = [];
  if (cidade) {
    const it = cidade.getFolders();
    let melhor = null, nota = 0, empate = false;
    while (it.hasNext()) {
      const f = it.next();
      const s = appNotaNome_(f.getName(), nomes);
      if (s > nota) { melhor = f; nota = s; empate = false; } else if (s && s === nota) empate = true;
      candidatas.push({ id: f.getId(), nome: f.getName() });
    }
    if (melhor && !empate) { props.setProperty(chaveProp, melhor.getId()); return { pasta: melhor }; }
  }
  // pode estar em outra cidade (ex.: A OUTROS): procura pelo nome exato dentro de PERICIAS
  for (const n of nomes) {
    const it = DriveApp.searchFolders("title = '" + n.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "' and trashed = false");
    while (it.hasNext()) {
      const f = it.next();
      if (f.getId() !== APP_PASTA_RAIZ && appDentroDaRaiz_(f)) { props.setProperty(chaveProp, f.getId()); return { pasta: f }; }
    }
  }
  return { pasta: null, cidade: cidade, candidatas: candidatas.sort((a, b) => a.nome.localeCompare(b.nome)) };
}

function appInfoPasta_(f) {
  const pais = f.getParents();
  const pai = pais.hasNext() ? pais.next().getName() : '';
  return { id: f.getId(), nome: f.getName(), url: f.getUrl(), caminho: (pai ? pai + ' / ' : '') + f.getName() };
}

function appArquivos_(pasta) {
  const out = [];
  const it = pasta.getFiles();
  while (it.hasNext() && out.length < 300) {
    const f = it.next();
    out.push({ id: f.getId(), nome: f.getName(), mime: f.getMimeType(), url: f.getUrl(), tam: f.getSize(), mod: f.getLastUpdated().getTime() });
  }
  const sp = pasta.getFolders();
  while (sp.hasNext()) {
    const f = sp.next();
    out.push({ id: f.getId(), nome: f.getName(), mime: APP_MIME_PASTA, url: f.getUrl(), tam: 0, mod: f.getLastUpdated().getTime() });
  }
  return out.sort((a, b) => b.mod - a.mod);
}

function appDocs_(req) {
  const m = appLinhaMapa_(req);
  const r = appEncontrarPasta_(m);
  if (r.pasta) return { ok: true, pasta: appInfoPasta_(r.pasta), arquivos: appArquivos_(r.pasta) };
  return {
    ok: true, pasta: null,
    sugestao: { cidade: r.cidade ? r.cidade.getName() : appNomePastaCidade_(m['CIDADE']), cidadeExiste: !!r.cidade, nome: appPericiado_(m) },
    candidatas: r.candidatas
  };
}

function appPastaVincular_(req, usuario) {
  const m = appLinhaMapa_(req);
  const f = DriveApp.getFolderById(req.pastaId);
  if (!appDentroDaRaiz_(f)) return { ok: false, erro: 'Essa pasta não está dentro de PERICIAS.' };
  PropertiesService.getScriptProperties().setProperty('PASTA_' + m['PROCESSO'].replace(/\D/g, ''), f.getId());
  appLog_(usuario, m['PROCESSO'], 'Drive: pasta vinculada', appInfoPasta_(f).caminho);
  return appDocs_(req);
}

function appCriarPastaPara_(m, nomeDesejado, usuario) {
  const nome = String(nomeDesejado || appPericiado_(m)).replace(/[\/\\]/g, '-').trim();
  if (!nome) throw new Error('Informe o nome da pasta.');
  const cidade = appPastaCidade_(m['CIDADE'] || 'A OUTROS', true);
  const it = cidade.getFoldersByName(nome);
  const f = it.hasNext() ? it.next() : cidade.createFolder(nome);
  PropertiesService.getScriptProperties().setProperty('PASTA_' + m['PROCESSO'].replace(/\D/g, ''), f.getId());
  appLog_(usuario, m['PROCESSO'], 'Drive: pasta criada', cidade.getName() + ' / ' + nome);
  return f;
}

function appPastaCriar_(req, usuario) {
  const m = appLinhaMapa_(req);
  appCriarPastaPara_(m, req.nome, usuario);
  return appDocs_(req);
}

// ---------- modelos: lista, regras de sugestão e criação ----------
// Regras ficam nas Propriedades do Script (MODELOS_CFG): { idDoModelo: { grupo, etapas[], filtro, obs, oculto, desc } }
function appModelosCfg_() { try { return JSON.parse(PropertiesService.getScriptProperties().getProperty('MODELOS_CFG') || '{}'); } catch (e) { return {}; } }
function appSalvarModelosCfg_(cfg) { PropertiesService.getScriptProperties().setProperty('MODELOS_CFG', JSON.stringify(cfg)); CacheService.getScriptCache().remove('APP_MODELOS'); }

function appModelos_() {
  const cache = CacheService.getScriptCache();
  const url = 'https://drive.google.com/drive/folders/' + APP_PASTA_MODELOS;
  let out;
  const c = cache.get('APP_MODELOS');
  if (c) out = JSON.parse(c);
  else {
    const it = DriveApp.getFolderById(APP_PASTA_MODELOS).getFilesByType(MimeType.GOOGLE_DOCS);
    out = [];
    while (it.hasNext()) {
      const f = it.next();
      if (/^c[oó]pia de /i.test(f.getName()) || f.isTrashed()) continue;
      out.push({ id: f.getId(), nome: f.getName(), mod: f.getLastUpdated().getTime(), url: f.getUrl() });
    }
    out.sort((a, b) => a.nome.localeCompare(b.nome));
    cache.put('APP_MODELOS', JSON.stringify(out), 600);
  }
  const cfg = appModelosCfg_();
  const nomes = out.map(m => appNorm_(m.nome));
  return {
    ok: true, url: url,
    modelos: out.map(m => Object.assign({}, m, { cfg: cfg[m.id] || null })),
    sugeridos: APP_MODELOS_SUGERIDOS.map(s => ({ chave: s.chave, nome: s.nome, grupo: s.grupo, desc: s.desc, existe: nomes.indexOf(appNorm_(s.nome)) >= 0 }))
  };
}

function appModeloDaPasta_(id) {
  const f = DriveApp.getFileById(id);
  let ok = false;
  const ps = f.getParents();
  while (ps.hasNext()) if (ps.next().getId() === APP_PASTA_MODELOS) ok = true;
  if (!ok || f.getMimeType() !== APP_MIME_DOC) throw new Error('Modelo inválido.');
  return f;
}

function appLimparCfg_(c) {
  c = c || {};
  const etapas = ['ACEITE', 'RESERVA', 'AGENDAMENTO', 'PERICIA', 'LAUDO', 'ESCLARECIMENTOS', 'PETICAO', 'DECISAO', 'PAGAMENTO', 'RENUNCIAR'];
  return {
    grupo: String(c.grupo || '').slice(0, 40),
    etapas: (Array.isArray(c.etapas) ? c.etapas : []).map(String).filter(e => etapas.indexOf(e) >= 0),
    filtro: ['', 'nucleo', 'comum', 'interdicao', 'homecare', 'bariatrica', 'erro'].indexOf(c.filtro || '') >= 0 ? (c.filtro || '') : '',
    obs: String(c.obs || '').slice(0, 60),
    oculto: !!c.oculto,
    desc: String(c.desc || '').slice(0, 300)
  };
}

function appModeloSalvar_(req, usuario) {
  const f = appModeloDaPasta_(req.id);
  const nome = String(req.nome || '').trim();
  if (nome && nome !== f.getName()) f.setName(nome);
  const cfg = appModelosCfg_();
  cfg[f.getId()] = appLimparCfg_(req.cfg);
  appSalvarModelosCfg_(cfg);
  appLog_(usuario, '', 'Modelo configurado', f.getName());
  return appModelos_();
}

function appModeloDuplicar_(req, usuario) {
  const f = appModeloDaPasta_(req.id);
  const nome = String(req.nome || ('CÓPIA ' + f.getName())).trim().toUpperCase();
  if (/^c[oó]pia de /i.test(nome)) return { ok: false, erro: 'Escolha um nome que não comece com "Cópia de" (esses ficam ocultos).' };
  const copia = f.makeCopy(nome, DriveApp.getFolderById(APP_PASTA_MODELOS));
  const cfg = appModelosCfg_();
  if (cfg[f.getId()]) { cfg[copia.getId()] = Object.assign({}, cfg[f.getId()], { oculto: false }); }
  appSalvarModelosCfg_(cfg);
  appLog_(usuario, '', 'Modelo duplicado', f.getName() + ' → ' + nome);
  return Object.assign(appModelos_(), { novo: { id: copia.getId(), nome: nome, url: copia.getUrl() } });
}

function appModeloExcluir_(req, usuario) {
  const f = appModeloDaPasta_(req.id);
  f.setTrashed(true); // vai para a lixeira do Drive (dá para recuperar por 30 dias)
  const cfg = appModelosCfg_();
  delete cfg[f.getId()];
  appSalvarModelosCfg_(cfg);
  appLog_(usuario, '', 'Modelo excluído (lixeira do Drive)', f.getName());
  return appModelos_();
}

const APP_ENDERECO_CONSULTORIO = 'Compart Clinic - Rua Santo Afonso de Maria Liguori, nº 141, Vila São Pedro, São José do Rio Preto/SP';
const APP_INTRO = 'Eu, Dr. Bruno Thomás Michels, brasileiro, médico, inscrito no CRM-SP sob o nº 245235, nomeado perito judicial nos autos do processo em epígrafe, venho, respeitosamente, à presença de Vossa Excelência, ';

// modelos que ainda não existem na pasta e podem ser criados com um clique (texto revisável no Docs)
const APP_MODELOS_SUGERIDOS = [
  { chave: 'aceite-proposta', nome: 'MODELO ACEITE COM PROPOSTA DE HONORARIOS', grupo: 'Aceite', etapas: ['ACEITE'], filtro: 'comum',
    desc: 'Aceite da nomeação com proposta de honorários (varas comuns).',
    paragrafos: [APP_INTRO + 'ACEITAR a nomeação, comprometendo-me a realizar a perícia médica com isenção, ética e rigor técnico.',
      'Considerando a natureza da perícia, a análise da documentação médica, a realização do exame pericial e a elaboração do laudo, bem como o elevado grau de zelo e responsabilidade que o encargo exige, proponho honorários periciais no valor de {{HONORARIOS}}.',
      'Após o depósito dos honorários, informarei nos autos a data, o horário e o local da perícia.'] },
  { chave: 'redesignacao', nome: 'MODELO REDESIGNACAO DE PERICIA', grupo: 'Agendamento', etapas: ['PERICIA', 'AGENDAMENTO'], filtro: '',
    desc: 'Informa nova data, horário e local da perícia (puxa da aba AGENDAMENTOS).',
    paragrafos: [APP_INTRO + 'INFORMAR que a avaliação pericial foi redesignada para:',
      'Data: {{DATA_PERICIA}} ({{DIA_SEMANA}}); Horário: {{HORA_PERICIA}} horas;',
      'Local: {{LOCAL_PERICIA}}',
      'Requeiro que o(a) periciando(a) seja intimado(a) da nova data, devendo comparecer portando documento oficial com foto e toda a documentação médica pertinente.'] },
  { chave: 'sem-contato', nome: 'MODELO IMPOSSIBILIDADE DE CONTATO COM PERICIANDO', grupo: 'Agendamento', etapas: ['AGENDAMENTO'], filtro: '',
    desc: 'Pede endereço e telefone atualizados quando não se consegue falar com o periciando.',
    paragrafos: [APP_INTRO + 'INFORMAR que, apesar das tentativas realizadas, não foi possível contato com o(a) periciando(a) ou seus familiares pelos meios constantes dos autos, o que inviabiliza o agendamento da perícia.',
      'Requeiro a intimação da parte autora para que informe endereço e telefone atualizados, a fim de possibilitar a designação da data da perícia.'] },
  { chave: 'documentos', nome: 'MODELO SOLICITACAO DE DOCUMENTOS MEDICOS', grupo: 'Perícia', etapas: ['PERICIA', 'LAUDO'], filtro: '',
    desc: 'Pede a juntada de prontuário, exames ou relatórios indispensáveis ao laudo, no prazo que o Juízo fixar.',
    paragrafos: [APP_INTRO + 'requerer a intimação da parte [[autora]] para que apresente nos autos [[prontuário médico, exames de imagem e relatórios do médico assistente]], documentos indispensáveis à conclusão da avaliação pericial, no prazo que Vossa Excelência entender cabível.'] },
  { chave: 'prorrogacao', nome: 'MODELO PRORROGACAO DE PRAZO DO LAUDO', grupo: 'Laudo e esclarecimentos', etapas: ['LAUDO'], filtro: '',
    desc: 'Pede mais prazo para entregar o laudo, com justificativa curta; o período fica a critério do Juízo.',
    paragrafos: [APP_INTRO + 'requerer a prorrogação do prazo para entrega do laudo pericial, pelo período que Vossa Excelência entender cabível.',
      'O pedido se justifica pela necessidade de [[análise de documentação médica complementar]], indispensável à conclusão técnica do trabalho pericial.'] },
  { chave: 'juntada-laudo', nome: 'MODELO JUNTADA DE LAUDO', grupo: 'Laudo e esclarecimentos', etapas: ['LAUDO'], filtro: '',
    desc: 'Petição de juntada do laudo pericial.',
    paragrafos: [APP_INTRO + 'requerer a juntada do laudo médico pericial em anexo, referente à perícia realizada em {{DATA_PERICIA}}.',
      'Permaneço à disposição deste Juízo para eventuais esclarecimentos.'] },
  { chave: 'esclarecimentos', nome: 'MODELO RESPOSTA A ESCLARECIMENTOS', grupo: 'Laudo e esclarecimentos', etapas: ['ESCLARECIMENTOS', 'DECISAO'], filtro: '',
    desc: 'Estrutura para responder quesitos complementares (copie os quesitos exatamente como formulados).',
    paragrafos: [APP_INTRO + 'apresentar os esclarecimentos solicitados, nos termos a seguir.',
      'QUESITO: [[transcrever exatamente como formulado pela parte]]',
      'RESPOSTA: [[resposta técnica objetiva]]',
      '[[Ficam mantidas as conclusões do laudo pericial anteriormente apresentado.]]'] }
];

// monta um modelo novo copiando a formatação (cabeçalho, margens, fonte) de um modelo existente
function appMontarModelo_(doc, paragrafos) {
  const body = doc.getBody();
  const P = DocumentApp.ElementType.PARAGRAPH;
  let fonte = null, tam = null;
  for (let i = 0; i < body.getNumChildren() && !fonte; i++) {
    const el = body.getChild(i);
    if (el.getType() === P && el.asParagraph().getText().trim().length > 40) {
      const a = el.asParagraph().editAsText().getAttributes(0);
      fonte = a[DocumentApp.Attribute.FONT_FAMILY]; tam = a[DocumentApp.Attribute.FONT_SIZE];
    }
  }
  body.clear();
  const J = DocumentApp.HorizontalAlignment.JUSTIFY, C = DocumentApp.HorizontalAlignment.CENTER;
  const par = (txt, negrito, alinh) => {
    const p = body.appendParagraph(txt);
    p.setAlignment(alinh || J);
    if (txt.length) { const t = p.editAsText(); if (fonte) t.setFontFamily(fonte); if (tam) t.setFontSize(tam); t.setBold(!!negrito); }
    return p;
  };
  par('EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO DA VARA', true);
  par('');
  const tab = body.appendTable([['Processo nº:', '{{PROCESSO}}'], ['Requerente:', '{{REQUERENTE}}'], ['Requerida:', '{{REQUERIDA}}']]);
  tab.setBorderWidth(0);
  const tt = tab.editAsText(); if (fonte) tt.setFontFamily(fonte); if (tam) tt.setFontSize(tam);
  par('');
  paragrafos.forEach(t => { par(t); par(''); });
  par('Nesses termos, pede deferimento.');
  par('');
  par('Dr. Bruno Thomás Michels', true, C);
  par('Médico Perito | CRM-SP 245235', true, C);
  par('São José do Rio Preto/SP, {{HOJE}}.', true, C);
  const primeiro = body.getChild(0);
  if (body.getNumChildren() > 1 && primeiro.getType() === P && !primeiro.asParagraph().getText()) primeiro.removeFromParent();
}

function appModeloCriar_(req, usuario) {
  const pasta = DriveApp.getFolderById(APP_PASTA_MODELOS);
  const sug = req.sugestao ? APP_MODELOS_SUGERIDOS.filter(s => s.chave === req.sugestao)[0] : null;
  if (req.sugestao && !sug) return { ok: false, erro: 'Sugestão não encontrada.' };
  let nome = String(req.nome || (sug ? sug.nome : '')).trim().toUpperCase();
  if (!nome) return { ok: false, erro: 'Dê um nome ao modelo.' };
  if (!/^MODELO /.test(nome)) nome = 'MODELO ' + nome;
  // base de formatação: o modelo escolhido, ou um ACEITE N40, ou o primeiro da pasta
  let base = null;
  if (req.baseId) base = appModeloDaPasta_(req.baseId);
  else {
    const it = pasta.getFilesByType(MimeType.GOOGLE_DOCS);
    while (it.hasNext()) { const f = it.next(); if (/^c[oó]pia de /i.test(f.getName()) || f.isTrashed()) continue; if (!base || /ACEITE N40/i.test(f.getName())) base = f; if (/ACEITE N40/i.test(f.getName())) break; }
  }
  let doc;
  if (base) doc = DocumentApp.openById(base.makeCopy(nome, pasta).getId());
  else { doc = DocumentApp.create(nome); DriveApp.getFileById(doc.getId()).moveTo(pasta); }
  try {
    appMontarModelo_(doc, sug ? sug.paragrafos : ['[[Escreva aqui o texto. Use campos automáticos como {{PROCESSO}}, {{PERICIADO}} ou {{DATA_PERICIA}}, e marque entre colchetes duplos o que deve ser preenchido à mão.]]']);
  } finally { doc.saveAndClose(); }
  const cfg = appModelosCfg_();
  cfg[doc.getId()] = appLimparCfg_(Object.assign(sug ? { grupo: sug.grupo, etapas: sug.etapas, filtro: sug.filtro, desc: sug.desc } : {}, req.cfg || {}));
  appSalvarModelosCfg_(cfg);
  appLog_(usuario, '', 'Modelo criado', nome);
  return Object.assign(appModelos_(), { novo: { id: doc.getId(), nome: nome, url: 'https://docs.google.com/document/d/' + doc.getId() + '/edit' } });
}

function appUpload_(req, usuario) {
  const m = appLinhaMapa_(req);
  const r = appEncontrarPasta_(m);
  if (!r.pasta) return { ok: false, erro: 'Crie ou vincule a pasta do periciado antes de enviar arquivos.' };
  const bytes = Utilities.base64Decode(String(req.dados || ''));
  if (!bytes.length) return { ok: false, erro: 'Arquivo vazio.' };
  if (bytes.length > APP_UPLOAD_MAX) return { ok: false, erro: 'Arquivo grande demais para o app (máximo 15 MB). Envie pelo Drive.' };
  const nome = String(req.nome || 'arquivo').replace(/[\/\\]/g, '-').slice(0, 200);
  const f = r.pasta.createFile(Utilities.newBlob(bytes, req.mime || 'application/octet-stream', nome));
  appLog_(usuario, m['PROCESSO'], 'Drive: arquivo enviado', nome);
  return { ok: true, arquivo: { id: f.getId(), nome: f.getName(), url: f.getUrl() } };
}

// ---------- gerar documento a partir de um modelo de "Arquivos base" ----------
const APP_DIAS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
const APP_MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

function appRegexEsc_(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function appSlotDoProcesso_(m) {
  const nomes = appNomesDoProcesso_(m).map(appNorm_);
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const itens = appAgenda_().itens.filter(a => nomes.indexOf(appNorm_(a.nome)) >= 0);
  const comData = itens.map(a => { const p = a.data.split('/'); return Object.assign({ d: new Date(+p[2], +p[1] - 1, +p[0]) }, a); });
  const futuros = comData.filter(a => a.d >= hoje).sort((a, b) => a.d - b.d);
  return futuros[0] || comData.sort((a, b) => b.d - a.d)[0] || null;
}

// troca o texto de uma célula mantendo a formatação do primeiro caractere
function appTrocarTexto_(el, novo) {
  const t = el.editAsText();
  const antigo = t.getText();
  if (antigo === novo) return;
  if (!antigo.length) { t.setText(novo); return; }
  t.insertText(0, novo);
  t.deleteText(novo.length, novo.length + antigo.length - 1);
}

// troca o que vem depois de um rótulo no mesmo parágrafo (ex.: "Número do processo: X"), mantendo a formatação do valor
function appTrocarAposRotulo_(body, rotulo, novo) {
  const r = body.findText(rotulo);
  if (!r) return null;
  const t = r.getElement().asText();
  const ini = r.getEndOffsetInclusive() + 1;
  const texto = t.getText();
  const velho = texto.slice(ini).replace(/\.\s*$/, '').trim();
  if (velho === novo) return velho;
  const attrs = ini < texto.length ? t.getAttributes(ini) : null;
  if (ini < texto.length) t.deleteText(ini, texto.length - 1);
  t.insertText(ini, novo);
  if (attrs) t.setAttributes(ini, ini + novo.length - 1, attrs);
  return velho;
}

// marca em amarelo; "ignorar" recebe o texto antes do trecho (ex.: não marcar "até R$ 5.000,00" do formulário)
function appMarcar_(body, padrao, ignorar) {
  let n = 0, r = body.findText(padrao);
  while (r) {
    const t = r.getElement().asText();
    const antes = t.getText().slice(Math.max(0, r.getStartOffset() - 12), r.getStartOffset());
    if (!ignorar || !ignorar.test(antes)) {
      t.setBackgroundColor(r.getStartOffset(), r.getEndOffsetInclusive(), '#FFF59D');
      n++;
    }
    r = body.findText(padrao, r);
  }
  return n;
}

// troca literal (sem regex na substituição), mantendo a formatação do trecho
function appSubstituir_(body, padrao, novo) {
  let n = 0, r = body.findText(padrao);
  while (r && n < 300) {
    const t = r.getElement().asText(), ini = r.getStartOffset(), fim = r.getEndOffsetInclusive();
    if (novo) t.insertText(fim + 1, novo);
    t.deleteText(ini, fim);
    n++;
    r = body.findText(padrao);
  }
  return n;
}

// campos automáticos que podem ser usados em qualquer modelo
function appCamposDoc_(m, slot) {
  const hoje = new Date();
  const dPericia = slot ? slot.d : (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(m['PERICIA'] || '') ? (p => new Date(+p[2], +p[1] - 1, +p[0]))(m['PERICIA'].split('/')) : null);
  const local = slot ? (appChave_(slot.local) === 'CONSULTORIO' || !slot.local ? APP_ENDERECO_CONSULTORIO : slot.local) : '';
  return {
    PROCESSO: appCNJ_(m['PROCESSO']), REQUERENTE: m['REQUERENTE'] || '', REQUERIDA: m['REQUERIDA'] || '', PERICIADO: appPericiado_(m),
    VARA: m['FORUM'] || '', CIDADE: m['CIDADE'] || '', TIPO: m['TIPO'] || '', HONORARIOS: m['HONORARIOS'] || '',
    DATA_PERICIA: slot ? slot.data : (dPericia ? m['PERICIA'] : ''),
    DIA_SEMANA: dPericia ? APP_DIAS[dPericia.getDay()] : '',
    HORA_PERICIA: slot ? String(slot.hora).replace(/^0(\d)/, '$1') : '',
    LOCAL_PERICIA: local,
    HOJE: hoje.getDate() + ' de ' + APP_MESES[hoje.getMonth()] + ' de ' + hoje.getFullYear()
  };
}

function appPreencherDoc_(doc, m, slot) {
  const body = doc.getBody();
  const proc = appCNJ_(m['PROCESSO']);
  const trocas = [];
  const conferir = [];

  // 0) campos automáticos {{...}}; sem valor, ficam marcados em amarelo
  const campos = appCamposDoc_(m, slot);
  Object.keys(campos).forEach(k => {
    const padrao = '\\{\\{' + k + '\\}\\}';
    if (!body.findText(padrao)) return;
    if (campos[k]) appSubstituir_(body, padrao, campos[k]);
    else { appMarcar_(body, padrao); conferir.push('{{' + k + '}} sem valor na planilha'); }
  });

  // 1) tabela de identificação (Processo nº / Requerente / Requerida)
  body.getTables().forEach(tab => {
    for (let r = 0; r < tab.getNumRows(); r++) {
      const row = tab.getRow(r);
      if (row.getNumCells() < 2) continue;
      const rot = appChave_(row.getCell(0).getText());
      let novo = null;
      if (/^PROCESSO/.test(rot)) novo = proc;
      else if (/^(REQUERENTE|AUTOR|EXEQUENTE|INTERESSAD)/.test(rot)) novo = m['REQUERENTE'];
      else if (/^(REQUERID|REU|RE:|EXECUTAD)/.test(rot)) novo = m['REQUERIDA'];
      if (!novo) continue;
      const cel = row.getCell(1);
      const velho = cel.getText().trim();
      if (velho && velho !== novo) trocas.push([velho, novo]);
      appTrocarTexto_(cel.getChild(0), novo);
    }
  });
  // formulários com rótulo no próprio parágrafo (ex.: Formulário MLE)
  const velhoProc = appTrocarAposRotulo_(body, 'N[úu]mero do processo: ', proc);
  if (velhoProc && velhoProc !== proc) trocas.push([velhoProc, proc]);
  if (body.findText('Valor nominal do dep[óo]sito: ')) {
    if (m['HONORARIOS']) appTrocarAposRotulo_(body, 'Valor nominal do dep[óo]sito: ', m['HONORARIOS'] + '.');
    else conferir.push('valor nominal do depósito (sem honorários na planilha)');
  }
  // nomes e número antigos que aparecem no meio do texto
  trocas.forEach(([velho, novo]) => {
    if (velho.length < 5) return;
    body.replaceText(appRegexEsc_(velho), novo);
    if (velho.toUpperCase() !== velho) body.replaceText(appRegexEsc_(velho.toUpperCase()), novo.toUpperCase());
  });

  // 2) juízo no endereçamento
  const vara = appEhNucleo_(m)
    ? 'VARA DO NÚCLEO ESPECIALIZADO DE JUSTIÇA 4.0 - ACIDENTES DO TRABALHO DO INTERIOR E DO LITORAL'
    : (m['FORUM'] && m['CIDADE'] ? (m['FORUM'] + ' DO FORO DE ' + m['CIDADE'] + '/SP.').toUpperCase() : '');
  const jaNucleo = appEhNucleo_(m) && body.findText('JUIZ\\(A\\) DE DIREITO D[AO] (VARA DO )?N[ÚU]CLEO');
  if (jaNucleo) { /* modelo do Núcleo para processo do Núcleo: endereçamento já está certo */ }
  else if (vara && body.findText('JUIZ\\(A\\) DE DIREITO D[AO] ')) body.replaceText('JUIZ\\(A\\) DE DIREITO D[AO] .*', 'JUIZ(A) DE DIREITO DA ' + vara);
  else if (!vara) conferir.push('endereçamento (vara e foro)');

  // 3) data de assinatura
  const hoje = new Date();
  body.replaceText('Rio Preto/SP, [0-9]{1,2} de [^ ]+ de [0-9]{4}', 'Rio Preto/SP, ' + hoje.getDate() + ' de ' + APP_MESES[hoje.getMonth()] + ' de ' + hoje.getFullYear());

  // 4) data, horário e local da perícia (modelos de agendamento)
  if (body.findText('Data: [0-9]{1,2}/[0-9]{1,2}/[0-9]{4}')) {
    if (slot) {
      const hora = slot.hora.replace(/^0(\d)/, '$1');
      body.replaceText('Data: [0-9]{1,2}/[0-9]{1,2}/[0-9]{4} \\([^)]*\\); Horário: [0-9]{1,2}:[0-9]{2} horas', 'Data: ' + slot.data + ' (' + APP_DIAS[slot.d.getDay()] + '); Horário: ' + hora + ' horas');
      if (slot.local && appChave_(slot.local) !== 'CONSULTORIO') { body.replaceText('Local: .*', 'Local: ' + slot.local); conferir.push('local da perícia'); }
    } else {
      appMarcar_(body, 'Data: [0-9]{1,2}/[0-9]{1,2}/[0-9]{4}[^;]*; Horário: [0-9:]+ horas');
      conferir.push('data e horário da perícia (nada agendado na aba AGENDAMENTOS)');
    }
  }

  // 4b) data da perícia citada no texto (ex.: não comparecimento: "designada para o dia 22/10/2026")
  if (body.findText('designada para o dia [0-9]{1,2}/[0-9]{1,2}/[0-9]{4}')) {
    const dataPericia = /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(m['PERICIA'] || '') ? m['PERICIA'] : (slot ? slot.data : '');
    if (dataPericia) body.replaceText('designada para o dia [0-9]{1,2}/[0-9]{1,2}/[0-9]{4}', 'designada para o dia ' + dataPericia);
    else { appMarcar_(body, 'designada para o dia [0-9]{1,2}/[0-9]{1,2}/[0-9]{4}'); conferir.push('data da perícia'); }
  }

  // 5) o que o app não sabe: marca em amarelo
  if (appMarcar_(body, 'R\\$ ?[0-9.]+,[0-9]{2}', /(at[ée]|de)\s*$/i)) conferir.push('valores em R$');
  if (appMarcar_(body, '[Ee]vento [0-9]+')) conferir.push('número do evento');
  if (appMarcar_(body, 'fls?\\. ?[0-9]+')) conferir.push('folhas citadas');
  if (appMarcar_(body, '\\[\\[[^\\]]*\\]\\]')) conferir.push('trechos entre [[ ]] para completar');
  return conferir;
}

function appGerarDoc_(req, usuario) {
  const m = appLinhaMapa_(req);
  const modelo = DriveApp.getFileById(req.modeloId);
  let doModelo = false;
  const ps = modelo.getParents();
  while (ps.hasNext()) if (ps.next().getId() === APP_PASTA_MODELOS) doModelo = true;
  if (!doModelo || modelo.getMimeType() !== APP_MIME_DOC) return { ok: false, erro: 'Modelo inválido.' };
  const r = appEncontrarPasta_(m);
  if (!r.pasta && req.criarPasta) r.pasta = appCriarPastaPara_(m, '', usuario);
  if (!r.pasta) return { ok: false, erro: 'Crie ou vincule a pasta do periciado antes de gerar documentos.' };
  const base = modelo.getName().replace(/^MODELO\s+(DE\s+)?/i, '').replace(/\bBASE\b/ig, '').replace(/\s+/g, ' ').trim();
  const nome = base + ' ' + r.pasta.getName().toUpperCase();
  const copia = modelo.makeCopy(nome, r.pasta);
  const doc = DocumentApp.openById(copia.getId());
  let conferir;
  try { conferir = appPreencherDoc_(doc, m, appSlotDoProcesso_(m)); } finally { doc.saveAndClose(); }
  appLog_(usuario, m['PROCESSO'], 'Documento gerado', nome + (conferir.length ? ' (conferir: ' + conferir.join(', ') + ')' : ''));
  return { ok: true, doc: { id: copia.getId(), nome: nome, url: copia.getUrl() }, conferir: conferir };
}
