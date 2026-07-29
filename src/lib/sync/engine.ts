// Motor de sincronização: transforma mutações locais em eventos na outbox e,
// quando há rede + backend, envia a fila e aplica o que vier do servidor.
// SSR-safe: no servidor tudo vira no-op.

import { useSyncExternalStore } from "react";
import type { Change, ChangeOp, SyncEntity } from "./types";
import { outbox } from "./outbox";
import { getSyncConfig, setSyncConfig } from "./config";
import { getActiveAdapter } from "./adapters";

// -------------------- Status observável (para a UI) --------------------
export interface SyncStatus {
  online: boolean;
  pending: number;
  syncing: boolean;
  lastSyncAt: number | null;
  lastError: string | null;
  /** true quando existe backend configurado (senão, é só fila local). */
  backend: boolean;
}

let status: SyncStatus = {
  online: typeof navigator !== "undefined" ? navigator.onLine : true,
  pending: 0,
  syncing: false,
  lastSyncAt: null,
  lastError: null,
  backend: false,
};

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
function patch(p: Partial<SyncStatus>) {
  status = { ...status, ...p };
  emit();
}

// -------------------- Aplicador de mudanças remotas --------------------
// O store registra aqui COMO aplicar o que vem do servidor (evita import
// circular entre store e sync).
type RemoteApplier = (changes: Change[]) => void;
let applyRemote: RemoteApplier | null = null;
export function setRemoteApplier(fn: RemoteApplier) {
  applyRemote = fn;
}

// -------------------- Geração de ids/relógio --------------------
let seq = 0;
const changeId = () => `chg-${Date.now().toString(36)}-${(seq++).toString(36)}`;

// -------------------- Registro de mudanças (chamado pelo store) --------------------
/**
 * Registra uma alteração local na fila de sincronização.
 * `payload` deve ser serializável (o próprio registro/valor).
 */
export function recordChange(
  entity: SyncEntity,
  op: ChangeOp,
  opts: { recordId?: string; payload?: unknown } = {}
) {
  if (typeof window === "undefined") return; // nada a fazer no SSR
  const { deviceId } = getSyncConfig();
  const change: Change = {
    id: changeId(),
    entity,
    op,
    recordId: opts.recordId,
    payload: opts.payload,
    ts: Date.now(),
    deviceId,
  };
  outbox.enqueue(change);
  patch({ pending: outbox.size() });
  scheduleSync();
}

// -------------------- Agendamento / debounce --------------------
let timer: ReturnType<typeof setTimeout> | null = null;
function scheduleSync(delay = 1500) {
  if (typeof window === "undefined") return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void syncNow();
  }, delay);
}

// -------------------- Sincronização --------------------
export async function syncNow(): Promise<void> {
  if (typeof window === "undefined") return;
  if (status.syncing) return;

  const adapter = getActiveAdapter();
  patch({ backend: adapter.isConfigured(), pending: outbox.size() });

  // Sem backend ou offline: mantém a fila, não há o que enviar agora.
  if (!adapter.isConfigured() || !navigator.onLine) return;
  if (outbox.size() === 0) {
    // Ainda assim, puxa novidades do servidor.
    await pullRemote(adapter);
    return;
  }

  patch({ syncing: true, lastError: null });
  try {
    const pending = outbox.all();
    const result = await adapter.push(pending);
    if (result.ok) {
      outbox.removeMany(result.acceptedIds.length ? result.acceptedIds : pending.map((c) => c.id));
      if (result.serverChanges?.length && applyRemote) applyRemote(result.serverChanges);
      if (result.serverTime) setSyncConfig({ lastPulledAt: result.serverTime });
      patch({ lastSyncAt: Date.now(), pending: outbox.size() });
    }
    await pullRemote(adapter);
  } catch (err) {
    patch({ lastError: err instanceof Error ? err.message : String(err) });
    // fila preservada; tenta de novo no próximo online/mudança
  } finally {
    patch({ syncing: false, pending: outbox.size() });
  }
}

async function pullRemote(adapter = getActiveAdapter()): Promise<void> {
  if (!adapter.isConfigured() || !navigator.onLine) return;
  try {
    const since = getSyncConfig().lastPulledAt;
    const { changes, serverTime } = await adapter.pull(since);
    if (changes.length && applyRemote) applyRemote(changes);
    if (serverTime) setSyncConfig({ lastPulledAt: serverTime });
    patch({ lastSyncAt: Date.now() });
  } catch (err) {
    patch({ lastError: err instanceof Error ? err.message : String(err) });
  }
}

// -------------------- Init (client) --------------------
let started = false;
export function initSync() {
  if (started || typeof window === "undefined") return;
  started = true;

  patch({ online: navigator.onLine, pending: outbox.size(), backend: getActiveAdapter().isConfigured() });

  window.addEventListener("online", () => {
    patch({ online: true });
    void syncNow();
  });
  window.addEventListener("offline", () => patch({ online: false }));

  // Tentativa inicial (útil quando há fila de uma sessão anterior).
  if (navigator.onLine) scheduleSync(2000);
}

// -------------------- Hook React --------------------
export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => status,
    () => status
  );
}
