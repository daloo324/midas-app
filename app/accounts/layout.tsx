import { Masthead } from "@/components/shared/masthead";
import { MastNav, type NavItem } from "@/components/shared/nav-links";
import { requireArea } from "@/lib/auth/session";

const CEO_LINKS: NavItem[] = [
  { href: "/admin", label: "CEO dashboard" },
  { href: "/creative", label: "Design Studio" },
];

// Account Desk (account-desk.html): masthead, then client cards; no side menu.
export default async function AccountsLayout({
  children,
}: LayoutProps<"/accounts">) {
  const user = await requireArea("accounts");
  return (
    <>
      <Masthead label="Account Desk" home="/accounts" user={user}>
        {user.role === "ceo" ? (
          <MastNav items={CEO_LINKS} label="Other areas" />
        ) : null}
      </Masthead>
      <main className="wrap">{children}</main>
    </>
  );
}
