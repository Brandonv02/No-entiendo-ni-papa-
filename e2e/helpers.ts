import { expect, type Page } from "@playwright/test";
import { LESSONS, phraseById, vocabById } from "../src/content";

export async function onboard(page: Page) {
  await page.goto("/");
  await page.waitForURL("**/welcome/");
  await page.getByRole("button", { name: "¡Empecemos!" }).click();
  await page.getByRole("button", { name: "Ir a mi primera lección" }).click();
  await expect(page.getByRole("heading", { name: /inicio/ })).toBeVisible();
}

/** Espera a que el SW controle la página y la precaché esté completa. */
export async function waitForOfflineReady(page: Page) {
  await expect
    .poll(
      () =>
        page.evaluate(async () => {
          if (!navigator.serviceWorker.controller) return 0;
          const name = (await caches.keys()).find((n) => n.startsWith("nenp-static-"));
          return name ? (await (await caches.open(name)).keys()).length : 0;
        }),
      { timeout: 30_000, message: "el Service Worker debe controlar la página con la precaché completa" },
    )
    .toBeGreaterThan(100);
}

const vocabByEn = new Map([...vocabById.values()].map((v) => [v.en, v]));
const vocabByEs = new Map([...vocabById.values()].map((v) => [v.es, v]));

/** Resuelve ejercicios leyendo el enunciado y buscando la respuesta en el contenido. `wrongEvery`: falla 1 de cada N a propósito. */
export async function solveRunner(page: Page, opts: { wrongEvery?: number } = {}) {
  let n = 0;
  for (;;) {
    const section = page.locator('section[aria-label^="Ejercicio"]');
    if (!(await section.count())) return n;
    const prompt = ((await section.locator("h2").first().textContent()) ?? "").trim();
    n++;
    const wrong = opts.wrongEvery ? n % opts.wrongEvery === 0 : false;

    if (prompt.startsWith("Escucha")) {
      await page.getByRole("button", { name: /No puedo escuchar/ }).click();
      continue;
    }
    let m: RegExpMatchArray | null;
    if ((m = prompt.match(/^¿Qué significa «(.+)»\?$/))) {
      const v = vocabByEn.get(m[1]!)!;
      await pickOption(page, v.es, wrong);
    } else if ((m = prompt.match(/^¿Cómo se dice «(.+)» en inglés\?$/))) {
      const v = vocabByEs.get(m[1]!)!;
      await pickOption(page, v.en, wrong);
    } else if ((m = prompt.match(/^Completa: (.+)$/))) {
      const p = [...phraseById.values()].find((x) => x.es === m![1] && x.blank)!;
      await pickOption(page, p.blank!, wrong);
    } else if ((m = prompt.match(/^Ordena las palabras: «(.+)»$/))) {
      const p = [...phraseById.values()].find((x) => x.es === m![1])!;
      await order(page, p.en.split(/\s+/), wrong);
    } else if ((m = prompt.match(/^Ordena la traducción de: «(.+)»$/))) {
      const p = [...phraseById.values()].find((x) => x.en === m![1])!;
      await order(page, p.es.split(/\s+/), wrong);
    } else if ((m = prompt.match(/^Escríbelo en inglés: «(.+)»$/))) {
      const p = [...phraseById.values()].find((x) => x.es === m![1])!;
      await page.getByLabel("Tu respuesta en inglés").fill(wrong ? "wrong answer" : p.en);
      await page.getByRole("button", { name: "Comprobar" }).click();
    } else throw new Error(`Enunciado no reconocido: ${prompt}`);

    const next = page.getByRole("button", { name: /^(Continuar|Terminar)$/ });
    const last = (await next.textContent())?.trim() === "Terminar";
    await next.click();
    if (last) {
      // Terminar guarda en IndexedDB antes de cambiar de pantalla: esperamos a que se vaya el ejercicio.
      await expect(section).toHaveCount(0);
      return n;
    }
  }
}

async function pickOption(page: Page, answer: string, wrong: boolean) {
  const radios = page.getByRole("radio");
  if (wrong) {
    const texts = await radios.allTextContents();
    const idx = texts.findIndex((t) => t.trim() !== answer);
    await radios.nth(idx).click();
  } else await page.getByRole("radio", { name: answer, exact: true }).click();
  await page.getByRole("button", { name: "Comprobar" }).click();
}

async function order(page: Page, words: string[], wrong: boolean) {
  const seq = wrong ? [...words].reverse() : words;
  for (const w of seq) {
    // Toca la primera ficha disponible con ese texto (el banco queda tras el área de respuesta).
    await page.getByLabel("Palabras disponibles").getByRole("button", { name: w, exact: true }).first().click();
  }
  await page.getByRole("button", { name: "Comprobar" }).click();
}

export async function completeLesson(page: Page, lessonId: string, opts: { wrongEvery?: number } = {}) {
  await page.goto(`/lesson/${lessonId}/`);
  const lesson = LESSONS.find((l) => l.id === lessonId)!;
  await page.getByRole("button", { name: "¡Listo, a practicar!" }).click();
  await solveRunner(page);
  await page.getByRole("button", { name: "Continuar" }).click(); // tarjeta de resultado de práctica
  await page.getByLabel("Tu texto en inglés").fill(lesson.writing.sample);
  await page.getByRole("button", { name: "Comprobar" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Ir a la evaluación final" }).click();
  await solveRunner(page, opts);
}
