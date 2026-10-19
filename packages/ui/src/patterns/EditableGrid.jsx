import { useEffect, useId, useRef, useState } from "react";
import { Button } from "../widgets/Button.jsx";
import { TextField } from "../widgets/Field.jsx";
import { Sheet } from "../widgets/Sheet.jsx";
import { Icon } from "../icons/Icon.jsx";
import { sizeAtLeast, useSizeClass } from "./Regions.jsx";

/* Rows edited in place, like a spreadsheet: the WAI-ARIA Grid pattern. The
   grid is one stop in the Tab order; arrow keys, Home and End move between
   cells; Enter or F2 edits a cell, Enter commits and Escape discards; rows are
   added and removed; an error the app reports is tied to its cell; a totals
   row sums the numeric columns. Below the medium size class a row is edited
   in a sheet. columns: [{ key, label, numeric?, editable? }]; rows and
   onChange(rows) hold the data; errors: { [rowKey]: { [column]: message } }. */
export function EditableGrid({ label, columns = [], rows = [], rowKey = "id", onChange, errors = {}, newRow = () => ({}), addLabel = "Add row", removeLabel = (n) => `Remove row ${n}`, editLabel = (n) => `Edit row ${n}`, totalLabel = "Total", saveLabel = "Save", className }) {
  const root = useRef(null), grid = useRef(null);
  const size = useSizeClass(root);
  const narrow = !sizeAtLeast(size, "medium");
  const [pos, setPos] = useState({ r: 0, c: 0 });
  const [editing, setEditing] = useState(null); // { r, c, value }
  const [sheet, setSheet] = useState(null); // { r, values }
  const base = useId();
  const keyOf = (row, i) => row[rowKey] ?? i;
  const width = columns.length + 1; // the last column holds the remove button
  const numeric = columns.filter((c) => c.numeric);
  const sum = (k) => rows.reduce((t, row) => t + (Number(row[k]) || 0), 0);

  const target = (r, c) => {
    const cell = grid.current?.querySelector(`[data-r="${r}"][data-c="${c}"]`);
    return cell?.querySelector("button") ?? cell;
  };
  const focusCell = (r, c) => requestAnimationFrame(() => target(r, c)?.focus());
  useEffect(() => { if (pos.r >= rows.length && rows.length) setPos({ r: rows.length - 1, c: pos.c }); }, [rows.length, pos]);

  const commit = () => {
    const { r, c, value } = editing;
    const col = columns[c];
    onChange?.(rows.map((row, i) => (i === r ? { ...row, [col.key]: col.numeric && value !== "" ? Number(value) : value } : row)));
    setEditing(null);
    focusCell(r, c);
  };
  function onKey(e) {
    if (editing) {
      if (e.key === "Enter") { e.preventDefault(); commit(); }
      else if (e.key === "Escape") { e.preventDefault(); const { r, c } = editing; setEditing(null); focusCell(r, c); }
      return;
    }
    const { r, c } = pos;
    const move = { ArrowRight: [0, 1], ArrowLeft: [0, -1], ArrowDown: [1, 0], ArrowUp: [-1, 0] }[e.key];
    if (move) {
      e.preventDefault();
      const to = { r: Math.min(Math.max(r + move[0], 0), rows.length - 1), c: Math.min(Math.max(c + move[1], 0), width - 1) };
      setPos(to); focusCell(to.r, to.c); return;
    }
    if (e.key === "Home" || e.key === "End") { e.preventDefault(); const to = { r, c: e.key === "Home" ? 0 : width - 1 }; setPos(to); focusCell(to.r, to.c); return; }
    if ((e.key === "Enter" || e.key === "F2") && c < columns.length) {
      e.preventDefault();
      if (narrow) { setSheet({ r, values: { ...rows[r] } }); return; }
      if (columns[c].editable === false) return;
      setEditing({ r, c, value: rows[r]?.[columns[c].key] ?? "" });
    }
  }
  const add = () => { const next = [...rows, newRow()]; onChange?.(next); setPos({ r: next.length - 1, c: 0 }); focusCell(next.length - 1, 0); };
  const remove = (r) => { onChange?.(rows.filter((_, i) => i !== r)); const to = { r: Math.max(0, r - 1), c: 0 }; setPos(to); if (rows.length > 1) focusCell(to.r, 0); };
  const saveSheet = () => { const { r, values } = sheet; onChange?.(rows.map((row, i) => (i === r ? values : row))); setSheet(null); focusCell(r, 0); };

  return (
    <div ref={root} className={`piq-grid-edit${className ? ` ${className}` : ""}`} data-size={size}>
      <div className="piq-table-wrap">
        <table ref={grid} role="grid" aria-label={label} className="piq-table piq-grid-edit__table" onKeyDown={onKey}>
          <thead><tr>{columns.map((c) => <th key={c.key} scope="col" className={c.numeric ? "piq-num" : undefined}>{c.label}</th>)}<th scope="col"><span className="piq-visually-hidden">Actions</span></th></tr></thead>
          <tbody>
            {rows.map((row, r) => (
              <tr key={keyOf(row, r)}>
                {columns.map((col, c) => {
                  const err = errors[keyOf(row, r)]?.[col.key];
                  const errId = `${base}-${r}-${c}-err`;
                  const isEditing = editing?.r === r && editing?.c === c;
                  return (
                    <td key={col.key} role="gridcell" data-r={r} data-c={c} tabIndex={pos.r === r && pos.c === c && !isEditing ? 0 : -1}
                      aria-invalid={err ? "true" : undefined} aria-describedby={err ? errId : undefined} aria-readonly={col.editable === false ? "true" : undefined}
                      className={`${col.numeric ? "piq-num " : ""}piq-grid-edit__cell`} onFocus={() => setPos({ r, c })}
                      onDoubleClick={() => (narrow ? setSheet({ r, values: { ...row } }) : col.editable !== false && setEditing({ r, c, value: row[col.key] ?? "" }))}>
                      {isEditing
                        ? <input autoFocus aria-label={`${col.label}, row ${r + 1}`} className="piq-field__input piq-grid-edit__input" inputMode={col.numeric ? "decimal" : undefined}
                            value={editing.value} onChange={(e) => setEditing({ ...editing, value: e.target.value })} onBlur={() => editing && commit()} />
                        : <span className="piq-grid-edit__value">{row[col.key]}</span>}
                      {err && <span id={errId} className="piq-field__error">{err}</span>}
                    </td>
                  );
                })}
                <td role="gridcell" data-r={r} data-c={columns.length} className="piq-grid-edit__row-actions">
                  {narrow && <Button variant="text" size="sm" tabIndex={-1} aria-label={editLabel(r + 1)} onClick={() => setSheet({ r, values: { ...row } })}><Icon name="edit" /></Button>}
                  <Button variant="text" size="sm" tabIndex={pos.r === r && pos.c === columns.length ? 0 : -1} aria-label={removeLabel(r + 1)} onClick={() => remove(r)} onFocus={() => setPos({ r, c: columns.length })}><Icon name="delete" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
          {numeric.length > 0 && (
            <tfoot>
              <tr className="piq-grid-edit__totals">
                {columns.map((c, i) => <td key={c.key} className={c.numeric ? "piq-num" : undefined}>{c.numeric ? sum(c.key) : i === 0 ? <strong>{totalLabel}</strong> : null}</td>)}
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <Button variant="secondary" onClick={add}><Icon name="add" />{addLabel}</Button>
      <Sheet open={!!sheet} onClose={() => { const r = sheet?.r; setSheet(null); if (r != null) focusCell(r, 0); }} title={sheet ? editLabel(sheet.r + 1) : ""} side="bottom">
        {sheet && (
          <form className="piq-quick-edit" onSubmit={(e) => { e.preventDefault(); saveSheet(); }}>
            {columns.filter((c) => c.editable !== false).map((c) => (
              <TextField key={c.key} label={c.label} inputMode={c.numeric ? "decimal" : undefined} value={sheet.values[c.key] ?? ""}
                onChange={(e) => setSheet({ ...sheet, values: { ...sheet.values, [c.key]: c.numeric && e.target.value !== "" ? Number(e.target.value) : e.target.value } })} />
            ))}
            <div className="piq-quick-edit__actions"><Button type="submit">{saveLabel}</Button></div>
          </form>
        )}
      </Sheet>
    </div>
  );
}
