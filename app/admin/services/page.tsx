import type { Metadata } from "next";
import { ServiceForm, type ServiceRow } from "@/components/admin/service-form";
import { formatMoney } from "@/lib/format";
import { SERVICE_UNIT_SUFFIX, type ServiceUnit } from "@/lib/format/status";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Services" };

export default async function ServicesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("services")
    .select(
      "id, name, description, unit, price, sort, active, is_retainer, inclusions",
    )
    .order("active", { ascending: false })
    .order("sort")
    .order("name");
  const services: ServiceRow[] = (data ?? []).map((s) => ({
    ...s,
    price: Number(s.price),
    inclusions: Array.isArray(s.inclusions) ? (s.inclusions as string[]) : [],
  }));

  return (
    <>
      <div className="head">
        <div>
          <h1>Services</h1>
          <p className="sub">
            The catalogue quotes are built from. A price change only affects new
            quotes; existing quotes and invoices keep the price they were made
            with. Switch a service off instead of removing it.
          </p>
        </div>
      </div>
      <div className="two">
        <section className="panel">
          <h2 style={{ marginBottom: 10 }}>Catalogue</h2>
          {services.length === 0 ? (
            <p className="sub">No services yet. Add your first one.</p>
          ) : (
            <div className="stack" style={{ gap: 10 }}>
              {services.map((s) => (
                <details key={s.id} className="svc">
                  <summary className="row between" style={{ gap: 10 }}>
                    <span>
                      <b>{s.name}</b>{" "}
                      {s.is_retainer ? (
                        <span className="pill s-gold">Retainer</span>
                      ) : null}{" "}
                      {s.active ? null : <span className="pill">Off</span>}
                    </span>
                    <span className="num">
                      {formatMoney(s.price)}{" "}
                      <span className="sub">
                        {SERVICE_UNIT_SUFFIX[s.unit as ServiceUnit]}
                      </span>
                    </span>
                  </summary>
                  <div style={{ paddingTop: 12 }}>
                    <ServiceForm service={s} />
                  </div>
                </details>
              ))}
            </div>
          )}
        </section>
        <section className="panel">
          <h2 style={{ marginBottom: 10 }}>Add a service</h2>
          <ServiceForm />
        </section>
      </div>
    </>
  );
}
