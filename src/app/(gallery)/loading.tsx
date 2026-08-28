import { COUPLE_NAMES } from "@/lib/couple";
import { getDict, getLocale } from "@/lib/locale";
import { ConfettiMark } from "../confetti-mark";
import { LocaleToggle } from "../locale-toggle";

const SKELETON_COLUMNS = [
  ["aspect-3/4", "aspect-square", "aspect-4/5"],
  ["aspect-square", "aspect-4/5", "aspect-3/4"],
];

export default async function Loading() {
  const locale = await getLocale();
  const dict = await getDict();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col">
      <div className="sticky top-0 z-[4] flex items-center justify-between bg-paper px-[18px] pt-3.5 pb-3">
        <span className="flex items-center gap-1.5">
          <ConfettiMark size={14} variant="animated" />
          <span className="text-[11px] text-ink/45 uppercase tracking-[0.2em]">
            Confetti
          </span>
        </span>
        <div className="flex items-center gap-2.5">
          <LocaleToggle locale={locale} labels={{ ariaLabel: dict.localeToggle.ariaLabel }} />
          <span className="m-1.5 block h-8 w-8 animate-pulse rounded-full bg-sand" />
        </div>
      </div>

      <header className="flex flex-col items-center gap-[11px] px-7 pt-4 pb-[26px] text-center">
        <span className="text-[11px] text-gold uppercase tracking-[0.28em]">
          {dict.gallery.eyebrow}
        </span>
        <h1 className="font-serif text-masthead font-medium text-gold-small">
          {COUPLE_NAMES[locale].first}
          <br />
          <span className="text-[31px] text-gold italic">{COUPLE_NAMES[locale].and}</span>
          <br />
          {COUPLE_NAMES[locale].second}
        </h1>
        <div className="flex items-center gap-2.5 text-ink/30">
          <span className="block h-px w-[34px] bg-current" />
          <span className="block h-[15px] w-32 animate-pulse rounded-pill bg-sand" />
          <span className="block h-px w-[34px] bg-current" />
        </div>
      </header>

      <div className="flex items-center gap-2.5 border-b border-ink/7 bg-paper/94 px-4 pt-[9px] pb-3">
        {/* Invisible, as in the loaded header before the masthead scrolls
            away; it still sets the bar's height. */}
        <div aria-hidden className="flex min-w-0 shrink-0 flex-col opacity-0">
          <span className="font-serif text-[19px] leading-[1.15] whitespace-nowrap text-gold-small">
            {COUPLE_NAMES[locale].oneLine}
          </span>
          <span className="text-[11px] tracking-[0.16em] text-ink/68">&nbsp;</span>
        </div>
        <span className="ml-auto block h-[35px] w-[130px] shrink-0 animate-pulse rounded-pill bg-sand" />
      </div>

      <div
        aria-hidden
        className="grid w-full grid-cols-2 items-start gap-2 px-3 pt-3.5 pb-26"
      >
        {SKELETON_COLUMNS.map((column, columnIndex) => (
          <ul key={columnIndex} className="flex flex-col gap-2">
            {column.map((aspect, index) => (
              <li
                key={index}
                className={`${aspect} animate-pulse rounded-tile bg-sand`}
              />
            ))}
          </ul>
        ))}
      </div>
    </main>
  );
}
