# Conteúdo de apresentação no ELAS

Abra a pasta **Elas-main** e inicie **Apresentar-ELAS.cmd** ou `npm run apresentacao`. Se já tiver instalado as dependências, `npm start` também usa a configuração de apresentação deste pacote. Feche o Expo anterior e leia o QR novo no Expo Go com SDK 58.

O Supabase tem **8 eventos futuros**, **6 relatos ilustrativos** e **20 avaliações de apresentação**. Eventos e relatos de apresentação aparecem em suas próprias seções. Os exemplos não criam inscrições nem alertas reais. A versão de produção não carrega esse conteúdo.

| Lugar | Classificação de apresentação | Avaliações ilustrativas |
| --- | --- | --- |
| Praça Nereu Ramos | Seguro | 4 |
| Praça do Congresso | Moderado | 4 |
| Parque das Nações | Cuidado | 4 |
| Shopping Della | Seguro | 4 |
| Criciúma Shopping | Moderado | 4 |

No **Mapa**, toque no marcador do ELAS ou encontre o local pela busca. O cartão abre com a classificação disponível. Expanda o cartão para ver **Avaliações recentes**, com nomes e comentários fictícios identificados como exemplos. A classificação real tem prioridade quando há contribuições aprovadas. Sem avaliações disponíveis, permanece **Sem avaliações suficientes**.

## Por que alguns nomes no mapa não abrem o cartão?

No Android, o Google Maps desenha o fundo, inclusive nomes e ícones de lojas e outros pontos de interesse. O ELAS desenha seus próprios marcadores por cima, usando o catálogo de lugares e as avaliações do Supabase. O toque no marcador do ELAS abre o cartão. Um nome exibido no fundo pode existir apenas no mapa do Google ou estar visível num zoom em que o ELAS ainda não mostra o marcador daquele lugar.

O Google Maps não abre uma ficha automaticamente para esses pontos no app. Para aproveitar o toque no fundo, seria necessário receber o ponto do Google e associá-lo ao lugar correspondente no catálogo. Consulte a [documentação do Google Maps para Android](https://developers.google.com/maps/documentation/android-sdk/poi).

As amostras existentes estão no banco. Não é necessário aplicar SQL para abrir esta entrega. Os arquivos [DEMONSTRACAO.sql](supabase/DEMONSTRACAO.sql) e [AVALIACOES-APRESENTACAO.sql](supabase/AVALIACOES-APRESENTACAO.sql) permitem reproduzir a carga sem duplicar registros.

O clique nos cinco marcadores foi testado no app web em 320 × 568 e 357 × 706. Em ambos os tamanhos, o cartão mostrou a classificação e as quatro avaliações ao expandir. O teste do componente nativo confirmou a seleção do lugar ao tocar no marcador. Os bundles Android, iOS e web foram gerados com SDK 58. As evidências estão em [qa/conteudo-2026-11-05](qa/conteudo-2026-11-05).
