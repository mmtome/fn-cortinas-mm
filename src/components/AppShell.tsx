import { useEffect } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Calculator, FolderOpen, FileText, Package, SlidersHorizontal } from "lucide-react";
import { store } from "@/lib/store";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, short: "Início" },
  { to: "/calculadora", label: "Calculadora", icon: Calculator, short: "Calcular" },
  { to: "/registros", label: "Registros", icon: FolderOpen, short: "Registros" },
  { to: "/proposta", label: "Propostas", icon: FileText, short: "Propostas" },
  { to: "/estoque", label: "Estoque", icon: Package, short: "Estoque" },
  { to: "/ajustes", label: "Ajustes", icon: SlidersHorizontal, short: "Ajustes" },
] as const;

// Itens prioritários na barra inferior do mobile (Ajustes fica no header).
const mobileNav = nav.filter((n) => n.to !== "/ajustes");

function isActive(pathname: string, to: string) {
  return pathname === to || (to !== "/" && pathname.startsWith(to));
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  // Carrega dados salvos no navegador depois da hidratação.
  useEffect(() => {
    store.hydrate();
  }, []);

  return (
    <div className="min-h-screen flex w-full">
      {/* ===== Sidebar desktop ===== */}
      <aside className="w-60 shrink-0 hidden md:flex flex-col border-r border-white/[0.05] bg-[var(--sidebar)] sticky top-0 h-screen">
        <div className="px-6 py-7">
          <div className="flex items-center gap-2.5">
            <img src="/logo-fn.png" alt="FN Cortinas" className="w-9 h-9 object-contain" />
            <div className="text-[14px] font-medium tracking-tight">FN Cortinas</div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          {nav.map(({ to, label, icon: Icon }) => {
            const active = isActive(pathname, to);
            return (
              <Link
                key={to}
                to={to}
                className={`group relative flex items-center gap-3 px-3 py-2 rounded-md text-[13px] transition-all duration-150 ease-premium ${
                  active
                    ? "bg-white/[0.04] text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/[0.025] hover:translate-x-[1px]"
                }`}
              >
                <span
                  className={`absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[2px] rounded-r bg-[var(--gold)] transition-all duration-200 ease-premium ${
                    active ? "opacity-100 scale-y-100" : "opacity-0 scale-y-0"
                  }`}
                />
                <Icon className={`w-[15px] h-[15px] transition-colors ${active ? "text-gold" : ""}`} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="px-6 py-5 border-t border-white/[0.05]">
          <div className="text-[11px] text-muted-foreground">Atelier Premium</div>
          <div className="text-[11px] text-muted-foreground/60 mt-0.5">v1.1</div>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        {/* ===== Header mobile ===== */}
        <header className="md:hidden sticky top-0 z-30 border-b border-white/[0.05] bg-[var(--background)]/90 backdrop-blur-md px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/logo-fn.png" alt="FN Cortinas" className="w-7 h-7 object-contain" />
            <span className="text-[13px] font-medium">FN Cortinas</span>
          </div>
          <Link
            to="/ajustes"
            aria-label="Ajustes"
            className={`p-2 rounded-md transition-colors ${
              isActive(pathname, "/ajustes") ? "text-gold bg-white/[0.05]" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <SlidersHorizontal className="w-[18px] h-[18px]" />
          </Link>
        </header>

        <div
          key={pathname}
          className="px-4 sm:px-6 md:px-12 py-6 md:py-10 max-w-[1400px] mx-auto animate-fade-in pb-28 md:pb-10"
        >
          {children}
        </div>
      </main>

      {/* ===== Tab bar mobile ===== */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-white/[0.06] bg-[var(--background)]/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-5">
          {mobileNav.map(({ to, short, icon: Icon }) => {
            const active = isActive(pathname, to);
            return (
              <Link
                key={to}
                to={to}
                className={`flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] transition-colors ${
                  active ? "text-gold" : "text-muted-foreground"
                }`}
              >
                <Icon className={`w-[19px] h-[19px] ${active ? "text-gold" : ""}`} />
                <span className="leading-none">{short}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
