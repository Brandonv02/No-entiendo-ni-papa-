import type { ReactNode } from "react";

export function Ring({ value, max, size = 96, label }: { value: number; max: number; size?: number; label: string }) {
  const pct = Math.min(1, max ? value / max : 0);
  const r = 40;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg viewBox="0 0 100 100" width={size} height={size} className="-rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--color-amber-soft)" strokeWidth="12" />
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--color-amber)" strokeWidth="12" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} />
      </svg>
      <span className="absolute text-lg font-extrabold">{Math.round(pct * 100)}%</span>
    </div>
  );
}

export function Bar({ value, label }: { value: number | null; label: string }) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value === null ? undefined : Math.round(value * 100)}
      className="h-3 w-full overflow-hidden rounded-full bg-amber-soft"
    >
      <div className="h-full rounded-full bg-amber" style={{ width: `${Math.round((value ?? 0) * 100)}%` }} />
    </div>
  );
}

export function Loading({ text = "Cargando…" }: { text?: string }) {
  return (
    <p role="status" className="py-10 text-center font-semibold text-muted">
      {text}
    </p>
  );
}

export function ErrorBox({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  return (
    <div role="alert" className="card border-oops bg-oops-soft">
      <p className="font-bold text-oops">Algo falló al leer tus datos guardados.</p>
      <p className="mt-1 text-sm">{error.message}</p>
      <p className="mt-1 text-sm">Puede pasar en modo privado de Safari. Cierra y abre la app; si sigue, revisa Ajustes › Safari › Avanzado.</p>
      {onRetry && (
        <button type="button" className="btn btn-ghost mt-3" onClick={onRetry}>
          Reintentar
        </button>
      )}
    </div>
  );
}

export function Empty({ emoji, title, children }: { emoji: string; title: string; children?: ReactNode }) {
  return (
    <div className="card text-center">
      <p className="text-4xl" aria-hidden>
        {emoji}
      </p>
      <h2 className="mt-2 text-lg font-extrabold">{title}</h2>
      {children && <div className="mt-1 text-muted">{children}</div>}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="card">
      <p className="text-sm font-semibold text-muted">{label}</p>
      <p className="text-2xl font-extrabold">{value}</p>
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}
