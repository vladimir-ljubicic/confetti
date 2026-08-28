// Seeds the database with demo guests, photos, and likes.
//
//   node scripts/seed.mjs           # wipe previous seed data, then seed
//   node scripts/seed.mjs --clean   # wipe previous seed data only
//
// Photos are CC-licensed Flickr images fetched via loremflickr.com by
// wedding-related keywords. Seeded uploaders use ids starting with
// "5eed", which is how cleanup finds everything it created.

import { readFileSync } from "node:fs";
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

const KEYWORDS = [
  "wedding",
  "bride",
  "groom",
  "wedding,party",
  "wedding,dance",
  "wedding,guests",
  "wedding,toast",
  "wedding,cake",
  "wedding,bouquet",
  "reception",
];

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

async function fetchImage(keyword, lock) {
  const url = `https://loremflickr.com/1600/1200/${keyword}?lock=${lock}`;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(url, { redirect: "follow" });
      if (response.ok) return Buffer.from(await response.arrayBuffer());
    } catch {
      // retry
    }
    await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
  }
  return null;
}

function likeCount() {
  const roll = rand();
  if (roll < 0.25) return 0;
  if (roll < 0.75) return randInt(1, 5);
  if (roll < 0.95) return randInt(6, 12);
  return randInt(13, 20);
}

async function seed() {
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
  let lock = randInt(1, 1000);
  let photoCount = 0;
  let likeTotal = 0;

  for (const guest of GUESTS) {
    const photos = randInt(10, 20);
    console.log(`${guest.name}: ${photos} photos`);

    for (let i = 0; i < photos; i++) {
      const keyword = KEYWORDS[randInt(0, KEYWORDS.length - 1)];
      const image = await fetchImage(keyword, lock++);
      if (!image) {
        console.warn(`  skipped (download failed after retries): ${keyword}`);
        continue;
      }

      const photoId = crypto.randomUUID();
      const path = `${guest.id}/${photoId}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("photos")
        .upload(path, image, { contentType: "image/jpeg", upsert: true });
      if (uploadError) fail(`storage upload failed for ${path}:`, uploadError);

      const uploadedAt = new Date(now - randInt(0, 72) * 3_600_000 - randInt(0, 3_600_000));
      const takenAt = new Date(uploadedAt.getTime() - randInt(0, 6) * 3_600_000);
      const { error: photoError } = await supabase.from("photos").insert({
        id: photoId,
        uploader_id: guest.id,
        storage_path: path,
        original_filename: `IMG_${String(1000 + lock)}.jpg`,
        content_type: "image/jpeg",
        size_bytes: image.byteLength,
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
