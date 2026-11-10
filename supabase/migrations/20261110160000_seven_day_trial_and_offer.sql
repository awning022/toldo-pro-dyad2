-- Preserve all accounts created before the seven-day trial rollout.
insert into public.billing_exempt_users (user_id, reason)
select u.id, 'Conta cadastrada antes da implantação do teste grátis de 7 dias; isenção preservada.'
from auth.users u
on conflict (user_id) do nothing;

create or replace function public.ensure_company_trial()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_company_id uuid;
  v_owner_id uuid;
  v_subscription public.company_subscriptions%rowtype;
  v_exempt boolean := false;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select cm.company_id into v_company_id
  from public.company_members cm
  where cm.user_id = v_user_id and cm.active = true
  order by cm.created_at asc limit 1;

  if v_company_id is null then
    raise exception 'No active company membership found';
  end if;

  select cm.user_id into v_owner_id
  from public.company_members cm
  where cm.company_id = v_company_id and cm.active = true and cm.role = 'Administrador'
  order by cm.created_at asc limit 1;

  v_owner_id := coalesce(v_owner_id, v_user_id);

  select exists (
    select 1 from public.billing_exempt_users be where be.user_id = v_owner_id
  ) into v_exempt;

  if v_exempt then
    return jsonb_build_object('is_exempt', true, 'company_id', v_company_id);
  end if;

  select * into v_subscription
  from public.company_subscriptions
  where company_id = v_company_id;

  if not found then
    insert into public.company_subscriptions (
      company_id, owner_user_id, provider, external_reference, status,
      plan_amount, currency, trial_started_at, trial_ends_at
    ) values (
      v_company_id, v_owner_id, 'mercadopago', v_company_id::text, 'trialing',
      199.99, 'BRL', now(), now() + interval '7 days'
    )
    returning * into v_subscription;
  elsif v_subscription.status = 'pending'
    and v_subscription.trial_started_at is null
    and v_subscription.provider_subscription_id is null then
    update public.company_subscriptions
    set status = 'trialing',
        plan_amount = 199.99,
        trial_started_at = now(),
        trial_ends_at = now() + interval '7 days',
        checkout_url = null,
        updated_at = now()
    where company_id = v_company_id
    returning * into v_subscription;
  end if;

  return jsonb_build_object(
    'is_exempt', false,
    'company_id', v_company_id,
    'status', v_subscription.status,
    'trial_started_at', v_subscription.trial_started_at,
    'trial_ends_at', v_subscription.trial_ends_at,
    'plan_amount', v_subscription.plan_amount,
    'checkout_url', v_subscription.checkout_url,
    'last_payment_status', v_subscription.last_payment_status
  );
end;
$$;

revoke all on function public.ensure_company_trial() from public, anon;
grant execute on function public.ensure_company_trial() to authenticated;
