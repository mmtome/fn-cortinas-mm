import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Phone, MapPin, FileDown, ChevronDown, Users } from "lucide-react";

import { PageHeader, Card, StatusBadge, inputCls, selectCls, formatDate } from "@/components/ui-kit";
import { useStore, useMateriais } from "@/lib/store";
import { formatBRL } from "@/lib/pricing-engine";
import type { Proposal, ProposalStatus } from "@/lib/mockData";
import { montarItensServico, gerarOrcamentoServico, type TipoServico } from "@/lib/orcamento-servico-pdf";
import { toast } from "sonner";

export const Route = createFileRoute("/clientes")({ component: Clientes });

const STATUS = ["Todos", "Pendente", "Aprovado", "Perdido"] as const;

function ambientesDe(p: Proposal): string {
  const news = p.ambientes?.map((a) => a.ambiente).filter(Boolean) ?? [];
  const olds = p.comodos?.map((c) => c.ambiente).filter(Boolean) ?? [];
  return [p.ambiente, ...news, ...olds].join(" ").toLowerCase();
}

interface Grupo {
  nome: string;
  props: Proposal[];
  totalAprovado: number;
  ultima: string;
  contato: string;
  endereco: string;
}

function Clientes() {
  const proposals = useStore((s) => s.proposals);
  const clientesReg = useStore((s) => s.clientes);
  const materiais = useMateriais();
  const empresa = useStore((s) => s.empresa);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("Todos");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [aberto, setAberto] = useState<string | null>(null);

  const filtered = useMemo(() => proposals.filter((p) => {
    if (status !== "Todos" && p.status !== status) return false;
    if (de && p.data < de) return false;
    if (ate && p.data > ate) return false;
    if (q.trim()) {
      const t = q.trim().toLowerCase();
      if (!p.cliente.toLowerCase().includes(t) && !ambientesDe(p).includes(t)) return false;
    }
    return true;
  }), [proposals, status, de, ate, q]);

  const grupos: Grupo[] = useMemo(() => {
    const map = new Map<string, Proposal[]>();
    filtered.forEach((p) => {
      const k = (p.cliente || "—").trim();
      const arr = map.get(k) ?? [];
      arr.push(p);
      map.set(k, arr);
    });
    const reg = (nome: string) => clientesReg.find((c) => c.nome.trim().toLowerCase() === nome.toLowerCase());
    return [...map.entries()]
      .map(([nome, props]) => ({
        nome,
        props: [...props].sort((a, b) => (a.data < b.data ? 1 : -1)),
        totalAprovado: props.filter((x) => x.status === "Aprovado").reduce((a, b) => a + b.valor, 0),
        ultima: props.map((x) => x.data).sort().at(-1) ?? "",
        contato: reg(nome)?.contato ?? props.find((p) => p.contato)?.contato ?? "",
        endereco: reg(nome)?.endereco ?? props.find((p) => p.endereco)?.endereco ?? "",
      }))
      .sort((a, b) => (a.ultima < b.ultima ? 1 : -1));
  }, [filtered, clientesReg]);

  const baixar = (p: Proposal, tipo: TipoServico) => {
    const itens = montarItensServico(p, materiais.tecidos);
    const doc = gerarOrcamentoServico({ tipo, cliente: p.cliente, endereco: p.endereco, contato: p.contato, dataISO: p.data, numero: p.numero, itens, empresa });
    doc.save(`Orcamento-${tipo}-${(p.cliente || "cliente").replace(/\s+/g, "_")}.pdf`);
    toast.success(`Orçamento de ${tipo} gerado`);
  };

  const totalClientes = grupos.length;
  const totalAprovadoGeral = grupos.reduce((a, g) => a + g.totalAprovado, 0);

  return (
    <>
      <PageHeader
        eyebrow="Relacionamento"
        title="Clientes · CRM"
        subtitle="Todos que passaram, com o histórico de orçamentos e a opção de baixar cada PDF."
      />

      {/* Resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-white/[0.04] rounded-2xl overflow-hidden mb-6">
        <Mini label="Clientes" value={String(totalClientes)} />
        <Mini label="Orçamentos" value={String(filtered.length)} />
        <Mini label="Fechado (aprovado)" value={formatBRL(totalAprovadoGeral)} accent />
      </div>

      {/* Filtros */}
      <div className="surface rounded-2xl p-4 sm:p-5 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input className={`${inputCls} pl-9`} placeholder="Cliente ou ambiente…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className={selectCls} value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUS.map((s) => <option key={s} value={s}>{s === "Todos" ? "Todos os status" : s}</option>)}
        </select>
        <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
          De <input type="date" className={inputCls} value={de} onChange={(e) => setDe(e.target.value)} />
        </label>
        <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
          Até <input type="date" className={inputCls} value={ate} onChange={(e) => setAte(e.target.value)} />
        </label>
      </div>

      {/* Lista de clientes */}
      <div className="space-y-2.5">
        {grupos.map((g) => {
          const open = aberto === g.nome;
          return (
            <Card key={g.nome} className="!p-0 overflow-hidden">
              <button onClick={() => setAberto(open ? null : g.nome)} className="w-full flex items-center gap-3 p-4 sm:p-5 text-left hover:bg-white/[0.015] transition-colors">
                <div className="w-9 h-9 rounded-full bg-[oklch(0.80_0.10_88_/_0.12)] text-gold flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-medium truncate">{g.nome}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 flex flex-wrap gap-x-3">
                    <span>{g.props.length} orçamento{g.props.length > 1 ? "s" : ""}</span>
                    {g.contato && <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" /> {g.contato}</span>}
                    {g.ultima && <span>último {formatDate(g.ultima)}</span>}
                  </div>
                </div>
                {g.totalAprovado > 0 && <span className="text-[13px] stat text-gold shrink-0">{formatBRL(g.totalAprovado)}</span>}
                <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
              </button>

              {open && (
                <div className="px-4 sm:px-5 pb-4 space-y-2">
                  {g.endereco && (
                    <div className="flex items-start gap-2 text-[12px] text-muted-foreground pb-1">
                      <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {g.endereco}
                    </div>
                  )}
                  {g.props.map((p) => (
                    <div key={p.id} className="rounded-xl border border-white/[0.05] p-3">
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <div className="min-w-0">
                          <div className="text-[12px] font-medium truncate">{p.ambiente}</div>
                          <div className="text-[10px] text-muted-foreground">{formatDate(p.data)} · {formatBRL(p.valor)}</div>
                        </div>
                        <StatusBadge status={p.status as ProposalStatus} />
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        <Link to="/proposta" search={{ id: p.id } as any} className="flex items-center justify-center gap-1 py-1.5 rounded-lg border border-white/[0.07] text-[11px] hover:bg-white/[0.03] transition-colors">
                          <FileDown className="w-3 h-3" /> Cortina
                        </Link>
                        <button onClick={() => baixar(p, "Persiana")} className="flex items-center justify-center gap-1 py-1.5 rounded-lg border border-white/[0.07] text-[11px] hover:bg-white/[0.03] transition-colors">
                          <FileDown className="w-3 h-3" /> Persiana
                        </button>
                        <button onClick={() => baixar(p, "Lavanderia")} className="flex items-center justify-center gap-1 py-1.5 rounded-lg border border-white/[0.07] text-[11px] hover:bg-white/[0.03] transition-colors">
                          <FileDown className="w-3 h-3" /> Lavanderia
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
        {grupos.length === 0 && (
          <div className="text-[13px] text-muted-foreground py-16 text-center">Nenhum cliente encontrado com esses filtros.</div>
        )}
      </div>
    </>
  );
}

function Mini({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-[var(--background)] p-4 sm:p-5">
      <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
      <div className={`text-[18px] sm:text-[20px] font-medium mt-1.5 stat ${accent ? "text-gold" : ""}`}>{value}</div>
    </div>
  );
}
