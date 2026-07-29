// Adaptadores de backend. O engine fala só com a interface SyncAdapter;
// trocar de "sem servidor" para "banco robusto" é trocar de adaptador.

import type { SyncAdapter, Change, PushResult, PullResult } from "./types";
import { getSyncConfig } from "./config";

/**
 * Modo local (Vercel/localStorage): não há para onde sincronizar.
 * As mudanças ficam guardadas na outbox até um backend ser configurado.
 */
export const NullSyncAdapter: SyncAdapter = {
  name: "local",
  isConfigured: () => false,
  async push(): Promise<PushResult> {
    return { ok: true, acceptedIds: [] }; // não confirma nada: fila é preservada
  },
  async pull(): Promise<PullResult> {
    return { changes: [], serverTime: 0 };
  },
};

/**
 * Backend REST autenticado (para quando existir o banco robusto/seguro).
 * Contrato esperado:
 *   POST  {endpoint}/sync/push  { deviceId, changes }  -> PushResult
 *   GET   {endpoint}/sync/pull?since=<ms>&deviceId=..  -> PullResult
 * Autenticação via Bearer token. Ajuste os caminhos conforme a API real.
 */
export function createRestAdapter(endpoint: string, token: string, deviceId: string): SyncAdapter {
  const base = endpoint.replace(/\/$/, "");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  return {
    name: "rest",
    isConfigured: () => base.length > 0,
    async push(changes: Change[]): Promise<PushResult> {
      const res = await fetch(`${base}/sync/push`, {
        method: "POST",
        headers,
        body: JSON.stringify({ deviceId, changes }),
      });
      if (!res.ok) throw new Error(`push HTTP ${res.status}`);
      return (await res.json()) as PushResult;
    },
    async pull(since: number): Promise<PullResult> {
      const res = await fetch(`${base}/sync/pull?since=${since}&deviceId=${encodeURIComponent(deviceId)}`, {
        method: "GET",
        headers,
      });
      if (!res.ok) throw new Error(`pull HTTP ${res.status}`);
      return (await res.json()) as PullResult;
    },
  };
}

/** Escolhe o adaptador a partir da config atual do dispositivo. */
export function getActiveAdapter(): SyncAdapter {
  const cfg = getSyncConfig();
  if (cfg.endpoint) return createRestAdapter(cfg.endpoint, cfg.token, cfg.deviceId);
  return NullSyncAdapter;
}
