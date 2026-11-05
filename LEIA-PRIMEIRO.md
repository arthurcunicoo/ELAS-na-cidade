# Abrir o ELAS — SDK 58

**Esta versão usa Expo SDK 58.** Feche o Expo anterior, abra o atalho desta pasta e leia o QR novo no Expo Go atualizado. Não abra a entrada antiga do histórico do Expo Go. Não é necessário apagar sua conta nem os dados salvos.

Detalhes: [MIGRACAO-EXPO-SDK58.md](MIGRACAO-EXPO-SDK58.md).

O projeto está diretamente nesta pasta **Elas-main**. Abra **Apresentar-ELAS.cmd** no Windows. O atalho confere as dependências, instala o que estiver faltando ou desatualizado e inicia o Expo com o cache limpo.

Requer Node.js 24.3+ (linha 24) ou Node.js 26+. Depois da primeira instalação no seu computador, mantenha a pasta `node_modules` ao extrair as próximas versões por cima da mesma pasta `Elas-main`. Alterações apenas de telas não exigem reinstalar as dependências.

Pelo terminal, use `npm run apresentacao`. A primeira instalação também é automática por esse comando. As dependências desta entrega já foram instaladas e testadas no ambiente de desenvolvimento; módulos específicos de Linux não são enviados como instalação pronta para Windows.

## Alterações desta versão

- No Android, os cartões translúcidos usam sombra do lado de fora, evitando o retângulo claro por trás do conteúdo. A correção vale para Participar, notificações e as outras superfícies que compartilham esse estilo.
- Esta versão de apresentação carrega 8 eventos, 6 relatos e 20 avaliações ilustrativas em cinco lugares. Isso vale para o atalho e para `npm start`. Toque no marcador do ELAS para ver a classificação e expanda o cartão para abrir **Avaliações recentes**. Consulte [CONTEUDO-E-MAPA.md](CONTEUDO-E-MAPA.md).
- Corrigida a leitura da sessão salva no Android. O módulo nativo recebe bytes em vez do texto base64, mantendo a criptografia e os dados existentes.
- Desfoque progressivo antes de trocar entre Mapa, Eventos, Relatos e Perfil; a tela seguinte recupera o foco. A navegação inferior continua nítida.
- O mesmo movimento ao abrir e voltar das opções do Perfil, incluindo Configurações, Informações pessoais, avaliações, favoritos, relatos, solicitações, notificações, conquistas e foto.
- Participar desfoca o fundo enquanto as opções estão abertas.
- Eventos e Enquetes usam o mesmo componente de botão dos atalhos em Relatos, com indicação da opção selecionada.
- A preferência de movimento reduzido continua respeitada.

## Avaliações de contas cadastradas

As contribuições são gravadas no Supabase com a conta autenticada. Uma pessoa pode atualizar sua própria avaliação do lugar; não pode enviar avaliações como se fosse outra conta.

Para incluir uma contribuição: entre na conta participante, abra o lugar no mapa, toque em **Avaliar este lugar**, selecione **Segura, Moderada ou Cuidado**, marque ao menos um fator e envie. A pessoa vê sua pendente identificada como pessoal. Após aprovação, a contribuição forma a classificação pública **Seguro, Moderado ou Cuidado**.

Os exemplos ficam separados das contribuições reais. Eles não alteram a classificação pública nem são atribuídos a contas cadastradas. O acesso administrativo e a verificação de e-mail permanecem com a configuração anterior.

## Celular

Leia o QR no Expo Go atualizado para SDK 58, na mesma rede do computador. Se usa um APK/IPA compilado anteriormente, precisa gerar e instalar novo build: esta versão utiliza `react-native-reanimated 4.7.1`, `react-native-worklets 0.13.0` e o módulo `expo-blur`.

No Android 12 ou superior, o desfoque é aplicado diretamente à tela. Nos Android anteriores, utiliza o módulo nativo de desfoque; no iOS, utiliza o efeito nativo. A saída e a chegada aguardam um quadro renderizado antes de prosseguir. A preferência de movimento reduzido desativa a animação.

Encerre o Expo da versão anterior, abra o atalho desta pasta e leia o **novo QR**. Não é necessário apagar os dados do aplicativo para esta correção.

`npm ci`, a suíte `npm run verify`, os bundles Android/iOS/Web e os testes do app web em 320 × 568 e 357 × 706 passaram nesta entrega. O teste novo reproduziu o erro da leitura nativa anterior e passou após a correção, incluindo login → sessão criptografada → reinício → consulta autenticada com o cliente Supabase real e transporte isolado.

Instalação e fluidez em aparelho físico ainda devem ser conferidas; exportar os bundles não equivale a testar um APK/IPA instalado. Consulte **CORRECAO-CELULAR-2026-11-04.md**.
