begin;

create or replace function public.import_mis_csv(
  p_workspace_id uuid,
  p_source text,
  p_file_name text,
  p_file_hash text,
  p_rows jsonb,
  p_invalid_count integer,
  p_preview boolean
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as 
$$
declare
  v_row jsonb;
  v_patch jsonb;

  v_current public.mis_shipments%rowtype;
  v_next public.mis_shipments%rowtype;

  v_found boolean;

  v_client_id uuid;
  v_batch_id uuid;

  v_action text;
  v_reason text;

  v_event_at timestamptz;
  v_fingerprint text;

  v_inserted integer := 0;
  v_updated integer := 0;
  v_unchanged integer := 0;
  v_older integer := 0;
  v_conflicts integer := 0;
  v_unmatched integer := 0;

  v_details jsonb := '[]'::jsonb;
  v_missing_clients jsonb := '[]'::jsonb;

  v_row_count integer;
begin
  if p_workspace_id is null then
    raise exception 'Workspace is required';
  end if;

  if p_source not in ('pudo', 'workspace') then
    raise exception 'Unsupported import source';
  end if;

  if jsonb_typeof(p_rows) <> 'array' then
    raise exception 'Rows must be an array';
  end if;

  v_row_count := jsonb_array_length(p_rows);

  if v_row_count > 1000 then
    raise exception 'Maximum 1000 normalized rows per import';
  end if;

  if coalesce(p_invalid_count, 0) < 0 then
    raise exception 'Invalid row count';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('mis-import:' || p_workspace_id::text, 0)
  );

  if not p_preview then
    insert into public.mis_import_batches (
      workspace_id,
      source_type,
      file_name,
      file_sha256,
      parser_version,
      status,
      row_count,
      invalid_count
    )
    values (
      p_workspace_id,
      p_source,
      p_file_name,
      p_file_hash,
      1,
      'processing',
      v_row_count + coalesce(p_invalid_count, 0),
      coalesce(p_invalid_count, 0)
    )
    returning id into v_batch_id;
  end if;

  for v_row in
    select value from jsonb_array_elements(p_rows)
  loop
    v_action := null;
    v_reason := null;
    v_client_id := null;

    select *
    into v_current
    from public.mis_shipments
    where workspace_id = p_workspace_id
      and carrier = 'DTDC'
      and consignment_no = v_row->>'consignment_no'
    for update;

    v_found := found;

    if p_source = 'pudo' then
      select a.client_id
      into v_client_id
      from public.mis_client_aliases a
      where a.workspace_id = p_workspace_id
        and a.normalized_source_name =
          v_row->>'normalized_customer_name';

      if v_client_id is null then
        v_unmatched := v_unmatched + 1;

        if v_row ? 'source_customer_name'
          and not (
            v_missing_clients @>
            jsonb_build_array(v_row->>'source_customer_name')
          )
        then
          v_missing_clients :=
            v_missing_clients ||
            jsonb_build_array(v_row->>'source_customer_name');
        end if;
      end if;

      -- Whitelist the booking fields this importer may change.
      select coalesce(jsonb_object_agg(key, value), '{}'::jsonb)
      into v_patch
      from jsonb_each(v_row)
      where key = any(array[
        'booking_reference',
        'source_customer_name',
        'normalized_customer_name',
        'sender_name',
        'recipient_name',
        'recipient_address',
        'booking_date',
        'booking_at',
        'shipment_type',
        'pudo_service_type',
        'booking_weight_kg',
        'booking_fingerprint'
      ])
      and value <> 'null'::jsonb;

      if v_client_id is not null then
        v_patch := v_patch ||
          jsonb_build_object('client_id', v_client_id);
      end if;

      -- Do not silently move a shipment between mapped clients.
      if v_found
        and v_current.client_id is not null
        and v_client_id is not null
        and v_current.client_id <> v_client_id
      then
        v_action := 'conflict';
        v_reason := 'The incoming booking maps to another client.';
      end if;

    else
      select coalesce(jsonb_object_agg(key, value), '{}'::jsonb)
      into v_patch
      from jsonb_each(v_row)
      where key = any(array[
        'parent_consignment_no',
        'workspace_booking_date',
        'destination_city',
        'destination_state',
        'destination_pincode',
        'transport_mode',
        'workspace_service_type',
        'tracking_weight_kg',
        'pieces',
        'status_code',
        'status_description',
        'milestone',
        'current_status',
        'tracking_event_at',
        'delivered_at',
        'expected_delivery_date',
        'revised_expected_delivery_date',
        'received_by',
        'failed_reason',
        'delivery_remarks',
        'pod_url',
        'drs_url',
        'tracking_fingerprint'
      ])
      and value <> 'null'::jsonb;

      v_event_at := (v_row->>'tracking_event_at')::timestamptz;

      if v_found and v_current.tracking_event_at is not null then
        if v_event_at < v_current.tracking_event_at then
          v_action := 'older';
          v_reason := 'An older tracking event was ignored.';

        elsif v_event_at = v_current.tracking_event_at then
          if v_current.tracking_fingerprint =
             v_row->>'tracking_fingerprint'
          then
            v_action := 'unchanged';
          else
            v_action := 'conflict';
            v_reason :=
              'Different tracking details have the same event timestamp.';
          end if;
        end if;
      end if;

      -- A Delivered reversal requires human review.
      if v_action is null
        and v_found
        and v_current.current_status = 'Delivered'
        and v_row->>'current_status' <> 'Delivered'
      then
        v_action := 'conflict';
        v_reason :=
          'A delivered shipment received a non-delivered status.';
      end if;
    end if;

    if v_action is null then
      if not v_found then
        v_action := 'inserted';
      else
        -- Compare only fields actually supplied by this upload.
        if exists (
          select 1
          from jsonb_each(v_patch) p
          where
            (to_jsonb(v_current)->p.key)
            is distinct from p.value
        ) then
          v_action := 'updated';
        else
          v_action := 'unchanged';
        end if;
      end if;
    end if;

    if v_action = 'inserted' then
      v_inserted := v_inserted + 1;

    elsif v_action = 'updated' then
      v_updated := v_updated + 1;

    elsif v_action = 'unchanged' then
      v_unchanged := v_unchanged + 1;

    elsif v_action = 'older' then
      v_older := v_older + 1;

    elsif v_action = 'conflict' then
      v_conflicts := v_conflicts + 1;
    end if;

    if jsonb_array_length(v_details) < 100 then
      v_details := v_details || jsonb_build_array(
        jsonb_build_object(
          'consignmentNo', v_row->>'consignment_no',
          'action', v_action,
          'reason', v_reason
        )
      );
    end if;

    if p_preview then
      continue;
    end if;

    if v_action = 'conflict' then
      if v_found then
        update public.mis_shipments
        set
          needs_review = true,
          review_reason = v_reason,
          updated_at = now()
        where workspace_id = p_workspace_id
          and id = v_current.id;
      end if;

      continue;
    end if;

    if v_action in ('older', 'unchanged') then
      continue;
    end if;

    if p_source = 'pudo' then
      v_patch := v_patch || jsonb_build_object(
        'last_pudo_import_id', v_batch_id
      );
    else
      v_patch := v_patch || jsonb_build_object(
        'last_workspace_import_id', v_batch_id
      );
    end if;

    if not v_found then
      v_patch := v_patch || jsonb_build_object(
        'id', gen_random_uuid(),
        'workspace_id', p_workspace_id,
        'carrier', 'DTDC',
        'consignment_no', v_row->>'consignment_no',
        'current_status',
          coalesce(v_patch->>'current_status', 'Tracking unavailable'),
        'needs_review', false,
        'retention_hold', false,
        'version', 1,
        'created_at', now(),
        'updated_at', now()
      );

      v_next := jsonb_populate_record(
        null::public.mis_shipments,
        v_patch
      );

      insert into public.mis_shipments
      select (v_next).*
      returning * into v_next;

    else
      v_next := jsonb_populate_record(
        v_current,
        v_patch || jsonb_build_object(
          'version', v_current.version + 1,
          'updated_at', now()
        )
      );

      update public.mis_shipments
      set
        booking_reference = v_next.booking_reference,
        client_id = v_next.client_id,
        source_customer_name = v_next.source_customer_name,
        normalized_customer_name = v_next.normalized_customer_name,
        sender_name = v_next.sender_name,
        recipient_name = v_next.recipient_name,
        recipient_address = v_next.recipient_address,
        booking_date = v_next.booking_date,
        booking_at = v_next.booking_at,
        workspace_booking_date = v_next.workspace_booking_date,
        parent_consignment_no = v_next.parent_consignment_no,
        destination_city = v_next.destination_city,
        destination_state = v_next.destination_state,
        destination_pincode = v_next.destination_pincode,
        shipment_type = v_next.shipment_type,
        transport_mode = v_next.transport_mode,
        pudo_service_type = v_next.pudo_service_type,
        workspace_service_type = v_next.workspace_service_type,
        booking_weight_kg = v_next.booking_weight_kg,
        tracking_weight_kg = v_next.tracking_weight_kg,
        pieces = v_next.pieces,
        status_code = v_next.status_code,
        status_description = v_next.status_description,
        milestone = v_next.milestone,
        current_status = v_next.current_status,
        tracking_event_at = v_next.tracking_event_at,
        delivered_at = v_next.delivered_at,
        expected_delivery_date = v_next.expected_delivery_date,
        revised_expected_delivery_date = v_next.revised_expected_delivery_date,
        received_by = v_next.received_by,
        failed_reason = v_next.failed_reason,
        delivery_remarks = v_next.delivery_remarks,
        pod_url = v_next.pod_url,
        drs_url = v_next.drs_url,
        last_pudo_import_id = v_next.last_pudo_import_id,
        last_workspace_import_id = v_next.last_workspace_import_id,
        booking_fingerprint = v_next.booking_fingerprint,
        tracking_fingerprint = v_next.tracking_fingerprint,
        version = v_next.version,
        updated_at = v_next.updated_at
      where workspace_id = p_workspace_id
        and id = v_current.id;
    end if;

    if p_source = 'workspace' then
      v_fingerprint := v_row->>'tracking_fingerprint';

      insert into public.mis_shipment_changes (
        workspace_id,
        shipment_id,
        import_batch_id,
        old_status,
        new_status,
        old_status_code,
        new_status_code,
        old_event_at,
        new_event_at,
        observation_fingerprint,
        change_details
      )
      values (
        p_workspace_id,
        v_next.id,
        v_batch_id,
        case when v_found then v_current.current_status else null end,
        v_next.current_status,
        case when v_found then v_current.status_code else null end,
        v_next.status_code,
        case when v_found then v_current.tracking_event_at else null end,
        v_next.tracking_event_at,
        v_fingerprint,
        jsonb_build_object(
          'description', v_next.status_description,
          'milestone', v_next.milestone
        )
      )
      on conflict (
        workspace_id,
        shipment_id,
        observation_fingerprint
      ) do nothing;
    end if;
  end loop;

  if not p_preview then
    update public.mis_import_batches
    set
      status = case
        when v_conflicts > 0 or coalesce(p_invalid_count, 0) > 0
          then 'completed_with_issues'
        else 'completed'
      end,
      inserted_count = v_inserted,
      updated_count = v_updated,
      unchanged_count = v_unchanged,
      older_count = v_older,
      conflict_count = v_conflicts,
      unmatched_count = v_unmatched,
      completed_at = now()
    where workspace_id = p_workspace_id
      and id = v_batch_id;
  end if;

  return jsonb_build_object(
    'preview', p_preview,
    'batchId', v_batch_id,
    'counts', jsonb_build_object(
      'inserted', v_inserted,
      'updated', v_updated,
      'unchanged', v_unchanged,
      'older', v_older,
      'conflicts', v_conflicts,
      'invalid', coalesce(p_invalid_count, 0),
      'unmappedClients', v_unmatched
    ),
    'missingClients', v_missing_clients,
    'details', v_details
  );
end;
$$
;

revoke all on function public.import_mis_csv(
  uuid, text, text, text, jsonb, integer, boolean
) from public, anon, authenticated;

grant execute on function public.import_mis_csv(
  uuid, text, text, text, jsonb, integer, boolean
) to service_role;

commit;