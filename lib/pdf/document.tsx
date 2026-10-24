import "server-only";
import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import { formatDay, formatMoney } from "@/lib/format";

// Quote, invoice and credit note PDFs, laid out like the invoice view in
// docs/prototypes/client-portal.html: brand mark and title over a gold rule,
// bill-to and status, lines, totals, payment details and footer.

export type PdfLine = {
  name: string;
  description: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type PdfData = {
  heading: string; // "INVOICE", "TAX INVOICE", "QUOTE", "CREDIT NOTE"
  number: string;
  dates: { label: string; value: string }[]; // Issued, Due / Valid until
  company: {
    name: string;
    legalName: string | null;
    address: string | null;
    email: string | null;
    phone: string | null;
    vatNumber: string | null;
    logo: Buffer | null;
  };
  billTo: { name: string; lines: string[] };
  status?: { label: string; tone: "good" | "warn" | "muted" };
  intro?: string | null;
  lines: PdfLine[];
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  total: number;
  extraTotals?: { label: string; value: number }[]; // Paid, Credited, Balance
  payment?: string[]; // bank details lines
  terms?: string | null;
  footer?: string | null;
};

const NAVY = "#0E2A36";
const GOLD = "#B88A35";
const GOLD_INK = "#7C5A1A";
const INK = "#16242B";
const MUTED = "#5B6A70";
const LINE = "#DCE1DF";
const TONE = { good: "#2E7D4F", warn: "#A86A00", muted: MUTED };

const s = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: INK,
    lineHeight: 1.4,
  },
  top: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 3,
    borderBottomColor: GOLD,
    paddingBottom: 14,
    marginBottom: 20,
  },
  mark: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  markName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 20,
    color: NAVY,
    letterSpacing: 1,
  },
  markSub: { fontSize: 8, color: GOLD_INK, letterSpacing: 2, marginBottom: 3 },
  small: { fontSize: 8.5, color: MUTED },
  label: { fontSize: 7.5, color: MUTED, letterSpacing: 1, marginBottom: 3 },
  heading: {
    fontFamily: "Helvetica-Bold",
    fontSize: 22,
    color: NAVY,
    textAlign: "right",
  },
  row: { flexDirection: "row", justifyContent: "space-between" },
  bold: { fontFamily: "Helvetica-Bold" },
  table: { marginTop: 18, borderWidth: 1, borderColor: LINE },
  th: {
    flexDirection: "row",
    backgroundColor: "#F3F5F6",
    color: MUTED,
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
  },
  tr: { flexDirection: "row", borderTopWidth: 1, borderTopColor: LINE },
  cDesc: { flex: 1, padding: 7 },
  cNum: { width: 70, padding: 7, textAlign: "right" },
  cQty: { width: 40, padding: 7, textAlign: "right" },
  totals: { marginTop: 12, alignSelf: "flex-end", width: 260 },
  totRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  grand: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 2,
    borderTopColor: NAVY,
    paddingTop: 5,
    marginTop: 4,
    fontFamily: "Helvetica-Bold",
    fontSize: 13,
  },
  block: { marginTop: 20 },
});

const qty = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));

function DocPdf({ d }: { d: PdfData }) {
  const c = d.company;
  return (
    <Document title={`${d.heading} ${d.number}`} author={c.name}>
      <Page size="A4" style={s.page}>
        <View style={s.top}>
          <View>
            {c.logo ? (
              // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt
              <Image
                src={c.logo}
                style={{
                  height: 36,
                  marginBottom: 6,
                  objectFit: "contain",
                  objectPosition: "left",
                }}
              />
            ) : (
              <View style={s.mark}>
                <Text style={s.markName}>MIDAS</Text>
                <Text style={s.markSub}>MEDIA SOLUTIONS</Text>
              </View>
            )}
            <Text style={s.small}>
              {[c.legalName ?? c.name, c.address, c.email, c.phone]
                .filter(Boolean)
                .join("\n")}
              {c.vatNumber ? `\nVAT number ${c.vatNumber}` : ""}
            </Text>
          </View>
          <View>
            <Text style={s.heading}>{d.heading}</Text>
            <Text style={[s.small, { textAlign: "right" }]}>
              {[d.number, ...d.dates.map((x) => `${x.label} ${x.value}`)].join(
                "\n",
              )}
            </Text>
          </View>
        </View>

        <View style={s.row}>
          <View>
            <Text style={s.label}>BILL TO</Text>
            <Text style={s.bold}>{d.billTo.name}</Text>
            {d.billTo.lines.map((l) => (
              <Text key={l}>{l}</Text>
            ))}
          </View>
          {d.status ? (
            <View>
              <Text style={[s.label, { textAlign: "right" }]}>STATUS</Text>
              <Text
                style={[
                  s.bold,
                  { color: TONE[d.status.tone], textAlign: "right" },
                ]}
              >
                {d.status.label}
              </Text>
            </View>
          ) : null}
        </View>

        {d.intro ? <Text style={s.block}>{d.intro}</Text> : null}

        <View style={s.table}>
          <View style={s.th}>
            <Text style={s.cDesc}>Description</Text>
            <Text style={s.cQty}>Qty</Text>
            <Text style={s.cNum}>Unit price</Text>
            <Text style={s.cNum}>Amount</Text>
          </View>
          {d.lines.map((l, i) => (
            <View key={i} style={s.tr} wrap={false}>
              <View style={s.cDesc}>
                <Text>{l.name}</Text>
                {l.description ? (
                  <Text style={s.small}>{l.description}</Text>
                ) : null}
              </View>
              <Text style={s.cQty}>{qty(l.quantity)}</Text>
              <Text style={s.cNum}>{formatMoney(l.unitPrice)}</Text>
              <Text style={s.cNum}>{formatMoney(l.lineTotal)}</Text>
            </View>
          ))}
        </View>

        <View style={s.totals}>
          <View style={s.totRow}>
            <Text>Subtotal</Text>
            <Text>{formatMoney(d.subtotal)}</Text>
          </View>
          {d.vatRate > 0 ? (
            <View style={s.totRow}>
              <Text>VAT {d.vatRate}%</Text>
              <Text>{formatMoney(d.vatAmount)}</Text>
            </View>
          ) : null}
          <View style={s.grand}>
            <Text>Total</Text>
            <Text>{formatMoney(d.total)}</Text>
          </View>
          {d.extraTotals?.map((t) => (
            <View key={t.label} style={s.totRow}>
              <Text>{t.label}</Text>
              <Text>{formatMoney(t.value)}</Text>
            </View>
          ))}
        </View>

        {d.payment?.length ? (
          <View style={s.block} wrap={false}>
            <Text style={s.label}>PAYMENT</Text>
            {d.payment.map((l) => (
              <Text key={l}>{l}</Text>
            ))}
          </View>
        ) : null}
        {d.terms ? (
          <View style={s.block} wrap={false}>
            <Text style={s.label}>TERMS</Text>
            <Text>{d.terms}</Text>
          </View>
        ) : null}
        {d.footer ? <Text style={[s.small, s.block]}>{d.footer}</Text> : null}
      </Page>
    </Document>
  );
}

export async function renderPdf(d: PdfData): Promise<Buffer> {
  return renderToBuffer(<DocPdf d={d} />);
}

export const pdfDate = (value: string | null) =>
  value ? formatDay(value) : "—";
