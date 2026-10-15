CREATE OR REPLACE FUNCTION public.issue_work_order_from_quote(p_quote_id text, p_work_order_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_company_id uuid := public.my_company_id();
  v_member_role text;
  v_quote jsonb;
  v_client jsonb;
  v_client_id text;
  v_order jsonb;
  v_order_id text;
  v_now timestamptz := now();
  v_quote_history jsonb;
  v_client_history jsonb;
begin
  if auth.uid() is null or v_company_id is null then raise exception 'É necessário estar autenticado e vinculado a uma empresa.'; end if;
  if not public.has_company_permission('issueOS')
    or not public.has_company_permission('manageQuotes')
    or not public.has_company_permission('manageCustomers') then
    raise exception 'Seu perfil não pode emitir uma ordem de serviço.';
  end if;
  if coalesce(trim(p_quote_id),'')='' or coalesce(trim(p_work_order_id),'')='' then raise exception 'Orçamento e identificador da O.S. são obrigatórios.'; end if;
  select lower(coalesce(cm.role,'')) into v_member_role from public.company_members cm
  where cm.user_id=auth.uid() and cm.company_id=v_company_id and cm.active limit 1;

  select r.data into v_quote from public.operational_records r
  where r.company_id=v_company_id and r.entity='quotes' and r.record_id=p_quote_id for update;
  if v_quote is null then raise exception 'Orçamento não encontrado nesta empresa.'; end if;
  if coalesce(v_quote->>'status','') <> 'Aprovado' then raise exception 'A O.S. só pode ser emitida para um orçamento aprovado.'; end if;

  select r.record_id,r.data into v_order_id,v_order from public.operational_records r
  where r.company_id=v_company_id and r.entity='work_orders' and r.data->>'quoteId'=p_quote_id
  limit 1 for update;
  if v_order_id is not null then
    if coalesce(v_quote->>'osId','') <> v_order_id then
      v_quote_history := coalesce(v_quote->'history','[]'::jsonb) || jsonb_build_array(jsonb_build_object(
        'id','H-'||floor(extract(epoch from v_now)::bigint)::text,
        'action','Vínculo de O.S. recuperado','actor',auth.uid()::text,'role',v_member_role,
        'at',to_char(v_now at time zone 'UTC','YYYY-MM-DD HH24:MI'),'origin','Emissão de O.S.',
        'from',coalesce(v_quote->>'osId',''),'to',v_order_id
      ));
      update public.operational_records set data=jsonb_set(jsonb_set(v_quote,'{osId}',to_jsonb(v_order_id),true),'{history}',v_quote_history,true),updated_at=v_now
      where company_id=v_company_id and entity='quotes' and record_id=p_quote_id;
    end if;
    return jsonb_build_object('success',true,'quote_id',p_quote_id,'work_order_id',v_order_id,'already_issued',true);
  end if;
  if coalesce(v_quote->>'osId','') <> '' then raise exception 'O orçamento aponta para uma O.S. que não foi encontrada.'; end if;

  select r.record_id,r.data into v_client_id,v_client from public.operational_records r
  where r.company_id=v_company_id and r.entity='customers'
    and (
      r.record_id=coalesce(nullif(v_quote->>'clientId',''),'')
      or r.data->>'sourceQuoteId'=p_quote_id
      or r.data->>'quoteId'=p_quote_id
    )
  order by case when r.record_id=coalesce(nullif(v_quote->>'clientId',''),'') then 0 else 1 end
  limit 1 for update;
  if v_client_id is null then raise exception 'Converta o orçamento em cliente antes de emitir a O.S.'; end if;
  if coalesce(v_quote->>'measurements','')='' or coalesce(v_quote->>'materials','')='' then raise exception 'Preencha medidas e materiais antes de emitir a O.S.'; end if;
  if exists(select 1 from public.operational_records r where r.company_id=v_company_id and r.entity='work_orders' and r.record_id=p_work_order_id) then
    raise exception 'O identificador da O.S. já está em uso. Atualize a tela e tente novamente.';
  end if;

  v_order := jsonb_build_object(
    'id',p_work_order_id,'clientId',v_client_id,'clientName',coalesce(v_client->>'name',v_quote->>'customerName','Cliente sem nome'),
    'quoteId',p_quote_id,'service',coalesce(v_quote->>'productModel','Toldo a definir'),
    'measurements',v_quote->>'measurements','materials',v_quote->>'materials',
    'quantity',coalesce(nullif(v_quote->>'quantity','')::integer,1),
    'color',coalesce(v_quote->>'color','A definir'),'finish',coalesce(v_quote->>'finish','A definir'),
    'deadline',coalesce(v_quote->>'validUntil','A definir'),'notes',coalesce(v_quote->>'notes',''),
    'responsible','A definir','priority','Normal','status','Emitida',
    'history',jsonb_build_array(jsonb_build_object(
      'id','H-'||floor(extract(epoch from v_now)::bigint)::text,
      'action','OS emitida a partir do orçamento','actor',auth.uid()::text,'role',v_member_role,
      'at',to_char(v_now at time zone 'UTC','YYYY-MM-DD HH24:MI'),'origin','Emissão de O.S.',
      'from','Aprovado','to','Emitida'
    ))
  );
  insert into public.operational_records(company_id,entity,record_id,data)
  values(v_company_id,'work_orders',p_work_order_id,v_order);

  v_quote_history := coalesce(v_quote->'history','[]'::jsonb) || jsonb_build_array(jsonb_build_object(
    'id','H-'||floor(extract(epoch from v_now)::bigint)::text||'-quote',
    'action','OS emitida','actor',auth.uid()::text,'role',v_member_role,
    'at',to_char(v_now at time zone 'UTC','YYYY-MM-DD HH24:MI'),'origin','Emissão de O.S.',
    'from',coalesce(v_quote->>'status','Aprovado'),'to','OS emitida'
  ));
  update public.operational_records set data=jsonb_set(
    jsonb_set(jsonb_set(v_quote,'{osId}',to_jsonb(p_work_order_id),true),'{clientId}',to_jsonb(v_client_id),true),
    '{history}',v_quote_history,true),updated_at=v_now
  where company_id=v_company_id and entity='quotes' and record_id=p_quote_id;
  update public.operational_records set data=jsonb_set(jsonb_set(v_client,'{osId}',to_jsonb(p_work_order_id),true),
    '{history}',coalesce(v_client->'history','[]'::jsonb) || jsonb_build_array(jsonb_build_object(
      'id','H-'||floor(extract(epoch from v_now)::bigint)::text||'-client',
      'action','OS vinculada ao cadastro','actor',auth.uid()::text,'role',v_member_role,
      'at',to_char(v_now at time zone 'UTC','YYYY-MM-DD HH24:MI'),'origin','Emissão de O.S.',
      'from',coalesce(v_client->>'osId',''),'to',p_work_order_id
    )),true),updated_at=v_now
  where company_id=v_company_id and entity='customers' and record_id=v_client_id;
  return jsonb_build_object('success',true,'quote_id',p_quote_id,'work_order_id',p_work_order_id,'client_id',v_client_id,'already_issued',false);
end;
$function$;

revoke all on function public.issue_work_order_from_quote(text,text) from public, anon;
grant execute on function public.issue_work_order_from_quote(text,text) to authenticated;
