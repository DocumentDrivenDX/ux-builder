/* POST /api/save (US-019, ADR-019): the chosen option and design system
   become a brand file, a theme file, the logo (as uploaded, and framed to
   its drawing), the mark and favicon if given, and a changeset, validated
   by the build's own loader, then a branch and a pull request. Nothing is
   published until the pull request and the release it queues are merged.

   BUILDER_REVIEW=pr (default) commits on theme/<name>, pushes and runs
   gh pr create; BUILDER_REVIEW=files stops after writing. */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";
import { ENGINE_VERSION } from "../../../packages/engine/src/index.js";
import { load } from "../../../packages/tokens/compose.mjs";
import { framed } from "./artwork.mjs";

const NAME = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };

/* The brand a theme is stored under: the theme name without its design
   system suffix (acme-legal-carbon -> acme-legal), as the prototype shows. */
export const brandNameFor = (theme, designSystem) => theme.endsWith(`-${designSystem}`) && theme.length > designSystem.length + 1 ? theme.slice(0, -designSystem.length - 1) : theme;
const titleOf = (name) => name.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");

/* The files a save writes, as { path: content }, without touching disk. */
export function plan({ body, root, designSystems }) {
  const { name, designSystem, option } = body ?? {};
  const def = body?.default ?? "light";
  if (!NAME.test(name ?? "") || name.length > 40) fail(400, "use lowercase letters, digits and hyphens, starting with a letter (at most 40 characters)");
  const taken = load(join(root, "tokens"), join(root, "brand"));
  if (taken.themes.has(name)) fail(409, `there is already a theme called "${name}"; choose another name`);
  const brandName = body.brandName ?? brandNameFor(name, designSystem ?? "");
  if (!NAME.test(brandName)) fail(400, `the brand name "${brandName}" is not valid`);
  if (taken.brands.has(brandName)) fail(409, `there is already a brand called "${brandName}"; choose another theme name`);
  const title = String(body.title ?? "").trim() || titleOf(brandName);
  if (!designSystems.includes(designSystem)) fail(400, `choose one of the shared design systems: ${designSystems.join(", ")}`);
  if (def && !["light", "dark"].includes(def)) fail(400, "the default appearance is light or dark");
  if (!option?.brand?.appearances || !option.brand.generation) fail(400, "choose an option to save");
  if (def && !option.brand.appearances[def]) fail(400, `this option has no ${def} appearance`);

  const artwork = (f, which) => {
    const ext = extname(f?.filename ?? "").toLowerCase();
    if (![".svg", ".png"].includes(ext)) fail(400, `the ${which} must be an SVG or PNG`);
    const bytes = Buffer.from(String(f.base64 ?? ""), "base64");
    if (!bytes.length) fail(400, `the ${which} is missing`);
    return { ext, bytes };
  };
  const logo = artwork(body.logo, "logo");
  const darkLogo = body.darkLogo ? artwork(body.darkLogo, "dark-background logo") : null;
  const sha256 = createHash("sha256").update(logo.bytes).digest("hex");
  // The upload is kept as it came (generation.logo records its hash); what
  // apps draw is a copy framed to the drawing, when the upload had margins.
  const logoPath = `brand/${brandName}/logo${logo.ext}`;
  const light = framed(logo, body.logo.frame, "logo");
  const drawPath = light.framed ? `brand/${brandName}/logo-framed${logo.ext}` : logoPath;
  const dark = darkLogo && framed(darkLogo, body.darkLogo.frame, "dark-background logo");
  const darkPath = darkLogo && `brand/${brandName}/logo-dark${darkLogo.ext}`;
  // The mark, which is also the favicon: framed to a square.
  const markUp = body.mark ? artwork(body.mark, "mark") : null;
  const mark = markUp && framed(markUp, body.mark.frame, "mark", { square: true });
  const markPath = markUp && `brand/${brandName}/mark${markUp.ext}`;

  const appearances = structuredClone(option.brand.appearances);
  for (const [ap, a] of Object.entries(appearances)) {
    const own = ap === "dark" && dark;
    const art = own ? dark : light;
    a.brand["logo-image"] = { $value: `../../${own ? darkPath : drawPath}`, $description: `The logo${own ? " for dark backgrounds" : ""}, as uploaded to the theme builder${art.framed ? ", framed to its drawing" : ""}.` };
    if (art.aspect) a.brand["logo-aspect"] = { $value: String(art.aspect), $description: "The framed logo's width over its height." };
    if (mark) {
      a.brand["mark-image"] = { $value: `../../${markPath}`, $description: "The mark, as uploaded to the theme builder, framed to a square." };
      a.brand.favicon = { $value: `../../${markPath}`, $description: "The favicon: the mark." };
    }
  }
  const brand = {
    $schema: "../schema/brand.schema.json",
    $description: `Generated in the theme builder by @ux-builder/engine ${option.brand.generation.engine ?? ENGINE_VERSION}, strategy ${option.brand.generation.strategy}. Regenerate with: npm run brand -- --regenerate tokens/brands/${brandName}.brand.json`,
    name: brandName,
    title,
    appearances,
    ...(body.fonts && Object.keys(body.fonts).length && { fonts: body.fonts }),
    generation: { ...option.brand.generation, logo: { path: `../../${logoPath}`, sha256 } },
  };
  const theme = {
    $schema: "../schema/theme.schema.json",
    $description: `${title} on the ${designSystem} design system: the ${brandName} brand. Made in the theme builder.`,
    name,
    title: `${title} ${titleOf(designSystem)}`,
    brand: brandName,
    default: def,
    designSystem,
  };
  // A release note, so merging the pull request queues a release with the theme in it.
  const changeset = `---\n"@ux-builder/tokens": minor\n"@ux-builder/ui": patch\n---\n\nAdd the \`${name}\` theme: the \`${brandName}\` brand (made in the theme builder from the client's logo) on the ${designSystem} design system, ${def} by default. Select it with \`data-theme="${name}"\`. \`@ux-builder/ui\`'s catalogue and agent guidance list it.\n`;
  return {
    [logoPath]: logo.bytes,
    ...(light.framed && { [drawPath]: light.bytes }),
    ...(darkLogo && { [darkPath]: dark.bytes }),
    ...(mark && { [markPath]: mark.bytes }),
    [`.changeset/theme-${name}.md`]: changeset,
    [`tokens/brands/${brandName}.brand.json`]: JSON.stringify(brand, null, 2) + "\n",
    [`tokens/themes/${name}.theme.json`]: JSON.stringify(theme, null, 2) + "\n",
  };
}

/* Load a copy of the repository with the files added: the build's own validation. */
function validate(root, files) {
  const d = mkdtempSync(join(tmpdir(), "builder-save-"));
  try {
    cpSync(join(root, "tokens"), join(d, "tokens"), { recursive: true });
    cpSync(join(root, "brand"), join(d, "brand"), { recursive: true });
    for (const [p, c] of Object.entries(files)) { mkdirSync(join(d, p, ".."), { recursive: true }); writeFileSync(join(d, p), c); }
    load(join(d, "tokens"), join(d, "brand"));
  } catch (e) { fail(422, `the theme would not build: ${e.message}`); }
  finally { rmSync(d, { recursive: true, force: true }); }
}

const git = (root, ...args) => execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

/* A new theme changes @ux-builder/ui's generated catalogue and agent guidance
   (they list every theme), and npm run check fails if they are stale, so a
   save regenerates them in the same change. Returns the files it changed. */
export const GENERATED = ["packages/ui/catalogue.json", "packages/ui/AGENTS.md", "packages/ui/skill/ux-builder-ui/SKILL.md"];
function regenerate(root) {
  const script = join(root, "tools/gen-catalogue.mjs");
  if (!existsSync(script)) return [];
  const before = Object.fromEntries(GENERATED.map((p) => [p, existsSync(join(root, p)) ? readFileSync(join(root, p), "utf8") : null]));
  execFileSync(process.execPath, [script], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
  return GENERATED.filter((p) => existsSync(join(root, p)) && readFileSync(join(root, p), "utf8") !== before[p]);
}

export function save({ body, root, designSystems, review = "pr", gh = "gh" }) {
  const files = plan({ body, root, designSystems });
  validate(root, files);
  const name = body.name;
  for (const p of Object.keys(files)) {
    if (existsSync(join(root, p))) fail(409, `${p} already exists`);
  }
  if (review === "files") {
    for (const [p, c] of Object.entries(files)) { mkdirSync(join(root, p, ".."), { recursive: true }); writeFileSync(join(root, p), c); }
    return { files: [...Object.keys(files), ...regenerate(root)], branch: null, pr: null };
  }

  const back = git(root, "rev-parse", "--abbrev-ref", "HEAD");
  const branch = `theme/${name}`;
  const flagged = (body.option.moves ?? []).filter((m) => m.flagged);
  git(root, "switch", "-c", branch);
  try {
    for (const [p, c] of Object.entries(files)) { mkdirSync(join(root, p, ".."), { recursive: true }); writeFileSync(join(root, p), c); }
    const generated = regenerate(root);
    git(root, "add", "--", ...Object.keys(files), ...generated);
    git(root, "commit", "-m", `Add the ${name} theme from the theme builder\n\nThe ${brandNameFor(name, body.designSystem)} brand (strategy ${body.option.brand.generation.strategy}) on the ${body.designSystem} design system.`);
    git(root, "push", "-u", "origin", branch);
    // Review against the branch the theme was made from, so the pull request shows only the theme.
    const onRemote = (() => { try { return git(root, "ls-remote", "--heads", "origin", back) !== ""; } catch { return false; } })();
    const pr = execFileSync(gh, ["pr", "create", "--head", branch, ...(onRemote ? ["--base", back] : []), "--title", `Add the ${name} theme`, "--body",
      `Made in the theme builder (FEAT-003).\n\n- Brand: \`tokens/brands/${brandNameFor(name, body.designSystem)}.brand.json\` (strategy ${body.option.brand.generation.strategy}, engine ${body.option.brand.generation.engine})\n- Theme: \`tokens/themes/${name}.theme.json\` on **${body.designSystem}**${body.default ? `, ${body.default} by default` : ""}\n- Logo: \`brand/${brandNameFor(name, body.designSystem)}/\`\n\n${flagged.length ? `Colours moved far for contrast, worth a look:\n${flagged.map((m) => `- ${m.appearance} ${m.role}: ${m.from} → ${m.to} (ΔL ${m.deltaL})`).join("\n")}\n\n` : ""}Preview: \`npm run gallery\` (the theme is in it), or the gallery artifact from CI. Regenerate: \`npm run brand -- --regenerate tokens/brands/${brandNameFor(name, body.designSystem)}.brand.json\`.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)`],
      { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
    return { files: [...Object.keys(files), ...generated], branch, pr };
  } finally {
    try { git(root, "switch", back); } catch { /* left on the theme branch; the response still reports it */ }
  }
}
