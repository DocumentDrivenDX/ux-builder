/* What an agent is asked to do in an episode (US-107-AC3, CONTRACT-007):
   one text, so the created app's AGENTS.md and CLAUDE.md
   (@ux-builder/create-app) and the SDK's guidance and skill
   (tools/gen-catalogue.mjs → @ux-builder/ui's AGENTS.md) say the same. */

export const AGENT_GUIDE = `## Recording the build

Every UI or UX change is an **episode**, recorded in \`.ux-builder/trace/\` and committed
with the code (\`@ux-builder/trace\`, CONTRACT-007). ux-builder's tools write what they told
you and every check they ran; you record the rest:

1. **Open an episode** before you change a screen: the MCP tool \`start_episode\` (its goal,
   stories, screens and journeys), or \`npx ux-builder-trace start --goal "<goal>" --story US-<n> --screen <id>\`.
   If one is still open, end it first.
2. **Record a decision** at every pattern choice, every departure from the guidance and every
   workaround for a missing component: the MCP tool \`record_decision\` (\`chose\`, \`considered\`,
   \`why\`, \`relied\`: the rule and story IDs, \`departs\`, \`workaround\`, \`screen\`), or
   \`npx ux-builder-trace decide --chose <what> --why <why> --relied <rule ID>\`. Say why in a
   sentence; never paste code.
3. **Add the trailer** to every commit made in the episode: end its message with the line
   \`UX-Episode: <episode ID>\`.
4. **End the episode** once its commits are made: the MCP tool \`end_episode\`, or
   \`npx ux-builder-trace end\`. It records the commits, each check's attempts and the audit's
   verdicts, and warns about a commit without the trailer, or screens changed with no decision.

Nothing in the trace is sent anywhere; the app's owner shares episodes by choice
(\`npx ux-builder-trace export\`).
`;
