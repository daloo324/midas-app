# 04 · /creative — the Design Studio

For designers and the creative director. Designers see **every** client, so they can learn from each other's work and avoid repeating designs. Prototype: `docs/prototypes/design-studio.html`.

## Pages

| Route | Contents |
| --- | --- |
| `/creative` | Client cards |
| `/creative/clients/[id]/brief` | Brand brief and designer notes |
| `/creative/clients/[id]/kit` | Brand kit |
| `/creative/clients/[id]/board?month=YYYY-MM&week=N` | Weekly board |
| `/creative/clients/[id]/time?month=YYYY-MM` | Time report for the client |
| `/creative/review` | Creative director's review queue (items in `internal_review`, oldest first) |
| `/creative/resources/fonts` · `/palette` · `/inspiration` | Shared resources |
| `/creative/time` | Team time this month (the creative director sees everyone; designers see their own) |

A **timer bar** sits under the header on every `/creative` page whenever the signed-in user has a running timer: what's being timed, the client, the live clock, a Stop button and a link to the item.

## Client cards

Each card shows the brand colours as a strip, name and industry, and either:
- brand kit status and items ready, out of 25, with "Content locked until sign-off", or
- this month's work by status, done out of total, time logged this month.

## Brand brief

The questionnaire answers grouped by section, with uploaded images; unanswered questions are hidden. Beside them, **designer notes**: a shared text area for motifs, do's and don'ts, and words the client used.

## Brand kit

The first deliverable for every client. Layout, slots and rules exactly as in the prototype's Brand kit tab:

- **Header:** status (the `work_status` flow), a timer for the kit, "Signed off by" with the date, a progress bar (out of 25), and **Download full kit (.zip)**.
- **Logo** and **Icon:** 3 colour versions (full colour, black, white) × 3 formats (SVG, PNG, PDF). Each slot accepts only its format; white versions preview on a dark background. Replace and Remove on each slot. Replacing deletes the old file from storage.
- **Colour palette:** primary, secondary, tertiary and accent pickers, with black and white shown as fixed swatches. Each shows HEX, RGB and CMYK (CMYK marked "approximate, confirm with the printer").
- **Fonts:** heading and body family names, a "Start from a pairing" picker (from the resources library), and Regular 400, Medium 500, SemiBold 600 and Bold 700 slots per family (TTF, OTF, WOFF, WOFF2). Uploaded fonts load with `@font-face` for previews.
- **Brand guide:** one PDF slot (3 pages) and a checklist: brand sheet, clear space, minimum sizes, do and don't examples, colour pairings, patterns and other designs.
- **Patterns and extras:** any number of SVG, PNG, JPG or PDF files.
- **Brand voice:** a text area.
- **Preview panel:** a sample post in the client's palette and fonts, plus colour pairings: white text and black text on each brand colour, with contrast ratio and a verdict (4.5 or more: body text; 3 to 4.5: large text only; under 3: avoid).

**Zip download:** built server-side (a route handler streams a zip from storage) as `{Client}-Brand-Kit.zip` with folders `Logo/`, `Icon/`, `Fonts/`, `Brand-Guide/`, `Patterns-and-extras/`, plus `Colours-and-fonts.txt`. Logo and icon files are renamed `{Client}_Logo_Full-colour.svg` and so on.

**Sign-off:** the creative director moves the kit to `client_review`, which puts it in the client's portal approvals. Client approval sets `approved` with `signed_off_by` and `signed_off_at`. Then:
- the kit's files become visible in the client's portal **Brand assets** tab,
- the weekly board unlocks,
- the account exec is notified that the client can be activated.

## Weekly board

Locked with an explanation until the brand kit is `approved`, and greyed out per month until the calendar is approved.

- **Week strip:** Monday-to-Sunday weeks covering the month, each showing done / total and a small progress bar. It opens on the current week.
- **One card per deliverable**, in date order:
  - Header: slot, format, date, pillar, platform, status (only the moves this user is allowed), timer.
  - Topic and AE notes (read-only).
  - Three fields: **Suggested visual**, **Copy on the design** (aim for 8 words or fewer; show a gentle count), **Caption**.
  - Hashtags, final file upload (to the `content` bucket), and a **client preview image** upload (what the client sees in the portal).
  - Comments thread: internal, or "visible to client" when the creative director replies to client feedback.
  - Client feedback, when changes were requested, shown in a highlighted box at the top.
- **Suggest visuals & copy** for the week, or per item (see below).

## Suggestions with Claude

- A server action calls the Anthropic Messages API with the client's brief, brand kit (colours by role, fonts, voice), designer notes, and the selected items (slot, format, date, pillar, platform, topic, notes).
- It asks for JSON keyed by slot: `visual` (1–2 sentences, naming colours by role, suited to the format), `graphic_copy` (8 words or fewer), `caption` (40–90 words in the brand voice, ending with one call to action; 1–2 lines for stories), `hashtags` (3–6, including a local Botswana tag where it fits). It must not invent prices, discounts or facts the topic, notes or brief don't give.
- Fills **only empty fields**. Shows "Suggested by Claude, edit before use" on each suggested field until a person edits it.
- Model from `ANTHROPIC_MODEL` (default `claude-sonnet-5-5`); key from `ANTHROPIC_API_KEY`, server-side only. Validate the response with Zod; on failure, show "Suggestions failed. Try again." and change nothing.
- Limit: 30 suggestion calls per user per day.

## Time tracking

- Start and stop on every item and on the brand kit. Starting a timer stops any other running timer for that user. Starting on a `planned` item moves it to `in_design`.
- If a timer has run for more than 4 hours, show "Still working on this?" and offer to stop it at the last activity time.
- Manual entry: add minutes with a note, for forgotten timers. Marked as manual in reports.
- **Client time report:** total this month; brand kit time (once-off); average per post, story, reel and ad; effective rate per hour (monthly fee ÷ hours this month); a table per item with time and status.
- **Team time:** hours per designer per client this month, with each client's effective rate.

## Resources

- **Fonts and pairings:** 14 free Google Fonts pairings (list in the prototype), filterable by the lettering styles clients pick in the questionnaire (classic serif, clean modern, friendly rounded, bold and condensed, handwritten). "Use for client" sets the client's kit fonts.
- **Palette builder:** 8 starting templates, four colour pickers, black and white fixed, a live sample post, the pairing contrast table, "Copy palette" and "Save to client's brand kit".
- **Inspiration board:** upload images, tag them (Post, Story, Reel, Ad, Typography, Colour, Layout, Photography, Illustration), optionally link a client, add a note. Filter by tag and client. Uploaders can delete their own images; the creative director can delete any.

## Acceptance criteria

- [ ] Designers see all clients' briefs, kits and boards, but no invoices, quotes or leads.
- [ ] Each kit slot rejects the wrong file type, and the zip contains every uploaded file in the right folder with the right name.
- [ ] The board stays locked until the kit is approved, and each month stays greyed out until its calendar is approved.
- [ ] Only the creative director can send work to the client (`internal_review → client_review`).
- [ ] A user can never have two running timers, even from two browser tabs.
- [ ] Suggestions never overwrite a field that has text in it.
- [ ] Client-approved brand kit files appear in the portal without anyone moving them.
