# Site brunomichels.com.br

- `/pericias/` é a área privada do Dr. Bruno e da equipe, totalmente separada das calculadoras (usuários, banco, cookie e painel próprios). Dados na planilha via Apps Script (backend fora do repositório). `pericias/app.js` funciona com e sem `SITE` em config.js: manter os dois modos até a migração.
- Calculadoras: fontes em `calculadoras/` (core.js + t-*.js; ordem em `calculadoras/index.html`). Nova ferramenta = novo t-*.js + `<script>` no index.html (e no ASSETS do `calculadoras/sw.js`, subindo a versão do CACHE); o build pega sozinho.
  - Até a troca do domínio, o Dr. Bruno usa o site antigo (GitHub Pages, branch `main`) no hospital: ferramenta nova das calculadoras vai para a `protecao-login` E para o `main` (cherry-pick só do commit da ferramenta, sem as mudanças do servidor; testar o main com servidor estático antes de enviar).
- Versão protegida (login, cadastro, códigos, painel, offline) fica em `_servidor/` (Cloudflare Workers + D1). Leia `_servidor/LEIA-ME.md` antes de mexer.
  - `core.js` chama `window.DRB_HOOKS.sideHead()` (conta no topo do menu); manter esse gancho.
  - Depois de mudar calculadoras, perícias ou servidor: `cd _servidor && npm run build`, `npm run dev` (e `node testes/gas_simulado.mjs` para o /pericias) e rodar os testes de `testes/` (o ui_test compara cada calculadora do pacote protegido com o original).
- Textos para o usuário em português, sem travessões.
