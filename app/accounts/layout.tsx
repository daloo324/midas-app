import { ToastProvider } from "@/components/accounts/toast";
import { Masthead } from "@/components/shared/masthead";
import { MastNav, type NavItem } from "@/components/shared/nav-links";
import { requireArea } from "@/lib/auth/session";
import { listNotifications } from "@/lib/data/accounts";

const CEO_LINKS: NavItem[] = [
  { href: "/admin", label: "CEO dashboard" },
  { href: "/creative", label: "Design Studio" },
];

// Account Desk (account-desk.html): masthead, then client cards; no side menu.
// The masthead links to notifications (and, for the CEO, the other areas).
export default async function AccountsLayout({
  children,
}: LayoutProps<"/accounts">) {
  const user = await requireArea("accounts");
  const { unread } = await listNotifications(1);
  const items: NavItem[] = [
    {
      href: "/accounts",
      label: "Clients",
      exact: true,
      also: ["/accounts/clients"],
    },
    {
      href: "/accounts/notifications",
      label: unread ? `Notifications (${unread})` : "Notifications",
    },
    ...(user.role === "ceo" ? CEO_LINKS : []),
  ];
  return (
    <>
      <Masthead label="Account Desk" home="/accounts" user={user}>
        <MastNav items={items} label="Account Desk" />
      </Masthead>
      <main className="wrap">
        <ToastProvider>{children}</ToastProvider>
      </main>
    </>
  );
}
