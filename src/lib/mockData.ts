import {
  calcularComodo,
  calcularProposta,
  defaultComodo,
  defaultPricingInput,
  ambienteLabel,
  type ComodoInput,
  type ComercialInput,
  type CalcResult,
  type AmbienteItem,
} from "./pricing-engine";

export type ProposalStatus = "Pendente" | "Aprovado" | "Perdido";

/** Um cômodo já calculado, guardado na proposta. */
export interface ComodoData extends ComodoInput {
  result: CalcResult;
}

export interface Proposal {
  id: string;
  numero?: number;            // nº sequencial do orçamento (novo formato)
  osNumero?: number;          // nº da Ordem de Serviço (só ao aprovar; conta só aprovados)
  cliente: string;
  endereco: string;           // endereço do cliente
  contato: string;            // telefone/contato do cliente
  comodos: ComodoData[];      // formato antigo (1 config por cômodo)
  ambientes?: AmbienteItem[]; // novo formato: cada ambiente com suas opções
  comercial: ComercialInput;  // condições da proposta inteira
  valor: number;              // total final agregado
  status: ProposalStatus;
  data: string;
  ambiente: string;           // rótulo derivado (ex.: "Sala +2")
}

export interface StockItem {
  id: string;
  nome: string;
  categoria: "Tecido" | "Forro" | "Blackout" | "Trilho" | "Varão" | "Acessório";
  codigo?: number;
  largura?: number;   // largura do rolo (m) — usada quando o item é tecido/forro/blackout
  quantidade: number;
  unidade: string;
  custo: number;      // p/ tecidos/forros/blackouts = preço por metro (R$/m)
  minimo: number;
}

// Cada proposta de exemplo carrega cômodos + result reais para que a tela da
// Empresa e o PDF tenham conteúdo completo de imediato.
type ComodoSpec = { ambiente: string; over: (c: ComodoInput) => void };

function seedProposal(
  id: string,
  cliente: string,
  endereco: string,
  contato: string,
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
  return { id, cliente, endereco, contato, comodos, comercial, valor, status, data, ambiente: ambienteLabel(comodos) };
}

// Propostas de exemplo — todas "Pendente" para o faturamento começar do zero.
// Marque como "Aprovado" na tela de Registros para vê-lo crescer.
export const initialProposals: Proposal[] = [
  seedProposal("p1", "Marina Albuquerque", "Rua das Acácias, 120 — Jardim Europa", "(11) 98888-1010", "Pendente", "2026-05-12", [
    { ambiente: "Sala de Estar", over: (c) => { c.medidas.larguraParede = 4.2; c.medidas.alturaParede = 2.8; c.estrutura.tecidoCodigo = 101; } },
  ]),
  seedProposal("p2", "Ricardo Mendes", "Av. Beira Mar, 900 — apto 1502", "(11) 97777-2020", "Pendente", "2026-05-15", [
    { ambiente: "Suíte Master", over: (c) => { c.medidas.larguraParede = 3.0; c.medidas.alturaParede = 2.6; c.estrutura.blackoutCodigo = 302; } },
  ]),
  seedProposal("p3", "Helena Castro", "Rua Itu, 45 — Centro", "(11) 96666-3030", "Pendente", "2026-05-17", [
    { ambiente: "Home Office", over: (c) => { c.medidas.larguraParede = 2.2; c.medidas.alturaParede = 2.4; c.estrutura.forroCodigo = null; c.estrutura.modelo = "Prega macho"; } },
  ]),
  // Proposta com vários cômodos no mesmo orçamento
  seedProposal("p4", "Família Tavares", "Alameda dos Ipês, 300 — Alphaville", "(11) 95555-4040", "Pendente", "2026-05-09", [
    { ambiente: "Sala de Jantar", over: (c) => { c.medidas.larguraParede = 5.0; c.medidas.alturaParede = 3.0; c.estrutura.motorizada = true; } },
    { ambiente: "Sala de Estar", over: (c) => { c.medidas.larguraParede = 4.0; c.medidas.alturaParede = 2.8; } },
    { ambiente: "Suíte Master", over: (c) => { c.medidas.larguraParede = 3.2; c.medidas.alturaParede = 2.6; c.estrutura.blackoutCodigo = 302; } },
  ]),
  seedProposal("p5", "Studio M&P", "Rua Oscar Freire, 1200 — Jardins", "(11) 94444-5050", "Pendente", "2026-05-02", [
    { ambiente: "Showroom", over: (c) => { c.medidas.larguraParede = 7.5; c.medidas.alturaParede = 4.8; c.estrutura.tecidoCodigo = 101; } },
  ], { margemExtra: 10 }),
];

// Estoque = fonte única dos materiais. Tecidos/forros/blackouts viram opção
// na calculadora (custo = R$/m, largura = largura do rolo). Códigos casam com
// o catálogo do pricing-engine.
export const initialStock: StockItem[] = [
  // Tecidos
  { id: "s1", nome: "Linho",    categoria: "Tecido", codigo: 101, largura: 3,   quantidade: 84, unidade: "m", custo: 23, minimo: 30 },
  { id: "s2", nome: "Moorea",   categoria: "Tecido", codigo: 102, largura: 3,   quantidade: 20, unidade: "m", custo: 43, minimo: 15 },
  { id: "s3", nome: "Shantung", categoria: "Tecido", codigo: 103, largura: 2.8, quantidade: 15, unidade: "m", custo: 49, minimo: 15 },
  { id: "s4", nome: "Cetim",    categoria: "Tecido", codigo: 104, largura: 3,   quantidade: 40, unidade: "m", custo: 18, minimo: 20 },
  { id: "s5", nome: "Voil",     categoria: "Tecido", codigo: 105, largura: 3,   quantidade: 60, unidade: "m", custo: 13, minimo: 25 },
  // Forros
  { id: "s6", nome: "Microfibra 65g",  categoria: "Forro", codigo: 201, largura: 3, quantidade: 50, unidade: "m", custo: 13, minimo: 25 },
  { id: "s7", nome: "Microfibra 100g", categoria: "Forro", codigo: 202, largura: 3, quantidade: 22, unidade: "m", custo: 16, minimo: 25 },
  // Blackouts
  { id: "s8",  nome: "Blackout 80%",        categoria: "Blackout", codigo: 301, largura: 3,   quantidade: 30, unidade: "m", custo: 35, minimo: 20 },
  { id: "s9",  nome: "Blackout 100%",       categoria: "Blackout", codigo: 302, largura: 2.8, quantidade: 12, unidade: "m", custo: 45, minimo: 20 },
  { id: "s10", nome: "Blackout Linho 100%", categoria: "Blackout", codigo: 303, largura: 2.8, quantidade: 8,  unidade: "m", custo: 66, minimo: 10 },
  // Acessórios / estrutura
  { id: "s11", nome: "Varão Suíço 28mm",   categoria: "Varão",     quantidade: 9,   unidade: "un", custo: 21,   minimo: 6 },
  { id: "s12", nome: "Trilho Duplo",       categoria: "Trilho",    quantidade: 4,   unidade: "un", custo: 38,   minimo: 5 },
  { id: "s13", nome: "Cordão Smart Wave",  categoria: "Acessório", quantidade: 60,  unidade: "m",  custo: 5,    minimo: 20 },
  { id: "s14", nome: "Rodízio",            categoria: "Acessório", quantidade: 980, unidade: "un", custo: 0.22, minimo: 200 },
  { id: "s15", nome: "Suporte Duplo",      categoria: "Acessório", quantidade: 0,   unidade: "un", custo: 13,   minimo: 8 },
];

/** Faturamento mensal a partir das propostas aprovadas (para o gráfico da dash). */
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
export function faturamentoMensal(proposals: Proposal[]) {
  const porMes = new Map<string, number>();
  proposals
    .filter((p) => p.status === "Aprovado")
    .forEach((p) => {
      const key = p.data.slice(0, 7); // YYYY-MM
      porMes.set(key, (porMes.get(key) ?? 0) + p.valor);
    });
  return [...porMes.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, valor]) => ({ mes: MESES[Number(k.slice(5, 7)) - 1] ?? k, valor }));
}

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
