import type { Dictionary } from "@/lib/dictionaries";
import type { ViewerLabels } from "./photo-viewer";

export function viewerLabels(dict: Dictionary): ViewerLabels {
  return {
    open: dict.viewer.open,
    close: dict.viewer.close,
    download: dict.gallery.download,
    like: dict.gallery.like,
    unlike: dict.gallery.unlike,
    share: dict.viewer.share,
    makePrivate: dict.myPhotos.makePrivate,
    makePublic: dict.myPhotos.makePublic,
    delete: dict.myPhotos.delete,
    confirmDelete: dict.myPhotos.confirmDelete,
    actionFailed: dict.myPhotos.actionFailed,
    photosOne: dict.uploaderPage.photosOne,
    photosFew: dict.uploaderPage.photosFew,
    photosMany: dict.uploaderPage.photosMany,
  };
}
