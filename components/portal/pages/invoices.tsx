import { getPortalClient } from "@/lib/data/portal";
import { formatMoney } from "@/lib/format";
import type { Viewer } from "@/lib/portal/viewer";

// Invoices themselves arrive in Phase 5; until then the page shows the totals
// it can and an empty list (PHASES.md, Phase 4).
export async function InvoicesPage({ viewer }: { viewer: Viewer }) {
  const client = await getPortalClient(viewer.clientId);
  return (
    <>
      <div className="head">
        <div>
          <h1>Invoices</h1>
          <p className="sub">
            Your retainer is invoiced on the 1st of each month. Ad budgets are
            paid by you directly to Meta and never appear on Midas invoices.
          </p>
        </div>
      </div>
      <div className="g3" style={{ marginBottom: 16 }}>
        <div className="panel">
          <div className="label">Balance due</div>
          <div className="big" style={{ marginTop: 8 }}>
            {formatMoney(0)}
          </div>
          <p className="sub">Nothing outstanding</p>
        </div>
        <div className="panel">
          <div className="label">Paid this year</div>
          <div className="big" style={{ marginTop: 8 }}>
            {formatMoney(0)}
          </div>
        </div>
        <div className="panel">
          <div className="label">Monthly fee</div>
          <div className="big" style={{ marginTop: 8 }}>
            {formatMoney(client?.monthly_fee)}
          </div>
          <p className="sub">{client?.service_name ?? ""}</p>
        </div>
      </div>
      <div className="panel">
        <p className="sub" style={{ margin: 0 }}>
          No invoices yet. Each one appears here when Midas issues it.
        </p>
      </div>
    </>
  );
}
