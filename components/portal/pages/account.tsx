import Link from "next/link";
import { getPortalClient, getPortalKit } from "@/lib/data/portal";
import { formatDay, formatMoney } from "@/lib/format";
import type { Viewer } from "@/lib/portal/viewer";
import { PasswordForm } from "../password-form";

export async function AccountPage({ viewer }: { viewer: Viewer }) {
  const [client, kit] = await Promise.all([
    getPortalClient(viewer.clientId),
    getPortalKit(viewer.clientId),
  ]);
  const guide =
    kit?.status === "approved"
      ? kit.files.find((f) => f.slot === "guide_pdf")
      : undefined;
  return (
    <>
      <div className="head">
        <div>
          <h1>Account</h1>
          <p className="sub">
            Your plan, your team at Midas and your key documents.
          </p>
        </div>
      </div>
      <div className="g2">
        <div className="stack">
          <section className="panel">
            <div className="row between">
              <h2>{client?.service_name ?? "Your plan"}</h2>
              <span
                className={`pill ${client?.status === "active" ? "s-good" : "s-info"}`}
              >
                {client?.status === "active" ? "Active" : "Getting started"}
              </span>
            </div>
            <p className="sub">
              {formatMoney(client?.monthly_fee)} a month
              {client?.start_date
                ? ` · since ${formatDay(client.start_date)}`
                : ""}
            </p>
            <div className="plist" style={{ marginTop: 12 }}>
              {(client?.service_inclusions ?? []).map((x) => (
                <div key={x}>
                  <span>{x}</span>
                  <b>Included</b>
                </div>
              ))}
            </div>
          </section>
          <section className="panel">
            <h2>Documents</h2>
            <div className="plist" style={{ marginTop: 10 }}>
              <div>
                <span>
                  <b>Service agreement</b>
                  <br />
                  <span className="sub" style={{ margin: 0 }}>
                    Your account executive will add it here
                  </span>
                </span>
                <span className="sub" style={{ margin: 0 }}>
                  Not uploaded yet
                </span>
              </div>
              <div>
                <span>
                  <b>Brand brief</b>
                  <br />
                  <span className="sub" style={{ margin: 0 }}>
                    From your discovery questionnaire
                  </span>
                </span>
                <Link className="btn sm" href={`${viewer.base}/account/brief`}>
                  View
                </Link>
              </div>
              <div>
                <span>
                  <b>Brand guide</b>
                  <br />
                  <span className="sub" style={{ margin: 0 }}>
                    {kit?.signed_off_at
                      ? `Signed off ${formatDay(kit.signed_off_at.slice(0, 10))}`
                      : "After you sign off your brand kit"}
                  </span>
                </span>
                {guide?.url ? (
                  <a
                    className="btn sm"
                    href={guide.url}
                    download={guide.file_name}
                  >
                    Download
                  </a>
                ) : (
                  <span className="sub" style={{ margin: 0 }}>
                    —
                  </span>
                )}
              </div>
            </div>
          </section>
        </div>
        <div className="stack">
          <section className="panel">
            <h2>Your account executive</h2>
            <p style={{ margin: "10px 0 4px" }}>
              <b>{client?.account_exec_name ?? "Not assigned yet"}</b>
              <br />
              <span className="sub">Account executive</span>
            </p>
            <div className="plist">
              <div>
                <span>Email</span>
                <b style={{ userSelect: "all" }}>
                  {client?.account_exec_email ?? "—"}
                </b>
              </div>
              <div>
                <span>Phone / WhatsApp</span>
                <b style={{ userSelect: "all" }}>
                  {client?.account_exec_phone ?? "—"}
                </b>
              </div>
              <div>
                <span>Hours</span>
                <b>Mon–Fri, 8am–5pm</b>
              </div>
            </div>
          </section>
          <section className="panel">
            <h2>Sign-in</h2>
            <div className="plist" style={{ marginTop: 10 }}>
              <div>
                <span>Client ID</span>
                <b>{viewer.loginId ?? client?.client_code}</b>
              </div>
            </div>
            {viewer.readOnly ? (
              <p className="sub">Preview only.</p>
            ) : (
              <PasswordForm />
            )}
            <p className="sub">
              Your client ID is unique to {viewer.clientName}. Need a login for
              someone else on your team? Ask your account executive.
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
