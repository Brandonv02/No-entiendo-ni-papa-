"use client";
import { useCallback, useEffect, useState } from "react";
import { cachedIds, hasTts, loadManifest, player, type AudioManifest, type AudioSource, type PlayerState } from "./audio";

export interface AudioInfo {
  ready: boolean;
  manifest: AudioManifest | null;
  cached: Set<string>;
  tts: boolean;
  /** Hay alguna forma de reproducir audio (archivos o voz del dispositivo). */
  canPlay: boolean;
  refresh: () => Promise<void>;
}

export function useAudioInfo(): AudioInfo {
  const [s, setS] = useState<Omit<AudioInfo, "refresh" | "canPlay">>({ ready: false, manifest: null, cached: new Set(), tts: false });
  const refresh = useCallback(async () => {
    const manifest = await loadManifest(true);
    const cached = manifest ? await cachedIds(manifest) : new Set<string>();
    setS({ ready: true, manifest, cached, tts: hasTts() });
  }, []);
  useEffect(() => {
    void refresh();
    // Las voces de iOS se cargan de forma diferida.
    if (hasTts()) window.speechSynthesis.onvoiceschanged = () => setS((p) => ({ ...p, tts: hasTts() }));
  }, [refresh]);
  const hasFiles = !!s.manifest && Object.keys(s.manifest.files).length > 0;
  return { ...s, canPlay: s.tts || hasFiles, refresh };
}

export function sourceFor(id: string, info: AudioInfo): AudioSource {
  if (info.manifest?.files[id]) return info.cached.has(id) ? "file-cached" : "file-online";
  return info.tts ? "tts" : "none";
}

export function usePlayer() {
  const [st, setSt] = useState<{ state: PlayerState; id: string | null; source: AudioSource; error?: string }>({ state: "idle", id: null, source: "none" });
  useEffect(() => player.subscribe(setSt), []);
  return st;
}
