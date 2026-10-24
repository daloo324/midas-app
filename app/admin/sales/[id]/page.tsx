import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LeadForm } from "@/components/admin/lead-form";
import { RemoveLeadButton } from "@/components/admin/remove-lead-button";
import { WinLeadForm } from "@/components/admin/win-lead-form";
import { getLead, listLeadOwners } from "@/lib/data/sales";
import { formatDay, formatMoney } from "@/lib/format";
import {
  LEAD_STAGE_LABELS,
  LOST_REASON_LABELS,
  QUOTE_STATUS_LABELS,
  QUOTE_STATUS_PILL,
} from "@/lib/format/status";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Lead" };

export default async function LeadPage({
  params,
}: PageProps<"/admin/sales/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const lead = await getLead(id);
  if (!lead) notFound();

  const supabase = await createClient();
  const [owners, { data: quotes }, { data: execs }, { data: services }] =
    await Promise.all([
      listLeadOwners(),
      supabase
        .from("quotes")
        .select(
          "id, number, status, total, issue_date, valid_until, created_at, quote_lines(service_id, unit_price)",
        )
        .eq("lead_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("profiles")
        .select("id, full_name")
        .eq("role", "account_exec")
        .eq("active", true)
        .order("full_name"),
      supabase
        .from("services")
        .select("id, name, price, is_retainer")
        .eq("active", true)
        .order("sort"),
    ]);

  // The service and fee from the accepted quote, when there is one.
  const accepted = (quotes ?? []).find((q) => q.status === "accepted");
  const agreed = new Map(
    (accepted?.quote_lines ?? [])
      .filter((l) => l.service_id)
      .map((l) => [l.service_id!, Number(l.unit_price)]),
  );
  const serviceOptions = (services ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    price: Number(s.price),
    agreed: agreed.get(s.id),
  }));
  const defaultService =
    serviceOptions.find(
      (s) =>
        s.agreed != null && services?.find((x) => x.id === s.id)?.is_retainer,
    ) ??
    serviceOptions.find((s) => s.agreed != null) ??
    serviceOptions.find(
      (s) => services?.find((x) => x.id === s.id)?.is_retainer,
    );

  return (
    <>
      <div className="crumbs">
        <Link href="/admin/sales" style={{ color: "inherit" }}>
          Sales
        </Link>{" "}
        / {lead.company}
      </div>
      <div className="head">
        <div>
          <h1>{lead.company}</h1>
          <p className="sub row" style={{ gap: 10 }}>
            <span className="pill s-info">{LEAD_STAGE_LABELS[lead.stage]}</span>
            {lead.stage === "lost" && lead.lost_reason ? (
              <span>Lost: {LOST_REASON_LABELS[lead.lost_reason]}</span>
            ) : null}
            <span>Added {formatDay(lead.created_at)}</span>
          </p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <Link className="btn pri" href={`/admin/quotes/new?lead=${lead.id}`}>
            New quote
          </Link>
        </div>
      </div>

      <div className="two">
        <section className="panel">
          <h2 style={{ marginBottom: 12 }}>Lead</h2>
          <LeadForm lead={lead} owners={owners} />
          {!lead.client_id && !quotes?.length ? (
            <div style={{ marginTop: 14 }}>
              <RemoveLeadButton id={lead.id} />
            </div>
          ) : null}
        </section>
        <div className="stack">
          {lead.client_id ? (
            <section className="panel">
              <h2>Client</h2>
              <p className="sub">This lead became a client.</p>
              <Link className="btn" href={`/admin/clients/${lead.client_id}`}>
                Open the client
              </Link>
            </section>
          ) : lead.stage === "won" ? (
            <section className="panel" id="win">
              <h2>Create the client</h2>
              <p className="sub" style={{ marginBottom: 12 }}>
                Copies the company and contact details into a new client in
                Onboarding, with the service and fee from the accepted quote.
              </p>
              <WinLeadForm
                leadId={lead.id}
                execs={execs ?? []}
                services={serviceOptions}
                defaultServiceId={defaultService?.id}
              />
            </section>
          ) : null}
          <section className="panel">
            <h2 style={{ marginBottom: 8 }}>Quotes</h2>
            {quotes?.length ? (
              <div className="list">
                {quotes.map((q) => (
                  <div key={q.id}>
                    <Link href={`/admin/quotes/${q.number ?? q.id}`}>
                      {q.number ?? "Draft quote"}
                    </Link>
                    <span className="row" style={{ gap: 8 }}>
                      <span className="num">{formatMoney(q.total)}</span>
                      <span className={`pill ${QUOTE_STATUS_PILL[q.status]}`}>
                        {QUOTE_STATUS_LABELS[q.status]}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="sub">No quotes yet.</p>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
