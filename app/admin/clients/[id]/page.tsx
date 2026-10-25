import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClientAccountForm } from "@/components/admin/client-account-form";
import { ClientLogins } from "@/components/shared/client-logins";
import { ClientRecordForm } from "@/components/admin/client-record-form";
import { RemindersSwitch } from "@/components/admin/reminders-switch";
import { getClientRecordExtras } from "@/lib/data/client-record";
import {
  getClient,
  listAccountExecs,
  listClientLogins,
  listServices,
} from "@/lib/data/clients";
import { formatDateTime, formatDay, formatMoney } from "@/lib/format";
import {
  CLIENT_STATUS_LABELS,
  CLIENT_STATUS_PILL,
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_PILL,
} from "@/lib/format/status";

export const metadata: Metadata = { title: "Client" };

export default async function ClientRecordPage({
  params,
}: PageProps<"/admin/clients/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const [client, logins, execs, services, extras] = await Promise.all([
    getClient(id),
    listClientLogins(id),
    listAccountExecs(),
    listServices(),
    getClientRecordExtras(id),
  ]);
  if (!client) notFound();

  const execOptions = execs
    .filter((e) => e.active || e.id === client.account_exec_id)
    .map((e) => ({
      id: e.id,
      label: e.active ? e.full_name : `${e.full_name} (deactivated)`,
    }));
  const serviceOptions = services
    .filter((s) => s.active || s.id === client.service_id)
    .map((s) => ({ id: s.id, name: s.name, price: s.price }));

  return (
    <>
      <div className="crumbs">
        <Link href="/admin/clients" style={{ color: "inherit" }}>
          Clients
        </Link>{" "}
        / {client.name}
      </div>
      <div className="head">
        <div>
          <h1>{client.name}</h1>
          <p className="sub row" style={{ gap: 10 }}>
            <span>{client.client_code}</span>
            <span className={`pill ${CLIENT_STATUS_PILL[client.status]}`}>
              {CLIENT_STATUS_LABELS[client.status]}
            </span>
            <span>Added {formatDay(client.created_at)}</span>
            {extras.lead ? (
              <span>
                From lead{" "}
                <Link href={`/admin/sales/${extras.lead.id}`}>
                  {extras.lead.company}
                </Link>
              </span>
            ) : null}
          </p>
        </div>
        <Link className="btn" href={`/portal/preview/${client.id}`}>
          Preview their portal
        </Link>
      </div>

      <div className="two">
        <div className="stack">
          <section className="panel">
            <h2 style={{ marginBottom: 14 }}>Profile</h2>
            <ClientRecordForm client={client} />
          </section>
          <section className="panel">
            <h2>Client logins</h2>
            <p className="sub" style={{ marginBottom: 14 }}>
              Each login gets its own client ID and a welcome email with a link
              to set a password.
            </p>
            <ClientLogins clientId={client.id} logins={logins} />
          </section>
        </div>
        <div className="stack">
          <section className="panel">
            <h2 style={{ marginBottom: 14 }}>Account</h2>
            <ClientAccountForm
              client={client}
              execs={execOptions}
              services={serviceOptions}
            />
          </section>
          <section className="panel">
            <div className="row between" style={{ marginBottom: 8 }}>
              <h2>Invoices</h2>
              <Link
                className="btn sm"
                href={`/admin/invoices?client=${client.id}`}
              >
                All invoices
              </Link>
            </div>
            {extras.invoices.length ? (
              <div className="list">
                {extras.invoices.slice(0, 8).map((i) => (
                  <div key={i.id}>
                    <Link href={`/admin/invoices/${i.number ?? i.id}`}>
                      {i.number ?? "Draft"}{" "}
                      {i.period_label ? `· ${i.period_label}` : ""}
                    </Link>
                    <span className="row" style={{ gap: 8 }}>
                      <span className="num">{formatMoney(i.total)}</span>
                      <span className={`pill ${INVOICE_STATUS_PILL[i.status]}`}>
                        {INVOICE_STATUS_LABELS[i.status]}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="sub">No invoices yet.</p>
            )}
            <div style={{ marginTop: 12 }}>
              <RemindersSwitch
                clientId={client.id}
                enabled={extras.remindersEnabled}
              />
            </div>
          </section>
          <section className="panel">
            <h2 style={{ marginBottom: 8 }}>
              Time and profitability since the start
            </h2>
            <div className="kv">
              <span>Invoiced</span>
              <span>{formatMoney(extras.invoicedTotal)}</span>
              <span>Paid</span>
              <span>{formatMoney(extras.paidTotal)}</span>
              <span>Design hours</span>
              <span>{extras.hoursTotal.toLocaleString("en-GB")}</span>
              <span>Paid per design hour</span>
              <span>
                {extras.ratePaid == null ? "—" : formatMoney(extras.ratePaid)}
              </span>
            </div>
          </section>
          <section className="panel">
            <h2 style={{ marginBottom: 8 }}>Status history</h2>
            <div className="list">
              {extras.history.map((h, i) => (
                <div key={i}>
                  <span>
                    {h.from
                      ? `${CLIENT_STATUS_LABELS[h.from]} → `
                      : "Added as "}
                    {CLIENT_STATUS_LABELS[h.to]}
                    {h.by ? ` · ${h.by}` : ""}
                  </span>
                  <span className="sub">{formatDateTime(h.at)}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
