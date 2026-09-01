"use client";

import { useId, useState } from "react";
import { RECOVERY_CODE_LENGTH, normalizeRecoveryCode } from "@/lib/recovery-code";
import { ConfettiMark } from "./confetti-mark";
import { SheetShell } from "./sheet-shell";
import { useSheetDismiss } from "./use-sheet-dismiss";

export type RecoverySheetLabels = {
  title: string;
  explainerLine1: string;
  explainerLine2: string;
  codeLabel: string;
  submit: string;
  cancel: string;
  unknown: string;
  rateLimited: string;
  failed: string;
};

// The code is shown with a separator, which a guest may well type back.
const TYPED_MAX_LENGTH = RECOVERY_CODE_LENGTH + 1;

export function RecoverySheet({
  labels,
  onRecovered,
  onCancel,
}: {
  labels: RecoverySheetLabels;
  onRecovered: (displayName: string | null) => void;
  onCancel: () => void;
}) {
  const titleId = useId();
  const { sheetProps, backdropStyle } = useSheetDismiss(onCancel);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const code = normalizeRecoveryCode(typed);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!code) return;
    setSending(true);
    setError(null);
    const response = await fetch("/api/recovery", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code }),
    }).catch(() => null);
    if (response?.ok) {
      const body = await response.json().catch(() => null);
      onRecovered(body?.displayName ?? null);
      return;
    }
    setError(
      response?.status === 404
        ? labels.unknown
        : response?.status === 429
          ? labels.rateLimited
          : labels.failed,
    );
    setSending(false);
  }

  return (
    <SheetShell closeLabel={labels.cancel} onCancel={onCancel} backdropStyle={backdropStyle}>
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onSubmit={submit}
        {...sheetProps}
        className="sheet-in absolute inset-x-0 bottom-0 mx-auto flex max-h-full w-full max-w-md flex-col rounded-sheet bg-card pt-3 shadow-sheet"
      >
        <span className="mb-5 h-1 w-[38px] shrink-0 self-center rounded-full bg-ink/15" />

        <div className="flex shrink-0 flex-col items-center gap-[7px] px-[22px] pb-5 text-center">
          <ConfettiMark size={22} variant="static" />
          <h2 id={titleId} className="font-serif text-sheet-title font-medium text-gold-small">
            {labels.title}
          </h2>
          <p className="text-body leading-[1.55] text-ink-muted">
            {labels.explainerLine1}
            <br />
            {labels.explainerLine2}
          </p>
        </div>

        <label className="flex flex-col gap-[7px] px-[22px]">
          <span className="eyebrow text-ink-muted">{labels.codeLabel}</span>
          <input
            required
            type="text"
            inputMode="text"
            autoComplete="off"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            value={typed}
            maxLength={TYPED_MAX_LENGTH}
            onChange={(event) => setTyped(event.target.value.toUpperCase())}
            className="w-full touch-auto rounded-card border border-ink/16 bg-card px-4 py-3.5 text-center font-mono text-[22px] tracking-[0.3em] text-ink caret-gold outline-none focus:border-gold focus:bg-paper"
          />
        </label>

        <div className="flex shrink-0 flex-col gap-5 px-[22px] pt-5 pb-[26px]">
          {error && <p className="text-center text-sm text-danger">{error}</p>}

          <button
            type="submit"
            disabled={code === null || sending}
            className="w-full rounded-pill bg-gold py-[17px] text-base font-medium text-card transition hover:bg-gold-small active:bg-gold-deep disabled:opacity-60"
          >
            {labels.submit}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex min-h-11 items-center self-center text-[13px] text-ink-muted transition hover:text-ink active:text-ink"
          >
            {labels.cancel}
          </button>
        </div>
      </form>
    </SheetShell>
  );
}
