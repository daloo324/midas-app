import { ROLE_LABELS } from "@/lib/auth/routes";
import { signInAsDemoUser } from "@/lib/demo/actions";
import { DEMO_PASSWORD, isDemoMode } from "@/lib/demo/mode";
import { store } from "@/lib/demo/store";

/** The dummy logins, shown under the sign-in form in demo mode only. */
export function DemoLogins({ audience }: { audience: "staff" | "client" }) {
  if (!isDemoMode()) return null;
  const s = store();
  const people =
    audience === "staff"
      ? s.staff
          .filter((p) => p.active)
          .map((p) => ({
            id: p.id,
            label: `${p.full_name} · ${ROLE_LABELS[p.role]}`,
            hint: p.email,
          }))
      : s.logins
          .filter((l) => l.active)
          .map((l) => ({
            id: l.user_id,
            label: l.login_id,
            hint: l.full_name,
          }));

  return (
    <div className="notice" style={{ display: "grid", gap: 10 }}>
      <div>
        <b style={{ color: "var(--ink)" }}>Demo logins</b>
        <div style={{ fontSize: 13 }}>
          Type a {audience === "staff" ? "sample email" : "client ID"} below
          with the password{" "}
          <code style={{ fontWeight: 700, color: "var(--ink)" }}>
            {DEMO_PASSWORD}
          </code>
          , or sign in with one click.
        </div>
      </div>
      <div className="grid gap-2">
        {people.map((p) => (
          <form
            key={p.id}
            action={signInAsDemoUser}
            className="row between"
            style={{ gap: 8 }}
          >
            <input type="hidden" name="userId" value={p.id} />
            <span style={{ fontSize: 13, minWidth: 0 }}>
              <b style={{ color: "var(--ink)" }}>{p.label}</b>
              <br />
              {p.hint}
            </span>
            <button className="btn sm" type="submit">
              Sign in as this person
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}
