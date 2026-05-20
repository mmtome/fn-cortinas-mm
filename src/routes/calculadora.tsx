import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Save, Sparkles, Ruler, Scissors, Settings2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeader, Card, GoldButton, Field, inputCls } from "@/components/ui-kit";
import { calcular, calcularOpcoes, formatBRL, type CalcInput } from "@/lib/pricing";
import { store } from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/calculadora")({ component: Calculadora });

const TECIDOS = ["Linho Belga", "Veludo Champagne", "Blackout Premium", "Voil Seda", "Algodão Premium"];
const TIPOS_CORTINA = ["Wave", "Romana", "Tradicional", "Drapeada", "Painel"];
const TIPOS_PERSIANA = ["Nenhuma", "Romana", "Rolô", "Solar Screen", "Bandô"];
const TRILHOS = ["Trilho Suíço", "Varão Dourado", "Trilho Motorizado", "Bandô Embutido"];

function Calculadora() {
  const navigate = useNavigate();
  const [cliente, setCliente] = useState("");
  const [ambiente, setAmbiente] = useState("Sala de Estar");
  const [input, setInput] = useState<CalcInput>({
    larguraParede: 4,
    alturaParede: 2.8,
    larguraJanela: 3,
    alturaJanela: 2.4,
    tecido: "Linho Belga",
    tipoCortina: "Wave",
    tipoPersiana: "Nenhuma",
    trilho: "Trilho Suíço",
    franzimento: 2,
    presilhas: 6,
    instalacao: true,
    deslocamento: 120,
    margem: 45,
    desconto: 0,
  });

  const result = useMemo(() => calcular(input), [input]);
  const opcoes = useMemo(() => calcularOpcoes(input), [input]);

  const set = <K extends keyof CalcInput>(k: K, v: CalcInput[K]) =>
    setInput((s) => ({ ...s, [k]: v }));

  const salvar = (status: "Rascunho" | "Enviado" = "Rascunho") => {
    if (!cliente.trim()) {
      toast.error("Informe o nome do cliente");
      return;
    }
    const id = "p" + Math.random().toString(36).slice(2, 9);
    store.upsertProposal({
      id,
      cliente,
      ambiente,
      valor: result.total,
      status,
      data: new Date().toISOString().slice(0, 10),
      config: { ...input, result },
    });
    toast.success("Precificação salva", { description: `Proposta de ${cliente} registrada.` });
    navigate({ to: "/registros" });
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow="Precificação"
        title="Calculadora"
        subtitle="Monte o orçamento em tempo real durante a visita. Cada variável se ajusta visualmente conforme o cliente observa."
        actions={
          <>
            <GoldButton variant="outline" onClick={() => salvar("Rascunho")}>
              <Save className="w-4 h-4" /> Salvar rascunho
            </GoldButton>
            <GoldButton onClick={() => salvar("Enviado")}>
              <Sparkles className="w-4 h-4" /> Finalizar proposta
            </GoldButton>
          </>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-6">
        {/* INPUTS */}
        <div className="space-y-6">
          {/* Cliente */}
          <Card>
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-md bg-[oklch(0.78_0.13_85_/_0.1)] flex items-center justify-center text-gold">
                <Sparkles className="w-4 h-4" />
              </div>
              <h3 className="font-serif text-xl">Cliente & Ambiente</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Nome do cliente">
                <input className={inputCls} value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Ex: Marina Albuquerque" />
              </Field>
              <Field label="Ambiente">
                <input className={inputCls} value={ambiente} onChange={(e) => setAmbiente(e.target.value)} />
              </Field>
            </div>
          </Card>

          {/* Medidas */}
          <Card>
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-md bg-[oklch(0.78_0.13_85_/_0.1)] flex items-center justify-center text-gold">
                <Ruler className="w-4 h-4" />
              </div>
              <h3 className="font-serif text-xl">Medidas</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Field label="Largura parede (m)">
                <input type="number" step="0.1" className={inputCls} value={input.larguraParede} onChange={(e) => set("larguraParede", +e.target.value)} />
              </Field>
              <Field label="Altura parede (m)">
                <input type="number" step="0.1" className={inputCls} value={input.alturaParede} onChange={(e) => set("alturaParede", +e.target.value)} />
              </Field>
              <Field label="Largura janela (m)">
                <input type="number" step="0.1" className={inputCls} value={input.larguraJanela} onChange={(e) => set("larguraJanela", +e.target.value)} />
              </Field>
              <Field label="Altura janela (m)">
                <input type="number" step="0.1" className={inputCls} value={input.alturaJanela} onChange={(e) => set("alturaJanela", +e.target.value)} />
              </Field>
            </div>
          </Card>

          {/* Material */}
          <Card>
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-md bg-[oklch(0.78_0.13_85_/_0.1)] flex items-center justify-center text-gold">
                <Scissors className="w-4 h-4" />
              </div>
              <h3 className="font-serif text-xl">Tecido & Estrutura</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Tecido">
                <select className={inputCls} value={input.tecido} onChange={(e) => set("tecido", e.target.value)}>
                  {TECIDOS.map((t) => <option key={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Tipo de cortina">
                <select className={inputCls} value={input.tipoCortina} onChange={(e) => set("tipoCortina", e.target.value)}>
                  {TIPOS_CORTINA.map((t) => <option key={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Tipo de persiana">
                <select className={inputCls} value={input.tipoPersiana} onChange={(e) => set("tipoPersiana", e.target.value)}>
                  {TIPOS_PERSIANA.map((t) => <option key={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Trilho / Varão">
                <select className={inputCls} value={input.trilho} onChange={(e) => set("trilho", e.target.value)}>
                  {TRILHOS.map((t) => <option key={t}>{t}</option>)}
                </select>
              </Field>
              <Field label={`Franzimento: ${input.franzimento}x`}>
                <input type="range" min="1.5" max="3" step="0.5" className="w-full accent-[var(--gold)]" value={input.franzimento} onChange={(e) => set("franzimento", +e.target.value)} />
              </Field>
              <Field label="Presilhas / Acessórios (un)">
                <input type="number" className={inputCls} value={input.presilhas} onChange={(e) => set("presilhas", +e.target.value)} />
              </Field>
            </div>
          </Card>

          {/* Ajustes */}
          <Card>
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-md bg-[oklch(0.78_0.13_85_/_0.1)] flex items-center justify-center text-gold">
                <Settings2 className="w-4 h-4" />
              </div>
              <h3 className="font-serif text-xl">Comercial</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Field label="Instalação">
                <button
                  onClick={() => set("instalacao", !input.instalacao)}
                  className={`${inputCls} text-left ${input.instalacao ? "text-gold border-gold" : ""}`}
                >
                  {input.instalacao ? "Incluída" : "Não incluída"}
                </button>
              </Field>
              <Field label="Deslocamento (R$)">
                <input type="number" className={inputCls} value={input.deslocamento} onChange={(e) => set("deslocamento", +e.target.value)} />
              </Field>
              <Field label={`Margem: ${input.margem}%`}>
                <input type="range" min="0" max="100" step="5" className="w-full accent-[var(--gold)]" value={input.margem} onChange={(e) => set("margem", +e.target.value)} />
              </Field>
              <Field label={`Desconto: ${input.desconto}%`}>
                <input type="range" min="0" max="30" step="1" className="w-full accent-[var(--gold)]" value={input.desconto} onChange={(e) => set("desconto", +e.target.value)} />
              </Field>
            </div>
          </Card>

          {/* Opções */}
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-gold mb-2">Compare as opções</div>
            <h3 className="font-serif text-2xl mb-4">Três níveis para o cliente escolher</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { key: "economica", label: "Econômica", desc: "Solução enxuta", data: opcoes.economica },
                { key: "premium", label: "Premium", desc: "Recomendado", data: opcoes.premium, highlight: true },
                { key: "luxo", label: "Luxo", desc: "Experiência completa", data: opcoes.luxo },
              ].map((o) => (
                <div
                  key={o.key}
                  className={`rounded-2xl p-6 transition-all ${
                    o.highlight
                      ? "glass border-gold shadow-gold"
                      : "glass-soft hover:border-gold"
                  }`}
                >
                  {o.highlight && (
                    <div className="text-[10px] uppercase tracking-[0.2em] text-gold mb-2">Sugerido</div>
                  )}
                  <div className="font-serif text-xl">{o.label}</div>
                  <div className="text-xs text-muted-foreground mb-4">{o.desc}</div>
                  <div className="font-serif text-3xl text-gold">{formatBRL(o.data.total)}</div>
                  <div className="text-xs text-muted-foreground mt-2">
                    {o.data.tecidoMetros}m de tecido · {o.data.rolos} rolo(s)
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RESUMO STICKY */}
        <div className="xl:sticky xl:top-6 self-start">
          <Card className="border-gold shadow-gold">
            <div className="text-[10px] uppercase tracking-[0.25em] text-gold mb-2">Orçamento em tempo real</div>
            <h3 className="font-serif text-2xl mb-1">{cliente || "Novo cliente"}</h3>
            <div className="text-sm text-muted-foreground mb-6">{ambiente}</div>

            <div className="gold-divider mb-5" />

            <div className="space-y-2 text-sm">
              <Row k="Tecido necessário" v={`${result.tecidoMetros} m`} />
              <Row k="Rolos de 3m" v={`${result.rolos} un`} />
              <Row k="Acessórios" v={`${result.acessorios} un`} />
            </div>

            <div className="gold-divider my-5" />

            <div className="space-y-2 text-sm">
              <Row k="Custo tecido" v={formatBRL(result.custoTecido)} muted />
              <Row k="Custo trilho" v={formatBRL(result.custoTrilho)} muted />
              <Row k="Custo acessórios" v={formatBRL(result.custoAcessorios)} muted />
              <Row k="Instalação" v={formatBRL(result.custoInstalacao)} muted />
              <Row k="Deslocamento" v={formatBRL(result.custoDeslocamento)} muted />
            </div>

            <div className="gold-divider my-5" />

            <div className="space-y-2 text-sm">
              <Row k="Subtotal" v={formatBRL(result.subtotal)} />
              <Row k={`Margem (${input.margem}%)`} v={`+ ${formatBRL(result.margemValor)}`} />
              {input.desconto > 0 && (
                <Row k={`Desconto (${input.desconto}%)`} v={`− ${formatBRL(result.descontoValor)}`} />
              )}
            </div>

            <div className="mt-6 p-5 rounded-xl gradient-gold text-[var(--navy-deep)]">
              <div className="text-[10px] uppercase tracking-[0.2em] opacity-70">Total final</div>
              <div className="font-serif text-4xl font-semibold">{formatBRL(result.total)}</div>
            </div>

            <div className="text-[10px] text-muted-foreground mt-4 leading-relaxed">
              * Cálculo simulado. As fórmulas reais serão integradas após análise da planilha técnica.
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

function Row({ k, v, muted }: { k: string; v: string; muted?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className={muted ? "text-muted-foreground" : ""}>{k}</span>
      <span className={`font-medium ${muted ? "text-muted-foreground" : "text-foreground"}`}>{v}</span>
    </div>
  );
}
