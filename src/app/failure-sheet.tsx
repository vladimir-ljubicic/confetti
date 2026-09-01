"use client";

import { useId } from "react";
import { createPortal } from "react-dom";
import { pluralize, type Locale } from "@/lib/i18n";
import {
  failureDetail,
  failureReason,
  groupFailures,
  type BatchFailure,
} from "@/lib/batch-failures";
import { Spinner } from "./bulk-progress";
import { useSheetDismiss } from "./use-sheet-dismiss";

export type FailureSheetLabels = {
  failuresTitleOne: string;
  failuresTitleFew: string;
  failuresTitleMany: string;
  failuresUploaded: string;
  failuresRetryable: string;
  failuresDeadEnd: string;
  failuresUnretryable: string;
  failuresUploadedPercent: string;
  failuresMaxSize: string;
  failuresUnsupportedFormat: string;
  failuresRetryOne: string;
  failuresRetryAll: string;
  failuresSending: string;
  failuresSendingCount: string;
  failuresAttemptsOne: string;
  failuresAttemptsFew: string;
  failuresAttemptsMany: string;
  skip: string;
  dismiss: string;
  cancel: string;
  failureNetwork: string;
  failureServer: string;
  failureTooLarge: string;
  failureNotAnImage: string;
};

export type RetryRun = { done: number; total: number };

type RowKind = "retryable" | "deadEnd" | "unretryable";

const ROW_BUTTON =
  "flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-pill bg-card px-3.5 text-[13px] text-gold-small whitespace-nowrap transition active:bg-gold-tint";

export function FailureSheet({
  labels,
  locale,
  failures,
  uploadedCount,
  maxFileBytes,
  sendingIds,
  leavingIds,
  retryRun,
  onRetryOne,
  onSkipOne,
  onRetryAll,
  onCancelRetry,
  onDiscard,
  onClose,
}: {
  labels: FailureSheetLabels;
  locale: Locale;
  failures: BatchFailure[];
  uploadedCount: number;
  // Null on devices exempt from the size limit, which have none to name.
  maxFileBytes: number | null;
  // Rows whose photo is going up right now.
  sendingIds: ReadonlySet<number>;
  // Rows that went up and are collapsing out of the list.
  leavingIds: ReadonlySet<number>;
  // Non-null while Пробај поново is working through the retryable group.
  retryRun: RetryRun | null;
  onRetryOne: (id: number) => void;
  onSkipOne: (id: number) => void;
  onRetryAll: () => void;
  onCancelRetry: () => void;
  // Одбаци: the failures leave the queue for good.
  onDiscard: () => void;
  onClose: () => void;
}) {
  const titleId = useId();
  const { sheetProps, scrollProps, backdropStyle } = useSheetDismiss(onClose);
  const { retryable, deadEnd, unretryable } = groupFailures(failures);
  // A row on its way out is already gone as far as every count is concerned —
  // unless every row is, in which case the sheet is closing behind them and the
  // counts hold rather than ticking down to nothing.
  const closing = failures.every((failure) => leavingIds.has(failure.id));
  const staying = (items: BatchFailure[]) =>
    closing ? items : items.filter((item) => !leavingIds.has(item.id));
  const remaining = staying(failures).length;
  const retryableCount = staying(retryable).length;

  const reasonLabels = {
    reason: {
      network: labels.failureNetwork,
      server: labels.failureServer,
      "too-large": labels.failureTooLarge,
      "not-an-image": labels.failureNotAnImage,
    },
    attempts: {
      one: labels.failuresAttemptsOne,
      few: labels.failuresAttemptsFew,
      many: labels.failuresAttemptsMany,
    },
  };
  const detailLabels = {
    uploadedPercent: labels.failuresUploadedPercent,
    maxSize: labels.failuresMaxSize,
    unsupportedFormat: labels.failuresUnsupportedFormat,
  };

  function row(failure: BatchFailure, kind: RowKind) {
    // Red words and the badge are the mark of a photo we cannot take at all,
    // not of one that has merely run out of attempts.
    const rejected = kind === "unretryable";
    const sending = sendingIds.has(failure.id);
    return (
      <li
        key={failure.id}
        className={leavingIds.has(failure.id) ? "failure-row-out" : ""}
      >
        <div className="flex items-center gap-3 rounded-card border border-ink/[0.07] bg-paper py-[9px] pr-2.5 pl-[9px]">
          <span className="relative h-[46px] w-[46px] shrink-0 overflow-hidden rounded-thumb bg-sand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={failure.previewUrl}
              alt=""
              className="h-full w-full object-cover"
            />
            {rejected && (
              <span
                aria-hidden
                className="absolute inset-0 flex items-center justify-center bg-ink/[0.42] text-[15px] text-card"
              >
                !
              </span>
            )}
          </span>

          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span
              className={`text-sm ${rejected ? "text-danger" : "text-ink"}`}
            >
              {failureReason(failure, reasonLabels, locale)}
            </span>
            <span className="text-meta text-ink/55">
              {failureDetail(failure, detailLabels, locale, maxFileBytes)}
            </span>
          </div>

          {kind !== "retryable" ? (
            <button
              type="button"
              onClick={() => onSkipOne(failure.id)}
              className={`${ROW_BUTTON} border border-ink/16`}
            >
              {labels.skip}
            </button>
          ) : sending ? (
            <span className={`${ROW_BUTTON} border border-gold/45`}>
              <Spinner />
              {labels.failuresSending}
            </span>
          ) : (
            <button
              type="button"
              disabled={retryRun !== null}
              onClick={() => onRetryOne(failure.id)}
              className={`${ROW_BUTTON} border border-gold/45 disabled:opacity-50`}
            >
              <span aria-hidden className="text-sm leading-none">
                ↺
              </span>
              {labels.failuresRetryOne}
            </button>
          )}
        </div>
      </li>
    );
  }

  function group(heading: string, items: BatchFailure[], kind: RowKind) {
    if (items.length === 0) return null;
    const count = staying(items).length;
    return (
      <section className="flex flex-col gap-2.5">
        {count > 0 && (
          <h4 className="eyebrow text-ink/55">
            {heading.replace("{count}", String(count))}
          </h4>
        )}
        <ul className="flex flex-col gap-2.5">
          {items.map((item) => row(item, kind))}
        </ul>
      </section>
    );
  }

  // Portaled past the sticky upload bar this sheet opens from, whose stacking
  // context would otherwise trap it below the gallery's pinned header.
  return createPortal(
    <div className="pointer-events-auto fixed inset-0 z-50">
      <button
        type="button"
        aria-label={labels.cancel}
        onClick={onClose}
        style={backdropStyle}
        className="scrim-in absolute inset-0 cursor-default bg-ink/[0.5]"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        {...sheetProps}
        className="sheet-in absolute inset-x-0 bottom-0 mx-auto flex max-h-[82%] w-full max-w-md flex-col rounded-sheet bg-card pt-2.5 shadow-sheet"
      >
        <div className="flex shrink-0 flex-col gap-4 px-5">
          <span className="h-1 w-[38px] self-center rounded-pill bg-ink/15" />
          <div className="flex items-baseline justify-between gap-3 border-b border-ink/8 pb-3.5">
            <h3
              id={titleId}
              className="font-serif text-[23px] leading-[1.1] font-medium text-gold-small"
            >
              {pluralize(locale, remaining, {
                one: labels.failuresTitleOne,
                few: labels.failuresTitleFew,
                many: labels.failuresTitleMany,
              })}
            </h3>
            <span className="text-meta whitespace-nowrap text-ink/50">
              {labels.failuresUploaded.replace("{count}", String(uploadedCount))}
            </span>
          </div>
        </div>

        <div
          {...scrollProps}
          className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-5 pt-3.5 pb-2"
        >
          {group(labels.failuresRetryable, retryable, "retryable")}
          {group(labels.failuresDeadEnd, deadEnd, "deadEnd")}
          {group(labels.failuresUnretryable, unretryable, "unretryable")}
        </div>

        <div className="flex shrink-0 items-center gap-2.5 border-t border-ink/8 px-5 pt-3 pb-[18px]">
          <button
            type="button"
            onClick={retryRun ? onCancelRetry : onDiscard}
            className={`flex min-h-11 items-center px-2 text-sm text-ink/60 transition active:text-ink ${
              retryRun === null && retryableCount === 0
                ? "flex-1 justify-center"
                : ""
            }`}
          >
            {retryRun ? labels.cancel : labels.dismiss}
          </button>
          {(retryRun !== null || retryableCount > 0) && (
            <button
              type="button"
              disabled={retryRun !== null}
              onClick={onRetryAll}
              className="flex-1 rounded-pill bg-gold py-4 text-base font-medium text-card transition active:bg-gold-deep disabled:opacity-60"
            >
              {retryRun
                ? labels.failuresSendingCount
                    .replace(
                      "{done}",
                      String(Math.min(retryRun.done + 1, retryRun.total)),
                    )
                    .replace("{total}", String(retryRun.total))
                : labels.failuresRetryAll.replace(
                    "{count}",
                    String(retryableCount),
                  )}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
