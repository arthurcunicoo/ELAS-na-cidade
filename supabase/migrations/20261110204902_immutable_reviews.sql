-- A new submission creates its own review. Authors can read or remove a review,
-- but they cannot replace its content or factors after submission.
alter table public.avaliacoes drop constraint avaliacoes_usuario_id_lugar_id_key;
create index avaliacoes_autor_lugar_recentes_idx
 on public.avaliacoes(usuario_id,lugar_id,contribuida_em desc,id desc);

drop policy avaliacao_editar on public.avaliacoes;
drop policy avaliacao_criar on public.avaliacoes;
drop policy vinculo_criar on public.avaliacao_fatores;
drop policy vinculo_excluir on public.avaliacao_fatores;
revoke insert,update on public.avaliacoes from public,anon,authenticated;
revoke insert (usuario_id,lugar_id,sentimento,comentario),
 update (sentimento,comentario) on public.avaliacoes from public,anon,authenticated;
revoke insert,update,delete on public.avaliacao_fatores from public,anon,authenticated;
revoke insert (avaliacao_id,fator_id) on public.avaliacao_fatores from public,anon,authenticated;

-- The public RPC is an invoker wrapper. Only this private function may write
-- review content on behalf of an authenticated author. A retry reuses its ID.
create function private.criar_avaliacao(
 p_lugar text,p_sentimento text,p_comentario text,p_fatores text[],p_chave uuid
) returns uuid language plpgsql security definer set search_path='' as $$
declare
 v_usuario uuid:=auth.uid();
 v_sentimento text:=case when p_sentimento='Atenção' then 'Cuidado' else p_sentimento end;
 v_comentario text:=coalesce(p_comentario,'');
 v_fatores text[];
 v_id uuid;
begin
 if v_usuario is null then raise exception 'Login obrigatório' using errcode='42501';end if;
 /* elas_active_account_guard */
 if to_regprocedure('private.conta_disponivel()') is not null then
  if not (select private.conta_disponivel()) then raise exception 'Conta indisponível' using errcode='42501';end if;
 end if;
 /* elas_active_account_guard_end */
 if p_chave is null then raise exception 'Envio inválido' using errcode='22023';end if;
 if p_fatores is null or cardinality(p_fatores) not between 1 and 6 then
  raise exception 'Escolha entre um e seis fatores' using errcode='22023';
 end if;
 if exists(select 1 from unnest(p_fatores) f where f is null or not exists(select 1 from public.fatores c where c.id=f)) then
  raise exception 'Fator inválido' using errcode='22023';
 end if;
 select array_agg(distinct f order by f) into v_fatores from unnest(p_fatores) f;

 insert into public.avaliacoes(id,usuario_id,lugar_id,sentimento,comentario)
 values(p_chave,v_usuario,p_lugar,v_sentimento,v_comentario)
 on conflict(id) do nothing returning id into v_id;
 if v_id is null then
  if not exists (
   select 1 from public.avaliacoes a
   join public.lugares l on l.id=p_lugar
   where a.id=p_chave and a.usuario_id=v_usuario
    and a.lugar_id=coalesce(l.duplicado_de,l.id)
    and a.sentimento=v_sentimento and a.comentario=v_comentario
    and (select array_agg(f.fator_id order by f.fator_id)
         from public.avaliacao_fatores f where f.avaliacao_id=a.id)=v_fatores
  ) then
   raise exception 'Esta tentativa já foi usada com outro conteúdo' using errcode='22023';
  end if;
  return p_chave;
 end if;
 insert into public.avaliacao_fatores(avaliacao_id,fator_id)
 select v_id,f from unnest(v_fatores) f;
 return v_id;
end $$;

create function public.criar_avaliacao(
 p_lugar text,p_sentimento text,p_comentario text,p_fatores text[],p_chave uuid
) returns uuid language sql security invoker set search_path='' as $$
 select private.criar_avaliacao(p_lugar,p_sentimento,p_comentario,p_fatores,p_chave)
$$;

-- Older app versions also get append-only writes through their original RPC.
create or replace function public.salvar_avaliacao(
 p_lugar text,p_sentimento text,p_comentario text,p_fatores text[]
) returns uuid language sql security invoker set search_path='' as $$
 select private.criar_avaliacao(p_lugar,p_sentimento,p_comentario,p_fatores,gen_random_uuid())
$$;
revoke all on function private.criar_avaliacao(text,text,text,text[],uuid),
 public.criar_avaliacao(text,text,text,text[],uuid),
 public.salvar_avaliacao(text,text,text,text[]) from public,anon;
grant execute on function private.criar_avaliacao(text,text,text,text[],uuid),
 public.criar_avaliacao(text,text,text,text[],uuid),
 public.salvar_avaliacao(text,text,text,text[]) to authenticated;

-- Keep the latest approved contribution per account and place in the aggregate.
-- A newer pending review is visible only to its author and does not replace it.
update private.politica_avaliacoes set versao=greatest(versao,3) where unica;
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
 )
 select coalesce(jsonb_agg(jsonb_build_object(
  'lugar_id',s.lugar_id,'total',s.total,'minimo',p.minimo,'janela_dias',p.janela_dias,
  'politica',jsonb_build_object('versao',p.versao,'metodo',metodo),
  'classificacao',case when s.total<p.minimo then 'unknown' when s.cuidado::numeric/s.total>=p.limiar_atencao then 'attention' when s.segura::numeric/s.total>=p.limiar_favoravel then 'safe' else 'moderate' end,
  'distribuicao',case when s.total>=p.minimo then jsonb_build_object('Segura',s.segura,'Moderada',s.moderada,'Cuidado',s.cuidado) else null end,
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
 ) s;
 return result;
end $$;
