create table if not exists public.workspace_subscriptions (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  plan_code text not null check (plan_code in ('starter', 'business', 'enterprise')),
  status text not null check (
    status in (
      'trialing',
      'created',
      'authenticated',
      'active',
      'pending',
      'halted',
      'paused',
      'cancelled',
      'completed',
      'expired'
    )
  ),
  trial_started_at timestamptz not null,
  trial_ends_at timestamptz not null,
  razorpay_plan_id text,
  razorpay_subscription_id text unique,
  current_period_start timestamptz,
  current_period_end timestamptz,
  last_webhook_created_at bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.razorpay_webhook_events (
  event_id text primary key,
  created_at bigint not null,
  received_at timestamptz not null default now()
);

create index if not exists workspace_subscriptions_status_idx
  on public.workspace_subscriptions (status, trial_ends_at);

create or replace function public.create_workspace_trial()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.workspace_subscriptions (
    workspace_id,
    plan_code,
    status,
    trial_started_at,
    trial_ends_at
  )
  values (
    new.workspace_id,
    'starter',
    'trialing',
    now(),
    now() + interval '7 days'
  )
  on conflict (workspace_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_workspace_membership_created_trial
  on public.workspace_memberships;
create trigger on_workspace_membership_created_trial
  after insert on public.workspace_memberships
  for each row execute function public.create_workspace_trial();

insert into public.workspace_subscriptions (
  workspace_id,
  plan_code,
  status,
  trial_started_at,
  trial_ends_at
)
select
  membership.workspace_id,
  'starter',
  'trialing',
  now(),
  now() + interval '7 days'
from public.workspace_memberships as membership
on conflict (workspace_id) do nothing;

create or replace function public.create_workspace_document(
  target_workspace_id uuid,
  target_kind text,
  target_document_number text,
  target_document_date text,
  target_party_name text,
  target_payload jsonb
)
returns public.documents
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  subscription public.workspace_subscriptions%rowtype;
  document_limit integer;
  billing_period_start timestamptz;
  documents_used bigint;
  created_document public.documents%rowtype;
begin
  select *
    into subscription
    from public.workspace_subscriptions
    where workspace_id = target_workspace_id
    for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'SUBSCRIPTION_REQUIRED';
  end if;

  if subscription.status = 'trialing' then
    if now() >= subscription.trial_ends_at then
      raise exception using errcode = 'P0001', message = 'SUBSCRIPTION_REQUIRED';
    end if;
  elsif subscription.status <> 'active' then
    raise exception using errcode = 'P0001', message = 'SUBSCRIPTION_REQUIRED';
  end if;

  document_limit := case subscription.plan_code
    when 'starter' then 100
    when 'business' then 500
    when 'enterprise' then 0
  end;

  billing_period_start := coalesce(
    subscription.current_period_start,
    subscription.trial_started_at
  );

  select count(*)
    into documents_used
    from public.documents
    where workspace_id = target_workspace_id
      and created_at >= billing_period_start;

  if document_limit > 0 and documents_used >= document_limit then
    raise exception using errcode = 'P0001', message = 'DOCUMENT_LIMIT_REACHED';
  end if;

  insert into public.documents (
    workspace_id,
    kind,
    document_number,
    document_date,
    party_name,
    payload
  )
  values (
    target_workspace_id,
    target_kind,
    target_document_number,
    target_document_date,
    target_party_name,
    target_payload
  )
  returning * into created_document;

  return created_document;
end;
$$;

create or replace function public.apply_razorpay_subscription_event(
  target_event_id text,
  target_subscription_id text,
  target_status text,
  target_event_created_at bigint,
  target_period_start bigint,
  target_period_end bigint
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  saved_subscription public.workspace_subscriptions%rowtype;
begin
  insert into public.razorpay_webhook_events (event_id, created_at)
  values (target_event_id, target_event_created_at)
  on conflict (event_id) do nothing;

  if not found then
    return false;
  end if;

  select *
    into saved_subscription
    from public.workspace_subscriptions
    where razorpay_subscription_id = target_subscription_id
    for update;

  if not found then
    raise exception 'Subscription not found for Razorpay event';
  end if;

  if saved_subscription.last_webhook_created_at is null
    or target_event_created_at >= saved_subscription.last_webhook_created_at then
    update public.workspace_subscriptions
      set status = case
            when target_status = 'authenticated'
              and saved_subscription.status = 'trialing'
              and now() < saved_subscription.trial_ends_at
              then 'trialing'
            else target_status
          end,
          current_period_start = case
            when target_period_start is not null and target_period_start > 0
              then to_timestamp(target_period_start)
            else current_period_start
          end,
          current_period_end = case
            when target_period_end is not null and target_period_end > 0
              then to_timestamp(target_period_end)
            else current_period_end
          end,
          last_webhook_created_at = target_event_created_at,
          updated_at = now()
      where workspace_id = saved_subscription.workspace_id;
  end if;

  return true;
end;
$$;

alter table public.workspace_subscriptions enable row level security;
alter table public.razorpay_webhook_events enable row level security;

revoke all on public.workspace_subscriptions, public.razorpay_webhook_events
  from anon, authenticated;
revoke all on function public.create_workspace_trial()
  from public, anon, authenticated;
revoke all on function public.create_workspace_document(uuid, text, text, text, text, jsonb)
  from public, anon, authenticated;
revoke all on function public.apply_razorpay_subscription_event(text, text, text, bigint, bigint, bigint)
  from public, anon, authenticated;
grant execute on function public.create_workspace_document(uuid, text, text, text, text, jsonb)
  to service_role;
grant execute on function public.apply_razorpay_subscription_event(text, text, text, bigint, bigint, bigint)
  to service_role;
