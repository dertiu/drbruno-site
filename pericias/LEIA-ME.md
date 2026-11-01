# App Perícias: instalação

O app tem duas partes:

1. **Tela do app** (esta pasta `pericias/`): arquivos estáticos publicados pelo GitHub Pages em brunomichels.com.br/pericias.
2. **Backend** (`pericias/backend/AppPericias.gs`): fica no Apps Script da própria planilha, ao lado do script do Discord. Faz o login e lê e grava nas abas.

O script do Discord não é alterado e continua funcionando como hoje.

## Parte 1: backend (uns 10 minutos)

1. Abra a planilha, menu **Extensões > Apps Script** (o mesmo projeto do Discord).
2. Clique em **+ > Script**, nomeie o arquivo `AppPericias` e cole todo o conteúdo de `backend/AppPericias.gs`.
3. No arquivo do Discord, dentro de `onOpen()`, acrescente uma linha ao menu, antes de `menu.addToUi();`:

   ```
   menu.addItem('🔐 App: criar ou trocar senha de usuário', 'appCriarUsuarioDialogo');
   ```

4. Salve. Volte à planilha e **recarregue a página**. Vai aparecer o item no menu Discord.
5. Clique nele e crie o usuário do Dr. Bruno (ex.: `bruno`) e depois o do assistente (ex.: `assistente`). Senha com pelo menos 8 caracteres. Para trocar uma senha, repita o processo com o mesmo usuário.
6. No Apps Script, clique em **Implantar > Nova implantação > Tipo: App da Web**:
   - Executar como: **Eu**
   - Quem pode acessar: **Qualquer pessoa**
   - Autorize quando o Google pedir.
7. Copie a **URL do app da Web** (termina em `/exec`).

"Qualquer pessoa" só significa que o endereço é acessível. Nenhum dado é devolvido sem usuário e senha válidos.

## Parte 2: tela do app

1. Abra `pericias/config.js` e troque `COLE_AQUI_A_URL_DO_APPS_SCRIPT` pela URL copiada no passo 7.
2. Publique a pasta `pericias/` na raiz do repositório `dertiu/drbruno-site` (commit e push). O GitHub Pages publica sozinho.
3. Acesse **brunomichels.com.br/pericias** e entre com o usuário e a senha criados.

## Uso no celular

Abra o endereço no navegador e use **Adicionar à tela inicial**. O app abre como aplicativo.

## Depois de mudar o backend

Sempre que o arquivo `AppPericias.gs` for alterado, é preciso **Implantar > Gerenciar implantações > Editar > Nova versão** para a mudança valer. A URL continua a mesma.

## Cuidados

- O app grava pelo nome das colunas da linha 1. Não renomeie os cabeçalhos das abas.
- A aba AGENDAMENTOS segue o formato em blocos por dia que o script do Discord lê. O app insere os horários dentro desses blocos.
- Ao mover um processo, ele é copiado para a aba de destino e removido da origem.
- Se duas pessoas editarem a mesma linha ao mesmo tempo, o app avisa para atualizar em vez de sobrescrever.
