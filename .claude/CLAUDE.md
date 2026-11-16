# Site brunomichels.com.br

- `/pericias/` é a área privada do Dr. Bruno e da equipe, totalmente separada das calculadoras (usuários, banco, cookie e painel próprios). Dados na planilha via Apps Script (backend fora do repositório). `pericias/app.js` funciona com e sem `SITE` em config.js: manter os dois modos até a migração.
- Calculadoras: fontes em `calculadoras/` (core.js + t-*.js; ordem em `calculadoras/index.html`). Nova ferramenta = novo t-*.js + `<script>` no index.html; o build pega sozinho.
- Versão protegida (login, cadastro, códigos, painel, offline) fica em `_servidor/` (Cloudflare Workers + D1). Leia `_servidor/LEIA-ME.md` antes de mexer.
  - `core.js` chama `window.DRB_HOOKS.sideHead()` (conta no topo do menu); manter esse gancho.
  - Depois de mudar calculadoras, perícias ou servidor: `cd _servidor && npm run build`, `npm run dev` (e `node testes/gas_simulado.mjs` para o /pericias) e rodar os testes de `testes/` (o ui_test compara cada calculadora do pacote protegido com o original).
- Textos para o usuário em português, sem travessões.
