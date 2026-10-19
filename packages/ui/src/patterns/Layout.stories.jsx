import { Button } from "../widgets/Button.jsx";
import { Card } from "../widgets/Card.jsx";
import { Cluster, Grid, Page, SplitView, Stack } from "./Layout.jsx";

/* The layout primitives (US-023). Resize the canvas, or the frame in Docs:
   each primitive follows the width it is given, not the window. */
export default {
  title: "Patterns/Layout",
  component: Grid,
  tags: ["autodocs"],
};

const cards = (n) => Array.from({ length: n }, (_, i) => <Card key={i} title={`Matter ${i + 1}`}>Acme v. Doe, filed 2026.</Card>);

export const KitchenSink = {
  render: () => (
    <Page as="main">
      <Stack gap={5}>
        <h1>Matters</h1>
        <Cluster gap={2}>
          <Button>New matter</Button>
          <Button variant="secondary">Import</Button>
          <Button variant="secondary">Export</Button>
          <Button variant="text">Archive</Button>
        </Cluster>
        <Grid gap={4}>{cards(6)}</Grid>
        <SplitView primaryLabel="Matters" secondaryLabel="Matter" primary={<Stack gap={2}>{cards(2)}</Stack>} secondary={<Card title="Acme v. Doe">The selected matter.</Card>} />
      </Stack>
    </Page>
  ),
};

export const GridColumns = { args: { columns: { compact: 1, medium: 2, expanded: 3, large: 4 }, gap: 4, children: cards(8) } };

export const SplitShowsDetailBelowExpanded = {
  render: () => <SplitView show="secondary" primaryLabel="Matters" secondaryLabel="Matter" primary={<Stack gap={2}>{cards(3)}</Stack>} secondary={<Card title="Acme v. Doe">Shown alone below 840px.</Card>} />,
};
