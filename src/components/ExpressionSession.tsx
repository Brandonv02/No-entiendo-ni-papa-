"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import ExerciseRunner, { type RunProgress, type RunResult } from "./ExerciseRunner";
import Mascot from "./Mascot";
import MascotBubble from "./MascotBubble";
import PlayButton from "./PlayButton";
import { ErrorBox, Loading } from "./ui";
import { COSTA_CATEGORIES, categoryById, expressionById, expressionsIn } from "@/content/costa";
import { buildExpressionPractice, expressionAudioId } from "@/lib/costa";
import { PASS_SCORE, recordLessonResult } from "@/lib/progress";
import { say } from "@/lib/mascot";
import { useAudioInfo, type AudioInfo } from "@/lib/useAudio";
import { useStudyTimer } from "@/lib/useData";
import { saveLastVisited, type ResumeDoc, type RunSnapshot } from "@/lib/resume";
import { useResumeDoc, useResumeWriter } from "@/lib/useResume";
import type { Expression, Register } from "@/lib/types";

const REGISTER_LABEL: Record<Register, { label: string; cls: string }> = {
  informal: { label: "Informal", cls: "bg-amber-soft" },
  neutral: { label: "Neutral", cls: "bg-leaf-soft" },
  formal: { label: "Formal", cls: "bg-ink text-white" },
};

export function RegisterChip({ register }: { register: Register }) {
  const r = REGISTER_LABEL[register];
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${r.cls}`}>{r.label}</span>;
}

type Stage = "learn" | "practice" | "summary";

export default function ExpressionSession({ categoryId }: { categoryId: string }) {
  const cat = categoryById.get(categoryId);
  const audio = useAudioInfo();
  const resume = useResumeDoc("costa", categoryId);
  if (!cat) return <p role="alert">Esta categoría no existe.</p>;
  if (!audio.ready || !resume.ready) return <Loading />;
  if (resume.error) return <ErrorBox error={resume.error} onRetry={() => location.reload()} />;
  return <SessionBody key={categoryId} categoryId={categoryId} audio={audio} initial={resume.doc} />;
}

function SessionBody({ categoryId, audio, initial }: { categoryId: string; audio: AudioInfo; initial: ResumeDoc | null }) {
  const cat = categoryById.get(categoryId)!;
  const [stage, setStage] = useState<Stage>(initial?.stage === "practice" ? "practice" : "learn");
  const [result, setResult] = useState<RunResult | null>(null);
  const [round, setRound] = useState(initial?.attempt ?? 1);
  const w = useResumeWriter({ kind: "costa", id: categoryId, title: cat.title, href: `/costa/e/${categoryId}/` }, initial);
  useStudyTimer(`costa-${categoryId}`, stage !== "summary");
  useEffect(() => {
    void saveLastVisited({ kind: "costa", id: categoryId, title: cat.title, href: `/costa/e/${categoryId}/` }).catch(() => undefined);
  }, [categoryId, cat.title]);
  const exprs = expressionsIn(categoryId);

  return (
    <div className="flex flex-col gap-4">
      <header className="safe-top flex items-center gap-3">
        <Link href="/costa/" aria-label="Salir al módulo (tu avance se guarda)" className="btn btn-ghost min-h-11 px-3">
          ✕
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-muted">
            {cat.emoji} {cat.title}
          </p>
          <ol className="flex gap-1" aria-label="Etapas">
            {(["learn", "practice", "summary"] as const).map((s, k) => (
              <li key={s} aria-current={s === stage ? "step" : undefined} className={`h-2 flex-1 rounded-full ${k <= ["learn", "practice", "summary"].indexOf(stage) ? "bg-amber" : "bg-amber-soft"}`}>
                <span className="sr-only">{s === "learn" ? "Aprender" : s === "practice" ? "Practicar" : "Resumen"}</span>
              </li>
            ))}
          </ol>
        </div>
      </header>
      {w.saveError && (
        <p role="alert" className="rounded-xl bg-oops-soft p-3 text-sm font-semibold text-oops">
          {w.saveError}
        </p>
      )}

      {stage === "learn" && (
        <Learn
          title={cat.title}
          exprs={exprs}
          audio={audio}
          onNext={() => {
            setStage("practice");
            w.update({ stage: "practice" });
            window.scrollTo({ top: 0 });
          }}
        />
      )}
      {stage === "practice" && (
        <Practice
          categoryId={categoryId}
          round={round}
          audio={audio}
          snapshot={w.get().runs.practice}
          onSnapshot={(r) => w.setRun("practice", r)}
          onDone={async (r) => {
            setResult(r);
            await recordLessonResult(`costa-${categoryId}`, r.total ? r.correct / r.total : 0, r.mistakes);
            await w.clear();
            setStage("summary");
            window.scrollTo({ top: 0 });
          }}
        />
      )}
      {stage === "summary" && result && (
        <Summary
          categoryId={categoryId}
          result={result}
          onRetry={() => {
            const next = round + 1;
            setRound(next);
            setResult(null);
            setStage("practice");
            w.update({ stage: "practice", attempt: next, runs: {} });
          }}
        />
      )}
    </div>
  );
}

function Learn({ title, exprs, audio, onNext }: { title: string; exprs: Expression[]; audio: AudioInfo; onNext: () => void }) {
  return (
    <div className="flex flex-col gap-5">
      <MascotBubble context="explain" />
      <h1 className="text-2xl font-extrabold">{title}</h1>
      <ul className="grid gap-4">
        {exprs.map((e) => (
          <li key={e.id} className="card flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-2xl font-black leading-tight">{e.es}</p>
              <RegisterChip register={e.register} />
            </div>
            <p className="font-semibold">{e.meaning}</p>
            <p className="text-sm text-muted">📍 {e.situation}</p>

            <div>
              <p className="mb-1 text-sm font-extrabold">Cómo decirlo en inglés (cambia según el contexto)</p>
              <ul className="grid gap-2">
                {e.equivalents.map((q, n) => (
                  <li key={q.en} className="flex items-center justify-between gap-2 rounded-2xl bg-cream p-3">
                    <span className="min-w-0">
                      <span className="block font-extrabold">{q.en}</span>
                      <span className="block text-sm text-muted">{q.nuance}</span>
                      <RegisterChip register={q.register} />
                    </span>
                    <PlayButton id={expressionAudioId(e, n)} text={q.en} compact info={audio} />
                  </li>
                ))}
              </ul>
              <p className="mt-2 rounded-xl bg-amber-soft p-2 text-sm font-semibold">Ojo: no todas significan exactamente lo mismo. Elige según la situación y con quién hablas.</p>
            </div>

            <div>
              <p className="mb-1 text-sm font-extrabold">En la vida real</p>
              <ul className="grid gap-2">
                {e.examples.map((x, n) => (
                  <li key={x.en} className="flex items-center justify-between gap-2">
                    <span>
                      <span className="block font-bold">{x.en}</span>
                      <span className="block text-sm text-muted">{x.es}</span>
                    </span>
                    <PlayButton id={`x-${e.id}-ex${n}`} text={x.en} compact info={audio} />
                  </li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ul>
      <button type="button" className="btn btn-primary sticky bottom-3" onClick={onNext}>
        ¡A practicar!
      </button>
    </div>
  );
}

function Practice({ categoryId, round, audio, snapshot, onSnapshot, onDone }: { categoryId: string; round: number; audio: AudioInfo; snapshot: RunSnapshot | undefined; onSnapshot: (r: RunSnapshot) => void; onDone: (r: RunResult) => void | Promise<void> }) {
  const [exercises] = useState(() => snapshot?.exercises ?? buildExpressionPractice(categoryId, audio.canPlay, `costa-${categoryId}#${round}`));
  const complete = !!snapshot && snapshot.index >= snapshot.exercises.length;
  const closed = useRef(false);
  useEffect(() => {
    if (complete && snapshot && !closed.current) {
      closed.current = true;
      void onDone({ correct: snapshot.correct, total: snapshot.exercises.length - snapshot.skipped, mistakes: snapshot.mistakes });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (complete) return <Loading text="Cerrando tu práctica…" />;
  return (
    <ExerciseRunner
      exercises={exercises}
      lessonId={`costa-${categoryId}`}
      audio={audio}
      {...(snapshot ? { initial: { index: snapshot.index, correct: snapshot.correct, skipped: snapshot.skipped, mistakes: snapshot.mistakes } } : {})}
      onProgress={(p: RunProgress) => onSnapshot({ exercises, ...p })}
      onFinish={onDone}
    />
  );
}

function Summary({ categoryId, result, onRetry }: { categoryId: string; result: RunResult; onRetry: () => void }) {
  const score = result.total ? result.correct / result.total : 0;
  const passed = score >= PASS_SCORE;
  const idx = COSTA_CATEGORIES.findIndex((c) => c.id === categoryId);
  const next = COSTA_CATEGORIES[idx + 1];
  const [bye] = useState(() => say("farewell"));
  const [lead] = useState(() => say(passed ? "lessonDone" : "wrong"));
  const missed = [...new Set(result.mistakes)].map((id) => expressionById.get(id.slice(2))).filter((e): e is Expression => !!e);
  return (
    <div className="flex flex-col gap-4">
      <div className={`card text-center ${passed ? "bg-leaf-soft" : "bg-amber-soft"}`}>
        <div className="flex justify-center">
          <Mascot mood={passed ? "party" : "think"} size={110} />
        </div>
        <h1 className="mt-2 text-2xl font-extrabold">{passed ? "¡Categoría superada!" : "Todavía no, pero vas bien"}</h1>
        <p className="text-lg font-bold">
          {result.correct} de {result.total} ({Math.round(score * 100)} %)
        </p>
        <p className="mt-1">{lead.text}</p>
      </div>

      {missed.length > 0 ? (
        <section className="card" aria-labelledby="miss">
          <h2 id="miss" className="font-extrabold">
            Expresiones para repasar
          </h2>
          <ul className="mt-2 grid gap-2">
            {missed.map((e) => (
              <li key={e.id} className="rounded-xl bg-cream p-2">
                <b>{e.es}</b> → {e.equivalents.map((q) => q.en).join(" · ")}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-sm text-muted">Ya quedaron programadas en tu repaso de hoy.</p>
        </section>
      ) : (
        <p className="card">Sin errores. ¡Esto sí es hablar como tú, pero en inglés!</p>
      )}

      <MascotBubble context="farewell" text={bye.text} mood="wave" />

      <div className="grid gap-2">
        {passed && next && (
          <Link href={`/costa/e/${next.id}/`} className="btn btn-primary">
            Siguiente: {next.title}
          </Link>
        )}
        {missed.length > 0 && (
          <Link href="/review/" className="btn btn-ghost">
            Repasar ahora
          </Link>
        )}
        <button type="button" className="btn btn-ghost" onClick={onRetry}>
          Practicar otra vez
        </button>
        <Link href="/costa/" className="btn btn-ghost">
          Volver al módulo
        </Link>
      </div>
    </div>
  );
}
