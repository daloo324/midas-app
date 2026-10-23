import type { Metadata } from "next";
import { InviteStaffForm } from "@/components/admin/invite-staff-form";
import {
  ActiveForm,
  ResendInviteForm,
  RoleForm,
} from "@/components/admin/staff-row-actions";
import { requireArea } from "@/lib/auth/session";
import { listTeam } from "@/lib/data/team";

export const metadata: Metadata = { title: "Team" };

export default async function TeamPage() {
  const me = await requireArea("admin");
  const people = await listTeam();

  return (
    <>
      <div className="head">
        <div>
          <h1>Team</h1>
          <p className="sub">
            Invite staff, change roles, and switch off people who have left.
          </p>
        </div>
        <span className="cap">
          {people.filter((p) => p.active).length} active
        </span>
      </div>

      <div className="grid gap-4">
        <section className="panel">
          <h2>Invite someone</h2>
          <p className="sub" style={{ marginBottom: 14 }}>
            They get an email with a link to set their password.
          </p>
          <InviteStaffForm />
        </section>

        <section className="panel">
          <h2 style={{ marginBottom: 10 }}>Staff</h2>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th className="num">Clients</th>
                  <th>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {people.map((p) => {
                  const isPending = p.active && p.pending;
                  return (
                    <tr key={p.id}>
                      <td>
                        <b>{p.full_name}</b>
                        <div
                          className="sub"
                          style={{ margin: 0, fontSize: 13 }}
                        >
                          {p.email}
                        </div>
                      </td>
                      <td>
                        <RoleForm
                          userId={p.id}
                          role={p.role}
                          disabled={!p.active || p.id === me.id}
                        />
                      </td>
                      <td>
                        {!p.active ? (
                          <span className="pill">Deactivated</span>
                        ) : isPending ? (
                          <span className="pill s-warn">Invite pending</span>
                        ) : (
                          <span className="pill s-good">Active</span>
                        )}
                      </td>
                      <td className="num">
                        {p.role === "account_exec" ? p.clients : "—"}
                      </td>
                      <td>
                        <div
                          className="row"
                          style={{
                            gap: 8,
                            justifyContent: "flex-end",
                            alignItems: "flex-start",
                          }}
                        >
                          {isPending ? (
                            <ResendInviteForm userId={p.id} />
                          ) : null}
                          <ActiveForm
                            userId={p.id}
                            active={p.active}
                            isMe={p.id === me.id}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
