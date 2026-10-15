import Dexie, { type Table } from "dexie";
import type { ActivityRow, LessonRecord, Settings, SrsItem } from "./types";

export const SCHEMA_VERSION = 1;

interface SettingRow {
  key: string;
  value: unknown;
}

/**
 * Esquema local. Reglas para no perder progreso al actualizar la app:
 *  - Solo se AÑADEN versiones (db.version(2)...) con upgrade() que migra los datos; nunca se borran tablas.
 *  - Los ajustes se leen siempre con sanitizeSettings(), que rellena campos nuevos con valores por defecto.
 */
export class AppDB extends Dexie {
  settings!: Table<SettingRow, string>;
  items!: Table<SrsItem, string>;
  lessons!: Table<LessonRecord, string>;
  activity!: Table<ActivityRow, number>;

  constructor(name = "no-entiendo-ni-papa") {
    super(name);
    this.version(1).stores({
      settings: "key",
      items: "id, due, kind",
      lessons: "lessonId",
      activity: "++id, date, skill, lessonId",
    });
  }
}

let instance: AppDB | null = null;
export function getDb(): AppDB {
  if (!instance) instance = new AppDB();
  return instance;
}
/** Solo para pruebas: inyecta otra base. */
export function setDb(db: AppDB | null) {
  instance = db;
}

export const DEFAULT_SETTINGS: Settings = {
  schemaVersion: SCHEMA_VERSION,
  onboarded: false,
  level: "A1",
  pathMode: "guided",
  dailyGoal: 20,
  slowSpeech: false,
};

/** Valida lo leído de disco: ignora campos inválidos y completa los que falten. */
export function sanitizeSettings(raw: unknown): Settings {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const goal = typeof r.dailyGoal === "number" && Number.isFinite(r.dailyGoal) ? Math.round(r.dailyGoal) : DEFAULT_SETTINGS.dailyGoal;
  const out: Settings = {
    schemaVersion: SCHEMA_VERSION,
    onboarded: r.onboarded === true,
    level: r.level === "A2" || r.level === "B1" ? r.level : "A1",
    pathMode: r.pathMode === "free" ? "free" : "guided",
    dailyGoal: Math.min(100, Math.max(5, goal)),
    slowSpeech: r.slowSpeech === true,
  };
  if (typeof r.lastStudyDay === "string" && /^\d{4}-\d{2}-\d{2}$/.test(r.lastStudyDay)) out.lastStudyDay = r.lastStudyDay;
  return out;
}
