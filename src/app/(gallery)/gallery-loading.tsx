import { COUPLE_NAMES } from "@/lib/couple";
import { getDeviceId } from "@/lib/device";
import {
  DEFAULT_EVENT_DATE_ISO,
  DEFAULT_FREEZE_OFFSET_DAYS,
  formatEventDate,
} from "@/lib/event-schedule";
import { getEventSettings } from "@/lib/event-settings";
import { getDict, getLocale } from "@/lib/locale";
import { loadPublicLikeTotal } from "@/lib/public-photos";
import { sortToggleShown, type SortMode } from "@/lib/sort-mode";
import { getUploaderProfile } from "@/lib/uploaders";
import { ConfettiMark } from "../confetti-mark";
import { ConfettiWordmark } from "../confetti-wordmark";
import { GridSkeleton } from "../grid-skeleton";
import { LocaleToggle } from "../locale-toggle";
import { SortToggleView } from "../sort-toggle";
import { uploadWindowLine } from "../upload-window";

// The gallery's masthead as it will actually be, built from everything that
// does not need the photos — all of it cached, a single indexed row, or one
// aggregate over them.
// Standing in for the header rather than sketching it is the point: a
// placeholder of another size moves the page under the reader the moment the
// real header lands, and a toggle on the wrong side of the bar jumps across it.
// The grid's stand-in can only guess at its tiles' shapes, so it is clipped to
// the screen and nothing below it can move.
export async function GalleryLoading({ sort }: { sort: SortMode }) {
  const locale = await getLocale();
  const dict = await getDict();
  const [settings, profile, likeTotal] = await Promise.all([
    getEventSettings().catch(() => ({
      uploadsFrozen: false,
      eventDateIso: DEFAULT_EVENT_DATE_ISO,
      freezeOffsetDays: DEFAULT_FREEZE_OFFSET_DAYS,
    })),
    getDeviceId()
      .then((deviceId) => (deviceId ? getUploaderProfile(deviceId) : null))
      .catch(() => null),
    // The toggle is gated on this, so the stand-in bar has to know it too: a
    // toggle here that the loaded header then withholds is the jump this
    // whole component exists to avoid.
    loadPublicLikeTotal().catch(() => 0),
  ]);
  const windowLine = uploadWindowLine(dict, locale, settings, new Date());

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col">
      <div className="sticky top-0 z-[4] flex items-center justify-between bg-paper px-[18px] pt-3.5 pb-3">
        <ConfettiWordmark />
        <div className="flex items-center gap-2.5">
          <LocaleToggle locale={locale} labels={{ ariaLabel: dict.localeToggle.ariaLabel }} />
          {profile && (
            <span className="-m-1.5 block p-1.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-ink/15 bg-sand font-serif text-base text-gold-deep">
                {profile.displayName.trim().charAt(0).toLocaleUpperCase(locale)}
              </span>
            </span>
          )}
        </div>
      </div>

      <header className="flex flex-col items-center gap-[11px] px-7 pt-4 pb-[26px] text-center">
        <span className="text-[11px] text-gold-small uppercase tracking-[0.28em]">
          {dict.gallery.eyebrow}
        </span>
        <h1 className="font-serif text-masthead font-medium text-gold-small">
          {COUPLE_NAMES[locale].first}
          <br />
          <span className="text-[31px] text-gold italic">{COUPLE_NAMES[locale].and}</span>
          <br />
          {COUPLE_NAMES[locale].second}
        </h1>
        <div className="flex items-center gap-2.5">
          <span className="block h-px w-[34px] bg-ink/30" />
          <span className="text-meta tracking-[0.22em] text-ink-muted">
            {formatEventDate(settings.eventDateIso, " · ")}
          </span>
          <span className="block h-px w-[34px] bg-ink/30" />
        </div>
        {windowLine && (
          <p className="max-w-[250px] text-[12px] leading-[1.6] text-ink-muted">
            {windowLine}
          </p>
        )}
      </header>

      <div className="flex items-center gap-2.5 border-b border-ink/7 bg-paper/94 px-4 pt-[9px] pb-3">
        {/* Invisible, as in the loaded header before the masthead scrolls
            away; it still sets the bar's height. */}
        <div aria-hidden className="flex min-w-0 shrink-0 flex-col opacity-0">
          <span className="font-serif text-[19px] leading-[1.15] whitespace-nowrap text-gold-small">
            {COUPLE_NAMES[locale].oneLine}
          </span>
          <span className="text-[11px] tracking-[0.16em] text-ink-muted">&nbsp;</span>
        </div>
        {sortToggleShown(likeTotal) && (
          <div className="ml-auto">
            <SortToggleView
              labels={{ latest: dict.gallery.sortLatest, popular: dict.gallery.sortPopular }}
              active={sort}
            />
          </div>
        )}
      </div>

      {settings.uploadsFrozen && (
        <div className="mx-3.5 mt-3.5 flex items-start gap-[11px] rounded-card bg-sand px-4 py-3.5">
          <span className="mt-0.5 shrink-0">
            <ConfettiMark size={20} />
          </span>
          <div className="flex min-w-0 flex-col gap-[3px]">
            <span className="font-serif text-xl leading-[1.2] text-gold-small">
              {dict.gallery.frozenTitle}
            </span>
            <span className="text-body text-pretty text-ink/70">
              {dict.gallery.frozenBody}
            </span>
          </div>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col pt-3.5">
        <GridSkeleton />
      </div>
    </main>
  );
}
