import { getDict } from "@/lib/locale";

const SKELETON_COLUMNS = [
  ["aspect-3/4", "aspect-square", "aspect-4/5"],
  ["aspect-square", "aspect-4/5", "aspect-3/4"],
];

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
