// ============================================================
// FN Cortinas — Motor de precificação
// Regra base (operacional real):
//   Para cada 1m de cortina pronta:
//     tecido     : 3 m
//     entretela  : 3 m
//     cordão     : 1 m  (somente Wave)
//     rodízios   : 22 un
//     trilho     : 1 m
//     mão de obra: R$16 × metros de tecido
//
// Inferência automática:
//   - trilho duplo  → quando existe blackout ou forro NÃO costurado
//   - trilho simples → 1 tecido apenas, ou forro costurado junto
//
// Cada função é pura e isolada. UI nunca calcula nada — apenas
// consome estes resultados.
// ============================================================

// -------------------- Constantes --------------------
export const CONFIG = {
  lucro: 0.30,
  jurosCartaoParcela: 0.0125,
  descontoPix: 0.01,
  jurosCredito1x: 0.033,
  andaimeAlturaMin: 4.5,
  andaimeValor: 250,
  maoDeObraPorMetroTecido: 16,
  instalacaoSemForro: 170,
  instalacaoComForro: 220,

  // Multiplicadores por metro de cortina pronta
  fatorTecido: 3,
  fatorEntretela: 3,
  fatorCordao: 1,
  rodiziosPorMetro: 22,
  fatorTrilho: 1,
};

// Preços unitários dos acessórios (R$)
export const PRECOS = {
  rodizio: 0.22,
  cordaoWavePorMetro: 5,
  entretelaPorMetro: 3,
  trilhoSimplesPorMetro: 21, // perfil 13 + suporte 8
  trilhoDuploPorMetro: 38,   // perfil 25 + suporte 13
  varaoSuicoPorMetro: 21,
};

// -------------------- Tipos --------------------
export type FormaPagamento =
  | "Pix"
  | "Cartão Débito"
  | "Cartão Crédito 1x"
  | "Cartão Crédito Parcelado"
  | "Dinheiro";

export type Modelo = "Wave" | "Prega macho" | "Prega americana" | "Persiana";
export type TrilhoTipo = "Varão suíço" | "Trilho simples" | "Trilho duplo";

export interface Tecido {
  codigo: number;
  nome: string;
  largura: number;
  precoMetro: number;
  blackout?: boolean;
}

export const CATALOGO_TECIDOS: Tecido[] = [
  { codigo: 1100, nome: "Cetim 3,00M Branco", largura: 3, precoMetro: 23 },
  { codigo: 1102, nome: "Cetim 3,00M Pérola", largura: 3, precoMetro: 23 },
  { codigo: 1130, nome: "Voil Bruxelas Areia", largura: 3, precoMetro: 23 },
  { codigo: 1131, nome: "Voil Bruxelas Taupe", largura: 3, precoMetro: 23 },
  { codigo: 1132, nome: "Voil Bruxelas Titânio", largura: 3, precoMetro: 23 },
  { codigo: 1502, nome: "Lisieux Linho Areia", largura: 3, precoMetro: 23 },
  { codigo: 1820, nome: "Voil Notre Dame Linho", largura: 3, precoMetro: 23 },
  { codigo: 5001, nome: "Oxford 3,00M Branco", largura: 3, precoMetro: 23 },
];

export const CATALOGO_FORROS: Tecido[] = [
  { codigo: 1300, nome: "Microfibra 100g Bege", largura: 3, precoMetro: 13 },
  { codigo: 1301, nome: "Microfibra 100g Branco", largura: 3, precoMetro: 23 },
  { codigo: 1140, nome: "Voil Ligório OffWhite", largura: 3, precoMetro: 23 },
];

export const CATALOGO_BLACKOUTS: Tecido[] = [
  { codigo: 4679, nome: "Blackout Superblack Branco", largura: 2.8, precoMetro: 23, blackout: true },
  { codigo: 4681, nome: "Blackout Superblack Chumbo", largura: 2.8, precoMetro: 23, blackout: true },
];

// -------------------- Entrada --------------------
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
  larguraCortina: number; // largura desejada da cortina pronta (m)
  alturaCortina: number;  // altura desejada (m)
}

export interface EstruturaInput {
  modelo: Modelo;
  tecidoCodigo: number;
  forroCodigo: number | null;
  blackoutCodigo: number | null;
  costuraXForro: boolean;  // forro costurado junto
  motorizada: boolean;
}

export interface InstalacaoInput {
  instalar: boolean;
  dificuldade: "Padrão" | "Difícil";
  deslocamento: number;
}

export interface ComercialInput {
  desconto: number;
  margemExtra: number;
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

// -------------------- Resultado --------------------
export interface CalcResult {
  // Composição técnica automática
  mtsProntos: number;        // metros lineares de cortina pronta
  mtsTecido: number;         // metros de tecido cortina
  mtsForro: number;          // metros de forro
  mtsBlackout: number;
  mtsEntretela: number;
  mtsCordao: number;
  qtdRodizios: number;
  mtsTrilho: number;
  trilhoInferido: TrilhoTipo;
  // Custos
  custoTecido: number;
  custoForro: number;
  custoBlackout: number;
  custoMaoObra: number;
  custoCordao: number;
  custoRodizio: number;
  custoEntretela: number;
  custoTrilho: number;
  custoAndaime: number;
  custoInstalacao: number;
  custoDeslocamento: number;
  // Totais
  subtotalProducao: number;
  totalComLucro: number;
  descontoValor: number;
  totalFinal: number;
  totalPagamento: number;
  valorParcela: number;

  // legado (compat)
  mtsCortina: number;
  qntdAlturasCortina: number;
  qntdAlturasForro: number;
  custoComando: number;
}

// ============================================================
// FUNÇÕES ISOLADAS
// ============================================================
export function calcularTecido(mtsProntos: number) {
  return +(mtsProntos * CONFIG.fatorTecido).toFixed(2);
}
export function calcularForro(mtsProntos: number, temForro: boolean) {
  return temForro ? +(mtsProntos * CONFIG.fatorTecido).toFixed(2) : 0;
}
export function calcularBlackout(mtsProntos: number, temBlackout: boolean) {
  return temBlackout ? +(mtsProntos * CONFIG.fatorTecido).toFixed(2) : 0;
}
export function calcularEntretela(mtsProntos: number, tecidoBlackout: boolean) {
  return tecidoBlackout ? 0 : +(mtsProntos * CONFIG.fatorEntretela).toFixed(2);
}
export function calcularCordao(modelo: Modelo, mtsProntos: number) {
  return modelo === "Wave" ? +(mtsProntos * CONFIG.fatorCordao).toFixed(2) : 0;
}
export function calcularRodizios(mtsProntos: number) {
  return Math.ceil(mtsProntos * CONFIG.rodiziosPorMetro);
}
export function calcularMaoDeObra(mtsTecido: number) {
  return mtsTecido * CONFIG.maoDeObraPorMetroTecido;
}
export function calcularAndaime(altura: number) {
  return altura > CONFIG.andaimeAlturaMin ? CONFIG.andaimeValor : 0;
}
export function calcularInstalacao(instalar: boolean, comForro: boolean) {
  if (!instalar) return 0;
  return comForro ? CONFIG.instalacaoComForro : CONFIG.instalacaoSemForro;
}

/** Inferência automática do trilho */
export function inferirTrilho(opts: {
  temBlackout: boolean;
  temForro: boolean;
  costuraXForro: boolean;
  motorizada: boolean;
}): TrilhoTipo {
  const duplo = opts.temBlackout || (opts.temForro && !opts.costuraXForro);
  if (duplo) return "Trilho duplo";
  if (opts.motorizada) return "Trilho simples";
  return "Varão suíço";
}

export function calcularTrilho(mtsProntos: number, tipo: TrilhoTipo) {
  const mts = mtsProntos * CONFIG.fatorTrilho;
  const preco =
    tipo === "Trilho duplo"
      ? PRECOS.trilhoDuploPorMetro
      : tipo === "Trilho simples"
      ? PRECOS.trilhoSimplesPorMetro
      : PRECOS.varaoSuicoPorMetro;
  return { metros: +mts.toFixed(2), custo: mts * preco };
}

export function aplicarLucro(subtotal: number, instalacao: number, deslocamento: number, margemExtra = 0) {
  return subtotal * (1 + CONFIG.lucro + margemExtra / 100) + instalacao + deslocamento;
}

export function calcularParcelamento(total: number, forma: FormaPagamento, parcelas: number) {
  let mult = 1;
  switch (forma) {
    case "Pix": mult = 1 - CONFIG.descontoPix; break;
    case "Cartão Crédito 1x": mult = 1 + CONFIG.jurosCredito1x; break;
    case "Cartão Crédito Parcelado": mult = parcelas * CONFIG.jurosCartaoParcela + 1; break;
    default: mult = 1;
  }
  const totalPagamento = total * mult;
  const valorParcela = parcelas > 1 ? totalPagamento / parcelas : totalPagamento;
  return { totalPagamento, valorParcela };
}

// ============================================================
// ORQUESTRADOR
// ============================================================
export function calcular(input: PricingInput): CalcResult {
  const { medidas, estrutura, instalacao, comercial } = input;

  const tecido = CATALOGO_TECIDOS.find((t) => t.codigo === estrutura.tecidoCodigo) ?? CATALOGO_TECIDOS[0];
  const forro = estrutura.forroCodigo != null
    ? CATALOGO_FORROS.find((t) => t.codigo === estrutura.forroCodigo) ?? null
    : null;
  const blackout = estrutura.blackoutCodigo != null
    ? CATALOGO_BLACKOUTS.find((t) => t.codigo === estrutura.blackoutCodigo) ?? null
    : null;

  const mtsProntos = Math.max(medidas.larguraCortina || medidas.larguraJanela, 0);
  const temForro = !!forro;
  const temBlackout = !!blackout;

  // Composição técnica automática
  const mtsTecido    = calcularTecido(mtsProntos);
  const mtsForro     = calcularForro(mtsProntos, temForro);
  const mtsBlackout  = calcularBlackout(mtsProntos, temBlackout);
  const mtsEntretela = calcularEntretela(mtsProntos, !!tecido.blackout);
  const mtsCordao    = calcularCordao(estrutura.modelo, mtsProntos);
  const qtdRodizios  = calcularRodizios(mtsProntos);

  const trilhoInferido = inferirTrilho({
    temBlackout, temForro,
    costuraXForro: estrutura.costuraXForro,
    motorizada: estrutura.motorizada,
  });
  const trilho = calcularTrilho(mtsProntos, trilhoInferido);

  // Custos
  const custoTecido    = mtsTecido * tecido.precoMetro;
  const custoForro     = forro    ? mtsForro    * forro.precoMetro    : 0;
  const custoBlackout  = blackout ? mtsBlackout * blackout.precoMetro : 0;
  const custoEntretela = mtsEntretela * PRECOS.entretelaPorMetro;
  const custoCordao    = mtsCordao * PRECOS.cordaoWavePorMetro;
  const custoRodizio   = qtdRodizios * PRECOS.rodizio;
  const custoTrilho    = trilho.custo;
  const custoMaoObra   = calcularMaoDeObra(mtsTecido + mtsForro + mtsBlackout);

  // Instalação
  const custoAndaime = calcularAndaime(medidas.alturaCortina || medidas.alturaJanela);
  const fatorDificuldade = instalacao.dificuldade === "Difícil" ? 1.4 : 1;
  const custoInstalacao = calcularInstalacao(instalacao.instalar, temForro || temBlackout) * fatorDificuldade + custoAndaime;
  const custoDeslocamento = instalacao.deslocamento || 0;

  const subtotalProducao =
    custoTecido + custoForro + custoBlackout + custoMaoObra +
    custoRodizio + custoCordao + custoEntretela + custoTrilho;

  const totalComLucro = aplicarLucro(subtotalProducao, custoInstalacao, custoDeslocamento, comercial.margemExtra);
  const descontoValor = totalComLucro * (comercial.desconto / 100);
  const totalFinal = totalComLucro - descontoValor;

  const { totalPagamento, valorParcela } = calcularParcelamento(totalFinal, comercial.forma, comercial.parcelas);

  return {
    mtsProntos, mtsTecido, mtsForro, mtsBlackout, mtsEntretela, mtsCordao,
    qtdRodizios, mtsTrilho: trilho.metros, trilhoInferido,
    custoTecido, custoForro, custoBlackout, custoMaoObra, custoCordao,
    custoRodizio, custoEntretela, custoTrilho, custoAndaime,
    custoInstalacao, custoDeslocamento,
    subtotalProducao, totalComLucro, descontoValor, totalFinal,
    totalPagamento, valorParcela,
    // legado
    mtsCortina: mtsTecido,
    qntdAlturasCortina: 0,
    qntdAlturasForro: 0,
    custoComando: 0,
  };
}

export const formatBRL = (v: number) =>
  (isFinite(v) ? v : 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const defaultPricingInput = (): PricingInput => ({
  ambiente: { cliente: "", ambiente: "Sala", observacoes: "" },
  medidas: {
    larguraParede: 3.5, alturaParede: 2.8,
    larguraJanela: 2.4, alturaJanela: 2.2,
    larguraCortina: 3.0, alturaCortina: 2.5,
  },
  estrutura: {
    modelo: "Wave",
    tecidoCodigo: 1130,
    forroCodigo: 1300,
    blackoutCodigo: null,
    costuraXForro: false,
    motorizada: false,
  },
  instalacao: { instalar: true, dificuldade: "Padrão", deslocamento: 0 },
  comercial: { desconto: 0, margemExtra: 0, forma: "Pix", parcelas: 1 },
});
