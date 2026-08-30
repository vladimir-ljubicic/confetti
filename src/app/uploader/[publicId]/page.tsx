import { notFound } from "next/navigation";
import { resolveSortMode } from "@/lib/sort-mode";
import { getUploaderByPublicId } from "@/lib/uploaders";
import { GalleryScreen } from "../../gallery-screen";

export const dynamic = "force-dynamic";

export default async function UploaderPage({
  params,
  searchParams,
}: {
  params: Promise<{ publicId: string }>;
  searchParams: Promise<{ sort?: string | string[] }>;
}) {
  const { publicId } = await params;
  const { sort: sortParam } = await searchParams;
  const sort = resolveSortMode(Array.isArray(sortParam) ? sortParam[0] : sortParam);

  const uploader = await getUploaderByPublicId(publicId);
  if (!uploader) notFound();

  return (
    <GalleryScreen
      sort={sort}
      guest={{
        publicId,
        uploaderId: uploader.uploaderId,
        displayName: uploader.displayName,
      }}
    />
  );
}
