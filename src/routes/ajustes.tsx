import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Pencil, Trash2, Building2, SlidersHorizontal, RotateCcw, Shapes, Users } from "lucide-react";

import { PageHeader, GoldButton, Modal, Field, Switch, inputCls, selectCls } from "@/components/ui-kit";
import { useStore, store } from "@/lib/store";
import { useAuth, authStore, type Nivel, type Usuario } from "@/lib/auth";
import { DEFAULT_VARS, type ModeloItem, type Vars } from "@/lib/pricing-engine";
import { toast } from "sonner";

export const Route = createFileRoute("/ajustes")({ component: Ajustes });

type Tab = "empresa" | "modelos" | "variaveis" | "usuarios";

function Ajustes() {
  const [tab, setTab] = useState<Tab>("empresa");
  const { isAdmin } = useAuth();

  return (
    <>
      <PageHeader
        eyebrow="Configurações"
        title="Ajustes"
        subtitle="Modelos, cores, variáveis de preço e os dados da empresa. Os materiais ficam no Estoque."
      />

      <div className="flex gap-1 mb-7 overflow-x-auto -mx-1 px-1">
        <TabBtn active={tab === "empresa"} onClick={() => setTab("empresa")} icon={Building2}>Empresa</TabBtn>
        <TabBtn active={tab === "modelos"} onClick={() => setTab("modelos")} icon={Shapes}>Modelos e cores</TabBtn>
        <TabBtn active={tab === "variaveis"} onClick={() => setTab("variaveis")} icon={SlidersHorizontal}>Variáveis</TabBtn>
        {isAdmin && <TabBtn active={tab === "usuarios"} onClick={() => setTab("usuarios")} icon={Users}>Usuários</TabBtn>}
      </div>

      {tab === "empresa" && <EmpresaTab />}
      {tab === "modelos" && <div className="space-y-6"><ModelosTab /><CoresCard /></div>}
      {tab === "variaveis" && <VariaveisTab />}
      {tab === "usuarios" && isAdmin && <UsuariosTab />}
    </>
  );
}

function TabBtn({ active, onClick, icon: Icon, children }: any) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-[12px] whitespace-nowrap transition-colors ${
        active ? "bg-white/[0.06] text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-white/[0.03]"
      }`}
    >
      <Icon className="w-3.5 h-3.5" /> {children}
    </button>
  );
}

// =========================================================
// EMPRESA
// =========================================================
function EmpresaTab() {
  const empresa = useStore((s) => s.empresa);
  const [form, setForm] = useState(empresa);
  const setF = (patch: Partial<typeof empresa>) => setForm((f) => ({ ...f, ...patch }));

  const salvar = () => { store.updateEmpresa(form); toast.success("Dados da empresa salvos"); };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="surface rounded-2xl p-6">
        <div className="text-[13px] font-medium mb-1">Dados da empresa</div>
        <div className="text-[12px] text-muted-foreground mb-6">Aparecem no cabeçalho e rodapé do PDF enviado ao cliente.</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nome da empresa">
            <input className={inputCls} value={form.nome} onChange={(e) => setF({ nome: e.target.value })} placeholder="FN Cortinas" />
          </Field>
          <Field label="Slogan">
            <input className={inputCls} value={form.slogan} onChange={(e) => setF({ slogan: e.target.value })} placeholder="Cortinas sob medida · Alto padrão" />
          </Field>
          <Field label="Telefone">
            <input className={inputCls} value={form.telefone} onChange={(e) => setF({ telefone: e.target.value })} placeholder="(11) 99999-9999" />
          </Field>
          <Field label="WhatsApp (p/ QR Code)" hint="Número com DDD ou link (wa.me/…)">
            <input className={inputCls} value={form.whatsapp} onChange={(e) => setF({ whatsapp: e.target.value })} placeholder="https://wa.me/message/… ou 5534999999999" />
          </Field>
          <Field label="Instagram" hint="Link ou @usuario">
            <input className={inputCls} value={form.instagram} onChange={(e) => setF({ instagram: e.target.value })} placeholder="https://instagram.com/cortinasfn" />
          </Field>
          <Field label="E-mail">
            <input className={inputCls} value={form.email} onChange={(e) => setF({ email: e.target.value })} placeholder="contato@fncortinas.com.br" />
          </Field>
          <Field label="Site">
            <input className={inputCls} value={form.site} onChange={(e) => setF({ site: e.target.value })} placeholder="www.fncortinas.com.br" />
          </Field>
          <Field label="CNPJ">
            <input className={inputCls} value={form.cnpj} onChange={(e) => setF({ cnpj: e.target.value })} placeholder="00.000.000/0001-00" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Endereço">
              <input className={inputCls} value={form.endereco} onChange={(e) => setF({ endereco: e.target.value })} placeholder="Rua, número — bairro, cidade/UF" />
            </Field>
          </div>
        </div>
        <div className="flex justify-end mt-6">
          <GoldButton onClick={salvar}>Salvar dados</GoldButton>
        </div>
      </div>

      {/* Zona de dados de teste */}
      <div className="surface rounded-2xl p-6">
        <div className="text-[13px] font-medium mb-1">Dados de teste</div>
        <div className="text-[12px] text-muted-foreground mb-5">Zere o faturamento para acompanhar do zero durante os testes.</div>
        <div className="flex flex-wrap gap-2">
          <GoldButton
            variant="outline"
            onClick={() => { if (confirm("Zerar todas as propostas? O faturamento volta a zero.")) { store.limparPropostas(); toast.success("Propostas zeradas"); } }}
          >
            Zerar propostas (faturamento)
          </GoldButton>
          <GoldButton
            variant="ghost"
            onClick={() => { if (confirm("Restaurar os dados de exemplo (propostas, estoque, materiais e variáveis)?")) { store.resetData(); toast.success("Dados de exemplo restaurados"); } }}
          >
            Restaurar dados de exemplo
          </GoldButton>
        </div>
      </div>
    </div>
  );
}

// =========================================================
// CORES (lista global)
// =========================================================
function CoresCard() {
  const cores = useStore((s) => s.cores);
  const [nova, setNova] = useState("");
  const add = () => {
    const n = nova.trim();
    if (!n) return;
    if (cores.some((c) => c.toLowerCase() === n.toLowerCase())) { toast.error("Cor já cadastrada"); return; }
    store.addCor(n); setNova(""); toast.success("Cor adicionada");
  };
  return (
    <div className="surface rounded-2xl p-5 sm:p-6">
      <div className="text-[13px] font-medium mb-1">Cores <span className="text-muted-foreground">· {cores.length}</span></div>
      <div className="text-[12px] text-muted-foreground mb-4">Lista única — vale para todos os tecidos. Aparece na seleção da calculadora e no orçamento.</div>
      <div className="flex flex-wrap gap-2 mb-4">
        {cores.map((c) => (
          <span key={c} className="inline-flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06] text-[12px]">
            {c}
            <button onClick={() => { store.removeCor(c); toast.success("Cor removida"); }} aria-label={`Remover ${c}`} className="text-muted-foreground hover:text-[oklch(0.72_0.16_25)] leading-none text-[15px]">×</button>
          </span>
        ))}
        {cores.length === 0 && <div className="text-[12px] text-muted-foreground">Nenhuma cor cadastrada.</div>}
      </div>
      <div className="flex gap-2 max-w-sm">
        <input className={inputCls} value={nova} onChange={(e) => setNova(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="Ex: Areia" />
        <GoldButton variant="outline" onClick={add}><Plus className="w-3.5 h-3.5" /> Adicionar</GoldButton>
      </div>
    </div>
  );
}

// =========================================================
// USUÁRIOS (trava simples — não é segurança real)
// =========================================================
type UserForm = { nome: string; usuario: string; senha: string; nivel: Nivel };
const emptyUser: UserForm = { nome: "", usuario: "", senha: "", nivel: "Operador" };

function UsuariosTab() {
  const { usuarios, usuario: atual } = useAuth();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<UserForm>(emptyUser);

  const novo = () => { setEditId(null); setForm(emptyUser); setOpen(true); };
  const editar = (u: Usuario) => { setEditId(u.id); setForm({ nome: u.nome, usuario: u.usuario, senha: u.senha, nivel: u.nivel }); setOpen(true); };
  const salvar = () => {
    if (!form.nome.trim() || !form.usuario.trim() || !form.senha.trim()) { toast.error("Preencha nome, usuário e senha"); return; }
    if (authStore.usuarioExiste(form.usuario, editId ?? undefined)) { toast.error("Já existe um usuário com esse login"); return; }
    const dados = { nome: form.nome.trim(), usuario: form.usuario.trim(), senha: form.senha, nivel: form.nivel };
    if (editId) { authStore.updateUsuario(editId, dados); toast.success("Usuário atualizado"); }
    else { authStore.addUsuario(dados); toast.success("Usuário adicionado"); }
    setOpen(false);
  };
  const remover = (u: Usuario) => {
    if (!authStore.removeUsuario(u.id)) { toast.error("Precisa haver ao menos um Admin"); return; }
    toast.success("Usuário removido");
  };
  const setF = (patch: Partial<UserForm>) => setForm((f) => ({ ...f, ...patch }));

  return (
    <div className="max-w-2xl space-y-4">
      <div className="rounded-lg border border-[oklch(0.80_0.12_85_/_0.2)] bg-[oklch(0.80_0.12_85_/_0.04)] px-3 py-2.5 text-[11px] text-gold leading-relaxed">
        Trava de acesso local (ainda não é segurança real). Os níveis controlam o que cada um vê: <b>Admin</b> vê tudo; <b>Operador</b> não acessa os Ajustes.
      </div>
      <div className="surface rounded-2xl p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="text-[13px] font-medium">Usuários <span className="text-muted-foreground">· {usuarios.length}</span></div>
          <GoldButton variant="outline" onClick={novo}><Plus className="w-3.5 h-3.5" /> Adicionar</GoldButton>
        </div>
        <div className="space-y-1.5">
          {usuarios.map((u) => (
            <div key={u.id} className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg bg-white/[0.02]">
              <div className="min-w-0">
                <div className="text-[13px] truncate">{u.nome} {atual?.id === u.id && <span className="text-[10px] text-muted-foreground">(você)</span>}</div>
                <div className="text-[11px] text-muted-foreground">@{u.usuario} · {u.nivel}</div>
              </div>
              <div className="flex gap-1 shrink-0">
                <IconBtn onClick={() => editar(u)} label="Editar"><Pencil className="w-3.5 h-3.5" /></IconBtn>
                <IconBtn onClick={() => remover(u)} label="Excluir" danger><Trash2 className="w-3.5 h-3.5" /></IconBtn>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editId ? "Editar usuário" : "Novo usuário"}
        footer={<><GoldButton variant="ghost" onClick={() => setOpen(false)}>Cancelar</GoldButton><GoldButton onClick={salvar}>Salvar</GoldButton></>}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2"><Field label="Nome"><input autoFocus className={inputCls} value={form.nome} onChange={(e) => setF({ nome: e.target.value })} placeholder="Ex: Maria" /></Field></div>
          <Field label="Usuário (login)"><input className={inputCls} value={form.usuario} onChange={(e) => setF({ usuario: e.target.value })} placeholder="ex: maria" /></Field>
          <Field label="Senha"><input type="password" className={inputCls} value={form.senha} onChange={(e) => setF({ senha: e.target.value })} placeholder="••••••••" /></Field>
          <Field label="Nível"><select className={selectCls} value={form.nivel} onChange={(e) => setF({ nivel: e.target.value as Nivel })}><option>Admin</option><option>Operador</option></select></Field>
        </div>
      </Modal>
    </div>
  );
}

// =========================================================
// MODELOS
// =========================================================
type ModeloForm = { nome: string; usaCordao: boolean };
const emptyModelo: ModeloForm = { nome: "", usaCordao: false };

function ModelosTab() {
  const modelos = useStore((s) => s.modelos);
  const [open, setOpen] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [form, setForm] = useState<ModeloForm>(emptyModelo);

  const novo = () => { setEditIdx(null); setForm(emptyModelo); setOpen(true); };
  const editar = (m: ModeloItem, i: number) => {
    setEditIdx(i);
    setForm({ nome: m.nome, usaCordao: m.usaCordao });
    setOpen(true);
  };

  const salvar = () => {
    const nome = form.nome.trim();
    if (!nome) { toast.error("Informe o nome do modelo"); return; }
    const dup = modelos.some((m, i) => m.nome.toLowerCase() === nome.toLowerCase() && i !== editIdx);
    if (dup) { toast.error("Já existe um modelo com este nome"); return; }
    const item: ModeloItem = { nome, usaCordao: form.usaCordao };
    if (editIdx != null) { store.updateModelo(editIdx, item); toast.success("Modelo atualizado"); }
    else { store.addModelo(item); toast.success("Modelo adicionado"); }
    setOpen(false);
  };

  const remover = (i: number) => {
    if (modelos.length <= 1) { toast.error("Mantenha ao menos um modelo"); return; }
    store.removeModelo(i); toast.success("Removido");
  };

  return (
    <div className="max-w-2xl">
      <div className="surface rounded-2xl p-5 sm:p-6">
        <div className="flex items-center justify-between mb-1">
          <div className="text-[13px] font-medium">Modelos <span className="text-muted-foreground">· {modelos.length}</span></div>
          <GoldButton variant="outline" onClick={novo}><Plus className="w-3.5 h-3.5" /> Adicionar</GoldButton>
        </div>
        <div className="text-[12px] text-muted-foreground mb-4">Aparecem na lista de modelos da Calculadora. Modelos marcados com “usa cordão” somam o cordão no orçamento.</div>

        <div className="space-y-1.5">
          {modelos.map((m, i) => (
            <div key={i} className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
              <div className="min-w-0">
                <div className="text-[13px] truncate">{m.nome}</div>
                <div className="text-[11px] text-muted-foreground">{m.usaCordao ? "Com cordão" : "Sem cordão"}</div>
              </div>
              <div className="flex gap-1 shrink-0">
                <IconBtn onClick={() => editar(m, i)} label="Editar"><Pencil className="w-3.5 h-3.5" /></IconBtn>
                <IconBtn onClick={() => remover(i)} label="Excluir" danger><Trash2 className="w-3.5 h-3.5" /></IconBtn>
              </div>
            </div>
          ))}
          {modelos.length === 0 && <div className="text-[12px] text-muted-foreground py-3">Nenhum modelo cadastrado.</div>}
        </div>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editIdx != null ? "Editar modelo" : "Novo modelo"}
        footer={
          <>
            <GoldButton variant="ghost" onClick={() => setOpen(false)}>Cancelar</GoldButton>
            <GoldButton onClick={salvar}>Salvar</GoldButton>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Nome">
            <input autoFocus className={inputCls} value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} placeholder="Ex: Wave, Prega macho…" />
          </Field>
          <Field label="Usa cordão" hint="Some o cordão no orçamento (como o Wave)">
            <div className="h-[42px] flex items-center">
              <Switch checked={form.usaCordao} onChange={(v) => setForm((f) => ({ ...f, usaCordao: v }))} label={form.usaCordao ? "Sim" : "Não"} />
            </div>
          </Field>
        </div>
      </Modal>
    </div>
  );
}

// =========================================================
// VARIÁVEIS DE PREÇO
// =========================================================
type VarField = { key: keyof Vars; label: string; suf?: string; step?: number; pct?: boolean };
const GROUPS: { title: string; fields: VarField[] }[] = [
  {
    title: "Lucro",
    fields: [
      { key: "lucro", label: "Lucro base", pct: true },
    ],
  },
  {
    title: "Taxas do cartão (maquininha) · Pix e dinheiro = 0",
    fields: [
      { key: "taxaDebito", label: "Débito", pct: true },
      { key: "taxaCreditoVista", label: "Crédito à vista", pct: true },
      { key: "taxaParc2", label: "2x", pct: true },
      { key: "taxaParc3", label: "3x", pct: true },
      { key: "taxaParc4", label: "4x", pct: true },
      { key: "taxaParc5", label: "5x", pct: true },
      { key: "taxaParc6", label: "6x", pct: true },
      { key: "taxaParc7", label: "7x", pct: true },
      { key: "taxaParc8", label: "8x", pct: true },
      { key: "taxaParc9", label: "9x", pct: true },
      { key: "taxaParc10", label: "10x", pct: true },
      { key: "taxaParc11", label: "11x", pct: true },
      { key: "taxaParc12", label: "12x", pct: true },
    ],
  },
  {
    title: "Mão de obra e instalação",
    fields: [
      { key: "maoDeObraPorMetroTecido", label: "Mão de obra / m de tecido", suf: "R$" },
      { key: "instalacaoSemForro", label: "Instalação sem forro", suf: "R$" },
      { key: "instalacaoComForro", label: "Instalação com forro", suf: "R$" },
      { key: "fatorDificuldade", label: "Fator difícil", step: 0.1 },
      { key: "andaimeAlturaMin", label: "Altura p/ andaime", suf: "m", step: 0.1 },
      { key: "andaimeValor", label: "Adicional andaime", suf: "R$" },
      { key: "motorizadaValor", label: "Adicional motorizada", suf: "R$" },
    ],
  },
  {
    title: "Corte do tecido (rolo)",
    fields: [
      { key: "larguraRolo", label: "Largura do rolo", suf: "m", step: 0.05 },
      { key: "larguraUtilRolo", label: "Largura útil / alt. máx. em pé", suf: "m", step: 0.05 },
      { key: "bainhaLimite", label: "Dobra mínima (Caso A)", suf: "m", step: 0.05 },
      { key: "bainha", label: "Bainha cheia (cima+baixo)", suf: "m", step: 0.05 },
      { key: "forroSeparadoFator", label: "Forro separado (×)", step: 0.1 },
    ],
  },
  {
    title: "Consumo por metro de cortina",
    fields: [
      { key: "fatorTecido", label: "Franzido / Tecido (×)", step: 0.1 },
      { key: "fatorEntretela", label: "Entretela (×)", step: 0.1 },
      { key: "fatorCordao", label: "Cordão Wave (×)", step: 0.1 },
      { key: "rodiziosPorMetro", label: "Rodízios / m", step: 1 },
      { key: "fatorTrilho", label: "Trilho (×)", step: 0.1 },
    ],
  },
  {
    title: "Preços de acessórios",
    fields: [
      { key: "rodizio", label: "Rodízio (un)", suf: "R$", step: 0.01 },
      { key: "cordaoWavePorMetro", label: "Cordão Wave / m", suf: "R$" },
      { key: "entretelaPorMetro", label: "Entretela / m", suf: "R$" },
      { key: "trilhoSimplesPorMetro", label: "Trilho simples / m", suf: "R$" },
      { key: "trilhoDuploPorMetro", label: "Trilho duplo / m", suf: "R$" },
      { key: "varaoSuicoPorMetro", label: "Varão suíço / m", suf: "R$" },
    ],
  },
];

function VariaveisTab() {
  const vars = useStore((s) => s.vars);
  const [form, setForm] = useState<Vars>(vars);
  const setF = (k: keyof Vars, raw: string, pct?: boolean) => {
    const n = Number(raw);
    setForm((f) => ({ ...f, [k]: Number.isNaN(n) ? f[k] : pct ? n / 100 : n }));
  };

  const salvar = () => { store.updateVars(form); toast.success("Variáveis salvas"); };
  const resetar = () => { store.resetVars(); setForm({ ...DEFAULT_VARS }); toast.success("Variáveis restauradas"); };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div className="text-[12px] text-muted-foreground">As mudanças recalculam todos os orçamentos automaticamente.</div>
        <button onClick={resetar} className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors">
          <RotateCcw className="w-3 h-3" /> Restaurar padrão
        </button>
      </div>

      {GROUPS.map((g) => (
        <div key={g.title} className="surface rounded-2xl p-5 sm:p-6">
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-4">{g.title}</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {g.fields.map((f) => (
              <Field key={String(f.key)} label={f.label}>
                <div className="relative">
                  <input
                    type="number"
                    inputMode="decimal"
                    step={f.step ?? (f.pct ? 0.5 : 1)}
                    className={`${inputCls} ${f.suf || f.pct ? "pr-8" : ""}`}
                    value={f.pct ? +(form[f.key] * 100).toFixed(2) : form[f.key]}
                    onChange={(e) => setF(f.key, e.target.value, f.pct)}
                  />
                  {(f.suf || f.pct) && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground pointer-events-none">
                      {f.pct ? "%" : f.suf}
                    </span>
                  )}
                </div>
              </Field>
            ))}
          </div>
        </div>
      ))}

      <div className="flex justify-end sticky bottom-20 md:bottom-4">
        <GoldButton onClick={salvar}>Salvar variáveis</GoldButton>
      </div>
    </div>
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
