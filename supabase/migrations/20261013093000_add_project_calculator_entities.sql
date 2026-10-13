alter table public.operational_records
  drop constraint if exists operational_records_entity_check;

alter table public.operational_records
  add constraint operational_records_entity_check
  check (
    entity = any (array[
      'customers',
      'quotes',
      'work_orders',
      'production',
      'installations',
      'materials',
      'notifications',
      'agenda',
      'leads',
      'calculator_models',
      'calculator_projects'
    ]::text[])
  );

create policy calculator_models_select_company
on public.operational_records
for select
to authenticated
using (
  company_id = public.my_company_id()
  and entity = 'calculator_models'
  and (
    public.has_company_permission('manageQuotes')
    or public.has_company_permission('manageProduction')
    or public.has_company_permission('editRules')
  )
);

create policy calculator_models_insert_company
on public.operational_records
for insert
to authenticated
with check (
  company_id = public.my_company_id()
  and entity = 'calculator_models'
  and public.has_company_permission('editRules')
);

create policy calculator_models_update_company
on public.operational_records
for update
to authenticated
using (
  company_id = public.my_company_id()
  and entity = 'calculator_models'
  and public.has_company_permission('editRules')
)
with check (
  company_id = public.my_company_id()
  and entity = 'calculator_models'
  and public.has_company_permission('editRules')
);

create policy calculator_models_delete_company
on public.operational_records
for delete
to authenticated
using (
  company_id = public.my_company_id()
  and entity = 'calculator_models'
  and public.has_company_permission('editRules')
);

create policy calculator_projects_select_company
on public.operational_records
for select
to authenticated
using (
  company_id = public.my_company_id()
  and entity = 'calculator_projects'
  and (
    public.has_company_permission('manageQuotes')
    or public.has_company_permission('manageProduction')
    or public.has_company_permission('editRules')
  )
);

create policy calculator_projects_insert_company
on public.operational_records
for insert
to authenticated
with check (
  company_id = public.my_company_id()
  and entity = 'calculator_projects'
  and (
    public.has_company_permission('manageQuotes')
    or public.has_company_permission('manageProduction')
    or public.has_company_permission('editRules')
  )
);

create policy calculator_projects_update_company
on public.operational_records
for update
to authenticated
using (
  company_id = public.my_company_id()
  and entity = 'calculator_projects'
  and (
    public.has_company_permission('manageQuotes')
    or public.has_company_permission('manageProduction')
    or public.has_company_permission('editRules')
  )
)
with check (
  company_id = public.my_company_id()
  and entity = 'calculator_projects'
  and (
    public.has_company_permission('manageQuotes')
    or public.has_company_permission('manageProduction')
    or public.has_company_permission('editRules')
  )
);

create policy calculator_projects_delete_company
on public.operational_records
for delete
to authenticated
using (
  company_id = public.my_company_id()
  and entity = 'calculator_projects'
  and (
    public.has_company_permission('manageQuotes')
    or public.has_company_permission('manageProduction')
    or public.has_company_permission('editRules')
  )
);
