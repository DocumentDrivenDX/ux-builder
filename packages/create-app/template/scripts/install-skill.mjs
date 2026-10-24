/* After npm install: put the SDK's Claude Code skills where Claude Code finds
   them (.claude/skills/), from the installed packages, so they always match
   the versions this app uses: ux-builder-ui from @ux-builder/ui, and the
   guided design loop's ux-builder-design from @ux-builder/design. */

import { cpSync, existsSync, mkdirSync } from "node:fs";

for (const [from, to] of [
  ["node_modules/@ux-builder/ui/skill/ux-builder-ui", ".claude/skills/ux-builder-ui"],
  ["node_modules/@ux-builder/design/skill/ux-builder-design", ".claude/skills/ux-builder-design"],
]) {
  if (existsSync(from)) {
    mkdirSync(".claude/skills", { recursive: true });
    cpSync(from, to, { recursive: true });
  }
}
