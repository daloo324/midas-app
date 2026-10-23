"use server";

import { questionnaireSubmission } from "@/lib/validation/questionnaire";
import { createClient } from "@/lib/supabase/server";

export type SubmitResult = { ok: true } | { ok: false; error: string };

/** Saves the answers to the client's brief. Public: the token is the key. */
export async function submitQuestionnaire(
  input: unknown,
): Promise<SubmitResult> {
  const parsed = questionnaireSubmission.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error:
        "Some answers are too long or in the wrong shape. Shorten them and try again.",
    };
  }
  const { token, answers, uploads } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_questionnaire", {
    p_token: token,
    p_answers: answers,
    p_uploads: uploads,
  });
  if (error) {
    // P0001 messages are written for the person filling in the form.
    return {
      ok: false,
      error:
        error.code === "P0001"
          ? error.message
          : "Your answers didn't send. Check your connection and try again.",
    };
  }
  return { ok: true };
}
