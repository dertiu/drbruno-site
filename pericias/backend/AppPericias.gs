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
    case 'me': return { ok: true, usuario: usuario };
    case 'logout': appEncerrarSessao_(req.token); return { ok: true };
    case 'inicial': return appInicial_(usuario);
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
    abas: abas,
    agenda: appAgenda_().itens,
    atividade: appAtividade_(60),
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
  return { ok: true, token: token, usuario: usuario };
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
