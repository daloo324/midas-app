import type { Metadata } from "next";
import Link from "next/link";
import {
  activeClientCapacity,
  listAccountExecs,
  listClients,
} from "@/lib/data/clients";
import {
  InvoicePill,
  ProgressPill,
  RatePill,
} from "@/components/admin/health-pills";
import { WORK_STATUS_LABELS } from "@/lib/content/constants";
import { getOverview } from "@/lib/data/overview";
import { formatDay, formatMoney, todayInGaborone } from "@/lib/format";
import {
  CLIENT_STATUSES,
  CLIENT_STATUS_LABELS,
  CLIENT_STATUS_PILL,
  type ClientStatus,
} from "@/lib/format/status";

export const metadata: Metadata = { title: "Clients" };

export default async function ClientsPage({
  searchParams,
}: PageProps<"/admin/clients">) {
  const params = await searchParams;
  const status = CLIENT_STATUSES.includes(params.status as ClientStatus)
    ? (params.status as ClientStatus)
    : null;
  const ae =
    typeof params.ae === "string" && /^[0-9a-f-]{36}$/i.test(params.ae)
      ? params.ae
      : null;

  const [rows, execs, capacity, overview] = await Promise.all([
    listClients({ status, ae }),
    listAccountExecs(),
    activeClientCapacity(),
    getOverview(todayInGaborone()),
  ]);
  const health = new Map(overview.clients.map((h) => [h.id, h]));

  return (
    <>
      <div className="head">
        <div>
          <h1>Clients</h1>
          <p className="sub">
            Every client, their account exec and their retainer.
          </p>
        </div>
        <div className="row">
          <span className="cap">
            {capacity.active} of {capacity.max} active
          </span>
          <Link className="btn pri" href="/admin/clients/new">
            New client
          </Link>
        </div>
      </div>

      <section className="panel">
        <form className="row" method="get" style={{ marginBottom: 14 }}>
          <label className="f">
            Status
            <select className="field" name="status" defaultValue={status ?? ""}>
              <option value="">All statuses</option>
              {CLIENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {CLIENT_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
          <label className="f">
            Account exec
            <select className="field" name="ae" defaultValue={ae ?? ""}>
              <option value="">All account execs</option>
              {execs.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.full_name}
                  {e.active ? "" : " (deactivated)"}
                </option>
              ))}
            </select>
          </label>
          <div className="row" style={{ alignSelf: "flex-end", gap: 8 }}>
            <button className="btn" type="submit">
              Filter
            </button>
            {status || ae ? (
              <Link className="link" href="/admin/clients">
                Clear
              </Link>
            ) : null}
          </div>
        </form>

        {rows.length === 0 ? (
          <div className="empty-state">
            <h2>{status || ae ? "No clients match" : "No clients yet"}</h2>
            <p>
              {status || ae
                ? "Try a different filter."
                : "Add your first client to get started."}
            </p>
          </div>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Status</th>
                  <th>Account exec</th>
                  <th>Service</th>
                  <th className="num">Monthly fee</th>
                  <th>Start date</th>
                  <th>Brand kit</th>
                  <th>This month</th>
                  <th>Balance owed</th>
                  <th>Effective rate</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link
                        href={`/admin/clients/${c.id}`}
                        style={{ fontWeight: 700, color: "inherit" }}
                      >
                        {c.name}
                      </Link>
                      <div className="sub" style={{ margin: 0, fontSize: 13 }}>
                        {c.client_code}
                      </div>
                    </td>
                    <td>
                      <span className={`pill ${CLIENT_STATUS_PILL[c.status]}`}>
                        {CLIENT_STATUS_LABELS[c.status]}
                      </span>
                    </td>
                    <td>{c.account_exec_name ?? "—"}</td>
                    <td>{c.service_name ?? "—"}</td>
                    <td className="num">{formatMoney(c.monthly_fee)}</td>
                    <td>{formatDay(c.start_date)}</td>
                    {(() => {
                      const h = health.get(c.id);
                      if (!h)
                        return (
                          <td colSpan={4} className="sub">
                            —
                          </td>
                        );
                      return (
                        <>
                          <td>
                            {h.kitStatus
                              ? WORK_STATUS_LABELS[h.kitStatus]
                              : "—"}
                          </td>
                          <td>
                            <ProgressPill p={h.progress} />
                          </td>
                          <td>
                            <InvoicePill s={h.invoice} balance={h.balance} />
                          </td>
                          <td>
                            <RatePill
                              rate={h.rate}
                              threshold={overview.threshold}
                            />
                          </td>
                        </>
                      );
                    })()}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
