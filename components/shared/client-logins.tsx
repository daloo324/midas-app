"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { resendWelcomeAction } from "@/app/accounts/actions";
import { FieldError, FormMessage } from "@/components/shared/form-message";
import { SubmitButton } from "@/components/shared/submit-button";
import { initialState } from "@/lib/auth/action-state";
import {
  createClientLoginAction,
  setClientLoginActiveAction,
} from "@/lib/clients/login-actions";

export type ClientLogin = {
  id: string;
  full_name: string;
  email: string;
  login_id: string;
  is_primary: boolean;
  active: boolean;
};

function ResendWelcome({ clientUserId }: { clientUserId: string }) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ ok?: string; error?: string }>({});
  return (
    <>
      <button
        className="btn sm"
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => setMessage(await resendWelcomeAction(clientUserId)))
        }
      >
        {pending ? "Sending…" : "Resend welcome email"}
      </button>
      {message.ok ? (
        <span className="sub" role="status" style={{ margin: 0, fontSize: 13 }}>
          {message.ok}
        </span>
      ) : null}
      {message.error ? (
        <span className="err" role="alert">
          {message.error}
        </span>
      ) : null}
    </>
  );
}

function LoginRow({ login }: { login: ClientLogin }) {
  const [state, action] = useActionState(
    setClientLoginActiveAction,
    initialState,
  );
  return (
    <div>
      <div style={{ minWidth: 0 }}>
        <b style={{ fontFamily: "var(--display)", letterSpacing: ".02em" }}>
          {login.login_id}
        </b>{" "}
        {login.active ? (
          <span className="pill s-good">Active</span>
        ) : (
          <span className="pill">Switched off</span>
        )}
        <div className="sub" style={{ margin: 0, fontSize: 13 }}>
          {login.full_name} · {login.email}
        </div>
        {state.error ? <span className="err">{state.error}</span> : null}
      </div>
      <div className="row" style={{ gap: 6 }}>
        {login.active ? <ResendWelcome clientUserId={login.id} /> : null}
        <form action={action}>
          <input type="hidden" name="clientUserId" value={login.id} />
          <input
            type="hidden"
            name="active"
            value={login.active ? "false" : "true"}
          />
          <SubmitButton
            className={login.active ? "btn sm danger" : "btn sm"}
            pendingText="Saving…"
          >
            {login.active ? "Switch off" : "Switch on"}
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}

export function ClientLogins({
  clientId,
  logins,
}: {
  clientId: string;
  logins: ClientLogin[];
}) {
  const [state, action] = useActionState(createClientLoginAction, initialState);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) form.current?.reset();
  }, [state]);

  return (
    <div className="grid gap-4">
      {logins.length ? (
        <div className="list">
          {logins.map((l) => (
            <LoginRow key={l.id} login={l} />
          ))}
        </div>
      ) : (
        <p className="sub" style={{ margin: 0 }}>
          No logins yet. Usually created when the brand kit is signed off; you
          can create one earlier so the client can follow onboarding.
        </p>
      )}
      <form ref={form} action={action} noValidate className="grid gap-3">
        <input type="hidden" name="clientId" value={clientId} />
        <div className="fgrid">
          <label className="f">
            Contact name
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
            Contact email
            <input
              className="field"
              type="email"
              name="email"
              autoComplete="off"
              required
            />
            <FieldError state={state} name="email" />
          </label>
        </div>
        <FormMessage state={state} />
        <div>
          <SubmitButton pendingText="Creating…">
            Create login and send welcome email
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
