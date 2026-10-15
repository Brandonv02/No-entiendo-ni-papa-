import { chromium, expect, test } from "@playwright/test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LESSONS } from "../src/content";
import { onboard, solveRunner, waitForOfflineReady } from "./helpers";

const lesson = LESSONS.find((l) => l.id === "u1l1")!;

test("reanudar: abandonar una lección a mitad y volver continúa donde estaba, sin perder respuestas", async ({ page }) => {
  // Sin voz sintética no hay ejercicios de escucha: el total es exacto y ninguno se omite.
  await page.addInitScript(() => {
    delete (window as unknown as { speechSynthesis?: unknown }).speechSynthesis;
  });
  await onboard(page);
  await page.goto("/lesson/u1l1/");
  await page.getByRole("button", { name: "¡Listo, a practicar!" }).click();
  await solveRunner(page, { limit: 3 });
  const total = Number(((await page.locator("section[data-ex-id] >> text=/^\\d+\\/\\d+$/").first().textContent()) ?? "").split("/")[1]);
  await expect(page.getByLabel(/Ejercicio 4 de/)).toBeVisible();

  // Abandona la lección: la pantalla de inicio ofrece continuar, no empezar de cero.
  await page.goto("/");
  const resume = page.getByRole("link", { name: /Continuar aprendiendo/ });
  await expect(resume).toBeVisible();
  await expect(resume).toContainText(lesson.title);
  await expect(resume).toContainText("Practicar · ejercicio 4");
  await resume.click();

  // Vuelve exactamente al ejercicio 4 (sin volver a «Aprender» ni al ejercicio 1)
  await expect(page.getByLabel(/Ejercicio 4 de/)).toBeVisible();
  await solveRunner(page);
  // Las 3 respuestas anteriores siguen contando: todo correcto => N de N
  await expect(page.getByText(`Práctica: ${total} de ${total}`)).toBeVisible();

  // Abandona en la etapa de escritura y recarga la página: sigue en «Escribir»
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByRole("heading", { name: /Ahora escribe tú/ })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: /Ahora escribe tú/ })).toBeVisible();
});

test("los usuarios nuevos siguen empezando normalmente (sin tarjeta de continuar)", async ({ page }) => {
  await onboard(page);
  await expect(page.getByRole("link", { name: /Continuar aprendiendo/ })).toBeVisible(); // la primera lección es la sugerida
  await expect(page.getByRole("link", { name: /Continuar aprendiendo/ })).not.toContainText("ejercicio");
  await page.getByRole("link", { name: /Continuar aprendiendo/ }).click();
  await expect(page.getByRole("heading", { name: lesson.title })).toBeVisible(); // empieza por «Aprender»
});

test("volver a /welcome/ con el onboarding hecho no repite el onboarding ni sobrescribe los ajustes", async ({ page }) => {
  await onboard(page);
  await page.goto("/settings/");
  await page.getByRole("radio", { name: /Libre/ }).click();
  await expect(page.getByRole("radio", { name: /Libre/ })).toBeChecked();
  await page.locator('input[type="range"]').fill("40");
  await expect(page.getByText("Meta diaria: 40 ejercicios")).toBeVisible();

  await page.goto("/welcome/");
  await page.waitForURL((u) => !u.pathname.startsWith("/welcome"));
  await page.goto("/settings/");
  await expect(page.getByText("Meta diaria: 40 ejercicios")).toBeVisible();
  await expect(page.getByRole("radio", { name: /Libre/ })).toBeChecked();
});

test("el avance (a mitad de lección y completada) sobrevive a cerrar el navegador y se recupera sin conexión", async () => {
  const dir = mkdtempSync(join(tmpdir(), "nenp-persist-"));
  const launch = () =>
    chromium.launchPersistentContext(dir, { channel: process.env.PW_CHANNEL ?? "msedge", baseURL: "http://localhost:4173", viewport: { width: 393, height: 852 }, locale: "es-CO", timezoneId: "America/Bogota" });

  let ctx = await launch();
  let page = await ctx.newPage();
  await onboard(page);
  await waitForOfflineReady(page);
  await page.reload();
  await page.goto("/lesson/u1l1/");
  await page.getByRole("button", { name: "¡Listo, a practicar!" }).click();
  await solveRunner(page, { limit: 5 });
  await ctx.close(); // «cerrar Safari»

  ctx = await launch();
  await ctx.setOffline(true);
  page = await ctx.newPage();
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /inicio/ })).toBeVisible(); // no se pidió onboarding
  const resume = page.getByRole("link", { name: /Continuar aprendiendo/ });
  await expect(resume).toContainText("ejercicio 6");
  await resume.click();
  await expect(page.getByLabel(/Ejercicio 6 de/)).toBeVisible();

  // Termina la lección sin conexión
  await solveRunner(page);
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByLabel("Tu texto en inglés").fill(lesson.writing.sample);
  await page.getByRole("button", { name: "Comprobar" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Ir a la evaluación final" }).click();
  await solveRunner(page);
  await expect(page.getByRole("heading", { name: "¡Lección superada!" })).toBeVisible();
  await ctx.close();

  // Otra apertura: sigue completada, la siguiente lección es la sugerida y no queda nada «a medias»
  ctx = await launch();
  await ctx.setOffline(true);
  page = await ctx.newPage();
  await page.goto("/");
  await expect(page.getByText("1/24")).toBeVisible();
  const next = page.getByRole("link", { name: /Continuar aprendiendo/ });
  await expect(next).toContainText("Me llamo");
  await expect(next).not.toContainText("ejercicio");
  await ctx.close();
});

test("módulo Costa: una categoría y una conversación a medias se reanudan tras recargar", async ({ page }) => {
  await page.addInitScript(() => {
    delete (window as unknown as { speechSynthesis?: unknown }).speechSynthesis;
  });
  await onboard(page);

  // Conversación: elige, continúa, recarga en el segundo turno y sigue desde ahí
  await page.goto("/costa/c/cartagena/");
  await page.getByRole("button", { name: /Cartagena is good\./ }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByText("but where should I go exactly?")).toBeVisible();
  await page.reload();
  await expect(page.getByText("but where should I go exactly?")).toBeVisible();
  await expect(page.getByText(/Lo que llevan de conversación \(1\)/)).toBeVisible();

  // Categoría: 2 ejercicios y recarga a mitad (de la sesión de práctica)
  await page.goto("/costa/e/comida/");
  await page.getByRole("button", { name: "¡A practicar!" }).click();
  for (let i = 0; i < 2; i++) {
    await page.getByRole("radio").first().click();
    await page.getByRole("button", { name: "Comprobar" }).click();
    await page.getByRole("button", { name: "Continuar" }).click();
  }
  await expect(page.getByLabel(/Ejercicio 3 de/)).toBeVisible();
  await page.reload();
  await expect(page.getByLabel(/Ejercicio 3 de/)).toBeVisible();

  // Inicio: ofrece continuar lo más reciente (la categoría); el progreso a medias de la conversación sigue guardado
  await page.goto("/");
  await expect(page.getByRole("link", { name: /Continuar aprendiendo/ })).toContainText("Comida y restaurantes");
  await expect(page.getByRole("link", { name: /Continuar aprendiendo/ })).toContainText("ejercicio 3");
});
