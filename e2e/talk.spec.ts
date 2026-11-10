import { expect, test, type Page } from "@playwright/test";
import { onboard, waitForOfflineReady } from "./helpers";

test.beforeEach(async ({ page }) => {
  // Sin voz sintética: la prueba no depende del audio del navegador.
  await page.addInitScript(() => {
    delete (window as unknown as { speechSynthesis?: unknown }).speechSynthesis;
  });
});

async function say(page: Page, text: string) {
  await page.getByLabel("Tu respuesta en inglés").fill(text);
  await page.getByRole("button", { name: "Enviar" }).click();
}

const chat = (page: Page) => page.getByRole("list", { name: "Conversación" });

test("conversación libre sin conexión: entiende, reacciona con tus datos, corrige y se reanuda a medias", async ({ page, context }) => {
  await onboard(page);
  await waitForOfflineReady(page);
  await page.reload();
  await context.setOffline(true);

  // Acceso desde la navegación principal
  await page.getByRole("link", { name: "Hablar" }).first().click();
  await expect(page.getByRole("heading", { name: "Conversa con alguien" })).toBeVisible();
  await page.getByRole("link", { name: /Papito te entrevista/ }).click();
  await page.getByRole("button", { name: "Empezar conversación" }).click();
  await expect(chat(page)).toContainText("What's your name?");

  // Responde en español: te anima a usar inglés y repite la pregunta
  await say(page, "Me llamo Laura");
  await expect(chat(page)).toContainText("Can you try in English?");

  // Ayuda: pista + ejemplo que se puede usar como base
  await page.getByRole("button", { name: "💡 Ayuda" }).click();
  await expect(page.getByText("My name is Ana.")).toBeVisible();

  await say(page, "My name is laura");
  await expect(chat(page)).toContainText("Nice to meet you, Laura!");
  await expect(chat(page)).toContainText("Where are you from?");

  await say(page, "I'm from Barranquilla, and you?");
  await expect(chat(page)).toContainText("Barranquilla! That sounds like a great place.");
  await expect(chat(page)).toContainText("potato farm in Boyacá");

  // Error típico: entiende igual, sigue la charla y sugiere la forma natural
  await say(page, "I have 28 years");
  await expect(chat(page)).toContainText("28? Perfect age to learn English!");
  await expect(page.getByText("Más natural: I'm 28 years old")).toBeVisible();

  // Cierra a medias y vuelve: sigue en la misma pregunta con el historial
  await page.goto("/");
  await expect(page.getByRole("link", { name: /Continuar aprendiendo/ })).toContainText("Papito te entrevista");
  await page.goto("/talk/papito/");
  await expect(chat(page)).toContainText("Nice to meet you, Laura!");
  await expect(page.getByText("Pregunta 4 de 6")).toBeVisible();

  await say(page, "I'm a nurse");
  await say(page, "I like playing football");
  await say(page, "Because I want to travel");
  await expect(chat(page)).toContainText("Thanks for the chat!");
  await expect(page.getByRole("heading", { name: "¡Conversación lograda!" })).toBeVisible();
  const summary = page.getByRole("region", { name: "Resumen de la conversación" });
  await expect(summary).toContainText("Para sonar más natural");
  await expect(summary).toContainText("I'm 28 years old");
  // 5 de 6: la primera se respondió en español, así que no cuenta como entendida a la primera
  await expect(page.getByText("Te entendieron a la primera en 5 de 6 preguntas")).toBeVisible();

  // Queda guardado (sin red)
  await page.goto("/talk/");
  await expect(page.getByRole("link", { name: /Papito te entrevista/ })).toContainText("83%");
});

test("si no te entiende dos veces, sigue la conversación y te da un ejemplo", async ({ page }) => {
  await onboard(page);
  await page.goto("/talk/trabajo/");
  await page.getByRole("button", { name: "Empezar conversación" }).click();
  await say(page, "potato");
  await expect(chat(page)).toContainText("Sorry, I didn't get that.");
  await say(page, "blue banana");
  await expect(chat(page)).toContainText("No problem, let's continue.");
  await expect(chat(page)).toContainText("Can you tell me a little about yourself?");
  await expect(page.getByText(/Una forma de responder: «I'm fine, thank you\. And you\?»/)).toBeVisible();
});

test("las rutas de conversación están en la precaché", async ({ page }) => {
  await onboard(page);
  await waitForOfflineReady(page);
  const paths = await page.evaluate(async () => {
    const name = (await caches.keys()).find((n) => n.startsWith("nenp-static-"))!;
    return (await (await caches.open(name)).keys()).map((k) => new URL(k.url).pathname);
  });
  for (const p of ["/talk/", "/talk/papito/", "/talk/trabajo/", "/talk/aeropuerto/", "/talk/cafe/", "/talk/primer-dia/", "/talk/llamada/", "/talk/jefa/", "/talk/dia-libre/"]) expect(paths).toContain(p);
});

test("conversación de trabajo: llamada con un cliente, fechas y errores de oficina", async ({ page }) => {
  await onboard(page);
  await page.goto("/talk/");
  await expect(page.getByRole("heading", { name: "💼 Trabajo" })).toBeVisible();
  await page.getByRole("link", { name: /Llamada con un cliente/ }).click();
  await page.getByRole("button", { name: "Empezar conversación" }).click();
  await say(page, "Yes, of course. How can I help you?");
  await say(page, "No, I didn't");
  await expect(chat(page)).toContainText("I'll send it again after this call.");
  await say(page, "I can send it the friday");
  await expect(chat(page)).toContainText("Perfect, Friday then.");
  await expect(page.getByText("Más natural: I can send it on Friday")).toBeVisible();
  await say(page, "Sure");
  await say(page, "Tuesday at 10 am");
  await expect(chat(page)).toContainText("Tuesday at 10 am works for me.");
  await expect(page.getByRole("heading", { name: "¡Conversación lograda!" })).toBeVisible();
});
