begin;

create or replace function public.resolve_mis_client_alias(
  p_workspace_id uuid,
  p_source_name text,
  p_normalized_source_name text,
  p_create boolean
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as
$$
declare
  v_client_id uuid;
  v_client_name text;
begin
  if p_workspace_id is null
    or nullif(btrim(p_source_name), '') is null
    or nullif(btrim(p_normalized_source_name), '') is null
  then
    raise exception 'A workspace and PUDO customer name are required.';
  end if;

  if length(p_source_name) > 300
    or length(p_normalized_source_name) > 300
  then
    raise exception
      'PUDO customer names must not exceed 300 characters.';
  end if;

  select a.client_id
  into v_client_id
  from public.mis_client_aliases a
  where a.workspace_id = p_workspace_id
    and a.normalized_source_name = p_normalized_source_name;

  if found then
    return v_client_id;
  end if;

  if not coalesce(p_create, false) then
    return null;
  end if;

  v_client_name := regexp_replace(
    btrim(p_source_name),
    '\s+',
    ' ',
    'g'
  );

  if length(v_client_name) > 160
    or length(p_normalized_source_name) > 160
  then
    raise exception
      'PUDO customer names must not exceed 160 characters to create a reporting client.';
  end if;

  select c.id
  into v_client_id
  from public.mis_clients c
  where c.workspace_id = p_workspace_id
    and c.normalized_name = p_normalized_source_name;

  if not found then
    insert into public.mis_clients (
      workspace_id,
      name,
      normalized_name
    )
    values (
      p_workspace_id,
      v_client_name,
      p_normalized_source_name
    )
    on conflict (workspace_id, normalized_name) do nothing;

    select c.id
    into v_client_id
    from public.mis_clients c
    where c.workspace_id = p_workspace_id
      and c.normalized_name = p_normalized_source_name;
  end if;

  insert into public.mis_client_aliases (
    workspace_id,
    client_id,
    source_name,
    normalized_source_name
  )
  values (
    p_workspace_id,
    v_client_id,
    p_source_name,
    p_normalized_source_name
  )
  on conflict (workspace_id, normalized_source_name) do nothing;

  select a.client_id
  into v_client_id
  from public.mis_client_aliases a
  where a.workspace_id = p_workspace_id
    and a.normalized_source_name = p_normalized_source_name;

  if v_client_id is null then
    raise exception 'The PUDO customer mapping could not be saved.';
  end if;

  return v_client_id;
end;
$$;

revoke all on function public.resolve_mis_client_alias(
  uuid, text, text, boolean
) from public, anon, authenticated;

grant execute on function public.resolve_mis_client_alias(
  uuid, text, text, boolean
) to service_role;

do $migration$
declare
  function_definition text;
  previous_logic text;
  replacement text;
begin
  function_definition := pg_get_functiondef(
    'public.import_mis_csv(uuid,text,text,text,jsonb,integer,boolean)'::regprocedure
  );

  if position('v_row_count > 3000' in function_definition) = 0
    or position(
      'Maximum 3000 normalized rows per import'
      in function_definition
    ) = 0
  then
    raise exception
      'The MIS import function does not have the expected 3000-row limit.';
  end if;

  previous_logic := $previous$
      select a.client_id
      into v_client_id
      from public.mis_client_aliases a
      where a.workspace_id = p_workspace_id
        and a.normalized_source_name =
          v_row->>'normalized_customer_name';
$previous$;

  replacement := $replacement$
      v_client_id := public.resolve_mis_client_alias(
        p_workspace_id,
        v_row->>'source_customer_name',
        v_row->>'normalized_customer_name',
        not p_preview
      );
$replacement$;

  if position(previous_logic in function_definition) = 0 then
    raise exception
      'The expected PUDO client-alias lookup was not found.';
  end if;

  if length(function_definition) -
      length(replace(function_definition, previous_logic, ''))
      <> length(previous_logic)
  then
    raise exception
      'The PUDO client-alias lookup was found an unexpected number of times.';
  end if;

  function_definition := replace(
    function_definition,
    previous_logic,
    replacement
  );

  execute function_definition;
end;
$migration$;

commit;
