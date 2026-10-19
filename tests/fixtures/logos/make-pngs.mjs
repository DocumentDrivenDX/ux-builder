/* Writes the synthetic PNG fixtures. Run once; the PNGs are committed.

     node tests/fixtures/logos/make-pngs.mjs */

import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0); out.write(type, 4, "ascii"); data.copy(out, 8);
  out.writeUInt32BE(crc(Buffer.concat([Buffer.from(type, "ascii"), data])), 8 + data.length);
  return out;
}
function png(w, h, rgba) {
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = y % 2 ? 1 : 0; for (let x = 0; x < w * 4; x++) raw[y * (w * 4 + 1) + 1 + x] = rgba[y * w * 4 + x]; }
  // Filter type 1 (Sub) on odd rows, so the decoder's filters are exercised.
  for (let y = 1; y < h; y += 2) { const r = y * (w * 4 + 1) + 1; for (let x = w * 4 - 1; x >= 4; x--) raw[r + x] = (raw[r + x] - raw[r + x - 4]) & 0xff; }
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}
function draw(w, h, fn) { const px = new Uint8Array(w * h * 4); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) px.set(fn(x + 0.5, y + 0.5), (y * w + x) * 4); return px; }

// A red disc on transparency with anti-aliased edges.
const W = 96, R = 40;
writeFileSync(new URL("antialiased.png", import.meta.url), png(W, W, draw(W, W, (x, y) => {
  const d = Math.hypot(x - W / 2, y - W / 2), cover = Math.max(0, Math.min(1, R + 0.5 - d));
  return [200, 30, 45, Math.round(255 * cover)];
})));
// A teal square on an opaque white background, with a black bar.
writeFileSync(new URL("white-background.png", import.meta.url), png(W, W, draw(W, W, (x, y) =>
  x > 20 && x < 70 && y > 20 && y < 70 ? [0, 128, 128, 255] : y > 80 ? [10, 10, 10, 255] : [255, 255, 255, 255])));
