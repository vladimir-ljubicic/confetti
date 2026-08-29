import { resolveSortMode } from "@/lib/sort-mode";
import { GalleryScreen } from "../gallery-screen";

// The gallery reads the database directly; without this the page would be
// statically prerendered at build time and serve stale rows.
export const dynamic = "force-dynamic";

export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string | string[] }>;
}) {
  const { sort: sortParam } = await searchParams;
  const sort = resolveSortMode(Array.isArray(sortParam) ? sortParam[0] : sortParam);
  return <GalleryScreen sort={sort} />;
}
