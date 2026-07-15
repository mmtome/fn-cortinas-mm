import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

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
    <div className="flex items-end justify-between gap-6 mb-12">
      <div>
        {eyebrow && (
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-3">
            {eyebrow}
          </div>
        )}
        <h1 className="text-[28px] font-medium tracking-tight">{title}</h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-2 max-w-xl leading-relaxed">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({
  children,
  className = "",
  interactive = false,
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
}) {
  return (
    <div className={`surface rounded-xl p-6 ${interactive ? "surface-hover" : ""} ${className}`}>{children}</div>
  );
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="surface surface-hover rounded-xl p-5">
      <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
      <div key={value} className="text-[22px] font-medium tracking-tight mt-3 stat animate-value">{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground mt-1.5">{hint}</div>}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Pendente: "text-[oklch(0.78_0.06_250)] bg-[oklch(0.5_0.08_250_/_0.12)]",
    Rascunho: "text-muted-foreground bg-white/[0.04]",
    Enviado: "text-[oklch(0.78_0.06_250)] bg-[oklch(0.5_0.08_250_/_0.12)]",
    Aprovado: "text-gold bg-[oklch(0.80_0.10_88_/_0.08)]",
    Perdido: "text-[oklch(0.72_0.14_25)] bg-[oklch(0.5_0.16_25_/_0.10)]",
    disponivel: "text-[oklch(0.78_0.10_150)] bg-[oklch(0.55_0.12_150_/_0.10)]",
    baixo: "text-gold bg-[oklch(0.80_0.10_88_/_0.08)]",
    indisponivel: "text-[oklch(0.72_0.14_25)] bg-[oklch(0.5_0.16_25_/_0.10)]",
  };
  const labels: Record<string, string> = {
    disponivel: "Disponível",
    baixo: "Baixo",
    indisponivel: "Indisponível",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${
        styles[status] ?? styles.Rascunho
      }`}
    >
      <span className="w-1 h-1 rounded-full bg-current" />
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
    "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md text-[13px] font-medium btn-press select-none";
  const styles = {
    primary:
      "bg-[var(--gold)] text-[var(--navy-deep)] hover:bg-[var(--gold-soft)] hover:shadow-[0_6px_20px_-8px_oklch(0.80_0.10_88_/_0.55)]",
    ghost: "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]",
    outline:
      "border border-white/10 text-foreground hover:bg-white/[0.04] hover:border-white/20",
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
      <div className="text-[11px] text-muted-foreground mb-2">{label}</div>
      {children}
      {hint && <div className="text-[11px] text-muted-foreground mt-1">{hint}</div>}
    </label>
  );
}

export const inputCls =
  "w-full bg-white/[0.03] border border-white/[0.06] rounded-md px-3 py-2.5 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[oklch(0.80_0.10_88_/_0.4)] focus:bg-white/[0.04] focus-ring transition-[border-color,background-color,box-shadow] duration-150 ease-premium";

// Input numérico com buffer de texto próprio: permite apagar o dígito e digitar
// outro (o input controlado por número forçava o valor de volta ao limpar).
// Só grava valores válidos; ao sair do campo, aplica o mínimo/máximo.
export function NumberInput({
  value,
  onChange,
  min,
  max,
  step,
  integer = false,
  className = inputCls,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  integer?: boolean;
  className?: string;
}) {
  const [str, setStr] = useState(String(value));
  const [focused, setFocused] = useState(false);
  // Ressincroniza quando o valor muda de fora e o campo não está em edição.
  if (!focused && str !== String(value)) setStr(String(value));

  const clamp = (n: number) => {
    if (min != null) n = Math.max(min, n);
    if (max != null) n = Math.min(max, n);
    return n;
  };
  const parse = (raw: string) => (integer ? parseInt(raw, 10) : parseFloat(raw));

  return (
    <input
      type="number"
      inputMode={integer ? "numeric" : "decimal"}
      min={min}
      max={max}
      step={step}
      className={className}
      value={str}
      onFocus={() => setFocused(true)}
      onChange={(e) => {
        const raw = e.target.value;
        setStr(raw);
        if (raw !== "") {
          const n = parse(raw);
          if (!Number.isNaN(n)) onChange(clamp(n));
        }
      }}
      onBlur={() => {
        setFocused(false);
        const n = parse(str);
        const val = Number.isNaN(n) ? (min ?? 0) : clamp(n);
        setStr(String(val));
        onChange(val);
      }}
    />
  );
}

// Native <select> styled to match the brand: dark popup, light text, gold chevron.
// `color-scheme: dark` ensures the browser native option list uses dark surface.
export const selectCls =
  "w-full appearance-none bg-white/[0.03] border border-white/[0.06] rounded-md pl-3 pr-9 py-2.5 text-[13px] text-foreground focus:outline-none focus:border-[oklch(0.80_0.10_88_/_0.4)] focus:bg-white/[0.04] focus-ring transition-[border-color,background-color,box-shadow] duration-150 ease-premium cursor-pointer " +
  "[color-scheme:dark] " +
  "[&>option]:bg-[var(--navy-deep)] [&>option]:text-foreground [&>option]:py-2 " +
  "bg-no-repeat bg-[right_0.75rem_center] bg-[length:10px_10px] " +
  "bg-[image:url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 10'><path d='M2 4l3 3 3-3' fill='none' stroke='%23c9a84c' stroke-width='1.2' stroke-linecap='round' stroke-linejoin='round'/></svg>\")]";

export function Select({
  value,
  onChange,
  children,
  className = "",
}: {
  value: string | number;
  onChange: (v: string) => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${selectCls} ${className}`}
      >
        {children}
      </select>
    </div>
  );
}

// Switch — toggle on/off acessível e com boa área de toque.
export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-3 select-none btn-press"
    >
      <span
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ease-premium ${
          checked ? "bg-[var(--gold)]" : "bg-white/[0.10]"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ease-premium ${
            checked ? "translate-x-[22px]" : "translate-x-[2px]"
          }`}
        />
      </span>
      {label && <span className="text-[13px]">{label}</span>}
    </button>
  );
}

// Modal — diálogo central no desktop, bottom-sheet no mobile.
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div className="relative w-full sm:max-w-lg max-h-[90vh] overflow-y-auto surface-flat rounded-t-2xl sm:rounded-2xl border border-white/[0.08] shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.05] sticky top-0 bg-[var(--navy-deep)]/95 backdrop-blur-md z-10">
          <h3 className="text-[15px] font-medium tracking-tight">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/[0.05] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && (
          <div className="px-6 py-4 border-t border-white/[0.05] flex justify-end gap-2 sticky bottom-0 bg-[var(--navy-deep)]/95 backdrop-blur-md">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

// Stable date formatter — avoids SSR hydration mismatches from locale.
export function formatDate(iso: string) {
  const [y, m, d] = iso.split("-");
  const months = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return `${d} ${months[Number(m) - 1]} ${y}`;
}
