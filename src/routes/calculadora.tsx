import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Save, AlertTriangle, Minus, Plus, Trash2, Home, Wallet, Layers } from "lucide-react";

import { PageHeader, GoldButton, Field, Switch, NumberInput, Modal, inputCls, selectCls } from "@/components/ui-kit";
import {
  calcularOrcamento,
  defaultAmbiente,
  defaultPricingInput,
  nomeOpcao,
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
  const vars = useStore((s) => s.vars);
  const proposals = useStore((s) => s.proposals);
  const clientes = useStore((s) => s.clientes);
  const stock = useStore((s) => s.stock);
  const ctx = useCalcCtx();

  const [cliente, setCliente] = useState("");
  const [endereco, setEndereco] = useState("");
  const [contato, setContato] = useState("");
  const [ambientes, setAmbientes] = useState<AmbienteItem[]>([defaultAmbiente()]);
  const [comercial, setComercial] = useState<ComercialInput>({ ...defaultPricingInput().comercial, parcelas: 10 });
  const [active, setActive] = useState(0);
  const [desnivelOpen, setDesnivelOpen] = useState(false);

  const resultado = useMemo(() => calcularOrcamento(ambientes, comercial, ctx), [ambientes, comercial, ctx]);
  const amb = ambientes[active];
  const ambRes = resultado[active];

  // ---- Ambientes ----
  const setAmbiente = (patch: Partial<AmbienteItem>) => setAmbientes((as) => as.map((a, i) => (i === active ? { ...a, ...patch } : a)));
  const setMedidas = (patch: Partial<AmbienteItem["medidas"]>) => setAmbiente({ medidas: { ...amb.medidas, ...patch } });
  const setInstalacao = (patch: Partial<AmbienteItem["instalacao"]>) => setAmbiente({ instalacao: { ...amb.instalacao, ...patch } });
  const toggleDesnivel = (v: boolean) => {
    if (v) { const a = amb.medidas.alturaParede; setAmbiente({ desnivel: { esquerda: a, centro: a, direita: a } }); setDesnivelOpen(true); }
    else setAmbiente({ desnivel: null });
  };
  const setDesnivel = (patch: Partial<NonNullable<AmbienteItem["desnivel"]>>) => {
    const a = amb.medidas.alturaParede;
    const cur = amb.desnivel ?? { esquerda: a, centro: a, direita: a };
    setAmbiente({ desnivel: { ...cur, ...patch } });
  };
  const addAmbiente = () => { setAmbientes((as) => [...as, defaultAmbiente()]); setActive(ambientes.length); };
  const removeAmbiente = (i: number) => {
    if (ambientes.length <= 1) return;
    setAmbientes((as) => as.filter((_, idx) => idx !== i));
    setActive((a) => Math.max(0, Math.min(a > i ? a - 1 : a, ambientes.length - 2)));
  };

  // ---- Opções DO AMBIENTE ATIVO ----
  const opcoes = amb.opcoes;
  const setOpcoes = (fn: (os: OpcaoItem[]) => OpcaoItem[]) => setAmbiente({ opcoes: fn(amb.opcoes) });
  const setOpcao = (i: number, patch: Partial<EstruturaInput>) =>
    setOpcoes((os) => os.map((o, idx) => (idx === i ? { ...o, estrutura: { ...o.estrutura, ...patch } } : o)));
  const removeOpcao = (i: number) => setOpcoes((os) => (os.length <= 1 ? os : os.filter((_, idx) => idx !== i)));

  const forroPadrao = forros[0]?.codigo ?? null;
  const bk = (re: RegExp) => blackouts.find((b) => re.test(b.nome))?.codigo ?? null;
  const base = () => ({ ...defaultPricingInput().estrutura, forroCodigo: null, blackoutCodigo: null });
  const PRESETS: { nome: string; estrutura: Partial<EstruturaInput> }[] = [
    { nome: "Cortina", estrutura: {} },
    { nome: "+ Forro", estrutura: { forroCodigo: forroPadrao, costuraXForro: true } },
    { nome: "+ Blackout 80%", estrutura: { blackoutCodigo: bk(/80/) } },
    { nome: "+ Blackout 100%", estrutura: { blackoutCodigo: bk(/100/) ?? bk(/black/i) } },
  ];
  const addOpcao = (preset?: { nome: string; estrutura: Partial<EstruturaInput> }) =>
    setOpcoes((os) => [...os, { nome: preset?.nome ?? `Opção ${os.length + 1}`, estrutura: { ...base(), ...(preset?.estrutura ?? {}) } }]);

  const setC = (patch: Partial<ComercialInput>) => setComercial((c) => ({ ...c, ...patch }));

  // Ao digitar/selecionar um cliente já cadastrado, preenche contato e endereço.
  const onCliente = (nome: string) => {
    setCliente(nome);
    const c = clientes.find((x) => x.nome.trim().toLowerCase() === nome.trim().toLowerCase());
    if (c) { setContato(c.contato); setEndereco(c.endereco); }
  };

  const salvar = () => {
    if (!cliente.trim()) { toast.error("Informe o nome do cliente"); return; }
    const numero = Math.max(1000, ...proposals.map((p) => p.numero ?? 0)) + 1;
    const label = ambientes.map((a) => a.ambiente).filter(Boolean).slice(0, 2).join(", ") + (ambientes.length > 2 ? ` +${ambientes.length - 2}` : "");
    store.upsertProposal({
      id: "p" + Math.random().toString(36).slice(2, 9),
      numero,
      cliente, endereco, contato,
      comodos: [],
      ambientes, comercial,
      valor: resultado[0]?.opcoes[0]?.aVista ?? 0,
      status: "Pendente",
      data: new Date().toISOString().slice(0, 10),
      ambiente: label || "Orçamento",
    });
    store.upsertCliente({ nome: cliente, contato, endereco });
    toast.success("Proposta salva");
    navigate({ to: "/registros" });
  };

  return (
    <>
      <PageHeader eyebrow="Atendimento" title="Nova precificação" subtitle="Cada cômodo tem suas próprias opções (só cortina, forro, blackout). No PDF, cada ambiente vira um bloco." />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-8">
        <div className="space-y-5">
          {/* Cliente */}
          <div className="surface rounded-2xl p-5 sm:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field label="Nome do cliente" hint={clientes.length ? "Digite pra buscar um cliente salvo" : undefined}>
                <input className={inputCls} list="clientes-list" value={cliente} onChange={(e) => onCliente(e.target.value)} placeholder="Ex: Marina Albuquerque" />
                <datalist id="clientes-list">
                  {clientes.map((c) => <option key={c.id} value={c.nome} />)}
                </datalist>
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
                  <span className="text-[10px] text-muted-foreground">{a.opcoes.length} {a.opcoes.length === 1 ? "opção" : "opções"}</span>
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
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <NumField label="Largura parede" v={amb.medidas.larguraParede} set={(v) => setMedidas({ larguraParede: v })} suf="m" />
                    <NumField label="Altura parede" v={amb.medidas.alturaParede} set={(v) => setMedidas({ alturaParede: v })} suf="m" />
                  </div>
                  {amb.medidas.alturaParede > 4.5 && (
                    <div className="flex items-center gap-2 text-[12px] text-gold">
                      <AlertTriangle className="w-3.5 h-3.5" /> Altura acima de 4,5m — andaime incluído.
                    </div>
                  )}

                  {/* Desnível de altura — só registro/O.S., não afeta o orçamento */}
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <Switch checked={!!amb.desnivel} onChange={toggleDesnivel} label="Parede com desnível" />
                    {amb.desnivel && (
                      <button onClick={() => setDesnivelOpen(true)} className="text-[11px] text-gold hover:underline">
                        E {String(amb.desnivel.esquerda).replace(".", ",")} · C {String(amb.desnivel.centro).replace(".", ",")} · D {String(amb.desnivel.direita).replace(".", ",")} m · editar
                      </button>
                    )}
                  </div>

                  <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground pt-1">Instalação</div>
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <Field label="Instalar no local">
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
                    <Field label="Observações">
                      <input className={inputCls} value={amb.observacoes ?? ""} onChange={(e) => setAmbiente({ observacoes: e.target.value })} placeholder="Detalhes…" />
                    </Field>
                  </div>
                  {amb.instalacao.instalar && amb.instalacao.dificuldade === "Difícil" && (
                    <div className="flex items-center gap-2 text-[11px] text-gold">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> Dificuldade "Difícil": instalação × {vars.fatorDificuldade ?? 1.4} (encarece todas as opções deste ambiente).
                    </div>
                  )}
                </div>
                <div className="surface-flat rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-center min-h-[140px]">
                    <PreviewParede larguraParede={amb.medidas.larguraParede} alturaParede={amb.medidas.alturaParede} />
                  </div>
                  <div className="hairline" />
                  <PreviewCorte L={amb.medidas.larguraParede} H={amb.medidas.alturaParede} vars={vars} />
                </div>
              </div>
            </Section>

            {/* Opções deste ambiente */}
            <Section title={`Opções de "${amb.ambiente}" — o cliente escolhe uma`}>
              <div className="flex items-center gap-2 mb-4">
                <Layers className="w-4 h-4 text-gold" />
                <div className="text-[12px] text-muted-foreground">{opcoes.length} {opcoes.length === 1 ? "opção" : "opções"} neste ambiente</div>
              </div>
              <div className="space-y-4">
                {opcoes.map((o, i) => (
                  <OpcaoCard
                    key={i} idx={i} opcao={o} calc={ambRes?.opcoes[i]} stock={stock}
                    tecidos={tecidos} forros={forros} blackouts={blackouts} modelos={modelos} cores={cores}
                    onSet={(p: Partial<EstruturaInput>) => setOpcao(i, p)}
                    onRemove={opcoes.length > 1 ? () => removeOpcao(i) : undefined}
                  />
                ))}
              </div>
              <div className="flex flex-wrap gap-2 pt-4">
                {PRESETS.map((p) => (
                  <button key={p.nome} onClick={() => addOpcao(p)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-white/[0.12] text-[12px] text-muted-foreground hover:text-foreground hover:border-white/20 transition-colors">
                    <Plus className="w-3.5 h-3.5" /> {p.nome}
                  </button>
                ))}
              </div>
            </Section>
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
                <Field label={`Desconto · ${comercial.desconto}%`} hint="Aplicado sobre cada opção">
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

        {/* Resumo lateral: por ambiente */}
        <div className="hidden xl:block xl:sticky xl:top-6 self-start space-y-3">
          <div className="surface rounded-2xl p-6">
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Resumo</div>
            <div className="text-[14px] mt-2 font-medium">{cliente || "Novo cliente"}</div>
            <div className="text-[11px] text-muted-foreground">{ambientes.length} {ambientes.length > 1 ? "ambientes" : "ambiente"}</div>
            <div className="hairline my-5" />
            <div className="space-y-4">
              {resultado.map((r, i) => (
                <div key={i}>
                  <div className="text-[12px] font-medium text-foreground truncate mb-1.5">{r.ambiente || `Ambiente ${i + 1}`}</div>
                  <div className="space-y-1">
                    {r.opcoes.map((op, j) => (
                      <div key={j} className="flex justify-between items-baseline gap-2 text-[11px]">
                        <span className="text-muted-foreground truncate">{op.nome}</span>
                        <span className="stat text-gold shrink-0">{formatBRL(op.aVista)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Popup do desnível de altura (só registro/O.S.) */}
      <Modal open={desnivelOpen} onClose={() => setDesnivelOpen(false)} title="Desnível de altura da parede">
        <div className="text-[12px] text-muted-foreground mb-4">
          Registre as 3 alturas para sair na Ordem de Serviço. <span className="text-foreground">Não altera o orçamento</span> — o preço continua usando a altura única.
        </div>
        <div className="grid grid-cols-3 gap-3">
          <NumField label="Esquerda" v={amb.desnivel?.esquerda ?? amb.medidas.alturaParede} set={(v) => setDesnivel({ esquerda: v })} suf="m" />
          <NumField label="Centro" v={amb.desnivel?.centro ?? amb.medidas.alturaParede} set={(v) => setDesnivel({ centro: v })} suf="m" />
          <NumField label="Direita" v={amb.desnivel?.direita ?? amb.medidas.alturaParede} set={(v) => setDesnivel({ direita: v })} suf="m" />
        </div>
        <div className="flex justify-end mt-5">
          <GoldButton onClick={() => setDesnivelOpen(false)}>Concluir</GoldButton>
        </div>
      </Modal>
    </>
  );
}

// =========================================================
// Card de uma opção (forro/blackout aparecem só quando adicionados)
// =========================================================
function OpcaoCard({ idx, opcao, calc, stock, tecidos, forros, blackouts, modelos, cores, onSet, onRemove }: any) {
  const e: EstruturaInput = opcao.estrutura;
  const forroPadrao = forros[0]?.codigo ?? null;
  const blackoutPadrao = blackouts[0]?.codigo ?? null;

  // Aviso de estoque: compara os metros da opção com o disponível no estoque.
  const faltas: string[] = [];
  if (calc?.result) {
    const chk = (cod: number | null, mts: number, cat: any[]) => {
      if (cod == null || !mts) return;
      const item = stock?.find((s: any) => s.codigo === cod);
      if (item && item.quantidade < mts) faltas.push(`${cat.find((t: any) => t.codigo === cod)?.nome ?? "material"} (tem ${item.quantidade}m, precisa ${mts.toFixed(1)}m)`);
    };
    chk(e.tecidoCodigo, calc.result.mtsTecido, tecidos);
    chk(e.forroCodigo, calc.result.mtsForro, forros);
    chk(e.blackoutCodigo, calc.result.mtsBlackout, blackouts);
  }
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-5">
      <div className="flex items-center gap-3 mb-4">
        <span className="w-6 h-6 rounded-md bg-[oklch(0.80_0.10_88_/_0.12)] text-gold text-[11px] font-medium flex items-center justify-center shrink-0">{idx + 1}</span>
        <div className="flex-1 text-[13px] font-medium truncate">{nomeOpcao(e, blackouts)}</div>
        {calc && <span className="stat text-[14px] text-gold shrink-0">{formatBRL(calc.aVista)}</span>}
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

        {/* Forro — só quando adicionado */}
        {e.forroCodigo != null && (
          <>
            <Field label="Forro">
              <select className={selectCls} value={e.forroCodigo} onChange={(ev) => onSet({ forroCodigo: ev.target.value === "none" ? null : +ev.target.value })}>
                {forros.map((t: any) => <option key={t.codigo} value={t.codigo}>{t.nome}</option>)}
                <option value="none">Remover forro</option>
              </select>
            </Field>
            <Field label="Cor do forro" hint="Pode ser diferente da cortina">
              <select className={selectCls} value={e.corForro ?? ""} onChange={(ev) => onSet({ corForro: ev.target.value || undefined })}>
                <option value="">— selecione —</option>
                {cores.map((c: string) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Forro costurado junto" hint="Trilho permanece simples">
              <div className="h-[42px] flex items-center">
                <Switch checked={e.costuraXForro} onChange={(v) => onSet({ costuraXForro: v })} label={e.costuraXForro ? "Sim" : "Não"} />
              </div>
            </Field>
          </>
        )}

        {/* Blackout — só quando adicionado */}
        {e.blackoutCodigo != null && (
          <Field label="Blackout">
            <select className={selectCls} value={e.blackoutCodigo} onChange={(ev) => onSet({ blackoutCodigo: ev.target.value === "none" ? null : +ev.target.value })}>
              {blackouts.map((t: any) => <option key={t.codigo} value={t.codigo}>{t.nome}</option>)}
              <option value="none">Remover blackout</option>
            </select>
          </Field>
        )}
      </div>

      {/* Botões para adicionar forro/blackout */}
      {(e.forroCodigo == null || e.blackoutCodigo == null) && (
        <div className="flex flex-wrap gap-2 mt-4">
          {e.forroCodigo == null && (
            <button onClick={() => onSet({ forroCodigo: forroPadrao, costuraXForro: true })} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-white/[0.12] text-[11px] text-muted-foreground hover:text-foreground hover:border-white/20 transition-colors">
              <Plus className="w-3 h-3" /> Adicionar forro
            </button>
          )}
          {e.blackoutCodigo == null && (
            <button onClick={() => onSet({ blackoutCodigo: blackoutPadrao })} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-white/[0.12] text-[11px] text-muted-foreground hover:text-foreground hover:border-white/20 transition-colors">
              <Plus className="w-3 h-3" /> Adicionar blackout
            </button>
          )}
        </div>
      )}

      {faltas.length > 0 && (
        <div className="mt-3 flex items-start gap-2 text-[11px] text-[oklch(0.80_0.12_60)]">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
          <span>Estoque insuficiente: {faltas.join(" · ")}.</span>
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

function PreviewCorte({ L, H, vars }: { L: number; H: number; vars: any }) {
  const util = vars?.larguraUtilRolo ?? 2.85;
  const rolo = vars?.larguraRolo ?? 3;
  const fator = vars?.fatorTecido ?? 3;
  const casoB = H > util;
  const nPanos = Math.max(1, Math.ceil((L * fator) / rolo));
  const W = 220, Hh = 108;
  const gold = "var(--gold)";
  const fill = "oklch(0.80 0.10 88 / 0.10)";
  const rollCor = "oklch(0.55 0.02 260)";

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Corte do tecido</span>
        <span className={`text-[10px] px-2 py-0.5 rounded-full transition-colors ${casoB ? "text-gold bg-[oklch(0.80_0.10_88_/_0.10)]" : "text-[oklch(0.78_0.10_150)] bg-[oklch(0.55_0.12_150_/_0.12)]"}`}>
          {casoB ? "Virou o rolo ↻" : "Rolo em pé"}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${Hh}`} width="100%" className="max-w-[240px] mx-auto block">
        {casoB ? (
          (() => {
            const n = Math.min(nPanos, 7);
            const areaX = 30, areaW = W - 44, gap = 5;
            const pw = (areaW - gap * (n - 1)) / n;
            return (
              <>
                {/* rolo virado na vertical */}
                <rect x={8} y={16} width={13} height={74} rx={6.5} fill={rollCor} />
                <line x1={14.5} y1={20} x2={14.5} y2={86} stroke="oklch(0.72 0.02 260)" strokeWidth={1} strokeDasharray="2 3" />
                {/* panos verticais emendados */}
                {Array.from({ length: n }).map((_, i) => (
                  <rect key={i} x={areaX + i * (pw + gap)} y={14} width={pw} height={78} rx={2} fill={fill} stroke={gold} strokeWidth={1.2} />
                ))}
                <text x={areaX + areaW / 2} y={104} fontSize={9} fill={gold} textAnchor="middle">{nPanos} {nPanos > 1 ? "panos verticais" : "pano vertical"}</text>
              </>
            );
          })()
        ) : (
          <>
            {/* rolo deitado na horizontal */}
            <rect x={12} y={44} width={70} height={13} rx={6.5} fill={rollCor} />
            <line x1={16} y1={50.5} x2={78} y2={50.5} stroke="oklch(0.72 0.02 260)" strokeWidth={1} strokeDasharray="2 3" />
            {/* uma peça, cortada em pé */}
            <rect x={42} y={28} width={W - 60} height={46} rx={2} fill={fill} stroke={gold} strokeWidth={1.2} />
            <line x1={42} y1={51} x2={W - 18} y2={51} stroke={gold} strokeWidth={0.6} strokeDasharray="3 3" opacity={0.5} />
            <text x={(W - 18 + 42) / 2} y={100} fontSize={9} fill={gold} textAnchor="middle">1 peça — corta em pé</text>
          </>
        )}
      </svg>
      <div className="text-[10px] text-muted-foreground mt-1.5 text-center leading-relaxed">
        {casoB
          ? `Altura ${H} m passou de ${util} m → vira o rolo e emenda ${nPanos} ${nPanos > 1 ? "panos" : "pano"}.`
          : `Altura ${H} m cabe em ${util} m (largura do rolo) → corta em pé.`}
      </div>
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
