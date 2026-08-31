"use client";

export type Segment<T> = { value: T; label: string };

export function Segmented<T>({
  segments,
  value,
  onChange,
  disabled = false,
}: {
  segments: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex shrink-0 items-center rounded-pill bg-sand p-[3px] text-meta">
      {segments.map((segment) => {
        const active = segment.value === value;
        return (
          <button
            key={segment.label}
            type="button"
            aria-pressed={active}
            disabled={disabled}
            onClick={() => {
              if (!active) onChange(segment.value);
            }}
            className={`rounded-pill px-3 py-2 transition disabled:opacity-60 ${
              active ? "bg-gold-small text-card" : "text-ink/55 hover:text-ink active:text-ink"
            }`}
          >
            {segment.label}
          </button>
        );
      })}
    </div>
  );
}
