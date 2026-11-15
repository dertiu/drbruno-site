# Site brunomichels.com.br

- `/pericias/` é área privada do Dr. Bruno e do assistente: não alterar.
- Calculadoras: fontes em `calculadoras/` (core.js + t-*.js; ordem em `calculadoras/index.html`). Nova ferramenta = novo t-*.js + `<script>` no index.html; o build pega sozinho.
- Versão protegida (login, cadastro, códigos, painel, offline) fica em `_servidor/` (Cloudflare Workers + D1). Leia `_servidor/LEIA-ME.md` antes de mexer.
  - `core.js` chama `window.DRB_HOOKS.sideHead()` (conta no topo do menu); manter esse gancho.
  - Depois de mudar calculadoras ou servidor: `cd _servidor && npm run build`, `npm run dev` e rodar `testes/api_test.py` e `testes/ui_test.py` (o teste compara cada ferramenta do pacote protegido com o original).
- Textos para o usuário em português, sem travessões.
