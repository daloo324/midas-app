"use client";

import { useState, useTransition } from "react";
import { savePaletteAction } from "@/app/creative/actions";
import { useReport, useToast } from "@/components/shared/toast";
import {
  COLOR_ROLES,
  FONT_PAIRINGS,
  PALETTE_PRESETS,
  fontStack,
  hexToRgb,
  type Palette,
} from "@/lib/creative/constants";
import { ContrastTable, SamplePost } from "./palette-preview";

export function PaletteBuilder({
  clients,
}: {
  clients: { id: string; name: string }[];
}) {
  const [palette, setPalette] = useState<Palette>(PALETTE_PRESETS[0].colors);
  const [pair, setPair] = useState(0);
  const [clientId, setClientId] = useState("");
  const [pending, start] = useTransition();
  const report = useReport();
  const say = useToast();
  const p = FONT_PAIRINGS[pair];
  const text = COLOR_ROLES.map(
    (r) => `${r.label}: ${palette[r.key].toUpperCase()}`,
  )
    .concat("Black: #000000", "White: #FFFFFF")
    .join("\n");

  return (
    <div className="two">
      <div style={{ display: "grid", gap: 16 }}>
        <section className="panel">
          <h2>Start from a template</h2>
          <div className="chips" style={{ marginTop: 10 }}>
            {PALETTE_PRESETS.map((t) => (
              <button
                key={t.name}
                type="button"
                className="chip"
                onClick={() => setPalette(t.colors)}
              >
                <span
                  style={{
                    display: "inline-flex",
                    verticalAlign: -2,
                    marginRight: 6,
                    borderRadius: 3,
                    overflow: "hidden",
                  }}
                >
                  {COLOR_ROLES.map((r) => (
                    <i
                      key={r.key}
                      style={{
                        display: "inline-block",
                        width: 8,
                        height: 12,
                        background: t.colors[r.key],
                      }}
                    />
                  ))}
                </span>
                {t.name}
              </button>
            ))}
          </div>
        </section>
        <section className="panel">
          <h2>Four brand colours, plus black and white</h2>
          <p className="sub" style={{ marginBottom: 12 }}>
            Primary carries the brand, secondary supports it, accent is for
            buttons and highlights only. Black and white are for text and
            backgrounds.
          </p>
          <div className="pal">
            {COLOR_ROLES.map((r) => (
              <label key={r.key}>
                {r.label}
                <div className="sw" style={{ background: palette[r.key] }}>
                  <input
                    type="color"
                    value={palette[r.key]}
                    aria-label={`${r.label} colour`}
                    onChange={(e) =>
                      setPalette((x) => ({ ...x, [r.key]: e.target.value }))
                    }
                  />
                </div>
                <code>{palette[r.key].toUpperCase()}</code>
                <code style={{ color: "var(--muted)" }}>
                  {hexToRgb(palette[r.key]).join(", ")}
                </code>
              </label>
            ))}
          </div>
          <label className="f" style={{ marginTop: 12 }}>
            Preview fonts
            <select
              className="field"
              value={pair}
              onChange={(e) => setPair(Number(e.target.value))}
            >
              {FONT_PAIRINGS.map((q, i) => (
                <option key={q.heading + q.body} value={i}>
                  {q.heading} + {q.body}
                </option>
              ))}
            </select>
          </label>
          <div className="row" style={{ marginTop: 12 }}>
            <button
              className="btn"
              type="button"
              onClick={() =>
                navigator.clipboard.writeText(text).then(
                  () => say("Palette copied."),
                  () => say("Couldn't copy.", "err"),
                )
              }
            >
              Copy palette
            </button>
            {clients.length ? (
              <>
                <select
                  className="field"
                  style={{ width: "auto" }}
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  aria-label="Client"
                >
                  <option value="">Choose client…</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <button
                  className="btn pri"
                  type="button"
                  disabled={!clientId || pending}
                  onClick={() =>
                    start(
                      async () =>
                        void report(
                          await savePaletteAction({
                            clientId,
                            colors: palette,
                          }),
                        ),
                    )
                  }
                >
                  Save to client&apos;s brand kit
                </button>
              </>
            ) : null}
          </div>
        </section>
      </div>
      <section className="panel">
        <h2 style={{ marginBottom: 12 }}>Preview</h2>
        <SamplePost
          palette={palette}
          heading={fontStack(p.heading)}
          body={fontStack(p.body)}
          name="Your client"
        />
        <ContrastTable palette={palette} />
      </section>
    </div>
  );
}
