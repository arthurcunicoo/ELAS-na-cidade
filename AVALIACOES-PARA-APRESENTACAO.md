# Avaliações para a apresentação

1. Entre no ELAS, abra **Mapa** e busque **Praça do Congresso**.
2. Expanda o cartão do lugar e veja **Avaliações da comunidade**. O cartão mostra a distribuição entre Segura, Moderada e Cuidado e os fatores mais citados.
3. Em **Pontos fortes mais citados**, confira os fatores escolhidos em avaliações aprovadas como Segura, como boa iluminação e movimento de pessoas. **Pontos de atenção mais citados** reúne os fatores citados nas avaliações Moderada e Cuidado, quando houver dados.

Cada grupo exibe até três fatores, em ordem de menções. A contagem usa a avaliação aprovada mais recente de cada conta no lugar, dentro do período do resumo. Uma avaliação recém-enviada aparece para a própria pessoa como aguardando análise. Os destaques da comunidade se atualizam após aprovação.

O resumo público mostra contagens de fatores, com comentários e autoria privados. Os arquivos de avaliações ilustrativas em `supabase/` são dados de teste.

O build web precisa da migration `20261112020954_review_factor_highlights.sql` no Supabase para exibir os destaques.
