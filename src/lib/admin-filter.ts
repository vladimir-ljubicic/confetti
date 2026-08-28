// Which slice of the admin gallery is on screen. It survives a reload and can
// be handed on as a link, so it travels as a query string in both directions:
// the page reads it from the URL, the grid asks the feed for it.
export type AdminFilter =
  | { kind: "all" }
  | { kind: "private" }
  | { kind: "uploader"; publicId: string };

type FilterParams = {
  uploader?: string | string[];
  filter?: string | string[];
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parseAdminFilter(params: FilterParams): AdminFilter {
  if (first(params.filter) === "private") return { kind: "private" };
  const uploader = first(params.uploader);
  return uploader ? { kind: "uploader", publicId: uploader } : { kind: "all" };
}

export function adminFilterKey(filter: AdminFilter): string {
  return filter.kind === "uploader" ? `uploader:${filter.publicId}` : filter.kind;
}

export function adminFilterSearch(filter: AdminFilter): string {
  if (filter.kind === "private") return "filter=private";
  if (filter.kind === "uploader") return `uploader=${filter.publicId}`;
  return "";
}

export function adminFilterUrl(filter: AdminFilter): string {
  const search = adminFilterSearch(filter);
  return search === "" ? "/admin" : `/admin?${search}`;
}
