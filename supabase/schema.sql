create extension if not exists "pgcrypto";

create type public.member_role as enum ('administrador', 'gerente', 'vendedor', 'orcamentista', 'producao', 'instalador', 'financeiro', 'estoque', 'suporte', 'personalizado');
create type public.record_status as enum ('ativo', 'inativo');
create type public.lead_stage as enum ('novo', 'contato', 'visita', 'medicao', 'orcamento', 'negociacao', 'fechado', 'perdido');
create type public.quote_status as enum ('rascunho', 'enviado', 'visualizado', 'negociacao', 'aprovado', 'recusado', 'expirado');
create type public.production_status as enum ('aguardando', 'producao', 'acabamento', 'pronto', 'enviado_instalacao');
create type public.installation_status as enum ('agendada', 'a_caminho', 'instalando', 'concluida');
create type public.sync_status as enum ('pendente', 'sincronizando', 'sincronizado', 'falhou');

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  cnpj text unique,
  legal_name text not null,
  trade_name text not null,
  logo_url text,
  email text,
  phone text,
  whatsapp text,
  address jsonb not null default '{}'::jsonb,
  fiscal_data jsonb not null default '{}'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  cpf text,
  phone text,
  whatsapp text,
  avatar_url text,
  status public.record_status not null default 'ativo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.company_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.member_role not null default 'vendedor',
  custom_permissions jsonb not null default '{}'::jsonb,
  status public.record_status not null default 'ativo',
  last_access_at timestamptz,
  created_at timestamptz not null default now(),
  unique(company_id, user_id)
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  kind text not null default 'fisica' check (kind in ('fisica', 'juridica')),
  name text not null,
  document text,
  legal_name text,
  phone text,
  whatsapp text,
  email text,
  address jsonb not null default '{}'::jsonb,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  source text not null default 'outros',
  desired_product text,
  location text,
  measurements jsonb not null default '{}'::jsonb,
  estimated_value numeric(12,2) not null default 0,
  responsible_id uuid references public.profiles(id) on delete set null,
  stage public.lead_stage not null default 'novo',
  loss_reason text,
  follow_up_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  lead_id uuid references public.leads(id) on delete set null,
  quote_number bigint generated always as identity,
  product jsonb not null default '{}'::jsonb,
  measurements jsonb not null default '{}'::jsonb,
  pricing jsonb not null default '{}'::jsonb,
  payment_method text,
  valid_until date,
  status public.quote_status not null default 'rascunho',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  category text not null default 'componente',
  unit text not null default 'unidade',
  sku text,
  supplier text,
  cost numeric(12,2) not null default 0,
  current_stock numeric(12,3) not null default 0,
  minimum_stock numeric(12,3) not null default 0,
  maximum_stock numeric(12,3),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.production_orders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  quote_id uuid references public.quotes(id) on delete set null,
  product jsonb not null default '{}'::jsonb,
  materials jsonb not null default '[]'::jsonb,
  responsible_id uuid references public.profiles(id) on delete set null,
  due_date date,
  priority text not null default 'normal',
  status public.production_status not null default 'aguardando',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.installations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  production_order_id uuid references public.production_orders(id) on delete set null,
  address jsonb not null default '{}'::jsonb,
  scheduled_at timestamptz,
  team jsonb not null default '[]'::jsonb,
  materials jsonb not null default '[]'::jsonb,
  tools jsonb not null default '[]'::jsonb,
  observations text,
  media jsonb not null default '[]'::jsonb,
  proof_url text,
  status public.installation_status not null default 'agendada',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sync_operations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  operation_key text not null,
  entity text not null,
  action text not null,
  payload jsonb not null default '{}'::jsonb,
  status public.sync_status not null default 'pendente',
  attempts integer not null default 0,
  error_message text,
  synced_at timestamptz,
  created_at timestamptz not null default now(),
  unique(user_id, operation_key)
);

create or replace function public.is_company_member(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.company_members
    where company_id = target_company_id
      and user_id = auth.uid()
      and status = 'ativo'
  );
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['companies','profiles','customers','leads','quotes','materials','production_orders','installations'] loop
    execute format('drop trigger if exists touch_%I on public.%I', table_name, table_name);
    execute format('create trigger touch_%I before update on public.%I for each row execute function public.touch_updated_at()', table_name, table_name);
  end loop;
end $$;

alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.company_members enable row level security;
alter table public.audit_logs enable row level security;
alter table public.customers enable row level security;
alter table public.leads enable row level security;
alter table public.quotes enable row level security;
alter table public.materials enable row level security;
alter table public.production_orders enable row level security;
alter table public.installations enable row level security;
alter table public.sync_operations enable row level security;

create policy "members can read their companies" on public.companies for select using (public.is_company_member(id));
create policy "members can read profiles in their companies" on public.profiles for select using (exists (select 1 from public.company_members m where m.user_id = profiles.id and public.is_company_member(m.company_id)));
create policy "members can read company memberships" on public.company_members for select using (public.is_company_member(company_id));
create policy "members can manage customers" on public.customers for all using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));
create policy "members can manage leads" on public.leads for all using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));
create policy "members can manage quotes" on public.quotes for all using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));
create policy "members can manage materials" on public.materials for all using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));
create policy "members can manage production" on public.production_orders for all using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));
create policy "members can manage installations" on public.installations for all using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));
create policy "members can read and create sync operations" on public.sync_operations for all using (public.is_company_member(company_id) and user_id = auth.uid()) with check (public.is_company_member(company_id) and user_id = auth.uid());
create policy "members can read audit logs" on public.audit_logs for select using (public.is_company_member(company_id));
