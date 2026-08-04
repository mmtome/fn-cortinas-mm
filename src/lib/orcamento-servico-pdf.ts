// ============================================================
// Orçamento de Persiana / Lavanderia — PDF simples por m².
// Usa os MESMOS dados da cortina (largura, altura, tecido).
// Preço (provisório): largura × altura × preço do tecido por m².
// A margem/fórmula real de cada serviço entra depois em `precoM2De`.
// ============================================================
import jsPDF from "jspdf";
import type { Empresa } from "./store";
import type { Proposal } from "./mockData";
import type { Tecido } from "./pricing-engine";
import { formatBRL } from "./pricing-engine";
import { whatsappUrl } from "./qr";

export type TipoServico = "Persiana" | "Lavanderia";

export interface ServicoItem {
  ambiente: string;
  quant: number;
  largura: number;
  altura: number;
  descricao: string; // tecido + cor
  precoM2: number;
  m2: number;
  valor: number;
}

const SERVICOS_FN = [
  "Cortinas sob medida",
  "Persianas: Rolô, Romana, Tela Solar, Blackout, Double Vision, Horizontal e Vertical",
  "Toldos · Automação WiFi",
  "Lavanderia: cortinas, persianas e tapetes",
];

const brData = (iso: string) => {
  try { return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR"); } catch { return iso; }
};

/**
 * Monta os itens do serviço a partir da proposta (dados da cortina).
 * Cada ambiente vira uma linha: m² = largura × altura, valor = m² × preço/m².
 * `precoM2De` define o preço por m² a partir do tecido — hoje = preço do tecido;
 * troque aqui quando vier a margem real de persiana/lavanderia.
 */
export function montarItensServico(
  proposal: Proposal,
  tecidos: Tecido[],
  precoM2De: (t: Tecido | undefined) => number = (t) => t?.precoMetro ?? 0
): ServicoItem[] {
  const itens: ServicoItem[] = [];
  const push = (ambiente: string, quant: number, largura: number, altura: number, tecidoCodigo: number | undefined, cor?: string) => {
    const tec = tecidos.find((t) => t.codigo === tecidoCodigo);
    const precoM2 = precoM2De(tec);
    const m2 = +(largura * altura).toFixed(2);
    itens.push({
      ambiente,
      quant,
      largura,
      altura,
      descricao: `${tec?.nome ?? "Tecido"}${cor ? " " + cor : ""}`,
      precoM2,
      m2,
      valor: +(m2 * precoM2 * quant).toFixed(2),
    });
  };

  if (proposal.ambientes && proposal.ambientes.length) {
    proposal.ambientes.forEach((a) => {
      const op = a.opcoes?.[0];
      push(a.ambiente || "Ambiente", a.quant || 1, a.medidas.larguraParede, a.medidas.alturaParede, op?.estrutura.tecidoCodigo, op?.estrutura.cor);
    });
  } else {
    proposal.comodos.forEach((c) => {
      push(c.ambiente, 1, c.medidas.larguraParede, c.medidas.alturaParede, c.estrutura.tecidoCodigo, c.estrutura.cor);
    });
  }
  return itens;
}

export interface ServicoParams {
  tipo: TipoServico;
  cliente: string;
  endereco?: string;
  contato?: string;
  dataISO: string;
  numero?: number;
  itens: ServicoItem[];
  empresa: Empresa;
}

export function gerarOrcamentoServico(p: ServicoParams): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const M = 40;
  const navy: [number, number, number] = [20, 26, 48];
  const gold: [number, number, number] = [201, 168, 76];
  const ink: [number, number, number] = [38, 40, 52];
  const soft: [number, number, number] = [120, 116, 104];
  const light: [number, number, number] = [224, 220, 208];

  const titulo = p.tipo === "Persiana" ? "ORÇAMENTO DE PERSIANAS" : "ORÇAMENTO DE LAVANDERIA";

  // ---- Cabeçalho navy ----
  const HB = 96;
  doc.setFillColor(...navy); doc.rect(0, 0, w, HB, "F");
  doc.setTextColor(...gold); doc.setFont("helvetica", "bold"); doc.setFontSize(15);
  doc.text((p.empresa.nome || "FN Cortinas").toUpperCase(), M, 40);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(...light);
  let hy = 56;
  const linha1 = [p.empresa.telefone, p.empresa.endereco].filter(Boolean).join("  ·  ");
  if (linha1) { doc.text(linha1, M, hy); hy += 12; }
  if (p.empresa.cnpj) { doc.text("CNPJ " + p.empresa.cnpj, M, hy); }
  doc.setTextColor(...gold); doc.setFont("helvetica", "bold"); doc.setFontSize(12);
  doc.text(titulo, w - M, 40, { align: "right" });
  if (p.numero) { doc.setFontSize(10); doc.text(`Nº ${p.numero}`, w - M, 56, { align: "right" }); }

  // ---- Cliente ----
  let y = HB + 30;
  doc.setTextColor(...soft); doc.setFont("helvetica", "bold"); doc.setFontSize(8);
  doc.text("CLIENTE", M, y);
  doc.setTextColor(...ink); doc.setFont("helvetica", "bold"); doc.setFontSize(14);
  doc.text(p.cliente, M, y + 18);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...soft);
  doc.text(`Data ${brData(p.dataISO)}`, M, y + 34);
  if (p.endereco) { doc.text(p.endereco, M, y + 47); y += 13; }
  y += 60;

  // ---- Tabela ----
  const xM2 = w - M - 210, xPreco = w - M - 130, xVal = w - M;
  doc.setFillColor(241, 239, 233); doc.rect(M - 6, y - 11, w - 2 * M + 12, 18, "F");
  doc.setTextColor(...soft); doc.setFont("helvetica", "bold"); doc.setFontSize(7.5);
  doc.text("AMBIENTE / ITEM", M, y + 1);
  doc.text("M²", xM2, y + 1, { align: "right" });
  doc.text("R$/M²", xPreco, y + 1, { align: "right" });
  doc.text("VALOR", xVal, y + 1, { align: "right" });
  y += 22;

  let total = 0;
  doc.setFont("helvetica", "normal");
  p.itens.forEach((it) => {
    total += it.valor;
    doc.setTextColor(...ink); doc.setFont("helvetica", "bold"); doc.setFontSize(9.5);
    doc.text(`${it.ambiente}${it.quant > 1 ? `  (${it.quant}×)` : ""}`, M, y);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(...soft);
    doc.text(`${String(it.largura).replace(".", ",")} × ${String(it.altura).replace(".", ",")} m · ${it.descricao}`, M, y + 11);
    doc.setTextColor(...ink); doc.setFontSize(9);
    doc.text(String(it.m2).replace(".", ","), xM2, y, { align: "right" });
    doc.text(formatBRL(it.precoM2), xPreco, y, { align: "right" });
    doc.setFont("helvetica", "bold");
    doc.text(formatBRL(it.valor), xVal, y, { align: "right" });
    doc.setFont("helvetica", "normal");
    y += 20;
    doc.setDrawColor(228, 224, 216); doc.setLineWidth(0.4); doc.line(M - 6, y - 4, w - M + 6, y - 4);
  });

  // ---- Total ----
  y += 8;
  doc.setFillColor(...navy); doc.roundedRect(w - M - 220, y, 220, 40, 5, 5, "F");
  doc.setTextColor(...light); doc.setFont("helvetica", "normal"); doc.setFontSize(8);
  doc.text("TOTAL", w - M - 205, y + 16);
  doc.setTextColor(...gold); doc.setFont("helvetica", "bold"); doc.setFontSize(18);
  doc.text(formatBRL(total), w - M - 12, y + 26, { align: "right" });
  y += 60;

  // ---- Fale conosco (clicável) ----
  const wUrl = whatsappUrl(p.empresa.whatsapp);
  if (wUrl) {
    doc.setFillColor(...gold); doc.roundedRect(M, y, 168, 24, 5, 5, "F");
    doc.setTextColor(...navy); doc.setFont("helvetica", "bold"); doc.setFontSize(10);
    doc.text("Falar no WhatsApp", M + 84, y + 15.5, { align: "center" });
    doc.link(M, y, 168, 24, { url: wUrl });
    y += 40;
  }

  // ---- Rodapé: serviços ----
  doc.setTextColor(...soft); doc.setFont("helvetica", "bold"); doc.setFontSize(8);
  doc.text("TAMBÉM FAZEMOS", M, y); y += 12;
  doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(90, 90, 100);
  SERVICOS_FN.forEach((s) => { doc.text(`·  ${s}`, M, y); y += 12; });

  doc.setTextColor(...navy); doc.setFont("helvetica", "bold"); doc.setFontSize(9);
  doc.text(p.empresa.nome || "FN Cortinas", w / 2, h - M + 2, { align: "center" });

  return doc;
}
