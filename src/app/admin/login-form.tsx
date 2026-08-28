"use client";

import { useActionState } from "react";
import { loginAdmin, type LoginState } from "./actions";

export type LoginLabels = {
  passcodeLabel: string;
  submit: string;
  wrongPasscode: string;
};

const initialState: LoginState = { wrongPasscode: false };

export function AdminLoginForm({ labels }: { labels: LoginLabels }) {
  const [state, formAction, pending] = useActionState(loginAdmin, initialState);

  return (
    <form action={formAction} className="flex w-full max-w-xs flex-col gap-3">
      <label className="flex flex-col gap-1.5 text-sm text-ink">
        {labels.passcodeLabel}
        <input
          type="password"
          name="passcode"
          required
          autoFocus
          className="rounded-[10px] border border-ink/20 bg-card px-3.5 py-3 text-base outline-none focus:border-gold"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-pill bg-gold px-7 py-3.5 text-base font-medium text-card transition hover:bg-gold-small active:bg-gold-deep disabled:opacity-60"
      >
        {labels.submit}
      </button>
      {state.wrongPasscode && <p className="text-sm text-danger">{labels.wrongPasscode}</p>}
    </form>
  );
}
