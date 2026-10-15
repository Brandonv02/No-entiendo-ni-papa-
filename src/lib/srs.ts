import { addDays, daysBetween } from "./dates";
import type { SrsItem } from "./types";

/**
 * Repaso espaciado basado en reglas locales (NO es inteligencia artificial).
 *
 * - Cada palabra/frase tiene un nivel de dominio 0..5.
 * - Acierto: sube 1 nivel; el próximo repaso es en INTERVALS_DAYS[nivel] días.
 * - Error: baja `wrongDrop` niveles (mínimo 0) y vuelve a tocar HOY.
 * - Prioridad al elegir qué repasar = días de retraso + errorWeight × tasa de error
 *   + bonus por nivel bajo. Así lo que más fallas sale primero.
 * Todos los parámetros se pueden cambiar pasando un SrsConfig distinto.
 */
export interface SrsConfig {
  intervalsDays: number[]; // índice = nivel de dominio alcanzado
  wrongDrop: number;
  maxMastery: number;
  errorWeight: number;
  learnedAtMastery: number; // nivel desde el que se considera "aprendida"
}

export const DEFAULT_SRS: SrsConfig = {
  intervalsDays: [0, 1, 2, 4, 8, 16],
  wrongDrop: 2,
  maxMastery: 5,
  errorWeight: 5,
  learnedAtMastery: 3,
};

export function newItem(id: string, today: string): SrsItem {
  return {
    id,
    kind: id.startsWith("w:") ? "word" : "phrase",
    correct: 0,
    wrong: 0,
    attempts: 0,
    mastery: 0,
    lastReview: null,
    due: today,
    streakCorrect: 0,
  };
}

export function applyReview(
  item: SrsItem,
  correct: boolean,
  now: Date,
  today: string,
  cfg: SrsConfig = DEFAULT_SRS,
): SrsItem {
  const next: SrsItem = { ...item, attempts: item.attempts + 1, lastReview: now.getTime() };
  if (correct) {
    next.correct += 1;
    next.streakCorrect += 1;
    next.mastery = Math.min(cfg.maxMastery, item.mastery + 1);
    const interval = cfg.intervalsDays[next.mastery] ?? cfg.intervalsDays[cfg.intervalsDays.length - 1] ?? 1;
    next.due = addDays(today, interval);
  } else {
    next.wrong += 1;
    next.streakCorrect = 0;
    next.mastery = Math.max(0, item.mastery - cfg.wrongDrop);
    next.due = today;
  }
  return next;
}

export function isDue(item: SrsItem, today: string): boolean {
  return item.attempts > 0 && item.due <= today;
}

export function priority(item: SrsItem, today: string, cfg: SrsConfig = DEFAULT_SRS): number {
  const overdue = Math.max(0, daysBetween(item.due, today));
  const errorRate = item.attempts ? item.wrong / item.attempts : 0;
  return overdue + cfg.errorWeight * errorRate + (cfg.maxMastery - item.mastery) * 0.5;
}

/** Elementos pendientes, los más urgentes primero. */
export function pickDue(items: SrsItem[], today: string, limit: number, cfg: SrsConfig = DEFAULT_SRS): SrsItem[] {
  return items
    .filter((i) => isDue(i, today))
    .sort((a, b) => priority(b, today, cfg) - priority(a, today, cfg) || a.id.localeCompare(b.id))
    .slice(0, limit);
}

export function isLearned(item: SrsItem, cfg: SrsConfig = DEFAULT_SRS): boolean {
  return item.mastery >= cfg.learnedAtMastery;
}
