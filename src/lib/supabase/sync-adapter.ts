// Adaptador de sincronização com Supabase (Postgres + RLS).
// Implementa a interface SyncAdapter: envia a outbox e puxa mudanças da nuvem.
// O isolamento por loja é garantido pelo RLS — só trafegam dados do tenant.

import type { SyncAdapter, Change, PushResult, PullResult, SyncEntity } from "@/lib/sync/types";
import { getSupabase, isSupabaseConfigured } from "./client";
import { getCurrentTenantId } from "./auth";

const RECORD_TABLES = new Set<SyncEntity>(["proposals", "stock", "clientes"]);
const SETTINGS_KEYS = new Set<SyncEntity>(["modelos", "cores", "vars", "empresa"]);

const msOf = (iso: string) => {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? 0 : t;
};

export const SupabaseSyncAdapter: SyncAdapter = {
  name: "supabase",

  isConfigured() {
    // Só sincroniza quando há backend E usuário logado numa loja (tenant).
    return isSupabaseConfigured() && Boolean(getCurrentTenantId());
  },

  async push(changes: Change[]): Promise<PushResult> {
    const sb = getSupabase();
    const tenantId = getCurrentTenantId();
    if (!sb || !tenantId) return { ok: false, acceptedIds: [] };

    // Agrupa por tabela para enviar em lote.
    const recordRows: Record<string, { tenant_id: string; id: string; data: unknown; deleted: boolean }[]> = {};
    const settingRows: { tenant_id: string; key: string; data: unknown }[] = [];

    for (const c of changes) {
      if (RECORD_TABLES.has(c.entity)) {
        if (!c.recordId) continue;
        (recordRows[c.entity] ??= []).push({
          tenant_id: tenantId,
          id: c.recordId,
          data: c.op === "delete" ? null : c.payload ?? null,
          deleted: c.op === "delete",
        });
      } else if (SETTINGS_KEYS.has(c.entity)) {
        settingRows.push({ tenant_id: tenantId, key: c.entity, data: c.payload ?? null });
      }
    }

    for (const [table, rows] of Object.entries(recordRows)) {
      if (!rows.length) continue;
      const { error } = await sb.from(table).upsert(rows, { onConflict: "tenant_id,id" });
      if (error) throw new Error(`push ${table}: ${error.message}`);
    }
    if (settingRows.length) {
      const { error } = await sb.from("settings").upsert(settingRows, { onConflict: "tenant_id,key" });
      if (error) throw new Error(`push settings: ${error.message}`);
    }

    return { ok: true, acceptedIds: changes.map((c) => c.id), serverTime: Date.now() };
  },

  async pull(since: number): Promise<PullResult> {
    const sb = getSupabase();
    const tenantId = getCurrentTenantId();
    if (!sb || !tenantId) return { changes: [], serverTime: since };

    const sinceISO = new Date(since || 0).toISOString();
    const changes: Change[] = [];
    let maxMs = since;

    for (const entity of ["proposals", "stock", "clientes"] as const) {
      const { data, error } = await sb
        .from(entity)
        .select("id, data, updated_at, deleted")
        .eq("tenant_id", tenantId)
        .gt("updated_at", sinceISO);
      if (error) throw new Error(`pull ${entity}: ${error.message}`);
      for (const row of data ?? []) {
        const ts = msOf(row.updated_at as string);
        if (ts > maxMs) maxMs = ts;
        changes.push({
          id: `srv-${entity}-${row.id}-${ts}`,
          entity,
          op: row.deleted ? "delete" : "upsert",
          recordId: row.id as string,
          payload: row.data,
          ts,
          deviceId: "server",
        });
      }
    }

    const { data: setts, error: sErr } = await sb
      .from("settings")
      .select("key, data, updated_at")
      .eq("tenant_id", tenantId)
      .gt("updated_at", sinceISO);
    if (sErr) throw new Error(`pull settings: ${sErr.message}`);
    for (const row of setts ?? []) {
      const ts = msOf(row.updated_at as string);
      if (ts > maxMs) maxMs = ts;
      changes.push({
        id: `srv-settings-${row.key}-${ts}`,
        entity: row.key as SyncEntity,
        op: "replace",
        payload: row.data,
        ts,
        deviceId: "server",
      });
    }

    return { changes, serverTime: maxMs };
  },
};
