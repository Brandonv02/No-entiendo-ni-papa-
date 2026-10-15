import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import Dexie from "dexie";
import { AppDB, DEFAULT_SETTINGS, sanitizeSettings, setDb } from "@/lib/db";
import { getSettings, isUnlocked, loadStats, logStudyTime, recordAnswer, recordLessonResult, resetProgress, saveSettings } from "@/lib/progress";
import { dayKey } from "@/lib/dates";

let n = 0;
beforeEach(() => {
  setDb(new AppDB(`test-${++n}`));
});

describe("persistencia en IndexedDB", () => {
  it("guarda y recupera ajustes tras 'reabrir' la base", async () => {
    await saveSettings({ onboarded: true, dailyGoal: 30, pathMode: "free" });
    const db = new AppDB(`test-${n}`); // misma base, instancia nueva = app reabierta
    setDb(db);
    const s = await getSettings();
    expect(s).toMatchObject({ onboarded: true, dailyGoal: 30, pathMode: "free" });
  });

  it("sanitizeSettings sobrevive a datos corruptos o de otra versión", () => {
    expect(sanitizeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings({ dailyGoal: "x", level: "Z", lastStudyDay: "hoy" })).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings({ dailyGoal: 9999 }).dailyGoal).toBe(100);
    expect(sanitizeSettings({ dailyGoal: 1 }).dailyGoal).toBe(5);
    expect(sanitizeSettings({ onboarded: true, futureField: 1 })).toMatchObject({ onboarded: true });
  });

  it("recordAnswer actualiza repaso y estadísticas de inmediato", async () => {
    const now = new Date(2026, 2, 10, 9);
    await recordAnswer("w:u1l1v1", "reading", true, "u1l1", now);
    await recordAnswer("w:u1l1v1", "reading", true, "u1l1", now);
    await recordAnswer("p:u1l1p1", "writing", false, "u1l1", now);
    await logStudyTime(90, "u1l1", now);
    const st = await loadStats(now);
    expect(st.answeredToday).toBe(3);
    expect(st.accuracy).toBeCloseTo(2 / 3);
    expect(st.totalSeconds).toBe(90);
    expect(st.streak.current).toBe(1);
    expect(st.seen).toBe(2);
    expect(st.due).toBe(1); // la frase fallada vuelve hoy
    expect(st.skills.writing).toEqual({ answered: 1, accuracy: 0 });
    expect(st.skills.listening.accuracy).toBeNull();
    expect(st.history.at(-1)).toMatchObject({ date: dayKey(now), answered: 3, seconds: 90 });
  });

  it("el tiempo solo (sin respuestas) no cuenta como día de racha", async () => {
    const now = new Date(2026, 2, 10, 9);
    await logStudyTime(60, undefined, now);
    expect((await loadStats(now)).streak.current).toBe(0);
  });

  it("racha a través de días reales guardados", async () => {
    await recordAnswer("w:a", "reading", true, undefined, new Date(2026, 2, 8, 22));
    await recordAnswer("w:a", "reading", true, undefined, new Date(2026, 2, 9, 8));
    expect((await loadStats(new Date(2026, 2, 9, 12))).streak.current).toBe(2);
    expect((await loadStats(new Date(2026, 2, 10, 12))).streak).toMatchObject({ current: 2, doneToday: false });
    expect((await loadStats(new Date(2026, 2, 11, 12))).streak.current).toBe(0);
  });

  it("aprobar una lección requiere ≥70% y no se pierde al reintentar peor", async () => {
    let r = await recordLessonResult("u1l1", 0.5, ["w:a"]);
    expect(r.passed).toBe(false);
    r = await recordLessonResult("u1l1", 0.8, []);
    expect(r.passed).toBe(true);
    r = await recordLessonResult("u1l1", 0.4, ["w:b"]);
    expect(r).toMatchObject({ passed: true, bestScore: 0.8, attempts: 3, mistakes: ["w:b"] });
    expect((await loadStats()).lessonsCompleted).toBe(1);
  });

  it("desbloqueo guiado vs libre", async () => {
    await recordLessonResult("a", 1, []);
    const rec = new Map((await getDb().lessons.toArray()).map((l) => [l.lessonId, l]));
    const ids = ["a", "b", "c"];
    expect([0, 1, 2].map((i) => isUnlocked(i, ids, rec, "guided"))).toEqual([true, true, false]);
    expect([0, 1, 2].map((i) => isUnlocked(i, ids, rec, "free"))).toEqual([true, true, true]);
  });

  it("reiniciar estadísticas borra progreso pero conserva ajustes", async () => {
    await saveSettings({ onboarded: true });
    await recordAnswer("w:a", "reading", true);
    await recordLessonResult("u1l1", 1, []);
    await resetProgress();
    const st = await loadStats();
    expect(st).toMatchObject({ seen: 0, lessonsCompleted: 0, answeredToday: 0 });
    expect((await getSettings()).onboarded).toBe(true);
  });

  it("migración: una base v1 existente se abre sin perder datos", async () => {
    const name = `mig-${n}`;
    const old = new Dexie(name);
    old.version(1).stores({ settings: "key", items: "id, due, kind", lessons: "lessonId", activity: "++id, date, skill, lessonId" });
    await old.table("settings").put({ key: "settings", value: { onboarded: true, dailyGoal: 15 } });
    old.close();
    setDb(new AppDB(name));
    expect(await getSettings()).toMatchObject({ onboarded: true, dailyGoal: 15, pathMode: "guided" });
  });
});

import { getDb } from "@/lib/db";
