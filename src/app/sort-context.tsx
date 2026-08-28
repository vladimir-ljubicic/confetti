"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { SortMode } from "@/lib/sort-mode";

const SortContext = createContext<{
  sort: SortMode;
  setSort: (sort: SortMode) => void;
} | null>(null);

// Sorting happens client-side: the full photo page is already in the
// browser, so toggling must not pay a server round-trip.
export function SortProvider({
  initial,
  children,
}: {
  initial: SortMode;
  children: ReactNode;
}) {
  const [sort, setSort] = useState<SortMode>(initial);
  return (
    <SortContext.Provider value={{ sort, setSort }}>
      {children}
    </SortContext.Provider>
  );
}

export function useSort() {
  return useContext(SortContext);
}
