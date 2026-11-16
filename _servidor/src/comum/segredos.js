/* Segredos do site.
   O próprio site gera e guarda o segredo principal num banco separado (COFRE, banco D1 drbruno_cofre),
   então ninguém precisa digitar nem copiar segredo nenhum. Do segredo principal saem, cada um diferente:
   - a pimenta das senhas das calculadoras
   - a pimenta das senhas do /pericias
   A chave que assina os pedidos ao Apps Script é criada pelo próprio Apps Script e chega ao site pelo
   pareamento (appParearSite no Apps Script; o site só aceita a chave depois que a planilha confirma que é a dela).

   Ordem de preferência:
   - segredo principal: o que já está no cofre > segredo SEGREDO_SITE do painel > gerado agora e guardado no cofre
   - SENHA_PEPPER, PERICIAS_PEPPER e PERICIAS_CHAVE do painel (ou do .dev.vars nos testes) valem no lugar dos outros
   Nunca apague a linha SEGREDO_SITE do cofre depois que houver contas: as senhas deixariam de conferir. */
const te = new TextEncoder();
let cache = null, cacheEm = 0, tabelaOk = false;

const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
async function derivar(mestre, rotulo) {
  const k = await crypto.subtle.importKey('raw', te.encode(mestre), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', k, te.encode(rotulo)));
}

async function criarTabela(env) {
  if (tabelaOk) return;
  await env.COFRE.prepare('CREATE TABLE IF NOT EXISTS segredos (nome TEXT PRIMARY KEY, valor TEXT NOT NULL, criado_em INTEGER NOT NULL DEFAULT (unixepoch()))').run();
  tabelaOk = true;
}

/* lê o cofre; null = o cofre não respondeu (nesse caso nunca gera segredo novo) */
async function lerCofre(env) {
  if (!env || !env.COFRE) return {};
  try {
    await criarTabela(env);
    const { results } = await env.COFRE.prepare('SELECT nome, valor FROM segredos').all();
    const o = {};
    for (const r of results || []) o[r.nome] = r.valor;
    return o;
  } catch (e) { return null; }
}

async function gerarMestre(env) {
  const novo = hex(crypto.getRandomValues(new Uint8Array(32)));
  await env.COFRE.prepare("INSERT INTO segredos (nome, valor) VALUES ('SEGREDO_SITE', ?1) ON CONFLICT(nome) DO NOTHING").bind(novo).run();
  // se outro pedido gerou ao mesmo tempo, vale o que ficou gravado
  const r = await env.COFRE.prepare("SELECT valor FROM segredos WHERE nome = 'SEGREDO_SITE'").first();
  return r ? String(r.valor) : '';
}

export async function segredos(env) {
  env = env || {};
  if (cache && Date.now() - cacheEm < 60000) return cache;
  const cof = await lerCofre(env);
  if (cof === null && cache) return cache;
  let mestre = '', doPainel = false;
  if (cof && cof.SEGREDO_SITE) mestre = String(cof.SEGREDO_SITE);
  else if (env.SEGREDO_SITE) { mestre = String(env.SEGREDO_SITE); doPainel = true; }
  else if (cof && env.COFRE) mestre = await gerarMestre(env);
  const d = async r => (mestre.length >= 32 ? derivar(mestre, r) : '');
  const novo = {
    senhaPepper: env.SENHA_PEPPER || await d('senha-calculadoras'),
    periciasPepper: env.PERICIAS_PEPPER || await d('senha-pericias'),
    periciasChave: env.PERICIAS_CHAVE || (cof && cof.PERICIAS_CHAVE) || (doPainel ? await d('chave-apps-script') : '')
  };
  if (!novo.senhaPepper || !novo.periciasPepper) throw new Error('Segredos do site indisponíveis (cofre sem resposta).');
  if (cof !== null) { cache = novo; cacheEm = Date.now(); }
  return novo;
}

/* guarda a chave do Apps Script depois do pareamento */
export async function guardarNoCofre(env, nome, valor) {
  await criarTabela(env);
  await env.COFRE.prepare('INSERT INTO segredos (nome, valor) VALUES (?1, ?2) ON CONFLICT(nome) DO UPDATE SET valor = excluded.valor, criado_em = unixepoch()').bind(nome, valor).run();
  cache = null;
}

/* código para criar o primeiro administrador: segredo próprio ou, mais simples, gravado no banco
   (linha 'codigo_configuracao' na tabela de ajustes; apagada sozinha depois que o administrador é criado) */
export async function codigoConfiguracao(envValor, db, tabela) {
  if (envValor) return String(envValor);
  try {
    const r = await db.prepare(`SELECT value FROM ${tabela} WHERE key = 'codigo_configuracao'`).first();
    return r && r.value ? String(r.value) : '';
  } catch (e) { return ''; }
}
/* compara sem diferenciar maiúsculas, espaços e hífens (8KFW-UMX9-KC9P = 8kfw umx9 kc9p) */
export const normCodigo = v => String(v || '').toUpperCase().replace(/[\s-]/g, '');
export async function apagarCodigoConfiguracao(db, tabela) {
  try { await db.prepare(`DELETE FROM ${tabela} WHERE key = 'codigo_configuracao'`).run(); } catch (e) { }
}
