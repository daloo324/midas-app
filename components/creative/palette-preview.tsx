import {
  BLACK,
  COLOR_ROLES,
  WHITE,
  contrastRatio,
  contrastVerdict,
  textOn,
  type Palette,
} from "@/lib/creative/constants";

/** A sample post in the palette and fonts (design-studio.html, previewHTML). */
export function SamplePost({
  palette: p,
  heading,
  body,
  name,
}: {
  palette: Palette;
  heading: string;
  body: string;
  name: string;
}) {
  const fg = textOn(p.primary);
  const eyebrow = contrastRatio(p.tertiary, p.primary) >= 3 ? p.tertiary : fg;
  return (
    <div className="preview" style={{ background: p.primary, color: fg }}>
      <div
        style={{
          fontFamily: heading,
          fontSize: 12,
          letterSpacing: ".2em",
          textTransform: "uppercase",
          color: eyebrow,
        }}
      >
        {name || "Brand name"}
      </div>
      <div>
        <div className="h" style={{ fontFamily: heading }}>
          Good brands build brighter tomorrows
        </div>
        <p
          className="b"
          style={{ fontFamily: body, margin: "10px 0 0", opacity: 0.9 }}
        >
          A sample post using this palette and type pairing, so you can judge
          both together.
        </p>
      </div>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <span
          className="cta"
          style={{
            background: p.accent,
            color: textOn(p.accent),
            fontFamily: body,
          }}
        >
          Book now
        </span>
        <span style={{ display: "inline-flex", gap: 5 }}>
          {[p.secondary, p.tertiary].map((x, i) => (
            <i
              key={i}
              style={{
                display: "inline-block",
                width: 18,
                height: 18,
                borderRadius: "50%",
                background: x,
                border: "1px solid rgba(127,127,127,.4)",
              }}
            />
          ))}
        </span>
      </div>
    </div>
  );
}

/** White and black text on each brand colour, with the ratio and a verdict. */
export function ContrastTable({ palette: p }: { palette: Palette }) {
  const rows = COLOR_ROLES.flatMap((r) => [
    { label: `White on ${r.label}`, fg: WHITE, bg: p[r.key] },
    { label: `Black on ${r.label}`, fg: BLACK, bg: p[r.key] },
  ]);
  return (
    <>
      <h3 style={{ margin: "16px 0 8px" }}>Colour pairings</h3>
      <div className="contrast">
        {rows.map((r) => {
          const ratio = contrastRatio(r.fg, r.bg);
          const v = contrastVerdict(ratio);
          return (
            <div key={r.label}>
              <span className="chipc" style={{ background: r.bg, color: r.fg }}>
                Aa
              </span>
              <span>{r.label}</span>
              <b style={{ fontVariantNumeric: "tabular-nums" }}>
                {ratio.toFixed(1)}:1
              </b>
              <span className={`pill ${v.pill}`}>{v.label}</span>
            </div>
          );
        })}
      </div>
    </>
  );
}
