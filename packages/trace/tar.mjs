/* A minimal ustar writer and reader for the export bundle (CONTRACT-007
   Export bundle): regular files only, gzipped with node:zlib. No dependency,
   no network. */

import { gunzipSync, gzipSync } from "node:zlib";

const BLOCK = 512;

function header(name, size, mtime) {
  const h = Buffer.alloc(BLOCK);
  let prefix = "";
  let base = name;
  if (Buffer.byteLength(name) > 100) {
    const cut = name.lastIndexOf("/", 155);
    if (cut <= 0 || Buffer.byteLength(name.slice(cut + 1)) > 100) throw new Error(`tar: path too long: ${name}`);
    prefix = name.slice(0, cut);
    base = name.slice(cut + 1);
  }
  const put = (s, off, len) => h.write(s, off, len, "utf8");
  const oct = (n, len) => n.toString(8).padStart(len - 1, "0") + "\0";
  put(base, 0, 100);
  put(oct(0o644, 8), 100, 8);
  put(oct(0, 8), 108, 8);
  put(oct(0, 8), 116, 8);
  put(oct(size, 12), 124, 12);
  put(oct(Math.floor(mtime / 1000), 12), 136, 12);
  h.fill(" ", 148, 156);
  put("0", 156, 1);
  put("ustar\0", 257, 6);
  put("00", 263, 2);
  put(prefix, 345, 155);
  let sum = 0;
  for (const b of h) sum += b;
  put(sum.toString(8).padStart(6, "0") + "\0 ", 148, 8);
  return h;
}

/* entries: [{ name, data: Buffer|string }] → gzipped tar Buffer. */
export function tarGz(entries, mtime = Date.now()) {
  const parts = [];
  for (const { name, data } of entries) {
    const buf = Buffer.isBuffer(data) ? data : Buffer.from(String(data), "utf8");
    parts.push(header(name, buf.length, mtime), buf);
    const pad = (BLOCK - (buf.length % BLOCK)) % BLOCK;
    if (pad) parts.push(Buffer.alloc(pad));
  }
  parts.push(Buffer.alloc(BLOCK * 2));
  return gzipSync(Buffer.concat(parts));
}

/* A gzipped tar Buffer → Map(name → Buffer). */
export function untarGz(gz) {
  const buf = gunzipSync(gz);
  const out = new Map();
  let off = 0;
  const str = (o, l) => buf.subarray(o, o + l).toString("utf8").replace(/\0.*$/s, "");
  while (off + BLOCK <= buf.length) {
    const h = buf.subarray(off, off + BLOCK);
    if (h.every((b) => b === 0)) break;
    const name = str(off, 100);
    const prefix = str(off + 345, 155);
    const size = parseInt(str(off + 124, 12).trim() || "0", 8);
    const type = str(off + 156, 1);
    off += BLOCK;
    if (type === "0" || type === "") out.set(prefix ? `${prefix}/${name}` : name, Buffer.from(buf.subarray(off, off + size)));
    off += Math.ceil(size / BLOCK) * BLOCK;
  }
  return out;
}
