/* Segredos do site. Para facilitar a configuração, basta UM segredo no Cloudflare: SEGREDO_SITE
   (texto longo aleatório). Dele saem, cada um diferente e independente:
   - a pimenta das senhas das calculadoras
   - a pimenta das senhas do /pericias
   - a chave que assina os pedidos ao Apps Script (PROXY_CHAVE no Apps Script)
   Se algum segredo próprio existir (SENHA_PEPPER, PERICIAS_PEPPER, PERICIAS_CHAVE), ele vale no lugar do derivado.
   Nunca troque o SEGREDO_SITE depois que houver contas: as senhas deixariam de conferir. */
const te = new TextEncoder();
let cache = null, cacheDe = null;

async function derivar(mestre, rotulo) {
  const k = await crypto.subtle.importKey('raw', te.encode(mestre), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return [...new Uint8Array(await crypto.subtle.sign('HMAC', k, te.encode(rotulo)))].map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function segredos(env) {
  const mestre = (env && env.SEGREDO_SITE) || '';
  if (cache && cacheDe === mestre) return cache;
  const d = async r => (mestre.length >= 32 ? derivar(mestre, r) : '');
  cache = {
    senhaPepper: env.SENHA_PEPPER || await d('senha-calculadoras'),
    periciasPepper: env.PERICIAS_PEPPER || await d('senha-pericias'),
    periciasChave: env.PERICIAS_CHAVE || await d('chave-apps-script')
  };
  cacheDe = mestre;
  return cache;
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
