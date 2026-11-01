# App Perícias: instalação e atualização

O app tem duas partes:

1. **Tela do app** (esta pasta `pericias/`): arquivos estáticos publicados pelo GitHub Pages em brunomichels.com.br/pericias.
2. **Backend** (`pericias/backend/AppPericias.gs`): fica no Apps Script da própria planilha, ao lado do script do Discord (`Código.gs`). Faz o login, lê e grava nas abas, registra o histórico e usa o script do Discord para enviar mensagens.

O script do Discord não é alterado. O app só acrescenta a aba **HISTORICO** (criada sozinha na primeira alteração feita pelo app).

## Primeira instalação

1. Planilha > **Extensões > Apps Script**.
2. **+ > Script**, nome `AppPericias`, cole todo o conteúdo de `backend/AppPericias.gs` e salve.
3. No `Código.gs`, dentro de `onOpen()`, antes de `menu.addToUi();`:
   `menu.addItem('🔐 App: criar ou trocar senha de usuário', 'appCriarUsuarioDialogo');`
4. Recarregue a planilha e crie os usuários pelo menu Discord.
5. **Implantar > Nova implantação > App da Web**. Executar como: **Eu**. Quem pode acessar: **Qualquer pessoa**. Copie a URL (termina em `/exec`) e coloque em `config.js`.

## Quando o backend mudar (como nesta versão)

1. Apps Script > arquivo `AppPericias` > apague tudo e cole o novo `backend/AppPericias.gs`. Salve.
2. **Implantar > Gerenciar implantações** > lápis (editar) > em Versão escolha **Nova versão** > **Implantar**.
3. A URL continua a mesma. Não crie uma implantação nova, senão a URL muda.

Sem o passo 2 o app continua usando o backend antigo e as telas novas avisam erro de "Ação desconhecida".

### Autorizar o Drive e o Docs (uma vez, na versão com documentos)

1. No Apps Script, abra o arquivo `AppPericias`.
2. Na barra de cima, no seletor de função, escolha **appAutorizarDrive** e clique em **Executar**.
3. O Google pede permissão para Drive e Docs: **Revisar permissões > sua conta > Avançado > Acessar > Permitir**.
4. Depois faça a **Nova versão** da implantação (passo 2 acima).

## Documentos e pastas no Drive

- Estrutura usada: **PERICIAS / CIDADE / Nome do periciado** (Núcleo 4.0 fica em `NUCLEO 4`). Os IDs das pastas PERICIAS e Arquivos base estão no topo da seção DRIVE do `AppPericias.gs`.
- Ao abrir um processo, o app procura a pasta pelo nome do periciado (requerente, ou a parte requerida na interdição) dentro da pasta da cidade. Achando, guarda o vínculo. Não achando, oferece **criar** ou **vincular** a uma pasta existente.
- Ao cadastrar um processo novo, a pasta é criada junto (opção marcada por padrão).
- **Enviar arquivo** pelo app aceita até 15 MB por arquivo. Para a íntegra do processo, se for maior, use **Abrir pasta** e envie pelo Drive. Arquivos com "integra" ou "autos" no nome aparecem primeiro, com a etiqueta Íntegra.
- **Gerar documento** copia um modelo da pasta Arquivos base para a pasta do periciado e troca: tabela de identificação (processo, requerente, requerida), os mesmos nomes no corpo do texto, o juízo do endereçamento, a data de assinatura e, nos modelos com agendamento, data e horário da perícia. Valores em R$, número de evento e folhas ficam marcados em amarelo para conferir.
- O modelo original nunca é alterado. Cópias com nome "Cópia de ..." não aparecem na lista de modelos.

## O que o app faz

- **Painel**: indicadores, perícias de hoje e próximas, prazos com semáforo, alertas, processos por etapa, perícias por mês, tipos e atividade recente.
- **Processos**: lista com filtros ou **quadro por etapa** (arrastar o cartão muda o PRÓXIMO PASSO).
- **Ficha do processo**: linha do tempo das etapas, próxima ação, botões de atalho do fluxo (com confirmação mostrando o que muda e opção de desfazer), edição de todos os campos, histórico, copiar número, abrir no e-SAJ, enviar ao Discord.
- **Calendário**: perícias e prazos do mês, com link para o Google Agenda.
- **Agenda**: horários por dia e fila de processos para agendar. Agendar pelo app cria o horário em AGENDAMENTOS, atualiza o processo (data e etapa PERÍCIA) e pode avisar o #agenda.
- **Financeiro**: total a receber, situação dos honorários, MLEs a peticionar. UFESP configurável em `config.js`.
- **Discord**: mensagem livre ou por modelo, mensagens geradas a partir dos dados e botões para disparar as rotinas automáticas.
- **Arquivo**: Concluídos e Renúncias.

## Perfis de acesso

- **Perito** (usuários listados em `APP_ADMINS` no topo do `AppPericias.gs`, hoje só `bruno`): vê a página **Gestão** com total a receber, projeção por estágio, recebidos, valor por tipo e por comarca, laudos pendentes, indicadores, atividade da equipe e exportação em CSV.
- **Assistente** (qualquer outro usuário): vê a página **Pagamentos**, só com o operacional (MLE a peticionar, aguardando pagamento, travados por falta de reserva, aguardando depósito). Vê os honorários de cada processo, como na planilha, mas nenhum total. O painel e as mensagens geradas para o Discord também não mostram somas.
- A Gestão é bloqueada no servidor: mesmo digitando o endereço, o assistente não recebe os dados.
- Para dar perfil de perito a outra pessoa, acrescente o usuário em `APP_ADMINS` e publique uma Nova versão.
- Observação: se o assistente tiver acesso de edição à planilha, ele continua vendo a coluna HONORARIOS por lá.

## Cuidados

- O app grava pelo nome das colunas da linha 1. Não renomeie os cabeçalhos.
- A aba AGENDAMENTOS segue o formato em blocos por dia que o script do Discord lê.
- Se duas pessoas editarem a mesma linha ao mesmo tempo, o app avisa para atualizar em vez de sobrescrever.
- Atualize o valor da UFESP em `config.js` todo mês de janeiro.
