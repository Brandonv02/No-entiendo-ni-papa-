"use client";
import Link from "next/link";
import { Bar, Empty, ErrorBox, Loading, Stat } from "./ui";
import { formatDuration } from "@/lib/copy";
import { useStats } from "@/lib/useData";
import { LESSONS, TOTAL_ITEMS } from "@/content";
import { SKILLS, SKILL_LABEL } from "@/lib/types";

const SKILL_HELP = {
  listening: "Ejercicios de escucha",
  speaking: "Práctica oral con reconocimiento de voz",
  reading: "Reconocer y completar",
  writing: "Ordenar y escribir",
} as const;

export default function StatsView() {
  const { data: s, error, loading } = useStats();
  if (error) return <ErrorBox error={error} />;
  if (loading || !s) return <Loading />;

  const maxDay = Math.max(1, ...s.history.map((h) => h.answered));
  const answeredTotal = SKILLS.reduce((n, k) => n + s.skills[k].answered, 0);

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-extrabold">Tu progreso</h1>

      <div className="grid grid-cols-2 gap-3">
        <Stat label="🔥 Racha actual" value={`${s.streak.current} ${s.streak.current === 1 ? "día" : "días"}`} hint={`Mejor racha: ${s.streak.best}`} />
        <Stat label="⏱️ Tiempo de estudio" value={formatDuration(s.totalSeconds)} />
        <Stat label="✅ Lecciones" value={`${s.lessonsCompleted}/${LESSONS.length}`} />
        <Stat label="🎯 Aciertos" value={s.accuracy === null ? "—" : `${Math.round(s.accuracy * 100)} %`} hint={answeredTotal ? `${answeredTotal} respuestas` : "Aún sin respuestas"} />
        <Stat label="📚 Aprendido" value={`${s.learned}`} hint={`de ${TOTAL_ITEMS} palabras y frases · ${s.seen} vistas`} />
        <Stat label="🔁 Por repasar" value={s.due} />
      </div>

      <section className="card" aria-labelledby="skills">
        <h2 id="skills" className="mb-3 text-lg font-extrabold">
          Por habilidad
        </h2>
        <ul className="grid gap-4">
          {SKILLS.map((k) => {
            const v = s.skills[k];
            return (
              <li key={k}>
                <div className="mb-1 flex justify-between gap-2">
                  <span className="font-bold">{SKILL_LABEL[k]}</span>
                  <span className="text-sm text-muted">{v.accuracy === null ? "Sin datos aún" : `${Math.round(v.accuracy * 100)} % · ${v.answered} resp.`}</span>
                </div>
                <Bar value={v.accuracy} label={`${SKILL_LABEL[k]}: precisión`} />
                <p className="mt-1 text-xs text-muted">{SKILL_HELP[k]}</p>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="card" aria-labelledby="hist">
        <h2 id="hist" className="mb-3 text-lg font-extrabold">
          Últimos 14 días
        </h2>
        {answeredTotal === 0 ? (
          <Empty emoji="📭" title="Aún no hay actividad">
            <Link href="/path/" className="font-bold underline">
              Haz tu primera lección
            </Link>
          </Empty>
        ) : (
          <>
            <div className="flex h-28 items-end gap-1" role="img" aria-label={`Ejercicios por día en las últimas dos semanas. Hoy: ${s.history.at(-1)?.answered ?? 0}.`}>
              {s.history.map((h) => (
                <div key={h.date} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                  <div className={`w-full rounded-t-lg ${h.answered ? "bg-amber" : "bg-amber-soft"}`} style={{ height: `${Math.max(6, (h.answered / maxDay) * 100)}%` }} />
                </div>
              ))}
            </div>
            <details className="mt-3">
              <summary className="min-h-11 cursor-pointer py-2 font-bold">Ver en tabla</summary>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted">
                    <th className="py-1">Día</th>
                    <th>Ejercicios</th>
                    <th>Tiempo</th>
                  </tr>
                </thead>
                <tbody>
                  {[...s.history].reverse().map((h) => (
                    <tr key={h.date} className="border-t border-edge">
                      <td className="py-1">{h.date}</td>
                      <td>{h.answered}</td>
                      <td>{h.seconds ? formatDuration(h.seconds) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </>
        )}
      </section>
    </div>
  );
}
