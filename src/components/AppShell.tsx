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
      <aside className="w-60 shrink-0 hidden md:flex flex-col border-r border-white/[0.05] bg-[var(--sidebar)]">
        <div className="px-6 py-7">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-[var(--gold)] flex items-center justify-center">
              <span className="text-[13px] font-semibold text-[var(--navy-deep)]">F</span>
            </div>
            <div className="text-[14px] font-medium tracking-tight">FN Cortinas</div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-2 space-y-0.5">
          {nav.map(({ to, label, icon: Icon }) => {
            const active = pathname === to || (to !== "/" && pathname.startsWith(to));
            return (
              <Link
                key={to}
                to={to}
                className={`group flex items-center gap-3 px-3 py-2 rounded-md text-[13px] transition-colors ${
                  active
                    ? "bg-white/[0.04] text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/[0.025]"
                }`}
              >
                <Icon className={`w-[15px] h-[15px] ${active ? "text-gold" : ""}`} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="px-6 py-5 border-t border-white/[0.05]">
          <div className="text-[11px] text-muted-foreground">Atelier Premium</div>
          <div className="text-[11px] text-muted-foreground/60 mt-0.5">v1.0 · Visita</div>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <header className="md:hidden border-b border-white/[0.05] px-4 py-3 flex items-center gap-2.5">
          <div className="w-6 h-6 rounded bg-[var(--gold)] flex items-center justify-center">
            <span className="text-[11px] font-semibold text-[var(--navy-deep)]">F</span>
          </div>
          <span className="text-[13px] font-medium">FN Cortinas</span>
        </header>
        <div className="px-8 md:px-12 py-10 max-w-[1400px] mx-auto animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}
