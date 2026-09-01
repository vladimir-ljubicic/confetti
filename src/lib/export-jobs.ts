import "server-only";
import { randomUUID } from "node:crypto";
import { env, PHOTOS_BUCKET } from "./env";
import { areUploadsFrozen } from "./event-settings";
import {
  exportAutoCreates,
  exportDownloadName,
  exportStoragePath,
  exportTakesPrivate,
  exportTargetQuery,
  exportUploaderId,
  linkExpiresAt,
  resolveExportState,
  SHARED_EXPORT_TARGETS,
  type ExportKind,
  type ExportState,
  type ExportStatus,
  type ExportTarget,
} from "./export";
import {
  belgradeClock,
  buildManifest,
  type ExportPhoto,
  type ManifestEntry,
} from "./export-manifest";
import { supabaseAdmin } from "./supabase-server";
import {
  centralDirectory,
  crc32,
  dataDescriptor,
  endOfCentralDirectory,
  localHeader,
  planZip,
  type ZipEntry,
  type ZipPlan,
} from "./zip";

export const EXPORTS_BUCKET = "exports";
const SIGNED_URL_TTL_SECONDS = 24 * 60 * 60;
// Supabase's resumable endpoint expects fixed 6 MiB chunks (except the last).
const TUS_CHUNK = 6 * 1024 * 1024;
const SNAPSHOT_PAGE = 1000;
// A packing job whose row hasn't moved for this long has no live worker.
export const EXPORT_STALE_MS = 3 * 60 * 1000;

export type ExportJob = {
  kind: ExportKind;
  uploader_id: string | null;
  job_id: string;
  state: ExportState;
  snapshot_frozen: boolean;
  include_private: boolean;
  total_count: number;
  done_count: number;
  zip_size_bytes: number;
  storage_path: string;
  manifest: ManifestEntry[];
  crcs: (number | null)[];
  upload_url: string | null;
  error: string | null;
  expires_at: string | null;
  updated_at: string;
};

export function exportJobTarget(job: ExportJob): ExportTarget {
  return job.uploader_id === null
    ? { kind: job.kind as "public" | "admin" }
    : { kind: "uploader", uploaderId: job.uploader_id };
}

export function exportJobState(job: ExportJob, now = new Date()): ExportState {
  return resolveExportState(job.state, job.expires_at, now);
}

export function exportJobStatus(job: ExportJob | null, now = new Date()): ExportStatus {
  if (!job) return { state: "packing", done: 0, total: 0, sizeBytes: null, expiresAt: null };
  return {
    state: exportJobState(job, now),
    done: job.done_count,
    total: job.total_count,
    sizeBytes: job.zip_size_bytes,
    expiresAt: job.expires_at,
  };
}

// Cancelled or expired: the next prepare replaces the job instead of
// reporting it.
export function exportJobReplaceable(job: ExportJob, now = new Date()): boolean {
  const state = exportJobState(job, now);
  return state === "cancelled" || state === "expired";
}

// The filters that pick out one target's row: the shared zips are the rows
// without an uploader. Typed against the two methods it calls, since threading
// a Supabase builder's own type through a generic blows the instantiation
// depth.
type TargetFilters = {
  eq(column: string, value: string): TargetFilters;
  is(column: string, value: null): TargetFilters;
};

function atTarget<T>(query: T, target: ExportTarget): T {
  const uploaderId = exportUploaderId(target);
  const scoped = (query as TargetFilters).eq("kind", target.kind);
  return (
    uploaderId === null
      ? scoped.is("uploader_id", null)
      : scoped.eq("uploader_id", uploaderId)
  ) as T;
}

export async function getExportJob(target: ExportTarget): Promise<ExportJob | null> {
  const { data, error } = await atTarget(
    supabaseAdmin().from("export_jobs").select("*"),
    target,
  ).maybeSingle();
  if (error) throw new Error(`Loading export job failed: ${error.message}`);
  return (data as ExportJob | null) ?? null;
}

// The job a page can offer its visitor: a cancelled or expired one stands for
// no zip, since the next prepare replaces it, and a lookup that fails leaves
// the page to render without one.
export async function liveExportJob(target: ExportTarget): Promise<ExportJob | null> {
  const job = await getExportJob(target).catch(() => null);
  return job && !exportJobReplaceable(job) ? job : null;
}

export function exportJobStale(job: ExportJob, now: Date): boolean {
  return (
    job.state === "packing" &&
    now.getTime() - new Date(job.updated_at).getTime() > EXPORT_STALE_MS
  );
}

async function snapshotPhotos(
  target: ExportTarget,
  includePrivate: boolean,
): Promise<ExportPhoto[]> {
  const uploaderId = exportUploaderId(target);
  const photos: ExportPhoto[] = [];
  for (let from = 0; ; from += SNAPSHOT_PAGE) {
    let query = supabaseAdmin()
      .from("photos")
      .select(
        "storage_path, original_filename, size_bytes, effective_taken_at, uploaders (display_name)",
      )
      .not("uploaded_at", "is", null)
      .is("deleted_at", null)
      .order("id", { ascending: true })
      .range(from, from + SNAPSHOT_PAGE - 1);
    if (uploaderId !== null) query = query.eq("uploader_id", uploaderId);
    if (!includePrivate) query = query.eq("visibility", "public");
    const { data, error } = await query;
    if (error) throw new Error(`Snapshotting photos failed: ${error.message}`);
    const rows = data as unknown as {
      storage_path: string;
      original_filename: string;
      size_bytes: number;
      effective_taken_at: string;
      uploaders: { display_name: string | null } | null;
    }[];
    photos.push(
      ...rows.map((row) => ({
        storagePath: row.storage_path,
        originalFilename: row.original_filename,
        sizeBytes: row.size_bytes,
        takenAt: row.effective_taken_at,
        displayName: row.uploaders?.display_name ?? null,
      })),
    );
    if (rows.length < SNAPSHOT_PAGE) return photos;
  }
}

async function livePhotoCount(uploaderId: string): Promise<number> {
  const { count, error } = await supabaseAdmin()
    .from("photos")
    .select("id", { count: "exact", head: true })
    .eq("uploader_id", uploaderId)
    .not("uploaded_at", "is", null)
    .is("deleted_at", null);
  if (error) throw new Error(`Counting a guest's photos failed: ${error.message}`);
  return count ?? 0;
}

// A guest's own zip is a snapshot of photos they are still adding to, so a
// finished one falls out of date as soon as their count moves. One still
// packing is already building the snapshot they just asked for, and replacing
// it would strand the upload it has in flight. The shared zips snapshot the
// frozen gallery, which no longer moves.
async function exportJobOutdated(job: ExportJob): Promise<boolean> {
  if (job.uploader_id === null || job.state === "packing") return false;
  return (await livePhotoCount(job.uploader_id)) !== job.total_count;
}

// The manifest, the private-photos choice and total zip size are locked in
// when the job is created and never recomputed; a fresh job_id marks each
// (re)creation.
async function freshJobRow(target: ExportTarget, includePrivate: boolean) {
  const snapshotFrozen = await areUploadsFrozen();
  const manifest = buildManifest(await snapshotPhotos(target, includePrivate));
  const plan = planZip(manifest);
  return {
    kind: target.kind,
    uploader_id: exportUploaderId(target),
    job_id: randomUUID(),
    state: "packing" as const,
    snapshot_frozen: snapshotFrozen,
    include_private: includePrivate,
    total_count: manifest.length,
    done_count: 0,
    zip_size_bytes: plan.totalSize,
    storage_path: exportStoragePath(target),
    manifest,
    crcs: [],
    upload_url: null,
    error: null,
    expires_at: null,
    updated_at: new Date().toISOString(),
  };
}

// Resolves to whether this call created the row; a concurrent creator wins
// the conflict and this one adopts its job.
async function insertExportJob(
  target: ExportTarget,
  includePrivate: boolean,
): Promise<boolean> {
  const { data, error } = await supabaseAdmin()
    .from("export_jobs")
    .upsert(await freshJobRow(target, includePrivate), {
      onConflict: "kind,uploader_id",
      ignoreDuplicates: true,
    })
    .select("kind");
  if (error) throw new Error(`Creating export job failed: ${error.message}`);
  return (data?.length ?? 0) > 0;
}

// Replaces the job in place with a fresh one, keeping its private-photos
// choice unless given another; resolves to false when the job was already
// replaced by someone else.
async function replaceExportJob(
  job: ExportJob,
  includePrivate = job.include_private,
): Promise<boolean> {
  const target = exportJobTarget(job);
  const { data, error } = await atTarget(
    supabaseAdmin()
      .from("export_jobs")
      .update(await freshJobRow(target, includePrivate)),
    target,
  )
    .eq("job_id", job.job_id)
    .select("kind");
  if (error) throw new Error(`Replacing export job failed: ${error.message}`);
  return (data?.length ?? 0) > 0;
}

// What a build worker sees: the job as it stands. A shared zip is created on
// demand once uploads are frozen; a guest's own zip is never created here, only
// by their prepare. A cancelled or expired job stays that way.
export async function ensureExportJob(target: ExportTarget): Promise<ExportJob | null> {
  const existing = await getExportJob(target);
  if (existing) return existing;
  if (!exportAutoCreates(target) || !(await areUploadsFrozen())) return null;
  await insertExportJob(target, exportTakesPrivate(target));
  return getExportJob(target);
}

export type PreparedExportJob = { job: ExportJob; created: boolean };

// The explicit prepare action: hands back the live job, creating one when
// there is none, the last one was cancelled or expired, the live one holds a
// different private-photos choice, or — for a guest's own zip — their photos
// have moved since it was snapshotted. The admin zip and a guest's own can be
// prepared while uploads are still open; the public zip only once they freeze,
// and it never takes private photos.
export async function prepareExportJob(
  target: ExportTarget,
  includePrivate: boolean,
): Promise<PreparedExportJob | null> {
  const wanted = includePrivate && exportTakesPrivate(target);
  const existing = await getExportJob(target);
  if (
    existing &&
    !exportJobReplaceable(existing) &&
    existing.include_private === wanted &&
    !(await exportJobOutdated(existing))
  ) {
    return { job: existing, created: false };
  }
  if (target.kind === "public" && !(await areUploadsFrozen())) return null;
  const created = existing
    ? await replaceExportJob(existing, wanted)
    : await insertExportJob(target, wanted);
  const job = await getExportJob(target);
  if (!job) throw new Error("Export job vanished while preparing");
  return { job, created };
}

// Cancels the job only while it is packing; resolves to the job as it stands
// either way.
export async function cancelExportJob(target: ExportTarget): Promise<ExportJob | null> {
  const { error } = await atTarget(
    supabaseAdmin()
      .from("export_jobs")
      .update({ state: "cancelled", updated_at: new Date().toISOString() }),
    target,
  ).eq("state", "packing");
  if (error) throw new Error(`Cancelling export job failed: ${error.message}`);
  return getExportJob(target);
}

// Thrown when a progress write finds the job no longer packing under the same
// job_id — cancelled, or replaced by a newer prepare — so the slice stops.
class ExportSupersededError extends Error {}

async function patchJob(job: ExportJob, patch: Record<string, unknown>): Promise<void> {
  const { data, error } = await atTarget(
    supabaseAdmin()
      .from("export_jobs")
      .update({ ...patch, updated_at: new Date().toISOString() }),
    exportJobTarget(job),
  )
    .eq("job_id", job.job_id)
    .eq("state", "packing")
    .select("kind");
  if (error) throw new Error(`Updating export job failed: ${error.message}`);
  if ((data?.length ?? 0) === 0) {
    throw new ExportSupersededError(`Export ${job.storage_path} superseded`);
  }
}

// The signed URL never outlives the link's validity.
export async function signedZipUrl(job: ExportJob, now = new Date()): Promise<string | null> {
  const remainingSeconds = job.expires_at
    ? Math.floor((Date.parse(job.expires_at) - now.getTime()) / 1000)
    : SIGNED_URL_TTL_SECONDS;
  if (remainingSeconds <= 0) return null;
  const { data, error } = await supabaseAdmin()
    .storage.from(EXPORTS_BUCKET)
    .createSignedUrl(job.storage_path, Math.min(SIGNED_URL_TTL_SECONDS, remainingSeconds), {
      download: exportDownloadName(exportJobTarget(job)),
    });
  return error ? null : data.signedUrl;
}

export async function removeZipObject(path: string): Promise<void> {
  const { error } = await supabaseAdmin().storage.from(EXPORTS_BUCKET).remove([path]);
  if (error) throw new Error(`Removing ${path} failed: ${error.message}`);
}

// Removes the zip objects whose link validity lapsed before `now` and marks
// their jobs expired, so the nightly run skips them next time. A storage
// failure leaves the job for the next run. Resolves to the zips purged.
export async function purgeExpiredExports(now: Date): Promise<string[]> {
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("export_jobs")
    .select("*")
    .eq("state", "ready")
    .lt("expires_at", now.toISOString());
  if (error) throw new Error(`Listing expired exports failed: ${error.message}`);
  const purged: string[] = [];
  for (const job of (data ?? []) as ExportJob[]) {
    await removeZipObject(job.storage_path);
    const { error: updateError } = await atTarget(
      supabase
        .from("export_jobs")
        .update({ state: "expired", updated_at: now.toISOString() }),
      exportJobTarget(job),
    ).eq("job_id", job.job_id);
    if (updateError) {
      throw new Error(`Expiring export ${job.storage_path} failed: ${updateError.message}`);
    }
    purged.push(job.storage_path);
  }
  return purged;
}

// Once uploads are frozen: a zip snapshotted while they were still open is
// replaced, and every build without a live worker is started. Idempotent, so
// both the freeze and its daily check call it. A guest's own zip is theirs to
// ask for, so the sweep leaves it alone. Resolves to the kinds kicked.
export async function startFrozenExportBuilds(origin: string): Promise<ExportKind[]> {
  const kicked: ExportKind[] = [];
  for (const target of SHARED_EXPORT_TARGETS) {
    let job = await getExportJob(target);
    let replaced = false;
    if (job && !job.snapshot_frozen && (await replaceExportJob(job))) {
      job = await getExportJob(target);
      replaced = true;
    }
    if (!job || replaced || exportJobStale(job, new Date())) {
      await kickExportBuild(origin, target);
      kicked.push(target.kind);
    }
  }
  return kicked;
}

export const EXPORT_BUILD_PATH = "/api/export/build";

export function kickExportBuild(origin: string, target: ExportTarget): Promise<void> {
  const query = exportTargetQuery(target);
  return fetch(`${origin}${EXPORT_BUILD_PATH}?${query}`, {
    method: "POST",
    headers: { authorization: `Bearer ${env.cronSecret()}` },
  }).then(
    () => undefined,
    (error) => console.error(`Kicking export build (${query}) failed`, error),
  );
}

// --- tus client against Supabase Storage's resumable endpoint -------------

function tusEndpoint(): string {
  return `${env.supabaseUrl()}/storage/v1/upload/resumable`;
}

function tusHeaders(): Record<string, string> {
  // The apikey header carries auth for new-format (sb_secret_…) keys, which
  // the bearer path alone rejects as malformed JWTs.
  return {
    apikey: env.supabaseSecretKey(),
    authorization: `Bearer ${env.supabaseSecretKey()}`,
    "tus-resumable": "1.0.0",
  };
}

function b64(value: string): string {
  return Buffer.from(value, "utf8").toString("base64");
}

async function createTusUpload(objectName: string, length: number): Promise<string> {
  const response = await fetch(tusEndpoint(), {
    method: "POST",
    headers: {
      ...tusHeaders(),
      "upload-length": String(length),
      "x-upsert": "true",
      "upload-metadata": [
        `bucketName ${b64(EXPORTS_BUCKET)}`,
        `objectName ${b64(objectName)}`,
        `contentType ${b64("application/zip")}`,
      ].join(","),
    },
  });
  const location = response.headers.get("location");
  if (!response.ok || !location) {
    throw new Error(`Creating resumable upload failed: ${response.status}`);
  }
  return new URL(location, tusEndpoint()).toString();
}

async function tusOffset(url: string): Promise<number | null> {
  const response = await fetch(url, { method: "HEAD", headers: tusHeaders() });
  if (response.status === 404 || response.status === 410) return null;
  const offset = response.headers.get("upload-offset");
  if (!response.ok || offset === null) {
    throw new Error(`Resumable upload offset check failed: ${response.status}`);
  }
  return Number(offset);
}

async function tusPatch(url: string, offset: number, chunk: Buffer): Promise<number> {
  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      ...tusHeaders(),
      "upload-offset": String(offset),
      "content-type": "application/offset+octet-stream",
    },
    body: new Uint8Array(chunk),
  });
  if (!response.ok) {
    throw new Error(`Resumable upload chunk failed: ${response.status}`);
  }
  return Number(response.headers.get("upload-offset") ?? offset + chunk.length);
}

// --- packer ---------------------------------------------------------------

class FatalExportError extends Error {}

async function downloadPhoto(entry: ManifestEntry): Promise<Buffer> {
  const { data, error } = await supabaseAdmin()
    .storage.from(PHOTOS_BUCKET)
    .download(entry.path);
  if (error || !data) {
    const status = (error as { status?: number } | null)?.status;
    const message = `Downloading ${entry.path} failed: ${error?.message ?? "no data"}`;
    if (status === 400 || status === 404) throw new FatalExportError(message);
    throw new Error(message);
  }
  const bytes = Buffer.from(await data.arrayBuffer());
  if (bytes.length !== entry.size) {
    throw new FatalExportError(
      `Object ${entry.path} is ${bytes.length} bytes, manifest says ${entry.size}`,
    );
  }
  return bytes;
}

function zipEntry(entry: ManifestEntry): ZipEntry {
  return { name: entry.name, size: entry.size, mtime: belgradeClock(entry.takenAt) };
}

function tailBytes(entries: ZipEntry[], crcs: number[], plan: ZipPlan): Buffer {
  return Buffer.concat([
    centralDirectory(entries, crcs, plan),
    endOfCentralDirectory(plan),
  ]);
}

export type ExportRunResult = { finished: boolean; retry: boolean };

// Packs as much of the zip as fits before the deadline, uploading fixed-size
// chunks. Every upload offset is a 6 MiB multiple, so a later invocation can
// resume by regenerating bytes from the entry that spans the stored offset.
export async function runExportJob(
  target: ExportTarget,
  deadline: number,
): Promise<ExportRunResult> {
  const job = await ensureExportJob(target);
  if (!job || job.state !== "packing") return { finished: true, retry: false };

  try {
    const entries = job.manifest.map(zipEntry);
    const plan = planZip(job.manifest);
    const crcs: (number | null)[] = job.manifest.map((_, i) => job.crcs[i] ?? null);

    let uploadUrl = job.upload_url;
    let resumedOffset = uploadUrl ? await tusOffset(uploadUrl) : null;
    if (uploadUrl === null || resumedOffset === null) {
      // A job that was replaced or cancelled mid-upload leaves the object
      // holding its key, and a fresh resumable upload cannot write over one.
      await removeZipObject(job.storage_path);
      uploadUrl = await createTusUpload(job.storage_path, plan.totalSize);
      resumedOffset = 0;
      await patchJob(job, { upload_url: uploadUrl });
    }
    const url = uploadUrl;
    let offset = resumedOffset;

    let pending: Buffer[] = [];
    let pendingLen = 0;
    const push = (bytes: Buffer) => {
      if (bytes.length === 0) return;
      pending.push(bytes);
      pendingLen += bytes.length;
    };
    const flushChunks = async (final: boolean) => {
      while (pendingLen >= TUS_CHUNK || (final && pendingLen > 0)) {
        const all = pending.length === 1 ? pending[0] : Buffer.concat(pending);
        const size = Math.min(TUS_CHUNK, all.length);
        offset = await tusPatch(url, offset, all.subarray(0, size));
        pending = all.length > size ? [all.subarray(size)] : [];
        pendingLen = all.length - size;
      }
    };

    let start = plan.entries.findIndex((layout) => layout.end > offset);
    if (start === -1) start = job.manifest.length;

    // CRCs of fully-uploaded entries may be missing if a previous run died
    // between uploading and checkpointing; recover them without re-uploading.
    for (let i = 0; i < start; i++) {
      if (crcs[i] === null) crcs[i] = crc32(await downloadPhoto(job.manifest[i]));
    }

    for (let i = start; i < job.manifest.length; i++) {
      if (Date.now() > deadline) {
        await patchJob(job, { crcs, done_count: i });
        return { finished: false, retry: true };
      }
      const data = await downloadPhoto(job.manifest[i]);
      const crc = crc32(data);
      crcs[i] = crc;
      const bytes = Buffer.concat([
        localHeader(entries[i]),
        data,
        dataDescriptor(crc, data.length),
      ]);
      const skip = offset + pendingLen - plan.entries[i].headerStart;
      push(skip > 0 ? bytes.subarray(skip) : bytes);
      await flushChunks(false);
      await patchJob(job, { crcs, done_count: i + 1 });
    }

    const tail = tailBytes(entries, crcs as number[], plan);
    const tailSkip = offset + pendingLen - plan.centralDirectoryStart;
    push(tailSkip > 0 ? tail.subarray(tailSkip) : tail);
    await flushChunks(true);

    if (offset !== plan.totalSize) {
      throw new Error(`Upload ended at ${offset}, expected ${plan.totalSize}`);
    }
    await patchJob(job, {
      state: "ready",
      done_count: job.total_count,
      error: null,
      expires_at: linkExpiresAt(new Date()),
    });
    return { finished: true, retry: false };
  } catch (error) {
    if (error instanceof ExportSupersededError) return { finished: true, retry: false };
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Export ${exportStoragePath(target)} packing failed`, error);
    await patchJob(job, {
      ...(error instanceof FatalExportError ? { state: "failed" } : {}),
      error: message,
    }).catch(() => undefined);
    return { finished: false, retry: false };
  }
}
