import { type ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-6 mb-8">
      <div>
        {eyebrow && (
          <div className="text-[10px] uppercase tracking-[0.25em] text-gold mb-2">{eyebrow}</div>
        )}
        <h1 className="font-serif text-4xl md:text-5xl">{title}</h1>
        {subtitle && <p className="text-muted-foreground mt-2 max-w-2xl">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`glass rounded-2xl p-6 hover-lift ${className}`}>{children}</div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="glass rounded-2xl p-6 hover-lift relative overflow-hidden">
      {accent && (
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full gradient-gold opacity-10 blur-3xl" />
      )}
      <div className="flex items-start justify-between mb-4">
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
        {icon && (
          <div className="w-9 h-9 rounded-lg bg-[oklch(0.78_0.13_85_/_0.1)] flex items-center justify-center text-gold">
            {icon}
          </div>
        )}
      </div>
      <div className="font-serif text-3xl">{value}</div>
      {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Rascunho: "bg-[oklch(0.45_0.02_260_/_0.3)] text-muted-foreground border-[oklch(0.5_0.02_260_/_0.4)]",
    Enviado: "bg-[oklch(0.55_0.1_262_/_0.2)] text-[oklch(0.78_0.1_262)] border-[oklch(0.55_0.1_262_/_0.4)]",
    Aprovado: "bg-[oklch(0.78_0.13_85_/_0.15)] text-gold border-[oklch(0.78_0.13_85_/_0.4)]",
    Perdido: "bg-[oklch(0.5_0.18_25_/_0.15)] text-[oklch(0.75_0.18_25)] border-[oklch(0.5_0.18_25_/_0.4)]",
    disponivel: "bg-[oklch(0.6_0.15_150_/_0.15)] text-[oklch(0.8_0.15_150)] border-[oklch(0.6_0.15_150_/_0.4)]",
    baixo: "bg-[oklch(0.78_0.13_85_/_0.15)] text-gold border-[oklch(0.78_0.13_85_/_0.4)]",
    indisponivel: "bg-[oklch(0.5_0.18_25_/_0.15)] text-[oklch(0.75_0.18_25)] border-[oklch(0.5_0.18_25_/_0.4)]",
  };
  const labels: Record<string, string> = {
    disponivel: "Disponível",
    baixo: "Baixo estoque",
    indisponivel: "Indisponível",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium border ${
        styles[status] ?? styles.Rascunho
      }`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {labels[status] ?? status}
    </span>
  );
}

export function GoldButton({
  children,
  onClick,
  type = "button",
  variant = "primary",
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: "primary" | "ghost" | "outline";
  className?: string;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all";
  const styles = {
    primary:
      "gradient-gold text-[var(--navy-deep)] shadow-gold hover:opacity-95 hover:scale-[1.02]",
    ghost: "text-gold hover:bg-[oklch(0.78_0.13_85_/_0.1)]",
    outline:
      "border border-[oklch(0.78_0.13_85_/_0.4)] text-gold hover:bg-[oklch(0.78_0.13_85_/_0.08)]",
  };
  return (
    <button type={type} onClick={onClick} className={`${base} ${styles[variant]} ${className}`}>
      {children}
    </button>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
        {label}
      </div>
      {children}
      {hint && <div className="text-[11px] text-muted-foreground mt-1">{hint}</div>}
    </label>
  );
}

export const inputCls =
  "w-full bg-[oklch(0.2_0.04_260_/_0.6)] border border-[oklch(0.78_0.13_85_/_0.18)] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-gold focus:ring-2 focus:ring-[oklch(0.78_0.13_85_/_0.25)] transition-all";
