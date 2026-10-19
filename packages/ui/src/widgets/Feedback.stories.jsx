import { Button } from "./Button.jsx";
import { Card } from "./Card.jsx";
import { Notice } from "./Notice.jsx";
import { StatusPill, STATES } from "./StatusPill.jsx";
import { Toast, ToastProvider, useToast } from "./Toast.jsx";

export default { title: "UI Components/Feedback", tags: ["autodocs"] };

export const Notices = {
  render: () => (
    <div style={{ display: "grid", gap: 12, maxWidth: 520 }}>
      <Notice tone="info" title="Prebill closes Friday">Entries left open will roll to next month.</Notice>
      <Notice tone="success" title="All entries reviewed" />
      <Notice tone="warning" title="Two entries over the cap" />
      <Notice tone="error" title="Rate missing for one timekeeper" role="alert" />
    </div>
  ),
};

export const StatusPills = {
  render: () => <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{Object.keys(STATES).map((s) => <StatusPill key={s} state={s} />)}</div>,
};

export const CardWithActions = {
  render: () => (
    <div style={{ maxWidth: 420 }}>
      <Card title="Five entries need a look" actions={<><Button>Confirm</Button><Button variant="secondary">Expand</Button></>}>
        Two of them are block-billed. Nothing changes until you act on an entry.
      </Card>
    </div>
  ),
};

export const ToastStatic = { name: "Toast", render: () => <div style={{ maxWidth: 420 }}><Toast message="Entry moved to review." actionLabel="Undo" /></div> };

function Mover() {
  const { show } = useToast();
  return <Button onClick={() => show({ message: "Entry moved to review.", actionLabel: "Undo", onAction: () => show({ message: "Move undone." }) })}>Move to review</Button>;
}
export const ToastWithUndo = {
  parameters: { docs: { description: { story: "Click to raise a toast; it waits while hovered or focused, and Undo raises a second." } } },
  render: () => <ToastProvider><Mover /></ToastProvider>,
};
