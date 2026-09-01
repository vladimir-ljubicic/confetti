"use client";

import { useEffect, useState } from "react";
import { NO_SHOWN_TILES, withShownTiles } from "@/lib/tile-entrance";

// Which of the tiles a grid holds it has already shown, so only the ones that
// have just joined it fade in. A first grid arrives whole. The set is recorded
// after the render that showed them, the only moment that can tell an arrival
// apart from a tile that was already here.
export function useShownTiles(ids: ReadonlySet<string>): ReadonlySet<string> {
  const [shown, setShown] = useState(NO_SHOWN_TILES);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShown((current) => withShownTiles(current, ids));
  }, [ids]);
  return shown;
}

// Whether a tile enters is settled when it mounts: the grid stops calling it
// an arrival the moment it has been shown, and an entrance already under way
// must not be cut short by the next render.
export function useTileEntrance(arriving: boolean): boolean {
  const [entering] = useState(arriving);
  return entering;
}
