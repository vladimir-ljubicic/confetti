"use client";

import { createContext, useContext, type ReactNode } from "react";

type GalleryStats = {
  // How many gallery photos the client is actually holding; null while it
  // holds only one guest's photos, which stand for no gallery-wide number.
  count: number | null;
  // Likes across the whole gallery.
  likeTotal: number;
};

// What the client holds of the gallery, in numbers. The count starts at the
// server-rendered head and outgrows it when the background fetch lands, and
// the like total starts as the server's own sum over the gallery, which the
// head cannot be summed for; the header and footer — server-rendered nodes
// threaded through the client view — read both from here rather than from
// their props.
const GalleryStatsContext = createContext<GalleryStats>({
  count: null,
  likeTotal: 0,
});

export function GalleryStatsProvider({
  count,
  likeTotal,
  children,
}: GalleryStats & { children: ReactNode }) {
  return (
    <GalleryStatsContext.Provider value={{ count, likeTotal }}>
      {children}
    </GalleryStatsContext.Provider>
  );
}

export function useGalleryCount(): number | null {
  return useContext(GalleryStatsContext).count;
}

export function useGalleryLikeTotal(): number {
  return useContext(GalleryStatsContext).likeTotal;
}
