import { addDays } from "./dates";

/**
 * Racha diaria: días consecutivos con actividad, usando fechas locales.
 * Si hoy todavía no hay actividad pero ayer sí, la racha sigue viva (aún puedes salvarla hoy).
 */
export function computeStreak(activeDays: Iterable<string>, today: string): { current: number; best: number; doneToday: boolean } {
  const set = new Set(activeDays);
  const doneToday = set.has(today);

  let cursor = doneToday ? today : addDays(today, -1);
  let current = 0;
  while (set.has(cursor)) {
    current++;
    cursor = addDays(cursor, -1);
  }

  const sorted = [...set].sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of sorted) {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return { current, best, doneToday };
}
