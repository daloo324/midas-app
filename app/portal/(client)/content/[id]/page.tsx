import type { Metadata } from "next";
import { ContentItemPage } from "@/components/portal/pages/content-item";
import { clientViewer } from "@/lib/portal/viewer";

export const metadata: Metadata = { title: "Content" };

export default async function Page({
  params,
}: PageProps<"/portal/content/[id]">) {
  const { id } = await params;
  return <ContentItemPage viewer={await clientViewer()} itemId={id} />;
}
