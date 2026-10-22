/* The walkthrough videos' MP4s (FEAT-013 OUT-01, OUT-03, ANN-01, ANN-02;
   ADR-031 decisions 3 and 4).

   Each annotation of the timeline is drawn once, as a transparent picture
   the size of the recording, by the player's own caption markup and
   placement (captionMarkup, place, CAPTION_CSS) in the SDK's theme. ffmpeg
   then lays each picture over the clean recording for the annotation's
   time range and encodes H.264, so the MP4 shows what the player's pop-up
   shows, at the same times.

   ffmpeg is found on the PATH; the SDK does not ship it. Without it, no MP4
   is written and the player still works from the clean recording. */

import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import { CAPTION_CSS, captionMarkup, place, sdkStyles, THEME } from "./video-player.mjs";

/* ffmpeg's command, or null when there is none. */
export function findFfmpeg(command = "ffmpeg") {
  const r = spawnSync(command, ["-version"], { encoding: "utf8" });
  return r.status === 0 ? command : null;
}

/* The picture an annotation adds: its outlines and its caption, placed as
   the player places them at full size. */
export function overlayHtml(a, viewport, styles) {
  return `<!doctype html><html lang="en" data-theme="${THEME}" data-appearance="light"><head><meta charset="utf-8"><style>${styles}
${CAPTION_CSS}
html, body { margin: 0; background: transparent; width: ${viewport.width}px; height: ${viewport.height}px; overflow: hidden; }
#cap { position: absolute; width: 420px; }
#cap .cap { max-width: none; }
</style></head><body>
${a.boxes.map((b) => `<div class="outline outline--${a.kind === "judgment" ? "judgment" : "checked"}" style="left:${b.x - 4}px;top:${b.y - 4}px;width:${b.width + 8}px;height:${b.height + 8}px"></div>`).join("")}
<div id="cap">${captionMarkup(a)}</div>
<script>{
${place.toString()}
const cap = document.getElementById("cap"); const r = cap.getBoundingClientRect();
const at = place(${JSON.stringify(a.boxes)}, ${viewport.width}, ${viewport.height}, r.width, r.height);
cap.style.left = at.left + "px"; cap.style.top = at.top + "px";
document.documentElement.dataset.placed = "yes";
}</script>
</body></html>`;
}

/* Draw each annotation's picture into dir; returns their paths in order. */
async function drawOverlays(annotations, viewport, dir) {
  if (!annotations.length) return [];
  const { css } = sdkStyles();
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport });
    const out = [];
    for (const [i, a] of annotations.entries()) {
      await page.goto("about:blank");
      await page.setContent(overlayHtml(a, viewport, css));
      await page.evaluate(() => document.fonts.ready);
      if (!(await page.evaluate(() => document.documentElement.dataset.placed === "yes"))) throw new Error(`the caption of ${a.finding} could not be placed`);
      const file = join(dir, `a-${String(i).padStart(3, "0")}.png`);
      await page.screenshot({ path: file, omitBackground: true });
      out.push(file);
    }
    return out;
  } finally { await browser.close(); }
}

/* Encode one journey's MP4: the clean recording with its annotations laid
   over it. Returns { file, bytes } or throws with ffmpeg's error. */
export async function renderMp4({ clean, timeline, out, ffmpeg = "ffmpeg", work }) {
  mkdirSync(work, { recursive: true });
  try {
    const pictures = await drawOverlays(timeline.annotations, timeline.viewport, work);
    const inputs = ["-i", clean, ...pictures.flatMap((p) => ["-i", p])];
    // Even dimensions for H.264's 4:2:0; then each picture over its range.
    const even = "scale=trunc(iw/2)*2:trunc(ih/2)*2:flags=bicubic,setsar=1";
    const chain = [`[0:v]${even}[v0]`];
    timeline.annotations.forEach((a, i) => chain.push(`[v${i}][${i + 1}:v]overlay=0:0:enable='between(t,${a.start.toFixed(3)},${a.end.toFixed(3)})'[v${i + 1}]`));
    const last = `[v${timeline.annotations.length}]`;
    const args = ["-v", "error", "-y", ...inputs, "-filter_complex", chain.join(";"), "-map", last, "-an", "-r", "25", "-c:v", "libx264", "-preset", "veryfast", "-crf", "26", "-pix_fmt", "yuv420p", "-movflags", "+faststart", out];
    const r = spawnSync(ffmpeg, args, { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
    if (r.status !== 0) throw new Error(`ffmpeg could not encode ${out}: ${(r.stderr || r.error?.message || "").trim().split("\n").slice(-3).join(" ")}`);
    return { file: out, bytes: statSync(out).size };
  } finally { rmSync(work, { recursive: true, force: true }); }
}
