import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Package2, Plus, Pencil, Trash2 } from "lucide-react";

import { PageHeader, Card, StatCard, StatusBadge, GoldButton, Modal, Field, inputCls, selectCls } from "@/components/ui-kit";
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
  quantidade: string;
  unidade: string;
  custo: string;
  minimo: string;
};

const emptyForm: Form = { nome: "", categoria: "Tecido", codigo: "", quantidade: "0", unidade: "m", custo: "0", minimo: "0" };

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

  const novo = () => { setEditId(null); setForm(emptyForm); setOpen(true); };
  const editar = (s: StockItem) => {
    setEditId(s.id);
    setForm({
      nome: s.nome, categoria: s.categoria, codigo: s.codigo?.toString() ?? "",
      quantidade: String(s.quantidade), unidade: s.unidade, custo: String(s.custo), minimo: String(s.minimo),
    });
    setOpen(true);
  };

  const salvar = () => {
    if (!form.nome.trim()) { toast.error("Informe o nome do item"); return; }
    const payload = {
      nome: form.nome.trim(),
      categoria: form.categoria,
      codigo: form.codigo.trim() ? Number(form.codigo) : undefined,
      quantidade: Number(form.quantidade) || 0,
      unidade: form.unidade,
      custo: Number(form.custo) || 0,
      minimo: Number(form.minimo) || 0,
    };
    if (editId) { store.updateStock(editId, payload); toast.success("Item atualizado"); }
    else { store.addStock(payload); toast.success("Item adicionado"); }
    setOpen(false);
  };

  const excluir = (s: StockItem) => {
    store.removeStock(s.id);
    toast.success(`"${s.nome}" removido`);
  };

  const setF = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }));

  return (
    <>
      <PageHeader
        eyebrow="Inventário"
        title="Estoque"
        subtitle="Cadastre e ajuste manualmente os materiais disponíveis."
        actions={
          <GoldButton onClick={novo}>
            <Plus className="w-3.5 h-3.5" /> Adicionar item
          </GoldButton>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatCard label="Itens cadastrados" value={String(total)} />
        <StatCard label="Valor em estoque" value={formatBRL(valor)} />
        <StatCard label="Baixo estoque" value={String(baixo)} />
        <StatCard label="Indisponíveis" value={String(indisp)} />
      </div>

      <div className="flex gap-1 flex-wrap mb-6 overflow-x-auto -mx-1 px-1">
        {CATEGORIAS.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`px-3 py-2 rounded-md text-[12px] whitespace-nowrap transition-colors ${
              cat === c ? "bg-white/[0.06] text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-white/[0.03]"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Tabela no desktop */}
      <Card className="!p-0 overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-[11px] text-muted-foreground border-b border-white/[0.05]">
                <th className="py-3 px-6 font-normal">Item</th>
                <th className="py-3 font-normal">Categoria</th>
                <th className="py-3 font-normal text-right">Quantidade</th>
                <th className="py-3 font-normal text-right">Custo</th>
                <th className="py-3 font-normal">Status</th>
                <th className="py-3 px-6 font-normal text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-b border-white/[0.03] last:border-0 hover:bg-white/[0.015] transition-colors">
                  <td className="py-3.5 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-md bg-white/[0.04] flex items-center justify-center text-muted-foreground">
                        <Package2 className="w-3.5 h-3.5" />
                      </div>
                      <div className="text-[13px]">{s.nome}{s.codigo ? <span className="text-muted-foreground ml-2 text-[11px]">#{s.codigo}</span> : null}</div>
                    </div>
                  </td>
                  <td className="py-3.5 text-[12px] text-muted-foreground">{s.categoria}</td>
                  <td className="py-3.5 text-right text-[13px] stat">
                    {s.quantidade}<span className="text-muted-foreground ml-1 text-[12px]">{s.unidade}</span>
                  </td>
                  <td className="py-3.5 text-right text-[13px] text-muted-foreground stat">{formatBRL(s.custo)}</td>
                  <td className="py-3.5"><StatusBadge status={stockStatus(s)} /></td>
                  <td className="py-3.5 px-6">
                    <div className="flex items-center justify-end gap-1">
                      <IconBtn onClick={() => editar(s)} label="Editar"><Pencil className="w-3.5 h-3.5" /></IconBtn>
                      <IconBtn onClick={() => excluir(s)} label="Excluir" danger><Trash2 className="w-3.5 h-3.5" /></IconBtn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Cards no mobile */}
      <div className="md:hidden space-y-2.5">
        {filtered.map((s) => (
          <div key={s.id} className="surface rounded-xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[13px] font-medium truncate">{s.nome}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">{s.categoria}{s.codigo ? ` · #${s.codigo}` : ""}</div>
              </div>
              <StatusBadge status={stockStatus(s)} />
            </div>
            <div className="flex items-center justify-between mt-3">
              <div className="text-[13px] stat">{s.quantidade}<span className="text-muted-foreground ml-1 text-[12px]">{s.unidade}</span> · <span className="text-muted-foreground">{formatBRL(s.custo)}</span></div>
              <div className="flex gap-1">
                <IconBtn onClick={() => editar(s)} label="Editar"><Pencil className="w-4 h-4" /></IconBtn>
                <IconBtn onClick={() => excluir(s)} label="Excluir" danger><Trash2 className="w-4 h-4" /></IconBtn>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="text-[12px] text-muted-foreground py-6 text-center">Nenhum item nesta categoria.</div>}
      </div>

      {/* Modal de cadastro/edição */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editId ? "Editar item" : "Adicionar item"}
        footer={
          <>
            <GoldButton variant="ghost" onClick={() => setOpen(false)}>Cancelar</GoldButton>
            <GoldButton onClick={salvar}>{editId ? "Salvar" : "Adicionar"}</GoldButton>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {CATS_MATERIAL.includes(form.categoria) && (
            <div className="sm:col-span-2 rounded-lg border border-[oklch(0.80_0.10_88_/_0.2)] bg-[oklch(0.80_0.10_88_/_0.04)] px-3 py-2 text-[11px] text-gold">
              Este material vira opção automática na Calculadora. O custo é usado como preço por metro (R$/m).
            </div>
          )}
          <div className="sm:col-span-2">
            <Field label="Nome do item">
              <input autoFocus className={inputCls} value={form.nome} onChange={(e) => setF({ nome: e.target.value })} placeholder="Ex: Voil Bruxelas Areia" />
            </Field>
          </div>
          <Field label="Categoria">
            <select className={selectCls} value={form.categoria} onChange={(e) => setF({ categoria: e.target.value as StockItem["categoria"] })}>
              {CATS_FORM.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Código (opcional)" hint="Liga o item ao material do catálogo">
            <input className={inputCls} inputMode="numeric" value={form.codigo} onChange={(e) => setF({ codigo: e.target.value })} placeholder="Ex: 1130" />
          </Field>
          <Field label="Quantidade">
            <input className={inputCls} inputMode="decimal" value={form.quantidade} onChange={(e) => setF({ quantidade: e.target.value })} />
          </Field>
          <Field label="Unidade">
            <select className={selectCls} value={form.unidade} onChange={(e) => setF({ unidade: e.target.value })}>
              {UNIDADES.map((u) => <option key={u}>{u}</option>)}
            </select>
          </Field>
          <Field label="Custo unitário (R$)">
            <input className={inputCls} inputMode="decimal" value={form.custo} onChange={(e) => setF({ custo: e.target.value })} />
          </Field>
          <Field label="Estoque mínimo">
            <input className={inputCls} inputMode="decimal" value={form.minimo} onChange={(e) => setF({ minimo: e.target.value })} />
          </Field>
        </div>
      </Modal>
    </>
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
