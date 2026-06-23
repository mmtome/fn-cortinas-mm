import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Download, Save, Building2, SlidersHorizontal } from "lucide-react";
import jsPDF from "jspdf";

import { PageHeader, Card, GoldButton, Field, selectCls, inputCls, formatDate } from "@/components/ui-kit";
import { useStore, store, useCalcCtx } from "@/lib/store";
import { calcular, formatBRL, type Tecido, type PricingInput, type CalcResult } from "@/lib/pricing-engine";
import { toast } from "sonner";

export const Route = createFileRoute("/proposta")({
  component: Proposta,
  validateSearch: (s: Record<string, unknown>) => ({ id: (s.id as string) ?? "" }),
});

const FORMAS = ["Pix", "Cartão Débito", "Cartão Crédito 1x", "Cartão Crédito Parcelado", "Dinheiro"] as const;

function addDaysISO(iso: string, days: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

const nome = (cat: Tecido[], cod?: number | null, fallback = "—") =>
  cod == null ? fallback : cat.find((t) => t.codigo === cod)?.nome ?? fallback;

function Proposta() {
  const { id } = Route.useSearch();
  const proposals = useStore((s) => s.proposals);
  const tecidos = useStore((s) => s.tecidos);
  const forros = useStore((s) => s.forros);
  const blackouts = useStore((s) => s.blackouts);
  const empresa = useStore((s) => s.empresa);
  const ctx = useCalcCtx();

  const [selectedId, setSelectedId] = useState(id || proposals[0]?.id || "");
  const proposal = useMemo(() => proposals.find((p) => p.id === selectedId), [proposals, selectedId]);

  // Ajustes comerciais editáveis pela empresa (margem/desconto/pagamento)
  const [comercial, setComercial] = useState(proposal?.input?.comercial);
  useEffect(() => {
    setComercial(proposal?.input?.comercial);
  }, [proposal?.id]);

  // Recalcula com o input da proposta + ajustes atuais + variáveis vigentes
  const input: PricingInput | undefined = useMemo(() => {
    if (!proposal?.input) return undefined;
    return { ...proposal.input, comercial: comercial ?? proposal.input.comercial };
  }, [proposal, comercial]);

  const res: CalcResult | undefined = useMemo(
    () => (input ? calcular(input, ctx) : proposal?.result),
    [input, ctx, proposal]
  );

  const validadeISO = proposal ? addDaysISO(proposal.data, 15) : "";
  const cfg = input;

  const setC = (patch: Partial<NonNullable<typeof comercial>>) =>
    setComercial((c) => ({ ...(c ?? proposal!.input!.comercial), ...patch }));

  const salvarAjustes = () => {
    if (!proposal || !input || !res) return;
    store.upsertProposal({ ...proposal, input, result: res, valor: res.totalFinal });
    toast.success("Ajustes salvos na proposta");
  };

  const baixarPDF = () => {
    if (!proposal || !cfg || !res) return;
    gerarPDF({ proposal, cfg, res, empresa, validadeISO, tecidos, forros, blackouts });
  };

  return (
    <>
      <PageHeader
        eyebrow="Empresa · Documento comercial"
        title="Propostas"
        subtitle="Confira custos, ajuste margem e desconto, e gere o PDF para o cliente."
        actions={
          proposal && (
            <div className="hidden sm:flex gap-2">
              <GoldButton variant="outline" onClick={salvarAjustes}>
                <Save className="w-3.5 h-3.5" /> Salvar ajustes
              </GoldButton>
              <GoldButton onClick={baixarPDF}>
                <Download className="w-3.5 h-3.5" /> Baixar PDF
              </GoldButton>
            </div>
          )
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6 lg:gap-8">
        {/* Lista de propostas */}
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-3">Selecione</div>
          <div className="space-y-0.5 lg:max-h-[640px] overflow-y-auto pr-1 flex lg:block gap-2 overflow-x-auto pb-1">
            {proposals.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                className={`text-left px-3 py-3 rounded-md transition-colors shrink-0 lg:w-full min-w-[180px] ${
                  selectedId === p.id ? "bg-white/[0.05]" : "hover:bg-white/[0.025]"
                }`}
              >
                <div className="text-[13px] font-medium truncate">{p.cliente}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{p.ambiente}</div>
                <div className="text-[12px] text-gold mt-1 stat">{formatBRL(p.valor)}</div>
              </button>
            ))}
            {proposals.length === 0 && (
              <div className="text-[12px] text-muted-foreground">Nenhuma proposta ainda.</div>
            )}
          </div>
        </div>

        {proposal && cfg && res ? (
          <div className="space-y-6">
            {/* Painel interno da empresa: custos + ajustes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <BreakdownEmpresa res={res} />
              <AjustesComercial comercial={comercial!} setC={setC} res={res} onSalvar={salvarAjustes} onPDF={baixarPDF} />
            </div>

            {/* Pré-visualização do documento do cliente */}
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-3">Pré-visualização do PDF</div>
              <DocumentoPreview
                proposal={proposal} cfg={cfg} res={res} empresa={empresa} validadeISO={validadeISO}
                tecidos={tecidos} forros={forros}
              />
            </div>
          </div>
        ) : proposal ? (
          <Card>
            <div className="text-[13px]">Esta proposta não possui detalhamento técnico.</div>
            <div className="text-[12px] text-muted-foreground mt-1">Crie uma nova precificação pela Calculadora para gerar o PDF completo.</div>
          </Card>
        ) : (
          <Card>Selecione uma proposta na lista.</Card>
        )}
      </div>
    </>
  );
}

// =========================================================
// Breakdown interno (custos) — só a empresa vê
// =========================================================
function BreakdownEmpresa({ res }: { res: CalcResult }) {
  return (
    <div className="surface rounded-2xl p-6">
      <div className="flex items-center justify-between gap-2 mb-5">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-gold" />
          <div className="text-[13px] font-medium">Composição de custos</div>
        </div>
        <span className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground border border-white/[0.08] rounded-full px-2 py-0.5">
          Uso interno · não vai ao cliente
        </span>
      </div>

      <Sec>Necessidade técnica</Sec>
      <KV k="Método de corte" v={res.caso === "B" ? "Virar o rolo (B)" : "Rolo em pé (A)"} />
      <KV k="Altura de corte" v={`${res.alturaCorte.toFixed(2)} m`} />
      {res.caso === "B" && <KV k="Nº de panos" v={`${res.nPanos}`} />}
      <KV k="Largura franzida" v={`${res.larguraFranzida.toFixed(2)} m`} />
      {res.caso === "B" && res.sobraLateral > 0 && <KV k="Sobra lateral" v={`${res.sobraLateral.toFixed(2)} m`} />}
      <KV k="Tecido a comprar" v={`${res.mtsTecido.toFixed(2)} m`} />
      {res.mtsForro > 0 && <KV k="Forro" v={`${res.mtsForro.toFixed(2)} m`} />}
      {res.mtsBlackout > 0 && <KV k="Blackout" v={`${res.mtsBlackout.toFixed(2)} m`} />}
      {res.mtsEntretela > 0 && <KV k="Entretela" v={`${res.mtsEntretela.toFixed(2)} m`} />}
      <KV k="Rodízios" v={`${res.qtdRodizios} un`} />
      <KV k={res.trilhoInferido} v={`${res.mtsTrilho.toFixed(2)} m`} />

      <div className="hairline my-4" />

      <Sec>Custos</Sec>
      <KV k="Tecido" v={formatBRL(res.custoTecido)} muted />
      {res.custoForro > 0 && <KV k="Forro" v={formatBRL(res.custoForro)} muted />}
      {res.custoBlackout > 0 && <KV k="Blackout" v={formatBRL(res.custoBlackout)} muted />}
      <KV k="Mão de obra" v={formatBRL(res.custoMaoObra)} muted />
      <KV k="Trilho" v={formatBRL(res.custoTrilho)} muted />
      {res.custoCordao > 0 && <KV k="Cordão" v={formatBRL(res.custoCordao)} muted />}
      <KV k="Rodízios" v={formatBRL(res.custoRodizio)} muted />
      {res.custoEntretela > 0 && <KV k="Entretela" v={formatBRL(res.custoEntretela)} muted />}
      {res.custoInstalacao > 0 && <KV k="Instalação" v={formatBRL(res.custoInstalacao)} muted />}

      <div className="hairline my-4" />
      <KV k="Subtotal produção" v={formatBRL(res.subtotalProducao)} />
      <div className="flex items-baseline justify-between mt-3">
        <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Total final</span>
        <span className="text-[18px] font-medium stat text-gold">{formatBRL(res.totalFinal)}</span>
      </div>
      <div className="text-[11px] text-muted-foreground mt-1 text-right">
        Margem bruta: {formatBRL(res.totalFinal - res.subtotalProducao - res.custoInstalacao - res.custoDeslocamento)}
      </div>
    </div>
  );
}

// =========================================================
// Ajustes comerciais (empresa)
// =========================================================
function AjustesComercial({ comercial, setC, res, onSalvar, onPDF }: any) {
  return (
    <div className="surface rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-5">
        <SlidersHorizontal className="w-4 h-4 text-gold" />
        <div className="text-[13px] font-medium">Ajuste comercial</div>
      </div>

      <div className="space-y-5">
        <Field label={`Margem extra · ${comercial.margemExtra}%`} hint="Sobre o lucro base">
          <input type="range" min={0} max={40} step={1} className="w-full accent-[var(--gold)]" value={comercial.margemExtra} onChange={(e) => setC({ margemExtra: +e.target.value })} />
        </Field>
        <Field label={`Desconto · ${comercial.desconto}%`}>
          <input type="range" min={0} max={25} step={1} className="w-full accent-[var(--gold)]" value={comercial.desconto} onChange={(e) => setC({ desconto: +e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Pagamento">
            <select className={selectCls} value={comercial.forma} onChange={(e) => setC({ forma: e.target.value })}>
              {FORMAS.map((f) => <option key={f}>{f}</option>)}
            </select>
          </Field>
          <Field label="Parcelas">
            <input type="number" inputMode="numeric" min={1} max={18} className={inputCls} value={comercial.parcelas} onChange={(e) => setC({ parcelas: Math.max(1, +e.target.value) })} />
          </Field>
        </div>
      </div>

      <div className="hairline my-5" />
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Cliente paga</span>
        <span className="text-[22px] font-medium stat">{formatBRL(res.totalPagamento)}</span>
      </div>
      {comercial.parcelas > 1 && (
        <div className="text-[11px] text-muted-foreground text-right mt-1">{comercial.parcelas}× de <span className="text-gold stat">{formatBRL(res.valorParcela)}</span></div>
      )}

      <div className="flex gap-2 mt-5">
        <GoldButton variant="outline" onClick={onSalvar} className="flex-1 justify-center">
          <Save className="w-3.5 h-3.5" /> Salvar
        </GoldButton>
        <GoldButton onClick={onPDF} className="flex-1 justify-center">
          <Download className="w-3.5 h-3.5" /> PDF
        </GoldButton>
      </div>
    </div>
  );
}

// =========================================================
// Pré-visualização do documento (espelha o PDF)
// =========================================================
function DocumentoPreview({ proposal, cfg, res, empresa, validadeISO, tecidos, forros }: any) {
  return (
    <div className="rounded-2xl overflow-hidden border border-white/[0.05] max-w-2xl">
      {/* Capa */}
      <div className="bg-[var(--navy-deep)] px-8 sm:px-12 py-12 sm:py-16">
        <div className="w-10 h-px bg-[var(--gold)] mb-4" />
        <div className="text-[10px] uppercase tracking-[0.22em] text-gold mb-10">{empresa.nome} · Atelier</div>
        <div className="text-[32px] sm:text-[40px] font-medium tracking-tight leading-tight">Proposta</div>
        <div className="text-[32px] sm:text-[40px] font-medium tracking-tight leading-tight">Comercial</div>
        <div className="w-12 h-px bg-[oklch(0.80_0.10_88_/_0.6)] mt-7 mb-7" />
        <div className="text-[12px] text-muted-foreground space-y-1.5">
          <div className="text-foreground">{proposal.cliente}</div>
          <div>{proposal.ambiente}</div>
          <div>{formatDate(proposal.data)}</div>
        </div>
      </div>

      {/* Detalhe */}
      <div className="bg-[var(--champagne)] text-[var(--navy-deep)] px-8 sm:px-12 py-12">
        <div className="text-[10px] uppercase tracking-[0.18em] opacity-60 mb-2">Detalhamento</div>
        <div className="text-[20px] font-medium tracking-tight mb-8">{proposal.cliente}</div>

        <dl className="grid grid-cols-[120px_1fr] sm:grid-cols-[140px_1fr] gap-y-3 gap-x-6 text-[13px] mb-8">
          <Spec k="Modelo" v={cfg.estrutura.modelo} />
          <Spec k="Tecido" v={nome(tecidos, cfg.estrutura.tecidoCodigo)} />
          <Spec k="Forro" v={nome(forros, cfg.estrutura.forroCodigo, "Sem forro")} />
          <Spec k="Trilho" v={res.trilhoInferido} />
          <Spec k="Medidas" v={`${cfg.medidas.larguraCortina} × ${cfg.medidas.alturaCortina} m`} />
          <Spec k="Instalação" v={cfg.instalacao.instalar ? `Inclusa · ${cfg.instalacao.dificuldade}` : "Não inclusa"} />
        </dl>

        <div className="h-px bg-[var(--navy-deep)] opacity-10 mb-6" />

        <div className="rounded-xl bg-[var(--navy-deep)] text-[var(--champagne)] px-6 py-5 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-gold">Investimento total</div>
            <div className="text-[12px] opacity-70 mt-1">
              {cfg.comercial.parcelas > 1 ? `${cfg.comercial.forma} · ${cfg.comercial.parcelas}× de ${formatBRL(res.valorParcela)}` : cfg.comercial.forma}
            </div>
          </div>
          <div className="text-[26px] font-medium tracking-tight stat">{formatBRL(res.totalFinal)}</div>
        </div>

        <div className="mt-8 text-[11px] space-y-1 opacity-70">
          <div>Validade · {formatDate(validadeISO)}</div>
          <div>Pagamento · 50% sinal + 50% na entrega</div>
          <div>Produção · 15 a 25 dias úteis · Garantia 12 meses</div>
        </div>

        <ContatosLinha empresa={empresa} />
      </div>
    </div>
  );
}

function ContatosLinha({ empresa }: any) {
  const items = [empresa.telefone, empresa.instagram, empresa.email, empresa.site].filter(Boolean);
  if (items.length === 0) return null;
  return (
    <div className="mt-8 pt-5 border-t border-[var(--navy-deep)]/15 text-[11px] opacity-70 flex flex-wrap gap-x-5 gap-y-1">
      {items.map((t: string, i: number) => <span key={i}>{t}</span>)}
    </div>
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
function Sec({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2.5">{children}</div>;
}
function KV({ k, v, muted }: { k: string; v: string; muted?: boolean }) {
  return (
    <div className={`flex justify-between text-[12px] py-1 ${muted ? "text-muted-foreground" : ""}`}>
      <span>{k}</span>
      <span className="stat text-foreground">{v}</span>
    </div>
  );
}

// =========================================================
// GERAÇÃO DO PDF — design refinado
// =========================================================
function gerarPDF({ proposal, cfg, res, empresa, validadeISO, tecidos, forros }: any) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const M = 56; // margem

  // Paleta
  const navy: [number, number, number] = [20, 26, 48];
  const gold: [number, number, number] = [201, 168, 76];
  const cream: [number, number, number] = [250, 247, 240];
  const ink: [number, number, number] = [38, 40, 52];
  const soft: [number, number, number] = [120, 116, 104];

  const contatos = [empresa.telefone, empresa.instagram, empresa.email, empresa.site].filter(Boolean);

  // ============ PÁGINA 1 — CAPA ============
  doc.setFillColor(...navy);
  doc.rect(0, 0, w, h, "F");

  // Moldura dourada fina
  doc.setDrawColor(...gold);
  doc.setLineWidth(0.6);
  doc.rect(M - 18, M - 18, w - 2 * (M - 18), h - 2 * (M - 18));

  // Marca
  doc.setFillColor(...gold);
  doc.rect(M, M + 6, 34, 2, "F");
  doc.setTextColor(...gold);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(empresa.nome.toUpperCase() + "  ·  ATELIER", M, M + 30);

  // Título central
  doc.setTextColor(238, 232, 217);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(46);
  doc.text("Proposta", M, h / 2 - 14);
  doc.text("Comercial", M, h / 2 + 34);

  doc.setDrawColor(...gold);
  doc.setLineWidth(0.5);
  doc.line(M, h / 2 + 62, M + 70, h / 2 + 62);

  // Cliente
  doc.setTextColor(206, 200, 184);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(proposal.cliente, M, h / 2 + 96);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(168, 162, 148);
  doc.text(proposal.ambiente, M, h / 2 + 114);
  doc.text(new Date(proposal.data).toLocaleDateString("pt-BR"), M, h / 2 + 130);

  // Rodapé capa
  doc.setTextColor(150, 144, 128);
  doc.setFontSize(8.5);
  doc.text(empresa.slogan || "Cortinas e persianas sob medida", M, h - M);
  if (contatos.length) {
    doc.setTextColor(...gold);
    doc.text(contatos.join("   ·   "), M, h - M + 16);
  }

  // ============ PÁGINA 2 — DETALHAMENTO ============
  doc.addPage();
  doc.setFillColor(...cream);
  doc.rect(0, 0, w, h, "F");

  // Cabeçalho
  doc.setFillColor(...navy);
  doc.rect(M, M, 4, 34, "F");
  doc.setTextColor(...navy);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text(empresa.nome.toUpperCase(), M + 16, M + 13);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(15);
  doc.text("Detalhamento da proposta", M + 16, M + 32);

  let y = M + 78;

  // Cliente / Ambiente
  block(doc, "CLIENTE", proposal.cliente, M, y, soft, navy);
  block(doc, "AMBIENTE", proposal.ambiente, w / 2, y, soft, navy);
  y += 52;
  rule(doc, y, M, w, gold); y += 30;

  // Especificações
  doc.setTextColor(...soft);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("ESPECIFICAÇÕES", M, y); y += 20;

  const linhas: [string, string][] = [
    ["Modelo", cfg.estrutura.modelo],
    ["Tecido", nome(tecidos, cfg.estrutura.tecidoCodigo)],
    ["Forro", nome(forros, cfg.estrutura.forroCodigo, "Sem forro")],
    ["Acionamento", cfg.estrutura.motorizada ? "Motorizada" : "Manual"],
    ["Trilho", res.trilhoInferido],
    ["Medidas da cortina", `${cfg.medidas.larguraCortina} × ${cfg.medidas.alturaCortina} m`],
    ["Instalação", cfg.instalacao.instalar ? `Inclusa · ${cfg.instalacao.dificuldade}` : "Não inclusa"],
  ];
  doc.setFontSize(10.5);
  linhas.forEach(([k, v], i) => {
    if (i % 2 === 1) { doc.setFillColor(243, 238, 228); doc.rect(M - 8, y - 11, w - 2 * M + 16, 22, "F"); }
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...soft);
    doc.text(k, M, y + 4);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...ink);
    doc.text(String(v), M + 180, y + 4);
    y += 24;
  });

  y += 16;

  // Bloco de investimento (navy)
  const boxH = 96;
  doc.setFillColor(...navy);
  doc.roundedRect(M, y, w - 2 * M, boxH, 10, 10, "F");
  doc.setFillColor(...gold);
  doc.roundedRect(M, y, 3, boxH, 2, 2, "F");
  doc.setTextColor(...gold);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("INVESTIMENTO TOTAL", M + 22, y + 28);
  doc.setTextColor(245, 239, 222);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(28);
  doc.text(formatBRL(res.totalFinal), M + 22, y + 62);
  doc.setTextColor(176, 168, 146);
  doc.setFontSize(9.5);
  doc.text(
    cfg.comercial.parcelas > 1
      ? `${cfg.comercial.forma}  ·  ${cfg.comercial.parcelas}× de ${formatBRL(res.valorParcela)}`
      : cfg.comercial.forma,
    M + 22, y + 82
  );
  y += boxH + 34;

  // Condições
  doc.setTextColor(...soft);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("CONDIÇÕES COMERCIAIS", M, y); y += 18;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(72, 72, 84);
  doc.setFontSize(9.5);
  [
    `Validade da proposta: ${formatDate(validadeISO)}`,
    "Pagamento: 50% de sinal e 50% na entrega",
    "Prazo de produção: 15 a 25 dias úteis",
    "Garantia: 12 meses para tecidos e mecanismos",
  ].forEach((c) => { doc.text(`·   ${c}`, M, y); y += 16; });

  // Rodapé com contatos
  doc.setDrawColor(...gold);
  doc.setLineWidth(0.5);
  doc.line(M, h - M - 18, M + 50, h - M - 18);
  doc.setTextColor(...navy);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(`${empresa.nome} — Atelier`, M, h - M);
  if (contatos.length) {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...soft);
    doc.setFontSize(8.5);
    doc.text(contatos.join("   ·   "), M, h - M + 14);
  }

  doc.save(`Proposta-${proposal.cliente.replace(/\s+/g, "-")}.pdf`);
}

function block(doc: any, label: string, value: string, x: number, y: number, soft: number[], navy: number[]) {
  doc.setTextColor(soft[0], soft[1], soft[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(label, x, y);
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.setFontSize(14);
  doc.text(value, x, y + 20);
}
function rule(doc: any, y: number, M: number, w: number, gold: number[]) {
  doc.setDrawColor(gold[0], gold[1], gold[2]);
  doc.setLineWidth(0.4);
  doc.line(M, y, w - M, y);
}
