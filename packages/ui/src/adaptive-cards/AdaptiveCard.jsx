import { createContext, useContext, useEffect, useId, useMemo, useRef, useState } from "react";
import { Button } from "../widgets/Button.jsx";
import { Card } from "../widgets/Card.jsx";
import { Checkbox, RadioGroup } from "../widgets/Choice.jsx";
import { Combobox } from "../widgets/Combobox.jsx";
import { DataTable } from "../widgets/DataTable.jsx";
import { DatePicker } from "../widgets/DatePicker.jsx";
import { MenuButton } from "../widgets/MenuButton.jsx";
import { Notice } from "../widgets/Notice.jsx";
import { Select, TextArea, TextField } from "../widgets/Field.jsx";
import { Icon } from "../icons/Icon.jsx";
import { Cluster, Grid, Stack } from "../patterns/Layout.jsx";
import { DescriptionList } from "../patterns/Record.jsx";
import { ConfirmDialog } from "../patterns/Forms.jsx";
import { ApprovalCard } from "../assistant/Parts.jsx";
import { CardText, LeavingLink, plainCardText, safeLink, safeSource } from "./text.jsx";

/* An Adaptive Card drawn with the SDK's own components, in the nearest
   theme (ADR-029). Each element of the open-source schema 1.6 maps to a
   widget or pattern (CONTRACT-004 Adaptive Cards); the card's look comes
   from the theme, never from the card, and nothing in it is inserted as
   HTML. An element outside 1.6 shows its fallback, or a plain notice.
   Action.Submit and Action.Execute call onAction({ type, id, verb, data,
   inputs }); one marked high-impact in its data ("ux-builder": { highImpact,
   consequence }) asks the user to approve first, and a destructive one asks
   to confirm. Once a high-impact action is approved or denied, the card's
   actions are no longer current. */

const lower = (v) => (typeof v === "string" ? v.toLowerCase() : v);
const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);
const SUPPORTED = [1, 6];
const newer = (v) => { const m = /^(\d+)\.(\d+)/.exec(String(v ?? "")); return !!m && (Number(m[1]) > SUPPORTED[0] || (Number(m[1]) === SUPPORTED[0] && Number(m[2]) > SUPPORTED[1])); };
const markerOf = (a) => (isObj(a?.data) && isObj(a.data["ux-builder"]) ? a.data["ux-builder"] : null);
/* The data an action sends, without the ux-builder marker. */
const dataOf = (a) => { if (!isObj(a?.data)) return a?.data ?? {}; const { "ux-builder": _marker, ...rest } = a.data; return rest; };
const INPUT_TYPES = new Set(["Input.Text", "Input.Number", "Input.Date", "Input.Time", "Input.Toggle", "Input.ChoiceSet"]);
const ACTION_TYPES = new Set(["Action.Submit", "Action.Execute", "Action.OpenUrl", "Action.ShowCard", "Action.ToggleVisibility"]);
const MAX_VISIBLE = 4;
const NOT_SHOWN = "This content could not be shown.";

/* Every input in a card's own body and actions, not inside a ShowCard's card. */
function inputsOf(card, all = false) {
  const out = [];
  const walk = (v, key) => {
    if (Array.isArray(v)) return v.forEach((x) => walk(x));
    if (!isObj(v) || key === "data") return;
    if (INPUT_TYPES.has(v.type) && typeof v.id === "string") out.push(v);
    for (const [k, x] of Object.entries(v)) if (k !== "data" && k !== "fallback" && (all || k !== "card")) walk(x, k);
  };
  walk(card?.body); walk(card?.actions);
  return out;
}
function initialValue(def) {
  if (def.type === "Input.Toggle") { const on = def.valueOn ?? "true", off = def.valueOff ?? "false"; return String(def.value ?? off) === String(on) ? String(on) : String(off); }
  return def.value == null ? "" : String(def.value);
}
const labelOf = (def) => plainCardText(def.label ?? def.placeholder ?? def.title ?? def.id ?? "Input");

/* What is wrong with an input's value, or null. */
function problemWith(def, value) {
  const label = labelOf(def);
  const empty = def.type === "Input.Toggle" ? value !== String(def.valueOn ?? "true") : !String(value ?? "").trim();
  const say = (why) => (typeof def.errorMessage === "string" && def.errorMessage.trim() ? def.errorMessage : `${label}: ${why}`);
  if (def.isRequired === true && empty) return say(def.type === "Input.Toggle" ? "this must be checked." : "enter a value.");
  if (empty) return null;
  if (def.type === "Input.Text" && def.regex) {
    try { if (!new RegExp(def.regex).test(value)) return say("enter it in the form asked for."); } catch { /* an invalid pattern is not the user's fault */ }
  }
  if (def.type === "Input.Text" && def.maxLength && value.length > def.maxLength) return say(`use at most ${def.maxLength} characters.`);
  if (def.type === "Input.Number") {
    const n = Number(value);
    if (Number.isNaN(n)) return say("enter a number.");
    if (def.min != null && n < def.min) return say(`enter ${def.min} or more.`);
    if (def.max != null && n > def.max) return say(`enter ${def.max} or less.`);
  }
  if ((def.type === "Input.Date" || def.type === "Input.Time") && ((def.min && value < def.min) || (def.max && value > def.max))) return say(`enter a ${def.type === "Input.Date" ? "date" : "time"}${def.min ? ` from ${def.min}` : ""}${def.max ? ` to ${def.max}` : ""}.`);
  return null;
}

/* The features a host supports, for an element's requires. */
const meetsRequires = (r) => !isObj(r) || Object.entries(r).every(([k, v]) => k === "adaptiveCards" && !newer(v));

const Ctx = createContext(null);
const Scope = createContext([]);

/* --------------------------------------------------------------- text */
const TEXT_ATTRS = (d) => ({
  "data-size": lower(d.size) || undefined,
  "data-weight": lower(d.weight) || undefined,
  "data-color": lower(d.color) || undefined,
  "data-subtle": d.isSubtle === true ? "" : undefined,
  "data-font": lower(d.fontType) || undefined,
});

function TextBlock({ d }) {
  const ctx = useContext(Ctx);
  if (lower(d.style) === "heading") {
    const H = `h${ctx.headingLevel}`;
    return <CardText as={H} text={d.text} className="piq-adaptive-card__heading" {...TEXT_ATTRS(d)} />;
  }
  const lines = Number.isInteger(d.maxLines) && d.maxLines > 0 ? d.maxLines : null;
  return <CardText text={d.text} className="piq-adaptive-card__text" {...TEXT_ATTRS(d)} data-lines={lines ? "" : undefined} style={lines ? { "--_ac-lines": lines } : undefined} />;
}

function RichTextBlock({ d }) {
  return (
    <p className="piq-adaptive-card__text">
      {(Array.isArray(d.inlines) ? d.inlines : []).map((r, i) => {
        if (typeof r === "string") return <span key={i}>{r}</span>;
        if (!isObj(r) || r.type !== "TextRun") return null;
        let node = <span {...TEXT_ATTRS(r)} data-italic={r.italic ? "" : undefined}>{String(r.text ?? "")}</span>;
        if (r.strikethrough) node = <s>{node}</s>;
        if (r.underline) node = <u>{node}</u>;
        if (r.highlight) node = <mark className="piq-adaptive-card__mark">{node}</mark>;
        if (isObj(r.selectAction)) node = <SelectAction action={r.selectAction} inline>{node}</SelectAction>;
        return <span key={i}>{node}</span>;
      })}
    </p>
  );
}

/* ------------------------------------------------------------- images */
function Img({ d, size }) {
  const src = safeSource(d.url, { image: true });
  if (!src) return <p className="piq-adaptive-card__notice">{d.altText ? `${plainCardText(d.altText)} (the image could not be shown)` : NOT_SHOWN}</p>;
  const px = (v) => (/^\d+(\.\d+)?px$/i.test(String(v ?? "")) ? String(v) : undefined);
  const style = { inlineSize: px(d.width), blockSize: px(d.height) };
  const img = <img className="piq-adaptive-card__image" src={src} alt={typeof d.altText === "string" ? d.altText : ""} loading="lazy" data-size={lower(size ?? d.size) || "auto"} data-style={lower(d.style) || undefined} style={style.inlineSize || style.blockSize ? style : undefined} />;
  return isObj(d.selectAction) ? <SelectAction action={d.selectAction} label={d.altText}>{img}</SelectAction> : img;
}

function Media({ d }) {
  const sources = (Array.isArray(d.sources) ? d.sources : []).map((s) => ({ src: safeSource(s?.url), type: s?.mimeType })).filter((s) => s.src);
  if (!sources.length) return <p className="piq-adaptive-card__notice">{NOT_SHOWN}</p>;
  const audio = sources.every((s) => /^audio\//i.test(s.type ?? ""));
  const Tag = audio ? "audio" : "video";
  const captions = (Array.isArray(d.captionSources) ? d.captionSources : []).map((c) => ({ src: safeSource(c?.url), label: c?.label })).filter((c) => c.src);
  return (
    <Tag className="piq-adaptive-card__media" controls preload="none" poster={audio ? undefined : safeSource(d.poster, { image: true }) ?? undefined} aria-label={d.altText ?? (audio ? "Audio" : "Video")}>
      {sources.map((s, i) => <source key={i} src={s.src} type={s.type} />)}
      {captions.map((c, i) => <track key={i} kind="captions" src={c.src} label={c.label} />)}
    </Tag>
  );
}

/* -------------------------------------------------------- containers */
function Items({ items }) {
  return (Array.isArray(items) ? items : []).map((d, i) => <Element key={i} d={d} />);
}

function Container({ d }) {
  return (
    <Stack gap={0} className="piq-adaptive-card__container" data-valign={lower(d.verticalContentAlignment) || undefined}>
      <Items items={d.items} />
      {isObj(d.selectAction) && <SelectAction action={d.selectAction} standalone />}
    </Stack>
  );
}

/* A column's track: auto, stretch, a weight, or pixels (no wider than the set). */
function track(w) {
  const s = lower(w);
  if (s === "auto") return "auto";
  if (s == null || s === "stretch" || s === "") return "minmax(0, 1fr)";
  const px = /^(\d+(?:\.\d+)?)px$/.exec(String(s));
  if (px) return `minmax(0, min(${px[1]}px, 100%))`;
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? `minmax(0, ${n}fr)` : "minmax(0, 1fr)";
}

function ColumnSet({ d }) {
  const ctx = useContext(Ctx);
  const cols = (Array.isArray(d.columns) ? d.columns : []).filter(isObj);
  const shown = cols.filter((c) => ctx.isVisible(c));
  return (
    <>
      <Grid columns={{ compact: 1, medium: Math.min(6, Math.max(1, shown.length)) }} gap={3} className="piq-adaptive-card__columns" style={{ "--_ac-cols": shown.map((c) => track(c.width)).join(" ") || "minmax(0, 1fr)" }}>
        {cols.map((c, i) => <Column key={i} d={c} />)}
      </Grid>
      {isObj(d.selectAction) && <SelectAction action={d.selectAction} standalone />}
    </>
  );
}

function Column({ d }) {
  const ctx = useContext(Ctx);
  if (d.type != null && d.type !== "Column") return isObj(d.fallback) ? <Column d={d.fallback} /> : d.fallback === "drop" ? null : <p className="piq-adaptive-card__notice">{NOT_SHOWN}</p>;
  return (
    <div className="piq-adaptive-card__column" id={ctx.domId(d.id)} hidden={!ctx.isVisible(d) || undefined} data-ac="Column" data-ac-style={lower(d.style) || undefined} data-separator={d.separator ? "" : undefined}>
      <Stack gap={0} data-valign={lower(d.verticalContentAlignment) || undefined}>
        <Items items={d.items} />
        {isObj(d.selectAction) && <SelectAction action={d.selectAction} standalone />}
      </Stack>
    </div>
  );
}

function FactSet({ d }) {
  const facts = (Array.isArray(d.facts) ? d.facts : []).filter(isObj);
  return <DescriptionList className="piq-adaptive-card__facts" items={facts.map((f, i) => ({ key: i, label: plainCardText(f.title ?? ""), value: <CardText as="span" text={f.value ?? ""} /> }))} />;
}

/* A cell's text, for the table's header and its sort order. */
const cellText = (cell) => (Array.isArray(cell?.items) ? cell.items : []).map((x) => (x?.type === "TextBlock" ? plainCardText(x.text) : x?.type === "RichTextBlock" ? (x.inlines ?? []).map((r) => (typeof r === "string" ? r : r?.text ?? "")).join("") : "")).join(" ").trim();

function Table({ d }) {
  const rows = (Array.isArray(d.rows) ? d.rows : []).filter(isObj);
  const header = (d.firstRowAsHeader ?? d.firstRowAsHeaders) !== false && rows.length > 0;
  const head = header ? rows[0] : null, body = header ? rows.slice(1) : rows;
  const n = Math.max(Array.isArray(d.columns) ? d.columns.length : 0, ...rows.map((r) => (Array.isArray(r.cells) ? r.cells.length : 0)), 1);
  const columns = Array.from({ length: n }, (_, i) => ({ key: `c${i}`, label: (head && cellText(head.cells?.[i])) || `Column ${i + 1}`, render: (row) => row[`r${i}`] }));
  const data = body.map((r, j) => ({
    "piq:row": j,
    ...Object.fromEntries(Array.from({ length: n }, (_, i) => [`c${i}`, cellText(r.cells?.[i])])),
    ...Object.fromEntries(Array.from({ length: n }, (_, i) => [`r${i}`, <Stack key={i} gap={0}><Items items={r.cells?.[i]?.items} /></Stack>])),
  }));
  return <div className="piq-adaptive-card__table"><DataTable columns={columns} rows={data} rowKey="piq:row" pageSize={Math.max(1, data.length)} /></div>;
}

/* ------------------------------------------------------------- inputs */
function InputEl({ d }) {
  const ctx = useContext(Ctx);
  const id = ctx.domId(d.id, "input");
  const value = ctx.values[d.id] ?? "";
  const error = ctx.errors[d.id];
  const set = (v) => ctx.setValue(d.id, v);
  const label = `${labelOf(d)}${d.isRequired === true ? " (required)" : ""}`;
  const disabled = ctx.locked || undefined;
  const common = { id, label, error, disabled, required: d.isRequired === true || undefined };
  const choices = (Array.isArray(d.choices) ? d.choices : []).filter(isObj).map((c) => ({ value: String(c.value ?? ""), label: plainCardText(c.title ?? c.value ?? "") }));
  const errorLine = (eid) => error && <span id={eid} className="piq-field__error">{error}</span>;
  switch (d.type) {
    case "Input.Text": {
      const TYPES = { tel: "tel", url: "url", email: "email", password: "password" };
      const field = d.isMultiline === true
        ? <TextArea {...common} rows={3} value={value} placeholder={d.placeholder} maxLength={d.maxLength || undefined} onChange={(e) => set(e.target.value)} />
        : <TextField {...common} type={TYPES[lower(d.style)] ?? "text"} value={value} placeholder={d.placeholder} maxLength={d.maxLength || undefined} onChange={(e) => set(e.target.value)} />;
      return isObj(d.inlineAction) ? <div className="piq-adaptive-card__inline">{field}<ActionControl a={d.inlineAction} size="sm" /></div> : field;
    }
    case "Input.Number": return <TextField {...common} type="number" inputMode="decimal" value={value} min={d.min} max={d.max} placeholder={d.placeholder} onChange={(e) => set(e.target.value)} />;
    case "Input.Time": return <TextField {...common} type="time" value={value} min={d.min} max={d.max} onChange={(e) => set(e.target.value)} />;
    case "Input.Date": return ctx.locked
      ? <TextField {...common} type="date" value={value} readOnly />
      : <DatePicker id={id} label={label} value={value} min={d.min} max={d.max} error={error} onChange={set} />;
    case "Input.Toggle": {
      const on = String(d.valueOn ?? "true"), off = String(d.valueOff ?? "false");
      const eid = `${id}-error`;
      return (
        <div className="piq-field piq-adaptive-card__toggle" role={d.label ? "group" : undefined} aria-labelledby={d.label ? `${id}-label` : undefined}>
          {d.label && <span id={`${id}-label`} className="piq-field__label">{label}</span>}
          <Checkbox id={id} label={plainCardText(d.title ?? d.label ?? d.id)} checked={value === on} disabled={disabled} required={common.required} aria-invalid={error ? "true" : undefined} aria-describedby={error ? eid : undefined} onChange={(e) => set(e.target.checked ? on : off)} />
          {errorLine(eid)}
        </div>
      );
    }
    case "Input.ChoiceSet": {
      const eid = `${id}-error`;
      if (d.isMultiSelect === true) {
        const chosen = new Set(String(value).split(",").filter(Boolean));
        const flip = (v, yes) => set(choices.map((c) => c.value).filter((x) => (x === v ? yes : chosen.has(x))).join(","));
        return (
          <fieldset id={id} className="piq-radios piq-adaptive-card__choices" disabled={disabled} aria-describedby={error ? eid : undefined}>
            <legend className="piq-field__label">{label}</legend>
            {choices.map((c) => <Checkbox key={c.value} label={c.label} checked={chosen.has(c.value)} onChange={(e) => flip(c.value, e.target.checked)} />)}
            {errorLine(eid)}
          </fieldset>
        );
      }
      const style = lower(d.style) || "compact";
      if (style === "expanded") return <div id={id} className="piq-adaptive-card__choices"><RadioGroup label={label} name={id} options={choices} value={value} onChange={set} disabled={disabled} />{errorLine(eid)}</div>;
      if (style === "filtered" && !ctx.locked) return <Combobox id={id} label={label} options={choices} value={value} onChange={set} placeholder={d.placeholder} error={error} />;
      return <Select {...common} options={choices} placeholder={d.placeholder ?? "Choose…"} value={value} onChange={(e) => set(e.target.value)} />;
    }
    default: return null;
  }
}

/* ------------------------------------------------------------ actions */
const titleOf = (a) => plainCardText(a?.title ?? "") || (a?.type === "Action.OpenUrl" ? "Open link" : "Action");

/* An action of schema 1.6, or its fallback; null when dropped. */
function resolveAction(a) {
  for (let x = a; x; x = x.fallback) {
    if (!isObj(x)) return x === "drop" ? null : { unsupported: true };
    if (ACTION_TYPES.has(x.type) && meetsRequires(x.requires)) return x;
  }
  return { unsupported: true };
}

/* One action as its control: a button, or for Action.OpenUrl a link that leaves the app. */
function ActionControl({ a, primary = false, size, showCard }) {
  const ctx = useContext(Ctx);
  const scope = useContext(Scope);
  const action = resolveAction(a);
  if (!action) return null;
  if (action.unsupported) return <span className="piq-adaptive-card__notice">This action could not be shown.</span>;
  const title = titleOf(action);
  const icon = safeSource(action.iconUrl, { image: true });
  const content = <>{icon && <img className="piq-adaptive-card__icon" src={icon} alt="" />}{title}</>;
  if (action.type === "Action.OpenUrl") {
    const href = safeLink(action.url);
    return href
      ? <LeavingLink className={`piq-btn piq-btn--secondary${size === "sm" ? " piq-btn--sm" : ""} piq-adaptive-card__link`} href={href} title={action.tooltip}>{content}</LeavingLink>
      : <span className="piq-adaptive-card__notice">{title}: this link cannot be opened.</span>;
  }
  const style = lower(action.style);
  const disabled = action.isEnabled === false;
  const common = { size, title: action.tooltip, disabled: disabled || undefined, "data-ac-action": action.type, "data-style": style === "destructive" ? "destructive" : undefined };
  if (ctx.locked) {
    return <Button variant="secondary" {...common} aria-disabled="true" data-stale="" onClick={() => ctx.refuse()}>{content}</Button>;
  }
  if (action.type === "Action.ShowCard") {
    return <Button variant="secondary" {...common} aria-expanded={showCard?.open ?? false} aria-controls={showCard?.id} onClick={() => showCard?.toggle()}>{content}<Icon name={showCard?.open ? "chevron-up" : "chevron-down"} /></Button>;
  }
  if (action.type === "Action.ToggleVisibility") {
    const ids = (Array.isArray(action.targetElements) ? action.targetElements : []).map((t) => (typeof t === "string" ? t : t?.elementId)).filter(Boolean);
    return <Button variant="secondary" {...common} aria-controls={ids.map((x) => ctx.domId(x)).join(" ") || undefined} aria-expanded={ids.length ? ids.every((x) => ctx.isVisible({ id: x, isVisible: ctx.declared[x] })) : undefined} onClick={() => ctx.toggle(action.targetElements)}>{content}</Button>;
  }
  const high = markerOf(action)?.highImpact === true;
  return <Button variant={primary ? "primary" : "secondary"} {...common} data-high-impact={high ? "" : undefined} onClick={() => ctx.act(action, scope)}>{content}</Button>;
}

/* selectAction on an element: a link or button around it, or (standalone) a button after it. */
function SelectAction({ action: a, children, label, inline = false, standalone = false }) {
  const ctx = useContext(Ctx);
  const scope = useContext(Scope);
  const action = resolveAction(a);
  if (!action || action.unsupported || action.type === "Action.ShowCard") return children ?? null;
  if (standalone) return <div className="piq-adaptive-card__select"><ActionControl a={action} size="sm" /></div>;
  const name = plainCardText(action.title ?? label ?? "");
  if (action.type === "Action.OpenUrl") {
    const href = safeLink(action.url);
    return href ? <LeavingLink className={inline ? "piq-markdown__link" : "piq-adaptive-card__select-link"} href={href} aria-label={inline ? undefined : name || undefined}>{children}</LeavingLink> : children;
  }
  return <button type="button" className={inline ? "piq-adaptive-card__inline-action" : "piq-adaptive-card__select-button"} aria-label={inline ? undefined : name || undefined} aria-disabled={ctx.locked ? "true" : undefined}
    onClick={() => (ctx.locked ? ctx.refuse() : action.type === "Action.ToggleVisibility" ? ctx.toggle(action.targetElements) : ctx.act(action, scope))}>{children}</button>;
}

/* A row of actions: buttons in a cluster, the rest in a More actions menu,
   and the card an Action.ShowCard opens, below them. */
function Actions({ actions, label = "More actions" }) {
  const ctx = useContext(Ctx);
  const scope = useContext(Scope);
  const id = useId();
  const [open, setOpen] = useState(null);
  const list = (Array.isArray(actions) ? actions : []).map((a, i) => ({ a, i, r: resolveAction(a) })).filter((x) => x.r);
  if (!list.length) return null;
  const visible = list.filter((x) => lower(x.r.mode) !== "secondary").slice(0, MAX_VISIBLE);
  const overflow = list.filter((x) => !visible.includes(x) && !x.r.unsupported);
  const primary = visible.find((x) => lower(x.r.style) === "positive")?.i;
  const shown = open != null ? list.find((x) => x.i === open)?.r : null;
  const select = (r) => {
    if (ctx.locked) return ctx.refuse();
    if (r.type === "Action.OpenUrl") { const href = safeLink(r.url); if (href) window.open(href, "_blank", "noopener,noreferrer"); return; }
    if (r.type === "Action.ShowCard") return setOpen((o) => (o === list.find((x) => x.r === r).i ? null : list.find((x) => x.r === r).i));
    if (r.type === "Action.ToggleVisibility") return ctx.toggle(r.targetElements);
    return ctx.act(r, scope);
  };
  return (
    <div className="piq-adaptive-card__action-set">
      <Cluster gap={2} className="piq-adaptive-card__actions">
        {visible.map((x) => (
          <ActionControl key={x.i} a={x.a} primary={x.i === primary}
            showCard={x.r.type === "Action.ShowCard" ? { open: open === x.i, id: `${id}-show-${x.i}`, toggle: () => setOpen((o) => (o === x.i ? null : x.i)) } : undefined} />
        ))}
        {overflow.length > 0 && (
          <MenuButton label={label} buttonLabel={label} items={overflow.map((x) => ({ label: `${titleOf(x.r)}${x.r.type === "Action.OpenUrl" ? " (opens in a new tab)" : ""}`, disabled: x.r.isEnabled === false, onSelect: () => select(x.r) }))} />
        )}
      </Cluster>
      {shown?.type === "Action.ShowCard" && isObj(shown.card) && (
        <div id={`${id}-show-${open}`} className="piq-adaptive-card__show" role="region" aria-label={titleOf(shown)}>
          <Scope.Provider value={[...scope, ...inputsOf(shown.card)]}>
            <Body card={shown.card} />
          </Scope.Provider>
        </div>
      )}
    </div>
  );
}

/* ----------------------------------------------------------- elements */
const RENDER = {
  TextBlock, RichTextBlock, Media, Container, ColumnSet, FactSet, Table,
  Image: ({ d }) => <Img d={d} />,
  ImageSet: ({ d }) => <Cluster gap={2} className="piq-adaptive-card__images">{(Array.isArray(d.images) ? d.images : []).filter(isObj).map((im, i) => <Img key={i} d={im} size={d.imageSize} />)}</Cluster>,
  ActionSet: ({ d }) => <Actions actions={d.actions} />,
  ...Object.fromEntries([...INPUT_TYPES].map((t) => [t, InputEl])),
};
export const ELEMENTS = Object.keys(RENDER);
export const ACTIONS = [...ACTION_TYPES];

/* One element of the card, or its fallback, or a plain notice. */
function Element({ d }) {
  const ctx = useContext(Ctx);
  if (!isObj(d)) return null;
  const R = Object.hasOwn(RENDER, d.type) && meetsRequires(d.requires) ? RENDER[d.type] : null;
  if (!R) {
    if (isObj(d.fallback)) return <Element d={d.fallback} />;
    if (lower(d.fallback) === "drop") return null;
    return <p className="piq-adaptive-card__notice" data-ac-unsupported={typeof d.type === "string" ? d.type : ""}>{NOT_SHOWN}</p>;
  }
  return (
    <div className="piq-adaptive-card__el" data-ac={d.type} id={ctx.domId(d.id)} hidden={!ctx.isVisible(d) || undefined}
      data-spacing={lower(d.spacing) || undefined} data-separator={d.separator ? "" : undefined} data-align={lower(d.horizontalAlignment) || undefined}
      data-ac-style={d.type === "Container" ? lower(d.style) || undefined : undefined} style={/^\d+px$/.test(String(d.minHeight ?? "")) ? { minBlockSize: d.minHeight } : undefined}>
      <R d={d} />
    </div>
  );
}

function Body({ card }) {
  return (
    <>
      <Stack gap={0} className="piq-adaptive-card__body"><Items items={card.body} /></Stack>
      <Actions actions={card.actions} />
    </>
  );
}

/* Every element id in the card with its declared visibility. */
function declaredVisibility(card) {
  const out = {};
  const walk = (v) => {
    if (Array.isArray(v)) return v.forEach(walk);
    if (!isObj(v)) return;
    if (typeof v.id === "string" && typeof v.type === "string") out[v.id] = v.isVisible !== false;
    for (const [k, x] of Object.entries(v)) if (k !== "data") walk(x);
  };
  walk(card);
  return out;
}

const cardTitle = (card) => {
  const blocks = (Array.isArray(card?.body) ? card.body : []).filter((x) => x?.type === "TextBlock");
  const t = blocks.find((x) => lower(x.style) === "heading") ?? blocks[0];
  return t ? plainCardText(t.text) : "";
};

/* An Adaptive Card (schema 1.6 and earlier) drawn with the SDK's
   components in the nearest theme. onAction({ type, id, verb, data, inputs })
   is called for Action.Submit and Action.Execute; a high-impact action only
   after the user approves. decision and onDecide({ action, decision }) let
   the app record the user's choice (a conversation keeps it with the
   message); nothing in the card, or claimed by a tool, decides it. */
export function AdaptiveCard({ card, onAction, decision, onDecide, headingLevel = 3, disclosure, className }) {
  const uid = useId();
  const valid = isObj(card) && card.type === "AdaptiveCard";
  const allInputs = useMemo(() => (valid ? inputsOf(card, true) : []), [card, valid]);
  const declared = useMemo(() => (valid ? declaredVisibility(card) : {}), [card, valid]);
  const [values, setValues] = useState(() => Object.fromEntries(allInputs.map((d) => [d.id, initialValue(d)])));
  const [errors, setErrors] = useState({});
  const [shownIds, setShownIds] = useState({});
  const [pending, setPending] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [own, setOwn] = useState(null);
  const [said, setSaid] = useState("");
  const [refused, setRefused] = useState(false);
  const root = useRef(null);
  // A new card starts again: its own inputs, visibility and choices.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setValues(Object.fromEntries(allInputs.map((d) => [d.id, initialValue(d)]))); setErrors({}); setShownIds({}); setPending(null); setOwn(null); setRefused(false);
  }, [allInputs]);

  // Only the user's choice here, or one the app passes back, decides a request.
  const decided = isObj(decision) && (decision.decision === "approved" || decision.decision === "denied") ? decision : own;
  const domId = (id, kind = "el") => (typeof id === "string" && id ? `${uid}-${kind}-${id.replace(/[^\w-]/g, "_")}` : undefined);
  const isVisible = (d) => (typeof d?.id === "string" && d.id in shownIds ? shownIds[d.id] : d?.isVisible !== false);
  const say = (text) => setSaid((s) => (s === text ? `${text} ` : text));

  const ctx = {
    uid, values, errors, headingLevel, declared, domId, isVisible,
    locked: !!decided || !!pending,
    setValue: (id, v) => { setValues((x) => ({ ...x, [id]: v })); setErrors((e) => (e[id] ? { ...e, [id]: undefined } : e)); },
    toggle: (targets) => setShownIds((cur) => {
      const next = { ...cur };
      for (const t of Array.isArray(targets) ? targets : []) {
        const id = typeof t === "string" ? t : t?.elementId;
        if (!id) continue;
        const now = id in next ? next[id] : declared[id] !== false;
        next[id] = typeof t === "object" && typeof t.isVisible === "boolean" ? t.isVisible : !now;
      }
      return next;
    }),
    refuse: () => { setRefused(true); say(pending && !decided ? "Approve or deny the request first." : "This card is no longer current."); },
    act: (action, scope) => {
      if (decided || pending) return ctx.refuse();
      const inputs = lower(action.associatedInputs) === "none" ? [] : scope;
      const problems = Object.fromEntries(inputs.map((d) => [d.id, problemWith(d, values[d.id] ?? "")]).filter(([, p]) => p));
      if (Object.keys(problems).length) {
        setErrors(problems);
        say(`${Object.keys(problems).length === 1 ? "One field needs" : `${Object.keys(problems).length} fields need`} attention.`);
        const firstBad = inputs.find((d) => problems[d.id]);
        const el = root.current?.querySelector(`[id="${domId(firstBad.id, "input")}"]`);
        (el?.matches("input, select, textarea") ? el : el?.querySelector("input, select, textarea"))?.focus();
        return;
      }
      setErrors({});
      const payload = { type: action.type, ...(typeof action.id === "string" ? { id: action.id } : {}), ...(action.type === "Action.Execute" && typeof action.verb === "string" ? { verb: action.verb } : {}), data: dataOf(action), inputs: Object.fromEntries(inputs.map((d) => [d.id, values[d.id] ?? ""])) };
      const marker = markerOf(action);
      if (marker?.highImpact === true) {
        const consequence = typeof marker.consequence === "string" && marker.consequence.trim() ? marker.consequence.trim() : [titleOf(action), cardTitle(card)].filter(Boolean).join(": ");
        setPending({ key: action.id ?? action.verb ?? titleOf(action), action, payload, summary: consequence });
        say(`Approval needed: ${consequence}`);
        return;
      }
      if (lower(action.style) === "destructive") return setConfirm({ action, payload });
      onAction?.(payload);
    },
  };

  const decide = (d) => {
    if (!pending || decided) return;
    const record = { action: pending.key, decision: d, summary: pending.summary };
    setOwn(record);
    say(`${d === "approved" ? "Approved" : "Denied"}: ${pending.summary}`);
    onDecide?.({ action: pending.key, decision: d });
    if (d === "approved") onAction?.(pending.payload);
  };
  const request = pending ?? (decided ? { key: decided.action, summary: decided.summary ?? decision?.summary ?? "" } : null);

  if (!valid) {
    return <div className={`piq-adaptive-card piq-adaptive-card--invalid${className ? ` ${className}` : ""}`} data-piq-ai="generated"><p className="piq-adaptive-card__notice">{NOT_SHOWN}</p></div>;
  }
  const disclosureId = disclosure ? `${uid}-ai` : undefined;
  return (
    <Ctx.Provider value={ctx}>
      <Scope.Provider value={inputsOf(card)}>
        <Card as="section" ref={root} className={`piq-card piq-adaptive-card${className ? ` ${className}` : ""}`} data-piq-ai="generated" data-ac="AdaptiveCard" data-state={decided ? decided.decision : pending ? "pending" : undefined}
          lang={typeof card.lang === "string" ? card.lang : undefined} dir={card.rtl === true ? "rtl" : undefined} aria-describedby={disclosureId}>
          {disclosure && <p id={disclosureId} className="piq-adaptive-card__disclosure"><Icon name="info" />{disclosure}</p>}
          {newer(card.version) && <Notice tone="info" title={`This card uses Adaptive Cards ${card.version}.`}>{`This app shows version ${SUPPORTED.join(".")} and earlier, so parts of it may be left out.`}</Notice>}
          <Body card={card} />
          {request && (
            <ApprovalCard summary={request.summary} details={pending ? `Asked by the card's "${titleOf(pending.action)}" action.` : undefined}
              decision={decided?.decision} current={!!pending || !!decided} onDecide={decide} />
          )}
          {refused && <p className="piq-adaptive-card__status" role="status">{decided || !pending ? "This card is no longer current." : "Approve or deny the request first."}</p>}
          <p className="piq-visually-hidden" aria-live="polite" data-announcer="">{said}</p>
        </Card>
        {confirm && (
          <ConfirmDialog open title={`${titleOf(confirm.action)}?`} objectName={cardTitle(card) || titleOf(confirm.action)}
            consequence={markerOf(confirm.action)?.consequence ?? `${titleOf(confirm.action)} cannot be undone from this card.`} confirmLabel={titleOf(confirm.action)}
            onCancel={() => setConfirm(null)} onConfirm={() => { const p = confirm.payload; setConfirm(null); onAction?.(p); }} />
        )}
      </Scope.Provider>
    </Ctx.Provider>
  );
}
