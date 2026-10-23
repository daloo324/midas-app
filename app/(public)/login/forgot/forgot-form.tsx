"use client";

import Link from "next/link";
import { useActionState } from "react";
import { initialState } from "@/lib/auth/action-state";
import { FieldError, FormMessage } from "@/components/shared/form-message";
import { SubmitButton } from "@/components/shared/submit-button";
import { requestStaffReset } from "../actions";

export function StaffForgotForm() {
  const [state, action] = useActionState(requestStaffReset, initialState);
  return (
    <form action={action} noValidate className="grid gap-4">
      <label className="f">
        Email
        <input
          className="field"
          type="email"
          name="email"
          autoComplete="username"
          required
        />
        <FieldError state={state} name="email" />
      </label>
      <FormMessage state={state} />
      <SubmitButton pendingText="Sending…">Email me a reset link</SubmitButton>
      <Link className="link" href="/login">
        Back to sign in
      </Link>
    </form>
  );
}
