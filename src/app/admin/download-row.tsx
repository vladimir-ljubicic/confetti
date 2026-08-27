"use client";

import { useState } from "react";
import { ConfettiMark } from "@/app/confetti-mark";
import type { DownloadSheetLabels } from "@/app/download-all-button";
import { EXPORT_ADMIN_PATH, EXPORT_PACKING_STATUS } from "@/lib/export";

// Admin counterpart of DownloadAllButton: same sheet and endpoint contract,
// against the admin zip (public + private photos).
export function AdminDownloadRow({
  rowLabel,
  rowValue,
  labels,
  photoCount,
}: {
  rowLabel: string;
  rowValue: string;
  labels: DownloadSheetLabels;
  photoCount: number;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const [packing, setPacking] = useState(false);
  const [failed, setFailed] = useState(false);

  async function startDownload() {
    setChecking(true);
    setFailed(false);
    try {
      const probe = await fetch(EXPORT_ADMIN_PATH, { method: "HEAD" });
      if (probe.status === EXPORT_PACKING_STATUS) {
        setSheetOpen(false);
        setPacking(true);
      } else if (probe.ok) {
        window.location.assign(EXPORT_ADMIN_PATH);
        setSheetOpen(false);
      } else {
        setFailed(true);
      }
    } catch (error) {
      console.error("Export probe failed", error);
      setFailed(true);
    } finally {
      setChecking(false);
    }
  }

  return (
    <>
      {packing && (
        <div className="mb-2 flex items-start gap-3 rounded-card border border-ink/10 bg-card px-4 pt-3.5 pb-[15px]">
          <span className="mt-0.5 shrink-0">
            <ConfettiMark size={18} variant="animated" />
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-sm text-ink">{labels.preparingTitle}</span>
            <span className="text-meta text-pretty text-ink/70">
              {labels.preparingBody}
            </span>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          setSheetOpen(true);
          setFailed(false);
        }}
        className="flex items-center justify-between gap-3 rounded-b-card border border-t-0 border-ink/10 bg-card px-4 py-[15px] text-left transition hover:bg-gold-tint"
      >
        <span className="text-sm text-ink">{rowLabel}</span>
        <span className="text-[13px] whitespace-nowrap text-ink/50">{rowValue}</span>
      </button>

      {sheetOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-ink/42">
          <div className="mx-auto flex w-full max-w-md flex-col gap-5 rounded-sheet bg-card px-[22px] pt-3 pb-[26px] shadow-sheet">
            <span className="mx-auto h-1 w-[38px] rounded-pill bg-ink/15" />

            <div className="flex flex-col items-center gap-2 text-center">
              <ConfettiMark size={22} />
              <h3 className="font-serif text-sheet-title font-medium text-gold-small">
                {labels.title}
              </h3>
              <p className="text-body text-ink/70">{labels.intro}</p>
            </div>

            <div className="flex items-center justify-between rounded-card bg-paper px-4 py-3.5 text-sm">
              <span className="text-ink">{labels.photosRow}</span>
              <span className="text-ink/60">
                {labels.photosValue.replace("{count}", String(photoCount))}
              </span>
            </div>

            {failed && <p className="text-center text-body text-danger">{labels.failed}</p>}

            <button
              type="button"
              disabled={checking}
              onClick={() => void startDownload()}
              className="w-full rounded-pill bg-gold px-7 py-4 text-base font-medium text-card transition hover:bg-gold-small disabled:opacity-60"
            >
              {labels.download}
            </button>
            <button
              type="button"
              onClick={() => setSheetOpen(false)}
              className="-mt-2 min-h-11 text-sm text-ink/60"
            >
              {labels.cancel}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
