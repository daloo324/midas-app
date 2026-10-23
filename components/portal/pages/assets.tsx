import type { Viewer } from "@/lib/portal/viewer";
import { Colours, MarkGrid } from "../kit-view";
import { FONT_ROLES, FONT_WEIGHTS, fontStack } from "@/lib/creative/constants";
import { getPortalKit } from "@/lib/data/portal";
import { formatDay } from "@/lib/format";

// Visible once the brand kit is approved (05-portal.md, "Brand assets").
export async function AssetsPage({ viewer }: { viewer: Viewer }) {
  const kit = await getPortalKit(viewer.clientId);
  if (!kit || kit.status !== "approved") {
    return (
      <>
        <div className="head">
          <div>
            <h1>Brand assets</h1>
          </div>
        </div>
        <div className="panel">
          <p className="sub" style={{ margin: 0 }}>
            Your brand kit is being designed. It will appear here when you sign
            it off.
          </p>
        </div>
      </>
    );
  }
  const guide = kit.files.find((f) => f.slot === "guide_pdf");
  const extras = kit.files.filter((f) => f.slot === "extra");
  return (
    <>
      <div className="head">
        <div>
          <h1>Brand assets</h1>
          <p className="sub">
            Your approved brand kit, moved here from the Midas Design Studio
            when you signed it off
            {kit.signed_off_at
              ? ` on ${formatDay(kit.signed_off_at.slice(0, 10))}`
              : ""}
            . Use these files whenever anyone designs for you.
          </p>
        </div>
        <a
          className="btn pri"
          href={viewer.readOnly ? undefined : "/portal/assets/download"}
          aria-disabled={viewer.readOnly || undefined}
        >
          Download full kit (.zip)
        </a>
      </div>
      <div className="stack">
        <section className="panel">
          <h2>Logo</h2>
          <p className="sub" style={{ marginBottom: 12 }}>
            SVG for any size, PNG with a transparent background for digital, PDF
            for print.
          </p>
          <MarkGrid kit={kit} prefix="logo" downloads />
        </section>
        <section className="panel">
          <h2>Icon</h2>
          <p className="sub" style={{ marginBottom: 12 }}>
            For profile pictures, favicons and small spaces.
          </p>
          <MarkGrid kit={kit} prefix="icon" downloads />
        </section>
        <section className="panel">
          <h2>Colours</h2>
          <p className="sub" style={{ marginBottom: 12 }}>
            Use these exact codes. CMYK is for print; confirm with your printer.
          </p>
          <Colours kit={kit} />
        </section>
        <div className="g2">
          <section className="panel">
            <h2>Fonts</h2>
            {FONT_ROLES.map((r) => {
              const family =
                r.key === "heading" ? kit.heading_font : kit.body_font;
              const weights = FONT_WEIGHTS.map((w) => ({
                ...w,
                file: kit.files.find(
                  (f) => f.slot === `font_${r.key}_${w.weight}`,
                ),
              })).filter((w) => w.file);
              return (
                <div className="font-row" key={r.key}>
                  <div>
                    <div className="label">
                      {r.key === "heading" ? "Headings" : "Body text"}
                    </div>
                    <div
                      style={{
                        fontFamily: fontStack(family),
                        fontSize: r.key === "heading" ? 26 : 16,
                        margin: "4px 0",
                      }}
                    >
                      {family ?? "Not set"}
                    </div>
                  </div>
                  <div className="fmt">
                    {weights.map((w) =>
                      w.file?.url ? (
                        <a
                          key={w.weight}
                          href={w.file.url}
                          download={w.file.file_name}
                        >
                          {w.label}
                        </a>
                      ) : null,
                    )}
                  </div>
                </div>
              );
            })}
          </section>
          <section className="panel">
            <h2>Brand guide</h2>
            <p className="sub">
              Brand sheet, clear space, minimum sizes, do and don&apos;t
              examples, colour pairings and patterns.
            </p>
            {guide?.url ? (
              <a
                className="btn"
                style={{ marginTop: 10 }}
                href={guide.url}
                download={guide.file_name}
              >
                Download the guide (PDF)
              </a>
            ) : (
              <p className="sub">Not uploaded.</p>
            )}
          </section>
        </div>
        {extras.length ? (
          <section className="panel">
            <h2>Patterns and extras</h2>
            <div className="fmt" style={{ flexWrap: "wrap", marginTop: 10 }}>
              {extras.map((x) =>
                x.url ? (
                  <a key={x.file_name} href={x.url} download={x.file_name}>
                    {x.file_name}
                  </a>
                ) : null,
              )}
            </div>
          </section>
        ) : null}
      </div>
    </>
  );
}
