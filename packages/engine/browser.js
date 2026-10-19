/* Browser adapter: DecompressionStream for PNG inflation. */

import { analyse } from "./src/index.js";

export * from "./src/index.js";

export async function inflate(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function analyseFile(file) {
  return analyse(new Uint8Array(await file.arrayBuffer()), { inflate });
}
