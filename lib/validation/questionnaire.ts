import { z } from "zod";

// What the questionnaire page sends. The database checks the token, the
// upload paths and the shape again (submit_questionnaire).

export const questionnaireToken = z.string().regex(/^[A-Za-z0-9_-]{32}$/);

const text = (max: number) => z.string().trim().max(max);

export const questionnaireSubmission = z.object({
  token: questionnaireToken,
  answers: z
    .array(
      z.object({
        section: text(80),
        question: text(200),
        answer: text(5000),
      }),
    )
    .max(200),
  uploads: z
    .array(
      z.object({
        path: z.string().max(400),
        note: text(300),
        question: text(200),
        section: text(80),
      }),
    )
    .max(48),
});

export type QuestionnaireSubmission = z.infer<typeof questionnaireSubmission>;
