-- Toldo Pro: banco principal multiempresa para Supabase
create extension if not exists pgcrypto;

do $$ begin
  create type public.member_status as enum ('ativo', 'inativo');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.sync_status as enum ('pendente', 'sincronizando', 'sincronizado', 'falhou');
exception when duplicate_object then null; end $$;

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  trade_name text not null,
  document text,
  logo_url text,
  phone text,
  whatsapp text,
  email text,
  address jsonb not null default '{}'::jsonb,
  fiscal_settings jsonb not null default '{}'::jsonb,
  commercial_settings jsonb not null default '{}'::jsonb,
  financial_settings jsonb not null default '{}'::jsonb,
  schedule jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.company_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  email text,
  status public.member_status not null default 'ativo',
  role_name text not null default 'Vendedor',
  employee_id uuid,
  last_access_at timestamptz,
  created_at timestamptz not null default now(),
  unique(company_id, user_id)
);

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  name text not null,
  description text,
  is_system boolean not null default false
);

create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  label text not null
);

create table if not exists public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  primary key(role_id, permission_id)
);

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  full_name text not null,
  cpf text,
  phone text,
  whatsapp text,
  email text,
  function_name text,
  job_title text,
  admission_date date,
  salary numeric(14,2),
  internal_cost numeric(14,2),
  photo_url text,
  team text,
  status public.member_status not null default 'ativo',
  history jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.company_members add constraint company_members_employee_fk foreign key(employee_id) references public.employees(id) on delete set null;

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  person_type text not null default 'fisica',
  name text not null,
  legal_name text,
  cpf text,
  cnpj text,
  phone text,
  whatsapp text,
  email text,
  address jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  source text not null default 'outro',
  desired_product text,
  location text,
  measurements jsonb not null default '{}'::jsonb,
  estimated_value numeric(14,2),
  responsible_user_id uuid references auth.users(id) on delete set null,
  stage text not null default 'novo_lead',
  probability numeric(5,2),
  loss_reason text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  product_type text not null,
  description text,
  materials jsonb not null default '[]'::jsonb,
  dimensions jsonb not null default '{}'::jsonb,
  colors jsonb not null default '[]'::jsonb,
  structure text,
  price numeric(14,2),
  cost numeric(14,2),
  margin numeric(7,2),
  technical_sheet jsonb not null default '{}'::jsonb,
  photos jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  category text,
  unit text not null default 'un',
  cost numeric(14,2) not null default 0,
  supplier text,
  minimum_stock numeric(14,3) not null default 0,
  maximum_stock numeric(14,3),
  sku text,
  current_stock numeric(14,3) not null default 0,
  photos jsonb not null default '[]'::jsonb,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.measurements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  address jsonb not null default '{}'::jsonb,
  environment text,
  product_type text,
  dimensions jsonb not null default '{}'::jsonb,
  wall_type text,
  fixation_type text,
  fixation_points text,
  obstacles text,
  access_notes text,
  observations text,
  photos jsonb not null default '[]'::jsonb,
  videos jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.technical_inspections (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  measurement_id uuid references public.measurements(id) on delete set null,
  risks text,
  difficulties text,
  wall_condition text,
  access_notes text,
  required_equipment text,
  needs_scaffold boolean not null default false,
  needs_extra_team boolean not null default false,
  technical_approval boolean not null default false,
  media jsonb not null default '[]'::jsonb,
  observations text,
  created_at timestamptz not null default now()
);

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  measurements jsonb not null default '{}'::jsonb,
  line_items jsonb not null default '[]'::jsonb,
  material_cost numeric(14,2) not null default 0,
  labor_cost numeric(14,2) not null default 0,
  installation_cost numeric(14,2) not null default 0,
  travel_cost numeric(14,2) not null default 0,
  expenses numeric(14,2) not null default 0,
  margin_percent numeric(7,2) not null default 0,
  cost numeric(14,2) not null default 0,
  price numeric(14,2) not null default 0,
  discount numeric(14,2) not null default 0,
  payment_method text,
  valid_until date,
  status text not null default 'rascunho',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.production_orders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  quote_id uuid references public.quotes(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  measurements jsonb not null default '{}'::jsonb,
  materials jsonb not null default '[]'::jsonb,
  quantity numeric(14,3) not null default 1,
  responsible_user_id uuid references auth.users(id) on delete set null,
  due_date date,
  priority text not null default 'normal',
  status text not null default 'aguardando_producao',
  created_at timestamptz not null default now()
);

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  material_id uuid not null references public.materials(id) on delete cascade,
  movement_type text not null,
  quantity numeric(14,3) not null,
  unit_cost numeric(14,2),
  reference_type text,
  reference_id uuid,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  supplier text not null,
  items jsonb not null default '[]'::jsonb,
  total numeric(14,2) not null default 0,
  due_date date,
  status text not null default 'cotacao',
  received_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.deliveries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  address jsonb not null default '{}'::jsonb,
  delivery_date timestamptz,
  driver text,
  team text,
  status text not null default 'agendada',
  proof_url text,
  photos jsonb not null default '[]'::jsonb,
  notes text,
  created_at timestamptz not null default now()
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
  notes text,
  photos jsonb not null default '[]'::jsonb,
  proof_url text,
  status text not null default 'agendada',
  created_at timestamptz not null default now()
);

create table if not exists public.maintenance_orders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  problem text,
  diagnosis text,
  parts jsonb not null default '[]'::jsonb,
  quote_id uuid references public.quotes(id) on delete set null,
  technician text,
  service_date timestamptz,
  service_notes text,
  warranty boolean not null default false,
  status text not null default 'aberta',
  photos jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  event_type text not null,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  assigned_to uuid references auth.users(id) on delete set null,
  reference_id uuid,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.financial_entries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  entry_type text not null,
  category text,
  description text not null,
  amount numeric(14,2) not null,
  due_date date,
  paid_at timestamptz,
  customer_id uuid references public.customers(id) on delete set null,
  supplier text,
  created_at timestamptz not null default now()
);

create table if not exists public.sync_operations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  client_operation_id uuid not null,
  operation_type text not null,
  payload jsonb not null default '{}'::jsonb,
  status public.sync_status not null default 'pendente',
  attempts integer not null default 0,
  error_message text,
  created_at timestamptz not null default now(),
  synced_at timestamptz,
  unique(company_id, client_operation_id)
);

create or replace function public.is_company_member(target_company_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.company_members
    where company_id = target_company_id
      and user_id = auth.uid()
      and status = 'ativo'
  );
$$;

alter table public.companies enable row level security;
create policy "company members can view their company" on public.companies for select using (public.is_company_member(id));
create policy "company members can update their company" on public.companies for update using (public.is_company_member(id));

alter table public.company_members enable row level security;
create policy "members can view company members" on public.company_members for select using (public.is_company_member(company_id));
create policy "administrators can manage company members" on public.company_members for all using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));

-- Todas as tabelas operacionais usam a mesma regra de isolamento por empresa.
do $$
declare
  table_name text;
begin
  foreach table_name in array array['employees','customers','leads','products','materials','measurements','technical_inspections','quotes','production_orders','stock_movements','purchase_orders','deliveries','installations','maintenance_orders','calendar_events','financial_entries','sync_operations'] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('create policy "company members can read %1$s" on public.%1$I for select using (public.is_company_member(company_id))', table_name);
    execute format('create policy "company members can create %1$s" on public.%1$I for insert with check (public.is_company_member(company_id))', table_name);
    execute format('create policy "company members can update %1$s" on public.%1$I for update using (public.is_company_member(company_id)) with check (public.is_company_member(company_id))', table_name);
    execute format('create policy "company members can delete %1$s" on public.%1$I for delete using (public.is_company_member(company_id))', table_name);
  end loop;
end $$;

insert into public.permissions (code, label) values
  ('visualizar', 'Visualizar'), ('criar', 'Criar'), ('editar', 'Editar'), ('excluir', 'Excluir'),
  ('aprovar', 'Aprovar'), ('cancelar', 'Cancelar'), ('exportar', 'Exportar'), ('imprimir', 'Imprimir')
on conflict (code) do nothing;
