import type { Metadata } from "next";
import Link from "next/link";
import { IssueDrafts, RetainerRun } from "@/components/admin/invoice-forms";
import { listInvoices } from "@/lib/data/invoices";
import { todayInGaborone } from "@/lib/format";

export const metadata: Metadata = { title: "Retainer drafts" };

export default async function RetainerDraftsPage() {
  const today = todayInGaborone();
  const drafts = (await listInvoices({ status: "draft" }, today)).filter(
    (i) => i.is_retainer,
  );
  return (
    <>
      <div className="crumbs">
        <Link href="/admin/invoices" style={{ color: "inherit" }}>
          Invoices
        </Link>{" "}
        / Retainer drafts
      </div>
      <div className="head">
        <div>
          <h1>Retainer drafts</h1>
          <p className="sub">
            On the 1st, a draft is made for each active client: one line, their
            service and month, at their fee. Check them, open any that need a
            change, then issue them together.
          </p>
        </div>
        <RetainerRun month={`${today.slice(0, 7)}-01`} />
      </div>
      <section className="panel">
        {drafts.length ? (
          <IssueDrafts
            drafts={drafts.map((d) => ({
              id: d.id,
              client: d.client.name,
              label: d.lines.map((l) => l.name).join(", "),
              total: d.total,
              email: !!d.client.contact_email,
            }))}
          />
        ) : (
          <p className="sub" style={{ margin: 0 }}>
            No retainer drafts waiting. They appear here on the 1st of each
            month.
          </p>
        )}
      </section>
    </>
  );
}
