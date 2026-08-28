import Link from "next/link";
import { notFound } from "next/navigation";
import { isAdmin } from "@/lib/admin-session";
import { getDeviceId } from "@/lib/device";
import { getDict } from "@/lib/locale";
import { loadPublicPhotos } from "@/lib/public-photos";
import { resolveSortMode } from "@/lib/sort-mode";
import { getUploaderByPublicId } from "@/lib/uploaders";
import { LocaleCorner } from "../../locale-corner";
import { PhotoGrid } from "../../photo-grid";
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
  const dict = await getDict();
  const { publicId } = await params;
  const { sort: sortParam } = await searchParams;
  const sort = resolveSortMode(Array.isArray(sortParam) ? sortParam[0] : sortParam);

  const uploader = await getUploaderByPublicId(publicId);
  if (!uploader) notFound();

  const photos = await loadPublicPhotos({
    sort,
    uploaderId: uploader.uploaderId,
    viewerDeviceId: await getDeviceId(),
  });

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center gap-8 px-4 py-12">
      <LocaleCorner />
      <header className="flex flex-col items-center gap-3 text-center">
        <h1 className="font-serif text-4xl text-gold-small">{uploader.displayName}</h1>
        <Link href="/" className="text-sm text-ink/60 transition hover:text-ink active:text-ink">
          ← {dict.uploaderPage.backToGallery}
        </Link>
      </header>

      {photos.length > 0 && (
        <SortToggle
          sort={sort}
          basePath={`/uploader/${publicId}`}
          labels={{ latest: dict.gallery.sortLatest, popular: dict.gallery.sortPopular }}
        />
      )}

      <PhotoGrid
        photos={photos}
        downloadLabel={dict.gallery.download}
        emptyLabel={dict.uploaderPage.empty}
        likeLabels={{ like: dict.gallery.like, unlike: dict.gallery.unlike }}
        viewer={{ canManageAll: await isAdmin(), labels: viewerLabels(dict) }}
      />
    </main>
  );
}
