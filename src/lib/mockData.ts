export type ProposalStatus = "Rascunho" | "Enviado" | "Aprovado" | "Perdido";

export interface Proposal {
  id: string;
  cliente: string;
  ambiente: string;
  valor: number;
  status: ProposalStatus;
  data: string;
  config?: any;
}

export interface StockItem {
  id: string;
  nome: string;
  categoria: "Tecido" | "Rolo" | "Trilho" | "Varão" | "Presilha" | "Acessório";
  quantidade: number;
  unidade: string;
  custo: number;
  minimo: number;
}

export const initialProposals: Proposal[] = [
  { id: "p1", cliente: "Marina Albuquerque", ambiente: "Sala de Estar", valor: 8450, status: "Aprovado", data: "2026-05-12" },
  { id: "p2", cliente: "Ricardo Mendes", ambiente: "Suíte Master", valor: 5200, status: "Enviado", data: "2026-05-15" },
  { id: "p3", cliente: "Helena Castro", ambiente: "Home Office", valor: 3100, status: "Rascunho", data: "2026-05-17" },
  { id: "p4", cliente: "Família Tavares", ambiente: "Sala de Jantar", valor: 12800, status: "Aprovado", data: "2026-05-09" },
  { id: "p5", cliente: "Dr. Antônio Vilar", ambiente: "Consultório", valor: 4750, status: "Perdido", data: "2026-05-05" },
  { id: "p6", cliente: "Beatriz Lemos", ambiente: "Quarto Infantil", valor: 2890, status: "Enviado", data: "2026-05-18" },
  { id: "p7", cliente: "Studio Arquitetura M&P", ambiente: "Showroom", valor: 22400, status: "Aprovado", data: "2026-05-02" },
];

export const initialStock: StockItem[] = [
  { id: "s1", nome: "Linho Belga Off-White", categoria: "Tecido", quantidade: 48, unidade: "m", custo: 89, minimo: 20 },
  { id: "s2", nome: "Veludo Champagne", categoria: "Tecido", quantidade: 12, unidade: "m", custo: 145, minimo: 15 },
  { id: "s3", nome: "Blackout Premium Navy", categoria: "Tecido", quantidade: 32, unidade: "m", custo: 72, minimo: 20 },
  { id: "s4", nome: "Voil Seda Pura", categoria: "Tecido", quantidade: 64, unidade: "m", custo: 58, minimo: 25 },
  { id: "s5", nome: "Rolo Persiana Bandô 3m", categoria: "Rolo", quantidade: 8, unidade: "un", custo: 320, minimo: 5 },
  { id: "s6", nome: "Rolo Solar Screen 3m", categoria: "Rolo", quantidade: 3, unidade: "un", custo: 380, minimo: 5 },
  { id: "s7", nome: "Trilho Suíço Discreto", categoria: "Trilho", quantidade: 14, unidade: "m", custo: 95, minimo: 10 },
  { id: "s8", nome: "Varão Dourado Escovado 28mm", categoria: "Varão", quantidade: 6, unidade: "un", custo: 240, minimo: 4 },
  { id: "s9", nome: "Presilha Magnética Premium", categoria: "Presilha", quantidade: 120, unidade: "un", custo: 12, minimo: 50 },
  { id: "s10", nome: "Pingente Cristal Champagne", categoria: "Acessório", quantidade: 0, unidade: "un", custo: 45, minimo: 10 },
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
