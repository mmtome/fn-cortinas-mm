import { calcular, defaultPricingInput, type PricingInput, type CalcResult } from "./pricing-engine";

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

// Cada proposta de exemplo carrega input + result reais para que a tela da
// Empresa e o PDF tenham conteúdo completo de imediato.
function seedProposal(
  id: string,
  cliente: string,
  ambiente: string,
  status: ProposalStatus,
  data: string,
  over: (i: PricingInput) => void
): Proposal {
  const input = defaultPricingInput();
  input.ambiente.cliente = cliente;
  input.ambiente.ambiente = ambiente;
  over(input);
  const result = calcular(input);
  return { id, cliente, ambiente, valor: result.totalFinal, status, data, input, result };
}

export const initialProposals: Proposal[] = [
  seedProposal("p1", "Marina Albuquerque", "Sala de Estar", "Aprovado", "2026-05-12", (i) => {
    i.medidas.larguraParede = 4.2; i.medidas.alturaParede = 2.8; i.estrutura.tecidoCodigo = 1130;
  }),
  seedProposal("p2", "Ricardo Mendes", "Suíte Master", "Enviado", "2026-05-15", (i) => {
    i.medidas.larguraParede = 3.0; i.medidas.alturaParede = 2.6; i.estrutura.blackoutCodigo = 4681;
  }),
  seedProposal("p3", "Helena Castro", "Home Office", "Rascunho", "2026-05-17", (i) => {
    i.medidas.larguraParede = 2.2; i.medidas.alturaParede = 2.4; i.estrutura.forroCodigo = null; i.estrutura.modelo = "Prega macho";
  }),
  seedProposal("p4", "Família Tavares", "Sala de Jantar", "Aprovado", "2026-05-09", (i) => {
    i.medidas.larguraParede = 5.0; i.medidas.alturaParede = 3.0; i.estrutura.motorizada = true;
  }),
  seedProposal("p5", "Studio M&P", "Showroom", "Aprovado", "2026-05-02", (i) => {
    i.medidas.larguraParede = 7.5; i.medidas.alturaParede = 4.8; i.estrutura.tecidoCodigo = 5001; i.comercial.margemExtra = 10;
  }),
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
