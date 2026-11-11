-- Operator-only regression check. All records created by this test roll back.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
select set_config('elas.qa_admin',(select id::text from auth.users where lower(email)='teste.elas@example.com'),true);
select set_config('elas.qa_user',(select u.id::text from auth.users u where not exists(select 1 from private.papeis p where p.usuario_id=u.id) order by u.created_at limit 1),true);
select set_config('elas.qa_other',(select u.id::text from auth.users u where u.id::text<>current_setting('elas.qa_user') and not exists(select 1 from private.papeis p where p.usuario_id=u.id) order by u.created_at limit 1),true);
select set_config('elas.qa_place','qa:'||gen_random_uuid()::text,true);
insert into public.lugares(id,nome,endereco,latitude,longitude)
values(current_setting('elas.qa_place'),'Local temporário de auditoria','Local de teste em transação revertida',-28.678,-49.369);
do $audit$
declare
 original_id uuid; newer_id uuid; retry_id uuid; report_id uuid:=gen_random_uuid();
 event_id uuid; poll_id uuid; option_id uuid; blocked boolean; data jsonb;
 place_id text:=current_setting('elas.qa_place');
begin
 if nullif(current_setting('elas.qa_admin'),'') is null or nullif(current_setting('elas.qa_other'),'') is null then
  raise exception 'Required test accounts not available';
 end if;
 execute 'set local role authenticated';
 perform set_config('request.jwt.claim.sub',current_setting('elas.qa_user'),true);
 if public.meu_papel()<>'usuario' then raise exception 'Common account has staff privileges';end if;
 blocked:=false;
 begin perform public.admin_resumo();exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'Common account accessed administration';end if;
 blocked:=false;
 begin perform public.publicar_evento('Evento transitório de QA','Descrição de teste','Local de teste',now()+interval '7 days');exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'Common account published an event';end if;
 blocked:=false;
 begin perform public.publicar_enquete('Enquete transitória de QA',array['A','B'],now()+interval '7 days');exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'Common account published a poll';end if;

 original_id:=public.criar_avaliacao(place_id,'Segura','Primeira contribuição temporária',array['iluminacao'],gen_random_uuid());
 retry_id:=public.criar_avaliacao(place_id,'Segura','Primeira contribuição temporária',array['iluminacao'],original_id);
 if retry_id<>original_id then raise exception 'Retry duplicated submission';end if;
 blocked:=false;
 begin update public.avaliacoes set comentario='Forbidden edit' where id=original_id;exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'Author can edit a review';end if;
 blocked:=false;
 begin delete from public.avaliacao_fatores where avaliacao_id=original_id;exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'Author can change submitted factors';end if;
 data:=public.resumos_avaliacoes(array[place_id],true)->'resumos'->0;
 if data->>'classificacao'<>'unknown' then raise exception 'Pending review influenced public classification';end if;
 execute 'reset role';
 update public.avaliacoes set contribuida_em=now()-interval '1 minute' where id=original_id;
 execute 'set local role authenticated';
 perform set_config('request.jwt.claim.sub',current_setting('elas.qa_admin'),true);
 if public.meu_papel()<>'admin' then raise exception 'Admin account lacks admin role';end if;
 perform public.admin_resumo();
 perform public.moderar('avaliacao',original_id::text,'aprovada','Validação temporária de QA','pendente');
 perform set_config('request.jwt.claim.sub',current_setting('elas.qa_user'),true);
 data:=public.resumos_avaliacoes(array[place_id],true)->'resumos'->0;
 if data->>'classificacao'<>'safe' then raise exception 'Approval failed to classify place';end if;
 newer_id:=public.criar_avaliacao(place_id,'Cuidado','Outra contribuição temporária',array['movimento'],gen_random_uuid());
 if newer_id=original_id then raise exception 'Second review overwrote the original';end if;
 if not exists(select 1 from public.avaliacoes where id=original_id and sentimento='Segura' and comentario='Primeira contribuição temporária' and status='aprovada') then raise exception 'Original review changed';end if;
 data:=public.resumos_avaliacoes(array[place_id],true)->'resumos'->0;
 if data->>'classificacao'<>'safe' then raise exception 'Pending new review replaced an approved contribution';end if;
 perform set_config('request.jwt.claim.sub',current_setting('elas.qa_admin'),true);
 perform public.moderar('avaliacao',newer_id::text,'aprovada','Validação temporária de QA','pendente');
 perform set_config('request.jwt.claim.sub',current_setting('elas.qa_other'),true);
 if exists(select 1 from public.avaliacoes where id in (original_id,newer_id)) then raise exception 'Private review leaked to another account';end if;
 data:=public.resumos_avaliacoes(array[place_id],true)->'resumos'->0;
 if data->>'classificacao'<>'attention' or (data->>'total')::integer<>1 then raise exception 'Latest approved contribution or one-account weighting failed';end if;
 perform set_config('request.jwt.claim.sub',current_setting('elas.qa_admin'),true);
 perform public.moderar('avaliacao',newer_id::text,'rejeitada','Validação temporária de QA','aprovada');
 perform set_config('request.jwt.claim.sub',current_setting('elas.qa_user'),true);
 data:=public.resumos_avaliacoes(array[place_id],true)->'resumos'->0;
 if data->>'classificacao'<>'safe' then raise exception 'Rejecting newer contribution did not restore previous approved one';end if;
 delete from public.avaliacoes where id=original_id;
 data:=public.resumos_avaliacoes(array[place_id],true)->'resumos'->0;
 if data->>'classificacao'<>'unknown' then raise exception 'Withdrawal did not return to insufficient reviews';end if;

 perform public.enviar_registro('relato',report_id,jsonb_build_object('categoria','Iluminação','descricao','Validação temporária do fluxo de relato','local_texto','Local temporário','lugar_id',place_id));
 if public.detalhes_registro('relato',report_id)->>'status'<>'pendente' then raise exception 'New report did not await moderation';end if;
 perform set_config('request.jwt.claim.sub',current_setting('elas.qa_other'),true);
 if public.detalhes_registro('relato',report_id) is not null then raise exception 'Private pending report leaked';end if;
 perform set_config('request.jwt.claim.sub',current_setting('elas.qa_admin'),true);
 perform public.moderar('relato',report_id::text,'verificado','Validação temporária de QA','pendente');
 event_id:=public.publicar_evento('Evento temporário de auditoria','Registro transitório, revertido ao final','Local temporário',now()+interval '7 days');
 poll_id:=public.publicar_enquete('Enquete temporária de auditoria',array['Opção A','Opção B'],now()+interval '7 days');
 perform set_config('request.jwt.claim.sub',current_setting('elas.qa_other'),true);
 if public.detalhes_registro('relato',report_id)->>'status'<>'verificado' then raise exception 'Verified report is not visible';end if;
 if not exists(select 1 from jsonb_array_elements(public.pagina_app('eventos',null,'{}'::jsonb)->'rows') e where e->>'id'=event_id::text) then raise exception 'Published event is missing for common account';end if;
 perform public.inscrever(event_id,true);
 select e into data from jsonb_array_elements(public.pagina_app('enquetes',null,'{}'::jsonb)->'rows') e where e->>'id'=poll_id::text;
 if data is null or data->>'resultados_visiveis'<>'false' then raise exception 'Poll exposed results before vote';end if;
 option_id:=(data->'opcoes'->0->>'id')::uuid;
 perform public.votar(poll_id,option_id);
 select e into data from jsonb_array_elements(public.pagina_app('enquetes',null,'{}'::jsonb)->'rows') e where e->>'id'=poll_id::text;
 if data->>'resultados_visiveis'<>'true' or data->>'minha_opcao'<>option_id::text then raise exception 'Vote did not reveal results and confirmation';end if;
 execute 'reset role';
end
$audit$;
rollback;
select 'PASSED: live SQL with simulated authenticated roles; admin restrictions, append-only reviews, dynamic classification, private/public reports, event publication/registration and poll voting; every fixture rolled back' as verification;
