"use client";

export type SelectEntryLabels = {
  enterSelect: string;
  longPressHint: string;
};

export function SelectEntry({
  onEnter,
  labels,
}: {
  onEnter: () => void;
  labels: SelectEntryLabels;
}) {
  return (
    <div className="flex items-center justify-between gap-2.5 px-[18px] pb-3.5">
      <p className="text-meta leading-[1.4] text-ink-muted">{labels.longPressHint}</p>
      <button
        type="button"
        onClick={onEnter}
        className="flex min-h-[38px] shrink-0 items-center gap-[7px] rounded-pill border border-gold/45 bg-card pr-[13px] pl-[11px] text-[13px] whitespace-nowrap text-gold-small transition hover:bg-gold-tint active:bg-gold-tint"
      >
        <span aria-hidden className="h-[15px] w-[15px] rounded-[4px] border-[1.5px] border-gold" />
        {labels.enterSelect}
      </button>
    </div>
  );
}
