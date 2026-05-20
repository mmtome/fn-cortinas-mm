import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Save, ArrowRight, ArrowLeft, Check, Ruler, User2, Layers, Wrench, Wallet, AlertTriangle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeader, GoldButton, Field, inputCls } from "@/components/ui-kit";
import {
  calcular,
  defaultPricingInput,
  formatBRL,
  CATALOGO_TECIDOS,
  CATALOGO_FORROS,
  type PricingInput,
} from "@/lib/pricing-engine";
import { useStore, store } from "@/lib/store";
import { metrosDisponiveis } from "@/lib/mockData";
import { toast } from "sonner";

export const Route = createFileRoute("/calculadora")({ component: Calculadora });

const STEPS = [
  { key: "cliente",   label: "Cliente",    icon: User2 },
  { key: "medidas",   label: "Medidas",    icon: Ruler },
  { key: "estrutura", label: "Estrutura",  icon: Layers },
  { key: "instalacao",label: "Instalação", icon: Wrench },
  { key: "comercial", label: "Comercial",  icon: Wallet },
] as const;

const AMBIENTES = ["Sala", "Sala de Jantar", "Suíte Master", "Quarto", "Home Office", "Cozinha", "Sacada", "Showroom"];
const MODELOS = ["Wave", "Prega macho", "Prega americana", "Persiana"] as const;
const PERFIS = ["Varão suíço", "Trilho simples", "Trilho duplo"] as const;
const TIPOS_PERFIL = ["Simples 1 p/ metro", "Duplo 1 p/ metro", "1 para 1", "1 para 2"] as const;
const FORMAS = ["Pix", "Cartão Débito", "Cartão Crédito 1x", "Cartão Crédito Parcelado", "Dinheiro"] as const;

function Calculadora() {
  const navigate = useNavigate();
  const stock = useStore((s) => s.stock);
  const [step, setStep] = useState(0);
  const [input, setInput] = useState<PricingInput>(defaultPricingInput());

  const result = useMemo(() => calcular(input), [input]);

  // Estoque influencia: verifica disponibilidade do tecido selecionado
  const estoqueTecido = metrosDisponiveis(stock, input.estrutura.tecidoCodigo);
  const estoqueForro = metrosDisponiveis(stock, input.estrutura.forroCodigo ?? undefined);
  const alertaTecido = estoqueTecido !== null && estoqueTecido < result.mtsCortina;
  const alertaForro = estoqueForro !== null && input.estrutura.forroCodigo != null && estoqueForro < result.mtsForro;

  const set = <K extends keyof PricingInput>(k: K, v: Partial<PricingInput[K]>) =>
    setInput((s) => ({ ...s, [k]: { ...s[k], ...v } as PricingInput[K] }));

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  const salvar = (status: "Rascunho" | "Enviado") => {
    if (!input.ambiente.cliente.trim()) {
      toast.error("Informe o nome do cliente");
      setStep(0);
      return;
    }
    const id = "p" + Math.random().toString(36).slice(2, 9);
    store.upsertProposal({
      id,
      cliente: input.ambiente.cliente,
      ambiente: input.ambiente.ambiente,
      valor: result.totalFinal,
      status,
      data: new Date().toISOString().slice(0, 10),
      input,
      result,
    });
    toast.success(status === "Enviado" ? "Proposta finalizada" : "Rascunho salvo");
    navigate({ to: "/registros" });
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow="Configurador"
        title="Nova precificação"
        subtitle="Conduza o orçamento em etapas. O total é recalculado a cada ajuste."
      />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-10">
        {/* COLUNA PRINCIPAL — STEPPER */}
        <div>
          <Stepper step={step} onPick={setStep} />

          <div className="surface rounded-2xl p-8 mt-6 min-h-[420px]">
            {step === 0 && <StepCliente input={input} set={set} />}
            {step === 1 && <StepMedidas input={input} set={set} />}
            {step === 2 && <StepEstrutura input={input} set={set} alertaTecido={alertaTecido} alertaForro={alertaForro} estoqueTecido={estoqueTecido} estoqueForro={estoqueForro} />}
            {step === 3 && <StepInstalacao input={input} set={set} />}
            {step === 4 && <StepComercial input={input} set={set} result={result} />}

            <div className="flex items-center justify-between mt-10 pt-6 border-t border-white/[0.05]">
              <GoldButton variant="ghost" onClick={prev} className={step === 0 ? "invisible" : ""}>
                <ArrowLeft className="w-3.5 h-3.5" /> Voltar
              </GoldButton>
              <div className="flex gap-2">
                <GoldButton variant="outline" onClick={() => salvar("Rascunho")}>
                  <Save className="w-3.5 h-3.5" /> Salvar rascunho
                </GoldButton>
                {step < STEPS.length - 1 ? (
                  <GoldButton onClick={next}>
                    Avançar <ArrowRight className="w-3.5 h-3.5" />
                  </GoldButton>
                ) : (
                  <GoldButton onClick={() => salvar("Enviado")}>
                    Finalizar proposta <Check className="w-3.5 h-3.5" />
                  </GoldButton>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RESUMO EM TEMPO REAL */}
        <ResumoLateral input={input} result={result} alerta={alertaTecido || alertaForro} />
      </div>
    </AppShell>
  );
}

// =========================================================
// STEPPER
// =========================================================
function Stepper({ step, onPick }: { step: number; onPick: (i: number) => void }) {
  return (
    <div className="flex items-center justify-between">
      {STEPS.map((s, i) => {
        const active = i === step;
        const done = i < step;
        const Icon = s.icon;
        return (
          <button
            key={s.key}
            onClick={() => onPick(i)}
            className="flex-1 flex items-center gap-3 group"
          >
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full text-[11px] border transition-colors ${
                active
                  ? "border-[var(--gold)] text-gold bg-[oklch(0.80_0.10_88_/_0.06)]"
                  : done
                  ? "border-white/[0.12] text-foreground bg-white/[0.04]"
                  : "border-white/[0.08] text-muted-foreground"
              }`}
            >
              {done ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
            </div>
            <div className="hidden md:block text-left">
              <div className={`text-[11px] uppercase tracking-[0.14em] ${active ? "text-foreground" : "text-muted-foreground"}`}>
                Etapa {i + 1}
              </div>
              <div className={`text-[13px] ${active ? "text-foreground" : "text-muted-foreground"}`}>{s.label}</div>
            </div>
            {i < STEPS.length - 1 && <div className="flex-1 h-px bg-white/[0.05] mx-3" />}
          </button>
        );
      })}
    </div>
  );
}

// =========================================================
// STEP 1 — Cliente e Ambiente
// =========================================================
function StepCliente({ input, set }: any) {
  return (
    <div>
      <StepTitle eyebrow="Etapa 1 · Cliente" title="Para quem é este orçamento?" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-8">
        <Field label="Nome do cliente">
          <input
            className={inputCls}
            value={input.ambiente.cliente}
            onChange={(e) => set("ambiente", { cliente: e.target.value })}
            placeholder="Ex: Marina Albuquerque"
          />
        </Field>
        <Field label="Ambiente">
          <select
            className={inputCls}
            value={input.ambiente.ambiente}
            onChange={(e) => set("ambiente", { ambiente: e.target.value })}
          >
            {AMBIENTES.map((a) => <option key={a}>{a}</option>)}
          </select>
        </Field>
        <div className="md:col-span-2">
          <Field label="Observações">
            <textarea
              rows={3}
              className={inputCls}
              value={input.ambiente.observacoes ?? ""}
              onChange={(e) => set("ambiente", { observacoes: e.target.value })}
              placeholder="Detalhes do ambiente, preferências do cliente..."
            />
          </Field>
        </div>
      </div>
    </div>
  );
}

// =========================================================
// STEP 2 — Medidas
// =========================================================
function StepMedidas({ input, set }: any) {
  const m = input.medidas;
  return (
    <div>
      <StepTitle eyebrow="Etapa 2 · Medidas" title="Tome as medidas do ambiente" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
        <div className="grid grid-cols-2 gap-4">
          <NumField label="Largura parede" v={m.larguraParede} set={(v) => set("medidas", { larguraParede: v })} suf="m" />
          <NumField label="Altura parede" v={m.alturaParede} set={(v) => set("medidas", { alturaParede: v })} suf="m" />
          <NumField label="Largura janela" v={m.larguraJanela} set={(v) => set("medidas", { larguraJanela: v })} suf="m" />
          <NumField label="Altura janela" v={m.alturaJanela} set={(v) => set("medidas", { alturaJanela: v })} suf="m" />
        </div>
        {/* Preview técnico */}
        <div className="surface-flat rounded-xl p-6 flex items-center justify-center">
          <PreviewJanela {...m} />
        </div>
      </div>
      {m.alturaJanela > 4.5 && (
        <div className="mt-6 flex items-center gap-2 text-[12px] text-gold">
          <AlertTriangle className="w-3.5 h-3.5" /> Altura acima de 4,5m — andaime será incluído automaticamente.
        </div>
      )}
    </div>
  );
}

function PreviewJanela({ larguraParede, alturaParede, larguraJanela, alturaJanela }: any) {
  const scaleW = 220 / Math.max(larguraParede, 0.1);
  const scaleH = 160 / Math.max(alturaParede, 0.1);
  const scale = Math.min(scaleW, scaleH);
  const pW = larguraParede * scale;
  const pH = alturaParede * scale;
  const jW = Math.min(larguraJanela, larguraParede) * scale;
  const jH = Math.min(alturaJanela, alturaParede) * scale;
  return (
    <svg width={pW + 60} height={pH + 60} className="overflow-visible">
      {/* parede */}
      <rect x={30} y={30} width={pW} height={pH} fill="none" stroke="oklch(1 0 0 / 0.12)" strokeWidth={1} />
      {/* janela centrada */}
      <rect x={30 + (pW - jW) / 2} y={30 + (pH - jH)} width={jW} height={jH} fill="oklch(0.80 0.10 88 / 0.05)" stroke="oklch(0.80 0.10 88 / 0.5)" strokeWidth={1} />
      {/* cotas */}
      <text x={30 + pW / 2} y={20} fontSize={10} fill="oklch(0.62 0.012 260)" textAnchor="middle">{larguraParede}m</text>
      <text x={20} y={30 + pH / 2} fontSize={10} fill="oklch(0.62 0.012 260)" textAnchor="middle" transform={`rotate(-90 20 ${30 + pH / 2})`}>{alturaParede}m</text>
      <text x={30 + pW / 2} y={30 + pH + 18} fontSize={10} fill="var(--gold)" textAnchor="middle">{larguraJanela} × {alturaJanela}m</text>
    </svg>
  );
}

// =========================================================
// STEP 3 — Estrutura
// =========================================================
function StepEstrutura({ input, set, alertaTecido, alertaForro, estoqueTecido, estoqueForro }: any) {
  const e = input.estrutura;
  return (
    <div>
      <StepTitle eyebrow="Etapa 3 · Estrutura" title="Defina cortina, tecido e perfil" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-8">
        <Field label="Modelo">
          <select className={inputCls} value={e.modelo} onChange={(ev) => set("estrutura", { modelo: ev.target.value })}>
            {MODELOS.map((m) => <option key={m}>{m}</option>)}
          </select>
        </Field>
        <Field label="Folhas">
          <input type="number" min={1} className={inputCls} value={e.folhas} onChange={(ev) => set("estrutura", { folhas: +ev.target.value })} />
        </Field>

        <Field label="Tecido" hint={alertaTecido ? `Estoque insuficiente · ${estoqueTecido}m disponíveis` : estoqueTecido != null ? `${estoqueTecido}m em estoque` : undefined}>
          <select
            className={`${inputCls} ${alertaTecido ? "border-[oklch(0.72_0.14_25_/_0.4)]" : ""}`}
            value={e.tecidoCodigo}
            onChange={(ev) => set("estrutura", { tecidoCodigo: +ev.target.value })}
          >
            {CATALOGO_TECIDOS.map((t) => <option key={t.codigo} value={t.codigo}>{t.nome}</option>)}
          </select>
        </Field>

        <Field label="Forro" hint={e.forroCodigo == null ? "Sem forro" : alertaForro ? `Estoque insuficiente · ${estoqueForro}m` : estoqueForro != null ? `${estoqueForro}m em estoque` : undefined}>
          <select
            className={`${inputCls} ${alertaForro ? "border-[oklch(0.72_0.14_25_/_0.4)]" : ""}`}
            value={e.forroCodigo ?? "none"}
            onChange={(ev) => set("estrutura", { forroCodigo: ev.target.value === "none" ? null : +ev.target.value })}
          >
            <option value="none">Sem forro</option>
            {CATALOGO_FORROS.map((t) => <option key={t.codigo} value={t.codigo}>{t.nome}</option>)}
          </select>
        </Field>

        <Field label="Perfil">
          <select className={inputCls} value={e.perfil} onChange={(ev) => set("estrutura", { perfil: ev.target.value })}>
            {PERFIS.map((p) => <option key={p}>{p}</option>)}
          </select>
        </Field>
        <Field label="Tipo de perfil">
          <select className={inputCls} value={e.tipoPerfil} onChange={(ev) => set("estrutura", { tipoPerfil: ev.target.value })}>
            {TIPOS_PERFIL.map((p) => <option key={p}>{p}</option>)}
          </select>
        </Field>

        <Toggle
          label="Costura × Forro"
          hint="Forro costurado junto à cortina"
          v={e.costuraXForro}
          set={(v) => set("estrutura", { costuraXForro: v })}
        />
        <Toggle
          label="Motorizada"
          hint="Acionamento elétrico"
          v={e.motorizada}
          set={(v) => set("estrutura", { motorizada: v })}
        />

        <Toggle
          label="Comando"
          hint="Cordão para abertura (cortinas > 4m)"
          v={e.comando}
          set={(v) => set("estrutura", { comando: v })}
        />
        {e.comando && (
          <NumField label="Valor do comando (R$)" v={e.comandoValor ?? 0} set={(v) => set("estrutura", { comandoValor: v })} />
        )}
      </div>
    </div>
  );
}

// =========================================================
// STEP 4 — Instalação
// =========================================================
function StepInstalacao({ input, set }: any) {
  const i = input.instalacao;
  return (
    <div>
      <StepTitle eyebrow="Etapa 4 · Instalação" title="Logística e execução" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-8">
        <Toggle label="Instalação" hint="Inclui colocação no local" v={i.instalar} set={(v) => set("instalacao", { instalar: v })} />
        <Field label="Dificuldade">
          <select className={inputCls} value={i.dificuldade} onChange={(e) => set("instalacao", { dificuldade: e.target.value })}>
            <option>Padrão</option>
            <option>Difícil</option>
          </select>
        </Field>
        <NumField label="Deslocamento (R$)" v={i.deslocamento} set={(v) => set("instalacao", { deslocamento: v })} />
      </div>
    </div>
  );
}

// =========================================================
// STEP 5 — Comercial
// =========================================================
function StepComercial({ input, set, result }: any) {
  const c = input.comercial;
  return (
    <div>
      <StepTitle eyebrow="Etapa 5 · Comercial" title="Condições de pagamento" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-8">
        <Field label="Forma de pagamento">
          <select className={inputCls} value={c.forma} onChange={(e) => set("comercial", { forma: e.target.value })}>
            {FORMAS.map((f) => <option key={f}>{f}</option>)}
          </select>
        </Field>
        <Field label="Parcelas">
          <input type="number" min={1} max={18} className={inputCls} value={c.parcelas} onChange={(e) => set("comercial", { parcelas: +e.target.value })} />
        </Field>
        <Field label={`Margem extra · ${c.margemExtra}%`} hint="Adicional sobre o lucro base de 30%">
          <input type="range" min={0} max={30} step={1} className="w-full accent-[var(--gold)]" value={c.margemExtra} onChange={(e) => set("comercial", { margemExtra: +e.target.value })} />
        </Field>
        <Field label={`Desconto · ${c.desconto}%`}>
          <input type="range" min={0} max={20} step={1} className="w-full accent-[var(--gold)]" value={c.desconto} onChange={(e) => set("comercial", { desconto: +e.target.value })} />
        </Field>
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-3">
        <SummaryStat label="Total à vista" value={formatBRL(result.totalFinal)} />
        <SummaryStat label={c.parcelas > 1 ? `${c.parcelas}× de` : "Pagamento"} value={formatBRL(result.valorParcela)} />
        <SummaryStat label="Total no pagamento" value={formatBRL(result.totalPagamento)} accent />
      </div>
    </div>
  );
}

// =========================================================
// RESUMO LATERAL
// =========================================================
function ResumoLateral({ input, result, alerta }: any) {
  return (
    <div className="xl:sticky xl:top-6 self-start space-y-3">
      <div className="surface rounded-2xl p-6">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Resumo</div>
        <div className="text-[14px] mt-2">{input.ambiente.cliente || "Novo cliente"}</div>
        <div className="text-[12px] text-muted-foreground">{input.ambiente.ambiente}</div>

        <div className="hairline my-5" />

        <SectionTitle>Necessidade técnica</SectionTitle>
        <Row k="Tecido cortina" v={`${result.mtsCortina.toFixed(2)} m`} />
        <Row k="Alturas (cortina)" v={`${result.qntdAlturasCortina}`} />
        {result.mtsForro > 0 && <Row k="Tecido forro" v={`${result.mtsForro.toFixed(2)} m`} />}

        <div className="hairline my-5" />

        <SectionTitle>Composição</SectionTitle>
        <Row k="Tecido" v={formatBRL(result.custoTecido)} muted />
        {result.custoForro > 0 && <Row k="Forro" v={formatBRL(result.custoForro)} muted />}
        <Row k="Mão de obra" v={formatBRL(result.custoMaoObra)} muted />
        <Row k="Trilho / varão" v={formatBRL(result.custoTrilho)} muted />
        {result.custoCordao > 0 && <Row k="Cordão Wave" v={formatBRL(result.custoCordao)} muted />}
        <Row k="Rodízio" v={formatBRL(result.custoRodizio)} muted />
        {result.custoEntretela > 0 && <Row k="Entretela" v={formatBRL(result.custoEntretela)} muted />}
        {result.custoInstalacao > 0 && <Row k="Instalação" v={formatBRL(result.custoInstalacao)} muted />}

        <div className="hairline my-5" />

        <div className="flex items-baseline justify-between">
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Total</div>
          <div className="text-[20px] font-medium tracking-tight stat">{formatBRL(result.totalFinal)}</div>
        </div>
        {input.comercial.parcelas > 1 && (
          <div className="text-[11px] text-muted-foreground mt-1 text-right">
            {input.comercial.parcelas}× de <span className="stat text-gold">{formatBRL(result.valorParcela)}</span>
          </div>
        )}
      </div>

      {alerta && (
        <div className="rounded-2xl border border-[oklch(0.72_0.14_25_/_0.25)] bg-[oklch(0.5_0.16_25_/_0.05)] p-4 flex gap-3">
          <AlertTriangle className="w-4 h-4 text-[oklch(0.78_0.14_25)] shrink-0 mt-0.5" />
          <div className="text-[12px] text-[oklch(0.85_0.06_25)] leading-relaxed">
            Estoque insuficiente para o material selecionado. Verifique antes de fechar.
          </div>
        </div>
      )}
    </div>
  );
}

// =========================================================
// Helpers visuais
// =========================================================
function StepTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{eyebrow}</div>
      <div className="text-[20px] font-medium tracking-tight mt-2">{title}</div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2.5">{children}</div>;
}

function Row({ k, v, muted }: { k: string; v: string; muted?: boolean }) {
  return (
    <div className={`flex justify-between text-[12px] py-1 ${muted ? "text-muted-foreground" : ""}`}>
      <span>{k}</span>
      <span className="stat text-foreground">{v}</span>
    </div>
  );
}

function NumField({ label, v, set, suf }: { label: string; v: number; set: (n: number) => void; suf?: string }) {
  return (
    <Field label={label}>
      <div className="relative">
        <input type="number" step="0.01" className={inputCls} value={v} onChange={(e) => set(+e.target.value)} />
        {suf && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground">{suf}</span>}
      </div>
    </Field>
  );
}

function Toggle({ label, hint, v, set }: { label: string; hint?: string; v: boolean; set: (b: boolean) => void }) {
  return (
    <Field label={label} hint={hint}>
      <button
        type="button"
        onClick={() => set(!v)}
        className={`w-full text-left px-3 py-2.5 rounded-md border text-[13px] transition-colors ${
          v
            ? "border-[oklch(0.80_0.10_88_/_0.35)] bg-[oklch(0.80_0.10_88_/_0.05)] text-gold"
            : "border-white/[0.06] bg-white/[0.03] text-muted-foreground hover:text-foreground"
        }`}
      >
        {v ? "Sim" : "Não"}
      </button>
    </Field>
  );
}

function SummaryStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl p-4 border ${accent ? "border-[oklch(0.80_0.10_88_/_0.3)] bg-[oklch(0.80_0.10_88_/_0.04)]" : "border-white/[0.06] bg-white/[0.02]"}`}>
      <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
      <div className={`text-[18px] font-medium mt-2 stat ${accent ? "text-gold" : ""}`}>{value}</div>
    </div>
  );
}
