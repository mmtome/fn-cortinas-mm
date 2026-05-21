import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, Pencil, Copy, FileDown, Search } from "lucide-react";

import { PageHeader, Card, StatusBadge, GoldButton, inputCls, formatDate } from "@/components/ui-kit";
import { useStore, store } from "@/lib/store";
import { formatBRL } from "@/lib/pricing";
import { toast } from "sonner";

export const Route = createFileRoute("/registros")({ component: Registros });

function Registros() {
  const proposals = useStore((s) => s.proposals);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<string>("Todos");

  const filtered = proposals.filter(
    (p) =>
      (filter === "Todos" || p.status === filter) &&
      (p.cliente.toLowerCase().includes(q.toLowerCase()) ||
        p.ambiente.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <>
      <PageHeader
        eyebrow="Histórico"
        title="Registros"
        subtitle="Todas as precificações. Edite, duplique ou gere PDF rapidamente."
        actions={
          <Link to="/calculadora">
            <GoldButton>Nova precificação</GoldButton>
          </Link>
        }
      />

      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="flex-1 relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            className={`${inputCls} pl-9`}
            placeholder="Buscar por cliente ou ambiente..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {["Todos", "Rascunho", "Enviado", "Aprovado", "Perdido"].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-2 rounded-md text-[12px] transition-colors ${
                filter === s
                  ? "bg-white/[0.06] text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/[0.03]"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <Card className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-[11px] text-muted-foreground border-b border-white/[0.05]">
                <th className="py-3 px-6 font-normal">Cliente</th>
                <th className="py-3 font-normal">Ambiente</th>
                <th className="py-3 font-normal">Data</th>
                <th className="py-3 font-normal text-right">Valor</th>
                <th className="py-3 font-normal">Status</th>
                <th className="py-3 px-6 font-normal text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-white/[0.03] last:border-0 hover:bg-white/[0.015] transition-colors">
                  <td className="py-4 px-6 text-[13px]">{p.cliente}</td>
                  <td className="py-4 text-[13px] text-muted-foreground">{p.ambiente}</td>
                  <td className="py-4 text-[12px] text-muted-foreground">{formatDate(p.data)}</td>
                  <td className="py-4 text-[13px] text-right stat">{formatBRL(p.valor)}</td>
                  <td className="py-4"><StatusBadge status={p.status} /></td>
                  <td className="py-4 px-6">
                    <div className="flex items-center justify-end gap-0.5">
                      <IconBtn title="Visualizar" onClick={() => toast.info(`${p.cliente}`, { description: `${p.ambiente} · ${formatBRL(p.valor)}` })}>
                        <Eye className="w-3.5 h-3.5" />
                      </IconBtn>
                      <Link to="/calculadora" className="inline-flex items-center justify-center w-8 h-8 rounded-md hover:bg-white/[0.05] text-muted-foreground hover:text-foreground transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </Link>
                      <IconBtn title="Duplicar" onClick={() => { store.duplicateProposal(p.id); toast.success("Proposta duplicada"); }}>
                        <Copy className="w-3.5 h-3.5" />
                      </IconBtn>
                      <Link to="/proposta" search={{ id: p.id } as any} className="inline-flex items-center justify-center w-8 h-8 rounded-md hover:bg-white/[0.05] text-muted-foreground hover:text-gold transition-colors">
                        <FileDown className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-[13px] text-muted-foreground">
                    Nenhum registro encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

function IconBtn({ children, onClick, title }: any) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="inline-flex items-center justify-center w-8 h-8 rounded-md hover:bg-white/[0.05] text-muted-foreground hover:text-foreground transition-colors"
    >
      {children}
    </button>
  );
}
