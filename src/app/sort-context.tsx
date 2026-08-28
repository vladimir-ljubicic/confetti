"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { SortMode } from "@/lib/sort-mode";

const SortContext = createContext<{
  sort: SortMode;
  setSort: (sort: SortMode) => void;
} | null>(null);

// The server owns the order, so the toggle navigates; this holds the chosen
// mode meanwhile, and follows the server again once the new page arrives (or
// the viewer goes back to one sorted the other way).
export function SortProvider({
  initial,
  children,
}: {
  initial: SortMode;
  children: ReactNode;
}) {
  const [state, setState] = useState({ server: initial, sort: initial });
  if (state.server !== initial) setState({ server: initial, sort: initial });
  const setSort = (sort: SortMode) => setState({ server: initial, sort });
  return (
    <SortContext.Provider value={{ sort: state.sort, setSort }}>
      {children}
    </SortContext.Provider>
  );
}

export function useSort() {
  return useContext(SortContext);
}
