// Genera public/audio/manifest.json a partir de los archivos que pongas en public/audio/.
// Nombra cada archivo con el id de la frase o palabra: public/audio/u1l1p1.mp3 → clave "u1l1p1".
import { readdirSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { join, parse } from "node:path";

const DIR = "public/audio";
mkdirSync(DIR, { recursive: true });
const files = {};
for (const name of readdirSync(DIR)) {
  if (!/\.(mp3|m4a|aac|wav|ogg|opus)$/i.test(name)) continue;
  files[parse(name).name] = { src: `/audio/${name}`, bytes: statSync(join(DIR, name)).size };
}
writeFileSync(join(DIR, "manifest.json"), JSON.stringify({ version: Date.now(), files }, null, 2) + "\n");
console.log(`manifest.json: ${Object.keys(files).length} archivos de audio`);
