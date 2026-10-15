"use client";
import { useSyncExternalStore } from "react";

export interface PwaState {
  supported: boolean;
  /** El SW está instalado y controla la página: la app ya funciona offline. */
  offlineReady: boolean;
  updateReady: boolean;
  error: string | null;
}

let state: PwaState = { supported: false, offlineReady: false, updateReady: false, error: null };
const listeners = new Set<() => void>();
let waiting: ServiceWorker | null = null;
let registered = false;
let updating = false;

function set(patch: Partial<PwaState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

function trackWorker(reg: ServiceWorkerRegistration) {
  const watch = (w: ServiceWorker) => {
    w.addEventListener("statechange", () => {
      if (w.state === "installed") {
        if (navigator.serviceWorker.controller) {
          waiting = w;
          set({ updateReady: true });
        } else set({ offlineReady: true });
      }
    });
  };
  if (reg.waiting && navigator.serviceWorker.controller) {
    waiting = reg.waiting;
    set({ updateReady: true });
  }
  if (reg.installing) watch(reg.installing);
  reg.addEventListener("updatefound", () => reg.installing && watch(reg.installing));
}

export function registerServiceWorker(): void {
  if (registered || typeof window === "undefined") return;
  registered = true;
  if (!("serviceWorker" in navigator)) return set({ supported: false });
  set({ supported: true, offlineReady: !!navigator.serviceWorker.controller });
  if (process.env.NODE_ENV !== "production") return; // en desarrollo no se registra: evita cachés confusas

  navigator.serviceWorker
    .register("/sw.js", { scope: "/", updateViaCache: "none" })
    .then((reg) => {
      trackWorker(reg);
      // Busca versiones nuevas al volver a la app.
      document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && reg.update().catch(() => {}));
      if (navigator.serviceWorker.controller) set({ offlineReady: true });
    })
    .catch((e: unknown) => set({ error: e instanceof Error ? e.message : "No se pudo registrar el Service Worker" }));

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!state.offlineReady) set({ offlineReady: true });
    if (updating) window.location.reload(); // solo recarga si el usuario pidió actualizar
  });
}

export function applyUpdate(): void {
  updating = true;
  waiting?.postMessage({ type: "SKIP_WAITING" });
}

export function usePwa(): PwaState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => state,
  );
}

// ---------- Entorno ----------
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true || window.matchMedia("(display-mode: standalone)").matches;
}
export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

/** Pide al navegador que no borre los datos (iOS puede limpiar sitios sin uso tras ~7 días si no está instalada). */
export async function requestPersistence(): Promise<boolean> {
  try {
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}
export async function storageEstimate(): Promise<{ usage: number; quota: number } | null> {
  try {
    const e = await navigator.storage?.estimate?.();
    return e ? { usage: e.usage ?? 0, quota: e.quota ?? 0 } : null;
  } catch {
    return null;
  }
}
