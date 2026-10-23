import type { Metadata } from "next";
import { StudioHeader } from "@/components/creative/client-header";
import { DesignNotes } from "@/components/creative/design-notes";
import { studioClientOr404 } from "@/lib/creative/page";
import { getBriefForStudio } from "@/lib/data/creative";
import { formatDay } from "@/lib/format";

export const metadata: Metadata = { title: "Brand brief" };

export default async function BriefPage({
  params,
}: PageProps<"/creative/clients/[id]/brief">) {
  const { id } = await params;
  const client = await studioClientOr404(id);
  const brief = await getBriefForStudio(id);
  const answered = brief.answers.filter((a) => a.answer.trim() !== "");
  const sections = [...new Set(brief.answers.map((a) => a.section))];

  return (
    <>
      <StudioHeader
        client={client}
        tab="brief"
        sub={
          brief.submitted_at
            ? undefined
            : `${client.industry ?? ""} · Brand brief not received yet`
        }
      />
      <p className="sub" style={{ margin: "-6px 0 14px" }}>
        {brief.submitted_at
          ? `From the brand questionnaire, sent ${formatDay(brief.submitted_at.slice(0, 10))}. Unanswered questions are hidden.`
          : "The client's questionnaire answers appear here once they send it."}
      </p>
      <div className="two">
        <div className="panel">
          {answered.length === 0 ? (
            <p className="sub" style={{ margin: 0 }}>
              No answers yet. The account exec sends the questionnaire link from
              onboarding.
            </p>
          ) : (
            sections.map((s) => {
              const rows = answered.filter((a) => a.section === s);
              const images = brief.uploads.filter(
                (u) => u.section === s && u.url,
              );
              if (!rows.length && !images.length) return null;
              return (
                <div className="brief-sec" key={s}>
                  <h3>{s}</h3>
                  <dl style={{ margin: 0 }}>
                    {rows.map((r) => (
                      <div className="brief-row" key={r.question}>
                        <dt>{r.question}</dt>
                        <dd>{r.answer}</dd>
                      </div>
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
                          }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL */}
                          <img
                            src={u.url!}
                            alt={u.note || u.question || "Client image"}
                            style={{
                              width: "100%",
                              aspectRatio: "4 / 3",
                              objectFit: "contain",
                              background: "var(--surface-2)",
                            }}
                          />
                          <figcaption
                            style={{
                              fontSize: 12,
                              padding: "6px 8px",
                              color: "var(--muted)",
                            }}
                          >
                            <b style={{ color: "var(--ink)" }}>{u.question}</b>
                            {u.note ? ` · ${u.note}` : ""}
                          </figcaption>
                        </figure>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
        <div className="panel">
          <h2>Designer notes</h2>
          <p className="sub" style={{ marginBottom: 10 }}>
            What the brief means for the work: do&apos;s, don&apos;ts, recurring
            motifs. Shared by the whole team.
          </p>
          <DesignNotes clientId={id} notes={brief.design_notes} />
        </div>
      </div>
    </>
  );
}
