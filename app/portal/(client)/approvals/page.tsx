import type { Metadata } from "next";
import { ApprovalsPage } from "@/components/portal/pages/approvals";
import { clientViewer } from "@/lib/portal/viewer";

export const metadata: Metadata = { title: "Approvals" };

export default async function Page() {
  return <ApprovalsPage viewer={await clientViewer()} />;
}
