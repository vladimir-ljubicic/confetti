import type { SupabaseClient } from "@supabase/supabase-js";
import { parseVisibilityField, type Visibility } from "./uploader-profile";

// A selection can hold everything a guest has, so its cap is the gallery's.
export const SELECTION_MAX_IDS = 10_000;

export type VisibilitySelection = { ids: string[]; visibility: Visibility };

export type SelectedPhoto = { id: string; visibility: Visibility };

const PAGE = 1000;

export function parseSelection(body: unknown): string[] | null {
  if (typeof body !== "object" || body === null) return null;
  const { ids } = body as Record<string, unknown>;
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > SELECTION_MAX_IDS) {
    return null;
  }
  if (!ids.every((id) => typeof id === "string")) return null;
  return [...new Set(ids as string[])];
}

export function parseVisibilitySelection(body: unknown): VisibilitySelection | null {
  const ids = parseSelection(body);
  const visibility = parseVisibilityField(body, "visibility");
  return ids && visibility ? { ids, visibility } : null;
}

// The guest's live photos among the selected ids, in id order. Ids the guest
// does not own, or that are gone, are left out. Paged so no response cap can
// silently drop part of a large selection.
export async function resolveSelection(
  supabase: SupabaseClient,
  deviceId: string,
  ids: readonly string[],
): Promise<SelectedPhoto[]> {
  const wanted = new Set(ids);
  const photos: SelectedPhoto[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("photos")
      .select("id, visibility")
      .eq("uploader_id", deviceId)
      .is("deleted_at", null)
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`Loading own photos failed: ${error.message}`);
    const rows = data as SelectedPhoto[];
    for (const row of rows) if (wanted.has(row.id)) photos.push(row);
    if (rows.length < PAGE) return photos;
  }
}
