"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  kitStatusAction,
  saveGuideCheckAction,
  saveKitColorAction,
  saveKitFieldAction,
  setFontPairingAction,
} from "@/app/creative/actions";
import { AutoSelect, AutoText } from "@/components/shared/auto-field";
import { useReport, useToast } from "@/components/shared/toast";
import { WORK_STATUS_LABELS, WORK_STATUS_PILL } from "@/lib/content/constants";
import {
  BLACK,
  COLOR_ROLES,
  FONT_PAIRINGS,
  FONT_ROLES,
  FONT_WEIGHTS,
  GUIDE_CHECKS,
  KIT_TOTAL,
  MARK_FORMATS,
  MARK_VARIANTS,
  WHITE,
  extensionOf,
  fontStack,
  hexToCmyk,
  hexToRgb,
  paletteOf,
  type ColorRole,
  type Palette,
} from "@/lib/creative/constants";
import { movesFor } from "@/lib/creative/moves";
import type { StudioClient } from "@/lib/data/creative";
import { formatDateTime } from "@/lib/format";
import { KitSlot, useKitUpload } from "./kit-slot";
import { ContrastTable, SamplePost } from "./palette-preview";
import { TimerButton } from "./timer";

const FONT_FORMAT: Record<string, string> = {
  ttf: "truetype",
  otf: "opentype",
  woff: "woff",
  woff2: "woff2",
};

/** @font-face rules for the kit's uploaded fonts, so previews use the real files. */
function fontFaces(client: StudioClient) {
  return client.files
    .filter((f) => f.slot.startsWith("font_") && f.url)
    .map((f) => {
      const [, role, weight] = f.slot.split("_");
      return `@font-face{font-family:"kit-${role}-${client.id}";src:url("${f.url}") format("${FONT_FORMAT[extensionOf(f.file_name)] ?? "truetype"}");font-weight:${weight};font-display:swap}`;
    })
    .join("");
}

export function BrandKit({
  client,
  role,
  timer,
}: {
  client: StudioClient;
  role: string;
  timer: { runningSince: string | null; loggedMinutes: number };
}) {
  const kit = client.kit;
  const canEdit = ["ceo", "creative_director", "designer"].includes(role);
  const [palette, setPalette] = useState<Palette>(() => paletteOf(kit.colors));
  const [fonts, setFonts] = useState({
    heading: kit.heading_font ?? "",
    body: kit.body_font ?? "",
  });
  const byslot = new Map(
    client.files.filter((f) => f.slot !== "extra").map((f) => [f.slot, f]),
  );
  const extras = client.files.filter((f) => f.slot === "extra");
  const hasFont = (r: string) =>
    client.files.some((f) => f.slot.startsWith(`font_${r}_`));
  const stack = (r: "heading" | "body") =>
    hasFont(r)
      ? `"kit-${r}-${client.id}", ${fontStack(fonts[r])}`
      : fontStack(fonts[r]);
  const pairIndex = FONT_PAIRINGS.findIndex(
    (p) => p.heading === fonts.heading && p.body === fonts.body,
  );

  const markGrid = (prefix: "logo" | "icon", title: string, sub: string) => (
    <section className="panel">
      <h2>{title}</h2>
      <p className="sub" style={{ marginBottom: 12 }}>
        {sub}
      </p>
      <div className="kgrid3">
        {MARK_VARIANTS.flatMap((v) =>
          MARK_FORMATS.map((f) => {
            const slot = `${prefix}_${v.key}_${f}`;
            return (
              <KitSlot
                key={slot}
                clientId={client.id}
                slot={slot}
                label={`${v.label} · ${f.toUpperCase()}`}
                file={byslot.get(slot)}
                canEdit={canEdit}
              />
            );
          }),
        )}
      </div>
    </section>
  );

  return (
    <>
      <style>{fontFaces(client)}</style>
      <KitHeader client={client} role={role} timer={timer} />
      <div className="two">
        <div style={{ display: "grid", gap: 16, minWidth: 0 }}>
          {markGrid(
            "logo",
            "Logo",
            "Every colour version in SVG for scaling, PNG with a transparent background for digital use, and PDF for print.",
          )}
          {markGrid(
            "icon",
            "Icon",
            "The brand mark on its own, for profile pictures, favicons and small spaces. Same versions and formats as the logo.",
          )}

          <section className="panel">
            <h2>Colour palette</h2>
            <p className="sub" style={{ marginBottom: 12 }}>
              Four brand colours. Black and white are the brand&apos;s dark and
              light. Tap a swatch to change it. CMYK is approximate; confirm
              with the printer.
            </p>
            <div className="kgrid3">
              {COLOR_ROLES.map((r) => (
                <Swatch
                  key={r.key}
                  clientId={client.id}
                  role={r.key}
                  label={r.label}
                  hex={palette[r.key]}
                  set={Boolean(kit.colors[r.key])}
                  canEdit={canEdit}
                  onChange={(hex) =>
                    setPalette((p) => ({ ...p, [r.key]: hex }))
                  }
                />
              ))}
              <Swatch label="Black" hex={BLACK} set canEdit={false} />
              <Swatch label="White" hex={WHITE} set canEdit={false} />
            </div>
          </section>

          <section className="panel">
            <h2>Fonts</h2>
            <p className="sub" style={{ marginBottom: 12 }}>
              Upload each weight the brand uses as TTF, OTF, WOFF or WOFF2. Not
              every family has every weight. Uploaded fonts show in the preview.
            </p>
            {canEdit ? (
              <PairingPicker
                clientId={client.id}
                value={pairIndex}
                onPick={(h, b) => setFonts({ heading: h, body: b })}
              />
            ) : null}
            <div style={{ display: "grid", gap: 16 }}>
              {FONT_ROLES.map((r) => (
                <div className="fontrole" key={r.key}>
                  <div className="row between">
                    <label className="f" style={{ flex: 1, minWidth: 200 }}>
                      {r.label}
                      <AutoText
                        type="text"
                        value={fonts[r.key]}
                        placeholder="Family name"
                        disabled={!canEdit}
                        onSave={async (v) => {
                          const result = await saveKitFieldAction(
                            client.id,
                            `${r.key}_font`,
                            v,
                          );
                          if (!result.error)
                            setFonts((f) => ({ ...f, [r.key]: v }));
                          return result;
                        }}
                      />
                    </label>
                    {fonts[r.key] ? (
                      <a
                        className="link"
                        href={`https://fonts.google.com/specimen/${encodeURIComponent(fonts[r.key]).replace(/%20/g, "+")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ alignSelf: "flex-end", marginBottom: 8 }}
                      >
                        Get it on Google Fonts ↗
                      </a>
                    ) : null}
                  </div>
                  <p className="fsample" style={{ fontFamily: stack(r.key) }}>
                    {r.key === "heading"
                      ? "Ideas into impact"
                      : "Strategic content for ambitious brands, set in the body face."}
                  </p>
                  <div className="kgrid4">
                    {FONT_WEIGHTS.map((w) => {
                      const slot = `font_${r.key}_${w.weight}`;
                      return (
                        <KitSlot
                          key={slot}
                          clientId={client.id}
                          slot={slot}
                          label={`${w.label} · ${w.weight}`}
                          file={byslot.get(slot)}
                          canEdit={canEdit}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <h2>Brand guide</h2>
            <p className="sub" style={{ marginBottom: 12 }}>
              A 3-page PDF. Tick each section once it&apos;s in the guide.
            </p>
            <div className="kgrid2">
              <KitSlot
                clientId={client.id}
                slot="guide_pdf"
                label="Brand guide · PDF"
                file={byslot.get("guide_pdf")}
                canEdit={canEdit}
              />
              <ul className="checks">
                {GUIDE_CHECKS.map((g) => (
                  <li key={g.key}>
                    <GuideCheck
                      clientId={client.id}
                      check={g.key}
                      label={g.label}
                      done={Boolean(kit.guide_checks[g.key])}
                      disabled={!canEdit}
                    />
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="panel">
            <h2>Patterns &amp; extras</h2>
            <p className="sub" style={{ marginBottom: 12 }}>
              Patterns, graphic elements, textures, templates. Optional, but
              they go in the download too.
            </p>
            <div className="kgrid3">
              {extras.map((x) => (
                <KitSlot
                  key={x.id}
                  clientId={client.id}
                  slot="extra"
                  label={x.file_name}
                  file={x}
                  canEdit={canEdit}
                />
              ))}
              {canEdit ? <AddExtras clientId={client.id} /> : null}
            </div>
          </section>

          <section className="panel">
            <h2>Brand voice</h2>
            <div style={{ marginTop: 10 }}>
              <AutoText
                multiline
                rows={3}
                value={kit.voice}
                disabled={!canEdit}
                aria-label="Brand voice"
                placeholder="e.g. Warm, proud of Botswana, plain English with a little Setswana"
                onSave={(v) => saveKitFieldAction(client.id, "voice", v)}
              />
            </div>
          </section>
        </div>

        <section className="panel stick">
          <h2 style={{ marginBottom: 12 }}>Preview</h2>
          <SamplePost
            palette={palette}
            heading={stack("heading")}
            body={stack("body")}
            name={client.name}
          />
          <ContrastTable palette={palette} />
        </section>
      </div>
    </>
  );
}

function KitHeader({
  client,
  role,
  timer,
}: {
  client: StudioClient;
  role: string;
  timer: { runningSince: string | null; loggedMinutes: number };
}) {
  const kit = client.kit;
  const [pending, start] = useTransition();
  const [noting, setNoting] = useState(false);
  const [note, setNote] = useState("");
  const report = useReport();
  const moves = movesFor(kit.status, role);
  const move = (status: string, comment?: string) =>
    start(async () => {
      if (
        report(
          await kitStatusAction(client.id, { status, comment: comment ?? "" }),
        )
      )
        setNoting(false);
    });
  const pct = Math.round((kit.ready / KIT_TOTAL) * 100);

  return (
    <section className="panel" style={{ marginBottom: 16 }}>
      <div className="row between">
        <div>
          <h2>Brand kit</h2>
          <p className="sub">
            The first job for every new client. It goes through the same review
            as posts, and content creation opens only when the client signs it
            off.
          </p>
        </div>
        <div className="row">
          {["ceo", "creative_director", "designer"].includes(role) ? (
            <TimerButton
              kitClientId={client.id}
              loggedMinutes={timer.loggedMinutes}
              runningSince={timer.runningSince}
            />
          ) : null}
          <a
            className="btn pri"
            href={`/creative/clients/${client.id}/kit/download`}
            aria-disabled={!client.files.length}
            onClick={(e) => {
              if (!client.files.length) e.preventDefault();
            }}
          >
            Download full kit (.zip)
          </a>
        </div>
      </div>
      <div className="kit-status">
        <div
          className="f"
          style={{
            display: "grid",
            gap: 6,
            fontSize: 13,
            fontWeight: 600,
            color: "var(--muted)",
          }}
        >
          Status
          <div className="row" style={{ gap: 6 }}>
            <span className={`pill ${WORK_STATUS_PILL[kit.status]}`}>
              {kit.status === "approved"
                ? "Approved (client signed off)"
                : WORK_STATUS_LABELS[kit.status]}
            </span>
            {moves.map((m) =>
              m.needsNote ? (
                <button
                  key={m.to}
                  className="btn sm"
                  type="button"
                  disabled={pending}
                  onClick={() => setNoting(true)}
                >
                  {m.label}
                </button>
              ) : (
                <button
                  key={m.to}
                  className={m.to === "client_review" ? "btn sm pri" : "btn sm"}
                  type="button"
                  disabled={pending}
                  onClick={() => move(m.to)}
                >
                  {m.label}
                </button>
              ),
            )}
          </div>
        </div>
        <label className="f">
          Designer
          <AutoSelect
            value={kit.assigned_designer_id ?? ""}
            placeholder="Not assigned"
            disabled={!["ceo", "creative_director"].includes(role)}
            options={client.designers.map((d) => ({
              value: d.id,
              label: d.full_name,
            }))}
            onSave={(v) =>
              saveKitFieldAction(client.id, "assigned_designer_id", v)
            }
          />
        </label>
        <div
          className="f"
          style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)" }}
        >
          Required items ready
          <div className="bar" style={{ marginTop: 6 }}>
            <i style={{ width: `${pct}%`, background: "var(--good)" }} />
          </div>
          <span style={{ fontWeight: 500 }}>
            {kit.ready} of {KIT_TOTAL}
          </span>
        </div>
      </div>
      {noting ? (
        <form
          className="row"
          style={{ marginTop: 12 }}
          onSubmit={(e) => {
            e.preventDefault();
            move("changes_requested", note);
          }}
        >
          <input
            className="field"
            style={{ flex: 1 }}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What should change?"
            aria-label="What should change?"
            required
          />
          <button
            className="btn sm pri"
            type="submit"
            disabled={pending || !note.trim()}
          >
            Ask for changes
          </button>
          <button
            className="btn sm"
            type="button"
            onClick={() => setNoting(false)}
          >
            Cancel
          </button>
        </form>
      ) : null}
      {kit.status === "approved" ? (
        <div
          className="notice"
          style={{
            marginTop: 12,
            borderColor: "var(--good)",
            color: "var(--good)",
          }}
        >
          Signed off{kit.signed_off_by ? ` by ${kit.signed_off_by}` : ""}
          {kit.signed_off_at ? ` on ${formatDateTime(kit.signed_off_at)}` : ""}.
          The weekly board is open.
        </div>
      ) : kit.status === "client_review" ? (
        <p className="sub" style={{ marginTop: 10 }}>
          With the client for sign-off in their portal. The weekly board opens
          once they approve.
        </p>
      ) : (
        <p className="sub" style={{ marginTop: 10 }}>
          The weekly board stays locked until the client signs this off.
        </p>
      )}
    </section>
  );
}

function Swatch({
  clientId,
  role,
  label,
  hex,
  set,
  canEdit,
  onChange,
}: {
  clientId?: string;
  role?: ColorRole;
  label: string;
  hex: string;
  set: boolean;
  canEdit: boolean;
  onChange?: (hex: string) => void;
}) {
  const report = useReport();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const [r, g, b] = hexToRgb(hex);
  const [c, m, y, k] = hexToCmyk(hex);
  return (
    <div className="swc">
      <div className="sw" style={{ background: hex }}>
        {canEdit && clientId && role ? (
          <input
            type="color"
            value={hex}
            aria-label={`${label} colour`}
            onChange={(e) => {
              const next = e.target.value;
              onChange?.(next);
              // Save once the picker settles.
              clearTimeout(timer.current);
              timer.current = setTimeout(
                async () =>
                  void report(
                    await saveKitColorAction({ clientId, role, value: next }),
                    { quiet: true },
                  ),
                500,
              );
            }}
          />
        ) : null}
      </div>
      <b>
        {label}
        {canEdit && !set ? (
          <span
            className="pill s-warn"
            style={{ fontSize: 10.5, marginLeft: 6 }}
          >
            not set
          </span>
        ) : null}
      </b>
      <code>HEX {hex.toUpperCase()}</code>
      <code>
        RGB {r}, {g}, {b}
      </code>
      <code>
        CMYK {c}, {m}, {y}, {k}
      </code>
    </div>
  );
}

function PairingPicker({
  clientId,
  value,
  onPick,
}: {
  clientId: string;
  value: number;
  onPick: (heading: string, body: string) => void;
}) {
  const [pending, start] = useTransition();
  const report = useReport();
  return (
    <label className="f" style={{ marginBottom: 12 }}>
      Start from a pairing
      <select
        className="field"
        value={value}
        disabled={pending}
        onChange={(e) => {
          const p = FONT_PAIRINGS[Number(e.target.value)];
          if (!p) return;
          start(async () => {
            if (report(await setFontPairingAction(clientId, p.heading, p.body)))
              onPick(p.heading, p.body);
          });
        }}
      >
        <option value={-1}>Custom</option>
        {FONT_PAIRINGS.map((p, i) => (
          <option key={p.heading + p.body} value={i}>
            {p.heading} + {p.body}
          </option>
        ))}
      </select>
    </label>
  );
}

function GuideCheck({
  clientId,
  check,
  label,
  done,
  disabled,
}: {
  clientId: string;
  check: string;
  label: string;
  done: boolean;
  disabled: boolean;
}) {
  const [on, setOn] = useState(done);
  const [pending, start] = useTransition();
  const report = useReport();
  return (
    <label>
      <input
        type="checkbox"
        checked={on}
        disabled={disabled || pending}
        onChange={(e) => {
          const next = e.target.checked;
          setOn(next);
          start(async () => {
            if (
              !report(
                await saveGuideCheckAction({
                  clientId,
                  key: check,
                  done: next,
                }),
                { quiet: true },
              )
            )
              setOn(!next);
          });
        }}
      />
      <span>{label}</span>
    </label>
  );
}

function AddExtras({ clientId }: { clientId: string }) {
  const { upload, busy } = useKitUpload(clientId);
  const say = useToast();
  return (
    <label className="kslot empty-slot">
      <div className="kname">
        <b>{busy ? "Uploading…" : "Add files"}</b>
        <span>SVG, PNG, JPG or PDF</span>
      </div>
      <input
        type="file"
        hidden
        multiple
        accept=".svg,.png,.jpg,.jpeg,.pdf"
        aria-label="Add patterns and extras"
        disabled={busy}
        onChange={async (e) => {
          const files = [...(e.target.files ?? [])];
          e.target.value = "";
          let ok = 0;
          for (const f of files) if (await upload("extra", f)) ok += 1;
          if (ok) say(ok === 1 ? "Added." : `${ok} files added.`);
        }}
      />
    </label>
  );
}
