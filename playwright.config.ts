import { defineConfig } from "@playwright/test";

// Las pruebas E2E usan el build estático (`npm run build`) servido por scripts/serve.mjs.
// Se ejecutan en Chromium (Edge/Chrome del sistema) con viewport de iPhone 15. NO sustituyen una prueba en Safari real.
export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:4173",
    channel: process.env.PW_CHANNEL ?? "msedge",
    viewport: { width: 393, height: 852 },
    hasTouch: true,
    isMobile: true,
    serviceWorkers: "allow",
    locale: "es-CO",
    timezoneId: "America/Bogota",
  },
  webServer: {
    command: "node scripts/serve.mjs",
    url: "http://localhost:4173/manifest.webmanifest",
    env: { PORT: "4173" },
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
