export function SkeletonHeader() {
  return (
    <header aria-hidden className="flex flex-col gap-[3px] px-5 pt-4 pb-3.5">
      <span className="block h-[33px] w-48 rounded-pill bg-sand" />
      <span className="block h-[18px] w-36 rounded-pill bg-sand" />
    </header>
  );
}

export function SkeletonChips() {
  return (
    <div aria-hidden className="flex gap-2 px-4 pb-3.5">
      {["w-[72px]", "w-[104px]", "w-[88px]"].map((width, index) => (
        <span
          key={index}
          className={`h-[37px] shrink-0 rounded-pill bg-sand ${width}`}
        />
      ))}
    </div>
  );
}

export function SkeletonTiles({ count = 9 }: { count?: number }) {
  return (
    <ul aria-hidden className="grid grid-cols-3 gap-1.5 px-3.5 pb-8">
      {Array.from({ length: count }, (_, index) => (
        <li key={index} className="aspect-square rounded-tile bg-sand" />
      ))}
    </ul>
  );
}

export function SkeletonRows({
  count = 6,
  heightClass = "h-[57px]",
}: {
  count?: number;
  heightClass?: string;
}) {
  return (
    <ul aria-hidden className="flex flex-col gap-2 px-3.5 pb-8">
      {Array.from({ length: count }, (_, index) => (
        <li key={index} className={`rounded-card bg-sand ${heightClass}`} />
      ))}
    </ul>
  );
}
