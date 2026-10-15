/** Fecha local (no UTC) como YYYY-MM-DD. Es la base de racha y repasos. */
export function dayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Suma días a una clave de fecha usando calendario local (seguro con cambios de horario). */
export function addDays(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number) as [number, number, number];
  // Mediodía evita saltos por DST.
  return dayKey(new Date(y, m - 1, d + days, 12));
}

export function daysBetween(a: string, b: string): number {
  const pa = a.split("-").map(Number) as [number, number, number];
  const pb = b.split("-").map(Number) as [number, number, number];
  const ua = Date.UTC(pa[0], pa[1] - 1, pa[2]);
  const ub = Date.UTC(pb[0], pb[1] - 1, pb[2]);
  return Math.round((ub - ua) / 86_400_000);
}
