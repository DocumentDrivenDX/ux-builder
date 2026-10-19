import { useState } from "react";
import { Button } from "../widgets/Button.jsx";
import { Combobox } from "../widgets/Combobox.jsx";
import { TextField } from "../widgets/Field.jsx";
import { Tooltip } from "../widgets/Tooltip.jsx";
import { Icon } from "../icons/Icon.jsx";
import { PeriodComparison, PivotTable } from "./Analysis.jsx";
import { EditableGrid } from "./EditableGrid.jsx";
import { CommandPalette, ContextMenu, HomeScreen } from "./Home.jsx";
import { Board, Calendar } from "./Planning.jsx";
import { StatTile } from "./Reporting.jsx";
import { WorkQueue } from "./WorkQueue.jsx";
import { Wizard } from "./Workflow.jsx";

/* The extended screens (FEAT-006, US-033 to US-044). */
export default { title: "Patterns/Extended screens", parameters: { layout: "padded" } };

const CITIES = ["Amsterdam", "Berlin", "Hong Kong", "London", "Los Angeles", "New York", "Paris", "Tokyo"].map((label, i) => ({ value: `c${i}`, label }));
function ComboDemo() { const [v, setV] = useState(); return <Combobox label="Office" options={CITIES} value={v} onChange={setV} />; }
export const ComboboxAndTooltip = { render: () => <div style={{ display: "grid", gap: "var(--piq-space-4)", maxInlineSize: "var(--piq-size-content-form)" }}><ComboDemo /><Tooltip content="Download the matter's documents"><Button variant="text" aria-label="Download"><Icon name="download" /></Button></Tooltip></div> };

export const NewMatterWizard = { render: () => <Wizard title="New matter" steps={["Client", "Matter", "Billing"].map((t) => ({ id: t, title: t, content: <TextField label={`${t} name`} name={t} /> }))} review={(d) => <p>{`Client ${d.Client ?? ""}, matter ${d.Matter ?? ""}`}</p>} onSaveDraft={() => {}} /> };

function GridDemo() { const [rows, setRows] = useState([{ id: 1, task: "Draft", hours: 2, fee: 900 }, { id: 2, task: "Review", hours: 1, fee: 450 }]); return <EditableGrid label="Time entries" columns={[{ key: "task", label: "Task" }, { key: "hours", label: "Hours", numeric: true }, { key: "fee", label: "Fee", numeric: true }]} rows={rows} onChange={setRows} newRow={() => ({ id: Date.now(), task: "", hours: 0, fee: 0 })} />; }
export const TimeEntries = { render: () => <GridDemo /> };

function QueueDemo() { const [i, setI] = useState(0); return <WorkQueue items={[1, 2, 3].map((n) => ({ id: `i${n}`, title: `Invoice ${n}`, content: <p>Details of invoice {n}.</p> }))} index={i} onIndexChange={setI} people={[{ id: "rl", label: "R. Lee" }]} />; }
export const ApprovalQueue = { render: () => <QueueDemo /> };

function BoardDemo() { const [cards, setCards] = useState([{ id: "a", title: "Draft claim", status: "todo" }, { id: "b", title: "Disclosure", status: "doing" }]); return <Board label="Matter tasks" columns={[{ id: "todo", title: "To do" }, { id: "doing", title: "Doing" }, { id: "done", title: "Done" }]} cards={cards} onMove={(c, s) => setCards((x) => x.map((y) => (y.id === c.id ? { ...y, status: s } : y)))} />; }
export const TaskBoard = { render: () => <BoardDemo /> };
export const HearingsCalendar = { render: () => <Calendar events={[{ id: 1, title: "Hearing", start: "2026-10-14T09:30:00" }, { id: 2, title: "Filing deadline", start: "2026-10-20T17:00:00" }]} date="2026-10-14T00:00:00" /> };
export const Comparison = { render: () => <PeriodComparison label="Billed" current={368} previous={400} comparison="on last quarter" format={(n) => `£${n}k`} /> };
export const Pivot = { render: () => <PivotTable label="Fees by practice" groups={[{ id: "corp", label: "Corporate", rows: [{ id: "ma", label: "M&A" }, { id: "eq", label: "Equity" }] }]} columns={[{ key: "q1", label: "Q1" }, { key: "q2", label: "Q2" }]} value={(r, k) => ({ ma: { q1: 10, q2: 20 }, eq: { q1: 5, q2: 5 } })[r]?.[k] ?? 0} /> };
export const Home = { render: () => <HomeScreen title="Good morning" tiles={[<StatTile key="a" label="Open matters" value="12" />]} assigned={{ title: "Assigned to you", items: [{ id: 1, label: "Review Acme v. Beta", href: "#", meta: "Due today" }] }} recent={{ title: "Recent", items: [] }} /> };
export const SearchEverything = { render: () => <CommandPalette recent={[{ id: "r1", label: "Acme v. Beta" }]} results={[{ label: "Actions", items: [{ id: "a1", label: "New matter" }] }]} onSearch={() => {}} onSelect={() => {}} /> };
export const RightClick = { render: () => <ContextMenu items={[{ label: "Open" }, { label: "Duplicate" }]}><div tabIndex={0} style={{ padding: "var(--piq-space-4)", border: "var(--piq-border-default)" }}>Right-click me, or press Shift+F10</div></ContextMenu> };
