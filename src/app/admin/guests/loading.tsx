import { getDict, getLocale } from "@/lib/locale";
import { AdminTopRow, adminChromeLabels } from "../admin-chrome";
import { SkeletonHeader, SkeletonRows, SkeletonTabs } from "../skeleton";

export default async function Loading() {
  const [locale, dict] = await Promise.all([getLocale(), getDict()]);

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col">
      <AdminTopRow locale={locale} labels={adminChromeLabels(dict)} />
      <SkeletonHeader />
      <SkeletonTabs />
      <SkeletonRows />
    </main>
  );
}
