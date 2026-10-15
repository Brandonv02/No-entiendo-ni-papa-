/* Service Worker de No Entiendo Ni Papa.
 * scripts/gen-sw.mjs rellena la versión y la lista de precaché después de `next build`.
 *
 * Políticas de caché:
 *  - App (HTML, JS, CSS, iconos, datos de Next): se PRECACHEA completa en la instalación, con versión.
 *    Se sirve cache-first. Una versión nueva se instala en segundo plano y espera a que el usuario
 *    pulse «Actualizar» (mensaje SKIP_WAITING), así nunca se mezclan archivos de dos versiones.
 *  - /audio/manifest.json: network-first (para ver audios nuevos), con copia local como respaldo.
 *  - /audio/*.mp3 etc.: solo se guardan cuando el usuario los descarga a propósito (caché propia
 *    que NO se borra al actualizar la app). Si no están guardados, se piden a la red sin cachearlos.
 *  - Todo lo que no sea del mismo origen o no sea GET: no se toca.
 */
const VERSION = "__VERSION__";
const STATIC_CACHE = "nenp-static-" + VERSION;
const AUDIO_CACHE = "nenp-audio-v1";
const PRECACHE = __PRECACHE__;
const AUDIO_EXT = /\.(mp3|m4a|aac|wav|ogg|opus)$/i;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE)),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names.filter((n) => n.startsWith("nenp-static-") && n !== STATIC_CACHE).map((n) => caches.delete(n)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
  if (event.data && event.data.type === "GET_VERSION" && event.source) event.source.postMessage({ type: "VERSION", version: VERSION });
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname === "/audio/manifest.json") {
    event.respondWith(networkFirst(req));
    return;
  }
  if (url.pathname.startsWith("/audio/") && AUDIO_EXT.test(url.pathname)) {
    event.respondWith(audioFetch(req));
    return;
  }
  if (url.pathname === "/sw.js") return; // el navegador lo gestiona solo

  event.respondWith(appFetch(req));
});

// Next exporta los payloads de segmento en carpetas (__next.path/__PAGE__.txt) pero el cliente los pide
// con puntos (__next.path.__PAGE__.txt). Vercel lo reescribe en el servidor; aquí hacemos lo mismo para la caché.
function rscAlias(url) {
  const u = new URL(url);
  const m = u.pathname.match(/^(.*\/)(__next\.[^./]+)\.(.+)\.txt$/);
  if (!m) return null;
  u.pathname = m[1] + m[2] + "/" + m[3].split(".").join("/") + ".txt";
  u.search = "";
  return u.toString();
}

async function appFetch(req) {
  const cache = await caches.open(STATIC_CACHE);
  const alias = rscAlias(req.url);
  const hit =
    (await cache.match(req, { ignoreSearch: true })) ||
    (alias && (await cache.match(alias))) ||
    (await cache.match(normalizeNav(req), { ignoreSearch: true }));
  if (hit) return hit;
  try {
    return await fetch(req);
  } catch (err) {
    // Sin conexión y sin copia: para navegaciones mostramos la app (la ruta se resuelve en el cliente).
    if (req.mode === "navigate") {
      const shell = await cache.match("/", { ignoreSearch: true });
      if (shell) return shell;
    }
    return new Response("Sin conexión y este recurso no está guardado.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

// /lesson/u1l1 → /lesson/u1l1/ (el export usa barra final)
function normalizeNav(req) {
  const u = new URL(req.url);
  if (req.mode === "navigate" && !u.pathname.endsWith("/") && !/\.[a-z0-9]+$/i.test(u.pathname)) u.pathname += "/";
  return u.toString();
}

async function networkFirst(req) {
  const cache = await caches.open(STATIC_CACHE);
  try {
    const res = await fetch(req, { cache: "no-cache" });
    if (res.ok) await cache.put(req, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    return new Response("{}", { status: 503, headers: { "Content-Type": "application/json" } });
  }
}

async function audioFetch(req) {
  const cache = await caches.open(AUDIO_CACHE);
  const hit = await cache.match(req, { ignoreSearch: true });
  if (hit) return hit;
  try {
    return await fetch(req);
  } catch (err) {
    return new Response("Audio no descargado y sin conexión.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
}
