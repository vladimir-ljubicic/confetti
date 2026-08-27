import Link from "next/link";
import type { PublicPhoto } from "@/lib/public-photos";
import { LikePill } from "./like-pill";

export function PhotoGrid({
  photos,
  emptyLabel,
  downloadLabel,
  likeLabels,
  showUploader = false,
}: {
  photos: PublicPhoto[];
  emptyLabel: string;
  downloadLabel?: string;
  likeLabels?: { like: string; unlike: string };
  showUploader?: boolean;
}) {
  if (photos.length === 0) {
    return <p className="px-4 py-16 text-center text-ink/50">{emptyLabel}</p>;
  }
  const columns = [
    photos.filter((_, index) => index % 2 === 0),
    photos.filter((_, index) => index % 2 === 1),
  ];
  return (
    <div className="grid w-full grid-cols-2 items-start gap-2 px-3 pb-26">
      {columns.map((column, columnIndex) => (
        <ul key={columnIndex} className="flex flex-col gap-2">
          {column.map((photo) => (
            <li
              key={photo.id}
              className="group relative overflow-hidden rounded-tile bg-sand"
            >
              {photo.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photo.imageUrl}
                  alt=""
                  loading="lazy"
                  className="w-full"
                />
              ) : (
                <div className="aspect-3/4" />
              )}
              {showUploader && photo.uploader && (
                <Link
                  href={`/uploader/${photo.uploader.publicId}`}
                  className="absolute inset-x-0 bottom-0 truncate bg-linear-to-t from-ink/60 to-transparent px-2.5 pt-8 pb-2 text-left text-xs text-white hover:underline"
                >
                  {photo.uploader.displayName}
                </Link>
              )}
              {likeLabels && (
                <LikePill
                  photoId={photo.id}
                  initialLiked={photo.likedByViewer}
                  initialCount={photo.likeCount}
                  labels={likeLabels}
                />
              )}
              {downloadLabel && photo.downloadUrl && (
                <a
                  href={photo.downloadUrl}
                  className="absolute right-2 bottom-2 rounded-full bg-white/80 px-3 py-1 text-xs text-ink opacity-0 shadow-sm transition group-hover:opacity-100 focus:opacity-100"
                >
                  {downloadLabel}
                </a>
              )}
            </li>
          ))}
        </ul>
      ))}
    </div>
  );
}
