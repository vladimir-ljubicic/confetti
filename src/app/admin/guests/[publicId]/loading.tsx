import { getDict, getLocale } from "@/lib/locale";
import { AdminTopRow, adminChromeLabels } from "../../admin-chrome";
import { SkeletonChips, SkeletonTiles } from "../../skeleton";

export default async function Loading() {
  const [locale, dict] = await Promise.all([getLocale(), getDict()]);

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col">
      <AdminTopRow
        locale={locale}
        labels={adminChromeLabels(dict)}
        back={{ href: "/admin/guests", label: dict.admin.tabGuests }}
      />

      <div aria-hidden className="flex items-center gap-[13px] px-5 pt-[18px] pb-4">
        <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
          <span className="block h-[31px] w-44 animate-pulse rounded-pill bg-sand" />
          <span className="block h-[18px] w-32 animate-pulse rounded-pill bg-sand" />
        </div>
        <span className="block h-11 w-24 shrink-0 animate-pulse rounded-pill bg-sand" />
      </div>

      <SkeletonChips />
      <SkeletonTiles />
    </main>
  );
}
