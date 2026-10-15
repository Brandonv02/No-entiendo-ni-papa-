"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Mascot, { type Mood } from "./Mascot";
import { ErrorBox, Loading, Ring, Stat } from "./ui";
import { greeting } from "@/lib/copy";
import { isUnlocked } from "@/lib/progress";
import { useLessonRecords, useSettings, useStats } from "@/lib/useData";
import { LESSONS, unitById } from "@/content";
import { SLOGAN } from "@/lib/copy";

export default function Home() {
  const router = useRouter();
  const settings = useSettings();
  const stats = useStats();
  const records = useLessonRecords();

  useEffect(() => {
    if (settings.data && !settings.data.onboarded) router.replace("/welcome/");
  }, [settings.data, router]);

  if (settings.error) return <ErrorBox error={settings.error} onRetry={() => location.reload()} />;
  if (!settings.data || !stats.data || records.loading) return <Loading />;
  if (!settings.data.onboarded) return <Loading text="Preparando tu bienvenida…" />;

  const s = stats.data;
  const ids = LESSONS.map((l) => l.id);
  const nextIdx = LESSONS.findIndex((l, i) => !records.data.get(l.id)?.passed && isUnlocked(i, ids, records.data, settings.data!.pathMode));
  const next = nextIdx >= 0 ? LESSONS[nextIdx] : undefined;
  const everyLessonDone = LESSONS.every((l) => records.data.get(l.id)?.passed);
  const goalDone = s.answeredToday >= s.dailyGoal;
  const mood: Mood = goalDone ? "party" : s.streak.current > 0 && !s.streak.doneToday ? "think" : "happy";
  const hour = new Date().getHours();

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-center gap-3">
        <Mascot mood={mood} size={84} label="Papito" />
        <div>
          <h1 className="text-2xl font-extrabold">{greeting(hour)}</h1>
          <p className="text-muted">
            {goalDone ? "¡Meta del día cumplida! Todo lo demás es ganancia." : s.streak.current > 0 && !s.streak.doneToday ? "Tu racha te espera: estudia hoy para no perderla." : SLOGAN}
          </p>
        </div>
      </header>

      <section className="card flex items-center gap-4" aria-label="Meta diaria">
        <Ring value={s.answeredToday} max={s.dailyGoal} label={`Meta diaria: ${s.answeredToday} de ${s.dailyGoal} ejercicios`} />
        <div>
          <p className="text-lg font-extrabold">Meta de hoy</p>
          <p className="text-muted">
            {s.answeredToday} de {s.dailyGoal} ejercicios
          </p>
          <p className="mt-1 font-bold">
            🔥 {s.streak.current} {s.streak.current === 1 ? "día" : "días"} de racha
          </p>
        </div>
      </section>

      {next ? (
        <Link href={`/lesson/${next.id}/`} className="card flex items-center justify-between gap-3 border-amber bg-amber-soft">
          <span>
            <span className="text-sm font-bold text-muted">{unitById.get(next.unitId)?.emoji} Continúa donde ibas</span>
            <span className="block text-xl font-extrabold">{next.title}</span>
            <span className="text-sm">{next.objective}</span>
          </span>
          <span aria-hidden className="text-3xl">
            ▶️
          </span>
        </Link>
      ) : everyLessonDone ? (
        <div className="card text-center">
          <p className="text-lg font-extrabold">🎉 Terminaste todas las lecciones disponibles</p>
          <p className="text-muted">Repasa para no olvidar. Más contenido (A2) llegará pronto.</p>
        </div>
      ) : null}

      <Link href="/review/" className="card flex items-center justify-between gap-3">
        <span>
          <span className="block text-lg font-extrabold">🔁 Repaso</span>
          <span className="text-muted">{s.due > 0 ? `${s.due} ${s.due === 1 ? "palabra o frase pendiente" : "palabras y frases pendientes"}` : "Nada pendiente por ahora"}</span>
        </span>
        <span className={`chip ${s.due > 0 ? "" : "opacity-60"}`}>{s.due}</span>
      </Link>

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Lecciones" value={`${s.lessonsCompleted}/${LESSONS.length}`} />
        <Stat label="Vocabulario aprendido" value={s.learned} />
      </div>
    </div>
  );
}
