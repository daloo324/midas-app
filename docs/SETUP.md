# Setup (Phase 0)

Everything Dave does before the first Claude Code session. No coding needed. Allow an afternoon, plus waiting time for Meta.

## 1. Tools on your laptop

1. **Node.js** (LTS version) from nodejs.org.
2. **Git**, if it isn't already installed (you use it for the website, so it probably is).
3. **Docker Desktop** from docker.com. Supabase uses it to run a local copy of the database.
4. **Supabase CLI:** follow supabase.com/docs/guides/cli.
5. **Claude Code:** follow the install guide at docs.claude.com (Claude Code section), then sign in.
6. Clone this repo: `git clone https://github.com/daloo324/midas-app.git`, then open the folder in your terminal.

## 2. Accounts

Use your Midas email for all of them, and switch on two-factor sign-in wherever it's offered.

| Service | What to create | Notes |
| --- | --- | --- |
| **Supabase** (supabase.com) | An organisation "Midas Media", then two projects: `midas-app-staging` and `midas-app-prod` | Pick the region closest to Botswana that's offered (e.g. a European or South African region). Save each project's database password somewhere safe. |
| **Vercel** (vercel.com) | Sign in with GitHub and import `daloo324/midas-app` | Claude Code will guide the settings in Phase 1. |
| **Resend** (resend.com) | Add the domain `midasmedia.co.bw` | It shows DNS records to add at Hostinger (step 3). |
| **Anthropic Console** (console.anthropic.com) | An API key for design suggestions | Add a small monthly spend limit. |

Claude Code will ask you for keys during Phase 1. Paste them only into `.env.local` (on your laptop) and into Vercel's Environment Variables screen, never into chat messages or code.

## 3. Domain (Hostinger)

1. Confirm midasmedia.co.bw is registered in your name or the company's, and that you have your own Hostinger login. If the supplier holds it, ask them to move it into an account you own.
2. Before changing anything, take a screenshot of the existing DNS records, especially any `MX` records if you use email on the domain.
3. Add the records Resend shows you (for email sending).
4. In Phase 1, Claude Code will tell you the exact `CNAME` record for `app.midasmedia.co.bw` from Vercel. Add only that; don't remove anything.

## 4. Start Meta now (it takes weeks)

Needed only in Phase 6, but Meta's checks are slow, so begin now:

1. Put the public website (repo `midasmedia2026`) live on midasmedia.co.bw, even a simple version. Vercel or Netlify can host it free from its git repo.
2. In Meta Business Manager, verify the domain.
3. Start business verification. Have your company registration documents ready; the name and address must match.
4. Once verified, create a developer app (type: Business) at developers.facebook.com. Details are in `docs/spec/07-integrations.md`.

## 5. Google Analytics

1. Make sure the Midas website has a GA4 property.
2. When Phase 6 starts, Claude Code will walk you through creating the service account.

## Ready?

When steps 1–3 are done, start Phase 1 using the prompt in `docs/PHASES.md`.
