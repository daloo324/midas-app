"use client";

import Link from "next/link";
import { useActionState } from "react";
import { initialState } from "@/lib/auth/action-state";
import { FieldError, FormMessage } from "@/components/shared/form-message";
import { SubmitButton } from "@/components/shared/submit-button";
import { signInClient } from "./actions";

export function ClientLoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(signInClient, initialState);
  return (
    <form action={action} noValidate className="grid gap-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}
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
      {state.error ? (
        <div className="err" role="alert">
          {state.error}
        </div>
      ) : (
        <FormMessage state={state} />
      )}
      <SubmitButton pendingText="Signing in…">Sign in</SubmitButton>
      <Link className="link" href="/portal/login/forgot">
        Forgot password?
      </Link>
    </form>
  );
}
