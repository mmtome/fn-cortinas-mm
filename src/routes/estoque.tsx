import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Package2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeader, Card, StatCard, StatusBadge } from "@/components/ui-kit";
import { useStore } from "@/lib/store";
import { stockStatus } from "@/lib/mockData";
import { formatBRL } from "@/lib/pricing";

export const Route = createFileRoute("/estoque")({ component: Estoque });

const CATEGORIAS = ["Todos", "Tecido", "Rolo", "Trilho", "Varão", "Presilha", "Acessório"];

function Estoque() {
  const stock = useStore((s) => s.stock);
  const [cat, setCat] = useState("Todos");
  const filtered = stock.filter((s) => cat === "Todos" || s.categoria === cat);

  const total = stock.length;
  const baixo = stock.filter((s) => stockStatus(s) === "baixo").length;
  const indisp = stock.filter((s) => stockStatus(s) === "indisponivel").length;
  const valor = stock.reduce((a, b) => a + b.custo * b.quantidade, 0);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Inventário"
        title="Estoque"
        subtitle="Materiais consultados automaticamente durante a precificação."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatCard label="Itens cadastrados" value={String(total)} />
        <StatCard label="Valor em estoque" value={formatBRL(valor)} />
        <StatCard label="Baixo estoque" value={String(baixo)} />
        <StatCard label="Indisponíveis" value={String(indisp)} />
      </div>

      <div className="flex gap-1 flex-wrap mb-6">
        {CATEGORIAS.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`px-3 py-2 rounded-md text-[12px] transition-colors ${
              cat === c
                ? "bg-white/[0.06] text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-white/[0.03]"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <Card className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-[11px] text-muted-foreground border-b border-white/[0.05]">
                <th className="py-3 px-6 font-normal">Item</th>
                <th className="py-3 font-normal">Categoria</th>
                <th className="py-3 font-normal text-right">Quantidade</th>
                <th className="py-3 font-normal text-right">Custo</th>
                <th className="py-3 px-6 font-normal">Status</th>
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
                      <div className="text-[13px]">{s.nome}</div>
                    </div>
                  </td>
                  <td className="py-3.5 text-[12px] text-muted-foreground">{s.categoria}</td>
                  <td className="py-3.5 text-right text-[13px] stat">
                    {s.quantidade}<span className="text-muted-foreground ml-1 text-[12px]">{s.unidade}</span>
                  </td>
                  <td className="py-3.5 text-right text-[13px] text-muted-foreground stat">{formatBRL(s.custo)}</td>
                  <td className="py-3.5 px-6"><StatusBadge status={stockStatus(s)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </AppShell>
  );
}
