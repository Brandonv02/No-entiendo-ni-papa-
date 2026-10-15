"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { clearResume, loadResume, saveResume, type ResumeDoc, type ResumeKind, type RunSnapshot } from "./resume";

/** Lee UNA vez el avance guardado antes de mostrar nada (así nunca se ve «cero» y luego se salta a lo guardado). */
export function useResumeDoc(kind: ResumeKind, id: string, attemptKey = 0) {
  const [state, setState] = useState<{ ready: boolean; doc: ResumeDoc | null; error: Error | null }>({ ready: false, doc: null, error: null });
  useEffect(() => {
    let cancelled = false;
    loadResume(kind, id).then(
      (doc) => !cancelled && setState({ ready: true, doc, error: null }),
      (error: unknown) => !cancelled && setState({ ready: true, doc: null, error: error instanceof Error ? error : new Error(String(error)) }),
    );
    return () => {
      cancelled = true;
    };
  }, [kind, id, attemptKey]);
  return state;
}

export interface ResumeMeta {
  kind: ResumeKind;
  id: string;
  title: string;
  href: string;
  unitId?: string;
}

export interface ResumeWriter {
  get: () => { stage: string; attempt: number; runs: Record<string, RunSnapshot>; extra: unknown };
  update: (patch: Partial<{ stage: string; attempt: number; runs: Record<string, RunSnapshot>; extra: unknown }>) => void;
  setRun: (name: string, run: RunSnapshot) => void;
  clear: () => Promise<void>;
  saveError: string | null;
}

/** Escribe el avance en Dexie en orden (una escritura detrás de otra) y avisa si falla, sin bloquear el estudio. */
export function useResumeWriter(meta: ResumeMeta, initial: ResumeDoc | null): ResumeWriter {
  const cur = useRef({ stage: initial?.stage ?? "learn", attempt: initial?.attempt ?? 1, runs: initial?.runs ?? ({} as Record<string, RunSnapshot>), extra: initial?.extra as unknown });
  const metaRef = useRef(meta);
  metaRef.current = meta;
  const chain = useRef<Promise<void>>(Promise.resolve());
  const [saveError, setSaveError] = useState<string | null>(null);

  const flush = useCallback(() => {
    const s = cur.current;
    const m = metaRef.current;
    chain.current = chain.current
      .then(() => saveResume({ kind: m.kind, id: m.id, title: m.title, href: m.href, ...(m.unitId ? { unitId: m.unitId } : {}), stage: s.stage, attempt: s.attempt, runs: s.runs, ...(s.extra !== undefined ? { extra: s.extra } : {}) }))
      .then(() => setSaveError(null))
      .catch(() => setSaveError("No pude guardar tu avance en este dispositivo. Lo que respondas seguirá contando, pero quizá no puedas reanudar."));
  }, []);

  const update = useCallback<ResumeWriter["update"]>((patch) => {
    cur.current = { ...cur.current, ...patch };
    flush();
  }, [flush]);

  const setRun = useCallback<ResumeWriter["setRun"]>((name, run) => {
    cur.current = { ...cur.current, runs: { ...cur.current.runs, [name]: run } };
    flush();
  }, [flush]);

  const clear = useCallback(async () => {
    const m = metaRef.current;
    chain.current = chain.current.then(() => clearResume(m.kind, m.id)).catch(() => undefined);
    await chain.current;
  }, []);

  const get = useCallback(() => cur.current, []);
  return { get, update, setRun, clear, saveError };
}
