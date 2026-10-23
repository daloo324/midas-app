import { Masthead } from "@/components/shared/masthead";
import { MastNav, type NavItem } from "@/components/shared/nav-links";
import { requireArea } from "@/lib/auth/session";

// Design Studio (design-studio.html): menu pills in the masthead.
export default async function CreativeLayout({
  children,
}: LayoutProps<"/creative">) {
  const user = await requireArea("creative");
  const menu: NavItem[] = [
    {
      href: "/creative",
      label: "Clients",
      exact: true,
      also: ["/creative/clients"],
    },
    ...(user.role === "designer"
      ? []
      : [{ href: "/creative/review", label: "Review" }]),
    { href: "/creative/resources", label: "Resources" },
    { href: "/creative/time", label: "Time" },
    ...(user.role === "ceo"
      ? [{ href: "/admin", label: "CEO dashboard" }]
      : []),
  ];
  return (
    <>
      <Masthead label="Design Studio" home="/creative" user={user}>
        <MastNav items={menu} label="Design Studio sections" />
      </Masthead>
      <main className="wrap">{children}</main>
    </>
  );
}
