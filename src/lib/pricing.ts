// ============================================================
// MÓDULO DE CÁLCULO DE PRECIFICAÇÃO — FN Cortinas
// ------------------------------------------------------------
// IMPORTANTE: As fórmulas abaixo são SIMULADAS para o protótipo.
// As fórmulas reais serão substituídas após análise da planilha
// do cliente. Cada função abaixo está isolada para facilitar a
// substituição posterior sem alterar a interface.
// ============================================================

export interface CalcInput {
  larguraParede: number; // metros
  alturaParede: number;
  larguraJanela: number;
  alturaJanela: number;
  tecido: string;
  tipoCortina: string;
  tipoPersiana: string;
  trilho: string;
  franzimento: number; // multiplicador 1.5 / 2 / 2.5 / 3
  presilhas: number;
  instalacao: boolean;
  deslocamento: number;
  margem: number; // %
  desconto: number; // %
}

export interface CalcResult {
  tecidoMetros: number;
  rolos: number;
  acessorios: number;
  custoTecido: number;
  custoTrilho: number;
  custoAcessorios: number;
  custoInstalacao: number;
  custoDeslocamento: number;
  subtotal: number;
  margemValor: number;
  descontoValor: number;
  total: number;
}

// Preços-base SIMULADOS por categoria (R$)
const PRICE_TECIDO: Record<string, number> = {
  "Linho Belga": 89,
  "Veludo Champagne": 145,
  "Blackout Premium": 72,
  "Voil Seda": 58,
  "Algodão Premium": 65,
};

const PRICE_TRILHO: Record<string, number> = {
  "Trilho Suíço": 95,
  "Varão Dourado": 240,
  "Trilho Motorizado": 480,
  "Bandô Embutido": 180,
};

const PRICE_TIPO_CORTINA: Record<string, number> = {
  "Wave": 1.0,
  "Romana": 1.15,
  "Tradicional": 1.0,
  "Drapeada": 1.25,
  "Painel": 0.9,
};

// SIMULADO: substituir pelas fórmulas reais da planilha
export function calcular(input: CalcInput): CalcResult {
  const larguraEfetiva = Math.max(input.larguraJanela, input.larguraParede);
  const alturaEfetiva = input.alturaJanela || input.alturaParede;

  // metros lineares de tecido considerando franzimento
  const tecidoMetros = Number(
    (larguraEfetiva * input.franzimento * (alturaEfetiva / 2.8)).toFixed(2)
  );

  const rolos = Math.ceil(tecidoMetros / 3);
  const acessorios = input.presilhas + Math.ceil(larguraEfetiva * 2);

  const precoTecidoBase = PRICE_TECIDO[input.tecido] ?? 80;
  const fatorTipo = PRICE_TIPO_CORTINA[input.tipoCortina] ?? 1;
  const precoTrilho = PRICE_TRILHO[input.trilho] ?? 100;

  const custoTecido = tecidoMetros * precoTecidoBase * fatorTipo;
  const custoTrilho = precoTrilho * larguraEfetiva;
  const custoAcessorios = acessorios * 12 + input.presilhas * 8;
  const custoInstalacao = input.instalacao ? 380 + larguraEfetiva * 45 : 0;
  const custoDeslocamento = input.deslocamento;

  const subtotal =
    custoTecido + custoTrilho + custoAcessorios + custoInstalacao + custoDeslocamento;

  const margemValor = subtotal * (input.margem / 100);
  const comMargem = subtotal + margemValor;
  const descontoValor = comMargem * (input.desconto / 100);
  const total = comMargem - descontoValor;

  return {
    tecidoMetros,
    rolos,
    acessorios,
    custoTecido,
    custoTrilho,
    custoAcessorios,
    custoInstalacao,
    custoDeslocamento,
    subtotal,
    margemValor,
    descontoValor,
    total,
  };
}

// Variações por tier — multiplicadores SIMULADOS
export function calcularOpcoes(input: CalcInput) {
  return {
    economica: calcular({ ...input, margem: Math.max(input.margem - 10, 15) }),
    premium: calcular(input),
    luxo: calcular({
      ...input,
      franzimento: Math.min(input.franzimento + 0.5, 3),
      margem: input.margem + 15,
    }),
  };
}

export const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
