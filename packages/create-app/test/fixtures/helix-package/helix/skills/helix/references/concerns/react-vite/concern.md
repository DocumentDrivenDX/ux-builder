# Concern: React + Vite (single-page app)

## Category
tech-stack

## Areas
ui

## Slot
frontend-framework

## Boundary

This concern owns **a client-rendered React single-page app built with Vite and
TypeScript whose production output is static files a backend serves**: the Vite
project layout, strict TypeScript, React function components, client-side
routing, the dev-server proxy to the backend, the build output handed to the
backend, client environment exposure, the bundle budget, and component-level
testing. It is platform-neutral; any backend that can serve static files and an
`index.html` fallback can host it. It must not duplicate its neighbors:

- **`react-nextjs`** is the other `frontend-framework` filler and the shipped
  default. The slot is exclusive: select this concern through
  `concerns.local.yml` when the product needs no server rendering, and Next.js
  when it does. Server Components, SSR, and route handlers are `react-nextjs`'s.
- **`frontend-architecture`** owns the state, data-fetching, and rendering
  *patterns* (server state vs client state, colocation, async UI states). This
  concern fixes the rendering strategy to client-side rendering and names the
  libraries that express those patterns.
- **`ux-interaction-patterns`** owns neutral behavior; the selected library
  concern (`ux-radix` or `packaged-design-system`) owns its component prescription; **`a11y-wcag-aa`** owns accessibility compliance;
  **`databricks-appkit-ui`** owns the Databricks component layer when selected.
- **`api-style`** owns the wire contract the SPA consumes.
- **The backend and `deploy-target`** own serving the build: the backend serves
  the output directory, answers unknown non-API paths with `index.html`, and
  owns `/api/*`. On Databricks, `databricks-apps` states those hosting
  requirements and builds the SPA through its root `package.json` hook.
- **`typescript-bun`**, when it fills `language-runtime`, owns the toolchain
  (Bun, Biome, `bun:test`); this concern's toolchain defaults (npm or pnpm,
  Vitest) apply only when the backend uses another runtime.
- **`e2e-playwright`** (the `e2e-framework` slot) owns browser e2e against the
  running app; this concern owns component and hook tests.

## Components

- **UI framework**: React 19, function components and hooks only
- **Build tool and dev server**: Vite with `@vitejs/plugin-react`
- **Language**: TypeScript in `strict` mode, type-checked by `tsc --noEmit`
  (Vite strips types without checking them)
- **Routing**: React Router as a client-side library (declarative or data mode),
  never its framework mode
- **Server state**: TanStack Query against the backend's `/api/*` routes (the
  pattern is `frontend-architecture`'s)
- **Styling**: Tailwind CSS 4 through `@tailwindcss/vite`
- **Forms and validation**: react-hook-form with Zod schemas
- **Linting**: ESLint with `eslint-plugin-react-hooks` (Biome when
  `typescript-bun` governs the toolchain)
- **Component testing**: Vitest with Testing Library and jsdom (`bun:test` when
  `typescript-bun` governs the toolchain); MSW for network boundaries
- **E2E testing**: see `e2e-playwright`
- **Layout**: a `frontend/` directory holding `index.html`, `vite.config.ts`,
  `tsconfig.json`, and `src/` (`main.tsx`, `routes/`, `components/`, `hooks/`,
  `lib/`), with a lockfile committed beside its `package.json` (which sits at
  the repo root instead when the host builds from there)

## Constraints

### Client-rendered only
- No SSR, React Server Components, or meta-framework (Next.js, Remix, React
  Router framework mode, Astro). A product that needs server rendering selects
  `react-nextjs` instead.
- `index.html` is the single HTML entry. Routes use browser history
  (`createBrowserRouter`), not hash routing; deep links work because the backend
  returns `index.html` for unknown non-API paths.

### One origin with the backend
- API calls use relative `/api/...` URLs. No hard-coded host, and no CORS
  configuration in production.
- Development runs two processes: the backend on its local port and the Vite dev
  server, whose `server.proxy` forwards `/api` to the backend.
- `build.outDir` is the directory the backend serves (e.g. `../backend/static`),
  with `emptyOutDir: true`. Build output is generated, never committed.

### Client environment exposure
- Only `VITE_`-prefixed variables reach the browser, through `import.meta.env`.
  `envPrefix` is not widened, and no secret is ever placed in a `VITE_` variable;
  runtime configuration the client needs comes from an `/api/*` route.

### TypeScript strict
- `strict: true` and `noUncheckedIndexedAccess: true`; no `any` in props or hook
  return types; `tsc --noEmit` runs as a gate because `vite build` does not
  type-check.
- No class components, and no `React.FC`; props are plain typed function
  parameters.

### Bundle budget
- Routes are code-split with `React.lazy` and dynamic `import()`. The TD records
  an initial-load JavaScript budget (HELIX default 250 KB gzipped, not a Vite or
  platform limit) and CI fails the build when it is exceeded.

### Component tests
- Vitest (or `bun:test` under `typescript-bun`) with Testing Library covers
  components and hooks, querying by role and
  label rather than test IDs or class names. Network calls are mocked at the
  fetch boundary with MSW, never by mocking the query library.

## Drift Signals (anti-patterns to reject in review)

- `next`, `@remix-run/*`, or `@react-router/dev` (React Router framework mode)
  in `package.json` →
  select `react-nextjs` if SSR is required; otherwise remove it
- `process.env.X` in client code → `import.meta.env.VITE_X`
- A secret, token, or key in a `VITE_` variable → keep it on the backend
- `fetch("http://localhost:8000/api/...")` or any absolute API host → relative
  `/api/...` plus the dev-server proxy
- CORS middleware added so the SPA can reach its own backend → serve both from
  one origin
- `HashRouter` → browser history routing with the backend's `index.html` fallback
- A committed `dist/` or `static/` build → build in CI or on the platform
- No `tsc --noEmit` in the gates → add it; `vite build` does not type-check
- `class extends React.Component` or `React.FC` → plain typed function components
- Jest, Enzyme, or snapshot-only component tests → Vitest (or `bun:test` under
  `typescript-bun`) + Testing Library assertions on roles and text
- Cypress or Selenium → `e2e-playwright`
- One eagerly loaded bundle over budget → route-level `React.lazy` splitting
- Re-prescribing shadcn/ui or Radix here → defer to `ux-radix`

## When to use

A React single-page app served as static files by a separate backend (Python,
Go, JVM, or a Node API) or by a static host, where no page needs server
rendering for SEO or first-paint data. **Selection signal:** the backend is not
a Node/Next.js server, or the operator wants a plain SPA; select it by setting
`frontend-framework: react-vite` under `defaults:` in
`docs/helix/01-frame/concerns.local.yml`.
Compose with the backend's `language-runtime` concern, `ux-interaction-patterns`,
and the selected component owner,
`frontend-architecture`, `a11y-wcag-aa`, and `e2e-playwright`; on Databricks,
with `databricks-apps` and optionally `databricks-appkit-ui`.

Do **not** select it for products that need SSR, React Server Components, or
SEO-indexed dynamic pages (use `react-nextjs`), or for content and documentation
sites (use `hugo-hextra`).

## Artifact Impact

Selecting this concern requires these artifacts to change (a selected concern absent from them is drift):
- TD: Vite layout, dev proxy of `/api`, `build.outDir` handed to the backend, `VITE_` env rule, initial-load bundle budget
- IMPLEMENTATION_PLAN: frontend scaffold, build wiring into the backend's static directory, `tsc --noEmit` and bundle-budget gates
- DESIGN_SYSTEM: Tailwind 4 tokens the components reference (component-library conventions live with the selected component owner)
- TEST_PLAN: Vitest (or `bun:test` under `typescript-bun`) + Testing Library component tests; browser e2e per `e2e-playwright`

## Component ownership and package integration

Framework selection does not select a component library. Apply the neutral
ux-interaction-patterns baseline and the project's chosen component owner.
References above to ux-radix describe the Radix/shadcn choice only; they do not
require that choice. With packaged-design-system, use its documented components and tokens;
record Tailwind defaults as overridden where they prescribe independent tokens
or widget styling. With typescript-bun, run applicable supplied checks alongside the
selected linter, or define project checks when the package provides none. Installed-version package documentation controls integration.
