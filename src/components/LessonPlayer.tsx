"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import ExerciseRunner, { type RunProgress, type RunResult } from "./ExerciseRunner";
import Mascot from "./Mascot";
import MascotBubble from "./MascotBubble";
import PlayButton, { AudioBadge } from "./PlayButton";
import { ErrorBox, Loading } from "./ui";
import { DONE_GOOD, DONE_RETRY, pick } from "@/lib/copy";
import { buildFinal, buildPractice, checkWriting, poolsFor, speechSimilarity } from "@/lib/engine";
import { hasSpeechRecognition, listenOnce, player } from "@/lib/audio";
import { PASS_SCORE, isUnlocked, recordLessonResult, recordPractice } from "@/lib/progress";
import { useAudioInfo, type AudioInfo } from "@/lib/useAudio";
import { saveLastVisited, type ResumeDoc, type RunSnapshot } from "@/lib/resume";
import { useResumeDoc, useResumeWriter } from "@/lib/useResume";
import { useLessonRecords, useSettings, useStudyTimer } from "@/lib/useData";
import { LESSONS, lessonById, nextLesson, phraseById, vocabById } from "@/content";
import type { Lesson } from "@/lib/types";

type Stage = "learn" | "practice" | "writing" | "speaking" | "final" | "summary";
const STAGES: Array<{ id: Stage; label: string }> = [
  { id: "learn", label: "Aprender" },
  { id: "practice", label: "Practicar" },
  { id: "writing", label: "Escribir" },
  { id: "speaking", label: "Hablar" },
  { id: "final", label: "Evaluación" },
  { id: "summary", label: "Resumen" },
];

export default function LessonPlayer({ lessonId }: { lessonId: string }) {
  const lesson = lessonById.get(lessonId);
  const settings = useSettings();
  const records = useLessonRecords();
  const audio = useAudioInfo();
  const resume = useResumeDoc("lesson", lessonId);

  if (!lesson) return <p role="alert">Esta lección no existe.</p>;
  if (settings.loading || records.loading || !audio.ready || !resume.ready) return <Loading />;
  // Si no se puede leer el avance guardado, no seguimos: guardar encima podría pisarlo.
  if (resume.error) return <ErrorBox error={resume.error} onRetry={() => location.reload()} />;

  const idx = LESSONS.findIndex((l) => l.id === lessonId);
  const unlocked = isUnlocked(idx, LESSONS.map((l) => l.id), records.data, settings.data?.pathMode ?? "guided");
  if (!unlocked) {
    return (
      <div className="card text-center">
        <Mascot mood="sleepy" size={96} />
        <h1 className="mt-2 text-xl font-extrabold">Esta lección aún está bloqueada</h1>
        <p className="mt-1 text-muted">Aprueba la lección anterior (70 % o más en la evaluación) para abrirla. Puedes cambiar a ruta libre en Ajustes.</p>
        <Link href="/path/" className="btn btn-primary mt-4">
          Volver a la ruta
        </Link>
      </div>
    );
  }
  return <LessonBody key={lessonId} lesson={lesson} audio={audio} initial={resume.doc} />;
}

function LessonBody({ lesson, audio, initial }: { lesson: Lesson; audio: AudioInfo; initial: ResumeDoc | null }) {
  const savedStage = STAGES.some((s) => s.id === initial?.stage && s.id !== "summary") ? (initial?.stage as Stage) : "learn";
  const [stage, setStage] = useState<Stage>(savedStage);
  const [attempt, setAttempt] = useState(initial?.attempt ?? 1);
  const [final, setFinal] = useState<RunResult | null>(null);
  const w = useResumeWriter({ kind: "lesson", id: lesson.id, title: lesson.title, href: `/lesson/${lesson.id}/`, unitId: lesson.unitId }, initial);
  useStudyTimer(lesson.id, stage !== "summary");

  // «Última lección y unidad visitadas»
  useEffect(() => {
    void saveLastVisited({ kind: "lesson", id: lesson.id, title: lesson.title, href: `/lesson/${lesson.id}/`, unitId: lesson.unitId }).catch(() => undefined);
  }, [lesson]);

  const stageIdx = STAGES.findIndex((s) => s.id === stage);
  const go = (s: Stage) => {
    setStage(s);
    w.update({ stage: s });
    window.scrollTo({ top: 0 });
  };
  const run = (name: "practice" | "final") => w.get().runs[name];

  return (
    <div className="flex flex-col gap-4">
      <header className="safe-top flex items-center gap-3">
        <Link href="/path/" aria-label="Salir de la lección (tu avance se guarda)" className="btn btn-ghost min-h-11 px-3">
          ✕
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-muted">{lesson.title}</p>
          <ol className="flex gap-1" aria-label="Etapas de la lección">
            {STAGES.map((s, k) => (
              <li key={s.id} aria-current={s.id === stage ? "step" : undefined} className={`h-2 flex-1 rounded-full ${k <= stageIdx ? "bg-amber" : "bg-amber-soft"}`}>
                <span className="sr-only">{s.label}</span>
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

      {stage === "learn" && <Learn lesson={lesson} audio={audio} onNext={() => go("practice")} />}
      {stage === "practice" && <PracticeStage lesson={lesson} audio={audio} snapshot={run("practice")} onSnapshot={(r) => w.setRun("practice", r)} onDone={() => go("writing")} />}
      {stage === "writing" && <WritingStage lesson={lesson} onDone={() => go("speaking")} />}
      {stage === "speaking" && <SpeakingStage lesson={lesson} audio={audio} onDone={() => go("final")} />}
      {stage === "final" && (
        <FinalStage
          lesson={lesson}
          audio={audio}
          attempt={attempt}
          snapshot={run("final")}
          onSnapshot={(r) => w.setRun("final", r)}
          onDone={async (r) => {
            setFinal(r);
            await recordLessonResult(lesson.id, r.total ? r.correct / r.total : 0, r.mistakes);
            await w.clear(); // la lección terminó: ya no hay nada «a medias»
            setStage("summary");
            window.scrollTo({ top: 0 });
          }}
        />
      )}
      {stage === "summary" && final && (
        <Summary
          lesson={lesson}
          result={final}
          onRetry={() => {
            const next = attempt + 1;
            setAttempt(next);
            setFinal(null);
            setStage("learn");
            w.update({ stage: "learn", attempt: next, runs: {} });
            window.scrollTo({ top: 0 });
          }}
        />
      )}
    </div>
  );
}

// ---------- Aprender ----------
function Learn({ lesson, audio, onNext }: { lesson: Lesson; audio: AudioInfo; onNext: () => void }) {
  return (
    <div className="flex flex-col gap-5">
      <section className="card">
        <p className="chip">🎯 Objetivo</p>
        <h1 className="mt-2 text-2xl font-extrabold">{lesson.title}</h1>
        <p className="mt-1">{lesson.objective}</p>
      </section>

      <section aria-labelledby="vocab">
        <h2 id="vocab" className="mb-2 text-lg font-extrabold">
          Vocabulario
        </h2>
        <ul className="grid gap-2">
          {lesson.vocab.map((v) => (
            <li key={v.id} className="card flex items-center justify-between gap-3 !p-3">
              <div className="min-w-0">
                <p className="text-lg font-extrabold">{v.en}</p>
                <p className="text-muted">{v.es}</p>
                {v.note && <p className="mt-1 text-sm text-amber-deep">💡 {v.note}</p>}
                <AudioBadge id={v.id} info={audio} />
              </div>
              <PlayButton id={v.id} text={v.en} compact info={audio} />
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="phrases">
        <h2 id="phrases" className="mb-2 text-lg font-extrabold">
          Frases para decir
        </h2>
        <ul className="grid gap-3">
          {lesson.phrases.map((p) => (
            <li key={p.id} className="card">
              <p className="text-lg font-extrabold">{p.en}</p>
              <p className="text-muted">{p.es}</p>
              {p.literal && (
                <p className="mt-2 rounded-xl bg-amber-soft p-2 text-sm">
                  <b>Ojo:</b> literalmente sería «{p.literal}», pero en la vida real se dice como arriba.
                </p>
              )}
              {p.note && <p className="mt-2 text-sm text-amber-deep">💡 {p.note}</p>}
              <div className="mt-3">
                <PlayButton id={p.id} text={p.en} info={audio} />
              </div>
            </li>
          ))}
        </ul>
      </section>

      {lesson.dialog && (
        <section aria-labelledby="dialog">
          <h2 id="dialog" className="mb-2 text-lg font-extrabold">
            Mini diálogo
          </h2>
          <Dialog lesson={lesson} audio={audio} />
        </section>
      )}

      <section aria-labelledby="grammar" className="card bg-leaf-soft">
        <h2 id="grammar" className="text-lg font-extrabold">
          📘 {lesson.grammar.title}
        </h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {lesson.grammar.points.map((g) => (
            <li key={g}>{g}</li>
          ))}
        </ul>
        {lesson.grammar.example && <p className="mt-3 rounded-xl bg-white p-3 font-bold">{lesson.grammar.example}</p>}
      </section>

      <button type="button" className="btn btn-primary sticky bottom-3" onClick={onNext}>
        ¡Listo, a practicar!
      </button>
    </div>
  );
}

function Dialog({ lesson, audio }: { lesson: Lesson; audio: AudioInfo }) {
  const lines = lesson.dialog ?? [];
  const [show, setShow] = useState(false);
  return (
    <div className="card flex flex-col gap-3">
      <ul className="grid gap-3">
        {lines.map((l, k) => (
          <li key={k} className={`flex ${k % 2 ? "justify-end" : ""}`}>
            <div className={`max-w-[88%] rounded-2xl p-3 ${k % 2 ? "bg-amber-soft" : "bg-cream"}`}>
              <p className="text-xs font-bold text-muted">{l.speaker}</p>
              <p className="font-bold">{l.en}</p>
              {show && <p className="text-sm text-muted">{l.es}</p>}
            </div>
          </li>
        ))}
      </ul>
      <DialogPlayer lesson={lesson} audio={audio} />
      <button type="button" className="btn btn-ghost" onClick={() => setShow((s) => !s)} aria-pressed={show}>
        {show ? "Ocultar traducción" : "Mostrar traducción"}
      </button>
    </div>
  );
}

/** Reproduce las líneas del diálogo una tras otra con el reproductor real. */
function DialogPlayer({ lesson, audio }: { lesson: Lesson; audio: AudioInfo }) {
  const [state, setState] = useState<"idle" | "playing" | "error">("idle");
  const [err, setErr] = useState<string | null>(null);
  const [cancel] = useState({ v: false });
  const lines = lesson.dialog ?? [];
  const play = async () => {
    if (state === "playing") {
      cancel.v = true;
      player.stop();
      return setState("idle");
    }
    cancel.v = false;
    setErr(null);
    setState("playing");
    try {
      for (let k = 0; k < lines.length && !cancel.v; k++) {
        await player.play(`${lesson.id}d${k + 1}`, lines[k]!.en);
        await new Promise<void>((res) => {
          const unsub = player.subscribe((s) => {
            if (s.state === "idle" || s.state === "error") {
              unsub();
              res();
            }
          });
        });
      }
      setState("idle");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "No se pudo reproducir el diálogo.");
      setState("error");
    }
  };
  return (
    <div className="flex flex-col gap-2">
      <button type="button" className="btn btn-primary" onClick={play} disabled={audio.ready && !audio.canPlay} aria-pressed={state === "playing"}>
        {state === "playing" ? "⏹️ Detener diálogo" : "▶️ Reproducir diálogo"}
      </button>
      {audio.ready && !audio.canPlay && <p className="text-sm text-muted">Sin audio disponible en este dispositivo: lee el diálogo y su traducción.</p>}
      {err && (
        <p role="alert" className="rounded-xl bg-oops-soft p-2 text-sm font-semibold text-oops">
          {err}
        </p>
      )}
    </div>
  );
}

// ---------- Practicar ----------
function PracticeStage({ lesson, audio, snapshot, onSnapshot, onDone }: { lesson: Lesson; audio: AudioInfo; snapshot: RunSnapshot | undefined; onSnapshot: (r: RunSnapshot) => void; onDone: () => void }) {
  // Si hay avance guardado se usa SU lista de ejercicios (no se regenera): así el índice siempre coincide.
  const [exercises] = useState(() => snapshot?.exercises ?? buildPractice(lesson, poolsFor(LESSONS.filter((l) => l.unitId === lesson.unitId)), audio.canPlay));
  const [res, setRes] = useState<RunResult | null>(() => (snapshot && snapshot.index >= snapshot.exercises.length ? { correct: snapshot.correct, total: snapshot.exercises.length - snapshot.skipped, mistakes: snapshot.mistakes } : null));
  if (res)
    return (
      <div className="card text-center">
        <Mascot mood={res.correct / Math.max(1, res.total) >= 0.7 ? "party" : "think"} size={96} />
        <h2 className="mt-2 text-xl font-extrabold">
          Práctica: {res.correct} de {res.total}
        </h2>
        <p className="text-muted">Esto todavía no es la evaluación. Sigue con la escritura y la práctica oral.</p>
        <button type="button" className="btn btn-primary mt-4" onClick={onDone}>
          Continuar
        </button>
      </div>
    );
  return (
    <ExerciseRunner
      exercises={exercises}
      lessonId={lesson.id}
      audio={audio}
      {...(snapshot ? { initial: { index: snapshot.index, correct: snapshot.correct, skipped: snapshot.skipped, mistakes: snapshot.mistakes } } : {})}
      onProgress={(p: RunProgress) => onSnapshot({ exercises, ...p })}
      onFinish={setRes}
    />
  );
}

// ---------- Escribir ----------
function WritingStage({ lesson, onDone }: { lesson: Lesson; onDone: () => void }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<ReturnType<typeof checkWriting> | null>(null);
  const submit = async () => {
    const r = checkWriting(text, lesson.writing.keywords);
    setResult(r);
    await recordPractice("writing", r.missing.length === 0, lesson.id);
  };
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-extrabold">✍️ Ahora escribe tú</h2>
      <p className="card">{lesson.writing.prompt}</p>
      <p className="text-sm text-muted">Pista: {lesson.writing.hint}</p>
      <label htmlFor="writing" className="sr-only">
        Tu texto en inglés
      </label>
      <textarea
        id="writing"
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={!!result}
        rows={4}
        lang="en"
        autoCapitalize="sentences"
        autoCorrect="off"
        spellCheck={false}
        className="rounded-2xl border-2 border-edge bg-paper p-4 text-lg"
        placeholder="Escribe en inglés…"
      />
      {!result ? (
        <button type="button" className="btn btn-primary" disabled={!text.trim()} onClick={submit}>
          Comprobar
        </button>
      ) : (
        <div className="anim-pop card" aria-live="polite">
          <p className="font-extrabold">{result.missing.length === 0 ? "✅ Incluiste lo que se pedía." : "Te faltó incluir:"}</p>
          {result.missing.length > 0 && (
            <ul className="list-disc pl-5">
              {result.missing.map((m) => (
                <li key={m}>«{m}»</li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-sm text-muted">Solo compruebo que uses las expresiones pedidas; no corrijo toda la gramática. Compara con este ejemplo:</p>
          <p className="mt-1 rounded-xl bg-amber-soft p-3 font-bold">{lesson.writing.sample}</p>
          <button type="button" className="btn btn-primary mt-3 w-full" onClick={onDone}>
            Continuar
          </button>
        </div>
      )}
      {!result && (
        <button type="button" className="text-sm font-semibold text-muted underline" onClick={onDone}>
          Omitir esta actividad
        </button>
      )}
    </div>
  );
}

// ---------- Hablar ----------
function SpeakingStage({ lesson, audio, onDone }: { lesson: Lesson; audio: AudioInfo; onDone: () => void }) {
  const canRec = typeof window !== "undefined" && hasSpeechRecognition();
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-extrabold">🗣️ Práctica oral</h2>
      <p className="text-muted">Escucha, repite en voz alta y, si tu dispositivo lo permite, comprueba lo que dijiste.</p>
      {!canRec && (
        <p role="status" className="card bg-amber-soft text-sm">
          Este navegador no ofrece reconocimiento de voz (en iPhone suele fallar con la app instalada en la pantalla de inicio). Repite en voz alta: no puedo evaluar tu pronunciación aquí.
        </p>
      )}
      {lesson.speaking.map((pid) => {
        const p = phraseById.get(pid);
        return p ? <SpeakItem key={pid} id={pid} en={p.en} es={p.es} audio={audio} canRec={canRec} lessonId={lesson.id} /> : null;
      })}
      <button type="button" className="btn btn-primary" onClick={onDone}>
        Ir a la evaluación final
      </button>
    </div>
  );
}

function SpeakItem({ id, en, es, audio, canRec, lessonId }: { id: string; en: string; es: string; audio: AudioInfo; canRec: boolean; lessonId: string }) {
  const [state, setState] = useState<"idle" | "listening">("idle");
  const [out, setOut] = useState<null | { heard: string; score: number }>(null);
  const [err, setErr] = useState<string | null>(null);
  const [stopper, setStopper] = useState<(() => void) | null>(null);

  const rec = async () => {
    setErr(null);
    setOut(null);
    const { promise, stop } = listenOnce("en-US");
    setStopper(() => stop);
    setState("listening");
    try {
      const r = await promise;
      const score = speechSimilarity(en, r.transcript);
      setOut({ heard: r.transcript, score });
      await recordPractice("speaking", score >= 0.8, lessonId);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "No se pudo reconocer la voz.");
    } finally {
      setState("idle");
      setStopper(null);
    }
  };

  return (
    <div className="card flex flex-col gap-3">
      <div>
        <p className="text-lg font-extrabold">{en}</p>
        <p className="text-muted">{es}</p>
      </div>
      <PlayButton id={id} text={en} info={audio} />
      {canRec && (
        <>
          <button type="button" className="btn btn-ghost" onClick={state === "listening" ? () => stopper?.() : rec} aria-pressed={state === "listening"}>
            {state === "listening" ? "⏹️ Dejar de escuchar" : "🎤 Decirlo yo"}
          </button>
          <p className="text-xs text-muted">Puede pedir permiso de micrófono y necesitar conexión a internet (Safari envía el audio a Apple).</p>
        </>
      )}
      <div aria-live="polite">
        {out && (
          <p className="rounded-xl bg-amber-soft p-3 text-sm">
            Entendí: <b>«{out.heard}»</b>. Coincidencia de palabras: <b>{Math.round(out.score * 100)} %</b>. {out.score >= 0.8 ? "¡Muy bien!" : "Prueba de nuevo, más despacio."} <span className="text-muted">(Compara palabras; no evalúa tu acento.)</span>
          </p>
        )}
        {err && (
          <p role="alert" className="rounded-xl bg-oops-soft p-3 text-sm font-semibold text-oops">
            {err}
          </p>
        )}
      </div>
    </div>
  );
}

// ---------- Evaluación ----------
function FinalStage({ lesson, audio, attempt, snapshot, onSnapshot, onDone }: { lesson: Lesson; audio: AudioInfo; attempt: number; snapshot: RunSnapshot | undefined; onSnapshot: (r: RunSnapshot) => void; onDone: (r: RunResult) => void | Promise<void> }) {
  const [exercises] = useState(() => snapshot?.exercises ?? buildFinal(lesson, poolsFor(LESSONS.filter((l) => l.unitId === lesson.unitId)), attempt));
  // Si la evaluación ya estaba respondida pero no llegó a cerrarse (se cerró la app justo al final), se cierra ahora una sola vez.
  const complete = !!snapshot && snapshot.index >= snapshot.exercises.length;
  const closed = useRef(false);
  useEffect(() => {
    if (complete && snapshot && !closed.current) {
      closed.current = true;
      void onDone({ correct: snapshot.correct, total: snapshot.exercises.length - snapshot.skipped, mistakes: snapshot.mistakes });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (complete) return <Loading text="Cerrando tu evaluación…" />;
  return (
    <div className="flex flex-col gap-3">
      <p className="chip self-start">🏁 Evaluación final · necesitas {Math.round(PASS_SCORE * 100)} %</p>
      <ExerciseRunner
        exercises={exercises}
        lessonId={lesson.id}
        audio={audio}
        {...(snapshot ? { initial: { index: snapshot.index, correct: snapshot.correct, skipped: snapshot.skipped, mistakes: snapshot.mistakes } } : {})}
        onProgress={(p: RunProgress) => onSnapshot({ exercises, ...p })}
        onFinish={onDone}
      />
    </div>
  );
}

// ---------- Resumen ----------
function Summary({ lesson, result, onRetry }: { lesson: Lesson; result: RunResult; onRetry: () => void }) {
  const score = result.total ? result.correct / result.total : 0;
  const passed = score >= PASS_SCORE;
  const next = nextLesson(lesson.id);
  const uniq = [...new Set(result.mistakes)];
  return (
    <div className="flex flex-col gap-4">
      <div className={`card text-center ${passed ? "bg-leaf-soft" : "bg-amber-soft"}`}>
        <Mascot mood={passed ? "party" : "think"} size={112} />
        <h1 className="mt-2 text-2xl font-extrabold">{passed ? "¡Lección superada!" : "Todavía no, pero vas bien"}</h1>
        <p className="text-lg font-bold">
          {result.correct} de {result.total} ({Math.round(score * 100)} %)
        </p>
        <p className="mt-1">{passed ? pick(DONE_GOOD, result.correct) : pick(DONE_RETRY, result.correct)}</p>
      </div>

      {uniq.length > 0 ? (
        <section className="card" aria-labelledby="errs">
          <h2 id="errs" className="font-extrabold">
            Lo que conviene repasar
          </h2>
          <ul className="mt-2 grid gap-2">
            {uniq.map((id) => {
              const item = id.startsWith("w:") ? vocabById.get(id.slice(2)) : phraseById.get(id.slice(2));
              return item ? (
                <li key={id} className="rounded-xl bg-cream p-2">
                  <b>{item.en}</b> — {item.es}
                </li>
              ) : null;
            })}
          </ul>
          <p className="mt-2 text-sm text-muted">Estos elementos ya quedaron programados en tu repaso de hoy.</p>
        </section>
      ) : (
        <p className="card">Sin errores en la evaluación. ¡Impecable!</p>
      )}

      <MascotBubble context="farewell" />

      <div className="grid gap-2">
        {passed && next && (
          <Link href={`/lesson/${next.id}/`} className="btn btn-primary">
            Siguiente: {next.title}
          </Link>
        )}
        {uniq.length > 0 && (
          <Link href="/review/" className="btn btn-ghost">
            Repasar ahora
          </Link>
        )}
        <button type="button" className="btn btn-ghost" onClick={onRetry}>
          Repetir la lección
        </button>
        <Link href="/path/" className="btn btn-ghost">
          Volver a la ruta
        </Link>
      </div>
    </div>
  );
}
