import { useSyncExternalStore } from "react";
import { initialProposals, initialStock, type Proposal, type StockItem } from "./mockData";

type State = { proposals: Proposal[]; stock: StockItem[] };

let state: State = { proposals: initialProposals, stock: initialStock };
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

export const store = {
  getState: () => state,
  subscribe: (fn: () => void) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  upsertProposal: (p: Proposal) => {
    const idx = state.proposals.findIndex((x) => x.id === p.id);
    const next = [...state.proposals];
    if (idx >= 0) next[idx] = p;
    else next.unshift(p);
    state = { ...state, proposals: next };
    emit();
  },
  removeProposal: (id: string) => {
    state = { ...state, proposals: state.proposals.filter((p) => p.id !== id) };
    emit();
  },
  duplicateProposal: (id: string) => {
    const original = state.proposals.find((p) => p.id === id);
    if (!original) return;
    const copy: Proposal = {
      ...original,
      id: "p" + Math.random().toString(36).slice(2, 9),
      cliente: original.cliente + " (cópia)",
      status: "Rascunho",
      data: new Date().toISOString().slice(0, 10),
    };
    store.upsertProposal(copy);
  },
};

export function useStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(
    store.subscribe,
    () => selector(state),
    () => selector(state)
  );
}
