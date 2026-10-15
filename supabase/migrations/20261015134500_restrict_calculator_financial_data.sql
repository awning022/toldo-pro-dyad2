-- Calculator records contain commercial prices, margins and suggested selling prices.
-- Production roles can operate on manufacturing data but must not read calculator costs.
drop policy if exists calculator_models_select_company on public.operational_records;
create policy calculator_models_select_company
on public.operational_records for select to authenticated
using (
  company_id = public.my_company_id()
  and entity = 'calculator_models'
  and (public.has_company_permission('manageQuotes') or public.has_company_permission('editRules'))
);

drop policy if exists calculator_projects_select_company on public.operational_records;
create policy calculator_projects_select_company
on public.operational_records for select to authenticated
using (
  company_id = public.my_company_id()
  and entity = 'calculator_projects'
  and (public.has_company_permission('manageQuotes') or public.has_company_permission('editRules'))
);

drop policy if exists calculator_projects_insert_company on public.operational_records;
create policy calculator_projects_insert_company
on public.operational_records for insert to authenticated
with check (
  company_id = public.my_company_id()
  and entity = 'calculator_projects'
  and (public.has_company_permission('manageQuotes') or public.has_company_permission('editRules'))
);

drop policy if exists calculator_projects_update_company on public.operational_records;
create policy calculator_projects_update_company
on public.operational_records for update to authenticated
using (
  company_id = public.my_company_id()
  and entity = 'calculator_projects'
  and (public.has_company_permission('manageQuotes') or public.has_company_permission('editRules'))
)
with check (
  company_id = public.my_company_id()
  and entity = 'calculator_projects'
  and (public.has_company_permission('manageQuotes') or public.has_company_permission('editRules'))
);

drop policy if exists calculator_projects_delete_company on public.operational_records;
create policy calculator_projects_delete_company
on public.operational_records for delete to authenticated
using (
  company_id = public.my_company_id()
  and entity = 'calculator_projects'
  and (public.has_company_permission('manageQuotes') or public.has_company_permission('editRules'))
);
