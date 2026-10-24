import type { Metadata } from "next";
import { BriefPage } from "@/components/portal/pages/brief";
import { clientViewer } from "@/lib/portal/viewer";

export const metadata: Metadata = { title: "Brand brief" };

export default async function Page() {
  return <BriefPage viewer={await clientViewer()} />;
}
