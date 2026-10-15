-- Allow company administrators to save company profile/settings through the app.
drop policy if exists companies_update_admin on public.companies;
create policy companies_update_admin
on public.companies for update to authenticated
using (id = public.my_company_id() and public.has_company_permission('editRules'))
with check (id = public.my_company_id() and public.has_company_permission('editRules'));
