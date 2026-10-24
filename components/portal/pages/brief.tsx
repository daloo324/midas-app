import Link from "next/link";
import { getBrief } from "@/lib/data/portal";
import { formatDay } from "@/lib/format";
import type { Viewer } from "@/lib/portal/viewer";

/** The brand brief from the questionnaire, laid out to read or print. */
export async function BriefPage({ viewer }: { viewer: Viewer }) {
  const brief = await getBrief(viewer.clientId);
  const answered = (brief?.answers ?? []).filter((a) => a.answer.trim());
  const sections = [...new Set(answered.map((a) => a.section))];
  return (
    <>
      <div className="crumbs">
        <Link className="link" href={`${viewer.base}/account`}>
          Account
        </Link>{" "}
        / Brand brief
      </div>
      <div className="head">
        <div>
          <h1>Brand brief</h1>
          <p className="sub">
            {brief?.submitted_at
              ? `From your discovery questionnaire, sent ${formatDay(brief.submitted_at.slice(0, 10))}.`
              : "Your answers appear here once you send the questionnaire."}
          </p>
        </div>
      </div>
      {sections.map((s) => (
        <section className="panel" key={s} style={{ marginBottom: 12 }}>
          <h2 style={{ marginBottom: 8 }}>{s}</h2>
          <dl style={{ margin: 0 }}>
            {answered
              .filter((a) => a.section === s)
              .map((a) => (
                <div className="brief-row" key={a.question}>
                  <dt>{a.question}</dt>
                  <dd>{a.answer}</dd>
                </div>
              ))}
          </dl>
        </section>
      ))}
      {sections.length ? (
        <p className="sub">
          To save a copy, use your browser&apos;s Print and choose &quot;Save as
          PDF&quot;.
        </p>
      ) : null}
    </>
  );
}
