CREATE OR REPLACE FUNCTION public.record_stock_movement(p_material_id text, p_quantity numeric, p_type text, p_order_id text DEFAULT ''::text, p_notes text DEFAULT ''::text, p_area text DEFAULT 'estoque'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  company_uuid uuid := public.my_company_id();
  material_row public.operational_records%rowtype;
  current_quantity numeric;
  new_quantity numeric;
  minimum_quantity numeric;
  movement_id text := 'stock-' || gen_random_uuid()::text;
  movement_data jsonb;
  operation_record_id text;
  operation_data jsonb;
  operation_history jsonb;
  used_materials jsonb;
  usage_text text;
  member_role text;
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
  if p_area <> 'estoque' and p_type <> 'Saída' then
    raise exception 'Na produção e instalação só é permitido registrar consumo de material.';
  end if;

  if p_area = 'produção' then
    select r.record_id, r.data into operation_record_id, operation_data
    from public.operational_records r
    where r.company_id = company_uuid and r.entity = 'production'
      and (r.record_id = p_order_id or r.data->>'osId' = p_order_id)
    order by case when r.record_id = p_order_id then 0 else 1 end
    limit 1 for update;
    if operation_record_id is null then raise exception 'Produção não encontrada para vincular o consumo.'; end if;
    if coalesce(operation_data->>'status','') in ('Pronto para instalar','Concluída') then
      raise exception 'A produção já foi liberada ou concluída; não é possível registrar novo consumo.';
    end if;
  elsif p_area = 'instalação' then
    select r.record_id, r.data into operation_record_id, operation_data
    from public.operational_records r
    where r.company_id = company_uuid and r.entity = 'installations'
      and (r.record_id = p_order_id or r.data->>'osId' = p_order_id or r.data->>'productionId' = p_order_id)
    order by case when r.record_id = p_order_id then 0 else 1 end
    limit 1 for update;
    if operation_record_id is null then raise exception 'Instalação não encontrada para vincular o consumo.'; end if;
    if coalesce(operation_data->>'status','') = 'Concluída' then
      raise exception 'A instalação já foi concluída; não é possível registrar novo consumo.';
    end if;
  end if;

  select lower(coalesce(cm.role,'')) into member_role from public.company_members cm
  where cm.user_id = auth.uid() and cm.company_id = company_uuid and cm.active limit 1;

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

  if p_area in ('produção','instalação') and p_type = 'Saída' then
    usage_text := p_quantity::text || ' ' || coalesce(material_row.data->>'unit','un') || ' de ' || coalesce(material_row.data->>'name','material') || ' utilizados';
    operation_history := coalesce(operation_data->'history','[]'::jsonb) || jsonb_build_array(jsonb_build_object(
      'id','H-' || movement_id,
      'action','Material utilizado: ' || usage_text,
      'actor',auth.uid()::text,
      'role',member_role,
      'at',to_char(now() at time zone 'UTC','YYYY-MM-DD HH24:MI'),
      'origin',case when p_area='produção' then 'Tela de Produção' else 'Tela de Instalações' end,
      'from','Estoque',
      'to',usage_text
    ));
    if p_area = 'produção' then
      operation_data := jsonb_set(operation_data,'{materials}',to_jsonb(
        case when nullif(trim(coalesce(operation_data->>'materials','')),'') is null
          then usage_text
          else (operation_data->>'materials') || '; ' || usage_text
        end
      ),true);
    else
      if jsonb_typeof(operation_data->'materials') = 'array' then
        used_materials := operation_data->'materials';
      elsif nullif(trim(coalesce(operation_data->>'materials','')),'') is not null then
        used_materials := jsonb_build_array(operation_data->>'materials');
      else
        used_materials := '[]'::jsonb;
      end if;
      operation_data := jsonb_set(operation_data,'{materials}',used_materials || jsonb_build_array(usage_text),true);
    end if;
    operation_data := jsonb_set(operation_data,'{history}',operation_history,true);
    update public.operational_records set data=operation_data,updated_at=now()
    where company_id=company_uuid and entity=case when p_area='produção' then 'production' else 'installations' end
      and record_id=operation_record_id;
  end if;

  if p_type = 'Saída' and new_quantity < minimum_quantity then
    insert into public.operational_records(company_id, entity, record_id, data)
    values(company_uuid, 'notifications', 'low-stock-' || movement_id,
      jsonb_build_object('id','low-stock-' || movement_id,'title','Estoque abaixo do mínimo',
        'description',coalesce(material_row.data->>'name','Material') || ' ficou com ' || new_quantity || ' unidades disponíveis.',
        'createdAt',now(),'type','Estoque','read',false));
  end if;
  return movement_data;
end;
$function$;

revoke all on function public.record_stock_movement(text,numeric,text,text,text,text) from public, anon;
grant execute on function public.record_stock_movement(text,numeric,text,text,text,text) to authenticated;
