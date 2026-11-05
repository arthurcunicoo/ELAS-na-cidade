# Integração do ELAS — 04/11/2026

A base desta entrega é o **Elas-main.zip** enviado nesta conversa. As melhorias da última entrega **elas.zip** foram integradas a ela. O projeto está na pasta **Elas-main**, sem uma segunda cópia do app dentro dela.

## Preservado da nova base

- Tela inicial com **Como funciona Elas**, **Começar** e **Cadastrar**.
- Tour opcional e a API de estados `welcome`, `tour` e `auth`.
- Tema, logotipo, imagens e a identidade visual.
- Todos os 500 arquivos recebidos no novo `Elas-main.zip` continuam presentes.

## Incorporado do elas.zip

- Desfoque progressivo entre Mapa, Eventos, Relatos e Perfil, além das opções do Perfil e seus retornos.
- Fundo desfocado no painel Participar, navegação inferior nítida e respeito a movimento reduzido.
- Eventos e Enquetes usando o mesmo componente dos botões de Relatos.
- Classificações Seguro, Moderado e Cuidado e o fluxo existente de avaliações autenticadas.
- Cancelamento de leituras e proteção contra respostas antigas na seleção do mapa.
- Avisos do mapa restritos à tela em foco.
- Atalho que instala as dependências quando necessário e reaproveita a instalação.

## Conflitos resolvidos

A abertura e o tour da nova base foram mantidos. A saída da conta agora volta à tela inicial, sem abrir o tour automaticamente. A navegação espera o desfoque ser renderizado antes de trocar de tela, inclusive quando o navegador está ocupado.

A configuração pública do Expo veio do pacote anterior, que já usava o backend conectado. Não foram alterados usuários, avaliações, aprovação, verificação de e-mail ou dados do banco. As migrations presentes são as dos arquivos de origem; nenhuma migration foi aplicada ao servidor nesta integração.

## Verificação

As dependências foram instaladas com `npm ci`. TypeScript, lint sem avisos e a suíte automatizada passaram. Os bundles Android, iOS e Web foram exportados.

No Chromium, foram verificados os tamanhos **320 × 568** e **357 × 706**, a abertura, o tour opcional, login/cadastro, Relatos → Mapa, as nove opções do Perfil com retorno, o painel Participar, os botões de Eventos/Enquetes, o envio de avaliação, as três classificações e a saída da conta de volta à tela inicial. Os testes de navegador usam respostas de API isoladas, sem gravação no banco real.

As verificações do navegador mediram o desfoque de saída e a recuperação da nitidez, com pico de 14 px. Não foram detectadas exceções JavaScript nesses fluxos. Os logs desta integração ficam em `qa/integracao-2026-11-04/`; os relatórios anteriores foram conservados como histórico.

Instalação de APK/IPA e fluidez em aparelho físico ainda não foram validadas nesta sessão.

## Abrir

Extraia e abra **Elas-main/Apresentar-ELAS.cmd** no Windows, com Node.js 24 ou superior instalado. O atalho prepara as dependências e inicia o Expo com o cache limpo. Pelo terminal, use `npm run apresentacao` dentro da pasta.

Para celular, use o Expo Go compatível com SDK 55 e a mesma rede do computador. Aplicativos nativos compilados antes dos novos módulos de animação precisam de novo build. Preserve sua pasta `node_modules` nas próximas atualizações para reaproveitar a instalação do seu sistema.
