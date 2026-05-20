import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import jsPDF from "jspdf";
import { AppShell } from "@/components/AppShell";
import { PageHeader, Card, GoldButton, formatDate } from "@/components/ui-kit";
import { useStore } from "@/lib/store";
import { formatBRL } from "@/lib/pricing";

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

function Proposta() {
  const { id } = Route.useSearch();
  const proposals = useStore((s) => s.proposals);
  const [selectedId, setSelectedId] = useState(id || proposals[0]?.id || "");
  const proposal = useMemo(() => proposals.find((p) => p.id === selectedId), [proposals, selectedId]);

  const validadeISO = proposal ? addDaysISO(proposal.data, 15) : "";

  const baixarPDF = () => {
    if (!proposal) return;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();

    // Capa
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, w, h, "F");
    doc.setFillColor(212, 175, 55);
    doc.rect(0, 0, w, 8, "F");
    doc.rect(0, h - 8, w, 8, "F");

    doc.setTextColor(212, 175, 55);
    doc.setFontSize(10);
    doc.text("ATELIER PREMIUM", w / 2, 120, { align: "center" });

    doc.setTextColor(245, 240, 224);
    doc.setFont("times", "normal");
    doc.setFontSize(48);
    doc.text("FN Cortinas", w / 2, 180, { align: "center" });

    doc.setDrawColor(212, 175, 55);
    doc.setLineWidth(0.5);
    doc.line(w / 2 - 60, 200, w / 2 + 60, 200);

    doc.setFontSize(14);
    doc.text("Proposta Comercial", w / 2, 240, { align: "center" });

    doc.setFontSize(11);
    doc.setTextColor(180, 170, 150);
    doc.text(`Cliente: ${proposal.cliente}`, w / 2, 320, { align: "center" });
    doc.text(`Ambiente: ${proposal.ambiente}`, w / 2, 340, { align: "center" });
    doc.text(`Data: ${new Date(proposal.data).toLocaleDateString("pt-BR")}`, w / 2, 360, { align: "center" });

    doc.setFontSize(9);
    doc.setTextColor(212, 175, 55);
    doc.text("CORTINAS · PERSIANAS · ALTO PADRÃO", w / 2, h - 60, { align: "center" });

    // Página 2 — Detalhes
    doc.addPage();
    doc.setFillColor(252, 250, 245);
    doc.rect(0, 0, w, h, "F");

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, w, 90, "F");
    doc.setFillColor(212, 175, 55);
    doc.rect(0, 90, w, 3, "F");

    doc.setTextColor(245, 240, 224);
    doc.setFont("times", "normal");
    doc.setFontSize(22);
    doc.text("Detalhamento da Proposta", 50, 55);

    doc.setTextColor(212, 175, 55);
    doc.setFontSize(9);
    doc.text("FN CORTINAS · ATELIER PREMIUM", 50, 75);

    let y = 130;
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("CLIENTE", 50, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(14);
    doc.text(proposal.cliente, 50, y + 18);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("AMBIENTE", 320, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(14);
    doc.text(proposal.ambiente, 320, y + 18);

    y += 60;
    doc.setDrawColor(212, 175, 55);
    doc.setLineWidth(0.5);
    doc.line(50, y, w - 50, y);

    y += 30;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("DESCRIÇÃO TÉCNICA", 50, y);
    y += 20;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 70);
    const cfg = proposal.config ?? {};
    const linhas = [
      `Tecido: ${cfg.tecido ?? "—"} · Tipo: ${cfg.tipoCortina ?? "—"}`,
      `Persiana: ${cfg.tipoPersiana ?? "—"} · Trilho: ${cfg.trilho ?? "—"}`,
      `Medidas: ${cfg.larguraParede ?? "—"}m × ${cfg.alturaParede ?? "—"}m (parede)`,
      `Janela: ${cfg.larguraJanela ?? "—"}m × ${cfg.alturaJanela ?? "—"}m`,
      `Franzimento: ${cfg.franzimento ?? "—"}x · Presilhas: ${cfg.presilhas ?? "—"}`,
      `Instalação ${cfg.instalacao ? "incluída" : "não incluída"} · Deslocamento ${formatBRL(cfg.deslocamento ?? 0)}`,
    ];
    linhas.forEach((l) => { doc.text(l, 50, y); y += 16; });

    y += 20;
    doc.setDrawColor(212, 175, 55);
    doc.line(50, y, w - 50, y);

    y += 30;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("VALOR DA PROPOSTA", 50, y);

    y += 30;
    doc.setFillColor(15, 23, 42);
    doc.roundedRect(50, y, w - 100, 70, 6, 6, "F");
    doc.setFillColor(212, 175, 55);
    doc.rect(50, y, 3, 70, "F");
    doc.setTextColor(212, 175, 55);
    doc.setFontSize(9);
    doc.text("TOTAL", 70, y + 25);
    doc.setFont("times", "normal");
    doc.setTextColor(245, 240, 224);
    doc.setFontSize(28);
    doc.text(formatBRL(proposal.valor), 70, y + 55);

    y += 110;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 90);
    doc.text("CONDIÇÕES COMERCIAIS", 50, y);
    y += 14;
    doc.text("• Pagamento: 50% sinal e 50% na entrega", 50, y); y += 12;
    doc.text("• Prazo de produção: 15 a 25 dias úteis", 50, y); y += 12;
    doc.text(`• Validade da proposta: ${formatDate(validadeISO)}`, 50, y); y += 12;
    doc.text("• Garantia: 12 meses para tecidos e mecanismos", 50, y); y += 30;

    doc.setDrawColor(212, 175, 55);
    doc.line(50, y, 220, y);
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(10);
    doc.text("FN Cortinas — Atelier Premium", 50, y + 14);

    doc.save(`Proposta-${proposal.cliente.replace(/\s+/g, "-")}.pdf`);
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow="Proposta"
        title="Gerador de PDF"
        subtitle="Selecione uma precificação e gere uma proposta minimalista, pronta para o cliente."
        actions={
          <GoldButton onClick={baixarPDF}>
            <Download className="w-3.5 h-3.5" /> Baixar PDF
          </GoldButton>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        <div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground mb-3">Selecione</div>
          <div className="space-y-1 max-h-[600px] overflow-y-auto pr-1">
            {proposals.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                className={`w-full text-left px-3 py-3 rounded-md transition-colors ${
                  selectedId === p.id
                    ? "bg-white/[0.05]"
                    : "hover:bg-white/[0.025]"
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
          <div className="rounded-xl overflow-hidden border border-white/[0.05]">
            {/* Capa preview */}
            <div className="bg-[var(--navy-deep)] px-12 py-16 text-center">
              <div className="text-[10px] uppercase tracking-[0.25em] text-gold mb-6">Atelier Premium</div>
              <div className="text-[28px] font-medium tracking-tight">FN Cortinas</div>
              <div className="w-12 h-px bg-[oklch(0.80_0.10_88_/_0.5)] mx-auto my-5" />
              <div className="text-[13px] text-muted-foreground">Proposta Comercial</div>
              <div className="mt-12 text-[12px] text-muted-foreground space-y-1.5">
                <div>{proposal.cliente}</div>
                <div>{proposal.ambiente}</div>
                <div>{formatDate(proposal.data)}</div>
              </div>
            </div>

            {/* Detalhe preview */}
            <div className="bg-[var(--champagne)] text-[var(--navy-deep)] px-12 py-12">
              <div className="text-[10px] uppercase tracking-[0.18em] opacity-60 mb-2">Detalhamento</div>
              <div className="text-[18px] font-medium tracking-tight mb-8">Proposta {proposal.cliente.split(" ")[0]}</div>

              <div className="grid grid-cols-2 gap-8 mb-8 text-[13px]">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.18em] opacity-50 mb-1.5">Cliente</div>
                  <div>{proposal.cliente}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.18em] opacity-50 mb-1.5">Ambiente</div>
                  <div>{proposal.ambiente}</div>
                </div>
              </div>

              <div className="h-px bg-[var(--navy-deep)] opacity-10 mb-8" />

              <div className="text-[10px] uppercase tracking-[0.18em] opacity-50 mb-3">Descrição técnica</div>
              <ul className="text-[13px] space-y-1.5 opacity-80 mb-10">
                <li>Tecido · {proposal.config?.tecido ?? "Linho Belga"}</li>
                <li>Tipo · {proposal.config?.tipoCortina ?? "Wave"}</li>
                <li>Trilho · {proposal.config?.trilho ?? "Trilho Suíço"}</li>
                <li>Instalação e acabamento premium inclusos</li>
              </ul>

              <div className="flex items-baseline justify-between pt-6 border-t border-[var(--navy-deep)]/15">
                <div className="text-[10px] uppercase tracking-[0.18em] opacity-50">Total</div>
                <div className="text-[26px] font-medium tracking-tight stat">{formatBRL(proposal.valor)}</div>
              </div>

              <div className="mt-10 text-[11px] space-y-1 opacity-60">
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
    </AppShell>
  );
}
