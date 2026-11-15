/* Monta a versão protegida do site em _servidor/dist (o que vai para o Cloudflare).
   Os arquivos-fonte continuam onde estão; aqui eles são juntados, compactados e embaralhados.
   - calculadoras/app.js     = todas as ferramentas (ordem de calculadoras/index.html), compactado e ofuscado
   - calculadoras/editor.js  = editor de conteúdo (ordem de calculadoras/admin.html), só para administradores
   - dados.js, descricoes.js e sigtap.js vão sem alteração (o editor lê esses arquivos), mas só para quem tem acesso
   Uso: npm run build   (OFUSCAR=0 npm run build para pular o embaralhamento) */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { transform } from 'esbuild';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const OUT = path.join(HERE, 'dist');
const WEB = path.join(HERE, 'web');
const CALC = path.join(ROOT, 'calculadoras');
const OFUSCAR = process.env.OFUSCAR !== '0';

// itens da raiz do repositório que não vão para o ar
const SKIP_ROOT = new Set(['_servidor', 'node_modules', 'CNAME', 'README.md', 'calculadoras']);
// arquivos de dados: vão sem alteração, protegidos
const DATA = ['dados.js', 'descricoes.js', 'sigtap.js'];

const read = p => fs.readFileSync(p, 'utf8');
const write = (p, s) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s); };
const copy = (a, b) => { fs.mkdirSync(path.dirname(b), { recursive: true }); fs.copyFileSync(a, b); };
function copyDir(src, dst, skip) {
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    if (e.name.startsWith('.') || (skip && skip.has(e.name))) continue;
    const a = path.join(src, e.name), b = path.join(dst, e.name);
    if (e.isDirectory()) copyDir(a, b); else copy(a, b);
  }
}
const scriptsOf = html => [...html.matchAll(/<script\s+src="([^"]+)"\s*><\/script>/g)].map(m => m[1]).filter(s => !/^https?:/.test(s));

async function minJs(code, name) {
  const r = await transform(code, { loader: 'js', minify: true, legalComments: 'none', charset: 'utf8', target: 'es2020', sourcefile: name });
  return r.code;
}
async function minCss(code) {
  return (await transform(code, { loader: 'css', minify: true, legalComments: 'none', charset: 'utf8' })).code;
}
async function obfuscate(code) {
  if (!OFUSCAR) return code;
  const { default: JO } = await import('javascript-obfuscator');
  return JO.obfuscate(code, {
    compact: true,
    target: 'browser',
    identifierNamesGenerator: 'mangled-shuffled',
    renameGlobals: false,
    stringArray: true,
    stringArrayThreshold: 0.8,
    stringArrayEncoding: ['base64'],
    stringArrayRotate: true,
    stringArrayShuffle: true,
    stringArrayIndexShift: true,
    stringArrayWrappersCount: 1,
    splitStrings: false,
    controlFlowFlattening: false,
    deadCodeInjection: false,
    selfDefending: false,
    debugProtection: false,
    unicodeEscapeSequence: false,
    transformObjectKeys: false,
    numbersToExpressions: false,
    simplify: true,
    seed: 1
  }).getObfuscatedCode();
}

/* junta os scripts como se fossem carregados um a um: o erro de um não derruba os outros */
function bundle(files) {
  return files.map(f => {
    const code = read(path.join(CALC, f));
    return `try{\n${code}\n}catch(e){console.error(${JSON.stringify('[calc] ' + f)},e)}`;
  }).join('\n;\n');
}

async function main() {
  const t0 = Date.now();
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  // 1) resto do site, como está (página inicial, /pericias etc.)
  copyDir(ROOT, OUT, SKIP_ROOT);

  // 2) calculadoras
  const D = path.join(OUT, 'calculadoras');
  const idx = read(path.join(CALC, 'index.html'));
  const appFiles = scriptsOf(idx).filter(s => !DATA.includes(s));
  const preFiles = scriptsOf(idx).filter(s => DATA.includes(s)); // carregados antes do app (hoje: dados.js)
  if (!appFiles.includes('core.js') || !appFiles.includes('boot.js')) throw new Error('index.html das calculadoras sem core.js/boot.js');
  // o embaralhador cria funções auxiliares no topo; o invólucro evita que virem variáveis globais
  const app = '(function(){' + (await obfuscate(await minJs(bundle(appFiles), 'app.js'))) + '\n})();';
  write(path.join(D, 'app.js'), app);

  const adm = read(path.join(CALC, 'admin.html'));
  const edFiles = scriptsOf(adm);
  write(path.join(D, 'editor.js'), await minJs(bundle(edFiles), 'editor.js'));
  write(path.join(D, 'admin.html'), adm.replace(/\s*<script\s+src="[^"]+"\s*><\/script>/g, '').replace('</body>', '  <script src="editor.js"></script>\n</body>'));

  for (const f of DATA) copy(path.join(CALC, f), path.join(D, f));
  for (const e of fs.readdirSync(CALC, { withFileTypes: true })) {
    if (e.name.startsWith('.')) continue;
    if (e.isDirectory()) { copyDir(path.join(CALC, e.name), path.join(D, e.name)); continue; }
    if (/\.(png|svg|webp|ico|webmanifest|woff2?)$/.test(e.name)) copy(path.join(CALC, e.name), path.join(D, e.name));
  }
  write(path.join(D, 'style.css'), await minCss(read(path.join(CALC, 'style.css'))));
  write(path.join(D, 'admin.css'), await minCss(read(path.join(CALC, 'admin.css'))));
  write(path.join(D, 'gate.css'), await minCss(read(path.join(WEB, 'calculadoras', 'gate.css'))));

  // versão do build (muda quando qualquer parte muda)
  const hash = crypto.createHash('sha256');
  for (const f of ['app.js', 'gate.css', 'style.css', ...DATA]) hash.update(fs.readFileSync(path.join(D, f)));
  hash.update(read(path.join(WEB, 'calculadoras', 'gate.js'))); hash.update(read(path.join(WEB, 'calculadoras', 'sw.js')));
  const BUILD = hash.digest('hex').slice(0, 10);

  const PROTECTED = [...preFiles, 'app.js', ...DATA.filter(f => !preFiles.includes(f))];
  const fonts = fs.readdirSync(path.join(D, 'fonts')).filter(f => f.endsWith('.woff2')).map(f => 'fonts/' + f);
  const SHELL = ['./', 'gate.js', 'gate.css', 'style.css', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png', ...fonts];
  const inject = s => s.replace(/__BUILD__/g, BUILD).replace(/__PRE__/g, JSON.stringify(preFiles)).replace(/__PROTECTED__/g, JSON.stringify(PROTECTED)).replace(/__SHELL__/g, JSON.stringify(SHELL));
  write(path.join(D, 'gate.js'), await minJs(inject(read(path.join(WEB, 'calculadoras', 'gate.js'))), 'gate.js'));
  write(path.join(D, 'sw.js'), await minJs(inject(read(path.join(WEB, 'calculadoras', 'sw.js'))), 'sw.js'));

  // página das calculadoras: sem a lista de scripts; quem carrega o app é o gate.js, depois de conferir o acesso
  let shell = idx.replace(/\s*<script\s+src="[^"]+"\s*><\/script>/g, '');
  shell = shell.replace("form-action 'none'", "form-action 'self'");
  shell = shell.replace('<link rel="stylesheet" href="style.css">', '<link rel="stylesheet" href="style.css">\n  <link rel="stylesheet" href="gate.css">');
  shell = shell.replace('</body>', '  <script src="gate.js"></script>\n</body>');
  shell = shell.replace('<body data-theme="dark">', '<body data-theme="dark" class="gate-on">');
  write(path.join(D, 'index.html'), shell);

  // 3) painel de administração e arquivos de configuração
  const P = path.join(OUT, 'painel');
  copy(path.join(WEB, 'painel', 'index.html'), path.join(P, 'index.html'));
  write(path.join(P, 'painel.js'), await minJs(read(path.join(WEB, 'painel', 'painel.js')), 'painel.js'));
  write(path.join(P, 'painel.css'), await minCss(read(path.join(WEB, 'painel', 'painel.css'))));
  for (const f of ['_headers', 'robots.txt']) copy(path.join(WEB, f), path.join(OUT, f));
  // web/well-known/ vira /.well-known/ (ex.: assetlinks.json do app Android)
  const wk = path.join(WEB, 'well-known');
  if (fs.existsSync(wk)) for (const f of fs.readdirSync(wk)) copy(path.join(wk, f), path.join(OUT, '.well-known', f));

  const kb = f => Math.round(fs.statSync(path.join(D, f)).size / 1024) + ' KB';
  console.log(`Build ${BUILD} pronto em ${Date.now() - t0} ms. app.js ${kb('app.js')} (${appFiles.length} arquivos${OFUSCAR ? ', ofuscado' : ''}), editor.js ${kb('editor.js')}.`);
}

main().catch(e => { console.error(e); process.exit(1); });
