import type { Lesson, Phrase, Unit, Vocab } from "@/lib/types";
import { units1to4 } from "./units-1-4";
import { units5to8 } from "./units-5-8";
import { units9to12 } from "./units-9-12";
import { EXPRESSIONS } from "./costa";

/** Versión del contenido: súbela cuando cambien lecciones para invalidar caché si hiciera falta. */
export const CONTENT_VERSION = 1;

export const UNITS: Unit[] = [...units1to4, ...units5to8, ...units9to12];
export const LESSONS: Lesson[] = UNITS.flatMap((u) => u.lessons);

export const lessonById = new Map(LESSONS.map((l) => [l.id, l]));
export const unitById = new Map(UNITS.map((u) => [u.id, u]));
export const vocabById = new Map<string, Vocab>(LESSONS.flatMap((l) => l.vocab.map((v) => [v.id, v] as const)));
export const phraseById = new Map<string, Phrase>(LESSONS.flatMap((l) => l.phrases.map((p) => [p.id, p] as const)));

export function nextLesson(id: string): Lesson | undefined {
  const i = LESSONS.findIndex((l) => l.id === id);
  return i >= 0 ? LESSONS[i + 1] : undefined;
}

/** Todas las frases en inglés reproducibles (para audio y descargas). */
export const ALL_PHRASES: Phrase[] = LESSONS.flatMap((l) => l.phrases);
export const TOTAL_ITEMS = LESSONS.reduce((n, l) => n + l.vocab.length + l.phrases.length, 0) + EXPRESSIONS.length;
