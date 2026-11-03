/* What the timeline and metric layouts share: numbers in their unit and precision, ISO dates as
   UTC days, and tick steps a reader can count (visuals PRD §5.5, §5.7). No d3: the scales here are
   linear and the dates whole days, so a few lines do what d3-scale would. Nothing reads the clock,
   so the same document draws the same bytes. */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY = 86400000;

/* A UTC calendar day as days since the epoch. Unlike Date.UTC, a year below 100 stays that year. */
const utcDay = (year, monthIndex, date) => { const t = new Date(0); t.setUTCFullYear(year, monthIndex, date); return t.getTime() / DAY; };

/** An ISO-8601 date (or date-time) as whole UTC days since the epoch. */
export const day = (iso) => Math.floor(Date.parse(String(iso).length <= 10 ? `${iso}T00:00:00Z` : iso) / DAY);

/** A day number as "13 Oct 2026", or without the year when `year` is false. */
export function dateLabel(d, { year = true } = {}) {
  const t = new Date(d * DAY);
  return `${t.getUTCDate()} ${MONTHS[t.getUTCMonth()]}${year ? ` ${t.getUTCFullYear()}` : ""}`;
}

/** Ticks across [a, b] days: weekly, monthly or yearly, whichever gives between three and eight. */
export function dateTicks(a, b) {
  const span = Math.max(1, b - a);
  if (span <= 56) {
    const step = span <= 10 ? 1 : span <= 28 ? 7 : 14;
    const out = [];
    for (let d = a; d <= b; d += step) out.push({ at: d, label: dateLabel(d, { year: false }) });
    return out;
  }
  const out = [];
  const first = new Date(a * DAY), monthStep = span <= 400 ? (span <= 200 ? 1 : 2) : 12;
  let y = first.getUTCFullYear(), mo = first.getUTCMonth() + 1;
  if (monthStep === 12) { y += 1; mo = 0; }
  for (;;) {
    const d = utcDay(y, mo, 1);
    if (d > b) break;
    out.push({ at: d, label: monthStep === 12 ? String(y) : `${MONTHS[mo]}${mo === 0 || out.length === 0 ? ` ${y}` : ""}` });
    mo += monthStep;
    while (mo > 11) { mo -= 12; y += 1; }
  }
  return out;
}

/** Up to about `count` round ticks from 0 (or below) to at least max: 1, 2 or 5 times a power of ten. */
export function niceTicks(min, max, count = 5) {
  const lo = Math.min(0, min), hi = Math.max(max, lo + 1);
  const raw = (hi - lo) / count, mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((k) => k * mag).find((s) => s >= raw);
  const out = [];
  for (let v = Math.floor(lo / step) * step; v <= hi + step / 2; v += step) out.push(Math.round(v / step) * step);
  if (out.at(-1) < hi) out.push(out.at(-1) + step);
  return out;
}

/** A value as a metric shows it: its format kind, precision and compact form; the unit is the caller's. */
export function formatValue(value, format = {}) {
  const decimals = format.decimals ?? (Number.isInteger(value) ? 0 : 1);
  let v = value, suffix = "";
  if (format.kind === "percent") return `${(v).toFixed(decimals)}%`;
  if (format.compact && Math.abs(v) >= 1000) {
    for (const [k, s] of [[1e9, "B"], [1e6, "M"], [1e3, "k"]]) if (Math.abs(v) >= k) { v /= k; suffix = s; break; }
  }
  const fixed = Math.abs(v).toFixed(suffix ? Math.max(decimals, 1) : decimals).replace(/\.0+$/, "");
  const [int, frac] = fixed.split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const sign = v < 0 ? "−" : "";
  if (format.kind === "currency") return `${sign}${format.currency ?? "$"}${grouped}${frac ? `.${frac}` : ""}${suffix}`;
  if (format.kind === "duration") return `${sign}${grouped}${frac ? `.${frac}` : ""}${suffix}`;
  return `${sign}${grouped}${frac ? `.${frac}` : ""}${suffix}`;
}

/** A value with its unit, unless the format already carries it (a percent, a currency). */
export const withUnit = (value, metric) => {
  const text = formatValue(value, metric.format);
  return metric.format?.kind === "percent" || metric.format?.kind === "currency" || !metric.unit ? text : `${text} ${metric.unit}`;
};

/** A filled triangle pointing up or down, as a path: the change's direction drawn, not only coloured. */
export const triangle = (x, y, s, up) => (up ? `M${x} ${y + s} L${x + s / 2} ${y} L${x + s} ${y + s} Z` : `M${x} ${y} L${x + s / 2} ${y + s} L${x + s} ${y} Z`);
