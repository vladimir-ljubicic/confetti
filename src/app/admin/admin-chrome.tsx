import Link from "next/link";
import { ConfettiMark } from "@/app/confetti-mark";
import { LocaleToggle } from "@/app/locale-toggle";
import type { Dictionary } from "@/lib/dictionaries";
import type { Locale } from "@/lib/i18n";

export type AdminTab = "photos" | "guests" | "bin";

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
        <span className="flex items-center gap-1.5">
          <ConfettiMark size={14} />
          <span className="text-xs tracking-[0.16em] text-gold-deep uppercase">
            {labels.mark}
          </span>
        </span>
        <LocaleToggle locale={locale} labels={{ ariaLabel: labels.localeAriaLabel }} />
      </div>
    </div>
  );
}

export function AdminChrome({
  locale,
  active,
  binCount,
  title,
  sub,
  labels,
}: {
  locale: Locale;
  active: AdminTab;
  binCount: number;
  title: string;
  sub?: string;
  labels: AdminChromeLabels;
}) {
  const tabs: { key: AdminTab; href: "/admin" | "/admin/guests" | "/admin/bin"; label: string }[] = [
    { key: "photos", href: "/admin", label: labels.tabPhotos },
    { key: "guests", href: "/admin/guests", label: labels.tabGuests },
    {
      key: "bin",
      href: "/admin/bin",
      label: binCount > 0 ? `${labels.tabBin} ${binCount}` : labels.tabBin,
    },
  ];

  return (
    <>
      <AdminTopRow locale={locale} labels={labels} />
      <header className="flex flex-col gap-[3px] px-5 pt-4 pb-3.5">
        <h1 className="font-serif text-title font-medium text-gold-small">{title}</h1>
        {sub && <p className="text-[13px] text-ink/55">{sub}</p>}
      </header>
      <nav className="mx-4 mb-4 flex gap-1 rounded-pill bg-sand-deep p-1 text-[13px]">
        {tabs.map((tab) =>
          tab.key === active ? (
            <span
              key={tab.key}
              aria-current="page"
              className="flex-1 rounded-pill bg-card py-2.5 text-center text-gold-small"
            >
              {tab.label}
            </span>
          ) : (
            <Link
              key={tab.key}
              href={tab.href}
              className="flex-1 rounded-pill py-2.5 text-center text-ink/60 transition hover:text-ink active:text-ink"
            >
              {tab.label}
            </Link>
          ),
        )}
      </nav>
    </>
  );
}
