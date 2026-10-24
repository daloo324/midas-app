import type { Metadata } from "next";
import { ReportsPage } from "@/components/portal/pages/reports";
import { clientViewer } from "@/lib/portal/viewer";

export const metadata: Metadata = { title: "Reports & insights" };

export default async function Page({
  searchParams,
}: PageProps<"/portal/reports">) {
  const m = (await searchParams).month;
  return (
    <ReportsPage
      viewer={await clientViewer()}
      monthParamValue={typeof m === "string" ? m : undefined}
    />
  );
}
