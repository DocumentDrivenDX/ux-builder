import { useState } from "react";
import { Button } from "../widgets/Button.jsx";
import { UsersAndRoles, PermissionsMatrix, AuditLog } from "./Admin.jsx";
import { DrillDown, PrintLayout, ReportBuilder, Subscriptions } from "./Analysis.jsx";
import { ExportDialog, ImportFlow } from "./ImportExport.jsx";
import { ApiKeys, Integrations, NotificationCentre } from "./Notifications.jsx";
import { Attachments } from "./Planning.jsx";
import { ReviewConfirm, TaskList } from "./Workflow.jsx";

/* Workflows, data in and out, analysis and administration (US-035 to US-044). */
export default { title: "Patterns/Workflows and admin", parameters: { layout: "padded" } };

const ROLES = [{ value: "admin", label: "Admin" }, { value: "editor", label: "Editor" }, { value: "viewer", label: "Viewer" }];

export const Sections = { render: () => <TaskList title="Open a matter" sections={[{ id: "c", label: "Client details", href: "#", status: "completed" }, { id: "m", label: "Matter details", href: "#", status: "in-progress" }, { id: "b", label: "Billing", href: "#", status: "not-started" }]} /> };
export const CheckAnswers = { render: () => <ReviewConfirm consequence="Submitting opens the matter and notifies the partner." onSubmit={() => {}} sections={[
  { id: "client", title: "Client", href: "#client", answers: [{ label: "Name", value: "Acme" }] },
  { id: "matter", title: "Matter", href: "#matter", answers: [{ label: "Name", value: "Acme v. Beta" }, { label: "Rate", value: "£450" }] },
]} /> };

export const Import = { render: () => <ImportFlow columns={["Name", "Client", "Rate"]} fields={[{ value: "name", label: "Matter name" }, { value: "client", label: "Client" }, { value: "rate", label: "Rate" }]} onFile={() => {}} onMap={() => {}} /> };
function ExportDemo() { const [open, setOpen] = useState(false); return <><Button variant="secondary" onClick={() => setOpen(true)}>Export</Button><ExportDialog open={open} onClose={() => setOpen(false)} formats={[{ value: "csv", label: "CSV" }, { value: "xlsx", label: "Excel" }]} fields={[{ value: "name", label: "Name" }, { value: "rate", label: "Rate" }]} onExport={() => setOpen(false)} /></>; }
export const Export = { render: () => <ExportDemo /> };
export const Files = { render: () => <Attachments files={[{ id: "f1", name: "claim.pdf", href: "#", type: "PDF", size: 248000, version: "v2" }, { id: "f2", name: "witness-statement.docx", href: "#", type: "Word", size: 61000, version: "v1" }]} onUpload={() => {}} onRemove={() => {}} /> };

function DrillDemo() { const [trail, setTrail] = useState([{ label: "All practices" }, { label: "Corporate" }, { label: "M&A" }]); return <DrillDown trail={trail} onSelect={(i) => setTrail((t) => t.slice(0, i + 1))}><p>Fees for {trail.at(-1).label}.</p></DrillDown>; }
export const DrillingDown = { render: () => <DrillDemo /> };
export const Printable = { render: () => <PrintLayout title="Aged debt" runDate="2026-10-19T09:00:00" locale="en-GB" sections={[{ id: "a", title: "By client", content: <p>Acme £12,400 · Globex £3,100</p> }, { id: "b", title: "By partner", content: <p>R. Lee £9,800 · S. Patel £5,700</p> }]} /> };
export const BuildAReport = { render: () => <ReportBuilder measures={[{ value: "fees", label: "Fees" }, { value: "hours", label: "Hours" }]} groupings={[{ value: "practice", label: "Practice" }, { value: "partner", label: "Partner" }]} preview={() => [{ id: 1, practice: "Corporate", fees: 120, hours: 300 }]} onSave={() => {}} /> };
export const Deliveries = { render: () => <Subscriptions onAdd={() => {}} items={[{ id: "s1", name: "Aged debt", frequency: "Every Monday", recipients: ["finance@example.com"] }, { id: "s2", name: "Fees over budget", threshold: "Over 110% of budget", recipients: ["R. Lee"], paused: true }]} /> };

export const Members = { render: () => <UsersAndRoles roles={ROLES} members={[{ id: 1, name: "R. Lee", email: "r.lee@example.com", role: "admin" }, { id: 2, name: "S. Patel", email: "s.patel@example.com", role: "editor" }]} onInvite={() => {}} onRoleChange={() => {}} /> };
export const Permissions = { render: () => <PermissionsMatrix roles={ROLES} permissions={[{ value: "edit", label: "Edit matters" }, { value: "bill", label: "Send bills" }, { value: "admin", label: "Manage members" }]} has={(r, p) => r === "admin" || (r === "editor" && p === "edit")} /> };
export const History = { render: () => <AuditLog locale="en-GB" people={[{ value: "rl", label: "R. Lee" }]} actions={[{ value: "rate", label: "Changed rate" }]} entries={[{ id: 1, time: "2026-10-18T10:12:00Z", actor: "R. Lee", action: "Changed rate", before: "£400", after: "£450" }, { id: 2, time: "2026-10-17T16:40:00Z", actor: "S. Patel", action: "Invited a member", after: "j.kim@example.com" }]} onFilter={() => {}} /> };
export const Notifications = { render: () => <NotificationCentre notifications={[{ id: 1, title: "R. Lee commented on Acme v. Beta", href: "#", read: false }, { id: 2, title: "Your bill for Globex was approved", href: "#", read: true }]} onMarkRead={() => {}} onMarkAllRead={() => {}} /> };
export const Connections = { render: () => <Integrations items={[{ id: "dms", name: "Document management", description: "Files matters' documents", connected: true }, { id: "cal", name: "Calendar", description: "Adds hearings to your calendar", connected: false }]} onConnect={() => {}} onDisconnect={() => {}} /> };
export const Keys = { render: () => <ApiKeys keys={[{ id: "k1", name: "Billing export", last4: "9f2c", created: "2026-09-01" }]} onCreate={() => {}} onRevoke={() => {}} /> };
