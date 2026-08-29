import { getDict, getLocale } from "@/lib/locale";
import { LocaleToggle } from "../locale-toggle";

const SKELETON_TILES = 9;

export default async function Loading() {
  const dict = await getDict();
  const locale = await getLocale();

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col">
      <div className="sticky top-0 z-10 flex items-center justify-between bg-paper py-3 pr-3 pl-2">
        <span className="flex min-h-11 items-center gap-[7px] rounded-pill px-3 text-sm text-ink/70">
          <span aria-hidden>←</span>
          {dict.myPhotos.backToGallery}
        </span>
        <LocaleToggle
          locale={locale}
          labels={{ ariaLabel: dict.localeToggle.ariaLabel }}
        />
      </div>

      <header className="flex flex-col gap-1 px-5 pt-4 pb-3.5">
        <h1 className="font-serif text-title font-medium text-gold-small">
          {dict.myPhotos.title}
        </h1>
        <span className="block h-[18px] w-44 animate-pulse rounded-pill bg-sand" />
      </header>

      <ul aria-hidden className="grid grid-cols-3 gap-1.5 px-3.5 pb-8">
        {Array.from({ length: SKELETON_TILES }, (_, index) => (
          <li
            key={index}
            className="aspect-square animate-pulse rounded-tile bg-sand"
          />
        ))}
      </ul>
    </main>
  );
}
