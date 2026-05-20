import { createFileRoute, Link } from "@tanstack/react-router";
import {
  TrendingUp,
  DollarSign,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Receipt,
  ArrowRight,
  Calculator,
  Eye,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { AppShell } from "@/components/AppShell";
import { PageHeader, Card, StatCard, StatusBadge, GoldButton } from "@/components/ui-kit";
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
        eyebrow="Painel de Controle"
        title="Dashboard"
        subtitle="Visão geral do seu atelier de cortinas e persianas premium."
        actions={
          <Link to="/calculadora">
            <GoldButton>
              <Calculator className="w-4 h-4" />
              Nova precificação
            </GoldButton>
          </Link>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <StatCard label="Precificações" value={String(total)} hint="Total no período" icon={<Receipt className="w-4 h-4" />} />
        <StatCard label="Ticket Médio" value={formatBRL(ticket)} hint="Por proposta aprovada" icon={<TrendingUp className="w-4 h-4" />} />
        <StatCard label="Valor Vendido" value={formatBRL(vendido)} hint="Propostas aprovadas" icon={<DollarSign className="w-4 h-4" />} accent />
        <StatCard label="Aprovadas" value={String(aprovadas.length)} hint="Conversão consolidada" icon={<CheckCircle2 className="w-4 h-4" />} />
        <StatCard label="Pendentes" value={String(pendentes)} hint="Aguardando cliente" icon={<Clock className="w-4 h-4" />} />
        <StatCard label="Estoque Crítico" value={String(criticos)} hint="Itens a repor" icon={<AlertTriangle className="w-4 h-4" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-gold mb-1">Performance</div>
              <h3 className="font-serif text-2xl">Vendas dos últimos meses</h3>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Total acumulado</div>
              <div className="font-serif text-xl text-gold">
                {formatBRL(salesData.reduce((a, b) => a + b.valor, 0))}
              </div>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.78 0.13 85)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="oklch(0.78 0.13 85)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="oklch(0.78 0.13 85 / 0.08)" vertical={false} />
                <XAxis dataKey="mes" stroke="oklch(0.72 0.02 85)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="oklch(0.72 0.02 85)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.18 0.04 260)",
                    border: "1px solid oklch(0.78 0.13 85 / 0.3)",
                    borderRadius: 12,
                    color: "oklch(0.96 0.01 85)",
                  }}
                  formatter={(v: number) => formatBRL(v)}
                />
                <Area type="monotone" dataKey="valor" stroke="oklch(0.78 0.13 85)" strokeWidth={2} fill="url(#gold)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <div className="text-[10px] uppercase tracking-[0.2em] text-gold mb-1">Atalhos rápidos</div>
          <h3 className="font-serif text-2xl mb-6">Ações</h3>
          <div className="space-y-3">
            <Link to="/calculadora" className="block">
              <div className="flex items-center justify-between p-4 rounded-lg bg-[oklch(0.78_0.13_85_/_0.08)] border border-[oklch(0.78_0.13_85_/_0.2)] hover:bg-[oklch(0.78_0.13_85_/_0.14)] transition-all">
                <div>
                  <div className="font-medium">Nova precificação</div>
                  <div className="text-xs text-muted-foreground">Iniciar orçamento</div>
                </div>
                <ArrowRight className="w-4 h-4 text-gold" />
              </div>
            </Link>
            <Link to="/registros" className="block">
              <div className="flex items-center justify-between p-4 rounded-lg glass-soft hover:border-gold transition-all">
                <div>
                  <div className="font-medium">Ver registros</div>
                  <div className="text-xs text-muted-foreground">Histórico completo</div>
                </div>
                <ArrowRight className="w-4 h-4 text-gold" />
              </div>
            </Link>
            <Link to="/estoque" className="block">
              <div className="flex items-center justify-between p-4 rounded-lg glass-soft hover:border-gold transition-all">
                <div>
                  <div className="font-medium">Gerenciar estoque</div>
                  <div className="text-xs text-muted-foreground">{criticos} itens em atenção</div>
                </div>
                <ArrowRight className="w-4 h-4 text-gold" />
              </div>
            </Link>
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-gold mb-1">Histórico</div>
            <h3 className="font-serif text-2xl">Propostas recentes</h3>
          </div>
          <Link to="/registros">
            <GoldButton variant="ghost">Ver todas <ArrowRight className="w-4 h-4" /></GoldButton>
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-[0.18em] text-muted-foreground border-b border-[oklch(0.78_0.13_85_/_0.15)]">
                <th className="pb-3 font-medium">Cliente</th>
                <th className="pb-3 font-medium">Ambiente</th>
                <th className="pb-3 font-medium text-right">Valor</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Data</th>
                <th className="pb-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[oklch(0.78_0.13_85_/_0.08)]">
              {proposals.slice(0, 6).map((p) => (
                <tr key={p.id} className="hover:bg-[oklch(0.78_0.13_85_/_0.04)] transition-colors">
                  <td className="py-4 font-medium">{p.cliente}</td>
                  <td className="py-4 text-muted-foreground">{p.ambiente}</td>
                  <td className="py-4 text-right font-serif text-gold">{formatBRL(p.valor)}</td>
                  <td className="py-4"><StatusBadge status={p.status} /></td>
                  <td className="py-4 text-muted-foreground text-sm">
                    {new Date(p.data).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="py-4 text-right">
                    <Link to="/registros" className="inline-flex items-center justify-center w-8 h-8 rounded-md hover:bg-[oklch(0.78_0.13_85_/_0.12)] text-gold">
                      <Eye className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </AppShell>
  );
}
