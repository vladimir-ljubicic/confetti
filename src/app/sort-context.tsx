"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { SortMode } from "@/lib/sort-mode";

const SortContext = createContext<{
  sort: SortMode;
  setSort: (sort: SortMode) => void;
} | null>(null);

// The whole gallery is loaded, so the toggle reorders it where it stands. The
// mode lives with the view that does the reordering; this only carries it down
// to the toggle, which the header renders far from it.
export function SortProvider({
  sort,
  onChange,
  children,
}: {
  sort: SortMode;
  onChange: (sort: SortMode) => void;
  children: ReactNode;
}) {
  return (
    <SortContext.Provider value={{ sort, setSort: onChange }}>
      {children}
    </SortContext.Provider>
  );
}

export function useSort() {
  return useContext(SortContext);
}
