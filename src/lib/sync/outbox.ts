// Fila persistente de mudanças pendentes (outbox).
// Sobrevive a fechar o app/perder a rede. É esvaziada pelo engine quando
// há conexão e backend configurado.

import type { Change } from "./types";

const OUTBOX_KEY = "fn-cortinas:outbox:v1";

function read(): Change[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(OUTBOX_KEY);
    if (raw) return JSON.parse(raw) as Change[];
  } catch { /* ignore */ }
  return [];
}

function write(list: Change[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(OUTBOX_KEY, JSON.stringify(list));
  } catch { /* quota — ignora */ }
}

export const outbox = {
  all(): Change[] {
    return read();
  },
  size(): number {
    return read().length;
  },
  enqueue(change: Change) {
    const list = read();
    list.push(change);
    write(list);
  },
  /** Remove as operações confirmadas pelo servidor. */
  removeMany(ids: string[]) {
    if (!ids.length) return;
    const drop = new Set(ids);
    write(read().filter((c) => !drop.has(c.id)));
  },
  clear() {
    write([]);
  },
};
