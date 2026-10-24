import { z } from "zod";
import {
  LIBRARY_WEIGHTS,
  INSPIRATION_TAGS,
  LETTERING_STYLES,
} from "@/lib/creative/constants";

// Inputs to the Design Studio's server actions. The database checks access,
// slots, file types and status moves again.

export const uuid = z.uuid();
const hex = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, { error: "Use a colour like #0E2A36." });
const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { error: `Keep it under ${max} characters.` });
const optional = (max: number) =>
  text(max).transform((v) => (v === "" ? null : v));

export const kitField = z.discriminatedUnion("field", [
  z.object({ field: z.literal("heading_font"), value: optional(80) }),
  z.object({ field: z.literal("body_font"), value: optional(80) }),
  z.object({ field: z.literal("voice"), value: optional(5000) }),
  z.object({
    field: z.literal("assigned_designer_id"),
    value: z.union([z.literal("").transform(() => null), uuid]),
  }),
]);

export const kitColor = z.object({
  clientId: uuid,
  role: z.enum(["primary", "secondary", "tertiary", "accent"]),
  value: z.union([
    z.literal("").transform(() => null),
    hex.transform((v) => v.toUpperCase()),
  ]),
});

export const palette = z.object({
  clientId: uuid,
  colors: z.object({
    primary: hex,
    secondary: hex,
    tertiary: hex,
    accent: hex,
  }),
});

export const guideCheck = z.object({
  clientId: uuid,
  key: z.enum([
    "sheet",
    "clear_space",
    "min_size",
    "do_dont",
    "pairings",
    "extras",
  ]),
  done: z.boolean(),
});

export const kitFile = z.object({
  clientId: uuid,
  slot: z
    .string()
    .regex(
      /^((logo|icon)_(full|black|white)_(svg|png|pdf)|font_(heading|body)_(400|500|600|700)|guide_pdf|extra)$/,
    ),
  path: z.string().max(400),
  name: z.string().trim().min(1).max(200),
  size: z
    .number()
    .int()
    .min(0)
    .max(52_428_800, { error: "Files can be up to 50 MB." }),
  mime: z.string().max(120).nullable(),
});

export const workMove = z.object({
  status: z.enum([
    "in_design",
    "internal_review",
    "client_review",
    "changes_requested",
  ]),
  comment: optional(1000),
});

export const designField = z.object({
  itemId: uuid,
  field: z.enum(["visual", "graphic_copy", "caption", "hashtags"]),
  value: optional(4000),
});

export const contentFile = z.object({
  itemId: uuid,
  kind: z.enum(["final", "preview"]),
  path: z.string().max(400),
});

export const comment = z.object({
  itemId: uuid,
  body: text(2000).min(1, { error: "Write something first." }),
  visibleToClient: z.boolean(),
});

export const manualTime = z.object({
  itemId: uuid.nullable(),
  kitClientId: uuid.nullable(),
  minutes: z.coerce
    .number({ error: "Enter the minutes." })
    .int()
    .min(1, { error: "At least 1 minute." })
    .max(720, { error: "Up to 12 hours." }),
  note: text(500).min(1, { error: "Add a note saying what the time was for." }),
});

export const inspiration = z.object({
  path: z.string().max(400),
  note: optional(500),
  tags: z.array(z.enum(INSPIRATION_TAGS)).max(INSPIRATION_TAGS.length),
  clientId: z.union([z.literal("").transform(() => null), uuid]).nullable(),
});

export const inspirationEdit = z.object({
  id: uuid,
  note: optional(500).optional(),
  tags: z
    .array(z.enum(INSPIRATION_TAGS))
    .max(INSPIRATION_TAGS.length)
    .optional(),
  clientId: z
    .union([z.literal("").transform(() => null), uuid])
    .nullable()
    .optional(),
});

// The shared font library (Fonts & pairings). Family names go into CSS, so
// they're limited to letters, numbers, spaces and hyphens.
const fontFamily = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9][A-Za-z0-9 -]{0,59}$/, {
    error: "Font names use letters, numbers, spaces and hyphens (60 at most).",
  });

export const libraryFont = z.object({
  path: z
    .string()
    .regex(/^[0-9a-f-]{36}\/[A-Za-z0-9._-]{1,80}\.(ttf|otf|woff|woff2)$/i),
  fileName: z
    .string()
    .max(200)
    .regex(/\.(ttf|otf|woff|woff2)$/i, {
      error: "Choose a TTF, OTF, WOFF or WOFF2 file.",
    }),
  size: z
    .number()
    .int()
    .min(1)
    .max(10 * 1024 * 1024, { error: "Font files can be up to 10 MB." }),
  family: fontFamily,
  weight: z.union(LIBRARY_WEIGHTS.map((w) => z.literal(w))),
  italic: z.boolean(),
  licence: optional(300),
});

export const libraryPairing = z.object({
  heading: fontFamily,
  body: fontFamily,
  style: z.enum(LETTERING_STYLES),
  goodFor: optional(120),
});
