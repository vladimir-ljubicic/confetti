import "server-only";
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

export async function getEventSettings(): Promise<EventSettings> {
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

export async function areUploadsFrozen(): Promise<boolean> {
  const { data, error } = await supabaseAdmin()
    .from("event_settings")
    .select("uploads_frozen")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw new Error(`Loading event settings failed: ${error.message}`);
  return data?.uploads_frozen ?? false;
}

export async function updateEventSettings(patch: EventSettingsPatch): Promise<void> {
  const row: Record<string, unknown> = { id: 1 };
  if (patch.uploadsFrozen !== undefined) row.uploads_frozen = patch.uploadsFrozen;
  if (patch.eventDate !== undefined) row.event_date = patch.eventDate;
  if (patch.freezeOffsetDays !== undefined)
    row.freeze_offset_days = patch.freezeOffsetDays;
  const { error } = await supabaseAdmin().from("event_settings").upsert(row);
  if (error) throw new Error(`Saving event settings failed: ${error.message}`);
}
