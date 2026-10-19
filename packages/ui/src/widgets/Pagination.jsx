import { Button } from "./Button.jsx";
import { Select } from "./Field.jsx";
import { Icon } from "../icons/Icon.jsx";

/* Moving through a long list a page at a time: where the user is ("21–40 of
   312"), previous and next, and how many rows a page shows. Pages count from
   1. The app owns page and pageSize and fetches each page. */
export function Pagination({ page = 1, pageSize = 20, total = 0, onPageChange, pageSizes = [10, 20, 50, 100], onPageSizeChange, label = "Pagination", ofLabel = "of", previousLabel = "Previous page", nextLabel = "Next page", pageSizeLabel = "Rows per page", className }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const p = Math.min(Math.max(1, page), pages);
  const first = total ? (p - 1) * pageSize + 1 : 0;
  const last = Math.min(total, p * pageSize);
  return (
    <nav aria-label={label} className={`piq-pagination${className ? ` ${className}` : ""}`}>
      {onPageSizeChange && (
        <Select label={pageSizeLabel} className="piq-pagination__size" value={String(pageSize)}
          options={pageSizes.map((n) => ({ value: String(n), label: String(n) }))} onChange={(e) => onPageSizeChange(Number(e.target.value))} />
      )}
      <p className="piq-pagination__position" aria-live="polite">{`${first}–${last} ${ofLabel} ${total}`}</p>
      <div className="piq-pagination__steps">
        <Button variant="secondary" size="sm" aria-label={previousLabel} disabled={p <= 1} onClick={() => onPageChange?.(p - 1)}><Icon name="chevron-left" /></Button>
        <Button variant="secondary" size="sm" aria-label={nextLabel} disabled={p >= pages} onClick={() => onPageChange?.(p + 1)}><Icon name="chevron-right" /></Button>
      </div>
    </nav>
  );
}
