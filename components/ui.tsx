import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

const cx = (...c: (string | false | undefined | null)[]) => c.filter(Boolean).join(" ");
export { cx };

// Numbers with %, $, signs or ranges get isolated so Arabic text never shows "%2.25" or "1.07M$".
const NUMERIC = /([+\-−]?\$?\d[\d.,]*(?:%|M|K)?(?:\s?[–×-]\s?\d[\d.,]*%?)?)/g;

export function Bidi({ children }: { children: string }) {
  const parts = children.split(NUMERIC);
  return (
    <>
      {parts.map((p, i) => (i % 2 === 1 ? <span key={i} className="ltr">{p}</span> : p))}
    </>
  );
}

type Tone = "neutral" | "accent" | "positive" | "negative" | "warning" | "gold";
const toneClass: Record<Tone, string> = {
  neutral: "bg-elevated text-ink-2",
  accent: "bg-accent-tint text-accent",
  positive: "bg-positive-tint text-positive",
  negative: "bg-negative-tint text-negative",
  warning: "bg-warning-tint text-warning",
  gold: "bg-gold-tint text-gold-strong",
};

export function Chip({ tone = "neutral", dot, children, className }: { tone?: Tone; dot?: boolean; children: ReactNode; className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 t-caption", toneClass[tone], className)}>
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

type BtnVariant = "primary" | "secondary" | "ghost";
const btnClass: Record<BtnVariant, string> = {
  primary: "bg-accent text-white hover:bg-accent-strong shadow-glow",
  secondary: "bg-surface text-ink border border-line-strong hover:bg-hover",
  ghost: "text-accent hover:bg-accent-tint",
};

export function Button({ variant = "primary", size = "md", icon, children, className, ...rest }: ComponentProps<"button"> & { variant?: BtnVariant; size?: "sm" | "md"; icon?: ReactNode }) {
  return (
    <button
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:opacity-50",
        size === "md" ? "h-10 px-4 t-small" : "h-8 px-3 t-caption",
        btnClass[variant],
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}

export function ButtonLink({ variant = "primary", size = "md", icon, children, className, href }: { variant?: BtnVariant; size?: "sm" | "md"; icon?: ReactNode; children: ReactNode; className?: string; href: string }) {
  return (
    <Link
      href={href}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors",
        size === "md" ? "h-10 px-4 t-small" : "h-8 px-3 t-caption",
        btnClass[variant],
        className,
      )}
    >
      {icon}
      {children}
    </Link>
  );
}

export function SectionHead({ title, sub, aside }: { title: string; sub?: string; aside?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <h2 className="t-h2">{title}</h2>
        {sub && <p className="t-small text-muted">{sub}</p>}
      </div>
      {aside}
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cx("relative h-6 w-10 shrink-0 rounded-full transition-colors", checked ? "bg-accent" : "bg-line-strong")}
    >
      <span className={cx("absolute top-0.5 size-5 rounded-full bg-white shadow transition-all", checked ? "start-[18px]" : "start-0.5")} />
    </button>
  );
}
