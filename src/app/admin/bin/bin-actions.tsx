"use client";

import { useBulkAction, useServerAction } from "@/app/photo-controls";

export function BinActions({
  countLine,
  labels,
}: {
  countLine: string;
  labels: {
    restoreAll: string;
    bulkProgress: string;
    emptyBin: string;
    confirmEmptyBin: string;
    actionFailed: string;
  };
}) {
  const restore = useBulkAction();
  const empty = useServerAction();
  const busy = restore.busy || empty.busy;
  const failed = restore.failed || empty.failed;

  function restoreAll() {
    void restore.run(() => fetch("/api/admin/bin/restore-all", { method: "POST" }));
  }

  function emptyBin() {
    if (!window.confirm(labels.confirmEmptyBin)) return;
    void empty.run(() => fetch("/api/admin/bin/empty", { method: "POST" }));
  }

  const restoreValue =
    restore.total === null
      ? countLine
      : labels.bulkProgress
          .replace("{done}", String(restore.done))
          .replace("{total}", String(restore.total));

  return (
    <div className="sticky bottom-0 mt-auto flex flex-col gap-2.5 bg-paper-alt px-3.5 pt-4 pb-[22px]">
      <button
        type="button"
        disabled={busy}
        aria-busy={restore.busy}
        onClick={restoreAll}
        className="flex items-center justify-between gap-3 rounded-card border border-ink/10 bg-card px-4 py-[15px] text-left transition hover:bg-gold-tint active:bg-sand disabled:opacity-60"
      >
        <span className="text-sm text-ink">{labels.restoreAll}</span>
        <span className="text-[13px] whitespace-nowrap text-ink/50">{restoreValue}</span>
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={emptyBin}
        className="self-center border-b border-danger/30 p-3 text-[13px] text-danger transition disabled:opacity-60"
      >
        {labels.emptyBin}
      </button>
      {failed && <p className="text-center text-xs text-danger">{labels.actionFailed}</p>}
    </div>
  );
}
