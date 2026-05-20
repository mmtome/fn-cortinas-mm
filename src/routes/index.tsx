import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Plus } from "lucide-react";
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { AppShell } from "@/components/AppShell";
import { PageHeader, Card, StatCard, StatusBadge, GoldButton, formatDate } from "@/components/ui-kit";
import { useStore } from "@/lib/store";
import { salesData, stockStatus } from "@/lib/mockData";
import { formatBRL } from "@/lib/pricing";

export const Route = createFileRoute("/")({ component: Dashboard });

function Dashboard() {
  const proposals = useStore((s) => s.proposals);
  const stock = useStore((s) => s.stock);

  const total = proposals.length;
  const aprovadas = proposals.filter((p) => p.status === "Aprovado");
  const pendentes = proposals.filter((p) => p.status === "Enviado").length;
  const vendido = aprovadas.reduce((a, b) => a + b.valor, 0);
  const ticket = aprovadas.length ? vendido / aprovadas.length : 0;
  const criticos = stock.filter((s) => stockStatus(s) !== "disponivel").length;

  return (
    <AppShell>
      <PageHeader
        eyebrow="Painel"
        title="Visão geral"
        subtitle="Resumo das suas precificações e desempenho recente."
        actions={
          <Link to="/calculadora">
            <GoldButton>
              <Plus className="w-3.5 h-3.5" />
              Nova precificação
            </GoldButton>
          </Link>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-10">
        <StatCard label="Precificações" value={String(total)} />
        <StatCard label="Ticket médio" value={formatBRL(ticket)} />
        <StatCard label="Valor vendido" value={formatBRL(vendido)} />
        <StatCard label="Aprovadas" value={String(aprovadas.length)} />
        <StatCard label="Pendentes" value={String(pendentes)} />
        <StatCard label="Estoque crítico" value={String(criticos)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-10">
        <Card className="lg:col-span-2">
          <div className="flex items-end justify-between mb-8">
            <div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Vendas</div>
              <div className="text-[16px] font-medium mt-1">Últimos cinco meses</div>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-muted-foreground">Acumulado</div>
              <div className="text-[15px] font-medium stat mt-0.5">
                {formatBRL(salesData.reduce((a, b) => a + b.valor, 0))}
              </div>
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.80 0.10 88)" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="oklch(0.80 0.10 88)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="mes" stroke="oklch(0.55 0.012 260)" fontSize={11} tickLine={false} axisLine={false} dy={6} />
                <YAxis stroke="oklch(0.55 0.012 260)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  cursor={{ stroke: "oklch(0.80 0.10 88 / 0.2)", strokeWidth: 1 }}
                  contentStyle={{
                    background: "oklch(0.20 0.025 262)",
                    border: "1px solid oklch(1 0 0 / 0.06)",
                    borderRadius: 8,
                    color: "oklch(0.95 0.005 250)",
                    fontSize: 12,
                  }}
                  formatter={(v: number) => formatBRL(v)}
                />
                <Area type="monotone" dataKey="valor" stroke="oklch(0.80 0.10 88)" strokeWidth={1.5} fill="url(#gold)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground mb-1">Atalhos</div>
          <div className="text-[16px] font-medium mb-6">Ações rápidas</div>
          <div className="space-y-1">
            {[
              { to: "/calculadora", label: "Nova precificação", hint: "Iniciar orçamento" },
              { to: "/registros", label: "Ver registros", hint: "Histórico completo" },
              { to: "/estoque", label: "Estoque", hint: `${criticos} itens em atenção` },
            ].map((a) => (
              <Link key={a.to} to={a.to} className="block">
                <div className="flex items-center justify-between py-3 border-b border-white/[0.04] last:border-0 group">
                  <div>
                    <div className="text-[13px] font-medium">{a.label}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{a.hint}</div>
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-gold transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-end justify-between mb-6">
          <div>
            <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Histórico</div>
            <div className="text-[16px] font-medium mt-1">Propostas recentes</div>
          </div>
          <Link to="/registros">
            <GoldButton variant="ghost">Ver todas <ArrowUpRight className="w-3.5 h-3.5" /></GoldButton>
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-[11px] text-muted-foreground border-b border-white/[0.05]">
                <th className="pb-3 font-normal">Cliente</th>
                <th className="pb-3 font-normal">Ambiente</th>
                <th className="pb-3 font-normal text-right">Valor</th>
                <th className="pb-3 font-normal">Status</th>
                <th className="pb-3 font-normal">Data</th>
              </tr>
            </thead>
            <tbody>
              {proposals.slice(0, 6).map((p) => (
                <tr key={p.id} className="border-b border-white/[0.03] last:border-0 hover:bg-white/[0.015] transition-colors">
                  <td className="py-3.5 text-[13px]">{p.cliente}</td>
                  <td className="py-3.5 text-[13px] text-muted-foreground">{p.ambiente}</td>
                  <td className="py-3.5 text-[13px] text-right stat">{formatBRL(p.valor)}</td>
                  <td className="py-3.5"><StatusBadge status={p.status} /></td>
                  <td className="py-3.5 text-[12px] text-muted-foreground">{formatDate(p.data)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </AppShell>
  );
}
