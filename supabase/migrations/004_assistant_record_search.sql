create or replace function public.search_assistant_records(
  p_entities text[],
  p_query text default ''
)
returns table (
  entity text,
  record_id text,
  data jsonb,
  updated_at timestamptz
)
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  allowed_entities constant text[] := array[
    'customers', 'clients', 'leads', 'quotes', 'work_orders', 'os',
    'production', 'installations', 'materials', 'stock_movements',
    'supply_requests', 'notifications', 'agenda', 'events'
  ];
begin
  if auth.uid() is null or public.my_company_id() is null then
    raise exception 'Authentication and active company membership are required';
  end if;
  if p_entities is null or cardinality(p_entities) = 0
    or cardinality(p_entities) > 10
    or not (p_entities <@ allowed_entities) then
    raise exception 'A valid list of operational record types is required';
  end if;
  if length(coalesce(p_query, '')) > 1000 then
    raise exception 'Search context is too long';
  end if;

  return query
  with terms as (
    select distinct split_tokens.token
    from regexp_split_to_table(
      regexp_replace(lower(coalesce(p_query, '')), '[^[:alnum:]]+', ' ', 'g'),
      '\s+'
    ) as split_tokens(token)
    where length(split_tokens.token) >= 3
      and split_tokens.token not in (
        'qual', 'quais', 'como', 'onde', 'quando', 'quanto', 'quanta',
        'para', 'pela', 'pelo', 'pelas', 'pelos', 'com', 'sem', 'uma',
        'uns', 'umas', 'dos', 'das', 'que', 'por', 'mais', 'menos',
        'sobre', 'mostre', 'liste', 'consulte', 'verifique', 'resuma',
        'empresa', 'meu', 'minha', 'meus', 'minhas', 'tem', 'tenho',
        'está', 'estão', 'esta', 'esse', 'essa', 'isso', 'aqui',
        'hoje', 'amanha', 'amanhã'
      )
    limit 20
  ),
  ranked as (
    select
      op.entity as record_entity,
      op.record_id as record_key,
      op.data as record_data,
      op.updated_at as record_updated_at,
      count(terms.token) filter (
        where lower(op.data::text) like '%' || terms.token || '%'
      ) as matched_terms,
      length(regexp_replace(coalesce(p_query, ''), '[^0-9]', '', 'g')) >= 5
        and regexp_replace(op.data::text, '[^0-9]', '', 'g')
          like '%' || regexp_replace(coalesce(p_query, ''), '[^0-9]', '', 'g') || '%' as matched_digits
    from public.operational_records as op
    left join terms on true
    where op.company_id = public.my_company_id()
      and op.entity = any(p_entities)
    group by op.entity, op.record_id, op.data, op.updated_at
  )
  select ranked.record_entity, ranked.record_key, ranked.record_data, ranked.record_updated_at
  from ranked
  where ranked.matched_terms > 0
    or coalesce(ranked.matched_digits, false)
    or not exists (select 1 from terms)
  order by ranked.matched_terms desc, ranked.matched_digits desc, ranked.record_updated_at desc
  limit 100;
end;
$$;

revoke all on function public.search_assistant_records(text[], text) from public, anon;
grant execute on function public.search_assistant_records(text[], text) to authenticated;

create or replace function public.search_assistant_private_records(
  p_entities text[],
  p_query text default ''
)
returns table (
  entity text,
  record_id text,
  data jsonb,
  updated_at timestamptz
)
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  allowed_entities constant text[] := array['finance', 'financial_entries'];
begin
  if auth.uid() is null or public.my_company_id() is null
    or not public.has_company_permission('viewFinancial') then
    raise exception 'Financial data permission is required';
  end if;
  if p_entities is null or cardinality(p_entities) = 0
    or cardinality(p_entities) > 2
    or not (p_entities <@ allowed_entities) then
    raise exception 'A valid list of financial record types is required';
  end if;
  if length(coalesce(p_query, '')) > 1000 then
    raise exception 'Search context is too long';
  end if;

  return query
  with terms as (
    select distinct split_tokens.token
    from regexp_split_to_table(
      regexp_replace(lower(coalesce(p_query, '')), '[^[:alnum:]]+', ' ', 'g'),
      '\s+'
    ) as split_tokens(token)
    where length(split_tokens.token) >= 3
      and split_tokens.token not in (
        'qual', 'quais', 'como', 'onde', 'quando', 'quanto', 'quanta',
        'para', 'pela', 'pelo', 'pelas', 'pelos', 'com', 'sem', 'uma',
        'uns', 'umas', 'dos', 'das', 'que', 'por', 'mais', 'menos',
        'sobre', 'mostre', 'liste', 'consulte', 'verifique', 'resuma',
        'empresa', 'meu', 'minha', 'meus', 'minhas', 'tem', 'tenho',
        'está', 'estão', 'esta', 'esse', 'essa', 'isso', 'aqui',
        'hoje', 'amanha', 'amanhã'
      )
    limit 20
  ),
  ranked as (
    select
      op.entity as record_entity,
      op.record_id as record_key,
      op.data as record_data,
      op.updated_at as record_updated_at,
      count(terms.token) filter (
        where lower(op.data::text) like '%' || terms.token || '%'
      ) as matched_terms,
      length(regexp_replace(coalesce(p_query, ''), '[^0-9]', '', 'g')) >= 5
        and regexp_replace(op.data::text, '[^0-9]', '', 'g')
          like '%' || regexp_replace(coalesce(p_query, ''), '[^0-9]', '', 'g') || '%' as matched_digits
    from public.operational_private_records as op
    left join terms on true
    where op.company_id = public.my_company_id()
      and op.entity = any(p_entities)
    group by op.entity, op.record_id, op.data, op.updated_at
  )
  select ranked.record_entity, ranked.record_key, ranked.record_data, ranked.record_updated_at
  from ranked
  where ranked.matched_terms > 0
    or coalesce(ranked.matched_digits, false)
    or not exists (select 1 from terms)
  order by ranked.matched_terms desc, ranked.matched_digits desc, ranked.record_updated_at desc
  limit 100;
end;
$$;

revoke all on function public.search_assistant_private_records(text[], text) from public, anon;
grant execute on function public.search_assistant_private_records(text[], text) to authenticated;
