"use client";

import { useActionState } from "react";
import { initialState } from "@/lib/auth/action-state";
import { FieldError, FormMessage } from "@/components/shared/form-message";
import { SubmitButton } from "@/components/shared/submit-button";
import { PASSWORD_MIN } from "@/lib/validation/auth";
import { setPassword } from "./actions";

export function SetPasswordForm({
  tokenHash,
  type,
}: {
  tokenHash?: string;
  type?: "invite" | "recovery";
}) {
  const [state, action] = useActionState(setPassword, initialState);
  return (
    <form action={action} noValidate className="grid gap-4">
      {tokenHash && type ? (
        <>
          <input type="hidden" name="tokenHash" value={tokenHash} />
          <input type="hidden" name="type" value={type} />
        </>
      ) : null}
      <label className="f">
        New password
        <input
          className="field"
          type="password"
          name="password"
          autoComplete="new-password"
          minLength={PASSWORD_MIN}
          required
        />
        <span className="sub" style={{ margin: 0, fontSize: 12 }}>
          At least {PASSWORD_MIN} characters.
        </span>
        <FieldError state={state} name="password" />
      </label>
      <label className="f">
        Type it again
        <input
          className="field"
          type="password"
          name="confirm"
          autoComplete="new-password"
          required
        />
        <FieldError state={state} name="confirm" />
      </label>
      <FormMessage state={state} />
      <SubmitButton pendingText="Saving…">
        Save password and sign in
      </SubmitButton>
    </form>
  );
}
