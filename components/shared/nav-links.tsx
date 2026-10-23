"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = {
  href: string;
  label: string;
  /** A count shown as a red badge, e.g. approvals waiting. */
  badge?: number;
  exact?: boolean;
  also?: string[];
};

function under(path: string, prefix: string) {
  return path === prefix || path.startsWith(prefix + "/");
}

function isCurrent(path: string, item: NavItem) {
  if (item.also?.some((prefix) => under(path, prefix))) return true;
  return item.exact ? path === item.href : under(path, item.href);
}

/** The left rail (client-portal.html): becomes a scrolling strip on phones. */
export function Rail({ items, label }: { items: NavItem[]; label: string }) {
  const path = usePathname();
  return (
    <nav className="rail" aria-label={label}>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={isCurrent(path, item) ? "page" : undefined}
        >
          <span>{item.label}</span>
          {item.badge ? <span className="badge">{item.badge}</span> : null}
        </Link>
      ))}
    </nav>
  );
}

/** Menu pills inside the masthead (design-studio.html). */
export function MastNav({ items, label }: { items: NavItem[]; label: string }) {
  const path = usePathname();
  return (
    <nav className="mast-nav" aria-label={label}>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={isCurrent(path, item) ? "page" : undefined}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
