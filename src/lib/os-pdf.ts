// ============================================================
// Ordem de Serviço (O.S.) — PDF no formato da ficha da FN.
// Um cartão por ambiente, gerado do orçamento aprovado.
// Numeração vem do store (conta só aprovados).
// ============================================================
import jsPDF from "jspdf";
import type { Empresa } from "./store";

export interface OSRow {
  quant: number;
  largura: string;
  altura: string;
  perfil: "T" | "V" | "";   // TRILHO (T) / VARÃO (V)
  frente: string;           // tecido + cor
  modelo: string;           // modelo da frente (Wave…)
  metrosFrente: string;
  forro: string;            // forro/blackout + cor (vazio se não tem)
  forroModelo: string;      // "costurado junto" / "separado"
  metrosForro: string;
  totalMetros: string;
  obs: string;              // ambiente + observações + desnível
}

export interface OSParams {
  numeroOS: number;
  cliente: string;
  dataISO: string;
  entrega?: string;
  rows: OSRow[];
  empresa: Empresa;
}

const brData = (iso: string) => {
  try { return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR"); } catch { return iso; }
};

/** Formata número (metros) para "8,40" — vazio se 0/NaN. */
export const fmtNum = (n: number) => (!n || Number.isNaN(n) ? "" : n.toFixed(2).replace(".", ","));

export function gerarOS(p: OSParams): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 32;
  const CW = W - M * 2;      // largura do cartão
  const CH = 150;            // altura do cartão
  const GAP = 14;

  doc.setDrawColor(40, 40, 40);

  const data = brData(p.dataISO);
  const entrega = p.entrega ? brData(p.entrega) : "";

  let y = M;
  p.rows.forEach((row) => {
    if (y + CH > H - M) { doc.addPage(); y = M; }
    drawCard(doc, M, y, CW, CH, row, p, data, entrega);
    y += CH + GAP;
  });

  return doc;
}

function drawCard(
  doc: jsPDF, x: number, y: number, W: number, H: number,
  r: OSRow, p: OSParams, data: string, entrega: string
) {
  doc.setLineWidth(1);
  doc.rect(x, y, W, H);

  const pad = 12;
  const lx = x + pad;
  const rx = x + W - pad;
  let cy = y + 20;

  // ---- Cabeçalho: FN CORTINAS + OS ----
  doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(20, 26, 48);
  doc.text((p.empresa.nome || "FN CORTINAS").toUpperCase(), x + W / 2, cy, { align: "center" });
  doc.setFontSize(11);
  doc.text(`OS: ${p.numeroOS}`, rx, cy, { align: "right" });
  doc.setTextColor(0, 0, 0);
  doc.setDrawColor(40, 40, 40); doc.setLineWidth(0.5);
  doc.line(x + pad, cy + 5, x + W - pad, cy + 5);
  cy += 22;

  // helpers -------------------------------------------------
  const field = (label: string, value: string, fx: number, fy: number, underlineTo: number) => {
    doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.text(label, fx, fy);
    const lw = doc.getTextWidth(label);
    const vx = fx + lw + 6;
    doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    if (value) doc.text(value, vx, fy, { maxWidth: underlineTo - vx });
    doc.setLineWidth(0.4); doc.line(vx - 2, fy + 2.5, underlineTo, fy + 2.5);
  };
  const checkbox = (label: string, checked: boolean, fx: number, fy: number): number => {
    doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.text(label, fx, fy);
    const bx = fx + doc.getTextWidth(label) + 5;
    doc.setLineWidth(0.7); doc.rect(bx, fy - 8, 10, 10);
    if (checked) { doc.setFontSize(9); doc.text("X", bx + 1.8, fy + 0.2); }
    return bx + 10; // x final do checkbox
  };
  const half = x + W / 2;

  // ---- CLIENTE + TRILHO/VARÃO ----
  field("CLIENTE:", p.cliente, lx, cy, half - 6);
  const afterT = checkbox("TRILHO", r.perfil === "T" || r.perfil === "", half + 20, cy);
  checkbox("VARÃO", r.perfil === "V", afterT + 22, cy);
  cy += 20;

  // ---- DATA + ENTREGA ----
  field("DATA:", data, lx, cy, half - 6);
  field("ENTREGA:", entrega, half + 20, cy, rx);
  cy += 20;

  // ---- QTD + LARGURA + ALTURA + ABERTURA ----
  const colw = (W - 2 * pad) / 4;
  field("QTD:", String(r.quant), lx, cy, lx + colw - 12);
  field("LARGURA:", r.largura, lx + colw, cy, lx + colw * 2 - 12);
  field("ALTURA:", r.altura, lx + colw * 2, cy, lx + colw * 3 - 12);
  // ABERTURA 1 [] 2 []  (marcar à mão)
  doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.text("ABERTURA:", lx + colw * 3, cy);
  const ax = lx + colw * 3 + doc.getTextWidth("ABERTURA:") + 6;
  const a1 = checkbox("1", false, ax, cy);
  checkbox("2", false, a1 + 12, cy);
  cy += 20;

  // ---- FRENTE + MODELO + METROS ----
  const c3 = (W - 2 * pad);
  field("FRENTE:", r.frente, lx, cy, lx + c3 * 0.42);
  field("MODELO:", r.modelo, lx + c3 * 0.45, cy, lx + c3 * 0.78);
  field("METROS:", r.metrosFrente, lx + c3 * 0.80, cy, rx);
  cy += 20;

  // ---- FORRO + MODELO + METROS ----
  field("FORRO:", r.forro, lx, cy, lx + c3 * 0.42);
  field("MODELO:", r.forroModelo, lx + c3 * 0.45, cy, lx + c3 * 0.78);
  field("METROS:", r.metrosForro, lx + c3 * 0.80, cy, rx);
  cy += 20;

  // ---- OBS + TOTAL METROS ----
  const boxW = 120, boxH = 20;
  const bx = rx - boxW;
  field("OBS:", r.obs, lx, cy + 2, bx - 70);
  doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.text("TOTAL METROS:", bx - 66, cy + 2);
  doc.setFillColor(225, 232, 245); doc.setDrawColor(40, 40, 40); doc.setLineWidth(0.7);
  doc.rect(bx, cy - 12, boxW, boxH, "FD");
  doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(20, 26, 48);
  doc.text(r.totalMetros, bx + boxW / 2, cy + 2, { align: "center" });
  doc.setTextColor(0, 0, 0);
}
