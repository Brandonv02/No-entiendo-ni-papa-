import type {
  ChoiceExercise,
  Exercise,
  Lesson,
  OrderExercise,
  Phrase,
  SrsItem,
  TypeExercise,
  Vocab,
} from "./types";

// ---------- Utilidades de texto ----------
/** Minúsculas, comillas tipográficas → ASCII, sin puntuación, espacios colapsados. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’´`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\p{L}\p{N}'\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Contracciones frecuentes para aceptar "I am" = "I'm" al escribir. */
const CONTRACTIONS: Array<[RegExp, string]> = [
  [/\bi am\b/g, "i'm"],
  [/\byou are\b/g, "you're"],
  [/\bhe is\b/g, "he's"],
  [/\bshe is\b/g, "she's"],
  [/\bit is\b/g, "it's"],
  [/\bwe are\b/g, "we're"],
  [/\bthey are\b/g, "they're"],
  [/\bdo not\b/g, "don't"],
  [/\bdoes not\b/g, "doesn't"],
  [/\bis not\b/g, "isn't"],
  [/\bare not\b/g, "aren't"],
  [/\bi do not\b/g, "i don't"],
  [/\bwhat is\b/g, "what's"],
  [/\bwhere is\b/g, "where's"],
  [/\bthat is\b/g, "that's"],
  [/\bcan not\b/g, "can't"],
];
export function canonical(text: string): string {
  let t = normalize(text);
  for (const [re, rep] of CONTRACTIONS) t = t.replace(re, rep);
  return t;
}

export function sameEnglish(a: string, b: string): boolean {
  return canonical(a) === canonical(b);
}

// ---------- Azar con semilla (resultados reproducibles) ----------
function hash(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}
export function rng(seed: string): () => number {
  let a = hash(seed);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function shuffle<T>(arr: readonly T[], seed: string): T[] {
  const r = rng(seed);
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}

function pickDistractors(answer: string, candidates: string[], n: number, seed: string): string[] {
  const uniq = [...new Set(candidates.filter((c) => normalize(c) !== normalize(answer)))];
  return shuffle(uniq, seed).slice(0, n);
}

// ---------- Constructores de ejercicios ----------
export interface Pools {
  vocab: Vocab[];
  phrases: Phrase[];
}

function chooseEs(v: Vocab, pools: Pools, seed: string): ChoiceExercise {
  const options = shuffle([v.es, ...pickDistractors(v.es, pools.vocab.map((x) => x.es), 3, seed + v.id)], seed + "o" + v.id);
  return {
    id: `choose-es:w:${v.id}`,
    kind: "choose-es",
    skill: "reading",
    itemId: `w:${v.id}`,
    prompt: `¿Qué significa «${v.en}»?`,
    speak: v.en,
    options,
    answer: v.es,
    explanation: v.note ? `${v.en} = ${v.es}. ${v.note}` : `${v.en} = ${v.es}`,
  };
}

function chooseEn(v: Vocab, pools: Pools, seed: string): ChoiceExercise {
  const options = shuffle([v.en, ...pickDistractors(v.en, pools.vocab.map((x) => x.en), 3, seed + v.id)], seed + "o" + v.id);
  return {
    id: `choose-en:w:${v.id}`,
    kind: "choose-en",
    skill: "reading",
    itemId: `w:${v.id}`,
    prompt: `¿Cómo se dice «${v.es}» en inglés?`,
    options,
    answer: v.en,
    explanation: v.note ? `${v.es} = ${v.en}. ${v.note}` : `${v.es} = ${v.en}`,
  };
}

function listen(p: Phrase, pools: Pools, seed: string): ChoiceExercise {
  const options = shuffle([p.en, ...pickDistractors(p.en, pools.phrases.map((x) => x.en), 3, seed + p.id)], seed + "o" + p.id);
  return {
    id: `listen:p:${p.id}`,
    kind: "listen",
    skill: "listening",
    itemId: `p:${p.id}`,
    prompt: "Escucha y elige lo que oíste",
    speak: p.en,
    options,
    answer: p.en,
    explanation: `${p.en} = ${p.es}`,
  };
}

/** Coincidencia de palabra completa (evita que «is» coincida dentro de «This»). */
export function blankRegex(word: string): RegExp {
  const esc = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![\\p{L}'])${esc}(?![\\p{L}'])`, "iu");
}

function cloze(p: Phrase, pools: Pools, seed: string): ChoiceExercise | null {
  if (!p.blank) return null;
  const m = blankRegex(p.blank).exec(p.en);
  if (!m) return null;
  const sentence = p.en.slice(0, m.index) + "_____" + p.en.slice(m.index + m[0].length);
  const fallback = pools.vocab.map((v) => v.en).filter((w) => !w.includes(" "));
  const own = pickDistractors(p.blank, p.blankDistractors ?? [], 3, seed + p.id);
  const extra = pickDistractors(p.blank, fallback.filter((w) => !own.includes(w)), 3 - own.length, seed + "x" + p.id);
  const options = shuffle([p.blank, ...own, ...extra], seed + "c" + p.id);
  return {
    id: `cloze:p:${p.id}`,
    kind: "cloze",
    skill: "reading",
    itemId: `p:${p.id}`,
    prompt: `Completa: ${p.es}`,
    sentence,
    speak: p.en,
    options,
    answer: p.blank,
    explanation: `${p.en} = ${p.es}`,
  };
}

function order(p: Phrase, seed: string): OrderExercise {
  const answer = p.en.split(/\s+/);
  return {
    id: `order:p:${p.id}`,
    kind: "order",
    skill: "writing",
    itemId: `p:${p.id}`,
    prompt: `Ordena las palabras: «${p.es}»`,
    speak: p.en,
    tiles: ensureDifferent(answer, seed + p.id),
    answer,
    explanation: p.literal ? `${p.en} (literal: «${p.literal}»)` : p.en,
  };
}

function orderEs(p: Phrase, seed: string): OrderExercise {
  const answer = p.es.split(/\s+/);
  return {
    id: `order-es:p:${p.id}`,
    kind: "order-es",
    skill: "reading",
    itemId: `p:${p.id}`,
    prompt: `Ordena la traducción de: «${p.en}»`,
    speak: p.en,
    tiles: ensureDifferent(answer, seed + p.id),
    answer,
    explanation: p.es,
  };
}

function ensureDifferent(words: string[], seed: string): string[] {
  let s = shuffle(words, seed);
  let k = 0;
  while (words.length > 1 && s.join(" ") === words.join(" ") && k < 5) s = shuffle(words, seed + ++k);
  return s;
}

function typeEn(p: Phrase): TypeExercise {
  return {
    id: `type-en:p:${p.id}`,
    kind: "type-en",
    skill: "writing",
    itemId: `p:${p.id}`,
    prompt: `Escríbelo en inglés: «${p.es}»`,
    accepted: [p.en, ...(p.altEn ?? [])],
    explanation: p.literal ? `${p.en} (literal: «${p.literal}»)` : p.en,
  };
}

export function poolsFor(lessons: Lesson[]): Pools {
  return { vocab: lessons.flatMap((l) => l.vocab), phrases: lessons.flatMap((l) => l.phrases) };
}

/** Práctica guiada: de reconocer a producir. `canListen` = hay audio o voz disponible. */
export function buildPractice(lesson: Lesson, pools: Pools, canListen: boolean, seed = lesson.id): Exercise[] {
  const out: Exercise[] = [];
  const half = Math.ceil(lesson.vocab.length / 2);
  lesson.vocab.forEach((v, i) => out.push(i < half ? chooseEs(v, pools, seed) : chooseEn(v, pools, seed)));
  if (canListen) lesson.phrases.slice(0, 2).forEach((p) => out.push(listen(p, pools, seed)));
  lesson.phrases.forEach((p) => {
    const c = cloze(p, pools, seed);
    if (c) out.push(c);
  });
  lesson.phrases.slice(0, 2).forEach((p) => out.push(order(p, seed)));
  lesson.phrases.slice(2, 4).forEach((p) => out.push(orderEs(p, seed)));
  lesson.phrases.slice(0, 2).forEach((p) => out.push(typeEn(p)));
  return out;
}

/** Evaluación final: 8 preguntas, énfasis en producción. */
export function buildFinal(lesson: Lesson, pools: Pools, attempt: number): Exercise[] {
  const seed = `${lesson.id}#final${attempt}`;
  const ps = shuffle(lesson.phrases, seed);
  const out: Exercise[] = [];
  ps.slice(0, 3).forEach((p) => out.push(typeEn(p)));
  ps.slice(0, 4).forEach((p, i) => out.push(i % 2 ? order(p, seed) : (cloze(p, pools, seed) ?? order(p, seed))));
  const v = shuffle(lesson.vocab, seed)[0];
  if (v) out.push(chooseEn(v, pools, seed));
  // ids únicos (misma frase puede salir en dos tipos distintos: ya difieren por tipo)
  return [...new Map(out.map((e) => [e.id, e])).values()].slice(0, 8);
}

/** Repaso global a partir de elementos pendientes. */
export function buildReview(items: SrsItem[], lookupVocab: Map<string, Vocab>, lookupPhrase: Map<string, Phrase>, pools: Pools, day: string): Exercise[] {
  const out: Exercise[] = [];
  items.forEach((it, i) => {
    const seed = `${day}:${it.id}`;
    if (it.kind === "word") {
      const v = lookupVocab.get(it.id.slice(2));
      if (v) out.push(i % 2 ? chooseEs(v, pools, seed) : chooseEn(v, pools, seed));
    } else {
      const p = lookupPhrase.get(it.id.slice(2));
      if (!p) return;
      const roll = i % 3;
      out.push(roll === 0 ? order(p, seed) : roll === 1 ? (cloze(p, pools, seed) ?? order(p, seed)) : typeEn(p));
    }
  });
  return out;
}

// ---------- Corrección ----------
export type Response = string | string[];

export function check(ex: Exercise, response: Response): boolean {
  switch (ex.kind) {
    case "choose-es":
    case "choose-en":
    case "listen":
    case "cloze":
      return typeof response === "string" && normalize(response) === normalize(ex.answer);
    case "order":
    case "order-es":
      return Array.isArray(response) && normalize(response.join(" ")) === normalize(ex.answer.join(" "));
    case "type-en":
      return typeof response === "string" && ex.accepted.some((a) => sameEnglish(a, response));
  }
}

/** Texto que se muestra como respuesta correcta. */
export function correctAnswerText(ex: Exercise): string {
  switch (ex.kind) {
    case "order":
    case "order-es":
      return ex.answer.join(" ");
    case "type-en":
      return ex.accepted[0] ?? "";
    default:
      return ex.answer;
  }
}

// ---------- Producción escrita y práctica oral ----------
/** Comprueba que el texto contiene las palabras clave. NO evalúa gramática. */
export function checkWriting(text: string, keywords: string[]): { found: string[]; missing: string[]; words: number } {
  const plain = ` ${normalize(text)} `;
  const contracted = ` ${canonical(text)} `;
  const found: string[] = [];
  const missing: string[] = [];
  for (const k of keywords) {
    const ok = plain.includes(` ${normalize(k)} `) || contracted.includes(` ${canonical(k)} `);
    (ok ? found : missing).push(k);
  }
  return { found, missing, words: normalize(text).split(" ").filter(Boolean).length };
}

/** Similitud palabra a palabra (0..1) entre lo reconocido y la frase objetivo. */
export function speechSimilarity(target: string, heard: string): number {
  const a = canonical(target).split(" ").filter(Boolean);
  const b = canonical(heard).split(" ").filter(Boolean);
  if (!a.length) return 0;
  const pool = [...b];
  let hit = 0;
  for (const w of a) {
    const i = pool.indexOf(w);
    if (i >= 0) {
      hit++;
      pool.splice(i, 1);
    }
  }
  return hit / a.length;
}
