"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Mascot from "./Mascot";
import { SLOGAN } from "@/lib/copy";
import { saveSettings } from "@/lib/progress";
import type { Settings } from "@/lib/types";

const GOALS = [
  { v: 10, label: "Tranqui", hint: "10 ejercicios · ~3 min" },
  { v: 20, label: "Constante", hint: "20 ejercicios · ~6 min" },
  { v: 40, label: "En serio", hint: "40 ejercicios · ~12 min" },
];

export default function Welcome() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<Settings["pathMode"]>("guided");
  const [goal, setGoal] = useState(20);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const finish = async () => {
    setBusy(true);
    try {
      await saveSettings({ onboarded: true, pathMode: mode, dailyGoal: goal, level: "A1" });
      router.replace("/");
    } catch {
      setError("No pude guardar tus preferencias en este dispositivo. ¿Estás en modo privado de Safari? Salte del modo privado e inténtalo de nuevo.");
      setBusy(false);
    }
  };

  return (
    <div className="safe-top flex min-h-[85dvh] flex-col justify-center gap-6">
      {step === 0 ? (
        <>
          <div className="flex flex-col items-center gap-3 text-center">
            <Mascot mood="wave" size={160} label="Papito, la papa costeña con sombrero vueltiao" />
            <h1 className="text-4xl font-black leading-tight">No Entiendo Ni Papa</h1>
            <p className="text-lg font-semibold text-muted">{SLOGAN}</p>
            <p className="max-w-sm">Soy Papito. Te acompaño a aprender inglés desde cero: escuchar, hablar, leer y escribir. Sin presión y con buen humor.</p>
          </div>
          <button type="button" className="btn btn-primary" onClick={() => setStep(1)}>
            ¡Empecemos!
          </button>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-extrabold">Cuéntame cómo empezar</h1>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 font-bold">¿Cómo está tu inglés?</legend>
            {(
              [
                ["guided", "Parto de cero", "Las lecciones se abren en orden, al aprobar la anterior."],
                ["free", "Conozco algunas palabras", "Todas las lecciones abiertas: elige por dónde empezar."],
              ] as const
            ).map(([v, t, d]) => (
              <label key={v} className={`card flex min-h-16 cursor-pointer items-start gap-3 ${mode === v ? "border-amber bg-amber-soft" : ""}`}>
                <input type="radio" name="mode" className="mt-1 size-5 accent-amber-600" checked={mode === v} onChange={() => setMode(v)} />
                <span>
                  <span className="block font-extrabold">{t}</span>
                  <span className="text-sm text-muted">{d}</span>
                </span>
              </label>
            ))}
            <p className="text-sm text-muted">Nivel de contenido disponible: A1 (principiante). Más niveles llegarán después.</p>
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 font-bold">¿Cuánto quieres estudiar por día?</legend>
            {GOALS.map((g) => (
              <label key={g.v} className={`card flex min-h-16 cursor-pointer items-center gap-3 ${goal === g.v ? "border-amber bg-amber-soft" : ""}`}>
                <input type="radio" name="goal" className="size-5 accent-amber-600" checked={goal === g.v} onChange={() => setGoal(g.v)} />
                <span>
                  <span className="block font-extrabold">{g.label}</span>
                  <span className="text-sm text-muted">{g.hint}</span>
                </span>
              </label>
            ))}
            <p className="text-sm text-muted">Lo puedes cambiar cuando quieras en Ajustes.</p>
          </fieldset>

          {error && (
            <p role="alert" className="rounded-xl bg-oops-soft p-3 font-semibold text-oops">
              {error}
            </p>
          )}
          <button type="button" className="btn btn-primary" onClick={finish} disabled={busy}>
            {busy ? "Guardando…" : "Ir a mi primera lección"}
          </button>
        </>
      )}
    </div>
  );
}
