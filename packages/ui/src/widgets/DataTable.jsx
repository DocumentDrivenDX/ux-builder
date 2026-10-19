import { useMemo, useState } from "react";
import { Button } from "./Button.jsx";

/* A table that sorts and pages. Sortable headers are buttons with aria-sort
   on their cell, so the order is announced; numbers align right and sort as
   numbers.

   columns: [{ key, label, numeric?, sortable?, render?(row) }]
   rows:    plain objects; rowKey names the field that identifies one. */

const compare = (a, b) => (typeof a === "number" && typeof b === "number" ? a - b : String(a ?? "").localeCompare(String(b ?? ""), undefined, { numeric: true }));

export function DataTable({ columns, rows, rowKey = "id", caption, pageSize = 10, initialSort }) {
  const [sort, setSort] = useState(initialSort ?? null);
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const dir = sort.dir === "descending" ? -1 : 1;
    return [...rows].sort((a, b) => dir * compare(a[sort.key], b[sort.key]));
  }, [rows, sort]);

  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const current = Math.min(page, pages - 1);
  const shown = sorted.slice(current * pageSize, (current + 1) * pageSize);
  const first = sorted.length ? current * pageSize + 1 : 0;

  function toggle(key) {
    setSort((s) => (s?.key === key && s.dir === "ascending" ? { key, dir: "descending" } : { key, dir: "ascending" }));
    setPage(0);
  }

  return (
    <div className="piq-table-wrap">
      <table className="piq-table">
        {caption && <caption className="piq-visually-hidden">{caption}</caption>}
        <thead>
          <tr>
            {columns.map((c) => {
              const dir = sort?.key === c.key ? sort.dir : undefined;
              return (
                <th key={c.key} scope="col" aria-sort={c.sortable ? dir ?? "none" : undefined} className={c.numeric ? "piq-num" : undefined}>
                  {c.sortable ? (
                    <button type="button" className="piq-table__sort" onClick={() => toggle(c.key)}>
                      {c.label}
                      <span className="piq-table__arrow" aria-hidden="true">{dir === "descending" ? "↓" : "↑"}</span>
                    </button>
                  ) : c.label}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {shown.map((row) => (
            <tr key={row[rowKey]}>
              {columns.map((c) => <td key={c.key} className={c.numeric ? "piq-num" : undefined}>{c.render ? c.render(row) : row[c.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      {pages > 1 && (
        <div className="piq-table__pager">
          <span aria-live="polite">{first}–{first + shown.length - 1} of {sorted.length}</span>
          <Button variant="text" size="sm" onClick={() => setPage(current - 1)} disabled={current === 0}>Previous</Button>
          <Button variant="text" size="sm" onClick={() => setPage(current + 1)} disabled={current >= pages - 1}>Next</Button>
        </div>
      )}
    </div>
  );
}
