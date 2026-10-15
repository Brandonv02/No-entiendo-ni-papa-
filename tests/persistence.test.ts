import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { LESSONS } from "@/content";
import { buildPractice, check, correctAnswerText, poolsFor } from "@/lib/engine";
import { AppDB, DEFAULT_SETTINGS, getDb, setDb } from "@/lib/db";
import { getSettings, loadStats, recordAnswer, recordLessonResult, resetProgress, saveSettings } from "@/lib/progress";
import { clearResume, describeResume, listResume, loadLastVisited, loadResume, parseResume, resumeKey, saveLastVisited, saveResume, type RunSnapshot } from "@/lib/resume";
import { exportBackup, importBackup, parseBackup } from "@/lib/backup";

let name = "";
/** «Abrir la app»: una instancia NUEVA de Dexie sobre la MISMA base, como al reabrir el navegador. */
const reopen = () => setDb(new AppDB(name));
beforeEach(() => {
  name = `persist-${Math.random().toString(36).slice(2)}`;
  setDb(new AppDB(name));
});

const lesson = LESSONS[0]!;
const exercisesFor = () => buildPractice(lesson, poolsFor(LESSONS.filter((l) => l.unitId === lesson.unitId)), false);

function snapshot(index: number, over: Partial<RunSnapshot> = {}): RunSnapshot {
  return { exercises: exercisesFor(), index, correct: index, skipped: 0, mistakes: [], ...over };
}
const meta = { kind: "lesson" as const, id: lesson.id, title: lesson.title, href: `/lesson/${lesson.id}/`, unitId: lesson.unitId };

describe("escenario completo: onboarding → lección a medias → cerrar → reabrir → completar → reabrir", () => {
  it("no se vuelve al inicio y se puede reanudar donde se quedó", async () => {
    // 1-2. usuario nuevo: ajustes por defecto y SIN escribir nada por solo abrir la app
    expect(await getSettings()).toEqual(DEFAULT_SETTINGS);
    expect(await getDb().settings.count()).toBe(0);
    await saveSettings({ onboarded: true, pathMode: "guided", dailyGoal: 20 });

    // 3-5. abre una lección, responde 4 ejercicios y la abandona a mitad
    const ex = exercisesFor();
    for (let i = 0; i < 4; i++) await recordAnswer(ex[i]!.itemId, ex[i]!.skill, i !== 2, lesson.id);
    await saveResume({ ...meta, stage: "practice", attempt: 1, runs: { practice: snapshot(4, { correct: 3, mistakes: [ex[2]!.itemId] }) } });
    await saveLastVisited({ kind: "lesson", id: lesson.id, title: lesson.title, href: meta.href, unitId: lesson.unitId });

    // 6-8. «cierra» y crea una nueva instancia con la misma base
    getDb().close();
    reopen();
    const settings = await getSettings();
    expect(settings.onboarded).toBe(true); // 9. no vuelve al onboarding
    const pending = await listResume();
    expect(pending).toHaveLength(1);
    expect(pending[0]!.stage).toBe("practice");
    expect(describeResume(pending[0]!)).toBe(`Practicar · ejercicio 5 de ${ex.length}`);
    expect((await loadLastVisited())?.unitId).toBe(lesson.unitId);
    const st = await loadStats();
    expect(st.answeredToday).toBe(4);
    expect(st.seen).toBe(4);
    expect(st.due).toBe(1); // el error del ejercicio 3 sigue pendiente de repaso

    // 10. reanuda: mismo punto, mismas respuestas
    const doc = (await loadResume("lesson", lesson.id))!;
    const run = doc.runs.practice!;
    expect(run.index).toBe(4);
    expect(run.correct).toBe(3);
    expect(run.mistakes).toEqual([ex[2]!.itemId]);
    // los ejercicios guardados siguen siendo corregibles tras pasar por IndexedDB
    for (const e of run.exercises) {
      const resp = "tiles" in e ? e.answer : correctAnswerText(e);
      expect(check(e, resp), e.id).toBe(true);
    }
    // continúa y termina
    for (let i = 4; i < run.exercises.length; i++) await recordAnswer(run.exercises[i]!.itemId, run.exercises[i]!.skill, true, lesson.id);
    await saveResume({ ...meta, stage: "final", attempt: 1, runs: { practice: snapshot(run.exercises.length) } });

    // 11. completa la lección: queda aprobada y desaparece el avance a medias
    await recordLessonResult(lesson.id, 0.9, []);
    await clearResume("lesson", lesson.id);

    // 12-13. otra apertura: sigue completada y no hay nada «a medias»
    getDb().close();
    reopen();
    expect(await listResume()).toEqual([]);
    expect((await loadStats()).lessonsCompleted).toBe(1);
    expect((await getSettings()).onboarded).toBe(true);
  });

  it("14. la recuperación no depende de la red (todo es local)", async () => {
    await saveSettings({ onboarded: true });
    await saveResume({ ...meta, stage: "writing", attempt: 1, runs: {} });
    const realFetch = globalThis.fetch;
    globalThis.fetch = (() => Promise.reject(new TypeError("offline"))) as typeof fetch;
    try {
      getDb().close();
      reopen();
      expect((await getSettings()).onboarded).toBe(true);
      expect((await loadResume("lesson", lesson.id))?.stage).toBe("writing");
    } finally {
      globalThis.fetch = realFetch;
    }
  });
});

describe("los valores por defecto nunca pisan datos existentes", () => {
  it("leer ajustes no escribe y un patch parcial conserva el resto", async () => {
    await saveSettings({ onboarded: true, dailyGoal: 40, pathMode: "free" });
    getDb().close();
    reopen();
    for (let i = 0; i < 3; i++) await getSettings();
    expect(await getSettings()).toMatchObject({ onboarded: true, dailyGoal: 40, pathMode: "free" });
    await saveSettings({ slowSpeech: true });
    expect(await getSettings()).toMatchObject({ onboarded: true, dailyGoal: 40, pathMode: "free", slowSpeech: true });
  });
  it("una fila de ajustes corrupta no se borra al leer y no impide leer el progreso", async () => {
    await getDb().settings.put({ key: "settings", value: "basura" });
    await recordLessonResult("u1l1", 1, []);
    expect(await getSettings()).toEqual(DEFAULT_SETTINGS); // por defecto en memoria...
    expect((await getDb().settings.get("settings"))?.value).toBe("basura"); // ...pero NO se sobrescribió
    expect((await loadStats()).lessonsCompleted).toBe(1);
  });
  it("abrir la base ya existente (misma versión) no vacía ninguna tabla", async () => {
    await recordAnswer("w:u1l1v1", "reading", true);
    await recordLessonResult("u1l1", 0.8, []);
    for (let i = 0; i < 3; i++) {
      getDb().close();
      reopen();
      const st = await loadStats();
      expect(st.seen).toBe(1);
      expect(st.lessonsCompleted).toBe(1);
    }
  });
});

describe("avance guardado: validación y seguridad", () => {
  it("un documento de otra versión o dañado se ignora sin lanzar ni borrar", async () => {
    expect(parseResume(null)).toBeNull();
    expect(parseResume({ v: 99, kind: "lesson", id: "x", title: "t", href: "/", stage: "learn", attempt: 1, runs: {}, savedAt: 1 })).toBeNull();
    expect(parseResume({ v: 1, kind: "otro", id: "x", title: "t", href: "/", stage: "learn", attempt: 1, runs: {}, savedAt: 1 })).toBeNull();
    await getDb().settings.put({ key: resumeKey("lesson", "u1l1"), value: { v: 1, basura: true } });
    expect(await loadResume("lesson", "u1l1")).toBeNull();
    expect(await getDb().settings.get(resumeKey("lesson", "u1l1"))).toBeDefined();
  });
  it("ignora instantáneas con índices o ejercicios inválidos pero conserva las válidas", () => {
    const good = snapshot(2);
    const doc = parseResume({ v: 1, kind: "lesson", id: "a", title: "t", href: "/", stage: "practice", attempt: 1, savedAt: 5, runs: { practice: good, final: { ...good, index: 999 }, x: { ...good, exercises: [] } } });
    expect(Object.keys(doc!.runs)).toEqual(["practice"]);
  });
  it("lista el avance más reciente primero y cubre lecciones, categorías y conversaciones", async () => {
    await saveResume({ kind: "lesson", id: "u1l1", title: "A", href: "/a", stage: "learn", attempt: 1, runs: {} }, 1000);
    await saveResume({ kind: "costa", id: "saludos", title: "B", href: "/b", stage: "practice", attempt: 1, runs: { practice: snapshot(3) } }, 3000);
    await saveResume({ kind: "talk", id: "cartagena", title: "C", href: "/c", stage: "talk", attempt: 1, runs: {}, extra: { nodeId: "n0" } }, 2000);
    expect((await listResume()).map((d) => d.kind)).toEqual(["costa", "talk", "lesson"]);
  });
  it("guardar de nuevo reemplaza el avance de esa sesión (no se acumulan duplicados)", async () => {
    for (let i = 0; i < 5; i++) await saveResume({ ...meta, stage: "practice", attempt: 1, runs: { practice: snapshot(i) } });
    expect(await listResume()).toHaveLength(1);
    expect((await loadResume("lesson", lesson.id))!.runs.practice!.index).toBe(4);
  });
});

describe("reinicio explícito", () => {
  it("borra progreso, avances a medias y última visita, pero conserva los ajustes", async () => {
    await saveSettings({ onboarded: true, dailyGoal: 30 });
    await recordAnswer("w:a", "reading", true);
    await recordLessonResult("u1l1", 1, []);
    await saveResume({ ...meta, stage: "practice", attempt: 1, runs: {} });
    await saveLastVisited({ kind: "lesson", id: "u1l1", title: "x", href: "/x" });
    await resetProgress();
    expect(await listResume()).toEqual([]);
    expect(await loadLastVisited()).toBeNull();
    expect((await loadStats()).seen).toBe(0);
    expect(await getSettings()).toMatchObject({ onboarded: true, dailyGoal: 30 });
  });
});

describe("estadísticas", () => {
  it("registra la fecha de la última actividad (solo respuestas)", async () => {
    expect((await loadStats()).lastActivityAt).toBeNull();
    const t = new Date(2026, 2, 10, 15, 30);
    await recordAnswer("w:a", "reading", true, undefined, t);
    expect((await loadStats(t)).lastActivityAt).toBe(t.getTime());
  });
});

describe("copia de seguridad (pasar el progreso entre Safari y la app instalada)", () => {
  async function seed() {
    await saveSettings({ onboarded: true, dailyGoal: 35 });
    await recordAnswer("w:u1l1v1", "reading", true);
    await recordAnswer("x:s1", "writing", false);
    await recordLessonResult("u1l1", 0.9, []);
    await saveResume({ kind: "costa", id: "saludos", title: "B", href: "/b", stage: "practice", attempt: 1, runs: { practice: snapshot(3) } });
  }
  it("exportar → importar en otra base reproduce el progreso", async () => {
    await seed();
    const file = JSON.parse(JSON.stringify(await exportBackup()));
    name = `other-${name}`;
    setDb(new AppDB(name));
    await saveSettings({ dailyGoal: 5 }); // datos previos que la importación reemplaza
    const { data, summary } = parseBackup(JSON.stringify(file));
    expect(summary).toMatchObject({ items: 2, lessons: 1, skipped: 0 });
    await importBackup(data);
    expect(await getSettings()).toMatchObject({ onboarded: true, dailyGoal: 35 });
    const st = await loadStats();
    expect(st).toMatchObject({ seen: 2, lessonsCompleted: 1 });
    expect((await listResume())[0]!.id).toBe("saludos");
  });
  it("rechaza archivos ajenos o rotos sin tocar nada", async () => {
    await seed();
    expect(() => parseBackup("no es json")).toThrow(/JSON/);
    expect(() => parseBackup(JSON.stringify({ app: "otra-app" }))).toThrow(/no es una copia/);
    expect(() => parseBackup(JSON.stringify({ app: "no-entiendo-ni-papa", version: 99, items: [], lessons: [], activity: [], settings: [] }))).toThrow(/más nueva/);
    expect((await loadStats()).seen).toBe(2);
  });
  it("descarta registros dañados y los cuenta", async () => {
    await seed();
    const file = await exportBackup();
    const dirty = { ...file, items: [...file.items, { id: "zzz" }, null as never], lessons: [...file.lessons, { lessonId: 5 } as never] };
    const { data, summary } = parseBackup(JSON.stringify(dirty));
    expect(summary.skipped).toBe(3);
    expect(data.items).toHaveLength(2);
  });
  it("una copia sin ajustes no obliga a repetir el onboarding", async () => {
    await seed();
    const file = await exportBackup();
    const { data } = parseBackup(JSON.stringify({ ...file, settings: [] }));
    await importBackup(data);
    expect((await getSettings()).onboarded).toBe(true);
  });
});
