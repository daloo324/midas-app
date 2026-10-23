import type { Metadata } from "next";
import { ContentPage } from "@/components/portal/pages/content";
import { resolveMonth } from "@/lib/accounts/page";
import { clientViewer } from "@/lib/portal/viewer";

export const metadata: Metadata = { title: "Content" };

export default async function Page({
  searchParams,
}: PageProps<"/portal/content">) {
  const sp = await searchParams;
  return (
    <ContentPage
      viewer={await clientViewer()}
      month={resolveMonth(sp.month)}
      filter={typeof sp.filter === "string" ? sp.filter : "all"}
    />
  );
}
