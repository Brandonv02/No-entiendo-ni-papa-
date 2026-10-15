"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import Mascot from "./Mascot";
import PlayButton from "./PlayButton";
import { Loading } from "./ui";
import { conversationById } from "@/content/conversations";
import { conversationScore } from "@/lib/costa";
import { PASS_SCORE, recordLessonResult, recordPractice } from "@/lib/progress";
import { useAudioInfo } from "@/lib/useAudio";
import { useStudyTimer } from "@/lib/useData";
import type { ConvOption, ConvQuality } from "@/lib/types";

const QUALITY: Record<ConvQuality, { label: string; cls: string; mood: "cheer" | "happy" | "oops" }> = {
  great: { label: "¡Muy natural!", cls: "bg-leaf-soft text-leaf", mood: "cheer" },
  ok: { label: "Funciona", cls: "bg-amber-soft text-ink", mood: "happy" },
  weak: { label: "Se puede mejorar", cls: "bg-oops-soft text-oops", mood: "oops" },
};

export default function ConversationPlayer({ conversationId }: { conversationId: string }) {
  const conv = conversationById.get(conversationId);
  const audio = useAudioInfo();
  const [nodeId, setNodeId] = useState(conv?.start ?? "");
  const [picked, setPicked] = useState<ConvOption | null>(null); // opción elegida, esperando «Continuar»
  const picks = useRef<ConvOption[]>([]);
  const [finished, setFinished] = useState<{ score: number } | null>(null);
  const [showEs, setShowEs] = useState(true);
  const [log, setLog] = useState<Array<{ who: "npc" | "me"; en: string; es: string }>>([]);
  useStudyTimer(`talk-${conversationId}`, !finished);

  if (!conv) return <p role="alert">Esta conversación no existe.</p>;
  if (!audio.ready) return <Loading />;
  const node = conv.nodes[nodeId];
  if (!node) return <p role="alert">Esta conversación tiene un nodo inválido.</p>;

  const choose = async (o: ConvOption) => {
    if (picked) return;
    setPicked(o);
    picks.current.push(o);
    if (o.kind !== "repeat") await recordPractice("reading", o.quality !== "weak", `talk-${conv.id}`);
  };

  const proceed = async () => {
    if (!picked) return;
    const next = conv.nodes[picked.next];
    setLog((l) => [...l, { who: "npc", en: node.npc.en, es: node.npc.es }, { who: "me", en: picked.en, es: picked.es }]);
    setPicked(null);
    setNodeId(picked.next);
    if (next && !next.options) {
      const score = conversationScore(picks.current);
      await recordLessonResult(`talk-${conv.id}`, score, []);
      setFinished({ score });
    }
    window.scrollTo({ top: 0 });
  };

  const restart = () => {
    picks.current = [];
    setLog([]);
    setPicked(null);
    setFinished(null);
    setNodeId(conv.start);
  };

  const isEnd = !node.options;
  const aid = `talk-${conv.id}-${nodeId}`;

  return (
    <div className="flex flex-col gap-4">
      <header className="safe-top flex items-center gap-3">
        <Link href="/costa/" aria-label="Salir de la conversación" className="btn btn-ghost min-h-11 px-3">
          ✕
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate font-extrabold">
            {conv.emoji} {conv.title}
          </p>
          <p className="truncate text-sm text-muted">{conv.scene}</p>
        </div>
      </header>

      {log.length > 0 && (
        <details className="card !p-3">
          <summary className="min-h-11 cursor-pointer py-2 font-bold">Lo que llevan de conversación ({log.length / 2})</summary>
          <ul className="mt-2 grid gap-2">
            {log.map((l, k) => (
              <li key={k} className={`flex ${l.who === "me" ? "justify-end" : ""}`}>
                <span className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm ${l.who === "me" ? "bg-amber-soft" : "bg-cream"}`}>
                  <b>{l.who === "me" ? "Tú" : conv.npcName}:</b> {l.en}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <section aria-label={`${conv.npcName} dice`} className="flex gap-3">
        <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-full bg-leaf-soft text-xl">
          {conv.emoji}
        </span>
        <div className="flex-1 rounded-3xl rounded-tl-md border-2 border-edge bg-paper p-4">
          <p className="text-xs font-bold text-muted">{conv.npcName}</p>
          <p className="text-lg font-extrabold" lang="en">
            {node.npc.en}
          </p>
          {showEs && <p className="text-sm text-muted">{node.npc.es}</p>}
          <div className="mt-2">
            <PlayButton id={aid} text={node.npc.en} compact info={audio} />
          </div>
        </div>
      </section>

      {!isEnd && !picked && (
        <section aria-label="Tus opciones" className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="font-extrabold">¿Qué respondes?</h2>
            <button type="button" className="min-h-11 text-sm font-bold underline" aria-pressed={showEs} onClick={() => setShowEs((s) => !s)}>
              {showEs ? "Ocultar traducción" : "Mostrar traducción"}
            </button>
          </div>
          {node.options?.map((o) => (
            <button key={o.en} type="button" className="tile text-left" onClick={() => choose(o)}>
              <span className="block" lang="en">
                {o.en}
              </span>
              {showEs && <span className="block text-sm font-normal text-muted">{o.es}</span>}
              {o.kind === "repeat" && <span className="text-xs font-bold text-amber-deep">Pedir que repitan</span>}
              {o.kind === "question" && <span className="text-xs font-bold text-amber-deep">Hacer una pregunta</span>}
            </button>
          ))}
        </section>
      )}

      {picked && !isEnd && (
        <section aria-live="polite" className="anim-pop flex flex-col gap-3">
          <p className="ml-auto max-w-[90%] rounded-3xl rounded-br-md bg-amber-soft px-4 py-3 font-bold" lang="en">
            {picked.en}
          </p>
          <div className={`flex items-start gap-3 rounded-3xl p-4 ${QUALITY[picked.quality].cls}`}>
            <Mascot mood={QUALITY[picked.quality].mood} size={52} />
            <div className="text-ink">
              <p className="font-extrabold">{QUALITY[picked.quality].label}</p>
              <p className="text-sm">{picked.why}</p>
              {picked.better && (
                <p className="mt-1 text-sm">
                  Más natural: <b lang="en">{picked.better}</b>
                </p>
              )}
              <p className="mt-1 text-sm text-muted">Sigue la conversación: mira cómo responde {conv.npcName}.</p>
            </div>
          </div>
          <button type="button" className="btn btn-primary" autoFocus onClick={proceed}>
            Continuar
          </button>
        </section>
      )}

      {isEnd && finished && (
        <section className="flex flex-col gap-3" aria-live="polite">
          <div className={`card text-center ${finished.score >= PASS_SCORE ? "bg-leaf-soft" : "bg-amber-soft"}`}>
            <div className="flex justify-center">
              <Mascot mood={finished.score >= PASS_SCORE ? "party" : "think"} size={100} />
            </div>
            <h1 className="mt-2 text-xl font-extrabold">{finished.score >= PASS_SCORE ? "¡Conversación superada!" : "Conversación terminada"}</h1>
            <p className="text-lg font-bold">Naturalidad: {Math.round(finished.score * 100)} %</p>
            <p className="mt-1">{node.end}</p>
          </div>
          <div className="grid gap-2">
            <button type="button" className="btn btn-primary" onClick={restart}>
              Intentar otras respuestas
            </button>
            <Link href="/costa/" className="btn btn-ghost">
              Volver al módulo
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
