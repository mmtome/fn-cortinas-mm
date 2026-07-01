import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Pencil, Trash2, Building2, Layers, SlidersHorizontal, RotateCcw } from "lucide-react";

import { PageHeader, GoldButton, Modal, Field, inputCls } from "@/components/ui-kit";
import { useStore, store, type MaterialKind } from "@/lib/store";
import { DEFAULT_VARS, formatBRL, type Tecido, type Vars } from "@/lib/pricing-engine";
import { toast } from "sonner";

export const Route = createFileRoute("/ajustes")({ component: Ajustes });

type Tab = "empresa" | "materiais" | "variaveis";

function Ajustes() {
  const [tab, setTab] = useState<Tab>("empresa");

  return (
    <>
      <PageHeader
        eyebrow="Configurações"
        title="Ajustes"
        subtitle="Cadastre manualmente materiais, variáveis de preço e os dados da empresa."
      />

      <div className="flex gap-1 mb-7 overflow-x-auto -mx-1 px-1">
        <TabBtn active={tab === "empresa"} onClick={() => setTab("empresa")} icon={Building2}>Empresa</TabBtn>
        <TabBtn active={tab === "materiais"} onClick={() => setTab("materiais")} icon={Layers}>Materiais</TabBtn>
        <TabBtn active={tab === "variaveis"} onClick={() => setTab("variaveis")} icon={SlidersHorizontal}>Variáveis</TabBtn>
      </div>

      {tab === "empresa" && <EmpresaTab />}
      {tab === "materiais" && <MateriaisTab />}
      {tab === "variaveis" && <VariaveisTab />}
    </>
  );
}

function TabBtn({ active, onClick, icon: Icon, children }: any) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-[12px] whitespace-nowrap transition-colors ${
        active ? "bg-white/[0.06] text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-white/[0.03]"
      }`}
    >
      <Icon className="w-3.5 h-3.5" /> {children}
    </button>
  );
}

// =========================================================
// EMPRESA
// =========================================================
function EmpresaTab() {
  const empresa = useStore((s) => s.empresa);
  const [form, setForm] = useState(empresa);
  const setF = (patch: Partial<typeof empresa>) => setForm((f) => ({ ...f, ...patch }));

  const salvar = () => { store.updateEmpresa(form); toast.success("Dados da empresa salvos"); };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="surface rounded-2xl p-6">
        <div className="text-[13px] font-medium mb-1">Dados da empresa</div>
        <div className="text-[12px] text-muted-foreground mb-6">Aparecem no cabeçalho e rodapé do PDF enviado ao cliente.</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nome da empresa">
            <input className={inputCls} value={form.nome} onChange={(e) => setF({ nome: e.target.value })} placeholder="FN Cortinas" />
          </Field>
          <Field label="Slogan">
            <input className={inputCls} value={form.slogan} onChange={(e) => setF({ slogan: e.target.value })} placeholder="Cortinas sob medida · Alto padrão" />
          </Field>
          <Field label="Telefone / WhatsApp">
            <input className={inputCls} value={form.telefone} onChange={(e) => setF({ telefone: e.target.value })} placeholder="(11) 99999-9999" />
          </Field>
          <Field label="Instagram">
            <input className={inputCls} value={form.instagram} onChange={(e) => setF({ instagram: e.target.value })} placeholder="@fncortinas" />
          </Field>
          <Field label="E-mail">
            <input className={inputCls} value={form.email} onChange={(e) => setF({ email: e.target.value })} placeholder="contato@fncortinas.com.br" />
          </Field>
          <Field label="Site">
            <input className={inputCls} value={form.site} onChange={(e) => setF({ site: e.target.value })} placeholder="www.fncortinas.com.br" />
          </Field>
        </div>
        <div className="flex justify-end mt-6">
          <GoldButton onClick={salvar}>Salvar dados</GoldButton>
        </div>
      </div>

      {/* Zona de dados de teste */}
      <div className="surface rounded-2xl p-6">
        <div className="text-[13px] font-medium mb-1">Dados de teste</div>
        <div className="text-[12px] text-muted-foreground mb-5">Zere o faturamento para acompanhar do zero durante os testes.</div>
        <div className="flex flex-wrap gap-2">
          <GoldButton
            variant="outline"
            onClick={() => { if (confirm("Zerar todas as propostas? O faturamento volta a zero.")) { store.limparPropostas(); toast.success("Propostas zeradas"); } }}
          >
            Zerar propostas (faturamento)
          </GoldButton>
          <GoldButton
            variant="ghost"
            onClick={() => { if (confirm("Restaurar os dados de exemplo (propostas, estoque, materiais e variáveis)?")) { store.resetData(); toast.success("Dados de exemplo restaurados"); } }}
          >
            Restaurar dados de exemplo
          </GoldButton>
        </div>
      </div>
    </div>
  );
}

// =========================================================
// MATERIAIS (catálogos)
// =========================================================
const KINDS: { key: MaterialKind; label: string; blackout?: boolean }[] = [
  { key: "tecidos", label: "Tecidos" },
  { key: "forros", label: "Forros" },
  { key: "blackouts", label: "Blackouts", blackout: true },
];

function MateriaisTab() {
  return (
    <div className="space-y-6">
      {KINDS.map((k) => <MaterialList key={k.key} kind={k.key} label={k.label} blackout={k.blackout} />)}
    </div>
  );
}

type MatForm = { codigo: string; nome: string; largura: string; precoMetro: string };
const emptyMat: MatForm = { codigo: "", nome: "", largura: "3", precoMetro: "23" };

function MaterialList({ kind, label, blackout }: { kind: MaterialKind; label: string; blackout?: boolean }) {
  const items = useStore((s) => s[kind]);
  const [open, setOpen] = useState(false);
  const [editCod, setEditCod] = useState<number | null>(null);
  const [form, setForm] = useState<MatForm>(emptyMat);

  const novo = () => { setEditCod(null); setForm(emptyMat); setOpen(true); };
  const editar = (t: Tecido) => {
    setEditCod(t.codigo);
    setForm({ codigo: String(t.codigo), nome: t.nome, largura: String(t.largura), precoMetro: String(t.precoMetro) });
    setOpen(true);
  };

  const salvar = () => {
    const codigo = Number(form.codigo);
    if (!form.nome.trim()) { toast.error("Informe o nome"); return; }
    if (!form.codigo.trim() || Number.isNaN(codigo)) { toast.error("Informe um código numérico"); return; }
    if (editCod == null && items.some((t) => t.codigo === codigo)) {
      toast.error("Já existe um material com este código"); return;
    }
    const mat: Tecido = {
      codigo, nome: form.nome.trim(),
      largura: Number(form.largura) || 0,
      precoMetro: Number(form.precoMetro) || 0,
      ...(blackout ? { blackout: true } : {}),
    };
    if (editCod != null) { store.updateMaterial(kind, editCod, mat); toast.success("Material atualizado"); }
    else { store.addMaterial(kind, mat); toast.success("Material adicionado"); }
    setOpen(false);
  };

  const setF = (patch: Partial<MatForm>) => setForm((f) => ({ ...f, ...patch }));

  return (
    <div className="surface rounded-2xl p-5 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="text-[13px] font-medium">{label} <span className="text-muted-foreground">· {items.length}</span></div>
        <GoldButton variant="outline" onClick={novo}><Plus className="w-3.5 h-3.5" /> Adicionar</GoldButton>
      </div>

      <div className="space-y-1.5">
        {items.map((t) => (
          <div key={t.codigo} className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
            <div className="min-w-0">
              <div className="text-[13px] truncate">{t.nome}</div>
              <div className="text-[11px] text-muted-foreground">#{t.codigo} · {t.largura}m · {formatBRL(t.precoMetro)}/m</div>
            </div>
            <div className="flex gap-1 shrink-0">
              <IconBtn onClick={() => editar(t)} label="Editar"><Pencil className="w-3.5 h-3.5" /></IconBtn>
              <IconBtn onClick={() => { store.removeMaterial(kind, t.codigo); toast.success("Removido"); }} label="Excluir" danger><Trash2 className="w-3.5 h-3.5" /></IconBtn>
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="text-[12px] text-muted-foreground py-3">Nenhum material cadastrado.</div>}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editCod != null ? `Editar ${label.toLowerCase().slice(0, -1)}` : `Novo ${label.toLowerCase().slice(0, -1)}`}
        footer={
          <>
            <GoldButton variant="ghost" onClick={() => setOpen(false)}>Cancelar</GoldButton>
            <GoldButton onClick={salvar}>Salvar</GoldButton>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Field label="Nome">
              <input autoFocus className={inputCls} value={form.nome} onChange={(e) => setF({ nome: e.target.value })} placeholder="Ex: Voil Bruxelas Areia" />
            </Field>
          </div>
          <Field label="Código" hint="Identificador numérico único">
            <input className={inputCls} inputMode="numeric" value={form.codigo} onChange={(e) => setF({ codigo: e.target.value })} disabled={editCod != null} placeholder="Ex: 1130" />
          </Field>
          <Field label="Largura (m)">
            <input className={inputCls} inputMode="decimal" value={form.largura} onChange={(e) => setF({ largura: e.target.value })} />
          </Field>
          <Field label="Preço por metro (R$)">
            <input className={inputCls} inputMode="decimal" value={form.precoMetro} onChange={(e) => setF({ precoMetro: e.target.value })} />
          </Field>
        </div>
      </Modal>
    </div>
  );
}

// =========================================================
// VARIÁVEIS DE PREÇO
// =========================================================
type VarField = { key: keyof Vars; label: string; suf?: string; step?: number; pct?: boolean };
const GROUPS: { title: string; fields: VarField[] }[] = [
  {
    title: "Lucro e pagamento",
    fields: [
      { key: "lucro", label: "Lucro base", pct: true },
      { key: "descontoPix", label: "Desconto Pix", pct: true },
      { key: "jurosCredito1x", label: "Juros crédito 1x", pct: true },
      { key: "jurosCartaoParcela", label: "Juros por parcela", pct: true },
    ],
  },
  {
    title: "Mão de obra e instalação",
    fields: [
      { key: "maoDeObraPorMetroTecido", label: "Mão de obra / m de tecido", suf: "R$" },
      { key: "instalacaoSemForro", label: "Instalação sem forro", suf: "R$" },
      { key: "instalacaoComForro", label: "Instalação com forro", suf: "R$" },
      { key: "fatorDificuldade", label: "Fator difícil", step: 0.1 },
      { key: "andaimeAlturaMin", label: "Altura p/ andaime", suf: "m", step: 0.1 },
      { key: "andaimeValor", label: "Adicional andaime", suf: "R$" },
      { key: "motorizadaValor", label: "Adicional motorizada", suf: "R$" },
    ],
  },
  {
    title: "Corte do tecido (rolo)",
    fields: [
      { key: "larguraRolo", label: "Largura do rolo", suf: "m", step: 0.05 },
      { key: "larguraUtilRolo", label: "Largura útil / alt. máx. em pé", suf: "m", step: 0.05 },
      { key: "bainhaLimite", label: "Dobra mínima (Caso A)", suf: "m", step: 0.05 },
      { key: "bainha", label: "Bainha cheia (cima+baixo)", suf: "m", step: 0.05 },
      { key: "forroSeparadoFator", label: "Forro separado (×)", step: 0.1 },
    ],
  },
  {
    title: "Consumo por metro de cortina",
    fields: [
      { key: "fatorTecido", label: "Franzido / Tecido (×)", step: 0.1 },
      { key: "fatorEntretela", label: "Entretela (×)", step: 0.1 },
      { key: "fatorCordao", label: "Cordão Wave (×)", step: 0.1 },
      { key: "rodiziosPorMetro", label: "Rodízios / m", step: 1 },
      { key: "fatorTrilho", label: "Trilho (×)", step: 0.1 },
    ],
  },
  {
    title: "Preços de acessórios",
    fields: [
      { key: "rodizio", label: "Rodízio (un)", suf: "R$", step: 0.01 },
      { key: "cordaoWavePorMetro", label: "Cordão Wave / m", suf: "R$" },
      { key: "entretelaPorMetro", label: "Entretela / m", suf: "R$" },
      { key: "trilhoSimplesPorMetro", label: "Trilho simples / m", suf: "R$" },
      { key: "trilhoDuploPorMetro", label: "Trilho duplo / m", suf: "R$" },
      { key: "varaoSuicoPorMetro", label: "Varão suíço / m", suf: "R$" },
    ],
  },
];

function VariaveisTab() {
  const vars = useStore((s) => s.vars);
  const [form, setForm] = useState<Vars>(vars);
  const setF = (k: keyof Vars, raw: string, pct?: boolean) => {
    const n = Number(raw);
    setForm((f) => ({ ...f, [k]: Number.isNaN(n) ? f[k] : pct ? n / 100 : n }));
  };

  const salvar = () => { store.updateVars(form); toast.success("Variáveis salvas"); };
  const resetar = () => { store.resetVars(); setForm({ ...DEFAULT_VARS }); toast.success("Variáveis restauradas"); };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div className="text-[12px] text-muted-foreground">As mudanças recalculam todos os orçamentos automaticamente.</div>
        <button onClick={resetar} className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors">
          <RotateCcw className="w-3 h-3" /> Restaurar padrão
        </button>
      </div>

      {GROUPS.map((g) => (
        <div key={g.title} className="surface rounded-2xl p-5 sm:p-6">
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-4">{g.title}</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {g.fields.map((f) => (
              <Field key={String(f.key)} label={f.label}>
                <div className="relative">
                  <input
                    type="number"
                    inputMode="decimal"
                    step={f.step ?? (f.pct ? 0.5 : 1)}
                    className={`${inputCls} ${f.suf || f.pct ? "pr-8" : ""}`}
                    value={f.pct ? +(form[f.key] * 100).toFixed(2) : form[f.key]}
                    onChange={(e) => setF(f.key, e.target.value, f.pct)}
                  />
                  {(f.suf || f.pct) && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground pointer-events-none">
                      {f.pct ? "%" : f.suf}
                    </span>
                  )}
                </div>
              </Field>
            ))}
          </div>
        </div>
      ))}

      <div className="flex justify-end sticky bottom-20 md:bottom-4">
        <GoldButton onClick={salvar}>Salvar variáveis</GoldButton>
      </div>
    </div>
  );
}

function IconBtn({ children, onClick, label, danger }: { children: React.ReactNode; onClick: () => void; label: string; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`p-2 rounded-md transition-colors ${danger ? "text-muted-foreground hover:text-[oklch(0.72_0.16_25)] hover:bg-[oklch(0.5_0.16_25_/_0.08)]" : "text-muted-foreground hover:text-foreground hover:bg-white/[0.05]"}`}
    >
      {children}
    </button>
  );
}
