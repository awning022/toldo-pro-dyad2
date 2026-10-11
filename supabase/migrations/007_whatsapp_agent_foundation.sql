-- WhatsApp Cloud API foundation for the multi-company Toldo Pro assistant.
-- Each Meta phone_number_id is bound to exactly one company. Never trust company IDs from inbound messages.
create table if not exists public.whatsapp_connections (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  phone_number_id text not null unique,
  display_phone_number text,
  waba_id text,
  status text not null default 'pending' check (status in ('pending','connected','paused','error')),
  connected_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id)
);

create table if not exists public.whatsapp_message_events (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.whatsapp_connections(id) on delete cascade,
  provider_message_id text not null unique,
  sender_phone text not null,
  message_type text not null default 'text',
  message_text text,
  processing_status text not null default 'received' check (processing_status in ('received','processed','ignored','error')),
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

alter table public.whatsapp_connections enable row level security;
alter table public.whatsapp_message_events enable row level security;

-- Members may read their own company's connection; only admins/managers may change it.
drop policy if exists "company members can view whatsapp connection" on public.whatsapp_connections;
create policy "company members can view whatsapp connection"
  on public.whatsapp_connections for select to authenticated
  using (company_id = public.my_company_id());

drop policy if exists "company admins manage whatsapp connection" on public.whatsapp_connections;
create policy "company admins manage whatsapp connection"
  on public.whatsapp_connections for all to authenticated
  using (
    company_id = public.my_company_id()
    and (public.has_company_permission('manageCompanySettings') or public.has_company_permission('manageIntegrations'))
  )
  with check (
    company_id = public.my_company_id()
    and (public.has_company_permission('manageCompanySettings') or public.has_company_permission('manageIntegrations'))
  );

drop policy if exists "company members view whatsapp events" on public.whatsapp_message_events;
create policy "company members view whatsapp events"
  on public.whatsapp_message_events for select to authenticated
  using (exists (
    select 1 from public.whatsapp_connections c
    where c.id = connection_id and c.company_id = public.my_company_id()
  ));

comment on table public.whatsapp_connections is 'One official WhatsApp Cloud API phone number per Toldo Pro company; inbound routing is based on Meta phone_number_id.';
comment on table public.whatsapp_message_events is 'Deduplicated inbound WhatsApp message audit trail, scoped through whatsapp_connections.';
