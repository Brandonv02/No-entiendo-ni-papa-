"use client";
import { useMemo, useState } from "react";
import Mascot from "./Mascot";
import PlayButton from "./PlayButton";
import { CORRECT, WRONG, pick } from "@/lib/copy";
import { check, correctAnswerText, type Response } from "@/lib/engine";
import { recordAnswer } from "@/lib/progress";
import type { AudioInfo } from "@/lib/useAudio";
import type { Exercise } from "@/lib/types";

export interface RunResult {
  correct: number;
  total: number;
  mistakes: string[];
}

interface Props {
  exercises: Exercise[];
  lessonId?: string;
  audio: AudioInfo;
  onFinish: (r: RunResult) => void;
}

export default function ExerciseRunner({ exercises, lessonId, audio, onFinish }: Props) {
  const [i, setI] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [skipped, setSkipped] = useState(0);
  const [mistakes, setMistakes] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<null | { ok: boolean; msg: string }>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const ex = exercises[i];
  if (!ex) return null;

  const advance = (nextCorrect = correct, nextMistakes = mistakes, nextSkipped = skipped) => {
    setFeedback(null);
    if (i + 1 >= exercises.length) onFinish({ correct: nextCorrect, total: exercises.length - nextSkipped, mistakes: nextMistakes });
    else setI(i + 1);
  };

  const submit = async (response: Response) => {
    if (feedback) return;
    const ok = check(ex, response);
    setFeedback({ ok, msg: ok ? pick(CORRECT, i + correct) : `${pick(WRONG, i)} Respuesta: ${correctAnswerText(ex)}` });
    if (ok) setCorrect((c) => c + 1);
    else setMistakes((m) => [...m, ex.itemId]);
    try {
      await recordAnswer(ex.itemId, ex.skill, ok, lessonId);
      setSaveError(null);
    } catch {
      setSaveError("No se pudo guardar esta respuesta en tu dispositivo. Tu progreso podría no actualizarse.");
    }
  };

  const skip = () => {
    setSkipped((s) => s + 1);
    advance(correct, mistakes, skipped + 1);
  };

  return (
    <section aria-label={`Ejercicio ${i + 1} de ${exercises.length}`} className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div role="progressbar" aria-valuemin={0} aria-valuemax={exercises.length} aria-valuenow={i} aria-label="Progreso del ejercicio" className="h-3 flex-1 overflow-hidden rounded-full bg-amber-soft">
          <div className="h-full rounded-full bg-amber transition-[width]" style={{ width: `${(i / exercises.length) * 100}%` }} />
        </div>
        <span className="text-sm font-bold text-muted">
          {i + 1}/{exercises.length}
        </span>
      </div>

      <h2 className="text-xl font-extrabold">{ex.prompt}</h2>
      {"sentence" in ex && ex.sentence && <p className="card text-center text-xl font-bold" aria-label={`Frase: ${ex.sentence.replace("_____", "espacio en blanco")}`}>{ex.sentence}</p>}

      {ex.kind === "listen" && (
        <div className="card flex flex-col gap-2">
          <PlayButton id={ex.itemId.slice(2)} text={ex.speak ?? ""} info={audio} />
          <button type="button" className="text-left text-sm font-semibold text-muted underline" onClick={skip} disabled={!!feedback}>
            No puedo escuchar ahora (omitir sin penalización)
          </button>
        </div>
      )}
      {ex.speak && ex.kind !== "listen" && feedback && <PlayButton id={ex.itemId.slice(2)} text={ex.speak} info={audio} compact />}

      <Answer key={ex.id} ex={ex} locked={!!feedback} onSubmit={submit} />

      {saveError && (
        <p role="alert" className="rounded-xl bg-oops-soft p-3 text-sm font-semibold text-oops">
          {saveError}
        </p>
      )}

      <div aria-live="polite" className="min-h-0">
        {feedback && (
          <div className={`anim-pop flex items-center gap-3 rounded-3xl p-4 ${feedback.ok ? "bg-leaf-soft" : "bg-oops-soft"}`}>
            <Mascot mood={feedback.ok ? "party" : "oops"} size={56} />
            <div>
              <p className={`font-extrabold ${feedback.ok ? "text-leaf" : "text-oops"}`}>{feedback.ok ? "¡Correcto!" : "Todavía no"}</p>
              <p className="text-sm">{feedback.msg}</p>
              {!feedback.ok && ex.explanation && <p className="mt-1 text-sm text-muted">{ex.explanation}</p>}
            </div>
          </div>
        )}
      </div>

      {feedback && (
        <button type="button" className="btn btn-primary" autoFocus onClick={() => advance()}>
          {i + 1 >= exercises.length ? "Terminar" : "Continuar"}
        </button>
      )}
    </section>
  );
}

function Answer({ ex, locked, onSubmit }: { ex: Exercise; locked: boolean; onSubmit: (r: Response) => void }) {
  if ("tiles" in ex) return <OrderAnswer tiles={ex.tiles} locked={locked} onSubmit={onSubmit} />;
  if ("accepted" in ex) return <TypeAnswer locked={locked} onSubmit={onSubmit} />;
  return <ChoiceAnswer options={ex.options} locked={locked} onSubmit={onSubmit} answer={ex.answer} />;
}

function ChoiceAnswer({ options, answer, locked, onSubmit }: { options: string[]; answer: string; locked: boolean; onSubmit: (r: Response) => void }) {
  const [sel, setSel] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-3">
      <div role="radiogroup" aria-label="Opciones" className="grid gap-2">
        {options.map((o) => {
          const showRight = locked && o === answer;
          const showWrong = locked && sel === o && o !== answer;
          return (
            <button
              key={o}
              type="button"
              role="radio"
              aria-checked={sel === o}
              disabled={locked}
              onClick={() => setSel(o)}
              className={`tile text-left ${sel === o ? "border-amber bg-amber-soft" : ""} ${showRight ? "border-leaf bg-leaf-soft" : ""} ${showWrong ? "border-oops bg-oops-soft" : ""}`}
            >
              {o}
              {showRight && <span className="sr-only"> (correcta)</span>}
            </button>
          );
        })}
      </div>
      {!locked && (
        <button type="button" className="btn btn-primary" disabled={!sel} onClick={() => sel && onSubmit(sel)}>
          Comprobar
        </button>
      )}
    </div>
  );
}

function OrderAnswer({ tiles, locked, onSubmit }: { tiles: string[]; locked: boolean; onSubmit: (r: Response) => void }) {
  const all = useMemo(() => tiles.map((t, idx) => ({ t, idx })), [tiles]);
  const [picked, setPicked] = useState<number[]>([]);
  const bank = all.filter((x) => !picked.includes(x.idx));
  return (
    <div className="flex flex-col gap-3">
      <div aria-label="Tu respuesta" className="card flex min-h-20 flex-wrap content-start gap-2 border-dashed">
        {picked.length === 0 && <span className="text-muted">Toca las palabras para armar la frase</span>}
        {picked.map((idx) => (
          <button key={idx} type="button" disabled={locked} className="tile" onClick={() => setPicked((p) => p.filter((x) => x !== idx))} aria-label={`Quitar ${all[idx]?.t}`}>
            {all[idx]?.t}
          </button>
        ))}
      </div>
      <div aria-label="Palabras disponibles" className="flex flex-wrap gap-2">
        {bank.map((x) => (
          <button key={x.idx} type="button" disabled={locked} className="tile" onClick={() => setPicked((p) => [...p, x.idx])}>
            {x.t}
          </button>
        ))}
      </div>
      {!locked && (
        <button type="button" className="btn btn-primary" disabled={picked.length !== tiles.length} onClick={() => onSubmit(picked.map((i) => all[i]?.t ?? ""))}>
          Comprobar
        </button>
      )}
    </div>
  );
}

function TypeAnswer({ locked, onSubmit }: { locked: boolean; onSubmit: (r: Response) => void }) {
  const [text, setText] = useState("");
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (text.trim() && !locked) onSubmit(text);
      }}
    >
      <label className="sr-only" htmlFor="answer">
        Tu respuesta en inglés
      </label>
      <input
        id="answer"
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={locked}
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        autoComplete="off"
        lang="en"
        placeholder="Escribe en inglés…"
        className="min-h-14 rounded-2xl border-2 border-edge bg-paper px-4 text-lg"
      />
      {!locked && (
        <button type="submit" className="btn btn-primary" disabled={!text.trim()}>
          Comprobar
        </button>
      )}
    </form>
  );
}
