"use client";

import { useState } from "react";
import {
  ExportJobCard,
  ExportSheet,
  useExportJob,
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
  const [sheetOpen, setSheetOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const [failed, setFailed] = useState(false);
  const [includePrivate, setIncludePrivate] = useState(
    liveZip?.includePrivate ?? DEFAULT_INCLUDE_PRIVATE,
  );
  const job = useExportJob(EXPORT_ADMIN_PATH, initialStatus, EXPORT_ADMIN_CANCEL_PATH);
  const cancel = job.cancel;

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
          disabled={checking}
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

  async function prepare() {
    setChecking(true);
    setFailed(false);
    const ok = await job.prepare({ includePrivate });
    if (ok) setSheetOpen(false);
    else setFailed(true);
    setChecking(false);
  }

  return (
    <>
      {job.card && (
        <ExportJobCard
          card={job.card}
          labels={labels}
          locale={locale}
          copied={job.copied}
          onDownload={job.downloadNow}
          onCopy={job.copyStableLink}
          onDismiss={job.dismissCard}
          onCancel={cancel ? () => void cancel() : undefined}
          className="mb-2"
        />
      )}

      <button
        type="button"
        onClick={() => {
          setSheetOpen(true);
          setFailed(false);
        }}
        className="flex items-center justify-between gap-3 rounded-b-card border border-t-0 border-ink/10 bg-card px-4 py-[15px] text-left transition hover:bg-gold-tint active:bg-sand"
      >
        <span className="text-sm text-ink">{rowLabel}</span>
        <span className="text-[13px] whitespace-nowrap text-ink/50">{rowValue}</span>
      </button>

      {sheetOpen && (
        <ExportSheet
          labels={labels}
          rows={rows}
          failed={failed}
          checking={checking}
          onPrepare={() => void prepare()}
          onCancel={() => setSheetOpen(false)}
        />
      )}
    </>
  );
}
