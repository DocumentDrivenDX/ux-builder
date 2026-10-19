/* Framing an uploaded logo to its drawn bounds (US-019-AC5).

   Logos arrive on generous canvases: drawn at the brand's logo height, the
   artwork would be a fraction of it. The browser measures where the logo
   draws (the bounds of its visible pixels, as fractions of the image) when
   it loads, because only a browser can render an SVG safely; here the
   framed copy is made. An SVG keeps every byte of its artwork and gets a new
   viewBox (and width and height) around the drawing, plus a small margin; a
   PNG's framed copy was cropped by the browser and is checked here. The
   framed file's shape is the brand's logo-aspect.

   A mark (also the favicon) is framed to a square: the drawing centred in
   a square around its longer side, so a tab icon is never squashed. */

const MARGIN = 0.02;      // of the drawing's longer side, around it
const ALREADY = 0.97;     // a drawing this close to the edges is left as it is

const fail = (message) => { throw Object.assign(new Error(message), { status: 400 }); };
const num = (v) => Number.parseFloat(v);
const round = (v) => Math.round(v * 1000) / 1000;

function checkBounds(b, which) {
  const ok = b && ["x", "y", "w", "h"].every((k) => Number.isFinite(b[k])) && b.x >= 0 && b.y >= 0 && b.w > 0 && b.h > 0 && b.x + b.w <= 1.0001 && b.y + b.h <= 1.0001;
  if (!ok) fail(`the ${which}'s drawn bounds are not valid`);
  return b;
}

/* The root <svg> tag's box in user units: its viewBox, else its width and height. */
export function svgBox(text) {
  const tag = /<svg\b[^>]*>/i.exec(text)?.[0];
  if (!tag) return null;
  const vb = /\sviewBox\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1]?.trim().split(/[\s,]+/).map(num);
  if (vb?.length === 4 && vb.every(Number.isFinite) && vb[2] > 0 && vb[3] > 0) return { x: vb[0], y: vb[1], w: vb[2], h: vb[3] };
  const w = num(/\swidth\s*=\s*["']([\d.]+)(px)?["']/i.exec(tag)?.[1]), h = num(/\sheight\s*=\s*["']([\d.]+)(px)?["']/i.exec(tag)?.[1]);
  return w > 0 && h > 0 ? { x: 0, y: 0, w, h } : null;
}

/* The SVG with its root viewBox, width and height set to the drawn bounds
   plus a margin; square: centred in a square instead. */
export function frameSvg(text, bounds, { square = false } = {}) {
  const box = svgBox(text);
  if (!box) return null;
  const b = checkBounds(bounds, "logo");
  const margin = MARGIN * Math.max(b.w * box.w, b.h * box.h);
  let x, y, w, h;
  if (square) {
    const side = Math.max(b.w * box.w, b.h * box.h) + 2 * margin;
    const cx = box.x + (b.x + b.w / 2) * box.w, cy = box.y + (b.y + b.h / 2) * box.h;
    [x, y, w, h] = [cx - side / 2, cy - side / 2, side, side].map(round);
  } else {
    x = Math.max(box.x, box.x + b.x * box.w - margin); y = Math.max(box.y, box.y + b.y * box.h - margin);
    const r = Math.min(box.x + box.w, box.x + (b.x + b.w) * box.w + margin), btm = Math.min(box.y + box.h, box.y + (b.y + b.h) * box.h + margin);
    [w, h] = [r - x, btm - y].map(round);
  }
  const tag = /<svg\b[^>]*>/i.exec(text)[0];
  const attrs = tag.replace(/\s(viewBox|width|height)\s*=\s*["'][^"']*["']/gi, "").replace(/^<svg\b/i, "").replace(/\/?>$/, "");
  const framed = `<svg viewBox="${round(x)} ${round(y)} ${w} ${h}" width="${w}" height="${h}"${attrs}>`;
  return { text: text.replace(tag, framed), aspect: round(w / h) };
}

/* A PNG's width and height, from its header. */
export function pngSize(bytes) {
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length < 24 || !sig.every((v, i) => bytes[i] === v) || bytes.toString("latin1", 12, 16) !== "IHDR") return null;
  return { w: bytes.readUInt32BE(16), h: bytes.readUInt32BE(20) };
}

/* The file to draw for an upload, and its aspect: { bytes, aspect, framed }.
   square: a mark, which is framed whenever it is measured (so it is square). */
export function framed(artwork, frame, which, { square = false } = {}) {
  const { ext, bytes } = artwork;
  const tight = !frame?.bounds || (!square && frame.bounds.w >= ALREADY && frame.bounds.h >= ALREADY);
  if (ext === ".svg") {
    const text = bytes.toString("utf8");
    if (!tight) {
      const f = frameSvg(text, frame.bounds, { square });
      if (f) return { bytes: Buffer.from(f.text, "utf8"), aspect: f.aspect, framed: true };
    }
    const box = svgBox(text);
    return { bytes, aspect: box ? round(box.w / box.h) : null, framed: false };
  }
  if (!tight) {
    checkBounds(frame.bounds, which);
    const crop = Buffer.from(String(frame.base64 ?? ""), "base64");
    const size = pngSize(crop);
    if (!size) fail(`the framed ${which} is not a PNG`);
    if (square && size.w !== size.h) fail(`the framed ${which} is not square`);
    return { bytes: crop, aspect: round(size.w / size.h), framed: true };
  }
  const size = pngSize(bytes);
  return { bytes, aspect: size ? round(size.w / size.h) : null, framed: false };
}
