"use client";

import { ConfettiMark } from "./confetti-mark";

export function BulkMiniBar({
  progressLabel,
  etaLabel,
  hintLabel,
  cancelLabel,
  fraction,
  previewUrl,
  onCancel,
}: {
  progressLabel: string;
  etaLabel: string | null;
  hintLabel: string;
  cancelLabel: string;
  fraction: number;
  previewUrl: string | null;
  onCancel: () => void;
}) {
  return (
    <div className="pointer-events-auto flex w-full max-w-md flex-col gap-[11px] rounded-bar border border-ink/10 bg-card px-4 pt-3.5 pb-[15px] shadow-card">
      <div className="flex items-center gap-[11px]">
        {previewUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt=""
            className="h-[38px] w-[38px] shrink-0 rounded-thumb bg-sand object-cover"
          />
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate text-sm text-ink">{progressLabel}</span>
            {etaLabel && (
              <span className="shrink-0 text-xs text-ink-muted">{etaLabel}</span>
            )}
          </div>
          <span className="flex h-[5px] overflow-hidden rounded-[2.5px] bg-[#eee5d2]">
            <span
              className="block bg-gold transition-[width]"
              style={{ width: `${Math.min(Math.max(fraction, 0), 1) * 100}%` }}
            />
          </span>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="-my-2.5 -mr-1.5 flex min-h-11 shrink-0 items-center justify-center rounded-pill px-3 text-[13px] text-gold-small transition active:bg-gold-tint"
        >
          {cancelLabel}
        </button>
      </div>
      <span className="text-xs leading-[1.4] text-ink-muted">{hintLabel}</span>
    </div>
  );
}

export function BatchSummary({
  doneLabel,
  failedLabel,
  seeLabel,
  retryLabel,
  dismissLabel,
  onRetry,
  onShowFailures,
  onDismiss,
}: {
  doneLabel: string;
  failedLabel: string | null;
  seeLabel: string;
  retryLabel: string;
  dismissLabel: string;
  onRetry: (() => void) | null;
  onShowFailures: (() => void) | null;
  onDismiss: () => void;
}) {
  return (
    <div className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-bar border border-ink/[0.09] bg-card py-3.5 pr-3.5 pl-4 shadow-card">
      <ConfettiMark size={18} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-sm text-ink">{doneLabel}</span>
        {failedLabel &&
          (onShowFailures ? (
            <button
              type="button"
              onClick={onShowFailures}
              className="-my-1 flex min-h-11 items-center gap-1.5 self-start text-left text-meta text-danger transition active:opacity-70"
            >
              {failedLabel}
              <span aria-hidden className="text-[11px]">
                ▸
              </span>
              <span className="text-ink-muted">{seeLabel}</span>
            </button>
          ) : (
            <span className="text-meta text-danger">{failedLabel}</span>
          ))}
      </div>
      <div className="flex shrink-0 flex-col gap-1.5">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="flex min-h-11 items-center justify-center rounded-pill bg-gold-small px-4 text-[13px] text-card transition active:bg-gold-deep"
          >
            {retryLabel}
          </button>
        )}
        <button
          type="button"
          onClick={onDismiss}
          className="flex min-h-11 items-center justify-center rounded-pill border border-ink/16 bg-paper px-4 text-[13px] text-gold-small transition active:bg-gold-tint"
        >
          {dismissLabel}
        </button>
      </div>
    </div>
  );
}
