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
  | "type-en" // escribe en inglés
  // --- Expresiones contextuales ("De la Costa pa'l mundo") ---
  | "scenario" // elige la respuesta natural en una situación
  | "intent" // escucha/lee una frase y reconoce su intención
  | "convo" // completa una conversación
  | "fix" // corrige un error frecuente de hispanohablantes
  | "register" // formal o informal según la situación
  | "recall" // recuerda la expresión sin ver la traducción
  | "explain"; // explica una expresión en inglés sencillo

interface BaseExercise {
  id: string;
  kind: ExerciseKind;
  skill: Skill;
  /** Elemento de repaso (palabra o frase) que se actualiza con la respuesta. */
  itemId: string;
  prompt: string;
  /** Texto en inglés que se puede reproducir como audio. */
  speak?: string;
  /** Id del audio si no coincide con el itemId (p. ej. expresiones). */
  audioId?: string;
  explanation?: string;
  /** Situación o contexto que se muestra sobre las opciones. */
  context?: string;
  /** Pista opcional que el usuario puede pedir antes de responder. */
  hint?: string;
}
export interface ChoiceExercise extends BaseExercise {
  kind: "choose-es" | "choose-en" | "listen" | "cloze" | "scenario" | "intent" | "convo" | "fix" | "register";
  options: string[];
  answer: string;
  /** Por qué falla cada opción incorrecta (retroalimentación específica). */
  optionFeedback?: Record<string, string>;
  /** Frase con hueco para `cloze`. */
  sentence?: string;
}
export interface OrderExercise extends BaseExercise {
  kind: "order" | "order-es";
  tiles: string[];
  answer: string[];
}
export interface TypeExercise extends BaseExercise {
  kind: "type-en" | "recall" | "explain";
  accepted: string[];
  /** "exact": frase completa en inglés. "keywords": basta con que contenga alguna palabra clave. */
  match?: "exact" | "keywords";
  /** Respuesta modelo que se muestra al terminar. */
  model?: string;
}
export type Exercise = ChoiceExercise | OrderExercise | TypeExercise;

// ---------- Persistencia ----------
export interface SrsItem {
  id: string; // "w:<vocabId>" | "p:<phraseId>"
  kind: "word" | "phrase" | "expr";
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

// ---------- Módulo «De la Costa pa'l mundo» ----------
export type Register = "informal" | "neutral" | "formal";

export interface Equivalent {
  en: string;
  register: Register;
  /** Matiz: cuándo suena mejor esta opción. */
  nuance: string;
}

/**
 * Una expresión del español costeño/colombiano y varias formas naturales de comunicar
 * la MISMA INTENCIÓN en inglés. Añadir expresiones = añadir datos; el motor no cambia.
 */
export interface Expression {
  id: string;
  category: string;
  level: 1 | 2 | 3;
  es: string;
  /** Qué quiere decir en realidad (intención, no traducción literal). */
  meaning: string;
  situation: string;
  register: Register;
  equivalents: Equivalent[];
  examples: Array<{ en: string; es: string }>;
  scenario: {
    situation: string;
    answer: { en: string; why: string };
    wrong: Array<{ en: string; why: string }>;
  };
  /** Línea que te dicen y la respuesta natural (ejercicio «completa la conversación»). */
  exchange: { a: string; b: string };
  produce: { prompt: string; accepted: string[] };
  explain: { sample: string; keywords: string[] };
  mistakes?: Array<{ wrong: string; right: string; why: string }>;
  /** Para el ejercicio formal/informal. `ask` indica cuál hay que elegir. */
  registerPair?: { situation: string; informal: string; formal: string; ask: "formal" | "informal" };
}

export interface CostaCategory {
  id: string;
  title: string;
  emoji: string;
  blurb: string;
}

export type ConvQuality = "great" | "ok" | "weak";
export interface ConvOption {
  en: string;
  es: string;
  quality: ConvQuality;
  /** Por qué funciona (o no) esta respuesta. */
  why: string;
  /** Forma más natural, si la elegida no lo es. */
  better?: string;
  next: string;
  kind?: "answer" | "question" | "repeat";
}
export interface ConvNode {
  npc: { en: string; es: string };
  options?: ConvOption[];
  /** Nodo final: resumen en español. */
  end?: string;
}
export interface Conversation {
  id: string;
  title: string;
  emoji: string;
  category: string;
  npcName: string;
  scene: string;
  start: string;
  nodes: Record<string, ConvNode>;
}
