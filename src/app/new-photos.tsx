"use client";

import { createContext, useContext, type ReactNode } from "react";

type NewPhotos = { count: number; reveal: () => void };

const NewPhotosContext = createContext<NewPhotos | null>(null);

// Other guests' photos waiting to enter the grid, and the way to let them in.
// The view holding them is not the one that draws the gallery's sticky chrome,
// where the pill announcing them belongs.
export function NewPhotosProvider({
  count,
  reveal,
  children,
}: NewPhotos & { children: ReactNode }) {
  return (
    <NewPhotosContext.Provider value={{ count, reveal }}>
      {children}
    </NewPhotosContext.Provider>
  );
}

// Announces the photos held back from the grid. Hangs under the sticky bar it
// is rendered in, so it rides at the top of the screen wherever the guest has
// scrolled to; tapping it brings the photos in and the top of the gallery with
// them.
export function NewPhotosPill({ label }: { label: string }) {
  const newPhotos = useContext(NewPhotosContext);
  if (newPhotos === null || newPhotos.count === 0) return null;
  return (
    <button
      type="button"
      onClick={() => {
        newPhotos.reveal();
        window.scrollTo(0, 0);
      }}
      className="new-photos-in absolute top-full left-1/2 z-[1] mt-2.5 flex h-11 -translate-x-1/2 items-center"
    >
      <span className="flex h-[34px] items-center gap-1.5 rounded-pill bg-[rgba(27,24,21,0.58)] px-4 text-[13px] whitespace-nowrap text-card shadow-floating backdrop-blur-[6px]">
        {label}
        <span aria-hidden>↑</span>
      </span>
    </button>
  );
}
