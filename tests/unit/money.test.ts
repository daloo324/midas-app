import { describe, expect, it } from "vitest";
import {
  invoicePdfData,
  type Company,
  type Invoice,
} from "@/lib/documents/money";
import { renderPdf } from "@/lib/pdf/document";
import { salesNumbers, type Lead } from "@/lib/data/sales";
import { docLine, money, quoteDraft } from "@/lib/validation/admin";

const company: Company = {
  name: "Midas Media Solutions",
  legalName: null,
  address: "Gaborone",
  email: "info@example.com",
  phone: null,
  vatNumber: null,
  logo: null,
  bank: { bank: "Test Bank", account_number: "123", branch_code: "01" },
  footer: "Thank you.",
  paymentTermsDays: 7,
  vatRegistered: false,
  vatRate: 14,
};

const invoice: Invoice = {
  id: "00000000-0000-4000-8000-000000000001",
  number: "MM-INV-2026-0001",
  status: "part_paid",
  title: "Invoice",
  period_label: "November 2026",
  period_month: "2026-11-01",
  is_retainer: true,
  issue_date: "2026-11-01",
  due_date: "2026-11-08",
  subtotal: 3250,
  vat_rate: 0,
  vat_amount: 0,
  total: 3250,
  amount_paid: 1000,
  amount_credited: 0,
  balance: 2250,
  notes: null,
  pdf_path: null,
  quote_id: null,
  created_at: "2026-11-01T04:00:00Z",
  client: {
    id: "00000000-0000-4000-8000-000000000002",
    name: "Kgosi Coffee",
    contact_name: "Kagiso",
    contact_email: null,
    client_code: "MM-KGC-1001",
    reminders_enabled: true,
  },
  lines: [
    {
      id: "l1",
      serviceId: null,
      unit: "monthly",
      sort: 0,
      name: "Brand Launch · November 2026",
      description: null,
      quantity: 1,
      unitPrice: 3250,
      lineTotal: 3250,
    },
  ],
  payments: [],
  credits: [],
};

describe("invoice documents", () => {
  it("shows no VAT line while Midas isn't VAT-registered, and the balance after a part payment", () => {
    const d = invoicePdfData(invoice, company, "2026-11-05");
    expect(d.heading).toBe("INVOICE");
    expect(d.vatRate).toBe(0);
    expect(d.status).toEqual({ label: "Due", tone: "warn" });
    expect(d.extraTotals).toEqual([
      { label: "Paid", value: 1000 },
      { label: "Balance", value: 2250 },
    ]);
    expect(d.payment?.[0]).toContain("MM-INV-2026-0001");
  });

  it("flags an unpaid invoice past its due date as overdue", () => {
    expect(invoicePdfData(invoice, company, "2026-11-09").status?.label).toBe(
      "Overdue",
    );
  });

  it("renders a real PDF", async () => {
    const pdf = await renderPdf(invoicePdfData(invoice, company, "2026-11-05"));
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(1000);
  }, 20_000);
});

describe("money input", () => {
  it("reads pula amounts the way people type them", () => {
    expect(money.parse("P3,250.00")).toBe(3250);
    expect(money.parse("3 250.5")).toBe(3250.5);
    expect(money.safeParse("3250.555").success).toBe(false);
    expect(money.safeParse("-5").success).toBe(false);
  });

  it("rounds line quantities and prices to cents and refuses empty lines", () => {
    const l = docLine.parse({
      serviceId: null,
      name: "Logo",
      description: "",
      unit: null,
      quantity: "1.006",
      unitPrice: "99.999",
    });
    expect(l).toMatchObject({
      quantity: 1.01,
      unitPrice: 100,
      description: null,
    });
    expect(
      docLine.safeParse({
        serviceId: null,
        name: " ",
        description: "",
        unit: null,
        quantity: 1,
        unitPrice: 1,
      }).success,
    ).toBe(false);
    expect(
      quoteDraft.safeParse({
        id: invoice.id,
        intro: "",
        terms: "",
        validUntil: "",
        lines: Array(51).fill(l),
      }).success,
    ).toBe(false);
  });
});

describe("sales numbers", () => {
  const base: Lead = {
    id: "x",
    company: "A",
    contact_name: null,
    email: null,
    phone: null,
    source: "referral",
    stage: "new",
    estimated_value: null,
    owner_id: null,
    owner: null,
    next_action: null,
    next_action_date: null,
    lost_reason: null,
    notes: null,
    client_id: null,
    closed_at: null,
    created_at: "2026-11-02T08:00:00Z",
  };
  it("counts conversion as won ÷ closed over the last 90 days", () => {
    const n = salesNumbers(
      [
        {
          ...base,
          id: "1",
          stage: "won",
          estimated_value: 39000,
          closed_at: "2026-11-03T08:00:00Z",
        },
        {
          ...base,
          id: "2",
          stage: "lost",
          lost_reason: "price",
          closed_at: "2026-10-20T08:00:00Z",
        },
        {
          ...base,
          id: "3",
          stage: "won",
          estimated_value: 1000,
          closed_at: "2026-05-01T08:00:00Z",
        },
        { ...base, id: "4", source: "website" },
      ],
      "2026-11-10",
    );
    expect(n.conversion).toBe(0.5);
    expect(n.averageDeal).toBe(39000);
    expect(n.thisMonth).toBe(4);
    expect(n.bySource).toEqual([
      { source: "referral", count: 3 },
      { source: "website", count: 1 },
    ]);
  });
});

describe("checkboxes", () => {
  it("read an unticked box (no field at all) as off", async () => {
    const { invoicingSchema, vatSchema } =
      await import("@/lib/validation/admin");
    expect(
      invoicingSchema.parse({ paymentTermsDays: "7" }).remindersEnabled,
    ).toBe(false);
    expect(
      vatSchema.parse({ vatNumber: "", vatRate: "14" }).vatRegistered,
    ).toBe(false);
    expect(
      vatSchema.safeParse({ vatRegistered: "on", vatNumber: "", vatRate: "14" })
        .success,
    ).toBe(false);
  });
});
