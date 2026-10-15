// Genera out/sw.js con la lista de precaché y una versión derivada del contenido real del build.
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

const OUT = "out";
const SKIP = [/^sw\.js$/, /\.map$/, /\.(mp3|m4a|aac|wav|ogg|opus)$/i];

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const files = walk(OUT)
  .map((p) => relative(OUT, p).split(sep).join("/"))
  .filter((f) => !SKIP.some((re) => re.test(f)))
  .sort();

const urls = new Set();
const hash = createHash("sha256");
for (const f of files) {
  hash.update(f).update(readFileSync(join(OUT, f)));
  if (f === "index.html") urls.add("/");
  else if (f.endsWith("/index.html")) urls.add("/" + f.slice(0, -"index.html".length));
  urls.add("/" + f);
}

const version = hash.digest("hex").slice(0, 12);
const template = readFileSync("src/sw/sw.template.js", "utf8");
const list = JSON.stringify([...urls].sort(), null, 1);
const sw = template.replace('const VERSION = "__VERSION__";', () => `const VERSION = "${version}";`).replace("const PRECACHE = __PRECACHE__;", () => `const PRECACHE = ${list};`);
if (sw.includes("__VERSION__") || sw.includes("__PRECACHE__")) throw new Error("sw.template.js: marcadores sin sustituir");
writeFileSync(join(OUT, "sw.js"), sw);
new Function(sw); // falla el build si el SW no es JavaScript válido
const bytes = files.reduce((n, f) => n + statSync(join(OUT, f)).size, 0);
console.log(`sw.js generado · versión ${version} · ${urls.size} URLs · ${(bytes / 1024).toFixed(0)} KB de precaché`);
