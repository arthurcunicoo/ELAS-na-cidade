# Abrir o ELAS — SDK 58

**A conexão pública do ELAS já está configurada para apresentação**, mesmo sem arquivo `.env`. Feche o Expo que estava aberto e inicie pela pasta desta versão:

- **Computador:** abra **Apresentar-ELAS-no-PC.cmd** ou rode `npm run apresentacao:web`. Use a aba do navegador que abrir. O atalho carrega a versão web otimizada para a apresentação.
- **Celular:** abra **Apresentar-ELAS.cmd** ou rode `npm run apresentacao` e leia o novo QR no Expo Go.

Se precisar trocar de projeto Supabase, veja [CORRECAO-SUPABASE-2026-11-10.md](CORRECAO-SUPABASE-2026-11-10.md).

Antes da apresentação de 12/11, consulte **AUDITORIA-APRESENTACAO-ELAS-2026-11-10.md**: testes realizados, locais com classificações públicas e pendências ainda presentes no ambiente.

**Esta versão usa Expo SDK 58.** Feche o Expo anterior, abra o atalho desta pasta e leia o QR novo no Expo Go atualizado. Não abra a entrada antiga do histórico do Expo Go. Não é necessário apagar sua conta nem os dados salvos.

Detalhes: [MIGRACAO-EXPO-SDK58.md](MIGRACAO-EXPO-SDK58.md).

O projeto está diretamente nesta pasta **Elas-main**. Os atalhos do Windows conferem as dependências e instalam o que estiver faltando ou desatualizado.

Requer Node.js 24.3+ (linha 24) ou Node.js 26+. Depois da primeira instalação no seu computador, mantenha a pasta `node_modules` ao extrair as próximas versões por cima da mesma pasta `Elas-main`. Alterações apenas de telas não exigem reinstalar as dependências.

A primeira instalação também é automática pelos comandos de terminal. As dependências desta entrega já foram instaladas e testadas no ambiente de desenvolvimento; módulos específicos de Linux não são enviados como instalação pronta para Windows.

## Alterações desta versão

- No navegador, a própria página controla o desfoque e o retorno ao foco, sem aplicar o filtro enquanto a tela está parada. Veja a [medição e a correção para PC](CORRECAO-WEB-ELAS-2026-11-10.md).
- Cada envio de avaliação cria um registro separado, inclusive para o mesmo lugar. O histórico preserva os envios anteriores e a opção de editar foi removida.
- A recuperação de senha agora tem espaço entre o campo de e-mail e o botão **Enviar código**.
- O atalho de apresentação usa os dados do Supabase, com avaliações ilustrativas desligadas por padrão. As classificações dependem das avaliações aprovadas de cada lugar.
- Removido também o atalho **Corrigir meu registro** nos detalhes de relatos e solicitações.
- Corrigida a leitura da sessão salva no Android. O módulo nativo recebe bytes em vez do texto base64, mantendo a criptografia e os dados existentes.
- Desfoque progressivo antes de trocar entre Mapa, Eventos, Relatos e Perfil; a tela seguinte recupera o foco. A navegação inferior continua nítida.
- O mesmo movimento ao abrir e voltar das opções do Perfil, incluindo Configurações, Informações pessoais, avaliações, favoritos, relatos, solicitações, notificações, conquistas e foto.
- Participar desfoca o fundo enquanto as opções estão abertas.
- Eventos e Enquetes usam o mesmo componente de botão dos atalhos em Relatos, com indicação da opção selecionada.
- A preferência de movimento reduzido continua respeitada.

## Avaliações de contas cadastradas

As contribuições são gravadas no Supabase com a conta autenticada. Para avaliar de novo, faça um novo envio. As avaliações anteriores continuam em **Minhas avaliações**, com a opção de consultar o histórico ou excluir cada uma.

Para incluir uma contribuição: entre na conta participante, abra o lugar no mapa, toque em **Avaliar este lugar**, selecione **Segura, Moderada ou Cuidado**, marque ao menos um fator e envie. A pessoa vê sua pendente identificada como pessoal. A classificação pública **Seguro, Moderado ou Cuidado** considera a avaliação aprovada mais recente de cada conta no lugar, dentro da janela vigente.

A migration `20261110204902_immutable_reviews.sql` já foi aplicada ao Supabase configurado neste ZIP. Ao apontar o app para outro projeto, aplique essa migration antes de enviar avaliações. Ela preserva os registros existentes e impede sobrescrita no banco.

## Celular

Leia o QR no Expo Go atualizado para SDK 58, na mesma rede do computador. Se usa um APK/IPA compilado anteriormente, precisa gerar e instalar novo build: esta versão utiliza `react-native-reanimated 4.7.1`, `react-native-worklets 0.13.0` e o módulo `expo-blur`.

No Android 12 ou superior, o desfoque é aplicado diretamente à tela. Nos Android anteriores, utiliza o módulo nativo de desfoque; no iOS, utiliza o efeito nativo. A saída e a chegada aguardam um quadro renderizado antes de prosseguir. A preferência de movimento reduzido desativa a animação.

Encerre o Expo da versão anterior, abra o atalho desta pasta e leia o **novo QR**. Não é necessário apagar os dados do aplicativo para esta correção.

`npm ci`, a suíte `npm run verify` e a exportação do bundle Android passaram nesta revisão. No navegador, foram verificados dois envios para o mesmo lugar com dados de teste e o espaçamento na recuperação de senha em telas de 320 e 390 px. O teste no Supabase confirmou dois registros distintos e o bloqueio de alterações, com reversão de todos os dados de teste.

Instalação e fluidez em aparelho físico ainda devem ser conferidas; exportar os bundles não equivale a testar um APK/IPA instalado. Consulte **CORRECAO-CELULAR-2026-11-04.md**.
