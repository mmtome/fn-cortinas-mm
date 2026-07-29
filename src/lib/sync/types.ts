// ============================================================
// Camada de sincronização — contratos (offline-first)
//
// Ideia: toda alteração local vira uma "Change" (evento) numa fila
// persistente (outbox). Quando há rede E um backend configurado, a fila
// é enviada pelo SyncAdapter. Trocar de "sem backend" (Vercel/localStorage)
// para "backend robusto e seguro" é só implementar um novo SyncAdapter —
// o resto do app não muda.
// ============================================================

/** Coleções sincronizáveis do estado. */
export type SyncEntity =
  | "proposals"
  | "stock"
  | "clientes"
  | "modelos"
  | "cores"
  | "vars"
  | "empresa";

/**
 * upsert/delete → coleções indexadas por id (proposals, stock, clientes).
 * replace       → valores "inteiros": modelos[], cores[], vars{}, empresa{}.
 */
export type ChangeOp = "upsert" | "delete" | "replace";

/** Um evento de alteração — a unidade que trafega entre device e servidor. */
export interface Change {
  id: string;          // id único da operação (idempotência no servidor)
  entity: SyncEntity;
  op: ChangeOp;
  recordId?: string;   // id do registro (para upsert/delete)
  payload?: unknown;   // registro novo / valor / coleção completa (replace)
  ts: number;          // relógio do device (ms desde epoch) — base do LWW
  deviceId: string;    // origem — evita ecoar a própria mudança de volta
}

export interface PushResult {
  ok: boolean;
  acceptedIds: string[];      // ops que o servidor confirmou (podem sair da fila)
  serverChanges?: Change[];   // mudanças de outros devices, já na resposta
  serverTime?: number;
}

export interface PullResult {
  changes: Change[];
  serverTime: number;
}

/**
 * Contrato do backend. Hoje: NullSyncAdapter (sem servidor). Amanhã: um
 * RestSyncAdapter autenticado apontando para o banco robusto/seguro.
 */
export interface SyncAdapter {
  readonly name: string;
  /** true quando há endpoint/credenciais para sincronizar de fato. */
  isConfigured(): boolean;
  /** Envia as mudanças pendentes. Lança em erro de rede (o engine reagenda). */
  push(changes: Change[]): Promise<PushResult>;
  /** Busca mudanças do servidor desde `since` (ms). */
  pull(since: number): Promise<PullResult>;
}
