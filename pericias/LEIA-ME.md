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

- **Painel (personalizável)**: cada usuário monta o seu. Em **Personalizar**:
  - **Adicionar blocos** abre o catálogo para marcar e desmarcar o que aparece. São 14 indicadores para a faixa de cima e 25 cartões, em quatro grupos:
    - **Indicadores do topo**: processos ativos, prazos em 7 dias, perícias em 14 dias, laudos a fazer, MLE a peticionar, perícias hoje, aceites a peticionar, aguardando decisão, sem reserva, conferir nos autos, horários livres, minhas tarefas, Núcleo ainda no e-SAJ e, só para o perito, a receber em R$.
    - **Listas do dia a dia**: hoje e próximas perícias, prazos com semáforo, atenção, minhas tarefas, aceites a peticionar, laudos a fazer, próximos horários livres, atividade recente.
    - **Gráficos e classificações**: fluxo por etapa, linha do tempo (andando e parados), parados aguardando decisão por etapa, com quem está, conferência nos autos, perícias por mês, perícias por semana, prazos por semana, por tipo, por comarca, por sistema (e-SAJ e bases do eproc), migração do Núcleo para o eproc, status da nomeação, situação dos honorários, laudos por tempo desde a perícia.
    - **Financeiro (só o perito)**: a receber por estágio e a receber por tipo, em R$.
  - Em cada bloco: setas para mudar a ordem, tamanho (1/3, 1/2, 2/3 ou linha inteira), opções (quantos itens, janela de dias, meses, semanas) e ✕ para tirar.
  - **Restaurar padrão** volta ao painel inicial do perfil, com Desfazer.
  - Fica salvo no usuário (Propriedades do Script, `PREF_<usuário>`) e vale em todos os aparelhos; enquanto o servidor não tiver essa parte, fica salvo só no aparelho.
  - O assistente não vê nem consegue incluir blocos em R$, mesmo que venham salvos. Os blocos padrão não mostram dinheiro; os totais continuam no Financeiro.
- **Processos**: lista com filtros ou **quadro por etapa** (arrastar o cartão muda o PRÓXIMO PASSO).
- **Ficha do processo**: linha do tempo das etapas, próxima ação, botões de atalho do fluxo (com confirmação mostrando o que muda e opção de desfazer), edição de todos os campos, histórico, copiar número, abrir no e-SAJ, enviar ao Discord.
  - **Abrir o processo no tribunal**: processos do e-SAJ têm o botão **e-SAJ**, que abre a consulta já no processo. Processos do eproc têm o botão com o nome da base (**eproc Cível**, **eproc Fazenda**, **eproc 2º grau** ou **eproc Criminal**), que abre a base certa do eproc e copia o número (ver "Sistema do processo" abaixo). O eproc não aceita link direto para um processo (o link precisa de uma assinatura gerada pelo próprio eproc), então para abrir direto na página do processo é preciso o **atalho do eproc** no Chrome do computador:
    1. Instalar a extensão Tampermonkey no Chrome e, em chrome://extensions > Detalhes, ligar "Permitir scripts de usuário".
    2. Abrir `https://brunomichels.com.br/pericias/eproc-atalho.user.js` (ou o link na ajuda "Abrir direto?" da ficha) e confirmar Instalar.
    3. Pronto: o botão eproc leva o número no endereço (`#pericias=...`), o atalho preenche a busca rápida do topo do eproc e abre o processo. Se o login tiver expirado, abre logo depois de entrar (vale por 10 minutos). Quando você já está logado, o atalho também dispensa o aviso "Usuário logado como... Utilize o botão Sair do Sistema" (só quando a abertura vem do app). Para atualizar o atalho, abra o link do passo 2 de novo e clique em Atualizar. No celular não há extensões; lá vale o número copiado.
  - **Linha do tempo** (Aceite, Reserva, Agendamento, Perícia, Laudo, Pagamento, Concluído): cada etapa fica verde pelo que a planilha mostra (STATUS ACEITE, PAGO com reserva, data ou INDIRETA na PERÍCIA, LAUDO em produção ou entregue, PAGO). "Decisão" não é etapa: quando o próximo passo é DECISÃO, a etapa em que o processo está fica listrada com ⏸ e aparece "Parado em ...: aguardando decisão judicial" (por exemplo, parado na Reserva aguardando decisão sobre honorários, ou na Perícia depois de um não comparecimento). Os botões de ação acompanham: parado na Reserva mostra "Honorários reservados" e "Honorários fixados: aguardar depósito"; parado na Perícia mostra "Remarcar a perícia"; "Pagamento liberado" e "Honorários recebidos" só aparecem depois do laudo ou com pagamento já em andamento.
  - Na aba **Dados**, o rodapé mostra **Salvar alterações** e **Descartar**. Nas outras abas, o rodapé tem só Discord e Tarefa.
  - **Campos da aba Dados** (e do cadastro de processo novo):
    - Opção fixa, é só clicar e escolher (sem digitar e sem sugestões soltas): SISTEMA, STATUS, LAUDO, PAGO e PRÓXIMO PASSO. Cada opção traz uma explicação curta (ex.: "RESERVADO · honorários depositados").
    - CIDADE, FORUM e TIPO: lista com os valores já usados na planilha (sem repetição e sem datas, números de processo ou valores que caíram na coluna errada) e, no fim, **Outra… (digitar)** para um valor novo.
    - PRAZOS e PERICIA: calendário. Em PERICIA, a caixa **Perícia indireta (sem data)** grava INDIRETA.
    - REQUERENTE, REQUERIDA, HONORARIOS e PROCESSO continuam texto livre; OBSERVAÇÃO continua caixa de texto.
    - Um valor que não está na lista (ex.: linha antiga com colunas deslocadas) aparece como "(valor atual)" e só muda se você escolher outro. Abrir a aba e salvar sem mexer não grava nada.
  - **Encerrar o processo** (Concluídos ou Renúncias) fica no fim da aba **Ações**, dentro da seção recolhida "Encerrar este processo". É preciso abrir a seção, escolher a opção e confirmar no quadro vermelho ("Sim, mover para Concluídos" / "Sim, registrar renúncia"). Logo depois aparece **Desfazer**, que devolve o processo para Perícias com todos os dados originais (prazo, próximo passo etc.). Depois disso, ele pode ser trazido de volta pelo Arquivo.
- **Calendário**: perícias e prazos do mês, com link para o Google Agenda.
- **Agenda**: horários por dia (marcados e livres) e fila de processos para agendar. Veja "Agendamento" abaixo.
- **Financeiro** (perito) ou **Pagamentos** (assistente): veja Perfis de acesso. UFESP configurável em `config.js`.
- Nos gráficos, passe o mouse (ou toque, no celular) numa barra ou coluna para ver o número exato.
- **Discord**: mensagem livre ou por modelo, mensagens geradas a partir dos dados e botões para disparar as rotinas automáticas.
- **Arquivo**: Concluídos e Renúncias.

## Sistema do processo (coluna SISTEMA)

O eproc do TJSP tem uma base separada para cada competência, cada uma com endereço e cor próprios:

| Valor na planilha | Base | Cor | Endereço | Para quê |
|---|---|---|---|---|
| `ESAJ` | e-SAJ | | esaj.tjsp.jus.br | processos que ainda não migraram |
| `EPROC CÍVEL` | Cível (1º grau) | azul | eproc1g.tjsp.jus.br/eproc | Cível, JEC, Família, Cejuscs, Registros Públicos, Falência, Empresarial |
| `EPROC FAZENDA` | Execução Fiscal e Fazenda Pública (1º grau) | vermelho | eproc1g-ef.tjsp.jus.br/eproc | Fazenda Pública, Jefaz, Acidentes do Trabalho (Núcleo 4.0, auxílio-acidente), Previdenciário, Execução contra a Fazenda |
| `EPROC 2º GRAU` | 2º grau | verde | eproc2g.tjsp.jus.br/eproc | recursos no Tribunal |
| `EPROC CRIMINAL` | Criminal e Juizado Especial | cinza | eproc1g-crim.tjsp.jus.br/eproc | Criminal |

- A ficha mostra a etiqueta com a cor da base e o botão do tribunal abre essa base.
- `EPROC` sozinho (valor de antes da separação) continua funcionando: o app deduz a base (Núcleo, INSS, Fazenda, Município ou Prefeitura vão para a vermelha; o resto para a azul), marca a etiqueta com "?" e mostra o botão **Confirmar** para gravar a base.
- Processo do Núcleo marcado numa base que não é a vermelha mostra um aviso com o botão **Trocar para eproc Fazenda**.
- No cadastro, SISTEMA é obrigatório. Enquanto ninguém escolheu, o app sugere `EPROC FAZENDA` para Núcleo, INSS ou Fazenda (com a dica "Sugerido pelo processo. Confira.").
- O atalho do eproc (v1.2) funciona nas quatro bases e guarda para qual base é o pedido: um processo da base vermelha não é buscado por engano na azul.

## Núcleo 4.0 no eproc (base Fazenda Pública)

Desde novembro de 2026 os processos do Núcleo de Justiça 4.0 (Acidentes do Trabalho do Interior e Litoral) tramitam no eproc, na base **Fazenda Pública** (`eproc1g-ef.tjsp.jus.br/eproc`), que é separada da base Cível e exige perfil e login próprios. Referência: Manual de Orientações Iniciais aos Peritos do Núcleo, v1.0, 5/11/2026.

- **Abrir no tribunal**: processos do Núcleo ficam no `EPROC FAZENDA` (vermelho). Ver "Sistema do processo" acima.
- **Migração**: processo do Núcleo ainda marcado como ESAJ mostra o aviso "O Núcleo 4.0 está passando para o eproc" com o botão **Migrou para o eproc**, que muda a coluna SISTEMA para `EPROC FAZENDA` (o número do processo continua o mesmo).
- **Como peticionar no eproc (Núcleo 4.0)**: na aba Ações da ficha, um quadro mostra o evento, o tipo de cada documento e o prazo a fechar para a etapa atual, com as outras situações logo abaixo:
  - Aceite + agendamento: evento "Comunicação do Início e Local dos Trabalhos Perito"; documento 1 "Perito aceitação do encargo"; documento 2 "Petição Designação data perícia" (Comunicação de Designação de Perícia, modelo do Anexo II).
  - Aceite aguardando depósito: evento "Petição - aceitação do encargo de perito".
  - Laudo: evento "Laudo Pericial - Perito"; documento 1 "Laudo Pericial - Perito"; documento 2 "Pedido de Levantamento de Honorários Perito" (Formulário de MLE).
  - Esclarecimentos, ausência do periciando, MLE depois do laudo, dilação de prazo, pedido de documentos, declínio e manifestações diversas.
- **45 dias**: ao agendar processo do Núcleo no eproc, horários com menos de 45 dias de antecedência ficam apagados, a data sugerida já respeita o mínimo e aparece um aviso em vermelho se a data escolhida for antes.
- **Laudo**: o botão vira "Laudo e Formulário de MLE protocolados" (observação LAUDO E FORMULÁRIO MLE PROTOCOLADOS). Depois, aguardando decisão, o botão é "MLE expedido pelo juízo" (PAGO = MLE, etapa PAGAMENTO).
- **Modelos** (pasta Arquivos base):
  - `MODELO ACEITE ENCARGO N40 EPROC`: o aceite sozinho (documento "Perito aceitação do encargo").
  - `COMUNICACAO DESIGNACAO PERICIA N40 EPROC`: Comunicação de Designação de Perícia no formato do Anexo II, com `{{PROCESSO}}`, `{{REQUERENTE}}`, `{{DATA_PERICIA_EXTENSO}}`, `{{HORA_PERICIA}}`, `{{LOCAL_PERICIA}}` e `{{HOJE}}`. Especialidade e CEP ficam em `[[ ]]` para preencher uma vez no modelo.
  - No Núcleo no eproc, esses dois são sugeridos primeiro e o `MODELO ACEITE COM AGENDAMENTO N40` (aceite e agendamento no mesmo arquivo, prática que o Núcleo pede para evitar) sai das sugestões. Modelos com EPROC no nome só aparecem para processos do Núcleo no eproc. No laudo, o Formulário de MLE N40 também é sugerido.
- **Campo novo `{{DATA_PERICIA_EXTENSO}}`** (ex.: 3 de dezembro de 2026): exige uma linha no `AppPericias.gs`, dentro de `appCamposDoc_`, logo depois da linha do `HOJE` (com vírgula no fim da linha do HOJE):
  `DATA_PERICIA_EXTENSO: dPericia ? dPericia.getDate() + ' de ' + APP_MESES[dPericia.getMonth()] + ' de ' + dPericia.getFullYear() : ''`
  e depois Implantar > Gerenciar implantações > lápis > Nova versão.

## Status da nomeação (coluna STATUS)

A coluna STATUS (F) da aba PERICIAS diz se eu já me manifestei sobre a nomeação:

- **AGUARDANDO**: ainda não peticionei nada no processo (nem aceite nem renúncia).
- **ACEITE**: já peticionei aceitando.
- **RENUNCIA**: renunciei (o processo vai para Renúncias).

No app:

- Ficha mostra "Aceite não peticionado" ou "✓ Aceite peticionado". Com AGUARDANDO e o próximo passo já em outra etapa, aparece um aviso e o cartão do processo ganha a etiqueta "Aceite não peticionado".
- **Aceite peticionado** fica disponível sempre que o status é AGUARDANDO. Se o próximo passo for ACEITE, o processo também avança para Reserva ou Agendamento; se já estiver em outra etapa, só o status muda para ACEITE.
- **Agendamento peticionado** (e marcar a agenda já como OK) também passa o status para ACEITE, porque a petição de agendamento aceita a nomeação. Na confirmação há uma caixa para desmarcar, se for o caso.
- Com AGUARDANDO, os modelos de aceite entram nas sugestões de documento, mesmo que o próximo passo seja outro.
- Na aba Dados, a lista do STATUS explica cada valor ("AGUARDANDO · nada peticionado", "ACEITE · aceite peticionado", "RENUNCIA · renunciei").

## Agendamento

- **Horários livres**: em Agenda > **+ Horários livres**, escolha a data, o primeiro e o último horário e o intervalo (toque num horário para tirar). Cada horário entra na aba AGENDAMENTOS só com hora, status **AGENDAR** e local, **sem periciado**. Linha assim significa horário livre. O script do Discord ignora essas linhas. Um horário livre pode ser apagado pelo × enquanto ninguém estiver nele.
- **Reservar**: "Agendar perícia" (na ficha, nas Tarefas ou na fila da Agenda) mostra os horários livres; escolha um (ou digite outro). Com status **AGENDAR**, o horário recebe o nome do periciado, a data da perícia vai para o processo e o **próximo passo continua AGENDAMENTO**.
- **Petição**: logo depois de reservar, o app sugere os modelos de petição de agendamento já com data, horário e local preenchidos. A tarefa do assistente passa a "Peticionar o agendamento e intimar as partes", com o botão "Gerar petição".
- **Confirmar**: depois de protocolar, toque em **Agendamento peticionado** (na ficha ou nas Tarefas) ou em "Já protocolei" logo após reservar. O horário passa para **OK** na aba AGENDAMENTOS, o processo vai para **PERÍCIA** e, se marcado, o #agenda do Discord é avisado.
- Se o horário for marcado direto com status **OK**, o processo já vai para PERÍCIA, como antes.
- Blocos antigos da aba AGENDAMENTOS com as colunas STATUS e TIPO trocadas continuam funcionando: o app lê e grava na coluna certa de cada bloco.

## Tarefas

- Junta em um lugar só, por prazo (atrasadas, hoje, próximos 7 dias, mais adiante, sem prazo):
  - **tarefas do fluxo**: o que cada processo pede agora (aceite, agendar, peticionar, MLE, renúncia), com o botão do próximo passo;
  - **tarefas atribuídas**: criadas no app por qualquer usuário, para "assistentes" ou para alguém específico, com prazo e processo opcionais. Ficam na aba **TAREFAS** da planilha (criada sozinha) e podem avisar o #tarefas-assistente.
- **Conferir nos autos**: processos aguardando decisão, depósito ou pagamento. A meta é conferir no e-SAJ/eproc uma vez por semana e nunca passar de 15 dias (ajustável em `CONFERIR_DIAS` e `CONFERIR_LIMITE` no `config.js`).
  - Conferido há menos de 7 dias: fica em "Conferidos nos últimos 7 dias", com a data, quem conferiu e até quando vale a conferência. Não precisa conferir de novo.
  - De 7 a 14 dias: laranja, "esta semana", com quantos dias faltam para o limite.
  - 15 dias ou mais, ou nunca conferido: vermelho, "no limite". Também aparece um aviso no Painel.
  - "Sem novidade" registra a conferência no HISTORICO (data, hora e usuário). Na ficha desses processos aparece a última conferência e o mesmo botão.
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

- **Perito** (usuários listados em `APP_ADMINS` no topo do `AppPericias.gs`, hoje só `bruno`): vê a página **Financeiro** com o total a receber em destaque, a projeção por estágio (toque num estágio para filtrar a tabela), recebidos, valor médio, valor por tipo e por comarca, atividade da equipe por semana, laudos a fazer, indicadores e exportação em CSV.
- **Assistente** (qualquer outro usuário): vê a página **Pagamentos**, só com o operacional (MLE a peticionar, aguardando pagamento, travados por falta de reserva, aguardando depósito). Vê os honorários de cada processo, como na planilha, mas nenhum total. O painel e as mensagens geradas para o Discord também não mostram somas.
- O Financeiro é bloqueado no servidor: mesmo digitando o endereço, o assistente não recebe os dados.
- Para dar perfil de perito a outra pessoa, acrescente o usuário em `APP_ADMINS` e publique uma Nova versão.
- Observação: se o assistente tiver acesso de edição à planilha, ele continua vendo a coluna HONORARIOS por lá.

## Tema escuro e claro

- O app abre no **tema escuro**. Para trocar: no computador, botão **Usar tema claro** no pé do menu lateral; no celular, menu **Mais > Usar tema claro**.
- A escolha fica salva no navegador de cada aparelho (cada pessoa escolhe o seu) e vale até ser trocada de novo.
- As cores ficam no começo do `app.css`: o bloco `:root` é o tema claro e o bloco `:root[data-tema=escuro]` é o escuro.

## Cuidados

- O app grava pelo nome das colunas da linha 1. Não renomeie os cabeçalhos.
- A aba AGENDAMENTOS segue o formato em blocos por dia que o script do Discord lê.
- Se duas pessoas editarem a mesma linha ao mesmo tempo, o app avisa para atualizar em vez de sobrescrever.
- Atualize o valor da UFESP em `config.js` todo mês de janeiro.
