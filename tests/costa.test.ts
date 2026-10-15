import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { COSTA_CATEGORIES, EXPRESSIONS, expressionsIn } from "@/content/costa";
import { CONVERSATIONS } from "@/content/conversations";
import { buildExpressionPractice, buildExpressionReview, conversationScore, recallExercise } from "@/lib/costa";
import { check, checkWriting, correctAnswerText, normalize } from "@/lib/engine";
import { CONTEXTS, say, type MascotContext } from "@/lib/mascot";
import { newItem } from "@/lib/srs";
import { AppDB, setDb } from "@/lib/db";
import { loadStats, recordLessonResult } from "@/lib/progress";
import type { ConvOption } from "@/lib/types";

describe("expresiones: integridad de datos", () => {
  it("8 categorías con al menos 3 expresiones, ids únicos", () => {
    expect(COSTA_CATEGORIES).toHaveLength(8);
    for (const c of COSTA_CATEGORIES) expect(expressionsIn(c.id).length, c.id).toBeGreaterThanOrEqual(3);
    const ids = EXPRESSIONS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("cada expresión trae lo necesario para enseñar, no solo traducir", () => {
    for (const e of EXPRESSIONS) {
      expect(e.equivalents.length, e.id).toBeGreaterThanOrEqual(3);
      expect(e.examples.length, e.id).toBeGreaterThanOrEqual(1);
      expect(e.scenario.wrong.length, e.id).toBeGreaterThanOrEqual(2);
      const opts = [e.scenario.answer.en, ...e.scenario.wrong.map((w) => w.en)].map(normalize);
      expect(new Set(opts).size, `${e.id}: opciones repetidas`).toBe(opts.length);
      expect(e.produce.accepted.length, e.id).toBeGreaterThan(0);
      expect(checkWriting(e.explain.sample, e.explain.keywords).found.length, `${e.id}: la muestra no cumple sus palabras clave`).toBeGreaterThan(0);
      if (e.registerPair) expect(e.registerPair.informal).not.toBe(e.registerPair.formal);
      for (const m of e.mistakes ?? []) expect(m.wrong).not.toBe(m.right);
    }
  });
});

describe("ejercicios contextuales", () => {
  it("se generan válidos para todas las categorías y todos aprueban con su respuesta modelo", () => {
    for (const c of COSTA_CATEGORIES)
      for (const canListen of [true, false]) {
        const list = buildExpressionPractice(c.id, canListen);
        expect(list.length, c.id).toBeGreaterThanOrEqual(10);
        expect(new Set(list.map((x) => x.id)).size, `${c.id}: ids repetidos`).toBe(list.length);
        for (const ex of list) {
          if ("options" in ex) {
            expect(ex.options, ex.id).toContain(ex.answer);
            expect(new Set(ex.options.map(normalize)).size, ex.id).toBe(ex.options.length);
            expect(check(ex, ex.answer), ex.id).toBe(true);
            const wrong = ex.options.find((o) => o !== ex.answer)!;
            expect(check(ex, wrong), ex.id).toBe(false);
            if (ex.optionFeedback) for (const k of Object.keys(ex.optionFeedback)) expect(ex.options, `${ex.id}: feedback de opción inexistente`).toContain(k);
          } else if ("tiles" in ex) {
            expect(check(ex, ex.answer), ex.id).toBe(true);
          } else {
            expect(check(ex, correctAnswerText(ex)), ex.id).toBe(true);
            expect(check(ex, "zzz qqq"), ex.id).toBe(false);
          }
        }
        // sin audio: la intención se lee, no se escucha
        const intents = list.filter((x) => x.kind === "intent");
        expect(intents.length).toBeGreaterThan(0);
        for (const i of intents) expect(Boolean(i.speak), `${c.id} canListen=${canListen}`).toBe(canListen);
      }
  });
  it("cubre los tipos de actividad pedidos", () => {
    const kinds = new Set(COSTA_CATEGORIES.flatMap((c) => buildExpressionPractice(c.id, true).map((e) => e.kind)));
    for (const k of ["scenario", "intent", "convo", "order", "type-en", "explain", "fix", "register"]) expect(kinds.has(k as never), k).toBe(true);
  });
  it("explain acepta una explicación con ideas clave y rechaza una sin ellas", () => {
    const ex = buildExpressionPractice("saludos", true).find((e) => e.kind === "explain")!;
    expect(check(ex, "It is a friendly way to say hello")).toBe(true);
    expect(check(ex, "I like pizza")).toBe(false);
  });
  it("recordar no muestra la traducción y acepta cualquier equivalencia", () => {
    const e = EXPRESSIONS.find((x) => x.id === "a2")!;
    const r = recallExercise(e);
    expect(JSON.stringify([r.prompt, r.context])).not.toContain(e.es);
    expect(check(r, "let's do it")).toBe(true);
    expect(check(r, "Absolutely")).toBe(true);
    expect(check(r, "I don't know")).toBe(false);
  });
  it("el repaso de expresiones usa solo ítems x:", () => {
    const items = ["x:s1", "x:a2", "x:c1"].map((id) => newItem(id, "2026-01-01"));
    const list = buildExpressionReview(items, "d");
    expect(list).toHaveLength(3);
    expect(list.every((e) => e.itemId.startsWith("x:"))).toBe(true);
    expect(newItem("x:s1", "2026-01-01").kind).toBe("expr");
  });
});

describe("conversaciones", () => {
  it("el grafo es consistente: referencias válidas y todo nodo llega a un final", () => {
    for (const c of CONVERSATIONS) {
      expect(c.nodes[c.start], c.id).toBeDefined();
      const reach = (from: string, seen = new Set<string>()): boolean => {
        if (seen.has(from)) return false;
        seen.add(from);
        const n = c.nodes[from]!;
        if (!n.options) return true;
        return n.options.some((o) => reach(o.next, new Set(seen)));
      };
      for (const [id, n] of Object.entries(c.nodes)) {
        if (n.options) {
          expect(n.options.length, `${c.id}.${id}`).toBeGreaterThanOrEqual(1);
          for (const o of n.options) expect(c.nodes[o.next], `${c.id}.${id} → ${o.next}`).toBeDefined();
        } else expect(n.end, `${c.id}.${id} final sin resumen`).toBeTruthy();
        expect(reach(id), `${c.id}.${id} no llega a un final`).toBe(true);
      }
    }
  });
  it("las respuestas débiles explican cómo mejorar y se puede sacar el máximo eligiendo bien", () => {
    for (const c of CONVERSATIONS) {
      for (const n of Object.values(c.nodes)) for (const o of n.options ?? []) if (o.quality === "weak") expect(o.better ?? o.why, c.id).toBeTruthy();
      const picks: ConvOption[] = [];
      let id = c.start;
      for (let i = 0; i < 10 && c.nodes[id]!.options; i++) {
        const o = c.nodes[id]!.options!.find((x) => x.quality === "great");
        expect(o, `${c.id}.${id} sin opción great`).toBeDefined();
        picks.push(o!);
        id = o!.next;
      }
      expect(c.nodes[id]!.options, `${c.id}: el camino perfecto no termina`).toBeUndefined();
      expect(conversationScore(picks)).toBe(1);
    }
  });
  it("pedir que repitan no penaliza la puntuación", () => {
    const mk = (quality: ConvOption["quality"], kind?: ConvOption["kind"]): ConvOption => ({ en: "x", es: "x", quality, why: "", next: "n", ...(kind ? { kind } : {}) });
    expect(conversationScore([mk("great"), mk("ok", "repeat"), mk("great")])).toBe(1);
    expect(conversationScore([mk("weak"), mk("great")])).toBeCloseTo(0.6);
    expect(conversationScore([])).toBe(0);
  });
});

describe("mascota", () => {
  const contexts = Object.keys(CONTEXTS) as MascotContext[];
  it("todos los contextos tienen varios mensajes y un estado de ánimo", () => {
    for (const c of contexts) expect(CONTEXTS[c].messages.length, c).toBeGreaterThanOrEqual(3);
    for (const needed of ["greet", "explain", "correct", "wrong", "hint", "mission", "streak", "review", "offline", "farewell"]) expect(contexts).toContain(needed);
  });
  it("no repite el mismo mensaje dos veces seguidas y cambia según el resultado", () => {
    for (const c of contexts) {
      let prev = "";
      for (let i = 0; i < 30; i++) {
        const m = say(c, () => 0); // peor caso: siempre el mismo índice
        expect(m.text, c).not.toBe(prev);
        prev = m.text;
      }
    }
    expect(say("correct").mood).not.toBe(say("wrong").mood);
    const pool = new Set(Array.from({ length: 40 }, () => say("correct").text));
    expect(pool.size).toBeGreaterThan(3);
  });
});

describe("progreso del módulo Costa", () => {
  beforeEach(() => setDb(new AppDB(`costa-${Math.random()}`)));
  it("categorías y conversaciones se guardan aparte de las lecciones de la ruta", async () => {
    await recordLessonResult("costa-saludos", 0.9, []);
    await recordLessonResult("talk-cartagena", 1, []);
    await recordLessonResult("u1l1", 0.8, []);
    const st = await loadStats();
    expect(st.lessonsCompleted).toBe(1);
    expect(st.costaCompleted).toBe(2);
  });
});
