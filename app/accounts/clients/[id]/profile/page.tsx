import type { Metadata } from "next";
import { ClientHeader } from "@/components/accounts/client-header";
import {
  Baseline,
  MainGoal,
  PillarMix,
  ProfileDetails,
} from "@/components/accounts/profile-form";
import { clientOr404 } from "@/lib/accounts/page";
import { formatDay, formatMoney } from "@/lib/format";
import { CLIENT_STATUS_LABELS } from "@/lib/format/status";

export const metadata: Metadata = { title: "Client profile" };

export default async function ProfilePage({
  params,
}: PageProps<"/accounts/clients/[id]/profile">) {
  const { id } = await params;
  const client = await clientOr404(id);
  return (
    <>
      <ClientHeader client={client} tab="profile" />
      <div className="two">
        <div className="stack">
          <section className="panel">
            <h2 style={{ marginBottom: 12 }}>Details</h2>
            <ProfileDetails client={client} />
          </section>
          <section className="panel">
            <h2>Post pillar mix</h2>
            <PillarMix clientId={id} initial={client.pillar_mix} />
          </section>
        </div>
        <div className="stack">
          <section className="panel">
            <h2>Client&apos;s main goal</h2>
            <p className="sub" style={{ marginBottom: 12 }}>
              Agreed at kick-off. Their KPI tab highlights it.
            </p>
            <MainGoal
              clientId={id}
              initial={client.main_goal}
              notes={client.expectation_notes}
            />
          </section>
          <section className="panel">
            <h2>Baseline</h2>
            <p className="sub" style={{ marginBottom: 12 }}>
              Recorded during the Phase 1 platform audit. Month 1 KPIs compare
              against these.
            </p>
            <Baseline clientId={id} initial={client.baseline} />
          </section>
          <section className="panel">
            <h2 style={{ marginBottom: 10 }}>Account</h2>
            <div className="kv">
              <span>Client ID</span>
              <span>{client.client_code}</span>
              <span>Status</span>
              <span>{CLIENT_STATUS_LABELS[client.status]}</span>
              <span>Service</span>
              <span>{client.serviceName ?? "—"}</span>
              <span>Monthly fee</span>
              <span>{formatMoney(client.monthly_fee)}</span>
              <span>Start date</span>
              <span>{formatDay(client.start_date)}</span>
              <span>Account exec</span>
              <span>{client.accountExecName ?? "—"}</span>
            </div>
            <p className="sub" style={{ fontSize: 13, marginTop: 10 }}>
              The CEO changes these in the CEO dashboard.
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
