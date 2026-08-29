import { Suspense } from "react";
import { resolveSortMode } from "@/lib/sort-mode";
import { GalleryScreen } from "../gallery-screen";
import { GalleryLoading } from "./gallery-loading";

// The gallery reads the database directly; without this the page would be
// statically prerendered at build time and serve stale rows.
export const dynamic = "force-dynamic";

// The stand-in header is a `Suspense` fallback here rather than a `loading.tsx`
// because it has to show the order the address asks for, and loading UI takes
// no parameters.
export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string | string[] }>;
}) {
  const { sort: sortParam } = await searchParams;
  const sort = resolveSortMode(Array.isArray(sortParam) ? sortParam[0] : sortParam);
  return (
    <Suspense fallback={<GalleryLoading sort={sort} />}>
      <GalleryScreen sort={sort} />
    </Suspense>
  );
}
