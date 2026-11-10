import type { Expect, Interview, InterviewStep, Line } from "@/content/interviews";

/**
 * Motor de conversación LOCAL (sin IA, sin internet). Reglas deterministas:
 *  1. ¿La respuesta está en inglés? (si está en español, te anima a decirlo en inglés).
 *  2. ¿Responde a lo que se preguntó? Cada pregunta espera un tipo (nombre, lugar, número…) y se buscan
 *     patrones típicos de ese tipo; si hay un dato (tu nombre, tu ciudad…) se extrae para que el personaje lo use.
 *  3. Errores frecuentes de hispanohablantes: se detectan con reglas y se sugiere la forma natural sin cortar la charla.
 * Límite honesto: entiende respuestas típicas, no cualquier cosa. Si no entiende, lo dice y da una pista.
 */

// ---------- Utilidades ----------
const words = (t: string) => t.toLowerCase().replace(/[^\p{L}\p{N}'\s-]/gu, " ").split(/\s+/).filter(Boolean);

const SPANISH = new Set(
  "yo soy es estoy tengo llamo del la el los las que qué porque por cuál cuántos dónde está quiero trabajo trabajar vivo años hola gracias sí pero muy con para una también cuando donde dónde cómo mi mis nombre usted ustedes nosotros estudio estudiante me gusta gustan bien mucho poco hace semana semanas días meses vacaciones".split(" "),
);

export function detectLanguage(text: string): "en" | "es" {
  const w = words(text);
  if (!w.length) return "en";
  const es = w.filter((x) => SPANISH.has(x)).length;
  if (/[¿¡]/.test(text)) return "es"; // signos de apertura: solo existen en español
  return es / w.length >= 0.34 || (/ñ/i.test(text) && es >= 1) ? "es" : "en";
}

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
  thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};

/** «twenty-five», «twenty five», «25» → 25 */
export function parseNumber(text: string): number | null {
  const d = text.match(/\b(\d{1,3})\b/);
  if (d) return Number(d[1]);
  const w = words(text).flatMap((x) => x.split("-"));
  for (let i = 0; i < w.length; i++) {
    const a = NUMBER_WORDS[w[i]!];
    if (a === undefined) continue;
    const b = NUMBER_WORDS[w[i + 1] ?? ""];
    return a >= 20 && b !== undefined && b < 10 ? a + b : a;
  }
  return null;
}

// Sin \b: en JS no reconoce letras con tilde como parte de la palabra («Pérez» → «PÉrez»).
const titleCase = (s: string) => s.split(/(\s+|-)/).map((p) => (p ? p.charAt(0).toUpperCase() + p.slice(1).toLowerCase() : p)).join("");

/** Corta el dato en la primera puntuación o conjunción y lo limita a 4 palabras. */
function cleanValue(s: string): string {
  const cut = s.split(/[.,!?;:]|\s(?:and|but|because|so|with)\s/i)[0] ?? "";
  return cut.trim().split(/\s+/).slice(0, 4).join(" ");
}

const NOT_NAME = new Set(
  "fine good great well ok okay tired happy sad nervous ready here from a an the very not so sorry glad working studying student teacher years old in at from twenty thirty doing busy excited".split(" "),
);

// Fechas y horas: «on Friday», «by Thursday», «tomorrow afternoon», «Tuesday at 10 am»…
const DAY = "monday|tuesday|wednesday|thursday|friday|saturday|sunday";
const TIME_PARTS = new RegExp(
  [
    `(?:(?:on|by|next|this|until|before|every)\\s+)?(?:${DAY})`,
    "(?:at\\s+)?\\d{1,2}(?::\\d{2})?\\s*(?:am|pm|a\\.m\\.|p\\.m\\.|o'clock)",
    "at\\s+\\d{1,2}(?::\\d{2})?",
    "(?:at\\s+)?(?:noon|midday|midnight)",
    "(?:in the |this |tomorrow |tonight )?(?:morning|afternoon|evening)",
    "today|tomorrow|tonight|later today|this week|next week|this weekend|next weekend|next month|end of the (?:day|week|month)",
    "in (?:\\d+|a|an|one|two|three|four|five) (?:minutes?|hours?|days?|weeks?)",
    "as soon as possible|asap|right now",
  ]
    .map((p) => `\\b(?:${p})(?![a-z])`)
    .join("|"),
  "gi",
);

/** Une las piezas de fecha/hora contiguas («Tuesday» + «at 10 am») y pone en mayúscula los días. */
export function parseWhen(text: string): string | null {
  const ms = [...text.matchAll(TIME_PARTS)];
  if (!ms.length) return null;
  const start = ms[0]!.index!;
  let end = start + ms[0]![0].length;
  for (const m of ms.slice(1)) {
    if (m.index! - end > 1) break;
    end = m.index! + m[0].length;
  }
  return text.slice(start, end).toLowerCase().replace(new RegExp(`\\b(${DAY})\\b`, "g"), (d) => d[0]!.toUpperCase() + d.slice(1));
}

// ---------- Reconocedores por tipo de respuesta ----------
interface Match {
  ok: boolean;
  value?: string;
  yesno?: "yes" | "no";
}

const RECOGNIZERS: Record<Expect, (t: string) => Match> = {
  name(t) {
    const m = t.match(/\b(?:my name is|my name's|name is|call me|i am|i'm|im|it's|this is)\s+([\p{L}][\p{L}'-]*(?:\s+[\p{Lu}][\p{L}'-]*)?)/iu);
    if (m && !NOT_NAME.has(m[1]!.split(/\s+/)[0]!.toLowerCase())) return { ok: true, value: titleCase(m[1]!) };
    const w = t.trim().replace(/[.!]+$/, "").split(/\s+/);
    if (w.length <= 2 && w.every((x) => /^[\p{L}'-]+$/u.test(x)) && !NOT_NAME.has(w[0]!.toLowerCase()) && !["yes", "no", "hi", "hello"].includes(w[0]!.toLowerCase()))
      return { ok: true, value: titleCase(w.join(" ")) };
    return { ok: false };
  },
  place(t) {
    const m = t.match(/\b(?:i'm from|i am from|im from|from|live in|living in|in|at|near)\s+(.+)/i);
    if (m) {
      const v = cleanValue(m[1]!).replace(/^(the|a|an)\s+/i, (x) => x);
      if (v) return { ok: true, value: titleCase(v) };
    }
    const w = t.trim().replace(/[.!]+$/, "").split(/\s+/);
    if (w.length <= 3 && /^\p{Lu}/u.test(w[0] ?? "") && !/^(yes|no|i)$/i.test(w[0]!)) return { ok: true, value: cleanValue(t) };
    return { ok: false };
  },
  number(t) {
    const n = parseNumber(t);
    return n !== null && n > 0 && n < 120 ? { ok: true, value: String(n) } : { ok: false };
  },
  job(t) {
    const ok =
      /\b(i'?m an?|i am an?|im an?|i work|i'?m working|i study|i'?m studying|i'?m a student|i am a student|i'?m unemployed|i don't work|i do not work|i'?m retired|i'?m looking for|i have my own|i own)\b/i.test(t) ||
      /\b(student|teacher|nurse|doctor|engineer|developer|programmer|designer|lawyer|accountant|waiter|waitress|driver|seller|salesperson|assistant|manager|cook|chef|mechanic|housewife|retired|freelancer|business|secretary|cashier|receptionist|police|farmer|artist|musician|writer)\b/i.test(t);
    return { ok };
  },
  likes(t) {
    return { ok: /\b(i like|i love|i enjoy|i really like|i usually|i often|i always|i go|my hobby|my hobbies|i play|i watch|i read|i listen|i dance|i sleep|i cook|i spend|i visit|i walk|i run|i swim|i travel)\b/i.test(t) };
  },
  yesno(t) {
    const s = ` ${t.toLowerCase()} `;
    // «no problem» y «no worries» son un sí amable.
    const yes = s.search(/\b(yes|yeah|yep|sure|of course|okay|ok|absolutely|definitely|it is|i do|here you are|here it is|why not|go ahead|it's free|no problem|no worries|let's do it|sounds good|i did|i have|i can|i will|i'd love to)\b/);
    const no = s.replace(/\bno (problem|worries)\b/g, "xx").search(/\b(no|nope|not really|it's taken|it is taken|i don't|it isn't|it's not|maybe another time|not now|not today|not yet|i didn't|i haven't|i can't|i won't|i didnt|i havent|i cant)\b/);
    if (yes < 0 && no < 0) return { ok: false };
    const isYes = no < 0 || (yes >= 0 && yes < no);
    return { ok: true, yesno: isYes ? "yes" : "no" };
  },
  reason(t) {
    return {
      ok: /\b(because|to\s+\w+|for\s+\w+|i want|i'd like|i would like|i need|i have to|vacation|holiday|tourism|tourist|business|work|study|studying|visit|visiting|family|friends|conference|meeting|travel|job|grow|learn)\b/i.test(t),
    };
  },
  duration(t) {
    const m = t.match(/\b(\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|a few|a couple of)\s+(day|days|week|weeks|month|months|year|years)\b/i);
    if (m) return { ok: true, value: m[0][0]!.toUpperCase() + m[0].slice(1).toLowerCase() };
    const since = t.match(/\bsince\s+(\d{4}|last \w+)/i);
    if (since) return { ok: true, value: `Since ${since[1]}` };
    return { ok: false };
  },
  feeling(t) {
    return { ok: /\b(fine|good|great|well|ok|okay|nervous|tired|excited|happy|not bad|so-so|amazing|alright|all right|so so)\b/i.test(t) };
  },
  time(t) {
    const v = parseWhen(t);
    return v ? { ok: true, value: v } : { ok: false };
  },
  free(t) {
    return { ok: words(t).length >= 3 };
  },
};

// ---------- Errores frecuentes de hispanohablantes ----------
export interface Mistake {
  wrong: string;
  better: string;
  why: string;
}

interface Rule {
  re: RegExp;
  fix: (m: RegExpMatchArray) => string;
  why: string;
}

const HUNGER: Record<string, string> = { hunger: "hungry", hungry: "hungry", thirst: "thirsty", thirsty: "thirsty", cold: "cold", hot: "hot", sleepy: "sleepy", fear: "scared" };

export const RULES: Rule[] = [
  { re: /\bi have (\d+|[a-z]+(?:[- ][a-z]+)?) years(?! old)\b/i, fix: (m) => `I'm ${m[1]} years old`, why: "La edad va con «to be»: «I'm 28 years old», no «I have 28 years»." },
  { re: /\b(i|you|we|they) (?:am|are) agree\b/i, fix: (m) => `${m[1]} agree`, why: "«Agree» ya es verbo: no lleva «am/are»." },
  { re: /\b(he|she|it) have\b/i, fix: (m) => `${m[1]} has`, why: "Con he/she/it se usa «has»." },
  { re: /\b(i|you|we|they) no (?!problem\b|worries\b)([a-z]+)/i, fix: (m) => `${m[1]} don't ${m[2]}`, why: "Para negar un verbo se usa «don't»: «I don't like…», no «I no like…»." },
  { re: /\bsince (\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten) (years?|months?|weeks?|days?)\b/i, fix: (m) => `for ${m[1]} ${m[2]}`, why: "Con una cantidad de tiempo se usa «for» (for 3 years); «since» va con un momento (since 2020)." },
  { re: /\bpeople is\b/i, fix: () => "people are", why: "«People» es plural: «people are»." },
  { re: /\bmake an? (photo|picture)\b/i, fix: (m) => `take a ${m[1]}`, why: "Las fotos se «toman»: «take a photo»." },
  { re: /\bexplain me\b/i, fix: () => "explain to me", why: "Se dice «explain to me» o «explain it to me»." },
  { re: /\bi have (hunger|hungry|thirst|thirsty|cold|hot|sleepy|fear)\b/i, fix: (m) => `I'm ${HUNGER[m[1]!.toLowerCase()]}`, why: "Hambre, sed, frío o sueño van con «to be»: «I'm hungry»." },
  { re: /\bdepends? of\b/i, fix: (m) => m[0].replace(/of$/i, "on"), why: "En inglés es «depend on», no «depend of»." },
  { re: /\bmarried with\b/i, fix: () => "married to", why: "Se dice «married to» (casado con)." },
  { re: /\bmore (better|good)\b/i, fix: () => "better", why: "«Better» ya es comparativo: no lleva «more»." },
  { re: /\bi(?:'m| am) (doctor|teacher|nurse|engineer|student|lawyer|developer|programmer|designer|waiter|accountant|cashier|secretary|mechanic|cook|chef|driver|manager|assistant)\b/i, fix: (m) => `I'm ${/^[aeiou]/i.test(m[1]!) ? "an" : "a"} ${m[1]}`, why: "Con profesiones se usa «a/an»: «I'm a teacher»." },
  { re: /^(is|was) (very|so|too|really|a)\b/i, fix: (m) => `It ${m[1]!.toLowerCase()} ${m[2]}`, why: "En inglés casi siempre hay sujeto: «It's very good», no «Is very good»." },
  { re: /\bi am (\d+)\s*$/i, fix: (m) => `I'm ${m[1]} years old`, why: "Es correcto, pero más completo: «I'm 28 years old»." },
  { re: /\b(i|you|we|they) (?:is)\b/i, fix: (m) => `${m[1]} ${m[1]!.toLowerCase() === "i" ? "am" : "are"}`, why: "Con I se usa «am»; con you/we/they, «are»." },
  { re: /\bthe (english|spanish|music|football|soccer)\b(?! (teacher|class|team|music))/i, fix: (m) => m[1]!, why: "En general no se pone «the» antes de idiomas, deportes o la música en general." },
  { re: /\bi have an? doubt\b/i, fix: () => "I have a question", why: "«Doubt» es una duda de desconfianza; para preguntar algo se dice «I have a question»." },
  { re: /\b(assist|assisted) to (the )?(meeting|class|conference|event|course)\b/i, fix: (m) => `${m[1]!.toLowerCase() === "assisted" ? "attended" : "attend"} ${m[2] ?? ""}${m[3]}`, why: "«Assist» es ayudar; asistir a una reunión es «attend the meeting»." },
  { re: /\bin the next (week|month|year|monday|tuesday|wednesday|thursday|friday)\b/i, fix: (m) => `next ${m[1]}`, why: "Se dice «next week» / «next Monday», sin «in the»." },
  { re: /\bremember me (to|about)\b/i, fix: (m) => `remind me ${m[1]}`, why: "Recordarle algo a alguien es «remind»: «remind me to call»." },
  { re: /\bthe (monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i, fix: (m) => `on ${m[1]![0]!.toUpperCase()}${m[1]!.slice(1).toLowerCase()}`, why: "Con los días se usa «on»: «on Friday», no «the Friday»." },
];

export function detectMistakes(text: string): Mistake[] {
  const out: Mistake[] = [];
  let corrected = text;
  for (const r of RULES) {
    const m = corrected.match(r.re);
    if (!m) continue;
    const before = corrected;
    corrected = corrected.replace(r.re, r.fix(m));
    if (corrected !== before) out.push({ wrong: m[0], better: r.fix(m), why: r.why });
  }
  if (!out.length) return [];
  const sentence = corrected.charAt(0).toUpperCase() + corrected.slice(1);
  return out.map((x) => ({ ...x, better: sentence }));
}

// ---------- Evaluar una respuesta ----------
export interface Evaluation {
  lang: "en" | "es";
  understood: boolean;
  value?: string;
  yesno?: "yes" | "no";
  askedBack: boolean;
  mistakes: Mistake[];
}

export function evaluate(step: InterviewStep, text: string): Evaluation {
  const t = text.trim();
  const lang = detectLanguage(t);
  const askedBack = /\b(and you|what about you|how about you|and yourself)\b/i.test(t);
  if (lang === "es") return { lang, understood: false, askedBack: false, mistakes: [] };
  const expects = Array.isArray(step.expect) ? step.expect : [step.expect];
  for (const e of expects) {
    const m = RECOGNIZERS[e](t);
    if (m.ok) return { lang, understood: true, ...(m.value ? { value: m.value } : {}), ...(m.yesno ? { yesno: m.yesno } : {}), askedBack, mistakes: detectMistakes(t) };
  }
  return { lang, understood: false, askedBack, mistakes: detectMistakes(t) };
}

// ---------- Flujo de la conversación ----------
export interface Feedback {
  kind: "ok" | "fix" | "spanish" | "unclear" | "skipped";
  text: string;
  better?: string;
}
export interface ChatMsg {
  from: "npc" | "me";
  en: string;
  es?: string;
  stepId?: string;
  feedback?: Feedback;
}
export interface TalkState {
  interviewId: string;
  stepIdx: number;
  retries: number;
  understoodFirstTry: number;
  understood: number;
  mistakes: Mistake[];
  messages: ChatMsg[];
  done: boolean;
}

const RETRY: Line[] = [
  { en: "Sorry, I didn't get that.", es: "Perdón, no te entendí." },
  { en: "Hmm, could you say that in a different way?", es: "Mmm, ¿lo puedes decir de otra forma?" },
];
const SPANISH_REPLY: Line = { en: "Sorry, my Spanish is not very good. Can you try in English?", es: "Perdón, mi español no es muy bueno. ¿Lo intentas en inglés?" };
const SKIP: Line = { en: "No problem, let's continue.", es: "No hay problema, sigamos." };

const MAX_RETRIES = 2;

function fill(line: Line, value?: string): Line {
  if (!line.en.includes("{value}")) return line;
  if (!value) return { en: "Great!", es: "¡Genial!" };
  const put = (tpl: string) => (tpl.startsWith("{value}") ? value.charAt(0).toUpperCase() + value.slice(1) + tpl.slice(7) : tpl).replaceAll("{value}", value);
  return { en: put(line.en), es: put(line.es) };
}

export function startTalk(iv: Interview): TalkState {
  const first = iv.steps[0]!;
  return { interviewId: iv.id, stepIdx: 0, retries: 0, understoodFirstTry: 0, understood: 0, mistakes: [], messages: [{ from: "npc", en: first.ask.en, es: first.ask.es, stepId: first.id }], done: false };
}

/** Procesa tu respuesta y devuelve el nuevo estado (función pura: fácil de probar y de guardar). */
export function answer(iv: Interview, state: TalkState, raw: string): TalkState {
  const text = raw.trim().slice(0, 500);
  if (!text || state.done) return state;
  const step = iv.steps[state.stepIdx];
  if (!step) return state;
  const ev = evaluate(step, text);
  const msgs: ChatMsg[] = [...state.messages];
  const me: ChatMsg = { from: "me", en: text, stepId: step.id };
  msgs.push(me);
  const mistakes = [...state.mistakes, ...ev.mistakes];

  const advance = (s: TalkState, extra: ChatMsg[]): TalkState => {
    const nextIdx = s.stepIdx + 1;
    const next = iv.steps[nextIdx];
    const out = [...extra];
    if (next) out.push({ from: "npc", en: next.ask.en, es: next.ask.es, stepId: next.id });
    else out.push({ from: "npc", en: iv.outro.en, es: iv.outro.es });
    return { ...s, stepIdx: nextIdx, retries: 0, messages: [...s.messages, ...out], done: !next };
  };

  if (ev.understood) {
    me.feedback = ev.mistakes.length
      ? { kind: "fix", text: ev.mistakes.map((m) => m.why).join(" "), better: ev.mistakes[0]!.better }
      : { kind: "ok", text: "Te entendí. ¡Natural!" };
    const reaction = ev.yesno === "yes" && step.yes ? step.yes : ev.yesno === "no" && step.no ? step.no : fill(step.ok, ev.value);
    const extra: ChatMsg[] = [];
    if (ev.askedBack && step.back) extra.push({ from: "npc", en: step.back.en, es: step.back.es });
    extra.push({ from: "npc", en: reaction.en, es: reaction.es });
    const base: TalkState = { ...state, messages: msgs, mistakes, understood: state.understood + 1, understoodFirstTry: state.understoodFirstTry + (state.retries === 0 ? 1 : 0) };
    return advance(base, extra);
  }

  const retries = state.retries + 1;
  if (retries >= MAX_RETRIES) {
    me.feedback = { kind: "skipped", text: `Seguimos. Una forma de responder: «${step.model}»`, better: step.model };
    return advance({ ...state, messages: msgs, mistakes }, [{ from: "npc", en: SKIP.en, es: SKIP.es }]);
  }
  if (ev.lang === "es") {
    me.feedback = { kind: "spanish", text: `Intenta decirlo en inglés. ${step.hint}` };
    return { ...state, retries, mistakes, messages: [...msgs, { from: "npc", en: SPANISH_REPLY.en, es: SPANISH_REPLY.es }, { from: "npc", en: step.ask.en, es: step.ask.es, stepId: step.id }] };
  }
  me.feedback = ev.mistakes.length
    ? { kind: "fix", text: `${ev.mistakes.map((m) => m.why).join(" ")} Además: ${step.hint}`, better: ev.mistakes[0]!.better }
    : { kind: "unclear", text: `No te entendí del todo. ${step.hint}` };
  const r = RETRY[(retries - 1) % RETRY.length]!;
  return { ...state, retries, mistakes, messages: [...msgs, { from: "npc", en: `${r.en} ${step.ask.en}`, es: `${r.es} ${step.ask.es}`, stepId: step.id }] };
}

export interface TalkSummary {
  score: number; // 0..1, respuestas entendidas a la primera / preguntas
  understoodFirstTry: number;
  total: number;
  mistakes: Mistake[]; // únicos
}

export function summarize(iv: Interview, s: TalkState): TalkSummary {
  const seen = new Set<string>();
  const mistakes = s.mistakes.filter((m) => (seen.has(m.wrong.toLowerCase()) ? false : (seen.add(m.wrong.toLowerCase()), true)));
  return { score: iv.steps.length ? s.understoodFirstTry / iv.steps.length : 0, understoodFirstTry: s.understoodFirstTry, total: iv.steps.length, mistakes };
}

/** Valida un estado guardado (por si cambió la entrevista entre versiones). */
export function parseTalkState(iv: Interview, raw: unknown): TalkState | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Partial<TalkState>;
  if (s.interviewId !== iv.id || typeof s.stepIdx !== "number" || s.stepIdx < 0 || s.stepIdx > iv.steps.length) return null;
  if (!Array.isArray(s.messages) || !s.messages.every((m) => m && (m.from === "npc" || m.from === "me") && typeof m.en === "string")) return null;
  if (typeof s.retries !== "number" || typeof s.understood !== "number" || typeof s.understoodFirstTry !== "number" || !Array.isArray(s.mistakes)) return null;
  return { interviewId: iv.id, stepIdx: s.stepIdx, retries: s.retries, understood: s.understood, understoodFirstTry: s.understoodFirstTry, mistakes: s.mistakes as Mistake[], messages: s.messages as ChatMsg[], done: s.done === true };
}
