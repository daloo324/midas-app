import {
  creditNotePdfData,
  getInvoice,
  getQuote,
  invoicePdfData,
  loadCompany,
  pdfPath,
  quotePdfData,
  storePdf,
} from "@/lib/documents/money";
import { getCurrentUser } from "@/lib/auth/session";
import { todayInGaborone } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

// Downloads a quote, invoice or credit note PDF. Access is whatever RLS lets
// the signed-in person read: the CEO everything, account execs their clients'
// invoices, clients their own issued invoices and credit notes. If a stored
// PDF is missing (its making failed at issue), the CEO's download makes it.

const NUMBER = /^MM-(Q|INV|CN)-\d{4}-\d{4,}$/;

function notFound() {
  return new Response("We couldn't find that document.", { status: 404 });
}

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/documents/[kind]/[ref]">,
) {
  const { kind, ref } = await ctx.params;
  if (!["quote", "invoice", "credit_note"].includes(kind) || !NUMBER.test(ref))
    return notFound();
  const user = await getCurrentUser();
  if (!user) return new Response("Sign in to download this.", { status: 401 });
  const supabase = await createClient();
  const isCeo = user.kind === "staff" && user.role === "ceo";

  let path: string | null = null;
  let make: (() => Promise<Buffer>) | null = null;

  if (kind === "quote") {
    const q = await getQuote(supabase, ref);
    if (!q || !q.number) return notFound();
    path = q.pdf_path;
    make = async () =>
      storePdf(
        supabase,
        "quote",
        q.id,
        pdfPath("quote", q.number!),
        quotePdfData(q, await loadCompany(supabase)),
      );
  } else if (kind === "invoice") {
    const inv = await getInvoice(supabase, ref);
    if (!inv || !inv.number) return notFound();
    path = inv.pdf_path;
    make = async () =>
      storePdf(
        supabase,
        "invoice",
        inv.id,
        pdfPath("invoice", inv.number!, inv.client.id),
        invoicePdfData(inv, await loadCompany(supabase), todayInGaborone()),
      );
  } else {
    const { data: note } = await supabase
      .from("credit_notes")
      .select("id, invoice_id, pdf_path")
      .eq("number", ref)
      .maybeSingle();
    if (!note) return notFound();
    path = note.pdf_path;
    make = async () => {
      const inv = (await getInvoice(supabase, note.invoice_id))!;
      const n = inv.credits.find((c) => c.id === note.id)!;
      return storePdf(
        supabase,
        "credit_note",
        note.id,
        pdfPath("credit_note", ref, inv.client.id),
        creditNotePdfData(inv, n, await loadCompany(supabase)),
      );
    };
  }

  let pdf: Buffer | null = null;
  if (path) {
    const { data } = await supabase.storage.from("documents").download(path);
    if (data) pdf = Buffer.from(await data.arrayBuffer());
  }
  if (!pdf && isCeo && make) pdf = await make();
  if (!pdf) return notFound();

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${ref}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
