"use client";

import { useState } from "react";
import {
  ExportJobCard,
  ExportSheet,
  useExportSurface,
  type DownloadSheetLabels,
  type ExportSheetRow,
} from "@/app/export-download";
import {
  EXPORT_ADMIN_CANCEL_PATH,
  EXPORT_ADMIN_PATH,
  formatSize,
  type ExportStatus,
} from "@/lib/export";
import type { Locale } from "@/lib/i18n";
import type { AdminSummary } from "@/lib/admin-gallery";
import { DEFAULT_INCLUDE_PRIVATE } from "@/lib/export";
import { Segmented } from "@/app/segmented";

// The live admin zip as prepared: preparing again with the same choice hands
// this back unchanged, so the sheet quotes its numbers over the gallery's.
export type LiveExportZip = { includePrivate: boolean; photoCount: number; sizeBytes: number };

// Admin counterpart of DownloadAllButton, against the admin zip. The sheet
// lets the couple choose whether private photos go in; the count and size it
// shows follow that choice.
export function AdminDownloadRow({
  rowLabel,
  rowValue,
  labels,
  locale,
  summary,
  liveZip,
  initialStatus,
}: {
  rowLabel: string;
  rowValue: string;
  labels: DownloadSheetLabels;
  locale: Locale;
  summary: Pick<AdminSummary, "totalCount" | "privateCount" | "totalBytes" | "privateBytes">;
  liveZip: LiveExportZip | null;
  initialStatus: ExportStatus | null;
}) {
  const [includePrivate, setIncludePrivate] = useState(
    liveZip?.includePrivate ?? DEFAULT_INCLUDE_PRIVATE,
  );
  const surface = useExportSurface(
    EXPORT_ADMIN_PATH,
    initialStatus,
    EXPORT_ADMIN_CANCEL_PATH,
  );
  const cancel = surface.job.cancel;

  const zipAsChosen = liveZip?.includePrivate === includePrivate ? liveZip : null;
  const count =
    zipAsChosen?.photoCount ??
    (includePrivate ? summary.totalCount : summary.totalCount - summary.privateCount);
  const sizeBytes =
    zipAsChosen?.sizeBytes ??
    (includePrivate ? summary.totalBytes : summary.totalBytes - summary.privateBytes);
  const rows: ExportSheetRow[] = [
    {
      label: labels.photosRow,
      value: labels.photosValue.replace("{count}", String(count)),
    },
    {
      label: labels.privateRow,
      control: (
        <Segmented
          segments={[
            { value: true, label: labels.privateInclude },
            { value: false, label: labels.privateExclude },
          ]}
          value={includePrivate}
          onChange={setIncludePrivate}
          disabled={surface.checking}
        />
      ),
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

      <button
        type="button"
        onClick={surface.open}
        className="flex items-center justify-between gap-3 rounded-b-card border border-t-0 border-ink/10 bg-card px-4 py-[15px] text-left transition hover:bg-gold-tint active:bg-sand"
      >
        <span className="text-sm text-ink">{rowLabel}</span>
        <span className="text-[13px] whitespace-nowrap text-ink-muted">{rowValue}</span>
      </button>

      {surface.sheetOpen && (
        <ExportSheet
          labels={labels}
          rows={rows}
          failed={surface.failed}
          checking={surface.checking}
          onPrepare={() => void surface.prepare({ includePrivate })}
          onCancel={surface.close}
        />
      )}
    </>
  );
}
