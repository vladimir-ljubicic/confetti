"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { pluralize, type Locale } from "@/lib/i18n";
import type { Visibility } from "@/lib/uploader-profile";
import { BulkProgress } from "../bulk-progress";
import { LocaleToggle } from "../locale-toggle";
import { useBulkAction } from "../photo-controls";
import { hideBrokenImage, publicThumbSrc, thumbSrc } from "../photo-image";
import { revealTile } from "../reveal-tile";
import { SelectEntry, type SelectEntryLabels } from "../select-entry";
import {
  PhotoViewer,
  type ViewerLabels,
  type ViewerPhoto,
} from "../photo-viewer";
import { useAddressedEntry } from "../use-history-entry";
import { useLikes } from "../use-likes";

export type ProfileLabels = SelectEntryLabels & {
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
  exitSelect: string;
  selectAll: string;
  deselectAll: string;
  selectedOne: string;
  selectedFew: string;
  selectedMany: string;
  hide: string;
  makePublic: string;
  confirmDeleteOne: string;
  confirmDeleteFew: string;
  confirmDeleteMany: string;
  delete: string;
  hiding: string;
  makingPublic: string;
  deleting: string;
  bulkProgress: string;
  actionFailed: string;
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

const LONG_PRESS_MS = 450;

const LONG_PRESS_MOVE_TOLERANCE_PX = 8;

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
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());
  const visibilityAction = useBulkAction();
  const deleteAction = useBulkAction();
  const [pendingVisibility, setPendingVisibility] = useState<Visibility | null>(null);
  const busy = visibilityAction.busy || deleteAction.busy;
  const running = visibilityAction.busy
    ? {
        label: pendingVisibility === "public" ? labels.makingPublic : labels.hiding,
        done: visibilityAction.done,
        total: visibilityAction.total,
      }
    : deleteAction.busy
      ? { label: labels.deleting, done: deleteAction.done, total: deleteAction.total }
      : null;
  const failedAction = visibilityAction.failed
    ? visibilityAction
    : deleteAction.failed
      ? deleteAction
      : null;
  // Photos deleted or re-labelled here vanish/update immediately;
  // router.refresh() catches the server list up in the background.
  const [removedIds, setRemovedIds] = useState<ReadonlySet<string>>(new Set());
  const [visibilityOverrides, setVisibilityOverrides] = useState<
    ReadonlyMap<string, Visibility>
  >(new Map());

  const pressTimer = useRef<number | null>(null);
  const pressOrigin = useRef<{ x: number; y: number } | null>(null);
  const suppressClick = useRef(false);

  const all = photos
    .filter((photo) => !removedIds.has(photo.id))
    .map((photo) => ({
      ...photo,
      visibility: visibilityOverrides.get(photo.id) ?? photo.visibility,
    }));
  const publicCount = all.filter((photo) => photo.visibility === "public").length;
  const shown = filter === "all" ? all : all.filter((photo) => photo.visibility === filter);
  const selectedPhotos = all.filter((photo) => selectedIds.has(photo.id));
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

  function clearPress() {
    if (pressTimer.current !== null) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    pressOrigin.current = null;
  }

  function startPress(id: string, event: React.PointerEvent) {
    if (selectMode) return;
    clearPress();
    pressOrigin.current = { x: event.clientX, y: event.clientY };
    pressTimer.current = window.setTimeout(() => {
      suppressClick.current = true;
      setSelectMode(true);
      setSelectedIds(new Set([id]));
      clearPress();
    }, LONG_PRESS_MS);
  }

  function movePress(event: React.PointerEvent) {
    const origin = pressOrigin.current;
    if (!origin) return;
    const distance = Math.hypot(event.clientX - origin.x, event.clientY - origin.y);
    if (distance > LONG_PRESS_MOVE_TOLERANCE_PX) clearPress();
  }

  function onTileClick(id: string) {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    if (!selectMode) {
      setViewerStartId(id);
      return;
    }
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  }

  function enterSelect() {
    setSelectMode(true);
    setSelectedIds(new Set());
  }

  function exitSelect() {
    setSelectMode(false);
    setSelectedIds(new Set());
    visibilityAction.reset();
    deleteAction.reset();
  }

  function post(path: string, body: object) {
    return fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  async function setSelectedVisibility(visibility: Visibility) {
    const ids = selectedPhotos.map((photo) => photo.id);
    setPendingVisibility(visibility);
    const ok = await visibilityAction.run(() =>
      post("/api/my-photos/visibility", { ids, visibility }),
    );
    if (!ok) return;
    const next = new Map(visibilityOverrides);
    for (const id of ids) next.set(id, visibility);
    setVisibilityOverrides(next);
    exitSelect();
  }

  async function deleteSelected() {
    const ids = selectedPhotos.map((photo) => photo.id);
    const confirmed = window.confirm(
      pluralize(locale, ids.length, {
        one: labels.confirmDeleteOne,
        few: labels.confirmDeleteFew,
        many: labels.confirmDeleteMany,
      }),
    );
    if (!confirmed) return;
    const ok = await deleteAction.run(() => post("/api/my-photos/delete", { ids }));
    if (!ok) return;
    setRemovedIds(new Set([...removedIds, ...ids]));
    exitSelect();
  }

  function progressMade(action: { done: number; total: number | null }) {
    if (action.total === null) return null;
    return labels.bulkProgress
      .replace("{done}", String(action.done))
      .replace("{total}", String(action.total));
  }

  const allSelectedPrivate =
    selectedPhotos.length > 0 &&
    selectedPhotos.every((photo) => photo.visibility === "private");
  const allShownSelected =
    shown.length > 0 && shown.every((photo) => selectedIds.has(photo.id));

  function toggleSelectAll() {
    setSelectedIds(
      allShownSelected ? new Set() : new Set(shown.map((photo) => photo.id)),
    );
  }

  const filters: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: labels.filterAll, count: all.length },
    { key: "public", label: labels.filterPublic, count: publicCount },
    { key: "private", label: labels.filterPrivate, count: all.length - publicCount },
  ];

  return (
    <>
      {selectMode ? (
        <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-[rgba(176,141,60,0.28)] bg-gold-tint py-3 pr-3 pl-2">
          <button
            type="button"
            disabled={busy}
            onClick={exitSelect}
            className="flex min-h-11 items-center gap-[7px] rounded-pill px-3 text-sm text-ink transition active:bg-[rgba(176,141,60,0.18)] disabled:opacity-50"
          >
            <span className="text-base leading-none">✕</span>
            {labels.exitSelect}
          </button>
          <span className="flex min-h-11 items-center px-3 text-[13px] whitespace-nowrap text-ink/50 tabular-nums">
            {selectedPhotos.length} / {all.length}
          </span>
        </div>
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

          {!selectMode && (
            <SelectEntry onEnter={enterSelect} labels={labels} />
          )}

          <ul
            ref={listRef}
            aria-busy={busy}
            className={`grid grid-cols-3 gap-1.5 px-3.5 transition-opacity ${
              selectMode ? "pb-40" : "pb-8"
            } ${busy ? "opacity-45" : ""}`}
          >
            {shown.map((photo) => {
              const selected = selectMode && selectedIds.has(photo.id);
              return (
                <li key={photo.id} data-photo-id={photo.id} className="relative">
                  <button
                    type="button"
                    disabled={busy}
                    aria-pressed={selectMode ? selected : undefined}
                    onClick={() => onTileClick(photo.id)}
                    onPointerDown={(event) => startPress(photo.id, event)}
                    onPointerMove={movePress}
                    onPointerUp={clearPress}
                    onPointerCancel={clearPress}
                    onContextMenu={(event) => event.preventDefault()}
                    className="relative block aspect-square w-full touch-manipulation overflow-hidden rounded-tile bg-sand select-none [-webkit-touch-callout:none]"
                  >
                    <TileImage
                      src={
                        photo.visibility === "public"
                          ? publicThumbSrc(photo.id)
                          : thumbSrc(photo.id)
                      }
                      alt={labels.photoAlt}
                    />
                    {selected && <span className="absolute inset-0 bg-gold/30" />}
                    {photo.visibility === "private" && (
                      <span className="absolute bottom-1.5 left-1.5 rounded-pill bg-[rgba(27,24,21,0.7)] px-[7px] py-[3px] text-[10px] tracking-[0.06em] text-paper">
                        {labels.privateBadge}
                      </span>
                    )}
                    {selectMode &&
                      (selected ? (
                        <span className="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-gold text-[11px] text-card">
                          ✓
                        </span>
                      ) : (
                        <span className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full border-[1.5px] border-[rgba(255,253,248,0.85)]" />
                      ))}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {selectMode && (
        <div className="fixed inset-x-0 bottom-[18px] z-10 flex justify-center px-3.5">
          {running ? (
            <div className="flex w-full max-w-xl items-center rounded-[18px] border border-[rgba(43,38,32,0.09)] bg-card px-[18px] py-[15px] shadow-[0_16px_34px_-16px_rgba(43,38,32,0.45)]">
              <BulkProgress
                label={running.label}
                done={running.done}
                total={running.total}
                countLabel={labels.bulkProgress}
              />
            </div>
          ) : (
            <div className="flex w-full max-w-xl flex-col gap-2.5 rounded-[18px] border border-[rgba(43,38,32,0.09)] bg-card px-3 pt-2.5 pb-3 shadow-[0_16px_34px_-16px_rgba(43,38,32,0.45)]">
              <div className="flex items-center justify-between gap-2.5">
                <button
                  type="button"
                  aria-pressed={allShownSelected}
                  onClick={toggleSelectAll}
                  className="flex min-h-11 items-center gap-[9px] rounded-pill border border-gold/35 bg-gold-tint pr-[13px] pl-[11px] text-sm whitespace-nowrap text-ink transition active:bg-[#f1e6cc]"
                >
                  {allShownSelected ? (
                    <span
                      aria-hidden
                      className="flex h-5 w-5 items-center justify-center rounded-[5px] bg-gold text-[11px] text-card"
                    >
                      ✓
                    </span>
                  ) : (
                    <span
                      aria-hidden
                      className="h-5 w-5 rounded-[5px] border-[1.5px] border-gold bg-card"
                    />
                  )}
                  {allShownSelected
                    ? labels.deselectAll
                    : labels.selectAll.replace("{count}", String(shown.length))}
                </button>
                <span className="text-right text-sm whitespace-nowrap text-ink">
                  {pluralize(locale, selectedPhotos.length, {
                    one: labels.selectedOne,
                    few: labels.selectedFew,
                    many: labels.selectedMany,
                  })}
                </span>
              </div>
              {failedAction && (
                <p className="text-xs text-danger">
                  {progressMade(failedAction) && (
                    <span className="tabular-nums">{progressMade(failedAction)} · </span>
                  )}
                  {labels.actionFailed}
                </p>
              )}
              <div className="flex items-center gap-2 text-sm">
                <button
                  type="button"
                  disabled={selectedPhotos.length === 0}
                  onClick={() =>
                    void setSelectedVisibility(allSelectedPrivate ? "public" : "private")
                  }
                  className="flex min-h-11 flex-1 items-center justify-center rounded-pill border border-gold/40 text-gold-small transition active:bg-gold-tint disabled:opacity-60"
                >
                  {allSelectedPrivate ? labels.makePublic : labels.hide}
                </button>
                <button
                  type="button"
                  disabled={selectedPhotos.length === 0}
                  onClick={() => void deleteSelected()}
                  className="flex min-h-11 flex-1 items-center justify-center rounded-pill border border-danger/35 text-danger transition active:opacity-60 disabled:opacity-60"
                >
                  {labels.delete}
                </button>
              </div>
            </div>
          )}
        </div>
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
