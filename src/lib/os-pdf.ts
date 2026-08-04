// ============================================================
// Ordem de Serviço (O.S.) — PDF que replica a ficha de papel da FN.
// Gerado a partir de um orçamento aprovado (uma linha por ambiente,
// com a opção escolhida). Numeração vem do store (só aprovados).
// ============================================================
import jsPDF from "jspdf";
import type { Empresa } from "./store";

export interface OSRow {
  ambiente: string;
  quant: number;
  largura: string;
  altura: string;
  folhas: string;
  modelo: string;
  tecido: string;   // "Frente"
  mtsTecido: string;
  forro: string;
  mtsForro: string;
  totalM: string;
  perfil: "T" | "V" | "";
  obs: string;
  comando: string;
  bando: string;
  especial: boolean; // vai para "Modelos Especiais"
}

export interface OSParams {
  numeroOS: number;
  cliente: string;
  cpf?: string;
  local?: string;      // bairro/cidade (canto do cabeçalho)
  dataISO: string;     // data do orçamento
  entrega?: string;    // data de entrega (opcional)
  rows: OSRow[];
  empresa: Empresa;
}

const G = 0.55; // cinza das bordas
const HEAD = 0.12; // barra escura dos títulos de seção

const brData = (iso: string) => {
  try { return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR"); } catch { return iso; }
};

/** Formata número (metros) para "1,50" — vazio se 0/NaN. */
export const fmtNum = (n: number) => (!n || Number.isNaN(n) ? "" : n.toFixed(2).replace(".", ","));

interface Col { label: string; w: number; key: keyof OSRow | ""; }

export function gerarOS(p: OSParams): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
  const PW = doc.internal.pageSize.getWidth();
  const M = 22;
  const W = PW - M * 2;
  let y = M;

  doc.setFont("helvetica", "normal");
  doc.setDrawColor(G * 255, G * 255, G * 255);
  doc.setLineWidth(0.8);

  // ---------- Cabeçalho da empresa ----------
  doc.setFontSize(13); doc.setFont("helvetica", "bold");
  doc.text((p.empresa.nome || "FN Cortinas").toUpperCase(), M, y + 12);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8);
  doc.setTextColor(90);
  doc.text("Ordem de Serviço", M, y + 24);
  doc.setTextColor(0);
  y += 34;

  // ---------- Caixa de cabeçalho (Data/Entrega/Cliente/CPF + O.S.) ----------
  const boxH = 56;
  const osBoxW = 96;
  const infoW = W - osBoxW - 10;
  doc.rect(M, y, infoW, boxH);
  // linhas internas
  const lx = M + 10;
  doc.setFontSize(9.5);
  const label = (t: string, x: number, yy: number) => { doc.setFont("helvetica", "bold"); doc.text(t, x, yy); doc.setFont("helvetica", "normal"); };
  const underline = (x: number, yy: number, w: number) => doc.line(x, yy + 2, x + w, yy + 2);

  let ry = y + 20;
  label("Data:", lx, ry); doc.text(brData(p.dataISO), lx + 34, ry); underline(lx + 30, ry, 90);
  label("Entrega:", lx + infoW / 2, ry); doc.text(p.entrega ? brData(p.entrega) : "", lx + infoW / 2 + 46, ry); underline(lx + infoW / 2 + 42, ry, 90);
  ry += 24;
  label("Cliente:", lx, ry); doc.text(p.cliente || "", lx + 42, ry); underline(lx + 38, ry, infoW / 2 - 60);
  label("CPF:", lx + infoW / 2, ry); doc.text(p.cpf ?? "", lx + infoW / 2 + 30, ry); underline(lx + infoW / 2 + 26, ry, 110);

  if (p.local) {
    doc.setFontSize(8.5); doc.setTextColor(70);
    doc.text(p.local, M + infoW - 6, y + boxH - 6, { align: "right" });
    doc.setTextColor(0);
  }

  // Caixa da O.S. (grande, à direita)
  const ox = M + infoW + 10;
  doc.setLineWidth(1.2);
  doc.roundedRect(ox, y, osBoxW, boxH, 6, 6);
  doc.setLineWidth(0.8);
  doc.setFont("helvetica", "bold"); doc.setFontSize(11);
  doc.text("O.S.", ox + 12, y + 22);
  doc.setFontSize(24);
  doc.text(String(p.numeroOS), ox + osBoxW - 12, y + 34, { align: "right" });
  doc.setFont("helvetica", "normal");
  y += boxH + 14;

  // ---------- Tabela: CORTINAS DE TECIDO ----------
  const cortCols: Col[] = [
    { label: "AMBIENTE", w: 92, key: "ambiente" },
    { label: "Quant", w: 34, key: "quant" },
    { label: "Largura", w: 46, key: "largura" },
    { label: "Altura", w: 44, key: "altura" },
    { label: "Folhas", w: 40, key: "folhas" },
    { label: "Modelo", w: 66, key: "modelo" },
    { label: "Frente", w: 74, key: "tecido" },
    { label: "Mts", w: 40, key: "mtsTecido" },
    { label: "Forro", w: 74, key: "forro" },
    { label: "Mts", w: 40, key: "mtsForro" },
    { label: "Total M", w: 46, key: "totalM" },
    { label: "Perfil", w: 34, key: "perfil" },
    { label: "OBSERVAÇÃO", w: 0, key: "obs" },
  ];
  fitCols(cortCols, W);
  const cortRows = p.rows.filter((r) => !r.especial);
  y = sectionTitle(doc, M, y, W, "CORTINAS DE TECIDO");
  y = drawTable(doc, M, y, cortCols, cortRows, Math.max(6, cortRows.length + 2));

  y += 12;

  // ---------- Tabela: MODELOS ESPECIAIS ----------
  const espCols: Col[] = [
    { label: "AMBIENTE", w: 92, key: "ambiente" },
    { label: "Quant", w: 34, key: "quant" },
    { label: "Modelo", w: 70, key: "modelo" },
    { label: "Largura", w: 50, key: "largura" },
    { label: "Altura", w: 50, key: "altura" },
    { label: "Comando", w: 70, key: "comando" },
    { label: "Bandô", w: 50, key: "bando" },
    { label: "DESCRIÇÃO", w: 0, key: "obs" },
  ];
  fitCols(espCols, W);
  const espRows = p.rows.filter((r) => r.especial);
  y = sectionTitle(doc, M, y, W, "MODELOS ESPECIAIS");
  y = drawTable(doc, M, y, espCols, espRows, Math.max(4, espRows.length + 2));

  return doc;
}

/** Distribui a largura restante para a coluna com w=0. */
function fitCols(cols: Col[], W: number) {
  const used = cols.reduce((s, c) => s + c.w, 0);
  const flex = cols.find((c) => c.w === 0);
  if (flex) flex.w = Math.max(80, W - used);
}

function sectionTitle(doc: jsPDF, x: number, y: number, w: number, txt: string): number {
  const h = 16;
  doc.setFillColor(HEAD * 255, HEAD * 255, HEAD * 255);
  doc.rect(x, y, w, h, "F");
  doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(9);
  doc.text(txt, x + 6, y + 11);
  doc.setTextColor(0); doc.setFont("helvetica", "normal");
  return y + h;
}

function drawTable(doc: jsPDF, x: number, y: number, cols: Col[], rows: OSRow[], nLinhas: number): number {
  const rowH = 22;
  const headH = 18;

  // Cabeçalho de colunas
  doc.setFillColor(240, 240, 240);
  doc.rect(x, y, cols.reduce((s, c) => s + c.w, 0), headH, "F");
  doc.setFontSize(7.5); doc.setFont("helvetica", "bold");
  let cx = x;
  for (const c of cols) {
    doc.rect(cx, y, c.w, headH);
    doc.text(c.label, cx + c.w / 2, y + 12, { align: "center", maxWidth: c.w - 4 });
    cx += c.w;
  }
  doc.setFont("helvetica", "normal");
  let ry = y + headH;

  // Linhas (dados + em branco para preencher à mão)
  doc.setFontSize(8);
  for (let i = 0; i < nLinhas; i++) {
    const row = rows[i];
    cx = x;
    for (const c of cols) {
      doc.rect(cx, ry, c.w, rowH);
      if (row && c.key) {
        const raw = (row as any)[c.key];
        const val = raw == null ? "" : String(raw);
        if (val) doc.text(val, cx + 3, ry + 14, { maxWidth: c.w - 6 });
      }
      cx += c.w;
    }
    ry += rowH;
  }
  return ry;
}
