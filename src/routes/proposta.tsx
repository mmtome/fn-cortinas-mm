import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, FileText } from "lucide-react";
import jsPDF from "jspdf";
import { AppShell } from "@/components/AppShell";
import { PageHeader, Card, GoldButton } from "@/components/ui-kit";
import { useStore } from "@/lib/store";
import { formatBRL } from "@/lib/pricing";

export const Route = createFileRoute("/proposta")({
  component: Proposta,
  validateSearch: (s: Record<string, unknown>) => ({ id: (s.id as string) ?? "" }),
});

function Proposta() {
  const { id } = Route.useSearch();
  const proposals = useStore((s) => s.proposals);
  const [selectedId, setSelectedId] = useState(id || proposals[0]?.id || "");
  const proposal = useMemo(() => proposals.find((p) => p.id === selectedId), [proposals, selectedId]);

  const validade = new Date();
  validade.setDate(validade.getDate() + 15);

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
    doc.text(`• Validade da proposta: ${validade.toLocaleDateString("pt-BR")}`, 50, y); y += 12;
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
        eyebrow="Proposta Comercial"
        title="Gerador de PDF"
        subtitle="Apresente um documento sofisticado, à altura do seu cliente. Selecione uma precificação para gerar."
        actions={
          <GoldButton onClick={baixarPDF}>
            <Download className="w-4 h-4" /> Baixar PDF
          </GoldButton>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        <Card>
          <div className="text-[10px] uppercase tracking-[0.2em] text-gold mb-3">Selecione</div>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {proposals.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                className={`w-full text-left p-3 rounded-lg transition-all ${
                  selectedId === p.id
                    ? "bg-[oklch(0.78_0.13_85_/_0.12)] border border-gold"
                    : "border border-transparent hover:bg-[oklch(0.78_0.13_85_/_0.05)]"
                }`}
              >
                <div className="font-medium text-sm">{p.cliente}</div>
                <div className="text-xs text-muted-foreground">{p.ambiente}</div>
                <div className="text-xs text-gold mt-1">{formatBRL(p.valor)}</div>
              </button>
            ))}
          </div>
        </Card>

        {/* Preview */}
        {proposal ? (
          <div className="rounded-2xl overflow-hidden shadow-premium">
            {/* Capa preview */}
            <div className="gradient-navy p-12 relative">
              <div className="absolute top-0 left-0 right-0 h-1 gradient-gold" />
              <div className="absolute bottom-0 left-0 right-0 h-1 gradient-gold" />
              <div className="text-center">
                <div className="text-[10px] uppercase tracking-[0.3em] text-gold mb-4">Atelier Premium</div>
                <h2 className="font-serif text-5xl mb-3">FN Cortinas</h2>
                <div className="w-24 h-px bg-gold mx-auto mb-4" />
                <div className="text-lg font-serif">Proposta Comercial</div>
                <div className="mt-8 text-sm text-muted-foreground space-y-1">
                  <div>Cliente: <span className="text-foreground">{proposal.cliente}</span></div>
                  <div>Ambiente: <span className="text-foreground">{proposal.ambiente}</span></div>
                  <div>Data: <span className="text-foreground">{new Date(proposal.data).toLocaleDateString("pt-BR")}</span></div>
                </div>
                <div className="mt-10 text-[10px] uppercase tracking-[0.25em] text-gold">
                  Cortinas · Persianas · Alto Padrão
                </div>
              </div>
            </div>

            {/* Detalhe preview */}
            <div className="bg-[var(--champagne)] text-[var(--navy-deep)] p-10">
              <div className="flex items-center gap-3 mb-6">
                <FileText className="w-5 h-5 text-[var(--navy-deep)]" />
                <h3 className="font-serif text-2xl">Detalhamento</h3>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.2em] opacity-60">Cliente</div>
                  <div className="font-medium">{proposal.cliente}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.2em] opacity-60">Ambiente</div>
                  <div className="font-medium">{proposal.ambiente}</div>
                </div>
              </div>

              <div className="h-px bg-[oklch(0.78_0.13_85)] mb-6" />

              <div className="text-[10px] uppercase tracking-[0.2em] opacity-60 mb-3">Descrição técnica</div>
              <ul className="text-sm space-y-1 opacity-80 mb-6">
                <li>• Tecido: {proposal.config?.tecido ?? "Linho Belga"}</li>
                <li>• Tipo: {proposal.config?.tipoCortina ?? "Wave"}</li>
                <li>• Trilho: {proposal.config?.trilho ?? "Trilho Suíço"}</li>
                <li>• Instalação e acabamento premium inclusos</li>
              </ul>

              <div className="bg-[var(--navy-deep)] text-[var(--champagne)] rounded-lg p-6 border-l-4 border-[var(--gold)]">
                <div className="text-[10px] uppercase tracking-[0.2em] text-gold">Total</div>
                <div className="font-serif text-4xl">{formatBRL(proposal.valor)}</div>
              </div>

              <div className="mt-6 text-xs space-y-1 opacity-70">
                <div>Validade: {validade.toLocaleDateString("pt-BR")}</div>
                <div>Pagamento: 50% sinal + 50% na entrega · Produção: 15 a 25 dias úteis</div>
                <div>Garantia de 12 meses</div>
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
