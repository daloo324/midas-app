"use client";

import { useActionState, useEffect, useRef } from "react";
import { changePasswordAction } from "@/app/portal/actions";
import { FieldError, FormMessage } from "@/components/shared/form-message";
import { SubmitButton } from "@/components/shared/submit-button";
import { initialState } from "@/lib/auth/action-state";

export function PasswordForm() {
  const [state, action] = useActionState(changePasswordAction, initialState);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) form.current?.reset();
  }, [state]);
  return (
    <form
      ref={form}
      action={action}
      noValidate
      className="grid gap-3"
      style={{ marginTop: 12 }}
    >
      <label className="f">
        New password
        <input
          className="field"
          type="password"
          name="password"
          autoComplete="new-password"
          required
        />
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
      <div>
        <SubmitButton className="btn sm" pendingText="Changing…">
          Change password
        </SubmitButton>
      </div>
    </form>
  );
}
