import { getDict } from "@/lib/locale";

// Only the bar, whose height is fixed. The grid below it has no stand-in: a
// tile is as tall as its photo, which is not known until the photos are.
export default async function Loading() {
  const dict = await getDict();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col">
      <div className="sticky top-0 z-[4]">
        <div className="flex items-center justify-between bg-paper px-[18px] pt-3.5 pb-3">
          <span className="-m-1.5 flex items-center gap-[7px] p-1.5 text-[13px] text-ink/65">
            <span aria-hidden className="text-[15px]">
              ←
            </span>
            {dict.uploaderPage.backToGallery}
          </span>
        </div>

        <div className="flex items-center gap-2.5 border-b border-ink/7 bg-paper/94 px-4 pt-[9px] pb-3">
          <span className="h-[34px] w-[34px] shrink-0 animate-pulse rounded-full bg-sand" />
          <div className="flex min-w-0 flex-col gap-[5px]">
            <span className="block h-[19px] w-36 animate-pulse rounded-pill bg-sand" />
            <span className="block h-[11px] w-24 animate-pulse rounded-pill bg-sand" />
          </div>
        </div>
      </div>
    </main>
  );
}
