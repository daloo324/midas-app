import type { Metadata } from "next";
import Link from "next/link";
import {
  PAIRING_FONTS_HREF,
  ResourcesHeader,
} from "@/components/creative/resources-tabs";
import {
  AddFontForm,
  AddPairingForm,
  RemoveButton,
} from "@/components/creative/font-library";
import { UseForClient } from "@/components/creative/use-pairing";
import { requireArea } from "@/lib/auth/session";
import {
  FONT_PAIRINGS,
  LETTERING_STYLES,
  fontStack,
  weightLabel,
} from "@/lib/creative/constants";
import { getFontLibrary, type LibraryFont } from "@/lib/data/creative";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Fonts & pairings" };

const FORMAT: Record<string, string> = {
  ttf: "truetype",
  otf: "opentype",
  woff: "woff",
  woff2: "woff2",
};

/** @font-face rules for the library, under each font's real name so previews work. */
function fontFaces(fonts: LibraryFont[]) {
  return fonts
    .filter((f) => f.url)
    .map((f) => {
      const ext = f.file_name.split(".").pop()!.toLowerCase();
      // Family names are letters, numbers, spaces and hyphens (checked in the
      // database); the signed URL is percent-encoded.
      return `@font-face{font-family:"${f.family}";src:url("${encodeURI(f.url!)}") format("${FORMAT[ext]}");font-weight:${f.weight};font-style:${f.italic ? "italic" : "normal"};font-display:swap}`;
    })
    .join("\n");
}

type Card = {
  key: string;
  heading: string;
  body: string;
  style: string;
  use: string | null;
  libraryId?: string;
};

const specimen = (family: string) =>
  `https://fonts.google.com/specimen/${encodeURIComponent(family).replace(/%20/g, "+")}`;

export default async function FontsPage({
  searchParams,
}: PageProps<"/creative/resources/fonts">) {
  const user = await requireArea("creative");
  const style = (await searchParams).style;
  const active = LETTERING_STYLES.find((s) => s === style) ?? null;
  const supabase = await createClient();
  const [{ data: clients }, library] = await Promise.all([
    supabase
      .from("clients")
      .select("id, name")
      .neq("status", "ended")
      .order("name"),
    getFontLibrary(),
  ]);
  const manages = user.role === "ceo" || user.role === "creative_director";
  const libraryFamilies = [...new Set(library.fonts.map((f) => f.family))];
  const isLibrary = new Set(libraryFamilies);
  const allFamilies = [
    ...new Set([
      ...libraryFamilies,
      ...FONT_PAIRINGS.flatMap((p) => [p.heading, p.body]),
    ]),
  ].sort((a, b) => a.localeCompare(b));
  const cards: Card[] = [
    ...FONT_PAIRINGS.map((p) => ({ ...p, key: p.heading + "+" + p.body })),
    ...library.pairings.map((p) => ({
      key: p.id,
      heading: p.heading_family,
      body: p.body_family,
      style: p.style,
      use: p.good_for,
      libraryId: p.id,
    })),
  ];
  const list = cards.filter((p) => !active || p.style === active);

  return (
    <>
      <link rel="stylesheet" href={PAIRING_FONTS_HREF} precedence="default" />
      {library.fonts.length ? <style>{fontFaces(library.fonts)}</style> : null}
      <ResourcesHeader current="/creative/resources/fonts" />
      <p className="sub" style={{ marginTop: -6 }}>
        Free Google Fonts pairings, grouped by the lettering styles clients pick
        in the brand questionnaire. All are free for commercial use. Pairings
        from the team&apos;s font library are marked Library.
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
          <div className="fcard" key={p.key}>
            <div className="row" style={{ gap: 6 }}>
              <span className="pill s-gold">{p.style}</span>
              {p.libraryId ? (
                <span className="pill s-info">Library</span>
              ) : null}
            </div>
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
              {p.use ? (
                <>
                  <br />
                  <span>{p.use}</span>
                </>
              ) : null}
            </div>
            {user.role !== "account_exec" && clients?.length ? (
              <UseForClient
                heading={p.heading}
                body={p.body}
                clients={clients}
              />
            ) : null}
            <div className="row">
              {[p.heading, p.body].map((f, i) =>
                isLibrary.has(f) ? (
                  <span key={i} className="sub" style={{ margin: 0 }}>
                    {f} · library
                  </span>
                ) : (
                  <a
                    key={i}
                    className="link"
                    href={specimen(f)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {f} ↗
                  </a>
                ),
              )}
              {manages && p.libraryId ? (
                <RemoveButton
                  kind="pairing"
                  id={p.libraryId}
                  label={`Remove ${p.heading} + ${p.body}`}
                />
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <section className="panel" style={{ marginTop: 16 }}>
        <h2>Font library</h2>
        <p className="sub">
          Fonts the team has downloaded or bought.{" "}
          {manages
            ? "Add the files here, then pair them below."
            : "The creative director adds and removes them."}
        </p>
        {library.fonts.length ? (
          <div className="tbl-wrap" style={{ marginTop: 10 }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Font</th>
                  <th>Style</th>
                  <th>Preview</th>
                  <th>Licence or source</th>
                  {manages ? <th aria-label="Actions" /> : null}
                </tr>
              </thead>
              <tbody>
                {library.fonts.map((f) => (
                  <tr key={f.id}>
                    <td>
                      <b>{f.family}</b>
                      <div className="sub" style={{ margin: 0 }}>
                        {f.file_name}
                      </div>
                    </td>
                    <td>{weightLabel(f.weight, f.italic)}</td>
                    <td
                      style={{
                        fontFamily: fontStack(f.family),
                        fontWeight: f.weight,
                        fontStyle: f.italic ? "italic" : "normal",
                        fontSize: 18,
                      }}
                    >
                      Ideas into impact
                    </td>
                    <td>{f.licence_note ?? "—"}</td>
                    {manages ? (
                      <td>
                        <RemoveButton
                          kind="font"
                          id={f.id}
                          label={`Remove ${f.family} ${weightLabel(f.weight, f.italic)}`}
                        />
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="sub">No fonts in the library yet.</p>
        )}
        {manages ? (
          <div className="two" style={{ marginTop: 16 }}>
            <AddFontForm />
            <AddPairingForm families={allFamilies} />
          </div>
        ) : null}
      </section>
    </>
  );
}
