# ELAS — Expo SDK 58

A apresentação já inclui a URL e a chave **pública** do projeto ELAS. Configurações de outro projeto podem ser definidas por `EXPO_PUBLIC_SUPABASE_URL` e uma chave pública no `.env`. Veja [CORRECAO-SUPABASE-2026-11-10.md](CORRECAO-SUPABASE-2026-11-10.md).

Esta é a última base integrada, agora migrada para **Expo SDK 58**, com React Native 0.88.1 e React 19.3.0. Veja [MIGRACAO-EXPO-SDK58.md](MIGRACAO-EXPO-SDK58.md). Use o Expo Go atualizado para SDK 58 e leia o novo QR gerado por **Apresentar-ELAS.cmd**.

## Base integrada

Integração da nova base **Elas-main.zip** com as melhorias da última entrega **elas.zip**, mantendo a abertura e o botão **Como funciona Elas** desta base.

[Resumo da integração e verificações atuais](INTEGRACAO-ELAS-MAIN.md).

Entrega de 03/11/2026 aplicada sobre **Elas-main.zip**: abertura no template, três avaliações, exemplos fictícios desativados e compatibilidade com o banco atualizado. Tema e formulários desta base preservados.

Inclui a transição de desfoque/foco entre as abas principais, com navegação inferior fixa e movimento reduzido respeitado. Os lugares exibem **Seguro, Moderado ou Cuidado** a partir das avaliações disponíveis.

Para apresentar **no PC**, abra **Apresentar-ELAS-no-PC.cmd** ou rode `npm run apresentacao:web`. Para **celular**, abra **Apresentar-ELAS.cmd** ou rode `npm run apresentacao`. Os atalhos instalam as dependências quando necessário e reaproveitam a instalação nas próximas aberturas. No Web, `npm start` continua disponível para desenvolvimento; para a apresentação use o atalho otimizado.

Esta versão usa desfoque progressivo entre todas as abas e nas opções do Perfil. Eventos/Enquetes compartilham os botões de Relatos. Veja [LEIA-PRIMEIRO.md](LEIA-PRIMEIRO.md) para abrir no celular e entender o fluxo de avaliações das contas cadastradas.

[Alterações e testes](ALTERACOES-ELAS-MAIN-2026-11-03.md) · [Como apresentar](APRESENTACAO-ELAS.md)

[Swoosh, avaliações e verificações desta atualização](ALTERACOES-SWOOSH-E-AVALIACOES.md).

