import type { Metadata } from "next";
import Link from "next/link";
import {
  InvoicePill,
  ProgressPill,
  RatePill,
  TrendPill,
} from "@/components/admin/health-pills";
import { RevenueChart } from "@/components/admin/revenue-chart";
import { requireArea } from "@/lib/auth/session";
import { moneyTotals } from "@/lib/data/invoices";
import { getOverview } from "@/lib/data/overview";
import { formatMoney, todayInGaborone } from "@/lib/format";

export const metadata: Metadata = { title: "Overview" };

export default async function OverviewPage() {
  await requireArea("admin");
  const today = todayInGaborone();
  const [o, money] = await Promise.all([
    getOverview(today),
    moneyTotals(today),
  ]);
  const change = o.mrr - o.mrrLastMonth;
  const active = o.clients.filter((c) => c.status === "active");

  return (
    <>
      <div className="head">
        <div>
          <h1>Overview</h1>
          <p className="sub">
            The whole business at a glance. Every number opens the list behind
            it.
          </p>
        </div>
      </div>

      <div className="stat">
        <Link href="/admin/clients?status=active" className="tile-link">
          <span>Monthly recurring revenue</span>
          <b>{formatMoney(o.mrr)}</b>
          <span
            style={{
              color:
                change < 0
                  ? "var(--bad)"
                  : change > 0
                    ? "var(--good)"
                    : undefined,
            }}
          >
            {change === 0
              ? "Same as last month"
              : `${change > 0 ? "+" : "−"}${formatMoney(Math.abs(change))} on last month`}
          </span>
        </Link>
        <Link href="/admin/clients" className="tile-link">
          <span>Clients</span>
          <b>
            {o.capacity.active} / {o.capacity.max}
          </b>
          <span>
            {o.capacity.onboarding} onboarding · {o.capacity.paused} paused
          </span>
        </Link>
        <Link
          href={`/admin/invoices?month=${today.slice(0, 7)}`}
          className="tile-link"
        >
          <span>Collected this month</span>
          <b>{formatMoney(money.collectedThisMonth)}</b>
          <span>
            Owed {formatMoney(money.owed)}
            {money.overdueCount ? (
              <span style={{ color: "var(--bad)" }}>
                {" "}
                · {formatMoney(money.overdue)} overdue ({money.overdueCount})
              </span>
            ) : null}
          </span>
        </Link>
        <Link href="/admin/sales" className="tile-link">
          <span>Pipeline value</span>
          <b>{formatMoney(o.pipeline.value)}</b>
          <span>
            {o.pipeline.leads} open leads · {o.pipeline.quotesWaiting} quote
            {o.pipeline.quotesWaiting === 1 ? "" : "s"} waiting
          </span>
        </Link>
      </div>

      <div className="two">
        <section className="panel">
          <h2 style={{ marginBottom: 10 }}>Revenue by month</h2>
          <RevenueChart months={o.revenue} />
        </section>
        <section className="panel">
          <h2 style={{ marginBottom: 8 }}>Needs your attention</h2>
          {o.attention.length ? (
            <ul className="attention">
              {o.attention.slice(0, 12).map((a, i) => (
                <li key={i} className={a.tone}>
                  <Link href={a.href}>{a.text}</Link>
                </li>
              ))}
              {o.attention.length > 12 ? (
                <li className="sub">And {o.attention.length - 12} more.</li>
              ) : null}
            </ul>
          ) : (
            <p className="sub" style={{ margin: 0 }}>
              Nothing needs you right now.
            </p>
          )}
        </section>
      </div>

      <section className="panel" style={{ marginTop: 16 }}>
        <h2 style={{ marginBottom: 10 }}>Client health</h2>
        {active.length ? (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Content this month</th>
                  <th>Main goal</th>
                  <th>Effective rate</th>
                  <th>Invoices</th>
                </tr>
              </thead>
              <tbody>
                {active.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/admin/clients/${c.id}`}>
                        <b>{c.name}</b>
                      </Link>
                    </td>
                    <td>
                      <ProgressPill p={c.progress} />
                    </td>
                    <td>
                      <TrendPill g={c.goal} />
                    </td>
                    <td>
                      <RatePill rate={c.rate} threshold={o.threshold} />
                    </td>
                    <td>
                      <InvoicePill s={c.invoice} balance={c.balance} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="sub" style={{ margin: 0 }}>
            No active clients yet.
          </p>
        )}
      </section>
    </>
  );
}
