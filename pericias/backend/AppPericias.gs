/**
 * APP PERÍCIAS: backend (Google Apps Script)
 *
 * Fica no MESMO projeto do script do Discord (planilha PERICIAS), como um arquivo novo.
 * Não altera nada do script do Discord. Só lê e grava nas abas pelo nome das colunas.
 *
 * Segurança:
 *  - Usuários e senhas ficam em Propriedades do Script (senha só como hash com sal), nunca no código.
 *  - Todo acesso a dados exige uma sessão válida (token). Sem login, nada é devolvido.
 *  - 5 senhas erradas seguidas bloqueiam o usuário por 15 minutos.
 */

const APP_ABAS = ['PERICIAS', 'CONCLUSOS', 'RENUNCIAS'];
const APP_ABA_AGENDA = 'AGENDAMENTOS';
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
    case 'listar': return appListar_(req.aba);
    case 'salvar': return appComTrava_(() => appSalvar_(req));
    case 'mover': return appComTrava_(() => appMover_(req));
    case 'agenda': return appAgenda_();
    case 'agendaSalvar': return appComTrava_(() => appAgendaSalvar_(req));
    default: return { ok: false, erro: 'Ação desconhecida' };
  }
}

function appComTrava_(fn) {
  const trava = LockService.getScriptLock();
  if (!trava.tryLock(30000)) return { ok: false, erro: 'Planilha ocupada, tente de novo em instantes.' };
  try { return fn(); } finally { trava.releaseLock(); }
}

// -------------------- USUÁRIOS E SESSÃO --------------------
// Rode pelo menu da planilha (item "App: criar ou trocar senha de usuário") ou direto no editor.
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

function appSalvar_(req) {
  const aba = appAba_(req.aba);
  const cab = appCabecalho_(aba);
  const dados = req.dados || {};
  const iProc = appIndiceProcesso_(cab);

  if (req.linha) { // editar
    const linha = Number(req.linha);
    if (linha < 2 || linha > aba.getLastRow()) return { ok: false, erro: 'CONFLITO' };
    const atual = String(aba.getRange(linha, iProc + 1).getDisplayValue()).trim();
    if (atual !== String(req.processoEsperado || '').trim()) return { ok: false, erro: 'CONFLITO' };
    cab.forEach((nome, i) => {
      if (Object.prototype.hasOwnProperty.call(dados, nome)) aba.getRange(linha, i + 1).setValue(dados[nome]);
    });
    return { ok: true, linha: linha };
  }

  // criar
  const proc = String(dados[cab[iProc]] || '').trim();
  if (!proc) return { ok: false, erro: 'Informe o número do processo.' };
  if (!req.forcar) {
    const onde = appProcessoExiste_(proc);
    if (onde) return { ok: false, erro: 'DUPLICADO', onde: onde };
  }
  const linhaNova = aba.getLastRow() + 1;
  const valores = cab.map(nome => Object.prototype.hasOwnProperty.call(dados, nome) ? dados[nome] : '');
  aba.getRange(linhaNova, 1, 1, cab.length).setValues([valores]);
  return { ok: true, linha: linhaNova };
}

// copia a linha para a aba de destino pelos nomes das colunas e remove da origem
function appMover_(req) {
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
    if (Object.prototype.hasOwnProperty.call(extra, nome)) return extra[nome];
    const k = appChave_(nome);
    if (k === 'INTIMACAO' || k === 'PRAZOS' || k === 'PRAZO') return '';
    return Object.prototype.hasOwnProperty.call(mapa, k) ? mapa[k] : '';
  });
  const linhaNova = para.getLastRow() + 1;
  para.getRange(linhaNova, 1, 1, cabPara.length).setValues([destino]);
  de.deleteRow(linha);
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

function appAgendaSalvar_(req) {
  const aba = appAgendaAba_();
  const d = req.dados || {};
  const vals = [String(d.hora || '').trim(), String(d.nome || '').trim(), String(d.tipo || '').trim(), String(d.status || '').trim(), String(d.local || '').trim()];
  if (!vals[0] || !vals[1]) return { ok: false, erro: 'Informe hora e nome do periciando.' };

  if (req.linha) { // editar um horário existente
    const linha = Number(req.linha);
    if (linha < 1 || linha > aba.getLastRow()) return { ok: false, erro: 'CONFLITO' };
    const nomeAtual = String(aba.getRange(linha, 2).getDisplayValue()).trim();
    if (nomeAtual !== String(req.nomeEsperado || '').trim()) return { ok: false, erro: 'CONFLITO' };
    aba.getRange(linha, 1, 1, 5).setValues([vals]);
    return { ok: true, linha: linha };
  }

  const dia = String(d.data || '').trim();
  if (!appData_(dia)) return { ok: false, erro: 'Data inválida. Use dd/mm/aaaa.' };
  const dados = aba.getDataRange().getDisplayValues();
  let linhaDia = -1;
  for (let i = 0; i < dados.length; i++) {
    if (String(dados[i][0]).trim() === dia && !String(dados[i][1]).trim()) { linhaDia = i + 1; break; }
  }
  if (linhaDia < 0) { // dia novo: cria bloco no fim
    const base = aba.getLastRow() + 2;
    aba.getRange(base, 1).setNumberFormat('@').setValue(dia);
    aba.getRange(base, 4, 1, 2).setValues([['STATUS', 'LOCAL']]);
    aba.getRange(base + 1, 1, 1, 3).setValues([['HORA', 'PERICIADO', 'TIPO']]);
    aba.getRange(base + 2, 1, 1, 5).setNumberFormat('@').setValues([vals]);
    return { ok: true, linha: base + 2 };
  }
  // dia existente: insere depois da última linha do bloco
  let ultima = linhaDia + 1; // pula a linha de cabeçalho HORA/PERICIADO/TIPO
  for (let r = linhaDia + 2; r <= dados.length; r++) {
    const a = String(dados[r - 1][0]).trim(), b = String(dados[r - 1][1]).trim();
    if (!a && !b) break;
    if (appData_(a) && !b) break;
    ultima = r;
  }
  aba.insertRowAfter(ultima);
  aba.getRange(ultima + 1, 1, 1, 5).setNumberFormat('@').setValues([vals]);
  return { ok: true, linha: ultima + 1 };
}
