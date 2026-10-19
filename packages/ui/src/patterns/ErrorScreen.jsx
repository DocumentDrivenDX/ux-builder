import { Button } from "../widgets/Button.jsx";
import { Icon } from "../icons/Icon.jsx";

const KINDS = {
  "not-found": { icon: "search", title: "We can't find that page", text: "The link may be out of date, or the page may have moved." },
  forbidden: { icon: "lock", title: "You don't have access to this page", text: "Ask the person who manages this workspace to give you access." },
  offline: { icon: "warning", title: "You're offline", text: "Check your connection. What you were doing is kept on this page." },
  maintenance: { icon: "settings", title: "This service is being updated", text: "It will be back shortly. Try again in a few minutes." },
  "session-expired": { icon: "user", title: "Your session has ended", text: "For your security you were signed out. Sign in again to carry on." },
};
const DEFAULT_ACTION = {
  "not-found": { label: "Go to the start", href: "/" },
  forbidden: { label: "Go back", back: true },
  offline: { label: "Try again", reload: true },
  maintenance: { label: "Try again", reload: true },
  "session-expired": { label: "Sign in again", reload: true },
};

/* A whole screen that says something went wrong and how to go on: not found,
   no permission, offline, maintenance or an expired session (kind). One
   level-1 heading states what happened. The app can replace the title, text
   and actions; without actions it offers the kind's own way forward (the
   start page, back, or try again). */
export function ErrorScreen({ kind = "not-found", title, children, actions, className, ...rest }) {
  const k = KINDS[kind] ?? KINDS["not-found"];
  const d = DEFAULT_ACTION[kind] ?? DEFAULT_ACTION["not-found"];
  const fallback = d.href
    ? <a className="piq-btn" href={d.href}>{d.label}</a>
    : <Button onClick={() => (d.back ? window.history.back() : window.location.reload())}>{d.label}</Button>;
  return (
    <section className={`piq-error-screen${className ? ` ${className}` : ""}`} data-kind={kind} {...rest}>
      <Icon name={k.icon} className="piq-error-screen__mark" />
      <h1 className="piq-error-screen__title">{title ?? k.title}</h1>
      <div className="piq-error-screen__text">{children ?? <p>{k.text}</p>}</div>
      <div className="piq-error-screen__actions">{actions ?? fallback}</div>
    </section>
  );
}
