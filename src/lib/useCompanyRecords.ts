import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useCompanyAccess } from "@/lib/CompanyAccessContext";
import { supabase } from "@/lib/supabase";

type StoredRecord<T> = { record_id: string; data: T };
type PrivateRecord = { record_id: string; data: Record<string, unknown> };

const privateQuoteFields = ["cost", "margin", "finalValue"] as const;

function splitRecord<T extends { id: string }>(record: T) {
  const data = { ...record } as Record<string, unknown>;
  const privateData: Record<string, unknown> = {};
  for (const field of privateQuoteFields) {
    if (field in data) {
      privateData[field] = data[field];
      delete data[field];
    }
  }
  return { record_id: record.id, data, privateData };
}

function mergePrivateData<T extends { id: string }>(records: T[], privateRecords: PrivateRecord[]) {
  const privateById = new Map(privateRecords.map((record) => [record.record_id, record.data]));
  return records.map((record) => ({ ...record, ...(privateById.get(record.id) || {}) }));
}

export function useCompanyRecords<T extends { id: string }>(entity: string, options: { enabled?: boolean } = {}) {
  const { companyId, can } = useCompanyAccess();
  const enabled = options.enabled ?? true;
  const [records, setState] = useState<T[]>([]);
  const recordsRef = useRef<T[]>([]);
  const [ready, setReady] = useState(false);
  const canViewFinancial = can("viewFinancial");
  const canEditFinance = can("manageFinance");

  const load = useCallback(async () => {
    if (!enabled) {
      recordsRef.current = [];
      setState([]);
      setReady(true);
      return;
    }
    if (!supabase) return;
    setReady(false);
    recordsRef.current = [];
    setState([]);
    if (entity === "finance") {
      if (!canViewFinancial) {
        recordsRef.current = [];
        setState([]);
        setReady(true);
        return;
      }
      const { data, error } = await supabase
        .from("operational_private_records")
        .select("record_id, data")
        .eq("company_id", companyId)
        .eq("entity", "finance")
        .order("updated_at", { ascending: false });
      if (error) {
        toast.error("Não foi possível carregar os lançamentos financeiros.");
        setReady(true);
        return;
      }
      const loaded = (data || []).map((row) => ({ ...row.data, id: row.record_id })) as T[];
      recordsRef.current = loaded;
      setState(loaded);
      setReady(true);
      return;
    }

    const { data, error } = await supabase
      .from("operational_records")
      .select("record_id, data")
      .eq("company_id", companyId)
      .eq("entity", entity)
      .order("updated_at", { ascending: false });
    if (error) {
      toast.error("Não foi possível carregar os registros desta área.");
      setReady(true);
      return;
    }

    let loaded = (data || []).map((row: StoredRecord<T>) => ({ ...row.data, id: row.record_id })) as T[];
    if (entity === "quotes" && canViewFinancial) {
      const { data: privateRows, error: privateError } = await supabase
        .from("operational_private_records")
        .select("record_id, data")
        .eq("company_id", companyId)
        .eq("entity", "quotes");
      if (privateError) {
        toast.error("Não foi possível carregar os dados financeiros dos orçamentos.");
        setReady(true);
        return;
      }
      loaded = mergePrivateData(loaded, privateRows || []);
    }
    recordsRef.current = loaded;
    setState(loaded);
    setReady(true);
  }, [canViewFinancial, companyId, enabled, entity]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = useCallback(async (next: T[], previous: T[]) => {
    if (!supabase) return;
    if (!enabled) return;
    const previousById = new Map(previous.map((record) => [record.id, record]));
    const nextById = new Map(next.map((record) => [record.id, record]));
    const changed = next.filter((record) => JSON.stringify(previousById.get(record.id)) !== JSON.stringify(record));
    const removed = previous.filter((record) => !nextById.has(record.id));

    if (entity === "finance") {
      if (!canEditFinance) {
        toast.error("Seu cargo não pode editar lançamentos financeiros.");
        void load();
        return;
      }
      if (changed.length) {
        const { error } = await supabase.from("operational_private_records").upsert(
          changed.map((record) => ({ company_id: companyId, entity, record_id: record.id, data: record })),
          { onConflict: "company_id,entity,record_id" },
        );
        if (error) {
          toast.error("Não foi possível salvar os lançamentos. Confira sua permissão.");
          void load();
          return;
        }
      }
      if (removed.length) {
        const { error } = await supabase.from("operational_private_records").delete()
          .eq("company_id", companyId).eq("entity", entity).in("record_id", removed.map((record) => record.id));
        if (error) {
          toast.error("Não foi possível excluir os lançamentos financeiros.");
          void load();
        }
      }
      return;
    }

    if (changed.length) {
      const rows = changed.map((record) => {
        const { privateData, ...publicRecord } = splitRecord(record);
        return { publicRecord, privateData };
      });
      const { error } = await supabase.from("operational_records").upsert(
        rows.map(({ publicRecord }) => ({
          company_id: companyId,
          entity,
          record_id: publicRecord.record_id,
          data: publicRecord.data,
        })),
        { onConflict: "company_id,entity,record_id" },
      );
      if (error) {
        toast.error("Não foi possível salvar as alterações. Confira as permissões do seu cargo.");
        void load();
        return;
      }

      const privateRows = rows.filter((row) => Object.keys(row.privateData).length > 0);
      if (entity === "quotes" && privateRows.length) {
        if (!canViewFinancial) {
          toast.error("Seu cargo não pode alterar valores financeiros.");
          void load();
          return;
        }
        const { error: privateError } = await supabase.from("operational_private_records").upsert(
          privateRows.map((row) => ({
            company_id: companyId,
            entity: "quotes",
            record_id: row.publicRecord.record_id,
            data: row.privateData,
          })),
          { onConflict: "company_id,entity,record_id" },
        );
        if (privateError) {
          toast.error("Os dados operacionais foram salvos, mas os valores financeiros não foram atualizados.");
          void load();
          return;
        }
      }
    }

    if (removed.length) {
      const ids = removed.map((record) => record.id);
      const { error } = await supabase.from("operational_records").delete()
        .eq("company_id", companyId).eq("entity", entity).in("record_id", ids);
      if (error) {
        toast.error("Não foi possível excluir os registros. Confira sua permissão.");
        void load();
        return;
      }
      if (entity === "quotes" && canViewFinancial) {
        const { error: privateError } = await supabase.from("operational_private_records").delete()
          .eq("company_id", companyId).eq("entity", "quotes").in("record_id", ids);
        if (privateError) toast.error("Os registros foram removidos, mas alguns dados financeiros antigos permaneceram.");
      }
    }
  }, [canEditFinance, canViewFinancial, companyId, enabled, entity, load]);

  const setRecords = useCallback((update: T[] | ((current: T[]) => T[])) => {
    if (!ready) {
      toast.info("Aguarde o carregamento dos registros antes de salvar.");
      return;
    }
    const previous = recordsRef.current;
    const next = typeof update === "function" ? update(previous) : update;
    recordsRef.current = next;
    setState(next);
    void save(next, previous);
  }, [ready, save]);

  return { records, setRecords, ready, reload: load };
}
