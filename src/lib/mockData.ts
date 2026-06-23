import {
  calcularComodo,
  calcularProposta,
  defaultComodo,
  defaultPricingInput,
  ambienteLabel,
  type ComodoInput,
  type ComercialInput,
  type CalcResult,
} from "./pricing-engine";

export type ProposalStatus = "Rascunho" | "Enviado" | "Aprovado" | "Perdido";

/** Um cômodo já calculado, guardado na proposta. */
export interface ComodoData extends ComodoInput {
  result: CalcResult;
}

export interface Proposal {
  id: string;
  cliente: string;
  comodos: ComodoData[];      // 1 ou mais cômodos no mesmo orçamento
  comercial: ComercialInput;  // condições da proposta inteira
  valor: number;              // total final agregado
  status: ProposalStatus;
  data: string;
  ambiente: string;           // rótulo derivado (ex.: "Sala +2")
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

// Cada proposta de exemplo carrega cômodos + result reais para que a tela da
// Empresa e o PDF tenham conteúdo completo de imediato.
type ComodoSpec = { ambiente: string; over: (c: ComodoInput) => void };

function seedProposal(
  id: string,
  cliente: string,
  status: ProposalStatus,
  data: string,
  specs: ComodoSpec[],
  comercialOver?: Partial<ComercialInput>
): Proposal {
  const comercial: ComercialInput = { ...defaultPricingInput().comercial, ...comercialOver };
  const comodos: ComodoData[] = specs.map((s) => {
    const c = defaultComodo();
    c.ambiente = s.ambiente;
    s.over(c);
    return { ...c, result: calcularComodo(c, comercial) };
  });
  const valor = calcularProposta(comodos, comercial).totalFinal;
  return { id, cliente, comodos, comercial, valor, status, data, ambiente: ambienteLabel(comodos) };
}

export const initialProposals: Proposal[] = [
  seedProposal("p1", "Marina Albuquerque", "Aprovado", "2026-05-12", [
    { ambiente: "Sala de Estar", over: (c) => { c.medidas.larguraParede = 4.2; c.medidas.alturaParede = 2.8; c.estrutura.tecidoCodigo = 1130; } },
  ]),
  seedProposal("p2", "Ricardo Mendes", "Enviado", "2026-05-15", [
    { ambiente: "Suíte Master", over: (c) => { c.medidas.larguraParede = 3.0; c.medidas.alturaParede = 2.6; c.estrutura.blackoutCodigo = 4681; } },
  ]),
  seedProposal("p3", "Helena Castro", "Rascunho", "2026-05-17", [
    { ambiente: "Home Office", over: (c) => { c.medidas.larguraParede = 2.2; c.medidas.alturaParede = 2.4; c.estrutura.forroCodigo = null; c.estrutura.modelo = "Prega macho"; } },
  ]),
  // Proposta com vários cômodos no mesmo orçamento
  seedProposal("p4", "Família Tavares", "Aprovado", "2026-05-09", [
    { ambiente: "Sala de Jantar", over: (c) => { c.medidas.larguraParede = 5.0; c.medidas.alturaParede = 3.0; c.estrutura.motorizada = true; } },
    { ambiente: "Sala de Estar", over: (c) => { c.medidas.larguraParede = 4.0; c.medidas.alturaParede = 2.8; } },
    { ambiente: "Suíte Master", over: (c) => { c.medidas.larguraParede = 3.2; c.medidas.alturaParede = 2.6; c.estrutura.blackoutCodigo = 4681; } },
  ]),
  seedProposal("p5", "Studio M&P", "Aprovado", "2026-05-02", [
    { ambiente: "Showroom", over: (c) => { c.medidas.larguraParede = 7.5; c.medidas.alturaParede = 4.8; c.estrutura.tecidoCodigo = 5001; } },
  ], { margemExtra: 10 }),
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
