import { z } from "zod";
import {
  LEAD_SOURCES,
  LEAD_STAGES,
  LOST_REASONS,
  PAYMENT_METHODS,
  SERVICE_UNITS,
} from "@/lib/format/status";

// Inputs to the CEO's services and settings forms. The database checks again.

export const uuid = z.uuid();

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { error: `Keep it under ${max} characters.` });
const optionalText = (max: number) =>
  text(max)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional()
    .transform((v) => v ?? null);
const checkbox = z
  .union([z.literal("on"), z.literal("true"), z.literal(""), z.undefined()])
  .transform((v) => v === "on" || v === "true");

/** "P3,250.00", "3250" or "3 250.5" → 3250.5. */
export const money = z
  .string()
  .trim()
  .transform((v) => v.replace(/^P/i, "").replace(/[,\s]/g, ""))
  .pipe(
    z.string().regex(/^\d{1,10}(\.\d{1,2})?$/, {
      error: "Use an amount like 3250 or 3250.00.",
    }),
  )
  .transform(Number);

const wholeNumber = (min: number, max: number, label: string) =>
  z
    .string()
    .trim()
    .regex(/^\d+$/, { error: `${label} must be a whole number.` })
    .transform(Number)
    .pipe(
      z
        .number()
        .min(min, { error: `${label} must be at least ${min}.` })
        .max(max, { error: `${label} must be ${max} or less.` }),
    );

export const serviceSchema = z.object({
  id: z.union([z.literal("").transform(() => null), uuid]).optional(),
  name: text(120).min(1, { error: "Give the service a name." }),
  description: optionalText(2000),
  unit: z.enum(SERVICE_UNITS as [string, ...string[]], {
    error: "Choose a unit.",
  }),
  price: money,
  sort: wholeNumber(0, 9999, "Sort order"),
  active: checkbox,
  isRetainer: checkbox,
  inclusions: text(4000)
    .optional()
    .transform((v) =>
      (v ?? "")
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .slice(0, 30),
    ),
});

export const companySchema = z.object({
  companyName: text(120).min(1, { error: "Enter the company name." }),
  legalName: optionalText(160),
  address: optionalText(400),
  email: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .pipe(z.email({ error: "Use a valid email address." }).nullable()),
  phone: optionalText(40),
});

export const bankSchema = z.object({
  bank: optionalText(80),
  accountName: optionalText(120),
  accountNumber: optionalText(40),
  branchCode: optionalText(20),
  swift: optionalText(20),
});

export const invoicingSchema = z.object({
  paymentTermsDays: wholeNumber(0, 120, "Payment terms"),
  invoiceFooter: optionalText(1000),
  remindersEnabled: checkbox,
});

export const vatSchema = z
  .object({
    vatRegistered: checkbox,
    vatNumber: optionalText(40),
    vatRate: z
      .string()
      .trim()
      .regex(/^\d{1,2}(\.\d{1,2})?$/, { error: "Use a rate like 14." })
      .transform(Number),
  })
  .refine((v) => !v.vatRegistered || v.vatNumber, {
    error: "Enter the VAT number before switching VAT on.",
    path: ["vatNumber"],
  });

export const capacitySchema = z.object({
  maxActiveClients: wholeNumber(0, 500, "Maximum active clients"),
  profitThreshold: money,
});

const optionalDate = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .pipe(z.iso.date({ error: "Use a valid date." }).nullable())
  .optional()
  .transform((v) => v ?? null);
const optionalMoney = z
  .string()
  .trim()
  .optional()
  .transform((v) => v ?? "")
  .pipe(z.union([z.literal("").transform(() => null), money]));

export const leadSchema = z.object({
  id: z.union([z.literal("").transform(() => null), uuid]).optional(),
  company: text(120).min(1, { error: "Enter the company name." }),
  contactName: optionalText(120),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .transform((v) => (v === "" ? null : v))
    .pipe(z.email({ error: "Use a valid email address." }).nullable()),
  phone: optionalText(40),
  source: z.enum(LEAD_SOURCES as [string, ...string[]], {
    error: "Choose where the lead came from.",
  }),
  estimatedValue: optionalMoney,
  ownerId: z.union([z.literal("").transform(() => null), uuid]),
  nextAction: optionalText(200),
  nextActionDate: optionalDate,
  notes: optionalText(5000),
});

export const leadMove = z
  .object({
    id: uuid,
    stage: z.enum(LEAD_STAGES as [string, ...string[]]),
    lostReason: z.enum(LOST_REASONS).nullable().optional(),
  })
  .refine((v) => v.stage !== "lost" || v.lostReason, {
    error: "Choose why the lead was lost.",
  });

export const winLead = z.object({
  leadId: uuid,
  accountExecId: z.uuid({ error: "Choose an account exec." }),
  serviceId: z.uuid({ error: "Choose a service." }),
});

// Quote and invoice drafts: the editor posts the whole draft at once.
const quantity = z.coerce
  .number({ error: "Quantity must be a number." })
  .positive({ error: "Quantity must be more than 0." })
  .max(9999, { error: "Quantity must be 9999 or less." })
  .transform((n) => Math.round(n * 100) / 100);
const unitPrice = z.coerce
  .number({ error: "Price must be a number." })
  .min(0, { error: "Price can't be negative." })
  .max(9_999_999, { error: "Price is too large." })
  .transform((n) => Math.round(n * 100) / 100);

export const docLine = z.object({
  serviceId: uuid.nullable(),
  name: text(200).min(1, { error: "Every line needs a description." }),
  description: optionalText(2000),
  unit: z.enum(SERVICE_UNITS as [string, ...string[]]).nullable(),
  quantity,
  unitPrice,
});

export const quoteDraft = z.object({
  id: uuid,
  intro: optionalText(3000),
  terms: optionalText(3000),
  validUntil: optionalDate,
  lines: z.array(docLine).max(50, { error: "Keep it to 50 lines or fewer." }),
});

export const invoiceDraft = z.object({
  id: uuid,
  periodLabel: optionalText(60),
  notes: optionalText(2000),
  lines: z.array(docLine).max(50, { error: "Keep it to 50 lines or fewer." }),
});

export const newQuote = z.object({
  recipient: z.string().regex(/^(lead|client):[0-9a-f-]{36}$/i, {
    error: "Choose who the quote is for.",
  }),
});

export const paymentSchema = z.object({
  invoiceId: uuid,
  amount: money.pipe(
    z.number().positive({ error: "Enter an amount more than P0.00." }),
  ),
  paidOn: z.iso.date({ error: "Enter the date it was paid." }),
  method: z.enum(PAYMENT_METHODS, { error: "Choose how it was paid." }),
  reference: optionalText(120),
});

export const creditNoteSchema = z.object({
  invoiceId: uuid,
  amount: money.pipe(
    z.number().positive({ error: "Enter an amount more than P0.00." }),
  ),
  reason: text(500).min(1, { error: "Give a reason for the credit note." }),
});

// Midas's own marketing figures for one month, entered by hand until Phase 6.
const count = z
  .string()
  .trim()
  .transform((v) => v.replace(/[,\s]/g, ""))
  .pipe(
    z.union([
      z.literal("").transform(() => null),
      z
        .string()
        .regex(/^\d{1,9}$/, { error: "Use whole numbers, like 1200." })
        .transform(Number),
    ]),
  )
  .optional()
  .transform((v) => v ?? null);

export const marketingMonth = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, { error: "Choose a month." }),
  facebookFollowers: count,
  facebookReach: count,
  facebookInteractions: count,
  instagramFollowers: count,
  instagramReach: count,
  instagramInteractions: count,
  websiteVisitors: count,
  websiteEnquiries: count,
  topPages: text(2000)
    .optional()
    .transform((v, ctx) => {
      const pages: { path: string; views: number }[] = [];
      for (const line of (v ?? "")
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .slice(0, 10)) {
        const m = line.match(/^(\S+)\s+([\d,]+)$/);
        if (!m) {
          ctx.addIssue({
            code: "custom",
            message: `Write each top page as "/path 120": "${line}" isn't.`,
          });
          return z.NEVER;
        }
        pages.push({
          path: m[1].slice(0, 200),
          views: Number(m[2].replace(/,/g, "")),
        });
      }
      return pages;
    }),
});
