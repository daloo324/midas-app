import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "@/components/shared/brand";
import { homeFor, STAFF_LOGIN } from "@/lib/auth/routes";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "No access" };

export default async function NoAccessPage() {
  const user = await getCurrentUser();
  return (
    <div className="login">
      <div className="login-card">
        <Brand label="Midas Media" />
        <div>
          <h1>You don&apos;t have access to this area</h1>
          <p className="sub">
            {user
              ? "This part of the app is for a different role."
              : "Sign in to continue."}
          </p>
        </div>
        <Link
          className="btn pri"
          href={user ? homeFor(user.role) : STAFF_LOGIN}
        >
          {user ? "Go to your home page" : "Sign in"}
        </Link>
      </div>
    </div>
  );
}
