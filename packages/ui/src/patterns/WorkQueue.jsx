import { useEffect, useId, useRef, useState } from "react";
import { Button } from "../widgets/Button.jsx";
import { Switch } from "../widgets/Choice.jsx";
import { Dialog } from "../widgets/Dialog.jsx";
import { TextArea } from "../widgets/Field.jsx";
import { MenuButton } from "../widgets/MenuButton.jsx";
import { StatePanel } from "./Regions.jsx";

const SHORTCUTS = [["J", "Next item", "next"], ["K", "Previous item", "previous"], ["A", "Approve", "approve"], ["R", "Reject", "reject"]];

/* Work through items one at a time: the item, its position ("3 of 12"),
   previous and next, approve, reject (a comment is required) and assign.
   Single-key shortcuts (J, K, A, R) can be turned off and never fire while
   typing (WCAG 2.1.4); a help dialog lists them. With no items it says there
   is nothing to review. items: [{ id, title, content }]; index and
   onIndexChange hold the position; people: [{ id, label }] to assign to. */
export function WorkQueue({ items = [], index = 0, onIndexChange, onApprove, onReject, onAssign, people = [], title = "Review queue", emptyTitle = "Nothing to review", emptyText = "New items will appear here.", className }) {
  const [shortcuts, setShortcuts] = useState(true);
  const [rejecting, setRejecting] = useState(false);
  const [comment, setComment] = useState("");
  const [tried, setTried] = useState(false);
  const [help, setHelp] = useState(false);
  const commentRef = useRef(null);
  const base = useId();
  const i = Math.min(Math.max(index, 0), Math.max(items.length - 1, 0));
  const item = items[i];
  const go = (to) => { if (to >= 0 && to < items.length) onIndexChange?.(to); };
  const act = { next: () => go(i + 1), previous: () => go(i - 1), approve: () => item && onApprove?.(item), reject: () => item && setRejecting(true) };

  useEffect(() => {
    if (!shortcuts || !item) return undefined;
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return;
      if (e.target.closest?.("input, textarea, select, [contenteditable], dialog[open]")) return;
      const s = SHORTCUTS.find(([k]) => k.toLowerCase() === e.key.toLowerCase());
      if (s) { e.preventDefault(); act[s[2]](); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  if (!items.length) return <section className={`piq-queue${className ? ` ${className}` : ""}`} aria-label={title}><StatePanel kind="empty" title={emptyTitle}><p>{emptyText}</p></StatePanel></section>;

  const submitReject = (e) => {
    e.preventDefault();
    setTried(true);
    if (!comment.trim()) { commentRef.current?.querySelector("textarea")?.focus(); return; }
    onReject?.(item, comment.trim());
    setRejecting(false); setComment(""); setTried(false);
  };

  return (
    <section className={`piq-queue${className ? ` ${className}` : ""}`} aria-label={title}>
      <div className="piq-queue__bar">
        <p className="piq-queue__position" aria-live="polite">{`${i + 1} of ${items.length}`}</p>
        <div className="piq-queue__nav">
          <Button variant="secondary" size="sm" disabled={i === 0} onClick={act.previous}>Previous</Button>
          <Button variant="secondary" size="sm" disabled={i === items.length - 1} onClick={act.next}>Next</Button>
        </div>
        <Button variant="text" size="sm" aria-haspopup="dialog" onClick={() => setHelp(true)}>Keyboard shortcuts</Button>
      </div>
      <article className="piq-queue__item" aria-labelledby={`${base}-t`}>
        <h2 id={`${base}-t`} className="piq-queue__title">{item.title}</h2>
        {item.content}
      </article>
      <div className="piq-queue__actions">
        <Button onClick={act.approve}>Approve</Button>
        <Button variant="secondary" onClick={act.reject}>Reject</Button>
        {people.length > 0 && <MenuButton label="Assign" items={people.map((p) => ({ label: p.label, onSelect: () => onAssign?.(item, p) }))} />}
      </div>
      <Dialog open={rejecting} onClose={() => { setRejecting(false); setTried(false); }} title={`Reject ${item.title}`}>
        <form className="piq-quick-edit" noValidate onSubmit={submitReject}>
          <div ref={commentRef}>
            <TextArea label="Comment" required aria-required="true" value={comment} onChange={(e) => setComment(e.target.value)}
              hint="Say why, so the author can fix it." error={tried && !comment.trim() ? "A comment is required to reject" : undefined} />
          </div>
          <div className="piq-quick-edit__actions"><Button type="submit">Reject</Button><Button variant="secondary" onClick={() => setRejecting(false)}>Cancel</Button></div>
        </form>
      </Dialog>
      <Dialog open={help} onClose={() => setHelp(false)} title="Keyboard shortcuts" actions={<Button variant="secondary" onClick={() => setHelp(false)}>Close</Button>}>
        <table className="piq-table piq-queue__keys">
          <thead><tr><th scope="col">Key</th><th scope="col">Action</th></tr></thead>
          <tbody>{SHORTCUTS.map(([k, label]) => <tr key={k}><td><kbd>{k}</kbd></td><td>{label}</td></tr>)}</tbody>
        </table>
        <Switch label="Use single-key shortcuts" checked={shortcuts} onChange={(e) => setShortcuts(e.target.checked)} />
      </Dialog>
    </section>
  );
}
