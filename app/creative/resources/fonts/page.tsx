import type { Metadata } from "next";
import Link from "next/link";
import {
  PAIRING_FONTS_HREF,
  ResourcesHeader,
} from "@/components/creative/resources-tabs";
import { UseForClient } from "@/components/creative/use-pairing";
import { requireArea } from "@/lib/auth/session";
import {
  FONT_PAIRINGS,
  LETTERING_STYLES,
  fontStack,
} from "@/lib/creative/constants";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Fonts & pairings" };

const specimen = (family: string) =>
  `https://fonts.google.com/specimen/${encodeURIComponent(family).replace(/%20/g, "+")}`;

export default async function FontsPage({
  searchParams,
}: PageProps<"/creative/resources/fonts">) {
  const user = await requireArea("creative");
  const style = (await searchParams).style;
  const active = LETTERING_STYLES.find((s) => s === style) ?? null;
  const supabase = await createClient();
  const { data: clients } = await supabase
    .from("clients")
    .select("id, name")
    .neq("status", "ended")
    .order("name");
  const list = FONT_PAIRINGS.filter((p) => !active || p.style === active);

  return (
    <>
      <link rel="stylesheet" href={PAIRING_FONTS_HREF} precedence="default" />
      <ResourcesHeader current="/creative/resources/fonts" />
      <p className="sub" style={{ marginTop: -6 }}>
        Free Google Fonts pairings, grouped by the lettering styles clients pick
        in the brand questionnaire. All are free for commercial use.
      </p>
      <div className="chips" style={{ marginTop: 10 }}>
        <Link
          className="chip"
          href="?"
          aria-current={!active ? "page" : undefined}
          style={
            !active
              ? {
                  background: "var(--navy)",
                  color: "var(--on-navy)",
                  borderColor: "var(--navy)",
                }
              : undefined
          }
        >
          All
        </Link>
        {LETTERING_STYLES.map((s) => (
          <Link
            key={s}
            className="chip"
            href={`?style=${encodeURIComponent(s)}`}
            aria-current={active === s ? "page" : undefined}
            style={
              active === s
                ? {
                    background: "var(--navy)",
                    color: "var(--on-navy)",
                    borderColor: "var(--navy)",
                  }
                : undefined
            }
          >
            {s}
          </Link>
        ))}
      </div>
      <div className="fonts">
        {list.map((p) => (
          <div className="fcard" key={p.heading + p.body}>
            <span className="pill s-gold" style={{ alignSelf: "flex-start" }}>
              {p.style}
            </span>
            <div className="h" style={{ fontFamily: fontStack(p.heading) }}>
              Ideas into impact
            </div>
            <p
              className="b"
              style={{ fontFamily: fontStack(p.body), margin: 0 }}
            >
              Strategic content for ambitious brands. Body copy sits comfortably
              under the heading at 14 to 16 px.
            </p>
            <div className="names">
              {p.heading} <span>+</span> {p.body}
              <br />
              <span>{p.use}</span>
            </div>
            {user.role !== "account_exec" && clients?.length ? (
              <UseForClient
                heading={p.heading}
                body={p.body}
                clients={clients}
              />
            ) : null}
            <div className="row">
              <a
                className="link"
                href={specimen(p.heading)}
                target="_blank"
                rel="noopener noreferrer"
              >
                {p.heading} ↗
              </a>
              <a
                className="link"
                href={specimen(p.body)}
                target="_blank"
                rel="noopener noreferrer"
              >
                {p.body} ↗
              </a>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
