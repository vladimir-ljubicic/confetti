"use client";

import Link from "next/link";
import { pluralize, type Locale } from "@/lib/i18n";
import { sortToggleShown } from "@/lib/sort-mode";
import { LocaleToggle } from "./locale-toggle";
import { NewPhotosPill } from "./new-photos";
import { SortToggle } from "./sort-toggle";

export type GuestBarLabels = {
  backToGallery: string;
  photosOne: string;
  photosFew: string;
  photosMany: string;
  myPhotos: string;
  localeAriaLabel: string;
  sortLatest: string;
  sortPopular: string;
  newPhotos: string;
};

// Header of a per-guest gallery: whose photos these are, and the way back to
// all of them.
export function GuestBar({
  displayName,
  photoCount,
  likeTotal,
  viewerName,
  locale,
  labels,
  onBack,
}: {
  displayName: string;
  photoCount: number;
  likeTotal: number;
  viewerName: string | null;
  locale: Locale;
  labels: GuestBarLabels;
  onBack: () => void;
}) {
  return (
    <div className="sticky top-0 z-[4]">
      <div className="flex items-center justify-between bg-paper px-[18px] pt-3.5 pb-3">
        <Link
          href="/"
          prefetch={false}
          onClick={(event) => {
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
              return;
            }
            event.preventDefault();
            onBack();
          }}
          className="-m-1.5 flex min-h-11 items-center gap-[7px] p-1.5 text-[13px] text-ink-muted transition hover:text-ink active:text-ink"
        >
          <span aria-hidden className="text-[15px]">
            ←
          </span>
          {labels.backToGallery}
        </Link>
        <div className="flex items-center gap-2.5">
          <LocaleToggle locale={locale} labels={{ ariaLabel: labels.localeAriaLabel }} />
          {viewerName && (
            <Link href="/my-photos" aria-label={labels.myPhotos} className="-m-1.5 p-1.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-ink/15 bg-sand font-serif text-base text-gold-deep">
                {viewerName.trim().charAt(0).toLocaleUpperCase(locale)}
              </span>
            </Link>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2.5 border-b border-ink/7 bg-paper/94 px-4 pt-[9px] pb-3 backdrop-blur-[10px]">
        <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-sand font-serif text-base text-gold-deep">
          {displayName.trim().charAt(0).toLocaleUpperCase(locale)}
        </span>
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-serif text-[19px] leading-[1.15] text-gold-small">
            {displayName}
          </span>
          <span className="text-[11px] tracking-[0.16em] whitespace-nowrap text-ink-muted">
            {pluralize(locale, photoCount, {
              one: labels.photosOne,
              few: labels.photosFew,
              many: labels.photosMany,
            })}
            {" · "}
            {likeTotal} ♥
          </span>
        </div>
        {sortToggleShown(likeTotal) && (
          <div className="ml-auto">
            <SortToggle
              labels={{ latest: labels.sortLatest, popular: labels.sortPopular }}
            />
          </div>
        )}
      </div>

      <NewPhotosPill label={labels.newPhotos} />
    </div>
  );
}
