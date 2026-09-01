"use client";

import { useRef, useState } from "react";
import { pluralize, type Locale } from "@/lib/i18n";
import type { SelectionEdits } from "@/lib/selection-view";
import type { Visibility } from "@/lib/uploader-profile";
import { BulkProgress } from "./bulk-progress";
import { useBulkAction } from "./photo-controls";
import type { SelectEntryLabels } from "./select-entry";

export type SelectModeLabels = SelectEntryLabels & {
  exitSelect: string;
  selectAll: string;
  deselectAll: string;
  selectedOne: string;
  selectedFew: string;
  selectedMany: string;
  hide: string;
  makePublic: string;
  delete: string;
  confirmDeleteOne: string;
  confirmDeleteFew: string;
  confirmDeleteMany: string;
  hiding: string;
  makingPublic: string;
  deleting: string;
  bulkProgress: string;
  actionFailed: string;
};

// Where the bulk actions post their selection.
export type SelectEndpoints = { visibility: string; delete: string };

type SelectablePhoto = { id: string; visibility: Visibility };

const LONG_PRESS_MS = 450;

const LONG_PRESS_MOVE_TOLERANCE_PX = 8;

export type SelectMode = ReturnType<typeof useSelectMode>;

export function useSelectMode({
  endpoints,
  locale,
  labels,
}: {
  endpoints: SelectEndpoints;
  locale: Locale;
  labels: SelectModeLabels;
}) {
  const [active, setActive] = useState(false);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());
  const visibilityAction = useBulkAction();
  const deleteAction = useBulkAction();
  const [pendingVisibility, setPendingVisibility] = useState<Visibility | null>(null);
  // Photos deleted or re-labelled here vanish/update immediately; the bulk
  // action's router.refresh() catches the server list up in the background.
  const [removed, setRemoved] = useState<ReadonlySet<string>>(new Set());
  const [overrides, setOverrides] = useState<ReadonlyMap<string, Visibility>>(new Map());

  const pressTimer = useRef<number | null>(null);
  const pressOrigin = useRef<{ x: number; y: number } | null>(null);
  const suppressClick = useRef(false);

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

  function enter(ids: Iterable<string> = []) {
    setActive(true);
    setSelectedIds(new Set(ids));
  }

  function exit() {
    setActive(false);
    setSelectedIds(new Set());
    visibilityAction.reset();
    deleteAction.reset();
  }

  function select(ids: Iterable<string>) {
    setSelectedIds(new Set(ids));
  }

  function clearPress() {
    if (pressTimer.current !== null) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    pressOrigin.current = null;
  }

  function startPress(id: string, event: React.PointerEvent) {
    if (active) return;
    clearPress();
    pressOrigin.current = { x: event.clientX, y: event.clientY };
    pressTimer.current = window.setTimeout(() => {
      suppressClick.current = true;
      enter([id]);
      clearPress();
    }, LONG_PRESS_MS);
  }

  function movePress(event: React.PointerEvent) {
    const origin = pressOrigin.current;
    if (!origin) return;
    const distance = Math.hypot(event.clientX - origin.x, event.clientY - origin.y);
    if (distance > LONG_PRESS_MOVE_TOLERANCE_PX) clearPress();
  }

  // Spread onto every tile: a long press enters select mode with that tile.
  function pressHandlers(id: string) {
    return {
      onPointerDown: (event: React.PointerEvent) => startPress(id, event),
      onPointerMove: movePress,
      onPointerUp: clearPress,
      onPointerCancel: clearPress,
      onContextMenu: (event: React.SyntheticEvent) => event.preventDefault(),
    };
  }

  // A tap toggles the tile while selecting, opens it otherwise; the tap that
  // ends a long press does neither.
  function tap(id: string, open: () => void) {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    if (!active) {
      open();
      return;
    }
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  }

  function post(path: string, body: object) {
    return fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  async function setVisibility(ids: string[], visibility: Visibility) {
    setPendingVisibility(visibility);
    const ok = await visibilityAction.run(() =>
      post(endpoints.visibility, { ids, visibility }),
    );
    if (!ok) return;
    const next = new Map(overrides);
    for (const id of ids) next.set(id, visibility);
    setOverrides(next);
    exit();
  }

  async function remove(ids: string[]) {
    const confirmed = window.confirm(
      pluralize(locale, ids.length, {
        one: labels.confirmDeleteOne,
        few: labels.confirmDeleteFew,
        many: labels.confirmDeleteMany,
      }),
    );
    if (!confirmed) return;
    const ok = await deleteAction.run(() => post(endpoints.delete, { ids }));
    if (!ok) return;
    setRemoved(new Set([...removed, ...ids]));
    exit();
  }

  const edits: SelectionEdits = { removed, overrides };

  function selectedAmong<T extends { id: string }>(photos: readonly T[]): T[] {
    return photos.filter((photo) => selectedIds.has(photo.id));
  }

  return {
    active,
    selectedIds,
    selectedAmong,
    busy,
    running,
    failedAction,
    edits,
    locale,
    labels,
    enter,
    exit,
    select,
    tap,
    pressHandlers,
    setVisibility,
    remove,
  };
}

// The tile's own classes while it can be long-pressed: no text selection, no
// callout, no context menu.
export const SELECTABLE_TILE_CLASS =
  "touch-manipulation select-none [-webkit-touch-callout:none]";

export function SelectMark({ selected }: { selected: boolean }) {
  if (selected) {
    return (
      <>
        <span className="absolute inset-0 bg-gold/30" />
        <span className="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-gold text-[11px] text-card">
          ✓
        </span>
      </>
    );
  }
  return (
    <span className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full border-[1.5px] border-[rgba(255,253,248,0.85)]" />
  );
}

// `total` is everything the grid stands for, whatever filter is on: the whole
// album on the admin gallery, one guest's photos on their page.
export function SelectTopRow({
  mode,
  selected,
  total,
}: {
  mode: SelectMode;
  selected: number;
  total: number;
}) {
  return (
    <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-[rgba(176,141,60,0.28)] bg-gold-tint py-3 pr-3 pl-2">
      <button
        type="button"
        disabled={mode.busy}
        onClick={mode.exit}
        className="flex min-h-11 items-center gap-[7px] rounded-pill px-3 text-sm text-ink transition active:bg-[rgba(176,141,60,0.18)] disabled:opacity-50"
      >
        <span className="text-base leading-none">✕</span>
        {mode.labels.exitSelect}
      </button>
      <span className="flex min-h-11 items-center px-3 text-[13px] whitespace-nowrap text-ink/50 tabular-nums">
        {selected} / {total}
      </span>
    </div>
  );
}

// The action bar pinned to the bottom while selecting. `photos` is everything
// the selection can hold; `shown` is what the active filter leaves on screen,
// which is what "select all" covers.
export function SelectBar({
  mode,
  photos,
  shown,
}: {
  mode: SelectMode;
  photos: readonly SelectablePhoto[];
  shown: readonly SelectablePhoto[];
}) {
  const { locale, labels } = mode;
  const selected = mode.selectedAmong(photos);
  const selectedIds = selected.map((photo) => photo.id);
  const allSelectedPrivate =
    selected.length > 0 && selected.every((photo) => photo.visibility === "private");
  const allShownSelected =
    shown.length > 0 && shown.every((photo) => mode.selectedIds.has(photo.id));

  function progressMade(action: { done: number; total: number | null }) {
    if (action.total === null) return null;
    return labels.bulkProgress
      .replace("{done}", String(action.done))
      .replace("{total}", String(action.total));
  }

  return (
    <div className="fixed inset-x-0 bottom-[18px] z-10 flex justify-center px-3.5">
      {mode.running ? (
        <div className="flex w-full max-w-xl items-center rounded-[18px] border border-[rgba(43,38,32,0.09)] bg-card px-[18px] py-[15px] shadow-[0_16px_34px_-16px_rgba(43,38,32,0.45)]">
          <BulkProgress
            label={mode.running.label}
            done={mode.running.done}
            total={mode.running.total}
            countLabel={labels.bulkProgress}
          />
        </div>
      ) : (
        <div className="flex w-full max-w-xl flex-col gap-2.5 rounded-[18px] border border-[rgba(43,38,32,0.09)] bg-card px-3 pt-2.5 pb-3 shadow-[0_16px_34px_-16px_rgba(43,38,32,0.45)]">
          <div className="flex items-center justify-between gap-2.5">
            <button
              type="button"
              aria-pressed={allShownSelected}
              onClick={() =>
                mode.select(allShownSelected ? [] : shown.map((photo) => photo.id))
              }
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
              {pluralize(locale, selected.length, {
                one: labels.selectedOne,
                few: labels.selectedFew,
                many: labels.selectedMany,
              })}
            </span>
          </div>
          {mode.failedAction && (
            <p className="text-xs text-danger">
              {progressMade(mode.failedAction) && (
                <span className="tabular-nums">{progressMade(mode.failedAction)} · </span>
              )}
              {labels.actionFailed}
            </p>
          )}
          <div className="flex items-center gap-2 text-sm">
            <button
              type="button"
              disabled={selected.length === 0}
              onClick={() =>
                void mode.setVisibility(
                  selectedIds,
                  allSelectedPrivate ? "public" : "private",
                )
              }
              className="flex min-h-11 flex-1 items-center justify-center rounded-pill border border-gold/40 text-gold-small transition active:bg-gold-tint disabled:opacity-60"
            >
              {allSelectedPrivate ? labels.makePublic : labels.hide}
            </button>
            <button
              type="button"
              disabled={selected.length === 0}
              onClick={() => void mode.remove(selectedIds)}
              className="flex min-h-11 flex-1 items-center justify-center rounded-pill border border-danger/35 text-danger transition active:opacity-60 disabled:opacity-60"
            >
              {labels.delete}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
