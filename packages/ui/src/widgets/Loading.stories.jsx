import { useEffect, useState } from "react";
import { Button } from "./Button.jsx";
import { Card } from "./Card.jsx";
import { ProgressBar, Skeleton, Spinner } from "./Loading.jsx";

export default { title: "UI Components/Loading", tags: ["autodocs"] };

export const Progress = {
  render: () => (
    <div style={{ display: "grid", gap: 16, maxWidth: 420 }}>
      <ProgressBar label="Uploading engagement letter" value={40} showValue />
      <ProgressBar label="Reviewing entries" value={9} max={12} showValue valueText="9 of 12" />
      <ProgressBar label="Preparing the prebill" />
    </div>
  ),
};

export const Spinners = {
  render: () => (
    <div style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
      <Spinner size="sm" />
      <Spinner />
      <Spinner size="lg" />
      <Spinner size="sm" label="Syncing entries" showLabel />
    </div>
  ),
};

export const Skeletons = {
  render: () => (
    <div aria-busy="true" style={{ display: "flex", gap: 16, maxWidth: 420 }}>
      <Skeleton variant="circle" width={40} />
      <div style={{ flex: 1, display: "grid", gap: 12 }}>
        <Skeleton lines={3} />
        <Skeleton variant="rect" height={80} />
      </div>
    </div>
  ),
};

function Saver() {
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (!busy) return undefined; const t = setTimeout(() => setBusy(false), 2000); return () => clearTimeout(t); }, [busy]);
  return <Button busy={busy} onClick={() => setBusy(true)}>Save entries</Button>;
}
export const BusyButton = {
  parameters: { docs: { description: { story: "Click: the button is busy for two seconds, keeping its width, then ready again." } } },
  render: () => (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <Saver />
      <Button variant="secondary" busy>Exporting</Button>
    </div>
  ),
};

function Loader() {
  const [ready, setReady] = useState(false);
  useEffect(() => { const t = setTimeout(() => setReady(true), 2500); return () => clearTimeout(t); }, []);
  return (
    <div aria-busy={!ready} style={{ maxWidth: 420 }}>
      {ready ? <Card title="Five entries need a look">Two of them are block-billed.</Card> : <Skeleton lines={3} />}
    </div>
  );
}
export const LoadingThenContent = { render: () => <Loader /> };
