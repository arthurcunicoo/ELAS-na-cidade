# Alterações no Elas-main — 03/11/2026

Base utilizada: o arquivo **Elas-main.zip** enviado nesta solicitação, SHA-256 `9c329666d85014fbfff672333ec523612f251c21fc7931dbab71fc8ba40d704a`.

As alterações foram aplicadas diretamente nessa base. Seu tema, logo, assets, geometria da cidade, estilo dos formulários, campos e link de cadastro foram preservados. A comparação de estilos identificou somente as mudanças pedidas na abertura, no seletor de sentimentos e na retirada da prévia fictícia.

## Mudanças

- A abertura sem sessão mostra o template com logo, cidade, **Começar** e **Cadastrar**. O onboarding não é mais obrigatório. Login direto e recarga também abrem o formulário; o tour continua acessível por “Conheça o ELAS”.
- As avaliações têm somente **Segura, Moderada e Cuidado**. O cartão usa **Seguro, Moderada e Cuidado**. Rascunhos legados em Atenção são interpretados como Cuidado.
- O cartão usa o resumo real retornado pelo banco. **Uma contribuição aprovada** já classifica o lugar. Sem avaliações públicas ou próprias, permanece **Sem avaliações suficientes**.
- A própria avaliação pendente aparece imediatamente para a pessoa e é identificada como pessoal. Ela só entra no total público depois da aprovação administrativa. Comentários e autoria de outras pessoas não são expostos.
- Exemplos fictícios estão desativados na apresentação. A prévia de avaliações fictícias e o rodapé de exemplos foram retirados; o atalho utiliza dados e autenticação reais.
- A tipagem dos campos foi corrigida para aceitar o ícone `person-outline` que o cadastro desta base já usava. Foram removidos um import sem uso e um aviso de dependência causado por uma referência de tipo. Isso não alterou a aparência dos campos ou do mapa.

## Banco e configuração

A migration **20261103122125_three_review_levels.sql** já estava aplicada no projeto conectado e foi incluída no código para manter o histórico coerente. Nesta solicitação não houve nova execução da conversão nem alteração dos registros do banco. Foi confirmado que o mínimo público continua em 1 e não há avaliações reais em Atenção.

Estados de moderação, contas e permissões foram mantidos. Avaliações pendentes precisam ser aprovadas em **Perfil → Administração → Avaliações** para classificar o lugar para todos. A confirmação de e-mail continua desligada.

O ZIP de origem não trazia `.env`. Esta entrega inclui a configuração pública do projeto ELAS já usado no aplicativo, com exemplos desativados. Não há chave de serviço ou senha administrativa nesse arquivo. O `.env.example` foi atualizado para refletir a apresentação com dados reais.

Não é necessário executar SQL para usar estas alterações no projeto já conectado. As cinco migrations operacionais anteriores continuam com seu rollout separado; não foram aplicadas nesta rodada.

## Verificações

- Instalação limpa com o lockfile desta base.
- TypeScript, lint e suíte `npm run verify` completa aprovados. Tipagem e lint foram conferidos novamente após as correções de imports/tipos, com zero avisos no lint.
- Exportações Expo Android/iOS com Hermes e web aprovadas.
- Abertura, login direto, Começar e Cadastrar testados no Expo web real em Chromium, em 357×706 e 320×568, sem exceções de runtime.
- Doze verificações de armazenamento protegido em duas abas reais do Chromium aprovadas.
- Assets, logo, theme e fundo da cidade preservados em comparação de arquivos; não houve mudança de estilo fora dos três componentes pedidos.

As evidências textuais estão em `qa/elas-main-2026-11-03/`. As imagens da inspeção visual ficaram fora do pacote. As exportações não são builds nativos assinados e os testes web não substituem a validação em Android/iPhone físicos.

## Como abrir

Extraia este ZIP e abra **Elas-main/Apresentar-ELAS.cmd**, ou execute `npm ci` e `npm run apresentacao` dentro de Elas-main. Feche o Expo anterior para não servir outra cópia do projeto.
