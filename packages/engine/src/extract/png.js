/* Pixels from a PNG, ported from tools/theme_accent.py (SD-001 D4).

   Non-interlaced 8- or 16-bit truecolour, truecolour+alpha, palette and
   greyscale. Inflation is injected (node:zlib in Node, DecompressionStream in
   the browser), so the core has no dependency. A large image is sampled on a
   regular stride to about 250 000 pixels. */

import { EngineError } from "../oklch.js";

const SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
export const isPng = (b) => SIG.every((v, i) => b[i] === v);
const SAMPLE = 250_000;

function unfilter(raw, width, height, bpp) {
  const stride = width * bpp;
  const out = new Uint8Array(stride * height);
  let pos = 0;
  for (let y = 0; y < height; y++) {
    const type = raw[pos++];
    const row = y * stride, prev = row - stride;
    for (let x = 0; x < stride; x++) {
      const v = raw[pos++];
      const a = x >= bpp ? out[row + x - bpp] : 0;
      const b = y > 0 ? out[prev + x] : 0;
      const c = x >= bpp && y > 0 ? out[prev + x - bpp] : 0;
      let p;
      switch (type) {
        case 0: p = 0; break;
        case 1: p = a; break;
        case 2: p = b; break;
        case 3: p = (a + b) >> 1; break;
        case 4: { const q = a + b - c, pa = Math.abs(q - a), pb = Math.abs(q - b), pc = Math.abs(q - c); p = pa <= pb && pa <= pc ? a : pb <= pc ? b : c; break; }
        default: throw new EngineError(`unsupported PNG filter ${type}`);
      }
      out[row + x] = (v + p) & 0xff;
    }
  }
  return out;
}

/* Yields [r, g, b, a] for sampled pixels. */
export async function pngPixels(bytes, inflate) {
  if (!isPng(bytes)) throw new EngineError("not a PNG");
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let pos = 8, palette = null, trns = null, width = 0, height = 0, depth = 0, ctype = 0, interlace = 0;
  const idat = [];
  while (pos + 8 <= bytes.length) {
    const len = dv.getUint32(pos), kind = String.fromCharCode(...bytes.subarray(pos + 4, pos + 8));
    const body = bytes.subarray(pos + 8, pos + 8 + len);
    pos += 12 + len;
    if (kind === "IHDR") { width = dv.getUint32(pos - 12 - len + 8); height = dv.getUint32(pos - 12 - len + 12); [depth, ctype, , , interlace] = body.subarray(8, 13); }
    else if (kind === "PLTE") palette = body;
    else if (kind === "tRNS") trns = body;
    else if (kind === "IDAT") idat.push(body);
    else if (kind === "IEND") break;
  }
  if (interlace) throw new EngineError("interlaced PNG: re-save without interlacing");
  if (depth !== 8 && depth !== 16) throw new EngineError(`${depth}-bit PNG: re-save as 8-bit`);
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[ctype];
  if (!channels) throw new EngineError(`unsupported PNG colour type ${ctype}`);
  const step = depth / 8, bpp = channels * step;
  const joined = new Uint8Array(idat.reduce((n, b) => n + b.length, 0));
  idat.reduce((o, b) => (joined.set(b, o), o + b.length), 0);
  if (!width || !height || !idat.length) throw new EngineError("PNG is truncated or has no image data");
  let raw;
  try { raw = await inflate(joined); } catch { throw new EngineError("PNG image data is corrupt or truncated"); }
  if (raw.length < (width * bpp + 1) * height) throw new EngineError("PNG image data is shorter than its size says");
  const flat = unfilter(raw, width, height, bpp);

  const stride = Math.max(1, Math.floor(Math.sqrt((width * height) / SAMPLE)));
  const px = [];
  for (let y = 0; y < height; y += stride) {
    for (let x = 0; x < width; x += stride) {
      const i = (y * width + x) * bpp;
      const ch = (c) => flat[i + c * step];
      let r, g, b, a = 255;
      if (ctype === 3) {
        const idx = ch(0);
        if (!palette || idx * 3 + 2 >= palette.length) continue;
        [r, g, b] = palette.subarray(idx * 3, idx * 3 + 3);
        if (trns && idx < trns.length) a = trns[idx];
      } else if (ctype === 0) { r = g = b = ch(0); }
      else if (ctype === 4) { r = g = b = ch(0); a = ch(1); }
      else if (ctype === 2) { r = ch(0); g = ch(1); b = ch(2); }
      else { r = ch(0); g = ch(1); b = ch(2); a = ch(3); }
      px.push([r, g, b, a]);
    }
  }
  return px;
}
