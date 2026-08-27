"use client";

import { useState } from "react";
import { EXPORT_PACKING_STATUS, EXPORT_PUBLIC_PATH } from "@/lib/export";
import { ConfettiMark } from "./confetti-mark";

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
};

// Guest variant of the download sheet: public gallery only, so no
// private-photo row. A HEAD probe distinguishes a ready zip (the endpoint
// 302s and the probe lands on the signed URL) from one still packing.
export function DownloadAllButton({
  buttonLabel,
  labels,
  photoCount,
}: {
  buttonLabel: string;
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
      const probe = await fetch(EXPORT_PUBLIC_PATH, { method: "HEAD" });
      if (probe.status === EXPORT_PACKING_STATUS) {
        setSheetOpen(false);
        setPacking(true);
      } else if (probe.ok) {
        window.location.assign(EXPORT_PUBLIC_PATH);
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
    <div className="pointer-events-none sticky bottom-6 flex w-full flex-col items-center gap-3 px-4">
      {packing && (
        <div className="pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-bar border border-ink/10 bg-card px-4 pt-3.5 pb-[15px] shadow-card">
          <span className="mt-0.5 shrink-0">
            <ConfettiMark size={18} variant="animated" />
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-sm text-ink">{labels.preparingTitle}</span>
            <span className="text-meta text-pretty text-ink/70">{labels.preparingBody}</span>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          setSheetOpen(true);
          setFailed(false);
        }}
        className="pointer-events-auto rounded-pill border border-ink/18 bg-card px-[26px] py-4 text-base font-medium text-gold-small shadow-[0_10px_24px_-14px_rgb(43_38_32/0.4)] transition hover:bg-gold-tint"
      >
        {buttonLabel}
      </button>

      {sheetOpen && (
        <div className="pointer-events-auto fixed inset-0 z-50 flex flex-col justify-end bg-ink/42">
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
    </div>
  );
}
