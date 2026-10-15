/**
 * Personalidad de Papito (la papa costeña del sombrero vueltiao).
 * Para añadir mensajes basta con agregar frases a CONTEXTS: el resto de la app no cambia.
 * Humor cariñoso y natural; nunca burla al usuario.
 */
export type Mood = "wave" | "happy" | "cheer" | "think" | "hint" | "oops" | "cool" | "sleepy" | "party";

export type MascotContext =
  | "greet" // saludar al entrar
  | "explain" // explicar una expresión
  | "correct" // respuesta correcta
  | "wrong" // animar tras un error
  | "hint" // dar una pista
  | "mission" // presentar una misión
  | "streak" // celebrar una racha
  | "review" // recomendar repasar
  | "offline" // contenido disponible sin internet
  | "farewell" // despedirse al terminar
  | "empty" // estado vacío
  | "error" // algo falló
  | "lessonDone"; // lección superada

interface Bank {
  mood: Mood;
  messages: string[];
}

export const CONTEXTS: Record<MascotContext, Bank> = {
  greet: {
    mood: "wave",
    messages: [
      "¡Ajá, mi llave! Hoy sí vinimos a aprender.",
      "¡Qué más, parce! Listo pa' un poquito de inglés.",
      "¡Llegaste! Yo ya estaba calentando el inglés.",
      "Buenas, buenas. Hoy no entiendes nada… pero mañana un poquito menos.",
      "¡Eso, apareciste! Vamos con calma y con sabor.",
    ],
  },
  explain: {
    mood: "think",
    messages: [
      "Ojo: no se traduce palabra por palabra. Se traduce la intención.",
      "Mira cómo cambia según con quién hablas, mi llave.",
      "Una misma idea, varias formas de decirla. Elige según la situación.",
      "Aquí el truco es el contexto, no el diccionario.",
    ],
  },
  correct: {
    mood: "cheer",
    messages: [
      "¡Eso está bacano! Ya estás formando frases.",
      "¡De una! Esa expresión ya va quedando.",
      "¡Qué berraquera, mi llave!",
      "¡Ajá! Así se hace.",
      "¡Pura sabrosura! Sigue así.",
      "¡Bien ahí! Esa no se te escapa.",
      "¡Uy, qué nivel! Ese inglés ya suena natural.",
    ],
  },
  wrong: {
    mood: "oops",
    messages: [
      "Tranqui, mi llave. Vamos otra vez.",
      "Casi, casi. Hasta Papito se equivoca.",
      "No pasa nada: de los errores sale el sabor.",
      "Uy, se nos escapó. Pero ya sabes cómo es.",
      "Sin drama. Respira y lo intentamos de nuevo.",
      "Eso fue un tropiezo, no una caída.",
    ],
  },
  hint: {
    mood: "hint",
    messages: [
      "No traduzcas palabra por palabra. Piensa qué quieres decir.",
      "Pista de Papito: imagina la escena y qué dirías ahí.",
      "Fíjate en quién habla y en qué situación está.",
      "Pregúntate: ¿qué quiere lograr esta persona?",
    ],
  },
  mission: {
    mood: "happy",
    messages: [
      "Misión de hoy: decir algo en inglés que suene natural.",
      "Hoy vamos a salvar una conversación. ¿Listo?",
      "Nueva misión: que un gringo te entienda a la primera.",
      "Misión: sobrevivir a una charla real. ¡Tú puedes!",
    ],
  },
  streak: {
    mood: "party",
    messages: [
      "¡Racha encendida! Eso es constancia, mi llave.",
      "¡Otro día más! La racha está que arde.",
      "¡Qué disciplina! Así sí se aprende inglés.",
      "Cada día cuenta, y hoy también contó.",
    ],
  },
  review: {
    mood: "think",
    messages: [
      "Tienes cositas por repasar. Cinco minutos y listo.",
      "Un repasito y esto se te queda para siempre.",
      "Lo que se repasa, no se olvida. ¿Le damos?",
      "Ajá, hay palabras esperándote. No las dejes solas.",
    ],
  },
  offline: {
    mood: "cool",
    messages: [
      "Todo esto ya está guardado: puedes estudiar sin internet.",
      "Sin señal, sin problema. La lección viaja contigo.",
      "Modo avión activado, aprendizaje también. ¡De una!",
    ],
  },
  farewell: {
    mood: "wave",
    messages: [
      "Hoy aprendimos un poquito más. Mañana seguimos dando lora en inglés.",
      "¡Listo por hoy! Descansa que lo hiciste bacano.",
      "Nos vemos mañana, mi llave. ¡Qué buena sesión!",
      "Eso fue todo por hoy. Tu cerebro ya está haciendo espacio pa' más inglés.",
    ],
  },
  empty: {
    mood: "sleepy",
    messages: [
      "Aquí no hay nada todavía. Y yo con tanto tiempo libre…",
      "Todo tranquilo por aquí. ¿Empezamos con algo?",
      "Esto está más vacío que la nevera a fin de mes.",
    ],
  },
  error: {
    mood: "oops",
    messages: [
      "Uy, algo se nos enredó. Intenta de nuevo.",
      "Eso no salió como esperaba. Respira y reintentamos.",
      "Parce, algo falló, pero tus datos están a salvo.",
    ],
  },
  lessonDone: {
    mood: "party",
    messages: [
      "¡Lección superada! Papito está orgulloso.",
      "¡Qué nivel! Ya entiendes un poquito más.",
      "¡Eso fue un golazo!",
      "¡Terminaste! Ya mereces un jugo de lulo.",
    ],
  },
};

const last = new Map<MascotContext, number>();

/** Elige un mensaje sin repetir el anterior del mismo contexto. Úsalo en eventos (no durante el render). */
export function say(context: MascotContext, rand: () => number = Math.random): { mood: Mood; text: string } {
  const bank = CONTEXTS[context];
  const n = bank.messages.length;
  let i = Math.floor(rand() * n);
  const prev = last.get(context);
  if (n > 1 && i === prev) i = (i + 1) % n;
  last.set(context, i);
  return { mood: bank.mood, text: bank.messages[i] ?? "" };
}

/** Primer mensaje determinista del contexto (para el render inicial sin diferencias servidor/cliente). */
export function firstMessage(context: MascotContext): { mood: Mood; text: string } {
  const bank = CONTEXTS[context];
  return { mood: bank.mood, text: bank.messages[0] ?? "" };
}
