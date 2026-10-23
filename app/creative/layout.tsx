import { TimerBar } from "@/components/creative/timer";
import { Masthead } from "@/components/shared/masthead";
import { MastNav, type NavItem } from "@/components/shared/nav-links";
import { ToastProvider } from "@/components/shared/toast";
import { requireArea } from "@/lib/auth/session";
import { getRunningTimer } from "@/lib/data/creative";

// Design Studio (design-studio.html): menu pills in the masthead, and the
// timer bar under it whenever you have a timer running.
export default async function CreativeLayout({
  children,
}: LayoutProps<"/creative">) {
  const user = await requireArea("creative");
  const timer = await getRunningTimer();
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
    <ToastProvider>
      <Masthead label="Design Studio" home="/creative" user={user}>
        <MastNav items={menu} label="Design Studio sections" />
      </Masthead>
      <TimerBar timer={timer} />
      <main className="wrap">{children}</main>
    </ToastProvider>
  );
}
