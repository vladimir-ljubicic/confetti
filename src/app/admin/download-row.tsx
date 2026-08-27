"use client";

import { useState } from "react";
import {
  ExportJobCard,
  ExportSheet,
  useExportJob,
  type DownloadSheetLabels,
} from "@/app/export-download";
import { EXPORT_ADMIN_PATH, formatSize, type ExportStatus } from "@/lib/export";
import type { Locale } from "@/lib/i18n";

// Admin counterpart of DownloadAllButton, against the admin zip (public +
// private photos). The sheet is informational — both zips always build.
export function AdminDownloadRow({
  rowLabel,
  rowValue,
  labels,
  locale,
  photoCount,
  privateCount,
  sizeBytes,
  initialStatus,
}: {
  rowLabel: string;
  rowValue: string;
  labels: DownloadSheetLabels;
  locale: Locale;
  photoCount: number;
  privateCount: number;
  sizeBytes: number | null;
  initialStatus: ExportStatus | null;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const [failed, setFailed] = useState(false);
  const job = useExportJob(EXPORT_ADMIN_PATH, initialStatus);

  const rows = [
    {
      label: labels.photosRow,
      value: labels.photosValue.replace("{count}", String(photoCount)),
    },
    { label: labels.privateRow, value: String(privateCount) },
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
          className="mb-2"
        />
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
        <ExportSheet
          labels={labels}
          rows={rows}
          failed={failed}
          checking={checking}
          onDownload={() => void startDownload()}
          onCancel={() => setSheetOpen(false)}
        />
      )}
    </>
  );
}
