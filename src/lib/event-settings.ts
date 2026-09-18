import "server-only";
import { revalidateTag, unstable_cache } from "next/cache";
import {
  DEFAULT_EVENT_DATE_ISO,
  DEFAULT_FREEZE_OFFSET_DAYS,
  type EventSchedule,
} from "./event-schedule";
import { supabaseAdmin } from "./supabase-server";

export type EventSettings = EventSchedule & { uploadsFrozen: boolean };

export type EventSettingsPatch = {
  uploadsFrozen?: boolean;
  eventDate?: string;
  freezeOffsetDays?: number;
};

// The row as it is right now. For anything that decides on it: whether an
// upload is accepted, whether the freeze is due, what a ZIP snapshot records.
export async function loadEventSettings(): Promise<EventSettings> {
  const { data, error } = await supabaseAdmin()
    .from("event_settings")
    .select("uploads_frozen, event_date, freeze_offset_days")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw new Error(`Loading event settings failed: ${error.message}`);
  return {
    uploadsFrozen: data?.uploads_frozen ?? false,
    eventDateIso: data?.event_date ?? DEFAULT_EVENT_DATE_ISO,
    freezeOffsetDays: data?.freeze_offset_days ?? DEFAULT_FREEZE_OFFSET_DAYS,
  };
}

const SETTINGS_TAG = "event-settings";
const SETTINGS_CACHE_SECONDS = 5 * 60;

// The row as a gallery render may see it. A write drops the tag, but the
// first read after that is still served the old row while the fresh one
// loads behind it, so this is only for pages, never for a decision.
export const getEventSettings = unstable_cache(
  loadEventSettings,
  [SETTINGS_TAG],
  {
    tags: [SETTINGS_TAG],
    revalidate: SETTINGS_CACHE_SECONDS,
  },
);

export async function areUploadsFrozen(): Promise<boolean> {
  return (await loadEventSettings()).uploadsFrozen;
}

export async function updateEventSettings(
  patch: EventSettingsPatch,
): Promise<void> {
  const row: Record<string, unknown> = { id: 1 };
  if (patch.uploadsFrozen !== undefined)
    row.uploads_frozen = patch.uploadsFrozen;
  if (patch.eventDate !== undefined) row.event_date = patch.eventDate;
  if (patch.freezeOffsetDays !== undefined)
    row.freeze_offset_days = patch.freezeOffsetDays;
  const { error } = await supabaseAdmin().from("event_settings").upsert(row);
  if (error) throw new Error(`Saving event settings failed: ${error.message}`);
  revalidateTag(SETTINGS_TAG, { expire: 0 });
}
