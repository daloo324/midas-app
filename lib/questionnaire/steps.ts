// The brand discovery questionnaire, from docs/prototypes/brand-questionnaire.html.
// Used by /start/[token] to ask the questions and by the onboarding page to
// show the brief in the same order.

export type Option = {
  v: string;
  d?: string;
  art?: ArtKey;
  sw?: string[];
  font?: string;
};
export type ArtKey =
  "wordmark" | "letter" | "combo" | "emblem" | "mascot" | "unsure";

export type Field = {
  id: string;
  label: string;
  type:
    | "text"
    | "email"
    | "tel"
    | "date"
    | "textarea"
    | "chips"
    | "cards"
    | "swatches"
    | "fonts"
    | "sliders"
    | "triple"
    | "colors"
    | "upload";
  required?: boolean;
  half?: boolean;
  single?: boolean;
  placeholder?: string;
  placeholders?: [string, string, string];
  hint?: string;
  rows?: number;
  options?: string[] | Option[];
  pairs?: [string, string][];
};

export type Step = {
  id: string;
  title: string;
  intro: string;
  fields: Field[];
};

export const UPLOADS_PER_QUESTION = 12;

export const STEPS: Step[] = [
  {
    id: "business",
    title: "Your business",
    intro: "The basics, so we know who we're designing for.",
    fields: [
      {
        id: "biz_name",
        label: "Business name",
        type: "text",
        required: true,
        placeholder: "e.g. Kgosi Coffee Co.",
      },
      {
        id: "tagline",
        label: "Tagline or slogan",
        type: "text",
        hint: "Leave blank if you don't have one yet.",
      },
      {
        id: "contact_name",
        label: "Your name",
        type: "text",
        required: true,
        half: true,
      },
      {
        id: "contact_role",
        label: "Your role",
        type: "text",
        half: true,
        placeholder: "Owner, marketing manager…",
      },
      { id: "contact_email", label: "Email", type: "email", half: true },
      {
        id: "contact_phone",
        label: "Phone / WhatsApp",
        type: "tel",
        half: true,
        placeholder: "+267 7…",
      },
      {
        id: "industry",
        label: "Industry",
        type: "text",
        half: true,
        placeholder: "Food, logistics, beauty…",
      },
      {
        id: "location",
        label: "Where do you operate?",
        type: "text",
        half: true,
        placeholder: "Gaborone, nationwide, online…",
      },
      {
        id: "stage",
        label: "Where is the business right now?",
        type: "chips",
        single: true,
        options: [
          "Not launched yet",
          "Under 1 year",
          "1–3 years",
          "3+ years",
          "Rebranding an existing business",
        ],
      },
      {
        id: "oneliner",
        label: "In one sentence, what does your business do?",
        type: "textarea",
        rows: 2,
      },
      {
        id: "offer",
        label: "Your main products or services",
        type: "textarea",
        rows: 3,
      },
      {
        id: "socials",
        label: "Existing website or social media handles",
        type: "text",
        placeholder: "@yourbrand on Instagram, facebook.com/…",
      },
    ],
  },
  {
    id: "audience",
    title: "Your customers",
    intro:
      "A brand is designed for the people you want to attract, not for everyone.",
    fields: [
      {
        id: "aud_type",
        label: "Who buys from you?",
        type: "chips",
        options: [
          "Individual consumers",
          "Small businesses",
          "Corporates",
          "Government",
          "Tourists",
          "Students",
          "Parents & families",
        ],
      },
      {
        id: "aud_age",
        label: "Main age groups",
        type: "chips",
        options: ["Under 18", "18–24", "25–34", "35–44", "45–54", "55+"],
      },
      {
        id: "aud_desc",
        label: "Describe your ideal customer",
        type: "textarea",
        hint: "Where do they live? What do they care about? Where do they spend time online?",
      },
      {
        id: "problem",
        label: "What problem do you solve for them?",
        type: "textarea",
        rows: 3,
      },
      {
        id: "why_us",
        label: "Why do customers choose you over others?",
        type: "textarea",
        rows: 3,
      },
      {
        id: "competitors",
        label: "Who are your main competitors?",
        type: "textarea",
        rows: 2,
        hint: "Names or social handles. Two or three is enough.",
      },
      {
        id: "comp_notes",
        label: "What do you like or dislike about how they look?",
        type: "textarea",
        rows: 3,
      },
    ],
  },
  {
    id: "personality",
    title: "Brand personality",
    intro:
      "Slide each bar to where your brand sits. The middle is fine if you're in between.",
    fields: [
      {
        id: "sliders",
        label: "Your brand feels…",
        type: "sliders",
        pairs: [
          ["Classic", "Modern"],
          ["Playful", "Serious"],
          ["Affordable", "Premium"],
          ["Quiet", "Bold"],
          ["Local", "International"],
          ["Youthful", "Established"],
        ],
      },
      {
        id: "three_words",
        label: "Three words you want people to use about your brand",
        type: "triple",
        placeholders: ["e.g. Trusted", "Warm", "Proudly local"],
      },
      {
        id: "avoid_words",
        label: "Words you never want linked to your brand",
        type: "text",
        placeholder: "e.g. cheap, corporate, boring",
      },
      {
        id: "as_person",
        label: "If your brand walked into a room, how would it come across?",
        type: "textarea",
        rows: 3,
      },
    ],
  },
  {
    id: "logo",
    title: "Your logo",
    intro:
      "Pick every style you'd be happy to see. We'll explore the strongest direction.",
    fields: [
      {
        id: "logo_type",
        label: "Logo styles you'd consider",
        type: "cards",
        options: [
          {
            v: "Wordmark",
            d: "Your name in custom lettering",
            art: "wordmark",
          },
          { v: "Lettermark", d: "Initials as the main mark", art: "letter" },
          {
            v: "Symbol + name",
            d: "An icon sitting beside the name",
            art: "combo",
          },
          {
            v: "Emblem / badge",
            d: "Name enclosed in a crest or seal",
            art: "emblem",
          },
          { v: "Mascot", d: "A character that represents you", art: "mascot" },
          { v: "Not sure", d: "Show me options", art: "unsure" },
        ],
      },
      {
        id: "name_in_logo",
        label: "What name should the logo show?",
        type: "chips",
        single: true,
        options: ["Full business name", "Short name or initials", "Not sure"],
      },
      {
        id: "logo_include",
        label: "Any symbols, shapes or ideas the logo could include?",
        type: "textarea",
        rows: 3,
        hint: "An animal, a landmark, something from your story or culture.",
      },
      {
        id: "logo_avoid",
        label: "Anything the logo must avoid?",
        type: "textarea",
        rows: 2,
      },
      {
        id: "logo_uses",
        label: "Where will the logo appear?",
        type: "chips",
        options: [
          "Social media",
          "Website",
          "Shop signage",
          "Vehicle branding",
          "Uniforms",
          "Packaging & labels",
          "Printed documents",
          "Merchandise",
        ],
      },
      {
        id: "logo_upload",
        label: "Logos you like",
        type: "upload",
        hint: "Any brand, any industry. Add a short note on what you like about each one.",
      },
    ],
  },
  {
    id: "colour",
    title: "Colour",
    intro:
      "Colour does most of the work in how a brand feels. Choose the families that feel right.",
    fields: [
      {
        id: "colour_families",
        label: "Colour families you're drawn to",
        type: "swatches",
        options: [
          { v: "Warm reds & oranges", sw: ["#B83A2E", "#E0663A", "#F2A65A"] },
          { v: "Sunny yellows", sw: ["#D9A11A", "#F2CF45", "#FBEAA8"] },
          { v: "Earth & sand", sw: ["#6E4A2B", "#B98B5E", "#E6D2B5"] },
          { v: "Fresh greens", sw: ["#2F6B3C", "#5FA05B", "#BFDCA8"] },
          { v: "Calm blues", sw: ["#1F5E8C", "#4E9AC7", "#BFE0F2"] },
          { v: "Deep navy & teal", sw: ["#0E2A36", "#1D5560", "#4F8C8F"] },
          { v: "Purples & plums", sw: ["#4B2B5E", "#7E4E9C", "#C9B2DE"] },
          { v: "Pinks & blush", sw: ["#A8325F", "#E58AAE", "#F7D5E2"] },
          { v: "Black & white", sw: ["#111111", "#7A7A7A", "#F2F2F2"] },
          { v: "Gold & bronze", sw: ["#7E5E24", "#C49A47", "#E8D29B"] },
        ],
      },
      {
        id: "colour_picks",
        label: "Specific colours you already love",
        type: "colors",
        hint: "Optional. Tap a swatch to change it.",
      },
      {
        id: "colour_avoid",
        label: "Colours to avoid",
        type: "text",
        placeholder: "e.g. a competitor's red, anything neon",
      },
      {
        id: "colour_meaning",
        label:
          "Any colours with meaning to you, your culture or your industry?",
        type: "textarea",
        rows: 2,
      },
      {
        id: "colour_upload",
        label: "Colour inspiration",
        type: "upload",
        hint: "Photos, paint swatches, fabrics, nature, other brands. Anything with colours you like.",
      },
    ],
  },
  {
    id: "style",
    title: "Fonts & imagery",
    intro:
      "How your words and pictures look. Each sample uses your business name.",
    fields: [
      {
        id: "font_style",
        label: "Lettering styles you like",
        type: "fonts",
        options: [
          {
            v: "Classic serif",
            d: "Elegant, established",
            font: "var(--q-playfair), Georgia, serif",
          },
          {
            v: "Clean modern",
            d: "Simple, professional",
            font: "var(--q-manrope), 'Segoe UI', sans-serif",
          },
          {
            v: "Friendly rounded",
            d: "Warm, approachable",
            font: "var(--q-nunito), 'Segoe UI', sans-serif",
          },
          {
            v: "Bold & condensed",
            d: "Loud, confident",
            font: "var(--q-anton), Impact, sans-serif",
          },
          {
            v: "Handwritten",
            d: "Personal, crafted",
            font: "var(--q-caveat), cursive",
          },
        ],
      },
      {
        id: "photo_style",
        label: "Photo and image style",
        type: "chips",
        options: [
          "Bright & airy",
          "Dark & moody",
          "Real people, candid",
          "Product close-ups",
          "Local settings & landscapes",
          "Illustrations",
          "Bold graphics & shapes",
        ],
      },
      {
        id: "admired",
        label: "Brands you admire, from any industry, and why",
        type: "textarea",
        rows: 3,
      },
      {
        id: "mood_upload",
        label: "Mood board",
        type: "upload",
        hint: "Screenshots, photos, packaging, interiors. Anything with the feeling you want.",
      },
    ],
  },
  {
    id: "practical",
    title: "Practical details",
    intro: "Last few questions, then you're done.",
    fields: [
      {
        id: "existing",
        label: "What do you already have?",
        type: "chips",
        options: [
          "An old logo",
          "Product or team photos",
          "Colours we already use",
          "Signage or printed material",
          "Nothing yet",
        ],
      },
      {
        id: "existing_upload",
        label: "Upload existing material",
        type: "upload",
        hint: "Old logo, photos of signage, business cards. Optional.",
      },
      {
        id: "launch",
        label: "When do you want to launch?",
        type: "date",
        half: true,
      },
      {
        id: "decider",
        label: "Who signs off on the final design?",
        type: "text",
        half: true,
        placeholder: "Name and role",
      },
      {
        id: "notes",
        label: "Anything else we should know?",
        type: "textarea",
        rows: 3,
      },
    ],
  },
];

export type AnswerValue =
  string | string[] | Record<string, number> | undefined;
export type Answers = Record<string, AnswerValue>;

/** One answer as plain text for the brief, or "" when it wasn't answered. */
export function answerText(field: Field, value: AnswerValue): string {
  if (field.type === "sliders") {
    const vals = (value as Record<string, number> | undefined) ?? {};
    return (field.pairs ?? [])
      .map(([a, b]) => `${a}–${b}: ${vals[`${a}|${b}`] ?? 3}/5`)
      .join("; ");
  }
  if (field.type === "colors")
    return ((value as string[] | undefined) ?? [])
      .map((c) => c.toUpperCase())
      .join(", ");
  if (Array.isArray(value))
    return value
      .map((v) => v.trim())
      .filter(Boolean)
      .join(", ");
  return typeof value === "string" ? value.trim() : "";
}

/** The answers in the shape the brief stores: {section, question, answer}. */
export function briefAnswers(answers: Answers) {
  return STEPS.flatMap((s) =>
    s.fields
      .filter((f) => f.type !== "upload")
      .map((f) => ({
        section: s.title,
        question: f.label,
        answer: answerText(f, answers[f.id]),
      })),
  );
}
