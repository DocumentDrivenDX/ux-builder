# Concern: TypeScript + Bun

## Category
tech-stack

## Areas
all

## Slot
language-runtime

## Components

- **Language**: TypeScript (strict mode)
- **Runtime**: Bun 1.x — NOT Node.js
- **Package manager**: Bun (`bun install`, `bun add`) — NOT npm, NOT yarn, NOT pnpm
- **Linter + Formatter**: Biome — NOT ESLint, NOT Prettier
- **Test runner**: `bun:test` — NOT Vitest, NOT Jest
- **Configuration**: `zod` schema parsed over merged layers (committed JSON files + `process.env`, which Bun also exposes as the equivalent `Bun.env`) in one `env.ts` — NOT scattered `process.env`/`Bun.env` reads, NOT `dotenv` (Bun loads `.env` natively)
- **Workspace layout**: Bun workspaces (`workspaces` in root `package.json`)
- **TypeScript config**: strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`

## Constraints

- All code must pass `tsc --noEmit` (or `bun run typecheck`) with strict config
- All code must pass Biome lint + format check (`bun run lint`)
- Scripts use `bun run`, not `npm run`
- Use Bun-native APIs: `Bun.serve()` for HTTP (not `@hono/node-server` or similar Node adapters), `Bun.file()` for file I/O, `Bun.spawn()` for subprocesses
- Do not use `tsx`, `ts-node`, or other TypeScript transpilers — Bun runs `.ts` natively
- Do not add an `engines.node` field — this project targets Bun, not Node.js
- No `package-lock.json` or `yarn.lock` — use `bun.lock`
- No `node dist/index.js` start commands — use `bun src/index.ts`
- Biome config: indent style tabs, line width 100, `noUnusedImports: error`
- All configuration is declared in one central `zod` schema (single module, e.g. `env.ts`) that parses the merged layers (files + env) once at startup and exports a frozen, typed config object; invalid or missing config fails at startup, not at first use
- `process.env` (or `Bun.env`) is read only inside the env module — use `process.env` so the module also runs under Next.js on Node or Edge, where `Bun.env` is undefined; the config object is built at the entrypoint and passed in
- Secrets are never logged or serialized (wrap in a redacting type or omit from log output)
- Config layering and `.env` rules follow `twelve-factor`; here `config/default.json` and `config/<env>.json` are deep-merged under `process.env` and parsed by the one `zod` schema (`.env.<env>`/`.env.local` are not used; Bun loads them natively, so set `--env-file` explicitly or none)

## Drift Signals (anti-patterns to reject in review)

- `npm run` in scripts → must be `bun run`
- `prettier` or `eslint` dependencies → replace with Biome
- `vitest` or `jest` → replace with `bun:test`
- `tsx` or `ts-node` → remove; Bun executes TypeScript natively
- `@hono/node-server` or any `*-node-*` HTTP adapter → use `Bun.serve()`
- `node dist/` start command → use `bun src/`
- `engines.node` constraint → remove
- `process.env.X` / `Bun.env.X` outside the env module → read from the typed config object

## When to use

TypeScript projects using Bun as the runtime and package manager. Applies to
monorepos and single-package projects alike. If a project historically drifted
to Node.js tooling (npm, tsx, prettier, vitest), the concern documents the
target state and the drift signals above identify what needs correction.

## Artifact Impact

Selecting this concern requires these artifacts to change (a selected concern absent from them is drift):
- TD: strict tsconfig, Bun-native APIs, workspace layout, Biome config, central env schema and its config-key contract (owner and source per key)
