import { ROLE_LABELS } from "@/lib/auth/routes";
import type { CurrentUser } from "@/lib/auth/session";
import { Brand } from "./brand";
import { SignOutButton } from "./sign-out";

/** Navy masthead with the gold rule: brand, optional menu, and who is signed in. */
export function Masthead({
  label,
  home,
  user,
  children,
}: {
  label: string;
  home: string;
  user: CurrentUser;
  children?: React.ReactNode;
}) {
  return (
    <header className="mast">
      <div className="wrap">
        <Brand label={label} href={home} />
        {children}
        <div className="who">
          <span>
            Signed in as{" "}
            <b>
              {user.kind === "client"
                ? user.clientName || user.name
                : user.name}
            </b>{" "}
            · {user.kind === "client" ? user.loginId : ROLE_LABELS[user.role]}
          </span>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
