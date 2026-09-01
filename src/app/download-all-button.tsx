"use client";

import { EXPORT_PUBLIC_PATH, formatSize, type ExportStatus } from "@/lib/export";
import type { Locale } from "@/lib/i18n";
import {
  ExportJobCard,
  ExportSheet,
  useExportSurface,
  type DownloadSheetLabels,
} from "./export-download";
import { useGalleryCount } from "./gallery-stats";

// Gallery variant of the download surface: a pinned button under the frozen
// gallery, a sheet over the public zip (no private-photo row, which only the
// couple choose), and the job card above it.
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
  const surface = useExportSurface(EXPORT_PUBLIC_PATH, initialStatus);
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

  return (
    <div className="pointer-events-none sticky bottom-6 mt-auto flex w-full flex-col items-center gap-3 px-4">
      {surface.job.card && (
        <ExportJobCard
          card={surface.job.card}
          labels={labels}
          locale={locale}
          copied={surface.job.copied}
          onDownload={surface.job.downloadNow}
          onCopy={surface.job.copyStableLink}
          onDismiss={surface.job.dismissCard}
          className="pointer-events-auto"
        />
      )}

      <button
        type="button"
        onClick={surface.open}
        className="pointer-events-auto rounded-pill border border-ink/18 bg-card px-[26px] py-4 text-base font-medium text-gold-small shadow-[0_10px_24px_-14px_rgb(43_38_32/0.4)] transition hover:bg-gold-tint active:bg-sand"
      >
        {buttonLabel}
      </button>

      {surface.sheetOpen && (
        <ExportSheet
          labels={labels}
          rows={rows}
          failed={surface.failed}
          checking={surface.checking}
          onPrepare={() => void surface.prepare()}
          onCancel={surface.close}
        />
      )}
    </div>
  );
}
