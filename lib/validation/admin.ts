import { z } from "zod";
import {
  LEAD_SOURCES,
  LEAD_STAGES,
  LOST_REASONS,
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
