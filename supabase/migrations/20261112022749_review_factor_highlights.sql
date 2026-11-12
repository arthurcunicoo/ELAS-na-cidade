-- Rank factor mentions from the same approved contributions as the map summary.
-- Only catalog factor IDs and aggregate counts are returned.
create or replace function private.resumos_avaliacoes(p_lugares text[]) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb; p private.politica_avaliacoes%rowtype; metodo text;
begin
 /* elas_active_account_guard */
 if to_regprocedure('private.conta_disponivel()') is not null then
  if not (select private.conta_disponivel()) then raise exception 'Conta indisponível' using errcode='42501';end if;
 end if;
 /* elas_active_account_guard_end */
 if auth.uid() is null then raise exception 'Sessão necessária' using errcode='42501';end if;
 if p_lugares is null or cardinality(p_lugares)>600 or array_position(p_lugares,null) is not null then
  raise exception 'Lista de lugares inválida' using errcode='22023';
 end if;
 select * into strict p from private.politica_avaliacoes where unica;
 metodo:=format('Para cada conta e lugar, vale a avaliação aprovada mais recente dos últimos %s dias. A classificação aparece a partir de %s %s: %s%% ou mais em “Cuidado” indicam Cuidado; caso contrário, %s%% ou mais em “Segura” indicam Seguro. Os demais resultados são Moderada. Avaliações pendentes, rejeitadas ou excluídas não contam. São percepções da comunidade; não garantem segurança.',
  p.janela_dias,p.minimo,case when p.minimo=1 then 'avaliação aprovada' else 'avaliações aprovadas' end,
  trim(trailing '.' from trim(trailing '0' from (p.limiar_atencao*100)::numeric(6,2)::text)),
  trim(trailing '.' from trim(trailing '0' from (p.limiar_favoravel*100)::numeric(6,2)::text)));

 with aprovada_por_conta as (
  select distinct on (a.lugar_id,a.usuario_id) a.id,a.lugar_id,a.sentimento,a.contribuida_em
  from public.avaliacoes a
  where a.lugar_id=any(p_lugares) and a.status='aprovada'
   and a.contribuida_em>=now()-make_interval(days=>p.janela_dias) and a.contribuida_em<=now()
  order by a.lugar_id,a.usuario_id,a.contribuida_em desc,a.id desc
 ), fatores_contados as (
  select a.lugar_id,case when a.sentimento='Segura' then 'fortes' else 'atencao' end grupo,
   f.id fator,f.ordem,count(*)::integer total
  from aprovada_por_conta a
  join public.avaliacao_fatores af on af.avaliacao_id=a.id
  join public.fatores f on f.id=af.fator_id
  where a.sentimento in ('Segura','Moderada','Cuidado')
   and f.id in ('iluminacao','movimento','acessibilidade','limpeza','assedio')
   and (a.sentimento<>'Segura' or f.id<>'assedio')
  group by a.lugar_id,grupo,f.id,f.ordem
 ), fatores_ordenados as (
  select *,row_number() over(partition by lugar_id,grupo order by total desc,ordem) pos
  from fatores_contados
 ), destaques_por_lugar as (
  select lugar_id,jsonb_build_object(
   'fortes',coalesce(jsonb_agg(jsonb_build_object('fator',fator,'total',total) order by pos)
    filter(where grupo='fortes'),'[]'::jsonb),
   'atencao',coalesce(jsonb_agg(jsonb_build_object('fator',fator,'total',total) order by pos)
    filter(where grupo='atencao'),'[]'::jsonb)
  ) destaques
  from fatores_ordenados where pos<=3 group by lugar_id
 )
 select coalesce(jsonb_agg(jsonb_build_object(
  'lugar_id',s.lugar_id,'total',s.total,'minimo',p.minimo,'janela_dias',p.janela_dias,
  'politica',jsonb_build_object('versao',p.versao,'metodo',metodo),
  'classificacao',case when s.total<p.minimo then 'unknown' when s.cuidado::numeric/s.total>=p.limiar_atencao then 'attention' when s.segura::numeric/s.total>=p.limiar_favoravel then 'safe' else 'moderate' end,
  'distribuicao',case when s.total>=p.minimo then jsonb_build_object('Segura',s.segura,'Moderada',s.moderada,'Cuidado',s.cuidado) else null end,
  'destaques',case when s.total>=p.minimo then d.destaques else null end,
  'ultima_contribuicao',case when s.total>=p.minimo then s.ultima else null end,
  'propria',(select jsonb_build_object('sentimento',own.sentimento,'status',own.status)
    from public.avaliacoes own
    where own.lugar_id=s.lugar_id and own.usuario_id=auth.uid() and own.status in ('pendente','aprovada')
    order by own.contribuida_em desc,own.id desc limit 1)
 ) order by s.lugar_id),'[]'::jsonb) into result from (
  select l.id lugar_id,count(a.id)::integer total,
   count(a.id) filter(where a.sentimento='Segura')::integer segura,
   count(a.id) filter(where a.sentimento='Moderada')::integer moderada,
   count(a.id) filter(where a.sentimento='Cuidado')::integer cuidado,
   (max(a.contribuida_em) at time zone 'America/Sao_Paulo')::date ultima
  from public.lugares l left join aprovada_por_conta a on a.lugar_id=l.id
  where l.id=any(p_lugares) group by l.id
 ) s left join destaques_por_lugar d on d.lugar_id=s.lugar_id;
 return result;
end $$;
