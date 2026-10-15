"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bar, ErrorBox, Loading } from "./ui";
import { clearAudioCache, downloadAudio, type DownloadProgress } from "@/lib/audio";
import { exportBackup, importBackup, parseBackup, type BackupFile, type ImportSummary } from "@/lib/backup";
import { requestPersistence, storageEstimate, usePwa } from "@/lib/pwa";
import { resetProgress, saveSettings } from "@/lib/progress";
import { useAudioInfo } from "@/lib/useAudio";
import { useSettings } from "@/lib/useData";
import { useOnline } from "@/lib/useLive";

const mb = (n: number) => `${(n / 1024 / 1024).toFixed(1)} MB`;

export default function SettingsView() {
  const settings = useSettings();
  const pwa = usePwa();
  const online = useOnline();
  const audio = useAudioInfo();
  const [confirmReset, setConfirmReset] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [dl, setDl] = useState<DownloadProgress | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [storage, setStorage] = useState<{ usage: number; quota: number; persisted: boolean } | null>(null);
  const abort = useRef<AbortController | null>(null);
  const [pending, setPending] = useState<{ data: BackupFile; summary: ImportSummary } | null>(null);

  useEffect(() => {
    void (async () => {
      const e = await storageEstimate();
      const persisted = (await navigator.storage?.persisted?.().catch(() => false)) ?? false;
      if (e) setStorage({ ...e, persisted });
    })();
  }, [dl]);

  // Reintento automático de descargas fallidas al volver la conexión.
  useEffect(() => {
    if (online && dl && dl.failed.length > 0 && !downloading && audio.manifest) void startDownload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  if (settings.error) return <ErrorBox error={settings.error} />;
  if (settings.loading || !settings.data) return <Loading />;
  const s = settings.data;

  const files = audio.manifest ? Object.keys(audio.manifest.files).length : 0;
  const cachedCount = audio.cached.size;

  async function doExport() {
    try {
      const data = await exportBackup();
      const url = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: "application/json" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `ni-papa-progreso-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      setMsg(`Copia creada: ${data.items.length} palabras y frases, ${data.lessons.length} lecciones y ${data.activity.length} actividades.`);
    } catch {
      setMsg("No se pudo crear la copia de seguridad.");
    }
  }

  async function pickFile(file: File | undefined) {
    if (!file) return;
    try {
      setPending(parseBackup(await file.text()));
      setMsg(null);
    } catch (e) {
      setPending(null);
      setMsg(e instanceof Error ? e.message : "No se pudo leer el archivo.");
    }
  }

  async function startDownload() {
    if (!audio.manifest) return;
    setDownloading(true);
    setMsg(null);
    abort.current = new AbortController();
    try {
      const r = await downloadAudio(audio.manifest, setDl, abort.current.signal);
      await audio.refresh();
      setMsg(r.failed.length ? `Faltaron ${r.failed.length} audios. Se reintentará al recuperar la conexión.` : "Audios descargados. Ya suenan sin conexión.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "No se pudo descargar.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-extrabold">Ajustes</h1>

      <section className="card flex flex-col gap-3" aria-labelledby="study">
        <h2 id="study" className="text-lg font-extrabold">
          Estudio
        </h2>
        <label className="flex flex-col gap-1 font-bold">
          Meta diaria: {s.dailyGoal} ejercicios
          <input type="range" min={5} max={60} step={5} value={s.dailyGoal} onChange={(e) => void saveSettings({ dailyGoal: Number(e.target.value) })} className="h-10 accent-amber-600" />
        </label>
        <fieldset className="flex flex-col gap-2">
          <legend className="font-bold">Ruta de lecciones</legend>
          {(
            [
              ["guided", "Guiada (se desbloquea al aprobar)"],
              ["free", "Libre (todo abierto)"],
            ] as const
          ).map(([v, t]) => (
            <label key={v} className="flex min-h-11 items-center gap-3">
              <input type="radio" name="mode" className="size-5 accent-amber-600" checked={s.pathMode === v} onChange={() => void saveSettings({ pathMode: v })} />
              {t}
            </label>
          ))}
        </fieldset>
      </section>

      <section className="card flex flex-col gap-3" aria-labelledby="offline">
        <h2 id="offline" className="text-lg font-extrabold">
          Uso sin conexión
        </h2>
        <ul className="grid gap-1 text-sm">
          <li>{online ? "🟢 Con conexión" : "🔴 Sin conexión"}</li>
          <li>{!pwa.supported ? "⚠️ Este navegador no admite Service Workers: no habrá modo offline." : pwa.offlineReady ? "✅ App guardada: abre y estudia sin internet." : process.env.NODE_ENV !== "production" ? "ℹ️ Modo desarrollo: el Service Worker solo se activa en la versión publicada." : "⏳ Guardando la app para uso sin conexión… (necesita conexión la primera vez)"}</li>
          {pwa.error && <li className="font-semibold text-oops">Error del Service Worker: {pwa.error}</li>}
          <li>Lecciones, vocabulario y ejercicios viajan dentro de la app: no hace falta descargarlos aparte.</li>
          {storage && (
            <li>
              💾 Almacenamiento usado: {mb(storage.usage)} de {mb(storage.quota)} · {storage.persisted ? "protegido contra borrado automático" : "sin protección contra borrado automático"}
            </li>
          )}
        </ul>
        {storage && !storage.persisted && (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={async () => setMsg((await requestPersistence()) ? "Almacenamiento protegido." : "El navegador no concedió protección. Instala la app en la pantalla de inicio para reducir el riesgo de que iOS borre tus datos.")}
          >
            Proteger mis datos
          </button>
        )}
      </section>

      <section className="card flex flex-col gap-3" aria-labelledby="audio">
        <h2 id="audio" className="text-lg font-extrabold">
          Audios
        </h2>
        {!audio.ready ? (
          <p>Revisando audios…</p>
        ) : files === 0 ? (
          <>
            <p>
              Esta versión <b>no incluye archivos de audio grabados</b>. Las frases se reproducen con la voz de tu dispositivo ({audio.tts ? "disponible" : "no disponible aquí"}).
            </p>
            <p className="text-sm text-muted">En iPhone, las voces mejoradas funcionan sin internet solo si las descargaste en Ajustes › Accesibilidad › Contenido hablado › Voces. Para añadir audios propios, mira el README.</p>
          </>
        ) : (
          <>
            <p>
              {cachedCount} de {files} audios descargados en este dispositivo.
            </p>
            {dl && downloading && <Bar value={dl.total ? dl.done / dl.total : 0} label="Progreso de descarga" />}
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn btn-primary" disabled={downloading || !online || cachedCount === files} onClick={startDownload}>
                {downloading ? `Descargando… ${dl?.done ?? 0}/${dl?.total ?? files}` : cachedCount === files ? "Todo descargado ✓" : "Descargar audios"}
              </button>
              {downloading && (
                <button type="button" className="btn btn-ghost" onClick={() => abort.current?.abort()}>
                  Cancelar
                </button>
              )}
              {cachedCount > 0 && !downloading && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={async () => {
                    await clearAudioCache();
                    await audio.refresh();
                    setDl(null);
                  }}
                >
                  Borrar audios
                </button>
              )}
            </div>
            {!online && <p className="text-sm font-semibold">Necesitas conexión para descargar.</p>}
          </>
        )}
        {msg && (
          <p role="status" className="rounded-xl bg-amber-soft p-3 text-sm font-semibold">
            {msg}
          </p>
        )}
      </section>

      <section className="card flex flex-col gap-2" aria-labelledby="inst">
        <h2 id="inst" className="text-lg font-extrabold">
          Instalar en el iPhone
        </h2>
        <Link href="/install/" className="btn btn-ghost">
          Ver guía de instalación
        </Link>
      </section>

      <section className="card flex flex-col gap-3" aria-labelledby="backup">
        <h2 id="backup" className="text-lg font-extrabold">
          Copia de seguridad
        </h2>
        <p className="text-sm text-muted">
          Tu progreso vive solo en este dispositivo. <b>En iPhone, Safari y la app de la pantalla de inicio guardan los datos por separado</b>: si empezaste en Safari y luego instalaste la app, usa «Exportar» en uno e «Importar» en el otro.
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-ghost" onClick={doExport}>
            Exportar progreso
          </button>
          <label className="btn btn-ghost cursor-pointer">
            Importar progreso
            <input type="file" accept="application/json,.json" className="sr-only" data-testid="import-file" onChange={(e) => void pickFile(e.target.files?.[0])} />
          </label>
        </div>
        {pending && (
          <div role="alertdialog" aria-label="Confirmar importación" className="rounded-2xl bg-amber-soft p-3">
            <p className="font-bold">Esta copia tiene {pending.summary.items} palabras y frases, {pending.summary.lessons} lecciones y {pending.summary.activity} actividades.</p>
            {pending.summary.skipped > 0 && <p className="text-sm">Se ignorarán {pending.summary.skipped} registros dañados.</p>}
            <p className="mt-1 text-sm">Importar <b>reemplaza</b> el progreso que tienes ahora en este dispositivo.</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" className="btn btn-ghost" onClick={() => setPending(null)}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={async () => {
                  try {
                    await importBackup(pending.data);
                    setPending(null);
                    setMsg("Progreso importado.");
                  } catch {
                    setMsg("No se pudo importar; tu progreso actual no cambió.");
                  }
                }}
              >
                Sí, importar
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="card flex flex-col gap-3 border-oops" aria-labelledby="reset">
        <h2 id="reset" className="text-lg font-extrabold">
          Reiniciar estadísticas
        </h2>
        <p className="text-sm text-muted">Borra racha, lecciones completadas, historial y repasos. Tus ajustes se conservan. No se puede deshacer.</p>
        {!confirmReset ? (
          <button type="button" className="btn btn-ghost" onClick={() => setConfirmReset(true)}>
            Reiniciar…
          </button>
        ) : (
          <div role="alertdialog" aria-label="Confirmar reinicio" className="rounded-2xl bg-oops-soft p-3">
            <p className="font-bold">¿Seguro que quieres borrar todo tu progreso?</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" className="btn btn-ghost" onClick={() => setConfirmReset(false)}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={async () => {
                  await resetProgress();
                  setConfirmReset(false);
                  setMsg("Estadísticas reiniciadas.");
                }}
              >
                Sí, borrar
              </button>
            </div>
          </div>
        )}
      </section>

      <p className="text-center text-xs text-muted">No Entiendo Ni Papa · v0.1.0 · Tus datos se guardan solo en este dispositivo.</p>
    </div>
  );
}
