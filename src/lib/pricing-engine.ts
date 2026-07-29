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

  // Taxas da maquininha (repassadas ao cliente no parcelado — "sem juros" pra ele).
  // Pix e dinheiro = preço-base (taxa 0). Parcelado: preço ÷ (1 − taxa).
  taxaDebito: 0.0137,
  taxaCreditoVista: 0.0315, // crédito à vista (1x)
  taxaParc2: 0.0539,
  taxaParc3: 0.0612,
  taxaParc4: 0.0685,
  taxaParc5: 0.0757,
  taxaParc6: 0.0828,
  taxaParc7: 0.0899,
  taxaParc8: 0.0969,
  taxaParc9: 0.1038,
  taxaParc10: 0.1106,
  taxaParc11: 0.1174,
  taxaParc12: 0.1240,

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
  bainhaBlackout: 0.30,    // bainha do blackout (Caso B) — FN acrescenta 30cm
  forroSeparadoFator: 1.5, // forro separado (microfibra/outro): largura × 1,5
  blackoutFator: 1.2,      // blackout: largura × 1,2

  // Multiplicadores por metro de cortina pronta
  fatorTecido: 3,          // franzido (caimento) = 3× a largura
  fatorEntretela: 3,       // entretela acompanha a largura franzida
  fatorCordao: 1,
  rodiziosPorMetro: 22,
  rodiziosSegundaPorMetro: 11, // 2ª cortina (blackout/forro separado) — densidade menor
  fatorTrilho: 1,          // trilho = largura da parede

  // Preços unitários dos acessórios (R$)
  rodizio: 0.22,
  cordaoWavePorMetro: 5,
  entretelaPorMetro: 1,       // FN: R$1/m sobre a largura franzida
  trilhoSimplesPorMetro: 13,  // FN: 1 tecido ou forro costurado junto
  trilhoDuploPorMetro: 25,    // FN: com blackout ou forro separado
  varaoSuicoPorMetro: 13,
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

export type Modelo = string;
export type TrilhoTipo = "Varão suíço" | "Trilho simples" | "Trilho duplo";

export interface ModeloItem {
  nome: string;
  usaCordao: boolean; // quando true, soma cordão no orçamento (como o "Wave")
}

// Modelos iniciais (seed). Editáveis em Ajustes → Modelos.
export const CATALOGO_MODELOS: ModeloItem[] = [
  { nome: "Wave", usaCordao: true },
  { nome: "Prega macho", usaCordao: false },
  { nome: "Prega americana", usaCordao: false },
  { nome: "Persiana", usaCordao: false },
];

export interface Tecido {
  codigo: number;
  nome: string;
  largura: number;
  precoMetro: number;
  blackout?: boolean;
}

// Catálogos iniciais (seed). O usuário pode adicionar/editar livremente.
// Valores conforme a Tabela de Tecidos da empresa.
export const CATALOGO_TECIDOS: Tecido[] = [
  { codigo: 101, nome: "Linho", largura: 3, precoMetro: 23 },
  { codigo: 102, nome: "Moorea", largura: 3, precoMetro: 43 },
  { codigo: 103, nome: "Shantung", largura: 2.8, precoMetro: 49 },
  { codigo: 104, nome: "Cetim", largura: 3, precoMetro: 18 },
  { codigo: 105, nome: "Voil", largura: 3, precoMetro: 13 },
];

export const CATALOGO_FORROS: Tecido[] = [
  { codigo: 201, nome: "Microfibra 65g", largura: 3, precoMetro: 13 },
  { codigo: 202, nome: "Microfibra 100g", largura: 3, precoMetro: 16 },
];

export const CATALOGO_BLACKOUTS: Tecido[] = [
  { codigo: 301, nome: "Blackout 80%", largura: 3, precoMetro: 35, blackout: true },
  { codigo: 302, nome: "Blackout 100%", largura: 2.8, precoMetro: 45, blackout: true },
  { codigo: 303, nome: "Blackout Linho 100%", largura: 2.8, precoMetro: 66, blackout: true },
];

// Cores disponíveis — lista única, vale para todos os tecidos. Editável em Ajustes.
export const CATALOGO_CORES: string[] = [
  "Branco", "Off White", "Bege", "Cinza", "Chumbo", "Trigo", "Mesclado", "Cru", "Pérola",
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
  cor?: string;            // cor do tecido (lista global, não altera o preço)
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
  modelos?: ModeloItem[];
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

// Taxa da maquininha para a forma/nº de parcelas escolhidos.
// Pix e dinheiro são o preço-base (taxa 0).
export function taxaMaquininha(forma: FormaPagamento, parcelas: number, v: Vars = DEFAULT_VARS): number {
  switch (forma) {
    case "Cartão Débito": return v.taxaDebito;
    case "Cartão Crédito 1x": return v.taxaCreditoVista;
    case "Cartão Crédito Parcelado": {
      const tabela: Record<number, number> = {
        2: v.taxaParc2, 3: v.taxaParc3, 4: v.taxaParc4, 5: v.taxaParc5,
        6: v.taxaParc6, 7: v.taxaParc7, 8: v.taxaParc8, 9: v.taxaParc9,
        10: v.taxaParc10, 11: v.taxaParc11, 12: v.taxaParc12,
      };
      const n = Math.min(12, Math.max(2, Math.round(parcelas || 2)));
      return tabela[n] ?? v.taxaParc12;
    }
    default: return 0; // Pix, Dinheiro
  }
}

export function calcularParcelamento(total: number, forma: FormaPagamento, parcelas: number, v: Vars = DEFAULT_VARS) {
  // "Sem juros" pro cliente: embute a taxa da maquininha no preço → preço ÷ (1 − taxa),
  // para que a loja receba o valor-base cheio depois do desconto da maquininha.
  const taxa = taxaMaquininha(forma, parcelas, v);
  const totalPagamento = taxa > 0 ? total / (1 - taxa) : total;
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
  const modelos = ctx.modelos ?? CATALOGO_MODELOS;

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

  // Metragem de uma 2ª camada separada (forro separado / blackout).
  // Segue o mesmo corte do tecido: "em pé" (Caso A) compra pela largura;
  // "vira o rolo" (Caso B) corta panos verticais (altura + bainha da camada).
  const metragemCamada = (fator: number, bainhaCamada: number) => {
    const largura = L * fator;
    if (H <= v.larguraUtilRolo) return +largura.toFixed(2);
    const nPanosCamada = Math.max(1, Math.ceil(largura / v.larguraRolo));
    return +(nPanosCamada * +(H + bainhaCamada).toFixed(2)).toFixed(2);
  };

  // --- Forro ---
  // Costurado junto (trilho simples): acompanha o tecido.
  // Separado (trilho duplo): largura × 1,5, virando o rolo se for alto.
  const mtsForro = temForro
    ? estrutura.costuraXForro ? mtsTecido : metragemCamada(v.forroSeparadoFator, v.bainha)
    : 0;

  // Blackout — camada separada (trilho duplo): largura × 1,2, com bainha própria.
  const mtsBlackout = temBlackout ? metragemCamada(v.blackoutFator, v.bainhaBlackout) : 0;

  // Entretela acompanha a largura franzida (zero se o próprio tecido é blackout).
  const mtsEntretela = tecido && tecido.blackout ? 0 : larguraFranzida;

  // Cordão: só nos modelos marcados como "usa cordão" (Wave e afins).
  // Fallback para modelos fora do catálogo: mantém a regra antiga (só "Wave").
  const modeloAtual = modelos.find((m) => m.nome === estrutura.modelo);
  const usaCordao = modeloAtual ? modeloAtual.usaCordao : estrutura.modelo === "Wave";
  const mtsCordao = usaCordao ? +(L * v.fatorCordao).toFixed(2) : 0;

  // Presilhas/rodízios: qtd por metro × largura. No trilho duplo há uma 2ª
  // cortina (blackout ou forro separado) no 2º trilho → soma os rodízios dela.
  const temSegundaCamada = temBlackout || (temForro && !estrutura.costuraXForro);
  const qtdRodiziosSegunda = temSegundaCamada ? Math.ceil(L * v.rodiziosSegundaPorMetro) : 0;
  const qtdRodizios = Math.ceil(L * v.rodiziosPorMetro) + qtdRodiziosSegunda;

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

// ============================================================
// ORÇAMENTO — cada ambiente tem SUAS PRÓPRIAS opções (estilo Karla).
// ============================================================
export interface OpcaoItem {
  nome: string;               // ex: "Só cortina", "+ Blackout 80%"
  estrutura: EstruturaInput;  // materiais dessa opção
}

export interface AmbienteItem {
  ambiente: string;
  observacoes?: string;
  quant: number;              // qtd de cortinas iguais nesse ambiente
  medidas: MedidasInput;
  instalacao: InstalacaoInput;
  opcoes: OpcaoItem[];        // opções próprias deste ambiente
}

export interface OpcaoCalc {
  nome: string;
  estrutura: EstruturaInput;
  result: CalcResult;
  aVista: number;             // totalFinal × quant
  parcelado: number;          // aVista ÷ (1 − taxa)
}

export interface AmbienteResult {
  ambiente: string;
  observacoes?: string;
  quant: number;
  medidas: MedidasInput;
  opcoes: OpcaoCalc[];
  parcelas: number;
}

export function defaultOpcao(nome = "Só cortina"): OpcaoItem {
  const e = defaultPricingInput().estrutura;
  return { nome, estrutura: { ...e, forroCodigo: null, blackoutCodigo: null } };
}

/** Nome automático da opção conforme os materiais (sempre bate com o conteúdo). */
export function nomeOpcao(e: EstruturaInput, blackouts: Tecido[] = CATALOGO_BLACKOUTS): string {
  const parts: string[] = [];
  if (e.forroCodigo != null) parts.push("Forro");
  if (e.blackoutCodigo != null) {
    const bk = blackouts.find((b) => b.codigo === e.blackoutCodigo);
    parts.push(bk ? bk.nome : "Blackout");
  }
  return parts.length ? "+ " + parts.join(" + ") : "Só cortina";
}

export function defaultAmbiente(): AmbienteItem {
  const base = defaultPricingInput();
  return {
    ambiente: "Sala de Estar", observacoes: "", quant: 1,
    medidas: base.medidas, instalacao: base.instalacao,
    opcoes: [defaultOpcao("Só cortina")],
  };
}

/**
 * Cada ambiente tem suas próprias opções. Para cada opção calcula o valor à
 * vista (base) e o parcelado (à vista ÷ (1 − taxa)).
 */
export function calcularOrcamento(
  ambientes: AmbienteItem[],
  comercial: ComercialInput,
  ctx: CalcCtx = {}
): AmbienteResult[] {
  const v: Vars = { ...DEFAULT_VARS, ...ctx.vars };
  const parcelas = Math.min(12, Math.max(2, comercial.parcelas || 10));
  const taxa = taxaMaquininha("Cartão Crédito Parcelado", parcelas, v);
  const grossUp = (x: number) => +(taxa > 0 ? x / (1 - taxa) : x).toFixed(2);

  return ambientes.map((amb) => {
    const quant = amb.quant || 1;
    const opcoes: OpcaoCalc[] = (amb.opcoes ?? []).map((op) => {
      const result = calcular(
        {
          ambiente: { cliente: "", ambiente: amb.ambiente, observacoes: amb.observacoes },
          medidas: amb.medidas,
          estrutura: op.estrutura,
          instalacao: amb.instalacao,
          comercial: { ...comercial, forma: "Dinheiro", parcelas: 1 }, // à vista base
        },
        ctx
      );
      const aVista = +(result.totalFinal * quant).toFixed(2);
      return { nome: nomeOpcao(op.estrutura, ctx.blackouts ?? CATALOGO_BLACKOUTS), estrutura: op.estrutura, result, aVista, parcelado: grossUp(aVista) };
    });
    return { ambiente: amb.ambiente, observacoes: amb.observacoes, quant, medidas: amb.medidas, opcoes, parcelas };
  });
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
    tecidoCodigo: 101, // Linho
    forroCodigo: null,
    blackoutCodigo: null,
    costuraXForro: false,
    motorizada: false,
  },
  instalacao: { instalar: true, dificuldade: "Padrão", deslocamento: 0 },
  comercial: { desconto: 0, margemExtra: 0, forma: "Pix", parcelas: 1 },
});
