import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClientAccountForm } from "@/components/admin/client-account-form";
import { ClientLogins } from "@/components/shared/client-logins";
import { ClientRecordForm } from "@/components/admin/client-record-form";
import {
  getClient,
  listAccountExecs,
  listClientLogins,
  listServices,
} from "@/lib/data/clients";
import { formatDay } from "@/lib/format";
import { CLIENT_STATUS_LABELS, CLIENT_STATUS_PILL } from "@/lib/format/status";

export const metadata: Metadata = { title: "Client" };

export default async function ClientRecordPage({
  params,
}: PageProps<"/admin/clients/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const [client, logins, execs, services] = await Promise.all([
    getClient(id),
    listClientLogins(id),
    listAccountExecs(),
    listServices(),
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
        <section className="panel">
          <h2 style={{ marginBottom: 14 }}>Account</h2>
          <ClientAccountForm
            client={client}
            execs={execOptions}
            services={serviceOptions}
          />
        </section>
      </div>
    </>
  );
}
