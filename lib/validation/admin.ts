import { z } from "zod";
import { SERVICE_UNITS } from "@/lib/format/status";

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
