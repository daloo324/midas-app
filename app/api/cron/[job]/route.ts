import { timingSafeEqual } from "node:crypto";
import {
  approvalNudges,
  cleanup,
  invoiceReminders,
  retainerInvoices,
} from "@/lib/cron/jobs";
import { todayInGaborone } from "@/lib/format";
import { createServiceClient } from "@/lib/supabase/service";

// Vercel Cron calls these with "Authorization: Bearer $CRON_SECRET"
// (schedules in vercel.json, in UTC). Anything else is refused.

export const maxDuration = 60;

const JOBS = {
  "retainer-invoices": (today: string) =>
    retainerInvoices(createServiceClient(), today),
  "invoice-reminders": (today: string) =>
    invoiceReminders(createServiceClient(), today),
  "approval-nudges": (today: string) =>
    approvalNudges(createServiceClient(), today),
  cleanup: () => cleanup(createServiceClient()),
} as const;

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const got = Buffer.from(req.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
}

export async function GET(req: Request, ctx: RouteContext<"/api/cron/[job]">) {
  const { job } = await ctx.params;
  if (!authorized(req)) return new Response("Not allowed.", { status: 401 });
  const run = JOBS[job as keyof typeof JOBS];
  if (!run) return new Response("No such job.", { status: 404 });
  try {
    const result = await run(todayInGaborone());
    return Response.json({ job, ok: true, result });
  } catch (e) {
    console.error(`Cron job ${job} failed`, e);
    return Response.json(
      { job, ok: false, error: "The job failed; see the logs." },
      { status: 500 },
    );
  }
}
