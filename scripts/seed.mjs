// Seeds the database with demo guests, photos, and likes.
//
//   node scripts/seed.mjs           # wipe previous seed data, then seed
//   node scripts/seed.mjs --clean   # wipe previous seed data only
//
// Photos come from Pexels, searched by wedding-related queries and cached under
// scripts/.cache/pexels so re-runs don't re-download. Needs PEXELS_API_KEY in
// .env.local (free key from https://www.pexels.com/api/). Seeded uploaders use
// ids starting with "5eed", which is how cleanup finds everything it created.

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
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

// uuid columns don't support `like`; seed ids are matched by range instead.
const SEED_ID_MIN = "5eed0000-0000-0000-0000-000000000000";
const SEED_ID_MAX = "5eee0000-0000-0000-0000-000000000000";

const GUESTS = [
  { id: "5eed0000-0000-4000-8000-000000000001", name: "Ana Marić" },
  { id: "5eed0000-0000-4000-8000-000000000002", name: "Marko Jovanović" },
  { id: "5eed0000-0000-4000-8000-000000000003", name: "Jelena Petrović" },
  { id: "5eed0000-0000-4000-8000-000000000004", name: "Nikola Ilić" },
  { id: "5eed0000-0000-4000-8000-000000000005", name: "Milica Stojanović" },
  { id: "5eed0000-0000-4000-8000-000000000006", name: "Stefan Đorđević" },
  { id: "5eed0000-0000-4000-8000-000000000007", name: "Ivana Nikolić" },
  { id: "5eed0000-0000-4000-8000-000000000008", name: "Luka Pavlović" },
  { id: "5eed0000-0000-4000-8000-000000000009", name: "Teodora Simić" },
  { id: "5eed0000-0000-4000-8000-000000000010", name: "Vuk Radovanović" },
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

// Keep in step with GALLERY_IMAGE_WIDTH in src/lib/thumbnail.ts.
const THUMBNAIL_WIDTH = 800;

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

function fail(message, error) {
  console.error(message, error ?? "");
  process.exit(1);
}

async function clean() {
  const { data: uploaders, error } = await supabase
    .from("uploaders")
    .select("id")
    .gte("id", SEED_ID_MIN)
    .lt("id", SEED_ID_MAX);
  if (error) fail("listing seeded uploaders failed:", error);
  if (uploaders.length === 0) {
    console.log("no seed data found");
    return;
  }
  const ids = uploaders.map((u) => u.id);

  for (const id of ids) {
    const { data: objects, error: listError } = await supabase.storage
      .from("photos")
      .list(id, { limit: 1000 });
    if (listError) fail(`listing storage for ${id} failed:`, listError);
    if (objects.length > 0) {
      const { error: removeError } = await supabase.storage
        .from("photos")
        .remove(objects.map((o) => `${id}/${o.name}`));
      if (removeError) fail(`removing storage for ${id} failed:`, removeError);
    }
  }

  // Likes cascade with photos.
  const { error: photosError } = await supabase
    .from("photos")
    .delete()
    .in("uploader_id", ids);
  if (photosError) fail("deleting seeded photos failed:", photosError);
  const { error: uploadersError } = await supabase
    .from("uploaders")
    .delete()
    .in("id", ids);
  if (uploadersError) fail("deleting seeded uploaders failed:", uploadersError);
  console.log(`cleaned ${ids.length} seeded guests`);
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
    url: photo.src.large2x,
    thumbnailUrl: renditionUrl(photo.src.large2x, THUMBNAIL_WIDTH),
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
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
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
async function upload(path, image) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const { error } = await supabase.storage
      .from("photos")
      .upload(path, image, { contentType: "image/jpeg", upsert: true });
    if (!error) return null;
    if (attempt === 3) return error;
    await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
  }
}

function likeCount() {
  const roll = rand();
  if (roll < 0.25) return 0;
  if (roll < 0.75) return randInt(1, 5);
  if (roll < 0.95) return randInt(6, 12);
  return randInt(13, 20);
}

async function seed() {
  if (!process.env.PEXELS_API_KEY) {
    fail("PEXELS_API_KEY is missing from .env.local");
  }
  mkdirSync(CACHE_DIR, { recursive: true });
  const pool = await loadPool();

  const { error: uploadersError } = await supabase.from("uploaders").insert(
    GUESTS.map((guest) => ({ id: guest.id, display_name: guest.name })),
  );
  if (uploadersError) fail("inserting uploaders failed:", uploadersError);

  // Like devices: the guests themselves plus extra guests who never uploaded.
  const devicePool = GUESTS.map((g) => g.id);
  for (let i = 0; i < 30; i++) {
    devicePool.push(
      `5eedcafe-0000-4000-8000-${String(i).padStart(12, "0")}`,
    );
  }

  const now = Date.now();
  let fileNumber = randInt(1000, 4000);
  let taken = 0;
  let photoCount = 0;
  let likeTotal = 0;

  for (const guest of GUESTS) {
    const photos = randInt(10, 20);
    console.log(`${guest.name}: ${photos} photos`);

    for (let i = 0; i < photos; i++) {
      const source = pool[taken++ % pool.length];
      const image = await fetchImage(source.url, source.id);
      if (!image) {
        console.warn(`  skipped (download failed after retries): ${source.url}`);
        continue;
      }

      const photoId = crypto.randomUUID();
      const path = `${guest.id}/${photoId}.jpg`;
      const uploadError = await upload(path, image);
      if (uploadError) fail(`storage upload failed for ${path}:`, uploadError);

      // Guests' browsers generate this on upload; seeded photos take a smaller
      // Pexels rendition instead.
      let thumbPath = `${guest.id}/${photoId}.thumb.jpg`;
      const thumbnail = await fetchImage(source.thumbnailUrl, `${source.id}.thumb`);
      if (thumbnail) {
        const thumbError = await upload(thumbPath, thumbnail);
        if (thumbError) fail(`storage upload failed for ${thumbPath}:`, thumbError);
      } else {
        console.warn(`  no thumbnail (download failed): ${source.thumbnailUrl}`);
        thumbPath = null;
      }
      const rendered = jpegSize(thumbnail ?? image);

      const uploadedAt = new Date(now - randInt(0, 72) * 3_600_000 - randInt(0, 3_600_000));
      const takenAt = new Date(uploadedAt.getTime() - randInt(0, 6) * 3_600_000);
      const { error: photoError } = await supabase.from("photos").insert({
        id: photoId,
        uploader_id: guest.id,
        storage_path: path,
        thumbnail_path: thumbPath,
        original_filename: `IMG_${fileNumber++}.jpg`,
        content_type: "image/jpeg",
        size_bytes: image.byteLength,
        image_width: rendered?.width ?? null,
        image_height: rendered?.height ?? null,
        visibility: rand() < 0.05 ? "private" : "public",
        media_type: "photo",
        taken_at: takenAt.toISOString(),
        uploaded_at: uploadedAt.toISOString(),
      });
      if (photoError) fail(`photo insert failed for ${path}:`, photoError);

      const likes = likeCount();
      if (likes > 0) {
        const devices = [...devicePool]
          .sort(() => rand() - 0.5)
          .filter((id) => id !== guest.id)
          .slice(0, likes);
        const { error: likesError } = await supabase.from("likes").insert(
          devices.map((deviceId) => ({ photo_id: photoId, device_id: deviceId })),
        );
        if (likesError) fail(`likes insert failed for ${photoId}:`, likesError);
        likeTotal += devices.length;
      }
      photoCount++;
    }
  }

  console.log(`seeded ${GUESTS.length} guests, ${photoCount} photos, ${likeTotal} likes`);
}

await clean();
if (!process.argv.includes("--clean")) await seed();
