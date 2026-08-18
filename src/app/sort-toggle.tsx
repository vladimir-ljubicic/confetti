import Link from "next/link";
import type { SortMode } from "@/lib/sort-mode";

export function SortToggle({
  sort,
  basePath,
  labels,
}: {
  sort: SortMode;
  basePath: string;
  labels: { live: string; chrono: string };
}) {
  const options = [
    { mode: "live", label: labels.live },
    { mode: "chrono", label: labels.chrono },
  ] as const;

  return (
    <nav className="flex rounded-full bg-pearl p-1 text-sm">
      {options.map((option) => (
        <Link
          key={option.mode}
          href={`${basePath}?sort=${option.mode}`}
          aria-current={sort === option.mode ? "true" : undefined}
          className={`rounded-full px-4 py-1.5 transition ${
            sort === option.mode
              ? "bg-white text-gold-deep shadow-sm"
              : "text-ink/60 hover:text-ink"
          }`}
        >
          {option.label}
        </Link>
      ))}
    </nav>
  );
}
