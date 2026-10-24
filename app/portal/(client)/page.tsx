import type { Metadata } from "next";
import { OverviewPage } from "@/components/portal/pages/overview";
import { clientViewer } from "@/lib/portal/viewer";

export const metadata: Metadata = { title: "Overview" };

export default async function Page() {
  return <OverviewPage viewer={await clientViewer()} />;
}
