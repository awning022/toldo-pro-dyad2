-- Persistent, company-isolated history for the Toldo Pro AI agent.
create table if not exists public.assistant_conversations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Nova conversa',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.assistant_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.assistant_conversations(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  action jsonb,
  created_at timestamptz not null default now()
);

create index if not exists assistant_conversations_company_updated_idx
  on public.assistant_conversations(company_id, updated_at desc);
create index if not exists assistant_messages_conversation_created_idx
  on public.assistant_messages(conversation_id, created_at asc);
create index if not exists assistant_messages_company_created_idx
  on public.assistant_messages(company_id, created_at desc);

alter table public.assistant_conversations enable row level security;
alter table public.assistant_messages enable row level security;

drop policy if exists "Company members read assistant conversations" on public.assistant_conversations;
create policy "Company members read assistant conversations"
  on public.assistant_conversations for select to authenticated
  using (company_id = public.my_company_id() and user_id = auth.uid());

drop policy if exists "Company members create assistant conversations" on public.assistant_conversations;
create policy "Company members create assistant conversations"
  on public.assistant_conversations for insert to authenticated
  with check (company_id = public.my_company_id() and user_id = auth.uid());

drop policy if exists "Company members update assistant conversations" on public.assistant_conversations;
create policy "Company members update assistant conversations"
  on public.assistant_conversations for update to authenticated
  using (company_id = public.my_company_id())
  with check (company_id = public.my_company_id() and user_id = auth.uid());

drop policy if exists "Company members read assistant messages" on public.assistant_messages;
create policy "Company members read assistant messages"
  on public.assistant_messages for select to authenticated
  using (company_id = public.my_company_id());

drop policy if exists "Company members create assistant messages" on public.assistant_messages;
create policy "Company members create assistant messages"
  on public.assistant_messages for insert to authenticated
  with check (company_id = public.my_company_id() and user_id = auth.uid());

revoke all on public.assistant_conversations, public.assistant_messages from anon;
grant select, insert, update on public.assistant_conversations to authenticated;
grant select, insert on public.assistant_messages to authenticated;
