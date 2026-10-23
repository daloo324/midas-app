import type { ActionState } from "@/lib/auth/action-state";

/** The success or error line under a form. */
export function FormMessage({ state }: { state: ActionState }) {
  if (state.error) {
    return (
      <div className="notice err" role="alert">
        {state.error}
      </div>
    );
  }
  if (state.ok) {
    return (
      <div className="notice ok" role="status">
        {state.ok}
      </div>
    );
  }
  return null;
}

export function FieldError({
  state,
  name,
}: {
  state: ActionState;
  name: string;
}) {
  const message = state.fieldErrors?.[name];
  return message ? <span className="err">{message}</span> : null;
}
