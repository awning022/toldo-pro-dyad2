-- Owner-only operational telemetry for Toldo Pro.
-- Apply this migration in the Supabase SQL Editor before using /proprietario.
create table if not exists public.owner_telemetry (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid null references public.companies(id) on delete set null,
  event_type text not null check (event_type in ('session_start','heartbeat','session_end','route_view','client_error')),
  route text null,
  duration_ms integer null check (duration_ms is null or duration_ms between 0 and 600000),
  created_at timestamptz not null default now()
);

create index if not exists owner_telemetry_created_at_idx on public.owner_telemetry(created_at desc);
create index if not exists owner_telemetry_user_created_idx on public.owner_telemetry(user_id, created_at desc);
alter table public.owner_telemetry enable row level security;

drop policy if exists "Users can insert own telemetry" on public.owner_telemetry;
create policy "Users can insert own telemetry"
  on public.owner_telemetry for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Only owner can read telemetry" on public.owner_telemetry;
create policy "Only owner can read telemetry"
  on public.owner_telemetry for select to authenticated
  using (lower(coalesce(auth.jwt() ->> 'email','')) = 'awningbrasil@gmail.com');

drop policy if exists "Only owner can delete telemetry" on public.owner_telemetry;
create policy "Only owner can delete telemetry"
  on public.owner_telemetry for delete to authenticated
  using (lower(coalesce(auth.jwt() ->> 'email','')) = 'awningbrasil@gmail.com');

revoke all on public.owner_telemetry from anon;
grant select, insert, delete on public.owner_telemetry to authenticated;
grant usage, select on sequence public.owner_telemetry_id_seq to authenticated;
