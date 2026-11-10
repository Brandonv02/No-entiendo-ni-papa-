"use client";
import Link from "next/link";
import MascotBubble from "./MascotBubble";
import { ErrorBox, Loading } from "./ui";
import { CATEGORY_LABEL, INTERVIEWS, type InterviewCategory } from "@/content/interviews";
import { useLessonRecords, useResumeList } from "@/lib/useData";

const CATEGORY_ORDER: InterviewCategory[] = ["trabajo", "social", "viajes"];
const LEVEL = { 1: "Fácil", 2: "Intermedia", 3: "Retadora" } as const;

export default function TalkHub() {
  const records = useLessonRecords();
  const resumes = useResumeList();
  if (records.error) return <ErrorBox error={records.error} />;
  if (records.loading || resumes.loading) return <Loading />;
  const pending = new Set(resumes.data.filter((d) => d.kind === "interview").map((d) => d.id));

  return (
    <div className="flex flex-col gap-5">
      <header className="card bg-gradient-to-br from-leaf-soft to-paper">
        <p className="chip">🗣️ Hablar</p>
        <h1 className="mt-2 text-3xl font-black leading-tight">Conversa con alguien</h1>
        <p className="mt-1 text-muted">Te hacen preguntas como en la vida real y respondes con tus propias palabras. Escribe o dicta con el 🎤 del teclado. Funciona sin internet.</p>
      </header>

      <MascotBubble context="mission" />

      {CATEGORY_ORDER.map((cat) => (
        <section key={cat} aria-labelledby={`cat-${cat}`} className="flex flex-col gap-2">
          <h2 id={`cat-${cat}`} className="text-lg font-extrabold">
            {CATEGORY_LABEL[cat]}
          </h2>
          <ul className="grid gap-2">
        {INTERVIEWS.filter((iv) => iv.category === cat).map((iv) => {
          const r = records.data.get(`int-${iv.id}`);
          return (
            <li key={iv.id}>
              <Link href={`/talk/${iv.id}/`} className="card flex items-center gap-3 !p-3">
                <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-2xl bg-amber-soft text-2xl">
                  {iv.emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-extrabold">{iv.title}</span>
                  <span className="block text-sm text-muted">
                    con {iv.partner} · {iv.steps.length} preguntas · {LEVEL[iv.level]}
                  </span>
                </span>
                {pending.has(iv.id) ? <span className="chip shrink-0">A medias</span> : r && r.attempts > 0 ? <span className="chip shrink-0">{r.passed ? "✅ " : ""}{Math.round(r.bestScore * 100)}%</span> : null}
              </Link>
            </li>
          );
        })}
          </ul>
        </section>
      ))}

      <p className="text-center text-xs text-muted">Te entiendo con reglas sencillas (sin IA): capto respuestas típicas y errores frecuentes, no cualquier frase.</p>
    </div>
  );
}
