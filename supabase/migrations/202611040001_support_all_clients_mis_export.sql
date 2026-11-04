begin;

create or replace function public.get_mis_export_rows(
  p_workspace_id uuid,
  p_client_id uuid,
  p_from date,
  p_to date,
  p_search text
)
returns jsonb
language sql
stable
security invoker
set search_path = public, pg_temp
as
$$
select coalesce(
    jsonb_agg(
      to_jsonb(export_row)
      order by
        export_row.booking_date desc,
        export_row.consignment_no,
        export_row.id
    ),
    '[]'::jsonb
  )
  from (
    select
      s.id,
      s.booking_date,
      s.booking_at,
      s.consignment_no,
      s.booking_reference,
      s.sender_name,
      c.name as client_name,
      s.recipient_name,
      s.recipient_address,
      s.destination_city,
      s.destination_state,
      s.destination_pincode,
      s.current_status,
      s.status_code,
      s.status_description,
      s.milestone,
      s.received_by,
      s.delivered_at,
      s.expected_delivery_date,
      s.revised_expected_delivery_date,
      s.failed_reason,
      s.delivery_remarks,
      s.pieces,
      s.shipment_type,
      s.transport_mode,
      s.pudo_service_type,
      s.workspace_service_type,
      s.booking_weight_kg,
      s.tracking_weight_kg,
      s.needs_review,
      s.review_reason
    from public.mis_shipments s
    left join public.mis_clients c
      on c.workspace_id = s.workspace_id
      and c.id = s.client_id
    where s.workspace_id = p_workspace_id
      and (
        p_client_id is null
        or s.client_id = p_client_id
      )
      and s.booking_date >= p_from
      and s.booking_date <= p_to
      and s.parent_consignment_no is null
      and (
        nullif(btrim(p_search), '') is null
        or position(
          lower(btrim(p_search)) in lower(s.consignment_no)
        ) > 0
      )
    order by
      s.booking_date desc,
      s.consignment_no,
      s.id
    limit 10001
  ) export_row;
$$;

revoke all on function public.get_mis_export_rows(
  uuid, uuid, date, date, text
) from public, anon, authenticated;

grant execute on function public.get_mis_export_rows(
  uuid, uuid, date, date, text
) to service_role;

commit;
