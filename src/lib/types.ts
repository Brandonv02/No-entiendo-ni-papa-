export type Level = "A1" | "A2" | "B1";
export type Skill = "listening" | "speaking" | "reading" | "writing";
export const SKILLS: Skill[] = ["listening", "speaking", "reading", "writing"];
export const SKILL_LABEL: Record<Skill, string> = {
  listening: "Escuchar",
  speaking: "Hablar",
  reading: "Leer",
  writing: "Escribir",
};

/** Palabra suelta con su traducción. */
export interface Vocab {
  id: string;
  en: string;
  es: string;
  /** Aviso de uso real vs. traducción literal. */
  note?: string;
}

/** Frase de ejemplo. */
export interface Phrase {
  id: string;
  en: string;
  es: string;
  /** Otras traducciones aceptadas al escribir en inglés. */
  altEn?: string[];
  /** Traducción literal (para contrastar con el uso real). */
  literal?: string;
  note?: string;
  /** Palabra que se oculta en el ejercicio de completar. Debe existir en `en`. */
  blank?: string;
  /** Opciones incorrectas para el hueco. */
  blankDistractors?: string[];
}

export interface DialogLine {
  speaker: string;
  en: string;
  es: string;
}

export interface Lesson {
  id: string;
  unitId: string;
  title: string;
  objective: string;
  vocab: Vocab[];
  phrases: Phrase[];
  grammar: { title: string; points: string[]; example?: string };
  dialog?: DialogLine[];
  writing: { prompt: string; hint: string; sample: string; keywords: string[] };
  /** Ids de frases para práctica oral. */
  speaking: string[];
}

export interface Unit {
  id: string;
  number: number;
  level: Level;
  title: string;
  emoji: string;
  blurb: string;
  lessons: Lesson[];
}

// ---------- Ejercicios ----------
export type ExerciseKind =
  | "choose-es" // inglés → elige el español
  | "choose-en" // español → elige el inglés
  | "listen" // escucha → elige lo que oíste
  | "order" // ordena palabras en inglés
  | "order-es" // ordena palabras en español
  | "cloze" // completa el hueco
  | "type-en"; // escribe en inglés

interface BaseExercise {
  id: string;
  kind: ExerciseKind;
  skill: Skill;
  /** Elemento de repaso (palabra o frase) que se actualiza con la respuesta. */
  itemId: string;
  prompt: string;
  /** Texto en inglés que se puede reproducir como audio. */
  speak?: string;
  explanation?: string;
}
export interface ChoiceExercise extends BaseExercise {
  kind: "choose-es" | "choose-en" | "listen" | "cloze";
  options: string[];
  answer: string;
  /** Frase con hueco para `cloze`. */
  sentence?: string;
}
export interface OrderExercise extends BaseExercise {
  kind: "order" | "order-es";
  tiles: string[];
  answer: string[];
}
export interface TypeExercise extends BaseExercise {
  kind: "type-en";
  accepted: string[];
}
export type Exercise = ChoiceExercise | OrderExercise | TypeExercise;

// ---------- Persistencia ----------
export interface SrsItem {
  id: string; // "w:<vocabId>" | "p:<phraseId>"
  kind: "word" | "phrase";
  correct: number;
  wrong: number;
  attempts: number;
  /** Nivel de dominio 0..5 */
  mastery: number;
  lastReview: number | null; // epoch ms
  due: string; // clave de fecha local YYYY-MM-DD
  streakCorrect: number;
}

export interface LessonRecord {
  lessonId: string;
  attempts: number;
  bestScore: number; // 0..1 evaluación final
  passed: boolean;
  completedAt: number | null;
  mistakes: string[]; // itemIds fallados en el último intento
}

export interface ActivityRow {
  id?: number;
  date: string; // fecha local YYYY-MM-DD
  ts: number;
  skill: Skill;
  correct: number;
  total: number;
  seconds: number;
  lessonId?: string;
}

export interface Settings {
  schemaVersion: number;
  onboarded: boolean;
  level: Level;
  /** guided: cada lección se desbloquea al aprobar la anterior. free: todo abierto. */
  pathMode: "guided" | "free";
  dailyGoal: number; // ejercicios respondidos por día
  slowSpeech: boolean;
  lastStudyDay?: string;
}
