-- Repair stock and operational workflow RPCs, align installation payloads, and tighten grants.
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
  if auth.uid() is null or company_uuid is null then raise exception 'É necessário estar autenticado e vinculado a uma empresa.'; end if;
  if p_quantity is null or p_quantity <= 0 or p_type is null or p_type not in ('Entrada', 'Saída') then
    raise exception 'Informe quantidade positiva e tipo de movimentação válido.';
  end if;
  if p_area = 'produção' then
    if not public.has_company_permission('manageProduction') then raise exception 'Sem permissão para movimentar estoque na produção.'; end if;
  elsif p_area = 'instalação' then
    if not public.has_company_permission('manageInstallations') then raise exception 'Sem permissão para movimentar estoque na instalação.'; end if;
  elsif p_area = 'estoque' then
    if not public.has_company_permission('manageStock') then raise exception 'Sem permissão para gerenciar estoque.'; end if;
  else
    raise exception 'Área de movimentação inválida.';
  end if;

  select * into material_row from public.operational_records
  where company_id = company_uuid and entity = 'materials' and record_id = p_material_id for update;
  if not found then raise exception 'Material não encontrado nesta empresa.'; end if;

  current_quantity := coalesce(nullif(material_row.data->>'quantity','')::numeric, 0);
  minimum_quantity := coalesce(nullif(material_row.data->>'minimum','')::numeric, 0);
  new_quantity := case when p_type = 'Entrada' then current_quantity + p_quantity else current_quantity - p_quantity end;
  if new_quantity < 0 then raise exception 'Saldo insuficiente para esta saída.'; end if;

  update public.operational_records
  set data = jsonb_set(material_row.data, '{quantity}', to_jsonb(new_quantity), true), updated_at = now()
  where company_id = company_uuid and entity = 'materials' and record_id = p_material_id;

  movement_data := jsonb_build_object(
    'id', movement_id, 'materialId', p_material_id,
    'materialName', coalesce(material_row.data->>'name',''),
    'type', p_type, 'quantity', p_quantity, 'orderId', coalesce(p_order_id,''),
    'at', now(), 'notes', coalesce(p_notes,'')
  );
  insert into public.operational_records(company_id, entity, record_id, data)
  values(company_uuid, 'stock_movements', movement_id, movement_data);

  if p_type = 'Saída' and new_quantity < minimum_quantity then
    insert into public.operational_records(company_id, entity, record_id, data)
    values(company_uuid, 'notifications', 'low-stock-' || movement_id,
      jsonb_build_object('id','low-stock-' || movement_id,'title','Estoque abaixo do mínimo',
        'description',coalesce(material_row.data->>'name','Material') || ' ficou com ' || new_quantity || ' unidades disponíveis.',
        'createdAt',now(),'type','Estoque','read',false));
  end if;
  return movement_data;
end;
$$;

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
  if auth.uid() is null or company_uuid is null then raise exception 'É necessário estar autenticado e vinculado a uma empresa.'; end if;
  if not public.has_company_permission('requestMaterials') then raise exception 'Seu perfil não pode solicitar materiais.'; end if;
  if p_material is null or length(trim(p_material)) not between 1 and 160 or p_quantity is null or p_quantity <= 0 then
    raise exception 'Informe material e quantidade positiva.';
  end if;
  select coalesce(profile.full_name,''), membership.role into actor_name, actor_role
  from public.profiles profile join public.company_members membership on membership.user_id = profile.id
  where profile.id = auth.uid() and membership.company_id = company_uuid and membership.active limit 1;
  if actor_role is null then raise exception 'Vínculo ativo com a empresa obrigatório.'; end if;

  request_data := jsonb_build_object('id',request_id,'requester',actor_name,'role',actor_role,'material',trim(p_material),
    'quantity',p_quantity,'orderId',coalesce(p_order_id,''),'notes',coalesce(p_notes,''),'createdAt',created_at,'status','Pendente');
  insert into public.operational_records(company_id,entity,record_id,data)
  values(company_uuid,'supply_requests',request_id,request_data);
  insert into public.operational_records(company_id,entity,record_id,data)
  values(company_uuid,'notifications',notification_id,
    jsonb_build_object('id',notification_id,'title','Solicitação de material',
      'description',actor_name || ' (' || actor_role || ') solicitou ' || p_quantity || ' ' || trim(p_material)
        || case when coalesce(trim(p_order_id),'') = '' then '' else ' para ' || trim(p_order_id) end || '.',
      'createdAt',created_at,'type','Estoque','read',false));
  return request_data;
end;
$$;

drop policy if exists operational_stock_movements_select_company on public.operational_records;
create policy operational_stock_movements_select_company on public.operational_records for select to authenticated
using (company_id = public.my_company_id() and entity = 'stock_movements' and
  (public.has_company_permission('manageStock') or public.has_company_permission('manageProduction') or public.has_company_permission('manageInstallations')));

drop policy if exists operational_supply_requests_select_company on public.operational_records;
create policy operational_supply_requests_select_company on public.operational_records for select to authenticated
using (company_id = public.my_company_id() and entity = 'supply_requests' and
  (public.has_company_permission('manageStock') or public.has_company_permission('requestMaterials')));

drop policy if exists operational_supply_requests_insert_company on public.operational_records;
create policy operational_supply_requests_insert_company on public.operational_records for insert to authenticated
with check (company_id = public.my_company_id() and entity = 'supply_requests' and public.has_company_permission('manageStock'));

drop policy if exists operational_supply_requests_update_company on public.operational_records;
create policy operational_supply_requests_update_company on public.operational_records for update to authenticated
using (company_id = public.my_company_id() and entity = 'supply_requests' and public.has_company_permission('manageStock'))
with check (company_id = public.my_company_id() and entity = 'supply_requests' and public.has_company_permission('manageStock'));

create or replace function public.send_work_order_to_production(p_work_order_id text, p_production_id text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_company_id uuid; v_member_role text; v_order jsonb; v_existing jsonb; v_production jsonb; v_now timestamptz := now();
begin
  if auth.uid() is null then raise exception 'É necessário estar autenticado.'; end if;
  select cm.company_id, lower(coalesce(cm.role,'')) into v_company_id, v_member_role
  from public.company_members cm where cm.user_id = auth.uid() and cm.active = true order by cm.created_at asc limit 1;
  if v_company_id is null then raise exception 'Usuário não possui vínculo ativo com uma empresa.'; end if;
  if not public.has_company_permission('sendProduction') then raise exception 'Seu perfil não pode enviar a O.S. para produção.'; end if;
  if coalesce(trim(p_work_order_id),'') = '' or coalesce(trim(p_production_id),'') = '' then raise exception 'Identificador da O.S. e da produção são obrigatórios.'; end if;
  select r.data into v_order from public.operational_records r where r.company_id=v_company_id and r.entity='work_orders' and r.record_id=p_work_order_id for update;
  if v_order is null then raise exception 'A O.S. não foi encontrada nesta empresa.'; end if;
  if coalesce(v_order->>'status','') <> 'Emitida' then raise exception 'Somente uma O.S. emitida pode ser enviada para produção.'; end if;
  if coalesce(v_order->>'productionId','') <> '' then raise exception 'Esta O.S. já foi enviada para produção.'; end if;
  if coalesce(trim(v_order->>'measurements'),'') = '' or coalesce(trim(v_order->>'materials'),'') = '' then raise exception 'A O.S. precisa ter medidas e materiais preenchidos.'; end if;
  select r.data into v_existing from public.operational_records r where r.company_id=v_company_id and r.entity='production'
    and (r.record_id=p_production_id or r.data->>'osId'=p_work_order_id) limit 1;
  if v_existing is not null then raise exception 'Já existe um registro de produção para esta O.S.'; end if;
  v_production := jsonb_build_object('id',p_production_id,'osId',p_work_order_id,'quoteId',coalesce(v_order->>'quoteId',''),
    'clientId',coalesce(v_order->>'clientId',''),'clientName',coalesce(v_order->>'clientName','Cliente sem nome'),
    'model',coalesce(v_order->>'service','Toldo a definir'),'measurements',coalesce(v_order->>'measurements',''),
    'materials',coalesce(v_order->>'materials',''),'color',coalesce(v_order->>'color','A definir'),
    'finish',coalesce(v_order->>'finish','A definir'),'quantity',coalesce(nullif(v_order->>'quantity','')::integer,1),
    'deadline',coalesce(v_order->>'deadline','A definir'),'responsible',coalesce(v_order->>'responsible','A definir'),
    'notes',coalesce(v_order->>'notes',''),'status','Aguardando produção',
    'history',jsonb_build_array(jsonb_build_object('id','H-'||floor(extract(epoch from v_now)::bigint)::text,
      'action','OS recebida na produção','actor',auth.uid()::text,'role',v_member_role,
      'at',to_char(v_now at time zone 'UTC','YYYY-MM-DD HH24:MI'),'origin','Ordem de Serviço','from','Emitida','to','Aguardando produção')));
  insert into public.operational_records(company_id,entity,record_id,data) values(v_company_id,'production',p_production_id,v_production);
  update public.operational_records set data=jsonb_set(jsonb_set(jsonb_set(data,'{productionId}',to_jsonb(p_production_id),true),
    '{status}',to_jsonb('Enviada para produção'::text),true),
    '{history}',coalesce(data->'history','[]'::jsonb)||jsonb_build_array(jsonb_build_object(
      'id','H-'||floor(extract(epoch from v_now)::bigint)::text||'-os','action','O.S. enviada para produção',
      'actor',auth.uid()::text,'role',v_member_role,'at',to_char(v_now at time zone 'UTC','YYYY-MM-DD HH24:MI'),
      'origin','Ordens de serviço','from','Emitida','to','Enviada para produção')),true),updated_at=v_now
  where company_id=v_company_id and entity='work_orders' and record_id=p_work_order_id;
  return jsonb_build_object('success',true,'production_id',p_production_id,'work_order_id',p_work_order_id);
end;
$$;

create or replace function public.send_production_to_installation(p_production_id text, p_installation_id text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_company_id uuid; v_member_role text; v_production jsonb; v_existing jsonb; v_installation jsonb; v_client jsonb; v_now timestamptz := now();
begin
  if auth.uid() is null then raise exception 'É necessário estar autenticado.'; end if;
  select cm.company_id, lower(coalesce(cm.role,'')) into v_company_id, v_member_role
  from public.company_members cm where cm.user_id=auth.uid() and cm.active=true order by cm.created_at asc limit 1;
  if v_company_id is null then raise exception 'Usuário não possui vínculo ativo com uma empresa.'; end if;
  if not public.has_company_permission('changeProductionStatus') then raise exception 'Seu perfil não pode enviar produção para instalação.'; end if;
  if coalesce(trim(p_production_id),'')='' or coalesce(trim(p_installation_id),'')='' then raise exception 'Identificador da produção e da instalação são obrigatórios.'; end if;
  select r.data into v_production from public.operational_records r where r.company_id=v_company_id and r.entity='production' and r.record_id=p_production_id for update;
  if v_production is null then raise exception 'Registro de produção não encontrado nesta empresa.'; end if;
  if coalesce(v_production->>'status','') <> 'Pronto para instalar' then raise exception 'A produção precisa estar pronta para instalação antes do envio.'; end if;
  select r.data into v_existing from public.operational_records r where r.company_id=v_company_id and r.entity in ('installations','installation')
    and (r.record_id=p_installation_id or r.data->>'productionId'=p_production_id or r.data->>'production_id'=p_production_id) limit 1;
  if v_existing is not null then raise exception 'Esta produção já possui um registro de instalação.'; end if;
  select r.data into v_client from public.operational_records r where r.company_id=v_company_id and r.entity='customers'
    and r.record_id=coalesce(v_production->>'clientId','') limit 1;
  v_installation := jsonb_build_object('id',p_installation_id,
    'time',coalesce(nullif(v_production->>'deadline',''),'A definir'),
    'customer',coalesce(v_production->>'clientName','Cliente sem nome'),
    'address',coalesce(v_client->>'address',''),
    'team',coalesce(nullif(v_production->>'responsible',''),'A definir'),
    'status','Agendada','materials','[]'::jsonb,
    'requiredMaterials',coalesce(v_production->>'materials',''),
    'productionId',p_production_id,'osId',coalesce(v_production->>'osId',''),
    'clientId',coalesce(v_production->>'clientId',''),'quoteId',coalesce(v_production->>'quoteId',''),
    'history',jsonb_build_array(jsonb_build_object('id','H-'||floor(extract(epoch from v_now)::bigint)::text,
      'action','Produção enviada para instalação','actor',auth.uid()::text,'role',v_member_role,
      'at',to_char(v_now at time zone 'UTC','YYYY-MM-DD HH24:MI'),'origin','Produção','from','Pronto para instalar','to','Agendada')));
  insert into public.operational_records(company_id,entity,record_id,data) values(v_company_id,'installations',p_installation_id,v_installation);
  update public.operational_records set data=jsonb_set(jsonb_set(data,'{status}',to_jsonb('Enviada para instalação'::text),true),
    '{history}',coalesce(data->'history','[]'::jsonb)||jsonb_build_array(jsonb_build_object(
      'id','H-'||floor(extract(epoch from v_now)::bigint)::text||'-prod','action','Produção enviada para instalação',
      'actor',auth.uid()::text,'role',v_member_role,'at',to_char(v_now at time zone 'UTC','YYYY-MM-DD HH24:MI'),
      'origin','Produção','from','Pronto para instalar','to','Enviada para instalação')),true),updated_at=v_now
  where company_id=v_company_id and entity='production' and record_id=p_production_id;
  return jsonb_build_object('success',true,'production_id',p_production_id,'installation_id',p_installation_id,'status','Agendada');
end;
$$;

create or replace function public.complete_installation_and_close_work_order(p_installation_id text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_company_id uuid; v_member_role text; v_installation jsonb; v_order jsonb; v_os_id text; v_status text; v_now timestamptz := now(); v_history jsonb;
begin
  if auth.uid() is null then raise exception 'É necessário estar autenticado.'; end if;
  select cm.company_id, lower(coalesce(cm.role,'')) into v_company_id, v_member_role
  from public.company_members cm where cm.user_id=auth.uid() and cm.active=true order by cm.created_at asc limit 1;
  if v_company_id is null then raise exception 'Usuário não possui vínculo ativo com uma empresa.'; end if;
  if not public.has_company_permission('manageInstallations') then raise exception 'Seu perfil não pode concluir instalações.'; end if;
  if coalesce(trim(p_installation_id),'')='' then raise exception 'O identificador da instalação é obrigatório.'; end if;
  select r.data into v_installation from public.operational_records r where r.company_id=v_company_id and r.entity in ('installations','installation') and r.record_id=p_installation_id for update;
  if v_installation is null then raise exception 'Instalação não encontrada nesta empresa.'; end if;
  v_status := coalesce(v_installation->>'status',''); v_os_id := coalesce(v_installation->>'osId','');
  if v_os_id='' then raise exception 'A instalação não está vinculada a uma O.S.'; end if;
  select r.data into v_order from public.operational_records r where r.company_id=v_company_id and r.entity='work_orders' and r.record_id=v_os_id for update;
  if v_order is null then raise exception 'A O.S. vinculada à instalação não foi encontrada.'; end if;
  if v_status='Concluída' and coalesce(v_order->>'status','')='Concluída' then
    return jsonb_build_object('success',true,'installation_id',p_installation_id,'work_order_id',v_os_id,'status','Concluída','already_completed',true);
  end if;
  if v_status <> 'Instalando' then raise exception 'A instalação precisa estar no status Instalando antes de ser concluída.'; end if;
  if jsonb_typeof(v_installation->'materials') is distinct from 'array' then raise exception 'Registre os materiais efetivamente utilizados antes de concluir a instalação.'; end if;
  if jsonb_array_length(v_installation->'materials')=0 then raise exception 'Registre os materiais efetivamente utilizados antes de concluir a instalação.'; end if;
  v_history := coalesce(v_installation->'history','[]'::jsonb)||jsonb_build_array(jsonb_build_object(
    'id','H-'||floor(extract(epoch from v_now)::bigint)::text,'action','Instalação concluída e O.S. finalizada',
    'actor',auth.uid()::text,'role',v_member_role,'at',to_char(v_now at time zone 'UTC','YYYY-MM-DD HH24:MI'),
    'origin','Tela de Instalações','from',v_status,'to','Concluída'));
  update public.operational_records set data=jsonb_set(jsonb_set(v_installation,'{status}',to_jsonb('Concluída'::text),true),'{history}',v_history,true),updated_at=v_now
  where company_id=v_company_id and entity in ('installations','installation') and record_id=p_installation_id;
  v_history := coalesce(v_order->'history','[]'::jsonb)||jsonb_build_array(jsonb_build_object(
    'id','H-'||floor(extract(epoch from v_now)::bigint)::text||'-os','action','O.S. concluída após instalação',
    'actor',auth.uid()::text,'role',v_member_role,'at',to_char(v_now at time zone 'UTC','YYYY-MM-DD HH24:MI'),
    'origin','Tela de Instalações','from',coalesce(v_order->>'status','Em andamento'),'to','Concluída'));
  update public.operational_records set data=jsonb_set(jsonb_set(v_order,'{status}',to_jsonb('Concluída'::text),true),'{history}',v_history,true),updated_at=v_now
  where company_id=v_company_id and entity='work_orders' and record_id=v_os_id;
  return jsonb_build_object('success',true,'installation_id',p_installation_id,'work_order_id',v_os_id,'status','Concluída');
end;
$$;

revoke all on function public.record_stock_movement(text,numeric,text,text,text,text) from public, anon;
grant execute on function public.record_stock_movement(text,numeric,text,text,text,text) to authenticated;
revoke all on function public.create_supply_request(text,numeric,text,text) from public, anon;
grant execute on function public.create_supply_request(text,numeric,text,text) to authenticated;
revoke all on function public.send_work_order_to_production(text,text) from public, anon;
grant execute on function public.send_work_order_to_production(text,text) to authenticated;
revoke all on function public.send_production_to_installation(text,text) from public, anon;
grant execute on function public.send_production_to_installation(text,text) to authenticated;
revoke all on function public.complete_installation_and_close_work_order(text) from public, anon;
grant execute on function public.complete_installation_and_close_work_order(text) to authenticated;
