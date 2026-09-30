create extension if not exists pgcrypto;

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legal_name text not null,
  trade_name text not null,
  document text,
  logo_url text,
  phone text,
  whatsapp text,
  email text,
  address jsonb not null default '{}'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.companies add column if not exists name text;
alter table public.companies add column if not exists legal_name text;
alter table public.companies add column if not exists trade_name text;
alter table public.companies add column if not exists document text;
alter table public.companies add column if not exists logo_url text;
alter table public.companies add column if not exists phone text;
alter table public.companies add column if not exists whatsapp text;
alter table public.companies add column if not exists email text;
alter table public.companies add column if not exists address jsonb not null default '{}'::jsonb;
alter table public.companies add column if not exists settings jsonb not null default '{}'::jsonb;
alter table public.companies add column if not exists created_at timestamptz not null default now();
alter table public.companies add column if not exists updated_at timestamptz not null default now();

update public.companies
set
  name = coalesce(
    nullif(btrim(name), ''),
    nullif(btrim(trade_name), ''),
    nullif(btrim(legal_name), ''),
    'Empresa'
  ),
  legal_name = coalesce(
    nullif(btrim(legal_name), ''),
    nullif(btrim(name), ''),
    nullif(btrim(trade_name), ''),
    'Empresa'
  ),
  trade_name = coalesce(
    nullif(btrim(trade_name), ''),
    nullif(btrim(name), ''),
    nullif(btrim(legal_name), ''),
    'Empresa'
  )
where
  name is null
  or btrim(name) = ''
  or legal_name is null
  or btrim(legal_name) = ''
  or trade_name is null
  or btrim(trade_name) = '';

alter table public.companies alter column name set not null;
alter table public.companies alter column legal_name set not null;
alter table public.companies alter column trade_name set not null;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  email text,
  avatar_url text,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists full_name text not null default '';
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists last_seen_at timestamptz;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

create table if not exists public.company_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'vendedor',
  permissions jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (company_id, user_id)
);

alter table public.company_members add column if not exists company_id uuid;
alter table public.company_members add column if not exists user_id uuid;
alter table public.company_members add column if not exists role text not null default 'vendedor';
alter table public.company_members add column if not exists permissions jsonb not null default '{}'::jsonb;
alter table public.company_members add column if not exists active boolean not null default true;
alter table public.company_members add column if not exists created_at timestamptz not null default now();

update public.company_members
set role = 'vendedor'
where role is null;

update public.company_members
set permissions = '{}'::jsonb
where permissions is null;

update public.company_members
set active = true
where active is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.company_members'::regclass
      and conname = 'company_members_company_id_fkey'
  ) then
    alter table public.company_members
      add constraint company_members_company_id_fkey
      foreign key (company_id)
      references public.companies(id)
      on delete cascade;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.company_members'::regclass
      and conname = 'company_members_user_id_fkey'
  ) then
    alter table public.company_members
      add constraint company_members_user_id_fkey
      foreign key (user_id)
      references auth.users(id)
      on delete cascade;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.company_members'::regclass
      and conname = 'company_members_company_id_user_id_key'
  ) then
    alter table public.company_members
      add constraint company_members_company_id_user_id_key
      unique (company_id, user_id);
  end if;
end;
$$;

create index if not exists company_members_user_id_idx
  on public.company_members(user_id);

create index if not exists company_members_company_id_idx
  on public.company_members(company_id);

create index if not exists company_members_active_user_id_idx
  on public.company_members(user_id)
  where active = true;

create index if not exists company_members_active_company_id_idx
  on public.company_members(company_id)
  where active = true;

alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.company_members enable row level security;

create or replace function public.my_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select cm.company_id
  from public.company_members cm
  where cm.user_id = auth.uid()
    and cm.active = true
  order by cm.created_at asc
  limit 1;
$$;

revoke all
on function public.my_company_id()
from public;

grant execute
on function public.my_company_id()
to authenticated;

create or replace function public.has_company_permission(
  p_permission text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.company_members cm
    where cm.user_id = auth.uid()
      and cm.company_id = public.my_company_id()
      and cm.active = true
      and (
        cm.role = 'Administrador'
        or coalesce(
          case
            when jsonb_typeof(cm.permissions) = 'object'
            then (cm.permissions ->> p_permission)::boolean
            else false
          end,
          false
        )
      )
  );
$$;

revoke all
on function public.has_company_permission(text)
from public;

grant execute
on function public.has_company_permission(text)
to authenticated;

drop policy if exists "members can view company"
on public.companies;

create policy "members can view company"
on public.companies
for select
to authenticated
using (
  id = public.my_company_id()
);

drop policy if exists "users can view own profile"
on public.profiles;

create policy "users can view own profile"
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
);

do $$
declare
  membership_policy record;
begin
  for membership_policy in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'company_members'
      and cmd in ('SELECT', 'ALL')
  loop
    execute format(
      'drop policy if exists %I on public.company_members',
      membership_policy.policyname
    );
  end loop;
end;
$$;

create policy "users can view own company membership"
on public.company_members
for select
to authenticated
using (
  user_id = auth.uid()
);

grant select
on public.companies,
   public.profiles,
   public.company_members
to authenticated;

create or replace view public.company_employee_directory
with (security_invoker = false)
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
join public.profiles profile
  on profile.id = membership.user_id
where membership.company_id = public.my_company_id()
  and public.has_company_permission('editRules');

grant select
on public.company_employee_directory
to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_company_name text;
  company_uuid uuid;
  existing_membership_company_id uuid;
begin
  insert into public.profiles (
    id,
    full_name,
    email,
    phone
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email,
    new.raw_user_meta_data->>'phone'
  )
  on conflict (id)
  do update
  set
    full_name = excluded.full_name,
    email = excluded.email,
    phone = coalesce(
      excluded.phone,
      public.profiles.phone
    );

  clean_company_name :=
    nullif(
      btrim(new.raw_user_meta_data->>'company_name'),
      ''
    );

  if clean_company_name is not null then
    if length(clean_company_name) < 2
       or length(clean_company_name) > 120 then
      raise exception
        'Company name must contain between 2 and 120 characters';
    end if;

    select cm.company_id
    into existing_membership_company_id
    from public.company_members cm
    where cm.user_id = new.id
      and cm.active = true
    order by cm.created_at asc
    limit 1;

    if existing_membership_company_id is null then
      insert into public.companies (
        name,
        legal_name,
        trade_name
      )
      values (
        clean_company_name,
        clean_company_name,
        clean_company_name
      )
      returning id
      into company_uuid;

      insert into public.company_members (
        company_id,
        user_id,
        role,
        permissions,
        active
      )
      values (
        company_uuid,
        new.id,
        'Administrador',
        '{}'::jsonb,
        true
      )
      on conflict (company_id, user_id)
      do update
      set
        active = true;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created
on auth.users;

create trigger on_auth_user_created
after insert
on auth.users
for each row
execute procedure public.handle_new_user();

create or replace function public.create_company_for_current_user(
  company_name text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  company_uuid uuid;
  clean_name text;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required';
  end if;

  clean_name :=
    nullif(
      btrim(company_name),
      ''
    );

  if clean_name is null
     or length(clean_name) < 2
     or length(clean_name) > 120 then
    raise exception
      'Company name must contain between 2 and 120 characters';
  end if;

  select cm.company_id
  into company_uuid
  from public.company_members cm
  where cm.user_id = auth.uid()
    and cm.active = true
  order by cm.created_at asc
  limit 1;

  if company_uuid is not null then
    return company_uuid;
  end if;

  insert into public.companies (
    name,
    legal_name,
    trade_name
  )
  values (
    clean_name,
    clean_name,
    clean_name
  )
  returning id
  into company_uuid;

  insert into public.company_members (
    company_id,
    user_id,
    role,
    permissions,
    active
  )
  values (
    company_uuid,
    auth.uid(),
    'Administrador',
    '{}'::jsonb,
    true
  )
  on conflict (company_id, user_id)
  do update
  set active = true;

  return company_uuid;
end;
$$;

revoke all
on function public.create_company_for_current_user(text)
from public;

grant execute
on function public.create_company_for_current_user(text)
to authenticated;

create or replace function public.update_company_member_access(
  p_membership_id uuid,
  p_role text,
  p_permissions jsonb,
  p_active boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null
     or not public.has_company_permission('editRules') then
    raise exception
      'Company administrator permission is required';
  end if;

  if p_role is null
     or p_role not in (
       'Administrador',
       'Vendas',
       'Produção',
       'Instalador',
       'Financeiro'
     ) then
    raise exception
      'Invalid employee role';
  end if;

  if p_permissions is null
     or jsonb_typeof(p_permissions) <> 'object'
     or p_active is null then
    raise exception
      'Valid employee permissions and active status are required';
  end if;

  update public.company_members
  set
    role = p_role,
    permissions = p_permissions,
    active = p_active
  where id = p_membership_id
    and company_id = public.my_company_id()
    and user_id <> auth.uid();

  if not found then
    raise exception
      'Employee membership not found or cannot be changed';
  end if;
end;
$$;

revoke all
on function public.update_company_member_access(
  uuid,
  text,
  jsonb,
  boolean
)
from public, anon;

grant execute
on function public.update_company_member_access(
  uuid,
  text,
  jsonb,
  boolean
)
to authenticated;
