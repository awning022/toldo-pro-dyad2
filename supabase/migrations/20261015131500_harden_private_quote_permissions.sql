-- Prevent users who can only view finances from altering private quote values.
drop policy if exists operational_private_insert_company on public.operational_private_records;
create policy operational_private_insert_company
on public.operational_private_records for insert to authenticated
with check (
  company_id = public.my_company_id()
  and (
    (entity = 'finance' and public.has_company_permission('manageFinance'))
    or (entity = 'quotes' and public.has_company_permission('viewFinancial') and public.has_company_permission('manageQuotes'))
  )
);

drop policy if exists operational_private_update_company on public.operational_private_records;
create policy operational_private_update_company
on public.operational_private_records for update to authenticated
using (
  company_id = public.my_company_id()
  and (
    (entity = 'finance' and public.has_company_permission('manageFinance'))
    or (entity = 'quotes' and public.has_company_permission('viewFinancial') and public.has_company_permission('manageQuotes'))
  )
)
with check (
  company_id = public.my_company_id()
  and (
    (entity = 'finance' and public.has_company_permission('manageFinance'))
    or (entity = 'quotes' and public.has_company_permission('viewFinancial') and public.has_company_permission('manageQuotes'))
  )
);

drop policy if exists operational_private_delete_company on public.operational_private_records;
create policy operational_private_delete_company
on public.operational_private_records for delete to authenticated
using (
  company_id = public.my_company_id()
  and (
    (entity = 'finance' and public.has_company_permission('manageFinance'))
    or (entity = 'quotes' and public.has_company_permission('viewFinancial') and public.has_company_permission('manageQuotes'))
  )
);
