import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";

// "Suggest visuals & copy" (04-creative.md, "Suggestions with Claude"). Calls
// the Messages API server-side with the brief, brand kit, designer notes and
// the chosen items, and returns one suggestion per slot. The caller writes
// them into empty fields only.

export const suggestionSchema = z.object({
  suggestions: z.array(
    z.object({
      slot: z.string(),
      visual: z.string(),
      graphic_copy: z.string(),
      caption: z.string(),
      hashtags: z.string(),
    }),
  ),
});
export type Suggestion = z.infer<
  typeof suggestionSchema
>["suggestions"][number];

export type SuggestInput = {
  client: { name: string; industry: string | null };
  brief: { section: string; question: string; answer: string }[];
  designNotes: string | null;
  kit: {
    colors: Record<string, string>;
    heading_font: string | null;
    body_font: string | null;
    voice: string | null;
  };
  items: {
    slot: string;
    format: string;
    date: string | null;
    pillar: string;
    platform: string;
    topic: string | null;
    notes: string | null;
  }[];
};

export class SuggestionsUnavailable extends Error {}

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";

/** For end-to-end tests only: a fixed reply instead of calling Claude. Never on Vercel. */
function standIn(): boolean {
  return process.env.SUGGESTIONS_STAND_IN === "1" && !process.env.VERCEL_ENV;
}

export function suggestionsConfigured(): boolean {
  return standIn() || Boolean(process.env.ANTHROPIC_API_KEY);
}

const SYSTEM = `You write first drafts for a social media design team at Midas Media, an agency in Botswana.
For each content slot you're given, suggest:
- visual: 1–2 sentences describing the design or photo, naming brand colours by their role (primary, secondary, tertiary, accent), suited to the format (post, story or reel; ads are feed 4:5, story 9:16, or a test variant).
- graphic_copy: the words on the design, 8 words or fewer.
- caption: 40–90 words in the brand voice, ending with one call to action. For stories, 1–2 lines instead.
- hashtags: 3–6 hashtags separated by spaces, including a local Botswana tag where it fits.
Use only facts from the topic, notes, brief and kit. Never invent prices, discounts, dates, awards or other facts.
Return one suggestion for every slot you're given, using the slot code exactly as written.`;

function promptFor(input: SuggestInput): string {
  const colours =
    Object.entries(input.kit.colors)
      .map(([role, hex]) => `${role} ${hex}`)
      .join(", ") || "not set yet";
  const brief =
    input.brief
      .filter((a) => a.answer.trim())
      .map((a) => `- ${a.question}: ${a.answer}`)
      .join("\n") || "No brief yet.";
  const items = input.items
    .map((i) =>
      [
        `Slot ${i.slot}: ${i.format}, ${i.date ?? "no date"}, pillar ${i.pillar}, platform ${i.platform}`,
        `  Topic: ${i.topic || "none given"}`,
        i.notes ? `  Account exec notes: ${i.notes}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n");
  return [
    `Client: ${input.client.name}${input.client.industry ? ` (${input.client.industry})` : ""}`,
    `Brand colours by role: ${colours}`,
    `Fonts: heading ${input.kit.heading_font ?? "not set"}, body ${input.kit.body_font ?? "not set"}`,
    `Brand voice: ${input.kit.voice || "not written yet"}`,
    `Designer notes: ${input.designNotes || "none"}`,
    "",
    "Brand brief:",
    brief,
    "",
    "Slots to suggest for:",
    items,
  ].join("\n");
}

/** Throws SuggestionsUnavailable with a message for the person on any failure. */
export async function suggest(input: SuggestInput): Promise<Suggestion[]> {
  if (standIn()) {
    return input.items.map((i) => ({
      slot: i.slot,
      visual: `Stand-in visual for ${i.slot} in the primary colour.`,
      graphic_copy: "Stand-in words on the design",
      caption: `Stand-in caption for ${i.topic ?? i.slot}. Message us to find out more.`,
      hashtags: "#Botswana #Gaborone #StandIn",
    }));
  }
  if (!process.env.ANTHROPIC_API_KEY)
    throw new SuggestionsUnavailable(
      "Suggestions aren't set up yet. Ask Dave to add the Anthropic API key.",
    );

  const client = new Anthropic();
  try {
    const response = await client.beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      // If the model declines, the API retries on a fallback model in the same call.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM,
      messages: [{ role: "user", content: promptFor(input) }],
      output_config: { format: betaZodOutputFormat(suggestionSchema) },
    });
    if (response.stop_reason === "refusal" || !response.parsed_output)
      throw new SuggestionsUnavailable("Suggestions failed. Try again.");
    return response.parsed_output.suggestions;
  } catch (e) {
    if (e instanceof SuggestionsUnavailable) throw e;
    if (e instanceof Anthropic.RateLimitError)
      throw new SuggestionsUnavailable(
        "Claude is busy right now. Try again in a minute.",
      );
    throw new SuggestionsUnavailable("Suggestions failed. Try again.");
  }
}
