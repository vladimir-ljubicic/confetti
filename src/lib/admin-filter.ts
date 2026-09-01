import type { Visibility } from "./uploader-profile";

// Which slice of the admin gallery is on screen: one guest's photos, one
// visibility, or both. It survives a reload and can be handed on as a link, so
// it travels as a query string in both directions: the page reads it from the
// URL, the grid asks the feed for it.
export type AdminFilter = {
  // The guest whose photos are shown, by public id; absent for every guest.
  uploader?: string;
  visibility?: Visibility;
};

type FilterParams = {
  uploader?: string | string[];
  filter?: string | string[];
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parseAdminFilter(params: FilterParams): AdminFilter {
  const filter: AdminFilter = {};
  const uploader = first(params.uploader);
  if (uploader) filter.uploader = uploader;
  const visibility = first(params.filter);
  if (visibility === "public" || visibility === "private") {
    filter.visibility = visibility;
  }
  return filter;
}

export function adminFilterKey(filter: AdminFilter): string {
  return `${filter.uploader ?? ""}:${filter.visibility ?? ""}`;
}

export function adminFilterSearch(filter: AdminFilter): string {
  const params = new URLSearchParams();
  if (filter.uploader) params.set("uploader", filter.uploader);
  if (filter.visibility) params.set("filter", filter.visibility);
  return params.toString();
}

export function adminFilterUrl(filter: AdminFilter): string {
  const search = adminFilterSearch(filter);
  return search === "" ? "/admin" : `/admin?${search}`;
}

// A guest's own page is already addressed to them, so only the visibility half
// of the filter travels in its query.
export function adminGuestUrl(filter: AdminFilter & { uploader: string }): string {
  const path = `/admin/guests/${filter.uploader}`;
  return filter.visibility ? `${path}?filter=${filter.visibility}` : path;
}

// The whole gallery's chips offer one guest or the private slice and never a
// combination of the two, so an address asking for anything else falls back to
// the slice they can light up.
export function adminGalleryFilter(filter: AdminFilter): AdminFilter {
  if (filter.uploader !== undefined) return { uploader: filter.uploader };
  return filter.visibility === "private" ? { visibility: "private" } : {};
}
