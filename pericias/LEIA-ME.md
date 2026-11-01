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
- **Gestão** (perito) ou **Pagamentos** (assistente): veja Perfis de acesso. UFESP configurável em `config.js`.
- **Discord**: mensagem livre ou por modelo, mensagens geradas a partir dos dados e botões para disparar as rotinas automáticas.
- **Arquivo**: Concluídos e Renúncias.

## Tarefas

- Junta em um lugar só, por prazo (atrasadas, hoje, próximos 7 dias, mais adiante, sem prazo):
  - **tarefas do fluxo**: o que cada processo pede agora (aceite, agendar, peticionar, MLE, renúncia), com o botão do próximo passo;
  - **tarefas atribuídas**: criadas no app por qualquer usuário, para "assistentes" ou para alguém específico, com prazo e processo opcionais. Ficam na aba **TAREFAS** da planilha (criada sozinha) e podem avisar o #tarefas-assistente.
- **Conferir nos autos**: processos aguardando decisão, depósito ou pagamento, para conferir no e-SAJ/eproc a cada 3 dias (o intervalo fica em `CONFERIR_DIAS` no `config.js`).
  - Pendentes: nunca conferidos (vermelho, aparecem primeiro) ou conferidos há 3 dias ou mais (laranja), cada um com a data e quem fez a última conferência.
  - "Sem novidade" registra a conferência no HISTORICO (data, hora e usuário). O processo passa para "Conferidos nos últimos 3 dias", com a data e quem conferiu, e volta para os pendentes quando completar 3 dias.
  - Na ficha desses processos aparece a última conferência e o mesmo botão "Sem novidade".
  - Se algo mudou nos autos, não use "Sem novidade": abra o processo e atualize a etapa ou o pagamento.
- O perito vê por padrão as tarefas do assistente (e pode trocar para "Minhas" ou "Todas"). O assistente vê as dele.
- Só quem criou a tarefa, ou o perito, pode excluí-la.

## Documentos

A página tem duas abas: **Gerar documentos** e **Modelos**.

### Gerar documentos
1. **Para gerar agora** mostra os modelos com mais processos esperando por eles (o número é a quantidade de processos).
2. Escolha o modelo. O app marca os processos que precisam dele agora (ex.: perícias futuras do Núcleo para AGENDAMENTO N40; MLE a peticionar para PETICAO MLE). Dá para desmarcar ou buscar outros.
3. Gerar: cria um documento por processo na pasta de cada periciado (cria a pasta se faltar), com links para abrir e baixar em PDF.
- O formulário MLE recebe o número do processo e o valor nominal do depósito, e o não comparecimento recebe a data da perícia. Modelos do Núcleo mantêm o endereçamento original.

### Modelos
- Lista todos os modelos da pasta Arquivos base, por grupo, com quantos processos precisam de cada um agora.
- **Configurar**: nome do arquivo, grupo, em quais etapas (PRÓXIMO PASSO) ele é sugerido, para quais processos (Núcleo, varas comuns, interdição, homecare, pós-bariátrica, erro médico), uma palavra da observação e uma descrição curta. A janela mostra na hora para quantos processos ele seria sugerido. Sem etapa marcada, o app continua reconhecendo pelo nome do arquivo. Dá para esconder um modelo sem apagá-lo.
- **Criar modelo**: cria um documento novo em Arquivos base copiando cabeçalho, margens e fonte de um modelo existente, com endereçamento, tabela Processo/Requerente/Requerida, um parágrafo para escrever e a assinatura. Depois é só escrever o texto no Docs.
- **Modelos sugeridos**: petições prontas no seu padrão (aceite com proposta de honorários, redesignação, impossibilidade de contato, solicitação de documentos médicos, prorrogação do prazo do laudo, juntada de laudo, resposta a esclarecimentos). Um clique cria o arquivo já com a regra de sugestão. Revise o texto no Docs antes do primeiro uso.
- **Duplicar** faz uma variação com o mesmo texto e a mesma regra. **Excluir** (só o perito) manda o arquivo para a lixeira do Drive, de onde dá para recuperar por 30 dias.
- As regras ficam nas Propriedades do Script (`MODELOS_CFG`), não no arquivo.

### Campos automáticos
Escreva no modelo exatamente assim e o app troca pelo dado do processo ao gerar:
`{{PROCESSO}}`, `{{REQUERENTE}}`, `{{REQUERIDA}}`, `{{PERICIADO}}` (na interdição, a parte requerida), `{{VARA}}`, `{{CIDADE}}`, `{{TIPO}}`, `{{HONORARIOS}}`, `{{DATA_PERICIA}}`, `{{DIA_SEMANA}}`, `{{HORA_PERICIA}}`, `{{LOCAL_PERICIA}}` (consultório vira o endereço completo da Compart Clinic) e `{{HOJE}}`.
- Campo sem dado na planilha fica marcado em amarelo e aparece no aviso "Confira antes de protocolar".
- Texto entre `[[ ]]` fica amarelo para completar à mão (ex.: `[[número do evento]]`).

### Sugestões no dia a dia
- **Na ficha do processo**: logo abaixo dos botões do fluxo aparece "Documento para esta etapa" com até 3 modelos. Um toque gera o documento na pasta do periciado.
- **Ao cadastrar um processo**: depois de salvar, a janela mostra a pasta criada no Drive e os documentos sugeridos para começar (ex.: o aceite), com botão Gerar, além de Abrir o processo e Criar tarefa.

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
