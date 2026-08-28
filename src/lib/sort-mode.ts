export type SortMode = "latest" | "popular";

export function resolveSortMode(param: string | undefined): SortMode {
  if (param === "latest" || param === "popular") return param;
  return "latest";
}
