/* After npm install: put the SDK's Claude Code skill where Claude Code finds
   it (.claude/skills/ux-builder-ui), from the installed @ux-builder/ui, so it always
   matches the SDK version this app uses. */

import { cpSync, existsSync, mkdirSync } from "node:fs";

const from = "node_modules/@ux-builder/ui/skill/ux-builder-ui";
if (existsSync(from)) {
  mkdirSync(".claude/skills", { recursive: true });
  cpSync(from, ".claude/skills/ux-builder-ui", { recursive: true });
}
