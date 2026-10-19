import { useId, useRef, useState } from "react";
import { Button } from "../widgets/Button.jsx";
import { Checkbox, RadioGroup } from "../widgets/Choice.jsx";
import { Dialog } from "../widgets/Dialog.jsx";
import { Select } from "../widgets/Field.jsx";
import { ProgressBar } from "../widgets/Loading.jsx";
import { Icon } from "../icons/Icon.jsx";

const STEPS = ["Upload", "Map columns", "Validate", "Preview", "Import"];

/* Bringing records in from a file, in steps: upload (a button, and drop as
   an extra, WCAG 2.5.7), map each file column to a field, validation errors
   by row with a file of the failed rows, a preview of the rows to save, then
   the import and the app's result report. The app reads, checks and saves:
   onFile(file), onMap(mapping), onCommit(); it supplies columns, fields,
   errors ([{ row, message }]), failedRowsHref, preview ({ columns, rows }) and
   result (a node). */
export function ImportFlow({ title = "Import records", onFile, columns = [], fields = [], onMap, errors = [], failedRowsHref, preview, onCommit, result, accept = ".csv,.xlsx", className }) {
  const [step, setStep] = useState(0);
  const [file, setFile] = useState(null);
  const [mapping, setMapping] = useState({});
  const [over, setOver] = useState(false);
  const input = useRef(null);
  const base = useId();
  const take = (f) => { if (!f) return; setFile(f); onFile?.(f); };
  const at = result ? STEPS.length : step;

  let body;
  if (result) body = <div className="piq-import__result" role="status">{result}</div>;
  else if (step === 0) {
    body = (
      <div className={`piq-import__drop${over ? " is-over" : ""}`} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); take(e.dataTransfer?.files?.[0]); }}>
        <Icon name="upload" />
        <input ref={input} id={`${base}-file`} type="file" accept={accept} className="piq-visually-hidden" onChange={(e) => take(e.target.files?.[0])} />
        <Button variant="secondary" onClick={() => input.current?.click()}>Choose a file</Button>
        <p className="piq-import__hint">or drop it here</p>
        {file && <p className="piq-import__file">{file.name}</p>}
      </div>
    );
  } else if (step === 1) {
    body = (
      <div className="piq-import__mapping">
        {columns.map((c) => (
          <Select key={c} label={`File column “${c}”`} placeholder="Choose a field" value={mapping[c] ?? ""} options={[...fields, { value: "__skip", label: "Don't import" }]}
            onChange={(e) => setMapping({ ...mapping, [c]: e.target.value })} />
        ))}
      </div>
    );
  } else if (step === 2) {
    body = errors.length ? (
      <div className="piq-import__errors">
        <p>{`${errors.length} ${errors.length === 1 ? "row needs" : "rows need"} fixing. They will be skipped unless you fix the file and upload it again.`}</p>
        <ul>{errors.map((e, i) => <li key={i}><strong>{`Row ${e.row}`}</strong>{`: ${e.message}`}</li>)}</ul>
        {failedRowsHref && <a className="piq-btn piq-btn--secondary" href={failedRowsHref} download><Icon name="download" />Download the failed rows</a>}
      </div>
    ) : <p>Every row is ready to import.</p>;
  } else if (step === 3 || step === 4) {
    body = preview ? (
      <div className="piq-table-wrap">
        <table className="piq-table"><caption className="piq-visually-hidden">Rows to import</caption>
          <thead><tr>{preview.columns.map((c) => <th key={c.key} scope="col">{c.label}</th>)}</tr></thead>
          <tbody>{preview.rows.map((r, i) => <tr key={i}>{preview.columns.map((c) => <td key={c.key}>{r[c.key]}</td>)}</tr>)}</tbody>
        </table>
      </div>
    ) : null;
  }

  const next = () => { if (step === 1) onMap?.(mapping); setStep(step + 1); };
  return (
    <section className={`piq-import${className ? ` ${className}` : ""}`} aria-labelledby={`${base}-h`}>
      <h2 id={`${base}-h`} className="piq-import__title">{title}</h2>
      <ol className="piq-wizard__steps piq-import__steps" aria-label="Steps">
        {STEPS.map((s, i) => <li key={s} className="piq-wizard__step" aria-current={i === at ? "step" : undefined} data-done={i < at || undefined}>{s}</li>)}
      </ol>
      {body}
      {!result && (
        <div className="piq-wizard__actions">
          {step < 3 && <Button disabled={step === 0 && !file} onClick={next}>Continue</Button>}
          {step === 3 && <Button onClick={() => { setStep(4); onCommit?.(); }}>{`Import ${preview?.rows.length ?? ""} rows`.replace("  ", " ")}</Button>}
          {step > 0 && step < 4 && <Button variant="secondary" onClick={() => setStep(step - 1)}>Back</Button>}
        </div>
      )}
    </section>
  );
}

/* Taking records out: a modal dialog to choose the format and the fields,
   then the export runs; a long one shows its progress outside the dialog, so
   the user can close it and keep working, and announces when the file is
   ready with a link to it. formats and fields: [{ value, label }];
   onExport({ format, fields }); progress (0-100 while running, else null);
   ready: { href, label }. */
export function ExportDialog({ open = false, onClose, title = "Export", formats = [], fields = [], onExport, progress = null, ready, exportLabel = "Export", className }) {
  const [format, setFormat] = useState(formats[0]?.value);
  const [chosen, setChosen] = useState(fields.map((f) => f.value));
  const toggle = (v, on) => setChosen((c) => (on ? [...c, v] : c.filter((x) => x !== v)));
  return (
    <>
      <Dialog open={open} onClose={onClose} title={title} className={className}
        actions={<><Button disabled={!chosen.length} onClick={() => onExport?.({ format, fields: chosen })}>{exportLabel}</Button><Button variant="secondary" onClick={() => onClose?.()}>Close</Button></>}>
        <RadioGroup label="Format" name="export-format" options={formats} value={format} onChange={(v) => setFormat(v?.target ? v.target.value : v)} />
        <fieldset className="piq-export__fields"><legend className="piq-field__label">Fields</legend>
          {fields.map((f) => <Checkbox key={f.value} label={f.label} checked={chosen.includes(f.value)} onChange={(e) => toggle(f.value, e.target.checked)} />)}
        </fieldset>
        {progress != null && <ProgressBar label="Exporting" value={progress} showValue />}
      </Dialog>
      <div className="piq-export__status" role="status">
        {progress != null && !open && <ProgressBar label="Exporting" value={progress} showValue />}
        {ready && <p className="piq-export__ready">Your export is ready. <a href={ready.href} download>{ready.label ?? "Download it"}</a></p>}
      </div>
    </>
  );
}
