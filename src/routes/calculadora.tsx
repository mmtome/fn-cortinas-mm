import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Save, AlertTriangle, Minus, Plus, Trash2, Home, Wallet, Layers } from "lucide-react";

import { PageHeader, GoldButton, Field, Switch, NumberInput, inputCls, selectCls } from "@/components/ui-kit";
import {
  calcularOrcamento,
  defaultAmbiente,
  defaultOpcao,
  defaultPricingInput,
  formatBRL,
  type AmbienteItem,
  type OpcaoItem,
  type EstruturaInput,
  type ComercialInput,
} from "@/lib/pricing-engine";
import { useStore, store, useCalcCtx, useMateriais } from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/calculadora")({ component: Calculadora });

const AMBIENTES = [
  "Sala de Estar", "Sala de Jantar", "Suíte Master", "Suíte de Hóspedes", "Closet",
  "Home Theater", "Home Office", "Biblioteca", "Lavabo", "Cozinha Gourmet",
  "Varanda Gourmet", "Sacada Panorâmica", "Hall de Entrada", "Showroom", "Quarto",
];
const FORMAS = ["Pix", "Cartão Débito", "Cartão Crédito 1x", "Cartão Crédito Parcelado", "Dinheiro"] as const;

function Calculadora() {
  const navigate = useNavigate();
  const { tecidos, forros, blackouts } = useMateriais();
  const modelos = useStore((s) => s.modelos);
  const cores = useStore((s) => s.cores);
  const proposals = useStore((s) => s.proposals);
  const ctx = useCalcCtx();

  const [cliente, setCliente] = useState("");
  const [endereco, setEndereco] = useState("");
  const [contato, setContato] = useState("");
  const [ambientes, setAmbientes] = useState<AmbienteItem[]>([defaultAmbiente()]);
  const [opcoes, setOpcoes] = useState<OpcaoItem[]>([{ ...defaultOpcao("Só cortina"), estrutura: { ...defaultPricingInput().estrutura, forroCodigo: null, blackoutCodigo: null } }]);
  const [comercial, setComercial] = useState<ComercialInput>({ ...defaultPricingInput().comercial, parcelas: 10 });
  const [active, setActive] = useState(0);

  const resultado = useMemo(() => calcularOrcamento(ambientes, opcoes, comercial, ctx), [ambientes, opcoes, comercial, ctx]);
  const amb = ambientes[active];

  // ---- Ambientes ----
  const setAmbiente = (patch: Partial<AmbienteItem>) => setAmbientes((as) => as.map((a, i) => (i === active ? { ...a, ...patch } : a)));
  const setMedidas = (patch: Partial<AmbienteItem["medidas"]>) => setAmbiente({ medidas: { ...amb.medidas, ...patch } });
  const setInstalacao = (patch: Partial<AmbienteItem["instalacao"]>) => setAmbiente({ instalacao: { ...amb.instalacao, ...patch } });
  const addAmbiente = () => { setAmbientes((as) => [...as, defaultAmbiente()]); setActive(ambientes.length); };
  const removeAmbiente = (i: number) => {
    if (ambientes.length <= 1) return;
    setAmbientes((as) => as.filter((_, idx) => idx !== i));
    setActive((a) => Math.max(0, Math.min(a > i ? a - 1 : a, ambientes.length - 2)));
  };

  // ---- Opções ----
  const setOpcao = (i: number, patch: Partial<EstruturaInput>) =>
    setOpcoes((os) => os.map((o, idx) => (idx === i ? { ...o, estrutura: { ...o.estrutura, ...patch } } : o)));
  const setOpcaoNome = (i: number, nome: string) => setOpcoes((os) => os.map((o, idx) => (idx === i ? { ...o, nome } : o)));
  const removeOpcao = (i: number) => setOpcoes((os) => (os.length <= 1 ? os : os.filter((_, idx) => idx !== i)));

  const forroPadrao = forros[0]?.codigo ?? null;
  const bk = (re: RegExp) => blackouts.find((b) => re.test(b.nome))?.codigo ?? null;
  const base = () => ({ ...defaultPricingInput().estrutura, forroCodigo: null, blackoutCodigo: null });
  const PRESETS: { nome: string; estrutura: Partial<EstruturaInput> }[] = [
    { nome: "Só cortina", estrutura: {} },
    { nome: "+ Forro", estrutura: { forroCodigo: forroPadrao, costuraXForro: true } },
    { nome: "+ Blackout 80%", estrutura: { blackoutCodigo: bk(/80/) } },
    { nome: "+ Blackout 100%", estrutura: { blackoutCodigo: bk(/100/) ?? bk(/black/i) } },
  ];
  const addOpcao = (preset?: { nome: string; estrutura: Partial<EstruturaInput> }) =>
    setOpcoes((os) => [...os, { nome: preset?.nome ?? `Opção ${os.length + 1}`, estrutura: { ...base(), ...(preset?.estrutura ?? {}) } }]);

  const setC = (patch: Partial<ComercialInput>) => setComercial((c) => ({ ...c, ...patch }));

  const salvar = () => {
    if (!cliente.trim()) { toast.error("Informe o nome do cliente"); return; }
    const numero = Math.max(1000, ...proposals.map((p) => p.numero ?? 0)) + 1;
    const label = ambientes.map((a) => a.ambiente).filter(Boolean).slice(0, 2).join(", ") + (ambientes.length > 2 ? ` +${ambientes.length - 2}` : "");
    store.upsertProposal({
      id: "p" + Math.random().toString(36).slice(2, 9),
      numero,
      cliente, endereco, contato,
      comodos: [],
      ambientes, opcoes, comercial,
      valor: resultado[0]?.aVistaTotal ?? 0,
      status: "Pendente",
      data: new Date().toISOString().slice(0, 10),
      ambiente: label || "Orçamento",
    });
    toast.success("Proposta salva");
    navigate({ to: "/registros" });
  };

  return (
    <>
      <PageHeader eyebrow="Atendimento" title="Nova precificação" subtitle="Cadastre os ambientes uma vez e compare várias opções (cortina, forro, blackout). O preço sai por opção." />

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

          {/* Ambientes */}
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2.5">Ambientes</div>
            <div className="flex gap-2 flex-wrap">
              {ambientes.map((a, i) => (
                <button key={i} onClick={() => setActive(i)}
                  className={`group inline-flex items-center gap-2 pl-3 pr-2 py-2 rounded-lg border text-[12px] transition-colors ${i === active ? "border-[oklch(0.80_0.10_88_/_0.4)] bg-[oklch(0.80_0.10_88_/_0.06)] text-foreground" : "border-white/[0.06] text-muted-foreground hover:text-foreground hover:bg-white/[0.03]"}`}>
                  <Home className={`w-3.5 h-3.5 ${i === active ? "text-gold" : ""}`} />
                  <span className="max-w-[140px] truncate">{a.ambiente || `Ambiente ${i + 1}`}</span>
                  {ambientes.length > 1 && (
                    <span role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); removeAmbiente(i); }} className="ml-1 p-0.5 rounded text-muted-foreground hover:text-[oklch(0.72_0.16_25)]" aria-label="Remover ambiente">
                      <Trash2 className="w-3 h-3" />
                    </span>
                  )}
                </button>
              ))}
              <button onClick={addAmbiente} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-white/[0.12] text-[12px] text-muted-foreground hover:text-foreground hover:border-white/20 transition-colors">
                <Plus className="w-3.5 h-3.5" /> Adicionar ambiente
              </button>
            </div>
          </div>

          {/* Editor do ambiente ativo */}
          <div className="surface rounded-2xl p-5 sm:p-7 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="md:col-span-2">
                <AmbienteField value={amb.ambiente} onChange={(v) => setAmbiente({ ambiente: v })} />
              </div>
              <NumField label="Quantidade" v={amb.quant} set={(v) => setAmbiente({ quant: Math.max(1, Math.round(v)) })} />
            </div>

            <Section title="Medidas — meça apenas a parede">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <NumField label="Largura parede" v={amb.medidas.larguraParede} set={(v) => setMedidas({ larguraParede: v })} suf="m" />
                    <NumField label="Altura parede" v={amb.medidas.alturaParede} set={(v) => setMedidas({ alturaParede: v })} suf="m" />
                  </div>
                  {amb.medidas.alturaParede > 4.5 && (
                    <div className="mt-4 flex items-center gap-2 text-[12px] text-gold">
                      <AlertTriangle className="w-3.5 h-3.5" /> Altura acima de 4,5m — andaime incluído.
                    </div>
                  )}
                  <div className="mt-4">
                    <Field label="Observações (opcional)">
                      <input className={inputCls} value={amb.observacoes ?? ""} onChange={(e) => setAmbiente({ observacoes: e.target.value })} placeholder="Detalhes, preferências..." />
                    </Field>
                  </div>
                </div>
                <div className="surface-flat rounded-xl p-6 flex items-center justify-center min-h-[180px]">
                  <PreviewParede larguraParede={amb.medidas.larguraParede} alturaParede={amb.medidas.alturaParede} />
                </div>
              </div>
            </Section>

            <Section title="Instalação">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <Field label="Instalar no local" hint="Inclui colocação">
                  <div className="h-[42px] flex items-center">
                    <Switch checked={amb.instalacao.instalar} onChange={(v) => setInstalacao({ instalar: v })} label={amb.instalacao.instalar ? "Sim" : "Não"} />
                  </div>
                </Field>
                <Field label="Dificuldade">
                  <select className={selectCls} value={amb.instalacao.dificuldade} onChange={(e) => setInstalacao({ dificuldade: e.target.value as any })} disabled={!amb.instalacao.instalar}>
                    <option>Padrão</option>
                    <option>Difícil</option>
                  </select>
                </Field>
                <NumField label="Deslocamento" v={amb.instalacao.deslocamento} set={(v) => setInstalacao({ deslocamento: v })} suf="R$" />
              </div>
            </Section>
          </div>

          {/* Opções */}
          <div className="surface rounded-2xl p-5 sm:p-7 space-y-5">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-gold" />
              <div className="text-[13px] font-medium">Opções para comparar</div>
              <span className="text-[11px] text-muted-foreground">· {opcoes.length}</span>
            </div>
            <div className="text-[12px] text-muted-foreground -mt-2">Cada opção é uma configuração de materiais aplicada a todos os ambientes. No PDF, cada opção vira uma tabela.</div>

            <div className="space-y-4">
              {opcoes.map((o, i) => (
                <OpcaoCard
                  key={i} idx={i} opcao={o} total={resultado[i]}
                  tecidos={tecidos} forros={forros} blackouts={blackouts} modelos={modelos} cores={cores}
                  onNome={(n: string) => setOpcaoNome(i, n)} onSet={(p: Partial<EstruturaInput>) => setOpcao(i, p)}
                  onRemove={opcoes.length > 1 ? () => removeOpcao(i) : undefined}
                />
              ))}
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {PRESETS.map((p) => (
                <button key={p.nome} onClick={() => addOpcao(p)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-white/[0.12] text-[12px] text-muted-foreground hover:text-foreground hover:border-white/20 transition-colors">
                  <Plus className="w-3.5 h-3.5" /> {p.nome}
                </button>
              ))}
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
              <Field label="Parcelas (mostradas no orçamento)">
                <NumberInput value={comercial.parcelas} onChange={(n) => setC({ parcelas: n })} min={2} max={12} integer />
              </Field>
              <div className="md:col-span-2">
                <Field label={`Desconto · ${comercial.desconto}%`} hint="Aplicado sobre o total de cada opção">
                  <input type="range" min={0} max={20} step={1} className="w-full accent-[var(--gold)]" value={comercial.desconto} onChange={(e) => setC({ desconto: +e.target.value })} />
                </Field>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <GoldButton onClick={salvar} className="justify-center">
                <Save className="w-3.5 h-3.5" /> Salvar proposta
              </GoldButton>
            </div>
          </div>
        </div>

        {/* Resumo lateral: totais por opção */}
        <div className="hidden xl:block xl:sticky xl:top-6 self-start space-y-3">
          <div className="surface rounded-2xl p-6">
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Resumo</div>
            <div className="text-[14px] mt-2 font-medium">{cliente || "Novo cliente"}</div>
            <div className="text-[11px] text-muted-foreground">{ambientes.length} {ambientes.length > 1 ? "ambientes" : "ambiente"} · {opcoes.length} {opcoes.length > 1 ? "opções" : "opção"}</div>
            <div className="hairline my-5" />
            <div className="space-y-3">
              {resultado.map((op, i) => (
                <div key={i}>
                  <div className="flex justify-between items-baseline gap-2">
                    <span className="text-[12px] text-foreground truncate">{op.nome}</span>
                    <span className="stat text-[14px] text-gold shrink-0">{formatBRL(op.aVistaTotal)}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground text-right">à vista · {op.parcelas}x de {formatBRL(op.parceladoTotal / op.parcelas)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// =========================================================
// Card de uma opção
// =========================================================
function OpcaoCard({ idx, opcao, total, tecidos, forros, blackouts, modelos, cores, onNome, onSet, onRemove }: any) {
  const e: EstruturaInput = opcao.estrutura;
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-5">
      <div className="flex items-center gap-3 mb-4">
        <span className="w-6 h-6 rounded-md bg-[oklch(0.80_0.10_88_/_0.12)] text-gold text-[11px] font-medium flex items-center justify-center shrink-0">{idx + 1}</span>
        <input className={`${inputCls} py-1.5`} value={opcao.nome} onChange={(ev) => onNome(ev.target.value)} placeholder="Nome da opção" />
        {total && <span className="stat text-[14px] text-gold shrink-0">{formatBRL(total.aVistaTotal)}</span>}
        {onRemove && (
          <button onClick={onRemove} aria-label="Remover opção" className="p-1.5 rounded-md text-muted-foreground hover:text-[oklch(0.72_0.16_25)] shrink-0">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Modelo">
          <select className={selectCls} value={e.modelo} onChange={(ev) => onSet({ modelo: ev.target.value })}>
            {modelos.map((m: any) => <option key={m.nome}>{m.nome}</option>)}
            {!modelos.some((m: any) => m.nome === e.modelo) && <option value={e.modelo}>{e.modelo}</option>}
          </select>
        </Field>
        <Field label="Motorizada">
          <div className="h-[42px] flex items-center">
            <Switch checked={e.motorizada} onChange={(v) => onSet({ motorizada: v })} label={e.motorizada ? "Sim" : "Não"} />
          </div>
        </Field>
        <Field label="Tecido">
          <select className={selectCls} value={e.tecidoCodigo} onChange={(ev) => onSet({ tecidoCodigo: +ev.target.value })}>
            {tecidos.map((t: any) => <option key={t.codigo} value={t.codigo}>{t.nome}</option>)}
          </select>
        </Field>
        <Field label="Cor do tecido">
          <select className={selectCls} value={e.cor ?? ""} onChange={(ev) => onSet({ cor: ev.target.value || undefined })}>
            <option value="">— selecione —</option>
            {cores.map((c: string) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Forro">
          <select className={selectCls} value={e.forroCodigo ?? "none"} onChange={(ev) => onSet({ forroCodigo: ev.target.value === "none" ? null : +ev.target.value })}>
            <option value="none">Sem forro</option>
            {forros.map((t: any) => <option key={t.codigo} value={t.codigo}>{t.nome}</option>)}
          </select>
        </Field>
        <Field label="Blackout">
          <select className={selectCls} value={e.blackoutCodigo ?? "none"} onChange={(ev) => onSet({ blackoutCodigo: ev.target.value === "none" ? null : +ev.target.value })}>
            <option value="none">Sem blackout</option>
            {blackouts.map((t: any) => <option key={t.codigo} value={t.codigo}>{t.nome}</option>)}
          </select>
        </Field>
        {e.forroCodigo != null && (
          <Field label="Forro costurado junto" hint="Trilho permanece simples">
            <div className="h-[42px] flex items-center">
              <Switch checked={e.costuraXForro} onChange={(v) => onSet({ costuraXForro: v })} label={e.costuraXForro ? "Sim" : "Não"} />
            </div>
          </Field>
        )}
      </div>
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
        <select className={selectCls} value={isPreset ? value : "__other"} onChange={(e) => { if (e.target.value === "__other") { setOtherMode(true); onChange(""); } else onChange(e.target.value); }}>
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

function PreviewParede({ larguraParede, alturaParede }: { larguraParede: number; alturaParede: number }) {
  const scale = Math.min(240 / Math.max(larguraParede, 0.1), 170 / Math.max(alturaParede, 0.1));
  const pW = larguraParede * scale;
  const pH = alturaParede * scale;
  return (
    <svg width={pW + 60} height={pH + 60} className="overflow-visible max-w-full">
      <rect x={30} y={30} width={pW} height={pH} fill="oklch(0.80 0.10 88 / 0.06)" stroke="oklch(0.80 0.10 88 / 0.5)" strokeWidth={1.2} />
      <text x={30 + pW / 2} y={20} fontSize={9} fill="oklch(0.62 0.012 260)" textAnchor="middle">parede</text>
      <text x={30 + pW / 2} y={30 + pH + 18} fontSize={9} fill="var(--gold)" textAnchor="middle">{larguraParede} × {alturaParede}m</text>
    </svg>
  );
}

function NumField({ label, v, set, suf }: { label: string; v: number; set: (n: number) => void; suf?: string }) {
  const step = suf === "m" ? 0.1 : suf === "R$" ? 10 : 1;
  const dec = (n: number) => Math.round(n * 100) / 100;
  return (
    <Field label={label}>
      <div className="flex items-stretch gap-1.5">
        <button type="button" onClick={() => set(dec(Math.max(0, v - step)))} className="w-10 shrink-0 rounded-md border border-white/[0.06] bg-white/[0.03] text-muted-foreground hover:text-foreground active:scale-95 transition flex items-center justify-center" aria-label="Diminuir">
          <Minus className="w-3.5 h-3.5" />
        </button>
        <div className="relative flex-1">
          <NumberInput value={v} onChange={(n) => set(dec(n))} min={0} step={step} className={`${inputCls} text-center ${suf ? "pr-7" : ""}`} />
          {suf && <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground pointer-events-none">{suf}</span>}
        </div>
        <button type="button" onClick={() => set(dec(v + step))} className="w-10 shrink-0 rounded-md border border-white/[0.06] bg-white/[0.03] text-muted-foreground hover:text-foreground active:scale-95 transition flex items-center justify-center" aria-label="Aumentar">
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </Field>
  );
}
