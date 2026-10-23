import { Masthead } from "@/components/shared/masthead";
import { Rail, type NavItem } from "@/components/shared/nav-links";
import { requireArea } from "@/lib/auth/session";
import { countApprovals } from "@/lib/data/portal";

// Client portal (client-portal.html): left rail, a top strip on phones.
const MENU: NavItem[] = [
  { href: "/portal", label: "Overview", exact: true },
  { href: "/portal/approvals", label: "Approvals" },
  { href: "/portal/content", label: "Content" },
  { href: "/portal/campaigns", label: "Campaigns" },
  { href: "/portal/reports", label: "Reports & insights" },
  { href: "/portal/invoices", label: "Invoices" },
  { href: "/portal/assets", label: "Brand assets" },
  { href: "/portal/account", label: "Account" },
];

export default async function PortalLayout({
  children,
}: LayoutProps<"/portal">) {
  const user = await requireArea("portal");
  const waiting = await countApprovals();
  const menu = MENU.map((m) =>
    m.href === "/portal/approvals" ? { ...m, badge: waiting } : m,
  );
  return (
    <div className="area-portal">
      <Masthead label="Client portal" home="/portal" user={user} />
      <div className="shell">
        <Rail items={menu} label="Portal sections" />
        <main style={{ minWidth: 0 }}>{children}</main>
      </div>
    </div>
  );
}
