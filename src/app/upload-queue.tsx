"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type UploadTileStatus =
  | "queued"
  | "uploading"
  | "done"
  | "failed"
  | "cancelled";

export type UploadTile = {
  id: number;
  previewUrl: string;
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
};

type UploadQueueContextValue = {
  tiles: UploadTile[];
  labels: UploadTileLabels;
  addTiles: (tiles: UploadTile[]) => void;
  patchTile: (id: number, patch: Partial<UploadTile>) => void;
  removeTiles: (ids: number[]) => void;
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
  const previewUrls = useRef(new Map<number, string>());

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
    () => ({ tiles, labels, addTiles, patchTile, removeTiles }),
    [tiles, labels, addTiles, patchTile, removeTiles],
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
