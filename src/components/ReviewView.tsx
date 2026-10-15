"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import ExerciseRunner, { type RunResult } from "./ExerciseRunner";
import Mascot from "./Mascot";
import PlayButton from "./PlayButton";
import { Empty, ErrorBox, Loading } from "./ui";
import MascotBubble from "./MascotBubble";
import { buildExpressionReview } from "@/lib/costa";
import { buildReview, poolsFor } from "@/lib/engine";
import { recordAnswer } from "@/lib/progress";
import { pickDue } from "@/lib/srs";
import { useAudioInfo } from "@/lib/useAudio";
import { useSrsItems, useStudyTimer } from "@/lib/useData";
import { LESSONS, phraseById, vocabById } from "@/content";
import type { SrsItem } from "@/lib/types";

const SESSION_SIZE = 10;

export default function ReviewView() {
  const { data: items, loading, error, today } = useSrsItems();
  const audio = useAudioInfo();
  const [mode, setMode] = useState<"menu" | "session" | "cards">("menu");
  const [seed, setSeed] = useState(0);
  const [result, setResult] = useState<RunResult | null>(null);
  useStudyTimer(undefined, mode !== "menu");

  const due = useMemo(() => pickDue(items, today, SESSION_SIZE), [items, today]);
  const exercises = useMemo(
    () =>
      mode === "session"
        ? [
            ...buildReview(due.filter((d) => d.kind !== "expr"), vocabById, phraseById, poolsFor(LESSONS), `${today}#${seed}`),
            ...buildExpressionReview(due.filter((d) => d.kind === "expr"), `${today}#${seed}`),
          ]
        : [],
    // La sesión se congela al empezar: no se recalcula mientras respondes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, seed],
  );

  if (error) return <ErrorBox error={error} />;
  if (loading || !audio.ready) return <Loading />;

  if (mode === "session") {
    if (result)
      return (
        <div className="card text-center">
          <Mascot mood={result.correct / Math.max(1, result.total) >= 0.7 ? "party" : "think"} size={96} />
          <h1 className="mt-2 text-xl font-extrabold">
            Repaso terminado: {result.correct} de {result.total}
          </h1>
          <p className="text-muted">Lo que fallaste volverá a aparecer hoy; lo que acertaste, más adelante.</p>
          <MascotBubble context="farewell" className="mt-3 text-left" />
          <button type="button" className="btn btn-primary mt-4" onClick={() => { setResult(null); setMode("menu"); }}>
            Listo
          </button>
        </div>
      );
    if (exercises.length === 0) return <Empty emoji="🎉" title="Nada que repasar">Ya no quedan elementos pendientes.</Empty>;
    return <ExerciseRunner exercises={exercises} audio={audio} onFinish={setResult} />;
  }

  if (mode === "cards") return <Cards items={items} today={today} onBack={() => setMode("menu")} audioInfo={audio} />;

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-extrabold">Repaso</h1>
        <p className="text-muted">Repetición espaciada con reglas simples (no es inteligencia artificial): lo que más fallas vuelve antes.</p>
      </header>
      {items.length === 0 ? (
        <Empty emoji="🌱" title="Todavía no hay nada que repasar">
          <p>Cuando completes ejercicios en una lección, tus palabras y frases aparecerán aquí.</p>
          <Link href="/path/" className="btn btn-primary mt-3">
            Ir a la ruta
          </Link>
        </Empty>
      ) : (
        <>
          <div className="card">
            <p className="text-3xl font-black">{due.length === SESSION_SIZE ? `${SESSION_SIZE}+` : due.length}</p>
            <p className="text-muted">pendientes para hoy</p>
            <button type="button" className="btn btn-primary mt-3 w-full" disabled={due.length === 0} onClick={() => { setSeed((s) => s + 1); setResult(null); setMode("session"); }}>
              {due.length ? "Empezar repaso" : "Nada pendiente"}
            </button>
          </div>
          <div className="card">
            <p className="font-extrabold">🃏 Tarjetas de vocabulario</p>
            <p className="text-muted">Voltea cada tarjeta, escucha la palabra y dinos si la sabías.</p>
            <button type="button" className="btn btn-ghost mt-3 w-full" onClick={() => setMode("cards")}>
              Abrir tarjetas
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function Cards({ items, today, onBack, audioInfo }: { items: SrsItem[]; today: string; onBack: () => void; audioInfo: ReturnType<typeof useAudioInfo> }) {
  // Mazo: palabras vistas, primero las que más urge repasar; congelado al abrir.
  const [deck] = useState(() => {
    const seen = items.filter((i) => i.kind === "word");
    const dueIds = new Set(pickDue(seen, today, 999).map((i) => i.id));
    return [...seen].sort((a, b) => Number(dueIds.has(b.id)) - Number(dueIds.has(a.id)) || b.wrong - a.wrong).map((i) => i.id);
  });
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  if (deck.length === 0)
    return (
      <Empty emoji="🃏" title="Aún no hay tarjetas">
        <p>Las palabras aparecen aquí después de practicarlas en una lección.</p>
        <button type="button" className="btn btn-ghost mt-3" onClick={onBack}>
          Volver
        </button>
      </Empty>
    );
  if (i >= deck.length)
    return (
      <div className="card text-center">
        <Mascot mood="party" size={96} />
        <h2 className="mt-2 text-xl font-extrabold">¡Mazo terminado!</h2>
        <button type="button" className="btn btn-primary mt-4" onClick={onBack}>
          Volver
        </button>
      </div>
    );

  const id = deck[i]!;
  const v = vocabById.get(id.slice(2));
  if (!v) return null;
  const answer = async (known: boolean) => {
    try {
      await recordAnswer(id, "reading", known);
      setSaveErr(null);
    } catch {
      setSaveErr("No se pudo guardar tu respuesta.");
    }
    setFlipped(false);
    setI((n) => n + 1);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <button type="button" className="btn btn-ghost min-h-11 px-3" onClick={onBack} aria-label="Cerrar tarjetas">
          ✕
        </button>
        <span className="font-bold text-muted">
          {i + 1}/{deck.length}
        </span>
      </div>
      <button type="button" onClick={() => setFlipped((f) => !f)} aria-label={flipped ? `Traducción: ${v.es}. Toca para ver el inglés` : `Inglés: ${v.en}. Toca para ver la traducción`} className="card grid min-h-56 place-items-center text-center">
        <span>
          <span className="block text-sm font-bold text-muted">{flipped ? "Español" : "Inglés"}</span>
          <span className="block text-4xl font-black">{flipped ? v.es : v.en}</span>
          {flipped && v.note && <span className="mt-2 block text-sm text-amber-deep">💡 {v.note}</span>}
          {!flipped && <span className="mt-4 block text-sm text-muted">Toca para voltear</span>}
        </span>
      </button>
      <PlayButton id={v.id} text={v.en} info={audioInfo} />
      {saveErr && <p role="alert" className="text-sm font-semibold text-oops">{saveErr}</p>}
      {flipped && (
        <div className="grid grid-cols-2 gap-3">
          <button type="button" className="btn btn-ghost" onClick={() => answer(false)}>
            😅 No la sabía
          </button>
          <button type="button" className="btn btn-primary" onClick={() => answer(true)}>
            😎 La sabía
          </button>
        </div>
      )}
    </div>
  );
}
