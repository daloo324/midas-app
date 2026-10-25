import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AccountPage } from "@/components/portal/pages/account";
import { ApprovalsPage } from "@/components/portal/pages/approvals";
import { AssetsPage } from "@/components/portal/pages/assets";
import { BriefPage } from "@/components/portal/pages/brief";
import { CampaignsPage } from "@/components/portal/pages/campaigns";
import { ContentPage } from "@/components/portal/pages/content";
import { ContentItemPage } from "@/components/portal/pages/content-item";
import { InvoicesPage } from "@/components/portal/pages/invoices";
import { OverviewPage } from "@/components/portal/pages/overview";
import { ReportsPage } from "@/components/portal/pages/reports";
import { resolveMonth } from "@/lib/accounts/page";
import { previewViewer } from "@/lib/portal/viewer";

export const metadata: Metadata = { title: "Client preview" };

// One route for every portal page in preview: /portal/preview/{id}/{section…}.
export default async function PreviewPage({
  params,
  searchParams,
}: PageProps<"/portal/preview/[clientId]/[[...section]]">) {
  const { clientId, section = [] } = await params;
  const sp = await searchParams;
  const viewer = await previewViewer(clientId);
  const str = (v: string | string[] | undefined) =>
    typeof v === "string" ? v : undefined;
  const [first, second] = section;
  if (section.length > 2) notFound();
  switch (first) {
    case undefined:
      return <OverviewPage viewer={viewer} />;
    case "approvals":
      return <ApprovalsPage viewer={viewer} />;
    case "content":
      return second ? (
        <ContentItemPage viewer={viewer} itemId={second} />
      ) : (
        <ContentPage
          viewer={viewer}
          month={resolveMonth(sp.month)}
          filter={str(sp.filter) ?? "all"}
        />
      );
    case "campaigns":
      return <CampaignsPage viewer={viewer} />;
    case "reports":
      return <ReportsPage viewer={viewer} monthParamValue={str(sp.month)} />;
    case "invoices":
      return <InvoicesPage viewer={viewer} view={str(sp.view)} />;
    case "assets":
      return <AssetsPage viewer={viewer} />;
    case "account":
      return second === "brief" ? (
        <BriefPage viewer={viewer} />
      ) : (
        <AccountPage viewer={viewer} />
      );
    default:
      notFound();
  }
}
