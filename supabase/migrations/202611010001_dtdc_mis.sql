begin;

/* =========================================================
   CLIENTS

   These are your reporting accounts:
   Janvi Fedbank, Fedbank Direct, Unique Air Express, etc.
   ========================================================= */

create table public.mis_clients (
  id uuid primary key default gen_random_uuid(),

  workspace_id uuid not null,

  name text not null,
  normalized_name text not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint mis_clients_name_not_empty
    check (length(btrim(name)) between 1 and 160),

  constraint mis_clients_normalized_name_not_empty
    check (length(btrim(normalized_name)) between 1 and 160),

  constraint mis_clients_workspace_name_unique
    unique (workspace_id, normalized_name),

  constraint mis_clients_workspace_id_unique
    unique (workspace_id, id)
);


/* =========================================================
   CUSTOMER-NAME ALIASES

   Example:
   "JANVI - FEDBANK FINANCIAL SERVICES PVT LTD"
                      -> Janvi Fedbank

   One imported customer name maps to one client per workspace.
   ========================================================= */

create table public.mis_client_aliases (
  id uuid primary key default gen_random_uuid(),

  workspace_id uuid not null,
  client_id uuid not null,

  source_name text not null,
  normalized_source_name text not null,

  created_at timestamptz not null default now(),

  constraint mis_alias_source_not_empty
    check (length(btrim(source_name)) between 1 and 300),

  constraint mis_alias_normalized_source_not_empty
    check (
      length(btrim(normalized_source_name)) between 1 and 300
    ),

  constraint mis_alias_workspace_source_unique
    unique (workspace_id, normalized_source_name),

  constraint mis_alias_client_same_workspace
    foreign key (workspace_id, client_id)
    references public.mis_clients (workspace_id, id)
    on delete restrict
);

create index mis_aliases_client_idx
  on public.mis_client_aliases (workspace_id, client_id);


/* =========================================================
   IMPORT BATCHES

   Stores import metadata, not the original uploaded file.

   Actual import processing will be added in the next part.
   ========================================================= */

create table public.mis_import_batches (
  id uuid primary key default gen_random_uuid(),

  workspace_id uuid not null,

  source_type text not null
    check (source_type in ('pudo', 'workspace')),

  file_name text not null,
  file_sha256 text not null,

  parser_version integer not null default 1,

  status text not null default 'processing'
    check (
      status in (
        'processing',
        'completed',
        'completed_with_issues',
        'failed'
      )
    ),

  row_count integer not null default 0,
  inserted_count integer not null default 0,
  updated_count integer not null default 0,
  unchanged_count integer not null default 0,
  older_count integer not null default 0,
  conflict_count integer not null default 0,
  invalid_count integer not null default 0,
  unmatched_count integer not null default 0,

  error_message text,

  created_at timestamptz not null default now(),
  completed_at timestamptz,

  constraint mis_imports_workspace_id_unique
    unique (workspace_id, id),

  constraint mis_imports_counts_nonnegative
    check (
      row_count >= 0
      and inserted_count >= 0
      and updated_count >= 0
      and unchanged_count >= 0
      and older_count >= 0
      and conflict_count >= 0
      and invalid_count >= 0
      and unmatched_count >= 0
    )
);

create index mis_imports_workspace_created_idx
  on public.mis_import_batches (
    workspace_id,
    created_at desc
  );

create index mis_imports_file_lookup_idx
  on public.mis_import_batches (
    workspace_id,
    source_type,
    file_sha256,
    parser_version
  );


/* =========================================================
   CURRENT SHIPMENTS

   One current record per:
   workspace + carrier + consignment number

   client_id can be null while customer mapping is unresolved.
   ========================================================= */

create table public.mis_shipments (
  id uuid primary key default gen_random_uuid(),

  workspace_id uuid not null,

  carrier text not null default 'DTDC'
    check (carrier = 'DTDC'),

  consignment_no text not null,
  parent_consignment_no text,

  booking_reference text,

  client_id uuid,

  -- Original PUDO customer name, retained for mapping.
  source_customer_name text,
  normalized_customer_name text,

  sender_name text,

  recipient_name text,
  recipient_address text,

  -- PUDO booking details.
  booking_date date,
  booking_at timestamptz,

  -- Kept separately because Workspace can report another date.
  workspace_booking_date date,

  destination_city text,
  destination_state text,
  destination_pincode text,

  shipment_type text,
  transport_mode text,

  pudo_service_type text,
  workspace_service_type text,

  booking_weight_kg numeric(14, 4),
  tracking_weight_kg numeric(14, 4),

  pieces integer,

  -- The original carrier status information.
  status_code text,
  status_description text,
  milestone text,

  -- Client-facing normalized category.
  current_status text not null default 'Tracking unavailable',

  tracking_event_at timestamptz,
  delivered_at timestamptz,

  expected_delivery_date date,
  revised_expected_delivery_date date,

  received_by text,
  failed_reason text,
  delivery_remarks text,

  pod_url text,
  drs_url text,

  -- Review and retention controls.
  needs_review boolean not null default false,
  review_reason text,

  -- Only explicitly closed records will be eligible for
  -- eventual retention cleanup.
  closed_at timestamptz,
  retention_hold boolean not null default false,

  last_pudo_import_id uuid,
  last_workspace_import_id uuid,

  -- Used to identify meaningful changes.
  booking_fingerprint text,
  tracking_fingerprint text,

  -- Reserved for safe concurrent import processing.
  version bigint not null default 1,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint mis_shipments_cn_not_empty
    check (
      length(btrim(consignment_no)) between 1 and 80
    ),

  constraint mis_shipments_unique_consignment
    unique (workspace_id, carrier, consignment_no),

  constraint mis_shipments_workspace_id_unique
    unique (workspace_id, id),

  constraint mis_shipments_no_self_parent
    check (
      parent_consignment_no is null
      or parent_consignment_no <> consignment_no
    ),

  constraint mis_shipments_nonnegative_weights
    check (
      (booking_weight_kg is null or booking_weight_kg >= 0)
      and
      (tracking_weight_kg is null or tracking_weight_kg >= 0)
    ),

  constraint mis_shipments_nonnegative_pieces
    check (pieces is null or pieces >= 0),

  constraint mis_shipments_positive_version
    check (version > 0),

  constraint mis_shipments_client_same_workspace
    foreign key (workspace_id, client_id)
    references public.mis_clients (workspace_id, id)
    on delete restrict,

  constraint mis_shipments_pudo_import_same_workspace
    foreign key (workspace_id, last_pudo_import_id)
    references public.mis_import_batches (workspace_id, id)
    on delete restrict,

  constraint mis_shipments_tracking_import_same_workspace
    foreign key (workspace_id, last_workspace_import_id)
    references public.mis_import_batches (workspace_id, id)
    on delete restrict
);

create index mis_shipments_client_booking_idx
  on public.mis_shipments (
    workspace_id,
    client_id,
    booking_date desc,
    id
  );

create index mis_shipments_status_idx
  on public.mis_shipments (
    workspace_id,
    current_status
  );

create index mis_shipments_unmapped_customer_idx
  on public.mis_shipments (
    workspace_id,
    normalized_customer_name
  )
  where client_id is null;

create index mis_shipments_parent_idx
  on public.mis_shipments (
    workspace_id,
    parent_consignment_no
  )
  where parent_consignment_no is not null;


/* =========================================================
   MEANINGFUL TRACKING CHANGES

   No complete daily snapshots.
   Fingerprint prevents storing the same observation repeatedly.
   ========================================================= */

create table public.mis_shipment_changes (
  id uuid primary key default gen_random_uuid(),

  workspace_id uuid not null,
  shipment_id uuid not null,

  import_batch_id uuid,

  old_status text,
  new_status text not null,

  old_status_code text,
  new_status_code text,

  old_event_at timestamptz,
  new_event_at timestamptz,

  observation_fingerprint text not null,

  change_details jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint mis_changes_shipment_same_workspace
    foreign key (workspace_id, shipment_id)
    references public.mis_shipments (workspace_id, id)
    on delete cascade,

  constraint mis_changes_import_same_workspace
    foreign key (workspace_id, import_batch_id)
    references public.mis_import_batches (workspace_id, id)
    on delete restrict,

  constraint mis_changes_unique_observation
    unique (
      workspace_id,
      shipment_id,
      observation_fingerprint
    )
);

create index mis_changes_shipment_created_idx
  on public.mis_shipment_changes (
    workspace_id,
    shipment_id,
    created_at desc
  );


/* =========================================================
   SECURITY

   Access only through authenticated Next.js API routes.
   No browser policies are intentionally created here.
   ========================================================= */

alter table public.mis_clients enable row level security;
alter table public.mis_client_aliases enable row level security;
alter table public.mis_import_batches enable row level security;
alter table public.mis_shipments enable row level security;
alter table public.mis_shipment_changes enable row level security;

revoke all privileges on table
  public.mis_clients,
  public.mis_client_aliases,
  public.mis_import_batches,
  public.mis_shipments,
  public.mis_shipment_changes
from public, anon, authenticated;

grant select, insert, update, delete on table
  public.mis_clients,
  public.mis_client_aliases,
  public.mis_import_batches,
  public.mis_shipments,
  public.mis_shipment_changes
to service_role;

commit;