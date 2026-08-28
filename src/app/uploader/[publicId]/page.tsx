import Link from "next/link";
import { notFound } from "next/navigation";
import { isAdmin } from "@/lib/admin-session";
import { getDeviceId } from "@/lib/device";
import { pluralize } from "@/lib/i18n";
import { getDict, getLocale } from "@/lib/locale";
import { loadPublicPhotos } from "@/lib/public-photos";
import { resolveSortMode } from "@/lib/sort-mode";
import { getUploaderByPublicId, getUploaderProfile } from "@/lib/uploaders";
import { LocaleToggle } from "../../locale-toggle";
import { PhotoGrid } from "../../photo-grid";
import { SortProvider } from "../../sort-context";
import { SortToggle } from "../../sort-toggle";
import { viewerLabels } from "../../viewer-labels";

export const dynamic = "force-dynamic";

export default async function UploaderPage({
  params,
  searchParams,
}: {
  params: Promise<{ publicId: string }>;
  searchParams: Promise<{ sort?: string | string[] }>;
}) {
  const locale = await getLocale();
  const dict = await getDict();
  const { publicId } = await params;
  const { sort: sortParam } = await searchParams;
  const sort = resolveSortMode(Array.isArray(sortParam) ? sortParam[0] : sortParam);

  const uploader = await getUploaderByPublicId(publicId);
  if (!uploader) notFound();

  const deviceId = await getDeviceId();
  const [page, viewerProfile, admin] = await Promise.all([
    loadPublicPhotos({
      sort,
      uploaderId: uploader.uploaderId,
      viewerDeviceId: deviceId,
    }),
    deviceId ? getUploaderProfile(deviceId) : null,
    isAdmin(),
  ]);
  const stats = page.uploaderStats ?? { photoCount: 0, likeTotal: 0 };

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col">
      <SortProvider initial={sort}>
      <div className="sticky top-0 z-[4]">
        <div className="flex items-center justify-between bg-paper px-[18px] pt-3.5 pb-3">
          <Link
            href="/"
            className="-m-1.5 flex items-center gap-[7px] p-1.5 text-[13px] text-ink/65 transition hover:text-ink active:text-ink"
          >
            <span aria-hidden className="text-[15px]">
              ←
            </span>
            {dict.uploaderPage.backToGallery}
          </Link>
          <div className="flex items-center gap-2.5">
            <LocaleToggle locale={locale} labels={{ ariaLabel: dict.localeToggle.ariaLabel }} />
            {viewerProfile && (
              <Link href="/my-photos" aria-label={dict.gallery.myPhotos} className="-m-1.5 p-1.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-ink/15 bg-sand font-serif text-base text-gold-deep">
                  {viewerProfile.displayName.trim().charAt(0).toLocaleUpperCase(locale)}
                </span>
              </Link>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5 border-b border-ink/7 bg-paper/94 px-4 pt-[9px] pb-3 backdrop-blur-[10px]">
          <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-sand font-serif text-base text-gold-deep">
            {uploader.displayName.trim().charAt(0).toLocaleUpperCase(locale)}
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-serif text-[19px] leading-[1.15] text-gold-small">
              {uploader.displayName}
            </span>
            <span className="text-[11px] tracking-[0.16em] whitespace-nowrap text-ink/68">
              {pluralize(locale, stats.photoCount, {
                one: dict.uploaderPage.photosOne,
                few: dict.uploaderPage.photosFew,
                many: dict.uploaderPage.photosMany,
              })}
              {" · "}
              {stats.likeTotal} ♥
            </span>
          </div>
          {stats.photoCount > 0 && (
            <div className="ml-auto">
              <SortToggle
                labels={{ latest: dict.gallery.sortLatest, popular: dict.gallery.sortPopular }}
              />
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col pt-3.5">
        <PhotoGrid
          photos={page.photos}
          feed={{
            endpoint: "/api/photos",
            search: `sort=${sort}&uploader=${publicId}`,
            nextCursor: page.nextCursor,
          }}
          emptyLabel={dict.uploaderPage.empty}
          likeLabels={{ like: dict.gallery.like, unlike: dict.gallery.unlike }}
          viewer={{
            canManageAll: admin,
            labels: viewerLabels(dict),
            locale,
            galleryCount: stats.photoCount,
          }}
          showUploader
        />
      </div>
      </SortProvider>
    </main>
  );
}
