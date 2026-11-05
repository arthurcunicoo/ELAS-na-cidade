# ELAS no Expo SDK 58 — 04/11/2026

Esta entrega atualiza a última versão **Elas-main-avaliacoes.zip** para o Expo SDK 58. O Expo Go atualizado precisa de um projeto compatível com seu SDK. A entrega anterior ainda usava SDK 55.

## Abrir no celular

1. Encerre o terminal do Expo da versão anterior.
2. Extraia a nova pasta **Elas-main** e abra **Apresentar-ELAS.cmd**. No terminal, use `npm run apresentacao` dentro dessa pasta.
3. Use Node.js **24.3 ou posterior da linha 24**, ou **Node.js 26+**. O atalho verifica a versão e prepara as dependências corretas automaticamente.
4. Abra o **Expo Go atualizado para SDK 58**, com o computador e o celular na mesma rede, e leia o **novo QR**. Não abra o projeto antigo pelo histórico.

O atalho inicia o Expo explicitamente com `--go --clear`. A instalação local antiga do SDK 55 é substituída quando o atalho detecta o novo lockfile. O `npm ci` já foi executado e validado no ambiente desta entrega; o atalho prepara a instalação correspondente ao sistema do seu computador.

Se as redes estiverem isoladas, tente `npm run apresentacao -- --tunnel`. Isso muda a conexão do servidor; não muda o SDK do aplicativo.

## Compatibilidade

| Componente | Versão anterior | Versão instalada |
| --- | --- | --- |
| Expo | 55.0.31 | 58.0.23 |
| React Native | 0.83.10 | 0.88.1 |
| React e React DOM | 19.2.0 | 19.3.0 |
| Expo Router | 55.0.18 | 58.0.30 |
| Reanimated | 4.2.1 | 4.7.1 |
| Worklets | 0.7.4 | 0.13.0 |
| React Native Maps | 1.27.2 | 1.29.11 |
| Expo Crypto | 55.0.19 | 58.0.7 |
| Expo Blur | 55.0.18 | 58.0.5 |
| Sentry React Native | 7.11.0 | 8.28.0 |

As demais bibliotecas nativas foram alinhadas ao `bundledNativeModules.json` oficial do Expo instalado. O lockfile foi regenerado sem `--force` ou `--legacy-peer-deps`, e a instalação foi repetida com `npm ci`.

## Adaptações

- Imports de navegação passam pelos pontos de entrada do Expo Router atual, compartilhando o mesmo contexto. A dependência direta antiga de React Navigation foi removida.
- O adaptador da transição consulta os métodos do router quando são usados. Isso evita guardar os métodos temporários que o SDK 58 expõe antes da primeira renderização.
- A proteção de saída de formulários usa `usePreventRemove` e `repeat`, aguardando a gravação do rascunho e preservando a confirmação explícita quando o armazenamento falha.
- Refs de campos, rolagem e desfoque usam os tipos de instância da API estrita do React Native. Não foi usado o modo legado de tipos.
- Propriedades removidas foram substituídas, incluindo `StyleSheet.absoluteFillObject`. Ausência de componentes de lista usa o formato aceito pelos novos tipos.
- A configuração dinâmica herda os valores fornecidos pelo Expo e preserva os plugins existentes. O web continua como aplicativo cliente com `web.output: "single"`.
- O React Compiler permanece desativado, preservando o funcionamento das animações existentes. Os quatro diagnósticos específicos de compilação que conflitam com RN Animated/Reanimated ficam condicionados à ativação do compilador. As regras de ordem de Hooks, dependências, TypeScript, design system e acesso aos dados continuam ativas.

Tema, imagens, tela inicial, botões, transições, autenticação, permissões administrativas e avaliações de apresentação foram preservados. Esta migração não executa SQL nem altera usuários ou dados do banco.

## Verificação

O Expo Doctor passou nas **20 verificações**. O teste `npm run qa:expo-go` consulta o servidor com o protocolo real do Expo Go para Android e iOS, exige `sdkVersion: "58.0.0"`, verifica `runtimeVersion: "exposdk:58.0.0"` e carrega os respectivos bundles nativos. Os logs e resultados desta entrega ficam em `qa/sdk58-2026-11-04/`.

O `npm ci` terminou com 865 pacotes instalados. TypeScript, lint e a suíte completa `npm run verify` passaram. Os bundles Hermes de Android/iOS e o export Web foram gerados. O app web passou nos fluxos das abas, nove opções do Perfil com retorno, avaliações, três classificações, exemplos identificados e saída da conta em 320 × 568 e 357 × 706; o modo normal também passou sem carregar exemplos. Não houve exceções JavaScript nesses fluxos de navegador.

Os testes de interface usam o aplicativo real no navegador com respostas isoladas de API. Isso evita criar contas ou avaliações reais durante as verificações. Os testes de sessão continuam usando o wrapper Expo Crypto instalado e o cliente Supabase real com transporte isolado.

Não havia aparelho físico conectado nesta sessão. Os testes de protocolo, bundling e exportação comprovam a compatibilidade declarada e a geração dos bundles; não comprovam instalação, desempenho da GPU ou todos os comportamentos nativos no aparelho.

## Builds antigos e retorno

Se usa Expo Go, abra esta versão pelo novo QR. Um APK/IPA próprio compilado com SDK 55 precisa de um **novo build nativo**; uma atualização apenas de JavaScript não troca o SDK embutido.

Para voltar à versão anterior, restaure o pacote anterior completo, incluindo seu `package.json` e lockfile, e reinstale as dependências. O pacote anterior requer um runtime compatível com SDK 55. Não misture dependências dos SDKs 55 e 58.

Referências oficiais: [upgrade do Expo SDK](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/), [SDK 58](https://expo.dev/changelog/sdk-58), [migração do Router 55 → 56](https://docs.expo.dev/router/migrate/sdk-55-to-56/) e [migração do Router 57 → 58](https://docs.expo.dev/router/migrate/sdk-57-to-58/).
