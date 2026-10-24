import type { Metadata } from "next";
import { InvoicesPage } from "@/components/portal/pages/invoices";
import { clientViewer } from "@/lib/portal/viewer";

export const metadata: Metadata = { title: "Invoices" };

export default async function Page() {
  return <InvoicesPage viewer={await clientViewer()} />;
}
