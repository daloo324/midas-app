import type { Metadata } from "next";
import { InvoicesPage } from "@/components/portal/pages/invoices";
import { clientViewer } from "@/lib/portal/viewer";

export const metadata: Metadata = { title: "Invoices" };

export default async function Page({
  searchParams,
}: PageProps<"/portal/invoices">) {
  const { view } = await searchParams;
  return (
    <InvoicesPage
      viewer={await clientViewer()}
      view={typeof view === "string" ? view : undefined}
    />
  );
}
