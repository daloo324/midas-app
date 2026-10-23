import type { Metadata } from "next";
import Link from "next/link";
import { hm } from "@/components/creative/timer";
import { requireArea } from "@/lib/auth/session";
import { monthLabel, monthParam } from "@/lib/content/constants";
import { clientTime, teamTime } from "@/lib/data/creative";
import { formatMoney, todayInGaborone } from "@/lib/format";

export const metadata: Metadata = { title: "Time" };

// Team time this month: the creative director and CEO see everyone; designers see their own.
export default async function TeamTimePage() {
  const user = await requireArea("creative");
  const month = `${todayInGaborone().slice(0, 7)}-01`;
  const rows = await teamTime(month);
  const clientIds = [...new Set(rows.map((r) => r.clientId))];
  // Each client's effective rate uses everyone's time on it, not just yours.
  const totals = new Map(
    await Promise.all(
      clientIds.map(
        async (id) =>
          [
            id,
            (await clientTime(id, month))
              .filter((r) => !r.is_brand_kit)
              .reduce((a, r) => a + r.minutes, 0),
          ] as const,
      ),
    ),
  );
  const people = [...new Set(rows.map((r) => r.user))].sort();
  const total = rows.reduce((a, r) => a + r.minutes, 0);

  return (
    <>
      <div className="head">
        <div>
          <h1>Time · {monthLabel(month)}</h1>
          <p className="sub">
            {user.role === "designer"
              ? "Your design time this month, by client."
              : "Design time by designer and client this month."}
          </p>
        </div>
      </div>
      <div className="stat">
        <div>
          <b>{hm(total)}</b>
          <span>
            {user.role === "designer" ? "Your time" : "Total design time"}
          </span>
        </div>
        <div>
          <b>{clientIds.length}</b>
          <span>Clients worked on</span>
        </div>
        <div>
          <b>{people.length}</b>
          <span>{people.length === 1 ? "Person" : "People"}</span>
        </div>
      </div>
      {rows.length === 0 ? (
        <div className="notice">No time logged this month yet.</div>
      ) : (
        <div
          className="tbl-wrap"
          style={{
            border: "1px solid var(--line)",
            borderRadius: 12,
            background: "var(--surface)",
          }}
        >
          <table className="tbl">
            <thead>
              <tr>
                <th>Designer</th>
                <th>Client</th>
                <th className="num">Time</th>
                <th className="num">Client&apos;s effective rate / hour</th>
              </tr>
            </thead>
            <tbody>
              {rows
                .sort(
                  (a, b) =>
                    a.user.localeCompare(b.user) ||
                    a.client.localeCompare(b.client),
                )
                .map((r) => {
                  const all = totals.get(r.clientId) ?? 0;
                  return (
                    <tr key={`${r.userId}-${r.clientId}`}>
                      <td>{r.user}</td>
                      <td>
                        <Link
                          className="link"
                          href={`/creative/clients/${r.clientId}/time?month=${monthParam(month)}`}
                        >
                          {r.client}
                        </Link>
                      </td>
                      <td className="num">{hm(r.minutes)}</td>
                      <td className="num">
                        {all > 0 && r.fee
                          ? formatMoney(Math.round(r.fee / (all / 60)))
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
