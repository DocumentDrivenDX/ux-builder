import { useId, useState } from "react";
import { Button } from "../widgets/Button.jsx";
import { DateRangePicker } from "../widgets/DatePicker.jsx";
import { Dialog } from "../widgets/Dialog.jsx";
import { Select, TextField } from "../widgets/Field.jsx";
import { Icon } from "../icons/Icon.jsx";
import { FilterBar } from "./Regions.jsx";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* The members of a workspace with their roles: invite one by email with a
   role (an address that is not an email is an error at its field), and
   change a member's role. The list shows what the app says, so a change
   shows once the app confirms it. members: [{ id, name, email, role }];
   roles: [{ value, label }]; onInvite({ email, role }); onRoleChange(member,
   role). */
export function UsersAndRoles({ title = "Members", members = [], roles = [], onInvite, onRoleChange, className }) {
  const [inviting, setInviting] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState(roles[0]?.value ?? "");
  const [tried, setTried] = useState(false);
  const base = useId();
  const bad = !EMAIL.test(email.trim());
  const roleLabel = (v) => roles.find((r) => r.value === v)?.label ?? v;
  const invite = (e) => { e.preventDefault(); setTried(true); if (bad) return; onInvite?.({ email: email.trim(), role }); setInviting(false); setEmail(""); setTried(false); };
  return (
    <section className={`piq-members${className ? ` ${className}` : ""}`} aria-labelledby={`${base}-h`}>
      <div className="piq-subscriptions__head"><h2 id={`${base}-h`} className="piq-import__title">{title}</h2><Button onClick={() => setInviting(true)}><Icon name="add" />Invite</Button></div>
      <div className="piq-table-wrap">
        <table className="piq-table">
          <caption className="piq-visually-hidden">{title}</caption>
          <thead><tr><th scope="col">Name</th><th scope="col">Email</th><th scope="col">Role</th></tr></thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id}>
                <th scope="row">{m.name}</th><td>{m.email}</td>
                <td className="piq-members__role">
                  <span className="piq-members__current">{roleLabel(m.role)}</span>
                  <Select label={<span className="piq-visually-hidden">{`Change role for ${m.name}`}</span>} className="piq-members__select" value={m.role} options={roles} onChange={(e) => onRoleChange?.(m, e.target.value)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Dialog open={inviting} onClose={() => setInviting(false)} title="Invite a member">
        <form className="piq-quick-edit" noValidate onSubmit={invite}>
          <TextField label="Email address" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={tried && bad ? "Enter an email address, like name@example.com" : undefined} />
          <Select label="Role" value={role} options={roles} onChange={(e) => setRole(e.target.value)} />
          <div className="piq-quick-edit__actions"><Button type="submit">Send invite</Button><Button variant="secondary" onClick={() => setInviting(false)}>Cancel</Button></div>
        </form>
      </Dialog>
    </section>
  );
}

/* Which role may do what: a table with a column per role and a row per
   permission, each cell saying Yes or No in text. has(role, permission). */
export function PermissionsMatrix({ title = "Permissions", roles = [], permissions = [], has = () => false, yes = "Yes", no = "No", className }) {
  return (
    <div className="piq-table-wrap">
      <table className={`piq-table piq-matrix${className ? ` ${className}` : ""}`}>
        <caption className="piq-matrix__caption">{title}</caption>
        <thead><tr><th scope="col">Permission</th>{roles.map((r) => <th key={r.value} scope="col">{r.label}</th>)}</tr></thead>
        <tbody>
          {permissions.map((p) => (
            <tr key={p.value}>
              <th scope="row">{p.label}</th>
              {roles.map((r) => { const on = has(r.value, p.value); return <td key={r.value} data-on={on || undefined}><Icon name={on ? "check" : "close"} />{on ? yes : no}</td>; })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* Who changed what and when, read only: each entry with the person, the
   change, the time and the value before and after, filtered by person,
   action and date (applied filters as removable chips). The app filters:
   onFilter({ person, action, from, to }); filters: the applied ones as
   [{ id, label }]; onRemoveFilter(filter). */
export function AuditLog({ title = "Audit log", entries = [], people = [], actions = [], filters = [], onFilter, onRemoveFilter, onClearFilters, locale, className }) {
  const [person, setPerson] = useState("");
  const [action, setAction] = useState("");
  const [range, setRange] = useState({ from: "", to: "" });
  const base = useId();
  const fmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });
  const apply = (e) => { e.preventDefault(); onFilter?.({ person: person || null, action: action || null, from: range.from || null, to: range.to || null }); };
  return (
    <section className={`piq-audit-log${className ? ` ${className}` : ""}`} aria-labelledby={`${base}-h`}>
      <h2 id={`${base}-h`} className="piq-import__title">{title}</h2>
      <form className="piq-audit-log__filters" onSubmit={apply}>
        <Select label="Person" placeholder="Anyone" value={person} options={people} onChange={(e) => setPerson(e.target.value)} />
        <Select label="Action" placeholder="Any action" value={action} options={actions} onChange={(e) => setAction(e.target.value)} />
        <DateRangePicker label="Date" from={range.from} to={range.to} onChange={setRange} />
        <Button type="submit" variant="secondary">Filter</Button>
      </form>
      <FilterBar filters={filters} onRemoveFilter={onRemoveFilter} onClearAll={onClearFilters} />
      <div className="piq-table-wrap">
        <table className="piq-table piq-audit-log__table">
          <caption className="piq-visually-hidden">{title}</caption>
          <thead><tr><th scope="col">When</th><th scope="col">Who</th><th scope="col">What</th><th scope="col">Before</th><th scope="col">After</th></tr></thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id}>
                <td><time dateTime={new Date(e.time).toISOString()}>{fmt.format(new Date(e.time))}</time></td>
                <td>{e.actor}</td><td>{e.action}</td><td>{e.before ?? "—"}</td><td>{e.after ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
