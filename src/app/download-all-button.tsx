"use client";

import { useState } from "react";
import { EXPORT_PUBLIC_PATH, formatSize, type ExportStatus } from "@/lib/export";
import type { Locale } from "@/lib/i18n";
import {
  ExportJobCard,
  ExportSheet,
  useExportJob,
  type DownloadSheetLabels,
} from "./export-download";
import { useGalleryCount } from "./gallery-count";

// Guest variant of the download surface: frozen-gallery button, 13a sheet
// over the public zip (no private-photo row), 13b/13c job card above it.
export function DownloadAllButton({
  buttonLabel,
  labels,
  locale,
  photoCount,
  sizeBytes,
  initialStatus,
}: {
  buttonLabel: string;
  labels: DownloadSheetLabels;
  locale: Locale;
  // The zip's own count when an export exists; null falls back to the number
  // of photos the gallery is holding.
  photoCount: number | null;
  sizeBytes: number | null;
  initialStatus: ExportStatus | null;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const [failed, setFailed] = useState(false);
  const job = useExportJob(EXPORT_PUBLIC_PATH, initialStatus);
  const galleryCount = useGalleryCount();

  const rows = [
    {
      label: labels.photosRow,
      value: labels.photosValue.replace(
        "{count}",
        String(photoCount ?? galleryCount ?? 0),
      ),
    },
    ...(sizeBytes !== null && sizeBytes > 0
      ? [
          {
            label: labels.sizeRow,
            value: labels.sizeValue.replace("{size}", formatSize(sizeBytes)),
          },
        ]
      : []),
  ];

  async function startDownload() {
    setChecking(true);
    setFailed(false);
    const ok = await job.startDownload();
    if (ok) setSheetOpen(false);
    else setFailed(true);
    setChecking(false);
  }

  return (
    <div className="pointer-events-none sticky bottom-6 mt-auto flex w-full flex-col items-center gap-3 px-4">
      {job.card && (
        <ExportJobCard
          card={job.card}
          labels={labels}
          locale={locale}
          copied={job.copied}
          onDownload={job.downloadNow}
          onCopy={job.copyStableLink}
          onDismiss={job.dismissCard}
          className="pointer-events-auto"
        />
      )}

      <button
        type="button"
        onClick={() => {
          setSheetOpen(true);
          setFailed(false);
        }}
        className="pointer-events-auto rounded-pill border border-ink/18 bg-card px-[26px] py-4 text-base font-medium text-gold-small shadow-[0_10px_24px_-14px_rgb(43_38_32/0.4)] transition hover:bg-gold-tint active:bg-sand"
      >
        {buttonLabel}
      </button>

      {sheetOpen && (
        <ExportSheet
          labels={labels}
          rows={rows}
          failed={failed}
          checking={checking}
          onDownload={() => void startDownload()}
          onCancel={() => setSheetOpen(false)}
        />
      )}
    </div>
  );
}
