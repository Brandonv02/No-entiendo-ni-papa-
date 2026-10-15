import { getDb, sanitizeSettings } from "./db";
import { parseResume } from "./resume";
import type { ActivityRow, LessonRecord, SrsItem } from "./types";
import { SKILLS } from "./types";

/**
 * Copia de seguridad del progreso (JSON). En iOS, Safari y la app instalada en la pantalla de inicio tienen
 * almacenamiento SEPARADO: lo estudiado en uno no aparece en el otro. Exportar/importar permite pasarlo.
 * Importar REEMPLAZA el progreso actual (acción explícita, con confirmación en la interfaz).
 */
export const BACKUP_APP = "no-entiendo-ni-papa";
export const BACKUP_VERSION = 1;

export interface BackupFile {
  app: typeof BACKUP_APP;
  version: number;
  exportedAt: string;
  settings: Array<{ key: string; value: unknown }>;
  items: SrsItem[];
  lessons: LessonRecord[];
  activity: ActivityRow[];
}

export async function exportBackup(now = new Date()): Promise<BackupFile> {
  const db = getDb();
  const [settings, items, lessons, activity] = await Promise.all([db.settings.toArray(), db.items.toArray(), db.lessons.toArray(), db.activity.toArray()]);
  return { app: BACKUP_APP, version: BACKUP_VERSION, exportedAt: now.toISOString(), settings, items, lessons, activity: activity.map(({ id: _id, ...rest }) => rest) };
}

const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);
const num = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);
const day = (x: unknown): x is string => typeof x === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x);

function okItem(x: unknown): x is SrsItem {
  return isObj(x) && typeof x.id === "string" && /^[wpx]:/.test(x.id) && num(x.correct) && num(x.wrong) && num(x.attempts) && num(x.mastery) && day(x.due) && num(x.streakCorrect) && (x.lastReview === null || num(x.lastReview)) && ["word", "phrase", "expr"].includes(String(x.kind));
}
function okLesson(x: unknown): x is LessonRecord {
  return isObj(x) && typeof x.lessonId === "string" && num(x.attempts) && num(x.bestScore) && typeof x.passed === "boolean" && (x.completedAt === null || num(x.completedAt)) && Array.isArray(x.mistakes);
}
function okActivity(x: unknown): x is ActivityRow {
  return isObj(x) && day(x.date) && num(x.ts) && SKILLS.includes(x.skill as never) && num(x.correct) && num(x.total) && num(x.seconds);
}

export interface ImportSummary {
  items: number;
  lessons: number;
  activity: number;
  skipped: number;
}

/** Valida el archivo SIN tocar nada. Lanza un Error con un mensaje claro si no es una copia válida. */
export function parseBackup(text: string): { data: BackupFile; summary: ImportSummary } {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("El archivo no es un JSON válido.");
  }
  if (!isObj(raw) || raw.app !== BACKUP_APP) throw new Error("Este archivo no es una copia de seguridad de No Entiendo Ni Papa.");
  if (!num(raw.version) || raw.version > BACKUP_VERSION) throw new Error("La copia es de una versión más nueva de la app. Actualiza la app e inténtalo de nuevo.");
  if (!Array.isArray(raw.items) || !Array.isArray(raw.lessons) || !Array.isArray(raw.activity) || !Array.isArray(raw.settings)) throw new Error("La copia está incompleta.");

  const items = raw.items.filter(okItem);
  const lessons = raw.lessons.filter(okLesson);
  const activity = raw.activity.filter(okActivity);
  const settings: BackupFile["settings"] = [];
  for (const r of raw.settings) {
    if (!isObj(r) || typeof r.key !== "string") continue;
    if (r.key === "settings") settings.push({ key: "settings", value: sanitizeSettings(r.value) });
    else if (r.key.startsWith("resume:") && parseResume(r.value)) settings.push({ key: r.key, value: r.value });
    else if (r.key === "last") settings.push({ key: "last", value: r.value });
  }
  const skipped = raw.items.length - items.length + (raw.lessons.length - lessons.length) + (raw.activity.length - activity.length);
  return {
    data: { app: BACKUP_APP, version: raw.version, exportedAt: typeof raw.exportedAt === "string" ? raw.exportedAt : "", settings, items, lessons, activity },
    summary: { items: items.length, lessons: lessons.length, activity: activity.length, skipped },
  };
}

/** Reemplaza el progreso actual por el de la copia, en una sola transacción (o todo o nada). */
export async function importBackup(data: BackupFile): Promise<void> {
  const db = getDb();
  await db.transaction("rw", db.settings, db.items, db.lessons, db.activity, async () => {
    await Promise.all([db.settings.clear(), db.items.clear(), db.lessons.clear(), db.activity.clear()]);
    await db.settings.bulkPut(data.settings);
    // Quien importa ya hizo el onboarding: no se le vuelve a pedir.
    if (!data.settings.some((r) => r.key === "settings")) await db.settings.put({ key: "settings", value: sanitizeSettings({ onboarded: true }) });
    await db.items.bulkPut(data.items);
    await db.lessons.bulkPut(data.lessons);
    await db.activity.bulkAdd(data.activity);
  });
}
