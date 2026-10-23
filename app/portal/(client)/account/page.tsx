import type { Metadata } from "next";
import { AccountPage } from "@/components/portal/pages/account";
import { clientViewer } from "@/lib/portal/viewer";

export const metadata: Metadata = { title: "Account" };

export default async function Page() {
  return <AccountPage viewer={await clientViewer()} />;
}
