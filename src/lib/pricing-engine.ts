// ============================================================
// FN Cortinas — Motor de precificação
// Regras extraídas da planilha real (cortinas_FN_ok.xlsm):
//   • Aba "Configurações"     — taxas e constantes
//   • Aba "Planilha calculadora" — fórmulas operacionais
//   • Aba "Banco de dados - preços" — catálogo
// Cada função abaixo é isolada e pura: substituível sem
// alterar a interface.
// ============================================================

// -------------------- Constantes --------------------
export const CONFIG = {
  lucro: 0.30,            // 30%
  jurosCartaoParcela: 0.0125,
  descontoPix: 0.01,
  jurosCredito1x: 0.033,
  andaimeAlturaMin: 4.5,  // metros
  andaimeValor: 250,
  maoDeObraPorMetro: 16,
  instalacaoSemForro: 170,
  instalacaoComForro: 220,
};

// -------------------- Catálogo (extraído da planilha) --------------------
export type FormaPagamento = "Pix" | "Cartão Débito" | "Cartão Crédito 1x" | "Cartão Crédito Parcelado" | "Dinheiro";
export type Modelo = "Wave" | "Prega macho" | "Prega americana" | "Persiana";
export type Perfil = "Varão suíço" | "Trilho simples" | "Trilho duplo";
export type TipoPerfil = "Simples 1 p/ metro" | "Duplo 1 p/ metro" | "1 para 1" | "1 para 2";

export interface Tecido {
  codigo: number;
  nome: string;
  largura: number;     // m
  precoMetro: number;  // R$/m
  blackout?: boolean;
}

export interface AcessorioPreco {
  perfilSimples: number;  // Varão / Trilho simples
  perfilDuplo: number;    // Trilho duplo
  suporteSimples: number;
  suporteDuplo: number;
  ponteira: number;
  clip: number;
  cordaoWave: number;     // R$/m
  entretelaPorCm: number; // R$ / (cm * 100m) ⇒ planilha usa 300/100 = 3 por metro
  rodizioPor1000: number; // 220 / 1000 = 0.22 por unidade
}

export const ACESSORIOS: AcessorioPreco = {
  perfilSimples: 13,
  perfilDuplo: 25,
  suporteSimples: 8,
  suporteDuplo: 13,
  ponteira: 5.2,
  clip: 0.09,
  cordaoWave: 5,
  entretelaPorCm: 3,   // por metro de largura
  rodizioPor1000: 0.22,
};

// Catálogo enxuto (subconjunto representativo da planilha)
export const CATALOGO_TECIDOS: Tecido[] = [
  { codigo: 1100, nome: "Cetim 3,00M Pes Branco", largura: 3, precoMetro: 23 },
  { codigo: 1102, nome: "Cetim 3,00M Pes Pérola", largura: 3, precoMetro: 23 },
  { codigo: 1130, nome: "Voil Bruxelas Areia", largura: 3, precoMetro: 23 },
  { codigo: 1131, nome: "Voil Bruxelas Taupe", largura: 3, precoMetro: 23 },
  { codigo: 1132, nome: "Voil Bruxelas Titânio", largura: 3, precoMetro: 23 },
  { codigo: 1300, nome: "Microfibra 100g Bege", largura: 3, precoMetro: 13 },
  { codigo: 1502, nome: "Lisieux 80%Pes 20%Linho Areia", largura: 3, precoMetro: 23 },
  { codigo: 1820, nome: "Voil Notre Dame Linho", largura: 3, precoMetro: 23 },
  { codigo: 4679, nome: "Blackout Superblack Branco", largura: 2.8, precoMetro: 23, blackout: true },
  { codigo: 4681, nome: "Blackout Superblack Chumbo", largura: 2.8, precoMetro: 23, blackout: true },
  { codigo: 5001, nome: "Oxford 3,00M Branco", largura: 3, precoMetro: 23 },
];

export const CATALOGO_FORROS: Tecido[] = [
  { codigo: 1300, nome: "Microfibra 100g Bege", largura: 3, precoMetro: 13 },
  { codigo: 1301, nome: "Microfibra 100g Branco", largura: 3, precoMetro: 23 },
  { codigo: 1140, nome: "Voil Ligório OffWhite", largura: 3, precoMetro: 23 },
  { codigo: 4679, nome: "Blackout Superblack Branco", largura: 2.8, precoMetro: 23, blackout: true },
];

// -------------------- Tipos de entrada --------------------
export interface AmbienteInput {
  cliente: string;
  ambiente: string;
  observacoes?: string;
}

export interface MedidasInput {
  larguraParede: number;
  alturaParede: number;
  larguraJanela: number;
  alturaJanela: number;
}

export interface EstruturaInput {
  modelo: Modelo;
  tecidoCodigo: number;
  forroCodigo: number | null;     // null = sem forro
  costuraXForro: boolean;         // forro junto à cortina
  perfil: Perfil;
  tipoPerfil: TipoPerfil;
  folhas: number;
  motorizada: boolean;
  comando: boolean;
  comandoValor?: number;
}

export interface InstalacaoInput {
  instalar: boolean;
  dificuldade: "Padrão" | "Difícil";
  deslocamento: number;
}

export interface ComercialInput {
  desconto: number;       // %
  margemExtra: number;    // % adicional além de 30%
  forma: FormaPagamento;
  parcelas: number;
}

export interface PricingInput {
  ambiente: AmbienteInput;
  medidas: MedidasInput;
  estrutura: EstruturaInput;
  instalacao: InstalacaoInput;
  comercial: ComercialInput;
}

// -------------------- Resultados --------------------
export interface CalcResult {
  // Medidas
  mtsCortina: number;        // metros lineares de tecido cortina
  mtsForro: number;          // idem forro
  qntdAlturasCortina: number;
  qntdAlturasForro: number;
  // Custos
  custoTecido: number;
  custoForro: number;
  custoMaoObra: number;
  custoCordao: number;
  custoRodizio: number;
  custoEntretela: number;
  custoTrilho: number;
  custoComando: number;
  custoAndaime: number;
  custoInstalacao: number;
  custoDeslocamento: number;
  // Totais
  subtotalProducao: number;  // tudo exceto instalação/deslocamento
  totalComLucro: number;     // subtotal * (1+lucro) + instalação + deslocamento
  descontoValor: number;
  totalFinal: number;        // após desconto
  // Parcelamento
  totalPagamento: number;    // com juros / desconto da forma de pagamento
  valorParcela: number;
}

// ============================================================
// FUNÇÕES ISOLADAS — uma regra por função
// ============================================================

/** Metros lineares de uma altura (planilha B3) */
export function calcularMetrosPorAltura(altura: number, larguraJanela: number) {
  return altura > 2.85 ? altura + 0.35 : larguraJanela * 3;
}

/** Quantidade de alturas necessárias (planilha D3) — depende do franzimento */
export function calcularQntdAlturas(larguraJanela: number, alturaUnitaria: number, fator = 3.4) {
  const larguraX = larguraJanela * fator;
  return Math.ceil(larguraX / alturaUnitaria);
}

/** Total de tecido para a cortina (E3) */
export function calcularTecido(medidas: MedidasInput): { metros: number; alturas: number } {
  const { alturaJanela, larguraJanela } = medidas;
  if (alturaJanela > 2.85) {
    const alturaUnit = calcularMetrosPorAltura(alturaJanela, larguraJanela);
    const alturas = calcularQntdAlturas(larguraJanela, alturaUnit);
    return { metros: +(alturas * alturaUnit).toFixed(3), alturas };
  }
  return { metros: +(larguraJanela * 3).toFixed(3), alturas: 1 };
}

/** Total de tecido para o forro (E4) */
export function calcularForro(
  medidas: MedidasInput,
  costuraXForro: boolean,
  totalCortina: { metros: number; alturas: number }
): { metros: number; alturas: number } {
  if (costuraXForro) return totalCortina;
  const alturaUnit = medidas.alturaJanela + 0.35;
  const alturas = calcularQntdAlturas(medidas.larguraJanela, alturaUnit);
  return { metros: +(alturas * alturaUnit).toFixed(3), alturas };
}

/** Mão de obra (B8/B9): soma de cortina+forro × 16 */
export function calcularMaoDeObra(totalMetros: number) {
  return totalMetros * CONFIG.maoDeObraPorMetro;
}

/** Rodízio (B10): 22 unidades por metro × preço (220/1000) */
export function calcularRodizio(larguraJanela: number) {
  return 22 * larguraJanela * ACESSORIOS.rodizioPor1000;
}

/** Cordão (B11): só para modelo Wave */
export function calcularCordao(modelo: Modelo, larguraJanela: number) {
  return modelo === "Wave" ? larguraJanela * ACESSORIOS.cordaoWave : 0;
}

/** Entretela (B12): zero para Blackout, senão largura × 3 */
export function calcularEntretela(larguraJanela: number, tecido: Tecido) {
  return tecido.blackout ? 0 : larguraJanela * ACESSORIOS.entretelaPorCm;
}

/** Trilho/Varão (B13) */
export function calcularTrilho(larguraJanela: number, perfil: Perfil, tipoPerfil: TipoPerfil) {
  const isSimples = tipoPerfil === "Simples 1 p/ metro" || tipoPerfil === "1 para 1";
  const precoSuporte = isSimples ? ACESSORIOS.suporteSimples : ACESSORIOS.suporteDuplo;
  const precoPerfil = perfil === "Trilho duplo" ? ACESSORIOS.perfilDuplo : ACESSORIOS.perfilSimples;
  return larguraJanela * (precoSuporte + precoPerfil);
}

/** Andaime (H2): aplica taxa fixa quando altura ultrapassa 4,5m */
export function calcularAndaime(alturaJanela: number) {
  return alturaJanela > CONFIG.andaimeAlturaMin ? CONFIG.andaimeValor : 0;
}

/** Instalação (B16): 170 sem forro, 220 com forro */
export function calcularInstalacao(instalar: boolean, comForro: boolean) {
  if (!instalar) return 0;
  return comForro ? CONFIG.instalacaoComForro : CONFIG.instalacaoSemForro;
}

/** Total com lucro: subtotal × (1+lucro) + instalação (sem lucro) */
export function aplicarLucro(subtotal: number, instalacao: number, deslocamento: number, margemExtra = 0) {
  return subtotal * (1 + CONFIG.lucro + margemExtra / 100) + instalacao + deslocamento;
}

/** Multiplicador da forma de pagamento (H3) */
export function calcularParcelamento(total: number, forma: FormaPagamento, parcelas: number) {
  let mult = 1;
  switch (forma) {
    case "Pix":
      mult = 1 - CONFIG.descontoPix;
      break;
    case "Cartão Crédito 1x":
      mult = 1 + CONFIG.jurosCredito1x;
      break;
    case "Cartão Crédito Parcelado":
      mult = parcelas * CONFIG.jurosCartaoParcela + 1;
      break;
    default:
      mult = 1;
  }
  const totalPagamento = total * mult;
  const valorParcela = parcelas > 1 ? totalPagamento / parcelas : totalPagamento;
  return { totalPagamento, valorParcela, mult };
}

// ============================================================
// ORQUESTRADOR
// ============================================================
export function calcular(input: PricingInput): CalcResult {
  const { medidas, estrutura, instalacao, comercial } = input;

  const tecido = CATALOGO_TECIDOS.find((t) => t.codigo === estrutura.tecidoCodigo) ?? CATALOGO_TECIDOS[0];
  const forro =
    estrutura.forroCodigo != null
      ? CATALOGO_FORROS.find((t) => t.codigo === estrutura.forroCodigo) ?? null
      : null;

  // Tecido e forro
  const cortinaQ = calcularTecido(medidas);
  const forroQ = forro
    ? calcularForro(medidas, estrutura.costuraXForro, cortinaQ)
    : { metros: 0, alturas: 0 };

  const custoTecido = cortinaQ.metros * tecido.precoMetro;
  const custoForro = forro ? forroQ.metros * forro.precoMetro : 0;

  // Mão de obra (planilha aplica em cortina+forro)
  const totalM = cortinaQ.metros + forroQ.metros;
  const custoMaoObra = calcularMaoDeObra(totalM);

  // Acessórios
  const custoRodizio = calcularRodizio(medidas.larguraJanela);
  const custoCordao = calcularCordao(estrutura.modelo, medidas.larguraJanela);
  const custoEntretela = calcularEntretela(medidas.larguraJanela, tecido);
  const custoTrilho = calcularTrilho(medidas.larguraJanela, estrutura.perfil, estrutura.tipoPerfil);
  const custoComando = estrutura.comando ? (estrutura.comandoValor ?? 0) : 0;

  // Instalação / logística
  const custoAndaime = calcularAndaime(medidas.alturaJanela);
  const dificuldadeFator = instalacao.dificuldade === "Difícil" ? 1.4 : 1;
  const custoInstalacao = calcularInstalacao(instalacao.instalar, !!forro) * dificuldadeFator + custoAndaime;
  const custoDeslocamento = instalacao.deslocamento;

  const subtotalProducao =
    custoTecido + custoForro + custoMaoObra + custoRodizio +
    custoCordao + custoEntretela + custoTrilho + custoComando;

  const totalComLucro = aplicarLucro(
    subtotalProducao,
    custoInstalacao,
    custoDeslocamento,
    comercial.margemExtra
  );

  const descontoValor = totalComLucro * (comercial.desconto / 100);
  const totalFinal = totalComLucro - descontoValor;

  const { totalPagamento, valorParcela } = calcularParcelamento(
    totalFinal,
    comercial.forma,
    comercial.parcelas
  );

  return {
    mtsCortina: cortinaQ.metros,
    mtsForro: forroQ.metros,
    qntdAlturasCortina: cortinaQ.alturas,
    qntdAlturasForro: forroQ.alturas,
    custoTecido,
    custoForro,
    custoMaoObra,
    custoCordao,
    custoRodizio,
    custoEntretela,
    custoTrilho,
    custoComando,
    custoAndaime,
    custoInstalacao,
    custoDeslocamento,
    subtotalProducao,
    totalComLucro,
    descontoValor,
    totalFinal,
    totalPagamento,
    valorParcela,
  };
}

// Formatador BR
export const formatBRL = (v: number) =>
  (isFinite(v) ? v : 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Input padrão (visita zero)
export const defaultPricingInput = (): PricingInput => ({
  ambiente: { cliente: "", ambiente: "Sala", observacoes: "" },
  medidas: { larguraParede: 3.5, alturaParede: 2.8, larguraJanela: 2.8, alturaJanela: 2.4 },
  estrutura: {
    modelo: "Wave",
    tecidoCodigo: 1130,
    forroCodigo: 1300,
    costuraXForro: false,
    perfil: "Varão suíço",
    tipoPerfil: "Simples 1 p/ metro",
    folhas: 2,
    motorizada: false,
    comando: false,
  },
  instalacao: { instalar: true, dificuldade: "Padrão", deslocamento: 0 },
  comercial: { desconto: 0, margemExtra: 0, forma: "Pix", parcelas: 1 },
});
