import type { z } from "zod";

/** What a form's server action returns to the form. */
export type ActionState = {
  ok?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
};

export const initialState: ActionState = {};

/** The first message for each field, from a failed Zod parse. */
export function fieldErrorsFrom(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
