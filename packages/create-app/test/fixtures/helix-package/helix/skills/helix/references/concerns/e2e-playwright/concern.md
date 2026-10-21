# Concern: E2E Visual Testing (Playwright)

## Category
testing

## Areas
ui, site

## Slot
e2e-framework

## Components

- **Test runner**: Playwright (`@playwright/test`)
- **Browser engines**: Chromium (default), optionally Firefox and WebKit
- **Screenshot snapshots**: Visual regression detection via `toHaveScreenshot()`
- **Video recording**: Full test execution videos for human review
- **Trace files**: Playwright traces for debugging failures
- **Test data**: Fake/seed data that exercises every meaningful UI state

## Constraints

- Tests run in real browsers, not jsdom or happy-dom — no simulated DOM
- Every navigable page must have at least one test that loads it and verifies
  key content
- Every user-facing workflow must have at least one test that exercises it
  end-to-end
- Test data must be realistic and comprehensive — seed the application with
  fake data that covers all UI states (empty, populated, error, edge cases)
- Tests must produce visible output:
  - Console logs showing what each test is doing (use `test.step()`)
  - Screenshots on failure (Playwright default)
  - Full-page screenshots for visual regression
  - Video recordings of every test for human review
- Screenshot baselines are committed to the repo and reviewed in PRs
- Tests must be runnable locally and in CI with identical results
- Playwright version pinned in `package.json`

## Test Data Requirements

The application under test must have a data seeding mechanism:

- **Static sites** (Hugo): content files ARE the test data — ensure content
  covers all page types, shortcodes, navigation patterns, and edge cases
  (empty sections, long titles, deep nesting)
- **Web apps**: seed script or fixture that populates the database/API with
  realistic fake data before tests run. The seed must be deterministic
  (same data every run)
- **Never test against an empty state** — an empty app tells you nothing
  about whether the UI works

## Configuration Pattern

```typescript
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,

  // Video and trace for every test
  use: {
    baseURL: 'http://127.0.0.1:<port>',
    headless: true,
    video: 'on',
    trace: 'retain-on-failure',
    screenshot: 'on',
  },

  // Reporter with step-level detail
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
  ],

  // Dev server
  webServer: {
    command: '<start command>',
    port: '<port>',
    reuseExistingServer: true,
    timeout: 15000,
  },
})
```

## Test Structure Pattern

```typescript
import { test, expect } from '@playwright/test'

test.describe('Feature Area', () => {
  test('page loads with expected content', async ({ page }) => {
    await test.step('navigate to page', async () => {
      await page.goto('/path')
    })

    await test.step('verify hero content', async () => {
      await expect(page.getByRole('heading', { name: 'Title' })).toBeVisible()
    })

    await test.step('capture screenshot', async () => {
      await expect(page).toHaveScreenshot('page-name.png', { fullPage: true })
    })
  })

  test('workflow: user completes action', async ({ page }) => {
    await test.step('start at entry point', async () => {
      await page.goto('/')
    })

    await test.step('click through workflow', async () => {
      await page.getByRole('link', { name: 'Get Started' }).click()
      await expect(page).toHaveURL(/getting-started/)
    })

    await test.step('verify end state', async () => {
      await expect(page.getByText('expected content')).toBeVisible()
    })
  })
})
```

Use `test.step()` for every meaningful action — this produces structured
logs that show exactly what each test is doing.

## Video and Artifact Output

Playwright generates:
- `test-results/` — videos, screenshots, traces per test
- `playwright-report/` — HTML report with embedded videos

Both directories should be gitignored. In CI, upload as artifacts.

## Demo reels

Scripted walkthrough videos are owned by **`demo-playwright`** (viewport,
pacing, narrative structure, post-processing). When a project needs a reel,
select `demo-playwright` alongside this concern; do not extend the test suite
here to double as demo capture.

## When to use

Any project with a web UI that users interact with. This includes:
- Documentation sites (Hugo/Hextra microsites)
- Web applications
- Admin dashboards
- Any HTML output that needs visual consistency

## Artifact Impact

Selecting this concern requires these artifacts to change (a selected concern absent from them is drift):
- TEST_PLAN: per-page + per-workflow E2E in real browsers, seeded data across UI states, committed screenshot baselines
