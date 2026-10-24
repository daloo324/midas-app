"use client";

import { useState, useTransition } from "react";
import {
  addLibraryFontAction,
  addLibraryPairingAction,
  removeLibraryFontAction,
  removeLibraryPairingAction,
} from "@/app/creative/actions";
import { useReport, useToast } from "@/components/shared/toast";
import {
  LIBRARY_WEIGHTS,
  LETTERING_STYLES,
  WEIGHT_NAMES,
} from "@/lib/creative/constants";
import { createClient } from "@/lib/supabase/browser";

const MAX = 10 * 1024 * 1024;
const WEIGHT_WORDS: [RegExp, number][] = [
  [/thin|hairline/i, 100],
  [/extra-?light|ultra-?light/i, 200],
  [/light/i, 300],
  [/medium/i, 500],
  [/semi-?bold|demi-?bold/i, 600],
  [/extra-?bold|ultra-?bold/i, 800],
  [/bold/i, 700],
  [/black|heavy/i, 900],
];

/** "KgosiSans-BoldItalic.woff2" → Kgosi Sans, 700, italic. */
function guess(fileName: string) {
  const stem = fileName.replace(/\.[^.]+$/, "");
  const [name, style = ""] = stem.split(/[-_](?=[^-_]*$)/);
  const family = (style ? name : stem)
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[^A-Za-z0-9 -]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
  const weight = WEIGHT_WORDS.find(([re]) => re.test(style))?.[1] ?? 400;
  return { family, weight, italic: /italic|oblique/i.test(style) };
}

export function AddFontForm() {
  const [file, setFile] = useState<File | null>(null);
  const [family, setFamily] = useState("");
  const [weight, setWeight] = useState(400);
  const [italic, setItalic] = useState(false);
  const [licence, setLicence] = useState("");
  const [busy, setBusy] = useState(false);
  const say = useToast();
  const report = useReport();

  const choose = (f: File | null) => {
    setFile(f);
    if (!f) return;
    const g = guess(f.name);
    setFamily(g.family);
    setWeight(g.weight);
    setItalic(g.italic);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return say("Choose a font file first.", "err");
    if (!/\.(ttf|otf|woff2?)$/i.test(file.name))
      return say("Choose a TTF, OTF, WOFF or WOFF2 file.", "err");
    if (file.size > MAX) return say("Font files can be up to 10 MB.", "err");
    setBusy(true);
    try {
      const path = `${crypto.randomUUID()}/${file.name.replace(/[^A-Za-z0-9._-]+/g, "-").slice(-80)}`;
      const { error } = await createClient()
        .storage.from("fonts")
        .upload(path, file, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });
      if (error) return say(`${file.name} didn't upload. Try again.`, "err");
      const ok = report(
        await addLibraryFontAction({
          path,
          fileName: file.name,
          size: file.size,
          family,
          weight,
          italic,
          licence,
        }),
      );
      if (ok) {
        setFile(null);
        setFamily("");
        setLicence("");
        (e.target as HTMLFormElement).reset();
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="stack" style={{ gap: 10 }} onSubmit={submit}>
      <h3>Add a font</h3>
      <p className="sub" style={{ margin: 0 }}>
        One file per weight. Check the licence allows client work before you
        upload.
      </p>
      <label className="f">
        Font file (TTF, OTF, WOFF or WOFF2, up to 10 MB)
        <input
          className="field"
          type="file"
          accept=".ttf,.otf,.woff,.woff2"
          disabled={busy}
          onChange={(e) => choose(e.target.files?.[0] ?? null)}
        />
      </label>
      <label className="f">
        Font name
        <input
          className="field"
          value={family}
          maxLength={60}
          required
          placeholder="e.g. Kgosi Sans"
          onChange={(e) => setFamily(e.target.value)}
        />
      </label>
      <div className="row" style={{ gap: 10, alignItems: "end" }}>
        <label className="f" style={{ flex: 1 }}>
          Weight
          <select
            className="field"
            value={weight}
            onChange={(e) => setWeight(Number(e.target.value))}
          >
            {LIBRARY_WEIGHTS.map((w) => (
              <option key={w} value={w}>
                {w} · {WEIGHT_NAMES[w]}
              </option>
            ))}
          </select>
        </label>
        <label className="row" style={{ gap: 6, paddingBottom: 9 }}>
          <input
            type="checkbox"
            checked={italic}
            onChange={(e) => setItalic(e.target.checked)}
          />
          Italic
        </label>
      </div>
      <label className="f">
        Licence or source (optional)
        <input
          className="field"
          value={licence}
          maxLength={300}
          placeholder="e.g. Bought from MyFonts, desktop and web licence"
          onChange={(e) => setLicence(e.target.value)}
        />
      </label>
      <div>
        <button className="btn gold" type="submit" disabled={busy || !file}>
          {busy ? "Uploading…" : "Add to library"}
        </button>
      </div>
    </form>
  );
}

export function AddPairingForm({ families }: { families: string[] }) {
  const [heading, setHeading] = useState("");
  const [body, setBody] = useState("");
  const [style, setStyle] = useState<string>(LETTERING_STYLES[1]);
  const [goodFor, setGoodFor] = useState("");
  const [pending, start] = useTransition();
  const report = useReport();

  return (
    <form
      className="stack"
      style={{ gap: 10 }}
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          if (
            report(
              await addLibraryPairingAction({ heading, body, style, goodFor }),
            )
          ) {
            setHeading("");
            setBody("");
            setGoodFor("");
          }
        });
      }}
    >
      <h3>Add a pairing</h3>
      <p className="sub" style={{ margin: 0 }}>
        Mix library fonts with each other or with the Google Fonts above.
      </p>
      <label className="f">
        Heading font
        <FamilySelect
          value={heading}
          onChange={setHeading}
          families={families}
        />
      </label>
      <label className="f">
        Body font
        <FamilySelect value={body} onChange={setBody} families={families} />
      </label>
      <label className="f">
        Lettering style
        <select
          className="field"
          value={style}
          onChange={(e) => setStyle(e.target.value)}
        >
          {LETTERING_STYLES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </label>
      <label className="f">
        Good for (optional)
        <input
          className="field"
          value={goodFor}
          maxLength={120}
          placeholder="e.g. Retail, food and lifestyle brands"
          onChange={(e) => setGoodFor(e.target.value)}
        />
      </label>
      <div>
        <button
          className="btn gold"
          type="submit"
          disabled={pending || !heading || !body}
        >
          Add pairing
        </button>
      </div>
    </form>
  );
}

function FamilySelect({
  value,
  onChange,
  families,
}: {
  value: string;
  onChange: (v: string) => void;
  families: string[];
}) {
  return (
    <select
      className="field"
      value={value}
      required
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">Choose a font…</option>
      {families.map((f) => (
        <option key={f}>{f}</option>
      ))}
    </select>
  );
}

export function RemoveButton({
  kind,
  id,
  label,
}: {
  kind: "font" | "pairing";
  id: string;
  label: string;
}) {
  const [pending, start] = useTransition();
  const report = useReport();
  return (
    <button
      className="btn sm"
      type="button"
      disabled={pending}
      aria-label={label}
      onClick={() =>
        start(async () => {
          report(
            await (kind === "font"
              ? removeLibraryFontAction(id)
              : removeLibraryPairingAction(id)),
          );
        })
      }
    >
      Remove
    </button>
  );
}
