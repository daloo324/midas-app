import type { Metadata } from "next";
import Link from "next/link";
import { NewQuoteForm } from "@/components/admin/new-quote-form";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "New quote" };

export default async function NewQuotePage({
  searchParams,
}: PageProps<"/admin/quotes/new">) {
  const sp = await searchParams;
  const supabase = await createClient();
  const [{ data: leads }, { data: clients }] = await Promise.all([
    supabase
      .from("leads")
      .select("id, company")
      .in("stage", ["new", "contacted", "quote_sent", "won"])
      .is("client_id", null)
      .order("company"),
    supabase
      .from("clients")
      .select("id, name")
      .neq("status", "ended")
      .order("name"),
  ]);
  const lead = typeof sp.lead === "string" ? sp.lead : undefined;
  const client = typeof sp.client === "string" ? sp.client : undefined;
  return (
    <>
      <div className="crumbs">
        <Link href="/admin/quotes" style={{ color: "inherit" }}>
          Quotes
        </Link>{" "}
        / New
      </div>
      <div className="head">
        <div>
          <h1>New quote</h1>
          <p className="sub">
            Pick who it&apos;s for, then add lines from the catalogue.
          </p>
        </div>
      </div>
      <section className="panel" style={{ maxWidth: 560 }}>
        <NewQuoteForm
          leads={leads ?? []}
          clients={clients ?? []}
          selected={
            lead ? `lead:${lead}` : client ? `client:${client}` : undefined
          }
        />
      </section>
    </>
  );
}
