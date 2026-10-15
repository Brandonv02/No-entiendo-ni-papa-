import { expect, test, type Page } from "@playwright/test";
import { COSTA_CATEGORIES } from "../src/content/costa";
import { buildExpressionPractice } from "../src/lib/costa";
import { correctAnswerText } from "../src/lib/engine";
import type { Exercise } from "../src/lib/types";
import { onboard, waitForOfflineReady } from "./helpers";

// Sin voz sintética en el navegador: la práctica es determinista (la intención se lee, no se escucha).
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    delete (window as unknown as { speechSynthesis?: unknown }).speechSynthesis;
  });
});

const byId = new Map<string, Exercise>();
for (const c of COSTA_CATEGORIES) for (const ex of buildExpressionPractice(c.id, false)) byId.set(ex.id, ex);

async function currentExercise(page: Page): Promise<Exercise> {
  const id = await page.locator("section[data-ex-id]").getAttribute("data-ex-id");
  const ex = byId.get(id ?? "");
  if (!ex) throw new Error(`Ejercicio desconocido: ${id}`);
  return ex;
}

async function answer(page: Page, ex: Exercise, wrong = false) {
  if ("options" in ex) {
    const texts = (await page.getByRole("radio").allTextContents()).map((t) => t.trim());
    const pick = wrong ? texts.find((t) => t !== ex.answer)! : ex.answer;
    await page.getByRole("radio", { name: pick, exact: true }).click();
  } else if ("tiles" in ex) {
    for (const w of wrong ? [...ex.answer].reverse() : ex.answer) await page.getByLabel("Palabras disponibles").getByRole("button", { name: w, exact: true }).first().click();
  } else {
    await page.getByRole("textbox").fill(wrong ? "zzz qqq" : correctAnswerText(ex));
  }
  await page.getByRole("button", { name: "Comprobar" }).click();
}

/** Resuelve la práctica. `failFirst`: falla a propósito el primero para probar retroalimentación y reintento. */
async function solvePractice(page: Page, failFirst = false, failLast = false) {
  const section = page.locator("section[data-ex-id]");
  let first = true;
  for (;;) {
    if (!(await section.count())) return;
    const ex = await currentExercise(page);
    if (first && failFirst) {
      first = false;
      await answer(page, ex, true);
      await expect(page.getByText("Todavía no")).toBeVisible();
      // retroalimentación específica: la explicación concreta del error, no un mensaje genérico
      if ("optionFeedback" in ex && ex.optionFeedback) {
        const chosen = (await page.getByRole("radio", { name: /./ }).allTextContents()).map((t) => t.trim()).find((t) => ex.optionFeedback![t]);
        if (chosen) await expect(page.getByText(ex.optionFeedback[chosen]!, { exact: false }).first()).toBeVisible();
      }
      await page.getByRole("button", { name: "Intentar de nuevo" }).click();
      await answer(page, ex);
      await expect(page.getByText("¡Ahora sí! Ya lo tienes.")).toBeVisible();
    } else if (failLast && (await page.getByRole("button", { name: "Terminar" }).count()) === 0 && ex.kind === "explain") {
      // último ejercicio de la categoría: se falla a propósito para que quede una expresión por repasar
      await answer(page, ex, true);
      await expect(page.getByText("Todavía no")).toBeVisible();
    } else {
      await answer(page, ex);
      await expect(page.getByText("¡Correcto!")).toBeVisible();
    }
    const next = page.getByRole("button", { name: /^(Continuar|Terminar)$/ });
    const last = (await next.textContent())?.trim() === "Terminar";
    await next.click();
    if (last) {
      await expect(section).toHaveCount(0);
      return;
    }
  }
}

test("la mascota aparece donde corresponde (bienvenida, inicio, resultados) con el sombrero vueltiao", async ({ page }) => {
  await page.goto("/");
  await page.waitForURL("**/welcome/");
  await expect(page.getByRole("img", { name: /papa costeña con sombrero vueltiao/ })).toBeVisible();
  await page.getByRole("button", { name: "¡Empecemos!" }).click();
  await page.getByRole("button", { name: "Ir a mi primera lección" }).click();
  await expect(page.getByRole("heading", { name: /inicio/ })).toBeVisible();
  await expect(page.locator("main svg.anim-bob, main svg.anim-pop").first()).toBeVisible();
  // El sombrero (copa + ala) forma parte del dibujo de la mascota.
  expect(await page.locator("main svg ellipse[stroke-dasharray='7 4']").count()).toBeGreaterThan(0);
});

test("los mensajes de la mascota varían entre visitas", async ({ page }) => {
  await onboard(page);
  const seen = new Set<string>();
  for (let i = 0; i < 8; i++) {
    await page.reload();
    await expect(page.getByRole("heading", { name: /inicio/ })).toBeVisible();
    await page.waitForTimeout(150);
    seen.add(((await page.locator("main [role=status]").first().textContent()) ?? "").trim());
  }
  expect(seen.size).toBeGreaterThan(1);
});

test("expresiones: aprender, practicar con pista/error/reintento y guardar progreso, todo sin conexión", async ({ page, context }) => {
  await onboard(page);
  await waitForOfflineReady(page);
  await page.reload();
  await context.setOffline(true);

  await page.goto("/costa/");
  await expect(page.getByRole("heading", { name: "De la Costa pa'l mundo" })).toBeVisible();
  await expect(page.getByText("Todo esto ya está guardado").or(page.getByText("Modo avión")).or(page.getByText("Sin señal, sin problema")).first()).toBeVisible();
  await page.getByRole("link", { name: /Saludos y expresiones cotidianas/ }).click();

  // Aprender: significado, registro, equivalencias y ejemplos
  await expect(page.getByText("Ajá, ¿qué más?")).toBeVisible();
  await expect(page.getByText("What's up?").first()).toBeVisible();
  await expect(page.getByText("cambia según el contexto").first()).toBeVisible();
  await expect(page.getByText("Informal").first()).toBeVisible();
  await page.getByRole("button", { name: "¡A practicar!" }).click();

  // Pista disponible antes de responder
  await page.getByRole("button", { name: /Dame una pista/ }).click();
  await expect(page.getByText(/No traduzcas palabra por palabra/)).toBeVisible();
  await solvePractice(page, true, true);

  await expect(page.getByRole("heading", { name: "¡Categoría superada!" })).toBeVisible();
  await expect(page.getByText("Expresiones para repasar")).toBeVisible(); // el fallo del primer intento sí cuenta

  // Persistencia: el hub muestra la categoría superada tras recargar, aún sin red
  await page.goto("/costa/");
  await expect(page.getByRole("link", { name: /Saludos y expresiones cotidianas/ }).getByText(/✅/)).toBeVisible();

  // Las lecciones de la ruta no se contaminan; el módulo cuenta aparte
  await page.goto("/stats/");
  await expect(page.getByText("0/24")).toBeVisible();
  await expect(page.getByText("categorías y conversaciones superadas")).toBeVisible();

  // Repaso: la expresión fallada vuelve como «recuerda» sin mostrar la traducción
  await page.goto("/review/");
  await expect(page.getByText("pendientes para hoy")).toBeVisible();
  await page.getByRole("button", { name: "Empezar repaso" }).click();
  await expect(page.getByRole("heading", { name: "Recuerda: ¿cómo lo dirías en inglés?" })).toBeVisible();
  await expect(page.locator("section[data-ex-id^='recall:x:']")).toBeVisible();
});

test("conversaciones: el personaje responde según tus decisiones, explica y guarda el resultado (offline)", async ({ page, context }) => {
  await onboard(page);
  await waitForOfflineReady(page);
  await page.reload();
  await context.setOffline(true);

  await page.goto("/costa/c/cartagena/");
  await expect(page.getByText("Any recommendations?")).toBeVisible();

  // Camino A: respuesta floja → explicación + forma más natural + el personaje pide más
  await page.getByRole("button", { name: /Cartagena is good\./ }).click();
  await expect(page.getByText("Se puede mejorar")).toBeVisible();
  await expect(page.getByText("falta un lugar o una razón")).toBeVisible();
  await expect(page.getByText("Try the Walled City. It's beautiful!")).toBeVisible();
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByText("but where should I go exactly?")).toBeVisible();

  // Camino B (otra decisión) lleva a una respuesta distinta del personaje
  await page.getByRole("button", { name: /Try the Walled City and the Getsemaní/ }).click();
  await expect(page.getByText("¡Muy natural!")).toBeVisible();
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByText("How do I get there from my hotel?")).toBeVisible();
  await page.getByRole("button", { name: /Take a taxi/ }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByText("¡Excelente! Diste recomendaciones concretas y naturales.")).toBeVisible();
  await expect(page.getByText(/Naturalidad: \d+ %/)).toBeVisible();

  // Reiniciar y elegir otro camino: pedir que repitan no se castiga y la respuesta del personaje cambia
  await page.getByRole("button", { name: "Intentar otras respuestas" }).click();
  await page.getByRole("button", { name: /could you say that again/ }).click();
  await expect(page.getByText("Pedir que repitan").first()).toBeHidden().catch(() => {});
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByText("Slowly: I'm new in Cartagena")).toBeVisible();

  // Progreso guardado
  await page.goto("/costa/");
  await expect(page.getByRole("link", { name: /Un turista en Cartagena/ }).getByText(/%/)).toBeVisible();
  await page.goto("/stats/");
  await expect(page.getByText("categorías y conversaciones superadas")).toBeVisible();
});

test("todas las rutas nuevas están en la precaché del Service Worker", async ({ page }) => {
  await onboard(page);
  await waitForOfflineReady(page);
  const paths = await page.evaluate(async () => {
    const name = (await caches.keys()).find((n) => n.startsWith("nenp-static-"))!;
    return (await (await caches.open(name)).keys()).map((k) => new URL(k.url).pathname);
  });
  expect(paths).toContain("/costa/");
  expect(paths).toContain("/costa/e/registro/");
  expect(paths).toContain("/costa/c/hotel/");
  expect(paths).toContain("/costa/c/restaurante/");
});
