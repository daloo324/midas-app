import type { Metadata } from "next";
import Link from "next/link";
import {
  MarketingForm,
  type MarketingValues,
} from "@/components/admin/marketing-form";
import { requireArea } from "@/lib/auth/session";
import { monthLabel, shiftMonth } from "@/lib/content/constants";
import { gaborone } from "@/lib/data/sales";
import { todayInGaborone } from "@/lib/format";
import { LEAD_SOURCES, LEAD_SOURCE_LABELS } from "@/lib/format/status";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Marketing" };

const num = (n: unknown) =>
  typeof n === "number" ? n.toLocaleString("en-GB") : "—";
const rate = (i: unknown, r: unknown) =>
  typeof i === "number" && typeof r === "number" && r > 0
    ? `${((i / r) * 100).toFixed(1)}%`
    : "—";

export default async function MarketingPage({
  searchParams,
}: PageProps<"/admin/marketing">) {
  await requireArea("admin");
  const sp = await searchParams;
  const today = todayInGaborone();
  const thisMonth = `${today.slice(0, 7)}-01`;
  const months = Array.from({ length: 12 }, (_, i) =>
    shiftMonth(thisMonth, -i),
  );
  const chosen =
    typeof sp.month === "string" && /^\d{4}-\d{2}$/.test(sp.month)
      ? `${sp.month}-01`
      : shiftMonth(thisMonth, -1);
  const supabase = await createClient();
  const [{ data: rows }, { data: leads }] = await Promise.all([
    supabase
      .from("metric_daily")
      .select("channel, day, metrics, source")
      .is("client_id", null)
      .gte("day", months.at(-1)!)
      .order("day", { ascending: false }),
    supabase
      .from("leads")
      .select("source, stage, created_at")
      .gte("created_at", `${shiftMonth(thisMonth, -11)}T00:00:00+02:00`),
  ]);
  const get = (channel: string, day: string) =>
    (rows?.find((r) => r.channel === channel && r.day === day)?.metrics ??
      {}) as Record<string, unknown>;
  const values: MarketingValues = {
    facebook: get("facebook", chosen) as MarketingValues["facebook"],
    instagram: get("instagram", chosen) as MarketingValues["instagram"],
    website: get("website", chosen) as MarketingValues["website"],
  };
  const leadMonths = months.slice(0, 6).reverse();
  const bySource = LEAD_SOURCES.map((s) => {
    const mine = (leads ?? []).filter((l) => l.source === s);
    const closed = mine.filter((l) => l.stage === "won" || l.stage === "lost");
    const won = closed.filter((l) => l.stage === "won").length;
    return {
      source: s,
      perMonth: leadMonths.map(
        (m) =>
          mine.filter(
            (l) => gaborone(l.created_at).slice(0, 7) === m.slice(0, 7),
          ).length,
      ),
      total: mine.length,
      conversion: closed.length
        ? `${Math.round((won / closed.length) * 100)}% (${won} of ${closed.length})`
        : "—",
    };
  }).filter((r) => r.total > 0);

  return (
    <>
      <div className="head">
        <div>
          <h1>Marketing</h1>
          <p className="sub">
            Midas&apos;s own channels. Enter each month&apos;s figures by hand
            until Meta and Google Analytics are connected in Phase 6.
          </p>
        </div>
      </div>

      <section className="panel">
        <div
          className="row between"
          style={{ marginBottom: 12, flexWrap: "wrap", gap: 8 }}
        >
          <h2>Figures for {monthLabel(chosen)}</h2>
          <form className="row" style={{ gap: 8 }}>
            <select
              className="field"
              name="month"
              defaultValue={chosen.slice(0, 7)}
              aria-label="Month"
            >
              {months.map((m) => (
                <option key={m} value={m.slice(0, 7)}>
                  {monthLabel(m)}
                </option>
              ))}
            </select>
            <button className="btn" type="submit">
              Open
            </button>
          </form>
        </div>
        <MarketingForm month={chosen.slice(0, 7)} values={values} />
      </section>

      <section className="panel" style={{ marginTop: 16 }}>
        <h2 style={{ marginBottom: 10 }}>By month</h2>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Month</th>
                <th className="num-c">Facebook followers</th>
                <th className="num-c">Facebook reach</th>
                <th className="num-c">Facebook engagement</th>
                <th className="num-c">Instagram followers</th>
                <th className="num-c">Instagram reach</th>
                <th className="num-c">Instagram engagement</th>
                <th className="num-c">Website visitors</th>
                <th className="num-c">Enquiries</th>
              </tr>
            </thead>
            <tbody>
              {months.map((m) => {
                const fb = get("facebook", m);
                const ig = get("instagram", m);
                const web = get("website", m);
                return (
                  <tr key={m}>
                    <td>
                      <Link href={`?month=${m.slice(0, 7)}`}>
                        {monthLabel(m)}
                      </Link>
                    </td>
                    <td className="num-c">{num(fb.followers)}</td>
                    <td className="num-c">{num(fb.reach)}</td>
                    <td className="num-c">{rate(fb.interactions, fb.reach)}</td>
                    <td className="num-c">{num(ig.followers)}</td>
                    <td className="num-c">{num(ig.reach)}</td>
                    <td className="num-c">{rate(ig.interactions, ig.reach)}</td>
                    <td className="num-c">{num(web.visitors)}</td>
                    <td className="num-c">{num(web.enquiries)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="sub" style={{ marginTop: 8 }}>
          Engagement rate is interactions ÷ accounts reached.
        </p>
      </section>

      <section className="panel" style={{ marginTop: 16 }}>
        <h2 style={{ marginBottom: 10 }}>Leads by source</h2>
        {bySource.length ? (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Source</th>
                  {leadMonths.map((m) => (
                    <th key={m} className="num-c">
                      {monthLabel(m).slice(0, 3)}
                    </th>
                  ))}
                  <th className="num-c">12 months</th>
                  <th>Conversion (won ÷ closed)</th>
                </tr>
              </thead>
              <tbody>
                {bySource.map((r) => (
                  <tr key={r.source}>
                    <td>{LEAD_SOURCE_LABELS[r.source]}</td>
                    {r.perMonth.map((n, i) => (
                      <td key={i} className="num-c">
                        {n}
                      </td>
                    ))}
                    <td className="num-c">{r.total}</td>
                    <td>{r.conversion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="sub" style={{ margin: 0 }}>
            No leads in the last 12 months. Add them on the{" "}
            <Link href="/admin/sales">Sales</Link> page.
          </p>
        )}
      </section>
    </>
  );
}
