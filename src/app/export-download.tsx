"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  EXPORT_PACKING_STATUS,
  formatSize,
  parseExportStatus,
  type ExportStatus,
} from "@/lib/export";
import { pluralize, type Locale } from "@/lib/i18n";
import { ConfettiMark } from "./confetti-mark";
import { useSheetDismiss } from "./use-sheet-dismiss";

export type DownloadSheetLabels = {
  title: string;
  intro: string;
  photosRow: string;
  photosValue: string;
  download: string;
  cancel: string;
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
  | { kind: "packing"; done: number; total: number }
  | { kind: "ready"; sizeBytes: number | null; total: number }
  | { kind: "failed" };

const POLL_MS = 5000;

function cardFromStatus(status: ExportStatus): ExportCard {
  if (status.state === "ready") {
    return { kind: "ready", sizeBytes: status.sizeBytes, total: status.total };
  }
  if (status.state === "failed") return { kind: "failed" };
  return { kind: "packing", done: status.done, total: status.total };
}

// Client half of the export contract: probes the stable endpoint, tracks the
// job card across visits (13b/13c), and polls while the server is packing.
export function useExportJob(endpoint: string, initialStatus: ExportStatus | null) {
  const [card, setCard] = useState<ExportCard | null>(
    initialStatus && initialStatus.state === "packing"
      ? cardFromStatus(initialStatus)
      : null,
  );
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const probe = useCallback(async (): Promise<ExportStatus | null> => {
    const response = await fetch(endpoint, {
      headers: { accept: "application/json" },
    });
    if (!response.ok && response.status !== EXPORT_PACKING_STATUS) {
      const status = parseExportStatus(await response.json().catch(() => null));
      return status?.state === "failed" ? status : null;
    }
    return parseExportStatus(await response.json().catch(() => null));
  }, [endpoint]);

  useEffect(() => {
    if (card?.kind !== "packing") return;
    const timer = setInterval(() => {
      void probe().then((status) => {
        if (status) setCard(cardFromStatus(status));
      });
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [card?.kind, probe]);

  useEffect(
    () => () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    },
    [],
  );

  // Resolves to true when the sheet can close (download started or card shown).
  const startDownload = useCallback(async (): Promise<boolean> => {
    try {
      const status = await probe();
      if (!status || status.state === "failed") return false;
      if (status.state === "ready") window.location.assign(endpoint);
      setCard(cardFromStatus(status));
      return true;
    } catch (error) {
      console.error("Export probe failed", error);
      return false;
    }
  }, [endpoint, probe]);

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

  return { card, copied, startDownload, downloadNow, copyStableLink, dismissCard };
}

export function ExportJobCard({
  card,
  labels,
  locale,
  copied,
  onDownload,
  onCopy,
  onDismiss,
  className = "",
}: {
  card: ExportCard;
  labels: DownloadSheetLabels;
  locale: Locale;
  copied: boolean;
  onDownload: () => void;
  onCopy: () => void;
  onDismiss: () => void;
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
            <span className="truncate text-sm text-ink">
              {labels.packingProgress
                .replace("{done}", String(card.done))
                .replace("{total}", String(card.total))}
            </span>
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
  onDownload,
  onCancel,
}: {
  labels: DownloadSheetLabels;
  rows: { label: string; value: string }[];
  failed: boolean;
  checking: boolean;
  onDownload: () => void;
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
          onClick={onDownload}
          className="w-full rounded-pill bg-gold px-7 py-4 text-base font-medium text-card transition hover:bg-gold-small active:bg-gold-deep disabled:opacity-60"
        >
          {labels.download}
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
