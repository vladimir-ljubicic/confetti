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

const SETTINGS_TAG = "event-settings";

// One row that every gallery render reads and only the admin and the freeze
// cron write, both of which drop the entry. The window is a backstop.
const SETTINGS_CACHE_SECONDS = 5 * 60;

export const getEventSettings = unstable_cache(
  async (): Promise<EventSettings> => {
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
  },
  [SETTINGS_TAG],
  { tags: [SETTINGS_TAG], revalidate: SETTINGS_CACHE_SECONDS },
);

export async function areUploadsFrozen(): Promise<boolean> {
  return (await getEventSettings()).uploadsFrozen;
}

export async function updateEventSettings(patch: EventSettingsPatch): Promise<void> {
  const row: Record<string, unknown> = { id: 1 };
  if (patch.uploadsFrozen !== undefined) row.uploads_frozen = patch.uploadsFrozen;
  if (patch.eventDate !== undefined) row.event_date = patch.eventDate;
  if (patch.freezeOffsetDays !== undefined)
    row.freeze_offset_days = patch.freezeOffsetDays;
  const { error } = await supabaseAdmin().from("event_settings").upsert(row);
  if (error) throw new Error(`Saving event settings failed: ${error.message}`);
  // Expired outright rather than served stale while it refreshes: the freeze
  // this may have just set is what the upload endpoint checks.
  revalidateTag(SETTINGS_TAG, { expire: 0 });
}
