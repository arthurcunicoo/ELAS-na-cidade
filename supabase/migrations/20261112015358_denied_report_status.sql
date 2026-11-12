alter table public.relatos
  drop constraint relatos_status_check,
  add constraint relatos_status_check
    check (status in ('pendente','verificado','resolvido','retirado','negado'));

-- Both moderation RPCs use this private implementation. The revision-aware
-- entry point still checks the expected revision before making the decision.
create or replace function private.moderar(
  p_tipo text, p_id text, p_status text, p_motivo text, p_anterior text
) returns void language plpgsql security definer set search_path='' as $$
declare
  v_usuario uuid;
  v_anterior text;
  v_papel text := private.meu_papel();
begin
  /* elas_active_account_guard */
  if not (select private.conta_disponivel()) then
    raise exception 'Conta indisponível' using errcode='42501';
  end if;
  /* elas_active_account_guard_end */
  if auth.uid() is null or v_papel not in ('moderador','admin') then
    raise exception 'Acesso negado' using errcode='42501';
  end if;
  if p_motivo is null or char_length(btrim(p_motivo)) not between 5 and 500 then
    raise exception 'Informe o motivo (5–500 caracteres)';
  end if;

  if p_tipo='relato' and p_status in ('pendente','verificado','resolvido','negado') then
    select usuario_id,status into v_usuario,v_anterior from public.relatos where id=p_id::uuid for update;
  elsif p_tipo='melhoria' and p_status in ('solicitada','em_andamento','concluida') then
    select usuario_id,status into v_usuario,v_anterior from public.solicitacoes_melhoria where id=p_id::uuid for update;
  elsif p_tipo='avaliacao' and v_papel='admin' and p_status in ('pendente','aprovada','rejeitada') then
    select usuario_id,status into v_usuario,v_anterior from public.avaliacoes where id=p_id::uuid for update;
  else
    raise exception 'Operação inválida';
  end if;
  if v_usuario is null then raise exception 'Registro não encontrado'; end if;
  if v_usuario=auth.uid() then
    raise exception 'Você não pode moderar o próprio conteúdo' using errcode='42501';
  end if;
  if p_anterior is null or v_anterior<>p_anterior then
    raise exception 'O registro mudou. Atualize a lista antes de continuar.' using errcode='40001';
  end if;
  if v_anterior='retirado' then
    raise exception 'O autor retirou este registro' using errcode='22023';
  end if;
  if v_anterior=p_status then raise exception 'Escolha um status diferente'; end if;

  if p_tipo='relato' then
    update public.relatos set status=p_status,atualizado_em=now() where id=p_id::uuid;
  elsif p_tipo='melhoria' then
    update public.solicitacoes_melhoria set status=p_status,atualizado_em=now() where id=p_id::uuid;
  else
    update public.avaliacoes set status=p_status where id=p_id::uuid;
  end if;
  insert into public.historico_status(tipo,registro_id,usuario_id,responsavel_id,anterior,novo,motivo)
    values(p_tipo,p_id,v_usuario,auth.uid(),v_anterior,p_status,btrim(p_motivo));
  insert into public.notificacoes(usuario_id,titulo,mensagem,tipo,registro_id)
    values(v_usuario,'Atualização de '||p_tipo,'Novo status: '||p_status||'. Motivo: '||btrim(p_motivo),p_tipo,p_id);
end;
$$;
