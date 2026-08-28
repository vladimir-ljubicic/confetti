import Link from "next/link";
import type { SortMode } from "@/lib/sort-mode";

export function SortToggle({
  sort,
  basePath,
  labels,
}: {
  sort: SortMode;
  basePath: string;
  labels: { latest: string; popular: string };
}) {
  const options = [
    { mode: "latest", label: labels.latest },
    { mode: "popular", label: labels.popular },
  ] as const;

  return (
    <nav className="flex shrink-0 rounded-pill bg-sand p-[3px] text-meta">
      {options.map((option) => (
        <Link
          key={option.mode}
          href={`${basePath}?sort=${option.mode}`}
          aria-current={sort === option.mode ? "true" : undefined}
          className={`relative rounded-pill px-3 py-[7px] transition before:absolute before:inset-x-0 before:-inset-y-[7px] before:content-[''] ${
            sort === option.mode
              ? "bg-card text-gold-small shadow-[0_1px_2px_rgba(43,38,32,0.08)]"
              : "text-ink/60 hover:text-ink active:text-ink"
          }`}
        >
          {option.label}
        </Link>
      ))}
    </nav>
  );
}
