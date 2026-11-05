# Avaliações para a apresentação

Há **20 avaliações ilustrativas** gravadas no Supabase, quatro em cada um dos cinco lugares abaixo. Os nomes são personagens fictícios. Os comentários simulam experiências para apresentar a interface; não descrevem a segurança real desses locais.

| Lugar | Classificação do cenário ilustrativo | Exemplos |
| --- | --- | --- |
| Praça Nereu Ramos | Seguro · apresentação | 4 |
| Praça do Congresso | Moderado · apresentação | 4 |
| Parque das Nações | Cuidado · apresentação | 4 |
| Shopping Della | Seguro · apresentação | 4 |
| Criciúma Shopping | Moderado · apresentação | 4 |

## Como mostrar

1. Encerre o Expo da versão anterior e abra **Apresentar-ELAS.cmd**, ou execute `npm run apresentacao`.
2. Entre em uma conta, vá ao Mapa e busque um dos lugares da tabela.
3. Toque no marcador do ELAS para abrir o cartão e ver a classificação. Expanda os detalhes para ver **Avaliações recentes**, com nome, sentimento e comentário.
4. Role o conteúdo do cartão para ver as quatro contribuições ilustrativas.

O selo e os cartões identificam os exemplos como apresentação. Quando o lugar tem percepção pública real ou uma avaliação da própria conta, essa informação tem prioridade no cabeçalho; os exemplos continuam em uma seção separada. Para mostrar os três selos ilustrativos, use uma conta que ainda não tenha avaliado esses lugares.

O atalho prepara automaticamente as dependências e limpa o cache. O `npm ci` foi executado nesta entrega; a instalação correspondente ao sistema do seu computador é conferida pelo atalho.

## Dados reais preservados

As amostras estão na tabela já existente `conteudos_demonstracao`, com `ficticio=true` e IDs exclusivos iniciados em `demo:apresentacao-avaliacao:`. Não foram criadas pessoas no Auth, avaliações aprovadas em nome de terceiros, nem votos, relatos ou métricas reais. A tabela `avaliacoes` foi conferida antes e depois da inserção e permaneceu intacta.

O carregamento é restrito ao modo `presentation` com `EXPO_PUBLIC_REVIEW_EXAMPLES=1`, ativo no atalho e no `npm start` deste pacote. Os modos normal e de produção mantêm esse recurso desligado. Os clientes apenas leem os registros permitidos pelas regras existentes do Supabase; não podem escrever nessa tabela. Os nomes e comentários reais das pessoas continuam privados.

Para abrir sem conteúdo de apresentação no PowerShell:

```powershell
$env:EXPO_PUBLIC_REVIEW_EXAMPLES="0"
$env:EXPO_PUBLIC_SHOWCASE="0"
npm run apresentacao
```

A origem reproduzível está em `supabase/avaliacoes-apresentacao.json` e no seed idempotente `supabase/AVALIACOES-APRESENTACAO.sql`. A carga já foi aplicada no projeto conectado; não é necessário rodar SQL novamente.

## Validação

A regressão cobre o parser, as três classificações ilustrativas, a desativação em produção, requisições limitadas e canceláveis, troca de conta/lugar, falha e nova tentativa, identificação visível dos exemplos e a carga repetida sem duplicar registros. O SQL foi validado localmente antes de ser aplicado.

A correção da sessão Android e as transições da versão anterior foram mantidas. Testes automatizados e exportações não substituem a instalação e a conferência final em um aparelho físico.
