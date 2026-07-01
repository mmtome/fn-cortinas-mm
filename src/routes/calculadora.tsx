import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Save, AlertTriangle, Minus, Plus, Trash2, Home, Wallet } from "lucide-react";

import { PageHeader, GoldButton, Field, Switch, inputCls, selectCls } from "@/components/ui-kit";
import {
  calcularProposta,
  defaultComodo,
  defaultPricingInput,
  ambienteLabel,
  formatBRL,
  type ComodoInput,
  type ComercialInput,
} from "@/lib/pricing-engine";
import { useStore, store, useCalcCtx } from "@/lib/store";
import { metrosDisponiveis } from "@/lib/mockData";
import { toast } from "sonner";

export const Route = createFileRoute("/calculadora")({ component: Calculadora });

const AMBIENTES = [
  "Sala de Estar", "Sala de Jantar", "Suíte Master", "Suíte de Hóspedes", "Closet",
  "Home Theater", "Home Office", "Biblioteca", "Lavabo", "Cozinha Gourmet",
  "Varanda Gourmet", "Sacada Panorâmica", "Hall de Entrada", "Showroom", "Quarto",
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

  const [cliente, setCliente] = useState("");
  const [endereco, setEndereco] = useState("");
  const [contato, setContato] = useState("");
  const [comodos, setComodos] = useState<ComodoInput[]>([defaultComodo()]);
  const [comercial, setComercial] = useState<ComercialInput>(defaultPricingInput().comercial);
  const [active, setActive] = useState(0);

  const result = useMemo(() => calcularProposta(comodos, comercial, ctx), [comodos, comercial, ctx]);
  const comodo = comodos[active];
  const cr = result.comodos[active];

  const estoqueTecido = metrosDisponiveis(stock, comodo.estrutura.tecidoCodigo);
  const estoqueForro = metrosDisponiveis(stock, comodo.estrutura.forroCodigo ?? undefined);
  const alertaTecido = estoqueTecido !== null && estoqueTecido < cr.mtsTecido;
  const alertaForro = estoqueForro !== null && comodo.estrutura.forroCodigo != null && estoqueForro < cr.mtsForro;

  const setComodo = (patch: Partial<ComodoInput>) =>
    setComodos((cs) => cs.map((c, i) => (i === active ? { ...c, ...patch } : c)));
  const setMedidas = (patch: Partial<ComodoInput["medidas"]>) => setComodo({ medidas: { ...comodo.medidas, ...patch } });
  const setEstrutura = (patch: Partial<ComodoInput["estrutura"]>) => setComodo({ estrutura: { ...comodo.estrutura, ...patch } });
  const setInstalacao = (patch: Partial<ComodoInput["instalacao"]>) => setComodo({ instalacao: { ...comodo.instalacao, ...patch } });
  const setC = (patch: Partial<ComercialInput>) => setComercial((c) => ({ ...c, ...patch }));

  const addComodo = () => {
    setComodos((cs) => [...cs, defaultComodo()]);
    setActive(comodos.length);
    toast.success("Cômodo adicionado");
  };
  const removeComodo = (i: number) => {
    if (comodos.length <= 1) return;
    setComodos((cs) => cs.filter((_, idx) => idx !== i));
    setActive((a) => {
      let na = i < a ? a - 1 : a;
      const nextLen = comodos.length - 1;
      if (na > nextLen - 1) na = nextLen - 1;
      return Math.max(0, na);
    });
  };

  const salvar = () => {
    if (!cliente.trim()) {
      toast.error("Informe o nome do cliente");
      return;
    }
    const comodosData = comodos.map((c, i) => ({ ...c, result: result.comodos[i] }));
    const id = "p" + Math.random().toString(36).slice(2, 9);
    store.upsertProposal({
      id,
      cliente,
      endereco,
      contato,
      comodos: comodosData,
      comercial,
      valor: result.totalFinal,
      status: "Pendente",
      data: new Date().toISOString().slice(0, 10),
      ambiente: ambienteLabel(comodos),
    });
    toast.success("Proposta salva");
    navigate({ to: "/registros" });
  };

  return (
    <>
      <PageHeader
        eyebrow="Atendimento"
        title="Nova precificação"
        subtitle="Um ou vários cômodos no mesmo orçamento. O preço é calculado em tempo real."
      />

      {/* Total fixo no mobile */}
      <div className="xl:hidden sticky top-[57px] z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2.5 mb-5 bg-[var(--background)]/90 backdrop-blur-md border-y border-white/[0.05] flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Total · {comodos.length} {comodos.length > 1 ? "cômodos" : "cômodo"}</div>
        <div className="flex items-baseline gap-2">
          <span key={result.totalFinal} className="text-[18px] font-medium stat animate-value">{formatBRL(result.totalFinal)}</span>
          {comercial.parcelas > 1 && <span className="text-[11px] text-muted-foreground">{comercial.parcelas}× {formatBRL(result.valorParcela)}</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-8">
        <div className="space-y-5">
          {/* Cliente */}
          <div className="surface rounded-2xl p-5 sm:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field label="Nome do cliente">
                <input className={inputCls} value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Ex: Marina Albuquerque" />
              </Field>
              <Field label="Contato" hint="Telefone / WhatsApp">
                <input className={inputCls} value={contato} onChange={(e) => setContato(e.target.value)} placeholder="(11) 99999-9999" />
              </Field>
              <div className="md:col-span-2">
                <Field label="Endereço">
                  <input className={inputCls} value={endereco} onChange={(e) => setEndereco(e.target.value)} placeholder="Rua, número, bairro — cidade" />
                </Field>
              </div>
            </div>
          </div>

          {/* Barra de cômodos */}
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2.5">Cômodos</div>
            <div className="flex gap-2 flex-wrap">
              {comodos.map((c, i) => (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  className={`group inline-flex items-center gap-2 pl-3 pr-2 py-2 rounded-lg border text-[12px] transition-colors ${
                    i === active
                      ? "border-[oklch(0.80_0.10_88_/_0.4)] bg-[oklch(0.80_0.10_88_/_0.06)] text-foreground"
                      : "border-white/[0.06] text-muted-foreground hover:text-foreground hover:bg-white/[0.03]"
                  }`}
                >
                  <Home className={`w-3.5 h-3.5 ${i === active ? "text-gold" : ""}`} />
                  <span className="max-w-[140px] truncate">{c.ambiente || `Cômodo ${i + 1}`}</span>
                  <span className="text-[11px] text-muted-foreground stat">{formatBRL(result.comodos[i].totalFinal)}</span>
                  {comodos.length > 1 && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => { e.stopPropagation(); removeComodo(i); }}
                      className="ml-1 p-0.5 rounded text-muted-foreground hover:text-[oklch(0.72_0.16_25)]"
                      aria-label="Remover cômodo"
                    >
                      <Trash2 className="w-3 h-3" />
                    </span>
                  )}
                </button>
              ))}
              <button
                onClick={addComodo}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-white/[0.12] text-[12px] text-muted-foreground hover:text-foreground hover:border-white/20 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar cômodo
              </button>
            </div>
          </div>

          {/* Editor do cômodo ativo */}
          <div className="surface rounded-2xl p-5 sm:p-7 space-y-8">
            {/* Ambiente */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <AmbienteField value={comodo.ambiente} onChange={(v) => setComodo({ ambiente: v })} />
              <Field label="Observações (opcional)">
                <input className={inputCls} value={comodo.observacoes ?? ""} onChange={(e) => setComodo({ observacoes: e.target.value })} placeholder="Detalhes, preferências..." />
              </Field>
            </div>

            {/* Medidas */}
            <Section title="Medidas — meça apenas a parede">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <NumField label="Largura parede" v={comodo.medidas.larguraParede} set={(v) => setMedidas({ larguraParede: v })} suf="m" />
                    <NumField label="Altura parede" v={comodo.medidas.alturaParede} set={(v) => setMedidas({ alturaParede: v })} suf="m" />
                  </div>

                  <div className="mt-5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                    <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-3">Cortina desejada · calculada</div>
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <MiniInfo label="Largura (arred.)" value={`${cr.larguraCortina} m`} />
                      <MiniInfo label="Altura" value={`${comodo.medidas.alturaParede.toFixed(2)} m`} />
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-2.5 text-center">
                      Largura arredondada para o inteiro de cima ({comodo.medidas.larguraParede.toFixed(2)} → {cr.larguraCortina} m).
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Corte do tecido</span>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full ${cr.caso === "B" ? "text-gold bg-[oklch(0.80_0.10_88_/_0.08)]" : "text-[oklch(0.78_0.10_150)] bg-[oklch(0.55_0.12_150_/_0.10)]"}`}>
                        {cr.caso === "B" ? "Virar o rolo" : "Rolo em pé"}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                      <MiniInfo label="Altura de corte" value={`${cr.alturaCorte.toFixed(2)} m`} />
                      <MiniInfo label="Tecido" value={`${cr.mtsTecido.toFixed(2)} m`} />
                      <MiniInfo label={cr.caso === "B" ? "Panos" : "Larg. franzida"} value={cr.caso === "B" ? `${cr.nPanos}` : `${cr.larguraFranzida.toFixed(2)} m`} />
                    </div>
                  </div>

                  {comodo.medidas.alturaParede > 4.5 && (
                    <div className="mt-4 flex items-center gap-2 text-[12px] text-gold">
                      <AlertTriangle className="w-3.5 h-3.5" /> Altura acima de 4,5m — andaime incluído.
                    </div>
                  )}
                </div>
                <div className="surface-flat rounded-xl p-6 flex items-center justify-center min-h-[200px]">
                  <PreviewParede larguraParede={comodo.medidas.larguraParede} alturaParede={comodo.medidas.alturaParede} larguraCortina={cr.larguraCortina} />
                </div>
              </div>
            </Section>

            {/* Estrutura */}
            <Section title="Estrutura, tecidos e acabamentos">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field label="Modelo">
                  <select className={selectCls} value={comodo.estrutura.modelo} onChange={(e) => setEstrutura({ modelo: e.target.value as any })}>
                    {MODELOS.map((m) => <option key={m}>{m}</option>)}
                  </select>
                </Field>
                <Field label="Motorizada" hint="Acionamento elétrico">
                  <div className="h-[42px] flex items-center">
                    <Switch checked={comodo.estrutura.motorizada} onChange={(v) => setEstrutura({ motorizada: v })} label={comodo.estrutura.motorizada ? "Sim" : "Não"} />
                  </div>
                </Field>
                <Field label="Tecido principal" hint={alertaTecido ? `Estoque insuficiente · ${estoqueTecido}m` : estoqueTecido != null ? `${estoqueTecido}m em estoque` : undefined}>
                  <select className={`${selectCls} ${alertaTecido ? "border-[oklch(0.72_0.14_25_/_0.4)]" : ""}`} value={comodo.estrutura.tecidoCodigo} onChange={(e) => setEstrutura({ tecidoCodigo: +e.target.value })}>
                    {tecidos.map((t) => <option key={t.codigo} value={t.codigo}>{t.nome}</option>)}
                  </select>
                </Field>
                <Field label="Forro" hint={comodo.estrutura.forroCodigo == null ? "Sem forro" : alertaForro ? `Estoque insuficiente · ${estoqueForro}m` : estoqueForro != null ? `${estoqueForro}m em estoque` : undefined}>
                  <select className={`${selectCls} ${alertaForro ? "border-[oklch(0.72_0.14_25_/_0.4)]" : ""}`} value={comodo.estrutura.forroCodigo ?? "none"} onChange={(e) => setEstrutura({ forroCodigo: e.target.value === "none" ? null : +e.target.value })}>
                    <option value="none">Sem forro</option>
                    {forros.map((t) => <option key={t.codigo} value={t.codigo}>{t.nome}</option>)}
                  </select>
                </Field>
                <Field label="Blackout" hint={comodo.estrutura.blackoutCodigo == null ? "Sem blackout" : "Trilho duplo inferido"}>
                  <select className={selectCls} value={comodo.estrutura.blackoutCodigo ?? "none"} onChange={(e) => setEstrutura({ blackoutCodigo: e.target.value === "none" ? null : +e.target.value })}>
                    <option value="none">Sem blackout</option>
                    {blackouts.map((t) => <option key={t.codigo} value={t.codigo}>{t.nome}</option>)}
                  </select>
                </Field>
                {comodo.estrutura.forroCodigo != null && (
                  <Field label="Forro costurado junto" hint="Quando ativo, trilho permanece simples">
                    <div className="h-[42px] flex items-center">
                      <Switch checked={comodo.estrutura.costuraXForro} onChange={(v) => setEstrutura({ costuraXForro: v })} label={comodo.estrutura.costuraXForro ? "Sim" : "Não"} />
                    </div>
                  </Field>
                )}
              </div>
            </Section>

            {/* Instalação */}
            <Section title="Instalação">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <Field label="Instalar no local" hint="Inclui colocação">
                  <div className="h-[42px] flex items-center">
                    <Switch checked={comodo.instalacao.instalar} onChange={(v) => setInstalacao({ instalar: v })} label={comodo.instalacao.instalar ? "Sim" : "Não"} />
                  </div>
                </Field>
                <Field label="Dificuldade">
                  <select className={selectCls} value={comodo.instalacao.dificuldade} onChange={(e) => setInstalacao({ dificuldade: e.target.value as any })} disabled={!comodo.instalacao.instalar}>
                    <option>Padrão</option>
                    <option>Difícil</option>
                  </select>
                </Field>
                <NumField label="Deslocamento" v={comodo.instalacao.deslocamento} set={(v) => setInstalacao({ deslocamento: v })} suf="R$" />
              </div>
            </Section>

            {/* Valor do cômodo */}
            <div className="flex items-center justify-between pt-2 border-t border-white/[0.05]">
              <span className="text-[12px] text-muted-foreground">Valor deste cômodo</span>
              <span className="text-[16px] font-medium stat text-gold">{formatBRL(cr.totalFinal)}</span>
            </div>
          </div>

          {/* Fechamento */}
          <div className="surface rounded-2xl p-5 sm:p-7">
            <div className="flex items-center gap-2 mb-5">
              <Wallet className="w-4 h-4 text-gold" />
              <div className="text-[13px] font-medium">Fechamento</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field label="Forma de pagamento">
                <select className={selectCls} value={comercial.forma} onChange={(e) => setC({ forma: e.target.value as any })}>
                  {FORMAS.map((f) => <option key={f}>{f}</option>)}
                </select>
              </Field>
              <Field label="Parcelas">
                <input type="number" inputMode="numeric" min={1} max={18} className={inputCls} value={comercial.parcelas} onChange={(e) => setC({ parcelas: Math.max(1, +e.target.value) })} />
              </Field>
              <div className="md:col-span-2">
                <Field label={`Desconto · ${comercial.desconto}%`} hint="Aplicado sobre o total da proposta">
                  <input type="range" min={0} max={20} step={1} className="w-full accent-[var(--gold)]" value={comercial.desconto} onChange={(e) => setC({ desconto: +e.target.value })} />
                </Field>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-[oklch(0.80_0.10_88_/_0.25)] bg-[oklch(0.80_0.10_88_/_0.04)] p-5 sm:p-6 flex items-end justify-between gap-4">
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Total da proposta</div>
                <div className="text-[11px] text-muted-foreground mt-1">{comodos.length} {comodos.length > 1 ? "cômodos" : "cômodo"}{comercial.parcelas > 1 ? ` · ${comercial.parcelas}× de ${formatBRL(result.valorParcela)}` : ""}</div>
              </div>
              <div key={result.totalFinal} className="text-[30px] sm:text-[34px] font-medium tracking-tight stat animate-value">{formatBRL(result.totalFinal)}</div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <GoldButton onClick={salvar} className="justify-center">
                <Save className="w-3.5 h-3.5" /> Salvar proposta
              </GoldButton>
            </div>
          </div>
        </div>

        <ResumoProposta cliente={cliente} comodos={comodos} result={result} comercial={comercial} alerta={alertaTecido || alertaForro} active={active} onPick={setActive} />
      </div>
    </>
  );
}

// =========================================================
// Resumo lateral (proposta inteira)
// =========================================================
function ResumoProposta({ cliente, comodos, result, comercial, alerta, active, onPick }: any) {
  return (
    <div className="hidden xl:block xl:sticky xl:top-6 self-start space-y-3">
      <div className="surface rounded-2xl p-6">
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Resumo</div>
        <div className="text-[14px] mt-2 font-medium">{cliente || "Novo cliente"}</div>
        <div className="text-[11px] text-muted-foreground">{comodos.length} {comodos.length > 1 ? "cômodos" : "cômodo"}</div>

        <div className="hairline my-5" />

        <div className="space-y-1.5">
          {comodos.map((c: ComodoInput, i: number) => (
            <button key={i} onClick={() => onPick(i)} className={`w-full flex justify-between gap-3 text-[12px] py-1.5 px-2 -mx-2 rounded-md transition-colors ${i === active ? "bg-white/[0.04]" : "hover:bg-white/[0.02]"}`}>
              <span className={`truncate ${i === active ? "text-foreground" : "text-muted-foreground"}`}>{c.ambiente || `Cômodo ${i + 1}`}</span>
              <span className="stat text-foreground shrink-0">{formatBRL(result.comodos[i].totalFinal)}</span>
            </button>
          ))}
        </div>

        <div className="hairline my-5" />

        {comercial.desconto > 0 && (
          <div className="flex justify-between text-[12px] py-1 text-muted-foreground">
            <span>Desconto · {comercial.desconto}%</span>
            <span className="stat">− {formatBRL(result.descontoValor)}</span>
          </div>
        )}
        <div className="flex items-baseline justify-between mt-1">
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Total</div>
          <div key={result.totalFinal} className="text-[20px] font-medium tracking-tight stat animate-value">{formatBRL(result.totalFinal)}</div>
        </div>
        {comercial.parcelas > 1 && (
          <div className="text-[11px] text-muted-foreground mt-1 text-right">
            {comercial.parcelas}× de <span className="stat text-gold">{formatBRL(result.valorParcela)}</span>
          </div>
        )}
      </div>

      {alerta && (
        <div className="rounded-2xl border border-[oklch(0.72_0.14_25_/_0.25)] bg-[oklch(0.5_0.16_25_/_0.05)] p-4 flex gap-3">
          <AlertTriangle className="w-4 h-4 text-[oklch(0.78_0.14_25)] shrink-0 mt-0.5" />
          <div className="text-[12px] text-[oklch(0.85_0.06_25)] leading-relaxed">
            Estoque insuficiente no cômodo selecionado. Verifique antes de fechar.
          </div>
        </div>
      )}
    </div>
  );
}

// =========================================================
// Helpers
// =========================================================
function AmbienteField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const isPreset = AMBIENTES.includes(value);
  const [otherMode, setOtherMode] = useState(!isPreset && value !== "");
  return (
    <Field label="Cômodo / ambiente">
      {otherMode ? (
        <div className="flex gap-2">
          <input autoFocus className={inputCls} value={value} onChange={(e) => onChange(e.target.value)} placeholder="Ex: Galeria, Sala de música…" />
          <button type="button" onClick={() => { setOtherMode(false); onChange(AMBIENTES[0]); }} className="px-3 rounded-md border border-white/[0.06] text-[11px] text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-colors">
            Lista
          </button>
        </div>
      ) : (
        <select
          className={selectCls}
          value={isPreset ? value : "__other"}
          onChange={(e) => {
            if (e.target.value === "__other") { setOtherMode(true); onChange(""); }
            else onChange(e.target.value);
          }}
        >
          {AMBIENTES.map((a) => <option key={a} value={a}>{a}</option>)}
          <option value="__other">Outro (personalizado)…</option>
        </select>
      )}
    </Field>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-4">{title}</div>
      {children}
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

function PreviewParede({ larguraParede, alturaParede, larguraCortina }: { larguraParede: number; alturaParede: number; larguraCortina: number }) {
  const scaleW = 240 / Math.max(larguraParede, larguraCortina, 0.1);
  const scaleH = 170 / Math.max(alturaParede, 0.1);
  const scale = Math.min(scaleW, scaleH);
  const pW = larguraParede * scale;
  const pH = alturaParede * scale;
  const cW = Math.min(larguraCortina, larguraParede) * scale;
  return (
    <svg width={pW + 60} height={pH + 60} className="overflow-visible max-w-full">
      <rect x={30} y={30} width={pW} height={pH} fill="none" stroke="oklch(1 0 0 / 0.10)" strokeWidth={1} />
      <rect x={30 + (pW - cW) / 2} y={30} width={cW} height={pH} fill="oklch(0.80 0.10 88 / 0.06)" stroke="oklch(0.80 0.10 88 / 0.5)" strokeWidth={1.2} />
      <text x={30 + pW / 2} y={20} fontSize={9} fill="oklch(0.62 0.012 260)" textAnchor="middle">parede {larguraParede}m</text>
      <text x={30 + pW / 2} y={30 + pH + 18} fontSize={9} fill="var(--gold)" textAnchor="middle">cortina {larguraCortina} × {alturaParede}m</text>
    </svg>
  );
}

function NumField({ label, v, set, suf }: { label: string; v: number; set: (n: number) => void; suf?: string }) {
  const step = suf === "m" ? 0.1 : 10;
  const dec = (n: number) => Math.round(n * 100) / 100;
  return (
    <Field label={label}>
      <div className="flex items-stretch gap-1.5">
        <button type="button" onClick={() => set(dec(Math.max(0, v - step)))} className="w-10 shrink-0 rounded-md border border-white/[0.06] bg-white/[0.03] text-muted-foreground hover:text-foreground active:scale-95 transition flex items-center justify-center" aria-label="Diminuir">
          <Minus className="w-3.5 h-3.5" />
        </button>
        <div className="relative flex-1">
          <input type="number" inputMode="decimal" step={step} className={`${inputCls} text-center ${suf ? "pr-7" : ""}`} value={v} onChange={(e) => set(+e.target.value)} />
          {suf && <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground pointer-events-none">{suf}</span>}
        </div>
        <button type="button" onClick={() => set(dec(v + step))} className="w-10 shrink-0 rounded-md border border-white/[0.06] bg-white/[0.03] text-muted-foreground hover:text-foreground active:scale-95 transition flex items-center justify-center" aria-label="Aumentar">
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </Field>
  );
}
