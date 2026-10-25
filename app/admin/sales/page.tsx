import type { Metadata } from "next";
import { LeadForm } from "@/components/admin/lead-form";
import { SalesBoard } from "@/components/admin/sales-board";
import { requireArea } from "@/lib/auth/session";
import { listLeadOwners, listLeads, salesNumbers } from "@/lib/data/sales";
import { formatMoney, todayInGaborone } from "@/lib/format";
import { LEAD_SOURCE_LABELS } from "@/lib/format/status";

export const metadata: Metadata = { title: "Sales" };

export default async function SalesPage() {
  const user = await requireArea("admin");
  const [leads, owners] = await Promise.all([listLeads(), listLeadOwners()]);
  const today = todayInGaborone();
  const n = salesNumbers(leads, today);

  return (
    <>
      <div className="head">
        <div>
          <h1>Sales</h1>
          <p className="sub">
            Drag a lead between columns, or change its stage from the menu on
            the card.
          </p>
        </div>
        <a className="btn pri" href="#new-lead">
          Add lead
        </a>
      </div>

      <div className="stat">
        <div>
          <span>Leads this month</span>
          <b>{n.thisMonth}</b>
        </div>
        <div>
          <span>Conversion, last 90 days</span>
          <b>
            {n.conversion == null ? "—" : `${Math.round(n.conversion * 100)}%`}
          </b>
          <span>
            {n.wonCount} won of {n.closedCount} closed
          </span>
        </div>
        <div>
          <span>Average deal value</span>
          <b>{formatMoney(n.averageDeal)}</b>
          <span>Won leads, last 90 days</span>
        </div>
        <div>
          <span>Leads by source, this month</span>
          <div className="chips" style={{ marginTop: 6 }}>
            {n.bySource.length ? (
              n.bySource.map((s) => (
                <span key={s.source} className="chip">
                  {LEAD_SOURCE_LABELS[s.source]} {s.count}
                </span>
              ))
            ) : (
              <span className="sub">None yet</span>
            )}
          </div>
        </div>
      </div>

      <SalesBoard
        today={today}
        leads={leads.map((l) => ({
          id: l.id,
          company: l.company,
          contact_name: l.contact_name,
          estimated_value: l.estimated_value,
          owner: l.owner,
          next_action: l.next_action,
          next_action_date: l.next_action_date,
          stage: l.stage,
          lost_reason: l.lost_reason,
          client_id: l.client_id,
        }))}
      />

      <section
        className="panel"
        id="new-lead"
        style={{ marginTop: 16, maxWidth: 760 }}
      >
        <h2 style={{ marginBottom: 12 }}>Add a lead</h2>
        <LeadForm owners={owners} defaultOwner={user.id} />
      </section>
    </>
  );
}
