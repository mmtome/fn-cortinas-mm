import type { PricingInput, CalcResult } from "./pricing-engine";

export type ProposalStatus = "Rascunho" | "Enviado" | "Aprovado" | "Perdido";

export interface Proposal {
  id: string;
  cliente: string;
  ambiente: string;
  valor: number;
  status: ProposalStatus;
  data: string;
  input?: PricingInput;
  result?: CalcResult;
}

export interface StockItem {
  id: string;
  nome: string;
  categoria: "Tecido" | "Forro" | "Trilho" | "Varão" | "Acessório";
  codigo?: number;
  quantidade: number;
  unidade: string;
  custo: number;
  minimo: number;
}

export const initialProposals: Proposal[] = [
  { id: "p1", cliente: "Marina Albuquerque", ambiente: "Sala de Estar", valor: 6480, status: "Aprovado", data: "2026-05-12" },
  { id: "p2", cliente: "Ricardo Mendes", ambiente: "Suíte Master", valor: 4250, status: "Enviado", data: "2026-05-15" },
  { id: "p3", cliente: "Helena Castro", ambiente: "Home Office", valor: 2790, status: "Rascunho", data: "2026-05-17" },
  { id: "p4", cliente: "Família Tavares", ambiente: "Sala de Jantar", valor: 9870, status: "Aprovado", data: "2026-05-09" },
  { id: "p5", cliente: "Studio M&P", ambiente: "Showroom", valor: 18420, status: "Aprovado", data: "2026-05-02" },
];

// Estoque alinhado ao catálogo (códigos casam com pricing-engine)
export const initialStock: StockItem[] = [
  { id: "s1", nome: "Voil Bruxelas Areia",       categoria: "Tecido",    codigo: 1130, quantidade: 84, unidade: "m",  custo: 23, minimo: 30 },
  { id: "s2", nome: "Voil Bruxelas Titânio",     categoria: "Tecido",    codigo: 1132, quantidade: 18, unidade: "m",  custo: 23, minimo: 30 },
  { id: "s3", nome: "Cetim Pérola",              categoria: "Tecido",    codigo: 1102, quantidade: 42, unidade: "m",  custo: 23, minimo: 30 },
  { id: "s4", nome: "Lisieux Linho Areia",       categoria: "Tecido",    codigo: 1502, quantidade: 27, unidade: "m",  custo: 23, minimo: 25 },
  { id: "s5", nome: "Blackout Superblack Chumbo",categoria: "Tecido",    codigo: 4681, quantidade: 12, unidade: "m",  custo: 23, minimo: 20 },
  { id: "s6", nome: "Microfibra 100g Bege",      categoria: "Forro",     codigo: 1300, quantidade: 65, unidade: "m",  custo: 13, minimo: 30 },
  { id: "s7", nome: "Voil Ligório OffWhite",     categoria: "Forro",     codigo: 1140, quantidade: 22, unidade: "m",  custo: 23, minimo: 25 },
  { id: "s8", nome: "Varão Suíço 28mm Cromado",  categoria: "Varão",     quantidade: 9,  unidade: "un", custo: 13, minimo: 6 },
  { id: "s9", nome: "Trilho Duplo c/ Espaçamento",categoria: "Trilho",   quantidade: 4,  unidade: "un", custo: 25, minimo: 5 },
  { id: "s10", nome: "Cordão Smart Wave 5cm",    categoria: "Acessório", quantidade: 60, unidade: "m",  custo: 5,  minimo: 20 },
  { id: "s11", nome: "Rodízio Max Redondo",      categoria: "Acessório", quantidade: 980,unidade: "un", custo: 0.22,minimo: 200 },
  { id: "s12", nome: "Suporte Duplo Inove",      categoria: "Acessório", quantidade: 0,  unidade: "un", custo: 13, minimo: 8 },
];

export const salesData = [
  { mes: "Jan", valor: 28400 },
  { mes: "Fev", valor: 32100 },
  { mes: "Mar", valor: 41200 },
  { mes: "Abr", valor: 38900 },
  { mes: "Mai", valor: 52400 },
];

export const stockStatus = (item: StockItem) => {
  if (item.quantidade === 0) return "indisponivel";
  if (item.quantidade < item.minimo) return "baixo";
  return "disponivel";
};

/** Estoque disponível por código de tecido (em metros) */
export function metrosDisponiveis(stock: StockItem[], codigo?: number) {
  if (codigo == null) return null;
  return stock.find((s) => s.codigo === codigo)?.quantidade ?? null;
}
