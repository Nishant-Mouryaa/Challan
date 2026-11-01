begin;

create or replace function public.get_mis_export_rows(
  p_workspace_id uuid,
  p_client_id uuid,
  p_from date,
  p_to date
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
      s.consignment_no,
      s.sender_name,
      s.recipient_name,
      s.recipient_address,
      s.destination_city,
      s.destination_pincode,
      s.current_status,
      s.delivered_at,
      s.needs_review,
      s.review_reason
    from public.mis_shipments s
    where s.workspace_id = p_workspace_id
      and s.client_id = p_client_id
      and s.booking_date >= p_from
      and s.booking_date <= p_to
      and s.parent_consignment_no is null
    order by
      s.booking_date desc,
      s.consignment_no,
      s.id
    limit 10001
  ) export_row;
$$
;

revoke all on function public.get_mis_export_rows(
  uuid, uuid, date, date
) from public, anon, authenticated;

grant execute on function public.get_mis_export_rows(
  uuid, uuid, date, date
) to service_role;

commit;