"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import * as tus from "tus-js-client";
import { hashBlobs, isContentHash } from "@/lib/content-hash";
import { extractTakenAt } from "@/lib/exif";
import { generateRenditions } from "@/lib/thumbnail";
import { UPLOADS_FROZEN_STATUS } from "@/lib/upload-freeze";
import {
  classifyUploadFailure,
  failureFromStatus,
  isRetryableFailure,
  precheckUpload,
  UploadFailedError,
  type UploadFailureReason,
} from "@/lib/upload-failure";
import {
  FILE_TOO_LARGE_STATUS,
  RATE_LIMITED_STATUS,
  type RateLimitReason,
} from "@/lib/upload-limits";
import {
  groupFailures,
  splitRetryTargets,
  type BatchFailure,
} from "@/lib/batch-failures";
import { partitionDuplicates } from "@/lib/upload-duplicates";
import { estimateRemainingMs, formatEta } from "@/lib/upload-eta";
import type { UploadTicket } from "@/lib/upload-ticket";
import { pluralize, type Locale } from "@/lib/i18n";
import {
  FailureSheet,
  type FailureSheetLabels,
  type RetryRun,
} from "./failure-sheet";
import { IntroSheet, type IntroSheetLabels } from "./intro-sheet";
import { useSort } from "./sort-context";
import { BatchSummary, BulkMiniBar } from "./upload-minibar";
import { useUploadQueue, type UploadTile } from "./upload-queue";

// Fixed by Supabase's resumable upload endpoint; other sizes are rejected.
const CHUNK_SIZE = 6 * 1024 * 1024;
const CONCURRENT_UPLOADS = 3;
// Larger batches use the bulk mini-bar; per-photo tiles would be noise.
const OPTIMISTIC_TILE_MAX = 10;
const CANCELLED_TILE_TTL_MS = 4000;
const BULK_REFRESH_EVERY = 10;
const BULK_TICK_MS = 1000;
// Too little data for a stable rate before this.
const BULK_ETA_WARMUP_MS = 3000;
const SUMMARY_TTL_MS = 6000;
// Long enough for a retried row to fade and collapse before it is unmounted.
const ROW_EXIT_MS = 220;
const TOAST_TTL_MS = 2400;
// Longer when failures remain, so the retry pill can still be reached.
const SUMMARY_FAILED_TTL_MS = 30000;

type UploadLabels = FailureSheetLabels & {
  add: string;
  failuresAllUploaded: string;
  uploading: string;
  frozen: string;
  batchLimit: string;
  rateLimited: string;
  retry: string;
  cancel: string;
  bulkProgress: string;
  bulkEtaMinutes: string;
  bulkEtaUnderMinute: string;
  bulkHint: string;
  bulkDoneOne: string;
  bulkDoneFew: string;
  bulkDoneMany: string;
  bulkFailedOne: string;
  bulkFailedFew: string;
  bulkFailedMany: string;
  bulkFailedSee: string;
  duplicatesSkippedOne: string;
  duplicatesSkippedFew: string;
  duplicatesSkippedMany: string;
};

type UploadLimitProps = {
  maxBatch: number;
  maxFileBytes: number;
};

type TileItem = { id: number; file: File; previewUrl: string };

type TileController = {
  cancelled: boolean;
  done: boolean;
  abortTus: (() => void) | null;
  removeTimer: number | null;
};

type BulkView =
  | {
      phase: "uploading";
      current: number;
      total: number;
      fraction: number;
      etaMs: number | null;
      previewUrl: string | null;
    }
  | { phase: "summary" };

// The file rides along so a retry does not have to ask for it again.
type BatchFailureEntry = BatchFailure & { file: File; tileId: number | null };

type BulkRun = {
  cancelled: boolean;
  aborts: Map<number, () => void>;
  uploadedBytes: Map<number, number>;
  inFlight: { id: number; url: string }[];
  notifyCancel: () => void;
};

// Hashed once at pick time and kept against the File itself, so a retry and a
// second batch of the same photo name their content without reading it again.
const contentHashes = new WeakMap<File, string>();

// Which of a batch's photos this device has already put in the gallery. The
// check is a courtesy: an unanswerable one lets every photo through rather
// than holding the batch up.
async function fetchUploadedHashes(
  hashes: string[],
): Promise<ReadonlySet<string>> {
  if (hashes.length === 0) return new Set();
  try {
    const response = await fetch("/api/uploads/duplicates", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ hashes }),
    });
    if (!response.ok) return new Set();
    const body = (await response.json()) as { duplicates?: unknown };
    const duplicates = Array.isArray(body.duplicates) ? body.duplicates : [];
    return new Set(duplicates.filter(isContentHash));
  } catch {
    return new Set();
  }
}

// The server refuses to sign uploads for devices without a saved profile;
// the client reacts by (re)opening the intro sheet.
class ProfileRequiredError extends Error {}

// The admin froze uploads; remaining files are dropped and a notice is shown.
class UploadsFrozenError extends Error {}

class UploadCancelledError extends Error {}

// The device is offline; the item goes back into the queue and waits for the
// connection to return.
class OfflineError extends Error {}

// The device hit an upload limit; remaining files are dropped and a notice
// names the limit that was hit.
class RateLimitedError extends Error {
  constructor(public reason: RateLimitReason) {
    super();
  }
}

type UploadControl = {
  isCancelled: () => boolean;
  onTusStart: (abort: () => void) => void;
};

type ThumbnailSize = { width: number; height: number };

function putRendition(uploadUrl: string, blob: Blob): Promise<Response> {
  return fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "content-type": "image/jpeg",
      // Content never changes at a rendition path — revocation removes the
      // object — so browsers may cache it indefinitely.
      "cache-control": "public, max-age=31536000, immutable",
    },
    body: blob,
  });
}

// Best-effort: failures are swallowed and the upload proceeds without
// renditions. Returns the size the gallery will render at, or null when there
// is no thumbnail to render.
async function uploadRenditions(
  file: File,
  ticket: Pick<UploadTicket, "thumbnailUploadUrl" | "viewerUploadUrl">,
): Promise<ThumbnailSize | null> {
  try {
    const renditions = await generateRenditions(file);
    if (!renditions) return null;
    // A lost viewer rendition only costs sharpness — the viewer keeps showing
    // the thumb — so it must not sink the thumbnail everything renders from.
    const viewerUpload = renditions.viewer
      ? putRendition(ticket.viewerUploadUrl, renditions.viewer).catch(() => null)
      : null;
    await putRendition(ticket.thumbnailUploadUrl, renditions.thumb.blob);
    await viewerUpload;
    const { width, height } = renditions.thumb;
    return { width, height };
  } catch (error) {
    console.error("Rendition upload failed", error);
    return null;
  }
}

async function uploadFile(
  file: File,
  batchSize: number,
  onProgress: (percent: number) => void,
  control?: UploadControl,
): Promise<string> {
  const takenAt = await extractTakenAt(file);
  if (control?.isCancelled()) throw new UploadCancelledError();
  const response = await fetch("/api/uploads", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type || "application/octet-stream",
      size: file.size,
      batchSize,
      takenAt,
      contentHash: contentHashes.get(file) ?? null,
    }),
  });
  if (response.status === 409) throw new ProfileRequiredError();
  if (response.status === UPLOADS_FROZEN_STATUS) throw new UploadsFrozenError();
  if (response.status === FILE_TOO_LARGE_STATUS) {
    throw new UploadFailedError("too-large");
  }
  if (response.status === RATE_LIMITED_STATUS) {
    const body = (await response.json().catch(() => null)) as {
      reason?: unknown;
    } | null;
    throw new RateLimitedError(body?.reason === "batch" ? "batch" : "window");
  }
  if (!response.ok) throw new UploadFailedError(failureFromStatus(response.status));
  const ticket = (await response.json()) as UploadTicket;
  const { photoId, path, token, storageUrl } = ticket;
  if (control?.isCancelled()) throw new UploadCancelledError();

  const renditionUpload = uploadRenditions(file, ticket);

  await new Promise<void>((resolve, reject) => {
    const upload = new tus.Upload(file, {
      endpoint: `${storageUrl}/storage/v1/upload/resumable/sign`,
      chunkSize: CHUNK_SIZE,
      uploadDataDuringCreation: false,
      headers: { "x-signature": token },
      metadata: {
        bucketName: "photos",
        objectName: path,
        contentType: file.type || "application/octet-stream",
        cacheControl: "3600",
      },
      onProgress: (sent, total) => onProgress(Math.round((sent / total) * 100)),
      onError: reject,
      onSuccess: () => resolve(),
    });
    // tus abort() stops silently, so cancellation must reject here itself or
    // the awaiting worker would hang forever.
    control?.onTusStart(() => {
      void upload.abort();
      reject(new UploadCancelledError());
    });
    upload.start();
  });

  const thumbnailSize = await renditionUpload;
  const complete = await fetch(`/api/uploads/${photoId}/complete`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ thumbnail: thumbnailSize }),
  });
  if (!complete.ok) throw new UploadFailedError(failureFromStatus(complete.status));
  return photoId;
}

// Uploads run three at a time, drawing from a queue a worker may push back to
// when its item has to wait for the connection.
async function runUploadPool<T>(
  pending: T[],
  upload: (item: T) => Promise<void>,
): Promise<void> {
  await Promise.all(
    Array.from(
      { length: Math.min(CONCURRENT_UPLOADS, pending.length) },
      async () => {
        for (let item = pending.shift(); item; item = pending.shift()) {
          await upload(item);
        }
      },
    ),
  );
}

export function UploadButton({
  labels,
  sheetLabels,
  locale,
  needsProfile,
  limits,
  limitsExempt,
  variant = "floating",
}: {
  labels: UploadLabels;
  sheetLabels: IntroSheetLabels;
  locale: Locale;
  needsProfile: boolean;
  limits: UploadLimitProps;
  // Admin devices: the server skips limit checks, so the client must too.
  limitsExempt: boolean;
  variant?: "floating" | "inline";
}) {
  const router = useRouter();
  const queue = useUploadQueue();
  const sortContext = useSort();
  const inputRef = useRef<HTMLInputElement>(null);
  const [hasProfile, setHasProfile] = useState(!needsProfile);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [batchActive, setBatchActive] = useState(false);
  const [batchTileIds, setBatchTileIds] = useState<Set<number>>(new Set());
  const [bulkView, setBulkView] = useState<BulkView | null>(null);
  const [frozenNotice, setFrozenNotice] = useState(false);
  const [duplicateNotice, setDuplicateNotice] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [limitNotice, setLimitNotice] = useState<string | null>(null);
  const [failures, setFailures] = useState<BatchFailureEntry[]>([]);
  const [failureSheetOpen, setFailureSheetOpen] = useState(false);
  const [batchUploaded, setBatchUploaded] = useState(0);
  const [sendingIds, setSendingIds] = useState<ReadonlySet<number>>(new Set());
  const [leavingIds, setLeavingIds] = useState<ReadonlySet<number>>(new Set());
  const [retryRun, setRetryRun] = useState<RetryRun | null>(null);
  const [allUploaded, setAllUploaded] = useState(false);
  const tileIdRef = useRef(0);
  const controllers = useRef(new Map<number, TileController>());
  const bulkRunRef = useRef<BulkRun | null>(null);
  const failuresRef = useRef<BatchFailureEntry[]>([]);
  const failureIdRef = useRef(0);
  const sendingRef = useRef(new Set<number>());
  const leavingRef = useRef(new Set<number>());
  const retryRunRef = useRef<{ cancelled: boolean } | null>(null);
  const summaryTimerRef = useRef<number | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const batchLimitMessage = labels.batchLimit.replace(
    "{max}",
    String(limits.maxBatch),
  );

  function waitForOnline(): Promise<void> {
    if (queue) return queue.waitForOnline();
    if (navigator.onLine) return Promise.resolve();
    return new Promise((resolve) =>
      window.addEventListener("online", () => resolve(), { once: true }),
    );
  }

  function precheck(file: File): UploadFailureReason | null {
    return precheckUpload(
      { sizeBytes: file.size, contentType: file.type, filename: file.name },
      limitsExempt ? null : limits.maxFileBytes,
    );
  }

  function recordFailure(
    file: File,
    reason: UploadFailureReason,
    uploadedBytes: number,
    tile: TileItem | null = null,
  ) {
    failuresRef.current.push({
      id: failureIdRef.current++,
      file,
      // A tile owns its preview already; a bulk failure has none of its own.
      previewUrl: tile ? tile.previewUrl : URL.createObjectURL(file),
      tileId: tile?.id ?? null,
      reason,
      sizeBytes: file.size,
      uploadedBytes,
      attempts: 1,
    });
    setFailures([...failuresRef.current]);
  }

  function tileFailures(tileId: number): BatchFailureEntry[] {
    return failuresRef.current.filter((entry) => entry.tileId === tileId);
  }

  function dropFailures(entries: BatchFailureEntry[]) {
    if (entries.length === 0) return;
    const ids = new Set(entries.map((entry) => entry.id));
    for (const entry of entries) {
      if (entry.tileId === null) URL.revokeObjectURL(entry.previewUrl);
    }
    failuresRef.current = failuresRef.current.filter(
      (entry) => !ids.has(entry.id),
    );
    setFailures([...failuresRef.current]);
    if (failuresRef.current.length === 0) setFailureSheetOpen(false);
  }

  // Leaving a photo out takes its tile with it.
  function skipFailures(entries: BatchFailureEntry[]) {
    dropFailures(entries);
    for (const entry of entries) {
      if (entry.tileId !== null) dropTile(entry.tileId);
    }
  }

  function clearFailures() {
    dropFailures(failuresRef.current);
  }

  // The summary card's way back up: the batch resumes where it ran, so the
  // tiles and the mini-bar report the attempt in the card's place.
  function retryFailures(entries: BatchFailureEntry[]) {
    clearSummaryTimer();
    setBulkView(null);
    if (entries.length === 0) {
      setFailureSheetOpen(false);
      return;
    }
    const { tiles, files } = splitRetryTargets(entries);
    dropFailures(entries);
    if (tiles.length > 0) {
      void retryTiles(
        tiles.map((entry) => ({
          id: entry.tileId,
          file: entry.file,
          previewUrl: entry.previewUrl,
        })),
      );
    }
    if (files.length > 0) void startBatch(files.map((entry) => entry.file));
  }

  function markSending(id: number, sending: boolean) {
    if (sending) sendingRef.current.add(id);
    else sendingRef.current.delete(id);
    setSendingIds(new Set(sendingRef.current));
  }

  function retireFailure(entry: BatchFailureEntry) {
    leavingRef.current.add(entry.id);
    setLeavingIds(new Set(leavingRef.current));
    window.setTimeout(() => {
      leavingRef.current.delete(entry.id);
      setLeavingIds(new Set(leavingRef.current));
      dropFailures([entry]);
      // Nothing left to answer for, so the card that offered the retry goes too.
      if (failuresRef.current.length === 0) {
        clearSummaryTimer();
        setBulkView(null);
      }
    }, ROW_EXIT_MS);
  }

  // A re-failure lands on the entry that was already there, so the row keeps
  // its place in the list and its count of attempts.
  function markFailure(
    id: number,
    reason: UploadFailureReason,
    uploadedBytes: number,
  ) {
    failuresRef.current = failuresRef.current.map((entry) =>
      entry.id === id
        ? { ...entry, reason, uploadedBytes, attempts: entry.attempts + 1 }
        : entry,
    );
    setFailures([...failuresRef.current]);
  }

  // Sends one listed failure back up from inside the sheet, without routing it
  // through a tile batch or a fresh bulk run.
  async function sendFailure(entry: BatchFailureEntry): Promise<boolean> {
    const controller =
      entry.tileId === null
        ? null
        : (controllers.current.get(entry.tileId) ?? null);
    const patchTile = (patch: Partial<UploadTile>) => {
      if (entry.tileId !== null) queue?.patchTile(entry.tileId, patch);
    };
    if (controller) controller.cancelled = false;
    markSending(entry.id, true);
    patchTile({ status: "uploading", percent: 0, reason: null });
    let uploadedBytes = 0;
    try {
      const photoId = await uploadFile(
        entry.file,
        1,
        (percent) => {
          uploadedBytes = (percent / 100) * entry.file.size;
          patchTile({ percent });
        },
        controller
          ? {
              isCancelled: () => controller.cancelled,
              onTusStart: (abort) => {
                controller.abortTus = abort;
              },
            }
          : undefined,
      );
      if (controller) {
        controller.abortTus = null;
        controller.done = true;
      }
      patchTile({ status: "done", percent: 100, photoId, reason: null });
      setBatchUploaded((count) => count + 1);
      retireFailure(entry);
      router.refresh();
      return true;
    } catch (error) {
      if (
        error instanceof ProfileRequiredError ||
        error instanceof UploadsFrozenError ||
        error instanceof RateLimitedError
      ) {
        throw error;
      }
      console.error("Upload failed", error);
      const reason = classifyUploadFailure(error);
      patchTile({ status: "failed", reason });
      markFailure(entry.id, reason, uploadedBytes);
      return false;
    } finally {
      markSending(entry.id, false);
    }
  }

  async function retryFailure(entry: BatchFailureEntry): Promise<boolean> {
    if (sendingRef.current.has(entry.id) || leavingRef.current.has(entry.id)) {
      return false;
    }
    try {
      return await sendFailure(entry);
    } catch (error) {
      cancelRetryRun();
      // The photo goes back with the intro sheet, so it must not stay listed.
      if (error instanceof ProfileRequiredError) skipFailures([entry]);
      reportUploadAbort(error, [entry.file]);
      return false;
    }
  }

  function cancelRetryRun() {
    const run = retryRunRef.current;
    if (run) run.cancelled = true;
  }

  // Пробај поново: the same attempt across the retryable group, a few at a
  // time. Cancelling stops the ones not yet started and leaves them listed.
  async function retryAllFailures() {
    const idle = failuresRef.current.filter(
      (entry) =>
        !sendingRef.current.has(entry.id) && !leavingRef.current.has(entry.id),
    );
    const targets = groupFailures(idle).retryable;
    if (targets.length === 0 || retryRunRef.current) return;
    const run = { cancelled: false };
    retryRunRef.current = run;
    setRetryRun({ done: 0, total: targets.length });
    let done = 0;
    await runUploadPool([...targets], async (entry) => {
      if (run.cancelled) return;
      await retryFailure(entry);
      done += 1;
      setRetryRun((view) => (view ? { ...view, done } : view));
    });
    retryRunRef.current = null;
    setRetryRun(null);
    const staying = failuresRef.current.filter(
      (entry) => !leavingRef.current.has(entry.id),
    );
    if (staying.length === 0) showAllUploadedToast();
  }

  function showAllUploadedToast() {
    setAllUploaded(true);
    window.setTimeout(() => setAllUploaded(false), TOAST_TTL_MS);
  }

  function discardFailures() {
    clearSummaryTimer();
    skipFailures(failuresRef.current);
    setBulkView(null);
  }

  function armSummaryTimer() {
    clearSummaryTimer();
    summaryTimerRef.current = window.setTimeout(
      () => setBulkView(null),
      failuresRef.current.length > 0 ? SUMMARY_FAILED_TTL_MS : SUMMARY_TTL_MS,
    );
  }

  function showSummary(uploaded: number) {
    // A batch the guest cancelled outright landed nothing and failed nothing,
    // so it has nothing to close.
    if (uploaded === 0 && failuresRef.current.length === 0) return;
    setBulkView({ phase: "summary" });
    armSummaryTimer();
  }

  function closeFailureSheet() {
    setFailureSheetOpen(false);
    if (bulkView?.phase === "summary") armSummaryTimer();
  }

  function askForProfile(files: File[]) {
    setHasProfile(false);
    setPendingFiles(files);
    setDialogOpen(true);
  }

  function dropTile(id: number) {
    const controller = controllers.current.get(id);
    if (controller?.removeTimer) window.clearTimeout(controller.removeTimer);
    controllers.current.delete(id);
    queue?.removeTiles([id]);
    const stale = tileFailures(id);
    if (stale.length > 0) dropFailures(stale);
  }

  function cancelTile(id: number) {
    const controller = controllers.current.get(id);
    if (!controller || controller.done || controller.cancelled) return;
    controller.cancelled = true;
    controller.abortTus?.();
    controller.abortTus = null;
    queue?.patchTile(id, { status: "cancelled" });
    controller.removeTimer = window.setTimeout(() => dropTile(id), CANCELLED_TILE_TTL_MS);
  }

  async function uploadTile(item: TileItem, batchSize: number): Promise<void> {
    const controller = controllers.current.get(item.id);
    if (!controller || controller.cancelled || controller.done) return;
    dropFailures(tileFailures(item.id));
    const rejection = precheck(item.file);
    if (rejection) {
      queue?.patchTile(item.id, { status: "failed", reason: rejection });
      recordFailure(item.file, rejection, 0, item);
      return;
    }
    queue?.patchTile(item.id, { status: "uploading", percent: 0 });
    let uploadedBytes = 0;
    try {
      const photoId = await uploadFile(
        item.file,
        batchSize,
        (percent) => {
          uploadedBytes = (percent / 100) * item.file.size;
          queue?.patchTile(item.id, { percent });
        },
        {
          isCancelled: () => controller.cancelled,
          onTusStart: (abort) => {
            controller.abortTus = abort;
          },
        },
      );
      // A cancel that raced a finished upload is moot: the photo exists.
      if (controller.removeTimer) window.clearTimeout(controller.removeTimer);
      controller.removeTimer = null;
      controller.cancelled = false;
      controller.done = true;
      queue?.patchTile(item.id, {
        status: "done",
        percent: 100,
        photoId,
        reason: null,
      });
    } catch (error) {
      if (error instanceof UploadCancelledError || controller.cancelled) return;
      if (
        error instanceof ProfileRequiredError ||
        error instanceof UploadsFrozenError ||
        error instanceof RateLimitedError
      ) {
        throw error;
      }
      const reason = classifyUploadFailure(error);
      // Only a failure a retry could fix is worth waiting out the outage for.
      if (isRetryableFailure(reason) && !navigator.onLine) {
        queue?.patchTile(item.id, { status: "queued", percent: 0 });
        throw new OfflineError();
      }
      console.error("Upload failed", error);
      queue?.patchTile(item.id, { status: "failed", reason });
      recordFailure(item.file, reason, uploadedBytes, item);
    }
  }

  async function retryTile(item: TileItem) {
    const controller = controllers.current.get(item.id);
    if (!controller || controller.done) return;
    controller.cancelled = false;
    queue?.patchTile(item.id, { reason: null });
    try {
      await uploadTile(item, 1);
      if (controllers.current.get(item.id)?.done) {
        setBatchUploaded((count) => count + 1);
      }
      router.refresh();
    } catch (error) {
      if (error instanceof OfflineError) {
        await waitForOnline();
        return retryTile(item);
      }
      dropTile(item.id);
      reportUploadAbort(error, [item.file]);
    }
  }

  // The three ways an attempt ends without being the photo's own fault; any
  // other error is the photo's, and the caller has already listed it.
  function reportUploadAbort(error: unknown, files: File[]) {
    if (error instanceof ProfileRequiredError) {
      askForProfile(files);
    } else if (error instanceof UploadsFrozenError) {
      setFrozenNotice(true);
      router.refresh();
    } else if (error instanceof RateLimitedError) {
      setLimitNotice(
        error.reason === "batch" ? batchLimitMessage : labels.rateLimited,
      );
    }
  }

  function retryTiles(items: TileItem[]) {
    return runUploadPool([...items], (item) => retryTile(item));
  }

  function restoreTile(item: TileItem) {
    const controller = controllers.current.get(item.id);
    if (!controller || controller.done) return;
    if (controller.removeTimer) window.clearTimeout(controller.removeTimer);
    controller.removeTimer = null;
    controller.cancelled = false;
    queue?.patchTile(item.id, { status: "queued", percent: 0, reason: null });
    void retryTile(item);
  }

  async function startTileBatch(files: File[]) {
    if (!queue) return;
    const tileItems: TileItem[] = files.map((file) => ({
      id: tileIdRef.current++,
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    for (const item of tileItems) {
      controllers.current.set(item.id, {
        cancelled: false,
        done: false,
        abortTus: null,
        removeTimer: null,
      });
    }
    const tiles = tileItems.map((item) => ({
      id: item.id,
      previewUrl: item.previewUrl,
      width: null,
      height: null,
      status: "queued" as const,
      reason: null,
      percent: 0,
      photoId: null,
      cancel: () => cancelTile(item.id),
      retry: () => void retryTile(item),
      restore: () => restoreTile(item),
      skip: () => dropTile(item.id),
    }));
    queue.addTiles(tiles);
    for (const tile of tiles) {
      const image = new Image();
      image.onload = () =>
        queue.patchTile(tile.id, {
          width: image.naturalWidth,
          height: image.naturalHeight,
        });
      image.src = tile.previewUrl;
    }
    setBatchTileIds(new Set(tileItems.map((item) => item.id)));
    setBatchActive(true);
    clearSummaryTimer();
    setBulkView(null);
    setFrozenNotice(false);
    setLimitNotice(null);

    const pending = [...tileItems];
    const retryFiles: File[] = [];
    let abort: "profile" | "frozen" | "limit" | null = null;
    let limitMessage = labels.rateLimited;
    let uploaded = 0;
    await runUploadPool(pending, async (item) => {
      if (abort) {
        if (abort === "profile") retryFiles.push(item.file);
        dropTile(item.id);
        return;
      }
      try {
        await uploadTile(item, files.length);
        if (controllers.current.get(item.id)?.done) uploaded += 1;
      } catch (error) {
        if (error instanceof OfflineError) {
          pending.push(item);
          await waitForOnline();
          return;
        }
        dropTile(item.id);
        if (error instanceof ProfileRequiredError) {
          abort = "profile";
          retryFiles.push(item.file);
        } else if (error instanceof UploadsFrozenError) {
          abort = "frozen";
        } else if (error instanceof RateLimitedError) {
          abort = "limit";
          limitMessage =
            error.reason === "batch" ? batchLimitMessage : labels.rateLimited;
        }
      }
    });

    setBatchActive(false);
    setBatchUploaded((count) => count + uploaded);
    if (abort === "profile") {
      askForProfile(retryFiles);
      return;
    }
    router.refresh();
    if (abort === "frozen") {
      setFrozenNotice(true);
      return;
    }
    if (abort === "limit") {
      setLimitNotice(limitMessage);
      return;
    }
    showSummary(uploaded);
  }

  async function acquireWakeLock() {
    if (!("wakeLock" in navigator)) return;
    try {
      wakeLockRef.current = await navigator.wakeLock.request("screen");
    } catch {
      wakeLockRef.current = null;
    }
  }

  async function releaseWakeLock() {
    const sentinel = wakeLockRef.current;
    wakeLockRef.current = null;
    if (sentinel) await sentinel.release().catch(() => {});
  }

  function cancelBulk() {
    const run = bulkRunRef.current;
    if (!run) return;
    run.cancelled = true;
    for (const abortTus of run.aborts.values()) abortTus();
    run.aborts.clear();
    run.notifyCancel();
  }

  function clearSummaryTimer() {
    if (summaryTimerRef.current) {
      window.clearTimeout(summaryTimerRef.current);
      summaryTimerRef.current = null;
    }
  }

  async function startBulkBatch(files: File[]) {
    clearSummaryTimer();
    let notifyCancel: () => void = () => {};
    // Workers waiting out an offline stretch must also wake on cancel, or the
    // batch could never finish.
    const cancelSignal = new Promise<void>((resolve) => {
      notifyCancel = resolve;
    });
    const run: BulkRun = {
      cancelled: false,
      aborts: new Map(),
      uploadedBytes: new Map(),
      inFlight: [],
      notifyCancel,
    };
    bulkRunRef.current = run;
    setBatchActive(true);
    setFrozenNotice(false);
    setLimitNotice(null);

    const total = files.length;
    const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
    const startedAt = Date.now();
    let done = 0;
    let sinceRefresh = 0;

    setBulkView({
      phase: "uploading",
      current: 1,
      total,
      fraction: 0,
      etaMs: null,
      previewUrl: null,
    });

    const patchUploading = (patch: Partial<Extract<BulkView, { phase: "uploading" }>>) =>
      setBulkView((view) =>
        view && view.phase === "uploading" ? { ...view, ...patch } : view,
      );

    const sumUploadedBytes = () => {
      let sum = 0;
      for (const bytes of run.uploadedBytes.values()) sum += bytes;
      return sum;
    };

    const syncPreview = () =>
      patchUploading({ previewUrl: run.inFlight[0]?.url ?? null });

    const ticker = window.setInterval(() => {
      if (run.cancelled) return;
      const bytes = sumUploadedBytes();
      const elapsed = Date.now() - startedAt;
      patchUploading({
        fraction: totalBytes > 0 ? bytes / totalBytes : 0,
        etaMs:
          elapsed >= BULK_ETA_WARMUP_MS
            ? estimateRemainingMs(bytes, totalBytes, elapsed)
            : null,
      });
    }, BULK_TICK_MS);

    // Mobile browsers kill uploads when the tab backgrounds; tus resumption
    // only helps if the guest returns. The lock is auto-released on tab
    // switch, hence the re-acquire on visibilitychange.
    void acquireWakeLock();
    const reacquireWakeLock = () => {
      if (document.visibilityState === "visible" && bulkRunRef.current === run) {
        void acquireWakeLock();
      }
    };
    document.addEventListener("visibilitychange", reacquireWakeLock);

    const pending = files.map((file, index) => ({ id: index, file }));
    const retryFiles: File[] = [];
    let abort: "profile" | "frozen" | "limit" | null = null;
    let limitMessage = labels.rateLimited;
    let offlineWaiting = 0;
    const syncWaiting = () =>
      queue?.setBulkWaiting(pending.length + offlineWaiting);
    try {
      await runUploadPool(pending, async (item) => {
        if (run.cancelled) return;
        if (abort) {
          if (abort === "profile") retryFiles.push(item.file);
          return;
        }
        const rejection = precheck(item.file);
        if (rejection) {
          recordFailure(item.file, rejection, 0);
          return;
        }
        let requeue = false;
        run.inFlight.push({ id: item.id, url: URL.createObjectURL(item.file) });
        syncPreview();
        try {
          await uploadFile(
            item.file,
            total,
            (percent) =>
              run.uploadedBytes.set(item.id, (percent / 100) * item.file.size),
            {
              isCancelled: () => run.cancelled,
              onTusStart: (abortTus) => run.aborts.set(item.id, abortTus),
            },
          );
          run.uploadedBytes.set(item.id, item.file.size);
          done += 1;
          sinceRefresh += 1;
          patchUploading({ current: Math.min(done + 1, total) });
          if (sinceRefresh >= BULK_REFRESH_EVERY) {
            sinceRefresh = 0;
            router.refresh();
          }
        } catch (error) {
          const uploadedBytes = run.uploadedBytes.get(item.id) ?? 0;
          run.uploadedBytes.delete(item.id);
          if (error instanceof UploadCancelledError || run.cancelled) {
            // Cancelled files are neither done nor failed.
          } else if (error instanceof ProfileRequiredError) {
            abort = "profile";
            retryFiles.push(item.file);
          } else if (error instanceof UploadsFrozenError) {
            abort = "frozen";
          } else if (error instanceof RateLimitedError) {
            abort = "limit";
            limitMessage =
              error.reason === "batch" ? batchLimitMessage : labels.rateLimited;
          } else {
            const reason = classifyUploadFailure(error);
            if (!isRetryableFailure(reason)) {
              recordFailure(item.file, reason, 0);
            } else if (!navigator.onLine) {
              requeue = true;
            } else {
              console.error("Upload failed", error);
              recordFailure(item.file, reason, uploadedBytes);
            }
          }
        } finally {
          run.aborts.delete(item.id);
          const index = run.inFlight.findIndex((entry) => entry.id === item.id);
          if (index >= 0) {
            URL.revokeObjectURL(run.inFlight[index].url);
            run.inFlight.splice(index, 1);
          }
          syncPreview();
        }
        if (requeue) {
          pending.push(item);
          offlineWaiting += 1;
          syncWaiting();
          await Promise.race([waitForOnline(), cancelSignal]);
          offlineWaiting -= 1;
          syncWaiting();
        }
      });
    } finally {
      window.clearInterval(ticker);
      document.removeEventListener("visibilitychange", reacquireWakeLock);
      await releaseWakeLock();
      bulkRunRef.current = null;
      queue?.setBulkWaiting(0);
      setBatchActive(false);
      setBatchUploaded((count) => count + done);
    }

    if (abort === "profile") {
      setBulkView(null);
      askForProfile(retryFiles);
      return;
    }
    router.refresh();
    if (abort === "frozen") {
      setBulkView(null);
      setFrozenNotice(true);
      return;
    }
    if (abort === "limit") {
      setBulkView(null);
      setLimitNotice(limitMessage);
      return;
    }
    if (run.cancelled) {
      setBulkView(null);
      return;
    }

    showSummary(done);
  }

  // A cancelled or failed batch sends the guest back to the camera roll to
  // pick the same photos again; the ones that already landed are left out
  // instead of going up a second time.
  async function skipDuplicates(files: File[]): Promise<File[]> {
    setPreparing(true);
    try {
      const unhashed = files.filter((file) => !contentHashes.has(file));
      const hashes = await hashBlobs(unhashed);
      unhashed.forEach((file, index) => {
        const hash = hashes[index];
        if (hash) contentHashes.set(file, hash);
      });
      const items = files.map((file) => ({
        file,
        hash: contentHashes.get(file) ?? null,
      }));
      const uploaded = await fetchUploadedHashes([
        ...new Set(items.flatMap((item) => item.hash ?? [])),
      ]);
      const { fresh, skipped } = partitionDuplicates(items, uploaded);
      setDuplicateNotice(
        skipped.length > 0
          ? pluralize(locale, skipped.length, {
              one: labels.duplicatesSkippedOne,
              few: labels.duplicatesSkippedFew,
              many: labels.duplicatesSkippedMany,
            })
          : null,
      );
      return fresh.map((item) => item.file);
    } finally {
      setPreparing(false);
    }
  }

  async function startBatch(selected: File[]) {
    const files = await skipDuplicates(selected);
    if (files.length === 0) {
      clearSummaryTimer();
      setBulkView(null);
      return;
    }
    // New photos land at the head of the latest order; a gallery in popular
    // order, or scrolled away from its top, would put them out of sight.
    sortContext?.showLatest();
    if (queue && files.length <= OPTIMISTIC_TILE_MAX) {
      await startTileBatch(files);
    } else {
      await startBulkBatch(files);
    }
  }

  function onFilesSelected(files: File[]) {
    if (files.length === 0) return;
    if (!limitsExempt && files.length > limits.maxBatch) {
      setLimitNotice(batchLimitMessage);
      return;
    }
    setLimitNotice(null);
    setDuplicateNotice(null);
    clearFailures();
    setBatchUploaded(0);
    if (hasProfile) {
      void startBatch(files);
    } else {
      askForProfile(files);
    }
  }

  const retryableFailures = groupFailures(failures).retryable;
  const batchTiles = (queue?.tiles ?? []).filter((tile) =>
    batchTileIds.has(tile.id),
  );
  const doneCount = batchTiles.filter((tile) => tile.status === "done").length;
  const totalCount = batchTiles.filter(
    (tile) => tile.status !== "cancelled",
  ).length;

  return (
    <div
      className={
        variant === "floating"
          ? `pointer-events-none sticky mt-auto flex w-full flex-col items-center gap-3 px-3 ${
              bulkView ? "bottom-4" : "bottom-6"
            }`
          : "flex w-full flex-col items-center gap-3"
      }
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.heic,.heif"
        multiple
        className="hidden"
        onChange={(event) => {
          onFilesSelected(Array.from(event.target.files ?? []));
          event.target.value = "";
        }}
      />

      {bulkView?.phase === "uploading" && (
        <BulkMiniBar
          progressLabel={labels.bulkProgress
            .replace("{done}", String(bulkView.current))
            .replace("{total}", String(bulkView.total))}
          etaLabel={
            bulkView.etaMs !== null
              ? formatEta(bulkView.etaMs, {
                  minutes: labels.bulkEtaMinutes,
                  underMinute: labels.bulkEtaUnderMinute,
                })
              : null
          }
          hintLabel={labels.bulkHint}
          cancelLabel={labels.cancel}
          fraction={bulkView.fraction}
          previewUrl={bulkView.previewUrl}
          onCancel={cancelBulk}
        />
      )}

      {bulkView?.phase === "summary" && (
        <BatchSummary
          doneLabel={pluralize(locale, batchUploaded, {
            one: labels.bulkDoneOne,
            few: labels.bulkDoneFew,
            many: labels.bulkDoneMany,
          })}
          failedLabel={
            failures.length > 0
              ? pluralize(locale, failures.length, {
                  one: labels.bulkFailedOne,
                  few: labels.bulkFailedFew,
                  many: labels.bulkFailedMany,
                })
              : null
          }
          seeLabel={labels.bulkFailedSee}
          retryLabel={labels.retry}
          dismissLabel={labels.dismiss}
          onRetry={
            retryableFailures.length > 0
              ? () => retryFailures(retryableFailures)
              : null
          }
          onShowFailures={
            failures.length > 0
              ? () => {
                  clearSummaryTimer();
                  setFailureSheetOpen(true);
                }
              : null
          }
          onDismiss={discardFailures}
        />
      )}

      {allUploaded && (
        <p
          role="status"
          className="pointer-events-none rounded-pill bg-card/95 px-4 py-2 text-sm text-gold-small shadow-floating"
        >
          {labels.failuresAllUploaded}
        </p>
      )}

      {duplicateNotice && (
        <p
          role="status"
          className="pointer-events-auto rounded-pill bg-card/95 px-4 py-2 text-sm text-ink-muted shadow-floating"
        >
          {duplicateNotice}
        </p>
      )}

      {frozenNotice && (
        <p className="pointer-events-auto rounded-pill bg-card/95 px-4 py-2 text-sm text-ink/70 shadow-floating">
          {labels.frozen}
        </p>
      )}

      {limitNotice && (
        <p className="pointer-events-auto rounded-pill bg-card/95 px-4 py-2 text-sm text-danger shadow-floating">
          {limitNotice}
        </p>
      )}

      {bulkView?.phase !== "uploading" && (
        <button
          type="button"
          disabled={batchActive || preparing}
          onClick={() => inputRef.current?.click()}
          className={`pointer-events-auto flex items-center gap-[9px] rounded-pill bg-gold text-base font-medium text-card transition hover:bg-gold-small active:bg-gold-deep disabled:opacity-60 ${
            variant === "floating"
              ? "px-7 py-4 shadow-floating"
              : "px-[30px] py-4 shadow-[0_12px_26px_-12px_rgb(176_141_60/0.9)]"
          }`}
        >
          {variant === "floating" && !batchActive && (
            <span className="text-xl leading-none">+</span>
          )}
          <span>
            {batchActive
              ? labels.uploading
                  .replace("{done}", String(doneCount))
                  .replace("{total}", String(totalCount))
              : labels.add}
          </span>
        </button>
      )}

      {failureSheetOpen && failures.length > 0 && (
        <FailureSheet
          labels={labels}
          locale={locale}
          failures={failures}
          uploadedCount={batchUploaded}
          maxFileBytes={limitsExempt ? null : limits.maxFileBytes}
          sendingIds={sendingIds}
          leavingIds={leavingIds}
          retryRun={retryRun}
          onRetryOne={(id) => {
            const entry = failuresRef.current.find((item) => item.id === id);
            if (entry) void retryFailure(entry);
          }}
          onSkipOne={(id) =>
            skipFailures(failures.filter((entry) => entry.id === id))
          }
          onRetryAll={() => void retryAllFailures()}
          onCancelRetry={cancelRetryRun}
          onDiscard={discardFailures}
          onClose={closeFailureSheet}
        />
      )}

      {dialogOpen && (
        <IntroSheet
          labels={sheetLabels}
          locale={locale}
          fileCount={pendingFiles.length}
          onSaved={() => {
            setHasProfile(true);
            setDialogOpen(false);
            const files = pendingFiles;
            setPendingFiles([]);
            void startBatch(files);
          }}
          onCancel={() => {
            setDialogOpen(false);
            setPendingFiles([]);
          }}
        />
      )}
    </div>
  );
}
