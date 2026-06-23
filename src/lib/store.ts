import { useMemo, useSyncExternalStore } from "react";
import { initialProposals, initialStock, type Proposal, type StockItem } from "./mockData";
import {
  CATALOGO_TECIDOS,
  CATALOGO_FORROS,
  CATALOGO_BLACKOUTS,
  DEFAULT_VARS,
  type Tecido,
  type Vars,
  type CalcCtx,
} from "./pricing-engine";

// -------------------- Dados da empresa (alimentam o PDF) --------------------
export interface Empresa {
  nome: string;
  slogan: string;
  telefone: string;
  instagram: string;
  site: string;
  email: string;
}

export const defaultEmpresa: Empresa = {
  nome: "FN Cortinas",
  slogan: "Cortinas e persianas sob medida · Alto padrão",
  telefone: "",
  instagram: "",
  site: "",
  email: "",
};

// -------------------- Estado --------------------
type State = {
  proposals: Proposal[];
  stock: StockItem[];
  tecidos: Tecido[];
  forros: Tecido[];
  blackouts: Tecido[];
  vars: Vars;
  empresa: Empresa;
};

const STORAGE_KEY = "fn-cortinas:v1";

function defaultState(): State {
  return {
    proposals: initialProposals,
    stock: initialStock,
    tecidos: CATALOGO_TECIDOS,
    forros: CATALOGO_FORROS,
    blackouts: CATALOGO_BLACKOUTS,
    vars: { ...DEFAULT_VARS },
    empresa: { ...defaultEmpresa },
  };
}

let state: State = defaultState();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

// -------------------- Persistência --------------------
function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota / modo privado — ignora */
  }
}

let hydrated = false;
/** Carrega o estado salvo no navegador. Chamado uma vez no client (pós-hydration). */
function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      persist(); // primeira visita: grava o seed
      return;
    }
    const saved = JSON.parse(raw) as Partial<State>;
    const base = defaultState();
    state = {
      proposals: saved.proposals ?? base.proposals,
      stock: saved.stock ?? base.stock,
      tecidos: saved.tecidos ?? base.tecidos,
      forros: saved.forros ?? base.forros,
      blackouts: saved.blackouts ?? base.blackouts,
      // mescla vars para não perder chaves novas em versões futuras
      vars: { ...base.vars, ...saved.vars },
      empresa: { ...base.empresa, ...saved.empresa },
    };
    emit();
  } catch {
    /* JSON inválido — mantém defaults */
  }
}

const commit = (next: State) => {
  state = next;
  persist();
  emit();
};

// -------------------- IDs --------------------
let seq = 0;
const uid = (prefix: string) =>
  `${prefix}${Date.now().toString(36)}${(seq++).toString(36)}`;

// -------------------- Store API --------------------
export const store = {
  getState: () => state,
  subscribe: (fn: () => void) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  hydrate,

  // ---- Propostas ----
  upsertProposal: (p: Proposal) => {
    const idx = state.proposals.findIndex((x) => x.id === p.id);
    const next = [...state.proposals];
    if (idx >= 0) next[idx] = p;
    else next.unshift(p);
    commit({ ...state, proposals: next });
  },
  removeProposal: (id: string) => {
    commit({ ...state, proposals: state.proposals.filter((p) => p.id !== id) });
  },
  duplicateProposal: (id: string) => {
    const original = state.proposals.find((p) => p.id === id);
    if (!original) return;
    const copy: Proposal = {
      ...original,
      id: uid("p"),
      cliente: original.cliente + " (cópia)",
      status: "Rascunho",
      data: new Date().toISOString().slice(0, 10),
    };
    store.upsertProposal(copy);
  },

  // ---- Estoque ----
  addStock: (item: Omit<StockItem, "id">) => {
    commit({ ...state, stock: [{ ...item, id: uid("s") }, ...state.stock] });
  },
  updateStock: (id: string, patch: Partial<StockItem>) => {
    commit({
      ...state,
      stock: state.stock.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    });
  },
  removeStock: (id: string) => {
    commit({ ...state, stock: state.stock.filter((s) => s.id !== id) });
  },

  // ---- Materiais (catálogos) ----
  addMaterial: (kind: MaterialKind, m: Tecido) => {
    commit({ ...state, [kind]: [...state[kind], m] } as State);
  },
  updateMaterial: (kind: MaterialKind, codigo: number, patch: Partial<Tecido>) => {
    commit({
      ...state,
      [kind]: state[kind].map((t) => (t.codigo === codigo ? { ...t, ...patch } : t)),
    } as State);
  },
  removeMaterial: (kind: MaterialKind, codigo: number) => {
    commit({ ...state, [kind]: state[kind].filter((t) => t.codigo !== codigo) } as State);
  },

  // ---- Variáveis ----
  updateVars: (patch: Partial<Vars>) => {
    commit({ ...state, vars: { ...state.vars, ...patch } });
  },
  resetVars: () => {
    commit({ ...state, vars: { ...DEFAULT_VARS } });
  },

  // ---- Empresa ----
  updateEmpresa: (patch: Partial<Empresa>) => {
    commit({ ...state, empresa: { ...state.empresa, ...patch } });
  },
};

export type MaterialKind = "tecidos" | "forros" | "blackouts";

export function useStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(
    store.subscribe,
    () => selector(state),
    () => selector(state)
  );
}

/** Contexto de cálculo a partir do estado atual (catálogos + variáveis). */
export function useCalcCtx(): CalcCtx {
  const tecidos = useStore((s) => s.tecidos);
  const forros = useStore((s) => s.forros);
  const blackouts = useStore((s) => s.blackouts);
  const vars = useStore((s) => s.vars);
  return useMemo(() => ({ tecidos, forros, blackouts, vars }), [tecidos, forros, blackouts, vars]);
}
