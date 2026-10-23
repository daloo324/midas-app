import type { Metadata } from "next";
import { Brand } from "@/components/shared/brand";
import { StaffForgotForm } from "./forgot-form";

export const metadata: Metadata = { title: "Reset your password" };

export default function StaffForgotPage() {
  return (
    <div className="login">
      <div className="login-card">
        <Brand label="Team" />
        <div>
          <h1>Reset your password</h1>
          <p className="sub">
            Enter your email and we&apos;ll send you a link to choose a new
            password.
          </p>
        </div>
        <StaffForgotForm />
      </div>
    </div>
  );
}
