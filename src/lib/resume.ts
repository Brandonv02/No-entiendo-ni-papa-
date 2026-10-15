import { getDb } from "./db";
import type { Exercise } from "./types";

/**
 * Avance «a medias»: dónde te quedaste y qué respondiste. Vive en Dexie (tabla `settings`, claves
 * `resume:<tipo>:<id>` y `last`), la MISMA base que el resto del progreso: no hay una segunda fuente de verdad
 * y no requiere migrar el esquema. Los resultados reales (respuestas, repaso, lecciones aprobadas) siguen
 * guardándose al responder; esto solo permite reanudar la sesión exactamente donde estaba.
 */
export const RESUME_VERSION = 1;

export type ResumeKind = "lesson" | "costa" | "talk";

/** Estado de una tanda de ejercicios: la lista exacta (para no depender de que se regenere igual) y el punto en que va. */
export interface RunSnapshot {
  exercises: Exercise[];
  /** Siguiente ejercicio por responder. Si es igual a exercises.length, la tanda ya está respondida. */
  index: number;
  correct: number;
  skipped: number;
  mistakes: string[];
}

export interface ResumeDoc {
  v: number;
  kind: ResumeKind;
  id: string;
  title: string;
  href: string;
  unitId?: string;
  stage: string;
  attempt: number;
  runs: Record<string, RunSnapshot>;
  /** Estado propio de cada tipo (p. ej. conversación). */
  extra?: unknown;
  savedAt: number;
}

export interface LastVisited {
  kind: ResumeKind;
  id: string;
  title: string;
  href: string;
  unitId?: string;
  at: number;
}

export const resumeKey = (kind: ResumeKind, id: string) => `resume:${kind}:${id}`;

const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);
const isNum = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);

function validSnapshot(x: unknown): x is RunSnapshot {
  if (!isObj(x)) return false;
  const { exercises, index, correct, skipped, mistakes } = x;
  return (
    Array.isArray(exercises) &&
    exercises.length > 0 &&
    exercises.every((e) => isObj(e) && typeof e.id === "string" && typeof e.kind === "string" && typeof e.itemId === "string") &&
    isNum(index) && index >= 0 && index <= exercises.length &&
    isNum(correct) && correct >= 0 &&
    isNum(skipped) && skipped >= 0 &&
    Array.isArray(mistakes) && mistakes.every((m) => typeof m === "string")
  );
}

/** Valida un documento leído de disco. Si no es compatible con esta versión, se ignora (nunca se borra nada más). */
export function parseResume(raw: unknown): ResumeDoc | null {
  if (!isObj(raw) || raw.v !== RESUME_VERSION) return null;
  if (!["lesson", "costa", "talk"].includes(String(raw.kind))) return null;
  if (typeof raw.id !== "string" || typeof raw.title !== "string" || typeof raw.href !== "string" || typeof raw.stage !== "string") return null;
  if (!isNum(raw.attempt) || !isNum(raw.savedAt) || !isObj(raw.runs)) return null;
  const runs: Record<string, RunSnapshot> = {};
  for (const [k, v] of Object.entries(raw.runs)) if (validSnapshot(v)) runs[k] = v;
  return {
    v: RESUME_VERSION,
    kind: raw.kind as ResumeKind,
    id: raw.id,
    title: raw.title,
    href: raw.href,
    ...(typeof raw.unitId === "string" ? { unitId: raw.unitId } : {}),
    stage: raw.stage,
    attempt: raw.attempt,
    runs,
    ...(raw.extra !== undefined ? { extra: raw.extra } : {}),
    savedAt: raw.savedAt,
  };
}

export async function loadResume(kind: ResumeKind, id: string): Promise<ResumeDoc | null> {
  const row = await getDb().settings.get(resumeKey(kind, id));
  return parseResume(row?.value);
}

export async function saveResume(doc: Omit<ResumeDoc, "v" | "savedAt">, now = Date.now()): Promise<void> {
  const full: ResumeDoc = { ...doc, v: RESUME_VERSION, savedAt: now };
  await getDb().settings.put({ key: resumeKey(doc.kind, doc.id), value: full });
}

export async function clearResume(kind: ResumeKind, id: string): Promise<void> {
  await getDb().settings.delete(resumeKey(kind, id));
}

/** Avances pendientes, el más reciente primero. */
export async function listResume(): Promise<ResumeDoc[]> {
  const rows = await getDb().settings.where("key").startsWith("resume:").toArray();
  return rows.map((r) => parseResume(r.value)).filter((d): d is ResumeDoc => d !== null).sort((a, b) => b.savedAt - a.savedAt);
}

export async function saveLastVisited(v: Omit<LastVisited, "at">, now = Date.now()): Promise<void> {
  await getDb().settings.put({ key: "last", value: { ...v, at: now } satisfies LastVisited });
}

export async function loadLastVisited(): Promise<LastVisited | null> {
  const r = (await getDb().settings.get("last"))?.value;
  if (!isObj(r) || typeof r.id !== "string" || typeof r.href !== "string" || typeof r.title !== "string" || !isNum(r.at)) return null;
  if (!["lesson", "costa", "talk"].includes(String(r.kind))) return null;
  return { kind: r.kind as ResumeKind, id: r.id, title: r.title, href: r.href, ...(typeof r.unitId === "string" ? { unitId: r.unitId } : {}), at: r.at };
}

/** Texto corto de dónde te quedaste, para la tarjeta «Continuar aprendiendo». */
export function describeResume(doc: ResumeDoc): string {
  const names: Record<string, string> = { learn: "Aprender", practice: "Practicar", writing: "Escribir", speaking: "Hablar", final: "Evaluación", summary: "Resumen", talk: "Conversación" };
  const run = doc.runs[doc.stage];
  if (run && run.index < run.exercises.length) return `${names[doc.stage] ?? doc.stage} · ejercicio ${run.index + 1} de ${run.exercises.length}`;
  return names[doc.stage] ?? doc.stage;
}
