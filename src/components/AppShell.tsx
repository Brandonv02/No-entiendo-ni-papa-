"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { applyUpdate, registerServiceWorker, requestPersistence, usePwa } from "@/lib/pwa";
import { useOnline } from "@/lib/useLive";

const NAV = [
  { href: "/", label: "Inicio", icon: "🏠" },
  { href: "/path/", label: "Ruta", icon: "🗺️" },
  { href: "/review/", label: "Repaso", icon: "🔁" },
  { href: "/stats/", label: "Progreso", icon: "📈" },
  { href: "/settings/", label: "Ajustes", icon: "⚙️" },
] as const;

function isActive(path: string, href: string) {
  return href === "/" ? path === "/" : path.startsWith(href);
}

function Banners() {
  const online = useOnline();
  const pwa = usePwa();
  return (
    <div className="safe-top sticky top-0 z-40" aria-live="polite">
      {!online && (
        <p role="status" className="bg-ink px-4 py-2 text-center text-sm font-semibold text-white">
          📴 Sin conexión{pwa.offlineReady ? ": todo lo descargado sigue funcionando." : ": algunas funciones pueden no estar disponibles."}
        </p>
      )}
      {pwa.updateReady && (
        <div role="status" className="flex items-center justify-between gap-3 bg-leaf px-4 py-2 text-sm font-semibold text-white">
          <span>Hay una versión nueva de la app.</span>
          <button type="button" onClick={applyUpdate} className="min-h-10 rounded-xl bg-white px-3 font-bold text-ink">
            Actualizar
          </button>
        </div>
      )}
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname() ?? "/";
  useEffect(() => {
    registerServiceWorker();
    void requestPersistence();
  }, []);
  const focus = path.startsWith("/welcome") || path.startsWith("/lesson");

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col">
      <Banners />
      {!focus && (
        <nav aria-label="Principal" className="safe-top hidden items-center justify-between gap-1 px-4 py-3 md:flex">
          <span className="text-lg font-extrabold">🥔 No Entiendo Ni Papa</span>
          <ul className="flex gap-1">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link href={n.href} aria-current={isActive(path, n.href) ? "page" : undefined} className={`flex min-h-11 items-center gap-1 rounded-2xl px-3 font-bold ${isActive(path, n.href) ? "bg-amber-soft" : ""}`}>
                  <span aria-hidden>{n.icon}</span>
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
      <main id="main" className={`flex-1 px-4 pb-8 pt-4 ${focus ? "" : "pb-28 md:pb-8"}`}>
        {children}
      </main>
      {!focus && (
        <nav aria-label="Principal" className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t-2 border-edge bg-paper md:hidden">
          <ul className="mx-auto flex max-w-3xl">
            {NAV.map((n) => (
              <li key={n.href} className="flex-1">
                <Link href={n.href} aria-current={isActive(path, n.href) ? "page" : undefined} className={`flex min-h-16 flex-col items-center justify-center gap-0.5 text-xs font-bold ${isActive(path, n.href) ? "text-ink" : "text-muted"}`}>
                  <span aria-hidden className={`rounded-full px-4 py-0.5 text-xl ${isActive(path, n.href) ? "bg-amber-soft" : ""}`}>
                    {n.icon}
                  </span>
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
