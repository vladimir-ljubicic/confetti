"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

function subscribeToConnectivity(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

export type UploadTileStatus =
  | "queued"
  | "uploading"
  | "done"
  | "failed"
  | "cancelled";

export type UploadTile = {
  id: number;
  previewUrl: string;
  // Pixel size of the preview, so the tile reserves the same height the grid
  // computes for it; null until the preview has decoded.
  width: number | null;
  height: number | null;
  status: UploadTileStatus;
  percent: number;
  photoId: string | null;
  cancel: () => void;
  retry: () => void;
  restore: () => void;
};

export type UploadTileLabels = {
  retry: string;
  cancelled: string;
  restore: string;
  cancelUpload: string;
  waiting: string;
};

type UploadQueueContextValue = {
  tiles: UploadTile[];
  labels: UploadTileLabels;
  addTiles: (tiles: UploadTile[]) => void;
  patchTile: (id: number, patch: Partial<UploadTile>) => void;
  removeTiles: (ids: number[]) => void;
  offline: boolean;
  bulkWaiting: number;
  setBulkWaiting: (count: number) => void;
  waitForOnline: () => Promise<void>;
  retryNow: () => void;
};

const UploadQueueContext = createContext<UploadQueueContextValue | null>(null);

export function UploadQueueProvider({
  labels,
  children,
}: {
  labels: UploadTileLabels;
  children: ReactNode;
}) {
  const [tiles, setTiles] = useState<UploadTile[]>([]);
  const [bulkWaiting, setBulkWaiting] = useState(0);
  const previewUrls = useRef(new Map<number, string>());
  const onlineWaiters = useRef(new Set<() => void>());

  const offline = useSyncExternalStore(
    subscribeToConnectivity,
    () => !navigator.onLine,
    () => false,
  );

  const releaseWaiters = useCallback(() => {
    const waiters = [...onlineWaiters.current];
    onlineWaiters.current.clear();
    for (const resolve of waiters) resolve();
  }, []);

  useEffect(() => {
    const onOnline = () => releaseWaiters();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [releaseWaiters]);

  const waitForOnline = useCallback(() => {
    if (navigator.onLine) return Promise.resolve();
    return new Promise<void>((resolve) => onlineWaiters.current.add(resolve));
  }, []);

  const addTiles = useCallback((added: UploadTile[]) => {
    for (const tile of added) previewUrls.current.set(tile.id, tile.previewUrl);
    setTiles((current) => [...added, ...current]);
  }, []);

  const patchTile = useCallback((id: number, patch: Partial<UploadTile>) => {
    setTiles((current) =>
      current.map((tile) => (tile.id === id ? { ...tile, ...patch } : tile)),
    );
  }, []);

  const removeTiles = useCallback((ids: number[]) => {
    for (const id of ids) {
      const url = previewUrls.current.get(id);
      if (url) URL.revokeObjectURL(url);
      previewUrls.current.delete(id);
    }
    setTiles((current) => current.filter((tile) => !ids.includes(tile.id)));
  }, []);

  const value = useMemo(
    () => ({
      tiles,
      labels,
      addTiles,
      patchTile,
      removeTiles,
      offline,
      bulkWaiting,
      setBulkWaiting,
      waitForOnline,
      // Waiting uploads retry on demand; if the connection is still down they
      // fail and re-queue, so this is safe to fire while offline.
      retryNow: releaseWaiters,
    }),
    [
      tiles,
      labels,
      addTiles,
      patchTile,
      removeTiles,
      offline,
      bulkWaiting,
      waitForOnline,
      releaseWaiters,
    ],
  );

  return (
    <UploadQueueContext.Provider value={value}>
      {children}
    </UploadQueueContext.Provider>
  );
}

export function useUploadQueue() {
  return useContext(UploadQueueContext);
}
