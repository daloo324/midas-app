"use client";

import Link from "next/link";
import { useActionState } from "react";
import { initialState } from "@/lib/auth/action-state";
import { FieldError, FormMessage } from "@/components/shared/form-message";
import { SubmitButton } from "@/components/shared/submit-button";
import { requestClientReset } from "../actions";

export function ClientForgotForm() {
  const [state, action] = useActionState(requestClientReset, initialState);
  return (
    <form action={action} noValidate className="grid gap-4">
      <label className="f">
        Client ID
        <input
          className="field"
          type="text"
          name="loginId"
          autoComplete="username"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="MM-XXX-0000"
          required
        />
        <FieldError state={state} name="loginId" />
      </label>
      <FormMessage state={state} />
      <SubmitButton pendingText="Sending…">Email me a reset link</SubmitButton>
      <Link className="link" href="/portal/login">
        Back to sign in
      </Link>
    </form>
  );
}
