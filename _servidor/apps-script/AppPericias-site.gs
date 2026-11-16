// ==================== SITE (Cloudflare): pedidos assinados ====================
// Cole este bloco inteiro no FIM do arquivo AppPericias (Apps Script da planilha).
// Depois da migração, o login é feito em brunomichels.com.br/pericias. O site repassa cada pedido
// para cá assinado com a chave PROXY_CHAVE (Propriedades do Script), dizendo quem é o usuário e o perfil.
// Enquanto SO_SITE não for ligado, o login antigo continua funcionando (transição sem parar o app).
//
// Também é preciso trocar 3 trechos no AppPericias (veja _servidor/LEIA-ME.md, seção "Apps Script").

const APP_PAPEL_SITE = {};

function appUsuarioSite_(req, e) {
  const p = (e && e.parameter) || {};
  if (!p.s || !p.u || !p.a || !p.t || !p.n) return null;
  const chave = PropertiesService.getScriptProperties().getProperty('PROXY_CHAVE');
  if (!chave || chave.length < 32) return null;
  const t = Number(p.t);
  if (!t || Math.abs(Date.now() - t) > 5 * 60 * 1000) return null; // assinatura vale 5 minutos
  const base = [p.u, p.p, p.a, p.t, p.n].join('|');
  const sig = Utilities.computeHmacSha256Signature(base, chave, Utilities.Charset.UTF_8)
    .map(b => ('0' + (b & 255).toString(16)).slice(-2)).join('');
  if (!appIgualSeguro_(sig, String(p.s))) return null;
  if (String(req.acao) !== String(p.a)) return null; // a ação assinada tem que ser a pedida
  const cache = CacheService.getScriptCache();
  if (cache.get('N_' + p.n)) return null; // o mesmo pedido não vale duas vezes
  cache.put('N_' + p.n, '1', 600);
  const u = String(p.u).trim().toLowerCase();
  if (!/^[a-z0-9._-]{2,40}$/.test(u)) return null;
  APP_PAPEL_SITE[u] = p.p === 'perito' ? 'perito' : 'assistente';
  return u;
}

function appIgualSeguro_(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

// data da última alteração da planilha (o site consulta no máximo 1 vez por minuto para avisar os aparelhos
// quando alguém mexe direto na planilha, fora do app)
function appCarimbo_() {
  return { ok: true, t: DriveApp.getFileById(SpreadsheetApp.getActive().getId()).getLastUpdated().getTime() };
}

function appSoSite_() {
  return PropertiesService.getScriptProperties().getProperty('SO_SITE') === '1';
}

// 1) Chave do site. Jeito normal: Configurações do projeto (engrenagem à esquerda) > Propriedades do script >
//    Adicionar propriedade do script: nome PROXY_CHAVE, valor = o PROXY_CHAVE calculado a partir do SEGREDO_SITE
//    do Cloudflare. Salvar.
//    Jeito alternativo: rodar appCriarChaveSite UMA vez e copiar o valor do Registro de execução para um
//    segredo PERICIAS_CHAVE no Cloudflare (ele passa a valer no lugar do derivado do SEGREDO_SITE).
function appCriarChaveSite() {
  const props = PropertiesService.getScriptProperties();
  let k = props.getProperty('PROXY_CHAVE');
  if (!k) {
    k = (Utilities.getUuid() + Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
    props.setProperty('PROXY_CHAVE', k);
  }
  Logger.log('PERICIAS_CHAVE = ' + k);
}

// 2) Depois que o /pericias estiver funcionando pelo site: rode para desligar o login antigo
//    (o endereço do Apps Script passa a recusar qualquer pedido que não venha assinado pelo site).
function appSoSiteLigar() {
  PropertiesService.getScriptProperties().setProperty('SO_SITE', '1');
  Logger.log('Pronto: o Apps Script só aceita pedidos do site.');
}

// Para voltar atrás (emergência): rode appSoSiteDesligar e o login antigo volta a funcionar.
function appSoSiteDesligar() {
  PropertiesService.getScriptProperties().deleteProperty('SO_SITE');
  Logger.log('Login antigo religado.');
}
