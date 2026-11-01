/* The journey walk (FEAT-018 GDL-87; US-166): each journey walked through a
   served prototype as a person would, by clicking each step's action by its
   label, and checking that the next step's screen is reached (the page's
   data-piq-screen). It needs no manifest and works on a step prototype's
   pages and on the built app alike (VIP List sessions 2 and 3 could not run
   the assessment on a design folder). The prototype's own bar and toolbar
   are never clicked. */

const SKIP = ":not(.proto-bar *):not([data-prototype-toolbar] *)";

/* journeys: [{ id, steps: [{ screen, label?, to?, row? }] }], where label is the
   step's action and to the screen it should reach ("back" and dialogs are
   clicked, not checked); url(screen) the address of a screen's page.
   row: also tap the screen's first list row. Returns [{ journey, walked, steps, reached,
   stopped?: { step, screen, why }, rows?: [{ step, screen, leadsTo, expected }] }]. */
export async function walkJourneys({ journeys, url, viewport = { width: 390, height: 844 }, timeout = 3000 }) {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch();
  const out = [];
  try {
    for (const j of journeys) {
      const page = await browser.newPage({ viewport });
      const steps = j.steps ?? [];
      const at = async (screen) => { try { await page.locator(`[data-piq-screen="${screen}"]`).first().waitFor({ timeout }); return true; } catch { return false; } };
      let stopped = null, reached = 0;
      const rows = [];
      try {
        await page.goto(url(steps[0].screen));
        if (!(await at(steps[0].screen))) stopped = { step: 1, screen: steps[0].screen, why: `${steps[0].screen} did not open` };
        else reached = 1;
        for (let k = 0; k < steps.length - 1 && !stopped; k++) {
          const s = steps[k];
          if (!s.label) { stopped = { step: k + 1, screen: s.screen, why: "the step names no action" }; break; }
          // A list's rows are tried too: where the first one leads, when the step's action goes to a screen
          // (VIP List session 4: My events' rows opened "Post an event" while the journey used a button).
          if (s.row) {
            const row = page.locator(`[data-piq-screen="${s.screen}"] :is(li, tr, [role=row]) a${SKIP}`).first();
            if (await row.count()) {
              await row.click();
              const landed = await page.locator("[data-piq-screen]").first().getAttribute("data-piq-screen", { timeout }).catch(() => null);
              if (landed && landed !== steps[k + 1].screen) rows.push({ step: k + 1, screen: s.screen, leadsTo: landed, expected: steps[k + 1].screen });
              await page.goBack();
              await at(s.screen);
            }
          }
          const target = page.getByRole("button", { name: s.label, exact: true }).or(page.getByRole("link", { name: s.label, exact: true })).and(page.locator(SKIP)).first();
          try { await target.waitFor({ state: "visible", timeout }); } catch { stopped = { step: k + 1, screen: s.screen, why: `no "${s.label}" to click on ${s.screen}` }; break; }
          await target.click();
          const next = steps[k + 1].screen;
          if (s.to === "back" || String(s.to ?? "").startsWith("modal:")) { reached = k + 2; continue; }
          if (!(await at(next))) { stopped = { step: k + 1, screen: s.screen, why: `"${s.label}" did not lead to ${next}` }; break; }
          reached = k + 2;
        }
      } catch (e) {
        stopped ??= { step: reached + 1, screen: steps[reached]?.screen ?? null, why: e.message.split("\n")[0] };
      }
      await page.close();
      out.push({ journey: j.id, walked: !stopped, steps: steps.length, reached, ...(stopped ? { stopped } : {}), ...(rows.length ? { rows } : {}) });
    }
  } finally { await browser.close(); }
  return out;
}
