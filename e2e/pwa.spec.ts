import { expect, test, chromium } from "@playwright/test";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { completeLesson, onboard, waitForOfflineReady } from "./helpers";

test.describe("PWA: manifest e iconos", () => {
  test("el manifest es válido y los iconos existen con el tamaño declarado", async ({ page, request }) => {
    await page.goto("/");
    const href = await page.locator('link[rel="manifest"]').getAttribute("href");
    expect(href).toBe("/manifest.webmanifest");
    const m = await (await request.get("/manifest.webmanifest")).json();
    expect(m).toMatchObject({ name: "No Entiendo Ni Papa", short_name: "Ni Papa", display: "standalone", start_url: expect.any(String), scope: "/" });
    expect(m.icons.some((i: { purpose: string }) => i.purpose === "maskable")).toBe(true);
    for (const icon of m.icons as Array<{ src: string; sizes: string; type: string }>) {
      const res = await request.get(icon.src);
      expect(res.status(), icon.src).toBe(200);
      expect(res.headers()["content-type"]).toBe("image/png");
      const buf = await res.body();
      const w = buf.readUInt32BE(16);
      expect(`${w}x${w}`, icon.src).toBe(icon.sizes);
    }
    const apple = await page.locator('link[rel="apple-touch-icon"]').getAttribute("href");
    expect(apple).toContain("apple-touch-icon");
    expect((await request.get(apple!)).status()).toBe(200);
    await expect(page.locator('meta[name="apple-mobile-web-app-capable"], meta[name="mobile-web-app-capable"]').first()).toHaveCount(1);
    const vp = await page.locator('meta[name="viewport"]').getAttribute("content");
    expect(vp).toContain("viewport-fit=cover");
  });
});

test.describe("flujo principal y offline", () => {
  test("onboarding → lección → progreso, y todo funciona sin conexión", async ({ page, context }) => {
    await onboard(page);
    await waitForOfflineReady(page);

    // La precaché contiene todas las rutas de lección y recursos de Next.
    const precached = await page.evaluate(async () => {
      const name = (await caches.keys()).find((n) => n.startsWith("nenp-static-"))!;
      const keys = await (await caches.open(name)).keys();
      return keys.map((k) => new URL(k.url).pathname);
    });
    expect(precached).toContain("/");
    expect(precached).toContain("/lesson/u12l2/");
    expect(precached.some((p) => p.startsWith("/_next/static/"))).toBe(true);

    // Recargar con el SW ya controlando, y pasar a modo avión.
    await page.reload();
    await context.setOffline(true);
    await expect(page.getByText(/Sin conexión/)).toBeVisible();

    // Navegar y completar una lección entera SIN conexión.
    await page.goto("/path/");
    await expect(page.getByRole("heading", { name: "Tu ruta" })).toBeVisible();
    await expect(page.getByText("Hola y adiós").first()).toBeVisible();
    await completeLesson(page, "u1l1");
    await expect(page.getByRole("heading", { name: "¡Lección superada!" })).toBeVisible();

    // Persistencia: la lección sigue aprobada tras recargar offline y la siguiente se desbloquea.
    await page.goto("/path/");
    await expect(page.locator('a[href="/lesson/u1l2/"]')).toBeVisible();
    await page.goto("/stats/");
    await expect(page.getByText("1/24")).toBeVisible();
    await page.goto("/");
    await expect(page.getByText("🔥 1 día de racha")).toBeVisible();

    // Vuelve la conexión: el aviso desaparece.
    await context.setOffline(false);
    await expect(page.getByText(/Sin conexión/)).toBeHidden();
  });

  test("los errores programan repaso y se puede reiniciar con confirmación", async ({ page }) => {
    await onboard(page);
    await completeLesson(page, "u1l1", { wrongEvery: 2 });
    // Con la mitad mal no se aprueba (<70 %).
    await expect(page.getByRole("heading", { name: /Todavía no/ })).toBeVisible();
    await expect(page.getByText("Lo que conviene repasar")).toBeVisible();
    await page.goto("/review/");
    await expect(page.getByText("pendientes para hoy")).toBeVisible();
    await expect(page.getByRole("button", { name: "Empezar repaso" })).toBeEnabled();

    await page.goto("/settings/");
    await page.getByRole("button", { name: "Reiniciar…" }).click();
    await page.getByRole("button", { name: "Cancelar" }).click();
    await page.goto("/stats/");
    await expect(page.getByText("Aún sin respuestas")).toHaveCount(0);

    await page.goto("/settings/");
    await page.getByRole("button", { name: "Reiniciar…" }).click();
    await page.getByRole("button", { name: "Sí, borrar" }).click();
    await expect(page.getByText("Estadísticas reiniciadas.")).toBeVisible();
    await page.goto("/stats/");
    await expect(page.getByText("Aún sin respuestas")).toBeVisible();
  });

  test("las lecciones bloqueadas no se pueden abrir en modo guiado", async ({ page }) => {
    await onboard(page);
    await page.goto("/lesson/u5l1/");
    await expect(page.getByText("Esta lección aún está bloqueada")).toBeVisible();
  });
});

test("el progreso sobrevive a cerrar y volver a abrir el navegador (sin conexión)", async () => {
  const dir = mkdtempSync(join(tmpdir(), "nenp-"));
  const launch = () =>
    chromium.launchPersistentContext(dir, { channel: process.env.PW_CHANNEL ?? "msedge", baseURL: "http://localhost:4173", viewport: { width: 393, height: 852 }, locale: "es-CO", timezoneId: "America/Bogota" });

  let ctx = await launch();
  let page = await ctx.newPage();
  await onboard(page);
  await waitForOfflineReady(page);
  await page.reload();
  await completeLesson(page, "u1l1");
  await expect(page.getByRole("heading", { name: "¡Lección superada!" })).toBeVisible();
  await ctx.close();

  ctx = await launch();
  await ctx.setOffline(true);
  page = await ctx.newPage();
  await page.goto("/"); // abre desde la caché del SW, sin red
  await expect(page.getByText("🔥 1 día de racha")).toBeVisible();
  await expect(page.getByText("1/24")).toBeVisible();
  await ctx.close();
});

test("audio: descarga desde Ajustes, y suena desde la caché sin conexión", async ({ page, context }) => {
  // Manifest y archivo de prueba (un WAV silencioso válido) servidos solo en esta prueba.
  const wav = Buffer.alloc(44 + 8000);
  wav.write("RIFF", 0); wav.writeUInt32LE(36 + 8000, 4); wav.write("WAVEfmt ", 8); wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(8000, 28);
  wav.writeUInt16LE(1, 32); wav.writeUInt16LE(8, 34); wav.write("data", 36); wav.writeUInt32LE(8000, 40); wav.fill(128, 44);
  await context.route("**/audio/manifest.json", (r) => r.fulfill({ json: { version: 2, files: { u1l1v1: { src: "/audio/u1l1v1.wav", bytes: wav.length }, u1l1p1: { src: "/audio/u1l1p1.wav", bytes: wav.length } } } }));
  await context.route("**/audio/*.wav", (r) => r.fulfill({ body: wav, contentType: "audio/wav" }));

  await onboard(page);
  await waitForOfflineReady(page);
  await page.goto("/settings/");
  await expect(page.getByText("0 de 2 audios descargados")).toBeVisible();
  await page.getByRole("button", { name: "Descargar audios" }).click();
  await expect(page.getByText("2 de 2 audios descargados")).toBeVisible();

  await context.unroute("**/audio/*.wav");
  await context.setOffline(true);
  // Lección 1: «hello» debe sonar desde la caché sin red.
  await page.goto("/lesson/u1l1/");
  await expect(page.getByText("Audio descargado ✓").first()).toBeVisible();
  await page.getByRole("button", { name: "Escuchar: hello" }).first().click();
  await expect(page.getByText("Reproduciendo…").first()).toBeVisible();
  // (el anunciador de rutas de Next es un role=alert vacío: solo cuentan alertas con texto)
  await expect(page.getByRole("alert").filter({ hasText: /\S/ })).toHaveCount(0);
  // La frase 1 también está descargada y la que no lo está (sin archivo) no muestra «descargado».
  await expect(page.getByText("Audio descargado ✓")).toHaveCount(2);
});

test("sin audio disponible se muestra un estado claro (nada se simula)", async ({ page }) => {
  await page.addInitScript(() => {
    // Un dispositivo sin voz sintética y sin archivos de audio.
    delete (window as unknown as { speechSynthesis?: unknown }).speechSynthesis;
  });
  await onboard(page);
  await page.goto("/lesson/u1l1/");
  await expect(page.getByText(/no tiene voz ni audios descargados/).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Escuchar: hello" })).toBeDisabled();
});

test("actualización segura: la versión nueva espera, se aplica al pulsar «Actualizar» y no pierde progreso", async ({ page }) => {
  const swPath = join(process.cwd(), "out", "sw.js");
  const original = readFileSync(swPath, "utf8");
  try {
    await onboard(page);
    await waitForOfflineReady(page);
    const before = await page.evaluate(async () => (await caches.keys()).filter((n) => n.startsWith("nenp-static-")));
    expect(before).toHaveLength(1);

    // Simula un despliegue nuevo: otra versión del SW.
    writeFileSync(swPath, original.replace(/const VERSION = "[^"]+";/, 'const VERSION = "test-v2";'));
    await page.evaluate(async () => void (await navigator.serviceWorker.getRegistration())!.update());

    // La app sigue en la versión vieja y avisa, sin recargar sola.
    await expect(page.getByText("Hay una versión nueva de la app.")).toBeVisible();
    expect(await page.evaluate(async () => (await caches.keys()).filter((n) => n.startsWith("nenp-static-")).sort())).toEqual([...before, "nenp-static-test-v2"].sort());

    await page.getByRole("button", { name: "Actualizar" }).click();
    await page.waitForLoadState("load");
    await expect
      .poll(() => page.evaluate(async () => (await caches.keys()).filter((n) => n.startsWith("nenp-static-"))).catch(() => null)) // null durante la recarga
      .toEqual(["nenp-static-test-v2"]);
    // El progreso (IndexedDB) y los ajustes siguen ahí.
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Buen|Madrug/ })).toBeVisible();
  } finally {
    writeFileSync(swPath, original);
  }
});

test("las descargas de audio fallidas se reintentan al recuperar la conexión", async ({ page, context }) => {
  const wav = Buffer.from("RIFF$\0\0\0WAVEfmt \x10\0\0\0\x01\0\x01\0\x40\x1f\0\0\x40\x1f\0\0\x01\0\x08\0data\0\0\0\0", "binary");
  let failP1 = true;
  await context.route("**/audio/manifest.json", (r) => r.fulfill({ json: { version: 3, files: { u1l1v1: { src: "/audio/u1l1v1.wav" }, u1l1p1: { src: "/audio/u1l1p1.wav" } } } }));
  await context.route("**/audio/*.wav", (r) => (r.request().url().includes("u1l1p1") && failP1 ? r.abort("connectionfailed") : r.fulfill({ body: wav, contentType: "audio/wav" })));

  await onboard(page);
  await page.goto("/settings/");
  await page.getByRole("button", { name: "Descargar audios" }).click();
  await expect(page.getByText(/Faltaron 1 audios/)).toBeVisible();
  await expect(page.getByText("1 de 2 audios descargados")).toBeVisible();

  failP1 = false;
  // Pierde y recupera la conexión: el navegador emite «online» y la descarga se reintenta sola.
  await context.setOffline(true);
  await context.setOffline(false);
  await expect(page.getByText("2 de 2 audios descargados")).toBeVisible();
});
