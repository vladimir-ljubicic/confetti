"use client";

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-ink/15 border-t-gold ${className}`}
    />
  );
}

// Stands in for a bulk action's controls while it runs. Until the first batch
// answers the job has no size, so only the spinner moves.
export function BulkProgress({
  label,
  done,
  total,
  countLabel,
}: {
  label: string;
  done: number;
  total: number | null;
  countLabel: string;
}) {
  const fraction = total ? Math.min(done / total, 1) : 0;
  return (
    <div aria-busy className="flex min-w-0 flex-1 flex-col gap-2">
      <div className="flex items-center gap-2.5">
        <Spinner />
        <span role="status" className="min-w-0 flex-1 truncate text-sm text-ink">
          {label}
        </span>
        {total !== null && (
          <span className="shrink-0 text-xs tabular-nums text-ink-muted">
            {countLabel
              .replace("{done}", String(done))
              .replace("{total}", String(total))}
          </span>
        )}
      </div>
      <span
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total ?? undefined}
        aria-valuenow={total === null ? undefined : done}
        className="flex h-[5px] overflow-hidden rounded-[2.5px] bg-[#eee5d2]"
      >
        <span
          className="block bg-gold transition-[width] duration-300"
          style={{ width: `${fraction * 100}%` }}
        />
      </span>
    </div>
  );
}
