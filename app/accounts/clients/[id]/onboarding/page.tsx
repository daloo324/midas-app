import type { Metadata } from "next";
import { ClientHeader } from "@/components/accounts/client-header";
import {
  ActivateButton,
  QuestionnaireLink,
} from "@/components/accounts/onboarding";
import { ClientLogins } from "@/components/shared/client-logins";
import { clientOr404 } from "@/lib/accounts/page";
import { appUrl } from "@/lib/auth/links";
import { WORK_STATUS_LABELS, WORK_STATUS_PILL } from "@/lib/content/constants";
import { listClientLogins } from "@/lib/data/clients";
import { getOnboarding } from "@/lib/data/accounts";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Onboarding" };

export default async function OnboardingPage({
  params,
}: PageProps<"/accounts/clients/[id]/onboarding">) {
  const { id } = await params;
  const client = await clientOr404(id);
  const [{ brief, invite }, logins] = await Promise.all([
    getOnboarding(id),
    listClientLogins(id),
  ]);
  const now = new Date().toISOString();
  const open =
    invite && !invite.used_at && invite.expires_at > now ? invite : null;
  const submitted = Boolean(brief?.submitted_at);
  const sections = brief
    ? [...new Set(brief.answers.map((a) => a.section))]
    : [];
  const kitApproved = client.kitStatus === "approved";

  return (
    <>
      <ClientHeader client={client} tab="onboarding" />
      <div className="two">
        <div className="stack">
          <section className="panel">
            <h2 style={{ marginBottom: 6 }}>1 · Questionnaire link</h2>
            <p className="sub" style={{ marginBottom: 12 }}>
              Send this link to the client. It works once, for 30 days. Making a
              new link stops the old one.
            </p>
            <QuestionnaireLink
              clientId={id}
              link={open ? `${appUrl()}/start/${open.token}` : null}
              hasBrief={submitted}
            />
            <div className="kv" style={{ marginTop: 12 }}>
              <span>Link made</span>
              <span>{invite ? formatDateTime(invite.created_at) : "—"}</span>
              <span>Opened</span>
              <span>
                {invite?.opened_at
                  ? formatDateTime(invite.opened_at)
                  : "Not yet"}
              </span>
              <span>Answers</span>
              <span>
                {brief?.submitted_at
                  ? formatDateTime(brief.submitted_at)
                  : "Not yet"}
              </span>
              {open ? (
                <>
                  <span>Works until</span>
                  <span>{formatDateTime(open.expires_at)}</span>
                </>
              ) : null}
            </div>
          </section>

          <section className="panel">
            <h2 style={{ marginBottom: 12 }}>2 · Brief</h2>
            {!brief ? (
              <p className="sub" style={{ margin: 0 }}>
                The client&apos;s answers show here once they send the
                questionnaire.
              </p>
            ) : (
              <div className="stack" style={{ gap: 14 }}>
                {sections.map((s) => {
                  const answers = brief.answers.filter((a) => a.section === s);
                  const images = brief.uploads.filter((u) => u.section === s);
                  return (
                    <div key={s}>
                      <h3 style={{ marginBottom: 6 }}>{s}</h3>
                      <dl
                        className="kv"
                        style={{
                          gridTemplateColumns:
                            "minmax(0, 220px) minmax(0, 1fr)",
                          margin: 0,
                        }}
                      >
                        {answers.map((a) => (
                          <Answer
                            key={a.question}
                            q={a.question}
                            a={a.answer}
                          />
                        ))}
                      </dl>
                      {images.length ? (
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              "repeat(auto-fill, minmax(140px, 1fr))",
                            gap: 10,
                            marginTop: 10,
                          }}
                        >
                          {images.map((u) => (
                            <figure
                              key={u.path}
                              style={{
                                margin: 0,
                                border: "1px solid var(--line)",
                                borderRadius: 10,
                                overflow: "hidden",
                                background: "var(--surface-2)",
                              }}
                            >
                              {u.url ? (
                                // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL
                                <img
                                  src={u.url}
                                  alt={u.note || u.question}
                                  style={{
                                    width: "100%",
                                    aspectRatio: "4 / 3",
                                    objectFit: "contain",
                                    display: "block",
                                  }}
                                />
                              ) : null}
                              <figcaption
                                style={{
                                  fontSize: 12,
                                  padding: "6px 8px",
                                  color: "var(--muted)",
                                }}
                              >
                                <b style={{ color: "var(--ink)" }}>
                                  {u.question}
                                </b>
                                {u.note ? ` · ${u.note}` : ""}
                              </figcaption>
                            </figure>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <div className="stack">
          <section className="panel">
            <h2 style={{ marginBottom: 10 }}>3 · Brand kit</h2>
            <div className="kv">
              <span>Status</span>
              <span>
                <span className={`pill ${WORK_STATUS_PILL[client.kitStatus]}`}>
                  {WORK_STATUS_LABELS[client.kitStatus]}
                </span>
              </span>
            </div>
            <p className="sub" style={{ fontSize: 13, marginTop: 10 }}>
              The designers build the kit in the Design Studio. Items ready out
              of 25 show here once that&apos;s built (Phase 3).
            </p>
          </section>

          <section className="panel">
            <h2 style={{ marginBottom: 12 }}>4 · Client logins</h2>
            <ClientLogins clientId={id} logins={logins} />
          </section>

          <section className="panel">
            <h2 style={{ marginBottom: 6 }}>5 · Activate</h2>
            {client.status === "onboarding" ? (
              <>
                <p className="sub" style={{ marginBottom: 12 }}>
                  {kitApproved
                    ? "The brand kit is signed off. Activating unlocks month planning."
                    : "You can activate the client once their brand kit is approved."}
                </p>
                <ActivateButton clientId={id} ready={kitApproved} />
              </>
            ) : (
              <p className="sub" style={{ margin: 0 }}>
                This client is{" "}
                {client.status === "active" ? "active" : client.status}.
              </p>
            )}
          </section>
        </div>
      </div>
    </>
  );
}

function Answer({ q, a }: { q: string; a: string }) {
  return (
    <>
      <dt style={{ color: "var(--muted)" }}>{q}</dt>
      <dd
        style={{
          margin: 0,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          fontWeight: 500,
          textAlign: "left",
        }}
      >
        {a || (
          <span style={{ color: "var(--muted)", fontStyle: "italic" }}>
            Not answered
          </span>
        )}
      </dd>
    </>
  );
}
