"use client";

import Link from "next/link";
import { useActionState } from "react";
import { initialState } from "@/lib/auth/action-state";
import { FieldError, FormMessage } from "@/components/shared/form-message";
import { SubmitButton } from "@/components/shared/submit-button";
import { signInStaff } from "./actions";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(signInStaff, initialState);
  return (
    <form action={action} noValidate className="grid gap-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}
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
      <label className="f">
        Password
        <input
          className="field"
          type="password"
          name="password"
          autoComplete="current-password"
          required
        />
        <FieldError state={state} name="password" />
      </label>
      <FormMessage state={state} />
      <SubmitButton pendingText="Signing in…">Sign in</SubmitButton>
      <Link className="link" href="/login/forgot">
        Forgot password?
      </Link>
    </form>
  );
}
