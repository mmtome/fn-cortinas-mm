import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import jsPDF from "jspdf";

import { PageHeader, Card, GoldButton, formatDate } from "@/components/ui-kit";
import { useStore } from "@/lib/store";
import { formatBRL, CATALOGO_TECIDOS, CATALOGO_FORROS } from "@/lib/pricing-engine";

export const Route = createFileRoute("/proposta")({
  component: Proposta,
  validateSearch: (s: Record<string, unknown>) => ({ id: (s.id as string) ?? "" }),
});

function addDaysISO(iso: string, days: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

function nomeTecido(cod?: number) {
  return CATALOGO_TECIDOS.find((t) => t.codigo === cod)?.nome ?? "—";
}
function nomeForro(cod?: number | null) {
  if (cod == null) return "Sem forro";
  return CATALOGO_FORROS.find((t) => t.codigo === cod)?.nome ?? "—";
}

function Proposta() {
  const { id } = Route.useSearch();
  const proposals = useStore((s) => s.proposals);
  const [selectedId, setSelectedId] = useState(id || proposals[0]?.id || "");
  const proposal = useMemo(() => proposals.find((p) => p.id === selectedId), [proposals, selectedId]);

  const validadeISO = proposal ? addDaysISO(proposal.data, 15) : "";
  const cfg = proposal?.input;
  const res = proposal?.result;

  const baixarPDF = () => {
    if (!proposal || !cfg || !res) return;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();

    // ====== CAPA — minimalista, azul profundo
    doc.setFillColor(20, 26, 48);
    doc.rect(0, 0, w, h, "F");

    // Linha dourada superior fina
    doc.setFillColor(206, 178, 112);
    doc.rect(50, 50, 40, 1.5, "F");

    doc.setTextColor(206, 178, 112);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("FN CORTINAS · ATELIER", 50, 70);

    doc.setTextColor(238, 232, 217);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(32);
    doc.text("Proposta", 50, h / 2 - 20);
    doc.text("Comercial", 50, h / 2 + 18);

    doc.setDrawColor(206, 178, 112);
    doc.setLineWidth(0.4);
    doc.line(50, h / 2 + 50, 110, h / 2 + 50);

    doc.setTextColor(170, 165, 150);
    doc.setFontSize(10);
    doc.text(proposal.cliente, 50, h / 2 + 80);
    doc.text(proposal.ambiente, 50, h / 2 + 96);
    doc.text(new Date(proposal.data).toLocaleDateString("pt-BR"), 50, h / 2 + 112);

    doc.setTextColor(140, 135, 120);
    doc.setFontSize(8);
    doc.text("Cortinas e persianas sob medida · Alto padrão", 50, h - 50);

    // ====== PÁGINA 2 — detalhamento champagne/claro
    doc.addPage();
    doc.setFillColor(250, 247, 240);
    doc.rect(0, 0, w, h, "F");

    // header sutil
    doc.setFillColor(20, 26, 48);
    doc.rect(50, 50, 4, 30, "F");
    doc.setTextColor(20, 26, 48);
    doc.setFontSize(8);
    doc.text("FN CORTINAS", 70, 62);
    doc.setFontSize(13);
    doc.text("Detalhamento da proposta", 70, 78);

    // Cliente / Ambiente
    let y = 130;
    section(doc, "CLIENTE", proposal.cliente, 50, y);
    section(doc, "AMBIENTE", proposal.ambiente, w / 2, y);
    y += 50;

    drawLine(doc, y); y += 24;

    // Especificações
    doc.setTextColor(120, 115, 100);
    doc.setFontSize(8);
    doc.text("ESPECIFICAÇÕES TÉCNICAS", 50, y); y += 18;
    doc.setTextColor(40, 40, 50);
    doc.setFontSize(10);
    const linhas = [
      ["Modelo", cfg.estrutura.modelo],
      ["Tecido", nomeTecido(cfg.estrutura.tecidoCodigo)],
      ["Forro", nomeForro(cfg.estrutura.forroCodigo)],
      ["Trilho", res.trilhoInferido],
      ["Medidas cortina", `${cfg.medidas.larguraCortina} × ${cfg.medidas.alturaCortina} m`],
      ["Tecido necessário", `${res.mtsTecido.toFixed(2)} m${res.mtsForro > 0 ? ` (+${res.mtsForro.toFixed(2)} m de forro)` : ""}`],
      ["Instalação", cfg.instalacao.instalar ? `Inclusa · ${cfg.instalacao.dificuldade}` : "Não inclusa"],
    ];
    linhas.forEach(([k, v]) => {
      doc.setTextColor(120, 115, 100);
      doc.text(k, 50, y);
      doc.setTextColor(40, 40, 50);
      doc.text(String(v), 200, y);
      y += 16;
    });

    y += 14; drawLine(doc, y); y += 28;

    // Valor — bloco navy
    doc.setFillColor(20, 26, 48);
    doc.roundedRect(50, y, w - 100, 90, 8, 8, "F");
    doc.setFillColor(206, 178, 112);
    doc.rect(50, y, 2, 90, "F");
    doc.setTextColor(206, 178, 112);
    doc.setFontSize(8);
    doc.text("INVESTIMENTO TOTAL", 70, y + 26);
    doc.setTextColor(245, 238, 220);
    doc.setFontSize(24);
    doc.text(formatBRL(res.totalFinal), 70, y + 58);
    doc.setTextColor(160, 152, 130);
    doc.setFontSize(9);
    doc.text(
      cfg.comercial.parcelas > 1
        ? `${cfg.comercial.forma} · ${cfg.comercial.parcelas}× de ${formatBRL(res.valorParcela)}`
        : cfg.comercial.forma,
      70, y + 76
    );
    y += 120;

    // Condições
    doc.setTextColor(120, 115, 100);
    doc.setFontSize(8);
    doc.text("CONDIÇÕES COMERCIAIS", 50, y); y += 16;
    doc.setTextColor(60, 60, 70);
    doc.setFontSize(9);
    const cond = [
      `Validade da proposta: ${formatDate(validadeISO)}`,
      "Pagamento: 50% sinal e 50% na entrega",
      "Prazo de produção: 15 a 25 dias úteis",
      "Garantia: 12 meses para tecidos e mecanismos",
    ];
    cond.forEach((c) => { doc.text(`·  ${c}`, 50, y); y += 14; });

    // Rodapé
    doc.setDrawColor(206, 178, 112); doc.setLineWidth(0.4);
    doc.line(50, h - 60, 90, h - 60);
    doc.setTextColor(20, 26, 48);
    doc.setFontSize(8);
    doc.text("FN Cortinas — Atelier", 50, h - 46);

    doc.save(`Proposta-${proposal.cliente.replace(/\s+/g, "-")}.pdf`);
  };

  return (
    <>
      <PageHeader
        eyebrow="Proposta"
        title="Documento comercial"
        subtitle="Pré-visualize e baixe o PDF para envio."
        actions={
          <GoldButton onClick={baixarPDF}>
            <Download className="w-3.5 h-3.5" /> Baixar PDF
          </GoldButton>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-3">Selecione</div>
          <div className="space-y-0.5 max-h-[600px] overflow-y-auto pr-1">
            {proposals.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                className={`w-full text-left px-3 py-3 rounded-md transition-colors ${
                  selectedId === p.id ? "bg-white/[0.05]" : "hover:bg-white/[0.025]"
                }`}
              >
                <div className="text-[13px] font-medium">{p.cliente}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">{p.ambiente}</div>
                <div className="text-[12px] text-gold mt-1 stat">{formatBRL(p.valor)}</div>
              </button>
            ))}
          </div>
        </div>

        {proposal ? (
          <div className="rounded-2xl overflow-hidden border border-white/[0.05]">
            {/* Capa preview */}
            <div className="bg-[var(--navy-deep)] px-12 py-20">
              <div className="w-10 h-px bg-[var(--gold)] mb-4" />
              <div className="text-[10px] uppercase tracking-[0.22em] text-gold mb-12">FN Cortinas · Atelier</div>
              <div className="text-[40px] font-medium tracking-tight leading-tight">Proposta</div>
              <div className="text-[40px] font-medium tracking-tight leading-tight">Comercial</div>
              <div className="w-12 h-px bg-[oklch(0.80_0.10_88_/_0.6)] mt-8 mb-8" />
              <div className="text-[12px] text-muted-foreground space-y-1.5">
                <div>{proposal.cliente}</div>
                <div>{proposal.ambiente}</div>
                <div>{formatDate(proposal.data)}</div>
              </div>
            </div>

            {/* Detalhe preview — champagne claro */}
            <div className="bg-[var(--champagne)] text-[var(--navy-deep)] px-12 py-14">
              <div className="text-[10px] uppercase tracking-[0.18em] opacity-60 mb-2">Detalhamento</div>
              <div className="text-[20px] font-medium tracking-tight mb-10">{proposal.cliente}</div>

              {cfg && res && (
                <>
                  <dl className="grid grid-cols-[140px_1fr] gap-y-3 gap-x-8 text-[13px] mb-10">
                    <Spec k="Modelo" v={cfg.estrutura.modelo} />
                    <Spec k="Tecido" v={nomeTecido(cfg.estrutura.tecidoCodigo)} />
                    <Spec k="Forro" v={nomeForro(cfg.estrutura.forroCodigo)} />
                    <Spec k="Trilho" v={res.trilhoInferido} />
                    <Spec k="Medidas" v={`${cfg.medidas.larguraCortina} × ${cfg.medidas.alturaCortina} m`} />
                    <Spec k="Tecido total" v={`${res.mtsTecido.toFixed(2)} m${res.mtsForro > 0 ? ` + ${res.mtsForro.toFixed(2)} forro` : ""}`} />
                    <Spec k="Instalação" v={cfg.instalacao.instalar ? `Inclusa · ${cfg.instalacao.dificuldade}` : "Não inclusa"} />
                  </dl>

                  <div className="h-px bg-[var(--navy-deep)] opacity-10 mb-8" />

                  <div className="flex items-baseline justify-between">
                    <div className="text-[10px] uppercase tracking-[0.18em] opacity-50">Investimento total</div>
                    <div className="text-[28px] font-medium tracking-tight stat">{formatBRL(res.totalFinal)}</div>
                  </div>
                  {cfg.comercial.parcelas > 1 && (
                    <div className="text-[12px] opacity-70 mt-1 text-right">
                      {cfg.comercial.forma} · {cfg.comercial.parcelas}× de <span className="stat">{formatBRL(res.valorParcela)}</span>
                    </div>
                  )}
                </>
              )}

              <div className="mt-12 text-[11px] space-y-1 opacity-60">
                <div>Validade · {formatDate(validadeISO)}</div>
                <div>Pagamento · 50% sinal + 50% na entrega</div>
                <div>Produção · 15 a 25 dias úteis · Garantia 12 meses</div>
              </div>
            </div>
          </div>
        ) : (
          <Card>Nenhuma proposta selecionada.</Card>
        )}
      </div>
    </>
  );
}

function Spec({ k, v }: { k: string; v: string }) {
  return (
    <>
      <dt className="text-[10px] uppercase tracking-[0.18em] opacity-50 self-center">{k}</dt>
      <dd className="opacity-90">{v}</dd>
    </>
  );
}

// jsPDF helpers
function section(doc: any, label: string, value: string, x: number, y: number) {
  doc.setTextColor(120, 115, 100);
  doc.setFontSize(8);
  doc.text(label, x, y);
  doc.setTextColor(20, 26, 48);
  doc.setFontSize(13);
  doc.text(value, x, y + 18);
}
function drawLine(doc: any, y: number) {
  doc.setDrawColor(206, 178, 112);
  doc.setLineWidth(0.3);
  doc.line(50, y, doc.internal.pageSize.getWidth() - 50, y);
}
