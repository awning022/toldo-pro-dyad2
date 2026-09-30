create or replace function public.record_stock_movement(
  p_material_id text,
  p_quantity numeric,
  p_type text,
  p_order_id text default '',
  p_notes text default '',
  p_area text default 'estoque'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  company_uuid uuid := public.my_company_id();
  material_row public.operational_records%rowtype;
  current_quantity numeric;
  new_quantity numeric;
  minimum_quantity numeric;
  movement_id text := 'stock-' || gen_random_uuid()::text;
  movement_data jsonb;
begin
  if auth.uid() is null or company_uuid is null then
    raise exception 'Authentication and active company membership are required';
  end if;
  if p_quantity is null or p_quantity <= 0 or p_type is null or p_type not in ('Entrada', 'Saída') then
    raise exception 'A positive quantity and valid movement type are required';
  end if;
  if p_area is null then
    raise exception 'A valid stock movement area is required';
  end if;
  if p_area = 'produção' and not public.has_company_permission('manageProduction') then
    raise exception 'Production permission is required';
  elsif p_area = 'instalação' and not public.has_company_permission('manageInstallations') then
    raise exception 'Installation permission is required';
  elsif p_area not in ('produção', 'instalação') and not public.has_company_permission('manageStock') then
    raise exception 'Stock management permission is required';
  end if;

  select *
  into material_row
  from public.operational_records
  where company_id = company_uuid
    and entity = 'materials'
    and record_id = p_material_id
  for update;

  if not found then
    raise exception 'Material not found in this company';
  end if;

  current_quantity := coalesce((material_row.data->>'quantity')::numeric, 0);
  minimum_quantity := coalesce((material_row.data->>'minimum')::numeric, 0);
  new_quantity := case when p_type = 'Entrada'
    then current_quantity + p_quantity
    else current_quantity - p_quantity
  end;
  if new_quantity < 0 then
    raise exception 'Insufficient stock';
  end if;

  update public.operational_records
  set data = jsonb_set(material_row.data, '{quantity}', to_jsonb(new_quantity), true),
      updated_at = now()
  where company_id = company_uuid
    and entity = 'materials'
    and record_id = p_material_id;

  movement_data := jsonb_build_object(
    'id', movement_id,
    'materialId', p_material_id,
    'materialName', coalesce(material_row.data->>'name', ''),
    'type', p_type,
    'quantity', p_quantity,
    'orderId', coalesce(p_order_id, ''),
    'at', now(),
    'notes', coalesce(p_notes, '')
  );
  insert into public.operational_records (company_id, entity, record_id, data)
  values (company_uuid, 'stock_movements', movement_id, movement_data);

  if p_type = 'Saída' and new_quantity < minimum_quantity then
    insert into public.operational_records (company_id, entity, record_id, data)
    values (
      company_uuid,
      'notifications',
      'low-stock-' || movement_id,
      jsonb_build_object(
        'id', 'low-stock-' || movement_id,
        'title', 'Estoque abaixo do mínimo',
        'description', coalesce(material_row.data->>'name', 'Material') || ' ficou com ' || new_quantity || ' unidades disponíveis.',
        'createdAt', now(),
        'type', 'Estoque',
        'read', false
      )
    );
  end if;

  return movement_data;
end;
$$;

revoke all on function public.record_stock_movement(text, numeric, text, text, text, text) from public, anon;
grant execute on function public.record_stock_movement(text, numeric, text, text, text, text) to authenticated;

create or replace function public.complete_installation(p_installation_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  company_uuid uuid := public.my_company_id();
  installation_row public.operational_records%rowtype;
  order_row public.operational_records%rowtype;
  os_id text;
  affected_orders integer;
  actor_name text;
  actor_role text;
  history_entry jsonb;
begin
  if auth.uid() is null or company_uuid is null then
    raise exception 'Authentication and active company membership are required';
  end if;
  if not public.has_company_permission('manageInstallations') then
    raise exception 'Installation management permission is required';
  end if;

  select *
  into installation_row
  from public.operational_records
  where company_id = company_uuid
    and entity = 'installations'
    and record_id = p_installation_id
  for update;
  if not found then
    raise exception 'Installation not found in this company';
  end if;

  select coalesce(profile.full_name, ''), membership.role
  into actor_name, actor_role
  from public.profiles profile
  join public.company_members membership on membership.user_id = profile.id
  where profile.id = auth.uid()
    and membership.company_id = company_uuid
    and membership.active
  limit 1;

  history_entry := jsonb_build_object(
    'id', 'history-' || gen_random_uuid()::text,
    'actor', coalesce(actor_name, ''),
    'role', coalesce(actor_role, ''),
    'at', now(),
    'action', 'Instalação finalizada',
    'from', installation_row.data->>'status',
    'to', 'Concluída',
    'origin', 'Tela de Instalações'
  );

  update public.operational_records
  set data = jsonb_set(
      jsonb_set(installation_row.data, '{status}', to_jsonb('Concluída'::text), true),
      '{history}',
      coalesce(installation_row.data->'history', '[]'::jsonb) || jsonb_build_array(history_entry),
      true
    ),
    updated_at = now()
  where company_id = company_uuid
    and entity = 'installations'
    and record_id = p_installation_id;

  os_id := installation_row.data->>'osId';
  if coalesce(os_id, '') <> '' then
    select *
    into order_row
    from public.operational_records
    where company_id = company_uuid
      and entity = 'work_orders'
      and record_id = os_id
    for update;
    if not found then
      raise exception 'The installation is linked to an order that was not found in this company';
    end if;
    if nullif(installation_row.data->>'productionId', '') is null
      or installation_row.data->>'productionId' is distinct from order_row.data->>'productionId' then
      raise exception 'The installation is not linked to the production record for this order';
    end if;
    update public.operational_records
    set data = jsonb_set(
        jsonb_set(data, '{status}', to_jsonb('Concluída'::text), true),
        '{history}',
        coalesce(data->'history', '[]'::jsonb) || jsonb_build_array(
          history_entry || jsonb_build_object('action', 'Instalação concluída; OS arquivada')
        ),
        true
      ),
      updated_at = now()
    where company_id = company_uuid
      and entity = 'work_orders'
      and record_id = os_id;
    get diagnostics affected_orders = row_count;
    if affected_orders = 0 then
      raise exception 'The installation is linked to an order that was not found in this company';
    end if;
  end if;

  return jsonb_build_object('installation_id', p_installation_id, 'os_id', os_id);
end;
$$;

revoke all on function public.complete_installation(text) from public, anon;
grant execute on function public.complete_installation(text) to authenticated;

create or replace function public.create_supply_request(
  p_material text,
  p_quantity numeric,
  p_order_id text default '',
  p_notes text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  company_uuid uuid := public.my_company_id();
  actor_name text;
  actor_role text;
  request_id text := 'REQ-' || gen_random_uuid()::text;
  request_data jsonb;
  notification_id text := 'notification-REQ-' || gen_random_uuid()::text;
  created_at timestamptz := now();
begin
  if auth.uid() is null or company_uuid is null then
    raise exception 'Authentication and active company membership are required';
  end if;
  if not public.has_company_permission('requestMaterials') then
    raise exception 'Material request permission is required';
  end if;
  if p_material is null or length(trim(p_material)) not between 1 and 160
    or p_quantity is null or p_quantity <= 0 then
    raise exception 'A material and positive quantity are required';
  end if;

  select coalesce(profile.full_name, ''), membership.role
  into actor_name, actor_role
  from public.profiles profile
  join public.company_members membership on membership.user_id = profile.id
  where profile.id = auth.uid()
    and membership.company_id = company_uuid
    and membership.active
  limit 1;
  if actor_role is null then
    raise exception 'Active company membership required';
  end if;

  request_data := jsonb_build_object(
    'id', request_id,
    'requester', actor_name,
    'role', actor_role,
    'material', trim(p_material),
    'quantity', p_quantity,
    'orderId', coalesce(p_order_id, ''),
    'notes', coalesce(p_notes, ''),
    'createdAt', created_at,
    'status', 'Pendente'
  );
  insert into public.operational_records (company_id, entity, record_id, data)
  values (company_uuid, 'supply_requests', request_id, request_data);

  insert into public.operational_records (company_id, entity, record_id, data)
  values (
    company_uuid,
    'notifications',
    notification_id,
    jsonb_build_object(
      'id', notification_id,
      'title', 'Solicitação de material',
      'description', actor_name || ' (' || actor_role || ') solicitou ' || p_quantity || ' ' || trim(p_material)
        || case when coalesce(trim(p_order_id), '') = '' then '' else ' para ' || trim(p_order_id) end || '.',
      'createdAt', created_at,
      'type', 'Estoque',
      'read', false
    )
  );
  return request_data;
end;
$$;

revoke all on function public.create_supply_request(text, numeric, text, text) from public, anon;
grant execute on function public.create_supply_request(text, numeric, text, text) to authenticated;

create or replace function public.send_production_to_installation(
  p_production_id text,
  p_installation_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  company_uuid uuid := public.my_company_id();
  production_row public.operational_records%rowtype;
  existing_installation public.operational_records%rowtype;
  actor_name text;
  actor_role text;
  created_at timestamptz := now();
  installation_data jsonb;
  history_entry jsonb;
begin
  if auth.uid() is null or company_uuid is null then
    raise exception 'Authentication and active company membership are required';
  end if;
  if not public.has_company_permission('manageProduction')
    or not public.has_company_permission('changeProductionStatus') then
    raise exception 'Production status change permission is required';
  end if;
  if p_installation_id is null or p_installation_id !~ '^INST-[A-Za-z0-9-]{1,70}$' then
    raise exception 'A valid installation ID is required';
  end if;

  select *
  into production_row
  from public.operational_records
  where company_id = company_uuid
    and entity = 'production'
    and record_id = p_production_id
  for update;
  if not found then
    raise exception 'Production record not found in this company';
  end if;

  select *
  into existing_installation
  from public.operational_records
  where company_id = company_uuid
    and entity = 'installations'
    and data->>'productionId' = p_production_id
  limit 1;
  if found then
    return existing_installation.data;
  end if;
  if production_row.data->>'status' <> 'Pronto para instalar' then
    raise exception 'Production must be ready before it can be sent to installation';
  end if;

  select coalesce(profile.full_name, ''), membership.role
  into actor_name, actor_role
  from public.profiles profile
  join public.company_members membership on membership.user_id = profile.id
  where profile.id = auth.uid()
    and membership.company_id = company_uuid
    and membership.active
  limit 1;

  history_entry := jsonb_build_object(
    'id', 'history-' || gen_random_uuid()::text,
    'actor', coalesce(actor_name, ''),
    'role', coalesce(actor_role, ''),
    'at', created_at,
    'action', 'Instalação criada automaticamente',
    'to', 'Agendada',
    'origin', 'Tela de Produção'
  );
  installation_data := jsonb_build_object(
    'id', p_installation_id,
    'time', created_at,
    'customer', coalesce(production_row.data->>'clientName', ''),
    'address', '',
    'team', coalesce(nullif(production_row.data->>'responsible', ''), 'A definir'),
    'status', 'Agendada',
    'observations', coalesce(production_row.data->>'notes', ''),
    'photos', '[]'::jsonb,
    'productionId', p_production_id,
    'osId', coalesce(production_row.data->>'osId', ''),
    'quoteId', coalesce(production_row.data->>'quoteId', ''),
    'clientId', coalesce(production_row.data->>'clientId', ''),
    'history', jsonb_build_array(history_entry)
  );
  insert into public.operational_records (company_id, entity, record_id, data)
  values (company_uuid, 'installations', p_installation_id, installation_data);

  history_entry := jsonb_build_object(
    'id', 'history-' || gen_random_uuid()::text,
    'actor', coalesce(actor_name, ''),
    'role', coalesce(actor_role, ''),
    'at', created_at,
    'action', 'Produção enviada para instalação',
    'from', production_row.data->>'status',
    'to', 'Concluída',
    'origin', 'Tela de Produção'
  );
  update public.operational_records
  set data = jsonb_set(
      jsonb_set(production_row.data, '{status}', to_jsonb('Concluída'::text), true),
      '{history}',
      coalesce(production_row.data->'history', '[]'::jsonb) || jsonb_build_array(history_entry),
      true
    ),
    updated_at = now()
  where company_id = company_uuid
    and entity = 'production'
    and record_id = p_production_id;

  return installation_data;
end;
$$;

revoke all on function public.send_production_to_installation(text, text) from public, anon;
grant execute on function public.send_production_to_installation(text, text) to authenticated;

create or replace function public.send_work_order_to_production(
  p_work_order_id text,
  p_production_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  company_uuid uuid := public.my_company_id();
  order_row public.operational_records%rowtype;
  existing_production public.operational_records%rowtype;
  actor_name text;
  actor_role text;
  created_at timestamptz := now();
  production_data jsonb;
  history_entry jsonb;
begin
  if auth.uid() is null or company_uuid is null then
    raise exception 'Authentication and active company membership are required';
  end if;
  if not public.has_company_permission('sendProduction') then
    raise exception 'Sending work orders to production requires permission';
  end if;
  if p_production_id is null or p_production_id !~ '^OP-[A-Za-z0-9-]{1,70}$' then
    raise exception 'A valid production ID is required';
  end if;

  select *
  into order_row
  from public.operational_records
  where company_id = company_uuid
    and entity = 'work_orders'
    and record_id = p_work_order_id
  for update;
  if not found then
    raise exception 'Work order not found in this company';
  end if;
  if nullif(order_row.data->>'productionId', '') is not null then
    select *
    into existing_production
    from public.operational_records
    where company_id = company_uuid
      and entity = 'production'
      and record_id = order_row.data->>'productionId';
    if found then return existing_production.data; end if;
    raise exception 'Work order references a missing production record';
  end if;
  if order_row.data->>'status' in ('Concluída', 'Cancelada') then
    raise exception 'Completed or cancelled work orders cannot be sent to production';
  end if;

  select coalesce(profile.full_name, ''), membership.role
  into actor_name, actor_role
  from public.profiles profile
  join public.company_members membership on membership.user_id = profile.id
  where profile.id = auth.uid()
    and membership.company_id = company_uuid
    and membership.active
  limit 1;

  history_entry := jsonb_build_object(
    'id', 'history-' || gen_random_uuid()::text,
    'actor', coalesce(actor_name, ''),
    'role', coalesce(actor_role, ''),
    'at', created_at,
    'action', 'Serviço enviado para produção',
    'from', 'OS emitida',
    'to', 'Aguardando produção',
    'origin', 'Tela de OS'
  );
  production_data := jsonb_build_object(
    'id', p_production_id,
    'osId', p_work_order_id,
    'quoteId', coalesce(order_row.data->>'quoteId', ''),
    'clientId', coalesce(order_row.data->>'clientId', ''),
    'clientName', coalesce(order_row.data->>'clientName', ''),
    'model', coalesce(order_row.data->>'service', ''),
    'measurements', coalesce(order_row.data->>'measurements', ''),
    'materials', coalesce(order_row.data->>'materials', ''),
    'color', coalesce(order_row.data->>'color', ''),
    'finish', coalesce(order_row.data->>'finish', ''),
    'quantity', coalesce(order_row.data->'quantity', '1'::jsonb),
    'deadline', coalesce(order_row.data->>'deadline', ''),
    'responsible', coalesce(order_row.data->>'responsible', 'A definir'),
    'notes', coalesce(order_row.data->>'notes', ''),
    'status', 'Aguardando produção',
    'history', jsonb_build_array(history_entry)
  );

  insert into public.operational_records (company_id, entity, record_id, data)
  values (company_uuid, 'production', p_production_id, production_data);

  history_entry := jsonb_build_object(
    'id', 'history-' || gen_random_uuid()::text,
    'actor', coalesce(actor_name, ''),
    'role', coalesce(actor_role, ''),
    'at', created_at,
    'action', 'OS enviada para produção',
    'from', order_row.data->>'status',
    'to', 'Enviada para produção',
    'origin', 'Tela de OS'
  );
  update public.operational_records
  set data = jsonb_set(
      jsonb_set(
        jsonb_set(order_row.data, '{productionId}', to_jsonb(p_production_id), true),
        '{status}',
        to_jsonb('Enviada para produção'::text),
        true
      ),
      '{history}',
      coalesce(order_row.data->'history', '[]'::jsonb) || jsonb_build_array(history_entry),
      true
    ),
    updated_at = now()
  where company_id = company_uuid
    and entity = 'work_orders'
    and record_id = p_work_order_id;
  return production_data;
end;
$$;

revoke all on function public.send_work_order_to_production(text, text) from public, anon;
grant execute on function public.send_work_order_to_production(text, text) to authenticated;
