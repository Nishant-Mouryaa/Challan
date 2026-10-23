create table if not exists public.documents (
  id text primary key default gen_random_uuid()::text,
  kind text not null check (kind in ('challan', 'international_invoice')),
  document_number text not null,
  document_date text,
  party_name text not null default '',
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists documents_kind_created_at_idx
  on public.documents (kind, created_at desc);

alter table public.documents enable row level security;
revoke all on public.documents from anon, authenticated;
