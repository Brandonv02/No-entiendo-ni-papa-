import { describe, expect, it } from "vitest";
import { INTERVIEWS, interviewById } from "@/content/interviews";
import { answer, detectLanguage, detectMistakes, evaluate, parseNumber, parseTalkState, parseWhen, startTalk, summarize } from "@/lib/talk";

const papito = interviewById.get("papito")!;
const step = (iv: string, id: string) => interviewById.get(iv)!.steps.find((s) => s.id === id)!;

describe("datos de las entrevistas", () => {
  it("ids únicos, varias preguntas y cada respuesta modelo es entendida y sin errores", () => {
    expect(new Set(INTERVIEWS.map((i) => i.id)).size).toBe(INTERVIEWS.length);
    for (const iv of INTERVIEWS) {
      expect(iv.steps.length, iv.id).toBeGreaterThanOrEqual(5);
      for (const s of iv.steps) {
        const ev = evaluate(s, s.model);
        expect(ev.understood, `${iv.id}.${s.id}: «${s.model}»`).toBe(true);
        expect(ev.mistakes, `${iv.id}.${s.id}`).toEqual([]);
      }
    }
  });
});

describe("idioma", () => {
  it("distingue español de inglés, incluso con nombres con tilde", () => {
    expect(detectLanguage("Me llamo Laura y soy de Cali")).toBe("es");
    expect(detectLanguage("¿Qué?")).toBe("es");
    expect(detectLanguage("I'm from Bogotá")).toBe("en");
    expect(detectLanguage("My name is José")).toBe("en");
  });
});

describe("reconocimiento por tipo de respuesta", () => {
  it("nombre: varias formas naturales y rechaza lo que no es un nombre", () => {
    const s = step("papito", "name");
    expect(evaluate(s, "My name is laura").value).toBe("Laura");
    expect(evaluate(s, "I'm Carlos Pérez").value).toBe("Carlos Pérez");
    expect(evaluate(s, "Juan").value).toBe("Juan");
    expect(evaluate(s, "I'm fine, thank you").understood).toBe(false);
    expect(evaluate(s, "yes").understood).toBe(false);
  });
  it("lugar, número y duración extraen el dato", () => {
    expect(evaluate(step("papito", "from"), "I'm from Barranquilla, Colombia.").value).toBe("Barranquilla");
    expect(evaluate(step("papito", "from"), "I live in santa marta").value).toBe("Santa Marta");
    expect(evaluate(step("papito", "age"), "I'm twenty-five").value).toBe("25");
    expect(evaluate(step("papito", "age"), "30 years old").value).toBe("30");
    expect(evaluate(step("trabajo", "experience"), "I've worked there for three years").value).toBe("Three years");
    expect(evaluate(step("aeropuerto", "length"), "for 2 weeks").value).toBe("2 weeks");
    expect(parseNumber("forty seven")).toBe(47);
  });
  it("sí/no con matices: «no problem» es un sí", () => {
    const s = step("cafe", "seat");
    expect(evaluate(s, "Yes, sure!").yesno).toBe("yes");
    expect(evaluate(s, "No problem, sit down").yesno).toBe("yes");
    expect(evaluate(s, "Sorry, it's taken").yesno).toBe("no");
    expect(evaluate(s, "No, thank you").yesno).toBe("no");
  });
  it("trabajo, gustos y motivos", () => {
    expect(evaluate(step("papito", "job"), "I work in a bank").understood).toBe(true);
    expect(evaluate(step("papito", "job"), "I study engineering").understood).toBe(true);
    expect(evaluate(step("papito", "free-time"), "I love dancing and reading").understood).toBe(true);
    expect(evaluate(step("papito", "why"), "Because I want to travel").understood).toBe(true);
    expect(evaluate(step("papito", "free-time"), "pizza").understood).toBe(false);
  });
  it("detecta cuando le devuelves la pregunta", () => {
    expect(evaluate(step("papito", "from"), "I'm from Cali. And you?").askedBack).toBe(true);
  });
});

describe("errores frecuentes de hispanohablantes", () => {
  const fix = (t: string) => detectMistakes(t)[0]?.better;
  it("corrige y da la frase completa natural", () => {
    expect(fix("I have 25 years")).toBe("I'm 25 years old");
    expect(fix("i am agree with you")).toBe("I agree with you");
    expect(fix("She have two kids")).toBe("She has two kids");
    expect(fix("I no like coffee")).toBe("I don't like coffee");
    expect(fix("I work here since 3 years")).toBe("I work here for 3 years");
    expect(fix("I am teacher")).toBe("I'm a teacher");
    expect(fix("I am engineer")).toBe("I'm an engineer");
    expect(fix("I have hungry")).toBe("I'm hungry");
    expect(fix("Is very good")).toBe("It is very good");
    expect(fix("I like the music")).toBe("I like music");
  });
  it("no marca frases correctas", () => {
    for (const ok of ["I'm 25 years old", "No problem!", "I agree", "I'm a teacher", "I like the music teacher", "I have two brothers", "I've lived here since 2020"]) expect(detectMistakes(ok), ok).toEqual([]);
  });
});

describe("flujo de la conversación", () => {
  it("entiende, reacciona usando tu dato y pasa a la siguiente pregunta", () => {
    let s = startTalk(papito);
    expect(s.messages.at(-1)!.en).toContain("What's your name?");
    s = answer(papito, s, "My name is Laura");
    expect(s.stepIdx).toBe(1);
    const texts = s.messages.map((m) => m.en);
    expect(texts).toContain("Nice to meet you, Laura!");
    expect(texts.at(-1)).toBe("Where are you from?");
    expect(s.messages.find((m) => m.from === "me")!.feedback!.kind).toBe("ok");
  });
  it("si respondes en español te anima a decirlo en inglés y repite la pregunta", () => {
    const s = answer(papito, startTalk(papito), "Me llamo Laura");
    expect(s.stepIdx).toBe(0);
    expect(s.messages.find((m) => m.from === "me")!.feedback!.kind).toBe("spanish");
    expect(s.messages.at(-1)!.en).toContain("What's your name?");
  });
  it("si no entiende, pide aclarar; al segundo intento fallido sigue y te da un ejemplo", () => {
    let s = answer(papito, startTalk(papito), "blue sky today");
    expect(s.stepIdx).toBe(0);
    expect(s.retries).toBe(1);
    expect(s.messages.at(-1)!.en).toContain("What's your name?"); // pide aclarar repitiendo la pregunta
    s = answer(papito, s, "the weather is nice");
    expect(s.stepIdx).toBe(1);
    const last = s.messages.filter((m) => m.from === "me").at(-1)!;
    expect(last.feedback!.kind).toBe("skipped");
    expect(last.feedback!.better).toBe(papito.steps[0]!.model);
    expect(s.understoodFirstTry).toBe(0);
  });
  it("corrige sin cortar la charla: entiende y además sugiere la forma natural", () => {
    let s = answer(papito, startTalk(papito), "I'm Ana");
    s = answer(papito, s, "I'm from Cali");
    s = answer(papito, s, "I have 28 years");
    expect(s.stepIdx).toBe(3);
    const fb = s.messages.filter((m) => m.from === "me").at(-1)!.feedback!;
    expect(fb.kind).toBe("fix");
    expect(fb.better).toBe("I'm 28 years old");
  });
  it("responde cuando le devuelves la pregunta y usa ramas sí/no", () => {
    let s = answer(papito, startTalk(papito), "I'm Ana");
    s = answer(papito, s, "I'm from Cali, and you?");
    expect(s.messages.map((m) => m.en)).toContain("Me? I'm from a potato farm in Boyacá!");
    const cafe = interviewById.get("cafe")!;
    const yes = answer(cafe, startTalk(cafe), "Yes, sure");
    const no = answer(cafe, startTalk(cafe), "Sorry, it's taken");
    expect(yes.messages.map((m) => m.en)).toContain("Thanks! I'm Jake, by the way.");
    expect(no.messages.map((m) => m.en).join(" ")).toContain("Can I stand here");
  });
  it("se puede completar cada entrevista con las respuestas modelo (puntuación perfecta)", () => {
    for (const iv of INTERVIEWS) {
      let s = startTalk(iv);
      for (const st of iv.steps) s = answer(iv, s, st.model);
      expect(s.done, iv.id).toBe(true);
      expect(s.messages.at(-1)!.en).toBe(iv.outro.en);
      expect(summarize(iv, s)).toMatchObject({ score: 1, understoodFirstTry: iv.steps.length, mistakes: [] });
      expect(answer(iv, s, "hello")).toBe(s); // terminada: no cambia
    }
  });
  it("el estado se puede guardar y restaurar (y se rechaza si no corresponde)", () => {
    let s = answer(papito, startTalk(papito), "I'm Ana");
    const restored = parseTalkState(papito, JSON.parse(JSON.stringify(s)));
    expect(restored).toEqual(s);
    expect(parseTalkState(interviewById.get("cafe")!, s)).toBeNull();
    expect(parseTalkState(papito, { ...s, stepIdx: 99 })).toBeNull();
    expect(parseTalkState(papito, "basura")).toBeNull();
  });
});

describe("conversaciones de trabajo", () => {
  it("hay al menos 5 conversaciones de trabajo y todas tienen categoría válida", () => {
    expect(INTERVIEWS.filter((i) => i.category === "trabajo").length).toBeGreaterThanOrEqual(5);
    for (const iv of INTERVIEWS) expect(["trabajo", "viajes", "social"]).toContain(iv.category);
  });

  it("reconoce fechas y horas y une las piezas contiguas", () => {
    expect(parseWhen("I can send it to you on Friday.")).toBe("on Friday");
    expect(parseWhen("Tuesday at 10 am works for me")).toBe("Tuesday at 10 am");
    expect(parseWhen("tomorrow afternoon")).toBe("tomorrow afternoon");
    expect(parseWhen("I can finish it by Thursday")).toBe("by Thursday");
    expect(parseWhen("next week")).toBe("next week");
    expect(parseWhen("at 3:30 pm")).toBe("at 3:30 pm");
    expect(parseWhen("in two days")).toBe("in two days");
    expect(parseWhen("Good afternoon")).toBe("afternoon"); // «noon» dentro de «afternoon» no cuenta como mediodía
    expect(parseWhen("I don't know")).toBeNull();
    expect(parseWhen("Mondays are hard")).toBeNull();
  });

  it("el personaje usa tu fecha, con mayúscula si empieza la frase", () => {
    const iv = interviewById.get("llamada")!;
    let s = startTalk(iv);
    s = answer(iv, s, "Yes, of course");
    s = answer(iv, s, "Yes, I did");
    s = answer(iv, s, "I can send it tomorrow afternoon");
    expect(s.messages.map((m) => m.en)).toContain("Perfect, tomorrow afternoon then.");
    s = answer(iv, s, "Sure");
    s = answer(iv, s, "wednesday at 9 am");
    expect(s.messages.map((m) => m.en)).toContain("Wednesday at 9 am works for me. I'll send you an invitation.");
    expect(s.done).toBe(true);
  });

  it("si no dices cuándo, pide aclarar", () => {
    const iv = interviewById.get("jefa")!;
    let s = startTalk(iv);
    s = answer(iv, s, "It's going well");
    s = answer(iv, s, "Not yet");
    const before = s.stepIdx;
    s = answer(iv, s, "I am working very hard");
    expect(s.stepIdx).toBe(before);
    expect(s.messages.at(-1)!.en).toContain("When can you finish it?");
  });

  it("corrige errores típicos del inglés de oficina", () => {
    const fix = (t: string) => detectMistakes(t)[0]?.better;
    expect(fix("I have a doubt about the report")).toBe("I have a question about the report");
    expect(fix("I will assist to the meeting")).toBe("I will attend the meeting");
    expect(fix("We can meet in the next week")).toBe("We can meet next week");
    expect(fix("Can you remember me to call him?")).toBe("Can you remind me to call him?");
    expect(fix("I can send it the friday")).toBe("I can send it on Friday");
    for (const ok of ["I have a question", "I will attend the meeting", "See you next week", "Can you remind me?", "I can send it on Friday", "I remember the day"]) expect(detectMistakes(ok), ok).toEqual([]);
  });
});

describe("sí/no con formas cortas de trabajo", () => {
  it("«Not yet», «I didn't», «I can't» son no; «I did», «I can» son sí", () => {
    const s = interviewById.get("jefa")!.steps.find((x) => x.id === "finished")!;
    for (const no of ["Not yet", "No, I didn't", "I haven't finished", "Sorry, I can't"]) expect(evaluate(s, no).yesno, no).toBe("no");
    for (const yes of ["Yes, I did", "I did it yesterday", "I can do it", "I have finished it"]) expect(evaluate(s, yes).yesno, yes).toBe("yes");
  });
});
