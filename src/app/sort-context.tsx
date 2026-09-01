"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { SortMode } from "@/lib/sort-mode";

const SortContext = createContext<{
  sort: SortMode;
  resumeSort: (sort: SortMode) => void;
  // The top of the latest order, however far down another one the guest is.
  showLatest: () => void;
} | null>(null);

// The whole gallery is loaded, so the toggle reorders it where it stands. The
// mode lives with the view that does the reordering; this only carries it down
// to the toggle, which the header renders far from it, and to the upload
// button, which puts the gallery back in latest order for the photos it adds.
export function SortProvider({
  sort,
  onChange,
  onLatest,
  children,
}: {
  sort: SortMode;
  onChange: (sort: SortMode) => void;
  onLatest: () => void;
  children: ReactNode;
}) {
  return (
    <SortContext.Provider
      value={{ sort, resumeSort: onChange, showLatest: onLatest }}
    >
      {children}
    </SortContext.Provider>
  );
}

export function useSort() {
  return useContext(SortContext);
}
