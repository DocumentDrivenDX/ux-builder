---
name: ux-builder-design
description: Guide a designer or developer through designing an app's UX with @ux-builder/design — define the intended experience, understand its users, model their tasks, compare alternative flows, try prototypes, test with real users and learn from production, stopping for the person's decision at each checkpoint and keeping the simplest experience that works. Use when asked to design, redesign or simplify an app, a feature or a flow, to start or resume a design session, or when a requested change adds screens, steps or inputs.
---


# UX Builder: design

1. Resolve this skill's directory, then run `node <skill-directory>/../../scripts/run.mjs doctor design` from the consumer project's root. Read the installed versions, missing packages, warnings and local skill paths. This command reads files only and never downloads packages.
2. If prerequisites are missing, show the setup guidance. Install or adopt packages only within the user's authorized scope; preserve the project's package manager and lockfile. Do not use a global tool or let npx download a replacement.
3. If project-local UX Builder skills exist, use their installed-version guidance instead of loading duplicate workflows. For plugin mode, follow [installation guidance](../../README.md#project-local-skills).
4. Read the installed package's skill at the path reported by doctor. If it has no skill, use [the packaged workflow snapshot](references/workflow.md), identify its tested versions in [compatibility.json](../../compatibility.json), and check APIs against the installed package. Component props, tokens and rules come from the installed catalogue and AGENTS.md.
5. Follow that workflow. Run its ux-builder-design, ux-builder-blueprint, ux-builder-audit and ux-builder-trace commands through `node <skill-directory>/../../scripts/run.mjs design|blueprint|audit|trace <arguments>`, respectively, from the project root. The runner executes only project-resolved package binaries and preserves their exit status.

HELIX owns governing artifacts. UX Builder keeps its documents in docs/ux-builder/ and state in .ux-builder/; changes to docs/helix/ follow the proposal and approval contract in the workflow. Installing this plugin does not select a UI library or authorize SDK adoption. MCP is optional and is not started by this plugin.
