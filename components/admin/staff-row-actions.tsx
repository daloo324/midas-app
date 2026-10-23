"use client";

import { useActionState } from "react";
import {
  changeRoleAction,
  resendInviteAction,
  setStaffActiveAction,
} from "@/app/admin/team/actions";
import { SubmitButton } from "@/components/shared/submit-button";
import { initialState, type ActionState } from "@/lib/auth/action-state";
import { ROLE_LABELS, STAFF_ROLES, type StaffRole } from "@/lib/auth/routes";

function Message({ state }: { state: ActionState }) {
  if (state.error)
    return (
      <span className="err" role="alert">
        {state.error}
      </span>
    );
  if (state.ok)
    return (
      <span className="sub" role="status" style={{ margin: 0, fontSize: 13 }}>
        {state.ok}
      </span>
    );
  return null;
}

export function RoleForm({
  userId,
  role,
  disabled,
}: {
  userId: string;
  role: StaffRole;
  disabled: boolean;
}) {
  const [state, action] = useActionState(changeRoleAction, initialState);
  return (
    <form action={action} className="grid gap-1">
      <input type="hidden" name="userId" value={userId} />
      <div className="row" style={{ gap: 6, flexWrap: "nowrap" }}>
        <select
          className="field"
          name="role"
          defaultValue={role}
          disabled={disabled}
          aria-label="Role"
          style={{ minWidth: 150 }}
        >
          {STAFF_ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
        {disabled ? null : (
          <SubmitButton className="btn sm" pendingText="Saving…">
            Change role
          </SubmitButton>
        )}
      </div>
      <Message state={state} />
    </form>
  );
}

export function ActiveForm({
  userId,
  active,
  isMe,
}: {
  userId: string;
  active: boolean;
  isMe: boolean;
}) {
  const [state, action] = useActionState(setStaffActiveAction, initialState);
  if (isMe)
    return (
      <span className="sub" style={{ margin: 0, fontSize: 13 }}>
        This is you
      </span>
    );
  return (
    <form action={action} className="grid gap-1">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="active" value={active ? "false" : "true"} />
      <SubmitButton
        className={active ? "btn sm danger" : "btn sm"}
        pendingText="Saving…"
      >
        {active ? "Deactivate" : "Reactivate"}
      </SubmitButton>
      <Message state={state} />
    </form>
  );
}

export function ResendInviteForm({ userId }: { userId: string }) {
  const [state, action] = useActionState(resendInviteAction, initialState);
  return (
    <form action={action} className="grid gap-1">
      <input type="hidden" name="userId" value={userId} />
      <SubmitButton className="btn sm" pendingText="Sending…">
        Resend invite
      </SubmitButton>
      <Message state={state} />
    </form>
  );
}
