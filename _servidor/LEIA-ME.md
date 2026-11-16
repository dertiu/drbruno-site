# Servidor do site (Cloudflare Workers + D1)

Esta pasta transforma o site em uma versão protegida. São duas áreas **totalmente separadas**, cada uma com seu banco, seu cookie, seus usuários e seu painel:

- **/calculadoras**: login, cadastro aberto, visitante, códigos de acesso e painel em `/painel/`.
- **/pericias**: área privada do perito e da equipe, sem cadastro aberto (só o administrador cria contas), com verificação em duas etapas e repasse assinado ao Apps Script da planilha. Ver a seção "/pericias" abaixo.

A pasta não é publicada pelo GitHub Pages (pastas que começam com `_` ficam de fora), então o site atual continua funcionando como está até a migração.

## Como funciona

- **Código protegido.** As calculadoras (`app.js`, `dados.js`, `descricoes.js`, `sigtap.js`) só são entregues pelo servidor a quem tem acesso. Sem login, a resposta é 401. Os arquivos-fonte `t-*.js` e `core.js` não vão para o ar: o build junta tudo em um único `app.js` compactado e embaralhado.
- **Entrada** (`/calculadoras/`): a página pública só tem a casca; o `gate.js` confere o acesso e então carrega o app. Telas: visitante, entrar, criar conta (nome, e-mail, senha, CRM/UF, WhatsApp, código opcional), sem acesso (usar código, assinar, pedir pelo WhatsApp), esqueci a senha e nova senha.
- **Quem tem acesso:** administrador; conta com acesso vitalício; conta com data de fim no futuro; visitante (enquanto o modo visitante estiver ligado). Com o modo visitante ligado, contas sem acesso também usam tudo.
- **Offline:** depois de entrar, o app guarda o código no aparelho e funciona sem internet por `offline_dias` (padrão 10; visitante 3), nunca além da data de fim do acesso. Ao sair da conta ou perder o acesso, o código é apagado do aparelho.
- **Painel** (`/painel/`): resumo, usuários (somar dias, até uma data, vitalício, retirar, bloquear, tornar administrador, link de nova senha, desconectar aparelhos, excluir, observações, histórico), códigos (por dias, até data, vitalício; vários de uma vez; código de grupo com vários usos; só para um e-mail; validade para resgate; mensagem pronta para WhatsApp), ajustes e registro de tudo.
- **Editor de conteúdo** (`/calculadoras/admin.html`): o mesmo de antes, agora aberto só para administradores logados.

## Estrutura

```
_servidor/
  build.mjs          monta dist/ (o que vai para o ar) a partir dos arquivos do site
  wrangler.jsonc     configuração do Cloudflare (nome, banco D1, rotas protegidas)
  src/index.js       roteamento e proteção dos arquivos
  src/api.js         cadastro, entrar, visitante, códigos, senha
  src/admin.js       API do painel
  src/auth.js        senhas, sessões, regra de acesso, concessão de acesso
  src/db.js          tabelas (criadas sozinhas), ajustes, registro, limite de tentativas
  src/comum/senha.js cálculo das senhas (cada área usa a sua pimenta)
  src/pericias/      /pericias: sessões, duas etapas (totp.js), contas, painel e repasse ao Apps Script
  apps-script/       bloco para colar no AppPericias.gs (pedidos assinados pelo site)
  web/pericias/      entrada (entrar.js), Minha conta e administração (perfil/)
  web/calculadoras/  gate.js, gate.css, sw.js (offline)
  web/painel/        painel de administração
  web/well-known/    vira /.well-known/ (assetlinks.json do app Android)
  testes/            testes automáticos da API e do navegador
```

## Nova calculadora

Continue como sempre: crie o `t-xxx.js` em `calculadoras/` e coloque o `<script src="t-xxx.js">` em `calculadoras/index.html`. O build lê essa lista e inclui o arquivo no `app.js` na mesma ordem. Para o editor, a lista é a de `calculadoras/admin.html`.

## Rodar no computador

```
cd _servidor
npm install
printf 'ADMIN_SETUP_CODE=codigo-teste-123\nSENHA_PEPPER=qualquer-texto-longo\n' > .dev.vars
npm run dev                      # http://localhost:8787
python3 testes/api_test.py       # com o banco local zerado: rm -rf .wrangler/state/v3/d1
python3 testes/ui_test.py        # precisa de: pip install playwright requests
node testes/gas_simulado.mjs &   # Apps Script simulado para o /pericias
python3 testes/pericias_api_test.py
python3 testes/pericias_ui_test.py
```

Para o /pericias, o `.dev.vars` também precisa de `PERICIAS_SETUP_CODE=pericias-teste-123`, `PERICIAS_PEPPER=...`, `PERICIAS_CHAVE=chave-de-teste-0123456789abcdef0123456789abcdef` e `PERICIAS_GAS_URL=http://127.0.0.1:8898/exec` (no `.dev.vars` ele vale no lugar do endereço real que está em `wrangler.jsonc`). Os testes usam os segredos separados; no Cloudflare basta o `SEGREDO_SITE` (ver abaixo).

`OFUSCAR=0 npm run build` gera o `app.js` só compactado (útil para achar erros).

## Publicar no Cloudflare

Já feito: os dois bancos D1 existem (`drbruno` e `drbruno_pericias`, IDs no `wrangler.jsonc`) e cada um tem a linha `codigo_configuracao` (código para criar o primeiro administrador, apagada sozinha depois do uso). O endereço do Apps Script está em `vars` no `wrangler.jsonc` (não é segredo: sem a assinatura do site ele não aceita nada depois de `appSoSiteLigar`).

1. Workers & Pages > Create > Import a repository > este repositório. Nome do Worker: `drbruno-site`. Build command `npm ci && npm run build`, Deploy command `npx wrangler deploy`, Advanced settings > Path (root directory) `_servidor`. Desmarcar builds de branches que não são de produção.
2. Settings > Build > Branch control: branch de produção `protecao-login` (enquanto o GitHub Pages segue no `main`). Se o primeiro build rodou no `main`, ele falha (o `main` não tem `_servidor`): é normal, basta trocar a branch e fazer um novo push.
3. Settings > Variables and Secrets > Add > tipo **Secret**: `SEGREDO_SITE` (texto aleatório com 64 caracteres). Nunca mude depois que houver contas.
4. Apps Script (seção "/pericias" abaixo), com `PROXY_CHAVE` = HMAC-SHA256(SEGREDO_SITE, "chave-apps-script") em hexadecimal.
5. Abrir `https://drbruno-site.<sua-conta>.workers.dev/painel/` e criar o administrador das calculadoras. Abrir `.../pericias/`, tocar em "Configurar o primeiro administrador" e criar a conta do perito (usuário na planilha: `bruno`).
6. Domínio: adicionar `brunomichels.com.br` ao Cloudflare (trocar os DNS no Registro.br). Conferir se os registros de e-mail (MX, TXT) vieram. Apagar os registros que apontam para o GitHub (A do domínio, CNAME do `www`) e, no Worker, Settings > Domains & Routes > Add > Custom domain (`brunomichels.com.br` e `www.brunomichels.com.br`).
7. Só depois que o domínio abrir pelo Cloudflare: juntar `protecao-login` no `main` e trocar a branch de produção para `main`; GitHub > Settings > Pages > desligar, e Settings > General > Change visibility > Private. No Apps Script, rodar `appSoSiteLigar` (desliga o login antigo).

Voltar atrás: até o passo 6 nada muda para quem usa o site. Depois: devolver os DNS ao Registro.br (ou reapontar), `appSoSiteDesligar` no Apps Script, versão anterior em Implantar > Gerenciar implantações, Worker > Deployments > Rollback, bancos D1 > Time Travel (7 dias no plano gratuito), e o zip semanal em Releases (`backup-AAAA-MM-DD`).

## Segredos e variáveis (Settings > Variables and Secrets)

| Nome | Para quê |
|---|---|
| `SEGREDO_SITE` | **o único obrigatório.** Dele saem, cada um diferente: a pimenta das senhas das calculadoras, a pimenta das senhas do /pericias e a chave que assina os pedidos ao Apps Script (`src/comum/segredos.js`). Protege as senhas mesmo se o banco vazar. Nunca mude depois que houver contas |
| `SENHA_ITERACOES` | força do cálculo da senha. Plano gratuito: deixe vazio (20000). Plano pago: `100000`. As senhas antigas são refeitas sozinhas no próximo login |
| `ADMIN_SETUP_CODE`, `PERICIAS_SETUP_CODE` | opcional: código para criar o primeiro administrador. Sem eles, vale a linha `codigo_configuracao` gravada em cada banco |
| `SENHA_PEPPER`, `PERICIAS_PEPPER`, `PERICIAS_CHAVE` | opcional: se existirem, valem no lugar dos derivados do `SEGREDO_SITE` |
| `PERICIAS_GAS_URL` | endereço do Apps Script (o que termina em `/exec`). Já está em `vars` no `wrangler.jsonc`; o navegador não vê mais |
| `RESEND_API_KEY` e `EMAIL_FROM` | opcional: "Esqueci a senha" manda o link por e-mail (conta em resend.com, com o domínio verificado). Sem isso, a pessoa pede pelo WhatsApp e você gera o link na página do usuário |

## /pericias

### Como funciona
- **Dados continuam na planilha.** O navegador fala só com o site (`/pericias/api`). O site confere a sessão e repassa ao Apps Script com uma assinatura (HMAC-SHA256 com `PERICIAS_CHAVE`) que diz quem é o usuário, o perfil (perito ou assistente) e a ação. A assinatura vale 5 minutos e uma vez só. O Apps Script recusa qualquer pedido sem assinatura válida (depois de `appSoSiteLigar`), então o endereço antigo do Apps Script não serve mais para nada sozinho.
- **Login:** só o administrador cria contas (painel em Minha conta > Usuários). A pessoa recebe um link de convite (72 h) e cria a própria senha. Ao entrar: login e senha. A verificação em duas etapas (código do celular, com 10 códigos de recuperação) fica pronta e opcional: cada um pode ligar em Minha conta, e o administrador pode torná-la obrigatória em Ajustes.
- **Cada um muda o seu:** nome de exibição, login, e-mail, WhatsApp, senha, celular das duas etapas, códigos de recuperação; vê e desconecta os aparelhos e a atividade da conta.
- **Usuário na planilha** (`chave`): o nome usado no HISTORICO e nas tarefas. Não muda depois de criado, mesmo que a pessoa troque o login. Para quem já usava o app, crie a conta com o mesmo usuário de antes.
- **Administrador:** cria contas, troca perfil (perito/assistente), gera links de nova senha, zera as duas etapas (celular perdido), bloqueia, desconecta aparelhos, exclui. Ajustes: duas etapas obrigatórias (padrão desligado), dias sem uso até pedir login (7), dias máximos de sessão (30), aparelhos por conta (3), só Brasil, WhatsApp para "Esqueci a senha". Registro de tudo por 2 anos (entradas, senhas e códigos errados, ações que alteram a planilha, painel).
- **Proteções extras:** cookie `__Secure-pericias` só para `/pericias` (HttpOnly, SameSite=Strict), política de segurança de conteúdo restrita (sem código embutido, sem iframes), `app.js` e `config.js` só depois do login, `app.js` embaralhado, `config.js` publicado sem o endereço do Apps Script, `LEIA-ME.md` fora do ar, limite de tentativas (8 senhas por login a cada 15 min, 5 códigos por tentativa de login).
- **O app (`pericias/app.js`) funciona dos dois jeitos:** sem `SITE` em `config.js` (GitHub Pages, como antes) e com `SITE: true` (o build liga sozinho). Pode ir para o `main` sem quebrar a versão atual.

### Vários usuários ao mesmo tempo
- **Sincronia:** com o app na tela, cada aparelho pergunta ao site a cada 5 s se alguém alterou algo (`/pericias/conta/sincronia`). A pergunta não toca na planilha. Só quando outra pessoa mudou algo é que o app busca os dados de novo na planilha, e só a parte necessária (a lista inteira quando um processo foi movido). Com o app em segundo plano, para; ao voltar, confere na hora.
- **Mudanças feitas direto na planilha** (fora do app): o site consulta a data da última alteração no máximo 1 vez por minuto, para todos os aparelhos juntos (`appCarimbo_`), e avisa os aparelhos.
- **Quem está onde:** o topo mostra quem está online; a ficha mostra quem está com o mesmo processo aberto e quem está editando os dados dele.
- **Sem gravar por cima:** ao salvar, o Apps Script confere se cada campo ainda está como a tela mostrava; se alguém mudou antes, não grava, explica o que mudou e atualiza a tela. Gravações entram uma de cada vez (trava do Apps Script).
- **Ficha presa ao processo:** quando alguém move ou apaga uma linha, as de baixo sobem; a ficha aberta segue o número do processo, não a linha. Se o processo foi para Concluídos, a ficha acompanha e avisa.
- **Editando enquanto outro muda:** o que você está digitando não é apagado; aparece um aviso na ficha com "Ver versão nova".
- Custo: com 2 pessoas usando 10 h por dia, cerca de 15 mil consultas leves por dia ao site (o plano gratuito permite 100 mil) e uma consulta por minuto ao Google.

### Apps Script (fazer antes de trocar o domínio)
O ajuste aceita o app antigo e o site ao mesmo tempo; o app antigo só para quando você rodar `appSoSiteLigar`.

1. Planilha > Extensões > Apps Script > arquivo `AppPericias`.
2. Cole todo o conteúdo de `_servidor/apps-script/AppPericias-site.gs` no **fim** do arquivo.
3. Faça 3 trocas no `AppPericias`:
   - Em `doPost`: `saida = appRotear_(req);` vira `saida = appRotear_(req, e);`
   - O começo de `appRotear_`:
     ```js
     function appRotear_(req) {
       if (req.acao === 'login') return appLogin_(req.usuario, req.senha);
       const usuario = appValidarSessao_(req.token);
       if (!usuario) return { ok: false, erro: 'SESSAO' };
     ```
     vira
     ```js
     function appRotear_(req, e) {
       const doSite = appUsuarioSite_(req, e);
       if (!doSite && appSoSite_()) return { ok: false, erro: 'SESSAO' };
       if (!doSite && req.acao === 'login') return appLogin_(req.usuario, req.senha);
       const usuario = doSite || appValidarSessao_(req.token);
       if (!usuario) return { ok: false, erro: 'SESSAO' };
       if (doSite && req.acao === 'carimbo') return appCarimbo_();
     ```
   - A linha do `appPapel_`:
     ```js
     function appPapel_(usuario) { return APP_ADMINS.indexOf(String(usuario || '').toLowerCase()) >= 0 ? 'perito' : 'assistente'; }
     ```
     vira
     ```js
     function appPapel_(usuario) { const u = String(usuario || '').toLowerCase(); return APP_PAPEL_SITE[u] || (APP_ADMINS.indexOf(u) >= 0 ? 'perito' : 'assistente'); }
     ```
4. Salve (salvar não muda o app em uso: ele roda a versão implantada). Configurações do projeto (engrenagem) > Propriedades do script > Adicionar: `PROXY_CHAVE` com o valor derivado do `SEGREDO_SITE`. (Alternativa: rodar `appCriarChaveSite` e copiar o valor para um segredo `PERICIAS_CHAVE` no Cloudflare.)
5. Implantar > Gerenciar implantações > lápis > Versão: **Nova versão** > Implantar (a URL continua a mesma). Se o app antigo der erro depois disso, volte ali e escolha a versão anterior.
6. Depois que o /pericias estiver funcionando pelo site: rode `appSoSiteLigar`. Para voltar atrás numa emergência: `appSoSiteDesligar`.

O teste `testes/gas_simulado.mjs` aplica exatamente essas 3 trocas sobre o código original e carrega o bloco acima, então se o texto do `AppPericias` mudar, o teste avisa.

## Cobrar assinatura

Já está pronto para começar de forma simples: em Ajustes, coloque o link de pagamento (Mercado Pago, PagSeguro, Stripe) e o texto do botão. Quem estiver sem acesso vê o botão "Assinar"; ao confirmar o pagamento, você libera pelo painel (somar 30 dias, 1 ano) ou envia um código. Quando quiser começar a cobrar, desligue o modo visitante no painel.

Para automatizar depois: criar uma rota `/api/pagamento/<provedor>` que receba o aviso (webhook) do provedor, confira a assinatura do aviso, ache o usuário pelo e-mail ou pelo id enviado como referência e chame `grant(env, req, userId, { mode: 'dias', days: 31 }, { source: 'assinatura', detail: '...' })`. A tabela `subscriptions` já existe para guardar o estado de cada assinatura. Ao cobrar, vale passar para o plano pago do Cloudflare (US$ 5/mês) e usar `SENHA_ITERACOES=100000`.

## App nas lojas

O app instalável já funciona (Android e iPhone, pelo navegador: "Instalar" ou "Adicionar à tela de início"). Para as lojas:

- **Android (Play Store):** gerar o pacote em pwabuilder.com com o endereço `https://brunomichels.com.br/calculadoras/` (tipo Trusted Web Activity). O PWABuilder entrega um `assetlinks.json`: coloque o conteúdo em `web/well-known/assetlinks.json` e publique. Precisa de conta de desenvolvedor Google.
- **iPhone (App Store):** o PWABuilder gera um projeto iOS; precisa de Mac com Xcode e conta Apple Developer. A Apple costuma recusar apps que são só um site; vale incluir algo próprio do app antes de enviar.
- As lojas cobram taxa e têm regras próprias para assinaturas vendidas dentro do app e para links de pagamento externos. Conferir as regras vigentes antes de publicar com cobrança.

## O que a proteção faz e o que não faz

Faz: o código não fica público (nem no GitHub depois de privado, nem no site sem login); o que vai para o navegador é embaralhado; cada conta tem limite de aparelhos (o mais antigo sai); toda entrada, senha errada, código e ação do painel fica registrada com local aproximado; acesso pode ser retirado a qualquer momento e o aparelho apaga o código na próxima conexão; limite de tentativas contra chute de senha e de código; senhas guardadas com PBKDF2 + sal + pimenta; cookie de sessão HttpOnly, Secure e SameSite; bloqueio de envios vindos de outros sites.

Não faz: impedir 100% que alguém com acesso legítimo copie o que roda no navegador dele. No /pericias, também não protege a planilha e o Drive em si: quem tem acesso de edição pela conta Google continua vendo tudo por lá. O embaralhamento torna isso trabalhoso e o registro mostra quem acessou.
