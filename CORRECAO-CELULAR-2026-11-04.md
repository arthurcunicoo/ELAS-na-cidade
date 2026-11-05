# Correção do celular e da transição — 04/11/2026

Esta entrega continua a última versão integrada de **Elas-main**. O tema, a abertura, os componentes e os dados do banco foram preservados.

## Erro de entrada no Android

A imagem recebida mostra o bloqueio “Serviço temporariamente indisponível” e um erro iniciado por `[fromC…`. Foi encontrada e reproduzida uma incompatibilidade na leitura da sessão criptografada: o adaptador passava uma string base64 para `AESSealedData.fromCombined`, mas a implementação Android instalada do Expo Crypto 55 exige um `ByteArray` nessa operação. A assinatura JavaScript aceita string, e o comportamento web escondia essa diferença.

O adaptador agora decodifica o conteúdo para `Uint8Array` antes de chamar o módulo. O formato `elas.enc.v1:`, as chaves protegidas, o contexto de autenticação AES-GCM e os registros existentes continuam compatíveis. A correção não apaga sessões nem desativa a proteção. A checagem do serviço e as permissões continuam ativas.

O backend conectado respondeu com a versão 11 durante a investigação. Nenhuma migration, conta, avaliação, papel administrativo ou configuração de verificação de e-mail foi alterada nesta correção.

## Desfoque e foco

- Saída: 260 ms de desfoque progressivo, com leve escala e opacidade.
- A navegação acontece após um quadro renderizado da tela desfocada.
- A chegada mantém o desfoque durante o primeiro quadro e recupera o foco em 340 ms.
- Android 12+: filtro aplicado diretamente à tela renderizada, sem depender de captura do fundo do navegador nativo.
- Android 7–11: módulo Expo Blur com `dimezisBlurView`, sem a variante que desativa o desfoque nesses sistemas.
- iOS: desfoque nativo; Web: filtro CSS.
- Mapa, Eventos, Relatos e Perfil, as opções do Perfil e seus retornos passam pelo mesmo coordenador. Participar mantém o fundo desfocado enquanto o painel está aberto. A navegação inferior fica nítida.
- Toques rápidos, cancelamento, retorno e preferência de movimento reduzido continuam tratados. A animação não provoca atualizações React a cada quadro.

## Validação executada

| Verificação | Resultado e alcance |
| --- | --- |
| `npm ci --no-audit --no-fund` | Concluído, com 979 pacotes instalados |
| `npm run verify` | Aprovado, incluindo TypeScript, lint e a suíte existente |
| Regressão do armazenamento nativo | O código anterior falha no contrato Android; a correção passa usando o wrapper Expo AES instalado e AES-GCM real do runtime de testes |
| Sessão com cliente Supabase real | Login → armazenamento criptografado → novo cliente → sessão restaurada → RPC autenticada, usando apenas transporte e credenciais de teste isolados |
| Compatibilidade e proteção | Sessões grandes, Unicode, reutilização de dados v1, migração de dados antigos, contexto da cifra, adulteração e perda de chave |
| Coordenador de navegação | Android recente e antigo, iOS, Web, fronteiras de renderização, nove destinos do Perfil e retorno, toques rápidos e movimento reduzido |
| Exportação Expo | Bundles Hermes de Android/iOS e bundle Web gerados |
| App web em 320 × 568 e 357 × 706 | Todas as abas, Perfil e retorno, Participar, botões Eventos/Enquetes, avaliações e saída; desfoque medido de até 14 px e nenhuma exceção JavaScript nesses fluxos |

Os testes usam dados sintéticos isolados; não criaram conteúdo nem alteraram contas no servidor. Os logs desta rodada estão em `qa/correcao-celular-2026-11-04/`.

Não havia aparelho físico, emulador Android ou ambiente de build nativo conectado nesta sessão. Portanto, a validação não comprova instalação de APK/IPA, desempenho da GPU, comportamento do mapa nativo ou uso real de Keychain/Keystore. A falha do contrato foi demonstrada tecnicamente; o teste final no aparelho continua necessário.

## Abrir a versão corrigida

1. Encerre o Expo/Metro da versão anterior.
2. Extraia a pasta **Elas-main** desta entrega. Preserve sua instalação local de `node_modules` se estiver atualizando a mesma pasta.
3. No Windows, abra **Apresentar-ELAS.cmd**. Pelo terminal, use `npm run apresentacao` com Node.js 24+. O atalho confere e prepara as dependências automaticamente e limpa o cache do Expo.
4. Leia o novo QR no Expo Go compatível com SDK 55, na mesma rede do computador. Não reutilize o QR de uma pasta antiga.

O `npm ci` já foi executado no ambiente desta entrega. Dependências nativas de Linux não são enviadas como se fossem uma instalação pronta de Windows; o atalho prepara a instalação correta no seu computador quando necessário. Esta correção usa dependências que já constavam do projeto.

Não é necessário apagar dados do app ou executar SQL. Para um APK/IPA próprio antigo, gere e instale um build compatível com os módulos nativos do projeto. A exportação de JavaScript não substitui esse build.
