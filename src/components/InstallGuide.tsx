"use client";
import { useEffect, useState } from "react";
import { isIOS, isStandalone, usePwa } from "@/lib/pwa";

export default function InstallGuide() {
  const pwa = usePwa();
  const [env, setEnv] = useState<{ ios: boolean; standalone: boolean } | null>(null);
  useEffect(() => setEnv({ ios: isIOS(), standalone: isStandalone() }), []);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-extrabold">Instalar en tu iPhone</h1>
      <p className="text-muted">No necesitas App Store ni cuenta de Apple Developer: se instala desde Safari.</p>

      {env?.standalone && (
        <p role="status" className="card bg-leaf-soft font-bold">
          ✅ Ya estás usando la app instalada.
        </p>
      )}
      {env && !env.standalone && !env.ios && (
        <p role="status" className="card bg-amber-soft">
          Parece que no usas un iPhone o iPad. En Chrome/Edge de escritorio o Android, busca «Instalar app» en el menú del navegador. En iPhone, abre esta página en <b>Safari</b>.
        </p>
      )}

      <ol className="grid gap-3">
        {[
          ["Abre la dirección de la app en Safari", "Tiene que ser Safari (no Chrome ni el navegador de otra app). Necesitas conexión esta primera vez."],
          ["Toca el botón Compartir", "Es el cuadrado con una flecha hacia arriba, en la barra inferior (o arriba a la derecha en iPad)."],
          ["Elige «Añadir a pantalla de inicio»", "Desliza la lista hacia abajo si no la ves. Si no aparece, mira «Si no aparece» más abajo."],
          ["Toca «Añadir»", "Verás el icono de Papito en tu pantalla de inicio."],
          ["Ábrela desde el icono y espera unos segundos con conexión", "Así la app termina de guardarse. Después puedes poner el modo avión y comprobar que abre."],
        ].map(([t, d], i) => (
          <li key={t} className="card flex gap-3">
            <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-amber font-black">
              {i + 1}
            </span>
            <span>
              <span className="block font-extrabold">{t}</span>
              <span className="text-sm text-muted">{d}</span>
            </span>
          </li>
        ))}
      </ol>

      <section className="card" aria-labelledby="noapp">
        <h2 id="noapp" className="font-extrabold">
          Si no aparece «Añadir a pantalla de inicio»
        </h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          <li>Confirma que estás en Safari y no en una ventana privada.</li>
          <li>Toca «Más» o «Editar acciones» al final de la lista de Compartir y activa la opción.</li>
          <li>iOS 16.4 o superior hace la instalación más fiable.</li>
          <li>Si no puedes instalarla, la app sigue funcionando en Safari, aunque iOS puede borrar datos de sitios que no se usan en varios días.</li>
        </ul>
      </section>

      <section className="card" aria-labelledby="state">
        <h2 id="state" className="font-extrabold">
          Estado en este dispositivo
        </h2>
        <ul className="mt-2 grid gap-1 text-sm">
          <li>{env?.standalone ? "✅ Abierta como app (pantalla completa)" : "ℹ️ Abierta en el navegador"}</li>
          <li>{pwa.supported ? "✅ El navegador admite modo offline" : "⚠️ Sin soporte de modo offline"}</li>
          <li>{pwa.offlineReady ? "✅ La app ya está guardada para usarla sin conexión" : "⏳ Aún no confirmada para uso sin conexión"}</li>
        </ul>
      </section>

      <section className="card" aria-labelledby="limits">
        <h2 id="limits" className="font-extrabold">
          Límites de iOS que conviene saber
        </h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          <li>La primera visita y la primera carga necesitan internet.</li>
          <li>iOS puede borrar los datos de una web que no se abre en mucho tiempo si no está instalada en la pantalla de inicio.</li>
          <li>El reconocimiento de voz suele no funcionar en la app instalada y, cuando funciona, necesita conexión.</li>
          <li>Con el interruptor de silencio activado, algunas voces no suenan.</li>
        </ul>
      </section>
    </div>
  );
}
