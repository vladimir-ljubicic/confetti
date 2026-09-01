import Link from "next/link";
import { ConfettiMark } from "@/app/confetti-mark";
import { LocaleToggle } from "@/app/locale-toggle";
import type { Dictionary } from "@/lib/dictionaries";
import type { Locale } from "@/lib/i18n";
import { AdminTabs } from "./admin-tabs";

export function adminChromeLabels(dict: Dictionary): AdminChromeLabels {
  return {
    backToGallery: dict.admin.backToGallery,
    mark: dict.admin.title,
    tabPhotos: dict.admin.tabPhotos,
    tabGuests: dict.admin.tabGuests,
    tabBin: dict.admin.tabBin,
    localeAriaLabel: dict.localeToggle.ariaLabel,
  };
}

export type AdminChromeLabels = {
  backToGallery: string;
  mark: string;
  tabPhotos: string;
  tabGuests: string;
  tabBin: string;
  localeAriaLabel: string;
};

export function AdminTopRow({
  locale,
  labels,
  back,
}: {
  locale: Locale;
  labels: Pick<AdminChromeLabels, "backToGallery" | "mark" | "localeAriaLabel">;
  back?: { href: "/admin/guests"; label: string };
}) {
  return (
    <div className="flex items-center justify-between gap-3 pt-4 pr-[18px] pl-2">
      <Link
        href={back?.href ?? "/"}
        className="flex min-h-11 items-center gap-[7px] rounded-pill px-3 text-[13px] text-ink/60 transition hover:text-ink active:text-ink"
      >
        <span aria-hidden className="text-[15px]">
          ←
        </span>
        {back?.label ?? labels.backToGallery}
      </Link>
      <div className="flex items-center gap-2.5">
        <Link href="/" className="-m-1.5 flex min-h-11 items-center gap-1.5 p-1.5">
          <ConfettiMark size={14} />
          <span className="text-xs tracking-[0.16em] text-gold-deep uppercase">
            {labels.mark}
          </span>
        </Link>
        <LocaleToggle locale={locale} labels={{ ariaLabel: labels.localeAriaLabel }} />
      </div>
    </div>
  );
}

export function AdminChrome({
  locale,
  binCount,
  title,
  sub,
  labels,
}: {
  locale: Locale;
  binCount: number;
  title: string;
  sub?: string;
  labels: AdminChromeLabels;
}) {
  return (
    <>
      <AdminTopRow locale={locale} labels={labels} />
      <header className="flex flex-col gap-[3px] px-5 pt-4 pb-3.5">
        <h1 className="font-serif text-title font-medium text-gold-small">{title}</h1>
        {sub && <p className="text-[13px] text-ink/55">{sub}</p>}
      </header>
      <AdminTabs binCount={binCount} labels={labels} />
    </>
  );
}
