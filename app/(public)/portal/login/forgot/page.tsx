import type { Metadata } from "next";
import { Brand } from "@/components/shared/brand";
import { ClientForgotForm } from "./forgot-form";

export const metadata: Metadata = { title: "Reset your password" };

export default function ClientForgotPage() {
  return (
    <div className="login">
      <div className="login-card">
        <Brand label="Client portal" />
        <div>
          <h1>Reset your password</h1>
          <p className="sub">
            Enter your client ID. We&apos;ll email a reset link to the address
            on your account.
          </p>
        </div>
        <ClientForgotForm />
      </div>
    </div>
  );
}
