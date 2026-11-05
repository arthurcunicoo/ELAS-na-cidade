# ELAS — transição entre abas e avaliações

Esta atualização continua a entrega `Elas-main-atualizado-2026-11-03.zip`. Os 502 arquivos da base foram preservados; nenhum foi removido. Assets, tema, template de abertura e aparência da navegação inferior permanecem iguais.

## O que mudou

- **Swoosh entre Mapa, Eventos, Relatos e Perfil:** a tela atual desfoca durante 95 ms, a navegação acontece no pico e a próxima tela volta ao foco em 220 ms. A barra inferior permanece fora do desfoque. O efeito usa opacidade e escala discretas, sem atualizar estado React a cada frame.
- **Navegação resistente a interrupções:** toques repetidos, troca rápida de destino, desmontagem e mudança da preferência de movimento cancelam callbacks antigos. Um limite de espera impede uma camada de desfoque presa na tela.
- **Movimento reduzido:** a preferência é respeitada no navegador e nas plataformas nativas, inclusive se mudar com o app aberto. O Android anterior ao 12 utiliza a alternativa leve, sem forçar o método de blur mais caro.
- **Avisos do mapa:** os modais de carregamento, seleção da cidade e avisos ficam limitados à tela do mapa em foco. Um carregamento em segundo plano não pode cobrir Perfil ou Eventos.
- **Avaliações reais:** o fluxo existente de leitura e gravação no Supabase foi preservado. A leitura da avaliação pessoal agora aceita cancelamento ao sair do formulário. Respostas canceladas não atualizam o catálogo, e detalhes atrasados não substituem a seleção mais recente no cache.
- **Classificação ao abrir um lugar:** os selos usam **Seguro, Moderado e Cuidado**. Os sentimentos gravados continuam **Segura, Moderada e Cuidado**. Sem avaliações, o selo continua **Sem avaliações suficientes**. A própria contribuição pendente é identificada como **sua avaliação**.

Foi acrescentado somente `expo-blur ~55.0.18`, compatível com o SDK 55. As outras dependências permaneceram com as versões da base.

## Banco e aprovação

Nenhuma migration, conta, papel administrativo ou configuração de autenticação foi modificada nesta atualização. A política já implantada aceita uma avaliação aprovada para formar classificação pública. Autoria e comentário continuam privados.

Na conferência do banco conectado havia quatro avaliações pendentes e uma rejeitada, sem aprovadas. As pendentes precisam de análise em **Perfil → Administração → Avaliações** para contribuir para o selo público. Não foram criadas avaliações fictícias nem feitas aprovações automáticas.

## Verificações concluídas

- `npm run verify`: suíte completa aprovada, incluindo TypeScript, lint e testes de banco, estado, mapa, comunidade, administração, segurança e cancelamento.
- `npm run lint -- --max-warnings=0`: aprovado.
- `expo export --platform all`: bundles Android, iOS e Web gerados.
- Compatibilidade das dependências conferida com os dados locais do SDK; o verificador offline informou dependências atualizadas.
- Chromium real em **357 × 706** e **320 × 568**: login, navegação, blur CSS aplicado, posição estável da barra, toques rápidos, movimento reduzido, envio de avaliação, percepção pessoal pendente e as três classificações públicas.
- Template inicial, login e cadastro verificados nas mesmas duas dimensões, sem abertura obrigatória do tour.
- Nenhuma exceção JavaScript nos fluxos do navegador testados.
- Regressões específicas verificam cancelamento de leituras, seleção do catálogo e modais do mapa fora de foco.

Os testes de navegador interceptam a API e os tiles com dados sintéticos isolados. Não enviam credenciais ou avaliações de teste ao projeto real. Os testes de banco usam PGlite com papéis simulados; a consulta ao projeto conectado foi somente de leitura. As imagens de inspeção ficaram fora do pacote.

Logs e evidências: `qa/swoosh-2026-11-03/`. Os testes são reproduzíveis com `npm run verify`, `npm run qa:tabs` e `npm run qa:welcome`; os testes de navegador requerem Chromium instalado pelo Playwright.

## Abrir no celular

Execute `npm ci` e `npm run apresentacao`, use a mesma rede e leia o QR no Expo Go compatível com SDK 55. O modo de apresentação continua usando o banco real e exemplos desativados.

Um aplicativo nativo compilado anteriormente precisa de novo build e instalação, pois `expo-blur` inclui código nativo. Não basta enviar apenas uma atualização JavaScript para esse binário antigo. Para builds próprios, consulte `docs/qa/BUILD-E-OBSERVABILIDADE.md`, incluindo a chave Google Maps para Android.

Não foi possível instalar um APK/IPA assinado nem medir fluidez, RAM, GPS, teclado e GPU em aparelhos físicos nesta sessão. Os bundles e os testes de navegador não substituem essa etapa. Use `docs/qa/MATRIZ-APARELHOS.md` antes da apresentação em aparelho e do lançamento.

Referências técnicas usadas: [Expo BlurView SDK 55](https://docs.expo.dev/versions/v55.0.0/sdk/blur-view/), [React Native Animated](https://reactnative.dev/docs/animations) e [AccessibilityInfo](https://reactnative.dev/docs/accessibilityinfo).
