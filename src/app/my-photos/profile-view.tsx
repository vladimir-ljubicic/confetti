"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { pluralize, type Locale } from "@/lib/i18n";
import { selectionView } from "@/lib/selection-view";
import type { Visibility } from "@/lib/uploader-profile";
import { LocaleToggle } from "../locale-toggle";
import { hideBrokenImage, publicThumbSrc, thumbSrc } from "../photo-image";
import { PrivateBadge } from "../private-badge";
import { revealTile } from "../reveal-tile";
import { SelectEntry } from "../select-entry";
import {
  SELECTABLE_TILE_CLASS,
  SelectBar,
  SelectMark,
  SelectTopRow,
  useSelectMode,
  type SelectModeLabels,
} from "../select-mode";
import {
  PhotoViewer,
  type ViewerLabels,
  type ViewerPhoto,
} from "../photo-viewer";
import { useAddressedEntry } from "../use-history-entry";
import { useLikes } from "../use-likes";

export type ProfileLabels = SelectModeLabels & {
  title: string;
  backToGallery: string;
  empty: string;
  uploadedOne: string;
  uploadedFew: string;
  uploadedMany: string;
  likesOne: string;
  likesFew: string;
  likesMany: string;
  defaultIntro: string;
  defaultPublic: string;
  defaultPrivate: string;
  visibilityPublic: string;
  visibilityPrivate: string;
  filterAll: string;
  filterPublic: string;
  filterPrivate: string;
  privateBadge: string;
  photoAlt: string;
  localeAriaLabel: string;
};

export type OwnPhoto = {
  id: string;
  uploadedAt: string;
  width: number | null;
  height: number | null;
  originalFilename: string;
  visibility: Visibility;
  likeCount: number;
  likedByViewer: boolean;
};

type Filter = "all" | Visibility;

function TileImage({ src, alt }: { src: string; alt: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      draggable={false}
      onError={hideBrokenImage}
      className="h-full w-full object-cover"
    />
  );
}

function DefaultVisibilityCard({
  value,
  labels,
}: {
  value: Visibility;
  labels: ProfileLabels;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Visibility>(value);
  const [failed, setFailed] = useState(false);

  async function change(visibility: Visibility) {
    if (visibility === selected) return;
    const previous = selected;
    setSelected(visibility);
    setFailed(false);
    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ defaultVisibility: visibility }),
    }).catch(() => null);
    if (!response?.ok) {
      setSelected(previous);
      setFailed(true);
      return;
    }
    router.refresh();
  }

  return (
    <section className="mx-3.5 mb-3.5 flex flex-col gap-1 rounded-card bg-sand px-4 py-[13px]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] leading-[1.4] text-ink/70">
          {labels.defaultIntro}
          <br />
          {selected === "public" ? labels.defaultPublic : labels.defaultPrivate}
        </p>
        <div className="flex shrink-0 items-center rounded-pill bg-card p-[3px] text-meta">
          {(
            [
              ["public", labels.visibilityPublic],
              ["private", labels.visibilityPrivate],
            ] as const
          ).map(([visibility, label]) => (
            <button
              key={visibility}
              type="button"
              aria-pressed={selected === visibility}
              onClick={() => void change(visibility)}
              className={`rounded-pill px-3 py-[9px] transition ${
                selected === visibility
                  ? "bg-gold-small text-card"
                  : "text-ink/60 hover:text-ink active:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {failed && <p className="text-xs text-danger">{labels.actionFailed}</p>}
    </section>
  );
}

export function ProfileView({
  photos,
  defaultVisibility,
  displayName,
  locale,
  labels,
  viewerLabels,
}: {
  photos: OwnPhoto[];
  defaultVisibility: Visibility | null;
  displayName: string | null;
  locale: Locale;
  labels: ProfileLabels;
  viewerLabels: ViewerLabels;
}) {
  const likes = useLikes();
  const [filter, setFilter] = useState<Filter>("all");
  const [viewerStartId, setViewerStartId] = useState<string | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const { id: addressedId, clear: clearAddressed } = useAddressedEntry(
    "photo",
    viewerStartId !== null,
  );
  const mode = useSelectMode({
    endpoints: { visibility: "/api/my-photos/visibility", delete: "/api/my-photos/delete" },
    locale,
    labels,
  });

  const all = selectionView(photos, mode.edits);
  const publicCount = all.filter((photo) => photo.visibility === "public").length;
  const shown = filter === "all" ? all : all.filter((photo) => photo.visibility === filter);
  const likeTotal = all.reduce((sum, photo) => sum + photo.likeCount, 0);

  // The viewer swipes through the currently filtered set, mirroring how the
  // main gallery swipes through its current sort order. The empty publicId
  // keeps the viewer's caption a plain name instead of an uploader pill —
  // guests never need to navigate to their own page from here.
  const viewerPhotos: ViewerPhoto[] = shown.map((photo) => ({
    id: photo.id,
    uploadedAt: photo.uploadedAt,
    width: photo.width,
    height: photo.height,
    originalFilename: photo.originalFilename,
    visibility: photo.visibility,
    likeCount: photo.likeCount,
    likedByViewer: photo.likedByViewer,
    ownedByViewer: true,
    uploader: displayName
      ? { displayName, publicId: "", photoCount: 0 }
      : null,
  }));

  // A /my-photos?photo=<id> address — a reload, or history stepped back onto
  // a photo the viewer was showing — reopens the viewer on it.
  const addressedShown =
    addressedId !== null && viewerPhotos.some((photo) => photo.id === addressedId);
  useEffect(() => {
    if (addressedId === null) return;
    clearAddressed();
    if (!addressedShown) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setViewerStartId(addressedId);
    revealTile(
      listRef.current?.querySelector(`[data-photo-id="${addressedId}"]`),
    );
  }, [addressedId, addressedShown, clearAddressed]);

  const filters: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: labels.filterAll, count: all.length },
    { key: "public", label: labels.filterPublic, count: publicCount },
    { key: "private", label: labels.filterPrivate, count: all.length - publicCount },
  ];

  return (
    <>
      {mode.active ? (
        <SelectTopRow mode={mode} selected={mode.selectedAmong(all).length} total={all.length} />
      ) : (
        <div className="sticky top-0 z-10 flex items-center justify-between bg-paper py-3 pr-3 pl-2">
          <Link
            href="/"
            className="flex min-h-11 items-center gap-[7px] rounded-pill px-3 text-sm text-ink/70 transition hover:text-ink active:text-ink"
          >
            <span aria-hidden>←</span>
            {labels.backToGallery}
          </Link>
          <LocaleToggle locale={locale} labels={{ ariaLabel: labels.localeAriaLabel }} />
        </div>
      )}

      <header className="flex flex-col gap-1 px-5 pt-4 pb-3.5">
        <h1 className="font-serif text-title font-medium text-gold-small">{labels.title}</h1>
        <p className="text-[13px] text-ink/60">
          {pluralize(locale, all.length, {
            one: labels.uploadedOne,
            few: labels.uploadedFew,
            many: labels.uploadedMany,
          })}
          {" · "}
          {pluralize(locale, likeTotal, {
            one: labels.likesOne,
            few: labels.likesFew,
            many: labels.likesMany,
          })}
        </p>
      </header>

      {defaultVisibility && (
        <DefaultVisibilityCard value={defaultVisibility} labels={labels} />
      )}

      {all.length === 0 ? (
        <p className="px-4 py-16 text-center text-ink/50">{labels.empty}</p>
      ) : (
        <>
          <div className="flex gap-2 overflow-x-auto px-4 pb-3.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {filters.map(({ key, label, count }) => (
              <button
                key={key}
                type="button"
                aria-pressed={filter === key}
                onClick={() => setFilter(key)}
                className={`shrink-0 rounded-pill px-3.5 py-[9px] text-[13px] whitespace-nowrap transition ${
                  filter === key
                    ? "bg-gold-small text-card"
                    : "border border-ink/18 text-ink/65 hover:text-ink active:text-ink"
                }`}
              >
                {label.replace("{count}", String(count))}
              </button>
            ))}
          </div>

          {!mode.active && <SelectEntry onEnter={() => mode.enter()} labels={labels} />}

          <ul
            ref={listRef}
            aria-busy={mode.busy}
            className={`grid grid-cols-3 gap-1.5 px-3.5 transition-opacity ${
              mode.active ? "pb-40" : "pb-8"
            } ${mode.busy ? "opacity-45" : ""}`}
          >
            {shown.map((photo) => {
              const selected = mode.active && mode.selectedIds.has(photo.id);
              return (
                <li key={photo.id} data-photo-id={photo.id} className="relative">
                  <button
                    type="button"
                    disabled={mode.busy}
                    aria-pressed={mode.active ? selected : undefined}
                    onClick={() => mode.tap(photo.id, () => setViewerStartId(photo.id))}
                    {...mode.pressHandlers(photo.id)}
                    className={`relative block aspect-square w-full overflow-hidden rounded-tile bg-sand ${SELECTABLE_TILE_CLASS}`}
                  >
                    <TileImage
                      src={
                        photo.visibility === "public"
                          ? publicThumbSrc(photo.id)
                          : thumbSrc(photo.id)
                      }
                      alt={labels.photoAlt}
                    />
                    {photo.visibility === "private" && (
                      <PrivateBadge label={labels.privateBadge} />
                    )}
                    {mode.active && <SelectMark selected={selected} />}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {mode.active && (
        <SelectBar mode={mode} photos={all} shown={shown} />
      )}

      {viewerStartId !== null && (
        <PhotoViewer
          photos={viewerPhotos}
          startId={viewerStartId}
          likes={likes}
          canManageAll={false}
          locale={locale}
          labels={viewerLabels}
          onCurrentChange={(photoId) =>
            revealTile(
              listRef.current?.querySelector(`[data-photo-id="${photoId}"]`),
            )
          }
          onClose={() => setViewerStartId(null)}
        />
      )}
    </>
  );
}
