/* After npm install: put the SDK's Claude Code skills where Claude Code finds
   them (.claude/skills/), from the installed packages, so they always match
   the versions this app uses: ux-builder-ui from @ux-builder/ui, and the
   guided design loop's ux-builder-design from @ux-builder/design. */

import { cpSync, existsSync, mkdirSync, readFileSync } from "node:fs";

// Explicit plugin mode is durable across npm installs. Never delete custom local skills.
const config = ".ux-builder/skills.json";
const source = process.env.UX_BUILDER_SKILLS || (existsSync(config) ? JSON.parse(readFileSync(config, "utf8")).source : "project");
if (!["project", "plugin"].includes(source)) throw new Error("UX Builder skill source must be project or plugin");

for (const [from, to] of [
  ["node_modules/@ux-builder/ui/skill/ux-builder-ui", ".claude/skills/ux-builder-ui"],
  ["node_modules/@ux-builder/design/skill/ux-builder-design", ".claude/skills/ux-builder-design"],
]) {
  if (source === "project" && existsSync(from)) {
    mkdirSync(".claude/skills", { recursive: true });
    cpSync(from, to, { recursive: true });
  }
}
