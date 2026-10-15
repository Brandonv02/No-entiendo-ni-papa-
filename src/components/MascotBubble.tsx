"use client";
import { useEffect, useState } from "react";
import Mascot from "./Mascot";
import { firstMessage, say, type MascotContext, type Mood } from "@/lib/mascot";

/**
 * Mascota con globo de texto. El primer render usa un mensaje fijo (igual en servidor y cliente);
 * al montar se cambia por uno variado, sin repetir el último del mismo contexto.
 */
export default function MascotBubble({
  context,
  text,
  mood,
  size = 72,
  className = "",
}: {
  context: MascotContext;
  /** Si se pasa, se muestra este texto en lugar de uno del banco. */
  text?: string;
  mood?: Mood;
  size?: number;
  className?: string;
}) {
  const [line, setLine] = useState(() => firstMessage(context));
  useEffect(() => {
    setLine(say(context));
  }, [context]);
  const shownMood = mood ?? line.mood;
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Mascot mood={shownMood} size={size} />
      <p role="status" className="relative flex-1 rounded-3xl rounded-bl-md bg-amber-soft px-4 py-3 text-[15px] font-semibold leading-snug">
        {text ?? line.text}
      </p>
    </div>
  );
}
