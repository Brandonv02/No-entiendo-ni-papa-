import { EXPRESSIONS, expressionById, expressionsIn } from "@/content/costa";
import { QUALITY_SCORE } from "@/content/conversations";
import { normalize, shuffle } from "./engine";
import type { ChoiceExercise, ConvOption, Exercise, Expression, OrderExercise, SrsItem, TypeExercise } from "./types";

/** Id de audio de una frase de una expresión: x-<id>-<n> (0 = primera equivalencia). */
export const expressionAudioId = (e: Expression, n = 0) => `x-${e.id}-${n}`;

function pickOthers(e: Expression, n: number, seed: string): Expression[] {
  const same = EXPRESSIONS.filter((x) => x.id !== e.id && x.category === e.category);
  const rest = EXPRESSIONS.filter((x) => x.id !== e.id && x.category !== e.category);
  return [...shuffle(same, seed + e.id), ...shuffle(rest, seed + "r" + e.id)].slice(0, n);
}

const DEFAULT_HINT = "No traduzcas palabra por palabra. Piensa qué quieres decir.";

function scenario(e: Expression, seed: string): ChoiceExercise {
  const { answer, wrong } = e.scenario;
  return {
    id: `scenario:x:${e.id}`,
    kind: "scenario",
    skill: "reading",
    itemId: `x:${e.id}`,
    prompt: "¿Qué dirías en inglés?",
    context: e.scenario.situation,
    options: shuffle([answer.en, ...wrong.map((w) => w.en)], seed + "s" + e.id),
    answer: answer.en,
    optionFeedback: Object.fromEntries(wrong.map((w) => [w.en, w.why])),
    explanation: `${answer.why} Otras formas: ${e.equivalents.map((q) => q.en).join(" · ")}`,
    hint: `${DEFAULT_HINT} Intención: ${e.meaning}`,
    speak: answer.en,
    audioId: expressionAudioId(e),
  };
}

function intent(e: Expression, canListen: boolean, seed: string): ChoiceExercise {
  const others = pickOthers(e, 3, seed + "i");
  const line = e.equivalents[0]?.en ?? e.exchange.a;
  return {
    id: `intent:x:${e.id}`,
    kind: "intent",
    skill: canListen ? "listening" : "reading",
    itemId: `x:${e.id}`,
    prompt: canListen ? "Escucha y reconoce la intención: ¿qué quiere lograr quien habla?" : "Lee y reconoce la intención: ¿qué quiere lograr quien habla?",
    ...(canListen ? { speak: line, audioId: expressionAudioId(e) } : { sentence: line }),
    options: shuffle([e.meaning, ...others.map((o) => o.meaning)], seed + "o" + e.id),
    answer: e.meaning,
    optionFeedback: Object.fromEntries(others.map((o) => [o.meaning, `Eso corresponde a otra expresión: «${o.es}».`])),
    explanation: `«${line}» → ${e.meaning}`,
    hint: "Fíjate en la situación en la que alguien diría esto.",
  };
}

function convo(e: Expression, seed: string): ChoiceExercise {
  const others = pickOthers(e, 3, seed + "c");
  return {
    id: `convo:x:${e.id}`,
    kind: "convo",
    skill: "reading",
    itemId: `x:${e.id}`,
    prompt: "Completa la conversación con la respuesta más natural",
    context: `Te dicen: «${e.exchange.a}»`,
    speak: e.exchange.a,
    audioId: `x-${e.id}-a`,
    options: shuffle([e.exchange.b, ...others.map((o) => o.exchange.b)], seed + "k" + e.id),
    answer: e.exchange.b,
    optionFeedback: Object.fromEntries(others.map((o) => [o.exchange.b, "Esa respuesta encaja en otra conversación, no en esta."])),
    explanation: `${e.exchange.a} → ${e.exchange.b}`,
    hint: "Piensa qué pregunta te hicieron y responde justo a eso.",
  };
}

function order(e: Expression, seed: string): OrderExercise | null {
  const ex = e.examples[0];
  if (!ex) return null;
  const answer = ex.en.split(/\s+/);
  let tiles = shuffle(answer, seed + "t" + e.id);
  for (let k = 1; k < 5 && answer.length > 1 && tiles.join(" ") === answer.join(" "); k++) tiles = shuffle(answer, seed + "t" + e.id + k);
  return {
    id: `order:x:${e.id}`,
    kind: "order",
    skill: "writing",
    itemId: `x:${e.id}`,
    prompt: `Ordena la frase: «${ex.es}»`,
    speak: ex.en,
    audioId: `x-${e.id}-ex0`,
    tiles,
    answer,
    explanation: ex.en,
  };
}

function produce(e: Expression): TypeExercise {
  return {
    id: `produce:x:${e.id}`,
    kind: "type-en",
    skill: "writing",
    itemId: `x:${e.id}`,
    prompt: e.produce.prompt,
    context: `Idea: «${e.es}»`,
    accepted: e.produce.accepted,
    match: "exact",
    model: e.produce.accepted[0] ?? "",
    explanation: `Formas posibles: ${e.equivalents.map((q) => `${q.en} (${q.register})`).join(" · ")}`,
    hint: `Empieza con algo como «${e.equivalents[0]?.en.split(" ").slice(0, 2).join(" ") ?? ""}…»`,
  };
}

function explain(e: Expression): TypeExercise {
  return {
    id: `explain:x:${e.id}`,
    kind: "explain",
    skill: "writing",
    itemId: `x:${e.id}`,
    prompt: `Explica en inglés sencillo qué quiere decir «${e.es}»`,
    context: "Una frase corta basta. Solo compruebo que uses ideas clave, no corrijo toda la gramática.",
    accepted: e.explain.keywords,
    match: "keywords",
    model: e.explain.sample,
    explanation: `Ejemplo: ${e.explain.sample}`,
    hint: "Usa palabras simples: «It means…», «you say it when…».",
  };
}

function fix(e: Expression): ChoiceExercise | null {
  const m = e.mistakes?.[0];
  if (!m) return null;
  return {
    id: `fix:x:${e.id}`,
    kind: "fix",
    skill: "reading",
    itemId: `x:${e.id}`,
    prompt: "Error frecuente: ¿cuál suena natural en inglés?",
    context: `Quieres decir: «${e.es}»`,
    options: shuffle([m.right, m.wrong], "f" + e.id),
    answer: m.right,
    optionFeedback: { [m.wrong]: m.why },
    explanation: m.why,
    speak: m.right,
    audioId: `x-${e.id}-fix`,
    hint: "Muchas veces el error viene de traducir palabra por palabra.",
  };
}

function register(e: Expression): ChoiceExercise | null {
  const p = e.registerPair;
  if (!p) return null;
  const answer = p.ask === "formal" ? p.formal : p.informal;
  const wrong = p.ask === "formal" ? p.informal : p.formal;
  return {
    id: `register:x:${e.id}`,
    kind: "register",
    skill: "reading",
    itemId: `x:${e.id}`,
    prompt: p.ask === "formal" ? "¿Cuál es más FORMAL y adecuada aquí?" : "¿Cuál es más INFORMAL y adecuada aquí?",
    context: p.situation,
    options: shuffle([answer, wrong], "g" + e.id),
    answer,
    optionFeedback: { [wrong]: p.ask === "formal" ? "Suena demasiado informal para esta situación." : "Suena demasiado formal para hablar entre amigos." },
    explanation: `Formal: ${p.formal} · Informal: ${p.informal}`,
    speak: answer,
    audioId: `x-${e.id}-reg`,
    hint: "Pregúntate: ¿con quién hablo y qué tan cercana es la relación?",
  };
}

const RANK: Record<string, number> = { scenario: 0, intent: 1, convo: 2, register: 3, fix: 4, order: 5, "type-en": 6, explain: 7 };

/** Práctica de una categoría: de reconocer a producir. Determinista para una misma semilla. */
export function buildExpressionPractice(categoryId: string, canListen: boolean, seed = `costa-${categoryId}`): Exercise[] {
  const exprs = expressionsIn(categoryId);
  const out: Exercise[] = [];
  exprs.forEach((e, i) => {
    out.push(scenario(e, seed), intent(e, canListen, seed), convo(e, seed));
    const r = register(e);
    if (r) out.push(r);
    const f = fix(e);
    if (f) out.push(f);
    const o = order(e, seed);
    if (o) out.push(o);
    out.push(produce(e));
    if (i === 0) out.push(explain(e));
  });
  return out.map((ex, idx) => ({ ex, idx })).sort((a, b) => (RANK[a.ex.kind] ?? 9) - (RANK[b.ex.kind] ?? 9) || a.idx - b.idx).map((x) => x.ex);
}

/** Recordar sin ver la traducción: se muestra solo la situación. */
export function recallExercise(e: Expression): TypeExercise {
  return {
    id: `recall:x:${e.id}`,
    kind: "recall",
    skill: "writing",
    itemId: `x:${e.id}`,
    prompt: "Recuerda: ¿cómo lo dirías en inglés?",
    context: e.situation,
    accepted: [...e.equivalents.map((q) => q.en), ...e.produce.accepted],
    match: "exact",
    model: e.equivalents[0]?.en ?? "",
    explanation: `Formas posibles: ${e.equivalents.map((q) => q.en).join(" · ")}`,
    hint: `Intención: ${e.meaning}`,
  };
}

/** Repaso de expresiones pendientes: alterna recordar y elegir en contexto. */
export function buildExpressionReview(items: SrsItem[], seed: string): Exercise[] {
  const out: Exercise[] = [];
  items.forEach((it, i) => {
    const e = expressionById.get(it.id.slice(2));
    if (!e) return;
    out.push(i % 2 === 0 ? recallExercise(e) : scenario(e, seed));
  });
  return out;
}

// ---------- Conversaciones ----------
/** Puntuación 0..1: media de la calidad de las respuestas (pedir que repitan no penaliza). */
export function conversationScore(picks: ConvOption[]): number {
  const scored = picks.filter((p) => p.kind !== "repeat");
  if (!scored.length) return 0;
  return scored.reduce((n, p) => n + QUALITY_SCORE[p.quality], 0) / scored.length;
}

export { normalize };
