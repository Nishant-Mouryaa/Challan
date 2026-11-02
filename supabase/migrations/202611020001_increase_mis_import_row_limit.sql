do $migration$
declare
  function_definition text;
begin
  function_definition := pg_get_functiondef(
    'public.import_mis_csv(uuid,text,text,text,jsonb,integer,boolean)'::regprocedure
  );

  if position('v_row_count > 1000' in function_definition) = 0
    or position(
      'Maximum 1000 normalized rows per import'
      in function_definition
    ) = 0
  then
    raise exception
      'The MIS import function does not have the expected 1000-row limit.';
  end if;

  function_definition := replace(
    function_definition,
    'v_row_count > 1000',
    'v_row_count > 3000'
  );
  function_definition := replace(
    function_definition,
    'Maximum 1000 normalized rows per import',
    'Maximum 3000 normalized rows per import'
  );

  execute function_definition;
end;
$migration$;
