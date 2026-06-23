import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Save, ArrowRight, ArrowLeft, Check, Ruler, User2, Layers, Wrench, Wallet, AlertTriangle, Minus, Plus } from "lucide-react";

import { PageHeader, GoldButton, Field, Switch, inputCls, selectCls } from "@/components/ui-kit";
import {
  calcular,
  defaultPricingInput,
  formatBRL,
  type PricingInput,
} from "@/lib/pricing-engine";
import { useStore, store, useCalcCtx } from "@/lib/store";
import { metrosDisponiveis } from "@/lib/mockData";
import { toast } from "sonner";

export const Route = createFileRoute("/calculadora")({ component: Calculadora });

const STEPS = [
  { key: "cliente",    label: "Cliente",    icon: User2 },
  { key: "medidas",    label: "Medidas",    icon: Ruler },
  { key: "estrutura",  label: "Estrutura",  icon: Layers },
  { key: "instalacao", label: "Instalação", icon: Wrench },
  { key: "fechamento", label: "Fechamento", icon: Wallet },
] as const;

const AMBIENTES = [
  "Sala de Estar", "Sala de Jantar", "Suíte Master", "Suíte de Hóspedes", "Closet",
  "Home Theater", "Home Office", "Biblioteca", "Lavabo", "Cozinha Gourmet",
  "Varanda Gourmet", "Sacada Panorâmica", "Hall de Entrada", "Showroom",
];
const MODELOS = ["Wave", "Prega macho", "Prega americana", "Persiana"] as const;
const FORMAS = ["Pix", "Cartão Débito", "Cartão Crédito 1x", "Cartão Crédito Parcelado", "Dinheiro"] as const;

function Calculadora() {
  const navigate = useNavigate();
  const stock = useStore((s) => s.stock);
  const tecidos = useStore((s) => s.tecidos);
  const forros = useStore((s) => s.forros);
  const blackouts = useStore((s) => s.blackouts);
  const ctx = useCalcCtx();

  const [step, setStep] = useState(0);
  const [input, setInput] = useState<PricingInput>(defaultPricingInput());

  const result = useMemo(() => calcular(input, ctx), [input, ctx]);

  const estoqueTecido = metrosDisponiveis(stock, input.estrutura.tecidoCodigo);
  const estoqueForro = metrosDisponiveis(stock, input.estrutura.forroCodigo ?? undefined);
  const alertaTecido = estoqueTecido !== null && estoqueTecido < result.mtsTecido;
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

  const isLast = step === STEPS.length - 1;

  return (
    <>
      <PageHeader
        eyebrow="Atendimento"
        title="Nova precificação"
        subtitle="Conduza a visita em cinco passos simples. O preço é calculado em tempo real."
      />

      {/* Total fixo no mobile — o cliente vê o preço acompanhar as escolhas */}
      <div className="xl:hidden sticky top-[57px] z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2.5 mb-5 bg-[var(--background)]/90 backdrop-blur-md border-y border-white/[0.05] flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Total estimado</div>
        <div className="flex items-baseline gap-2">
          <span key={result.totalFinal} className="text-[18px] font-medium stat animate-value">{formatBRL(result.totalFinal)}</span>
          {input.comercial.parcelas > 1 && (
            <span className="text-[11px] text-muted-foreground">{input.comercial.parcelas}× {formatBRL(result.valorParcela)}</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-8">
        <div>
          <Stepper step={step} onPick={setStep} />

          <div className="surface rounded-2xl p-5 sm:p-8 mt-5 sm:mt-6">
            <div key={step} className="animate-fade-in">
              {step === 0 && <StepCliente input={input} set={set} />}
              {step === 1 && <StepMedidas input={input} set={set} result={result} />}
              {step === 2 && (
                <StepEstrutura
                  input={input} set={set}
                  tecidos={tecidos} forros={forros} blackouts={blackouts}
                  alertaTecido={alertaTecido} alertaForro={alertaForro}
                  estoqueTecido={estoqueTecido} estoqueForro={estoqueForro}
                />
              )}
              {step === 3 && <StepInstalacao input={input} set={set} result={result} />}
              {step === 4 && <StepFechamento input={input} set={set} result={result} />}
            </div>

            {/* Navegação */}
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-8 pt-6 border-t border-white/[0.05]">
              <GoldButton variant="ghost" onClick={prev} className={`${step === 0 ? "sm:invisible hidden sm:inline-flex" : ""} justify-center`}>
                <ArrowLeft className="w-3.5 h-3.5" /> Voltar
              </GoldButton>
              <div className="flex flex-col sm:flex-row gap-2">
                <GoldButton variant="outline" onClick={() => salvar("Rascunho")} className="justify-center">
                  <Save className="w-3.5 h-3.5" /> Salvar rascunho
                </GoldButton>
                {!isLast ? (
                  <GoldButton onClick={next} className="justify-center">
                    Avançar <ArrowRight className="w-3.5 h-3.5" />
                  </GoldButton>
                ) : (
                  <GoldButton onClick={() => salvar("Enviado")} className="justify-center">
                    Finalizar proposta <Check className="w-3.5 h-3.5" />
                  </GoldButton>
                )}
              </div>
            </div>
          </div>
        </div>

        <ResumoCliente input={input} result={result} alerta={alertaTecido || alertaForro} tecidos={tecidos} forros={forros} />
      </div>
    </>
  );
}

// =========================================================
// STEPPER — responsivo
// =========================================================
function Stepper({ step, onPick }: { step: number; onPick: (i: number) => void }) {
  const current = STEPS[step];
  const Icon = current.icon;
  return (
    <div>
      {/* Mobile: progresso compacto */}
      <div className="md:hidden">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-full border border-[var(--gold)] text-gold bg-[oklch(0.80_0.10_88_/_0.06)]">
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Etapa {step + 1} de {STEPS.length}</div>
            <div className="text-[15px] font-medium tracking-tight">{current.label}</div>
          </div>
        </div>
        <div className="flex gap-1.5">
          {STEPS.map((s, i) => (
            <button
              key={s.key}
              onClick={() => onPick(i)}
              aria-label={s.label}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i <= step ? "bg-[var(--gold)]" : "bg-white/[0.08]"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Desktop: stepper completo */}
      <div className="hidden md:flex items-center justify-between">
        {STEPS.map((s, i) => {
          const active = i === step;
          const done = i < step;
          const Ic = s.icon;
          return (
            <button key={s.key} onClick={() => onPick(i)} className="flex-1 flex items-center gap-3 group">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full text-[11px] border transition-colors ${
                  active
                    ? "border-[var(--gold)] text-gold bg-[oklch(0.80_0.10_88_/_0.06)]"
                    : done
                    ? "border-white/[0.12] text-foreground bg-white/[0.04]"
                    : "border-white/[0.08] text-muted-foreground"
                }`}
              >
                {done ? <Check className="w-3.5 h-3.5" /> : <Ic className="w-3.5 h-3.5" />}
              </div>
              <div className="text-left">
                <div className={`text-[10px] uppercase tracking-[0.16em] ${active ? "text-foreground" : "text-muted-foreground"}`}>
                  Etapa {i + 1}
                </div>
                <div className={`text-[12px] ${active ? "text-foreground" : "text-muted-foreground"}`}>{s.label}</div>
              </div>
              {i < STEPS.length - 1 && <div className="flex-1 h-px bg-white/[0.05] mx-3" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// =========================================================
// STEP 1 — Cliente e Ambiente
// =========================================================
function StepCliente({ input, set }: any) {
  const isPreset = AMBIENTES.includes(input.ambiente.ambiente);
  const isOther = !isPreset && input.ambiente.ambiente !== "";
  const [otherMode, setOtherMode] = useState(isOther);

  return (
    <div>
      <StepTitle eyebrow="Etapa 1 · Cliente" title="Para quem é este orçamento?" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-8">
        <Field label="Nome do cliente">
          <input className={inputCls} value={input.ambiente.cliente} onChange={(e) => set("ambiente", { cliente: e.target.value })} placeholder="Ex: Marina Albuquerque" />
        </Field>

        <Field label="Ambiente" hint="Selecione um ambiente ou descreva um personalizado.">
          {otherMode ? (
            <div className="flex gap-2">
              <input
                autoFocus
                className={inputCls}
                value={input.ambiente.ambiente}
                onChange={(e) => set("ambiente", { ambiente: e.target.value })}
                placeholder="Ex: Galeria de arte, Sala de música…"
              />
              <button
                type="button"
                onClick={() => { setOtherMode(false); set("ambiente", { ambiente: AMBIENTES[0] }); }}
                className="px-3 rounded-md border border-white/[0.06] text-[11px] text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-colors"
              >
                Lista
              </button>
            </div>
          ) : (
            <select
              className={selectCls}
              value={isPreset ? input.ambiente.ambiente : "__other"}
              onChange={(e) => {
                if (e.target.value === "__other") {
                  setOtherMode(true);
                  set("ambiente", { ambiente: "" });
                } else {
                  set("ambiente", { ambiente: e.target.value });
                }
              }}
            >
              {AMBIENTES.map((a) => <option key={a} value={a}>{a}</option>)}
              <option value="__other">Outro (personalizado)…</option>
            </select>
          )}
        </Field>

        <div className="md:col-span-2">
          <Field label="Observações">
            <textarea rows={3} className={inputCls} value={input.ambiente.observacoes ?? ""} onChange={(e) => set("ambiente", { observacoes: e.target.value })} placeholder="Detalhes do ambiente, preferências do cliente..." />
          </Field>
        </div>
      </div>
    </div>
  );
}

// =========================================================
// STEP 2 — Medidas (sem janela)
// =========================================================
function StepMedidas({ input, set, result }: any) {
  const m = input.medidas;
  return (
    <div>
      <StepTitle eyebrow="Etapa 2 · Medidas" title="Meça apenas a parede" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
        <div>
          <SubLabel>Parede <span className="normal-case tracking-normal text-gold/80">(dimensiona o orçamento)</span></SubLabel>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <NumField label="Largura" v={m.larguraParede} set={(v) => set("medidas", { larguraParede: v })} suf="m" />
            <NumField label="Altura" v={m.alturaParede} set={(v) => set("medidas", { alturaParede: v })} suf="m" />
          </div>

          {/* Cortina desejada — calculada automaticamente (largura arredondada) */}
          <div className="mt-6 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-3">Cortina desejada <span className="normal-case tracking-normal">· calculada</span></div>
            <div className="grid grid-cols-2 gap-2 text-center">
              <MiniInfo label="Largura (arredondada)" value={`${result.larguraCortina} m`} />
              <MiniInfo label="Altura" value={`${m.alturaParede.toFixed(2)} m`} />
            </div>
            <div className="text-[10px] text-muted-foreground mt-2.5 text-center">
              Largura arredondada para o inteiro de cima ({m.larguraParede.toFixed(2)} m → {result.larguraCortina} m).
            </div>
          </div>

          {/* Leitura do método de corte (Guia de Cálculo) */}
          <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Corte do tecido</span>
              <span className={`text-[11px] px-2 py-0.5 rounded-full ${result.caso === "B" ? "text-gold bg-[oklch(0.80_0.10_88_/_0.08)]" : "text-[oklch(0.78_0.10_150)] bg-[oklch(0.55_0.12_150_/_0.10)]"}`}>
                {result.caso === "B" ? "Virar o rolo" : "Rolo em pé"}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3 text-center">
              <MiniInfo label="Altura de corte" value={`${result.alturaCorte.toFixed(2)} m`} />
              <MiniInfo label="Tecido" value={`${result.mtsTecido.toFixed(2)} m`} />
              <MiniInfo label={result.caso === "B" ? "Panos" : "Largura franzida"} value={result.caso === "B" ? `${result.nPanos}` : `${result.larguraFranzida.toFixed(2)} m`} />
            </div>
          </div>
        </div>
        <div className="surface-flat rounded-xl p-6 flex items-center justify-center min-h-[220px]">
          <PreviewJanela larguraParede={m.larguraParede} alturaParede={m.alturaParede} larguraCortina={result.larguraCortina} alturaCortina={m.alturaParede} />
        </div>
      </div>
      {m.alturaParede > 4.5 && (
        <div className="mt-6 flex items-center gap-2 text-[12px] text-gold">
          <AlertTriangle className="w-3.5 h-3.5" /> Altura acima de 4,5m — andaime incluído automaticamente.
        </div>
      )}
    </div>
  );
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[var(--background)] py-2.5 px-1">
      <div className="text-[14px] font-medium stat">{value}</div>
      <div className="text-[9px] uppercase tracking-[0.1em] text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

function PreviewJanela({ larguraParede, alturaParede, larguraCortina, alturaCortina }: any) {
  const scaleW = 240 / Math.max(larguraParede, larguraCortina, 0.1);
  const scaleH = 170 / Math.max(alturaParede, alturaCortina, 0.1);
  const scale = Math.min(scaleW, scaleH);
  const pW = larguraParede * scale;
  const pH = alturaParede * scale;
  const cW = Math.min(larguraCortina, larguraParede) * scale;
  const cH = Math.min(alturaCortina, alturaParede) * scale;
  return (
    <svg width={pW + 60} height={pH + 60} className="overflow-visible max-w-full">
      <rect x={30} y={30} width={pW} height={pH} fill="none" stroke="oklch(1 0 0 / 0.10)" strokeWidth={1} />
      {/* cortina prevista */}
      <rect x={30 + (pW - cW) / 2} y={30 + (pH - cH)} width={cW} height={cH} fill="oklch(0.80 0.10 88 / 0.06)" stroke="oklch(0.80 0.10 88 / 0.5)" strokeWidth={1.2} />
      <text x={30 + pW / 2} y={20} fontSize={9} fill="oklch(0.62 0.012 260)" textAnchor="middle">parede {larguraParede}m</text>
      <text x={30 + pW / 2} y={30 + pH + 18} fontSize={9} fill="var(--gold)" textAnchor="middle">cortina {larguraCortina} × {alturaCortina}m</text>
    </svg>
  );
}

// =========================================================
// STEP 3 — Estrutura
// =========================================================
function StepEstrutura({ input, set, tecidos, forros, blackouts, alertaTecido, alertaForro, estoqueTecido, estoqueForro }: any) {
  const e = input.estrutura;
  return (
    <div>
      <StepTitle eyebrow="Etapa 3 · Estrutura" title="Defina cortina, tecidos e acabamentos" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-8">
        <Field label="Modelo">
          <select className={selectCls} value={e.modelo} onChange={(ev) => set("estrutura", { modelo: ev.target.value })}>
            {MODELOS.map((m) => <option key={m}>{m}</option>)}
          </select>
        </Field>
        <Field label="Motorizada" hint="Acionamento elétrico">
          <div className="h-[42px] flex items-center">
            <Switch checked={e.motorizada} onChange={(v) => set("estrutura", { motorizada: v })} label={e.motorizada ? "Sim" : "Não"} />
          </div>
        </Field>

        <Field label="Tecido principal" hint={alertaTecido ? `Estoque insuficiente · ${estoqueTecido}m disponíveis` : estoqueTecido != null ? `${estoqueTecido}m em estoque` : undefined}>
          <select className={`${selectCls} ${alertaTecido ? "border-[oklch(0.72_0.14_25_/_0.4)]" : ""}`} value={e.tecidoCodigo} onChange={(ev) => set("estrutura", { tecidoCodigo: +ev.target.value })}>
            {tecidos.map((t: any) => <option key={t.codigo} value={t.codigo}>{t.nome}</option>)}
          </select>
        </Field>

        <Field label="Forro" hint={e.forroCodigo == null ? "Sem forro" : alertaForro ? `Estoque insuficiente · ${estoqueForro}m` : estoqueForro != null ? `${estoqueForro}m em estoque` : undefined}>
          <select className={`${selectCls} ${alertaForro ? "border-[oklch(0.72_0.14_25_/_0.4)]" : ""}`} value={e.forroCodigo ?? "none"} onChange={(ev) => set("estrutura", { forroCodigo: ev.target.value === "none" ? null : +ev.target.value })}>
            <option value="none">Sem forro</option>
            {forros.map((t: any) => <option key={t.codigo} value={t.codigo}>{t.nome}</option>)}
          </select>
        </Field>

        <Field label="Blackout" hint={e.blackoutCodigo == null ? "Sem blackout" : "Trilho duplo inferido"}>
          <select className={selectCls} value={e.blackoutCodigo ?? "none"} onChange={(ev) => set("estrutura", { blackoutCodigo: ev.target.value === "none" ? null : +ev.target.value })}>
            <option value="none">Sem blackout</option>
            {blackouts.map((t: any) => <option key={t.codigo} value={t.codigo}>{t.nome}</option>)}
          </select>
        </Field>

        {e.forroCodigo != null && (
          <Field label="Forro costurado junto" hint="Quando ativo, o trilho permanece simples">
            <div className="h-[42px] flex items-center">
              <Switch checked={e.costuraXForro} onChange={(v) => set("estrutura", { costuraXForro: v })} label={e.costuraXForro ? "Sim" : "Não"} />
            </div>
          </Field>
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
      <StepTitle eyebrow="Etapa 4 · Instalação" title="Como será a instalação?" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-8">
        <Field label="Instalar no local" hint="Inclui colocação">
          <div className="h-[42px] flex items-center">
            <Switch checked={i.instalar} onChange={(v) => set("instalacao", { instalar: v })} label={i.instalar ? "Sim" : "Não"} />
          </div>
        </Field>
        <Field label="Dificuldade">
          <select className={selectCls} value={i.dificuldade} onChange={(e) => set("instalacao", { dificuldade: e.target.value })} disabled={!i.instalar}>
            <option>Padrão</option>
            <option>Difícil</option>
          </select>
        </Field>
        <NumField label="Deslocamento" v={i.deslocamento} set={(v) => set("instalacao", { deslocamento: v })} suf="R$" />
      </div>
    </div>
  );
}

// =========================================================
// STEP 5 — Fechamento (preço final ao cliente)
// =========================================================
function StepFechamento({ input, set, result }: any) {
  const c = input.comercial;
  return (
    <div>
      <StepTitle eyebrow="Etapa 5 · Fechamento" title="Condições e valor final" />

      <div className="mt-8 rounded-2xl border border-[oklch(0.80_0.10_88_/_0.25)] bg-[oklch(0.80_0.10_88_/_0.04)] p-6 sm:p-7">
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Investimento total</div>
        <div key={result.totalFinal} className="text-[34px] sm:text-[40px] font-medium tracking-tight stat animate-value mt-1">{formatBRL(result.totalFinal)}</div>
        {c.parcelas > 1 ? (
          <div className="text-[13px] text-muted-foreground mt-1">
            {c.forma} · {c.parcelas}× de <span className="text-gold stat">{formatBRL(result.valorParcela)}</span>
          </div>
        ) : (
          <div className="text-[13px] text-muted-foreground mt-1">{c.forma}</div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-7">
        <Field label="Forma de pagamento">
          <select className={selectCls} value={c.forma} onChange={(e) => set("comercial", { forma: e.target.value })}>
            {FORMAS.map((f) => <option key={f}>{f}</option>)}
          </select>
        </Field>
        <Field label="Parcelas">
          <input type="number" inputMode="numeric" min={1} max={18} className={inputCls} value={c.parcelas} onChange={(e) => set("comercial", { parcelas: Math.max(1, +e.target.value) })} />
        </Field>
        <div className="md:col-span-2">
          <Field label={`Desconto · ${c.desconto}%`} hint="Negociado com o cliente">
            <input type="range" min={0} max={20} step={1} className="w-full accent-[var(--gold)]" value={c.desconto} onChange={(e) => set("comercial", { desconto: +e.target.value })} />
          </Field>
        </div>
      </div>
    </div>
  );
}

// =========================================================
// RESUMO LATERAL — visão do cliente (sem custos/margem)
// =========================================================
function ResumoCliente({ input, result, alerta, tecidos, forros }: any) {
  const tecido = tecidos.find((t: any) => t.codigo === input.estrutura.tecidoCodigo);
  const forro = input.estrutura.forroCodigo != null ? forros.find((t: any) => t.codigo === input.estrutura.forroCodigo) : null;
  return (
    <div className="hidden xl:block xl:sticky xl:top-6 self-start space-y-3">
      <div className="surface rounded-2xl p-6">
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Resumo</div>
        <div className="text-[14px] mt-2 font-medium">{input.ambiente.cliente || "Novo cliente"}</div>
        <div className="text-[11px] text-muted-foreground">{input.ambiente.ambiente}</div>

        <div className="hairline my-5" />

        <SectionTitle>Especificação</SectionTitle>
        <Row k="Modelo" v={input.estrutura.modelo} />
        <Row k="Tecido" v={tecido?.nome ?? "—"} />
        <Row k="Forro" v={forro?.nome ?? "Sem forro"} />
        {input.estrutura.blackoutCodigo != null && <Row k="Blackout" v="Sim" />}
        <Row k="Trilho" v={result.trilhoInferido} />
        <Row k="Parede" v={`${input.medidas.larguraParede} × ${input.medidas.alturaParede} m`} />
        <Row k="Cortina" v={`${result.larguraCortina} × ${input.medidas.alturaParede} m`} />
        <Row k="Instalação" v={input.instalacao.instalar ? "Inclusa" : "Não inclusa"} />

        <div className="hairline my-5" />

        <div className="flex items-baseline justify-between">
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Total</div>
          <div key={result.totalFinal} className="text-[20px] font-medium tracking-tight stat animate-value">{formatBRL(result.totalFinal)}</div>
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
// Helpers
// =========================================================
function StepTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{eyebrow}</div>
      <div className="text-[17px] sm:text-[18px] font-medium tracking-tight mt-2">{title}</div>
    </div>
  );
}
function SubLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-3">{children}</div>;
}
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2.5">{children}</div>;
}
function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 text-[12px] py-1">
      <span className="text-muted-foreground shrink-0">{k}</span>
      <span className="stat text-foreground text-right truncate">{v}</span>
    </div>
  );
}

// Campo numérico com botões -/+ (ótimo para toque no mobile)
function NumField({ label, v, set, suf }: { label: string; v: number; set: (n: number) => void; suf?: string }) {
  const step = suf === "m" ? 0.1 : 10;
  const dec = (n: number) => Math.round(n * 100) / 100;
  return (
    <Field label={label}>
      <div className="flex items-stretch gap-1.5">
        <button
          type="button"
          onClick={() => set(dec(Math.max(0, v - step)))}
          className="w-10 shrink-0 rounded-md border border-white/[0.06] bg-white/[0.03] text-muted-foreground hover:text-foreground active:scale-95 transition flex items-center justify-center"
          aria-label="Diminuir"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <div className="relative flex-1">
          <input
            type="number"
            inputMode="decimal"
            step={step}
            className={`${inputCls} text-center ${suf ? "pr-7" : ""}`}
            value={v}
            onChange={(e) => set(+e.target.value)}
          />
          {suf && <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground pointer-events-none">{suf}</span>}
        </div>
        <button
          type="button"
          onClick={() => set(dec(v + step))}
          className="w-10 shrink-0 rounded-md border border-white/[0.06] bg-white/[0.03] text-muted-foreground hover:text-foreground active:scale-95 transition flex items-center justify-center"
          aria-label="Aumentar"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </Field>
  );
}
