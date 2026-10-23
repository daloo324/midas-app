import Link from "next/link";
import { Masthead } from "@/components/shared/masthead";
import { Rail, type NavItem } from "@/components/shared/nav-links";
import { requireArea } from "@/lib/auth/session";
import { countApprovals } from "@/lib/data/portal";
import { previewViewer } from "@/lib/portal/viewer";

// The CEO sees exactly a client's portal, read-only (01-auth-and-roles.md).
export default async function PreviewLayout({
  children,
  params,
}: LayoutProps<"/portal/preview/[clientId]">) {
  const user = await requireArea("admin");
  const { clientId } = await params;
  const viewer = await previewViewer(clientId);
  const waiting = await countApprovals(clientId);
  const b = viewer.base;
  const menu: NavItem[] = [
    { href: b, label: "Overview", exact: true },
    { href: `${b}/approvals`, label: "Approvals", badge: waiting },
    { href: `${b}/content`, label: "Content" },
    { href: `${b}/campaigns`, label: "Campaigns" },
    { href: `${b}/reports`, label: "Reports & insights" },
    { href: `${b}/invoices`, label: "Invoices" },
    { href: `${b}/assets`, label: "Brand assets" },
    { href: `${b}/account`, label: "Account" },
  ];
  return (
    <div className="area-portal">
      <div className="ribbon" role="note">
        Viewing as {viewer.clientName}. This is exactly what they see; nothing
        here can be changed.{" "}
        <Link className="link" href="/admin/clients">
          Back to the CEO dashboard
        </Link>
      </div>
      <Masthead label="Client portal" home={b} user={user} />
      <div className="shell">
        <Rail items={menu} label="Portal sections" />
        <main style={{ minWidth: 0 }}>{children}</main>
      </div>
    </div>
  );
}
