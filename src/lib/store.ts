import { useMemo, useSyncExternalStore } from "react";
import { initialProposals, initialStock, type Proposal, type ProposalStatus, type StockItem } from "./mockData";
import { ambienteLabel } from "./pricing-engine";
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

// v2: novos status (Pendente/Aprovado/Perdido), campos endereço/contato e
// faturamento zerado. Bump da versão recomeça do zero para testes.
const STORAGE_KEY = "fn-cortinas:v2";

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

const STATUS_MAP: Record<string, ProposalStatus> = {
  Rascunho: "Pendente", Enviado: "Pendente", Pendente: "Pendente",
  Aprovado: "Aprovado", Perdido: "Perdido",
};

/** Normaliza propostas: status novo, endereço/contato e formato comodos[]. */
function migrateProposal(p: any): Proposal {
  const status: ProposalStatus = STATUS_MAP[p?.status] ?? "Pendente";
  const endereco = p?.endereco ?? "";
  const contato = p?.contato ?? "";

  if (p && Array.isArray(p.comodos)) {
    return { ...p, status, endereco, contato } as Proposal;
  }
  const input = p?.input;
  if (input) {
    const med = input.medidas ?? {};
    const medidas = {
      larguraParede: med.larguraParede ?? med.larguraCortina ?? 3,
      alturaParede: med.alturaParede ?? med.alturaCortina ?? 2.5,
    };
    const comodo = {
      ambiente: input.ambiente?.ambiente ?? p.ambiente ?? "Ambiente",
      observacoes: input.ambiente?.observacoes ?? "",
      medidas,
      estrutura: input.estrutura,
      instalacao: input.instalacao,
      result: p.result,
    };
    return {
      id: p.id, cliente: p.cliente, endereco, contato, comodos: [comodo], comercial: input.comercial,
      valor: p.valor, status, data: p.data, ambiente: ambienteLabel([comodo]),
    };
  }
  // Proposta antiga sem detalhamento — mantém cabeçalho, sem cômodos.
  return {
    id: p.id, cliente: p.cliente, endereco, contato, comodos: [],
    comercial: { desconto: 0, margemExtra: 0, forma: "Pix", parcelas: 1 },
    valor: p.valor ?? 0, status, data: p.data, ambiente: p.ambiente ?? "—",
  };
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
      proposals: saved.proposals ? saved.proposals.map(migrateProposal) : base.proposals,
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

// -------------------- Estoque ⇄ Catálogo de materiais --------------------
// Itens de estoque nessas categorias também viram opção na Calculadora.
const KIND_OF: Partial<Record<StockItem["categoria"], MaterialKind>> = {
  Tecido: "tecidos",
  Forro: "forros",
  Blackout: "blackouts",
};

function proximoCodigo(s: State): number {
  const todos = [...s.tecidos, ...s.forros, ...s.blackouts].map((t) => t.codigo);
  return (todos.length ? Math.max(...todos) : 8999) + 1;
}

/** Reflete um item de estoque (tecido/forro/blackout) no catálogo da calculadora. */
function syncMaterial(s: State, item: StockItem): State {
  const kind = KIND_OF[item.categoria];
  if (!kind || item.codigo == null) return s;
  const mat: Tecido = {
    codigo: item.codigo,
    nome: item.nome,
    largura: 3,
    precoMetro: item.custo,
    ...(kind === "blackouts" ? { blackout: true } : {}),
  };
  const list = s[kind];
  const exists = list.some((t) => t.codigo === item.codigo);
  const nextList = exists ? list.map((t) => (t.codigo === item.codigo ? { ...t, ...mat } : t)) : [...list, mat];
  return { ...s, [kind]: nextList } as State;
}

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
  setStatus: (id: string, status: ProposalStatus) => {
    commit({ ...state, proposals: state.proposals.map((p) => (p.id === id ? { ...p, status } : p)) });
  },
  duplicateProposal: (id: string) => {
    const original = state.proposals.find((p) => p.id === id);
    if (!original) return;
    const copy: Proposal = {
      ...original,
      id: uid("p"),
      cliente: original.cliente + " (cópia)",
      status: "Pendente",
      data: new Date().toISOString().slice(0, 10),
    };
    store.upsertProposal(copy);
  },

  // ---- Estoque (sincroniza materiais com o catálogo da calculadora) ----
  addStock: (item: Omit<StockItem, "id">) => {
    const kind = KIND_OF[item.categoria];
    const codigo = kind && item.codigo == null ? proximoCodigo(state) : item.codigo;
    const stockItem: StockItem = { ...item, codigo, id: uid("s") };
    commit(syncMaterial({ ...state, stock: [stockItem, ...state.stock] }, stockItem));
  },
  updateStock: (id: string, patch: Partial<StockItem>) => {
    let stock = state.stock.map((s) => (s.id === id ? { ...s, ...patch } : s));
    let item = stock.find((s) => s.id === id);
    if (item && KIND_OF[item.categoria] && item.codigo == null) {
      const codigo = proximoCodigo(state);
      stock = stock.map((s) => (s.id === id ? { ...s, codigo } : s));
      item = { ...item, codigo };
    }
    let next: State = { ...state, stock };
    if (item) next = syncMaterial(next, item);
    commit(next);
  },
  removeStock: (id: string) => {
    const item = state.stock.find((s) => s.id === id);
    let next: State = { ...state, stock: state.stock.filter((s) => s.id !== id) };
    const kind = item ? KIND_OF[item.categoria] : undefined;
    if (item && kind && item.codigo != null) {
      next = { ...next, [kind]: next[kind].filter((t) => t.codigo !== item.codigo) } as State;
    }
    commit(next);
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

  // ---- Reset (zera para os dados de exemplo) ----
  resetData: () => {
    commit(defaultState());
  },
  /** Zera só as propostas (faturamento volta a zero, mantém estoque/variáveis/empresa). */
  limparPropostas: () => {
    commit({ ...state, proposals: [] });
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
