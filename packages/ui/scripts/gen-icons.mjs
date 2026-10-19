#!/usr/bin/env node
/* Extract the shared icons from each design system's icon set (FEAT-004
   SDK-03, US-010) into src/icons/glyphs.generated.js.

     npm run icons --workspace @ux-builder/ui

   The sets are dev dependencies: an app gets only the glyphs below, never
   four icon libraries. Each set's licence is copied to licenses/ and named in
   the generated file. A test regenerates in memory and fails if the
   committed file differs, so it cannot go stale. */

import { copyFileSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const pkgDir = (name) => dirname(require.resolve(`${name}/package.json`));
const setVersion = (set) => JSON.parse(readFileSync(join(pkgDir(SETS[set].package), "package.json"), "utf8")).version;

/* The sets, which design systems use them, and how their glyphs are drawn. */
export const SETS = {
  material: { package: "@material-symbols/svg-400", license: "Apache-2.0", file: (n) => `outlined/${n}.svg`, svg: { fill: "currentColor" } },
  // The npm package ships no LICENSE file; licenses/fluent.LICENSE is the upstream repository's, committed by hand.
  fluent: { package: "@fluentui/svg-icons", license: "MIT", licenseFile: false, file: (n) => `icons/${n}_24_regular.svg`, svg: { fill: "currentColor" } },
  carbon: { package: "@carbon/icons", license: "Apache-2.0", file: (n) => `svg/32/${n}.svg`, svg: { fill: "currentColor" } },
  lucide: { package: "lucide-static", license: "ISC", file: (n) => `icons/${n}.svg`, svg: { fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round" } },
};

/* Shared name -> each set's own glyph name. A set without the glyph is
   left out and falls back to Lucide. */
export const ICONS = {
  add:              { material: "add", fluent: "add", carbon: "add", lucide: "plus" },
  "arrow-left":     { material: "arrow_back", fluent: "arrow_left", carbon: "arrow--left", lucide: "arrow-left" },
  "arrow-right":    { material: "arrow_forward", fluent: "arrow_right", carbon: "arrow--right", lucide: "arrow-right" },
  calendar:         { material: "calendar_today", fluent: "calendar_ltr", carbon: "calendar", lucide: "calendar" },
  check:            { material: "check", fluent: "checkmark", carbon: "checkmark", lucide: "check" },
  "check-circle":   { material: "check_circle", fluent: "checkmark_circle", carbon: "checkmark--outline", lucide: "circle-check" },
  "chevron-down":   { material: "keyboard_arrow_down", fluent: "chevron_down", carbon: "chevron--down", lucide: "chevron-down" },
  "chevron-left":   { material: "chevron_left", fluent: "chevron_left", carbon: "chevron--left", lucide: "chevron-left" },
  "chevron-right":  { material: "chevron_right", fluent: "chevron_right", carbon: "chevron--right", lucide: "chevron-right" },
  "chevron-up":     { material: "keyboard_arrow_up", fluent: "chevron_up", carbon: "chevron--up", lucide: "chevron-up" },
  close:            { material: "close", fluent: "dismiss", carbon: "close", lucide: "x" },
  copy:             { material: "content_copy", fluent: "copy", carbon: "copy", lucide: "copy" },
  delete:           { material: "delete", fluent: "delete", carbon: "trash-can", lucide: "trash-2" },
  download:         { material: "download", fluent: "arrow_download", carbon: "download", lucide: "download" },
  edit:             { material: "edit", fluent: "edit", carbon: "edit", lucide: "pencil" },
  error:            { material: "error", fluent: "error_circle", carbon: "error", lucide: "circle-x" },
  "external-link":  { material: "open_in_new", fluent: "open", carbon: "launch", lucide: "external-link" },
  filter:           { material: "filter_list", fluent: "filter", carbon: "filter", lucide: "funnel" },
  help:             { material: "help", fluent: "question_circle", carbon: "help", lucide: "circle-question-mark" },
  home:             { material: "home", fluent: "home", carbon: "home", lucide: "house" },
  info:             { material: "info", fluent: "info", carbon: "information", lucide: "info" },
  lock:             { material: "lock", fluent: "lock_closed", carbon: "locked", lucide: "lock" },
  menu:             { material: "menu", fluent: "navigation", carbon: "menu", lucide: "menu" },
  more:             { material: "more_horiz", fluent: "more_horizontal", carbon: "overflow-menu--horizontal", lucide: "ellipsis" },
  refresh:          { material: "refresh", fluent: "arrow_clockwise", carbon: "renew", lucide: "refresh-cw" },
  search:           { material: "search", fluent: "search", carbon: "search", lucide: "search" },
  settings:         { material: "settings", fluent: "settings", carbon: "settings", lucide: "settings" },
  "sort-ascending": { material: "arrow_upward", fluent: "arrow_sort_up", carbon: "sort--ascending", lucide: "arrow-up-narrow-wide" },
  "sort-descending":{ material: "arrow_downward", fluent: "arrow_sort_down", carbon: "sort--descending", lucide: "arrow-down-wide-narrow" },
  upload:           { material: "upload", fluent: "arrow_upload", carbon: "upload", lucide: "upload" },
  user:             { material: "person", fluent: "person", carbon: "user", lucide: "user" },
  view:             { material: "visibility", fluent: "eye", carbon: "view", lucide: "eye" },
  warning:          { material: "warning", fluent: "warning", carbon: "warning--alt", lucide: "triangle-alert" },
};

/* viewBox and inner markup of one SVG file, with presentation attributes
   that would fight currentColor removed. */
function glyph(text, where) {
  const svg = /<svg\b([^>]*)>([\s\S]*?)<\/svg>/i.exec(text.replace(/<!--[\s\S]*?-->/g, ""));
  if (!svg) throw new Error(`${where}: no <svg>`);
  const viewBox = /viewBox="([^"]+)"/.exec(svg[1])?.[1];
  if (!viewBox) throw new Error(`${where}: no viewBox`);
  const body = svg[2]
    .replace(/<title>[\s\S]*?<\/title>/g, "")
    .replace(/\s(fill|stroke|style|data-name|id|class)="[^"]*"/g, (m, attr, _i, all) => (attr === "fill" && /fill="none"/.test(m) ? m : ""))
    .replace(/<rect[^>]*fill="none"[^>]*\/>/g, "") // Carbon's transparent bounding box
    .replace(/\s+/g, " ").replace(/> </g, "><").trim();
  if (/<script|\son\w+=|href=/i.test(body)) throw new Error(`${where}: unexpected markup`);
  return { viewBox, body };
}

export function build() {
  const out = {}, versions = {};
  for (const [set, s] of Object.entries(SETS)) {
    const dir = pkgDir(s.package);
    versions[set] = JSON.parse(readFileSync(join(dir, "package.json"), "utf8")).version;
    out[set] = {};
    for (const [name, names] of Object.entries(ICONS)) {
      if (!names[set]) continue;
      const file = join(dir, s.file(names[set]));
      let text;
      try { text = readFileSync(file, "utf8"); } catch { throw new Error(`${set}: no glyph "${names[set]}" for ${name} (${s.file(names[set])})`); }
      out[set][name] = glyph(text, `${set}/${names[set]}`);
    }
  }
  const sets = Object.fromEntries(Object.entries(SETS).map(([k, s]) => [k, { package: s.package, version: versions[k], license: s.license, svg: s.svg }]));
  return `/* Generated by scripts/gen-icons.mjs from the icon sets below. Do not edit:
   change ICONS there and run npm run icons --workspace @ux-builder/ui.

${Object.entries(sets).map(([k, s]) => `   ${k.padEnd(9)} ${s.package}@${s.version}, ${s.license} (licenses/${k}.LICENSE)`).join("\n")} */

export const SETS = ${JSON.stringify(sets, null, 2)};

export const GLYPHS = ${JSON.stringify(out, null, 1)};
`;
}

/* ------------------------------------------------------------- the library

   Every Lucide icon, by its Lucide name, with the matching glyph from each
   other set where there is one (FEAT-004 SDK-03, US-010-AC13). A match is
   found, in order, from: a whole-name override (NAMES); the core map
   above; the name as it is; its words swapped for each set's own (WORDS);
   the two words of a two-word name the other way round (circle-check ->
   check_circle); and, for Carbon, its "--" modifier form (eye-off ->
   view--off). Precision over reach: a set with no match draws Lucide's,
   which is what any theme without a set of its own does anyway. */

const WORDS = {
  material: { x: ["close"], plus: ["add"], minus: ["remove"], trash: ["delete"], pencil: ["edit"], eye: ["visibility"], pin: ["keep"], paperclip: ["attach_file"], play: ["play_arrow"], bell: ["notifications"], heart: ["favorite"], user: ["person"], users: ["group"], house: ["home"], message: ["chat"], cog: ["settings"], funnel: ["filter_alt"], film: ["movie"], music: ["music_note"], camera: ["photo_camera"], phone: ["call"], globe: ["public"], clock: ["schedule"], calendar: ["calendar_today"], copy: ["content_copy"], scissors: ["content_cut"], video: ["videocam"], volume: ["volume_up"], sun: ["light_mode"], moon: ["dark_mode"], unlock: ["lock_open"], printer: ["print"], file: ["draft"], tag: ["sell"], thumbs: ["thumb"], log: ["logout"] },
  fluent: { x: ["dismiss"], plus: ["add"], minus: ["subtract"], trash: ["delete"], pencil: ["edit"], check: ["checkmark"], paperclip: ["attach"], bell: ["alert"], user: ["person"], users: ["people"], house: ["home"], message: ["chat"], cog: ["settings"], funnel: ["filter"], film: ["video_clip"], phone: ["call"], clock: ["clock"], calendar: ["calendar_ltr"], scissors: ["cut"], volume: ["speaker_2"], sun: ["weather_sunny"], moon: ["weather_moon"], download: ["arrow_download"], upload: ["arrow_upload"], refresh: ["arrow_clockwise"], file: ["document"], printer: ["print"], lock: ["lock_closed"], unlock: ["lock_open"] },
  carbon: { x: ["close"], plus: ["add"], minus: ["subtract"], trash: ["trash-can"], pencil: ["edit"], check: ["checkmark"], eye: ["view"], paperclip: ["attachment"], bell: ["notification"], heart: ["favorite"], users: ["user--multiple"], house: ["home"], message: ["chat"], cog: ["settings"], funnel: ["filter"], film: ["video"], globe: ["earth"], clock: ["time"], clipboard: ["paste"], scissors: ["cut"], mic: ["microphone"], volume: ["volume--up"], refresh: ["renew"], file: ["document"], lock: ["locked"], unlock: ["unlocked"], info: ["information"], mail: ["email"] },
};
/* Whole names the word rules cannot reach, checked by hand. */
const NAMES = {
  // Material has its own "pin" (a PIN-code keypad) and "tag" (a hashtag): false friends.
  material: { pin: "keep", "pin-off": "keep_off", tag: "sell", "message-square": "chat", "ellipsis-vertical": "more_vert", "map-pin": "location_on", "shopping-cart": "shopping_cart", "circle-alert": "error", "triangle-alert": "warning", "message-circle": "chat_bubble", "log-in": "login", "log-out": "logout", "eye-off": "visibility_off", "thumbs-up": "thumb_up", "thumbs-down": "thumb_down", "volume-x": "volume_off", "mic-off": "mic_off", "bell-off": "notifications_off" },
  fluent: { "message-square": "chat", "ellipsis-vertical": "more_vertical", "map-pin": "location", "shopping-cart": "cart", "triangle-alert": "warning", "log-in": "arrow_enter", "log-out": "arrow_exit", "eye-off": "eye_off", "thumbs-up": "thumb_like", "thumbs-down": "thumb_dislike", "message-circle": "chat" },
  carbon: { "message-square": "chat", "ellipsis-vertical": "overflow-menu--vertical", "map-pin": "location", "shopping-cart": "shopping--cart", "triangle-alert": "warning--alt", "log-in": "login", "log-out": "logout", "thumbs-up": "thumbs-up", "thumbs-down": "thumbs-down", "message-circle": "chat" },
};

const available = (set) => {
  const dir = join(pkgDir(SETS[set].package), dirname(SETS[set].file("x")));
  const names = readdirSync(dir);
  if (set === "material") return new Set(names.filter((f) => f.endsWith(".svg") && !f.endsWith("-fill.svg")).map((f) => f.slice(0, -4)));
  if (set === "fluent") return new Set(names.filter((f) => f.endsWith("_24_regular.svg")).map((f) => f.slice(0, -"_24_regular.svg".length)));
  return new Set(names.filter((f) => f.endsWith(".svg")).map((f) => f.slice(0, -4)));
};
const combos = (lists, cap = 64) => lists.reduce((acc, l) => acc.flatMap((a) => l.map((w) => [...a, w])).slice(0, cap), [[]]);

/* The candidate names for one Lucide name in one set, best first. */
function candidates(set, name) {
  const words = name.split("-");
  const forms = [words];
  if (words.length > 1 && /^\d+$/.test(words.at(-1))) forms.push(words.slice(0, -1));   // trash-2 -> trash
  const out = [];
  for (const w of forms) {
    const orders = w.length === 2 ? [w, [w[1], w[0]]] : [w];
    for (const o of orders) {
      for (const c of combos(o.map((t) => [t, ...(WORDS[set][t] ?? [])]))) {
        if (set === "carbon") { out.push(c.join("-")); if (c.length > 1) out.push(`${c.slice(0, -1).join("-")}--${c.at(-1)}`); }
        else out.push(c.join("_"));
      }
    }
  }
  return out;
}

/* Lucide name -> { set: that set's glyph name } for every Lucide icon. */
export function libraryMap() {
  const have = Object.fromEntries(Object.keys(SETS).map((k) => [k, available(k)]));
  const core = new Map(Object.values(ICONS).map((n) => [n.lucide, n]));
  const out = {};
  for (const name of [...have.lucide].sort()) {
    const m = { lucide: name };
    for (const set of ["material", "fluent", "carbon"]) {
      const pick = [NAMES[set][name], core.get(name)?.[set], ...candidates(set, name)].find((c) => c && have[set].has(c));
      if (pick) m[set] = pick;
    }
    out[name] = m;
  }
  return out;
}

/* pin -> iconPin; numbers stay apart where they would run together (arrow-down-0-1 -> iconArrowDown0_1, not arrow-down-01's iconArrowDown01). */
export const exportName = (name) => "icon" + name.split("-").map((w, i, all) => (i > 0 && /^\d/.test(w) && /\d$/.test(all[i - 1]) ? "_" : "") + w[0].toUpperCase() + w.slice(1)).join("");

/* src/icons/library.generated.js: one export per icon, so an app's bundle
   carries only the icons it imports. Built by npm run build, not committed. */
export function buildLibrary() {
  const map = libraryMap();
  const dirs = Object.fromEntries(Object.entries(SETS).map(([k, s]) => [k, pkgDir(s.package)]));
  const lines = Object.entries(map).map(([name, m]) => {
    const glyphs = Object.fromEntries(Object.entries(m).map(([set, g]) => [set, glyph(readFileSync(join(dirs[set], SETS[set].file(g)), "utf8"), `${set}/${g}`)]));
    return `export const ${exportName(name)} = /* @__PURE__ */ Object.freeze(${JSON.stringify({ name, glyphs })});`;
  });
  const count = (set) => Object.values(map).filter((m) => m[set]).length;
  return `/* Generated by scripts/gen-icons.mjs (npm run icons -- --library, run by npm run build). Do not edit.
   ${lines.length} icons by Lucide name; matched glyphs: material ${count("material")}, fluent ${count("fluent")}, carbon ${count("carbon")}.
   Glyphs from the icon sets below, under their licences (tools/check-licences.mjs reads these lines):
${Object.entries(SETS).map(([k, s]) => `   ${k.padEnd(9)} ${s.package}@${setVersion(k)}, ${s.license} (licenses/${k}.LICENSE)`).join("\n")} */

export const ICON_LIBRARY_NAMES = ${JSON.stringify(Object.keys(map))};

${lines.join("\n")}
`;
}

if (process.argv[1] === fileURLToPath(import.meta.url) && process.argv.includes("--library")) {
  const text = buildLibrary();
  writeFileSync(join(HERE, "../src/icons/library.generated.js"), text);
  console.log(`src/icons/library.generated.js: ${text.split("\n")[1].trim()} (${Math.round(text.length / 1024)} KB)`);
} else if (process.argv[1] === fileURLToPath(import.meta.url)) {
  writeFileSync(join(HERE, "../src/icons/glyphs.generated.js"), build());
  for (const [set, s] of Object.entries(SETS)) if (s.licenseFile !== false) copyFileSync(join(pkgDir(s.package), "LICENSE"), join(HERE, `../licenses/${set}.LICENSE`));
  console.log(`src/icons/glyphs.generated.js: ${Object.keys(ICONS).length} icons x ${Object.keys(SETS).length} sets; licences in licenses/`);
}
