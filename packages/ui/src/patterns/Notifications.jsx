import { useState } from "react";
import { Button } from "../widgets/Button.jsx";
import { Switch } from "../widgets/Choice.jsx";
import { Sheet } from "../widgets/Sheet.jsx";
import { Icon } from "../icons/Icon.jsx";
import { ConfirmDialog } from "./Forms.jsx";

/* Notifications: a button whose name says how many are unread
   ("Notifications, 3 unread"), opening a panel where each says Read or
   Unread in text and links to its record; mark one or all as read; channel
   preferences per kind of notification. notifications: [{ id, title, href,
   read }]; onMarkRead(notification); onMarkAllRead(); preferences: { kinds,
   channels: [{ value, label }], value: { kind: { channel: on } } };
   onPreferenceChange(kind, channel, on). */
export function NotificationCentre({ notifications = [], onMarkRead, onMarkAllRead, preferences, onPreferenceChange, label = "Notifications", className }) {
  const [open, setOpen] = useState(false);
  const unread = notifications.filter((n) => !n.read).length;
  return (
    <div className={`piq-notifications${className ? ` ${className}` : ""}`}>
      <Button variant="text" aria-label={unread ? `${label}, ${unread} unread` : label} aria-haspopup="dialog" aria-expanded={open} badge={unread || undefined} onClick={() => setOpen(true)}>
        <Icon name="info" />
      </Button>
      <Sheet open={open} onClose={() => setOpen(false)} title={label} side="end">
        {unread > 0 && <Button variant="secondary" size="sm" onClick={() => onMarkAllRead?.()}>Mark all as read</Button>}
        <ul className="piq-notifications__list">
          {notifications.map((n) => (
            <li key={n.id} className="piq-notifications__item" data-read={n.read || undefined}>
              <span className="piq-notifications__state">{n.read ? "Read" : "Unread"}</span>
              <a href={n.href} className="piq-notifications__link">{n.title}</a>
              {!n.read && <Button variant="text" size="sm" onClick={() => onMarkRead?.(n)}>Mark as read<span className="piq-visually-hidden">{`: ${n.title}`}</span></Button>}
            </li>
          ))}
        </ul>
        {preferences && (
          <div className="piq-table-wrap">
            <table className="piq-table piq-notifications__prefs">
              <caption className="piq-matrix__caption">Notify me by</caption>
              <thead><tr><th scope="col">Notification</th>{preferences.channels.map((c) => <th key={c.value} scope="col">{c.label}</th>)}</tr></thead>
              <tbody>
                {preferences.kinds.map((k) => (
                  <tr key={k.value}><th scope="row">{k.label}</th>
                    {preferences.channels.map((c) => (
                      <td key={c.value}><Switch label={<span className="piq-visually-hidden">{`${c.label} for ${k.label}`}</span>} checked={!!preferences.value?.[k.value]?.[c.value]} onChange={(e) => onPreferenceChange?.(k.value, c.value, e.target.checked)} /></td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Sheet>
    </div>
  );
}

/* Connections to other services: each with its status in text, Connect when
   it is not connected and Disconnect when it is. items: [{ id, name,
   description, connected }]; onConnect(item); onDisconnect(item). */
export function Integrations({ title = "Integrations", items = [], onConnect, onDisconnect, className }) {
  return (
    <section className={`piq-integrations${className ? ` ${className}` : ""}`} aria-label={title}>
      <ul className="piq-integrations__list">
        {items.map((it) => (
          <li key={it.id} className="piq-integrations__item">
            <div><p className="piq-subscriptions__name">{it.name}</p>{it.description && <p className="piq-subscriptions__detail">{it.description}</p>}</div>
            <strong className="piq-integrations__status" data-connected={it.connected || undefined}>{it.connected ? "Connected" : "Not connected"}</strong>
            {it.connected
              ? <Button variant="secondary" size="sm" aria-label={`Disconnect ${it.name}`} onClick={() => onDisconnect?.(it)}>Disconnect</Button>
              : <Button size="sm" aria-label={`Connect ${it.name}`} onClick={() => onConnect?.(it)}>Connect</Button>}
          </li>
        ))}
      </ul>
    </section>
  );
}

/* API keys: a new key is shown in full once, with a copy button; after that
   only masked, and the full key is not in the page; revoking is confirmed.
   keys: [{ id, name, last4, created }]; created: { name, secret } while the
   new key is being shown, then the app clears it on onCreatedClose();
   onCreate(); onRevoke(key). */
export function ApiKeys({ title = "API keys", keys = [], created, onCreate, onCreatedClose, onRevoke, className }) {
  const [copied, setCopied] = useState(false);
  const [revoking, setRevoking] = useState(null);
  const copy = async () => { await navigator.clipboard?.writeText(created.secret); setCopied(true); };
  return (
    <section className={`piq-api-keys${className ? ` ${className}` : ""}`} aria-label={title}>
      <div className="piq-subscriptions__head"><h2 className="piq-import__title">{title}</h2><Button onClick={() => onCreate?.()}><Icon name="add" />Create a key</Button></div>
      {created && (
        <div className="piq-api-keys__created" role="status">
          <p><strong>{created.name}</strong>: copy this key now. You will not be able to see it again.</p>
          <code className="piq-api-keys__secret">{created.secret}</code>
          <div className="piq-quick-edit__actions">
            <Button variant="secondary" onClick={copy}><Icon name="copy" />{copied ? "Copied" : "Copy key"}</Button>
            <Button variant="text" onClick={() => { setCopied(false); onCreatedClose?.(); }}>Done</Button>
          </div>
        </div>
      )}
      <ul className="piq-integrations__list">
        {keys.map((k) => (
          <li key={k.id} className="piq-integrations__item">
            <div><p className="piq-subscriptions__name">{k.name}</p><code className="piq-api-keys__masked" aria-label={`Key ending ${k.last4}`}>{`•••• •••• •••• ${k.last4}`}</code></div>
            <Button variant="text" size="sm" aria-label={`Revoke ${k.name}`} onClick={() => setRevoking(k)}>Revoke</Button>
          </li>
        ))}
      </ul>
      <ConfirmDialog open={!!revoking} objectName={revoking?.name} title={revoking ? `Revoke ${revoking.name}?` : ""} confirmLabel="Revoke"
        consequence="Anything using this key stops working at once." onCancel={() => setRevoking(null)} onConfirm={() => { onRevoke?.(revoking); setRevoking(null); }} />
    </section>
  );
}
