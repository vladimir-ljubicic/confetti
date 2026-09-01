"use client";

import {
  ExportJobCard,
  ExportSheet,
  useExportSurface,
  type DownloadSheetLabels,
} from "@/app/export-download";
import {
  exportGuestCancelPath,
  exportGuestPath,
  formatSize,
  type ExportStatus,
} from "@/lib/export";
import type { Locale } from "@/lib/i18n";

// Admin variant of the download surface, over one guest's zip — the same zip
// that guest prepares from their own page, so it holds every photo they
// uploaded and there is no private-photos choice to make.
export function GuestDownloadRow({
  publicId,
  rowLabel,
  rowValue,
  labels,
  locale,
  photoCount,
  sizeBytes,
  initialStatus,
}: {
  publicId: string;
  rowLabel: string;
  rowValue: string;
  labels: DownloadSheetLabels;
  locale: Locale;
  photoCount: number;
  sizeBytes: number;
  initialStatus: ExportStatus | null;
}) {
  const surface = useExportSurface(
    exportGuestPath(publicId),
    initialStatus,
    exportGuestCancelPath(publicId),
  );
  const cancel = surface.job.cancel;

  const rows = [
    {
      label: labels.photosRow,
      value: labels.photosValue.replace("{count}", String(photoCount)),
    },
    ...(sizeBytes > 0
      ? [
          {
            label: labels.sizeRow,
            value: labels.sizeValue.replace("{size}", formatSize(sizeBytes)),
          },
        ]
      : []),
  ];

  return (
    <>
      {surface.job.card && (
        <ExportJobCard
          card={surface.job.card}
          labels={labels}
          locale={locale}
          copied={surface.job.copied}
          onDownload={surface.job.downloadNow}
          onCopy={surface.job.copyStableLink}
          onDismiss={surface.job.dismissCard}
          onCancel={cancel ? () => void cancel() : undefined}
          className="mb-2"
        />
      )}

      <div className="flex flex-col rounded-b-card border border-ink/10 bg-card">
        <button
          type="button"
          disabled={photoCount === 0}
          onClick={surface.open}
          className="flex items-center justify-between gap-3 px-4 py-[15px] text-left transition hover:bg-gold-tint active:bg-sand disabled:opacity-60"
        >
          <span className="text-sm text-ink">{rowLabel}</span>
          <span className="text-[13px] whitespace-nowrap text-ink/60">{rowValue}</span>
        </button>
      </div>

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
    </>
  );
}
