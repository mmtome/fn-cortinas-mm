import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Calculator, FolderOpen, FileText, Package } from "lucide-react";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/calculadora", label: "Calculadora", icon: Calculator },
  { to: "/registros", label: "Registros", icon: FolderOpen },
  { to: "/proposta", label: "Propostas", icon: FileText },
  { to: "/estoque", label: "Estoque", icon: Package },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  return (
    <div className="min-h-screen flex w-full">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 hidden md:flex flex-col gradient-navy border-r border-[oklch(0.78_0.13_85_/_0.12)]">
        <div className="px-6 py-7">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg gradient-gold flex items-center justify-center shadow-gold">
              <span className="font-serif text-xl text-[var(--navy-deep)] font-bold">F</span>
            </div>
            <div>
              <div className="font-serif text-lg leading-tight">FN Cortinas</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-gold">Atelier Premium</div>
            </div>
          </div>
        </div>

        <div className="px-4 mt-2">
          <div className="gold-divider" />
        </div>

        <nav className="flex-1 px-3 py-6 space-y-1">
          {nav.map(({ to, label, icon: Icon }) => {
            const active = pathname === to || (to !== "/" && pathname.startsWith(to));
            return (
              <Link
                key={to}
                to={to}
                className={`group flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all ${
                  active
                    ? "bg-[oklch(0.78_0.13_85_/_0.12)] text-gold border border-[oklch(0.78_0.13_85_/_0.25)]"
                    : "text-muted-foreground hover:text-foreground hover:bg-[oklch(0.78_0.13_85_/_0.06)]"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
                {active && <span className="ml-auto w-1 h-4 rounded-full gradient-gold" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-4">
          <div className="glass-soft rounded-xl p-4">
            <div className="text-[10px] uppercase tracking-[0.18em] text-gold mb-1">Sessão</div>
            <div className="text-sm font-medium">Visita Comercial</div>
            <div className="text-xs text-muted-foreground mt-1">Modo apresentação ativo</div>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <header className="md:hidden gradient-navy border-b border-border px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-md gradient-gold flex items-center justify-center">
            <span className="font-serif text-[var(--navy-deep)] font-bold">F</span>
          </div>
          <span className="font-serif">FN Cortinas</span>
        </header>
        <div className="p-6 md:p-10 max-w-[1500px] mx-auto animate-fade-in">{children}</div>
      </main>
    </div>
  );
}
