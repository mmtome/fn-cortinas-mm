import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Copy, FileDown, Search, Trash2, Phone, MapPin, Home, Check } from "lucide-react";

import { PageHeader, Card, StatusBadge, GoldButton, Modal, inputCls, formatDate } from "@/components/ui-kit";
import { useStore, store } from "@/lib/store";
import { formatBRL } from "@/lib/pricing-engine";
import type { Proposal, ProposalStatus } from "@/lib/mockData";
import { toast } from "sonner";

export const Route = createFileRoute("/registros")({ component: Registros });

const STATUS: ProposalStatus[] = ["Pendente", "Aprovado", "Perdido"];
const FILTERS = ["Todos", ...STATUS];

function Registros() {
  const proposals = useStore((s) => s.proposals);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<string>("Todos");
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = proposals.filter(
    (p) =>
      (filter === "Todos" || p.status === filter) &&
      (p.cliente.toLowerCase().includes(q.toLowerCase()) || p.ambiente.toLowerCase().includes(q.toLowerCase()))
  );

  const selected = useMemo(() => proposals.find((p) => p.id === openId) ?? null, [proposals, openId]);

  return (
    <>
      <PageHeader
        eyebrow="Histórico"
        title="Registros"
        subtitle="Abra o cliente para ver os dados e marcar aprovado, pendente ou perdido."
        actions={
          <Link to="/calculadora"><GoldButton>Nova precificação</GoldButton></Link>
        }
      />

      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="flex-1 relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input className={`${inputCls} pl-9`} placeholder="Buscar por cliente ou ambiente..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="flex gap-1 flex-wrap">
          {FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-2 rounded-md text-[12px] transition-colors ${filter === s ? "bg-white/[0.06] text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-white/[0.03]"}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela (desktop) */}
      <Card className="!p-0 overflow-hidden hidden md:block">
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
                <tr key={p.id} onClick={() => setOpenId(p.id)} className="border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors cursor-pointer">
                  <td className="py-4 px-6 text-[13px]">{p.cliente}</td>
                  <td className="py-4 text-[13px] text-muted-foreground">{p.ambiente}</td>
                  <td className="py-4 text-[12px] text-muted-foreground">{formatDate(p.data)}</td>
                  <td className="py-4 text-[13px] text-right stat">{formatBRL(p.valor)}</td>
                  <td className="py-4"><StatusBadge status={p.status} /></td>
                  <td className="py-4 px-6" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-0.5">
                      <Link to="/proposta" search={{ id: p.id } as any} className="inline-flex items-center justify-center w-8 h-8 rounded-md hover:bg-white/[0.05] text-muted-foreground hover:text-gold transition-colors" title="PDF / proposta">
                        <FileDown className="w-3.5 h-3.5" />
                      </Link>
                      <IconBtn title="Duplicar" onClick={() => { store.duplicateProposal(p.id); toast.success("Proposta duplicada"); }}>
                        <Copy className="w-3.5 h-3.5" />
                      </IconBtn>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="py-16 text-center text-[13px] text-muted-foreground">Nenhum registro encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Cards (mobile) */}
      <div className="md:hidden space-y-2.5">
        {filtered.map((p) => (
          <button key={p.id} onClick={() => setOpenId(p.id)} className="w-full text-left surface rounded-xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[13px] font-medium truncate">{p.cliente}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{p.ambiente} · {formatDate(p.data)}</div>
              </div>
              <StatusBadge status={p.status} />
            </div>
            <div className="text-[14px] stat text-gold mt-2">{formatBRL(p.valor)}</div>
          </button>
        ))}
        {filtered.length === 0 && <div className="text-[12px] text-muted-foreground py-8 text-center">Nenhum registro encontrado.</div>}
      </div>

      <ClienteCard proposal={selected} onClose={() => setOpenId(null)} />
    </>
  );
}

// =========================================================
// Card do cliente (modal) — dados + tag de status
// =========================================================
function ClienteCard({ proposal, onClose }: { proposal: Proposal | null; onClose: () => void }) {
  if (!proposal) return null;
  const p = proposal;

  const marcar = (status: ProposalStatus) => {
    store.setStatus(p.id, status);
    toast.success(`Marcado como ${status}`);
  };
  const excluir = () => {
    store.removeProposal(p.id);
    toast.success("Proposta excluída");
    onClose();
  };

  return (
    <Modal open={!!proposal} onClose={onClose} title={p.cliente}>
      {/* Contato / endereço */}
      <div className="space-y-2 mb-5">
        {p.contato && (
          <div className="flex items-center gap-2.5 text-[13px]">
            <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <a href={`tel:${p.contato.replace(/\D/g, "")}`} className="hover:text-gold transition-colors">{p.contato}</a>
          </div>
        )}
        {p.endereco && (
          <div className="flex items-start gap-2.5 text-[13px]">
            <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
            <span>{p.endereco}</span>
          </div>
        )}
        {!p.contato && !p.endereco && <div className="text-[12px] text-muted-foreground">Sem contato/endereço cadastrado.</div>}
      </div>

      {/* Status */}
      <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-2">Situação</div>
      <div className="grid grid-cols-3 gap-2 mb-6">
        {STATUS.map((s) => {
          const active = p.status === s;
          return (
            <button
              key={s}
              onClick={() => marcar(s)}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg border text-[12px] transition-colors ${
                active
                  ? s === "Aprovado"
                    ? "border-[oklch(0.80_0.10_88_/_0.5)] bg-[oklch(0.80_0.10_88_/_0.08)] text-gold"
                    : s === "Perdido"
                    ? "border-[oklch(0.72_0.16_25_/_0.5)] bg-[oklch(0.5_0.16_25_/_0.08)] text-[oklch(0.78_0.14_25)]"
                    : "border-white/20 bg-white/[0.06] text-foreground"
                  : "border-white/[0.06] text-muted-foreground hover:text-foreground hover:bg-white/[0.03]"
              }`}
            >
              {active && <Check className="w-3 h-3" />} {s}
            </button>
          );
        })}
      </div>

      {/* Detalhamento */}
      {p.opcoes && p.opcoes.length ? (
        <>
          <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-2">
            {p.ambientes?.length ?? 0} {(p.ambientes?.length ?? 0) === 1 ? "ambiente" : "ambientes"} · {p.opcoes.length} {p.opcoes.length === 1 ? "opção" : "opções"}
          </div>
          <div className="space-y-1.5 mb-5">
            {p.ambientes?.map((a, i) => (
              <div key={i} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-white/[0.02]">
                <div className="flex items-center gap-2 min-w-0">
                  <Home className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-[12px] truncate">{a.ambiente}{a.quant > 1 ? ` ×${a.quant}` : ""}</span>
                </div>
                <span className="text-[11px] text-muted-foreground shrink-0">{a.medidas.larguraParede} × {a.medidas.alturaParede} m</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-2">Cômodos · {p.comodos.length}</div>
          <div className="space-y-1.5 mb-5">
            {p.comodos.map((c, i) => (
              <div key={i} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-white/[0.02]">
                <div className="flex items-center gap-2 min-w-0">
                  <Home className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-[12px] truncate">{c.ambiente}</span>
                </div>
                <span className="text-[12px] stat shrink-0">{formatBRL(c.result.totalFinal)}</span>
              </div>
            ))}
            {p.comodos.length === 0 && <div className="text-[12px] text-muted-foreground">Sem detalhamento.</div>}
          </div>
        </>
      )}

      <div className="flex items-baseline justify-between border-t border-white/[0.05] pt-4">
        <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Total</span>
        <span className="text-[20px] font-medium stat text-gold">{formatBRL(p.valor)}</span>
      </div>

      <div className="flex flex-wrap gap-2 mt-5">
        <Link to="/proposta" search={{ id: p.id } as any} onClick={onClose} className="flex-1">
          <GoldButton className="w-full justify-center"><FileDown className="w-3.5 h-3.5" /> Ver / gerar PDF</GoldButton>
        </Link>
        <GoldButton variant="outline" onClick={() => { store.duplicateProposal(p.id); toast.success("Proposta duplicada"); onClose(); }} className="justify-center">
          <Copy className="w-3.5 h-3.5" /> Duplicar
        </GoldButton>
        <GoldButton variant="ghost" onClick={excluir} className="justify-center text-[oklch(0.72_0.14_25)]">
          <Trash2 className="w-3.5 h-3.5" /> Excluir
        </GoldButton>
      </div>
    </Modal>
  );
}

function IconBtn({ children, onClick, title }: any) {
  return (
    <button onClick={onClick} title={title} className="inline-flex items-center justify-center w-8 h-8 rounded-md hover:bg-white/[0.05] text-muted-foreground hover:text-foreground transition-colors">
      {children}
    </button>
  );
}
