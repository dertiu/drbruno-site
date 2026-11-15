# Servidor do site (Cloudflare Workers + D1)

Esta pasta transforma o site em uma versão protegida, com login, cadastro, códigos de acesso e painel de administração. Ela não é publicada pelo GitHub Pages (pastas que começam com `_` ficam de fora), então o site atual continua funcionando como está até a migração.

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
```

`OFUSCAR=0 npm run build` gera o `app.js` só compactado (útil para achar erros).

## Publicar no Cloudflare

1. Criar o banco: Storage & Databases > D1 > Create, nome `drbruno`. Copiar o ID para `database_id` no `wrangler.jsonc`.
2. Workers & Pages > Create > Import a repository > este repositório. Em Advanced settings: Root directory `_servidor`, Build command `npm ci && npm run build`, Deploy command `npx wrangler deploy`. O nome do Worker precisa ser `drbruno-site`.
3. Settings > Variables and Secrets, como **Secret**: `ADMIN_SETUP_CODE` e `SENHA_PEPPER` (texto longo aleatório; nunca mude depois, ou as senhas param de funcionar).
4. Abrir `https://drbruno-site.<sua-conta>.workers.dev/painel/` e criar o administrador com o código de configuração.
5. Domínio: adicionar `brunomichels.com.br` ao Cloudflare (trocar os DNS no Registro.br) e, no Worker, Settings > Domains & Routes > Add > Custom domain (`brunomichels.com.br` e `www.brunomichels.com.br`).
6. Só depois que o domínio abrir pelo Cloudflare: GitHub > Settings > Pages > desligar, e Settings > General > Change visibility > Private.

## Segredos e variáveis (Settings > Variables and Secrets)

| Nome | Para quê |
|---|---|
| `ADMIN_SETUP_CODE` | código para criar o primeiro administrador em `/painel/` (pode apagar depois) |
| `SENHA_PEPPER` | segredo misturado às senhas; protege as senhas mesmo se o banco vazar |
| `SENHA_ITERACOES` | força do cálculo da senha. Plano gratuito: deixe vazio (20000). Plano pago: `100000`. As senhas antigas são refeitas sozinhas no próximo login |
| `RESEND_API_KEY` e `EMAIL_FROM` | opcional: "Esqueci a senha" manda o link por e-mail (conta em resend.com, com o domínio verificado). Sem isso, a pessoa pede pelo WhatsApp e você gera o link na página do usuário |

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

Não faz: impedir 100% que alguém com acesso legítimo copie o que roda no navegador dele. O embaralhamento torna isso trabalhoso e o registro mostra quem acessou.
