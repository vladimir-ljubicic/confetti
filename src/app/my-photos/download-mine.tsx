"use client";

import {
  EXPORT_MINE_CANCEL_PATH,
  EXPORT_MINE_PATH,
  formatSize,
  type ExportStatus,
} from "@/lib/export";
import type { Locale } from "@/lib/i18n";
import {
  ExportJobCard,
  ExportSheet,
  useExportSurface,
  type DownloadSheetLabels,
} from "../export-download";

// Own-photos variant of the download surface: an outlined button under the
// guest's grid, a sheet over their own zip — every photo they uploaded,
// private ones included, so there is nothing to choose — and the job card
// above it. The zip is one guest's, so cancelling a packing one is theirs too.
export function DownloadMineButton({
  labels,
  locale,
  photoCount,
  sizeBytes,
  initialStatus,
}: {
  labels: DownloadSheetLabels & { download: string };
  locale: Locale;
  photoCount: number;
  sizeBytes: number;
  initialStatus: ExportStatus | null;
}) {
  const surface = useExportSurface(
    EXPORT_MINE_PATH,
    initialStatus,
    EXPORT_MINE_CANCEL_PATH,
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
    <div className="flex flex-col items-center gap-3 px-4 pb-10">
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
        />
      )}

      <button
        type="button"
        onClick={surface.open}
        className="rounded-pill border border-ink/18 bg-card px-[26px] py-4 text-base font-medium text-gold-small transition hover:bg-gold-tint active:bg-sand"
      >
        {labels.download}
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
