"use client";

import { createContext, useContext, type ReactNode } from "react";

const GalleryCountContext = createContext<number | null>(null);

// How many gallery photos the client is actually holding. The counter starts
// at the server-rendered head and outgrows it when the background fetch lands,
// so the header and footer — server-rendered nodes threaded through the client
// view — read the live number from here rather than from their props. Null
// while the client holds only one guest's photos, which stand for no
// gallery-wide number.
export function GalleryCountProvider({
  count,
  children,
}: {
  count: number | null;
  children: ReactNode;
}) {
  return (
    <GalleryCountContext.Provider value={count}>
      {children}
    </GalleryCountContext.Provider>
  );
}

export function useGalleryCount(): number | null {
  return useContext(GalleryCountContext);
}
