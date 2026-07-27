import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Package2, Plus, Pencil, Trash2, Minus, AlertTriangle } from "lucide-react";

import { PageHeader, StatusBadge, GoldButton, Modal, Field, inputCls, selectCls } from "@/components/ui-kit";
import { useStore, store } from "@/lib/store";
import { stockStatus, type StockItem } from "@/lib/mockData";
import { formatBRL } from "@/lib/pricing-engine";
import { toast } from "sonner";

export const Route = createFileRoute("/estoque")({ component: Estoque });

const CATEGORIAS = ["Todos", "Tecido", "Forro", "Blackout", "Trilho", "Varão", "Acessório"];
const CATS_FORM = ["Tecido", "Forro", "Blackout", "Trilho", "Varão", "Acessório"] as const;
const CATS_MATERIAL = ["Tecido", "Forro", "Blackout"];
const UNIDADES = ["m", "un", "kg", "rolo", "cx"];

type Form = {
  nome: string;
  categoria: StockItem["categoria"];
  codigo: string;
  largura: string;
  quantidade: string;
  unidade: string;
  custo: string;
  minimo: string;
};
const emptyForm: Form = { nome: "", categoria: "Tecido", codigo: "", largura: "3", quantidade: "0", unidade: "m", custo: "0", minimo: "0" };

const STATUS_COR: Record<string, string> = {
  disponivel: "oklch(0.72 0.15 150)",
  baixo: "oklch(0.80 0.12 85)",
  indisponivel: "oklch(0.65 0.20 25)",
};

function Estoque() {
  const stock = useStore((s) => s.stock);
  const [cat, setCat] = useState("Todos");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);

  const filtered = stock.filter((s) => cat === "Todos" || s.categoria === cat);

  const total = stock.length;
  const baixo = stock.filter((s) => stockStatus(s) === "baixo").length;
  const indisp = stock.filter((s) => stockStatus(s) === "indisponivel").length;
  const valor = stock.reduce((a, b) => a + b.custo * b.quantidade, 0);
  const ok = total - baixo - indisp;
  const saude = total ? Math.round((ok / total) * 100) : 100;
  const aRepor = stock.filter((s) => stockStatus(s) !== "disponivel").sort((a, b) => stockStatus(a) === "indisponivel" ? -1 : 1);

  const novo = () => { setEditId(null); setForm(emptyForm); setOpen(true); };
  const editar = (s: StockItem) => {
    setEditId(s.id);
    setForm({ nome: s.nome, categoria: s.categoria, codigo: s.codigo?.toString() ?? "", largura: String(s.largura ?? 3), quantidade: String(s.quantidade), unidade: s.unidade, custo: String(s.custo), minimo: String(s.minimo) });
    setOpen(true);
  };
  const salvar = () => {
    if (!form.nome.trim()) { toast.error("Informe o nome do item"); return; }
    const ehMaterial = CATS_MATERIAL.includes(form.categoria);
    const payload = {
      nome: form.nome.trim(), categoria: form.categoria,
      codigo: form.codigo.trim() ? Number(form.codigo) : undefined,
      largura: ehMaterial ? (Number(form.largura) || 3) : undefined,
      quantidade: Number(form.quantidade) || 0, unidade: form.unidade,
      custo: Number(form.custo) || 0, minimo: Number(form.minimo) || 0,
    };
    if (editId) { store.updateStock(editId, payload); toast.success("Item atualizado"); }
    else { store.addStock(payload); toast.success("Item adicionado"); }
    setOpen(false);
  };
  const ajustar = (s: StockItem, delta: number) => {
    const q = Math.max(0, +(s.quantidade + delta).toFixed(2));
    store.updateStock(s.id, { quantidade: q });
  };
  const setF = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }));

  return (
    <>
      <PageHeader
        eyebrow="Inventário"
        title="Estoque"
        subtitle="Acompanhe o nível de cada material de um olhar e veja o que precisa repor."
        actions={<GoldButton onClick={novo}><Plus className="w-3.5 h-3.5" /> Adicionar item</GoldButton>}
      />

      {/* Resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <ResumoCard label="Itens cadastrados" value={String(total)} />
        <ResumoCard label="Valor em estoque" value={formatBRL(valor)} />
        <ResumoCard label="Saúde do estoque" value={`${saude}%`} bar={saude} tone={saude >= 80 ? "ok" : saude >= 50 ? "warn" : "bad"} />
        <ResumoCard label="Precisam repor" value={String(baixo + indisp)} tone={baixo + indisp > 0 ? "warn" : "ok"} sub={indisp > 0 ? `${indisp} zerado(s)` : undefined} />
      </div>

      {/* Alertas de reposição */}
      {aRepor.length > 0 && (
        <div className="rounded-2xl border border-[oklch(0.80_0.12_85_/_0.25)] bg-[oklch(0.80_0.12_85_/_0.04)] p-4 sm:p-5 mb-7">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-gold" />
            <div className="text-[13px] font-medium">Precisam de reposição</div>
            <span className="text-[11px] text-muted-foreground">· {aRepor.length}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
            {aRepor.map((s) => (
              <button key={s.id} onClick={() => editar(s)} className="text-left rounded-lg bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.05] p-3 transition-colors">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[12px] font-medium truncate">{s.nome}</span>
                  <StatusBadge status={stockStatus(s)} />
                </div>
                <LevelBar qty={s.quantidade} min={s.minimo} />
                <div className="text-[11px] text-muted-foreground mt-1.5 stat">{s.quantidade} / mín {s.minimo} {s.unidade}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filtro por categoria */}
      <div className="flex gap-1 flex-wrap mb-5 overflow-x-auto -mx-1 px-1">
        {CATEGORIAS.map((c) => {
          const n = c === "Todos" ? total : stock.filter((s) => s.categoria === c).length;
          return (
            <button key={c} onClick={() => setCat(c)}
              className={`px-3 py-2 rounded-md text-[12px] whitespace-nowrap transition-colors ${cat === c ? "bg-white/[0.06] text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-white/[0.03]"}`}>
              {c} <span className="text-muted-foreground/60">{n}</span>
            </button>
          );
        })}
      </div>

      {/* Grade de itens */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {filtered.map((s) => {
          const st = stockStatus(s);
          return (
            <div key={s.id} className="surface rounded-2xl p-4 flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center text-muted-foreground shrink-0">
                    <Package2 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium truncate">{s.nome}</div>
                    <div className="text-[11px] text-muted-foreground">{s.categoria}{s.codigo ? ` · #${s.codigo}` : ""}</div>
                  </div>
                </div>
                <StatusBadge status={st} />
              </div>

              <div className="mt-4">
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="stat text-[18px] font-medium" style={{ color: STATUS_COR[st] }}>
                    {s.quantidade}<span className="text-muted-foreground text-[12px] ml-1">{s.unidade}</span>
                  </span>
                  <span className="text-[11px] text-muted-foreground">mín {s.minimo}</span>
                </div>
                <LevelBar qty={s.quantidade} min={s.minimo} />
              </div>

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/[0.04]">
                <div className="text-[11px] text-muted-foreground">
                  {formatBRL(s.custo)}/{s.unidade} · <span className="text-foreground/80">{formatBRL(s.custo * s.quantidade)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <IconBtn onClick={() => ajustar(s, -(s.unidade === "un" ? 1 : 5))} label="Diminuir"><Minus className="w-3.5 h-3.5" /></IconBtn>
                  <IconBtn onClick={() => ajustar(s, s.unidade === "un" ? 1 : 5)} label="Aumentar"><Plus className="w-3.5 h-3.5" /></IconBtn>
                  <span className="w-px h-4 bg-white/[0.08] mx-0.5" />
                  <IconBtn onClick={() => editar(s)} label="Editar"><Pencil className="w-3.5 h-3.5" /></IconBtn>
                  <IconBtn onClick={() => { store.removeStock(s.id); toast.success(`"${s.nome}" removido`); }} label="Excluir" danger><Trash2 className="w-3.5 h-3.5" /></IconBtn>
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <div className="text-[12px] text-muted-foreground py-6 text-center col-span-full">Nenhum item nesta categoria.</div>}
      </div>

      {/* Modal de cadastro/edição */}
      <Modal
        open={open} onClose={() => setOpen(false)}
        title={editId ? "Editar item" : "Adicionar item"}
        footer={<><GoldButton variant="ghost" onClick={() => setOpen(false)}>Cancelar</GoldButton><GoldButton onClick={salvar}>{editId ? "Salvar" : "Adicionar"}</GoldButton></>}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {CATS_MATERIAL.includes(form.categoria) && (
            <div className="sm:col-span-2 rounded-lg border border-[oklch(0.80_0.10_88_/_0.2)] bg-[oklch(0.80_0.10_88_/_0.04)] px-3 py-2 text-[11px] text-gold">
              Vira opção na Calculadora. O custo é usado como preço por metro (R$/m). Mesmo nome = mesmo material (não duplica).
            </div>
          )}
          <div className="sm:col-span-2">
            <Field label="Nome do item">
              <input autoFocus className={inputCls} value={form.nome} onChange={(e) => setF({ nome: e.target.value })} placeholder="Ex: Linho" />
            </Field>
          </div>
          <Field label="Categoria">
            <select className={selectCls} value={form.categoria} onChange={(e) => setF({ categoria: e.target.value as StockItem["categoria"] })}>
              {CATS_FORM.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Código (opcional)" hint="Liga ao material do catálogo">
            <input className={inputCls} inputMode="numeric" value={form.codigo} onChange={(e) => setF({ codigo: e.target.value })} placeholder="Ex: 101" />
          </Field>
          <Field label="Quantidade">
            <input className={inputCls} inputMode="decimal" value={form.quantidade} onChange={(e) => setF({ quantidade: e.target.value })} />
          </Field>
          <Field label="Unidade">
            <select className={selectCls} value={form.unidade} onChange={(e) => setF({ unidade: e.target.value })}>
              {UNIDADES.map((u) => <option key={u}>{u}</option>)}
            </select>
          </Field>
          <Field label={CATS_MATERIAL.includes(form.categoria) ? "Preço por metro (R$/m)" : "Custo unitário (R$)"}>
            <input className={inputCls} inputMode="decimal" value={form.custo} onChange={(e) => setF({ custo: e.target.value })} />
          </Field>
          {CATS_MATERIAL.includes(form.categoria) && (
            <Field label="Largura do rolo (m)">
              <input className={inputCls} inputMode="decimal" value={form.largura} onChange={(e) => setF({ largura: e.target.value })} />
            </Field>
          )}
          <Field label="Estoque mínimo" hint="Abaixo disso, alerta de reposição">
            <input className={inputCls} inputMode="decimal" value={form.minimo} onChange={(e) => setF({ minimo: e.target.value })} />
          </Field>
        </div>
      </Modal>
    </>
  );
}

function LevelBar({ qty, min }: { qty: number; min: number }) {
  const st = qty === 0 ? "indisponivel" : qty < min ? "baixo" : "disponivel";
  const scaleMax = Math.max(min * 2, qty, min + 1, 1);
  const fill = Math.min(100, (qty / scaleMax) * 100);
  const minPct = Math.min(100, (min / scaleMax) * 100);
  return (
    <div className="relative h-2.5 rounded-full bg-white/[0.06] overflow-hidden">
      <div className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500 ease-premium" style={{ width: `${fill}%`, background: STATUS_COR[st] }} />
      {min > 0 && <div className="absolute inset-y-[-2px] w-[1.5px] bg-white/50" style={{ left: `${minPct}%` }} title={`mínimo ${min}`} />}
    </div>
  );
}

function ResumoCard({ label, value, sub, tone, bar }: { label: string; value: string; sub?: string; tone?: "ok" | "warn" | "bad"; bar?: number }) {
  const toneCor = tone === "bad" ? "oklch(0.65 0.20 25)" : tone === "warn" ? "oklch(0.80 0.12 85)" : "oklch(0.72 0.15 150)";
  return (
    <div className="surface surface-hover rounded-xl p-5">
      <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
      <div className="text-[22px] font-medium tracking-tight mt-2 stat" style={tone ? { color: toneCor } : undefined}>{value}</div>
      {bar != null && (
        <div className="mt-2.5 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${bar}%`, background: toneCor }} />
        </div>
      )}
      {sub && <div className="text-[11px] text-muted-foreground mt-1.5">{sub}</div>}
    </div>
  );
}

function IconBtn({ children, onClick, label, danger }: { children: React.ReactNode; onClick: () => void; label: string; danger?: boolean }) {
  return (
    <button onClick={onClick} aria-label={label}
      className={`p-2 rounded-md transition-colors ${danger ? "text-muted-foreground hover:text-[oklch(0.72_0.16_25)] hover:bg-[oklch(0.5_0.16_25_/_0.08)]" : "text-muted-foreground hover:text-foreground hover:bg-white/[0.05]"}`}>
      {children}
    </button>
  );
}
