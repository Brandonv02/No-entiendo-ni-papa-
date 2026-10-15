import type { Metadata, Viewport } from "next";
import "./globals.css";
import AppShell from "@/components/AppShell";

export const metadata: Metadata = {
  title: { default: "No Entiendo Ni Papa", template: "%s · No Entiendo Ni Papa" },
  description: "Aprende inglés desde cero, incluso sin internet. Hoy no entiendes nada. Mañana, un poquito menos.",
  manifest: "/manifest.webmanifest",
  applicationName: "No Entiendo Ni Papa",
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: { capable: true, title: "Ni Papa", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f59e0b",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-xl focus:bg-ink focus:px-4 focus:py-2 focus:text-white">
          Saltar al contenido
        </a>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
