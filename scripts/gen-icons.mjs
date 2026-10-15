// Rasteriza la mascota «Papito» a PNG sin dependencias. Uso: node scripts/gen-icons.mjs
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const C = {
  bg: hex("#f59e0b"),
  bg2: hex("#fbbf24"),
  body: hex("#e6b566"),
  edge: hex("#b9792a"),
  spot: hex("#c88a3d"),
  white: hex("#ffffff"),
  ink: hex("#2b1a0a"),
  leaf: hex("#4d9a3a"),
  cheek: hex("#f08a6b"),
};

function inEllipse(x, y, cx, cy, rx, ry, rot = 0) {
  const c = Math.cos(rot), s = Math.sin(rot);
  const dx = x - cx, dy = y - cy;
  const u = (dx * c + dy * s) / rx, v = (-dx * s + dy * c) / ry;
  return u * u + v * v;
}

/** Color en coordenadas unitarias (0..1). `bleed`: fondo a sangre; si no, redondeado. */
function sample(u, v, scale, rounded) {
  // fondo
  if (rounded) {
    const r = 0.22, cx = Math.min(Math.max(u, r), 1 - r), cy = Math.min(Math.max(v, r), 1 - r);
    if ((u - cx) ** 2 + (v - cy) ** 2 > r * r) return null; // transparente
  }
  let col = v < 0.5 ? C.bg2 : C.bg;
  const x = (u - 0.5) / scale + 0.5, y = (v - 0.5) / scale + 0.5;
  // hoja
  if (inEllipse(x, y, 0.56, 0.2, 0.09, 0.045, -0.7) <= 1) col = C.leaf;
  // cuerpo
  const b = inEllipse(x, y, 0.5, 0.56, 0.31, 0.34, -0.12);
  if (b <= 1.0) col = b > 0.9 ? C.edge : C.body;
  if (b <= 0.9) {
    for (const [sx, sy, r] of [[0.33, 0.7, 0.03], [0.66, 0.74, 0.025], [0.4, 0.36, 0.022], [0.7, 0.4, 0.02]])
      if ((x - sx) ** 2 + (y - sy) ** 2 < r * r) col = C.spot;
    for (const ex of [0.4, 0.6]) {
      if ((x - ex) ** 2 + (y - 0.5) ** 2 < 0.06 ** 2) col = C.white;
      if ((x - ex - 0.012) ** 2 + (y - 0.505) ** 2 < 0.028 ** 2) col = C.ink;
    }
    for (const cxk of [0.3, 0.7]) if ((x - cxk) ** 2 + (y - 0.62) ** 2 < 0.035 ** 2) col = C.cheek;
    const d = Math.hypot(x - 0.5, y - 0.6);
    if (y > 0.62 && Math.abs(d - 0.09) < 0.014) col = C.ink;
  }
  return col;
}

function render(size, scale, rounded) {
  const SS = 3, px = Buffer.alloc(size * size * 4);
  for (let j = 0; j < size; j++)
    for (let i = 0; i < size; i++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sj = 0; sj < SS; sj++)
        for (let si = 0; si < SS; si++) {
          const c = sample((i + (si + 0.5) / SS) / size, (j + (sj + 0.5) / SS) / size, scale, rounded);
          if (c) { r += c[0]; g += c[1]; b += c[2]; a++; }
        }
      const o = (j * size + i) * 4, n = SS * SS;
      px[o] = a ? r / a : 0; px[o + 1] = a ? g / a : 0; px[o + 2] = a ? b / a : 0; px[o + 3] = Math.round((255 * a) / n);
    }
  return png(size, px);
}

const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
  return Buffer.concat([len, td, c]);
}
function png(size, rgba) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) { raw[y * (size * 4 + 1)] = 0; rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}

mkdirSync("public/icons", { recursive: true });
// any: fondo redondeado transparente en esquinas; maskable y apple: fondo a sangre (iOS aplica su propia máscara)
writeFileSync("public/icons/icon-192.png", render(192, 1, true));
writeFileSync("public/icons/icon-512.png", render(512, 1, true));
writeFileSync("public/icons/maskable-512.png", render(512, 0.72, false));
writeFileSync("public/icons/apple-touch-icon.png", render(180, 0.9, false));
console.log("Iconos generados en public/icons");
