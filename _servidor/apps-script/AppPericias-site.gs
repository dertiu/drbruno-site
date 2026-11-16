// ==================== SITE (Cloudflare): pedidos assinados ====================
// Cole este bloco inteiro no FIM do arquivo AppPericias (Apps Script da planilha).
// Depois da migração, o login é feito em brunomichels.com.br/pericias. O site repassa cada pedido
// para cá assinado com a chave PROXY_CHAVE (Propriedades do script), dizendo quem é o usuário e o perfil.
// Enquanto SO_SITE não for ligado, o login antigo continua funcionando (transição sem parar o app).
//
// Também é preciso trocar 3 trechos no AppPericias (veja _servidor/LEIA-ME.md, seção "Apps Script").

// endereço do site novo (o de teste .workers.dev ou o domínio); usado só por appParearSite
var APP_SITE_URL = 'https://brunomichels.com.br';

var APP_PAPEL_SITE = {};

function appUsuarioSite_(req, e) {
  var p = (e && e.parameter) || {};
  if (!p.s || !p.u || !p.a || !p.t || !p.n) return null;
  var chave = PropertiesService.getScriptProperties().getProperty('PROXY_CHAVE');
  if (!chave || chave.length < 32) return null;
  var t = Number(p.t);
  if (!t || Math.abs(Date.now() - t) > 5 * 60 * 1000) return null; // assinatura vale 5 minutos
  var base = [p.u, p.p, p.a, p.t, p.n].join('|');
  var bytes = Utilities.computeHmacSha256Signature(base, chave, Utilities.Charset.UTF_8);
  var sig = '';
  for (var i = 0; i < bytes.length; i++) sig += ('0' + (bytes[i] & 255).toString(16)).slice(-2);
  if (!appIgualSeguro_(sig, String(p.s))) return null;
  if (String(req.acao) !== String(p.a)) return null; // a ação assinada tem que ser a pedida
  var cache = CacheService.getScriptCache();
  if (cache.get('N_' + p.n)) return null; // o mesmo pedido não vale duas vezes
  cache.put('N_' + p.n, '1', 600);
  var u = String(p.u).trim().toLowerCase();
  if (!/^[a-z0-9._-]{2,40}$/.test(u)) return null;
  APP_PAPEL_SITE[u] = p.p === 'perito' ? 'perito' : 'assistente';
  return u;
}

function appIgualSeguro_(a, b) {
  if (a.length !== b.length) return false;
  var r = 0;
  for (var i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
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

// cria a chave da planilha (uma vez só; não mostra a chave em lugar nenhum)
function appCriarChaveSite() {
  var props = PropertiesService.getScriptProperties();
  var k = props.getProperty('PROXY_CHAVE');
  if (!k) {
    k = (Utilities.getUuid() + Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
    props.setProperty('PROXY_CHAVE', k);
    Logger.log('Chave da planilha criada.');
  } else {
    Logger.log('A planilha já tinha chave.');
  }
  return k;
}

// 1) Depois de implantar a nova versão: rode appParearSite (seletor de funções > Executar).
//    Ela cria a chave da planilha e manda para o site; o site confere com a planilha antes de aceitar.
//    Ninguém precisa copiar a chave. Para trocar a chave: apague PROXY_CHAVE nas Propriedades do script,
//    implante uma nova versão e rode de novo.
function appParearSite() {
  var k = appCriarChaveSite();
  var r = UrlFetchApp.fetch(APP_SITE_URL + '/pericias/conta/parear', {
    method: 'post', contentType: 'application/json', payload: JSON.stringify({ chave: k }), muteHttpExceptions: true
  });
  Logger.log('Site respondeu ' + r.getResponseCode() + ': ' + r.getContentText());
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
