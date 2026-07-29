import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Calculator, FolderOpen, FileText, Package, SlidersHorizontal, LogOut, Sun, Moon, Cloud, CloudOff, RefreshCw } from "lucide-react";
import { store } from "@/lib/store";
import { useAuth, authStore } from "@/lib/auth";
import { LoginScreen } from "@/components/LoginScreen";
import { registerSW } from "@/lib/pwa";
import { initSync, useSyncStatus } from "@/lib/sync/engine";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, short: "Início" },
  { to: "/calculadora", label: "Calculadora", icon: Calculator, short: "Calcular" },
  { to: "/registros", label: "Registros", icon: FolderOpen, short: "Registros" },
  { to: "/proposta", label: "Propostas", icon: FileText, short: "Propostas" },
  { to: "/estoque", label: "Estoque", icon: Package, short: "Estoque" },
  { to: "/ajustes", label: "Ajustes", icon: SlidersHorizontal, short: "Ajustes", adminOnly: true },
] as const;

function isActive(pathname: string, to: string) {
  return pathname === to || (to !== "/" && pathname.startsWith(to));
}

/** Indicador de conexão + fila de sincronização. */
function SyncBadge({ compact = false }: { compact?: boolean }) {
  const { online, pending, syncing } = useSyncStatus();
  const Icon = syncing ? RefreshCw : online ? Cloud : CloudOff;
  const cor = !online ? "text-amber-400" : pending > 0 ? "text-gold" : "text-muted-foreground";
  const titulo = !online
    ? `Offline — ${pending} alteração(ões) na fila, sincroniza ao reconectar`
    : pending > 0
      ? `${pending} alteração(ões) pendentes de sincronização`
      : "Tudo sincronizado";
  return (
    <span className={`inline-flex items-center gap-1.5 ${cor}`} title={titulo} aria-label={titulo}>
      <Icon className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
      {!compact && (
        <span className="text-[11px] leading-none">
          {!online ? "Offline" : pending > 0 ? `${pending} p/ enviar` : "Sincronizado"}
        </span>
      )}
      {compact && pending > 0 && (
        <span className="text-[10px] leading-none tabular-nums">{pending}</span>
      )}
    </span>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const { usuario, isAdmin } = useAuth();

  // Carrega dados salvos no navegador depois da hidratação.
  useEffect(() => {
    store.hydrate();
    registerSW();   // PWA offline
    initSync();     // fila de sincronização (offline-first)
    const t = (localStorage.getItem("fn-cortinas:theme") === "light" ? "light" : "dark") as "dark" | "light";
    setTheme(t);
    document.documentElement.setAttribute("data-theme", t);
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    const t = theme === "dark" ? "light" : "dark";
    setTheme(t);
    document.documentElement.setAttribute("data-theme", t);
    try { localStorage.setItem("fn-cortinas:theme", t); } catch { /* ignora */ }
  };

  // Evita flash de hidratação (server não conhece a sessão do navegador).
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--navy-deep)]">
        <img src="/logo-fn.png" alt="" className="w-14 h-14 object-contain opacity-80 animate-pulse" />
      </div>
    );
  }

  if (!usuario) return <LoginScreen />;

  const visibleNav = nav.filter((n) => !("adminOnly" in n && n.adminOnly) || isAdmin);
  const mobileNav = visibleNav.filter((n) => n.to !== "/ajustes");

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
          {visibleNav.map(({ to, label, icon: Icon }) => {
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

        <div className="px-4 py-4 border-t border-white/[0.05]">
          <div className="px-2 pb-3">
            <SyncBadge />
          </div>
          <div className="flex items-center justify-between gap-2 px-2">
            <div className="min-w-0">
              <div className="text-[12px] font-medium truncate">{usuario.nome}</div>
              <div className="text-[10px] text-muted-foreground">{usuario.nivel}</div>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/[0.05] transition-colors"
                aria-label="Alternar tema" title={theme === "dark" ? "Modo claro" : "Modo escuro"}
              >
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <button
                onClick={() => authStore.logout()}
                className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/[0.05] transition-colors"
                aria-label="Sair" title="Sair"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        {/* ===== Header mobile ===== */}
        <header className="md:hidden sticky top-0 z-30 border-b border-white/[0.05] bg-[var(--background)]/90 backdrop-blur-md px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/logo-fn.png" alt="FN Cortinas" className="w-7 h-7 object-contain" />
            <span className="text-[13px] font-medium">FN Cortinas</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="px-1.5"><SyncBadge compact /></span>
            <button onClick={toggleTheme} aria-label="Alternar tema" className="p-2 rounded-md text-muted-foreground hover:text-foreground transition-colors">
              {theme === "dark" ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
            </button>
            {isAdmin && (
              <Link
                to="/ajustes"
                aria-label="Ajustes"
                className={`p-2 rounded-md transition-colors ${
                  isActive(pathname, "/ajustes") ? "text-gold bg-white/[0.05]" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <SlidersHorizontal className="w-[18px] h-[18px]" />
              </Link>
            )}
            <button onClick={() => authStore.logout()} aria-label="Sair" className="p-2 rounded-md text-muted-foreground hover:text-foreground transition-colors">
              <LogOut className="w-[18px] h-[18px]" />
            </button>
          </div>
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
        <div className="grid" style={{ gridTemplateColumns: `repeat(${mobileNav.length}, minmax(0, 1fr))` }}>
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
