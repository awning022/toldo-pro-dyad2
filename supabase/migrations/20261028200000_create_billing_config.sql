create table if not exists public.billing_config (
  id integer primary key default 1 check (id = 1),
  mercadopago_plan_id text,
  updated_at timestamptz not null default now()
);
alter table public.billing_config enable row level security;
revoke all on public.billing_config from anon, authenticated;