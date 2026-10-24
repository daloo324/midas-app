import type { Metadata } from "next";
import { InviteStaffForm } from "@/components/admin/invite-staff-form";
import {
  ActiveForm,
  ResendInviteForm,
  RoleForm,
} from "@/components/admin/staff-row-actions";
import { requireArea } from "@/lib/auth/session";
import Link from "next/link";
import { getOverview, type ClientHealth } from "@/lib/data/overview";
import { listTeam, listWorkload } from "@/lib/data/team";
import { formatMoney, todayInGaborone } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/auth/routes";

export const metadata: Metadata = { title: "Team" };

const SORTS: Record<
  string,
  { label: string; by: (a: ClientHealth, b: ClientHealth) => number }
> = {
  rate: {
    label: "Effective rate",
    by: (a, b) => (a.rate ?? Infinity) - (b.rate ?? Infinity),
  },
  fee: { label: "Monthly fee", by: (a, b) => a.monthlyFee - b.monthlyFee },
  hours: {
    label: "Design hours",
    by: (a, b) => b.hoursThisMonth - a.hoursThisMonth,
  },
  revisions: {
    label: "Revisions per item",
    by: (a, b) => (b.revisionsPerItem ?? 0) - (a.revisionsPerItem ?? 0),
  },
};

export default async function TeamPage({
  searchParams,
}: PageProps<"/admin/team">) {
  const me = await requireArea("admin");
  const today = todayInGaborone();
  const sp = await searchParams;
  const sortKey =
    typeof sp.sort === "string" && sp.sort in SORTS ? sp.sort : "rate";
  const [people, workload, overview] = await Promise.all([
    listTeam(),
    listWorkload(`${today.slice(0, 7)}-01`),
    getOverview(today),
  ]);
  const hours = new Map(workload.map((w) => [w.id, w.hoursThisMonth]));
  const profit = overview.clients
    .filter((c) => c.status === "active" || c.status === "paused")
    .sort(SORTS[sortKey].by);

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
                  <th className="num">Hours this month</th>
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
                      <td className="num">
                        {p.role === "designer" || p.role === "creative_director"
                          ? (hours.get(p.id) ?? 0)
                          : "—"}
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

        <section className="panel">
          <h2 style={{ marginBottom: 10 }}>Workload</h2>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th className="num">Clients</th>
                  <th className="num">Calendars and briefs to send</th>
                  <th className="num">In design</th>
                  <th className="num">In revisions</th>
                  <th className="num">Hours this month</th>
                </tr>
              </thead>
              <tbody>
                {workload.map((w) => {
                  const ae = w.role === "account_exec";
                  return (
                    <tr key={w.id}>
                      <td>{w.name}</td>
                      <td>{ROLE_LABELS[w.role]}</td>
                      <td className="num">{ae ? w.clients : "—"}</td>
                      <td className="num">{ae ? w.toSend : "—"}</td>
                      <td className="num">{ae ? "—" : w.inDesign}</td>
                      <td className="num">{ae ? "—" : w.inRevisions}</td>
                      <td className="num">{ae ? "—" : w.hoursThisMonth}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <div
            className="row between"
            style={{ marginBottom: 10, flexWrap: "wrap", gap: 8 }}
          >
            <h2>Profitability per client, this month</h2>
            <div className="chips">
              {Object.entries(SORTS).map(([k, v]) => (
                <Link
                  key={k}
                  className="chip"
                  href={`?sort=${k}`}
                  aria-current={k === sortKey ? "page" : undefined}
                >
                  {v.label}
                </Link>
              ))}
            </div>
          </div>
          <p className="sub" style={{ marginTop: -4, marginBottom: 10 }}>
            Effective rate is the monthly fee divided by design hours logged
            this month. The threshold is {formatMoney(overview.threshold)} an
            hour.
          </p>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Client</th>
                  <th className="num">Monthly fee</th>
                  <th className="num">Design hours</th>
                  <th className="num">Effective rate</th>
                  <th className="num">Revisions per item</th>
                </tr>
              </thead>
              <tbody>
                {profit.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/admin/clients/${c.id}`}>{c.name}</Link>
                    </td>
                    <td className="num">{formatMoney(c.monthlyFee)}</td>
                    <td className="num">{c.hoursThisMonth}</td>
                    <td
                      className="num"
                      style={
                        c.rate != null && c.rate < overview.threshold
                          ? { color: "var(--bad)", fontWeight: 700 }
                          : undefined
                      }
                    >
                      {c.rate == null ? "—" : formatMoney(c.rate)}
                    </td>
                    <td className="num">{c.revisionsPerItem ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
