import { addDays, dayKey } from "./dates";
import { getDb, sanitizeSettings } from "./db";
import { applyReview, isDue, isLearned, newItem } from "./srs";
import { computeStreak } from "./streak";
import { SKILLS, type ActivityRow, type LessonRecord, type Settings, type Skill, type SrsItem } from "./types";

export const PASS_SCORE = 0.7;

// ---------- Ajustes ----------
export async function getSettings(): Promise<Settings> {
  const row = await getDb().settings.get("settings");
  return sanitizeSettings(row?.value);
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const next = sanitizeSettings({ ...(await getSettings()), ...patch });
  await getDb().settings.put({ key: "settings", value: next });
  return next;
}

// ---------- Escritura de progreso ----------
/** Registra una respuesta: actualiza repaso espaciado y actividad en una sola transacción. */
export async function recordAnswer(itemId: string, skill: Skill, correct: boolean, lessonId?: string, now = new Date()): Promise<SrsItem> {
  const db = getDb();
  const today = dayKey(now);
  return db.transaction("rw", db.items, db.activity, async () => {
    const prev = (await db.items.get(itemId)) ?? newItem(itemId, today);
    const next = applyReview(prev, correct, now, today);
    await db.items.put(next);
    await db.activity.add({
      date: today,
      ts: now.getTime(),
      skill,
      correct: correct ? 1 : 0,
      total: 1,
      seconds: 0,
      ...(lessonId ? { lessonId } : {}),
    });
    return next;
  });
}

/** Suma tiempo de estudio (no cuenta como respuesta ni para la precisión). */
export async function logStudyTime(seconds: number, lessonId?: string, now = new Date()): Promise<void> {
  const s = Math.max(0, Math.min(3600, Math.round(seconds)));
  if (!s) return;
  await getDb().activity.add({
    date: dayKey(now),
    ts: now.getTime(),
    skill: "reading",
    correct: 0,
    total: 0,
    seconds: s,
    ...(lessonId ? { lessonId } : {}),
  });
}

export async function recordLessonResult(lessonId: string, score: number, mistakes: string[], now = new Date()): Promise<LessonRecord> {
  const db = getDb();
  return db.transaction("rw", db.lessons, async () => {
    const prev = await db.lessons.get(lessonId);
    const passed = score >= PASS_SCORE;
    const next: LessonRecord = {
      lessonId,
      attempts: (prev?.attempts ?? 0) + 1,
      bestScore: Math.max(prev?.bestScore ?? 0, score),
      passed: prev?.passed === true || passed,
      completedAt: passed ? (prev?.completedAt ?? now.getTime()) : (prev?.completedAt ?? null),
      mistakes: [...new Set(mistakes)],
    };
    await db.lessons.put(next);
    return next;
  });
}

export async function resetProgress(): Promise<void> {
  const db = getDb();
  await db.transaction("rw", db.items, db.lessons, db.activity, async () => {
    await db.items.clear();
    await db.lessons.clear();
    await db.activity.clear();
  });
}

// ---------- Estadísticas (puras, testeables) ----------
export interface Stats {
  streak: { current: number; best: number; doneToday: boolean };
  answeredToday: number;
  dailyGoal: number;
  totalSeconds: number;
  lessonsCompleted: number;
  accuracy: number | null; // 0..1
  learned: number;
  seen: number;
  due: number;
  skills: Record<Skill, { answered: number; accuracy: number | null }>;
  history: Array<{ date: string; answered: number; seconds: number }>; // últimos 14 días, de viejo a nuevo
}

export function buildStats(items: SrsItem[], lessons: LessonRecord[], activity: ActivityRow[], settings: Settings, today: string): Stats {
  const activeDays = new Set(activity.filter((a) => a.total > 0).map((a) => a.date));
  const streak = computeStreak(activeDays, today);

  let answered = 0;
  let correct = 0;
  let totalSeconds = 0;
  let answeredToday = 0;
  const skills = Object.fromEntries(SKILLS.map((s) => [s, { answered: 0, correct: 0 }])) as Record<Skill, { answered: number; correct: number }>;
  const perDay = new Map<string, { answered: number; seconds: number }>();
  for (const a of activity) {
    answered += a.total;
    correct += a.correct;
    totalSeconds += a.seconds;
    if (a.date === today) answeredToday += a.total;
    const s = skills[a.skill];
    if (s) {
      s.answered += a.total;
      s.correct += a.correct;
    }
    const d = perDay.get(a.date) ?? { answered: 0, seconds: 0 };
    d.answered += a.total;
    d.seconds += a.seconds;
    perDay.set(a.date, d);
  }

  const history = Array.from({ length: 14 }, (_, i) => {
    const date = addDays(today, i - 13);
    return { date, ...(perDay.get(date) ?? { answered: 0, seconds: 0 }) };
  });

  return {
    streak,
    answeredToday,
    dailyGoal: settings.dailyGoal,
    totalSeconds,
    lessonsCompleted: lessons.filter((l) => l.passed).length,
    accuracy: answered ? correct / answered : null,
    learned: items.filter((i) => isLearned(i)).length,
    seen: items.length,
    due: items.filter((i) => isDue(i, today)).length,
    skills: Object.fromEntries(
      SKILLS.map((k) => [k, { answered: skills[k].answered, accuracy: skills[k].answered ? skills[k].correct / skills[k].answered : null }]),
    ) as Stats["skills"],
    history,
  };
}

export async function loadStats(now = new Date()): Promise<Stats> {
  const db = getDb();
  const [items, lessons, activity, settings] = await Promise.all([db.items.toArray(), db.lessons.toArray(), db.activity.toArray(), getSettings()]);
  return buildStats(items, lessons, activity, settings, dayKey(now));
}

/** Una lección está desbloqueada si la anterior se aprobó (o el modo es libre). */
export function isUnlocked(index: number, lessonIds: string[], records: Map<string, LessonRecord>, mode: Settings["pathMode"]): boolean {
  if (mode === "free" || index === 0) return true;
  const prev = lessonIds[index - 1];
  return !!prev && records.get(prev)?.passed === true;
}

/** Registra una actividad que no pertenece a un elemento de repaso (escritura libre, práctica oral). */
export async function recordPractice(skill: Skill, correct: boolean, lessonId?: string, now = new Date()): Promise<void> {
  await getDb().activity.add({
    date: dayKey(now),
    ts: now.getTime(),
    skill,
    correct: correct ? 1 : 0,
    total: 1,
    seconds: 0,
    ...(lessonId ? { lessonId } : {}),
  });
}
