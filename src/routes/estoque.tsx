import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Package2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeader, Card, StatusBadge } from "@/components/ui-kit";
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
        subtitle="Materiais consultados automaticamente pela calculadora durante a precificação."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Itens cadastrados</div>
          <div className="font-serif text-3xl mt-2">{total}</div>
        </Card>
        <Card>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Valor em estoque</div>
          <div className="font-serif text-3xl text-gold mt-2">{formatBRL(valor)}</div>
        </Card>
        <Card>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Baixo estoque</div>
          <div className="font-serif text-3xl text-gold mt-2">{baixo}</div>
        </Card>
        <Card>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Indisponíveis</div>
          <div className="font-serif text-3xl text-[oklch(0.75_0.18_25)] mt-2">{indisp}</div>
        </Card>
      </div>

      <div className="flex gap-2 flex-wrap mb-6">
        {CATEGORIAS.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`px-4 py-2 rounded-lg text-sm border transition-all ${
              cat === c
                ? "border-gold text-gold bg-[oklch(0.78_0.13_85_/_0.1)]"
                : "border-[oklch(0.78_0.13_85_/_0.18)] text-muted-foreground hover:text-foreground"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-[0.18em] text-muted-foreground border-b border-[oklch(0.78_0.13_85_/_0.15)]">
                <th className="pb-3 font-medium">Item</th>
                <th className="pb-3 font-medium">Categoria</th>
                <th className="pb-3 font-medium text-right">Quantidade</th>
                <th className="pb-3 font-medium text-right">Custo unit.</th>
                <th className="pb-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[oklch(0.78_0.13_85_/_0.08)]">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-[oklch(0.78_0.13_85_/_0.04)] transition-colors">
                  <td className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-md bg-[oklch(0.78_0.13_85_/_0.1)] flex items-center justify-center text-gold">
                        <Package2 className="w-4 h-4" />
                      </div>
                      <div className="font-medium">{s.nome}</div>
                    </div>
                  </td>
                  <td className="py-4 text-muted-foreground text-sm">{s.categoria}</td>
                  <td className="py-4 text-right">
                    <span className="font-serif text-lg">{s.quantidade}</span>
                    <span className="text-muted-foreground text-sm ml-1">{s.unidade}</span>
                  </td>
                  <td className="py-4 text-right text-gold">{formatBRL(s.custo)}</td>
                  <td className="py-4"><StatusBadge status={stockStatus(s)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </AppShell>
  );
}
