/* The SDK's Storybook stories as the theme page shows them: which stories
   render each widget and pattern, and each story's Storybook id, so a
   sample on the page links to the same story in Storybook. Pure, so it is
   tested in Node against Storybook's own ids. */

// Storybook's id rules (storybook/internal/csf: sanitize, storyNameFromExport, toId).
export const sanitize = (s) => s.toLowerCase().replace(/[ ’–—―′¿'`~!@#$%^&*()_|+\-=?;:'",.<>{}[\]\\/]/gi, "-").replace(/-+/g, "-").replace(/^-+/, "").replace(/-+$/, "");
export const storyName = (key) => key
  .replace(/([a-z\d])([A-Z])/g, "$1 $2").replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
  .replace(/([a-zA-Z])(\d)/g, "$1 $2").replace(/(\d)([a-zA-Z])/g, "$1 $2")
  .replace(/[_-]+/g, " ").trim().replace(/^\w/, (c) => c.toUpperCase());
export const storyId = (title, key) => `${sanitize(title)}--${sanitize(storyName(key))}`;

const TOP = /^(?:export\s+)?(?:const|function|let)\s+([A-Za-z_$][\w$]*)/;

/* The file's top-level declarations, each with its text up to the next. */
function chunks(source) {
  const out = new Map();
  let name = null, lines = [];
  for (const line of source.split("\n")) {
    const m = line.match(TOP);
    if (m) { if (name) out.set(name, lines.join("\n")); name = m[1]; lines = [line]; } else if (name) lines.push(line);
  }
  if (name) out.set(name, lines.join("\n"));
  return out;
}

/* The components a chunk renders, following the file's own helpers (Demo, say). */
function rendered(name, all, seen = new Set()) {
  if (seen.has(name)) return new Set();
  seen.add(name);
  const found = new Set();
  for (const [, tag] of (all.get(name) ?? "").matchAll(/<([A-Z][\w$]*)/g)) {
    if (all.has(tag)) for (const t of rendered(tag, all, seen)) found.add(t);
    else found.add(tag);
  }
  return found;
}

/* files: [{ path, source, module }], module being the story file's exports.
   Returns { stories: [{ id, title, key, path, meta, story, uses }],
   byComponent: Map(name → stories, the most direct first) }. */
export function indexStories(files) {
  const stories = [];
  for (const { path, source, module } of files) {
    const meta = module.default;
    if (!meta?.title) continue;
    const all = chunks(source);
    const metaName = meta.component?.displayName ?? meta.component?.name;
    // In the file's order, as Storybook lists them: a module's own keys come sorted by name.
    const order = [...source.matchAll(/^export\s+(?:const|function)\s+([A-Za-z_$][\w$]*)/gm)].map((m) => m[1]);
    const keys = [...order.filter((k) => k in module), ...Object.keys(module).filter((k) => !order.includes(k))];
    for (const key of keys) {
      const story = module[key];
      if (key === "default" || key.startsWith("__") || typeof story !== "object" && typeof story !== "function") continue;
      const direct = new Set([...(all.get(key) ?? "").matchAll(/<([A-Z][\w$]*)/g)].map((m) => m[1]).filter((t) => !all.has(t)));
      const uses = rendered(key, all);
      const own = !(story.render ?? meta.render);
      if (metaName && (own || uses.size === 0)) uses.add(metaName);
      stories.push({ id: storyId(meta.title, key), title: meta.title, key, path, meta, story, uses, direct: own && metaName ? new Set([metaName]) : direct });
    }
  }
  const byComponent = new Map();
  for (const s of stories) for (const c of s.uses) (byComponent.get(c) ?? byComponent.set(c, []).get(c)).push(s);
  // The component's own story file first, then stories that render it themselves rather than inside
  // something else, then the smallest: Button's sample is UI Components/Button, not a whole app shell.
  const own = (s, c) => (s.meta.component?.displayName ?? s.meta.component?.name) === c;
  // Within its own file, the file's order: its first story is its usual state, not its error state.
  for (const [c, list] of byComponent) {
    list.sort((a, b) => {
      const [oa, ob] = [own(a, c), own(b, c)];
      if (oa || ob) return Number(ob) - Number(oa);
      return Number(b.direct.has(c)) - Number(a.direct.has(c)) || a.uses.size - b.uses.size;
    });
  }
  return { stories, byComponent };
}

/* A Storybook URL for a story in a theme and appearance (its toolbar global). */
export function storybookUrl(base, id, theme, appearance) {
  const g = theme ? `&globals=theme:${theme}-${appearance}` : "";
  return `${base.replace(/\/$/, "")}/?path=/story/${id}${g}`;
}
