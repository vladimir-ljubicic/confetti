import Link from "next/link";
import type { PublicPhoto } from "@/lib/public-photos";

export function PhotoGrid({
  photos,
  downloadLabel,
  emptyLabel,
  showUploader = false,
}: {
  photos: PublicPhoto[];
  downloadLabel: string;
  emptyLabel: string;
  showUploader?: boolean;
}) {
  if (photos.length === 0) {
    return <p className="py-16 text-ink/50">{emptyLabel}</p>;
  }
  return (
    <ul className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {photos.map((photo) => (
        <li key={photo.id} className="group relative overflow-hidden rounded-lg bg-sand">
          {photo.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo.imageUrl}
              alt=""
              loading="lazy"
              className="aspect-square w-full object-cover"
            />
          )}
          {showUploader && photo.uploader && (
            <Link
              href={`/uploader/${photo.uploader.publicId}`}
              className="absolute inset-x-0 bottom-0 truncate bg-linear-to-t from-ink/60 to-transparent px-2.5 pt-8 pb-2 text-left text-xs text-white hover:underline"
            >
              {photo.uploader.displayName}
            </Link>
          )}
          {photo.downloadUrl && (
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
  );
}
