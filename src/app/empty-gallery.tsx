"use client";

import { COUPLE_NAMES } from "@/lib/couple";
import type { Dictionary } from "@/lib/dictionaries";
import { formatEventDate } from "@/lib/event-schedule";
import type { Locale } from "@/lib/i18n";
import { ConfettiWordmark } from "./confetti-wordmark";
import { LocaleToggle } from "./locale-toggle";
import { PhotoGrid } from "./photo-grid";
import { UploadButton } from "./upload-button";
import { uploadTileLabels } from "./upload-labels";
import { UploadQueueProvider, useUploadQueue } from "./upload-queue";
import { photoAltLabels } from "./viewer-labels";

type EmptyGalleryProps = {
  dict: Dictionary;
  locale: Locale;
  eventDateIso: string;
  uploadsFrozen: boolean;
  uploadsBlocked: boolean;
  needsProfile: boolean;
  limits: { maxBatch: number; maxFileBytes: number };
  limitsExempt: boolean;
};

export function EmptyGallery(props: EmptyGalleryProps) {
  const { dict, locale } = props;
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col">
      <div className="flex items-center justify-between px-[18px] pt-3.5">
        <ConfettiWordmark />
        <LocaleToggle locale={locale} labels={{ ariaLabel: dict.localeToggle.ariaLabel }} />
      </div>

      <UploadQueueProvider labels={uploadTileLabels(dict)}>
        <EmptyGalleryBody {...props} />
      </UploadQueueProvider>
    </main>
  );
}

// The invitation is the content only until the first optimistic tiles exist;
// from then on this renders the ordinary grid so small first batches get the
// per-tile upload treatment instead of the bulk mini-bar.
function EmptyGalleryBody({
  dict,
  locale,
  eventDateIso,
  uploadsFrozen,
  uploadsBlocked,
  needsProfile,
  limits,
  limitsExempt,
}: EmptyGalleryProps) {
  const queue = useUploadQueue();
  const hasTiles = (queue?.tiles.length ?? 0) > 0;

  return (
    <div
      className={
        hasTiles
          ? "flex flex-1 flex-col pt-3.5"
          : "flex flex-1 flex-col items-center justify-center gap-[22px] px-[34px] pb-10 text-center"
      }
    >
      {hasTiles ? (
        <PhotoGrid
          photos={[]}
          emptyLabel={dict.gallery.empty}
          altLabels={photoAltLabels(dict)}
          likeLabels={{ like: dict.gallery.like, unlike: dict.gallery.unlike }}
        />
      ) : (
        <>
          <span className="text-[11px] text-gold uppercase tracking-[0.28em]">
            {dict.gallery.eyebrow}
          </span>
          <h1 className="font-serif text-[48px] leading-[1.02] font-medium text-gold-small">
            {COUPLE_NAMES[locale].first}
            <br />
            <span className="text-[32px] text-gold italic">{COUPLE_NAMES[locale].and}</span>
            <br />
            {COUPLE_NAMES[locale].second}
          </h1>
          <div className="flex items-center gap-2.5 text-ink/35">
            <span className="block h-px w-[34px] bg-current" />
            <span className="text-meta tracking-[0.22em] text-ink/60">
              {formatEventDate(eventDateIso, " · ")}
            </span>
            <span className="block h-px w-[34px] bg-current" />
          </div>
          <p className="mt-1.5 font-serif text-[22px] leading-[1.45] text-ink/70 italic">
            {dict.gallery.emptyLine1}
            <br />
            {dict.gallery.emptyLine2}
          </p>
        </>
      )}
      {uploadsFrozen ? (
        <p className="max-w-md rounded-lg bg-sand px-6 py-4 text-sm text-ink/70">
          {dict.gallery.uploadsFrozen}
        </p>
      ) : uploadsBlocked ? null : (
        <UploadButton
          variant={hasTiles ? "floating" : "inline"}
          labels={dict.upload}
          sheetLabels={dict.introSheet}
          locale={locale}
          needsProfile={needsProfile}
          limits={limits}
          limitsExempt={limitsExempt}
        />
      )}
      {!hasTiles && (
        <span className="max-w-[250px] text-meta leading-[1.6] text-ink/45">
          {dict.gallery.emptyFootnote}
        </span>
      )}
    </div>
  );
}
