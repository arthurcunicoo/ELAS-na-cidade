# Apresentar o Elas-main atualizado

Use a pasta **Elas-main** deste pacote. Feche o Expo anterior e abra **Apresentar-ELAS.cmd**. Requer Node.js 24.3+ (linha 24) ou Node.js 26+ e internet. Pelo terminal: `npm run apresentacao`. A instalação é conferida automaticamente e reaproveitada quando as dependências não mudaram.

A abertura sem sessão mostra logo, cidade, **Começar** e **Cadastrar**. O tour é opcional. A apresentação usa autenticação e permissões reais. O atalho e `npm start` mostram 8 eventos, 6 relatos e 20 avaliações ilustrativas, com identificação de apresentação. As avaliações ficam em cinco lugares e não alteram os números nem as classificações públicas. Veja [onde tocar no mapa](CONTEUDO-E-MAPA.md).

Há três sentimentos: **Segura, Moderada e Cuidado**. Uma contribuição aprovada já classifica o lugar para toda a comunidade. A pessoa vê sua própria pendente imediatamente, identificada como pessoal. Pendentes devem ser revisadas na conta administradora em **Perfil → Administração → Avaliações**.

Ao abrir um lugar, o selo mostra **Seguro, Moderado ou Cuidado**. Sem contribuições disponíveis, permanece **Sem avaliações suficientes**. A classificação representa percepções da comunidade, sem garantia objetiva de segurança.

Para mostrar nomes e comentários, busque **Praça Nereu Ramos**, **Praça do Congresso**, **Parque das Nações**, **Shopping Della** ou **Criciúma Shopping**. Abra e expanda os detalhes. Há quatro exemplos em cada um, na seção **Avaliações recentes**. O selo ilustrativo é identificado com **apresentação**; avaliações reais disponíveis têm prioridade. Detalhes em **AVALIACOES-PARA-APRESENTACAO.md**.

As abas **Mapa, Eventos, Relatos e Perfil** e as opções do Perfil usam desfoque progressivo antes da troca e recuperação do foco na entrada. Participar desfoca o fundo do painel. A barra inferior permanece fixa e nítida. A preferência de reduzir movimento desativa o efeito. No Android 12+, o efeito é aplicado diretamente à tela; nos anteriores, usa o módulo nativo de desfoque.

Para abrir no celular, execute `npm ci` e `npm run apresentacao`, mantenha computador e celular na mesma rede e leia o QR no Expo Go atualizado para SDK 58. Se estiver usando um aplicativo nativo compilado antes desta atualização, gere e instale um novo build: foi adicionado o módulo nativo `expo-blur`, que não pode ser entregue apenas por atualização JavaScript. Um build Android próprio também precisa da configuração de Google Maps descrita em `docs/qa/BUILD-E-OBSERVABILIDADE.md`.

Os bundles de Android/iOS/Web e os testes automatizados foram verificados. Instalação, GPU do mapa e fluidez em aparelho físico ainda exigem a checagem descrita em `docs/qa/MATRIZ-APARELHOS.md`; a exportação não substitui um build nativo instalado.

A migração para três sentimentos já está aplicada no projeto conectado. Não execute SQL novamente para abrir esta versão. Nenhuma conta, senha ou papel foi alterado nesta adaptação.

Para mostrar a proteção administrativa, entre na conta admin, abra a administração, saia e entre em uma conta comum. O acesso continua restrito ao papel conferido no banco.

O atalho limpa o cache. Não use `npm run demo` para apresentar dados reais. Se aparecer uma interface antiga, encerre a sessão do Expo e leia o QR desta pasta.

Detalhes e evidências: [ALTERACOES-ELAS-MAIN-2026-11-03.md](ALTERACOES-ELAS-MAIN-2026-11-03.md).

Detalhes da transição e testes atuais: [ALTERACOES-SWOOSH-E-AVALIACOES.md](ALTERACOES-SWOOSH-E-AVALIACOES.md).

Correção mais recente da sessão Android e da transição: [CORRECAO-CELULAR-2026-11-04.md](CORRECAO-CELULAR-2026-11-04.md). A sessão salva é preservada. Feche o Expo anterior e leia o QR desta versão corrigida.
