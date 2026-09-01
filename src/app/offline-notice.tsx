"use client";

import { pluralize, type Locale } from "@/lib/i18n";
import { useUploadQueue } from "./upload-queue";

export type OfflineNoticeLabels = {
  title: string;
  bodyOne: string;
  bodyFew: string;
  bodyMany: string;
  retry: string;
};

export function OfflineNotice({
  labels,
  locale,
  top,
}: {
  labels: OfflineNoticeLabels;
  locale: Locale;
  top: number;
}) {
  const queue = useUploadQueue();
  if (!queue || !queue.offline) return null;
  const waiting =
    queue.tiles.filter((tile) => tile.status === "queued").length +
    queue.bulkWaiting;
  if (waiting === 0) return null;
  return (
    <div
      style={{ top }}
      className="sticky z-[2] mx-3.5 mt-3.5 flex items-center gap-[11px] rounded-card border border-ink/15 bg-paper px-4 py-3.5"
    >
      <span className="w-3 shrink-0 self-start text-center text-base font-medium text-danger">
        !
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <span className="text-sm text-danger">{labels.title}</span>
        <span className="text-meta leading-[1.4] text-pretty text-ink/70">
          {pluralize(locale, waiting, {
            one: labels.bodyOne,
            few: labels.bodyFew,
            many: labels.bodyMany,
          })}
        </span>
      </div>
      <button
        type="button"
        onClick={queue.retryNow}
        className="flex h-11 shrink-0 items-center rounded-pill bg-card px-4 text-[13px] text-gold-small shadow-sm transition active:bg-gold-tint"
      >
        {labels.retry}
      </button>
    </div>
  );
}
