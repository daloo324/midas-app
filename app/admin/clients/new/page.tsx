import type { Metadata } from "next";
import Link from "next/link";
import { NewClientForm } from "@/components/admin/new-client-form";
import { listAccountExecs, listServices } from "@/lib/clients/queries";

export const metadata: Metadata = { title: "New client" };

export default async function NewClientPage() {
  const [execs, services] = await Promise.all([
    listAccountExecs(),
    listServices(),
  ]);
  return (
    <>
      <div className="crumbs">
        <Link href="/admin/clients" style={{ color: "inherit" }}>
          Clients
        </Link>{" "}
        / New client
      </div>
      <div className="head">
        <div>
          <h1>New client</h1>
          <p className="sub">
            Add a client from scratch. Won leads become clients from Sales
            (Phase 5).
          </p>
        </div>
      </div>
      <section className="panel" style={{ maxWidth: 760 }}>
        <NewClientForm
          execs={execs
            .filter((e) => e.active)
            .map((e) => ({ id: e.id, label: e.full_name }))}
          services={services
            .filter((s) => s.active)
            .map((s) => ({ id: s.id, name: s.name, price: s.price }))}
        />
      </section>
    </>
  );
}
