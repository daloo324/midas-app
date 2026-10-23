"use client";

import { useActionState, useEffect, useRef } from "react";
import { inviteStaffAction } from "@/app/admin/team/actions";
import { FieldError, FormMessage } from "@/components/shared/form-message";
import { SubmitButton } from "@/components/shared/submit-button";
import { initialState } from "@/lib/auth/action-state";
import { ROLE_LABELS, STAFF_ROLES } from "@/lib/auth/routes";

export function InviteStaffForm() {
  const [state, action] = useActionState(inviteStaffAction, initialState);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) form.current?.reset();
  }, [state]);

  return (
    <form ref={form} action={action} noValidate className="grid gap-3">
      <div className="fgrid">
        <label className="f">
          Name
          <input
            className="field"
            type="text"
            name="fullName"
            autoComplete="off"
            required
          />
          <FieldError state={state} name="fullName" />
        </label>
        <label className="f">
          Email
          <input
            className="field"
            type="email"
            name="email"
            autoComplete="off"
            required
          />
          <FieldError state={state} name="email" />
        </label>
        <label className="f">
          Role
          <select className="field" name="role" defaultValue="" required>
            <option value="" disabled>
              Choose a role
            </option>
            {STAFF_ROLES.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </select>
          <FieldError state={state} name="role" />
        </label>
        <div className="flex items-end">
          <SubmitButton pendingText="Sending…">Send invite</SubmitButton>
        </div>
      </div>
      <FormMessage state={state} />
    </form>
  );
}
