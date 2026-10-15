"use client";
import { useState } from "react";
import { player } from "@/lib/audio";
import { sourceFor, useAudioInfo, usePlayer, type AudioInfo } from "@/lib/useAudio";

const SOURCE_LABEL = {
  "file-cached": "Audio descargado ✓",
  "file-online": "Audio en línea (descárgalo en Ajustes)",
  tts: "Voz del dispositivo",
  none: "Sin audio disponible",
} as const;

export function AudioBadge({ id, info }: { id: string; info: AudioInfo }) {
  if (!info.ready) return null;
  const src = sourceFor(id, info);
  return <span className="text-xs font-semibold text-muted">{SOURCE_LABEL[src]}</span>;
}

/** Botones de escuchar normal y lento. Muestra un error real si no se pudo reproducir. */
export default function PlayButton({ id, text, autoLabel, compact = false, info: external }: { id: string; text: string; autoLabel?: string; compact?: boolean; info?: AudioInfo }) {
  const own = useAudioInfo();
  const info = external ?? own;
  const st = usePlayer();
  const [err, setErr] = useState<string | null>(null);
  const mine = st.id === id;
  const busy = mine && (st.state === "loading" || st.state === "playing");

  const play = async (slow: boolean) => {
    setErr(null);
    if (busy) return player.stop();
    try {
      await player.play(id, text, { slow });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "No se pudo reproducir el audio.");
    }
  };

  const unavailable = info.ready && !info.canPlay;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => play(false)}
          disabled={unavailable}
          aria-label={busy ? `Detener audio: ${text}` : `Escuchar: ${text}`}
          aria-pressed={busy}
          className={`btn btn-primary ${compact ? "min-h-11 px-3" : ""}`}
        >
          <span aria-hidden>{busy ? "⏹️" : "🔊"}</span>
          {autoLabel ?? (compact ? "" : "Escuchar")}
        </button>
        <button type="button" onClick={() => play(true)} disabled={unavailable} aria-label={`Escuchar despacio: ${text}`} className={`btn btn-ghost ${compact ? "min-h-11 px-3" : ""}`}>
          <span aria-hidden>🐢</span>
          {compact ? "" : "Lento"}
        </button>
      </div>
      <p className="text-xs text-muted" aria-live="polite">
        {unavailable ? "Este dispositivo no tiene voz ni audios descargados. Lee el texto y su traducción." : mine && st.state === "loading" ? "Cargando audio…" : mine && st.state === "playing" ? "Reproduciendo…" : !compact && info.ready ? SOURCE_LABEL[sourceFor(id, info)] : ""}
      </p>
      {err && (
        <p role="alert" className="rounded-xl bg-oops-soft px-3 py-2 text-sm font-semibold text-oops">
          {err}
        </p>
      )}
    </div>
  );
}
