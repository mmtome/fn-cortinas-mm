// Configuração da sincronização, persistida no dispositivo.
// endpoint/token vazios = modo local (sem backend). Preencher aqui (ou via
// Ajustes, no futuro) liga a sincronização com o banco robusto.

const SYNC_CFG_KEY = "fn-cortinas:sync:v1";

export interface SyncConfig {
  endpoint: string;      // URL base do backend (ex.: https://api.fncortinas.com)
  token: string;         // token de autenticação (Bearer) — backend seguro
  deviceId: string;      // identifica este aparelho
  lastPulledAt: number;  // relógio do servidor do último pull bem-sucedido
}

function genId(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  } catch { /* ignore */ }
  return `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function read(): SyncConfig {
  const fallback: SyncConfig = { endpoint: "", token: "", deviceId: "", lastPulledAt: 0 };
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(SYNC_CFG_KEY);
    if (raw) return { ...fallback, ...(JSON.parse(raw) as Partial<SyncConfig>) };
  } catch { /* ignore */ }
  return fallback;
}

function write(cfg: SyncConfig) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SYNC_CFG_KEY, JSON.stringify(cfg));
  } catch { /* quota/privado — ignora */ }
}

/** Lê a config, garantindo um deviceId estável para este aparelho. */
export function getSyncConfig(): SyncConfig {
  const cfg = read();
  if (!cfg.deviceId) {
    cfg.deviceId = genId();
    write(cfg);
  }
  return cfg;
}

export function setSyncConfig(patch: Partial<SyncConfig>): SyncConfig {
  const next = { ...getSyncConfig(), ...patch };
  write(next);
  return next;
}
