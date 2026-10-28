create table if not exists public.company_subscriptions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null unique references public.companies(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'mercadopago' check (provider = 'mercadopago'),
  provider_subscription_id text unique,
  external_reference text not null unique,
  status text not null default 'pending' check (status in ('pending','trialing','authorized','active','past_due','paused','canceled','rejected','expired')),
  plan_amount numeric(10,2) not null default 230.00 check (plan_amount > 0),
  currency text not null default 'BRL' check (currency = 'BRL'),
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  last_payment_status text,
  last_payment_at timestamptz,
  checkout_url text,
  provider_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists company_subscriptions_owner_user_idx on public.company_subscriptions(owner_user_id);
create index if not exists company_subscriptions_status_idx on public.company_subscriptions(status);

alter table public.company_subscriptions enable row level security;

drop policy if exists "Company members can read own subscription" on public.company_subscriptions;
create policy "Company members can read own subscription"
on public.company_subscriptions
for select
to authenticated
using (
  exists (
    select 1
    from public.company_members cm
    where cm.company_id = company_subscriptions.company_id
      and cm.user_id = (select auth.uid())
      and cm.active = true
  )
);

revoke insert, update, delete on public.company_subscriptions from anon, authenticated;
grant select on public.company_subscriptions to authenticated;