import { z } from "zod";
import {
  BASELINE_FIELDS,
  CAMPAIGN_PARTS,
  ITEM_PLATFORMS,
  KPI_KEYS,
  MANUAL_CHECKS,
  POST_PILLARS,
  type CampaignFieldKey,
} from "@/lib/content/constants";
import { PLATFORMS } from "@/lib/validation/clients";

// Inputs to the Account Desk's server actions. The database checks access and
// the rules again; these keep the shapes and sizes right.

export const uuid = z.uuid();
export const monthValue = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])-01$/, { error: "Choose a month." });
const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { error: `Keep it under ${max} characters.` });
const optional = (max: number) =>
  text(max).transform((v) => (v === "" ? null : v));
const day = z.union([
  z.literal("").transform(() => null),
  z.iso.date({ error: "Use a valid date." }),
]);

export const itemField = z.discriminatedUnion("field", [
  z.object({ field: z.literal("topic"), value: optional(200) }),
  z.object({ field: z.literal("notes"), value: optional(2000) }),
  z.object({
    field: z.literal("scheduled_date"),
    value: z.iso.date({ error: "Choose a date in the month." }),
  }),
  z.object({ field: z.literal("pillar"), value: z.enum(POST_PILLARS) }),
  z.object({ field: z.literal("platform"), value: z.enum(ITEM_PLATFORMS) }),
]);

export const itemMove = z.object({
  itemId: uuid,
  status: z.enum(["approved", "changes_requested", "scheduled", "published"]),
  note: optional(1000),
});

export const checkToggle = z.object({
  monthId: uuid,
  key: z.enum(MANUAL_CHECKS as [string, ...string[]]),
  done: z.boolean(),
});

const CAMPAIGN_FIELD_KEYS = [
  "name",
  ...CAMPAIGN_PARTS.flatMap((p) => p.fields.map((f) => f.key)),
] as [CampaignFieldKey, ...CampaignFieldKey[]];

export const campaignField = z
  .object({ key: z.enum(CAMPAIGN_FIELD_KEYS), value: z.string().max(5000) })
  .transform(({ key, value }, ctx) => {
    const v = value.trim();
    if (key === "start_date" || key === "end_date") {
      const parsed = day.safeParse(v);
      if (!parsed.success)
        ctx.addIssue({ code: "custom", message: "Use a valid date." });
      return { key, value: parsed.success ? parsed.data : null };
    }
    if (key === "ad_budget") {
      if (v === "") return { key, value: null };
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0 || n > 10_000_000)
        ctx.addIssue({ code: "custom", message: "Enter an amount in pula." });
      return { key, value: Math.round(n * 100) / 100 };
    }
    if (key === "ads_run_by" && v !== "" && v !== "midas" && v !== "client")
      ctx.addIssue({ code: "custom", message: "Choose who runs the ads." });
    return { key, value: v === "" ? null : v };
  });

export const campaignMove = z.object({
  campaignId: uuid,
  status: z.enum(["sent", "live", "complete", "draft"]),
  checks: z.boolean().default(false),
});

export const kpiField = z.object({
  clientId: uuid,
  month: monthValue,
  key: z.enum(KPI_KEYS as [string, ...string[]]),
  value: z.union([
    z.literal("").transform(() => null),
    z.coerce
      .number({ error: "Enter a number." })
      .min(0, { error: "Numbers can't be negative." })
      .max(1e12),
  ]),
});

export const reviewField = z.object({
  monthId: uuid,
  key: z.enum(["working", "adjust", "top_piece", "focus"]),
  value: text(3000),
});

const contactEmail = z
  .string()
  .trim()
  .toLowerCase()
  .transform((v) => (v === "" ? null : v))
  .pipe(z.email({ error: "Enter a valid email address." }).nullable());

export const profileField = z.discriminatedUnion("field", [
  z.object({ field: z.literal("contact_name"), value: optional(120) }),
  z.object({ field: z.literal("contact_role"), value: optional(120) }),
  z.object({ field: z.literal("contact_email"), value: contactEmail }),
  z.object({ field: z.literal("contact_phone"), value: optional(40) }),
  z.object({ field: z.literal("decision_maker"), value: optional(120) }),
  z.object({ field: z.literal("expectation_notes"), value: optional(3000) }),
  z.object({
    field: z.literal("main_goal"),
    value: z
      .enum(["visibility", "credibility", "engagement", "results"])
      .nullable(),
  }),
  z.object({
    field: z.literal("platforms"),
    value: z.array(z.enum(PLATFORMS)).max(PLATFORMS.length),
  }),
  z.object({
    field: z.literal("pillar_mix"),
    value: z
      .object(
        Object.fromEntries(
          POST_PILLARS.map((p) => [p, z.number().int().min(0).max(20)]),
        ) as Record<(typeof POST_PILLARS)[number], z.ZodNumber>,
      )
      .refine((m) => Object.values(m).reduce((a, b) => a + b, 0) === 20, {
        error: "The five numbers must add up to 20.",
      }),
  }),
  z.object({
    field: z.literal("baseline"),
    value: z.object(
      Object.fromEntries(
        BASELINE_FIELDS.map((b) => [
          b.key,
          z.number().min(0).max(1e12).optional(),
        ]),
      ),
    ),
  }),
]);
