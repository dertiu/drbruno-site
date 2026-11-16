/* Apps Script simulado para testes do /pericias.
   Carrega o bloco real apps-script/AppPericias-site.gs e as 3 trocas descritas no LEIA-ME, aplicadas sobre
   o código original do AppPericias (doPost, começo do appRotear_ e appPapel_), num ambiente que imita o Google.
   Uso: node testes/gas_simulado.mjs [porta]   (padrão 8898; o servidor local usa PERICIAS_GAS_URL=http://127.0.0.1:8898/exec) */
import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.argv[2]) || 8898;
export const CHAVE = process.env.PERICIAS_CHAVE || 'chave-de-teste-0123456789abcdef0123456789abcdef';

/* trechos ORIGINAIS do AppPericias.gs (como estão hoje) */
const ORIGINAL = `
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
    case 'inicial': return appInicial_(usuario);
    case 'gestao': return appPapel_(usuario) === 'perito' ? { ok: true, gestao: true } : { ok: false, erro: 'Sem permissão para a Gestão.' };
    case 'salvar': return appSalvar_(req, usuario);
    case 'mover': return appMover_(req, usuario);
    case 'upload': return { ok: true, tamanho: String(req.dados || '').length };
    default: return { ok: false, erro: 'Ação desconhecida' };
  }
}

function appPapel_(usuario) { return APP_ADMINS.indexOf(String(usuario || '').toLowerCase()) >= 0 ? 'perito' : 'assistente'; }
`;
/* as 3 trocas, exatamente como no LEIA-ME */
export const TROCAS = [
  ['    saida = appRotear_(req);', '    saida = appRotear_(req, e);'],
  [`function appRotear_(req) {
  if (req.acao === 'login') return appLogin_(req.usuario, req.senha);
  const usuario = appValidarSessao_(req.token);
  if (!usuario) return { ok: false, erro: 'SESSAO' };`,
  `function appRotear_(req, e) {
  const doSite = appUsuarioSite_(req, e);
  if (!doSite && appSoSite_()) return { ok: false, erro: 'SESSAO' };
  if (!doSite && req.acao === 'login') return appLogin_(req.usuario, req.senha);
  const usuario = doSite || appValidarSessao_(req.token);
  if (!usuario) return { ok: false, erro: 'SESSAO' };
  if (doSite && req.acao === 'carimbo') return appCarimbo_();`],
  [`function appPapel_(usuario) { return APP_ADMINS.indexOf(String(usuario || '').toLowerCase()) >= 0 ? 'perito' : 'assistente'; }`,
    `function appPapel_(usuario) { const u = String(usuario || '').toLowerCase(); return APP_PAPEL_SITE[u] || (APP_ADMINS.indexOf(u) >= 0 ? 'perito' : 'assistente'); }`]
];

let codigo = ORIGINAL;
for (const [a, b] of TROCAS) {
  if (codigo.split(a).length !== 2) throw new Error('Troca não encontrada no original: ' + a.slice(0, 60));
  codigo = codigo.replace(a, b);
}
codigo += '\n' + fs.readFileSync(path.join(HERE, '..', 'apps-script', 'AppPericias-site.gs'), 'utf8');

/* ambiente que imita o Apps Script */
const props = new Map([['PROXY_CHAVE', CHAVE]]);
const cache = new Map();
const log = [];
const ctx = {
  APP_ADMINS: ['bruno'],
  PropertiesService: { getScriptProperties: () => ({ getProperty: k => props.has(k) ? props.get(k) : null, setProperty: (k, v) => props.set(k, String(v)), deleteProperty: k => props.delete(k) }) },
  CacheService: { getScriptCache: () => ({ get: k => cache.has(k) ? cache.get(k) : null, put: (k, v) => cache.set(k, v), remove: k => cache.delete(k) }) },
  Utilities: {
    Charset: { UTF_8: 'utf8' },
    computeHmacSha256Signature: (v, k) => Array.from(crypto.createHmac('sha256', Buffer.from(k, 'utf8')).update(Buffer.from(v, 'utf8')).digest()).map(b => b > 127 ? b - 256 : b),
    getUuid: () => crypto.randomUUID()
  },
  Logger: { log: m => log.push(m) },
  ContentService: { MimeType: { JSON: 'json' }, createTextOutput: s => ({ s, setMimeType() { return this; } }) },
  appLogin_: (u, s) => (u === 'antigo' && s === 'senha-antiga' ? { ok: true, token: 'x'.repeat(64), usuario: 'antigo', papel: 'assistente' } : { ok: false, erro: 'Usuário ou senha incorretos.' }),
  appValidarSessao_: t => (t === 'x'.repeat(64) ? 'antigo' : null),
  appInicial_: u => inicial(u),
  appSalvar_: (req, u) => salvar(req, u),
  appMover_: (req, u) => mover(req, u),
  SpreadsheetApp: { getActive: () => ({ getId: () => 'planilha' }) },
  DriveApp: { getFileById: () => ({ getLastUpdated: () => new Date(planilhaEditadaEm) }) }
};
let planilhaEditadaEm = Date.now() - 3600000;
vm.createContext(ctx);
vm.runInContext(codigo + '\nthis.doPost = doPost; this.appCriarChaveSite = appCriarChaveSite; this.appSoSiteLigar = appSoSiteLigar; this.appSoSiteDesligar = appSoSiteDesligar;', ctx);

/* dados fictícios, guardados em memória e alterados de verdade (como a planilha) */
const CAB = ['PROCESSO', 'REQUERENTE', 'REQUERIDA', 'CIDADE', 'FORUM', 'TIPO', 'STATUS', 'SISTEMA', 'PERICIA', 'PRAZOS', 'LAUDO', 'PAGO', 'HONORARIOS', 'PROXIMO PASSO', 'OBSERVACAO'];
const dia = n => new Date(Date.now() + n * 864e5).toLocaleDateString('pt-BR');
export const DADOS = {
  PERICIAS: [
    ['1000001-11.2026.8.26.0576', 'Paciente Fictício Um', 'INSS', 'SÃO JOSÉ DO RIO PRETO', '1ª VARA CÍVEL', 'AUXÍLIO-ACIDENTE', 'ACEITE', 'EPROC FAZENDA', dia(5), dia(20), '', 'RESERVADO', 'R$ 600,00', 'PERICIA', ''],
    ['1000002-22.2026.8.26.0576', 'Paciente Fictício Dois', 'Plano de Saúde Exemplo', 'MIRASSOL', '2ª VARA', 'ERRO MÉDICO', 'AGUARDANDO', 'ESAJ', '', dia(3), '', '', 'R$ 3.000,00', 'ACEITE', 'teste'],
    ['1000003-33.2026.8.26.0576', 'Paciente Fictício Três', 'Município Exemplo', 'BADY BASSITT', 'VARA ÚNICA', 'INTERDIÇÃO', 'ACEITE', 'EPROC CÍVEL', dia(-10), dia(15), 'EM PRODUÇÃO', '', 'R$ 1.200,00', 'LAUDO', '']
  ],
  CONCLUSOS: [], RENUNCIAS: []
};
const listar = aba => ({ ok: true, aba, cabecalho: CAB, linhas: DADOS[aba].map((v, i) => ({ linha: i + 2, v: v.slice() })) });
function salvar(req, usuario) {
  const rows = DADOS[req.aba]; if (!rows) return { ok: false, erro: 'Aba inválida' };
  const row = rows[Number(req.linha) - 2];
  if (!row || row[0].trim() !== String(req.processoEsperado || '').trim()) return { ok: false, erro: 'CONFLITO' };
  const campos = [];
  for (const [k, v] of Object.entries(req.esperado || {})) { const i = CAB.indexOf(k); if (i >= 0 && String(row[i]).trim() !== String(v || '').trim()) campos.push({ campo: k, atual: row[i] }); }
  if (campos.length) return { ok: false, erro: 'CONFLITO_CAMPO', campos };
  for (const [k, v] of Object.entries(req.dados || {})) { const i = CAB.indexOf(k); if (i >= 0) row[i] = String(v); }
  planilhaEditadaEm = Date.now();
  return { ok: true, linha: Number(req.linha), por: usuario };
}
function mover(req) {
  const de = DADOS[req.de], para = DADOS[req.para]; const i = Number(req.linha) - 2;
  if (!de || !para || !de[i] || de[i][0] !== req.processoEsperado) return { ok: false, erro: 'CONFLITO' };
  para.push(de.splice(i, 1)[0]); planilhaEditadaEm = Date.now();
  return { ok: true, linha: para.length + 1 };
}
function inicial(usuario) {
  return {
    ok: true, usuario, papel: ctx.appPapel_ ? ctx.appPapel_(usuario) : 'assistente',
    abas: { PERICIAS: listar('PERICIAS'), CONCLUSOS: listar('CONCLUSOS'), RENUNCIAS: listar('RENUNCIAS') },
    agenda: [], livres: [], atividade: [{ data: dia(0) + ' 10:00', usuario, processo: '', acao: 'Teste', detalhe: '' }],
    tarefas: [], verificados: {}, usuarios: [{ u: 'bruno', papel: 'perito' }], canais: [], hora: new Date().toTimeString().slice(0, 5), prefs: {}
  };
}

export const ultimo = { usuario: null, acao: null };
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/estado') { res.end(JSON.stringify({ ultimo, so_site: props.get('SO_SITE') || null })); return; }
  if (url.pathname === '/editar-planilha') { DADOS.PERICIAS[0][14] = 'editado direto na planilha'; planilhaEditadaEm = Date.now(); res.end('ok'); return; }
  if (url.pathname === '/so-site') { ctx.appSoSiteLigar(); res.end('ok'); return; }
  if (url.pathname === '/so-site-desligar') { ctx.appSoSiteDesligar(); res.end('ok'); return; }
  let body = '';
  req.on('data', c => { body += c; });
  req.on('end', () => {
    // o Apps Script real responde 302 para outro endereço com o JSON; imitamos isso
    const e = { parameter: Object.fromEntries(url.searchParams), postData: { contents: body } };
    let out;
    try { out = ctx.doPost(e).s; } catch (x) { out = JSON.stringify({ ok: false, erro: String(x) }); }
    try { const j = JSON.parse(out); ultimo.usuario = j.usuario || j.por || null; ultimo.acao = url.searchParams.get('a'); } catch (x) { }
    if (url.pathname === '/exec' && req.method === 'POST') {
      const id = crypto.randomUUID(); respostas.set(id, out);
      res.writeHead(302, { Location: `http://127.0.0.1:${PORT}/echo?id=${id}` }); res.end(); return;
    }
    if (url.pathname === '/echo') { const id = url.searchParams.get('id'); res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(respostas.get(id) || '{"ok":false}'); respostas.delete(id); return; }
    res.writeHead(404); res.end();
  });
});
const respostas = new Map();
server.listen(PORT, '127.0.0.1', () => console.log('Apps Script simulado em http://127.0.0.1:' + PORT + '/exec'));
