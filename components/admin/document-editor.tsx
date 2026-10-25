"use client";

import { useState, useTransition } from "react";
import { useReport } from "@/components/shared/toast";
import type { ActionState } from "@/lib/auth/action-state";
import { formatMoney } from "@/lib/format";
import { SERVICE_UNIT_SUFFIX, type ServiceUnit } from "@/lib/format/status";

export type EditorLine = {
  serviceId: string | null;
  name: string;
  description: string | null;
  unit: string | null;
  quantity: number;
  unitPrice: number;
};

export type CatalogueService = {
  id: string;
  name: string;
  description: string | null;
  unit: string;
  price: number;
};

type Fields = {
  intro?: string | null;
  terms?: string | null;
  validUntil?: string | null;
  periodLabel?: string | null;
  notes?: string | null;
};

const round = (n: number) => Math.round(n * 100) / 100;

/**
 * A quote or invoice draft: lines from the catalogue (name, description, unit
 * and price copied, all editable) or free text, plus the document's text.
 * Saves the whole draft at once.
 */
export function DocumentEditor({
  kind,
  id,
  fields,
  lines: initialLines,
  services,
  vatRate,
  save,
}: {
  kind: "quote" | "invoice";
  id: string;
  fields: Fields;
  lines: EditorLine[];
  services: CatalogueService[];
  vatRate: number;
  save: (input: unknown) => Promise<ActionState>;
}) {
  const [lines, setLines] = useState<EditorLine[]>(initialLines);
  const [f, setF] = useState<Fields>(fields);
  const [pick, setPick] = useState("");
  const [dirty, setDirty] = useState(false);
  const [pending, start] = useTransition();
  const report = useReport();

  const subtotal = round(
    lines.reduce((a, l) => a + round(l.quantity * l.unitPrice), 0),
  );
  const vat = round((subtotal * vatRate) / 100);

  const update = (i: number, patch: Partial<EditorLine>) => {
    setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
    setDirty(true);
  };
  const field = (k: keyof Fields, v: string) => {
    setF((x) => ({ ...x, [k]: v }));
    setDirty(true);
  };
  const add = (l: EditorLine) => {
    setLines((ls) => [...ls, l]);
    setDirty(true);
  };
  const addService = () => {
    const s = services.find((x) => x.id === pick);
    if (!s) return;
    add({
      serviceId: s.id,
      name: s.name,
      description: s.description,
      unit: s.unit,
      quantity: s.unit === "monthly" && kind === "quote" ? 12 : 1,
      unitPrice: s.price,
    });
    setPick("");
  };

  const submit = () =>
    start(async () => {
      const input =
        kind === "quote"
          ? {
              id,
              intro: f.intro ?? "",
              terms: f.terms ?? "",
              validUntil: f.validUntil ?? "",
              lines,
            }
          : {
              id,
              periodLabel: f.periodLabel ?? "",
              notes: f.notes ?? "",
              lines,
            };
      if (report(await save(input))) setDirty(false);
    });

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="fgrid">
        {kind === "quote" ? (
          <>
            <label className="f full">
              Intro
              <textarea
                className="field"
                rows={3}
                value={f.intro ?? ""}
                onChange={(e) => field("intro", e.target.value)}
                placeholder="A short note at the top of the quote"
              />
            </label>
            <label className="f">
              Valid until
              <input
                className="field"
                type="date"
                value={f.validUntil ?? ""}
                onChange={(e) => field("validUntil", e.target.value)}
              />
              <span className="sub">Leave empty for 30 days from sending.</span>
            </label>
          </>
        ) : (
          <label className="f">
            Period
            <input
              className="field"
              value={f.periodLabel ?? ""}
              onChange={(e) => field("periodLabel", e.target.value)}
              placeholder="e.g. November 2026"
            />
          </label>
        )}
      </div>

      <div className="tbl-wrap">
        <table className="tbl doc-lines">
          <thead>
            <tr>
              <th>Description</th>
              <th style={{ width: 90 }}>
                {kind === "quote" ? "Qty or months" : "Qty"}
              </th>
              <th style={{ width: 130 }}>Unit price (P)</th>
              <th style={{ width: 120, textAlign: "right" }}>Amount</th>
              <th aria-label="Remove" style={{ width: 40 }} />
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 ? (
              <tr>
                <td colSpan={5} className="sub">
                  No lines yet. Add a service from the catalogue or a free-text
                  line.
                </td>
              </tr>
            ) : null}
            {lines.map((l, i) => (
              <tr key={i}>
                <td>
                  <input
                    className="field"
                    value={l.name}
                    aria-label={`Line ${i + 1} name`}
                    onChange={(e) => update(i, { name: e.target.value })}
                  />
                  <input
                    className="field"
                    style={{ marginTop: 4, fontSize: 13 }}
                    value={l.description ?? ""}
                    placeholder="Details (optional)"
                    aria-label={`Line ${i + 1} details`}
                    onChange={(e) => update(i, { description: e.target.value })}
                  />
                  {l.unit ? (
                    <span className="sub">
                      {SERVICE_UNIT_SUFFIX[l.unit as ServiceUnit]}
                    </span>
                  ) : null}
                </td>
                <td>
                  <input
                    className="field"
                    inputMode="decimal"
                    value={String(l.quantity)}
                    aria-label={`Line ${i + 1} quantity`}
                    onChange={(e) =>
                      update(i, { quantity: Number(e.target.value) || 0 })
                    }
                  />
                </td>
                <td>
                  <input
                    className="field"
                    inputMode="decimal"
                    value={String(l.unitPrice)}
                    aria-label={`Line ${i + 1} unit price`}
                    onChange={(e) =>
                      update(i, { unitPrice: Number(e.target.value) || 0 })
                    }
                  />
                </td>
                <td className="num" style={{ textAlign: "right" }}>
                  {formatMoney(round(l.quantity * l.unitPrice))}
                </td>
                <td>
                  <button
                    className="btn sm"
                    type="button"
                    aria-label={`Remove line ${i + 1}`}
                    onClick={() => {
                      setLines((ls) => ls.filter((_, j) => j !== i));
                      setDirty(true);
                    }}
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
        <select
          className="field"
          style={{ width: "auto", minWidth: 220 }}
          value={pick}
          onChange={(e) => setPick(e.target.value)}
          aria-label="Service to add"
        >
          <option value="">Add from the catalogue…</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} · {formatMoney(s.price)}{" "}
              {SERVICE_UNIT_SUFFIX[s.unit as ServiceUnit]}
            </option>
          ))}
        </select>
        <button
          className="btn"
          type="button"
          disabled={!pick}
          onClick={addService}
        >
          Add service
        </button>
        <button
          className="btn"
          type="button"
          onClick={() =>
            add({
              serviceId: null,
              name: "",
              description: null,
              unit: null,
              quantity: 1,
              unitPrice: 0,
            })
          }
        >
          Add a free-text line
        </button>
      </div>

      <div className="doc-totals">
        <div>
          <span>Subtotal</span>
          <span>{formatMoney(subtotal)}</span>
        </div>
        {vatRate > 0 ? (
          <div>
            <span>VAT {vatRate}%</span>
            <span>{formatMoney(vat)}</span>
          </div>
        ) : null}
        <div className="grand">
          <span>Total</span>
          <span>{formatMoney(subtotal + vat)}</span>
        </div>
      </div>

      <label className="f">
        {kind === "quote" ? "Terms" : "Note on the invoice (optional)"}
        <textarea
          className="field"
          rows={3}
          value={(kind === "quote" ? f.terms : f.notes) ?? ""}
          onChange={(e) =>
            field(kind === "quote" ? "terms" : "notes", e.target.value)
          }
        />
      </label>

      <div className="row" style={{ gap: 8 }}>
        <button
          className="btn pri"
          type="button"
          disabled={pending}
          onClick={submit}
        >
          {pending ? "Saving…" : "Save draft"}
        </button>
        {dirty ? <span className="sub">Unsaved changes</span> : null}
      </div>
    </div>
  );
}
