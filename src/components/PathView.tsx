"use client";
import Link from "next/link";
import { ErrorBox, Loading } from "./ui";
import { isUnlocked } from "@/lib/progress";
import { useLessonRecords, useSettings } from "@/lib/useData";
import { LESSONS, UNITS } from "@/content";

export default function PathView() {
  const settings = useSettings();
  const records = useLessonRecords();
  if (settings.error) return <ErrorBox error={settings.error} />;
  if (settings.loading || records.loading) return <Loading />;
  const mode = settings.data?.pathMode ?? "guided";
  const ids = LESSONS.map((l) => l.id);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-extrabold">Tu ruta</h1>
        <p className="text-muted">{mode === "guided" ? "Aprueba cada evaluación (70 %) para abrir la siguiente lección." : "Ruta libre: todas las lecciones están abiertas."}</p>
      </header>

      {UNITS.map((u) => {
        const passed = u.lessons.filter((l) => records.data.get(l.id)?.passed).length;
        return (
          <section key={u.id} aria-labelledby={`h-${u.id}`} className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <h2 id={`h-${u.id}`} className="text-lg font-extrabold">
                <span aria-hidden>{u.emoji}</span> Unidad {u.number}: {u.title}
              </h2>
              <span className="chip shrink-0">
                {passed}/{u.lessons.length}
              </span>
            </div>
            <p className="-mt-1 text-sm text-muted">{u.blurb}</p>
            <ul className="grid gap-2">
              {u.lessons.map((l) => {
                const idx = LESSONS.findIndex((x) => x.id === l.id);
                const open = isUnlocked(idx, ids, records.data, mode);
                const rec = records.data.get(l.id);
                const inner = (
                  <>
                    <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-full bg-amber-soft text-xl">
                      {rec?.passed ? "✅" : open ? "▶️" : "🔒"}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-extrabold">{l.title}</span>
                      <span className="block text-sm text-muted">{open ? l.objective : "Bloqueada: aprueba la anterior"}</span>
                    </span>
                    {rec && rec.attempts > 0 && <span className="chip shrink-0">{Math.round(rec.bestScore * 100)}%</span>}
                  </>
                );
                return (
                  <li key={l.id}>
                    {open ? (
                      <Link href={`/lesson/${l.id}/`} className="card flex items-center gap-3 !p-3">
                        {inner}
                      </Link>
                    ) : (
                      <div className="card flex items-center gap-3 !p-3 opacity-60" aria-disabled="true">
                        {inner}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
