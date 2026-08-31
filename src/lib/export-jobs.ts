import "server-only";
import { randomUUID } from "node:crypto";
import { env, PHOTOS_BUCKET } from "./env";
import { areUploadsFrozen } from "./event-settings";
import type { ExportStatus } from "./export";
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

export type ExportKind = "public" | "admin";
export const EXPORT_KINDS: ExportKind[] = ["public", "admin"];

export const EXPORTS_BUCKET = "exports";
const SIGNED_URL_TTL_SECONDS = 24 * 60 * 60;
// Supabase's resumable endpoint expects fixed 6 MiB chunks (except the last).
const TUS_CHUNK = 6 * 1024 * 1024;
const SNAPSHOT_PAGE = 1000;
// A packing job whose row hasn't moved for this long has no live worker.
export const EXPORT_STALE_MS = 3 * 60 * 1000;

export type ExportJob = {
  kind: ExportKind;
  job_id: string;
  state: "packing" | "ready" | "failed" | "cancelled";
  snapshot_frozen: boolean;
  total_count: number;
  done_count: number;
  zip_size_bytes: number;
  storage_path: string;
  manifest: ManifestEntry[];
  crcs: (number | null)[];
  upload_url: string | null;
  error: string | null;
  updated_at: string;
};

export function exportJobStatus(job: ExportJob | null): ExportStatus {
  if (!job) return { state: "packing", done: 0, total: 0, sizeBytes: null };
  return {
    state: job.state,
    done: job.done_count,
    total: job.total_count,
    sizeBytes: job.zip_size_bytes,
  };
}

export async function getExportJob(kind: ExportKind): Promise<ExportJob | null> {
  const { data, error } = await supabaseAdmin()
    .from("export_jobs")
    .select("*")
    .eq("kind", kind)
    .maybeSingle();
  if (error) throw new Error(`Loading export job failed: ${error.message}`);
  return (data as ExportJob | null) ?? null;
}

export function exportJobStale(job: ExportJob, now: Date): boolean {
  return (
    job.state === "packing" &&
    now.getTime() - new Date(job.updated_at).getTime() > EXPORT_STALE_MS
  );
}

async function snapshotPhotos(kind: ExportKind): Promise<ExportPhoto[]> {
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
    if (kind === "public") query = query.eq("visibility", "public");
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

// The manifest and total zip size are locked in when the job is created and
// never recomputed; a fresh job_id marks each (re)creation.
async function freshJobRow(kind: ExportKind) {
  const snapshotFrozen = await areUploadsFrozen();
  const manifest = buildManifest(await snapshotPhotos(kind));
  const plan = planZip(manifest);
  return {
    kind,
    job_id: randomUUID(),
    state: "packing" as const,
    snapshot_frozen: snapshotFrozen,
    total_count: manifest.length,
    done_count: 0,
    zip_size_bytes: plan.totalSize,
    storage_path: `${kind}.zip`,
    manifest,
    crcs: [],
    upload_url: null,
    error: null,
    updated_at: new Date().toISOString(),
  };
}

// Resolves to whether this call created the row; a concurrent creator wins
// the conflict and this one adopts its job.
async function insertExportJob(kind: ExportKind): Promise<boolean> {
  const { data, error } = await supabaseAdmin()
    .from("export_jobs")
    .upsert(await freshJobRow(kind), { onConflict: "kind", ignoreDuplicates: true })
    .select("kind");
  if (error) throw new Error(`Creating export job failed: ${error.message}`);
  return (data?.length ?? 0) > 0;
}

// Replaces the job in place with a fresh one; resolves to false when the job
// was already replaced by someone else.
async function replaceExportJob(job: ExportJob): Promise<boolean> {
  const { data, error } = await supabaseAdmin()
    .from("export_jobs")
    .update(await freshJobRow(job.kind))
    .eq("kind", job.kind)
    .eq("job_id", job.job_id)
    .select("kind");
  if (error) throw new Error(`Replacing export job failed: ${error.message}`);
  return (data?.length ?? 0) > 0;
}

// What a build worker sees: the job as it stands, created on demand only once
// uploads are frozen. A cancelled job stays cancelled here.
export async function ensureExportJob(kind: ExportKind): Promise<ExportJob | null> {
  const existing = await getExportJob(kind);
  if (existing) return existing;
  if (!(await areUploadsFrozen())) return null;
  await insertExportJob(kind);
  return getExportJob(kind);
}

export type PreparedExportJob = { job: ExportJob; created: boolean };

// The explicit prepare action: hands back the live job, creating one when
// there is none or the last one was cancelled. The admin zip can be prepared
// while uploads are still open; the public zip only once they freeze.
export async function prepareExportJob(
  kind: ExportKind,
): Promise<PreparedExportJob | null> {
  const existing = await getExportJob(kind);
  if (existing && existing.state !== "cancelled") return { job: existing, created: false };
  if (kind === "public" && !(await areUploadsFrozen())) return null;
  const created = existing
    ? await replaceExportJob(existing)
    : await insertExportJob(kind);
  const job = await getExportJob(kind);
  if (!job) throw new Error("Export job vanished while preparing");
  return { job, created };
}

// Cancels the job only while it is packing; resolves to the job as it stands
// either way.
export async function cancelExportJob(kind: ExportKind): Promise<ExportJob | null> {
  const { error } = await supabaseAdmin()
    .from("export_jobs")
    .update({ state: "cancelled", updated_at: new Date().toISOString() })
    .eq("kind", kind)
    .eq("state", "packing");
  if (error) throw new Error(`Cancelling export job failed: ${error.message}`);
  return getExportJob(kind);
}

// Thrown when a progress write finds the job no longer packing under the same
// job_id — cancelled, or replaced by a newer prepare — so the slice stops.
class ExportSupersededError extends Error {}

async function patchJob(job: ExportJob, patch: Record<string, unknown>): Promise<void> {
  const { data, error } = await supabaseAdmin()
    .from("export_jobs")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("kind", job.kind)
    .eq("job_id", job.job_id)
    .eq("state", "packing")
    .select("kind");
  if (error) throw new Error(`Updating export job failed: ${error.message}`);
  if ((data?.length ?? 0) === 0) throw new ExportSupersededError(`Export ${job.kind} superseded`);
}

export async function signedZipUrl(job: ExportJob): Promise<string | null> {
  const { data, error } = await supabaseAdmin()
    .storage.from(EXPORTS_BUCKET)
    .createSignedUrl(job.storage_path, SIGNED_URL_TTL_SECONDS, {
      download: job.kind === "public" ? "fotografije.zip" : "sve-fotografije.zip",
    });
  return error ? null : data.signedUrl;
}

// Once uploads are frozen: a zip snapshotted while they were still open is
// replaced, and every build without a live worker is started. Idempotent, so
// both the freeze and its daily check call it. Resolves to the kinds kicked.
export async function startFrozenExportBuilds(origin: string): Promise<ExportKind[]> {
  const kicked: ExportKind[] = [];
  for (const kind of EXPORT_KINDS) {
    let job = await getExportJob(kind);
    let replaced = false;
    if (job && !job.snapshot_frozen && (await replaceExportJob(job))) {
      job = await getExportJob(kind);
      replaced = true;
    }
    if (!job || replaced || exportJobStale(job, new Date())) {
      await kickExportBuild(origin, kind);
      kicked.push(kind);
    }
  }
  return kicked;
}

export const EXPORT_BUILD_PATH = "/api/export/build";

export function kickExportBuild(origin: string, kind: ExportKind): Promise<void> {
  return fetch(`${origin}${EXPORT_BUILD_PATH}?kind=${kind}`, {
    method: "POST",
    headers: { authorization: `Bearer ${env.cronSecret()}` },
  }).then(
    () => undefined,
    (error) => console.error(`Kicking ${kind} export build failed`, error),
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
  kind: ExportKind,
  deadline: number,
): Promise<ExportRunResult> {
  const job = await ensureExportJob(kind);
  if (!job || job.state !== "packing") return { finished: true, retry: false };

  try {
    const entries = job.manifest.map(zipEntry);
    const plan = planZip(job.manifest);
    const crcs: (number | null)[] = job.manifest.map((_, i) => job.crcs[i] ?? null);

    let uploadUrl = job.upload_url;
    let resumedOffset = uploadUrl ? await tusOffset(uploadUrl) : null;
    if (uploadUrl === null || resumedOffset === null) {
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
    });
    return { finished: true, retry: false };
  } catch (error) {
    if (error instanceof ExportSupersededError) return { finished: true, retry: false };
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Export ${kind} packing failed`, error);
    await patchJob(job, {
      ...(error instanceof FatalExportError ? { state: "failed" } : {}),
      error: message,
    }).catch(() => undefined);
    return { finished: false, retry: false };
  }
}
