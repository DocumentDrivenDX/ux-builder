// Record a narrated, annotated walkthrough of the Theme Builder prototype (Option A, Guided wizard).
//
//   node record.mjs            -> theme-builder-walkthrough.mp4
//
// 1. Each segment's narration is spoken to a WAV (OpenAI gpt-4o-mini-tts when a key is available, else macOS
//    `say`), so its length is known. Pick the OpenAI voice with TTS_VOICE (default coral).
// 2. Playwright drives index.html at human speed while recording video; each segment's actions run alongside
//    its narration, and the segment's start time is noted.
// 3. ffmpeg places every narration clip at its start time, normalises it to -16 LUFS, and muxes it with the video into an H.264/AAC MP4.
// Annotations (caption bar, step label, a visible cursor, a highlight ring before each click) are drawn in the page.

import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const HERE = process.cwd();
const OUT = join(HERE, "theme-builder-walkthrough.mp4");
const WORK = join(HERE, ".recording");
rmSync(WORK, { recursive: true, force: true });
mkdirSync(WORK, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- the script ----------
const SEGMENTS = [
  { id: "intro", step: "Theme Builder", caption: "Turn a client's logo into a theme any app can use",
    say: "This is Theme Builder, part of the A.I. U.I. S.D.K. In a few minutes, it turns a client's logo into a theme that any app can use." },
  { id: "upload", step: "Step 1 · Upload logo", caption: "Upload the logo. Brand colours are found automatically; black, white and greys are ignored",
    say: "Start with the client's logo. The builder reads its brand colours, and ignores black, white and greys. Here it finds navy, terracotta and gold." },
  { id: "palettes", step: "Step 2 · Pick palettes", caption: "Four palettes, each in light and dark. Every one passes the 4.5 to 1 contrast check",
    say: "It suggests four palettes. Each one is shown in light and dark, and every one passes the accessibility contrast check." },
  { id: "select", step: "Step 2 · Pick palettes", caption: "Pick as many palettes as you want to compare",
    say: "Pick as many as you want to compare. We'll keep Faithful and Muted." },
  { id: "views", step: "Step 2 · Pick palettes", caption: "Preview light only, dark only, or both side by side",
    say: "You can preview just light, just dark, or both side by side." },
  { id: "feedback", step: "Step 2 · Refine with feedback", caption: "Describe a change in plain words. The AI adjusts the generator, never the colours",
    say: "Not quite right? Describe the change in plain words. The A.I. turns it into the generator's settings, never into colours directly, so every new option still passes contrast." },
  { id: "round2", step: "Step 2 · Round 2", caption: "Round 2 is quieter and cooler; your selections carried over",
    say: "Round two is quieter and cooler, and your selections carried over." },
  { id: "systems", step: "Step 3 · Pick design systems", caption: "Material, Fluent, Carbon and Databricks each bring their own shapes, type and icons",
    say: "Next, choose the design systems the app might use. Material, Fluent, Carbon, and Databricks each bring their own shapes, type, and icons." },
  { id: "compare", step: "Step 4 · Compare", caption: "Every palette in every design system, in light and dark. Choose one: that pairing is your theme",
    say: "Now compare every palette in every design system, in light and dark. Choose one combination. That pairing is your theme." },
  { id: "save", step: "Step 5 · Save theme", caption: "Name and save the theme",
    say: "Give the theme a name, and save it." },
  { id: "integrate", step: "Step 6 · Use in your app", caption: "Exact integration steps, filled in for this theme and your framework",
    say: "Finally, the builder shows exactly how to wire the theme into your app. Install the S.D.K., load one theme file, and name the theme on the page. The code is filled in for your framework, and a checklist tracks your progress." },
  { id: "agent", step: "Step 6 · Use in your app", caption: "A ready-made prompt hands the job to your coding agent",
    say: "And if you use a coding agent, there's a ready-made prompt that hands it the whole job. Logo to theme: compared, saved, and ready to integrate." }
];

// ---------- 1. narration ----------
// OpenAI text-to-speech when a key is available (env OPENAI_API_KEY, or the macOS Keychain item
// "openai-api-key"); otherwise macOS `say`. The key is never printed or written to disk.
const VOICE = process.env.TTS_VOICE || "coral";
const DELIVERY = "Warm, confident product-demo narrator. Clear and friendly, a natural conversational pace, " +
  "light emphasis on product names and numbers, a brief pause between sentences. Never rushed, never theatrical.";
function openaiKey() {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
  try { return execFileSync("security", ["find-generic-password", "-s", "openai-api-key", "-w"], { stdio: ["ignore", "pipe", "ignore"] }).toString().trim(); }
  catch { return null; }
}
const KEY = openaiKey();
console.log(KEY ? `narration: OpenAI gpt-4o-mini-tts, voice ${VOICE}` : "narration: no OpenAI key found, using macOS say");
for (const s of SEGMENTS) {
  const raw = join(WORK, `${s.id}.${KEY ? "mp3" : "aiff"}`), wav = join(WORK, `${s.id}.wav`);
  if (KEY) {
    const res = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "gpt-4o-mini-tts", voice: VOICE, input: s.say.replace(/A\.I\./g, "AI").replace(/U\.I\./g, "UI").replace(/S\.D\.K\./g, "SDK"), instructions: DELIVERY, response_format: "mp3" })
    });
    if (!res.ok) throw new Error(`OpenAI speech failed for "${s.id}": ${res.status} ${(await res.text()).slice(0, 200)}`);
    writeFileSync(raw, Buffer.from(await res.arrayBuffer()));
  } else {
    execFileSync("say", ["-v", "Samantha", "-r", "178", "-o", raw, s.say]);
  }
  execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-i", raw, "-ar", "48000", "-ac", "2", wav]);
  s.wav = wav;
  s.ms = Math.round(parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", wav]).toString()) * 1000);
}
console.log("narration:", SEGMENTS.map((s) => `${s.id} ${(s.ms / 1000).toFixed(1)}s`).join(", "));

// ---------- 2. drive and record ----------
const W = 1440, H = 900;
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: W, height: H }, recordVideo: { dir: WORK, size: { width: W, height: H } }, colorScheme: "light" });
const page = await context.newPage();
const t0 = Date.now();
await page.goto("file://" + join(HERE, "index.html"));
await page.waitForLoadState("networkidle");
await page.evaluate(() => document.fonts.ready);

// Overlay: caption bar, step chip, cursor, highlight ring, title card. Lives on <body>, outside the re-rendered #app.
await page.evaluate(() => {
  const css = document.createElement("style");
  css.textContent = `
  #rec-bar{position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:99998;display:flex;align-items:center;gap:14px;max-width:1100px;padding:14px 22px;border-radius:10px;background:rgba(35,30,29,.92);color:#fff;font:600 19px/1.35 Quicksand,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.25);transition:opacity .4s}
  #rec-bar .chip{flex:none;padding:4px 10px;border-radius:999px;background:#f7cfa5;color:#312a29;font-size:13px;letter-spacing:.04em}
  #rec-cursor{position:fixed;left:0;top:0;z-index:99999;width:26px;height:26px;pointer-events:none;transition:left .7s cubic-bezier(.3,.7,.3,1),top .7s cubic-bezier(.3,.7,.3,1);filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))}
  #rec-cursor.press svg{transform:scale(.85)}
  #rec-ring{position:fixed;z-index:99997;pointer-events:none;border:3px solid #f7cfa5;border-radius:8px;box-shadow:0 0 0 6px rgba(247,207,165,.35);opacity:0;transition:opacity .25s,left .25s,top .25s,width .25s,height .25s}
  #rec-title{position:fixed;inset:0;z-index:99996;display:grid;place-items:center;background:#312a29;color:#fff;transition:opacity .8s}
  #rec-title h1{font:300 64px/1 "Zilla Slab",Georgia,serif;margin:0 0 14px}
  #rec-title p{font:500 22px Quicksand,sans-serif;margin:0;color:#f7cfa5;letter-spacing:.02em}`;
  document.head.appendChild(css);
  const bar = document.createElement("div"); bar.id = "rec-bar"; bar.innerHTML = '<span class="chip"></span><span class="txt"></span>'; bar.style.opacity = "0";
  const cur = document.createElement("div"); cur.id = "rec-cursor";
  cur.innerHTML = '<svg viewBox="0 0 24 24" width="26" height="26"><path d="M4 2l15 10-7 1.5 4 7.5-3 1.5-4-7.5L4 20z" fill="#fff" stroke="#312a29" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  cur.style.left = "720px"; cur.style.top = "520px";
  const ring = document.createElement("div"); ring.id = "rec-ring";
  const title = document.createElement("div"); title.id = "rec-title";
  title.innerHTML = '<div style="text-align:center"><h1>Theme Builder</h1><p>Logo to theme in six steps · AI-UI SDK prototype</p></div>';
  document.body.append(bar, cur, ring, title);
});

const caption = (s) => page.evaluate(({ step, text }) => {
  const bar = document.getElementById("rec-bar");
  bar.querySelector(".chip").textContent = step; bar.querySelector(".txt").textContent = text; bar.style.opacity = "1";
  const foot = document.querySelector(".footbar");  // keep clear of the app's own sticky bar (Compare step)
  bar.style.bottom = foot ? `${foot.offsetHeight + 20}px` : "28px";
}, { step: s.step, text: s.caption });
const hideTitle = () => page.evaluate(() => { const t = document.getElementById("rec-title"); t.style.opacity = "0"; setTimeout(() => t.remove(), 900); });

async function point(selector, { ring = true } = {}) {
  const el = page.locator(selector).first();
  await el.scrollIntoViewIfNeeded();
  await sleep(250);
  const box = await el.boundingBox();
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  await page.evaluate(({ x, y, box, ring }) => {
    const c = document.getElementById("rec-cursor"); c.style.left = `${x - 4}px`; c.style.top = `${y - 2}px`;
    const r = document.getElementById("rec-ring");
    if (ring) { Object.assign(r.style, { left: `${box.x - 6}px`, top: `${box.y - 6}px`, width: `${box.width + 12}px`, height: `${box.height + 12}px`, opacity: "1" }); }
  }, { x, y, box, ring });
  await page.mouse.move(x, y, { steps: 25 });
  await sleep(800);
}
const unring = () => page.evaluate(() => { document.getElementById("rec-ring").style.opacity = "0"; });
let current = null;
async function click(selector) {
  await point(selector);
  await page.evaluate(() => document.getElementById("rec-cursor").classList.add("press"));
  await page.locator(selector).first().click();
  await sleep(140);
  await page.evaluate(() => document.getElementById("rec-cursor").classList.remove("press"));
  await unring();
  if (current) await caption(current);
  await sleep(500);
}
async function scrollTo(selector, block = "start") {
  await page.locator(selector).first().evaluate((el, block) => el.scrollIntoView({ behavior: "smooth", block }), block);
  await sleep(1100);
}
const scrollTop = async () => { await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" })); await sleep(900); };

const ACTIONS = {
  intro: async () => { await sleep(2600); await hideTitle(); await sleep(900); await point("#use-sample", { ring: false }); },
  upload: async () => { await click("#use-sample"); await sleep(1600); await point("#to-palettes", { ring: false }); },
  palettes: async () => { await click("#to-palettes"); await sleep(1200); await point("#pal-faithful .pair", { ring: true }); await sleep(900); await unring(); },
  select: async () => { await click("#add-faithful"); await click("#add-muted"); await point("#pal-count"); await sleep(500); await unring(); },
  views: async () => { await click("#view-light"); await sleep(700); await click("#view-dark"); await sleep(700); await click("#view-both"); },
  feedback: async () => {
    await scrollTo("#feedback-form", "center");
    await click("#feedback");
    await page.locator("#feedback").pressSequentially("This is for a law firm: more conservative, less orange.", { delay: 55 });
    await sleep(400);
    await click("#regenerate");
    await sleep(1800);
  },
  round2: async () => { await scrollTop(); await point(".status", { ring: true }); await sleep(1200); await unring(); },
  systems: async () => { await scrollTo("#to-systems", "center"); await click("#to-systems"); await sleep(600); await click("#chk-fluent"); await click("#chk-carbon"); await click("#chk-databricks"); await sleep(400); },
  compare: async () => {
    await scrollTo("#to-compare", "center"); await click("#to-compare"); await sleep(900);
    await point("#cell-faithful-fluent", { ring: true }); await sleep(600); await unring();
    await point("#cell-muted-carbon", { ring: true }); await sleep(500); await unring();
    await point("#cell-faithful-databricks", { ring: true }); await sleep(500); await unring();
    await click("#choose-muted-carbon"); await point("#chosen-label", { ring: true }); await sleep(600); await unring();
  },
  save: async () => {
    await click("#to-save"); await sleep(1000);
    await point("#theme-name"); await sleep(400); await unring();
    await click("#save"); await sleep(1500);
  },
  integrate: async () => {
    await sleep(800);
    await click("#fw-next"); await sleep(600);
    await scrollTo("#task-css", "center"); await sleep(400);
    await scrollTo("#task-attrs", "center");
    await click("#done-registry"); await click("#done-install"); await click("#done-css");
    await point("#progress-label"); await sleep(500); await unring();
  },
  agent: async () => { await scrollTo("#code-agent", "center"); await click('[data-copy="agent"]'); await sleep(1200); }
};

const timeline = [];
for (const s of SEGMENTS) {
  current = s.id === "intro" ? null : s;
  if (s.id !== "intro") await caption(s);
  const start = Date.now() - t0;
  timeline.push({ wav: s.wav, start });
  if (s.id === "intro") setTimeout(() => { current = s; caption(s); }, 3400);
  await Promise.all([ACTIONS[s.id](), sleep(s.ms)]);
  await sleep(450);
}
await sleep(1500);
const videoPath = await page.video().path();
await context.close();
await browser.close();
console.log("timeline:", timeline.map((t) => `${(t.start / 1000).toFixed(1)}s`).join(" "));

// ---------- 3. mix narration and encode ----------
const inputs = ["-i", videoPath];
timeline.forEach((t) => inputs.push("-i", t.wav));
const delays = timeline.map((t, i) => `[${i + 1}:a]adelay=${t.start}|${t.start}[a${i}]`).join(";");
const mix = timeline.map((_, i) => `[a${i}]`).join("") + `amix=inputs=${timeline.length}:normalize=0:dropout_transition=0,loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000[aout]`;
execFileSync("ffmpeg", ["-loglevel", "error", "-y", ...inputs,
  "-filter_complex", `${delays};${mix}`,
  "-map", "0:v", "-map", "[aout]",
  "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", "-r", "30",
  "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", OUT], { stdio: "inherit" });
console.log("wrote", OUT);
