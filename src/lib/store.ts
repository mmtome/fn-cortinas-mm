import { useMemo, useSyncExternalStore } from "react";
import { initialProposals, initialStock, type Proposal, type ProposalStatus, type StockItem } from "./mockData";
import { ambienteLabel } from "./pricing-engine";
import { recordChange, setRemoteApplier } from "./sync/engine";
import { getSyncConfig } from "./sync/config";
import type { Change } from "./sync/types";
import {
  CATALOGO_MODELOS,
  CATALOGO_CORES,
  DEFAULT_VARS,
  type Tecido,
  type ModeloItem,
  type Vars,
  type CalcCtx,
} from "./pricing-engine";

// -------------------- Dados da empresa (alimentam o PDF) --------------------
export interface Empresa {
  nome: string;
  slogan: string;
  telefone: string;
  whatsapp: string;   // número p/ QR Code (só dígitos, com DDD/DDI)
  instagram: string;
  site: string;
  email: string;
  cnpj: string;
  endereco: string;
}

export const defaultEmpresa: Empresa = {
  nome: "FN Cortinas",
  slogan: "Cortinas e persianas sob medida · Alto padrão",
  telefone: "",
  whatsapp: "https://wa.me/message/GJZAEBZGCSLPH1",
  instagram: "https://www.instagram.com/cortinasfn/",
  site: "",
  email: "",
  cnpj: "",
  endereco: "",
};

// -------------------- Clientes (mini-CRM) --------------------
export interface Cliente {
  id: string;
  nome: string;
  contato: string;
  endereco: string;
}

// -------------------- Estado --------------------
type State = {
  proposals: Proposal[];
  stock: StockItem[];       // fonte única: tecidos/forros/blackouts saem daqui
  clientes: Cliente[];
  modelos: ModeloItem[];
  cores: string[];
  vars: Vars;
  varsVersion: number; // versão da calibração de preços — ver VARS_VERSION
  osSeq: number;       // último nº de O.S. atribuído (conta só orçamentos aprovados)
  empresa: Empresa;
};

// Bump sempre que os preços/fatores padrão forem recalibrados. Ao subir a versão,
// o app re-sincroniza a tabela de preços com os valores novos (mantendo estoque,
// clientes e empresa). Assim uma calibração no código chega a quem já usava o app.
//   v2: entretela R$1/m e trilho duplo R$25/m (bate com a folha 1.802,42)
const VARS_VERSION = 2;

// v3: estoque vira fonte única dos materiais (tecidos/forros/blackouts derivam
// do estoque). Mudança estrutural — recomeça do seed novo.
const STORAGE_KEY = "fn-cortinas:v3";

function defaultState(): State {
  return {
    proposals: initialProposals,
    stock: initialStock,
    clientes: [],
    modelos: CATALOGO_MODELOS.map((m) => ({ ...m })),
    cores: [...CATALOGO_CORES],
    vars: { ...DEFAULT_VARS },
    varsVersion: VARS_VERSION,
    osSeq: 0,
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

/** Mescla empresa: mantém o valor salvo quando preenchido, senão usa o padrão. */
function mergeEmpresa(base: Empresa, saved?: Partial<Empresa>): Empresa {
  const out = { ...base };
  if (saved) {
    (Object.keys(base) as (keyof Empresa)[]).forEach((k) => {
      const v = saved[k];
      if (typeof v === "string" && v.trim() !== "") out[k] = v;
    });
  }
  return out;
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
      clientes: saved.clientes ?? base.clientes,
      modelos: saved.modelos ?? base.modelos,
      cores: saved.cores ?? base.cores,
      // Preços recalibrados no código? Re-sincroniza a tabela com os valores novos.
      // Enquanto a versão salva for a atual, mescla (preserva ajustes do usuário e
      // ganha chaves novas). Se estiver desatualizada, adota os padrões calibrados.
      vars: saved.varsVersion === VARS_VERSION
        ? { ...base.vars, ...saved.vars }
        : { ...base.vars },
      varsVersion: VARS_VERSION,
      osSeq: saved.osSeq ?? base.osSeq,
      // empresa: usa o valor salvo se preenchido; senão, cai no padrão (pré-preenchidos)
      empresa: mergeEmpresa(base.empresa, saved.empresa),
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

// -------------------- Estoque = fonte única dos materiais --------------------
// Tecidos/forros/blackouts da calculadora são DERIVADOS dos itens de estoque
// dessas categorias (custo = R$/m, largura = largura do rolo). Um só lugar.
const CAT_KIND: Partial<Record<StockItem["categoria"], MaterialKind>> = {
  Tecido: "tecidos",
  Forro: "forros",
  Blackout: "blackouts",
};
const isMaterialCat = (c: StockItem["categoria"]) => c in CAT_KIND;

/** Deriva os catálogos (tecidos/forros/blackouts) a partir do estoque. */
export function materiaisDoEstoque(stock: StockItem[]) {
  const pick = (cat: StockItem["categoria"], blackout?: boolean): Tecido[] =>
    stock
      .filter((s) => s.categoria === cat && s.codigo != null)
      .map((s) => ({ codigo: s.codigo!, nome: s.nome, largura: s.largura ?? 3, precoMetro: s.custo, ...(blackout ? { blackout: true } : {}) }));
  return { tecidos: pick("Tecido"), forros: pick("Forro"), blackouts: pick("Blackout", true) };
}

function proximoCodigo(stock: StockItem[]): number {
  return Math.max(8999, ...stock.map((s) => s.codigo ?? 0)) + 1;
}

/** Evita duplicar: se já existe item da mesma categoria com esse nome, devolve o código dele. */
function codigoPorNome(stock: StockItem[], categoria: StockItem["categoria"], nome: string): number | null {
  const alvo = nome.trim().toLowerCase();
  return stock.find((s) => s.categoria === categoria && s.nome.trim().toLowerCase() === alvo)?.codigo ?? null;
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
    recordChange("proposals", "upsert", { recordId: p.id, payload: p });
  },
  removeProposal: (id: string) => {
    commit({ ...state, proposals: state.proposals.filter((p) => p.id !== id) });
    recordChange("proposals", "delete", { recordId: id });
  },
  setStatus: (id: string, status: ProposalStatus) => {
    // Ao aprovar pela 1ª vez, atribui o próximo nº de O.S. (conta só aprovados).
    // O número é fixo: reprovar/reaprovar depois não o altera.
    let osSeq = state.osSeq;
    const proposals = state.proposals.map((p) => {
      if (p.id !== id) return p;
      const ganharOS = status === "Aprovado" && p.osNumero == null;
      if (ganharOS) osSeq = osSeq + 1;
      return { ...p, status, osNumero: ganharOS ? osSeq : p.osNumero };
    });
    commit({ ...state, proposals, osSeq });
    const p = proposals.find((x) => x.id === id);
    if (p) recordChange("proposals", "upsert", { recordId: id, payload: p });
  },
  /** Garante um nº de O.S. para a proposta (atribui o próximo se ainda não tiver). */
  gerarNumeroOS: (id: string): number => {
    const atual = state.proposals.find((x) => x.id === id);
    if (!atual) return 0;
    if (atual.osNumero != null) return atual.osNumero;
    const osSeq = state.osSeq + 1;
    const proposals = state.proposals.map((x) => (x.id === id ? { ...x, osNumero: osSeq } : x));
    commit({ ...state, proposals, osSeq });
    const p = proposals.find((x) => x.id === id);
    if (p) recordChange("proposals", "upsert", { recordId: id, payload: p });
    return osSeq;
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

  // ---- Estoque (fonte única dos materiais) ----
  addStock: (item: Omit<StockItem, "id">) => {
    const codigo = isMaterialCat(item.categoria) && item.codigo == null
      ? codigoPorNome(state.stock, item.categoria, item.nome) ?? proximoCodigo(state.stock)
      : item.codigo;
    const stockItem: StockItem = { ...item, codigo, id: uid("s") };
    commit({ ...state, stock: [stockItem, ...state.stock] });
    recordChange("stock", "upsert", { recordId: stockItem.id, payload: stockItem });
  },
  updateStock: (id: string, patch: Partial<StockItem>) => {
    let stock = state.stock.map((s) => (s.id === id ? { ...s, ...patch } : s));
    const item = stock.find((s) => s.id === id);
    if (item && isMaterialCat(item.categoria) && item.codigo == null) {
      const codigo = codigoPorNome(state.stock, item.categoria, item.nome) ?? proximoCodigo(state.stock);
      stock = stock.map((s) => (s.id === id ? { ...s, codigo } : s));
    }
    commit({ ...state, stock });
    const updated = stock.find((s) => s.id === id);
    if (updated) recordChange("stock", "upsert", { recordId: id, payload: updated });
  },
  removeStock: (id: string) => {
    commit({ ...state, stock: state.stock.filter((s) => s.id !== id) });
    recordChange("stock", "delete", { recordId: id });
  },
  /** Dá baixa em metros por código de material (usado ao fechar uma proposta). */
  baixarEstoque: (consumo: { codigo: number; metros: number }[]) => {
    const stock = state.stock.map((s) => {
      if (s.codigo == null) return s;
      const c = consumo.find((x) => x.codigo === s.codigo);
      return c ? { ...s, quantidade: +Math.max(0, s.quantidade - c.metros).toFixed(2) } : s;
    });
    commit({ ...state, stock });
    // registra os itens efetivamente baixados
    const codigos = new Set(consumo.map((c) => c.codigo));
    stock.filter((s) => s.codigo != null && codigos.has(s.codigo))
      .forEach((s) => recordChange("stock", "upsert", { recordId: s.id, payload: s }));
  },

  // ---- Clientes (mini-CRM) ----
  upsertCliente: (c: { id?: string; nome: string; contato?: string; endereco?: string }) => {
    const nome = c.nome.trim();
    if (!nome) return;
    const idx = state.clientes.findIndex((x) => (c.id && x.id === c.id) || x.nome.trim().toLowerCase() === nome.toLowerCase());
    const clientes = [...state.clientes];
    let recId: string;
    if (idx >= 0) { clientes[idx] = { ...clientes[idx], nome, contato: c.contato ?? clientes[idx].contato, endereco: c.endereco ?? clientes[idx].endereco }; recId = clientes[idx].id; }
    else { const novo = { id: uid("c"), nome, contato: c.contato ?? "", endereco: c.endereco ?? "" }; clientes.push(novo); recId = novo.id; }
    commit({ ...state, clientes });
    const rec = clientes.find((x) => x.id === recId);
    if (rec) recordChange("clientes", "upsert", { recordId: recId, payload: rec });
  },
  removeCliente: (id: string) => {
    commit({ ...state, clientes: state.clientes.filter((c) => c.id !== id) });
    recordChange("clientes", "delete", { recordId: id });
  },

  // ---- Modelos ----
  addModelo: (m: ModeloItem) => {
    commit({ ...state, modelos: [...state.modelos, m] });
    recordChange("modelos", "replace", { payload: state.modelos });
  },
  updateModelo: (index: number, patch: Partial<ModeloItem>) => {
    commit({ ...state, modelos: state.modelos.map((m, i) => (i === index ? { ...m, ...patch } : m)) });
    recordChange("modelos", "replace", { payload: state.modelos });
  },
  removeModelo: (index: number) => {
    commit({ ...state, modelos: state.modelos.filter((_, i) => i !== index) });
    recordChange("modelos", "replace", { payload: state.modelos });
  },

  // ---- Cores (lista global, vale para todos os tecidos) ----
  addCor: (nome: string) => {
    const cor = nome.trim();
    if (!cor || state.cores.some((c) => c.toLowerCase() === cor.toLowerCase())) return;
    commit({ ...state, cores: [...state.cores, cor] });
    recordChange("cores", "replace", { payload: state.cores });
  },
  removeCor: (nome: string) => {
    commit({ ...state, cores: state.cores.filter((c) => c !== nome) });
    recordChange("cores", "replace", { payload: state.cores });
  },

  // ---- Variáveis ----
  updateVars: (patch: Partial<Vars>) => {
    commit({ ...state, vars: { ...state.vars, ...patch } });
    recordChange("vars", "replace", { payload: state.vars });
  },
  resetVars: () => {
    commit({ ...state, vars: { ...DEFAULT_VARS } });
    recordChange("vars", "replace", { payload: state.vars });
  },

  // ---- Empresa ----
  updateEmpresa: (patch: Partial<Empresa>) => {
    commit({ ...state, empresa: { ...state.empresa, ...patch } });
    recordChange("empresa", "replace", { payload: state.empresa });
  },

  // ---- Reset (zera para os dados de exemplo) ----
  resetData: () => {
    commit(defaultState());
  },
  /** Zera só as propostas (faturamento volta a zero, mantém estoque/variáveis/empresa). */
  limparPropostas: () => {
    commit({ ...state, proposals: [] });
  },

  /**
   * Aplica mudanças vindas do servidor (outros dispositivos) ao estado local.
   * NÃO re-registra na outbox — é só espelhar. Ignora ecos do próprio device.
   * Chamado pelo engine de sync via setRemoteApplier.
   */
  applyRemoteChanges: (changes: Change[]) => {
    const myId = getSyncConfig().deviceId;
    let next = state;
    for (const c of changes) {
      if (c.deviceId && c.deviceId === myId) continue; // não reaplica o próprio
      next = applyChange(next, c);
    }
    if (next !== state) commit(next);
  },
};

/** Aplica um único evento de sync ao estado (imutável). */
function applyChange(s: State, c: Change): State {
  switch (c.entity) {
    case "proposals": return applyRecord(s, "proposals", c, (p: Proposal) => p.id);
    case "stock": return applyRecord(s, "stock", c, (x: StockItem) => x.id);
    case "clientes": return applyRecord(s, "clientes", c, (x: Cliente) => x.id);
    case "modelos": return c.op === "replace" ? { ...s, modelos: (c.payload as ModeloItem[]) ?? s.modelos } : s;
    case "cores": return c.op === "replace" ? { ...s, cores: (c.payload as string[]) ?? s.cores } : s;
    case "vars": return c.op === "replace" ? { ...s, vars: { ...DEFAULT_VARS, ...(c.payload as Partial<Vars>) } } : s;
    case "empresa": return c.op === "replace" ? { ...s, empresa: mergeEmpresa(defaultEmpresa, c.payload as Partial<Empresa>) } : s;
    default: return s;
  }
}

/** upsert/delete genérico para coleções indexadas por id. */
function applyRecord<K extends "proposals" | "stock" | "clientes">(
  s: State, key: K, c: Change, idOf: (r: State[K][number]) => string
): State {
  const list = s[key] as State[K];
  if (c.op === "delete") {
    return { ...s, [key]: (list as any[]).filter((r) => idOf(r) !== c.recordId) } as State;
  }
  if (c.op === "upsert" && c.payload) {
    const rec = c.payload as State[K][number];
    const idx = (list as any[]).findIndex((r) => idOf(r) === c.recordId);
    const arr = [...(list as any[])];
    if (idx >= 0) arr[idx] = rec; else arr.unshift(rec);
    return { ...s, [key]: arr } as State;
  }
  return s;
}

// Liga o espelhamento de mudanças remotas ao engine de sync.
setRemoteApplier((changes) => store.applyRemoteChanges(changes));

export type MaterialKind = "tecidos" | "forros" | "blackouts";

export function useStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(
    store.subscribe,
    () => selector(state),
    () => selector(state)
  );
}

/** Catálogos de materiais derivados do estoque (para os seletores da calculadora). */
export function useMateriais() {
  const stock = useStore((s) => s.stock);
  return useMemo(() => materiaisDoEstoque(stock), [stock]);
}

/** Contexto de cálculo a partir do estado atual (catálogos + variáveis). */
export function useCalcCtx(): CalcCtx {
  const stock = useStore((s) => s.stock);
  const modelos = useStore((s) => s.modelos);
  const vars = useStore((s) => s.vars);
  return useMemo(() => ({ ...materiaisDoEstoque(stock), modelos, vars }), [stock, modelos, vars]);
}
