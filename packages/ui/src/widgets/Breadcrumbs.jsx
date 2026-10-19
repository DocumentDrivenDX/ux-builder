import { Icon } from "../icons/Icon.jsx";

/* Where the page sits in a hierarchy, as an ordered list of links in a
   navigation landmark; the last item is the current page. Where it has
   little width (the compact size class) it shows only a link back to the
   parent. items: [{ label, href }]. onNavigate(item, event), if given, is
   called instead of following the link, for an app's own router. */
export function Breadcrumbs({ items = [], label = "Breadcrumb", onNavigate, className, ...rest }) {
  const parent = items.length > 1 ? items[items.length - 2] : null;
  const follow = (item) => (e) => { if (onNavigate) { e.preventDefault(); onNavigate(item, e); } };
  return (
    <nav aria-label={label} className={`piq-breadcrumbs${className ? ` ${className}` : ""}`} {...rest}>
      <ol className="piq-breadcrumbs__list">
        {items.map((it, i) => (
          <li key={i} className="piq-breadcrumbs__item">
            {i === items.length - 1
              ? it.href ? <a href={it.href} aria-current="page" onClick={follow(it)}>{it.label}</a> : <span aria-current="page">{it.label}</span>
              : <a href={it.href} onClick={follow(it)}>{it.label}</a>}
          </li>
        ))}
      </ol>
      {parent && (
        <a className="piq-breadcrumbs__back" href={parent.href} onClick={follow(parent)}>
          <Icon name="arrow-left" />
          {parent.label}
        </a>
      )}
    </nav>
  );
}
