-- The stock movement RPC writes its ledger entries to operational_records.
-- Allow the stock_movements entity so stock deductions can commit atomically.
ALTER TABLE public.operational_records
  DROP CONSTRAINT IF EXISTS operational_records_entity_check;

ALTER TABLE public.operational_records
  ADD CONSTRAINT operational_records_entity_check
  CHECK (entity = ANY (ARRAY[
    'customers'::text,
    'quotes'::text,
    'work_orders'::text,
    'production'::text,
    'installations'::text,
    'materials'::text,
    'stock_movements'::text,
    'notifications'::text,
    'agenda'::text,
    'leads'::text,
    'calculator_models'::text,
    'calculator_projects'::text
  ]));
