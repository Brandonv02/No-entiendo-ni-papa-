import { describe, expect, it } from "vitest";
import { addDays, dayKey } from "@/lib/dates";
import { computeStreak } from "@/lib/streak";
import { applyReview, newItem, pickDue, DEFAULT_SRS } from "@/lib/srs";
import { buildFinal, buildPractice, check, checkWriting, correctAnswerText, normalize, poolsFor, sameEnglish, speechSimilarity, blankRegex } from "@/lib/engine";
import { LESSONS, UNITS, phraseById } from "@/content";
import type { ChoiceExercise, OrderExercise, TypeExercise } from "@/lib/types";

describe("fechas locales", () => {
  it("dayKey usa la fecha local, no UTC", () => {
    expect(dayKey(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
    expect(dayKey(new Date(2026, 0, 6, 0, 1))).toBe("2026-01-06");
  });
  it("addDays cruza mes y año", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29");
  });
});

describe("racha diaria", () => {
  it("cuenta días consecutivos hasta hoy", () => {
    const r = computeStreak(["2026-03-08", "2026-03-09", "2026-03-10"], "2026-03-10");
    expect(r).toEqual({ current: 3, best: 3, doneToday: true });
  });
  it("sigue viva si hoy aún no hay actividad pero ayer sí", () => {
    expect(computeStreak(["2026-03-08", "2026-03-09"], "2026-03-10").current).toBe(2);
  });
  it("se rompe si pasó un día completo sin estudiar", () => {
    const r = computeStreak(["2026-03-07", "2026-03-08"], "2026-03-10");
    expect(r.current).toBe(0);
    expect(r.best).toBe(2);
  });
  it("cambio de día a medianoche local", () => {
    const before = dayKey(new Date(2026, 5, 1, 23, 59));
    const after = dayKey(new Date(2026, 5, 2, 0, 0));
    expect(computeStreak([before], after).current).toBe(1);
    expect(computeStreak([before], after).doneToday).toBe(false);
  });
  it("cruza el cambio de horario sin saltarse días", () => {
    // 2026-03-08 es DST en EE. UU.; las claves son de calendario, no de 24 h.
    expect(computeStreak(["2026-03-07", "2026-03-08", "2026-03-09"], "2026-03-09").current).toBe(3);
  });
  it("sin actividad = 0", () => {
    expect(computeStreak([], "2026-03-10")).toEqual({ current: 0, best: 0, doneToday: false });
  });
});

describe("repaso espaciado", () => {
  const now = new Date(2026, 2, 10, 10);
  const today = "2026-03-10";
  it("un acierto sube el dominio y agenda el siguiente repaso", () => {
    const a = applyReview(newItem("w:x", today), true, now, today);
    expect(a.mastery).toBe(1);
    expect(a.due).toBe(addDays(today, DEFAULT_SRS.intervalsDays[1]!));
    expect(a.correct).toBe(1);
    expect(a.attempts).toBe(1);
    expect(a.lastReview).toBe(now.getTime());
  });
  it("los intervalos crecen con aciertos seguidos", () => {
    let it = newItem("w:x", today);
    const dues: string[] = [];
    for (let i = 0; i < 4; i++) {
      it = applyReview(it, true, now, today);
      dues.push(it.due);
    }
    expect(dues).toEqual(["2026-03-11", "2026-03-12", "2026-03-14", "2026-03-18"]);
  });
  it("un error baja el dominio y vuelve a tocar hoy", () => {
    let it = newItem("p:x", today);
    for (let i = 0; i < 3; i++) it = applyReview(it, true, now, today);
    const bad = applyReview(it, false, now, today);
    expect(bad.mastery).toBe(1);
    expect(bad.due).toBe(today);
    expect(bad.wrong).toBe(1);
    expect(bad.streakCorrect).toBe(0);
  });
  it("prioriza lo que más se falla y ordena de forma estable", () => {
    const mk = (id: string, wrong: number, correct: number, due: string) => ({ ...newItem(id, today), wrong, correct, attempts: wrong + correct, due });
    const items = [mk("w:ok", 0, 3, "2026-03-10"), mk("w:bad", 4, 1, "2026-03-10"), mk("w:future", 3, 0, "2026-03-20"), mk("w:late", 0, 2, "2026-03-01")];
    const picked = pickDue(items, today, 10).map((i) => i.id);
    expect(picked).not.toContain("w:future");
    expect(picked[0]).toBe("w:late"); // 9 días de retraso pesa más que la tasa de error
    expect(picked.indexOf("w:bad")).toBeLessThan(picked.indexOf("w:ok"));
  });
  it("no repasa elementos nunca intentados", () => {
    expect(pickDue([newItem("w:new", today)], today, 5)).toEqual([]);
  });
});

describe("contenido", () => {
  it("12 unidades con lecciones completas", () => {
    expect(UNITS).toHaveLength(12);
    for (const u of UNITS) expect(u.lessons.length).toBeGreaterThanOrEqual(2);
  });
  it("ids únicos y datos obligatorios", () => {
    const ids = new Set<string>();
    for (const l of LESSONS) {
      expect(ids.has(l.id)).toBe(false);
      ids.add(l.id);
      expect(l.vocab.length).toBeGreaterThanOrEqual(6);
      expect(l.phrases.length).toBeGreaterThanOrEqual(4);
      expect(l.grammar.points.length).toBeGreaterThan(0);
      expect(l.writing.keywords.length).toBeGreaterThan(0);
      expect(l.speaking.every((id) => phraseById.has(id))).toBe(true);
    }
  });
  it("cada frase con hueco contiene la palabra completa y sus distractores no la repiten", () => {
    for (const l of LESSONS)
      for (const p of l.phrases) {
        if (!p.blank) continue;
        expect(blankRegex(p.blank).test(p.en), `${p.id}: ${p.en}`).toBe(true);
        expect(p.blankDistractors?.map((d) => d.toLowerCase())).not.toContain(p.blank.toLowerCase());
      }
  });
  it("las frases de escritura de ejemplo cumplen sus propias palabras clave", () => {
    for (const l of LESSONS) expect(checkWriting(l.writing.sample, l.writing.keywords).missing, l.id).toEqual([]);
  });
});

describe("motor de ejercicios", () => {
  it("normalize y contracciones", () => {
    expect(normalize("  Hello,   World! ")).toBe("hello world");
    expect(sameEnglish("I am fine, thank you.", "i'm fine thank you")).toBe(true);
    expect(sameEnglish("I do not know", "I don't know")).toBe(true);
    expect(sameEnglish("I am fine", "I am finer")).toBe(false);
  });
  it("genera ejercicios válidos para todas las lecciones", () => {
    for (const l of LESSONS) {
      const pools = poolsFor(LESSONS.filter((x) => x.unitId === l.unitId));
      for (const ex of [...buildPractice(l, pools, true), ...buildFinal(l, pools, 1)]) {
        if ("options" in ex) {
          expect(ex.options, ex.id).toContain(ex.answer);
          expect(new Set(ex.options.map(normalize)).size, ex.id).toBe(ex.options.length);
          expect(ex.options.length, ex.id).toBeGreaterThanOrEqual(3);
        }
        if ("tiles" in ex) {
          expect([...ex.tiles].sort(), ex.id).toEqual([...ex.answer].sort());
        }
        // La respuesta mostrada como correcta debe aprobar su propia corrección.
        const resp = ex.kind === "order" || ex.kind === "order-es" ? ex.answer : correctAnswerText(ex);
        expect(check(ex, resp), ex.id).toBe(true);
      }
    }
  });
  it("sin audio no se generan ejercicios de escucha", () => {
    const l = LESSONS[0]!;
    expect(buildPractice(l, poolsFor([l]), false).some((e) => e.kind === "listen")).toBe(false);
    expect(buildPractice(l, poolsFor([l]), true).some((e) => e.kind === "listen")).toBe(true);
  });
  it("la corrección rechaza respuestas erróneas", () => {
    const l = LESSONS[0]!;
    const ex = buildPractice(l, poolsFor([l]), true);
    const choice = ex.find((e) => e.kind === "choose-es") as ChoiceExercise;
    expect(check(choice, choice.options.find((o) => o !== choice.answer)!)).toBe(false);
    const ord = ex.find((e) => e.kind === "order") as OrderExercise;
    expect(check(ord, [...ord.answer].reverse())).toBe(false);
    expect(check(ord, ord.answer)).toBe(true);
    const typ = ex.find((e) => e.kind === "type-en") as TypeExercise;
    expect(check(typ, "totally wrong")).toBe(false);
    expect(check(typ, typ.accepted[0]!.toUpperCase())).toBe(true);
  });
  it("evaluación final: hasta 8 preguntas, reproducible por intento", () => {
    const l = LESSONS[0]!;
    const pools = poolsFor([l]);
    const a = buildFinal(l, pools, 1);
    expect(a.length).toBeGreaterThanOrEqual(6);
    expect(a.length).toBeLessThanOrEqual(8);
    expect(buildFinal(l, pools, 1).map((e) => e.id)).toEqual(a.map((e) => e.id));
  });
  it("producción escrita: detecta palabras clave sin evaluar gramática", () => {
    const r = checkWriting("Good morning my friend", ["good morning", "how are you"]);
    expect(r.found).toEqual(["good morning"]);
    expect(r.missing).toEqual(["how are you"]);
  });
  it("similitud del habla se calcula de verdad", () => {
    expect(speechSimilarity("Nice to meet you", "nice to meet you")).toBe(1);
    expect(speechSimilarity("Nice to meet you", "nice to see you")).toBe(0.75);
    expect(speechSimilarity("Nice to meet you", "")).toBe(0);
  });
});
