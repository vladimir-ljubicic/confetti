// Seeds the database with demo guests, photos, and likes.
//
//   node scripts/seed.mjs           # wipe everything, then seed
//   node scripts/seed.mjs --clean   # wipe everything only
//
// The wipe empties every gallery table and every storage bucket, so whatever a
// run leaves behind is exactly what it seeded. Event settings are left alone.
//
// Photos come from Pexels, searched by wedding-related queries and cached under
// scripts/.cache/pexels so re-runs don't re-download. Needs PEXELS_API_KEY in
// .env.local (free key from https://www.pexels.com/api/).
//
// Far fewer distinct images are downloaded than photos are seeded: the pool is
// reused across guests, and each seeded photo still gets its own storage object
// because storage_path is unique per row.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const envPath = fileURLToPath(new URL("../.env.local", import.meta.url));
for (const line of readFileSync(envPath, "utf8").split("\n")) {
  const match = line.match(/^([A-Z_]+)=(.*)$/);
  if (match && !(match[1] in process.env)) process.env[match[1]] = match[2];
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const BUCKETS = ["photos", "renditions", "exports"];

// Supabase caps a storage listing at 1000 entries and a removal at 1000 paths.
const STORAGE_PAGE = 1000;

const GUEST_COUNT = 100;

// Public photos that are not in the bin, which is what the gallery loads. A
// big wedding's worth; GALLERY_MAX_PHOTOS in src/lib/public-photos.ts sits
// well above it as a safety valve.
const GALLERY_PHOTO_COUNT = 2000;
const PRIVATE_PHOTO_COUNT = 110;
const DELETED_PHOTO_COUNT = 90;
const TOTAL_PHOTO_COUNT =
  GALLERY_PHOTO_COUNT + PRIVATE_PHOTO_COUNT + DELETED_PHOTO_COUNT;

// Devices that like photos without ever having uploaded one.
const LIKE_DEVICE_COUNT = 200;

const UPLOAD_WINDOW_HOURS = 24 * 7;

const CONCURRENCY = 12;
const INSERT_BATCH = 500;

const FIRST_NAMES = [
  "Ana", "Marko", "Jelena", "Nikola", "Milica", "Stefan", "Ivana", "Luka",
  "Teodora", "Vuk", "Sara", "Filip", "Katarina", "Uroš", "Anđela", "Petar",
  "Mina", "Dušan", "Tijana", "Lazar",
];

const LAST_NAMES = [
  "Marić", "Jovanović", "Petrović", "Ilić", "Stojanović", "Đorđević",
  "Nikolić", "Pavlović", "Simić", "Radovanović", "Kovačević", "Popović",
  "Todorović", "Milošević", "Ristić", "Lukić", "Božović", "Vasić",
  "Janković", "Perić",
];

const QUERIES = [
  "wedding reception",
  "bride and groom",
  "wedding guests dancing",
  "wedding ceremony",
  "wedding toast",
  "wedding cake",
  "wedding bouquet",
];

// Pexels caps a page at 80 results.
const PER_QUERY = 60;

// Keep in step with GALLERY_IMAGE_WIDTH and VIEWER_IMAGE_WIDTH in
// src/lib/thumbnail.ts.
const THUMBNAIL_WIDTH = 800;
const VIEWER_WIDTH = 1600;

const CACHE_DIR = fileURLToPath(new URL("./.cache/pexels/", import.meta.url));

// Deterministic PRNG so re-runs produce the same photo counts and likes.
function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260920);
const randInt = (min, max) => min + Math.floor(rand() * (max - min + 1));

function shuffle(items) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

function fail(message, error) {
  console.error(message, error ?? "");
  process.exit(1);
}

async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const index = next++;
        results[index] = await worker(items[index], index);
      }
    }),
  );
  return results;
}

function chunk(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

function guests() {
  const names = [];
  for (const last of LAST_NAMES) {
    for (const first of FIRST_NAMES) names.push(`${first} ${last}`);
  }
  return shuffle(names)
    .slice(0, GUEST_COUNT)
    .map((name, index) => ({
      id: `5eed0000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
      name,
    }));
}

// Splits a total across weighted shares, spending every last unit so the seeded
// counts come out exact.
function allocate(total, weights) {
  const sum = weights.reduce((a, b) => a + b, 0);
  const counts = weights.map((weight) => Math.floor((total * weight) / sum));
  let remainder = total - counts.reduce((a, b) => a + b, 0);
  for (let i = 0; remainder > 0; i = (i + 1) % counts.length, remainder--) {
    counts[i]++;
  }
  return counts;
}

// Every object in a bucket. Listing is one directory at a time, and folders come
// back as entries without an id.
async function storagePaths(bucket, prefix = "") {
  const paths = [];
  for (let offset = 0; ; offset += STORAGE_PAGE) {
    const { data: entries, error } = await supabase.storage
      .from(bucket)
      .list(prefix, { limit: STORAGE_PAGE, offset });
    if (error) fail(`listing ${bucket}/${prefix} failed:`, error);
    for (const entry of entries) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.id === null) paths.push(...(await storagePaths(bucket, path)));
      else paths.push(path);
    }
    if (entries.length < STORAGE_PAGE) return paths;
  }
}

async function emptyBucket(bucket) {
  const paths = await storagePaths(bucket);
  for (const batch of chunk(paths, STORAGE_PAGE)) {
    const { error } = await supabase.storage.from(bucket).remove(batch);
    if (error) fail(`removing objects from ${bucket} failed:`, error);
  }
  return paths.length;
}

async function deleteAll(table, keyColumn) {
  const { error } = await supabase.from(table).delete().not(keyColumn, "is", null);
  if (error) fail(`deleting ${table} failed:`, error);
}

async function clean() {
  const removed = await mapLimit(BUCKETS, CONCURRENCY, emptyBucket);

  // Likes cascade with photos.
  await deleteAll("export_jobs", "kind");
  await deleteAll("photos", "id");
  await deleteAll("uploaders", "id");

  const total = removed.reduce((a, b) => a + b, 0);
  console.log(`cleaned ${total} storage objects and every gallery row`);
}

async function search(query) {
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${PER_QUERY}`;
  const response = await fetch(url, {
    headers: { Authorization: process.env.PEXELS_API_KEY },
  });
  if (!response.ok) {
    fail(`pexels search failed for "${query}":`, `${response.status} ${await response.text()}`);
  }
  const body = await response.json();
  return body.photos.map((photo) => ({
    id: String(photo.id),
    url: renditionUrl(photo.src.large2x, THUMBNAIL_WIDTH),
    viewerUrl: renditionUrl(photo.src.large2x, VIEWER_WIDTH),
  }));
}

// Pexels renders any size from the same URL; the width and height carried in
// the query string give the rendition's aspect ratio to scale by.
function renditionUrl(url, width) {
  const parsed = new URL(url);
  const sourceWidth = Number(parsed.searchParams.get("w"));
  const sourceHeight = Number(parsed.searchParams.get("h"));
  parsed.searchParams.set("dpr", "1");
  parsed.searchParams.set("w", String(width));
  if (sourceWidth && sourceHeight) {
    parsed.searchParams.set(
      "h",
      String(Math.round((width * sourceHeight) / sourceWidth)),
    );
  }
  return parsed.href;
}

// One pool of unique photos for the whole run, ordered so that a re-run pairs
// the same photo with the same guest.
async function loadPool() {
  const byId = new Map();
  for (const query of QUERIES) {
    const photos = await search(query);
    for (const photo of photos) byId.set(photo.id, photo);
    console.log(`${query}: ${photos.length} photos`);
  }
  const pool = [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
  return shuffle(pool);
}

// Pixel size from a JPEG's start-of-frame marker: the gallery reserves a tile's
// height from it before the image loads.
function jpegSize(image) {
  let i = 2;
  while (i + 9 < image.length) {
    if (image[i] !== 0xff) {
      i += 1;
      continue;
    }
    const marker = image[i + 1];
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
      i += 2;
      continue;
    }
    const isFrame =
      marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
    if (isFrame) {
      return { width: image.readUInt16BE(i + 7), height: image.readUInt16BE(i + 5) };
    }
    i += 2 + image.readUInt16BE(i + 2);
  }
  return null;
}

async function fetchImage(url, cacheKey) {
  const cached = `${CACHE_DIR}${cacheKey}.jpg`;
  if (existsSync(cached)) return readFileSync(cached);
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(url, { redirect: "follow" });
      if (response.ok) {
        const image = Buffer.from(await response.arrayBuffer());
        writeFileSync(cached, image);
        return image;
      }
    } catch {
      // retry
    }
    await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
  }
  return null;
}

// Storage occasionally answers a burst of uploads with a 5xx.
async function upload(bucket, path, image, options = {}) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, image, { contentType: "image/jpeg", upsert: true, ...options });
    if (!error) return null;
    if (attempt === 3) return error;
    await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
  }
}

function likeCount() {
  const roll = rand();
  if (roll < 0.25) return 0;
  if (roll < 0.75) return randInt(1, 5);
  if (roll < 0.95) return randInt(6, 20);
  return randInt(21, 60);
}

// Every photo to seed, decided up front so the run stays deterministic while
// downloads and uploads go out in parallel.
function plan(guestList, images) {
  const kinds = shuffle([
    ...Array(GALLERY_PHOTO_COUNT).fill("public"),
    ...Array(PRIVATE_PHOTO_COUNT).fill("private"),
    ...Array(DELETED_PHOTO_COUNT).fill("deleted"),
  ]);
  // A handful of guests shoot most of the wedding; the rest bring a few photos.
  const counts = allocate(
    TOTAL_PHOTO_COUNT,
    guestList.map(() => 1 + rand() ** 3 * 12),
  );

  const now = Date.now();
  const photos = [];
  let fileNumber = randInt(1000, 4000);
  let kindIndex = 0;
  guestList.forEach((guest, guestIndex) => {
    for (let i = 0; i < counts[guestIndex]; i++) {
      const kind = kinds[kindIndex++];
      const image = images[photos.length % images.length];
      const uploadedAt = new Date(
        now - randInt(0, UPLOAD_WINDOW_HOURS) * 3_600_000 - randInt(0, 3_600_000),
      );
      photos.push({
        id: crypto.randomUUID(),
        guest,
        image,
        filename: `IMG_${fileNumber++}.jpg`,
        visibility: kind === "private" ? "private" : "public",
        uploadedAt,
        takenAt: new Date(uploadedAt.getTime() - randInt(0, 6) * 3_600_000),
        deletedAt:
          kind === "deleted"
            ? new Date(
                Math.min(now, uploadedAt.getTime() + randInt(1, 48) * 3_600_000),
              )
            : null,
        likes: kind === "public" ? likeCount() : 0,
      });
    }
  });
  return photos;
}

async function seed() {
  if (!process.env.PEXELS_API_KEY) {
    fail("PEXELS_API_KEY is missing from .env.local");
  }
  mkdirSync(CACHE_DIR, { recursive: true });
  const pool = await loadPool();

  const downloaded = await mapLimit(pool, CONCURRENCY, async (source) => {
    const bytes = await fetchImage(source.url, `${source.id}.thumb`);
    if (!bytes) {
      console.warn(`skipped (download failed after retries): ${source.url}`);
      return null;
    }
    // A photo may legitimately lack its viewer rendition; a failed download
    // seeds that case instead of aborting.
    const viewerBytes = await fetchImage(source.viewerUrl, `${source.id}.viewer`);
    return { bytes, viewerBytes, size: jpegSize(bytes) };
  });
  const images = downloaded.filter(Boolean);
  if (images.length === 0) fail("no images could be downloaded");
  console.log(`${images.length} distinct images ready`);

  const guestList = guests();
  const { error: uploadersError } = await supabase.from("uploaders").insert(
    guestList.map((guest) => ({ id: guest.id, display_name: guest.name })),
  );
  if (uploadersError) fail("inserting uploaders failed:", uploadersError);

  const photos = plan(guestList, images);

  let uploaded = 0;
  await mapLimit(photos, CONCURRENCY, async (photo) => {
    photo.path = `${photo.guest.id}/${photo.id}.jpg`;
    photo.thumbPath = `${photo.id}/thumb.jpg`;
    const uploadError = await upload("photos", photo.path, photo.image.bytes);
    if (uploadError) fail(`storage upload failed for ${photo.path}:`, uploadError);

    // Renditions go where the app expects them: public live photos serve
    // theirs from the public renditions bucket, private and deleted ones keep
    // theirs in the private bucket behind the signed proxy.
    const bucket =
      photo.visibility === "public" && photo.deletedAt === null
        ? "renditions"
        : "photos";
    const cacheHeaders = {
      headers: { "cache-control": "public, max-age=31536000, immutable" },
    };
    const thumbError = await upload(bucket, photo.thumbPath, photo.image.bytes, cacheHeaders);
    if (thumbError) fail(`storage upload failed for ${photo.thumbPath}:`, thumbError);
    if (photo.image.viewerBytes) {
      const viewerPath = `${photo.id}/viewer.jpg`;
      const viewerError = await upload(bucket, viewerPath, photo.image.viewerBytes, cacheHeaders);
      if (viewerError) fail(`storage upload failed for ${viewerPath}:`, viewerError);
    }
    uploaded++;
    if (uploaded % 200 === 0) console.log(`uploaded ${uploaded}/${photos.length}`);
  });

  const rows = photos.map((photo) => ({
    id: photo.id,
    uploader_id: photo.guest.id,
    storage_path: photo.path,
    thumbnail_path: photo.thumbPath,
    original_filename: photo.filename,
    content_type: "image/jpeg",
    size_bytes: photo.image.bytes.byteLength,
    image_width: photo.image.size?.width ?? null,
    image_height: photo.image.size?.height ?? null,
    visibility: photo.visibility,
    media_type: "photo",
    taken_at: photo.takenAt.toISOString(),
    uploaded_at: photo.uploadedAt.toISOString(),
    deleted_at: photo.deletedAt?.toISOString() ?? null,
  }));
  for (const batch of chunk(rows, INSERT_BATCH)) {
    const { error } = await supabase.from("photos").insert(batch);
    if (error) fail("photo insert failed:", error);
  }

  const devicePool = guestList.map((guest) => guest.id);
  for (let i = 0; i < LIKE_DEVICE_COUNT; i++) {
    devicePool.push(`5eedcafe-0000-4000-8000-${String(i).padStart(12, "0")}`);
  }
  const likes = [];
  for (const photo of photos) {
    if (photo.likes === 0) continue;
    const devices = shuffle([...devicePool])
      .filter((id) => id !== photo.guest.id)
      .slice(0, photo.likes);
    for (const deviceId of devices) {
      likes.push({ photo_id: photo.id, device_id: deviceId });
    }
  }
  for (const batch of chunk(likes, INSERT_BATCH)) {
    const { error } = await supabase.from("likes").insert(batch);
    if (error) fail("likes insert failed:", error);
  }

  console.log(
    `seeded ${guestList.length} guests, ${photos.length} photos ` +
      `(${GALLERY_PHOTO_COUNT} in the gallery, ${PRIVATE_PHOTO_COUNT} private, ` +
      `${DELETED_PHOTO_COUNT} in the bin), ${likes.length} likes`,
  );
}

await clean();
if (!process.argv.includes("--clean")) await seed();
