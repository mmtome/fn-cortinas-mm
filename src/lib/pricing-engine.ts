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
// Variáveis e catálogos são editáveis pelo usuário (ver store).
// O motor recebe um `ctx` opcional com os valores atuais; sem ele
// usa os defaults abaixo. Cada função é pura — a UI nunca calcula.
// ============================================================

// -------------------- Variáveis padrão (editáveis) --------------------
// Tudo o que o usuário pode ajustar em "Variáveis do projeto".
export const DEFAULT_VARS = {
  lucro: 0.30,
  jurosCartaoParcela: 0.0125,
  descontoPix: 0.01,
  jurosCredito1x: 0.033,
  andaimeAlturaMin: 4.5,
  andaimeValor: 100,       // adicional quando a altura passa de 4,5m
  motorizadaValor: 100,    // adicional quando a cortina é motorizada
  maoDeObraPorMetroTecido: 16,
  instalacaoSemForro: 170, // sem forro ou forro costurado junto
  instalacaoComForro: 220, // com forro separado (trilho duplo)
  fatorDificuldade: 1.4,

  // Corte do tecido (rolo) — base do Guia de Cálculo
  larguraRolo: 3.0,        // largura do rolo de tecido (m)
  larguraUtilRolo: 2.85,   // largura útil — limite entre Caso A e Caso B
  bainhaLimite: 0.15,      // dobra mínima usável — usada só para decidir A/B
  bainha: 0.35,            // bainha cheia (cima + baixo) — usada na metragem do Caso B
  forroSeparadoFator: 1.2, // forro não costurado junto: largura × 1,2

  // Multiplicadores por metro de cortina pronta
  fatorTecido: 3,          // franzido (caimento) = 3× a largura
  fatorEntretela: 3,       // entretela acompanha a largura franzida
  fatorCordao: 1,
  rodiziosPorMetro: 22,
  fatorTrilho: 1,          // trilho = largura da parede

  // Preços unitários dos acessórios (R$)
  rodizio: 0.22,
  cordaoWavePorMetro: 5,
  entretelaPorMetro: 3,
  trilhoSimplesPorMetro: 21, // perfil 13 + suporte 8
  trilhoDuploPorMetro: 38,   // perfil 25 + suporte 13
  varaoSuicoPorMetro: 21,
};

export type Vars = typeof DEFAULT_VARS;

// Compat: alguns lugares ainda importam CONFIG/PRECOS.
export const CONFIG = DEFAULT_VARS;
export const PRECOS = DEFAULT_VARS;

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

// Catálogos iniciais (seed). O usuário pode adicionar/editar livremente.
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
  larguraParede: number; // largura da parede (m) — única medida digitada
  alturaParede: number;  // altura da parede (m)
}

/** Largura desejada da cortina = largura da parede arredondada para o inteiro de cima. */
export const larguraCortinaDesejada = (larguraParede: number) =>
  Math.max(1, Math.ceil(larguraParede || 0));

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

// Contexto de cálculo: catálogos e variáveis atuais (todos opcionais).
export interface CalcCtx {
  tecidos?: Tecido[];
  forros?: Tecido[];
  blackouts?: Tecido[];
  vars?: Partial<Vars>;
}

// -------------------- Resultado --------------------
export interface CalcResult {
  // Composição técnica automática
  mtsProntos: number;        // largura da cortina pronta (m) = largura base
  larguraCortina: number;    // largura desejada arredondada (⌈largura da parede⌉)
  caso: "A" | "B";           // método de corte (em pé / virar o rolo)
  alturaCorte: number;       // altura + bainha
  nPanos: number;            // nº de panos verticais (Caso B)
  larguraFranzida: number;   // largura × franzido (caimento)
  sobraLateral: number;      // sobra de largura no pano emendado (Caso B)
  mtsTecido: number;         // metros de tecido a comprar
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
  custoMotorizada: number;
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
// FUNÇÕES ISOLADAS (usam defaults — mantidas para compat/testes)
// ============================================================
export function calcularTecido(mtsProntos: number, v: Vars = DEFAULT_VARS) {
  return +(mtsProntos * v.fatorTecido).toFixed(2);
}
export function calcularForro(mtsProntos: number, temForro: boolean, v: Vars = DEFAULT_VARS) {
  return temForro ? +(mtsProntos * v.fatorTecido).toFixed(2) : 0;
}
export function calcularBlackout(mtsProntos: number, temBlackout: boolean, v: Vars = DEFAULT_VARS) {
  return temBlackout ? +(mtsProntos * v.fatorTecido).toFixed(2) : 0;
}
export function calcularEntretela(mtsProntos: number, tecidoBlackout: boolean, v: Vars = DEFAULT_VARS) {
  return tecidoBlackout ? 0 : +(mtsProntos * v.fatorEntretela).toFixed(2);
}
export function calcularCordao(modelo: Modelo, mtsProntos: number, v: Vars = DEFAULT_VARS) {
  return modelo === "Wave" ? +(mtsProntos * v.fatorCordao).toFixed(2) : 0;
}
export function calcularRodizios(mtsProntos: number, v: Vars = DEFAULT_VARS) {
  return Math.ceil(mtsProntos * v.rodiziosPorMetro);
}
export function calcularMaoDeObra(mtsTecido: number, v: Vars = DEFAULT_VARS) {
  return mtsTecido * v.maoDeObraPorMetroTecido;
}
export function calcularAndaime(altura: number, v: Vars = DEFAULT_VARS) {
  return altura > v.andaimeAlturaMin ? v.andaimeValor : 0;
}
export function calcularInstalacao(instalar: boolean, comForro: boolean, v: Vars = DEFAULT_VARS) {
  if (!instalar) return 0;
  return comForro ? v.instalacaoComForro : v.instalacaoSemForro;
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

export function calcularTrilho(mtsProntos: number, tipo: TrilhoTipo, v: Vars = DEFAULT_VARS) {
  const mts = mtsProntos * v.fatorTrilho;
  const preco =
    tipo === "Trilho duplo"
      ? v.trilhoDuploPorMetro
      : tipo === "Trilho simples"
      ? v.trilhoSimplesPorMetro
      : v.varaoSuicoPorMetro;
  return { metros: +mts.toFixed(2), custo: mts * preco };
}

export function aplicarLucro(subtotal: number, instalacao: number, deslocamento: number, margemExtra = 0, v: Vars = DEFAULT_VARS) {
  return subtotal * (1 + v.lucro + margemExtra / 100) + instalacao + deslocamento;
}

export function calcularParcelamento(total: number, forma: FormaPagamento, parcelas: number, v: Vars = DEFAULT_VARS) {
  let mult = 1;
  switch (forma) {
    case "Pix": mult = 1 - v.descontoPix; break;
    case "Cartão Crédito 1x": mult = 1 + v.jurosCredito1x; break;
    case "Cartão Crédito Parcelado": mult = parcelas * v.jurosCartaoParcela + 1; break;
    default: mult = 1;
  }
  const totalPagamento = total * mult;
  const valorParcela = parcelas > 1 ? totalPagamento / parcelas : totalPagamento;
  return { totalPagamento, valorParcela };
}

// ============================================================
// ORQUESTRADOR
// ============================================================
export function calcular(input: PricingInput, ctx: CalcCtx = {}): CalcResult {
  const { medidas, estrutura, instalacao, comercial } = input;

  const v: Vars = { ...DEFAULT_VARS, ...ctx.vars };
  const tecidos = ctx.tecidos ?? CATALOGO_TECIDOS;
  const forros = ctx.forros ?? CATALOGO_FORROS;
  const blackouts = ctx.blackouts ?? CATALOGO_BLACKOUTS;

  const tecido = tecidos.find((t) => t.codigo === estrutura.tecidoCodigo) ?? tecidos[0];
  const forro = estrutura.forroCodigo != null
    ? forros.find((t) => t.codigo === estrutura.forroCodigo) ?? null
    : null;
  const blackout = estrutura.blackoutCodigo != null
    ? blackouts.find((t) => t.codigo === estrutura.blackoutCodigo) ?? null
    : null;

  // Medidas base (Guia de Cálculo): L = largura da parede, H = altura da parede.
  const L = Math.max(medidas.larguraParede || 0, 0);
  const H = Math.max(medidas.alturaParede || 0, 0);
  const mtsProntos = L;
  const larguraCortina = larguraCortinaDesejada(L); // arredonda p/ inteiro (lateral)
  const temForro = !!forro;
  const temBlackout = !!blackout;

  // --- Metragem de tecido pelo método dos dois casos de corte ---
  const larguraFranzida = +(L * v.fatorTecido).toFixed(2); // caimento (×3)
  const alturaCorteFinal = +(H + v.bainha).toFixed(2);     // altura + bainha cheia (Caso B)

  let caso: "A" | "B";
  let nPanos = 0;
  let mtsTecido: number;
  let sobraLateral = 0;
  let alturaCorte: number;

  // A altura crua da cortina decide o corte: enquanto cabe na largura útil, fica "em pé".
  if (H <= v.larguraUtilRolo) {
    // Caso A — rolo "em pé": a altura cabe na largura útil. Compra pela largura.
    // Só a dobra mínima é necessária aqui (ainda usável e cabe no rolo cheio).
    caso = "A";
    alturaCorte = +(H + v.bainhaLimite).toFixed(2);
    mtsTecido = larguraFranzida;
  } else {
    // Caso B — "virar o rolo": panos verticais; há comprimento de sobra → bainha cheia.
    caso = "B";
    alturaCorte = alturaCorteFinal;
    nPanos = Math.max(1, Math.ceil((L * v.fatorTecido) / v.larguraRolo)); // = ⌈L⌉ nos padrões
    mtsTecido = +(nPanos * alturaCorteFinal).toFixed(2);
    sobraLateral = +(nPanos * v.larguraRolo - larguraFranzida).toFixed(2);
  }

  // --- Forro ---
  // Costurado junto (trilho simples): acompanha o tecido.
  // Separado (trilho duplo): largura × 1,2.
  const mtsForro = temForro
    ? estrutura.costuraXForro ? mtsTecido : +(L * v.forroSeparadoFator).toFixed(2)
    : 0;

  // Blackout — sempre uma camada separada (trilho duplo): largura × 1,2.
  const mtsBlackout = temBlackout ? +(L * v.forroSeparadoFator).toFixed(2) : 0;

  // Entretela acompanha a largura franzida (zero se o próprio tecido é blackout).
  const mtsEntretela = tecido && tecido.blackout ? 0 : larguraFranzida;

  // Cordão (somente Wave) conforme o cabeçalho.
  const mtsCordao = estrutura.modelo === "Wave" ? +(L * v.fatorCordao).toFixed(2) : 0;

  // Presilhas/rodízios: qtd por metro × largura.
  const qtdRodizios = Math.ceil(L * v.rodiziosPorMetro);

  const trilhoInferido = inferirTrilho({
    temBlackout, temForro,
    costuraXForro: estrutura.costuraXForro,
    motorizada: estrutura.motorizada,
  });
  // Trilho = largura da parede (× fator, padrão 1).
  const trilho = calcularTrilho(L, trilhoInferido, v);

  // Custos
  const custoTecido    = tecido ? mtsTecido * tecido.precoMetro : 0;
  const custoForro     = forro    ? mtsForro    * forro.precoMetro    : 0;
  const custoBlackout  = blackout ? mtsBlackout * blackout.precoMetro : 0;
  const custoEntretela = mtsEntretela * v.entretelaPorMetro;
  const custoCordao    = mtsCordao * v.cordaoWavePorMetro;
  const custoRodizio   = qtdRodizios * v.rodizio;
  const custoTrilho    = trilho.custo;
  const custoMaoObra   = calcularMaoDeObra(mtsTecido + mtsForro + mtsBlackout, v);

  // Instalação — R$220 só com forro separado (trilho duplo); senão R$170.
  const forroSeparado = (temForro && !estrutura.costuraXForro) || temBlackout;
  const custoAndaime = calcularAndaime(H, v);
  const custoMotorizada = estrutura.motorizada ? v.motorizadaValor : 0;
  const fatorDificuldade = instalacao.dificuldade === "Difícil" ? v.fatorDificuldade : 1;
  const custoInstalacao = calcularInstalacao(instalacao.instalar, forroSeparado, v) * fatorDificuldade + custoAndaime;
  const custoDeslocamento = instalacao.deslocamento || 0;

  const subtotalProducao =
    custoTecido + custoForro + custoBlackout + custoMaoObra +
    custoRodizio + custoCordao + custoEntretela + custoTrilho;

  // Adicionais fixos (não recebem lucro): instalação, andaime, motorizada, deslocamento.
  const adicionaisFixos = custoInstalacao + custoMotorizada;
  const totalComLucro = aplicarLucro(subtotalProducao, adicionaisFixos, custoDeslocamento, comercial.margemExtra, v);
  const descontoValor = totalComLucro * (comercial.desconto / 100);
  const totalFinal = totalComLucro - descontoValor;

  const { totalPagamento, valorParcela } = calcularParcelamento(totalFinal, comercial.forma, comercial.parcelas, v);

  return {
    mtsProntos, larguraCortina, caso, alturaCorte, nPanos, larguraFranzida, sobraLateral,
    mtsTecido, mtsForro, mtsBlackout, mtsEntretela, mtsCordao,
    qtdRodizios, mtsTrilho: trilho.metros, trilhoInferido,
    custoTecido, custoForro, custoBlackout, custoMaoObra, custoCordao,
    custoRodizio, custoEntretela, custoTrilho, custoAndaime, custoMotorizada,
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

// ============================================================
// MÚLTIPLOS CÔMODOS NA MESMA PROPOSTA
// Cada cômodo tem medidas/estrutura/instalação próprias. Cliente e
// condições comerciais (pagamento/desconto/margem) são da proposta.
// ============================================================
export interface ComodoInput {
  ambiente: string;
  observacoes?: string;
  medidas: MedidasInput;
  estrutura: EstruturaInput;
  instalacao: InstalacaoInput;
}

export interface PropostaResult {
  comodos: CalcResult[];      // resultado de cada cômodo (sem desconto/pagamento)
  subtotalProducao: number;
  totalComLucro: number;      // soma dos cômodos (já com lucro/margem e instalação)
  descontoValor: number;
  totalFinal: number;
  totalPagamento: number;
  valorParcela: number;
}

export function defaultComodo(): ComodoInput {
  const base = defaultPricingInput();
  return {
    ambiente: "Sala de Estar",
    observacoes: "",
    medidas: base.medidas,
    estrutura: base.estrutura,
    instalacao: base.instalacao,
  };
}

/** Calcula um cômodo isolado: usa a margem da proposta, sem desconto/pagamento. */
export function calcularComodo(c: ComodoInput, comercial: ComercialInput, ctx: CalcCtx = {}): CalcResult {
  return calcular(
    {
      ambiente: { cliente: "", ambiente: c.ambiente, observacoes: c.observacoes },
      medidas: c.medidas,
      estrutura: c.estrutura,
      instalacao: c.instalacao,
      comercial: { ...comercial, desconto: 0, forma: "Dinheiro", parcelas: 1 },
    },
    ctx
  );
}

/** Agrega todos os cômodos e aplica desconto + pagamento uma única vez. */
export function calcularProposta(comodos: ComodoInput[], comercial: ComercialInput, ctx: CalcCtx = {}): PropostaResult {
  const v: Vars = { ...DEFAULT_VARS, ...ctx.vars };
  const results = comodos.map((c) => calcularComodo(c, comercial, ctx));
  const subtotalProducao = results.reduce((a, r) => a + r.subtotalProducao, 0);
  const totalComLucro = results.reduce((a, r) => a + r.totalComLucro, 0);
  const descontoValor = totalComLucro * (comercial.desconto / 100);
  const totalFinal = totalComLucro - descontoValor;
  const { totalPagamento, valorParcela } = calcularParcelamento(totalFinal, comercial.forma, comercial.parcelas, v);
  return { comodos: results, subtotalProducao, totalComLucro, descontoValor, totalFinal, totalPagamento, valorParcela };
}

/** Rótulo curto de exibição para a lista de cômodos. */
export function ambienteLabel(comodos: { ambiente: string }[]): string {
  if (comodos.length === 0) return "—";
  if (comodos.length === 1) return comodos[0].ambiente;
  return `${comodos[0].ambiente} +${comodos.length - 1}`;
}

export const defaultPricingInput = (): PricingInput => ({
  ambiente: { cliente: "", ambiente: "Sala de Estar", observacoes: "" },
  medidas: {
    larguraParede: 2.8, alturaParede: 2.5,
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
