import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "@/components/shared/brand";
import { createClient } from "@/lib/supabase/server";
import { SetPasswordForm } from "./set-password-form";

export const metadata: Metadata = { title: "Set your password" };

export default async function SetPasswordPage({
  searchParams,
}: PageProps<"/set-password">) {
  const params = await searchParams;
  const tokenHash =
    typeof params.token_hash === "string" ? params.token_hash : undefined;
  const type =
    params.type === "invite" || params.type === "recovery"
      ? params.type
      : undefined;
  const isClient = params.for === "client";

  // Without a link token, a signed-in person can still change their password.
  let canSet = Boolean(tokenHash && type);
  if (!canSet) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    canSet = Boolean(data?.claims?.sub);
  }

  return (
    <div className="login">
      <div className="login-card">
        <Brand label={isClient ? "Client portal" : "Team"} />
        <div>
          <h1>
            {type === "recovery"
              ? "Choose a new password"
              : "Set your password"}
          </h1>
          <p className="sub">
            {canSet
              ? "You'll use it every time you sign in."
              : "This link is incomplete or has expired. Ask for a new one."}
          </p>
        </div>
        {canSet ? (
          <SetPasswordForm tokenHash={tokenHash} type={type} />
        ) : (
          <Link
            className="btn pri"
            href={isClient ? "/portal/login/forgot" : "/login/forgot"}
          >
            Get a new link
          </Link>
        )}
      </div>
    </div>
  );
}
