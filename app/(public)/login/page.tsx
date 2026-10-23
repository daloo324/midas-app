import type { Metadata } from "next";
import { Brand } from "@/components/shared/brand";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function StaffLoginPage({
  searchParams,
}: PageProps<"/login">) {
  const { next } = await searchParams;
  return (
    <div className="login">
      <div className="login-card">
        <Brand label="Team" />
        <div>
          <h1>Sign in</h1>
          <p className="sub">Use your Midas Media email and password.</p>
        </div>
        <LoginForm next={typeof next === "string" ? next : undefined} />
        <p className="sub" style={{ margin: 0, fontSize: 13 }}>
          No account yet? Ask the CEO to invite you. Clients sign in at the
          client portal.
        </p>
      </div>
    </div>
  );
}
