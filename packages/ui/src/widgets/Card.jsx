/* A bounded group of content with an optional title and actions. */

export function Card({ title, actions, children, as: Tag = "section", ...rest }) {
  return (
    <Tag className="piq-card" {...rest}>
      {title && <h3 className="piq-card__title">{title}</h3>}
      {typeof children === "string" ? <p className="piq-card__body">{children}</p> : children}
      {actions && <div className="piq-card__actions">{actions}</div>}
    </Tag>
  );
}
