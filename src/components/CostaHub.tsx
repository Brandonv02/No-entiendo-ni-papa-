"use client";
import Link from "next/link";
import MascotBubble from "./MascotBubble";
import { ErrorBox, Loading } from "./ui";
import { useLessonRecords } from "@/lib/useData";
import { usePwa } from "@/lib/pwa";
import { COSTA_CATEGORIES, expressionsIn } from "@/content/costa";
import { CONVERSATIONS } from "@/content/conversations";

export default function CostaHub() {
  const records = useLessonRecords();
  const pwa = usePwa();
  if (records.error) return <ErrorBox error={records.error} />;
  if (records.loading) return <Loading />;
  const rec = records.data;
  const doneCats = COSTA_CATEGORIES.filter((c) => rec.get(`costa-${c.id}`)?.passed).length;

  return (
    <div className="flex flex-col gap-6">
      <header className="card overflow-hidden bg-gradient-to-br from-amber-soft to-cream">
        <p className="chip">🌴 Habla como tú, comunícate en inglés</p>
        <h1 className="mt-2 text-3xl font-black leading-tight">De la Costa pa&apos;l mundo</h1>
        <p className="mt-1 text-muted">No se trata de traducir palabra por palabra, sino de saber qué decir según la situación y con quién hablas.</p>
        <p className="mt-2 text-sm font-bold">
          {doneCats}/{COSTA_CATEGORIES.length} categorías superadas
        </p>
      </header>

      <MascotBubble context={pwa.offlineReady ? "offline" : "mission"} />

      <section aria-labelledby="cats" className="flex flex-col gap-2">
        <h2 id="cats" className="text-lg font-extrabold">
          Expresiones por tema
        </h2>
        <ul className="grid gap-2">
          {COSTA_CATEGORIES.map((c) => {
            const r = rec.get(`costa-${c.id}`);
            const n = expressionsIn(c.id).length;
            return (
              <li key={c.id}>
                <Link href={`/costa/e/${c.id}/`} className="card flex items-center gap-3 !p-3">
                  <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-2xl bg-amber-soft text-2xl">
                    {c.emoji}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-extrabold">{c.title}</span>
                    <span className="block text-sm text-muted">{c.blurb}</span>
                    <span className="text-xs font-semibold text-muted">{n} expresiones</span>
                  </span>
                  {r?.passed ? <span className="chip">✅ {Math.round(r.bestScore * 100)}%</span> : r && r.attempts > 0 ? <span className="chip">{Math.round(r.bestScore * 100)}%</span> : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="talks" className="flex flex-col gap-2">
        <h2 id="talks" className="text-lg font-extrabold">
          Conversaciones con decisiones
        </h2>
        <p className="-mt-1 text-sm text-muted">Un personaje te responde según lo que elijas. Funciona sin internet.</p>
        <ul className="grid gap-2">
          {CONVERSATIONS.map((c) => {
            const r = rec.get(`talk-${c.id}`);
            return (
              <li key={c.id}>
                <Link href={`/costa/c/${c.id}/`} className="card flex items-center gap-3 !p-3">
                  <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-2xl bg-leaf-soft text-2xl">
                    {c.emoji}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-extrabold">{c.title}</span>
                    <span className="block text-sm text-muted">con {c.npcName}</span>
                  </span>
                  {r && r.attempts > 0 && <span className="chip">{r.passed ? "✅ " : ""}{Math.round(r.bestScore * 100)}%</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
