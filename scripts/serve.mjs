// Servidor estático mínimo para probar el build de `out/` en local (sin dependencias).
import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";

const PORT = Number(process.env.PORT ?? 3000);
const ROOT = "out";
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".mp3": "audio/mpeg",
};

createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://x");
  // Misma reescritura que hace Vercel para los payloads RSC de la exportación estática:
  // /path/__next.path.__PAGE__.txt → /path/__next.path/__PAGE__.txt
  const rewritten = decodeURIComponent(url.pathname).replace(/^(.*\/)(__next\.[^./]+)\.(.+)\.txt$/, (_, d, a, b) => `${d}${a}/${b.split(".").join("/")}.txt`);
  let path = normalize(rewritten).replace(/^([/\\])+/, "");
  let file = join(ROOT, path);
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  if (!existsSync(file) && !extname(file)) file = join(ROOT, path, "index.html");
  if (!file.startsWith(ROOT) || !existsSync(file)) {
    res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    res.end(existsSync(join(ROOT, "404.html")) ? readFileSync(join(ROOT, "404.html")) : "404");
    return;
  }
  const headers = { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream" };
  if (file.endsWith("sw.js")) headers["Cache-Control"] = "no-cache";
  res.writeHead(200, headers);
  res.end(readFileSync(file));
}).listen(PORT, () => console.log(`Sirviendo ${ROOT}/ en http://localhost:${PORT}`));
