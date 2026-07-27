import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Download, Save, Building2, SlidersHorizontal, Home, Check } from "lucide-react";
import jsPDF from "jspdf";

import { PageHeader, Card, GoldButton, Modal, Field, NumberInput, selectCls, inputCls, formatDate } from "@/components/ui-kit";
import { useStore, store, useCalcCtx } from "@/lib/store";
import { calcularProposta, formatBRL, type Tecido, type ComercialInput, type PropostaResult } from "@/lib/pricing-engine";
import type { ComodoData } from "@/lib/mockData";
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

  const [comercial, setComercial] = useState<ComercialInput | undefined>(proposal?.comercial);
  useEffect(() => { setComercial(proposal?.comercial); }, [proposal?.id]);

  const comodos = proposal?.comodos ?? [];
  const res: PropostaResult | undefined = useMemo(
    () => (proposal && comodos.length ? calcularProposta(comodos, comercial ?? proposal.comercial, ctx) : undefined),
    [proposal, comodos, comercial, ctx]
  );

  const validadeISO = proposal ? addDaysISO(proposal.data, 15) : "";

  const setC = (patch: Partial<ComercialInput>) =>
    setComercial((c) => ({ ...(c ?? proposal!.comercial), ...patch }));

  const salvarAjustes = () => {
    if (!proposal || !res || !comercial) return;
    const novosComodos: ComodoData[] = proposal.comodos.map((c, i) => ({ ...c, result: res.comodos[i] }));
    store.upsertProposal({ ...proposal, comercial, comodos: novosComodos, valor: res.totalFinal });
    toast.success("Ajustes salvos na proposta");
  };

  // Popup de opções do PDF: escolher quais cômodos entram na proposta
  const [pdfOpen, setPdfOpen] = useState(false);
  const [sel, setSel] = useState<boolean[]>([]);

  const abrirPDF = () => {
    if (!proposal || !res || !comercial) return;
    setSel(comodos.map(() => true));
    setPdfOpen(true);
  };

  const gerarComSelecao = () => {
    if (!proposal || !comercial) return;
    const selecionados = comodos.filter((_, i) => sel[i]);
    if (!selecionados.length) { toast.error("Selecione ao menos um cômodo"); return; }
    const resSel = calcularProposta(selecionados, comercial, ctx);
    gerarPDF({ proposal, comodos: selecionados, res: resSel, comercial, empresa, validadeISO, tecidos, forros, blackouts });
    setPdfOpen(false);
    toast.success(`PDF gerado com ${selecionados.length} ${selecionados.length > 1 ? "cômodos" : "cômodo"}`);
  };

  return (
    <>
      <PageHeader
        eyebrow="Empresa · Documento comercial"
        title="Propostas"
        subtitle="Confira custos por cômodo, ajuste margem e desconto, e gere o PDF para o cliente."
        actions={
          proposal && res && (
            <div className="hidden sm:flex gap-2">
              <GoldButton variant="outline" onClick={salvarAjustes}><Save className="w-3.5 h-3.5" /> Salvar ajustes</GoldButton>
              <GoldButton onClick={abrirPDF}><Download className="w-3.5 h-3.5" /> Gerar PDF</GoldButton>
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
                className={`text-left px-3 py-3 rounded-md transition-colors shrink-0 lg:w-full min-w-[180px] ${selectedId === p.id ? "bg-white/[0.05]" : "hover:bg-white/[0.025]"}`}
              >
                <div className="text-[13px] font-medium truncate">{p.cliente}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{p.ambiente}</div>
                <div className="text-[12px] text-gold mt-1 stat">{formatBRL(p.valor)}</div>
              </button>
            ))}
            {proposals.length === 0 && <div className="text-[12px] text-muted-foreground">Nenhuma proposta ainda.</div>}
          </div>
        </div>

        {proposal && res && comercial ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <BreakdownEmpresa res={res} comodos={comodos} tecidos={tecidos} />
              <AjustesComercial comercial={comercial} setC={setC} res={res} onSalvar={salvarAjustes} onPDF={abrirPDF} />
            </div>

            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-3">Pré-visualização do PDF</div>
              <DocumentoPreview proposal={proposal} comodos={comodos} res={res} comercial={comercial} empresa={empresa} validadeISO={validadeISO} tecidos={tecidos} forros={forros} blackouts={blackouts} />
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

      {proposal && comercial && (
        <PdfModal
          open={pdfOpen}
          onClose={() => setPdfOpen(false)}
          comodos={comodos}
          sel={sel}
          setSel={setSel}
          comercial={comercial}
          ctx={ctx}
          onGerar={gerarComSelecao}
        />
      )}
    </>
  );
}

// =========================================================
// Popup: escolher quais cômodos entram no PDF
// =========================================================
function PdfModal({ open, onClose, comodos, sel, setSel, comercial, ctx, onGerar }: any) {
  const selecionados = comodos.filter((_: any, i: number) => sel[i]);
  const resSel = selecionados.length ? calcularProposta(selecionados, comercial, ctx) : null;
  const toggle = (i: number) => setSel((s: boolean[]) => s.map((v, idx) => (idx === i ? !v : v)));
  const todos = () => setSel(comodos.map(() => true));
  const nenhum = () => setSel(comodos.map(() => false));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Gerar PDF — selecione os cômodos"
      footer={
        <>
          <GoldButton variant="ghost" onClick={onClose}>Cancelar</GoldButton>
          <GoldButton onClick={onGerar}>
            <Download className="w-3.5 h-3.5" /> Gerar PDF ({selecionados.length})
          </GoldButton>
        </>
      }
    >
      <div className="flex items-center justify-between mb-3">
        <div className="text-[12px] text-muted-foreground">Simule cenários incluindo só os cômodos que quiser.</div>
        <div className="flex gap-2 text-[11px]">
          <button onClick={todos} className="text-muted-foreground hover:text-foreground transition-colors">Todos</button>
          <span className="text-muted-foreground/40">·</span>
          <button onClick={nenhum} className="text-muted-foreground hover:text-foreground transition-colors">Nenhum</button>
        </div>
      </div>

      <div className="space-y-1.5">
        {comodos.map((c: any, i: number) => {
          const on = sel[i];
          return (
            <button
              key={i}
              onClick={() => toggle(i)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors ${
                on ? "border-[oklch(0.80_0.10_88_/_0.35)] bg-[oklch(0.80_0.10_88_/_0.05)]" : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]"
              }`}
            >
              <span className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 ${on ? "bg-[var(--gold)] border-[var(--gold)]" : "border-white/20"}`}>
                {on && <Check className="w-3 h-3 text-[var(--navy-deep)]" />}
              </span>
              <span className="flex items-center gap-2 min-w-0 flex-1">
                <Home className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-[13px] truncate">{c.ambiente}</span>
              </span>
              <span className="text-[12px] stat text-muted-foreground shrink-0">{formatBRL(c.result.totalFinal)}</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-baseline justify-between mt-5 pt-4 border-t border-white/[0.05]">
        <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Total do cenário</span>
        <span className="text-[20px] font-medium stat text-gold">{resSel ? formatBRL(resSel.totalFinal) : "—"}</span>
      </div>
      {resSel && comercial.parcelas > 1 && (
        <div className="text-[11px] text-muted-foreground text-right mt-1">{comercial.parcelas}× de <span className="stat">{formatBRL(resSel.valorParcela)}</span></div>
      )}
    </Modal>
  );
}

// =========================================================
// Breakdown interno (custos por cômodo) — só a empresa vê
// =========================================================
function BreakdownEmpresa({ res, comodos, tecidos }: { res: PropostaResult; comodos: ComodoData[]; tecidos: Tecido[] }) {
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

      <div className="space-y-3">
        {comodos.map((c, i) => {
          const r = res.comodos[i];
          return (
            <div key={i} className="rounded-xl bg-white/[0.02] border border-white/[0.05] p-3.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Home className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-[12px] font-medium truncate">{c.ambiente}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full shrink-0 ${r.caso === "B" ? "text-gold bg-[oklch(0.80_0.10_88_/_0.08)]" : "text-[oklch(0.78_0.10_150)] bg-[oklch(0.55_0.12_150_/_0.10)]"}`}>
                    {r.caso === "B" ? `${r.nPanos} panos` : "em pé"}
                  </span>
                </div>
                <span className="text-[13px] stat text-gold shrink-0">{formatBRL(r.totalFinal)}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-2.5 text-[11px] text-muted-foreground">
                <Cell k="Tecido" v={`${r.mtsTecido.toFixed(2)} m`} />
                <Cell k={nome(tecidos, c.estrutura.tecidoCodigo).split(" ").slice(0, 2).join(" ")} v={formatBRL(r.custoTecido)} />
                <Cell k="Mão de obra" v={formatBRL(r.custoMaoObra)} />
                {r.sobraLateral > 0 && <Cell k="Sobra lateral" v={`${r.sobraLateral.toFixed(2)} m`} />}
                <Cell k="Produção" v={formatBRL(r.subtotalProducao)} />
                {r.custoInstalacao > 0 && <Cell k="Instalação" v={formatBRL(r.custoInstalacao)} />}
                {r.custoMotorizada > 0 && <Cell k="Motorizada" v={formatBRL(r.custoMotorizada)} />}
              </div>
            </div>
          );
        })}
      </div>

      <div className="hairline my-4" />
      <KV k="Subtotal produção" v={formatBRL(res.subtotalProducao)} muted />
      {res.descontoValor > 0 && <KV k="Desconto" v={`− ${formatBRL(res.descontoValor)}`} muted />}
      <div className="flex items-baseline justify-between mt-2">
        <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Total final</span>
        <span className="text-[18px] font-medium stat text-gold">{formatBRL(res.totalFinal)}</span>
      </div>
      <div className="text-[11px] text-muted-foreground mt-1 text-right">
        Margem bruta aprox.: {formatBRL(res.totalFinal - res.subtotalProducao)}
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
        <Field label={`Margem extra · ${comercial.margemExtra}%`} hint="Sobre o lucro base, em todos os cômodos">
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
            <NumberInput value={comercial.parcelas} onChange={(n) => setC({ parcelas: n })} min={1} max={18} integer />
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
        <GoldButton variant="outline" onClick={onSalvar} className="flex-1 justify-center"><Save className="w-3.5 h-3.5" /> Salvar</GoldButton>
        <GoldButton onClick={onPDF} className="flex-1 justify-center"><Download className="w-3.5 h-3.5" /> PDF</GoldButton>
      </div>
    </div>
  );
}

// =========================================================
// Pré-visualização do documento (espelha o PDF)
// =========================================================
function DocumentoPreview({ proposal, comodos, res, comercial, empresa, validadeISO, tecidos, forros, blackouts }: any) {
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
          <div className="text-foreground text-[13px]">{proposal.cliente}</div>
          {proposal.contato && <div>{proposal.contato}</div>}
          {proposal.endereco && <div>{proposal.endereco}</div>}
          <div className="pt-1">{comodos.length} {comodos.length > 1 ? "cômodos" : "cômodo"} · {formatDate(proposal.data)}</div>
        </div>
      </div>

      {/* Detalhe */}
      <div className="bg-[var(--champagne)] text-[var(--navy-deep)] px-8 sm:px-12 py-12">
        <div className="text-[10px] uppercase tracking-[0.18em] opacity-60 mb-2">Detalhamento</div>
        <div className="text-[20px] font-medium tracking-tight mb-8">{proposal.cliente}</div>

        <div className="space-y-4 mb-8">
          {comodos.map((c: ComodoData, i: number) => {
            const r = res.comodos[i];
            return (
              <div key={i} className="border-t border-[var(--navy-deep)]/10 pt-4">
                <div className="flex items-baseline justify-between gap-3 mb-2">
                  <div className="text-[14px] font-medium">{c.ambiente}</div>
                  <div className="text-[14px] stat">{formatBRL(r.totalFinal)}</div>
                </div>
                <dl className="grid grid-cols-[110px_1fr] sm:grid-cols-[130px_1fr] gap-y-1.5 gap-x-5 text-[12px]">
                  <Spec k="Modelo" v={c.estrutura.modelo} />
                  <Spec k="Tecido" v={nome(tecidos, c.estrutura.tecidoCodigo) + (c.estrutura.cor ? ` · ${c.estrutura.cor}` : "")} />
                  <Spec k="Forro" v={nome(forros, c.estrutura.forroCodigo, "Sem forro")} />
                  {c.estrutura.blackoutCodigo != null && (
                    <Spec k="Blackout" v={nome(blackouts, c.estrutura.blackoutCodigo)} />
                  )}
                  <Spec k="Trilho" v={r.trilhoInferido} />
                  <Spec k="Medidas" v={`${c.medidas.larguraParede} × ${c.medidas.alturaParede} m`} />
                  <Spec k="Instalação" v={c.instalacao.instalar ? `Inclusa · ${c.instalacao.dificuldade}` : "Não inclusa"} />
                </dl>
              </div>
            );
          })}
        </div>

        <div className="rounded-xl bg-[var(--navy-deep)] text-[var(--champagne)] px-6 py-5 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-gold">Investimento total</div>
            <div className="text-[12px] opacity-70 mt-1">
              {comercial.parcelas > 1 ? `${comercial.forma} · ${comercial.parcelas}× de ${formatBRL(res.valorParcela)}` : comercial.forma}
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
function Cell({ k, v }: { k: string; v: string }) {
  return (
    <div className="min-w-0">
      <div className="stat text-foreground text-[12px] truncate">{v}</div>
      <div className="truncate opacity-70">{k}</div>
    </div>
  );
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
// GERAÇÃO DO PDF — capa + cômodos + total combinado
// =========================================================
function gerarPDF({ proposal, comodos, res, comercial, empresa, validadeISO, tecidos, forros, blackouts }: any) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const M = 56;

  const navy: [number, number, number] = [20, 26, 48];
  const gold: [number, number, number] = [201, 168, 76];
  const cream: [number, number, number] = [250, 247, 240];
  const ink: [number, number, number] = [38, 40, 52];
  const soft: [number, number, number] = [120, 116, 104];

  const contatos = [empresa.telefone, empresa.instagram, empresa.email, empresa.site].filter(Boolean);

  // ============ CAPA ============
  doc.setFillColor(...navy); doc.rect(0, 0, w, h, "F");
  doc.setDrawColor(...gold); doc.setLineWidth(0.6);
  doc.rect(M - 18, M - 18, w - 2 * (M - 18), h - 2 * (M - 18));
  doc.setFillColor(...gold); doc.rect(M, M + 6, 34, 2, "F");
  doc.setTextColor(...gold); doc.setFont("helvetica", "bold"); doc.setFontSize(9);
  doc.text(empresa.nome.toUpperCase() + "  ·  ATELIER", M, M + 30);
  doc.setTextColor(238, 232, 217); doc.setFont("helvetica", "normal"); doc.setFontSize(46);
  doc.text("Proposta", M, h / 2 - 14);
  doc.text("Comercial", M, h / 2 + 34);
  doc.setDrawColor(...gold); doc.setLineWidth(0.5); doc.line(M, h / 2 + 62, M + 70, h / 2 + 62);
  doc.setTextColor(206, 200, 184); doc.setFont("helvetica", "bold"); doc.setFontSize(13);
  doc.text(proposal.cliente, M, h / 2 + 96);
  let cy = h / 2 + 114;
  doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(168, 162, 148);
  if (proposal.contato) { doc.text(proposal.contato, M, cy); cy += 16; }
  if (proposal.endereco) { doc.text(proposal.endereco, M, cy); cy += 16; }
  doc.text(`${comodos.length} ${comodos.length > 1 ? "cômodos" : "cômodo"}  ·  ${new Date(proposal.data).toLocaleDateString("pt-BR")}`, M, cy);
  doc.setTextColor(150, 144, 128); doc.setFontSize(8.5);
  doc.text(empresa.slogan || "Cortinas e persianas sob medida", M, h - M);
  if (contatos.length) { doc.setTextColor(...gold); doc.text(contatos.join("   ·   "), M, h - M + 16); }

  // ============ DETALHAMENTO ============
  const headerPagina = () => {
    doc.setFillColor(...cream); doc.rect(0, 0, w, h, "F");
    doc.setFillColor(...navy); doc.rect(M, M, 4, 34, "F");
    doc.setTextColor(...navy); doc.setFont("helvetica", "bold"); doc.setFontSize(8.5);
    doc.text(empresa.nome.toUpperCase(), M + 16, M + 13);
    doc.setFont("helvetica", "normal"); doc.setFontSize(15);
    doc.text("Detalhamento da proposta", M + 16, M + 32);
  };

  doc.addPage();
  headerPagina();
  let y = M + 70;

  // Cliente
  doc.setTextColor(...soft); doc.setFont("helvetica", "bold"); doc.setFontSize(8);
  doc.text("CLIENTE", M, y);
  doc.setTextColor(...navy); doc.setFontSize(14); doc.text(proposal.cliente, M, y + 18);
  y += 44;

  const ensure = (need: number) => {
    if (y + need > h - M - 40) { doc.addPage(); headerPagina(); y = M + 70; }
  };

  // Cômodos
  comodos.forEach((c: ComodoData, i: number) => {
    const r = res.comodos[i];
    ensure(c.estrutura.blackoutCodigo != null ? 153 : 132);

    doc.setDrawColor(...gold); doc.setLineWidth(0.4); doc.line(M, y, w - M, y); y += 20;
    // Título + valor
    doc.setTextColor(...navy); doc.setFont("helvetica", "bold"); doc.setFontSize(13);
    doc.text(`${i + 1}.  ${c.ambiente}`, M, y);
    doc.setFontSize(13); doc.text(formatBRL(r.totalFinal), w - M, y, { align: "right" });
    y += 20;

    const linhas: [string, string][] = [
      ["Modelo", c.estrutura.modelo],
      ["Tecido", nome(tecidos, c.estrutura.tecidoCodigo) + (c.estrutura.cor ? ` · ${c.estrutura.cor}` : "")],
      ["Forro", nome(forros, c.estrutura.forroCodigo, "Sem forro")],
      ...(c.estrutura.blackoutCodigo != null
        ? ([["Blackout", nome(blackouts, c.estrutura.blackoutCodigo)]] as [string, string][])
        : []),
      ["Trilho", r.trilhoInferido],
      ["Medidas da cortina", `${c.medidas.larguraParede} × ${c.medidas.alturaParede} m`],
      ["Instalação", c.instalacao.instalar ? `Inclusa · ${c.instalacao.dificuldade}` : "Não inclusa"],
    ];
    doc.setFontSize(10);
    linhas.forEach(([k, v], idx) => {
      if (idx % 2 === 1) { doc.setFillColor(243, 238, 228); doc.rect(M - 8, y - 10, w - 2 * M + 16, 20, "F"); }
      doc.setFont("helvetica", "normal"); doc.setTextColor(...soft); doc.text(k, M, y + 4);
      doc.setFont("helvetica", "bold"); doc.setTextColor(...ink); doc.text(String(v), M + 170, y + 4);
      y += 21;
    });
    y += 10;
  });

  // Total combinado
  ensure(150);
  const boxH = 96;
  doc.setFillColor(...navy); doc.roundedRect(M, y, w - 2 * M, boxH, 10, 10, "F");
  doc.setFillColor(...gold); doc.roundedRect(M, y, 3, boxH, 2, 2, "F");
  doc.setTextColor(...gold); doc.setFont("helvetica", "bold"); doc.setFontSize(8.5);
  doc.text("INVESTIMENTO TOTAL", M + 22, y + 26);
  doc.setTextColor(245, 239, 222); doc.setFont("helvetica", "normal"); doc.setFontSize(28);
  doc.text(formatBRL(res.totalFinal), M + 22, y + 60);
  doc.setTextColor(176, 168, 146); doc.setFontSize(9.5);
  doc.text(
    comercial.parcelas > 1 ? `${comercial.forma}  ·  ${comercial.parcelas}× de ${formatBRL(res.valorParcela)}` : comercial.forma,
    M + 22, y + 82
  );
  y += boxH + 30;

  // Condições
  ensure(110);
  doc.setTextColor(...soft); doc.setFont("helvetica", "bold"); doc.setFontSize(8.5);
  doc.text("CONDIÇÕES COMERCIAIS", M, y); y += 18;
  doc.setFont("helvetica", "normal"); doc.setTextColor(72, 72, 84); doc.setFontSize(9.5);
  [
    `Validade da proposta: ${formatDate(validadeISO)}`,
    "Pagamento: 50% de sinal e 50% na entrega",
    "Prazo de produção: 15 a 25 dias úteis",
    "Garantia: 12 meses para tecidos e mecanismos",
  ].forEach((c) => { doc.text(`·   ${c}`, M, y); y += 16; });

  // Rodapé
  doc.setDrawColor(...gold); doc.setLineWidth(0.5); doc.line(M, h - M - 18, M + 50, h - M - 18);
  doc.setTextColor(...navy); doc.setFont("helvetica", "bold"); doc.setFontSize(9);
  doc.text(`${empresa.nome} — Atelier`, M, h - M);
  if (contatos.length) {
    doc.setFont("helvetica", "normal"); doc.setTextColor(...soft); doc.setFontSize(8.5);
    doc.text(contatos.join("   ·   "), M, h - M + 14);
  }

  doc.save(`Proposta-${proposal.cliente.replace(/\s+/g, "-")}.pdf`);
}
