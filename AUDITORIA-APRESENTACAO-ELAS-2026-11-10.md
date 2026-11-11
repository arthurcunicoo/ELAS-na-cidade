# ELAS na Cidade — revisão para a apresentação de quinta, 12/11

Revisão de 10/11/2026, horário de São Paulo. Base: ZIP mais recente entregue neste chat, com Expo 58.0.23 e a correção de avaliações imutáveis. As duas correções adicionais desta revisão estão nesta mesma base.

**Veredito: os fluxos centrais passaram nos testes executados, mas nem todos os pedidos anteriores estão implantados ou validados em aparelho. Não há evidência para prometer “100% sem erros”.**

## O que corrigi agora

1. Removi **Corrigir meu registro** dos detalhes dos relatos e solicitações, junto com os campos e estados usados exclusivamente por essa edição. Retirada com confirmação e histórico continuam funcionando.
2. Corrigi o atalho **Apresentar-ELAS.cmd / npm run apresentacao**: ele ativava avaliações ilustrativas por padrão. Agora abre os dados do Supabase com esses exemplos desligados. Não escondi exemplos mudando sua identificação para parecerem contribuições reais.
3. Adicionei testes de comportamento para esses detalhes e para recuperação de senha. O teste no navegador executou o atalho de apresentação de verdade, além de percorrer os menus.

Nenhuma identidade visual foi redesenhada e nenhuma versão de dependência do aplicativo foi trocada. Não publiquei relatos, avaliações, eventos ou enquetes de teste no feed.

## O que foi testado nesta revisão

| Verificação | Resultado e alcance |
| --- | --- |
| Instalação limpa do ZIP | npm ci passou. |
| Suíte automatizada | npm run verify passou antes e depois das correções. Inclui TypeScript, lint, banco isolado, regras, paginação, mapa, permissões e componentes. |
| Navegador com o app Expo real | Telas de 320 × 568, 357 × 706 e 390 × 844; os cenários usam APIs simuladas para operações de conta e envio. Não equivale a um aparelho físico. |
| Abertura e onboarding | Template inicial preservado, Começar abre login, Cadastrar abre cadastro e tour é opcional. |
| Swoosh | Desfoque medido entre as abas e nove opções do perfil; navegação inferior permanece nítida; movimento reduzido respeitado. |
| Participar | Sheet com Avaliar e Relatar; botões de Eventos/Enquetes compartilhados; navegação rápida e saída da conta verificadas. |
| Avaliações | Duas avaliações para o mesmo lugar geram IDs distintos; primeira permanece no histórico. Nenhum botão Editar avaliação. |
| Recuperar senha | Separação mínima de 12 px verificada entre campo e botão em 320 e 390 px; validação e avanço para código passaram com envio de e-mail simulado. |
| Expo Go | SDK 58.0.0 anunciado pelos manifests Android e iOS; bundles nativos compilados e respondendo. Expo instalado: 58.0.23. |
| Exportação | Android e web exportados. Não foi produzido ou instalado um novo APK nesta revisão. |
| Chave do Supabase | Configuração do ZIP responde HTTP 200 em Auth settings; e-mail habilitado, cadastro habilitado e confirmação automática habilitada. Nenhuma chave foi publicada neste relatório. |
| Supabase usado pelo ZIP | Projeto existente ELAS na Cidade, ref pxcbzjxgxdmdayqwpqcj. Nenhum projeto novo criado. |
| Permissões no banco conectado | Conta comum não acessa administração nem publica eventos/enquetes. teste.elas@example.com possui papel admin; é a única conta com esse papel. |
| Fluxos de escrita no banco conectado | Avaliação, aprovação, rejeição, classificação dinâmica, relato privado/publicado, evento, inscrição e enquete/voto passaram em uma transação revertida. |

O teste SQL conectado usou papéis autenticados e identidade de contas existentes por claims simuladas. **Não foi um login com a senha da conta nem um teste de e-mail recebido.** O script está em scripts/qa/presentation-live.sql e exige conexão de operador. Ao final, reverte todos os registros de teste.

As contagens permaneceram em 11 avaliações, 30 vínculos de fatores, 5 relatos, 6 eventos e 3 enquetes após o teste. Nenhum lugar temporário de auditoria permaneceu no banco.

## Conteúdo disponível de verdade no banco

| Área | O que está disponível |
| --- | --- |
| Eventos | 6 publicados, não cancelados e futuros na consulta; retornam para uma conta comum. Há eventos agendados para 12/11 e datas posteriores. |
| Enquetes | 3 publicadas e abertas. Resultados ocultos antes do voto e visíveis após o voto no teste de banco. |
| Avaliações | 11 registros; 4 aprovados dentro da janela vigente, em 3 lugares. Os demais não devem influenciar a classificação pública. |
| Relatos | 5 registros; 1 verificado. **Nenhum relato público dentro das últimas 24 horas** no momento da revisão. |
| Impactos | **Nenhuma solicitação de melhoria cadastrada** no banco conectado. Os zeros são dados reais, não falha de carregamento comprovada. |
| Catálogo | 1.535 lugares; consulta e seleção podem usar o banco existente. |

Classificações públicas consultadas diretamente pela regra vigente:

| Lugar | Classificação pública | Contribuições aprovadas consideradas |
| --- | --- | --- |
| Praça do Congresso | Seguro | 1 |
| Praça Nereu Ramos | Cuidado | 2 |
| Shopping dos Camelôs | Moderado | 1 |
| Parque das Nações | Sem avaliações suficientes | 0 |

Uma avaliação pendente pode aparecer como percepção pessoal de sua autora. Isso não equivale à classificação pública. A política retorna do backend: uma contribuição aprovada mais recente por conta e lugar, janela de 180 dias, mínimo atual de 1. Avaliações antigas da mesma conta continuam no histórico e não recebem peso duplicado.

**Não é necessário inventar uma classificação nem aprovar automaticamente uma avaliação para demonstrar os três estados:** os três primeiros lugares da tabela já cobrem Seguro, Moderado e Cuidado. O Parque das Nações demonstra corretamente o estado sem aprovação suficiente.

## O que ainda falta — confirmado

| Pendência | Situação encontrada | Efeito na apresentação |
| --- | --- | --- |
| Ensaio no celular e computador que serão usados | Nenhum aparelho físico conectado; não testei o computador do professor. | Ainda é necessário confirmar login com a senha conhecida, mapa, teclado e transições na instalação usada quinta-feira. |
| Quadrados brancos, ícones e fonte ampliada no Android | Navegação e componentes passaram no navegador; não houve nova captura de tela Android físico. | Não há evidência nesta revisão para afirmar que o artefato visual do celular foi eliminado. Conferir Participar, Notificações e fonte 130%/160% no aparelho. |
| Relatos recentes | O relato verificado ficou fora de 24 horas; pendentes não são públicos. | A aba recente pode abrir vazia. Um relato pertinente pode ser enviado e moderado pelo fluxo normal; não alterei datas para preencher a tela. |
| Impactos | Banco com zero solicitações. | Se essa tela for parte da apresentação, precisa de contribuição válida e de moderação para mostrar avanços reais. |
| Avaliações recentes com nomes/depoimentos públicos | As contribuições reais usam resumo agregado. Nomes e comentários são privados; a lista de exemplos é separada e agora vem desligada. | Não apresentar depoimentos ilustrativos como avaliações autênticas. Esse formato público não está implementado para as contribuições reais. |
| Recuperação completa por e-mail | UI e verificação por código testadas com transporte simulado; nenhum e-mail real recebido nesta revisão. | Não depender desse fluxo ao vivo sem validar a entrega e a troca de senha antes. |
| APK instalado | Sem APK novo, assinatura, instalação ou deep links verificados. A variável de chave Google Maps Android não está configurada neste ZIP; não consultei segredos remotos do EAS. | Compilar para Expo Go não comprova o mapa em um APK próprio. |
| Push | Desligado no banco; worker existe, sem entrega física confirmada. | Não demonstrar notificação push como recurso pronto. Inbox dentro do app é outro fluxo. |
| Exclusão de conta | Flag desligada no ZIP e Edge account-erasure ausente do projeto conectado. | Não está operacional nesse ambiente. |
| Administração de papéis | Migration de auditoria/proteção do último admin não aplicada. RPCs novos de gestão não estão implantados. | A administração de moderação/publicação funciona; a manutenção auditada dos administradores ainda não. |
| Atualização automática do catálogo | 81 tiles configurados; nenhum com received maior que zero. Job e Edge existem. | O catálogo já gravado funciona, mas a atualização periódica ainda não foi comprovada. |
| Monitoramento | DSN Sentry vazio no ZIP; logs e ferramentas existem. | Crash reporting de produção não comprovado. |
| Carga e operação | Sem teste de carga remoto, restauração remota de backup ou medições FPS/RAM físicas nesta revisão. | Não são provas de falha do piloto, mas impedem afirmar validação para lançamento em escala. |

As migrations locais abaixo **não constam como aplicadas** no projeto conectado:

- 20261025213938_account_erasure_controls.sql
- 20261025214404_catalog_job_jitter.sql
- 20261027142216_atomic_catalog_ingestion.sql
- 20261027142217_backend_capabilities.sql
- 20261027142305_admin_roles_audit.sql

A versão de backend é 11 e o app aceita 11 para os fluxos centrais. A migration de avaliações imutáveis 20261110204902 está aplicada. Não executei as cinco pendentes automaticamente: elas envolvem implantação de serviços, controle de papéis ou políticas de conta, e precisam do conjunto de validações e configuração de ambiente correspondente. Ter os arquivos e os testes locais não significa que esses recursos estejam implantados.

## Sobre o clone do professor

O ZIP inclui a configuração de cliente em .env; esse arquivo é ignorado pelo Git. Portanto, um clone não recebe automaticamente a mesma configuração que o ZIP. Isso é uma diferença concreta e compatível com o sintoma descrito, **não uma causa comprovada na máquina do professor**.

Para reproduzir a entrega sem misturar versões: extrair este ZIP em uma pasta nova, usar Node 24.3+ da linha 24 ou Node 26+, abrir Apresentar-ELAS.cmd e ler o novo QR. Em clone Git, preencher .env com o mesmo projeto e sua chave publicável, mantendo as flags DEMO, SHOWCASE e REVIEW_EXAMPLES em 0. Reiniciar o Expo após mudar variáveis.

## Roteiro curto para quinta-feira

1. Abrir o ZIP revisado e entrar com uma conta comum cuja senha já foi confirmada no aparelho. A tela inicial deve ser o template; o tour é opcional.
2. Buscar Praça do Congresso, Shopping dos Camelôs e Praça Nereu Ramos para mostrar as três classificações reais da tabela. Mostrar que Parque das Nações ainda não tem aprovação suficiente.
3. Usar Participar para enviar uma nova avaliação. Ela deve ir para análise e aparecer em Minhas avaliações, sem permitir edição.
4. Abrir Eventos e Enquetes. Escolher um evento ainda futuro; votar e mostrar o resultado liberado depois do voto.
5. Enviar um relato pertinente; acompanhar a pendência pelo próprio histórico. Somente a moderação o torna público.
6. Sair, entrar como teste.elas@example.com e mostrar a administração/moderação. Não usar recuperação de senha como parte improvisada da demonstração.
7. Voltar à conta comum e mostrar que a área administrativa não está disponível.

O telefone e a rede usados na apresentação são a última verificação prática que falta. Os testes desta revisão reduzem o risco, mas não substituem esse ensaio.

## Os 63 pontos anteriores

A matriz abaixo usa a checklist já existente no projeto como índice e atualiza seu alcance. “Código/testes” indica implementação presente e coberta pela suíte disponível; não significa validação física, teste de produção em escala ou revisão remota da CI. “Parcial” e “Pendente” não são itens concluídos.

| Nº | Pedido | Situação | Resultado desta revisão |
| --- | --- | --- | --- |
| 1 | Paleta central | Código/testes | Tokens centralizados; cores de conquistas também corrigidas nesta revisão. |
| 2 | Raios | Código/testes | Escala 8/12/20/pill; exceções geométricas de pins/ilustrações permanecem. |
| 3 | Linguagem dos cards | Parcial | Base compartilhada presente; sombras e densidades ainda variam em cards específicos. |
| 4 | Textos de 10/11 | Código/testes | Nenhum fontSize 10/11 em telas/componentes/features; escala mínima centralizada. |
| 5 | Largura das páginas | Código/testes | pageContent unifica telas; painéis do mapa têm largura própria intencional. |
| 6 | Headers | Código/testes | PageHeader compartilhado; barra do mapa é uma composição específica. |
| 7 | Botões | Código/testes | Variantes e TouchFeedback comuns; wrappers de conta usam a mesma base. |
| 8 | Formulários | Código/testes | Field compartilhado com foco, erro, desabilitado e sucesso; ícones não escalam como texto. |
| 9 | Função do botão central | Código/testes | Participar segue a decisão posterior do usuário e abre as duas ações distintas. |
| 10 | Nome das enquetes | Código/testes | Enquetes na área pública e no admin; mensagens antigas do banco são traduzidas no cliente. |
| 11 | Resultados antes do voto | Código/testes | SQL e UI restringem resultados até voto ou encerramento no servidor. |
| 12 | Copy dos votos | Código/testes | Porcentagem usa dos votos. |
| 13 | Alertas x relatos | Código/testes | Navegação/título públicos usam Relatos; rota antiga alertas permanece compatível. |
| 14 | Hierarquia do relato | Código/testes | Destaque identificado como Relato mais recente, sem inventar ranking de gravidade. |
| 15 | Relato próprio pendente | Código/testes | Indicação de autoria e verificação nas telas próprias; feed público não apresenta pendências como publicadas. |
| 16 | Inbox canônica | Código/testes | Perfil e Relatos abrem a mesma rota de notificações. |
| 17 | Escopo das contagens de Impactos | Código/testes | Números pessoais separados do painel público da cidade. |
| 18 | Escopo da lista de Impactos | Código/testes | Seções e identificação própria diferenciam pedidos pessoais e melhorias públicas. |
| 19 | Cores de status | Código/testes | impactStatus usa statusText/palette como fonte única. |
| 20 | Participar e sheet | Código/testes | Círculo de 56 por 56, duas opções com ícones/copy e transição com redução de movimento. |
| 21 | Impactos dentro de Mapa | Código/testes | Relação explicitada por Mapa › Impactos e ação de voltar ao mapa. |
| 22 | addLabel | Código/testes | Label visível usa a propriedade e mantém acessibilidade própria. |
| 23 | Confirmação genérica | Código/testes | Default Confirmar; logout fornece seu texto explicitamente. |
| 24 | APIs mortas | Código/testes | useAppData removido; providers compostos ainda usados. SQL legado preservado para clientes antigos; smoke atualizado para RPCs atuais. |
| 25 | Arquivos grandes | Parcial | Mapa e PlaceCard foram divididos; relato, avaliação, eventos, melhoria e admin ainda concentram muita lógica. |
| 26 | PlaceCard | Código/testes | PlaceCard com 165 linhas e subcomponentes de cabeçalho, mídia, ações e movimento. |
| 27 | Distância no card | Código/testes | Um cálculo memoizado por coordenadas/localização. |
| 28 | Camada de acesso | Parcial | Providers não fazem consultas diretas; ainda há helpers de acesso distribuídos em features além de services. |
| 29 | Carga antecipada | Código/testes | Catálogo regional e fatores são carregados quando usados; não no login global. |
| 30 | Paginação | Código/testes | Frontend ativo usa cursor; RPCs de OFFSET antigos seguem só por compatibilidade. Smoke corrigido para o caminho atual. |
| 31 | Busca de lugares | Código/testes | Normalização, pg_trgm/GIN e busca por similaridade no SQL. |
| 32 | Busca administrativa | Código/testes | Índices/consultas normalizadas e autorização por tipo de fila. |
| 33 | Geografia de relatos | Código/testes | Coluna geográfica, índice GiST e consulta espacial no servidor. |
| 34 | Corte de 100 relatos | Código/testes | Agregação contabiliza região completa; drill-down paginado de grupos não perde registros por esse limite. |
| 35 | Clusters de relatos | Código/testes | Agregação no servidor e expansão/lista por grupo. |
| 36 | Semântica dos markers | Código/testes | ReportMarker comum no mapa web e nativo. |
| 37 | Cache espacial | Código/testes | Viewport/chave quantizados juntos, com margem para preservar bordas. |
| 38 | Seleção no banco | Código/testes | SQL ranqueia e retorna até 500 lugares; frontend reduz a apresentação pelo zoom. |
| 39 | Importação em background | Parcial | App lê o banco; Edge e cron existem, mas 0 de 81 tiles registram received > 0. Ingestão atômica não implantada. |
| 40 | Múltiplas cidades | Parcial | service_areas e troca de cidade funcionam; piloto só em Criciúma, datas/heurísticas ainda têm referências locais. |
| 41 | Tiles web | Parcial | Provedor configurável e gate existem; ambiente atual continua no modo piloto OSM. |
| 42 | Política comunitária | Código/testes | Política v3 retornada pelo banco: mínimo 1, janela 180 dias e contribuição aprovada mais recente por conta/lugar. Ciclo dinâmico passou em SQL revertido. |
| 43 | Percepção não é verdade objetiva | Código/testes | UI comunica percepções, mínimo e distribuição; não rotula o lugar como perigoso automaticamente. |
| 44 | Eventos em uma viagem | Código/testes | pagina_app inclui inscrito; frontend não faz segunda busca de inscrições por página. |
| 45 | RPC de Impactos | Código/testes | Painel com escopos pessoais/públicos usa uma viagem; API anterior mantida para compatibilidade. |
| 46 | Resumo materializado | Adiado | Agregação atual mantida conforme pedido; materialização depende de carga real futura. |
| 47 | Cancelamento | Parcial | Mapa/busca/detalhe/resumo cancelam no fetch; Request.signal e Auth temporário corrigidos. Algumas listas ainda só ignoram respostas fora de foco. |
| 48 | Tamanho dos assets | Código/testes | Quatro JPEGs com largura 800 px e cerca de 68–100 KB; sem alteração de identidade nesta revisão. |
| 49 | Referências de design | Código/testes | PNGs de referência ficam em docs/design, separados dos assets de execução. |
| 50 | Engine web | Parcial | 362 linhas mais módulos de geometria/drag/tiles e testes; mantém engine própria, sem biblioteca especializada. |
| 51 | Suíte e CI | Código/testes | npm ci e suíte completa executados nesta revisão; cenários de navegador e manifests/bundles SDK 58 também. CI remota não executada. |
| 52 | E2E físico | Pendente | Fluxos preparados, iOS corrigido para validar build/backend real. Nenhum aparelho conectado nesta revisão. |
| 53 | Regressão visual | Parcial | Diff/baseline/CI preparados; metadados/OS reforçados. Nenhuma baseline física aprovada. |
| 54 | Dynamic Type real | Parcial | Controles adaptam fonte; verificações 130/160 por aparelho ainda não executadas. |
| 55 | Observabilidade de produção | Parcial | Sentry sem DSN no ZIP; nenhuma recepção de crash externo verificada. |
| 56 | Carga no Supabase | Pendente | k6 preparado e protocolo local testado; não há execução de 500 usuários no staging. |
| 57 | FPS/RAM de Android médio | Pendente | Coletor/procedimento presentes; sem medições físicas. |
| 58 | Build de produção instalada | Pendente | Export Android/web e bundles de entrada Android/iOS passaram; APK assinado/instalado continua sem validação. |
| 59 | Recuperação real de conta | Pendente | Espaçamento e etapas de recuperação passaram no navegador; entrega de e-mail e login após troca não comprovados. |
| 60 | Backup/restauração real | Parcial | Ferramentas e teste local presentes; restauração de backup remoto pendente. |
| 61 | Retenção da idempotência | Código/testes | Retenção de 30 dias e cron ativo confirmados no banco; nenhuma restauração ou retenção operacional de grande volume foi simulada. |
| 62 | Operação administrativa | Parcial | Moderação, publicação e restrições passaram em SQL conectado; gestão auditada e proteção do último administrador ainda não implantadas. |
| 63 | Push real | Parcial | Push desligado no banco; sem recebimento em aparelho verificado. |
