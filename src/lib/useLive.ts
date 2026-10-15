"use client";
import { liveQuery } from "dexie";
import { useEffect, useState, useSyncExternalStore } from "react";
import { dayKey } from "./dates";

export interface Live<T> {
  data: T;
  loading: boolean;
  error: Error | null;
}

/** Suscribe un componente a una consulta de Dexie: se actualiza solo al cambiar los datos. */
export function useLive<T>(querier: () => Promise<T> | T, deps: unknown[], initial: T): Live<T> {
  const [state, setState] = useState<Live<T>>({ data: initial, loading: true, error: null });
  useEffect(() => {
    const sub = liveQuery(querier).subscribe({
      next: (data) => setState({ data, loading: false, error: null }),
      error: (err) => setState((s) => ({ ...s, loading: false, error: err instanceof Error ? err : new Error(String(err)) })),
    });
    return () => sub.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}

/** Clave de hoy (fecha local) que se actualiza al cambiar de día o al volver a la app. */
export function useToday(): string {
  const [day, setDay] = useState(() => dayKey());
  useEffect(() => {
    const tick = () => setDay((d) => (d === dayKey() ? d : dayKey()));
    const id = window.setInterval(tick, 30_000);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("focus", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("focus", tick);
    };
  }, []);
  return day;
}

function subscribeOnline(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}
export function useOnline(): boolean {
  return useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
}
