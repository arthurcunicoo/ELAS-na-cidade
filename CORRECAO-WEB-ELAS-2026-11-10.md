# Fluidez e transições do ELAS no computador

Feche o Expo anterior. No Windows, abra **Apresentar-ELAS-no-PC.cmd** na pasta desta versão. Pelo terminal, use `npm run apresentacao:web`. No celular, continue usando **Apresentar-ELAS.cmd** e o novo QR do Expo Go 58.

Os dois pacotes anteriores têm o mesmo código de navegação e animação. A correção da chave pública do Supabase não alterou o desfoque. No navegador de teste, a versão anterior ainda fazia a transição, mas atrasava quadros quando o mapa e o React de desenvolvimento disputavam tempo de processamento. Desativar os filtros no mesmo teste não explicou a maior parte da demora. Só trocar para o modo otimizado já reduziu o tempo de retorno ao mapa.

| Teste em desktop 1440 × 900, CPU limitada em 4× | Anterior em desenvolvimento | Anterior em modo otimizado | Entrega atual pelo atalho para PC |
| --- | ---: | ---: | ---: |
| Eventos → Mapa, mediana de três passagens | 3.014 ms | 1.804 ms | 1.725 ms |
| Intervalo entre quadros ao arrastar o mapa, percentil 95 | 100 ms | 16,8 ms | 16,8 ms |

Medição em Chromium com 261 lugares simulados e tiles locais de 256 × 256; o Supabase foi simulado no navegador. Os números comparam as versões nas mesmas condições e não medem a máquina da apresentação.

O atalho carrega o app com `--no-dev --minify`. A transição Web usa a animação do próprio navegador para desfocar a tela que sai e recuperar o foco da próxima. O filtro é removido ao terminar. A barra inferior permanece nítida, o fundo de Participar continua desfocado enquanto o painel está aberto e a preferência do sistema por movimento reduzido é respeitada. A transição nativa e a configuração do Supabase foram preservadas.

`npm ci` e `npm run verify` passaram. Em 1440 × 900 e 1920 × 1080, o teste em Chromium conferiu as quatro abas, as nove opções do Perfil, Participar, troca rápida de abas, movimento reduzido e saída da conta. Os bundles Android e iOS para Expo Go 58 compilaram e responderam. Não houve teste no computador da apresentação nem em aparelho físico nesta revisão. Os resultados estão em `qa/web-desktop-2026-11-10/results.json`.
