"use client";
import { useEffect, useRef } from "react";
import { getDb } from "./db";
import { getSettings, loadStats, logStudyTime, type Stats } from "./progress";
import type { LessonRecord, Settings, SrsItem } from "./types";
import { useLive, useToday } from "./useLive";

export function useSettings() {
  return useLive<Settings | null>(getSettings, [], null);
}

export function useLessonRecords() {
  return useLive<Map<string, LessonRecord>>(async () => new Map((await getDb().lessons.toArray()).map((l) => [l.lessonId, l])), [], new Map());
}

export function useStats() {
  const today = useToday();
  return useLive<Stats | null>(() => loadStats(new Date()), [today], null);
}

export function useSrsItems() {
  const today = useToday();
  return { today, ...useLive<SrsItem[]>(() => getDb().items.toArray(), [], []) };
}

/** Suma el tiempo que la pestaña está visible y activa; lo guarda cada 15 s y al salir. */
export function useStudyTimer(lessonId?: string, active = true) {
  const acc = useRef(0);
  useEffect(() => {
    if (!active) return;
    let last = Date.now();
    const flush = () => {
      const now = Date.now();
      if (document.visibilityState === "visible") acc.current += (now - last) / 1000;
      last = now;
      if (acc.current >= 1) {
        const s = acc.current;
        acc.current = 0;
        void logStudyTime(s, lessonId);
      }
    };
    const id = window.setInterval(flush, 15_000);
    document.addEventListener("visibilitychange", flush);
    window.addEventListener("pagehide", flush);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", flush);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [lessonId, active]);
}
