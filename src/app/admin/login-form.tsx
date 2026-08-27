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
      <label className="flex flex-col gap-1 text-sm text-ink">
        {labels.passcodeLabel}
        <input
          type="password"
          name="passcode"
          required
          autoFocus
          className="rounded-lg border border-ink/20 bg-white px-3 py-2 text-base outline-none focus:border-gold-small"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-gold-small px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
      >
        {labels.submit}
      </button>
      {state.wrongPasscode && <p className="text-sm text-red-600">{labels.wrongPasscode}</p>}
    </form>
  );
}
