"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Mascot from "./Mascot";
import { ErrorBox, Loading } from "./ui";
import { interviewById, type Interview } from "@/content/interviews";
import { hasSpeechRecognition, listenOnce, player } from "@/lib/audio";
import { PASS_SCORE, recordLessonResult, recordPractice } from "@/lib/progress";
import { saveLastVisited, type ResumeDoc } from "@/lib/resume";
import { answer, parseTalkState, startTalk, summarize, type ChatMsg, type TalkState } from "@/lib/talk";
import { useAudioInfo, type AudioInfo } from "@/lib/useAudio";
import { useStudyTimer } from "@/lib/useData";
import { useResumeDoc, useResumeWriter } from "@/lib/useResume";

export default function TalkSession({ interviewId }: { interviewId: string }) {
  const iv = interviewById.get(interviewId);
  const audio = useAudioInfo();
  const resume = useResumeDoc("interview", interviewId);
  if (!iv) return <p role="alert">Esta conversación no existe.</p>;
  if (!audio.ready || !resume.ready) return <Loading />;
  if (resume.error) return <ErrorBox error={resume.error} onRetry={() => location.reload()} />;
  return <TalkBody key={interviewId} iv={iv} audio={audio} initial={resume.doc} />;
}

function TalkBody({ iv, audio, initial }: { iv: Interview; audio: AudioInfo; initial: ResumeDoc | null }) {
  const saved = parseTalkState(iv, initial?.extra);
  const [state, setState] = useState<TalkState>(() => saved ?? startTalk(iv));
  const [started, setStarted] = useState(!!saved);
  const [text, setText] = useState("");
  const [usedMic, setUsedMic] = useState(false);
  const [showEs, setShowEs] = useState(false);
  const [voice, setVoice] = useState(true);
  const [help, setHelp] = useState(false);
  const [listening, setListening] = useState<null | (() => void)>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const [finished, setFinished] = useState<ReturnType<typeof summarize> | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const w = useResumeWriter({ kind: "interview", id: iv.id, title: iv.title, href: `/talk/${iv.id}/` }, initial);
  const canRec = typeof window !== "undefined" && hasSpeechRecognition();
  useStudyTimer(`int-${iv.id}`, started && !finished);

  useEffect(() => {
    void saveLastVisited({ kind: "interview", id: iv.id, title: iv.title, href: `/talk/${iv.id}/` }).catch(() => undefined);
  }, [iv]);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [state.messages.length, finished]);

  const say = (msgs: ChatMsg[]) => {
    const lines = msgs.filter((m) => m.from === "npc").map((m) => m.en);
    if (!voice || !audio.canPlay || !lines.length) return;
    player.play(`int-${iv.id}-${state.stepIdx}`, lines.join(" ")).catch(() => undefined);
  };

  const begin = () => {
    setStarted(true);
    say(state.messages);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const send = async () => {
    const t = text.trim();
    if (!t || state.done) return;
    const before = state.messages.length;
    const next = answer(iv, state, t);
    setState(next);
    setText("");
    setHelp(false);
    const added = next.messages.slice(before);
    say(added);
    const mine = added.find((m) => m.from === "me");
    const understood = mine?.feedback?.kind === "ok" || mine?.feedback?.kind === "fix";
    await recordPractice(usedMic ? "speaking" : "writing", understood && mine?.feedback?.kind === "ok", `int-${iv.id}`).catch(() => undefined);
    setUsedMic(false);
    if (next.done) {
      const sum = summarize(iv, next);
      await recordLessonResult(`int-${iv.id}`, sum.score, []);
      await w.clear();
      setFinished(sum);
    } else w.update({ stage: "talk", extra: next });
  };

  const restart = async () => {
    await w.clear();
    player.stop();
    setFinished(null);
    setState(startTalk(iv));
    setStarted(false);
  };

  const mic = async () => {
    if (listening) return listening();
    setMicError(null);
    const { promise, stop } = listenOnce("en-US");
    setListening(() => stop);
    try {
      const r = await promise;
      setText((x) => (x ? `${x} ${r.transcript}` : r.transcript));
      setUsedMic(true);
    } catch (e) {
      setMicError(e instanceof Error ? e.message : "No se pudo usar el micrófono.");
    } finally {
      setListening(null);
    }
  };

  const step = iv.steps[state.stepIdx];

  if (!started)
    return (
      <div className="safe-top flex min-h-[80dvh] flex-col justify-center gap-5">
        <div className="card text-center">
          <p className="text-5xl" aria-hidden>
            {iv.emoji}
          </p>
          <h1 className="mt-2 text-2xl font-extrabold">{iv.title}</h1>
          <p className="mt-1 text-muted">{iv.scene}</p>
          <p className="mt-3 rounded-2xl bg-amber-soft p-3 text-left text-sm">
            Responde con <b>tus propias palabras</b>, escribiendo o tocando el 🎤 del teclado del iPhone para dictar. Si te trabas, pide ayuda. Te entiendo con reglas sencillas: capto respuestas típicas, no cualquier cosa.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={begin}>
          Empezar conversación
        </button>
        <Link href="/talk/" className="btn btn-ghost">
          Elegir otra
        </Link>
      </div>
    );

  return (
    <div className="flex min-h-[calc(100dvh-2rem)] flex-col">
      <header className="safe-top sticky top-0 z-10 flex items-center gap-3 bg-cream pb-2">
        <Link href="/talk/" aria-label="Salir (tu conversación se guarda)" className="btn btn-ghost min-h-11 px-3">
          ✕
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate font-extrabold">
            {iv.emoji} {iv.partner}
          </p>
          <p className="text-xs font-semibold text-muted">
            {finished ? "Conversación terminada" : `Pregunta ${Math.min(state.stepIdx + 1, iv.steps.length)} de ${iv.steps.length}`}
          </p>
        </div>
        <button type="button" aria-pressed={showEs} onClick={() => setShowEs((s) => !s)} className="min-h-11 rounded-xl px-2 text-sm font-bold underline">
          {showEs ? "Ocultar ES" : "Ver ES"}
        </button>
        {audio.canPlay && (
          <button type="button" aria-pressed={voice} aria-label={voice ? "Desactivar voz automática" : "Activar voz automática"} onClick={() => setVoice((v) => !v)} className="min-h-11 rounded-xl px-2 text-xl">
            {voice ? "🔊" : "🔇"}
          </button>
        )}
      </header>
      {w.saveError && (
        <p role="alert" className="rounded-xl bg-oops-soft p-2 text-sm font-semibold text-oops">
          {w.saveError}
        </p>
      )}

      <ol aria-label="Conversación" aria-live="polite" className="flex flex-1 flex-col gap-3 py-2">
        {state.messages.map((m, k) => (
          <li key={k} className={`flex flex-col ${m.from === "me" ? "items-end" : "items-start"}`}>
            {m.from === "npc" ? (
              <div className="flex max-w-[88%] items-end gap-2">
                <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-leaf-soft text-lg">
                  {iv.emoji}
                </span>
                <div className="rounded-3xl rounded-bl-md border-2 border-edge bg-paper px-4 py-2">
                  <p className="font-bold" lang="en">
                    {m.en}
                  </p>
                  {showEs && m.es && <p className="text-sm text-muted">{m.es}</p>}
                  {audio.canPlay && (
                    <button type="button" aria-label={`Escuchar: ${m.en}`} onClick={() => player.play(`int-${iv.id}-m${k}`, m.en).catch(() => undefined)} className="mt-1 min-h-9 rounded-lg px-1 text-sm font-bold text-muted">
                      🔊 Escuchar
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <>
                <p className="max-w-[88%] rounded-3xl rounded-br-md bg-amber px-4 py-2 font-bold text-ink" lang="en">
                  {m.en}
                </p>
                {m.feedback && <FeedbackNote fb={m.feedback} />}
              </>
            )}
          </li>
        ))}
      </ol>

      {finished ? (
        <Summary iv={iv} sum={finished} onRestart={restart} />
      ) : (
        <div className="safe-bottom sticky bottom-0 flex flex-col gap-2 border-t-2 border-edge bg-cream pt-3">
          {help && step && (
            <div className="anim-pop flex items-start gap-2 rounded-2xl bg-amber-soft p-3">
              <Mascot mood="hint" size={44} />
              <div className="text-sm">
                <p className="font-semibold">{step.hint}</p>
                <p className="mt-1">
                  Por ejemplo: <b lang="en">{step.model}</b>
                </p>
                <button
                  type="button"
                  className="mt-1 min-h-10 font-bold underline"
                  onClick={() => {
                    setText(step.model);
                    inputRef.current?.focus();
                  }}
                >
                  Usarla como base (cámbiala con tus datos)
                </button>
              </div>
            </div>
          )}
          {micError && (
            <p role="alert" className="rounded-xl bg-oops-soft p-2 text-sm font-semibold text-oops">
              {micError}
            </p>
          )}
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <label htmlFor="reply" className="sr-only">
              Tu respuesta en inglés
            </label>
            <textarea
              id="reply"
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              rows={2}
              lang="en"
              enterKeyHint="send"
              autoCapitalize="sentences"
              spellCheck={false}
              placeholder="Escribe en inglés o dicta con el 🎤 del teclado"
              className="min-h-14 flex-1 resize-none rounded-2xl border-2 border-edge bg-paper px-4 py-3 text-base"
            />
            <button type="submit" className="btn btn-primary min-h-14 px-4" disabled={!text.trim()}>
              Enviar
            </button>
          </form>
          <div className="flex gap-2">
            <button type="button" className="btn btn-ghost min-h-11 flex-1 py-2 text-sm" aria-pressed={help} onClick={() => setHelp((h) => !h)}>
              💡 Ayuda
            </button>
            {canRec && (
              <button type="button" className="btn btn-ghost min-h-11 flex-1 py-2 text-sm" aria-pressed={!!listening} onClick={mic}>
                {listening ? "⏹️ Detener" : "🎤 Hablar"}
              </button>
            )}
          </div>
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
}

function FeedbackNote({ fb }: { fb: NonNullable<ChatMsg["feedback"]> }) {
  const style = fb.kind === "ok" ? "bg-leaf-soft" : fb.kind === "fix" ? "bg-amber-soft" : "bg-oops-soft";
  return (
    <div className={`mt-1 max-w-[88%] rounded-2xl px-3 py-2 text-sm ${style}`}>
      {fb.kind === "ok" && <p className="font-bold text-leaf">✓ {fb.text}</p>}
      {fb.kind === "fix" && (
        <>
          <p className="font-bold">
            💡 Más natural: <span lang="en">{fb.better}</span>
          </p>
          <p>{fb.text}</p>
        </>
      )}
      {(fb.kind === "spanish" || fb.kind === "unclear" || fb.kind === "skipped") && <p className="font-semibold">{fb.text}</p>}
    </div>
  );
}

function Summary({ iv, sum, onRestart }: { iv: Interview; sum: ReturnType<typeof summarize>; onRestart: () => void }) {
  const passed = sum.score >= PASS_SCORE;
  return (
    <section aria-label="Resumen de la conversación" className="flex flex-col gap-3 pb-6">
      <div className={`card text-center ${passed ? "bg-leaf-soft" : "bg-amber-soft"}`}>
        <div className="flex justify-center">
          <Mascot mood={passed ? "party" : "think"} size={96} />
        </div>
        <h2 className="mt-2 text-xl font-extrabold">{passed ? "¡Conversación lograda!" : "¡Terminaste la conversación!"}</h2>
        <p className="font-bold">
          Te entendieron a la primera en {sum.understoodFirstTry} de {sum.total} preguntas
        </p>
      </div>
      {sum.mistakes.length > 0 ? (
        <div className="card">
          <h3 className="font-extrabold">Para sonar más natural</h3>
          <ul className="mt-2 grid gap-2">
            {sum.mistakes.map((m) => (
              <li key={m.wrong} className="rounded-xl bg-cream p-2 text-sm">
                <s className="text-muted">{m.wrong}</s> → <b lang="en">{m.better}</b>
                <span className="block text-muted">{m.why}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="card">Sin errores frecuentes detectados. ¡Bien ahí!</p>
      )}
      <button type="button" className="btn btn-primary" onClick={onRestart}>
        Repetir con otras respuestas
      </button>
      <Link href="/talk/" className="btn btn-ghost">
        Otra conversación
      </Link>
      <p className="text-center text-xs text-muted">{iv.partner} te entendió con reglas locales, sin internet. Las correcciones cubren errores frecuentes, no toda la gramática.</p>
    </section>
  );
}
