import { Masthead } from "@/components/shared/masthead";
import { MastNav, Rail, type NavItem } from "@/components/shared/nav-links";
import { ToastProvider } from "@/components/shared/toast";
import { requireArea } from "@/lib/auth/session";

const MENU: NavItem[] = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/clients", label: "Clients" },
  { href: "/admin/sales", label: "Sales" },
  { href: "/admin/quotes", label: "Quotes" },
  { href: "/admin/invoices", label: "Invoices" },
  { href: "/admin/marketing", label: "Marketing" },
  { href: "/admin/team", label: "Team" },
  { href: "/admin/services", label: "Services" },
  { href: "/admin/settings", label: "Settings" },
];

const OTHER_AREAS: NavItem[] = [
  { href: "/accounts", label: "Account Desk" },
  { href: "/creative", label: "Design Studio" },
];

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await requireArea("admin");
  return (
    <ToastProvider>
      <Masthead label="CEO dashboard" home="/admin" user={user}>
        <MastNav items={OTHER_AREAS} label="Other areas" />
      </Masthead>
      <div className="shell">
        <Rail items={MENU} label="CEO dashboard sections" />
        <main style={{ minWidth: 0 }}>{children}</main>
      </div>
    </ToastProvider>
  );
}
