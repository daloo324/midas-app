import type { Metadata } from "next";
import { Brand } from "@/components/shared/brand";
import { ClientLoginForm } from "./login-form";

export const metadata: Metadata = { title: "Client portal sign in" };

export default async function ClientLoginPage({
  searchParams,
}: PageProps<"/portal/login">) {
  const { next } = await searchParams;
  return (
    <div className="login">
      <div className="login-card">
        <Brand label="Client portal" />
        <div>
          <h1>Sign in</h1>
          <p className="sub">
            Use the client ID and password your account executive sent you.
          </p>
        </div>
        <ClientLoginForm next={typeof next === "string" ? next : undefined} />
        <p className="sub" style={{ margin: 0, fontSize: 13 }}>
          Lost your client ID? Ask your account executive. Each client gets
          their own ID when their brand kit is signed off.
        </p>
      </div>
    </div>
  );
}
