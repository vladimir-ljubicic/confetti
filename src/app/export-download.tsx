"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  EXPORT_PACKING_STATUS,
  formatSize,
  packingEtaMs,
  parseExportStatus,
  type ExportStatus,
  type PackingSample,
} from "@/lib/export";
import { pluralize, type Locale } from "@/lib/i18n";
import { formatEta } from "@/lib/upload-eta";
import { ConfettiMark } from "./confetti-mark";
import { useSheetDismiss } from "./use-sheet-dismiss";

export type DownloadSheetLabels = {
  title: string;
  intro: string;
  photosRow: string;
  photosValue: string;
  prepare: string;
  cancel: string;
  cancelPrepare: string;
  etaMinutes: string;
  etaUnderMinute: string;
  preparingTitle: string;
  preparingBody: string;
  failed: string;
  sizeRow: string;
  sizeValue: string;
  privateRow: string;
  packingProgress: string;
  readyTitle: string;
  readyCountOne: string;
  readyCountFew: string;
  readyCountMany: string;
  downloadNow: string;
  copyLink: string;
  linkCopied: string;
  dismiss: string;
};

export type ExportCard =
  | { kind: "packing"; done: number; total: number; etaMs: number | null }
  | { kind: "ready"; sizeBytes: number | null; total: number }
  | { kind: "failed" };

const POLL_MS = 5000;

function cardFromStatus(status: ExportStatus, etaMs: number | null): ExportCard | null {
  if (status.state === "ready") {
    return { kind: "ready", sizeBytes: status.sizeBytes, total: status.total };
  }
  if (status.state === "failed") return { kind: "failed" };
  if (status.state === "cancelled") return null;
  return { kind: "packing", done: status.done, total: status.total, etaMs };
}

// Client half of the export contract: prepares through the stable endpoint,
// tracks the job card across visits, and polls while the server is packing.
// The ETA comes from the progress this client has watched. Only a hook given
// a cancel path can cancel — the shared public build has none.
export function useExportJob(
  endpoint: string,
  initialStatus: ExportStatus | null,
  cancelPath: string | null = null,
) {
  const [card, setCard] = useState<ExportCard | null>(
    initialStatus && initialStatus.state === "packing"
      ? cardFromStatus(initialStatus, null)
      : null,
  );
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstSample = useRef<PackingSample | null>(null);

  const applyStatus = useCallback((status: ExportStatus) => {
    if (status.state !== "packing") {
      firstSample.current = null;
      setCard(cardFromStatus(status, null));
      return;
    }
    const latest = { done: status.done, at: Date.now() };
    // A job that restarted from scratch invalidates the rate measured so far.
    if (!firstSample.current || status.done < firstSample.current.done) {
      firstSample.current = latest;
    }
    setCard(cardFromStatus(status, packingEtaMs(firstSample.current, latest, status.total)));
  }, []);

  const request = useCallback(
    async (method: "GET" | "POST", path = endpoint): Promise<ExportStatus | null> => {
      const response = await fetch(path, {
        method,
        headers: { accept: "application/json" },
      });
      if (!response.ok && response.status !== EXPORT_PACKING_STATUS) {
        const status = parseExportStatus(await response.json().catch(() => null));
        return status?.state === "failed" ? status : null;
      }
      return parseExportStatus(await response.json().catch(() => null));
    },
    [endpoint],
  );

  useEffect(() => {
    if (card?.kind !== "packing") return;
    let active = true;
    const timer = setInterval(() => {
      void request("GET").then((status) => {
        if (active && status) applyStatus(status);
      });
    }, POLL_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [card?.kind, request, applyStatus]);

  useEffect(
    () => () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    },
    [],
  );

  // Resolves to true when the sheet can close: the card now shows the job,
  // packing or already ready.
  const prepare = useCallback(async (): Promise<boolean> => {
    try {
      const status = await request("POST");
      if (!status || status.state === "failed" || status.state === "cancelled") {
        return false;
      }
      applyStatus(status);
      return true;
    } catch (error) {
      console.error("Export prepare failed", error);
      return false;
    }
  }, [request, applyStatus]);

  const cancel = useCallback(async () => {
    if (!cancelPath) return;
    try {
      const status = await request("POST", cancelPath);
      if (status) applyStatus(status);
    } catch (error) {
      console.error("Export cancel failed", error);
    }
  }, [cancelPath, request, applyStatus]);

  const downloadNow = useCallback(() => {
    window.location.assign(endpoint);
  }, [endpoint]);

  const copyStableLink = useCallback(() => {
    void navigator.clipboard
      .writeText(`${window.location.origin}${endpoint}`)
      .then(() => {
        setCopied(true);
        if (copiedTimer.current) clearTimeout(copiedTimer.current);
        copiedTimer.current = setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => undefined);
  }, [endpoint]);

  const dismissCard = useCallback(() => setCard(null), []);

  return {
    card,
    copied,
    prepare,
    cancel: cancelPath ? cancel : null,
    downloadNow,
    copyStableLink,
    dismissCard,
  };
}

export function ExportJobCard({
  card,
  labels,
  locale,
  copied,
  onDownload,
  onCopy,
  onDismiss,
  onCancel,
  className = "",
}: {
  card: ExportCard;
  labels: DownloadSheetLabels;
  locale: Locale;
  copied: boolean;
  onDownload: () => void;
  onCopy: () => void;
  onDismiss: () => void;
  // Cancelling a shared build is an admin act; guest cards omit it.
  onCancel?: () => void;
  className?: string;
}) {
  if (card.kind === "packing") {
    const fraction = card.total > 0 ? card.done / card.total : 0;
    return (
      <div
        className={`flex w-full max-w-md flex-col gap-[11px] rounded-bar border border-ink/10 bg-card px-4 pt-3.5 pb-[15px] shadow-card ${className}`}
      >
        <div className="flex items-center gap-[11px]">
          <span className="shrink-0">
            <ConfettiMark size={18} variant="animated" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-sm text-ink">
                {labels.packingProgress
                  .replace("{done}", String(card.done))
                  .replace("{total}", String(card.total))}
              </span>
              {card.etaMs !== null && (
                <span className="shrink-0 text-xs text-ink/60">
                  {formatEta(card.etaMs, {
                    minutes: labels.etaMinutes,
                    underMinute: labels.etaUnderMinute,
                  })}
                </span>
              )}
            </div>
            <span className="flex h-[5px] overflow-hidden rounded-[2.5px] bg-[#eee5d2]">
              <span
                className="block bg-gold transition-[width]"
                style={{ width: `${Math.min(Math.max(fraction, 0), 1) * 100}%` }}
              />
            </span>
          </div>
        </div>
        <span className="text-xs leading-[1.4] text-pretty text-ink/60">
          {labels.preparingBody}
        </span>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="-mx-3.5 flex min-h-11 items-center justify-center self-start rounded-pill px-3.5 text-[13px] text-danger transition active:bg-sand"
          >
            {labels.cancelPrepare}
          </button>
        )}
      </div>
    );
  }

  if (card.kind === "failed") {
    return (
      <div
        className={`flex w-full max-w-md items-center gap-3 rounded-bar border border-ink/10 bg-card py-3.5 pr-2 pl-4 shadow-card ${className}`}
      >
        <ConfettiMark size={18} />
        <span className="min-w-0 flex-1 text-sm text-danger">{labels.failed}</span>
        <button
          type="button"
          onClick={onDismiss}
          aria-label={labels.dismiss}
          className="flex h-11 w-11 shrink-0 items-center justify-center text-ink/50"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <div
      className={`flex w-full max-w-md flex-col gap-3 rounded-bar border border-gold/40 bg-card px-4 pt-3.5 pb-4 shadow-card ${className}`}
    >
      <div className="flex items-center gap-3">
        <ConfettiMark size={18} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-sm text-ink">
            {labels.readyTitle.replace(
              "{size}",
              card.sizeBytes !== null ? formatSize(card.sizeBytes) : "ZIP",
            )}
          </span>
          <span className="text-xs text-ink/60">
            {pluralize(locale, card.total, {
              one: labels.readyCountOne,
              few: labels.readyCountFew,
              many: labels.readyCountMany,
            })}
          </span>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label={labels.dismiss}
          className="-my-2 flex h-11 w-11 shrink-0 items-center justify-center text-ink/50"
        >
          ✕
        </button>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onDownload}
          className="flex h-12 flex-1 items-center justify-center rounded-pill bg-gold px-5 text-sm font-medium text-card transition hover:bg-gold-small active:bg-gold-deep"
        >
          {labels.downloadNow}
        </button>
        <button
          type="button"
          onClick={onCopy}
          className="flex h-12 shrink-0 items-center justify-center rounded-pill border border-ink/18 px-5 text-sm text-gold-small transition hover:bg-gold-tint active:bg-sand"
        >
          {copied ? labels.linkCopied : labels.copyLink}
        </button>
      </div>
    </div>
  );
}

export function ExportSheet({
  labels,
  rows,
  failed,
  checking,
  onPrepare,
  onCancel,
}: {
  labels: DownloadSheetLabels;
  rows: { label: string; value: string }[];
  failed: boolean;
  checking: boolean;
  onPrepare: () => void;
  onCancel: () => void;
}) {
  const { sheetProps, backdropStyle } = useSheetDismiss(onCancel);

  return (
    <div
      style={backdropStyle}
      className="scrim-in pointer-events-auto fixed inset-0 z-50 flex flex-col justify-end bg-ink/42"
    >
      <div
        {...sheetProps}
        className="sheet-in mx-auto flex w-full max-w-md flex-col gap-5 rounded-sheet bg-card px-[22px] pt-3 pb-[26px] shadow-sheet"
      >
        <span className="mx-auto h-1 w-[38px] rounded-pill bg-ink/15" />

        <div className="flex flex-col items-center gap-2 text-center">
          <ConfettiMark size={22} />
          <h3 className="font-serif text-sheet-title font-medium text-gold-small">
            {labels.title}
          </h3>
          <p className="text-body text-ink/70">{labels.intro}</p>
        </div>

        <div className="flex flex-col overflow-hidden rounded-card bg-paper">
          {rows.map((row, i) => (
            <div
              key={row.label}
              className={`flex items-center justify-between px-4 py-3.5 text-sm ${
                i > 0 ? "border-t border-ink/8" : ""
              }`}
            >
              <span className="text-ink">{row.label}</span>
              <span className="text-ink/60">{row.value}</span>
            </div>
          ))}
        </div>

        {failed && <p className="text-center text-body text-danger">{labels.failed}</p>}

        <button
          type="button"
          disabled={checking}
          onClick={onPrepare}
          className="w-full rounded-pill bg-gold px-7 py-4 text-base font-medium text-card transition hover:bg-gold-small active:bg-gold-deep disabled:opacity-60"
        >
          {labels.prepare}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="-mt-2 min-h-11 text-sm text-ink/60"
        >
          {labels.cancel}
        </button>
      </div>
    </div>
  );
}
