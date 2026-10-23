import { z } from "zod";
import { STAFF_ROLES } from "@/lib/auth/routes";

export const PASSWORD_MIN = 10;

/** Trims and uppercases a typed client login ID: " mm-kgc-2611 " -> "MM-KGC-2611". */
export function normaliseLoginId(value: string): string {
  return value.trim().toUpperCase();
}

export const LOGIN_ID_PATTERN = /^MM-[A-Z]{3}-\d{4}(-\d+)?$/;

export const staffSignInSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email({ error: "Enter your email address." })),
  password: z.string().min(1, { error: "Enter your password." }).max(200),
  next: z.string().optional(),
});

export const clientSignInSchema = z.object({
  loginId: z
    .string()
    .transform(normaliseLoginId)
    .pipe(z.string().min(1, { error: "Enter your client ID." }).max(40)),
  password: z.string().min(1, { error: "Enter your password." }).max(200),
  next: z.string().optional(),
});

export const staffResetSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email({ error: "Enter your email address." })),
});

export const clientResetSchema = z.object({
  loginId: z
    .string()
    .transform(normaliseLoginId)
    .pipe(z.string().min(1, { error: "Enter your client ID." }).max(40)),
});

export const setPasswordSchema = z
  .object({
    password: z
      .string()
      .min(PASSWORD_MIN, { error: `Use at least ${PASSWORD_MIN} characters.` })
      .max(72, { error: "Use 72 characters or fewer." }),
    confirm: z.string(),
    tokenHash: z.string().max(200).optional(),
    type: z.enum(["invite", "recovery"]).optional(),
  })
  .refine((v) => v.password === v.confirm, {
    path: ["confirm"],
    error: "The two passwords don't match.",
  });

export const staffInviteSchema = z.object({
  fullName: z.string().trim().min(1, { error: "Enter their name." }).max(120),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email({ error: "Enter a valid email address." })),
  role: z.enum(STAFF_ROLES, { error: "Choose a role." }),
});

export const staffRoleSchema = z.object({
  userId: z.uuid(),
  role: z.enum(STAFF_ROLES, { error: "Choose a role." }),
});

export const staffActiveSchema = z.object({
  userId: z.uuid(),
  active: z.enum(["true", "false"]).transform((v) => v === "true"),
});

export const staffUserSchema = z.object({ userId: z.uuid() });
