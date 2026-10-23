import {
  BLACK,
  COLOR_ROLES,
  MARK_FORMATS,
  MARK_VARIANTS,
  WHITE,
  hexToCmyk,
  hexToRgb,
} from "@/lib/creative/constants";
import type { PortalKit, PortalKitFile } from "@/lib/data/portal";

// The kit as the client sees it: marks with format links, and colours.
const PREVIEW_BG: Record<string, string> = {
  full: "#F7F3EE",
  black: "#FFFFFF",
  white: "#0E2A36",
};

function preview(files: PortalKitFile[], prefix: string, variant: string) {
  // Show the PNG if there is one, else the SVG.
  return (
    files.find((f) => f.slot === `${prefix}_${variant}_png`) ??
    files.find((f) => f.slot === `${prefix}_${variant}_svg`)
  );
}

export function MarkGrid({
  kit,
  prefix,
  downloads,
}: {
  kit: PortalKit;
  prefix: "logo" | "icon";
  downloads: boolean;
}) {
  return (
    <div className="assets">
      {MARK_VARIANTS.map((v) => {
        const p = preview(kit.files, prefix, v.key);
        return (
          <div className="asset" key={v.key}>
            <div className="pv" style={{ background: PREVIEW_BG[v.key] }}>
              {p?.url ? (
                // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL
                <img
                  src={p.url}
                  alt={`${prefix === "logo" ? "Logo" : "Icon"}, ${v.label.toLowerCase()}`}
                />
              ) : (
                <span className="sub">Not uploaded</span>
              )}
            </div>
            <div className="info">
              <b>{v.label}</b>
              {downloads ? (
                <div className="fmt">
                  {MARK_FORMATS.map((f) => {
                    const file = kit.files.find(
                      (x) => x.slot === `${prefix}_${v.key}_${f}`,
                    );
                    return file?.url ? (
                      <a key={f} href={file.url} download={file.file_name}>
                        {f.toUpperCase()}
                      </a>
                    ) : null;
                  })}
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function Colours({ kit }: { kit: PortalKit }) {
  const list = [
    ...COLOR_ROLES.filter((r) => kit.colors[r.key]).map((r) => ({
      name: r.label,
      hex: kit.colors[r.key],
    })),
    { name: "Black", hex: BLACK },
    { name: "White", hex: WHITE },
  ];
  return (
    <div className="colours">
      {list.map((c) => {
        const [r, g, b] = hexToRgb(c.hex);
        const [cy, m, y, k] = hexToCmyk(c.hex);
        return (
          <div key={c.name}>
            <i style={{ background: c.hex }} />
            <b>{c.name}</b>
            <code>{c.hex.toUpperCase()}</code>
            <code>
              RGB {r}, {g}, {b}
            </code>
            <code>
              CMYK {cy}, {m}, {y}, {k}
            </code>
          </div>
        );
      })}
    </div>
  );
}
