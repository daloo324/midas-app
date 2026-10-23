import { z } from "zod";
import { CLIENT_STATUSES } from "@/lib/format/status";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional();

const optionalDate = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .pipe(z.iso.date({ error: "Use a valid date." }).nullable())
  .nullable()
  .optional();

export const PLATFORMS = [
  "facebook",
  "instagram",
  "tiktok",
  "linkedin",
  "x",
  "youtube",
] as const;

export const PLATFORM_LABELS: Record<(typeof PLATFORMS)[number], string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
  x: "X",
  youtube: "YouTube",
};

export const newClientSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: "Enter the business name." })
    .max(120),
  industry: optionalText(120),
  contactName: optionalText(120),
  contactEmail: z
    .string()
    .trim()
    .toLowerCase()
    .transform((v) => (v === "" ? null : v))
    .pipe(z.email({ error: "Enter a valid email address." }).nullable()),
  contactPhone: optionalText(40),
  accountExecId: z.uuid({ error: "Choose an account exec." }),
  serviceId: z.uuid({ error: "Choose a service." }),
});

export const clientRecordSchema = z.object({
  clientId: z.uuid(),
  name: z
    .string()
    .trim()
    .min(1, { error: "Enter the business name." })
    .max(120),
  industry: optionalText(120),
  contactName: optionalText(120),
  contactRole: optionalText(120),
  contactEmail: z
    .string()
    .trim()
    .toLowerCase()
    .transform((v) => (v === "" ? null : v))
    .pipe(z.email({ error: "Enter a valid email address." }).nullable()),
  contactPhone: optionalText(40),
  decisionMaker: optionalText(120),
  platforms: z.array(z.enum(PLATFORMS)).max(PLATFORMS.length),
  notes: optionalText(4000),
});

export const clientAdminSchema = z.object({
  clientId: z.uuid(),
  status: z.enum(CLIENT_STATUSES as [string, ...string[]], {
    error: "Choose a status.",
  }),
  accountExecId: z.uuid({ error: "Choose an account exec." }),
  serviceId: z.uuid({ error: "Choose a service." }),
  startDate: optionalDate,
  endDate: optionalDate,
});

export const clientLoginSchema = z.object({
  clientId: z.uuid(),
  fullName: z
    .string()
    .trim()
    .min(1, { error: "Enter the contact's name." })
    .max(120),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email({ error: "Enter a valid email address." })),
});

export const clientLoginActiveSchema = z.object({
  clientUserId: z.uuid(),
  active: z.enum(["true", "false"]).transform((v) => v === "true"),
});
