import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, Pencil, Copy, FileDown, Search } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeader, Card, StatusBadge, GoldButton, inputCls } from "@/components/ui-kit";
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
    <AppShell>
      <PageHeader
        eyebrow="Histórico"
        title="Registros"
        subtitle="Todas as precificações organizadas. Edite, duplique ou gere PDF em segundos."
        actions={
          <Link to="/calculadora">
            <GoldButton>Nova precificação</GoldButton>
          </Link>
        }
      />

      <Card className="mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              className={`${inputCls} pl-11`}
              placeholder="Buscar por cliente ou ambiente..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {["Todos", "Rascunho", "Enviado", "Aprovado", "Perdido"].map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-4 py-2 rounded-lg text-sm border transition-all ${
                  filter === s
                    ? "border-gold text-gold bg-[oklch(0.78_0.13_85_/_0.1)]"
                    : "border-[oklch(0.78_0.13_85_/_0.2)] text-muted-foreground hover:text-foreground"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-[0.18em] text-muted-foreground border-b border-[oklch(0.78_0.13_85_/_0.15)]">
                <th className="pb-3 font-medium">Cliente</th>
                <th className="pb-3 font-medium">Ambiente</th>
                <th className="pb-3 font-medium">Data</th>
                <th className="pb-3 font-medium text-right">Valor</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[oklch(0.78_0.13_85_/_0.08)]">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-[oklch(0.78_0.13_85_/_0.04)] transition-colors">
                  <td className="py-4 font-medium">{p.cliente}</td>
                  <td className="py-4 text-muted-foreground">{p.ambiente}</td>
                  <td className="py-4 text-sm text-muted-foreground">
                    {new Date(p.data).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="py-4 text-right font-serif text-gold">{formatBRL(p.valor)}</td>
                  <td className="py-4"><StatusBadge status={p.status} /></td>
                  <td className="py-4">
                    <div className="flex items-center justify-end gap-1">
                      <IconBtn title="Visualizar" onClick={() => toast.info(`${p.cliente} — ${p.ambiente}`, { description: formatBRL(p.valor) })}>
                        <Eye className="w-4 h-4" />
                      </IconBtn>
                      <Link to="/calculadora" className="inline-flex items-center justify-center w-9 h-9 rounded-md hover:bg-[oklch(0.78_0.13_85_/_0.12)] text-muted-foreground hover:text-gold">
                        <Pencil className="w-4 h-4" />
                      </Link>
                      <IconBtn title="Duplicar" onClick={() => { store.duplicateProposal(p.id); toast.success("Proposta duplicada"); }}>
                        <Copy className="w-4 h-4" />
                      </IconBtn>
                      <Link to="/proposta" search={{ id: p.id } as any} className="inline-flex items-center justify-center w-9 h-9 rounded-md hover:bg-[oklch(0.78_0.13_85_/_0.12)] text-muted-foreground hover:text-gold">
                        <FileDown className="w-4 h-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    Nenhum registro encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </AppShell>
  );
}

function IconBtn({ children, onClick, title }: any) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="inline-flex items-center justify-center w-9 h-9 rounded-md hover:bg-[oklch(0.78_0.13_85_/_0.12)] text-muted-foreground hover:text-gold transition-colors"
    >
      {children}
    </button>
  );
}
