import { formatMoney } from "@/lib/format";
import type { PdfData } from "@/lib/pdf/document";

// A quote, invoice or credit note on screen, as in the invoice view of
// docs/prototypes/client-portal.html. Same data as the PDF.

const TONE = { good: "#2E7D4F", warn: "#A86A00", muted: "#5B6A70" };
const qty = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));

export function DocumentView({ d }: { d: PdfData }) {
  const c = d.company;
  return (
    <div className="inv">
      <div className="top">
        <div>
          <div className="brandmark">
            <b style={{ color: "#0E2A36" }}>MIDAS</b>
            <span style={{ color: "#7C5A1A" }}>Media Solutions</span>
          </div>
          <small style={{ whiteSpace: "pre-line" }}>
            {[c.legalName ?? c.name, c.address, c.email, c.phone]
              .filter(Boolean)
              .join("\n")}
            {c.vatNumber ? `\nVAT number ${c.vatNumber}` : ""}
          </small>
        </div>
        <div style={{ textAlign: "right" }}>
          <h2>{d.heading}</h2>
          <small style={{ whiteSpace: "pre-line" }}>
            {[d.number, ...d.dates.map((x) => `${x.label} ${x.value}`)].join(
              "\n",
            )}
          </small>
        </div>
      </div>
      <div className="row between" style={{ alignItems: "flex-start" }}>
        <div>
          <small>BILL TO</small>
          <div>
            <b>{d.billTo.name}</b>
            {d.billTo.lines.map((l) => (
              <div key={l}>{l}</div>
            ))}
          </div>
        </div>
        {d.status ? (
          <div style={{ textAlign: "right" }}>
            <small>STATUS</small>
            <div>
              <b style={{ color: TONE[d.status.tone] }}>{d.status.label}</b>
            </div>
          </div>
        ) : null}
      </div>
      {d.intro ? (
        <p style={{ margin: 0, whiteSpace: "pre-line" }}>{d.intro}</p>
      ) : null}
      <div className="tbl-wrap">
        <table className="tbl" style={{ minWidth: 0 }}>
          <thead>
            <tr>
              <th>Description</th>
              <th className="num-c">Qty</th>
              <th className="num-c">Unit price</th>
              <th className="num-c">Amount</th>
            </tr>
          </thead>
          <tbody>
            {d.lines.map((l, i) => (
              <tr key={i}>
                <td>
                  {l.name}
                  {l.description ? (
                    <>
                      <br />
                      <small>{l.description}</small>
                    </>
                  ) : null}
                </td>
                <td className="num-c">{qty(l.quantity)}</td>
                <td className="num-c">{formatMoney(l.unitPrice)}</td>
                <td className="num-c">{formatMoney(l.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="tot">
        <div>
          <span>Subtotal</span>
          <span>{formatMoney(d.subtotal)}</span>
        </div>
        {d.vatRate > 0 ? (
          <div>
            <span>VAT {d.vatRate}%</span>
            <span>{formatMoney(d.vatAmount)}</span>
          </div>
        ) : null}
        <div className="grand">
          <span>Total</span>
          <span>{formatMoney(d.total)}</span>
        </div>
        {d.extraTotals?.map((t) => (
          <div key={t.label}>
            <span>{t.label}</span>
            <span>{formatMoney(t.value)}</span>
          </div>
        ))}
      </div>
      {d.payment?.length ? (
        <div>
          <small>PAYMENT</small>
          <div style={{ fontSize: 14 }}>
            {d.payment.map((l) => (
              <div key={l}>{l}</div>
            ))}
          </div>
        </div>
      ) : null}
      {d.terms ? (
        <div>
          <small>TERMS</small>
          <div style={{ fontSize: 14, whiteSpace: "pre-line" }}>{d.terms}</div>
        </div>
      ) : null}
      {d.footer ? (
        <small style={{ whiteSpace: "pre-line" }}>{d.footer}</small>
      ) : null}
    </div>
  );
}
