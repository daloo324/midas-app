import type { Metadata } from "next";
import { AssetsPage } from "@/components/portal/pages/assets";
import { clientViewer } from "@/lib/portal/viewer";

export const metadata: Metadata = { title: "Brand assets" };

export default async function Page() {
  return <AssetsPage viewer={await clientViewer()} />;
}
