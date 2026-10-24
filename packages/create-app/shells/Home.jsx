import { HomeScreen, Page, StatePanel } from "@ux-builder/ui/patterns";

/* The Home screen (app.blueprint.json, screen "home"): empty until the first
   feature is framed. Replace the empty state with the feature's screens. */
export function Home() {
  return (
    <Page data-piq-screen="home">
      <HomeScreen title="Home">
        <StatePanel kind="empty" title="Nothing here yet">
          <p>Frame the first feature in HELIX: a story with its acceptance criteria (docs/helix/).</p>
          <p>Then plan its screens in the blueprint (app.blueprint.json) and run npm run check:blueprint before building them.</p>
          <p>To design it with your agent, start with /ux-builder-design.</p>
        </StatePanel>
      </HomeScreen>
    </Page>
  );
}
