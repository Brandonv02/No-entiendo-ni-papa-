/**
 * Audio en tres niveles, en este orden:
 *  1. Archivo de audio (public/audio + manifest.json): si está descargado en la caché del dispositivo suena sin conexión.
 *  2. Voz del dispositivo (Web Speech API): depende de las voces instaladas en iOS; puede fallar sin conexión.
 *  3. Nada: se avisa con claridad. Nunca se simula que algo sonó.
 */
export const AUDIO_CACHE = "nenp-audio-v1";
export const MANIFEST_URL = "/audio/manifest.json";

export interface AudioManifest {
  version: number;
  files: Record<string, { src: string; bytes?: number }>;
}

export type AudioSource = "file-cached" | "file-online" | "tts" | "none";
export type PlayerState = "idle" | "loading" | "playing" | "error";

export class AudioUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AudioUnavailableError";
  }
}

// ---------- Manifest ----------
let manifestPromise: Promise<AudioManifest | null> | null = null;

export function parseManifest(raw: unknown): AudioManifest | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as { version?: unknown; files?: unknown };
  if (typeof r.version !== "number" || !r.files || typeof r.files !== "object") return null;
  const files: AudioManifest["files"] = {};
  for (const [id, v] of Object.entries(r.files as Record<string, unknown>)) {
    if (!v || typeof v !== "object") continue;
    const o = v as { src?: unknown; bytes?: unknown };
    if (typeof o.src !== "string" || !o.src.startsWith("/audio/")) continue;
    files[id] = { src: o.src, ...(typeof o.bytes === "number" ? { bytes: o.bytes } : {}) };
  }
  return { version: r.version, files };
}

export function loadManifest(force = false): Promise<AudioManifest | null> {
  if (!manifestPromise || force) {
    manifestPromise = fetch(MANIFEST_URL, { cache: "no-cache" })
      .then((r) => (r.ok ? r.json() : null))
      .then(parseManifest)
      .catch(() => null);
  }
  return manifestPromise;
}

// ---------- Capacidades ----------
export function hasTts(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";
}

type RecCtor = new () => SpeechRecognitionLike;
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string; confidence: number }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}
function recCtor(): RecCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecCtor; webkitSpeechRecognition?: RecCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}
export function hasSpeechRecognition(): boolean {
  return recCtor() !== null;
}

// ---------- Caché de archivos ----------
async function cache(): Promise<Cache | null> {
  if (typeof caches === "undefined") return null;
  try {
    return await caches.open(AUDIO_CACHE);
  } catch {
    return null;
  }
}

export async function cachedIds(manifest: AudioManifest): Promise<Set<string>> {
  const c = await cache();
  const out = new Set<string>();
  if (!c) return out;
  await Promise.all(
    Object.entries(manifest.files).map(async ([id, f]) => {
      if (await c.match(f.src)) out.add(id);
    }),
  );
  return out;
}

export interface DownloadProgress {
  done: number;
  total: number;
  failed: string[];
}

/** Descarga los archivos que falten. Los fallos se devuelven para poder reintentar luego. */
export async function downloadAudio(manifest: AudioManifest, onProgress?: (p: DownloadProgress) => void, signal?: AbortSignal): Promise<DownloadProgress> {
  const c = await cache();
  if (!c) throw new AudioUnavailableError("Este navegador no permite guardar archivos sin conexión.");
  const entries = Object.entries(manifest.files);
  const state: DownloadProgress = { done: 0, total: entries.length, failed: [] };
  for (const [id, f] of entries) {
    if (signal?.aborted) break;
    try {
      if (!(await c.match(f.src))) {
        const res = await fetch(f.src, { signal: signal ?? null });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        await c.put(f.src, res);
      }
      state.done++;
    } catch {
      state.failed.push(id);
    }
    onProgress?.({ ...state, failed: [...state.failed] });
  }
  return state;
}

export async function clearAudioCache(): Promise<void> {
  if (typeof caches !== "undefined") await caches.delete(AUDIO_CACHE);
}

// ---------- Reproductor ----------
type Listener = (s: { state: PlayerState; id: string | null; source: AudioSource; error?: string }) => void;

class Player {
  private el: HTMLAudioElement | null = null;
  private objectUrl: string | null = null;
  private listeners = new Set<Listener>();
  private current: { state: PlayerState; id: string | null; source: AudioSource; error?: string } = { state: "idle", id: null, source: "none" };

  subscribe(l: Listener): () => void {
    this.listeners.add(l);
    l(this.current);
    return () => this.listeners.delete(l);
  }
  private set(next: Player["current"]) {
    this.current = next;
    this.listeners.forEach((l) => l(next));
  }

  stop() {
    if (this.el) {
      this.el.pause();
      this.el.removeAttribute("src");
      this.el.load();
    }
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    this.objectUrl = null;
    if (hasTts()) window.speechSynthesis.cancel();
    this.set({ state: "idle", id: null, source: "none" });
  }

  /** Reproduce el elemento `id` (si hay archivo) o `text` con la voz del dispositivo. */
  async play(id: string, text: string, opts: { slow?: boolean } = {}): Promise<AudioSource> {
    this.stop();
    this.set({ state: "loading", id, source: "none" });
    const manifest = await loadManifest();
    const entry = manifest?.files[id];

    if (entry) {
      try {
        const c = await cache();
        const cached = c ? await c.match(entry.src) : undefined;
        const res = cached ?? (await fetch(entry.src));
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        this.objectUrl = URL.createObjectURL(blob);
        const el = (this.el ??= new Audio());
        el.src = this.objectUrl;
        el.playbackRate = opts.slow ? 0.7 : 1;
        el.preservesPitch = true;
        const source: AudioSource = cached ? "file-cached" : "file-online";
        await new Promise<void>((resolve, reject) => {
          el.onplaying = () => {
            this.set({ state: "playing", id, source });
            resolve();
          };
          el.onended = () => this.set({ state: "idle", id: null, source: "none" });
          el.onerror = () => reject(new Error("decode"));
          el.play().catch(reject);
        });
        return source;
      } catch {
        // Cae a la voz del dispositivo si existe; si no, error explícito.
        if (!hasTts()) {
          this.set({ state: "error", id, source: "none", error: "No se pudo cargar el audio. Conéctate para descargarlo." });
          throw new AudioUnavailableError("No se pudo cargar el audio. Conéctate para descargarlo.");
        }
      }
    }

    if (!hasTts()) {
      const msg = "No hay audio disponible: este dispositivo no tiene voz sintética y no hay archivo descargado. Lee la frase y su traducción.";
      this.set({ state: "error", id, source: "none", error: msg });
      throw new AudioUnavailableError(msg);
    }

    await new Promise<void>((resolve, reject) => {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "en-US";
      u.rate = opts.slow ? 0.55 : 0.9;
      const voices = window.speechSynthesis.getVoices();
      const v = voices.find((x) => x.lang === "en-US") ?? voices.find((x) => x.lang.startsWith("en"));
      if (v) u.voice = v;
      u.onstart = () => {
        this.set({ state: "playing", id, source: "tts" });
        resolve();
      };
      u.onend = () => this.set({ state: "idle", id: null, source: "none" });
      u.onerror = (e) => {
        const msg = e.error === "canceled" || e.error === "interrupted" ? "" : "La voz del dispositivo no pudo reproducir este audio. Revisa el volumen y que el iPhone no esté en silencio.";
        if (msg) {
          this.set({ state: "error", id, source: "none", error: msg });
          reject(new AudioUnavailableError(msg));
        } else resolve();
      };
      window.speechSynthesis.speak(u);
      // Si el navegador nunca inicia la voz, no dejamos el botón colgado.
      setTimeout(() => {
        if (this.current.state === "loading" && this.current.id === id) {
          window.speechSynthesis.cancel();
          const msg = "La voz del dispositivo no respondió. Puede que no haya voces en inglés instaladas.";
          this.set({ state: "error", id, source: "none", error: msg });
          reject(new AudioUnavailableError(msg));
        }
      }, 4000);
    });
    return "tts";
  }
}

export const player = new Player();

// ---------- Reconocimiento de voz ----------
export type RecognitionResult = { transcript: string; confidence: number };

/** Escucha una frase. Rechaza con un mensaje claro si no hay permiso, red o soporte. */
export function listenOnce(lang = "en-US"): { promise: Promise<RecognitionResult>; stop: () => void } {
  const Ctor = recCtor();
  if (!Ctor) {
    return { promise: Promise.reject(new AudioUnavailableError("Este navegador no ofrece reconocimiento de voz.")), stop: () => {} };
  }
  const rec = new Ctor();
  rec.lang = lang;
  rec.interimResults = false;
  rec.maxAlternatives = 1;
  const promise = new Promise<RecognitionResult>((resolve, reject) => {
    let got = false;
    rec.onresult = (e) => {
      const alt = e.results[0]?.[0];
      if (alt) {
        got = true;
        resolve({ transcript: alt.transcript, confidence: alt.confidence });
      }
    };
    rec.onerror = (e) => {
      const map: Record<string, string> = {
        "not-allowed": "Necesito permiso para usar el micrófono. Actívalo en Ajustes de Safari.",
        "service-not-allowed": "El reconocimiento de voz está desactivado en este dispositivo (Ajustes › Siri y Dictado).",
        network: "El reconocimiento de voz necesita conexión a internet.",
        "no-speech": "No te oí. Acércate al micrófono e inténtalo de nuevo.",
        "audio-capture": "No encuentro un micrófono.",
      };
      reject(new AudioUnavailableError(map[e.error] ?? `No se pudo reconocer la voz (${e.error}).`));
    };
    rec.onend = () => {
      if (!got) reject(new AudioUnavailableError("No se captó ninguna frase."));
    };
    try {
      rec.start();
    } catch {
      reject(new AudioUnavailableError("No se pudo iniciar el micrófono."));
    }
  });
  return { promise, stop: () => rec.stop() };
}
