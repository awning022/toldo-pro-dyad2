alter table public.profiles add column if not exists email text;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email,
    new.raw_user_meta_data->>'phone'
  )
  on conflict (id) do update
  set full_name = excluded.full_name,
      email = excluded.email,
      phone = coalesce(excluded.phone, public.profiles.phone);
  return new;
end;
$$;

create or replace function public.has_company_permission(permission_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (membership.permissions ->> permission_key)::boolean,
    case membership.role
      when 'Administrador' then true
      when 'Vendas' then permission_key in (
        'manageCustomers', 'manageQuotes', 'approveQuote', 'convertClient',
        'issueOS', 'viewFinancial', 'manageAgenda', 'accessAssistant', 'readNotifications'
      )
      when 'Produção' then permission_key in (
        'manageProduction', 'changeProductionStatus', 'manageStock', 'requestMaterials', 'manageInstallations',
        'accessAssistant', 'readNotifications'
      )
      when 'Instalador' then permission_key in (
        'requestMaterials', 'manageInstallations', 'accessAssistant', 'readNotifications'
      )
      when 'Financeiro' then permission_key in (
        'viewFinancial', 'manageFinance', 'accessAssistant', 'readNotifications'
      )
      else false
    end,
    false
  )
  from public.company_members membership
  where membership.user_id = auth.uid()
    and membership.company_id = public.my_company_id()
    and membership.active = true
  limit 1;
$$;

create or replace function public.has_operational_permission(entity_key text, operation_key text default 'read')
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when operation_key = 'delete' then public.has_company_permission('deleteRecord')
    when operation_key = 'read' and entity_key in ('finance', 'financial_entries') then public.has_company_permission('viewFinancial')
    when operation_key <> 'read' and entity_key in ('finance', 'financial_entries') then public.has_company_permission('manageFinance')
    when entity_key in ('customers', 'clients', 'leads') then public.has_company_permission('manageCustomers')
    when entity_key in ('quotes') then public.has_company_permission('manageQuotes')
    when entity_key = 'work_orders' and operation_key = 'read' then
      public.has_company_permission('issueOS')
      or public.has_company_permission('manageProduction')
      or public.has_company_permission('manageInstallations')
    when entity_key in ('work_orders', 'os') then public.has_company_permission('issueOS')
    when entity_key in ('production') then public.has_company_permission('manageProduction')
    when entity_key in ('installations') then public.has_company_permission('manageInstallations')
    when entity_key = 'materials' and operation_key = 'read' then
      public.has_company_permission('manageStock')
      or public.has_company_permission('manageProduction')
      or public.has_company_permission('manageInstallations')
    when entity_key = 'materials' then public.has_company_permission('manageStock')
    when entity_key = 'stock_movements' and operation_key = 'read' then
      public.has_company_permission('manageStock')
      or public.has_company_permission('manageProduction')
      or public.has_company_permission('manageInstallations')
    when entity_key = 'stock_movements' then public.has_company_permission('manageStock')
    when entity_key in ('supply_requests') then
      public.has_company_permission('requestMaterials') or public.has_company_permission('manageStock')
    when entity_key in ('notifications') then public.has_company_permission('readNotifications')
    when entity_key in ('agenda', 'events') then public.has_company_permission('manageAgenda')
    when entity_key in ('assistant_conversations') then public.has_company_permission('accessAssistant')
    else false
  end;
$$;

create table if not exists public.operational_records (
  company_id uuid not null references public.companies(id) on delete cascade,
  entity text not null,
  record_id text not null,
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object'),
  created_by uuid not null default auth.uid() references auth.users(id),
  updated_at timestamptz not null default now(),
  primary key (company_id, entity, record_id)
);

create index if not exists operational_records_company_entity_updated_idx
  on public.operational_records (company_id, entity, updated_at desc);

create table if not exists public.operational_private_records (
  company_id uuid not null references public.companies(id) on delete cascade,
  entity text not null check (entity in ('quotes', 'finance', 'financial_entries')),
  record_id text not null,
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object'),
  updated_at timestamptz not null default now(),
  primary key (company_id, entity, record_id)
);

create or replace function public.set_operational_record_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists set_operational_records_updated_at on public.operational_records;
create trigger set_operational_records_updated_at
  before update on public.operational_records
  for each row execute function public.set_operational_record_updated_at();

drop trigger if exists set_operational_private_records_updated_at on public.operational_private_records;
create trigger set_operational_private_records_updated_at
  before update on public.operational_private_records
  for each row execute function public.set_operational_record_updated_at();

create or replace view public.company_employee_directory
with (security_invoker = true)
as
  select
    membership.id,
    membership.company_id,
    membership.user_id,
    membership.role,
    membership.permissions,
    membership.active,
    profile.full_name,
    profile.email,
    profile.phone,
    membership.created_at
  from public.company_members membership
  join public.profiles profile on profile.id = membership.user_id;

grant select on public.company_employee_directory to authenticated;

alter table public.operational_records enable row level security;
alter table public.operational_private_records enable row level security;

revoke all on public.operational_records, public.operational_private_records from public, anon;
grant select, insert, update, delete on public.operational_records, public.operational_private_records to authenticated;

drop policy if exists "members read permitted operational records" on public.operational_records;
create policy "members read permitted operational records"
  on public.operational_records for select
  using (company_id = public.my_company_id() and public.has_operational_permission(entity, 'read'));

drop policy if exists "members insert permitted operational records" on public.operational_records;
create policy "members insert permitted operational records"
  on public.operational_records for insert
  with check (company_id = public.my_company_id() and public.has_operational_permission(entity, 'write'));

drop policy if exists "members update permitted operational records" on public.operational_records;
create policy "members update permitted operational records"
  on public.operational_records for update
  using (company_id = public.my_company_id() and public.has_operational_permission(entity, 'write'))
  with check (company_id = public.my_company_id() and public.has_operational_permission(entity, 'write'));

drop policy if exists "members delete permitted operational records" on public.operational_records;
create policy "members delete permitted operational records"
  on public.operational_records for delete
  using (company_id = public.my_company_id() and public.has_operational_permission(entity, 'delete'));

create or replace function public.enforce_operational_record_permissions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.entity = 'quotes' then
    if new.data->>'status' = 'Aprovado'
      and old.data->>'status' is distinct from 'Aprovado'
      and not public.has_company_permission('approveQuote') then
      raise exception 'Quote approval permission is required';
    end if;
    if new.data->>'status' = 'Cancelado'
      and old.data->>'status' is distinct from 'Cancelado'
      and not public.has_company_permission('deleteRecord') then
      raise exception 'Quote cancellation permission is required';
    end if;
    if nullif(new.data->>'clientId', '') is not null
      and old.data->>'clientId' is distinct from new.data->>'clientId'
      and not public.has_company_permission('convertClient') then
      raise exception 'Client conversion permission is required';
    end if;
  end if;
  if tg_op = 'UPDATE' and new.entity = 'work_orders'
    and nullif(new.data->>'productionId', '') is not null
    and old.data->>'productionId' is distinct from new.data->>'productionId'
    and not public.has_company_permission('sendProduction') then
    raise exception 'Sending an order to production requires permission';
  end if;
  if tg_op = 'UPDATE' and new.entity = 'production'
    and new.data->>'status' is distinct from old.data->>'status'
    and not public.has_company_permission('changeProductionStatus') then
    raise exception 'Production status change permission is required';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_operational_record_permissions on public.operational_records;
create trigger enforce_operational_record_permissions
  before update on public.operational_records
  for each row execute function public.enforce_operational_record_permissions();

drop policy if exists "authorized members read private records" on public.operational_private_records;
create policy "authorized members read private records"
  on public.operational_private_records for select
  using (
    company_id = public.my_company_id()
    and public.has_company_permission('viewFinancial')
    and (entity <> 'finance' or public.has_operational_permission(entity, 'read'))
  );

drop policy if exists "authorized members insert private records" on public.operational_private_records;
create policy "authorized members insert private records"
  on public.operational_private_records for insert
  with check (
    company_id = public.my_company_id()
    and public.has_company_permission('viewFinancial')
    and (
      (entity = 'quotes' and public.has_company_permission('manageQuotes'))
      or (entity in ('finance', 'financial_entries') and public.has_company_permission('manageFinance'))
    )
  );

drop policy if exists "authorized members update private records" on public.operational_private_records;
create policy "authorized members update private records"
  on public.operational_private_records for update
  using (
    company_id = public.my_company_id()
    and public.has_company_permission('viewFinancial')
    and (
      (entity = 'quotes' and public.has_company_permission('manageQuotes'))
      or (entity in ('finance', 'financial_entries') and public.has_company_permission('manageFinance'))
    )
  )
  with check (
    company_id = public.my_company_id()
    and public.has_company_permission('viewFinancial')
    and (
      (entity = 'quotes' and public.has_company_permission('manageQuotes'))
      or (entity in ('finance', 'financial_entries') and public.has_company_permission('manageFinance'))
    )
  );

drop policy if exists "authorized members delete private records" on public.operational_private_records;
create policy "authorized members delete private records"
  on public.operational_private_records for delete
  using (
    company_id = public.my_company_id()
    and public.has_company_permission('deleteRecord')
    and (
      (entity = 'quotes' and public.has_company_permission('manageQuotes'))
      or (entity in ('finance', 'financial_entries') and public.has_company_permission('manageFinance'))
    )
  );

drop policy if exists "members update own profile" on public.profiles;
create policy "members update own profile"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "administrators view company profiles" on public.profiles;
create policy "administrators view company profiles"
  on public.profiles for select
  using (
    id = auth.uid()
    or exists (
      select 1
      from public.company_members target_membership
      where target_membership.user_id = profiles.id
        and target_membership.company_id = public.my_company_id()
        and target_membership.active = true
        and public.has_company_permission('editRules')
    )
  );

drop policy if exists "administrators update company permissions" on public.company_members;
create policy "administrators update company permissions"
  on public.company_members for update
  using (
    company_id = public.my_company_id()
    and user_id <> auth.uid()
    and public.has_company_permission('editRules')
  )
  with check (
    company_id = public.my_company_id()
    and user_id <> auth.uid()
    and public.has_company_permission('editRules')
  );

drop policy if exists "members manage customers" on public.customers;
create policy "authorized members read customers"
  on public.customers for select
  using (company_id = public.my_company_id() and public.has_company_permission('manageCustomers'));
create policy "authorized members insert customers"
  on public.customers for insert
  with check (company_id = public.my_company_id() and public.has_company_permission('manageCustomers'));
create policy "authorized members update customers"
  on public.customers for update
  using (company_id = public.my_company_id() and public.has_company_permission('manageCustomers'))
  with check (company_id = public.my_company_id() and public.has_company_permission('manageCustomers'));
create policy "authorized members delete customers"
  on public.customers for delete
  using (company_id = public.my_company_id() and public.has_company_permission('deleteRecord'));

drop policy if exists "members manage leads" on public.leads;
create policy "authorized members read leads"
  on public.leads for select
  using (company_id = public.my_company_id() and public.has_company_permission('manageCustomers'));
create policy "authorized members insert leads"
  on public.leads for insert
  with check (company_id = public.my_company_id() and public.has_company_permission('manageCustomers'));
create policy "authorized members update leads"
  on public.leads for update
  using (company_id = public.my_company_id() and public.has_company_permission('manageCustomers'))
  with check (company_id = public.my_company_id() and public.has_company_permission('manageCustomers'));
create policy "authorized members delete leads"
  on public.leads for delete
  using (company_id = public.my_company_id() and public.has_company_permission('deleteRecord'));

drop policy if exists "members manage quotes" on public.quotes;
create policy "authorized members read quotes"
  on public.quotes for select
  using (company_id = public.my_company_id() and public.has_company_permission('manageQuotes'));
create policy "authorized members insert quotes"
  on public.quotes for insert
  with check (company_id = public.my_company_id() and public.has_company_permission('manageQuotes'));
create policy "authorized members update quotes"
  on public.quotes for update
  using (company_id = public.my_company_id() and public.has_company_permission('manageQuotes'))
  with check (company_id = public.my_company_id() and public.has_company_permission('manageQuotes'));
create policy "authorized members delete quotes"
  on public.quotes for delete
  using (company_id = public.my_company_id() and public.has_company_permission('deleteRecord'));

drop policy if exists "members manage materials" on public.materials;
create policy "authorized members read materials"
  on public.materials for select
  using (
    company_id = public.my_company_id()
    and (
      public.has_company_permission('manageStock')
      or public.has_company_permission('manageProduction')
      or public.has_company_permission('manageInstallations')
    )
  );
create policy "authorized members insert materials"
  on public.materials for insert
  with check (company_id = public.my_company_id() and public.has_company_permission('manageStock'));
create policy "authorized members update materials"
  on public.materials for update
  using (company_id = public.my_company_id() and public.has_company_permission('manageStock'))
  with check (company_id = public.my_company_id() and public.has_company_permission('manageStock'));
create policy "authorized members delete materials"
  on public.materials for delete
  using (company_id = public.my_company_id() and public.has_company_permission('deleteRecord'));

drop policy if exists "members manage production" on public.production_orders;
create policy "authorized members read production"
  on public.production_orders for select
  using (company_id = public.my_company_id() and public.has_company_permission('manageProduction'));
create policy "authorized members insert production"
  on public.production_orders for insert
  with check (company_id = public.my_company_id() and public.has_company_permission('manageProduction'));
create policy "authorized members update production"
  on public.production_orders for update
  using (company_id = public.my_company_id() and public.has_company_permission('manageProduction'))
  with check (company_id = public.my_company_id() and public.has_company_permission('manageProduction'));
create policy "authorized members delete production"
  on public.production_orders for delete
  using (company_id = public.my_company_id() and public.has_company_permission('deleteRecord'));

drop policy if exists "members manage installations" on public.installations;
create policy "authorized members read installations"
  on public.installations for select
  using (company_id = public.my_company_id() and public.has_company_permission('manageInstallations'));
create policy "authorized members insert installations"
  on public.installations for insert
  with check (company_id = public.my_company_id() and public.has_company_permission('manageInstallations'));
create policy "authorized members update installations"
  on public.installations for update
  using (company_id = public.my_company_id() and public.has_company_permission('manageInstallations'))
  with check (company_id = public.my_company_id() and public.has_company_permission('manageInstallations'));
create policy "authorized members delete installations"
  on public.installations for delete
  using (company_id = public.my_company_id() and public.has_company_permission('deleteRecord'));

create or replace function public.enforce_core_workflow_permissions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_table_name = 'quotes' then
    if new.status in ('Aprovado', 'aprovado')
      and old.status is distinct from new.status
      and not public.has_company_permission('approveQuote') then
      raise exception 'Quote approval permission is required';
    end if;
    if new.status in ('Cancelado', 'cancelado')
      and old.status is distinct from new.status
      and not public.has_company_permission('deleteRecord') then
      raise exception 'Quote cancellation permission is required';
    end if;
    if new.customer_id is distinct from old.customer_id
      and new.customer_id is not null
      and not public.has_company_permission('convertClient') then
      raise exception 'Client conversion permission is required';
    end if;
  elsif tg_table_name = 'production_orders'
    and new.status is distinct from old.status
    and not public.has_company_permission('changeProductionStatus') then
    raise exception 'Production status change permission is required';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_core_quote_permissions on public.quotes;
create trigger enforce_core_quote_permissions
  before update on public.quotes
  for each row execute function public.enforce_core_workflow_permissions();
drop trigger if exists enforce_core_production_permissions on public.production_orders;
create trigger enforce_core_production_permissions
  before update on public.production_orders
  for each row execute function public.enforce_core_workflow_permissions();

drop policy if exists "members can view audit" on public.audit_logs;
create policy "authorized members can view audit"
  on public.audit_logs for select
  using (company_id = public.my_company_id() and public.has_company_permission('editRules'));

create or replace function public.create_company_for_current_user(company_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  company_uuid uuid;
  clean_name text := trim(company_name);
begin
  if auth.uid() is null then
    raise exception 'Authentication is required';
  end if;
  if clean_name is null or length(clean_name) < 2 or length(clean_name) > 120 then
    raise exception 'Company name must contain between 2 and 120 characters';
  end if;
  if exists (select 1 from public.company_members where user_id = auth.uid() and active) then
    raise exception 'This account already belongs to a company';
  end if;

  insert into public.companies (legal_name, trade_name)
  values (clean_name, clean_name)
  returning id into company_uuid;

  insert into public.company_members (company_id, user_id, role, permissions, active)
  values (company_uuid, auth.uid(), 'Administrador', '{}'::jsonb, true);

  return company_uuid;
end;
$$;

revoke all on function public.create_company_for_current_user(text) from public;
grant execute on function public.create_company_for_current_user(text) to authenticated;
revoke all on function public.has_company_permission(text) from public, anon;
grant execute on function public.has_company_permission(text) to authenticated;
revoke all on function public.has_operational_permission(text, text) from public, anon;
grant execute on function public.has_operational_permission(text, text) to authenticated;
