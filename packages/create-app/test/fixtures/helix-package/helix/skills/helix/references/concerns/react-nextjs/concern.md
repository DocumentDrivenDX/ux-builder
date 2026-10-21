# Concern: React + Next.js

## Category
tech-stack

## Areas
web, ui

## Slot
frontend-framework

## Components

- **UI Framework**: React 19 — functional components and hooks only
- **Meta-framework**: Next.js 15 — App Router (not Pages Router)
- **UI primitives / component library**: see `ux-radix` concern (canonical
  owner of the Radix + shadcn/ui prescription) — this concern does NOT
  prescribe a component library directly
- **Styling**: Tailwind CSS 4 — utility-first, no CSS-in-JS
- **Forms**: react-hook-form + @hookform/resolvers with Zod schemas
- **Data tables**: TanStack React Table 8 — headless, sortable, filterable, virtualizable
- **Validation**: Zod — shared schemas between frontend and backend
- **E2E testing**: Playwright

## Constraints

- Use App Router (`app/` directory) — not Pages Router (`pages/`)
- Prefer React Server Components for data-heavy pages; use `"use client"` only where interactivity is required
- No class components — functional components with hooks only
- No `React.FC` type annotation — use plain function signatures with typed props
- Forms must use react-hook-form with uncontrolled components — no `useState` per field
- Validation schemas live in the shared package and are reused on frontend and backend
- UI primitives and component-library choice are governed by the selected library
  concern (`ux-radix` for shadcn/Radix; `packaged-design-system` for an available npm design system); compose the selected component owner when this
  concern is selected for UI work
- Tailwind config extends the design system tokens (colors, spacing, typography)
- E2E tests use Playwright, not Cypress or Selenium
- Server-side configuration is read only through the central env schema owned by `typescript-bun` (no `process.env` reads in route handlers or Server Components; the env module itself may read `process.env`); only `NEXT_PUBLIC_`-prefixed variables reach the browser, and none holds a secret. Client code references `NEXT_PUBLIC_X` as a literal `process.env.NEXT_PUBLIC_X` (Next inlines only literal reads) in a dedicated client env module, with a `noProcessEnv` suppression there

## Drift Signals (anti-patterns to reject in review)

- `pages/` directory for routing → must use `app/` (App Router)
- `class extends React.Component` → must use functional components
- `React.FC` or `React.FunctionComponent` → use plain typed functions
- `useState` for every form field → must use react-hook-form
- `styled-components`, `emotion`, or `css-modules` → use Tailwind utility classes
- Re-prescribing shadcn/ui or Radix primitives here → defer to `ux-radix`
  (canonical owner); this concern only references that prescription
- `cypress` or `selenium` → use Playwright
- `getServerSideProps` or `getStaticProps` → use Server Components or route handlers
- Inline `fetch` in components without error/loading states → use data fetching pattern with Suspense boundaries

## When to use

React + Next.js frontend applications. Compose with `typescript-bun` for the
base TypeScript and Bun runtime concern, and compose with `ux-interaction-patterns` and the selected component owner for UI
primitives and component-library prescription (shadcn/ui + Radix). This
concern adds React-specific framework patterns (App Router, Server Components,
forms, data tables) and E2E testing requirements; it does NOT prescribe a
component library.

## Artifact Impact

Selecting this concern requires these artifacts to change (a selected concern absent from them is drift):
- TD: App Router + Server Components, react-hook-form + Zod, shared validation schemas
- DESIGN_SYSTEM: Tailwind config extends design-system tokens (component-library conventions live with the selected component owner)
- TEST_PLAN: Playwright E2E (not Cypress/Selenium)

## Component ownership and package integration

Framework selection does not select a component library. Apply the neutral
ux-interaction-patterns baseline and the project's chosen component owner.
References above to ux-radix describe the Radix/shadcn choice only; they do not
require that choice. With packaged-design-system, use its documented components and tokens;
record Tailwind defaults as overridden where they prescribe independent tokens
or widget styling. With typescript-bun, run applicable supplied checks alongside the
selected linter, or define project checks when the package provides none. Installed-version package documentation controls integration.
